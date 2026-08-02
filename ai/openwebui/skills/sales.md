---
name: sales
description: >
  Sales operations — sales playbook, deal pipeline stages, funnel sources, quotation
  and proposal process, deal fulfillment, prospect management (LoP), CRM usage,
  nurturing, cross-sell/upsell, commission policy, and operational cadence.
  Use when the request involves client acquisition, deals, pipeline, proposals,
  quotations, sales commission, or prospecting.
---

# Sales

---

## General

### What Sales does

Sales is the pre-sale and client acquisition function within Commerce. Owned by the Client Success team under Commerce, Sales manages the pipeline from lead sourcing through deal closure, then hands off to Enablement for delivery. Sales also handles billing, collections, and client relationship basics (MOT) post-sale.

**Owned by:** Head of Commerce

**Relationship to Commerce:** Sales (Client Success) is one of two teams under Commerce. Sales owns the pipeline and client relationship. Enablement owns the delivery and growth roadmap. Both report to Head of Commerce.

---

## Sales playbook

### Sales toolkit

- **Sales/brand kit:** pitch deck, studio tour SOP, case studies, media library
- Kit must be kept current — update case studies and media library at least quarterly
- Studio tour SOP: standardized process for bringing prospects through the studio to showcase capabilities

### Sales process

1. **Pre-pitch:** research the prospect — brand, category, platform presence, current GMV, competitive landscape, content commerce readiness
2. **First touch:** initial outreach via referral, inbound, outreach, or platform introduction
3. **Product discovery:** understand the prospect's needs, current pain points, growth goals, and budget. Map to ERIDU's service offerings.
4. **Pitch:** present tailored solution using sales/brand kit. Focus on GMV outcomes, not service features.
5. **Follow-up cadence:** structured follow-up sequence after pitch — timing and touchpoints must be consistent
6. **Proposal/quotation:** issue formal proposal with pricing, scope, GMV targets, and terms
7. **Negotiation and close:** negotiate terms, secure approval, move to contract

### Product and pricing

- Sales must understand all service offerings across pillars: enablement, livestream (standard/premium), paid packages, ADP, AMP, short video
- Pricing follows standard rate cards — deviations require Head of Commerce or Country Manager approval (see financial-guardrails.md)
- All quotations must be formally issued and recorded

---

## Sales management

### Lead funnel and process

**Lead sources (funnel types in CRM):**
shopee_slp, shopee_affiliate, tiktok_affiliate, tiktok_am, tiktok_tsp, lazada, inbound_website, inbound_others, client_referral, creator_referral, vendor_turned_client, outreach

- SLP brands: Shopee Livestream Partner program brands — a key lead source
- All leads must be logged in Northstar CRM with funnel source
- Tax ID must be collected and recorded for all prospects that reach proposal stage

### Deal pipeline stages

| Stage | Criteria to progress |
|---|---|
| New | Lead identified and logged in CRM |
| Qualified | Prospect meets minimum criteria (budget, need, platform presence) |
| Proposal | Formal proposal/quotation issued |
| Quote issued | Quotation sent to prospect |
| Quote approved | Prospect approves quotation |
| Negotiation | Terms being discussed/adjusted |
| Closed won | Deal signed — triggers fulfillment pipeline |
| Closed lost | Deal lost — reason logged in CRM |

Deal value = agency fee in THB.

### Deal fulfillment pipeline (post-sale)

Created automatically when deal stage = closed_won:

contract_issued → contract_approved → contract_signed → invoice_issued → payment_received

Fulfillment tracks: amount_invoiced and amount_received per deal.

### LoP (List of Prospects)

Prospects are categorized by target tier:
- **SA prospects** — strategic account targets, highest priority
- **KA prospects** — key account targets
- **FA prospects** — filler account targets

LoP is maintained and reviewed regularly to ensure pipeline aligns with account tier targets.

### CRM

- All pipeline activity managed in Northstar Sales CRM
- Client records: org_id → shared.organizations, with tier, status, contacts
- Tax ID must be recorded for all clients
- Activities (calls, messages, emails, meetings, notes, offers) logged and linked to client + deal + brand + contact
- Documents (quotes, contracts, invoices, NDAs) stored in Supabase storage (sales-documents bucket)

### Nurturing and growth

- **Teaser and intel:** share relevant market intelligence, platform updates, and content commerce trends with prospects to maintain engagement
- **Cross-sell:** identify opportunities to sell additional services to existing clients (e.g., add livestream to an enablement client)
- **Upsell:** identify opportunities to upgrade existing service scope (e.g., standard to premium livestream, add ADP/AMP)

### Market intelligence

- Sales team collects and shares market intelligence: competitor activity, platform trends, category performance, pricing benchmarks
- Used to inform pitch strategy, prospect prioritization, and pricing decisions

### Sales review cadence

**Daily:**
- Pipeline activity review — new leads, follow-ups due, deal progress

**Weekly:**
- Pipeline review: Head of Commerce + sales team
- Deal-by-deal status, blockers, next actions
- Sales breakdown by funnel source and tier

**Monthly:**
- Revenue review: closed deals vs target
- Pipeline health: conversion rates by stage, average deal cycle time
- Nurturing pipeline: prospects in development, cross-sell/upsell opportunities
- Sales breakdown analysis

**Quarterly:**
- QBR: sales performance vs targets
- Funnel source effectiveness review
- LoP refresh and prospect tier reassignment
- Commission and incentive policy review (policy may change quarterly)

---

## Commission and incentive policy

**Base rules** (see also financial-guardrails.md):
- Commission only issued after client payment is received
- Commission calculated on received amount, not contract amount
- Tax invoice must be issued before commission payout

**Commission rates:**
- 1% commission on fee received
- 2% on retention deals (second month onward)
- 1% on incremental GMV exceeding target

**Note:** Commission rates and additional incentive structures are subject to change each quarter. Current rates are reviewed and confirmed at each quarterly review.

---

## Account management (sales scope)

Sales covers the billing and relationship basics of account management. Enablement delivery is covered in commerce.md.

### Billing and collections

- Maintain full records of client profile and activities in CRM
- Contracts and documents stored in Google Drive
- Invoice issuance follows deal fulfillment pipeline
- Payment collection tracked: amount_invoiced vs amount_received
- Client payment overdue beyond 7 days triggers escalation (per financial-guardrails.md)

### MOT (Moment of Truth)

- Every client interaction is an opportunity to reinforce ERIDU's quality and reliability
- Maximize MOT across all touchpoints: response time, communication quality, delivery consistency
- MOT is a shared responsibility between Sales and Enablement

### Response time, quality, consistency

- Client LINE response: within 1 hour during business hours
- Client email response: within 24 hours
- Communication quality: professional, solution-oriented, proactive
- Consistency: same standards regardless of client tier — SA/KA/FA all receive reliable communication

---

## Key metrics, SLAs, and operational cadence

### Key metrics

- Pipeline value (total deals in progress)
- Conversion rate by stage
- Average deal cycle time (lead to closed_won)
- Closed revenue vs monthly/quarterly target
- Funnel source effectiveness (which sources produce highest-value deals)
- Client retention rate (second month renewal = retention deal)
- Cross-sell/upsell revenue

### SLAs

- All leads logged in CRM within 24 hours of identification
- Proposals issued within [PLACEHOLDER — target turnaround time to be defined]
- Follow-up cadence strictly maintained per sales playbook
- Tax ID collected for all prospects at proposal stage
- Commission payout only after payment received + tax invoice issued

### Operational cadence

**Daily:**
- Pipeline activity: new leads, follow-ups, deal progress

**Weekly:**
- Pipeline review with Head of Commerce
- Sales breakdown by source and tier
- Business review: Head of Commerce meets Country Manager

**Monthly:**
- Revenue vs target review
- Pipeline health and conversion analysis
- Nurturing and cross-sell/upsell opportunity review
- Pillar P&L review (combined with Commerce)

**Quarterly:**
- QBR: Commerce/Sales → Country Manager → Founder
- Commission and incentive policy review and update
- LoP refresh
- Funnel source effectiveness review

**Annually:**
- Sales target setting
- Account tier strategy
- Sales toolkit refresh (deck, case studies, media library)
