# Agent 2: Lead Qualification
## Step-by-Step Lab Instructions

> **Agent ID:** AGT-SAL-01 · **Persona:** Sales Executive · **Approver:** BU Head Sales

---

### Step 1: Open the Agent

Navigate to **Agentic AI** → Click on **Lead Qualification**

You will see the agent chat interface with the Lead Qualification Agent loaded. This agent further qualifies shortlisted leads into pursue-worthy opportunities using BANT/MEDDIC scoring, maps stakeholders, and issues GO/NO-GO recommendations.

---

### Step 2: View Data Backbone Files

Click the data backbone panel to view the CSV files that power this agent:

- `02_sales/opportunities.csv` — Current opportunity pipeline and status
- `02_sales/stakeholder_map.csv` — Key decision-makers, influencers, and gatekeepers
- `01_marketing/account_briefs.csv` — Account intelligence passed from Stage 1

The agent also receives the **upstream output from Market Intelligence** (the shortlisted leads) automatically.

---

### Step 3: Load Additional Documents (Optional)

Click **"Upload"** to load additional preloaded files (max 2 files, 30 MB each):

- Opportunity data or pipeline reports
- Account briefs or stakeholder lists
- CRM exports
- Competitor analyses
- BANT/MEDDIC scorecards
- Meeting notes from customer interactions

---

### Step 4: Inspect the Default Prompt

Review the default starter prompt in the chat input area:

> Take the leads forwarded from Stage 1 (Market Intelligence). Perform deep BANT and MEDDIC qualification for each lead, map their key stakeholders, identify competitive threats, and issue GO/NO-GO recommendations. Show the complete handoff reconciliation with counts.

---

### Step 5: Run the Agent

Click **"Run"** or press **Enter** to execute the agent with the default prompt.

The agent will qualify each lead received from Market Intelligence, applying BANT (Budget, Authority, Need, Timeline) and MEDDIC (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion) frameworks.

---

### Step 6: Review the Output

The agent will produce:

- **Qualification Table** — Each lead scored on BANT and MEDDIC criteria
- **Stakeholder Maps** — Key contacts, their roles (Decision Maker, Influencer, Champion, Gatekeeper), and engagement strategy
- **Competitive Threat Assessment** — Known competitors and Thermax differentiators per lead
- **GO / NO-GO / CONDITIONAL Recommendations** — Clear verdict for each lead
- **Handoff Reconciliation** — Counts: Leads Received → Qualified (GO) → Conditional → Rejected (NO-GO)

Only GO and CONDITIONAL leads flow to the next stage.

---

### Step 7: Try a Modified Prompt

Replace the default prompt with this enhanced version:

> Take the leads forwarded from Stage 1. For each lead, perform BANT and MEDDIC qualification with **weighted scoring** (Budget: 25%, Authority: 20%, Need: 30%, Timeline: 25%). Map at least 3 stakeholders per lead including the **economic buyer** and **internal champion**. Identify the **top competitive threat** for each lead and recommend a specific **win strategy**. Flag any leads where the decision timeline is under 60 days as "FAST TRACK." Show the complete handoff reconciliation.

---

### Step 8: Ask a Follow-Up Question

In the chat, ask:

> "For the leads marked as GO, what is the estimated total pipeline value? Which leads have the shortest decision timelines? Recommend the optimal pursuit sequence — which lead should we engage first and why?"

---

### Step 9: Modify the Output

When the HITL review panel appears:

- Review the GO/NO-GO recommendations against your sales intuition
- In the **Modify & Review** section, override any recommendation you disagree with (e.g., change a NO-GO to CONDITIONAL with a justification)
- Add a comment such as: *"Upgrade Lead #3 to GO — we have a strong champion relationship with their VP Engineering"*
- Enter your name as **BU Head Sales** approver

---

### Step 10: Approve and Pass Forward

Click **"Approve"** to pass the output to the next agent (**Proposal Drafting**).

---

**What flows to the next agent:** Qualified leads (GO and CONDITIONAL) with BANT/MEDDIC scores, stakeholder maps, competitive intelligence, and pursuit strategy. The Proposal Drafting agent will create draft proposals for each qualified lead.

---

## Advanced Prompt Section

Try these additional prompts to explore the agent's capabilities:

### Prompt A — Deep-Dive on a Single Lead

> Focus only on the **highest-value lead** from Stage 1. Perform an exhaustive MEDDIC analysis with detailed stakeholder mapping (minimum 5 stakeholders). Identify the decision process timeline, key milestones, and potential deal blockers. Recommend a 90-day engagement plan with specific touchpoints.

### Prompt B — Competitive War Room

> For all leads forwarded from Stage 1, create a **competitive war room briefing**. For each lead, identify which competitors are likely bidding, their typical pricing strategy, their product strengths/weaknesses vs. Thermax, and recommend specific **counter-positioning strategies** and value propositions.

### Prompt C — Pipeline Risk Analysis

> Instead of qualifying individual leads, analyze the **overall pipeline health**. What is the total pipeline value? What percentage are in GO vs. CONDITIONAL vs. NO-GO? Are there concentration risks (too many leads in one sector or region)? What is the weighted pipeline value assuming 80% conversion for GO, 40% for CONDITIONAL? Recommend 3 actions to strengthen the pipeline.
