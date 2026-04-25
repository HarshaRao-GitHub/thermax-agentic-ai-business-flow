# Agent 1: Market Intelligence
## Step-by-Step Lab Instructions

> **Agent ID:** AGT-MKT-01 · **Persona:** Marketing Executive · **Approver:** Marketing Director

---

### Step 1: Open the Agent

Navigate to **Agentic AI** → Click on **Market Intelligence**

You will see the agent chat interface with the Market Intelligence Agent loaded. The agent scans broad market and customer signals, scores urgency, and shortlists leads with selection criteria and per-lead rationale for human approval.

---

### Step 2: View Data Backbone Files

Click the data backbone panel to view the CSV files that power this agent:

- `01_marketing/market_signals.csv` — Raw market signals from trade shows, news, digital channels
- `01_marketing/account_briefs.csv` — Existing account intelligence and history
- `00_master_data/customers_master.csv` — Thermax customer master data

The agent automatically ingests the first 25 rows of each file as context.

---

### Step 3: Load Additional Documents (Optional)

Click **"Upload"** to load additional preloaded files (max 2 files, 30 MB each):

- Market research reports
- Industry news digests
- Analyst reports or competitor intelligence
- Trade conference summaries
- Regulatory updates
- Customer account lists or CRM export files

You can also click **"Load Demo CSV"** to load sample files like `market_research_report.csv` and `industry_news_digest.csv`.

---

### Step 4: Inspect the Default Prompt

Review the default starter prompt in the chat input area:

> Analyze all market signals detected in the last 90 days. Identify the TOP 5 IMMEDIATE LEADS — the highest-value, highest-probability opportunities. For each lead, provide company details, estimated deal value, urgency score, and confidence level. Also generate a list of high-probable leads (ranks 6-15) with relevant information. Show the complete filtering summary from raw signals to shortlisted leads.

---

### Step 5: Run the Agent

Click **"Run"** or press **Enter** to execute the agent with the default prompt.

The agent will use its tools in sequence to scan signals, score urgency, and build the lead shortlist. Watch the tool execution indicators as they appear.

---

### Step 6: Review the Output

The agent will produce:

- **Top 5 Immediate Leads Table** — Rank, Company, Industry, Signal Source, Estimated Deal Value, Urgency Score, Confidence Level, Rationale
- **High-Probable Leads (Ranks 6–15)** — Extended opportunity list with relevant details
- **Filtering Summary** — Pipeline funnel from raw signals → matched accounts → shortlisted leads
- **Confidence scores** and data quality flags for each recommendation

---

### Step 7: Try a Modified Prompt

Replace the default prompt with this enhanced version:

> Analyze all market signals from the last 90 days, focusing specifically on the **Chemicals & Petrochemicals** and **Food & Beverage** sectors. Identify the TOP 5 IMMEDIATE LEADS with estimated deal values above ₹10 crore. For each lead, include company details, signal source, estimated deal value, urgency score (1-10), confidence level, and a 2-line strategic rationale. Separately list any **government/PSU opportunities** detected. Show the complete filtering funnel from raw signals to shortlisted leads.

---

### Step 8: Ask a Follow-Up Question

In the chat, ask:

> "Which of the top 5 leads have existing Thermax installations? For those accounts, what was their last order value and when was the last engagement? How can we leverage the installed base for cross-selling?"

---

### Step 9: Modify the Output

When the HITL review panel appears:

- Review the confidence score displayed on the confidence bar
- In the **Modify & Review** section, add or adjust lead rankings based on your domain knowledge
- Add a comment such as: *"Prioritize leads in Gujarat region for Q2 push"*
- Enter your name as **Marketing Director** approver

---

### Step 10: Approve and Pass Forward

Click **"Approve"** to pass the output to the next agent (**Lead Qualification**).

---

**What flows to the next agent:** The Top 5 shortlisted leads with company details, estimated deal values, urgency scores, confidence levels, and selection rationale. The Lead Qualification agent will perform deep BANT/MEDDIC qualification on these leads.

---

## Advanced Prompt Section

Try these additional prompts to explore the agent's capabilities:

### Prompt A — Competitor-Focused Analysis

> Analyze market signals from the last 90 days and identify any leads where **competitors (Babcock & Wilcox, Forbes Marshall, Bosch)** are actively bidding or have recently won orders. For each such lead, assess whether Thermax has a competitive advantage and recommend a pursuit strategy.

### Prompt B — Regional Focus

> Focus on market signals from **South India (Tamil Nadu, Karnataka, Andhra Pradesh, Telangana)**. Identify the top 3 leads in the **Pharma and Healthcare** sector. Include any upcoming capacity expansions, greenfield projects, or regulatory-driven upgrades that create demand for Thermax products.

### Prompt C — Signal Quality Assessment

> Rather than shortlisting leads, provide a **quality assessment of our signal sources**. Which channels (trade shows, digital, news, CRM) are generating the highest-quality signals? What percentage of signals from each source converted to qualified leads historically? Recommend improvements to our signal detection strategy.
