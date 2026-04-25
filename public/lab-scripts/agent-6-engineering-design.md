# Agent 6: Engineering Design
## Step-by-Step Lab Instructions

> **Agent ID:** AGT-ENG-01 · **Persona:** Engineering Manager · **Approver:** Chief Engineer

---

### Step 1: Open the Agent

Navigate to **Agentic AI** → Click on **Engineering Design**

You will see the agent chat interface with the Engineering Design Agent loaded. This agent extracts technical specifications from tender/proposal/order text, generates structured instrument and equipment data sheets, classifies components as make-vs-buy, and produces the specifications that feed procurement and manufacturing.

---

### Step 2: View Data Backbone Files

Click the data backbone panel to view the CSV files that power this agent:

- `04_engineering/engineering_validations.csv` — Engineering validation records and feasibility checks
- `04_engineering/performance_guarantees.csv` — Performance guarantee parameters and acceptance ranges
- `06_engineering_design/instrument_datasheets.csv` — Standard instrument data sheet templates
- `06_engineering_design/equipment_datasheets.csv` — Standard equipment data sheet templates
- `06_engineering_design/make_buy_classification.csv` — Historical make/buy decisions with rationale

The agent also receives the **upstream output from Project Planning** (charter, WBS, scope, and specifications).

---

### Step 3: Load Additional Documents (Optional)

Click **"Upload"** to load additional preloaded files (max 2 files, 30 MB each):

- Proposal/order technical content
- Tender specifications
- Project plan outputs
- Design basis documents
- P&ID text extracts
- Equipment specifications
- Vendor data sheets

---

### Step 4: Inspect the Default Prompt

Review the default starter prompt in the chat input area:

> For the active projects from Stage 5, extract technical specifications and generate structured data sheets. Produce instrument data sheets and equipment data sheets. Classify all major components as make-vs-buy with rationale. Reference the original tender/proposal specifications to maintain digital thread continuity.

---

### Step 5: Run the Agent

Click **"Run"** or press **Enter** to execute the agent with the default prompt.

The agent will extract specifications, generate data sheets, and classify components using its engineering tools.

---

### Step 6: Review the Output

The agent will produce:

- **Instrument Data Sheets** — Structured data sheets for each instrument (tag number, type, range, accuracy, process connection, material, output signal, etc.)
- **Equipment Data Sheets** — Structured data sheets for major equipment (capacity, design pressure/temperature, materials of construction, motor ratings, etc.)
- **Design Parameters** — Key design basis parameters extracted from tender/proposal
- **Make-vs-Buy Classification Table** — Each major component classified as:
  - **MAKE** — Manufactured in-house at Thermax facilities
  - **BUY** — Procured from external vendors
  - **Rationale** — Cost, lead time, capability, quality, and strategic considerations
- **Digital Thread Reference** — Traceability back to original tender/proposal requirement line items

---

### Step 7: Try a Modified Prompt

Replace the default prompt with this enhanced version:

> For the active project, extract all technical specifications for a **60 TPH AFBC boiler system**. Generate equipment data sheets for the boiler drum, superheater, economizer, air preheater, ESP, and all rotating equipment (FD fan, ID fan, PA fan). Produce instrument data sheets for all critical process instruments (pressure, temperature, flow, level). Classify all components as make-vs-buy, prioritizing **in-house manufacturing** for items where Thermax has proven capability. Flag any component with a lead time exceeding 12 weeks.

---

### Step 8: Ask a Follow-Up Question

In the chat, ask:

> "Which components classified as BUY have the longest lead times? Are there any BUY items that we could potentially manufacture in-house to reduce schedule risk? What is the estimated cost difference between make and buy for the top 3 longest-lead-time items?"

---

### Step 9: Modify the Output

When the HITL review panel appears:

- Review data sheets for technical accuracy — are all parameters within Thermax design standards?
- In the **Modify & Review** section, reclassify any make/buy decisions based on current shop floor capacity
- Verify that performance guarantee parameters align with customer specifications
- Add a comment such as: *"Reclassify air preheater tubes to MAKE — our Pune facility has capacity. Update ESP design for CPCB-II norms."*
- Enter your name as **Chief Engineer** approver

---

### Step 10: Approve and Pass Forward

Click **"Approve"** to pass the output to the next agent (**Procurement & Manufacturing**).

---

**What flows to the next agent:** Structured data sheets (instrument + equipment), make/buy classification table, and design specifications. The Procurement & Manufacturing agent will use the BUY items to evaluate vendor quotations and produce L1/T1 rankings, and the MAKE items to generate manufacturing plans.
