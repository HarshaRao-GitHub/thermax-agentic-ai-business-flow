# Agent 7: Procurement & Manufacturing
## Step-by-Step Lab Instructions

> **Agent ID:** AGT-PMR-01 · **Persona:** Procurement Manager / Manufacturing Head · **Approver:** Procurement Head + Manufacturing Head

---

### Step 1: Open the Agent

Navigate to **Agentic AI** → Click on **Procurement & Manufacturing**

You will see the agent chat interface with the Procurement & Manufacturing Review Agent loaded. This agent evaluates vendor quotations against engineering specifications, produces L1/T1 rankings, generates manufacturing plans, tracks material readiness, and flags delivery risks.

---

### Step 2: View Data Backbone Files

Click the data backbone panel to view the CSV files that power this agent:

- `07_procurement_mfg/vendor_quotations.csv` — Received vendor quotations with pricing and terms
- `07_procurement_mfg/vendor_master.csv` — Approved vendor list with performance history and ratings
- `07_procurement_mfg/manufacturing_schedule.csv` — Shop floor production schedule and capacity
- `07_procurement_mfg/material_readiness.csv` — Material availability and procurement status
- `06_engineering_design/make_buy_classification.csv` — Make/buy decisions from Stage 6

The agent also receives the **upstream output from Engineering Design** (data sheets and make/buy classification).

---

### Step 3: Load Additional Documents (Optional)

Click **"Upload"** to load additional preloaded files (max 2 files, 30 MB each):

- Vendor quotations or purchase orders
- Engineering specifications
- Material requisitions
- Manufacturing schedules or workshop capacity reports
- Historical PO prices
- Delivery tracking documents

---

### Step 4: Inspect the Default Prompt

Review the default starter prompt in the chat input area:

> Review the make/buy classification from Stage 6. For buy items, evaluate vendor quotations and produce L1/T1 rankings with vendor recommendations. For make items, generate a manufacturing plan with material readiness tracking. Flag any delivery risks or delays. Maintain digital thread back to engineering specifications.

---

### Step 5: Run the Agent

Click **"Run"** or press **Enter** to execute the agent with the default prompt.

The agent will process BUY and MAKE items separately, evaluating vendors and planning manufacturing.

---

### Step 6: Review the Output

The agent will produce:

- **Vendor Comparison Matrix** — Side-by-side comparison of vendor quotations for each BUY item (price, delivery, quality rating, compliance, payment terms)
- **L1 Ranking (Lowest Price)** — Commercial ranking of vendors per item
- **T1 Ranking (Techno-Commercial)** — Weighted ranking considering price, quality, delivery, past performance, and compliance
- **Vendor Shortlist & Recommendation** — Recommended vendor per item with justification
- **Manufacturing Plan** — For MAKE items: production sequence, work center allocation, estimated hours
- **Material Readiness Tracker** — Status of all required materials (Available / On Order / Critical Shortage)
- **Delivery Risk Flags** — Items at risk of delaying the project schedule with suggested mitigation

---

### Step 7: Try a Modified Prompt

Replace the default prompt with this enhanced version:

> Review the make/buy classification from Stage 6. For all BUY items, create a **T1 ranking** using these weights: Price (40%), Delivery Reliability (25%), Quality Rating (20%), Payment Terms (15%). For vendors with delivery lead times exceeding the project requirement, calculate the **schedule risk in days** and recommend alternatives. For MAKE items, generate a shop floor loading plan — flag any work center where utilization exceeds 85%. Identify the **top 3 critical path procurement items** that must be ordered within 2 weeks.

---

### Step 8: Ask a Follow-Up Question

In the chat, ask:

> "What is the total procurement budget across all BUY items? How much can we save if we negotiate 5% discounts with the top 3 vendors by spend? Are there any items where we have only a single vendor — and what is the risk if that vendor fails to deliver?"

---

### Step 9: Modify the Output

When the HITL review panel appears:

- Review vendor rankings — do the T1 rankings align with your experience of vendor performance?
- In the **Modify & Review** section, override vendor selections where you have strategic preferences or better pricing intelligence
- Check material readiness — flag any critical shortages that need immediate procurement action
- Add a comment such as: *"Select Vendor B for boiler tubes despite higher price — better delivery track record. Escalate refractory procurement — supplier confirmed 2-week delay."*
- Enter your name as **Procurement Head + Manufacturing Head** approver

---

### Step 10: Approve and Pass Forward

Click **"Approve"** to pass the output to the next agent (**Commissioning**).

---

**What flows to the next agent:** Vendor selections, procurement status, manufacturing plan, material readiness status, and delivery risk flags. The Commissioning agent will use this information along with engineering specifications to prepare commissioning checklists and test protocols.
