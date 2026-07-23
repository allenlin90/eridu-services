#!/usr/bin/env python3
"""
Recursive TikTok Shop Academy scraper (Playwright) — Phase 2 of the creator-services KB.

Seeds come from seed_urls.txt (extracted from the CS Excel). The crawler follows
in-scope links discovered inside each article, subject to hard limits that make
infinite loops impossible:

  1. SCOPE ALLOWLIST  — only seller-th.tiktok.com paths matching /university/(essay|course)
  2. CANONICAL IDENTITY — pages are deduped by knowledge_id / learning_id / content_id,
     so the same article reached via different tracking params (from=, sourceType=,
     anchor_link=) counts as ONE visit
  3. MAX DEPTH        — seeds are depth 0; links found on a page are depth+1 (default 2)
  4. MAX PAGES        — global page budget (default 300)
  5. RATE LIMIT       — fixed delay between page loads (default 2.0s, be polite)
  6. PER-PAGE TIMEOUT — pages that don't settle in 30s are recorded as failed, not retried forever
  7. RESUMABLE STATE  — visited/queue persisted to state.json; re-running skips done work

Setup (run on a machine with normal internet access — NOT the Claude sandbox):
    pip install playwright
    playwright install chromium

If articles require a seller/creator login, capture a session first:
    python3 scrape_academy.py --login          # opens a headed browser; log in, then close it
Then crawl:
    python3 scrape_academy.py                  # uses saved auth_state.json if present

Output:
    scraped/<canonical_id>.md   one markdown file per article (title + body text)
    scraped/index.json          url, canonical id, title, depth, outcome per page

Feed the output back to Claude (zip the scraped/ folder) to upgrade the 88
link-reference KB entries into full answers.
"""
import argparse
import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

# ---------------- Constraints (tune via CLI) ----------------
DEFAULTS = dict(
    max_depth=2,          # 0 = seeds only; 1 = seeds + their links; 2 = one more hop
    max_pages=300,        # global budget across the whole crawl
    delay_seconds=2.0,    # politeness delay between page loads
    page_timeout_ms=30000,
    nav_wait="networkidle",
)

SCOPE_HOSTS = {"seller-th.tiktok.com"}
SCOPE_PATH_RE = re.compile(r"^/university/(essay|course)")
IDENTITY_PARAMS = ("knowledge_id", "learning_id", "content_id")

STATE_FILE = Path("state.json")
AUTH_FILE = Path("auth_state.json")
OUT_DIR = Path("scraped")


def canonical_id(url: str):
    """Stable identity for a page. None => out of scope."""
    p = urlparse(url)
    if p.netloc not in SCOPE_HOSTS or not SCOPE_PATH_RE.match(p.path):
        return None
    q = parse_qs(p.query)
    for k in IDENTITY_PARAMS:
        if k in q and q[k][0].isdigit():
            return f"{k}-{q[k][0]}"
    return None  # in-scope host/path but no identity param -> don't crawl (avoids infinite param spaces)


def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"visited": {}, "queue": []}  # visited: {canon_id: outcome}; queue: [[url, depth], ...]


def save_state(state):
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=1))


def extract_article(page):
    """Pull title + readable body text from a rendered Academy page."""
    title = page.title() or ""
    # Article pages render main content; fall back through selectors
    for sel in ("article", "main", "#root"):
        el = page.query_selector(sel)
        if el:
            text = el.inner_text().strip()
            if len(text) > 200:  # sanity: the empty SPA shell is short
                return title, text
    return title, ""


def collect_links(page, base_url):
    links = set()
    for a in page.query_selector_all("a[href]"):
        href = a.get_attribute("href") or ""
        absu = urljoin(base_url, href)
        if canonical_id(absu):
            links.add(absu)
    return links


def run_crawl(args):
    OUT_DIR.mkdir(exist_ok=True)
    state = load_state()
    visited = state["visited"]

    if not state["queue"]:
        seeds = [u.strip() for u in Path(args.seeds).read_text().splitlines() if u.strip()]
        state["queue"] = [[u, 0] for u in seeds if canonical_id(u)]
        print(f"Initialized queue with {len(state['queue'])} in-scope seeds")

    index = []
    idx_path = OUT_DIR / "index.json"
    if idx_path.exists():
        index = json.loads(idx_path.read_text())

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.headed)
        ctx_kwargs = {"locale": "th-TH"}
        if AUTH_FILE.exists():
            ctx_kwargs["storage_state"] = str(AUTH_FILE)
            print("Using saved login session (auth_state.json)")
        context = browser.new_context(**ctx_kwargs)
        page = context.new_page()

        pages_done = sum(1 for v in visited.values() if v == "ok")
        while state["queue"] and pages_done < args.max_pages:
            url, depth = state["queue"].pop(0)
            cid = canonical_id(url)
            if cid is None or cid in visited:
                continue

            try:
                page.goto(url, wait_until=DEFAULTS["nav_wait"],
                          timeout=args.page_timeout_ms)
                time.sleep(1.0)  # let late JS settle
                title, body = extract_article(page)
                if not body:
                    visited[cid] = "empty"      # SPA shell / login wall / removed article
                    outcome = "empty"
                else:
                    md = f"# {title}\n\nSource: {url}\nCanonical: {cid}\nDepth: {depth}\n\n---\n\n{body}\n"
                    (OUT_DIR / f"{cid}.md").write_text(md, encoding="utf-8")
                    visited[cid] = "ok"
                    outcome = "ok"
                    pages_done += 1
                    # Recurse — only below depth limit
                    if depth < args.max_depth:
                        for link in collect_links(page, url):
                            lcid = canonical_id(link)
                            if lcid and lcid not in visited and \
                               all(lcid != canonical_id(u) for u, _ in state["queue"]):
                                state["queue"].append([link, depth + 1])
                index.append({"url": url, "id": cid, "title": title,
                              "depth": depth, "outcome": outcome})
                print(f"[{pages_done}/{args.max_pages}] d{depth} {outcome:6s} {cid}  {title[:50]}")
            except PWTimeout:
                visited[cid] = "timeout"
                index.append({"url": url, "id": cid, "depth": depth, "outcome": "timeout"})
                print(f"          d{depth} TIMEOUT {cid}")
            except Exception as e:  # noqa: BLE001 — record and continue
                visited[cid] = f"error:{type(e).__name__}"
                index.append({"url": url, "id": cid, "depth": depth,
                              "outcome": f"error:{type(e).__name__}"})
                print(f"          d{depth} ERROR   {cid}  {e}")

            save_state(state)
            idx_path.write_text(json.dumps(index, ensure_ascii=False, indent=1))
            time.sleep(args.delay_seconds)

        browser.close()

    ok = sum(1 for v in visited.values() if v == "ok")
    empty = sum(1 for v in visited.values() if v == "empty")
    print(f"\nDone. ok={ok} empty={empty} other={len(visited)-ok-empty} "
          f"queue_remaining={len(state['queue'])}")
    if empty:
        print("NOTE: 'empty' pages usually mean a login wall — run with --login and retry.")


def run_login():
    """Open a headed browser for manual login; save session for the crawl."""
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        context = browser.new_context(locale="th-TH")
        page = context.new_page()
        page.goto("https://seller-th.tiktok.com/university/home?identity=1")
        print("Log in in the opened browser window. Close the window when done.")
        try:
            page.wait_for_event("close", timeout=0)
        except Exception:  # noqa: BLE001
            pass
        context.storage_state(path=str(AUTH_FILE))
        print(f"Session saved to {AUTH_FILE}")
        browser.close()


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--seeds", default="seed_urls.txt")
    ap.add_argument("--max-depth", type=int, default=DEFAULTS["max_depth"])
    ap.add_argument("--max-pages", type=int, default=DEFAULTS["max_pages"])
    ap.add_argument("--delay-seconds", type=float, default=DEFAULTS["delay_seconds"])
    ap.add_argument("--page-timeout-ms", type=int, default=DEFAULTS["page_timeout_ms"])
    ap.add_argument("--headed", action="store_true", help="show the browser while crawling")
    ap.add_argument("--login", action="store_true", help="capture a login session first")
    args = ap.parse_args()
    if args.login:
        run_login()
    else:
        run_crawl(args)


if __name__ == "__main__":
    main()
