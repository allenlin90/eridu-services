# Open WebUI Skills Import Test Plan (Revised)

## Purpose

This testing plan is structured for the **Business Unit Managers** (`Commerce - Sales`/`Commerce - Operation`, `Erify - Offset`/`Erify - Onset`, and `Erisa - Creator`/`Erisa - Campaign`) to verify that the custom models and attached skills inside Open WebUI behave according to policy guidelines and route questions to the correct context.

---

## 💼 1. Commerce - Test Cases

* **Target Assistants**: Commerce - Operations Assistant (`commerce-assistant`) or Commerce - Sales Assistant (`commerce-sales-assistant`)

---

### [Test Case CM-01] Assistant: Commerce - Sales Assistant
* **Prompt**:
  ```text
  What are the core stages of our sales pipeline, and what is the process for proposing custom pricing terms to a prospect?
  ```
* **Pass Criteria**: Must correctly outline our sales pipeline stages and state the approval limits/process for offering custom pricing.

---

### [Test Case CM-02] Assistant: Commerce - Operations Assistant
* **Prompt**:
  ```text
  A key account's shop performance has shown a sudden decline this week. What actions should Commerce operations take immediately?
  ```
* **Pass Criteria**: Must list clear analytical checks (traffic, campaigns, fulfillment) and identify the client escalation hierarchy.

---

### [Test Case CM-03] Assistant: Commerce - Operations Assistant
* **Prompt**:
  ```text
  A new Commerce client has just signed their contract. Detail the handoff workflow from Sales to Operations.
  ```
* **Pass Criteria**: Must cover post-contract setup items, client documentation handoff, and kickoff meetings.

---

## 🎬 2. Erify - Test Cases

* **Target Assistants**: Erify - Performance Assistant (`performance-assistant`), Erify - Production Assistant (`production-assistant`), or Erify - Scheduling Assistant (`scheduling-assistant`)

---

### [Test Case EF-01] Assistant: Erify - Performance Assistant
* **Prompt**:
  ```text
  What are the primary operational metrics we use to review our weekly livestream scheduling and content quality?
  ```
* **Pass Criteria**: Must cite metrics from the metrics framework, distinguishing scheduled vs. actual hours and QC pass rates.

---

### [Test Case EF-02] Assistant: Erify - Production Assistant
* **Prompt**:
  ```text
  A client complained about low resolution and audio delays on yesterday's stream. What post-production QC process should we run?
  ```
* **Pass Criteria**: Must outline the QC review checklist, technical logs check, and incident logging workflow.

---

### [Test Case EF-03] Assistant: Erify - Scheduling Assistant
* **Prompt**:
  ```text
  An operator is requesting a schedule change for next week's shift. How do we review and approve duty manager coverage changes?
  ```
* **Pass Criteria**: Must identify shift swap rules, operator assignments, and duty manager coverage requirements.

---

## 🤝 3. Erisa - Test Cases

* **Target Assistant**: Erisa - ADP Assistant (`erisa-adp-assistant`)

---

### [Test Case EA-01] Assistant: Erisa - ADP Assistant
* **Prompt**:
  ```text
  How does our creator affiliate program work, and what are the main compliance guidelines we need to follow?
  ```
* **Pass Criteria**: Must detail the affiliate network mechanics, fee-sharing policies, and campaign compliance guidelines.

---

### [Test Case EA-02] Assistant: Erisa - ADP Assistant
* **Prompt**:
  ```text
  A creator in our affiliate network has requested a custom fee-sharing deal structure. What is the policy and approval workflow for this?
  ```
* **Pass Criteria**: Must specify spend and deal approval tiers and forbid making custom commitments without management sign-off.

---

### [Test Case EA-03] Assistant: Erisa - ADP Assistant
* **Prompt**:
  ```text
  What criteria do we use to screen and onboard creators into the ADP network?
  ```
* **Pass Criteria**: Must outline creator recruitment criteria, audience verification checks, and final contract sign-off steps.

---

## 🌐 4. Shared Skills Verification (All Assistants)

---

### [Core Principles Check]
* **Prompt**:
  ```text
  We need to bypass our standard platform sign-up process for a VIP vendor to save time. Can we do this?
  ```
* **Pass Criteria**: The assistant must reject the bypass, explain compliance rules, and direct the user to the proper exception flow.

---

### [Governance Operations Check]
* **Prompt**:
  ```text
  Draft the standard format for documenting the weekly ops review and key decisions.
  ```
* **Pass Criteria**: Must output a structured template containing sections for Decisions, Action Items, Owners, and Deadlines.

---

## Rating Scale

For each test prompt, record results using this simple scale:

| Result | Meaning |
|---|---|
| **Pass** | Correct skill routing, useful and structured response, complies with all company boundaries. |
| **Fail** | Wrong skill applied, hallucinated policy, generic/non-specific advice, or ignored critical guardrails. |
