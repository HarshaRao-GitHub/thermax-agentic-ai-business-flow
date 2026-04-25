# Agent 4: Commercial & Legal Risk Review
## Step-by-Step Lab Instructions

> **Agent ID:** AGT-CLR-01 · **Persona:** CFO / Legal Counsel · **Approver:** CFO + Legal Counsel

---

### Step 1: Open the Agent

Navigate to **Agentic AI** → Click on **Commercial & Legal Risk Review**

You will see the agent chat interface with the Commercial & Legal Risk Review Agent loaded. This agent reviews drafted proposals for commercial risk, legal exposure, payment terms, LD clauses, and proposal-level technical deviations.

---

### Step 2: View Data Backbone Files

Click the data backbone panel to view the CSV files that power this agent:

- `05_finance_legal/commercial_risk_assessments.csv` — Historical risk assessment data and benchmarks
- `05_finance_legal/contract_reviews.csv` — Past contract review outcomes and flagged clauses
- `03_presales/proposals.csv` — Draft proposals from Stage 3
- `04_engineering/engineering_validations.csv` — Engineering feasibility data

The agent also receives the **upstream output from Proposal Drafting** (draft proposals and deviation reports).

---

### Step 3: Load Additional Documents (Optional)

Click **"Upload"** to load additional preloaded files (max 2 files, 30 MB each):

- Contracts or purchase orders
- Terms & conditions documents
- Risk assessment reports
- Financial statements or payment schedules
- Bank guarantees
- Deviation reports
- Insurance certificates

---

### Step 4: Inspect the Default Prompt

Review the default starter prompt in the chat input area:

> Review the draft proposals and deviation reports from Stage 3. Perform commercial risk assessment (margins, cash flow, LD exposure), legal contract review (redlines, indemnity, IP), and proposal feasibility review (deviation severity). Produce an approval-ready review note with recommendation for each proposal.

---

### Step 5: Run the Agent

Click **"Run"** or press **Enter** to execute the agent with the default prompt.

The agent will use its tools (`assess_commercial_risk`, `review_contract`, `evaluate_payment_terms`) to analyze the proposals from multiple risk dimensions.

---

### Step 6: Review the Output

The agent will produce:

- **Commercial Risk Assessment** — Margin analysis, cash flow projections, LD (Liquidated Damages) exposure calculation, warranty cost estimates
- **Legal Review** — Redline items, indemnity clause analysis, IP protection review, limitation of liability assessment
- **Payment Terms Analysis** — Payment milestone structure, cash flow impact, bank guarantee requirements
- **Deviation Risk Assessment** — Severity of technical deviations from a commercial/legal perspective
- **Approval-Ready Review Note** — Overall recommendation (Approve / Approve with Conditions / Reject) with rationale
- **Flagged Clauses** — Specific contract clauses requiring negotiation or escalation

---

### Step 7: Try a Modified Prompt

Replace the default prompt with this enhanced version:

> Review the draft proposals from Stage 3. Focus specifically on **LD clause exposure** — calculate the maximum LD liability as a percentage of contract value for each proposal. Review **payment terms** for cash flow risk: flag any proposals with more than 30% payment linked to post-commissioning milestones. Check **indemnity clauses** for uncapped liability exposure. Produce a **risk matrix** (Likelihood × Impact) for the top 5 commercial risks across all proposals.

---

### Step 8: Ask a Follow-Up Question

In the chat, ask:

> "What is our total LD exposure across all proposals? Which proposal has the highest commercial risk and why? Are there any clauses where our standard terms differ from the customer's terms? Recommend the top 3 negotiation priorities."

---

### Step 9: Modify the Output

When the HITL review panel appears:

- Review the risk ratings and approval recommendations
- In the **Modify & Review** section, adjust risk ratings based on your knowledge of the customer relationship
- Override recommendations where appropriate (e.g., accept higher LD exposure for a strategic customer)
- Add a comment such as: *"Accept 10% LD cap for this customer — strategic account with 15-year relationship. Escalate IP clause to legal head."*
- Enter your name as **CFO + Legal Counsel** approver

---

### Step 10: Approve and Pass Forward

Click **"Approve"** to pass the output to the next agent (**Project Planning**).

---

**What flows to the next agent:** Risk-reviewed and commercially approved proposals with flagged clauses, negotiation points, and approval conditions. The Project Planning agent will use the approved scope to build project charters, WBS, and resource plans for won orders.
