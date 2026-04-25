# Agent 3: Proposal Drafting
## Step-by-Step Lab Instructions

> **Agent ID:** AGT-PRS-01 · **Persona:** Proposal Engineer · **Approver:** Solution Director

---

### Step 1: Open the Agent

Navigate to **Agentic AI** → Click on **Proposal Drafting**

You will see the agent chat interface with the Proposal Drafting Agent loaded. This agent generates realistic draft proposals and deviation reports by comparing tender/RFQ requirements against Thermax standard capabilities.

---

### Step 2: View Data Backbone Files

Click the data backbone panel to view the CSV files that power this agent:

- `03_presales/proposals.csv` — Historical proposal data and templates
- `03_presales/rfq_requirements.csv` — RFQ/tender requirement line items
- `03_presales/proposal_templates.csv` — Standard Thermax proposal section templates
- `00_master_data/products_catalog.csv` — Thermax product portfolio and capabilities
- `03_presales/bill_of_materials.csv` — Standard BOM structures

The agent also receives the **upstream output from Lead Qualification** (qualified leads with GO/CONDITIONAL verdicts).

---

### Step 3: Load Additional Documents (Optional)

Click **"Upload"** to load additional preloaded files (max 2 files, 30 MB each):

- Tender/RFQ documents
- Technical specifications from the customer
- Customer requirement sheets
- P&ID text extracts
- Past proposal samples
- Product catalog updates or pricing sheets

---

### Step 4: Inspect the Default Prompt

Review the default starter prompt in the chat input area:

> Review the qualified leads forwarded from Stage 2. For each qualified lead, draft a structured proposal using the appropriate Thermax proposal template. Analyze all tender/RFQ requirements against Thermax standards and generate a detailed deviation report. Flag any requirements that cannot be met and propose alternatives.

---

### Step 5: Run the Agent

Click **"Run"** or press **Enter** to execute the agent with the default prompt.

The agent will use its tools (`draft_proposal`, `generate_bom`, `analyze_margins`) to create proposals and deviation analysis for each qualified lead.

---

### Step 6: Review the Output

The agent will produce **two key deliverables**:

**A. Draft Proposal (Word-style document):**
- Executive summary and scope of supply
- Technical specifications and compliance matrix
- Bill of Materials (BOM)
- Delivery schedule
- Commercial terms (pricing marked for review)
- Exclusions and clarifications

**B. Deviation Report (Excel-style table):**
- Requirement-by-requirement comparison against Thermax standards
- Classification: ✅ Meetable | ⚠️ Partially Meetable | ❌ Not Meetable | ❓ Needs Clarification
- Proposed alternatives for non-meetable requirements
- Risk rating for each deviation

---

### Step 7: Try a Modified Prompt

Replace the default prompt with this enhanced version:

> For the top qualified lead from Stage 2, draft a **comprehensive proposal** for a waste heat recovery boiler system. Structure it with these sections: (1) Executive Summary, (2) Scope of Supply with equipment list, (3) Technical Specifications with a compliance matrix against the RFQ, (4) Bill of Materials, (5) Project Timeline, (6) Commercial Terms. Generate the deviation report with **severity ratings** (Critical / Major / Minor) for each non-compliant requirement. Propose cost-effective alternatives for any Critical deviations.

---

### Step 8: Ask a Follow-Up Question

In the chat, ask:

> "What is the total number of deviations in the report? How many are Critical vs. Major vs. Minor? For the Critical deviations, what is the estimated cost impact of the proposed alternatives? Can we reduce Critical deviations to zero with design modifications?"

---

### Step 9: Modify the Output

When the HITL review panel appears:

- Review the proposal sections for technical accuracy
- In the **Modify & Review** section, adjust pricing assumptions or delivery timelines
- Flag any deviations that your team can actually meet (upgrade from ❌ to ✅)
- Add a comment such as: *"Delivery timeline needs to be 14 weeks, not 16. Update BOM to include Siemens PLC option."*
- Enter your name as **Solution Director** approver

---

### Step 10: Approve and Pass Forward

Click **"Approve"** to pass the output to the next agent (**Commercial & Legal Risk Review**).

---

**What flows to the next agent:** Draft proposal document with scope, specifications, BOM, and commercial terms, plus the deviation report with requirement-level compliance analysis. The Commercial & Legal agent will review these for financial risk, legal exposure, and contract terms.
