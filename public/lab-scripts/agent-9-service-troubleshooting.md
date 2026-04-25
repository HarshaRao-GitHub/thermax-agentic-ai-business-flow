# Agent 9: O&M Service Troubleshooting
## Step-by-Step Lab Instructions

> **Agent ID:** AGT-SRV-01 · **Persona:** Service Co-pilot · **Approver:** Service Director

---

### Step 1: Open the Agent

Navigate to **Agentic AI** → Click on **O&M Service Troubleshooting**

You will see the agent chat interface with the Service Troubleshooting Agent loaded. This is a **runtime troubleshooting co-pilot** for field service engineers — a conversational, problem-solving agent that guides engineers through diagnosis and repair using SOPs, fault tree analysis (FTA), why-why analysis, and troubleshooting guides.

---

### Step 2: View Data Backbone Files

Click the data backbone panel to view the CSV files that power this agent:

- `09_digital_service/service_cases.csv` — Historical service case records and resolutions
- `09_digital_service/sop_library.csv` — Standard operating procedures for maintenance and repair
- `09_digital_service/spare_parts_inventory.csv` — Spare parts availability and lead times
- `09_digital_service/troubleshooting_guides.csv` — Equipment-specific troubleshooting decision trees
- `09_digital_service/fault_tree_library.csv` — Fault tree analysis templates for common failure modes
- `09_digital_service/service_tickets.csv` — Open and historical service tickets

The agent also receives **upstream context from Commissioning** (test baselines, deviation history, and punchlist items).

---

### Step 3: Load Additional Documents (Optional)

Click **"Upload"** to load additional preloaded files (max 2 files, 30 MB each):

- Service case reports
- Field notes
- Symptom logs
- Commissioning test data (for baseline comparison)
- Maintenance work orders
- Spare parts requests
- Troubleshooting worksheets

---

### Step 4: Inspect the Default Prompt

Review the default starter prompt in the chat input area:

> I am a field service engineer at a customer site. I need help troubleshooting an issue. Please ask me about the equipment type and the symptoms I am observing, and guide me through the diagnosis and repair process step by step.

This agent works **conversationally** — it will ask you clarifying questions and guide you through diagnosis step by step, unlike the other agents that produce reports.

---

### Step 5: Run the Agent with a Symptom Report

Instead of using the generic default prompt, paste one of these **realistic symptom reports** to simulate a real field scenario:

#### Symptom Report 1 — AFBC Boiler Bed Temperature Issue

> Our 60 TPH AFBC boiler at the Jamnagar plant is showing bed temperature readings above 950°C in zones 2 and 3. We're seeing clinker formation and the bottom ash is coming out in large chunks. The coal quality hasn't changed recently. What should we do?

#### Symptom Report 2 — ID Fan Vibration Issue

> The ID fan on our WHRB at the Vijayanagar site is showing vibration readings of 7.5 mm/s — approaching the trip setpoint. We replaced the bearings 6 months ago. The vibration seems to be getting worse over the past week.

Click **"Run"** or press **Enter** after pasting your chosen symptom report.

---

### Step 6: Review the Diagnostic Output

The agent will produce a structured troubleshooting response:

- **Problem Classification** — Equipment type, symptom category, severity assessment
- **Diagnostic Steps** — Step-by-step checks to isolate the root cause
- **SOP Reference** — Relevant standard operating procedures from the SOP library
- **Fault Tree Analysis (FTA)** — Decision tree narrowing down probable causes
- **Why-Why Analysis** — 5-Why root cause analysis for the identified issue
- **Recommended Actions** — Immediate corrective actions and long-term preventive measures
- **Spare Parts Required** — Parts needed with availability status and lead times
- **Safety Precautions** — Critical safety steps before attempting any repair

---

### Step 7: Continue the Conversation

The power of this agent is in its **conversational troubleshooting**. Continue the dialogue:

**If you used Symptom Report 1 (Bed Temperature), ask:**

> "We checked the bed material and found the average particle size has increased to 4mm. The air distribution plate nozzles in zones 2 and 3 seem partially blocked. We can hear uneven air distribution. What should we do next?"

**If you used Symptom Report 2 (ID Fan Vibration), ask:**

> "We did a vibration spectrum analysis. The dominant frequency is at 1× RPM with a slight 2× component. The axial vibration is also elevated. The coupling alignment was checked 3 months ago. What does this pattern suggest?"

---

### Step 8: Ask for a Maintenance Action Plan

After the diagnostic conversation, ask:

> "Based on this diagnosis, generate a **maintenance action plan** with: (1) Immediate actions to be taken today, (2) Short-term actions for this shutdown window, (3) Long-term preventive maintenance recommendations. Include spare parts needed, estimated downtime, and safety requirements for each action."

---

### Step 9: Modify the Output

When the HITL review panel appears:

- Review the diagnostic steps and recommended actions for accuracy
- In the **Modify & Review** section, add site-specific constraints (e.g., "Cannot shut down for more than 8 hours — customer has production commitments")
- Adjust spare parts requirements based on what is available at site vs. needs to be shipped
- Add a comment such as: *"Root cause confirmed as blocked nozzles. Schedule nozzle replacement during planned shutdown next week. Order 50 spare nozzles from Pune stores."*
- Enter your name as **Service Director** approver

---

### Step 10: Complete the Workflow Loop

Click **"Approve"** to complete the agentic workflow.

This is the **final agent** in the 9-stage enterprise workflow. The approved service resolution feeds back into the enterprise knowledge loop — insights from field troubleshooting improve:

- Future **Market Intelligence** (product reliability data for sales positioning)
- **Engineering Design** (design improvements based on field failures)
- **Commissioning** (updated test parameters based on field experience)

---

**What flows back to the enterprise loop:** Service resolution data, root cause analysis, corrective actions taken, and field performance insights. This closes the Thermax enterprise digital thread from market signal to post-commissioning operations.

---

## Additional Troubleshooting Scenarios to Try

### Scenario A — Economizer Tube Leak

> "We have a suspected tube leak in the economizer of our 45 TPH boiler at the Nashik site. The feedwater flow has increased by 15% but steam output hasn't changed. We can see water dripping from the bottom of the economizer casing. The boiler was commissioned 3 years ago. Guide me through the diagnosis."

### Scenario B — DCS Communication Failure

> "Multiple field instruments on our WHRB at the Rourkela site are showing 'BAD' status on the DCS. It started suddenly 2 hours ago. About 30% of the analog inputs are affected. The instruments themselves seem to be working — local gauges show correct readings. The issue seems to be on the communication side."

### Scenario C — Low Steam Pressure at Rated Load

> "Our 20 TPH oil-fired boiler at the Vapi site is unable to maintain rated steam pressure of 17.5 kg/cm² at full load. Pressure drops to 15 kg/cm² when all steam users are online. The boiler was running fine until last month. Combustion parameters look normal. What should we check?"
