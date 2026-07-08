---
name: finance-ops
description: >
  Finance operations — accounts receivable, accounts payable, monthly close process,
  reconciliation (MC, creator, platform SLP, client), tax compliance (WHT, VAT, SSO),
  finance calendar, petty cash, record keeping, and data integrity.
  Use when the request involves invoicing, payments, expenses, financial reporting,
  tax filing, reconciliation, or monthly close.
---

# Finance Operations

---

## General

### What Finance covers

Finance is an operational support function serving all three pillars (Commerce, Erify, ERISA). It handles accounts receivable, accounts payable, reconciliation, tax compliance, and financial reporting.

**Team:**
- Internal finance person (junior) — prepares records, reconciles, handles most day-to-day files
- External accountant (experienced) — advises on accounting matters, files taxes with government agencies

**Reports to:** Country Manager

**Relationship to pillars:** Finance supports all pillars but does not own any pillar P&L. Each Head of Pillar owns their P&L and reviews monthly with Country Manager. Finance will join monthly pillar reviews in a later phase.

**Key references:**
- Financial thresholds, spend tiers, payment terms → financial-guardrails.md
- Cash position and cost breakdown → finance-confidential.md

---

## Accounts receivable

### Invoicing process

- Invoicing follows the deal fulfillment pipeline: contract_signed → invoice_issued → payment_received
- Invoice issued per the agreed payment terms for each service type (see financial-guardrails.md)
- Track amount_invoiced vs amount_received per deal in Northstar Sales CRM

### Collection tracking

- All payments received confirmed against bank account on the 2nd of each month
- Client payment overdue beyond 7 days triggers escalation (per financial-guardrails.md)
- Collection status reviewed as part of monthly finance review

### Overdue escalation

- 7 days overdue: flag to account owner and Head of Pillar
- Persistent overdue: escalate to Country Manager
- Any single client default or write-off exceeding 100,000 THB: escalate to Founder (freeze threshold per financial-guardrails.md)

---

## Accounts payable

### Payment schedule (monthly calendar)

| Date | Payment | Code |
|---|---|---|
| 2nd | Check and confirm all payments received into bank account | — |
| 5th | Finance prepares amounts for: MC cost (1st batch), part-timer cost, sales commission, rent, petty cash | EFMC, EUPT, CS Comm |
| 10th | Payment release: payroll, rent, EFMC (1st batch), CS commission, petty cash | — |
| 15th | Creator payment (1st batch) | EACR |
| 20th | Utilities payment | — |
| 20th | Finance prepares amounts for MC cost (2nd batch) | EFMC |
| 25th | Payment release: EFMC (2nd batch), other expenses (security, pool table rental) | — |
| 30th | Creator payment (2nd batch) | EACR |

**Key codes:**
- EFMC = Erify MC cost
- EUPT = Erify part-timer cost
- CS Comm = Client Success (sales) commission
- EACR = ERISA creator cost

Creator and MC payments are both released twice per month (bi-monthly cycle).

**MC payment work periods:**
- 1st batch (released 10th): covers work performed 16th–end of previous month
- 2nd batch (released 25th): covers work performed 1st–15th of current month

**Creator payment work periods:**
- Per-campaign reconciliation — each campaign may have different ending dates
- Consolidated payments released on 15th and last day of the month
- Payment batches must be prepared and ready 5 days before each release date (i.e., by the 10th and 25th)

### Payment rules

- No payment to any vendor or creator without a signed contract or approved PO on file
- Sales commission: only on received amount, not contract amount. Tax invoice must be issued before payout. (See financial-guardrails.md for full commission rules.)
- Creator payouts follow management contract terms — never modify share_fee_pct or tier on active contract
- Commission recipients must be verified: internal (shared.users) or external (shared.organizations)
- All payments require supporting documents on file

### Expense and petty cash

- Petty cash float: 10,000 THB per month
- Maximum per transaction: 2,000 THB — anything above must go through normal spend approval (see financial-guardrails.md)
- Petty cash released on the 10th with other payments

**Allowed items:**
- Office supplies (paper, stationery, printer ink, etc.)
- Studio supplies and small props
- Transportation for work-related errands
- Meals for work events or client meetings
- Minor equipment or tool replacements under 2,000 THB
- Postage and courier fees

**Not allowed:**
- Personal expenses of any kind
- Alcohol
- Software subscriptions (use normal spend approval)
- Equipment purchases above 2,000 THB (use normal spend approval)
- Cash advances to employees or contractors
- Any recurring commitment

- All petty cash expenses must have receipts collected and filed
- Petty cash reconciled monthly — receipts vs remaining float must match
- Spend approval tiers apply to all expenses (see financial-guardrails.md)

---

## Monthly close

### Process

- Monthly close completed within the first 2 weeks of the following month
- Internal finance person prepares all records and reconciliations
- External accountant reviews and advises
- Books cannot be closed with unresolved reconciliation discrepancies

### Monthly close timeline

All dates refer to the month following the close period (e.g., closing March books in April):

| Day | Task | Owner |
|---|---|---|
| 1st–2nd | Confirm all bank transactions for previous month. Identify any missing receipts or unrecorded transactions. | Internal finance |
| 2nd–3rd | Complete client payment reconciliation — amount received vs invoices vs CRM records | Internal finance |
| 3rd–5th | Record and categorize all bank transactions. Ensure all invoices for the period have been issued. | Internal finance |
| 5th–7th | Verify all previous month payment batches (EFMC, EACR, vendor) were reconciled and released correctly. Flag any discrepancies. | Internal finance |
| 7th–9th | Categorize revenue by service type and pillar. Categorize expenses by pillar and cost type (fixed vs variable). | Internal finance |
| 9th–10th | Document outstanding receivables and payables. Prepare AR aging report. | Internal finance |
| 10th–12th | Prepare pillar P&L drafts for Country Manager review. Resolve any remaining discrepancies. | Internal finance |
| 12th–14th | External accountant reviews books, advises on adjustments. Finalize and close books. | External accountant + internal finance |
| 14th | **Monthly close deadline.** Books finalized. P&L ready for monthly review with Country Manager + Heads. | Internal finance |

---

## Reconciliation

### Principle

Every outgoing payment and incoming receipt must be reconciled against internal records and bank statements. Reconciliation is not optional and must be completed before payments are released.

### MC payment reconciliation (EFMC)

| Batch | Work period | Reconcile by | Payment release |
|---|---|---|---|
| 1st batch | 16th–end of previous month | 5th | 10th |
| 2nd batch | 1st–15th of current month | 20th | 25th |

- Reconcile MC hours worked vs scheduling records vs contracted rates
- Verify total cost per MC aligns with contract terms
- Flag any discrepancies before payment release

### Creator payment reconciliation (EACR)

| Batch | Reconciliation basis | Reconcile by | Payment release |
|---|---|---|---|
| 1st batch | Per-campaign reconciliation | 10th | 15th |
| 2nd batch | Per-campaign reconciliation | 25th | 30th (last day) |

- Each campaign may have different ending dates — reconcile per campaign
- These are outgoing payments from ERIDU to creators for paid-package work (content produced for clients)
- Verify creator deliverables completed vs agreed per-content rate per campaign
- Consolidated payment batches reconciled 5 days before release date

### Platform payout reconciliation — Shopee SLP

Shopee SLP has a structured payout process with strict turnaround times:

| Date | Step | Action required |
|---|---|---|
| 9th–10th | Shopee sends slot report for previous month | Review immediately |
| Within 1 day of slot report | Report any discrepancies on slots to Shopee | **1-day turnaround — strictly followed** |
| 16th–19th | Shopee sends amount report | Review immediately |
| Within 1 day of amount report | Report any discrepancies on amounts to Shopee | **1-day turnaround — strictly followed** |
| 23rd | 1st payment batch released by Shopee (amounts ≤600K THB) | Confirm receipt against bank statement |
| 6th of following month | 2nd payment batch released by Shopee (amounts >600K THB) | Confirm receipt against bank statement |

- Missing the 1-day turnaround window means accepting Shopee's reported figures — reconcile immediately upon receiving reports
- Reconcile Shopee payments received against amount report and bank statement

### Client payment reconciliation

- All client payments confirmed against bank account on the 2nd of each month
- Reconcile: amount received vs invoice issued vs CRM deal fulfillment record
- Discrepancies flagged to account owner and Head of Commerce

### General reconciliation

- Vendor payments: reconcile against POs/contracts and bank statements
- Other platform payouts (TikTok, Lazada): reconcile against platform reports and bank statements as received
- Full reconciliation completed as part of monthly close (within first 2 weeks of following month)
- Unresolved discrepancies must be flagged to Country Manager — never close books with unresolved items

---

## Tax compliance

### Withholding tax — contractors, creators, MCs, part-timers

- Thai withholding tax applies to all contractor payments (creators, MCs, part-timers)
- Creator tax profiles maintained in Northstar CRM (creator.creator_tax_profiles) — contains legal_full_name, national_id (13 digits), tax_id, date_of_birth, nationality, address
- Tax profile data restricted to Finance and Legal access only

**Withholding tax certificate (50 Tawi) process:**
- Certificates issued monthly (consolidated) — not per payment
- Internal finance person prepares certificates based on all contractor payments made during the month
- Certificates must be issued and delivered to contractors by the 15th of the following month (aligned with PND 3/53 filing deadline)

**Withholding tax filing (PND 3/53):**
- Filed monthly with the Revenue Department via e-filing (mandatory since January 2025)
- **Deadline: 15th of the following month** (e-filing deadline; paper filing deadline is 7th but e-filing is now mandatory)
- PND 3: for payments to individuals (creators, MCs, freelancers, part-timers)
- PND 53: for payments to companies/juristic persons (vendors, agencies)
- Internal finance person prepares filing documents
- External accountant reviews and files with government

### VAT filing

- VAT filed monthly per Thai law (PP 30)
- **Deadline: 15th of the following month** (paper); **23rd of the following month** (e-filing — always use e-filing)
- VAT rate: 7% (reduced from 10%, extended through September 2026)
- Must file even if no sales in the month (nil return)
- Internal finance person prepares VAT records (input and output tax)
- External accountant reviews and files

### Social Security (SSO) filing

- Filed monthly for all employees (not contractors)
- **Deadline: 15th of the following month**
- Contribution rate: 5% of salary for both employer and employee
- Salary ceiling for contribution calculation: THB 17,500/month (effective January 2026), max contribution THB 875/month per party
- Internal finance person prepares SSO contribution calculations
- External accountant files with Social Security Office

### Tax compliance timeline (monthly)

All deadlines refer to the month following the tax period. Since January 2025, withholding tax returns must be filed electronically via the Revenue Department's e-Filing system.

| Deadline | Filing | Legal basis | Owner |
|---|---|---|---|
| By 15th | Social Security (SSO) contributions | Social Security Act | External accountant (internal prepares) |
| By 15th | Withholding tax filing — PND 3 (individuals) and PND 53 (companies) | Revenue Code; e-filing mandatory from Jan 2025 | External accountant (internal prepares) |
| By 15th | Withholding tax certificates (50 Tawi) issued to all contractors, creators, MCs, part-timers | Revenue Code | Internal finance |
| By 23rd | VAT filing (PP 30) via e-filing | Revenue Code; 8-day e-filing extension | External accountant (internal prepares) |

**Important notes:**
- E-filing is mandatory for withholding tax returns from January 2025. Paper filing requires written explanation of why e-filing was not used.
- VAT paper filing deadline is the 15th; e-filing extends this to the 23rd. Always file electronically.
- SSO contribution ceiling: THB 17,500 per month effective January 2026 (max contribution THB 875/month for both employer and employee at 5% rate).
- VAT rate: 7% (reduced from 10%, extended through September 2026).
- Late filing penalties: fines up to THB 2,000 plus 1.5% monthly surcharge on unpaid tax. SSO late payment surcharge is 2% per month.

### Tax invoices

- Tax invoices required before sales commission payouts
- Tax invoices issued for all client billings
- All tax invoices must be numbered sequentially and filed

### Annual tax obligations

- Corporate income tax filing — managed by external accountant
- Annual withholding tax summary (PND 1a) — issued to all contractors by February
- Timelines managed by external accountant, internal finance provides supporting documents

---

## Finance calendar

### Comprehensive monthly calendar

| Date | Activity | Category |
|---|---|---|
| 2nd | Confirm all payments received into bank account | AR |
| 5th | Prepare payment batches: EFMC 1st, EUPT, CS Comm, rent, petty cash | AP prep |
| 5th | Reconcile MC 1st batch (work: 16th–EOM previous month) | Reconciliation |
| 9th–10th | Receive Shopee SLP slot report → review and report discrepancies within 1 day | Platform reconciliation |
| 10th | Payment release: payroll, rent, EFMC 1st batch, CS commission, petty cash | AP release |
| 10th | Reconcile EACR 1st batch (per-campaign) | Reconciliation |
| 14th | **Monthly close deadline** (for previous month) | Monthly close |
| 15th | EACR 1st batch payment release (creator payments) | AP release |
| 15th | **SSO filing deadline** (for previous month) | Tax |
| 15th | **Withholding tax filing deadline** — PND 3/53 via e-filing (for previous month) | Tax |
| 15th | **Withholding tax certificates** (50 Tawi) issued to all contractors | Tax |
| 16th–19th | Receive Shopee SLP amount report → review and report discrepancies within 1 day | Platform reconciliation |
| 20th | Utilities payment | AP release |
| 20th | Prepare EFMC 2nd batch | AP prep |
| 20th | Reconcile MC 2nd batch (work: 1st–15th current month) | Reconciliation |
| 23rd | **VAT filing deadline** (PP 30 via e-filing, for previous month) | Tax |
| 23rd | Shopee SLP 1st payment batch received (≤600K THB) — confirm against bank | Platform AR |
| 25th | EFMC 2nd batch + other expenses (security, pool table rental) | AP release |
| 25th | Reconcile EACR 2nd batch (per-campaign) | Reconciliation |
| 30th (last day) | EACR 2nd batch payment release (creator payments) | AP release |
| 6th (following month) | Shopee SLP 2nd payment batch received (>600K THB) — confirm against bank | Platform AR |

### Budget cycle

- Budget set quarterly, reviewed monthly
- Monthly financial review: Country Manager + Heads of Pillars (Finance joins in later phase)
- While cash position is TIGHT: weekly cash flow check by Finance + Country Manager (Monday morning)

---

## Record keeping, documentation, and data integrity

### Principle

Financial record accuracy is non-negotiable. Errors in financial records affect payments, tax compliance, client trust, and company decision-making. Every transaction must be documented, traceable, and verifiable.

### Record keeping requirements

- Every payment (in or out) must have a supporting document: invoice, receipt, contract, PO, or approved request
- All client records maintained in Northstar Sales CRM — profile, activities, deal details, fulfillment status
- All contracts and financial documents stored in Google Drive with consistent naming and folder structure
- Creator tax profiles and bank details maintained in Northstar CRM with restricted access (Finance and Legal only)

### Data integrity rules

- No manual overrides to CRM financial data without documented justification and Country Manager approval
- Reconciliation discrepancies must be resolved before monthly close is finalized — never close with unresolved items
- Soft delete only — never hard-delete financial records from any system
- All changes to financial records must be traceable (audit_log in shared schema)
- Duplicate entries must be identified and resolved immediately

### Documentation standards

- Payment batches: documented with amounts, recipients, and approval before release
- Petty cash: receipts collected for every transaction, reconciled monthly
- Tax documents: withholding certificates, tax invoices, and filing receipts retained per Thai legal requirements
- Retention: all financial documents retained for minimum period required by Thai law (external accountant advises on specific periods)

---

## Key metrics and operational cadence

### Key metrics

- Collection rate: amount_received vs amount_invoiced
- AR aging: outstanding receivables by age (7 / 14 / 30 / 60 days)
- AP accuracy: payments released on schedule per finance calendar
- Reconciliation completion: all items reconciled before monthly close deadline
- Petty cash accuracy: receipts vs float
- Monthly close timeliness: completed within first 2 weeks

### Operational cadence

**Daily:**
- Process incoming payments and expenses
- Update CRM with payment status

**Weekly:**
- While cash position is TIGHT: Monday cash flow check (Finance + Country Manager)
- MC cost review (Erify provides data, Finance tracks)

**Monthly:**
- Finance calendar execution (2nd through 30th)
- Monthly close (1st–14th of following month)
- Full reconciliation
- P&L preparation by pillar for Country Manager review

**Quarterly:**
- Budget setting
- Tax filing (per external accountant schedule)
- Commission and incentive policy review support (prepare data for sales team)

**Annually:**
- Annual tax filing and audit preparation (external accountant leads)
- Financial document retention review
