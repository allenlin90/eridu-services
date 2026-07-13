---
name: ai-platform-capability-verification
description: Verify deployed Open WebUI or LiteLLM behavior from tagged source and live probes before relying on capability claims.
---

# AI Platform Capability Verification

A capability claim ("citations work," "skills load on demand," "this endpoint takes this body") is only trustworthy once verified against the *actually-deployed* version — release notes, generic API catalogs, and plausible-looking request shapes have all turned out wrong in this repo's own history. This skill is the repeatable procedure for closing that gap, not a one-off record of what was found.

## When source-level verification is enough

For request/response shapes, exact endpoint paths, and auth requirements: read the real source at the deployed tag before writing any client code.

1. Resolve the exact deployed version first (`ai-platform-release-management` covers how — `GET /api/version` for Open WebUI, `info.version` in `/openapi.json` for LiteLLM). Never assume the version in a doc is still current.
2. Fetch the router/model source at that exact tag: `https://raw.githubusercontent.com/open-webui/open-webui/<tag>/backend/open_webui/routers/<name>.py` (and the matching `models/<name>.py` for Pydantic field shapes). Use `gh api "search/code?q=repo:<org>/<repo>+<symbol>"` to locate a symbol when the file isn't obvious.
3. Don't stop at the route decorator — read the handler body. Field names in a response model don't guarantee the handler actually populates them (see `references/known-gaps.md` for a real example: a field that's typed into the response schema but structurally never set).
4. Don't assume two similar-looking resources share a request shape by analogy (`tools/id/{id}/access/update` vs `knowledge/{id}/access/update` differ by exactly one path segment — confirmed by source, not guessed).

This alone resolves most "what's the right payload" questions safely, with no write to the live instance.

## When live-behavior verification is required

Source tells you the *intended* logic path. It doesn't tell you whether the deployed instance's config, model capabilities, or a request-shape detail you got wrong actually route you down that path. For genuinely behavioral claims (does citation stay correctly attributed, does a feature actually engage, does a mutation actually persist what the response claims), verify live.

### The disposable-resource pattern

1. **Get explicit confirmation before creating anything.** Data-level API mutations (a knowledge collection, a grant) are lower-trust than code-execution resources (a Function/Pipe, potentially a Skill depending on what it can trigger) — the latter deserves an explicit stop-and-ask even under a broad prior approval, per this repo's standing rule on hard-to-reverse or higher-blast-radius actions. State plainly what will be created, exercised, and deleted before doing it.
2. **Create the smallest resource that can prove the claim**, named and described as disposable so it's unambiguous if anyone else sees it mid-test.
3. **Exercise it through the real path**, not a shortcut. If the claim is about assistant-attached behavior, don't test via a raw model call with the feature injected directly — the code path can differ (see `references/known-gaps.md`: `files` param injection vs Native-function-calling tool retrieval are genuinely different code paths with potentially different bugs).
4. **Independently re-verify every mutation with a fresh read**, not the mutation response. A `200 OK` on write doesn't prove the write did what it claims — confirm with a separate `GET`.
5. **Tear down completely**, then independently re-verify the teardown (fresh `GET` returns 404/absent), not just that the `DELETE` call returned success.
6. **Report actual evidence**, not inference. "The response contained an explicit `tool_calls` entry naming the expected function" is evidence. "The answer was correct so it must have used the tool" is not — a model can produce a plausible answer via a completely different, unintended path.

### Designing a decisive test, not just *a* test

A test that only checks "did it produce the right output" often can't distinguish between the hypothesis you're testing and a simpler alternative that happens to produce the same output. Two techniques that resolved real ambiguity in this repo:

- **Distinct, made-up facts per test artifact.** When verifying citation correctness, use N documents each containing one invented, individually-verifiable fact (not real content) and ask about a specific one. A correct-but-unverifiable answer proves nothing; a correct answer to "what's in document B specifically" with a citation pointing at document B is real evidence.
- **A relevance-differential test, with a control.** When verifying "does X load only when needed" (on-demand skill/tool loading, lazy retrieval), don't just ask a question that needs X — that can't distinguish "loaded on demand" from "always fully injected, and it happened to be used." Instead: (a) make the candidate resource large enough that full-injection vs manifest-only produces a clearly different token count, (b) run a **control** call with no candidate resource attached to get a true baseline (request-level overhead unrelated to the resource can be large and easy to misattribute — this repo's baseline builtin-tool-schema overhead was ~4500 tokens, which looked at first like "the skill must have been injected" until the control isolated it), (c) run the candidate-attached call with an *irrelevant* question — a small token delta over the control means on-demand; a delta matching the resource's full size means full-injection, (d) run the candidate-attached call with the *relevant* question and confirm both the correct answer and an explicit tool-call trace (`finish_reason: "tool_calls"`, a named function call) — not just a plausible answer.

### When a request doesn't behave as expected, verify your request before concluding the platform is broken

A local test bug is the more common explanation. Concretely: a client-side belief that request fields nest under a `metadata` object silently produced completely wrong behavior (no error — the fields were just ignored, taking a different, unintended code path) until checked against the actual handler, which popped the same fields from the top level of the body. When behavior contradicts source-level expectations, re-verify the *outbound request shape* against the source before concluding the source read was wrong.

## After verification

Write the finding back into the canonical doc/skill it affects, stated as a confirmed fact with the evidence, not as a narrated discovery ("checked and found X" reads as a process log — "X is confirmed: `<evidence>`" is the durable fact). Update anything downstream that was written as a hedge or an assumption pending this exact verification.

## Related Skills

- [ai-platform-release-management](../ai-platform-release-management/SKILL.md) — resolving the actually-deployed version, which this skill's source-verification step depends on.
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) / [litellm-admin-api](../litellm-admin-api/SKILL.md) — the endpoint catalogs this skill's findings get written back into.
