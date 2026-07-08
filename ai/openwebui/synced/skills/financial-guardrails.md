---
name: financial-guardrails
description: >
  ERIDU financial guardrails — spend approval tiers, cash position status, petty cash
  policy, P&L triggers, budget cycle, payment schedules, payment terms by service type,
  and financial escalation thresholds. Always load this skill alongside core-principles.
---

# Financial Guardrails — ERIDU

## Spend approval tiers

| Amount (THB) | Approver | Examples |
|---|---|---|
| Under 5,000 | Head of Pillar | Supplies, minor tools, small ad hoc costs |
| 5,000 – 10,000 | Country Manager | Contractor payments, equipment, software |
| 10,000 – 50,000 | Country Manager + Founder notified | Large vendor payments, campaign spend |
| Above 50,000 | Founder approval required | Strategic spend, partnerships, capital commitments |

Note: these tiers apply to one-time and per-transaction spend. See recurring spend rules below.

## Cash position status

The company maintains a cash position status that affects spending behavior across all sections below. The status is set and updated by the Founder based on actual cash reserve levels (see confidential finance-ops skill for current numbers).

| Status | Meaning |
|---|---|
| **TIGHT** | Cash reserve is critically low. All non-essential fixed cost spend is frozen. New recurring commitments require Founder approval regardless of amount. Weekly cash flow review active. Only revenue-generating variable costs and contractual obligations proceed. |
| **NORMAL** | Cash reserve is healthy. Standard spend tiers and approval thresholds apply. Monthly review cadence. |

**Current status: TIGHT.** Refer to finance-confidential.md for specific reserve levels and recovery targets.

## Cost structure

ERIDU's operating costs have two components:
- **Variable costs** — MC cost and creator cost. These scale with revenue (livestream hours sold, packages sold). Acceptable to grow when tied to sold work.
- **Fixed costs** — payroll, rent, tools, admin. These are the baseline burn. Increases require strong justification — and are near-frozen while cash position is TIGHT.

Actual cost breakdown and monthly figures are in the confidential finance-ops skill.

## Recurring vs. one-time spend

- **While cash position is TIGHT:** No new recurring commitments without Founder approval, regardless of amount. Existing recurring spend should be reviewed for cancellation or reduction.
- Recurring commitments (subscriptions, retainers, ongoing vendor contracts) require one tier higher approval than their monthly amount would suggest — a 5,000 THB/month subscription is a 60,000 THB annual commitment.
- One-time spend follows the standard tier table above.
- Any new recurring spend must be budgeted — unbudgeted recurring requires Founder approval regardless of amount.
- Existing recurring spend that increases by more than 20% requires re-approval at the appropriate tier.

## Petty cash policy

- Monthly float: 10,000 THB
- Maximum per transaction: 2,000 THB — anything above goes through normal spend approval tiers
- Allowed: office supplies, studio supplies and small props, work transportation, work meals, minor equipment under 2,000 THB, postage/courier
- Not allowed: personal expenses, alcohol, software subscriptions, equipment above 2,000 THB, cash advances, any recurring commitment
- All transactions require receipts — reconciled monthly against remaining float
- Released on 10th of each month with other payment batches

## P&L triggers

**Warning thresholds** (flag to Head of Pillar + Country Manager):
- Pillar monthly revenue misses forecast by more than 15%
- Monthly operating costs exceed budget by more than 10%
- Any client payment overdue beyond 7 days
- MC cost per hour increases more than 10% without corresponding revenue increase

**Freeze thresholds** (pause non-essential spend, escalate to Founder):
- Cash reserve drops below the minimum threshold defined in finance-confidential.md
- Company-wide monthly burn exceeds revenue for any single month (tightened while cash position is TIGHT; 2 consecutive months when NORMAL)
- Any single client default or write-off exceeding 100,000 THB
- Monthly GMV from creators drops more than 20% month-over-month
- Revenue from clients drops more than 20% month-over-month
- MC cost increases more than 20% month-over-month

## Budget cycle and review cadence

- Budget cycle: quarterly budget setting, reviewed monthly
- **While cash position is TIGHT:** weekly cash flow check by Finance + Country Manager (Monday morning — outstanding receivables, upcoming payables, current balance)
- Monthly financial review: Country Manager + Heads of Pillars + Finance. First week of each month.
- Pillar P&L review: each Head reviews their pillar P&L monthly with Finance. Erify (content management) owns its own P&L review given its cost structure (MC hours, studio costs).

## Emergency spend protocol

- Emergency defined as: unplanned spend required to prevent revenue loss, legal liability, or platform partnership damage.
- Emergency spend up to 10,000 THB: Country Manager can approve immediately, notify Founder within 24 hours.
- Emergency spend above 10,000 THB: Founder approval required even if it delays the action.
- All emergency spend must be documented with justification within 48 hours.

## Payout schedules

**Creators and MCs:**
- Paid twice per month (bi-monthly cycle)
- Creator payouts follow management contract terms — never modify share_fee_pct or tier on an active contract. Create a new contract row per renewal.

**Sales rep commissions:**
- Commission is only issued after client payment is received
- Commission calculated as % of the received amount, not the contract amount
- A tax invoice must be issued before commission payout is processed
- No commission on unpaid or partially paid deals — only on the portion actually collected

**Client invoicing:**
- Follows deal fulfillment pipeline: contract_signed → invoice_issued → payment_received
- Vendor payments require approved PO or signed contract on file
- Commission recipients must be verified: internal (shared.users) or external (shared.organizations) — never pay to unverified entities

## Default payment terms by service type

- Creator paid-packages: 50% upfront, 50% upon completion of work
- Affiliate campaigns (% only): weekly platform payout cycle
- Standard and premium livestream (default): NET 0 (invoice upon completion) + 7–15 days for GMV stats collection if there is a % component
- Standard livestream — Shopee SLP (exception): NET 30 (existing business terms)
- Enablement clients (default): NET 0 + 7 days for GMV stats collection
- Enablement clients (exception, case by case): NET 30 + up to 15 days for GMV stats collection — requires Head or Country Manager approval
- Deviations from standard terms on deals under 10,000 THB: act and notify
- Deviations from standard terms on deals above 10,000 THB: propose and wait for Head approval

## Financial escalation thresholds

These thresholds are referenced by the "Who decides" framework in core-principles.md:

- **Act and notify:** deviations from standard payment terms on deals under 10,000 THB
- **Propose and wait:** deviations on deals above 10,000 THB; client deals above 30,000 THB; any commitment spanning more than 6 months
- **Escalate immediately:** any financial anomaly, overdue payments beyond 7 days, fraud indicators

**Note:** 30,000 THB is the deal approval threshold (propose and wait before proceeding). 50,000 THB is the spend/contract signing threshold (Founder approval required per spend tiers above). A deal above 30K needs approval before proposal; a contract above 50K needs Founder sign-off before execution.

## What is not included here

The following are intentionally excluded from this skill and from all shared brain files:
- Actual cash reserve levels and recovery targets
- Monthly operating cost breakdown (fixed vs. variable amounts)
- Actual salary and incentive numbers
- Detailed P&L statements or financial projections
- Specific client deal values or commission rates
- Creator compensation specifics beyond tier structure
- Bank account details, credentials, or access keys

These live in confidential workspaces (finance-confidential.md, hr-confidential.md) with restricted access.
