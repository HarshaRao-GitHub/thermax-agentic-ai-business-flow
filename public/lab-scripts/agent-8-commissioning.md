# Agent 8: Commissioning
## Step-by-Step Lab Instructions

> **Agent ID:** AGT-CMS-01 · **Persona:** Commissioning Manager · **Approver:** Commissioning Head

---

### Step 1: Open the Agent

Navigate to **Agentic AI** → Click on **Commissioning**

You will see the agent chat interface with the Commissioning Agent loaded. This agent provides **two-phase commissioning support**:

- **Phase A** — Conversational SOP and checklist guidance for engineers at site
- **Phase B** — Upload test results and analyze deviations against expected ranges

---

### Step 2: View Data Backbone Files

Click the data backbone panel to view the CSV files that power this agent:

- `08_commissioning/commissioning_tests.csv` — Test parameters, expected values, and acceptance criteria
- `08_commissioning/commissioning_checklists.csv` — Product-specific pre-commissioning and commissioning checklists
- `04_engineering/performance_guarantees.csv` — PG targets from engineering design
- `06_hr_pmo/projects.csv` — Active project information

The agent also receives the **upstream output from Procurement & Manufacturing** (material status and project readiness).

---

### Step 3: Load Additional Documents (Optional)

Click **"Upload"** to load additional preloaded files (max 2 files, 30 MB each):

- Commissioning test sheets
- Startup checklists
- Performance guarantee (PG) test data
- Punchlists
- Handover records
- SCADA/DCS parameter exports
- Site readiness reports

---

### Step 4: Inspect the Default Prompt

Review the default starter prompt in the chat input area:

> Retrieve the commissioning checklist for the active project's product type. Walk through the pre-commissioning checks step by step. If test results are available, analyze them against performance guarantee targets, identify deviations, and recommend corrective actions for any parameters outside acceptable range.

---

## Phase A: Conversational SOP & Checklist Guidance

### Step 5A: Start a Conversation (Phase A)

Click **"Run"** or press **Enter** with the default prompt to begin Phase A.

In Phase A, the agent acts as your **commissioning co-pilot**. It will:

- Retrieve the product-specific commissioning checklist
- Walk you through pre-commissioning checks step by step
- Answer questions about SOPs and procedures
- Provide site readiness guidance

### Step 6A: Ask SOP Questions

Try these conversational prompts in Phase A:

> "What are the pre-commissioning checks for the FD fan before first startup?"

> "Walk me through the boiler hydro test procedure step by step. What pressure should we hold and for how long?"

> "We are commissioning a 30 TPH FBC boiler. What is the correct bed material loading procedure? What temperatures should we monitor during the first light-up?"

The agent will respond conversationally with step-by-step procedures drawn from the SOP library and commissioning checklists.

---

## Phase B: Test Result Analysis

### Step 5B: Upload Test Results (Phase B)

After completing commissioning tests at site, switch to Phase B:

1. Click **"Upload"** in the chat interface
2. Upload your test result file (CSV, Excel, or PDF with test data)
3. Use this prompt:

> "I have uploaded the performance guarantee test results for our 30 TPH FBC boiler at the Aurangabad site. Analyze all parameters against the PG targets. Identify any deviations — parameters outside the acceptable range. For each deviation, recommend corrective actions and re-test requirements."

### Step 6B: Review the Deviation Analysis

The agent will produce:

- **Test Result Summary** — All tested parameters with measured vs. expected values
- **Deviation Analysis Table** — Parameters outside acceptable range:
  - Parameter name, measured value, expected range, deviation (%), severity
- **Corrective Action Recommendations** — Specific actions to bring deviations within range
- **Re-Test Requirements** — Which tests need to be repeated after corrections
- **Commissioning Readiness Summary** — Overall GO/NO-GO for handover

---

### Step 7: Try a Modified Prompt

Replace the default prompt with this enhanced version:

> Analyze the commissioning test results for a **WHRB (Waste Heat Recovery Boiler)** installation. Focus on these critical PG parameters: (1) Steam output at rated load, (2) Steam temperature and pressure, (3) Boiler efficiency by indirect method, (4) Flue gas temperature at outlet, (5) Stack emissions (PM, SOx, NOx). For any parameter deviating by more than 2% from the PG target, provide a **root cause hypothesis** and **corrective action** with estimated time to resolve.

---

### Step 8: Ask a Follow-Up Question

In the chat, ask:

> "The boiler efficiency is showing 82.5% against a PG guarantee of 85%. What are the most likely causes? Can we improve this through combustion tuning without hardware modifications? What specific adjustments should we try first?"

---

### Step 9: Modify the Output

When the HITL review panel appears:

- Review the deviation analysis — are the severity ratings appropriate?
- In the **Modify & Review** section, add site-specific observations or override corrective actions
- Update the punchlist with items that need vendor support vs. items your team can fix
- Add a comment such as: *"Efficiency shortfall is due to high moisture in coal — retest with design coal. Stack emissions within CPCB norms — accept. ID fan vibration needs vendor inspection before handover."*
- Enter your name as **Commissioning Head** approver

---

### Step 10: Approve and Pass Forward

Click **"Approve"** to pass the output to the next agent (**O&M Service Troubleshooting**).

---

**What flows to the next agent:** Commissioning test results, deviation analysis, corrective actions, punchlist status, and handover readiness. The O&M Service Troubleshooting agent will use this as baseline reference data for runtime troubleshooting during the equipment's operational life.
