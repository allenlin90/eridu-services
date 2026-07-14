---
name: adp-performance-analysis
description: >
  Analyze ADP (affiliate campaign) performance reports and output prioritized
  call-to-actions using ERISA's pre-defined business logic. Use this skill
  whenever a user shares campaign performance data — a spreadsheet, pasted
  table, screenshot, or stats report containing GMV, creator counts, content
  volume, or conversion figures — and wants to know what happened, why, or
  what to do next. Trigger even for partial asks like "why is this campaign
  down?", "analyze this report", "review campaign performance", or "what
  should we do about campaign X". The workflow is portfolio-first: start
  from total ADP GMV, rank campaigns, then cascade the full decomposition
  (campaign → content type → creator → volume × conversion),
  period-over-period, producing call-to-actions for each of the top 20
  performing campaigns from a fixed 3-category taxonomy: RECRUIT, PUSH
  VOLUME, BOOST.
---

# ADP Performance Analysis → Call-to-Action

## Purpose

Convert a raw ADP campaign performance report into (1) a diagnosis of *why*
GMV moved period-over-period and (2) call-to-actions (CTAs) drawn from a
**fixed, closed taxonomy of exactly three categories**. The analysis is
mechanical: the same input must always produce the same diagnosis and CTAs.
Do not substitute personal judgment for the rules below.

**The distribution principle governs everything.** ADP is a distribution
channel: creators are retailers, ERISA is the distributor. A distributor does
not coach a retailer how to sell — if a retailer underperforms, the
distributor switches to another retailer. Therefore this skill NEVER outputs
CTAs about coaching creators, improving their selling skills, or improving
content quality. The only levers are: who sells (RECRUIT), how much they sell
(PUSH VOLUME), and what fuels the sale (BOOST). Keeping CTAs inside these
three categories lets the operations team provision and monitor against
consistent categories, which is what makes the system scalable.

The single objective of ADP is **GMV**.

## Workflow (portfolio-first — this is the primary flow)

The analysis ALWAYS starts at the top and cascades down. Never jump straight
into a single campaign when the report contains portfolio data.

1. **Level 0 — Portfolio:** total ADP GMV vs prior period (and vs the ADP
   target, e.g. 5M THB/month from top 10 campaigns). State the PoP change and
   which campaigns drove it (rank campaigns by absolute PoP GMV change, up
   and down).
2. **Level 1 — Rank and select:** rank all campaigns by current-period GMV.
   The **top 20 performing campaigns** each receive a full campaign analysis
   and their own CTA list (steps 3–4). Campaigns below the top 20 are
   reported as one aggregate line and receive no individual analysis —
   with two exceptions that always fire regardless of rank:
   - **Validation risk:** any campaign ≤30 days old pacing below the 100K line
   - **Breakout:** any campaign with growth >100% AND GMV >50K
3. **Levels 2–4 — Per-campaign cascade:** for each selected campaign,
   decompose GMV → content type → creator (top 20 creators by GMV within the
   campaign) → volume × conversion, run the PoP bridge and creator growth
   trends, and fire the decision-tree rules.
4. **CTAs per campaign:** each selected campaign gets its own CTA list
   (max 5, taxonomy categories only), so the ADP owner can dispatch actions
   campaign by campaign.

If the input contains only a single campaign, skip Level 0–1 and run steps
3–4 on that campaign directly. If the input is portfolio-level but lacks
creator detail for some campaigns, analyze those campaigns down to the
deepest level the data allows and name the missing fields.

Note the two different "top 20"s: top 20 **campaigns** within the portfolio
(Level 1 selection), and top 20 **creators** within each campaign (Level 3
CTA focus).

## The closed CTA taxonomy (never output anything outside these three)

| # | Category | What it always specifies | Levers |
|---|---|---|---|
| 1 | **RECRUIT** | *Which type* (content type: livestream vs short video; creator tier; source list A–C) and *how many* | Add new creators; replace underperformers — "switch retailers" |
| 2 | **PUSH VOLUME** | *Which top performers* and *how much more*: # of new short videos, or # of additional livestream hours/streams | New videos (also the fix for aging content), more livestream hours/streams, content-schedule commitments tied to missions |
| 3 | **BOOST** | *Which high-performing content/creators* and *which resource*: incentive/mission bonus, voucher, or ad budget | Concentrate incentive resources on validated winners; restore voucher competitiveness |

Prohibited CTA types (never output): coaching creators, training on selling
points, content quality improvement, "review content strategy", creative
feedback. If performance is poor at the creator level, the answer is RECRUIT
(replace) — not fix, and never boost a non-performer.

**The one gate before replacement is content volume.** If a non-performing
creator posted no content, no sales is the expected outcome — their selling
ability is unproven, not disproven. Enforce the content schedule (PUSH
VOLUME) for one period; if content appears and sales don't, or if content
still doesn't appear, replace. If a non-performer *did* post content and it
didn't sell, replace immediately.

## Input

Accept performance data in any form: spreadsheet, pasted table, screenshot,
or prose stats. Ideal input per campaign, **for both current and prior
period**:

| Field | Needed for |
|---|---|
| Campaign GMV | Level 1 + PoP change |
| GMV per content type (short video, livestream) | Level 2 |
| Per creator: GMV, content volume | Level 3–4 |
| Volume unit: # of short videos; livestream **hours or # of streams** (TikTok Shop exports report streams — use whichever the report provides and state which) | Conversion calc |
| Total # of creators, and # generating GMV (performing) | Participation + creator growth trend |
| Campaign age (days since launch) | Validation rule |
| Voucher/incentive status (if reported) | BOOST diagnosis |

**Period-over-period is the core of the analysis.** If prior-period data is
missing, run a single-period analysis against targets and thresholds, but
state prominently that PoP and growth-trend analysis requires last period's
report, and ask for it. TikTok Shop custom reports have a **Comparison date**
option that is often left disabled (the column shows "--"): tell the ADP
owner to re-pull the same report with the comparison period enabled — that
one toggle unlocks the entire PoP bridge and creator growth-trend layer.

**Missing data:** never invent numbers. Analyze as deep as the data allows
and name the exact missing fields.

**Derive, don't trust:** recompute conversion (GMV ÷ volume) and totals from
raw rows. If stated totals disagree with recomputed ones, flag it first.

## The decomposition model (fixed logic)

Strictly top-down; each level explains the level above:

```
Level 0  Total ADP GMV (portfolio)
Level 1    → GMV per campaign
Level 2      → GMV per content type (short video / livestream)
Level 3        → GMV per creator within each content type
Level 4          → volume × conversion per creator
                   volume     = # short videos; livestream hours or # streams
                   conversion = GMV per video; GMV per hour or per stream
```

Governing identity: **Content-type GMV = Σ over creators (volume × conversion)**

Every GMV movement therefore decomposes into three drivers, which map 1:1 to
the CTA taxonomy:

| Driver | Question | Maps to CTA |
|---|---|---|
| **Participation** | How many creators are active and performing? Is the creator base growing? | RECRUIT |
| **Volume** | How much content is each top performer producing? | PUSH VOLUME |
| **Conversion** | How much GMV per unit of content? (top performers only — see below) | BOOST (and PUSH VOLUME for aging videos) |

### Period-over-period bridge

Attribute the PoP GMV change arithmetically:

- **Participation effect** = (Δ # performing creators) × prior avg GMV per performing creator
- **Volume effect** = Σ over continuing creators (Δ volume × prior conversion)
- **Conversion effect** = Σ over continuing creators (current volume × Δ conversion)

Report each effect as an amount and % of total change. The largest absolute
effect is the **primary driver** and dictates the lead CTA.

### Creator growth trends (always report)

Growth of the creator base is a leading indicator of GMV growth — capture it
every period:

- **Creator count trend:** participating and performing creator counts vs
  prior period. Flat or shrinking counts predict future GMV decline even when
  current GMV holds → RECRUIT proactively, don't wait for the GMV drop.
- **Rising creators:** creators whose GMV grew fastest PoP. These are where
  BOOST and PUSH VOLUME resources compound — list the top 3 risers explicitly.
- **Churned performers:** creators who generated GMV last period and zero this
  period. Each churned performer's prior GMV is a quantified gap → RECRUIT
  replacements of the same content type, sized to cover the gap.

## Top-performer focus

**CTAs target only the top performers of each campaign (top 20 by GMV).**
Their content is already validated as able to perform, so their conversion
quality is not questioned. Everyone below the top 20 is not individually
analyzed or actioned — the aggregate of their GMV feeds the RECRUIT sizing
(replace, don't fix).

When a **top performer's conversion drops**, the cause is never assumed to be
the creator's ability. Check, in order:

| Likely cause | Signal | CTA |
|---|---|---|
| Short videos too old (decayed reach) | Video GMV low vs prior, few *new* videos posted. **Hard detector: video GMV > 0 with 0 videos posted in the period — the creator (or whole campaign) is coasting on old content, and decay is only a matter of time** | PUSH VOLUME: produce N new short videos |
| Voucher not available or less attractive than competing campaigns (other MCNs) | Voucher budget exhausted / competitor campaign live | BOOST: restore or upgrade voucher; escalate to Vendor Acquisition for voucher pool if vendor-funded |
| Market demand down (category-wide) | Conversion down across all creators and campaigns in category | No creator CTA — flag for vendor negotiation / campaign portfolio decision |

## Thresholds (v1 defaults, `[configurable]`)

| Rule | Threshold | Source |
|---|---|---|
| New-campaign validation window / passing line | 100K THB GMV within 30 days | ADP policy |
| Minimum creators per campaign | 20, recruited from Lists A–C | ADP policy |
| Growth escalation trigger | growth >100% AND GMV >50K | ADP weekly review |
| Top-campaign negotiation trigger | campaign GMV >50K (top 20 campaigns) | ADP monthly review |
| Target MCN spread | >5% | ADP policy |
| Material PoP decline (flag) | GMV down >20% vs prior period | default |
| Performing creator floor | ≥1,000 THB campaign GMV in the period (raw exports contain many ~0 rows) | default |
| Materiality for secondary drivers | effect ≥10% of total GMV change | default |
| Creator concentration risk | one creator ≥40% of campaign GMV | default |
| Creator base stagnation flag | performing creator count flat or down 2 consecutive periods | default |
| Performing : participating ratios | Mega 1:5, Risingstar 1:10, Mid-tier 1:20, KOC 1:50 | SOP §8.6 |
| Content per participating creator / month | Mega 2, others 3 (short video) | SOP §8.6 |
| Recruit sizing formula | creators needed = GMV gap ÷ (tier avg monthly GMV × product index 10%), grossed up by performing ratio | SOP §8.6 |

## Diagnostic decision tree → CTA mapping (fixed logic)

Walk top-down. Fire every rule whose condition is met. Every CTA must be
labeled with its taxonomy category.

### A0. Portfolio level (Level 0–1)

| Condition | Diagnosis | CTA / action | Owner |
|---|---|---|---|
| Total ADP GMV below target (e.g. 5M/month from top 10) | Portfolio gap | Attribute the gap to specific campaigns via the ranking; the per-campaign CTAs below are the fix. If the gap exceeds what existing campaigns can close, flag: pipeline needs new launches (within the 5/month quota, Country Manager approval) | Campaign team |
| Total GMV up but concentrated in 1–2 campaigns | Portfolio concentration | **RECRUIT** and launch-pipeline emphasis on the next-tier campaigns | Campaign team |
| Any campaign ≤30 days old below 100K pacing (any rank) | Validation risk | Fire the campaign-level validation rule for that campaign even if outside top 20 | Campaign team → Head of Creator |
| Any campaign growth >100% AND >50K (any rank) | Breakout | Pull it into the analyzed set; fire the breakout rule | Campaign team → Vendor Acquisition |

### A. Campaign level

| Condition | Diagnosis | CTA (category) | Owner |
|---|---|---|---|
| ≤30 days old, pacing below 100K line | Validation at risk | RECRUIT + BOOST to hit the line; if it fails at day 30, recommend pause/exit | Campaign team → Head of Creator |
| GMV low/down and # creators <20 or below plan | GMV low because creator # is low | **RECRUIT**: [content type] creators, [tier], from Lists A–C, quantity per sizing formula | Creator Recruiting |
| Performing creator count flat/down 2 periods (even if GMV holds) | Creator base stagnating — future GMV at risk | **RECRUIT** proactively: replace churn + grow base | Creator Recruiting |
| Creator count ≥ plan but performing rate below tier ratio | Creators joined but not selling — **check content volume first**: if there's no content, of course there's no sales | Split the non-performers: (a) content posted but no GMV → **RECRUIT** replacements immediately — switch the retailer, no boost step; (b) no content posted → **PUSH VOLUME**: enforce content schedule this period; still no content next period → **RECRUIT** replacements | Operations / Creator Recruiting |
| Growth >100% AND GMV >50K | Breakout campaign | **BOOST**: escalate to vendor for ad support, voucher pool, product supply, commission uplift; **PUSH VOLUME** on top performers to ride the wave | Campaign team → Vendor Acquisition |
| One creator ≥40% of campaign GMV | Concentration risk | **RECRUIT**: additional [content type] creators to de-risk; **BOOST**: protect the anchor creator's incentives | Creator Recruiting + Operations |
| MCN spread <5% | Economics below target | Escalation (not a creator CTA): renegotiate payout / restructure splits before scaling | Vendor Acquisition + Operations |

### B. Content-type level (drivers from the bridge)

| Condition | Diagnosis | CTA (category) | Owner |
|---|---|---|---|
| Livestream GMV down, volume effect dominant (fewer hours) | Livestream performance down | **PUSH VOLUME**: ask top livestream performers for +N hours/streams; tie to mission bonus | Operations |
| Short video GMV down, volume effect dominant (fewer posts) | SV output below schedule | **PUSH VOLUME**: ask top SV performers for N new videos per schedule (2–3/month per tier) | Operations |
| SV conversion drops for top performers | Videos aging, or voucher uncompetitive | **PUSH VOLUME**: produce new SV; **BOOST**: check/restore voucher vs competing campaigns | Operations (+ Vendor Acquisition if voucher is vendor-funded) |
| LS conversion drops for top performers | Voucher/incentive uncompetitive in-stream, or demand down | **BOOST**: voucher/mission on top livestreamers; if conversion is down category-wide → demand flag, no creator CTA | Operations |
| Conversion down across ALL creators and campaigns in category | Market demand down | Flag only: vendor negotiation / portfolio decision — do not burn PUSH VOLUME or BOOST against falling demand | Campaign team → Vendor Acquisition |
| Content mix far off plan (e.g., SV 60 / LS 40) | Mix drift | **RECRUIT** and/or **PUSH VOLUME** weighted toward the underweight content type | Campaign team |

### C. Creator level (top 20 by GMV only)

| Condition | Diagnosis | CTA (category) | Owner |
|---|---|---|---|
| High conversion, low volume | Undersupplied winner — highest-leverage case | **PUSH VOLUME**: +N videos / +N hours or streams; **BOOST**: priority samples + ad boost on their best content | Operations |
| Rising creator (fastest PoP GMV growth) | Compounding winner | **BOOST**: concentrate ad budget and incentives; **PUSH VOLUME** to capacity | Operations |
| Top performer's conversion falling | Aging content / voucher gap / demand (per top-performer table above) | **PUSH VOLUME** (new content) and/or **BOOST** (voucher) per cause | Operations |
| Churned performer (GMV last period, zero now) | Lost retailer | **RECRUIT**: replacement of same content type sized to their prior GMV | Creator Recruiting |
| Creator meets content/campaign/monthly target | Trigger unlocked | **BOOST**: deliver the unlock (mission bonus, ad boosting, tier review per §4.5) | Operations |
| Below top 20 / non-performer with content posted | Content is there, sales are not — retailer validated as non-performing | Feeds **RECRUIT** sizing only — switch retailers, never boost or fix | Creator Recruiting |
| Non-performer with no content posted | No content = no sales; performance unproven, not disproven | **PUSH VOLUME**: content-schedule enforcement (one period); no content next period → feeds **RECRUIT** sizing | Operations → Creator Recruiting |

**CTA prioritization:** order by GMV at stake, largest first; lead with the
primary driver from the bridge. Cap at 5 CTAs per campaign. Every RECRUIT CTA
states type + quantity; every PUSH VOLUME CTA states which top performers +
how much more; every BOOST CTA states which content/creators + which resource.

## Output format

For a portfolio report (the standard case), ALWAYS use this structure:

```
# ADP Portfolio Analysis — [Period] vs [Prior period]

## Portfolio verdict
Total ADP GMV [amount], [up/down X% PoP], [vs target if known]. Biggest movers: [campaign +X], [campaign −Y]. Campaigns analyzed: top 20 of [N total].

## Campaign ranking
[Table: rank, campaign, GMV, PoP Δ, # performing creators, flags]
[One aggregate line for campaigns below top 20]

---
## 1. [Campaign name] — GMV [amount], [±X% PoP]

### Verdict
One sentence: primary driver [participation | volume | conversion] in [content type]. Creator base: [growing/flat/shrinking] ([N] → [N] performing).

### Decomposition
[Table: content type → GMV, share, PoP change]
[Table per content type, top performers: creator, GMV, PoP Δ, volume, conversion]

### Driver bridge
Participation effect: ±X (Y% of change) · Volume effect: ±X (Y%) · Conversion effect: ±X (Y%)

### Creator growth trends
Risers: [top 3 by PoP GMV growth] · Churned performers: [names + prior GMV = gap]

### Call-to-actions
1. [RECRUIT | PUSH VOLUME | BOOST] — [specifics per taxonomy] — [owner] — addresses ~[GMV amount] — [cadence hook]
2. ...

---
## 2. [Next campaign] ...
[repeat per campaign, in rank order]

---
## Portfolio flags & escalations
[Validation risks, breakout triggers, spread issues, demand-down flags, quota context (max 5 new ADP launches/month, Country Manager approval), missing data]
```

For a single-campaign input, output just the per-campaign block (verdict →
decomposition → bridge → growth trends → CTAs → flags).

Keep the verdict and CTAs tight and directive. Arithmetic goes in tables, not
prose.

## Worked example

Input (single period; prior period not supplied):

- Campaign GMV 1,000,000 · 7 creators
- Short video 200,000: A = 150,000 / 5 videos; B = 30,000 / 5; C = 20,000 / 2
- Livestream 800,000: D = 500,000 / 80 h; E = 200,000 / 80 h; F = 60,000 / 20 h; G = 40,000 / 20 h

Output the skill must produce:

- Conversion: A 30,000/video, B 6,000, C 10,000; D 6,250/h, E 2,500, F 3,000, G 2,000
- 7 creators < 20 minimum → **RECRUIT** (lead CTA): livestream-capable creators (livestream = 80% of GMV), Lists A–C, 13+ to reach the floor — sized up via the SOP §8.6 formula if a GMV target is given
- Creator D = 50% of GMV ≥ 40% → concentration flag → reinforcing the RECRUIT CTA (livestream type) + **BOOST**: protect D's incentives
- Creator A: top SV conversion (30K/video) at only 5 videos → **PUSH VOLUME**: N new videos from A + **BOOST**: ad boost on A's best video
- Creators B, E, F, G: no coaching CTA of any kind — they either stay as-is within the top-performer set or feed RECRUIT sizing
- No prior period → no bridge, no growth trends; explicitly request last period's report

## Handling raw platform exports (TikTok Shop custom reports and similar)

Verified against real exports — apply these before any analysis:

- **Exclude the "Summary" row** from row-level analysis; use it only as a
  cross-check against recomputed totals.
- **Treat Campaign ID as a string.** 19-digit IDs exceed float precision and
  silently corrupt grouping if read as numbers.
- **Group campaigns by Campaign ID, not name.** The same campaign can appear
  under one ID with multiple duration rows (extensions), and different
  campaigns can share a name.
- **Livestream volume** comes as # of LIVE streams, not hours — compute
  conversion as GMV per stream and state the unit used.
- **Strip currency symbols/commas** from money columns before computing;
  recompute video GMV + LIVE GMV vs total GMV (small remainder = showcase/
  link attribution, note it).
- **Apply the performing floor** (≥1,000 THB default) — raw exports include
  every invited creator, producing thousands of zero rows; these are the
  participation data, not noise: split them into posted-no-sales vs
  joined-no-content for the replacement/enforcement rules.
- **MCN spread** = estimated affiliate partner commission ÷ GMV. A 0% reading
  may reflect commission settled outside the report — flag as "verify
  commission configuration, then renegotiate or exit", not as a settled fact.
- **Aging-content detector:** any creator or campaign with video GMV > 0 and
  0 videos posted in the period is coasting on old content → PUSH VOLUME
  (new videos) fires immediately.

## Edge cases

- **Volume units:** short video = # of videos; livestream = hours or # of streams (state which). If
  unstated, ask — don't assume.
- **Creator in both content types:** analyze each content-type row
  separately; consolidate into one CTA line per creator.
- **Currency:** assume THB unless stated; never mix currencies in a bridge.
- **Zero-volume creators:** participating-but-not-performing — count in the
  performing-rate check, exclude from conversion averages.
- **New creators this period:** exclude from the volume/conversion effects of
  the bridge (they have no prior baseline); report their GMV inside the
  participation effect.

## Boundaries

This skill diagnoses and prescribes per the fixed logic above. It does not:
approve new ADP launches (Country Manager), change commission structures or
tier percentages (Operations + Vendor Acquisition sign-off), or blacklist
creators (Head of Creator). When a CTA requires such approval, output it as
an escalation, not a decision. And it never outputs coaching or
content-quality CTAs — the distribution principle is absolute.
