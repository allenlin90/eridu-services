# Affiliate Management SOP

**Document type:** Internal foundational policy (SOP)
**Owner:** Affiliate Management (Operations, Creator Recruiting, Vendor Acquisition)
**Status:** v1.0 — governing document. Serves as the source of truth for worksheet systems, AI agents, and applications built on top of this process.
**Convention:** Parameters marked `[configurable]` are defaults, adjustable periodically or per campaign. The *structures* they live in are fixed policy.

---

## 1. Purpose and Scope

This SOP governs the **affiliate management** process: mapping the right creators to the right products, and optimizing mixes, incentive structures, and the distribution tier-system to achieve affiliate GMV targets.

**The single objective of affiliate management is GMV (sales).** It must not be confused with influencer marketing, which serves branding/awareness objectives and follows a different process, budget logic, and evaluation standard. Any activity in this process that does not credibly ladder up to GMV is out of scope.

**In scope:** vendor/product qualification, creator qualification and recruitment, campaign planning (mixes, incentives, tier-system configuration), creator activation and governance, performance monitoring, and periodic optimization of incentives and tiers.

**Out of scope:** influencer marketing / brand deals, livestream-as-a-service, shop management, and creator management contracts (covered by their own policies).

---

## 2. Business Model

### 2.1 The distribution analogy

Our affiliate system operates like a **distribution channel system**:

| Distribution role | Affiliate equivalent | Function |
|---|---|---|
| Manufacturer / principal | Vendor / brand | Supplies qualified products and funds incentive resources |
| Distributor | **Our company (MCN)** | Aggregates supply and demand, negotiates conditions, allocates resources, governs the channel |
| Re-seller / wholesaler | MCN plan, TAP plan affiliates (organizational) | Manage sub-networks of creators |
| Seller / retailer | Creators (Mega, Risingstar, Mid-tier, KOC) | Produce content (short video, livestream) that sells the product to consumers |

As in physical distribution, different tiers of seller enjoy different commission levels and levels of support, and the distributor profits from the margin between what the principal pays out and what flows down the channel.

### 2.2 Revenue model

Our company's revenue is the **spread**: the difference between the total payout rate negotiated from the vendor and the commission rate that flows down to affiliates/creators through the tier-system.

> Example: vendor pays out 20% of GMV; a creator on the MCN tier receives 15%; our spread is 5% of that creator's GMV. Under an umbrella arrangement (§4.3), the spread is shared within the tier envelope.

**Do not confuse the two commissions:**
- **Vendor payout commission** — what the brand pays into the channel (negotiated per §7).
- **Affiliate/creator commission** — what flows down through the tier-system (§4).

### 2.3 Inputs and output

| Inputs | Output |
|---|---|
| Qualified creators (§6) | **GMV** |
| Qualified products from vendors/brands (§5) | |
| Incentive resources: commission, incentive/mission, voucher, ad, sample, platform incentive (§4.4) | |

### 2.4 Funding sources for incentive resources

Each incentive resource has a funding source, which must be recorded at planning time `[configurable per campaign]`:

| Resource | Typical funding source |
|---|---|
| Commission | Vendor |
| Incentive / mission bonus | Vendor and/or platform |
| Voucher | Vendor and/or platform |
| Ad budget | Vendor, platform, or **co-funded by our MCN** |
| Sample | Vendor |
| Platform incentive | Platform (e.g., TikTok programs) |

Co-funding by our MCN is an investment decision against expected spread and must be approved in the campaign plan.

---

## 3. Operating Roles

| Team | Responsibility in this process |
|---|---|
| **Vendor Acquisition** | Sources and qualifies vendors/products per §5; negotiates conditions per §7; secures incentive resources |
| **Creator Recruiting** | Builds and maintains Lists A–D (§6); recruits and onboards creators into campaigns |
| **Operations** | Owns the plan → process → analysis → optimize loop (§8–§11): planning, activation, governance, conflict resolution, monitoring, and optimization |

---

## 4. The Tier-System and Incentive Structure

### 4.1 Distribution tier-system (fixed structure)

Every affiliate belongs to exactly one plan tier. The **tier structure is fixed policy**; the commission percentages are `[configurable]` defaults, adjustable periodically or by campaign.

| Plan tier | Type | Default commission | Description |
|---|---|---|---|
| **MCN** | Organizational (re-seller) | 15% | MCN networks managing sub-creators |
| **TAP** | Organizational (re-seller) | 12% | TikTok Agency Partners / partner agencies |
| **Target plan** | Individual creator | 10% | Creators committed to GMV targets |
| **Open plan** | Individual creator | 8% | Open enrollment, no target commitment |

### 4.2 Default mapping of creator tier → plan tier

Each creator tier defaults to a plan tier. The mapping is a default, not a constraint — actual percentages can be adjusted periodically or per campaign, and creators can sit under organizational umbrellas (§4.3).

| Creator tier | Default plan tier | Default commission |
|---|---|---|
| Mega | MCN | 15% |
| Risingstar | TAP | 12% |
| Mid-tier | Target plan | 10% |
| KOC | Open plan | 8% |

### 4.3 Umbrella rule

A creator may operate under an organizational affiliate's tier envelope. The envelope percentage belongs to the organizational tier; the split within it is an internal arrangement.

> Example: a KOC operates under an MCN's 15% umbrella → the KOC receives 8%, the MCN retains 7%. Total payout through the channel remains 15%.

The envelope must never exceed the plan tier's commission rate. Splits within an envelope are `[configurable]`.

### 4.4 Incentive resource types

Six resource types are configured for every campaign:

1. **Commission** — % of GMV, per tier-system
2. **Incentive / mission** — performance bonuses (default sizing: 10% of commission cost `[configurable]`)
3. **Voucher** — consumer-facing discount funding (default sizing: 10% of GMV `[configurable]`)
4. **Ad** — traffic/boosting budget (default sizing: 10% of GMV `[configurable]`; tracked separately from campaign cost ratio because funding source varies, see §8.5)
5. **Sample** — product samples for content production
6. **Platform incentive** — platform-funded programs passed through to eligible creators

### 4.5 Creator incentive framework (configurable framework with v1 defaults)

Incentive triggers apply per creator tier. The **trigger structure is fixed**; the unlocked values are v1 defaults `[configurable]` and must be reviewed each quarter.

**Triggers (all creator tiers):**

| Trigger | Definition | v1 default unlock |
|---|---|---|
| Default | Base state for the tier | Base commission per §4.2; standard sample allocation |
| EA creator | Exclusively affiliated creator (sells the category exclusively through our channel) | +1pp commission uplift; priority sample and ad support |
| Meeting # of content target | Posts the planned content volume for the period (§8.4) | Mission bonus (from incentive pool); voucher priority |
| Meeting campaign target | Hits assigned GMV target for a specific campaign (e.g., 6.6) | Campaign bonus; featured ad boosting on best content |
| Meeting monthly target | Hits assigned monthly GMV target | Monthly mission bonus; retains/earns Target plan status |
| Meeting quarterly target | Hits assigned quarterly GMV target | Tier review for upgrade (§11.2); increased commission within tier band; priority access to hero products and platform incentives |

Unlock magnitudes per tier (bonus values, uplift caps, sample quotas) are maintained in the campaign planning worksheet as `[configurable]` parameters.

---

## 5. Product Qualification (Vendor Side)

### 5.1 Product criteria

- Select and onboard vendors **in the priority order of §5.2**.
- Conditions must be **best in the market** — commission %, incentives, and other support (verified against §7 negotiation standards).
- **Only start with hero products.** Long-tail SKUs enter only after the hero product proves velocity.

### 5.2 Vendor priority groups

| Group | Definition | Qualification bar |
|---|---|---|
| **Group 1** | Top 20 selling brands from our MCN creators | Minimum total GMV per brand ≥ 1M/month |
| **Group 2** | Brands with high potential | Must meet **all** of: existing affiliate GMV > 5M (assuming we take a 10% share ≈ 500K); existing > 100 creators joined, with > 20 creators each selling > 50K |
| **Group 3** | Strategic accounts | For upselling / cross-selling purposes (relationship value, not immediate GMV bar) |

---

## 6. Creator Qualification (Supply Side)

### 6.1 Creator criteria

- Recruit and onboard creators **in the priority order List A → D**.
- **Recruit target per campaign: minimum 20 creators, drawn only from Lists A–C.** List D supplements but does not count toward the minimum.

| List | Definition |
|---|---|
| **List A** | Top 30 creators selling for **direct competition** — similar brand tier, similar product, similar price, similar affiliate size |
| **List B** | The existing top 30 creators selling for the brand |
| **List C** | Top creators in the category (> 1M GMV) |
| **List D** | Qualified creator requests from our MCN |

### 6.2 Creator tiers (by average monthly total GMV)

Creator tiering is by demonstrated selling power. Reference bands `[configurable]`:

| Creator tier | Reference avg monthly total GMV |
|---|---|
| Mega | 10,000,000 |
| Risingstar | 3,000,000 |
| Mid-tier | 1,000,000 |
| KOC | 50,000 |

---

## 7. Vendor Negotiation Framework (configurable framework with v1 defaults)

The **default negotiating standard on every lever is "highest in the market"**: commission, incentive/mission, voucher, ad, sample, product supply, and platform incentive. A vendor that cannot meet market-best conditions on the core levers fails §5.1 qualification.

Triggers escalate what we **ask from** the vendor as we prove performance (structure fixed; asks `[configurable]`):

| Trigger | v1 default ask |
|---|---|
| Default | Best-in-market conditions on all levers |
| AMP brand (amplified/priority brand program) | Dedicated ad co-funding; exclusive voucher pool; guaranteed sample supply |
| Meeting # of content target | Incremental sample and voucher allocation |
| Meeting campaign target | Campaign bonus pool for creators; commission review |
| > 5% of brand affiliate performance | Commission uplift request; priority product supply |
| > 10% of brand affiliate performance | Exclusive incentive pool; early access to new hero products |
| > 15% of brand affiliate performance | Category or mechanism exclusivity discussion; expanded ad co-funding |
| > 20% of brand affiliate performance | Strategic partnership terms: top-of-market payout, joint planning, platform incentive pass-through |

"% of brand affiliate performance" = our channel's share of the brand's total affiliate GMV.

---

## 8. Stage 1 — PLAN

Planning proceeds top-down: **GMV projection → platform mix → content mix → creator mix → incentive configuration → cost and capacity model.**

### 8.1 GMV projection

Set the monthly GMV target (100% allocation base). All mixes are expressed as % allocations of this projection.

### 8.2 Platform mix `[configurable]`

Allocate GMV across platforms. Reference (Jan model): TikTok 80%, Shopee 20%, Lazada 0%, Others 0%.

### 8.3 Content mix (per platform) `[configurable]`

Allocate each platform's GMV across content types. Reference: Short Video 60%, Livestream 40%, Others 0%.

### 8.4 Creator mix (per platform) `[configurable]`

Allocate each platform's GMV across creator tiers. Reference: Mega 20%, Risingstar 30%, Mid-tier 30%, KOC 20%.

### 8.5 Cost model

Per creator tier, per platform:

| Cost line | Formula (v1 defaults, `[configurable]`) |
|---|---|
| Commission | Tier GMV allocation × tier commission % (§4.2) |
| Incentive | 10% × Commission |
| Voucher | 10% × Tier GMV allocation |
| Ad | 10% × Tier GMV allocation — **tracked, but excluded from the campaign cost ratio** (funding source varies; often platform/vendor funded or co-funded per §2.4) |
| **Total campaign cost** | Commission + Incentive + Voucher |
| **Cost ratio** | Total campaign cost ÷ GMV projection. Reference model: **22.32%** |

The cost ratio is the primary planning guardrail: it must be covered by the negotiated vendor payout plus platform incentives, preserving our spread (§2.2).

### 8.6 Capacity model — how many creators we need

The creator requirement is derived, never guessed:

1. **Estimated Realizable GMV per creator** = Creator tier avg monthly total GMV × **Product index**.
   *Product index* = the share of a creator's average monthly total GMV that can be assumed captured by the campaign product. Default: **10%** `[configurable]`.
2. **Performing creators needed** = Tier GMV allocation ÷ Estimated Realizable GMV.
3. **Participating creators needed** = Performing creators × performance ratio. Only a fraction of participating creators will actually generate GMV. Default ratios `[configurable]`:

| Creator tier | Performing : Participating | Content posted / participating creator / month |
|---|---|---|
| Mega | 1 : 5 | 2 |
| Risingstar | 1 : 10 | 3 |
| Mid-tier | 1 : 20 | 3 |
| KOC | 1 : 50 | 3 |

4. **Content posted** = Participating creators × content per creator.

**Reference model (3,000,000 GMV/month, per platform):**

| Tier | GMV alloc | Commission | Incentive | Voucher | Total cost | Performing | Participating | Content |
|---|---|---|---|---|---|---|---|---|
| Mega (20%) | 600,000 | 90,000 | 9,000 | 60,000 | 159,000 | 0.6 | 3 | 6 |
| Risingstar (30%) | 900,000 | 108,000 | 10,800 | 90,000 | 208,800 | 3 | 30 | 90 |
| Mid-tier (30%) | 900,000 | 90,000 | 9,000 | 90,000 | 189,000 | 9 | 180 | 540 |
| KOC (20%) | 600,000 | 48,000 | 4,800 | 60,000 | 112,800 | 120 | 6,000 | 18,000 |
| **Total** | **3,000,000** | **336,000** | **33,600** | **300,000** | **669,600 (22.32%)** | **132.6** | **6,213** | **18,636** |

### 8.7 Plan sign-off checklist

A campaign plan is approved only when:
- [ ] Product qualifies per §5 and vendor conditions verified best-in-market per §7
- [ ] All mixes allocated and sum to 100%
- [ ] Cost ratio within guardrail and covered by vendor payout + platform incentives (spread preserved)
- [ ] Creator capacity plan meets the participation requirement, with recruit target ≥ 20 from Lists A–C
- [ ] Incentive triggers and tier assignments configured
- [ ] Funding source recorded per incentive resource

---

## 9. Stage 2 — PROCESS (Execute)

### 9.1 Recruit and invite

Creator Recruiting recruits from Lists A → D (§6), invites qualified creators to join the campaign, and onboards them to the correct plan tier / umbrella arrangement. Creators start selling through content they produce.

### 9.2 Activation

Operations engages creators closely to ensure they actually produce and sell:
- Provide and track the **content schedule** (per §8.6 content commitments)
- **Incentive delivery**: samples shipped, vouchers loaded, missions published, commission settings verified on-platform
- Product briefing, selling points, and best-practice content references

### 9.3 Governance

- **Quality control** of content against platform policy and brand guardrails
- **Product training** so claims are accurate and compliant
- **Brand guardrails**: approved claims, pricing discipline, prohibited content

### 9.4 Conflict resolution (must be prompt)

Operations resolves, with defined escalation to Vendor Acquisition or Creator Recruiting where needed:

| Conflict type | Examples | First owner |
|---|---|---|
| Creator ↔ brand | Content rejection, claim disputes, payment disputes | Operations |
| Creator ↔ competitors | Exclusivity clashes, poaching | Creator Recruiting |
| Creator ↔ creator | Price undercutting, content copying, voucher abuse | Operations |
| Creator requests to vendor | More samples, better commission, ad support | Operations → Vendor Acquisition |

Resolution SLA: acknowledge within 1 business day; resolve or escalate within 3 `[configurable]`.

---

## 10. Stage 3 — ANALYSIS (Monitor & Evaluate)

### 10.1 Cadence

Creator and campaign performance is evaluated against GMV targets:

| Cadence | Focus |
|---|---|
| **Weekly** | Activation health: participation rate, content posted vs. schedule, early GMV signals; unblock stalled creators |
| **Monthly** | Performing vs. participating actuals against §8.6 model; cost ratio actual vs. plan; monthly target triggers (§4.5) |
| **Quarterly** | Tier review inputs; quarterly target triggers; vendor performance triggers (§7) |
| **By campaign** | Mega campaigns (e.g., 6.6, 11.11): campaign target triggers evaluated at campaign close |

### 10.2 Core metrics

- GMV vs. target (by platform, content type, creator tier, creator)
- Performing rate (performing ÷ participating) vs. default ratios
- Realizable GMV actual vs. product index assumption
- Content compliance rate (posted vs. scheduled)
- Cost ratio actual vs. plan (22.32% reference)
- Our spread realized vs. planned
- Share of brand affiliate performance (feeds §7 triggers)

---

## 11. Stage 4 — OPTIMIZE (Adjust & Loop)

Analysis outputs drive adjustments **only to the configurable parameters** — the structures stay fixed.

### 11.1 Incentive adjustments

- Reallocate incentive/voucher/ad budgets toward tiers, platforms, or content types that over-perform their realizable GMV assumptions
- Trigger or withhold unlocks per §4.5 based on target attainment
- Revise product index and performance ratios when actuals diverge materially for two consecutive periods `[configurable threshold]`

### 11.2 Tier-system adjustments

- **Upgrade**: creators consistently meeting quarterly targets move up a plan tier or receive commission uplift within their band
- **Downgrade**: creators missing targets across a full quarter move down a tier or lose uplifts
- **Umbrella restructuring**: re-split envelopes where organizational affiliates under-deliver activation
- Commission % defaults (§4.1) reviewed periodically; changes require Operations + Vendor Acquisition sign-off since they affect the spread

### 11.3 Vendor adjustments

- Escalate asks per §7 triggers as our share of brand affiliate performance grows
- De-prioritize or exit vendors whose conditions fall below best-in-market or whose hero product velocity fails

Adjustments feed the next planning cycle. **This completes the loop: Plan → Process → Analysis → Optimize → Plan.**

---

## 12. Configurable Parameter Register

All parameters below are the systemization surface — the values a worksheet, agent, or app must expose as inputs. Everything else in this document is fixed policy.

| Parameter | v1 default | Scope of adjustment |
|---|---|---|
| GMV projection | per plan | Monthly / campaign |
| Platform mix | TikTok 80 / Shopee 20 / Lazada 0 | Monthly / campaign |
| Content mix | SV 60 / LS 40 | Monthly / campaign |
| Creator mix | 20 / 30 / 30 / 20 | Monthly / campaign |
| Tier commission % | 15 / 12 / 10 / 8 | Periodic / campaign |
| Umbrella splits | e.g., KOC 8 + MCN 7 within 15 | Per arrangement |
| Incentive sizing | 10% of commission | Periodic |
| Voucher sizing | 10% of GMV | Periodic / campaign |
| Ad sizing | 10% of GMV | Periodic / campaign |
| Product index | 10% | Periodic / per product |
| Performance ratios | 1:5 / 1:10 / 1:20 / 1:50 | Periodic |
| Content per creator | 2 / 3 / 3 / 3 per month | Periodic |
| Creator tier GMV bands | 10M / 3M / 1M / 50K | Periodic |
| Recruit minimum per campaign | 20 from Lists A–C | Fixed floor; can be raised per campaign |
| Incentive trigger unlocks | §4.5 v1 defaults | Quarterly review |
| Vendor trigger asks | §7 v1 defaults | Quarterly review |
| Conflict SLA | 1 day ack / 3 day resolve | Periodic |

---

## 13. Systemization Notes (Northstar CRM alignment)

For the worksheet / agent / app build-out, this SOP maps onto the Northstar CRM as follows:

- Affiliate campaigns are `campaign.campaigns` with `type = vendor_initiated` (platform-funded programs use `type = platform_incentive`); creator participation, targets, and eligibility live in `campaign_creators` + `campaign_eligibility_rules` (tier, platform, plan)
- Incentive resources (voucher, mission/bonus, sample) map to the `promotions` schema, with `supplier_type` capturing the funding source per §2.4
- Lists A–D recruitment runs through the `recruiting` schema funnel; converted creators land in `creator.creators`, with selling power in `creator_platforms.gmv_estimated` / `gmv_tier`
- Vendors and hero products per §5 live in `product.vendors` / `product.products`, with per-platform commission via `product_listings` overrides
- The configurable parameter register (§12) should be implemented as versioned configuration rows (mirror the management-contract pattern: new row per change, never update in place) so every plan is reproducible against the parameters in force at the time
