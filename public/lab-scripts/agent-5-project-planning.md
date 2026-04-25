# Agent 5: Project Planning
## Step-by-Step Lab Instructions

> **Agent ID:** AGT-PPL-01 · **Persona:** Planning Engineer · **Approver:** PMO Head

---

### Step 1: Open the Agent

Navigate to **Agentic AI** → Click on **Project Planning**

You will see the agent chat interface with the Project Planning Agent loaded. This agent is triggered after an order is won. It produces a complete project plan with charter, WBS, skill mapping, resource allocation, timeline with milestone tracking, and an HR input report.

---

### Step 2: View Data Backbone Files

Click the data backbone panel to view the CSV files that power this agent:

- `06_hr_pmo/projects.csv` — Active project registry and status
- `06_hr_pmo/resource_assignments.csv` — Current resource allocation across projects
- `00_master_data/employees_master.csv` — Employee skills, certifications, and availability
- `05_project_planning/wbs_template.csv` — Standard WBS templates by product type
- `05_project_planning/project_timelines.csv` — Historical project timelines and benchmarks
- `05_project_planning/skill_matrix.csv` — Skill requirements by project type and phase

The agent also receives the **upstream output from Commercial & Legal Review** (approved proposals with scope and terms).

---

### Step 3: Load Additional Documents (Optional)

Click **"Upload"** to load additional preloaded files (max 2 files, 30 MB each):

- Won order documents
- Charter or WBS templates
- Employee rosters or skill matrices
- Certification records
- Resource plans
- Customer timelines
- Mobilisation schedules

---

### Step 4: Inspect the Default Prompt

Review the default starter prompt in the chat input area:

> For the won orders, create a comprehensive project plan. Generate a project charter, build a WBS from the template, perform skill mapping and resource allocation, identify timeline milestones and gaps, and produce an HR input report for any resource shortages. Flag any projects where the customer timeline cannot be met.

---

### Step 5: Run the Agent

Click **"Run"** or press **Enter** to execute the agent with the default prompt.

The agent will use its tools (`charter_project`, `match_resources`, `plan_mobilisation`) to build a comprehensive project plan.

---

### Step 6: Review the Output

The agent will produce **four key deliverables**:

**A. Project Charter:**
- Project name, sponsor, PM, objectives
- Scope statement, deliverables, constraints, assumptions
- Success criteria and key stakeholders

**B. Work Breakdown Structure (WBS):**
- Hierarchical task breakdown by phase (Engineering → Procurement → Manufacturing → Testing → Dispatch → Commissioning)
- Task dependencies, durations, and milestones

**C. Skill Map & Resource Allocation:**
- Required skills per phase vs. available resources
- Named resource assignments with utilization percentages
- Skill gaps and training needs

**D. Timeline & Gap Summary:**
- Gantt-style milestone timeline
- Critical path identification
- Gap/alert summary (resource conflicts, timeline risks)
- HR input report for resource shortages or missing certifications

---

### Step 7: Try a Modified Prompt

Replace the default prompt with this enhanced version:

> For the won orders, create a project plan with a focus on **resource conflict resolution**. Build the WBS and identify all phases where more than one active project needs the same skilled resource. Produce a **resource heatmap** showing utilization by month for the next 6 months. Flag any resources above 90% utilization. Generate an HR input report that specifies the **exact skill gap** — job title, required certification, number of people needed, and recommended hiring timeline.

---

### Step 8: Ask a Follow-Up Question

In the chat, ask:

> "Can the project be delivered in 20 weeks instead of the planned 24 weeks? What tasks would need to be fast-tracked or overlapped? What is the risk of crashing the schedule, and what additional resources would be needed?"

---

### Step 9: Modify the Output

When the HITL review panel appears:

- Review the WBS for completeness — are all phases covered?
- In the **Modify & Review** section, adjust resource assignments or milestone dates
- Add or reassign named resources based on your knowledge of team availability
- Add a comment such as: *"Move commissioning engineer Rajesh K. to this project — his current project completes in Week 8. Add 2 weeks buffer before PG testing."*
- Enter your name as **PMO Head** approver

---

### Step 10: Approve and Pass Forward

Click **"Approve"** to pass the output to the next agent (**Engineering Design**).

---

**What flows to the next agent:** Project charter, WBS with task breakdown, resource allocation, and timeline milestones. The Engineering Design agent will use the project scope and specifications to extract data sheets and classify components as make-vs-buy.
