---
name: creator-management
description: >
  ERISA creator management operations — MCN, creator lifecycle, recruiting,
  creator services, fee-sharing, paid packages, affiliate campaigns (ADP/AMP),
  platform incentives, creator performance, and operational cadence.
  Use when the request involves creators, affiliates, MCN, creator contracts,
  creator tiers, affiliate campaigns, or platform creator programs.
---

# Creator Management — ERISA

---

## General

### What ERISA does

ERISA is ERIDU's MCN (Multi-Channel Network) arm. We manage 4,000+ commerce creators — primarily on TikTok and Shopee — who convert sales through content. Our creators are affiliates who drive GMV, not influencers who drive impressions.

**Teams:**
- Recruit team — high-volume creator acquisition
- Creator Services team — ongoing management of managed creators (contracts, service delivery, performance, retention)
- Campaign team — operates affiliate campaigns (ADP/AMP), paid packages, and platform incentive campaigns

**Owned by:** Head of Creator

**Client relationship:** Commerce / Client Success owns the client relationship. ERISA operates and delivers.

### Revenue models

Revenue model determines the fee structure, not creator type.

**1. Paid packages (current #1 revenue driver, lowest long-term potential)**
- Brand clients buy creator content packages (short videos, product reviews, etc.)
- ERISA pays creators a per-content rate (varies by tier) and charges clients a higher rate
- Margin = (client price − creator cost) × volume of packages sold
- Two types: Standard and Express
- Can use managed, campaign-only, or outsourced creators

**2. Fee-sharing (current #2, highest long-term potential — ERISA's key MCN differentiator)**
- Managed creators earn commissions from affiliate sales on TikTok/Shopee
- Platform distributes commission directly to the creator
- ERISA takes a % cut per the management contract (share fee %)
- Recurring revenue that scales with creator GMV growth

**3. Affiliate campaigns — ADP (current #3, high long-term potential)**
- Creators promote products via affiliate links
- Total commission split: creator takes their %, ERISA takes the MCN spread
- Target: >5% MCN spread (e.g., total 16%, creator 10%, ERISA 6%)
- All creator types participate — managed creators encouraged as they are top performers

**4. Platform partner incentives**
- TikTok, Shopee, Lazada run MCN incentive programs — tiered bonuses, per-creator incentives, campaign-specific bonuses
- Policies change quarterly or ad hoc
- Sometimes platforms commission ERIDU directly — platform becomes the paying client

### Cost structure

- Variable: creator payments for paid packages (per-content rates), paid bi-monthly
- Fixed: ~200K THB ERISA team overhead (portion of company-wide fixed costs)
- Commission flow for fee-sharing: creator makes sales → platform pays creator → ERISA takes cut. No cash outflow to creators for fee-sharing revenue.

### Platform neutrality rules

**Managed creator enticing:**
- Never entice managed creators FROM TikTok TO Shopee — this protects TikTok's managed creator pool and our primary platform partnership
- Enticing managed creators TO TikTok is permitted
- This restriction does not apply to non-managed creators (campaign-only, outsourced)

**Confidential information:**
- Never share TikTok's confidential information with Shopee, or Shopee's with TikTok
- Both platforms must be able to trust us with confidential information — breaching this trust could end the partnership
- This applies to all ERISA team members, regardless of which platform they primarily work with

---

## Creator

### Creator lifecycle

**Status transitions:**
lead → prospect → managed / outsourced / campaign_only → inactive / blacklisted

| Status | Definition | Criteria |
|---|---|---|
| Lead | Identified creator, not yet contacted | Sourced via scouting, referral, or inbound |
| Prospect | Contacted, in conversation | Responded to outreach, screening in progress |
| Managed | Under management contract with ERISA | Signed contract, share fee % agreed, tier assigned. Minimum GMV tier 4 (>500K THB) |
| Outsourced | External creator for paid-package overflow | No management contract — used when managed pool can't cover demand. agency_id recorded in CRM |
| Campaign_only | Participates in affiliate campaigns, not managed | No management contract, not bound to ERISA. Minimum GMV tier 3 (>100K THB) |
| Inactive | Paused/dormant, can be reactivated | Contract expired, creator unresponsive, declining GMV, or creator requested pause |
| Blacklisted | Permanent, never work with again | Platform TOS violation, contract breach, dishonesty, severe misconduct. Requires Head of Creator approval. |

### Creator categories for managed creators

**Superstar (20 creators):**
- Reviewed and redefined monthly
- VVIP: high GMV tier and/or high fee tier and/or special case
- Fixed cap at 20 — limited by manpower to provide high-touch service
- Human-serviced by Creator Services team

**Everyone else:**
- Majority of managed creator pool
- Bot-serviced with automated workflows
- Human intervention only for escalations, renewals, and special situations

Both categories are still subject to contract tiers (silver, gold, diamond, celebrity).

### Creator tier by GMV

GMV tiers measure creator commerce value (monthly GMV in THB):

| GMV tier | Range |
|---|---|
| Tier 1 | <50K |
| Tier 2 | 50K–99K |
| Tier 3 | 100K–499K |
| Tier 4 | 500K–1M |
| Tier 5 | 1M–5M |
| Tier 6 | >5M |

TikTok is always the primary platform (is_primary = true). All other platforms are secondary.

---

## Recruiting

### Sources and funnel

**Sources (current mix):**
- Outbound DMs on TikTok/Shopee to creators with high GMV potential (primary)
- Scouting/scraping creator profiles on platforms
- Outbound via LINE or phone to identified targets
- Inbound applications from creators
- Referrals from existing managed creators (growth area — invest more)
- Platform partner referrals

**Funnel:**
outreach_sent → responded → screening → interview → negotiation → onboarding → converted

High-volume: thousands contacted per month, under 20 converted to managed. Low conversion by design — quality over quantity.

### Criteria for recruiting

- Managed status: minimum GMV tier 4 (>500K THB)
- Campaign-only status: minimum GMV tier 3 (>100K THB)
- Primary qualifier is GMV — commerce conversion capability, not follower count

### Process of recruiting

1. **Source:** identify targets via scouting, scraping, referrals, or inbound
2. **Outreach:** DM on platform or contact via LINE/phone
3. **Screen:** verify GMV tier, platform presence, content quality
4. **Interview:** assess fit, discuss service offerings and expectations
5. **Negotiate:** agree on tier, share fee %, contract terms
6. **Onboard:** sign management contract, set up in CRM, assign to Creator Services
7. **Convert:** creator status moves to managed in Northstar CRM

For ADP campaign recruiting: see Campaign section (recruit lists A–D, minimum 20 per campaign).

### Recruiting KPIs and SLA

**Primary KPI:** total GMV from creators newly recruited per month

**Funnel metrics (tracked for daily operations):**
- Outreach volume per week
- Reply rate
- Conversion rate at each funnel stage
- Converted creator tier distribution (are we recruiting high-value creators?)

---

## Campaign

### Platform campaigns: missions and incentives

- TikTok, Shopee, and Lazada run MCN incentive programs
- Structures: tiered bonuses based on GMV thresholds, per-creator incentives, campaign-specific bonuses, and combinations
- Policies introduced quarterly or ad hoc on a campaign basis
- Head of Creator and designated partnership windows track and negotiate terms
- Tracked in CRM as campaign type = platform_incentive

### Paid packages

**Two types:** Standard and Express

**How it works:**
1. Brand client buys creator content package through Commerce / Client Success
2. ERISA scopes: number of content pieces, format, creator tier needed
3. ERISA assigns creators and manages delivery
4. Margin = (client price − creator cost) × volume

**Creator sourcing priority:**
1. Managed creators (preferred — known quality, under contract)
2. Campaign-only creators (available, no management contract)
3. Outsourced creators (overflow only — agency_id recorded in CRM)

**Payment terms:** 50% upfront from client, 50% upon completion. (See financial-guardrails.md.)

**Paid package KPIs and SLA:**
- Primary KPI: on-time delivery rate
- SLA: [INPUT NEEDED — what is the target on-time rate? e.g., 95%? And what is the standard delivery timeline for Standard vs Express?]

### Affiliate campaigns — ADP (Affiliate Distribution Partnership)

Also known as "TAP" on TikTok and "AMS" on Shopee.

ADP is the structured framework for scaling affiliate campaign revenue — the backbone of ERISA's affiliate campaign business.

**ADP target:** 5M THB per month from top 10 campaigns combined (~250K average per active campaign)

**SPCC campaign mechanics:**
- **S**ales: negotiate best terms from brands
- **P**roduct: start with hero products only
- **C**ontent: both short video and livestream
- **C**reator: match by likelihood of performing (GMV tier + category fit)

**Vendor requirements:**
- Must offer best conditions in the market (commission %, incentives, support)
- Should support samples, vouchers, or ads
- If vendor can't meet these conditions, the campaign is not worth launching

**Brand evaluation for ADP:**
- ADP from our creator top selling brand list (whole MCN, reviewed weekly)
- Existing affiliate GMV >5M THB (assuming 10% ERISA share = 500K revenue potential)
- Existing >100 creators joined, with >20 creators selling >50K each

**Sales process for ADP:**
- Campaign team updates Top 5 performing ADP — weekly
- Campaign team sends Top 20 selling brands list from MCN to Commerce — monthly
- Commerce team monthly target: maximum 5 ADP launches per month, prioritized as:
  - Group 1: Top 20 selling brands from MCN, minimum total GMV per brand 1M/month
  - Group 2: Brands with high potential (meet all evaluation criteria)
  - Group 3: Strategic accounts (upselling/cross-selling)
- **All new ADP require Country Manager approval before launching**

**Recruit criteria for ADP campaigns:**
- Minimum 20 creators per campaign, sourced from ranked lists:
  - **List A:** Top 30 creators selling for DIRECT competition (similar brand, product, price, affiliate size)
  - **List B:** Existing top 30 creators already selling for the brand
  - **List C:** Top creators in the category (>1M GMV)
  - **List D:** Qualified creator requests from our MCN
- Recruit from Lists A–C. List D is supplementary.
- Current focus: livestream creators for Q3

**Campaign setup:**
- Start with hero products only — do not launch with full catalogue
- Bind to TikTok One and LINE OA (label properly) and CRM
- Go to PDP (Product Detail Page)

**ADP review cadence:**

Weekly:
- Top 10 campaigns by GMV
- New campaigns within first 30 days
- Any trigger: growth rate >100% and total >50K

Monthly:
- Number of campaigns launched (on track vs. quota of 5?)
- Number of creators joined per campaign (on track vs. minimum 20?)
- Validation review: 30-day window per campaign, passing line is 100K THB
- Brand negotiation for top 20 campaigns (>50K): ad support, vouchers, product, commission %

**ADP KPIs and SLA:**
- Primary KPIs: total GMV from affiliate campaigns, total commission earned (MCN spread)
- Campaign health: number of active campaigns, creators per campaign, 30-day validation pass rate
- Target MCN spread: >5%

### Affiliate Management Partnership — AMP

AMP is the account-level affiliate management service — "affiliate enablement" where ERISA takes ownership of a brand's entire affiliate strategy, not just individual campaigns.

**How AMP differs from ADP:**
- ADP = campaign-level: run individual affiliate campaigns focused on specific products with targeted creator recruitment
- AMP = account-level: manage all affiliate activities for a brand, including ADP campaigns, paid packages, creator selection, and content strategy as an integrated plan

**How AMP works:**
1. Set a GMV target with the client (typically 12-month engagement)
2. Devise a plan to reach the target by optimizing the strategy and mix of affiliate activities
3. Execute and adjust: run ADP campaigns, deploy paid packages, manage creator allocation — whatever the plan requires
4. Report against the GMV target, refine strategy monthly/quarterly

**AMP is a higher-value, longer-term engagement** — retainer relationship rather than project-based. Commerce / Client Success owns the client relationship, ERISA operates the affiliate strategy.

**AMP playbook:** [PLACEHOLDER — detailed operational playbook to be provided by Head of Creator]

---

## Creator Services

### Creator performance

**What we track per creator:**
- GMV generated (primary metric)
- GMV tier (1–6)
- Platform activity and content output
- Campaign participation and conversion rates
- Contract status and share fee compliance

**What we track at portfolio level:**
- Total managed creator count and growth
- Creator retention rate (renewal rate)
- Creator activeness (participation in campaigns and initiatives)
- Revenue per creator
- Tier distribution (growing the higher-tier pool?)
- Ticket close rate and time

**Review cadence:**
- Weekly: creator portfolio review — GMV, activity, retention
- Monthly: superstar list reviewed and redefined (fixed at 20)
- Monthly: individual creator performance flags — declining GMV, inactive creators, contract renewal pipeline
- At contract renewal: full performance review to inform tier and share fee negotiation

### Fee-sharing table

Share fee % based on 3-month average sales crossed with contract tier:

| Tier | >3.7M THB | >1M THB | >500K THB | <500K THB |
|---|---|---|---|---|
| Silver | 0% | 5% | 10% | 20% |
| Gold | 3% | 7% | 15% | - |
| Diamond | 7% | 15% | 20% | - |
| Celebrity | Case by case | - | - | - |

- Higher GMV = lower share fee % (volume incentive)
- Higher tier = higher share fee % at same GMV level (paying for more services)
- Gold and Diamond not available below 500K (aligns with managed creator minimum threshold)
- Celebrity is fully negotiated — Founder approval required
- Top creators negotiate heavily regardless of standard table

### Renewal rules and SLA

**Renewal process:**
- Renewal process starts 60 days before contract expiry
- All renewals are negotiated — never auto-renew. Creators currently have leverage; team must be proactive to ensure retention.
- Creator Services team reviews performance data, prepares renewal recommendation (same tier, upgrade, downgrade, or non-renewal)
- Share fee % and tier are renegotiated based on: services the creator wants, GMV performance, and fee % creator is willing to accept

**Renewal SLA:**
- Day 60 before expiry: Creator Services flags expiring contracts, initiates renewal outreach
- Day 45 before expiry: first negotiation conversation completed
- Day 30 before expiry: renewal terms agreed or escalated to Head of Creator
- Day 14 before expiry: new contract signed and recorded in CRM (new row, is_active = true)
- Day 0 (expiry): if not renewed, creator moves to inactive status

**Approval requirements:**
- Silver/Gold renewals: Creator Services team can finalize
- Diamond renewals: Head of Creator approval
- Celebrity renewals: Founder approval
- Any renewal with share fee % below the standard table: Head of Creator approval

**Creator Services KPIs and SLA:**
- Primary KPIs: total GMV from managed creators, creator retention rate, creator activeness, ticket close rate and time
- Renewal SLA: 100% of expiring contracts must have renewal outreach initiated by Day 60
- Superstar retention: target zero unplanned superstar losses per quarter

**Paid-package SLA:**
- Standard package: delivered within 45 days from confirmed order
- Express package: delivered within 30 days from confirmed order
- On-time delivery rate tracked monthly and reported in EA P&L review

---

## Cross-pillar coordination

**With Commerce / Client Success:**
- Commerce owns client relationships for all client-initiated work
- ERISA receives briefs from Commerce, delivers through creator pool, reports back
- Monthly: Campaign team sends top 20 selling brands list to Commerce for ADP opportunities
- ADP sales: Commerce identifies and sells (max 5/month), ERISA operates

**With Erify (Content Management):**
- When campaigns or paid packages require livestream or short video production, Erify provides production support
- ERISA supplies creators, Erify provides studio and production team
- Scheduling: ERISA confirms creator availability, Erify manages studio slots and MC assignments

---

## Operational cadence

**Daily:**
- Pillar standup: Recruit + Creator Services + Campaign teams
- Focus: outreach progress, creator issues, campaign performance, blockers

**Weekly:**
- Team review: Head of Creator + Team Leads
- ADP review: top 10 campaigns, new campaigns within 30 days, growth triggers
- Creator portfolio review: GMV, activity, retention
- Top 5 performing ADP update (Campaign team)
- Business review: Head of Creator meets with Country Manager

**Monthly:**
- ADP: campaign count and creator recruitment tracking, 30-day validation (100K passing line)
- Top 20 selling brands list sent to Commerce
- Brand negotiation actions for top 20 campaigns
- Superstar list reviewed and redefined (fixed at 20)
- Individual creator performance flags
- Contract renewal pipeline review
- Pillar P&L review: Head of Creator + Country Manager

**Quarterly:**
- QBR: ERISA pillar → Country Manager → Founder
- Platform incentive program review and renegotiation
- Creator tier and renewal pipeline review
- ADP strategy: portfolio health, expansion targets

**Annually:**
- Creator growth strategy: target count, tier mix, GMV targets
- ADP expansion: new categories, new platform opportunities
- Service catalogue review: are the 62 service items still competitive?
