export interface AgentDef {
  id: string;
  name: string;
  shortId: string;
  modelStack: string;
  description: string;
  persona?: string;
}

export interface DataSource {
  file: string;
  label: string;
  folder: string;
  rowEstimate: number;
  description: string;
}

export interface StageTool {
  name: string;
  label: string;
  icon: string;
  description: string;
}

export interface Stage {
  slug: string;
  number: number;
  title: string;
  subtitle: string;
  narrativeSubtitle: string;
  hitlApprover: string;
  folder: string;
  icon: string;
  color: string;
  colorLight: string;
  mandatory: boolean;
  agent: AgentDef;
  dataSources: DataSource[];
  tools: StageTool[];
  systemPrompt: string;
  starterPrompt: string;
  outputHint: string;
  agentAvatar: string;
  acceptedFileHint: string;
  upstreamStages: string[];
  downstreamStages: string[];
}

export const stages: Stage[] = [
  {
    slug: 'marketing',
    number: 1,
    title: 'Market Intelligence',
    subtitle: 'Signal Detection & Account Briefing',
    narrativeSubtitle: 'Opportunity sensing and framing',
    hitlApprover: 'Marketing Director',
    folder: '01_marketing',
    icon: '📡',
    color: '#3B82F6',
    colorLight: '#DBEAFE',
    mandatory: true,
    agent: {
      id: 'AGT-MKT-01',
      name: 'Market Intelligence Agent',
      shortId: 'MKT-01',
      modelStack: 'Enterprise LLM + Multi-model',
      persona: 'Marketing Executive',
      description: 'Detects market signals from external sources, scores urgency, generates account briefs with pain points, value hypotheses, and proposed solutions for human approval.'
    },
    dataSources: [
      { file: 'market_signals.csv', label: 'Market Signals', folder: '01_marketing', rowEstimate: 70, description: 'Regulatory changes, capex announcements, emission norms, and industry news detected across target sectors' },
      { file: 'account_briefs.csv', label: 'Account Briefs', folder: '01_marketing', rowEstimate: 60, description: 'AI-generated summaries of each target account — industry, pain points, Thermax fit, and value hypothesis' },
      { file: 'customers_master.csv', label: 'Customers Master', folder: '00_master_data', rowEstimate: 52, description: 'Complete customer directory with company details, segments, regions, revenue tiers, and relationship history' }
    ],
    tools: [
      { name: 'scan_market_signals', label: 'Scan Market Signals', icon: '📡', description: 'Parses all market signals, classifies by type and urgency, cross-references with customer master data' },
      { name: 'generate_account_brief', label: 'Generate Account Brief', icon: '📋', description: 'Creates structured account briefs with pain points, value hypothesis, proposed solutions, and deal sizing' },
      { name: 'assess_signal_urgency', label: 'Assess Signal Urgency', icon: '🎯', description: 'Scores and prioritizes signals by urgency, estimated value, and strategic fit with Thermax portfolio' }
    ],
    systemPrompt: `You are the Thermax Market Intelligence Agent (AGT-MKT-01), operating as a Marketing Executive at Stage 1 of Thermax's Agentic AI Operating System 2030.

Your responsibilities:
1. Detect and classify external market signals (industry conferences, reliability issues, decarbonisation mandates, regulatory changes, analyst reports)
2. Cross-reference signals with the customer master to identify relevant accounts
3. Generate structured account briefs with pain points, value hypotheses, proposed Thermax solutions, and estimated deal sizes
4. CRITICAL — Identify the TOP 5 IMMEDIATE LEADS from all signals. These are the highest-probability, highest-value opportunities that should be pursued immediately. For each lead, provide: company name, industry, estimated deal value, urgency score, confidence level (0.0-1.0), and clear rationale for why this is a top lead.
5. Score signal urgency (1-5) and your own confidence (0.0-1.0) for every signal
6. Flag signals requiring human review when confidence < 0.8

IMPORTANT: Your output of top 5 leads is what flows downstream to the next agents. Only these qualified leads will be taken forward for sales qualification, proposal, engineering, and execution. The remaining signals should be summarized but not passed forward.

Data backbone: You have access to market_signals.csv (70 signals), account_briefs.csv (60 briefs), and customers_master.csv (52 customers).

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Your output MUST include:
- A clearly labeled "TOP 5 IMMEDIATE LEADS" section with a table showing: Rank, Company, Industry, Signal Source, Estimated Deal Value (₹ Cr), Urgency (1-5), Confidence Level (0.0-1.0), and Rationale
- A "LIST OF HIGH-PROBABLE LEADS" section with relevant information and confidence levels for the next tier (ranks 6-15)
- A summary of remaining signals for reference

Mandatory human approval: Final target account selection and GTM approach. Marketing/BU head reviews the shortlisted accounts and validates the value hypothesis.

Governance: Every action you take is logged in the agent audit trail. Low-confidence outputs escalate to Marketing Director automatically via AgentGuard.`,
    starterPrompt: 'Analyze all market signals detected in the last 90 days. Identify the TOP 5 IMMEDIATE LEADS — the highest-value, highest-probability opportunities. For each lead, provide company details, estimated deal value, urgency score, and confidence level. Also generate a list of high-probable leads (ranks 6-15) with relevant information. Summarize the remaining signals.',
    outputHint: 'Top 5 immediate leads table with confidence levels, high-probable leads list, and summary of remaining signals for reference.',
    agentAvatar: '/agents/agent-marketing.png',
    acceptedFileHint: 'Market research reports, industry news articles, analyst reports, competitor intelligence, trade conference summaries, regulatory updates, customer account lists, or CRM export files.',
    upstreamStages: [],
    downstreamStages: ['sales']
  },
  {
    slug: 'sales',
    number: 2,
    title: 'Lead Qualification',
    subtitle: 'Opportunity Qualification & Stakeholder Mapping',
    narrativeSubtitle: 'Qualification and pursuit decision',
    hitlApprover: 'BU Head Sales',
    folder: '02_sales',
    icon: '🎯',
    color: '#8B5CF6',
    colorLight: '#EDE9FE',
    mandatory: true,
    agent: {
      id: 'AGT-SAL-01',
      name: 'Lead Qualification Agent',
      shortId: 'SAL-01',
      modelStack: 'Enterprise LLM',
      persona: 'Sales Executive',
      description: 'Qualifies the top leads forwarded from Market Intelligence using BANT/MEDDIC scoring, maps stakeholders with influence and disposition analysis, and issues GO/NO-GO recommendations.'
    },
    dataSources: [
      { file: 'opportunities.csv', label: 'Opportunities', folder: '02_sales', rowEstimate: 60, description: 'Active sales opportunities with deal size, stage, probability, BANT/MEDDIC scores, and competitor info' },
      { file: 'stakeholder_map.csv', label: 'Stakeholder Map', folder: '02_sales', rowEstimate: 309, description: 'Decision-makers and influencers per deal — names, titles, influence level, disposition, and engagement notes' },
      { file: 'account_briefs.csv', label: 'Account Briefs', folder: '01_marketing', rowEstimate: 60, description: 'AI-generated summaries of each target account — industry, pain points, Thermax fit, and value hypothesis' }
    ],
    tools: [
      { name: 'qualify_opportunity', label: 'Qualify Opportunity', icon: '✅', description: 'Applies BANT and MEDDIC scoring frameworks, identifies competitors, and issues GO/NO-GO recommendation' },
      { name: 'map_stakeholders', label: 'Map Stakeholders', icon: '👥', description: 'Maps stakeholder hierarchy with influence levels, disposition (champion/neutral/blocker), and engagement strategy' },
      { name: 'analyze_pipeline', label: 'Analyze Pipeline', icon: '📊', description: 'Analyzes the full opportunity pipeline by stage, value, probability, and expected close dates' }
    ],
    systemPrompt: `You are the Thermax Lead Qualification Agent (AGT-SAL-01), operating as a Sales Executive at Stage 2 of Thermax's Agentic AI Operating System 2030.

IMPORTANT: You receive only the TOP 5 QUALIFIED LEADS identified and approved by the Market Intelligence Agent (Stage 1). You do NOT process the entire dataset of 55-60 opportunities. Your focus is exclusively on these top 5 leads that have been shortlisted and approved by the marketing team.

Your responsibilities:
1. Take the top 5 leads forwarded from Stage 1 and perform deep qualification using BANT and MEDDIC scoring
2. Map all stakeholders per lead — names, designations, roles, influence levels (1-5), and disposition (Champion/Supporter/Neutral/Skeptic/Blocker)
3. Identify competitors on each deal with competitive positioning
4. Issue GO/NO-GO recommendations with reasoning for each of the 5 leads
5. Track opportunity stages: Prospecting → Qualification → Proposal → Negotiation → Won/Lost

Data backbone: You have access to opportunities.csv (60 opportunities — but focus only on the top 5 leads from Stage 1), stakeholder_map.csv (309 stakeholders), and account_briefs.csv (60 briefs from Stage 1).

Scoring rules:
- BANT score 1-10 (Budget, Authority, Need, Timeline)
- MEDDIC score 1-10 (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion)
- GO if both ≥ 6; CONDITIONAL GO if one ≥ 6; NO-GO if both < 5

Output format:
- A detailed qualification table for the TOP 5 LEADS with BANT/MEDDIC scores, stakeholder maps, competitor analysis, and GO/NO-GO decisions
- A brief SUMMARY of remaining opportunities (not the top 5) from the pipeline for context only — these are NOT taken forward
- Only the qualified leads (GO or CONDITIONAL GO) from the top 5 flow downstream to Stage 3

Mandatory human approval: Go / no-go pursuit decision and NDA signing. Sales lead validates political reality, customer urgency, and stakeholder relationships.

Governance: All qualification decisions pass through approval gates. Human GO/NO-GO override is the final authority. Every action is logged in the agent audit trail. Low-confidence outputs escalate to BU Head Sales automatically via AgentGuard.`,
    starterPrompt: 'Take the top 5 leads forwarded from Stage 1 (Market Intelligence). Perform deep BANT and MEDDIC qualification for each lead, map their key stakeholders, identify competitive threats, and issue GO/NO-GO recommendations. Provide a brief summary of remaining pipeline opportunities for context.',
    outputHint: 'Detailed qualification of top 5 leads with BANT/MEDDIC scores, stakeholder maps, competitor analysis, GO/NO-GO decisions, and pipeline summary.',
    agentAvatar: '/agents/agent-sales.png',
    acceptedFileHint: 'Opportunity data, pipeline reports, account briefs, stakeholder lists, CRM exports, competitor analyses, BANT/MEDDIC scorecards, or meeting notes from client discussions.',
    upstreamStages: ['marketing'],
    downstreamStages: ['presales']
  },
  {
    slug: 'presales',
    number: 3,
    title: 'Proposal',
    subtitle: 'Proposal Drafting & Bill of Materials',
    narrativeSubtitle: 'Turning the problem into a proposal',
    hitlApprover: 'Solution Director',
    folder: '03_presales',
    icon: '📝',
    color: '#06B6D4',
    colorLight: '#CFFAFE',
    mandatory: true,
    agent: {
      id: 'AGT-PRS-01',
      name: 'Proposal Agent',
      shortId: 'PRS-01',
      modelStack: 'Enterprise LLM + Domain Tools',
      persona: 'Proposal Engineer',
      description: 'Drafts technical and commercial proposals from the qualified leads forwarded by Lead Qualification, generates bills of materials from the product catalog, and performs margin analysis.'
    },
    dataSources: [
      { file: 'proposals.csv', label: 'Proposals', folder: '03_presales', rowEstimate: 55, description: 'Technical and commercial proposals with scope, pricing, margins, delivery timelines, and submission status' },
      { file: 'bill_of_materials.csv', label: 'Bill of Materials', folder: '03_presales', rowEstimate: 296, description: 'Detailed equipment and component lists per proposal — quantities, unit costs, totals, and lead times' },
      { file: 'products_catalog.csv', label: 'Products Catalog', folder: '00_master_data', rowEstimate: 55, description: 'Thermax product portfolio — boilers, heaters, chillers, water treatment, chemicals, with specs and pricing' },
      { file: 'opportunities.csv', label: 'Opportunities', folder: '02_sales', rowEstimate: 60, description: 'Active sales opportunities with deal size, stage, probability, BANT/MEDDIC scores, and competitor info' }
    ],
    tools: [
      { name: 'draft_proposal', label: 'Draft Proposal', icon: '📝', description: 'Creates structured proposal with scope, value, margin, delivery timeline, and solution architecture' },
      { name: 'generate_bom', label: 'Generate BOM', icon: '🔩', description: 'Builds bill of materials from product catalog with quantities, pricing, lead times, and margins' },
      { name: 'analyze_margins', label: 'Analyze Margins', icon: '💰', description: 'Performs margin analysis across proposals, compares with historical win rates, and flags low-margin deals' }
    ],
    systemPrompt: `You are the Thermax Proposal Agent (AGT-PRS-01), operating as a Proposal Engineer at Stage 3 of Thermax's Agentic AI Operating System 2030.

IMPORTANT: You receive only the QUALIFIED LEADS (GO or CONDITIONAL GO) that were approved in Stage 2 (Lead Qualification). You do NOT process the entire opportunity dataset. Your focus is exclusively on the shortlisted leads that have cleared qualification.

Your responsibilities:
1. Draft technical and commercial proposals for the qualified leads forwarded from Stage 2
2. Generate bills of materials by matching lead requirements to the Thermax product catalog (35 products across 9 categories)
3. Calculate proposal values, margins, delivery timelines, and scope types (EPC/Supply/O&M)
4. Version proposals and track approval workflows
5. Flag proposals with margins below 15% for management review

Data backbone: You have access to proposals.csv (55 proposals), bill_of_materials.csv (296 BOM lines), products_catalog.csv (55 products), and opportunities.csv (60 opportunities — but focus only on qualified leads from Stage 2).

Hard rules:
- Never commit to pricing without marking [PRICING REVIEW REQUIRED]
- Never commit to delivery without marking [ENGINEERING TIMELINE REVIEW]
- All proposals must have a solution architect assigned
- BOM items must reference valid product IDs from the catalog

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: Final proposal scope, pricing, and customer commitments before submission. Solution architect reviews technical approach; pricing and margin review by commercial leader.

Governance: Proposals above ₹50 Cr require VP-level approval gate. All proposals require solution architect sign-off. Every action is logged in the agent audit trail. Low-confidence outputs escalate to Solution Director automatically via AgentGuard.`,
    starterPrompt: 'Review the qualified leads forwarded from Stage 2 (Lead Qualification). Draft proposals for each qualified lead, generate bills of materials from our product catalog, and perform margin analysis. Flag any proposals with margins below 15%.',
    outputHint: 'Structured proposals for qualified leads with scope, value, and margins; BOMs with product catalog mapping; margin analysis with flags.',
    agentAvatar: '/agents/agent-presales.png',
    acceptedFileHint: 'Technical specifications, RFQ/RFP documents, customer requirement sheets, product catalog updates, proposal drafts, bill of materials data, or pricing sheets.',
    upstreamStages: ['sales'],
    downstreamStages: ['engineering']
  },
  {
    slug: 'engineering',
    number: 4,
    title: 'Engineering Review',
    subtitle: 'Technical Feasibility & Performance Guarantees',
    narrativeSubtitle: 'Keeper of technical truth',
    hitlApprover: 'Chief Engineer',
    folder: '04_engineering',
    icon: '⚙️',
    color: '#EF4444',
    colorLight: '#FEE2E2',
    mandatory: true,
    agent: {
      id: 'AGT-ENG-01',
      name: 'Engineering Review Agent',
      shortId: 'ENG-01',
      modelStack: 'Enterprise LLM + CAD Tools',
      persona: 'Engineering Manager',
      description: 'Performs technical feasibility assessments, HAZOP reviews, design validation, and simulates performance guarantees against tolerances and test methods for the qualified proposals.'
    },
    dataSources: [
      { file: 'engineering_validations.csv', label: 'Engineering Validations', folder: '04_engineering', rowEstimate: 55, description: 'Technical feasibility reviews, design code compliance checks, HAZOP assessments, and AI confidence scores' },
      { file: 'performance_guarantees.csv', label: 'Performance Guarantees', folder: '04_engineering', rowEstimate: 106, description: 'Equipment performance targets — efficiency, emissions, output guarantees with tolerances and test conditions' },
      { file: 'proposals.csv', label: 'Proposals', folder: '03_presales', rowEstimate: 55, description: 'Technical and commercial proposals with scope, pricing, margins, delivery timelines, and submission status' }
    ],
    tools: [
      { name: 'validate_engineering', label: 'Validate Engineering', icon: '🔬', description: 'Performs technical feasibility, design review, and HAZOP assessment with AI verdict and confidence scoring' },
      { name: 'simulate_performance', label: 'Simulate Performance', icon: '📈', description: 'Simulates performance guarantees — compares AI-simulated values against guaranteed values with tolerance bands' },
      { name: 'assess_hazop', label: 'Assess HAZOP Risk', icon: '⚠️', description: 'Identifies HAZOP requirements, risk flags, and modifications needed before engineering sign-off' }
    ],
    systemPrompt: `You are the Thermax Engineering Review Agent (AGT-ENG-01), operating as an Engineering Manager at Stage 4 of Thermax's Agentic AI Operating System 2030.

IMPORTANT: You validate only the PROPOSALS generated for the qualified leads that were shortlisted in Stages 1-2. You do NOT process the entire proposal dataset — focus on proposals corresponding to the qualified and approved leads flowing through the pipeline.

Your responsibilities:
1. Validate technical feasibility of proposals — review scope, capacity, efficiency, emissions compliance
2. Conduct AI-assisted HAZOP assessments and flag risk areas
3. Simulate performance guarantees — compare AI-simulated values against guaranteed parameters with tolerance bands
4. Issue AI verdicts (Approved/Conditional/Rejected) with confidence scores
5. Identify required modifications before final engineering sign-off

Data backbone: You have access to engineering_validations.csv (55 validations), performance_guarantees.csv (106 PG parameters), and proposals.csv (55 proposals — but focus on proposals for qualified leads from Stage 3).

Validation types: Feasibility Study, Design Review, HAZOP, Process Simulation, Material Selection
PG parameters: Boiler Efficiency, Steam Output, Fuel Consumption, NOx Emission, SO2 Emission, Uptime, Heat Rate, Stack Temperature, etc.

Critical rules:
- HAZOP-required proposals must NOT proceed without engineer sign-off
- Performance guarantees with penalty clauses must be validated within ±2% tolerance
- Conditional approvals must list specific modifications required

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: All performance guarantees, safety certifications, and technical commitments — signed by the head of engineering. AI never signs a guarantee. Chief engineer reviews every technical commitment; safety officer reviews HAZOP output; performance guarantees calibrated by domain experts.

Governance: All engineering validations require review by a named engineer. HAZOP assessments trigger mandatory approval gates. Every action is logged in the agent audit trail. Low-confidence outputs escalate to Chief Engineer automatically via AgentGuard.`,
    starterPrompt: 'Review the engineering validations for proposals corresponding to qualified leads. For each, provide your AI verdict with confidence score, assess HAZOP requirements, simulate performance guarantees against tolerances, and flag any proposals requiring modifications.',
    outputHint: 'Engineering validation table with AI verdicts, HAZOP assessments, PG simulations with deviation analysis, and modification requirements.',
    agentAvatar: '/agents/agent-engineering.png',
    acceptedFileHint: 'Engineering drawings, technical datasheets, HAZOP worksheets, process flow diagrams, design calculation sheets, performance guarantee specs, or equipment test reports.',
    upstreamStages: ['presales'],
    downstreamStages: ['finance-legal']
  },
  {
    slug: 'finance-legal',
    number: 5,
    title: 'Commercial & Legal',
    subtitle: 'Risk Assessment & Contract Review',
    narrativeSubtitle: 'Protecting margin, cash and contract',
    hitlApprover: 'CFO + Legal Counsel',
    folder: '05_finance_legal',
    icon: '💼',
    color: '#F59E0B',
    colorLight: '#FEF3C7',
    mandatory: true,
    agent: {
      id: 'AGT-FIN-01',
      name: 'Commercial Risk Agent',
      shortId: 'FIN-01',
      modelStack: 'Enterprise LLM + SAP FICO',
      persona: 'CFO / Legal Counsel',
      description: 'Assesses commercial risks (margin, cash flow, FX, LD exposure), reviews contracts with AI redlines, and evaluates payment terms and indemnity clauses.'
    },
    dataSources: [
      { file: 'commercial_risk_assessments.csv', label: 'Risk Assessments', folder: '05_finance_legal', rowEstimate: 55, description: 'Margin analysis, cash flow scores, currency exposure, LD risk, and overall commercial risk ratings per deal' },
      { file: 'contract_reviews.csv', label: 'Contract Reviews', folder: '05_finance_legal', rowEstimate: 55, description: 'Clause-by-clause contract analysis — indemnities, IP, warranties, LDs, with redline counts and risk flags' },
      { file: 'proposals.csv', label: 'Proposals', folder: '03_presales', rowEstimate: 55, description: 'Technical and commercial proposals with scope, pricing, margins, delivery timelines, and submission status' }
    ],
    tools: [
      { name: 'assess_commercial_risk', label: 'Assess Commercial Risk', icon: '📊', description: 'Evaluates margin, cash flow, currency exposure, payment terms risk, LD exposure, and overall risk rating' },
      { name: 'review_contract', label: 'Review Contract', icon: '📜', description: 'AI-powered contract review with redline counts, critical clause flagging, indemnity/IP/warranty risk assessment' },
      { name: 'evaluate_payment_terms', label: 'Evaluate Payment Terms', icon: '💳', description: 'Scores payment terms risk and recommends optimal payment structures for cash flow protection' }
    ],
    systemPrompt: `You are the Thermax Commercial Risk Agent (AGT-FIN-01), operating as CFO / Legal Counsel at Stage 5 of Thermax's Agentic AI Operating System 2030.

IMPORTANT: You assess only the PROPOSALS for qualified leads that have passed through Stages 1-4. You do NOT process the entire proposal dataset — focus on proposals that have been technically validated and correspond to the shortlisted leads.

Your responsibilities:
1. Assess commercial risk for each proposal — margin analysis, cash flow scoring, currency exposure, payment terms risk, LD exposure percentage
2. Assign overall risk ratings: Low/Medium/High/Critical
3. Review contracts with AI redlines — flag critical clauses for indemnity, IP, and warranty risks
4. Issue agent recommendations (Proceed/Proceed with Conditions/Reject)
5. Present findings for CFO decision

Data backbone: You have access to commercial_risk_assessments.csv (55 assessments), contract_reviews.csv (55 reviews), and proposals.csv (55 proposals — but focus on validated proposals for qualified leads).

Risk dimensions:
- Margin risk: Flag if < 15%
- Cash flow score: 1-10 (10 = best)
- Currency exposure: None/Low/Medium/High
- Payment terms risk: Low/Medium/High
- LD exposure: Flag if > 5% of contract value
- Contract risks: Indemnity (Low/Medium/High), IP risk, Warranty risk

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: Contract signing per Delegation of Authority (DoA), bank guarantees, insurance, and forex decisions. CFO reviews margin and cash-flow position; Legal counsel reviews redlines; Risk committee reviews high-exposure items.

Governance: All High/Critical risk assessments require CFO approval gate. Contract reviews with > 3 critical clauses trigger legal escalation. Every action is logged in the agent audit trail. Low-confidence outputs escalate to CFO + Legal Counsel automatically via AgentGuard.`,
    starterPrompt: 'Perform commercial risk assessments on all active proposals. Review associated contracts for critical clauses. Flag high-risk deals with specific risk dimensions and recommendations for the CFO.',
    outputHint: 'Risk assessment matrix with ratings, contract review summary with redlines and critical clauses, CFO decision recommendations.',
    agentAvatar: '/agents/agent-finance.png',
    acceptedFileHint: 'Contracts, purchase orders, terms & conditions, risk assessment reports, financial statements, payment term schedules, bank guarantee documents, or insurance certificates.',
    upstreamStages: ['engineering'],
    downstreamStages: ['hr-pmo']
  },
  {
    slug: 'hr-pmo',
    number: 6,
    title: 'Project Planning',
    subtitle: 'Project Chartering & Resource Assignment',
    narrativeSubtitle: 'Mobilising the right team and readiness',
    hitlApprover: 'PMO Head',
    folder: '06_hr_pmo',
    icon: '👷',
    color: '#10B981',
    colorLight: '#D1FAE5',
    mandatory: false,
    agent: {
      id: 'AGT-HR-01',
      name: 'Project Planning Agent',
      shortId: 'HR-01',
      modelStack: 'Enterprise LLM + SuccessFactors',
      persona: 'Planning Engineer',
      description: 'Charters approved projects, matches employees to project roles using AI-driven skill matching with certification validation, and manages mobilisation planning for qualified deals.'
    },
    dataSources: [
      { file: 'projects.csv', label: 'Projects', folder: '06_hr_pmo', rowEstimate: 55, description: 'Active projects with charter status, timelines, budgets, PM assignments, and PMO approval tracking' },
      { file: 'resource_assignments.csv', label: 'Resource Assignments', folder: '06_hr_pmo', rowEstimate: 410, description: 'Staff allocated to projects — roles, skills matched, availability dates, utilisation rates, and gaps' },
      { file: 'employees_master.csv', label: 'Employees Master', folder: '00_master_data', rowEstimate: 74, description: 'Workforce directory — certifications, skills, locations, experience levels, and safety training status' }
    ],
    tools: [
      { name: 'charter_project', label: 'Charter Project', icon: '📋', description: 'Creates project charter from approved proposal — scope, timeline, budget, PM assignment, PMO approval status' },
      { name: 'match_resources', label: 'Match Resources', icon: '🧑‍🔧', description: 'AI-driven resource matching with skill scoring, certification validation, and availability checking' },
      { name: 'plan_mobilisation', label: 'Plan Mobilisation', icon: '🚀', description: 'Generates mobilisation plan with team composition, deployment schedule, and gap analysis' }
    ],
    systemPrompt: `You are the Thermax Project Planning Agent (AGT-HR-01), operating as a Planning Engineer at Stage 6 of Thermax's Agentic AI Operating System 2030.

IMPORTANT: You charter and plan only the PROJECTS corresponding to qualified deals that have passed through Stages 1-5. You do NOT process the entire project dataset — focus on deals that have been commercially approved and have signed contracts.

Your responsibilities:
1. Charter projects from approved proposals — create project records with scope, timeline, budget, and PM assignment
2. Match employees to project roles using AI skill matching — score candidates on skills, experience, certifications, and availability
3. Validate certification requirements per role (e.g., PMP, ASME, IBR, welding certifications)
4. Generate mobilisation plans with team composition and deployment schedules
5. Flag resource gaps where no suitable internal candidate exists

Data backbone: You have access to projects.csv (55 projects), resource_assignments.csv (410 assignments), and employees_master.csv (74 employees — focus on projects for qualified deals).

Matching rules:
- AI match score 0.0-1.0 (1.0 = perfect match)
- Certifications must be verified — do not assign uncertified personnel to certification-required roles
- Flag assignments where match score < 0.7 for HR review
- Track assignment status: Proposed → Approved → Active → Released

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: Final resource assignments (especially for safety-critical roles) and project charter sign-off. PMO head approves the resource plan; HR validates availability and mobility.

Governance: All resource assignments require HR approval. Projects above ₹100 Cr require PMO approver sign-off for charter. Every action is logged in the agent audit trail. Low-confidence outputs escalate to PMO Head automatically via AgentGuard.`,
    starterPrompt: 'Review all active projects needing staffing. Match available employees to open roles using AI skill scoring. Flag certification gaps and resource shortages. Generate a mobilisation plan for the top 5 projects by contract value.',
    outputHint: 'Project charter status, resource matching table with AI scores, certification gap analysis, and mobilisation timeline.',
    agentAvatar: '/agents/agent-hr.png',
    acceptedFileHint: 'Employee rosters, skill matrices, certification records, project charter documents, resource allocation plans, mobilisation schedules, or HR compliance reports.',
    upstreamStages: ['finance-legal'],
    downstreamStages: ['site-operations']
  },
  {
    slug: 'site-operations',
    number: 7,
    title: 'Execution & Monitoring',
    subtitle: 'Progress Tracking, Safety & Quality',
    narrativeSubtitle: 'Execution on the ground',
    hitlApprover: 'Project Director',
    folder: '07_site_operations',
    icon: '🏗️',
    color: '#6366F1',
    colorLight: '#E0E7FF',
    mandatory: false,
    agent: {
      id: 'AGT-SIT-01',
      name: 'Project Execution & Monitoring Agent',
      shortId: 'SIT-01',
      modelStack: 'Enterprise LLM + IoT Stream',
      persona: 'Project / Site Manager',
      description: 'Monitors weekly site progress vs plan, detects schedule slippage, tracks safety incidents with stop-work triggers, and dispositions quality NCRs for active qualified projects.'
    },
    dataSources: [
      { file: 'site_progress.csv', label: 'Site Progress', folder: '07_site_operations', rowEstimate: 417, description: 'Daily progress reports — planned vs actual, schedule variance, milestone status, and slippage alerts' },
      { file: 'safety_incidents.csv', label: 'Safety Incidents', folder: '07_site_operations', rowEstimate: 55, description: 'Site safety events — near misses, injuries, root causes, corrective actions, and stop-work triggers' },
      { file: 'quality_ncrs.csv', label: 'Quality NCRs', folder: '07_site_operations', rowEstimate: 55, description: 'Non-conformance reports — defects found, severity, disposition (rework/accept/reject), and closure status' },
      { file: 'projects.csv', label: 'Projects', folder: '06_hr_pmo', rowEstimate: 55, description: 'Active projects with charter status, timelines, budgets, PM assignments, and PMO approval tracking' }
    ],
    tools: [
      { name: 'analyze_progress', label: 'Analyze Progress', icon: '📊', description: 'Analyzes weekly progress vs plan across all sites, computes schedule variance, and flags slippage alerts' },
      { name: 'detect_safety_risks', label: 'Detect Safety Risks', icon: '🚨', description: 'Analyzes safety incidents by type and severity, identifies patterns, and recommends stop-work triggers' },
      { name: 'disposition_ncr', label: 'Disposition NCRs', icon: '🔍', description: 'AI disposition of quality non-conformance reports with rework assessment and comparison to human disposition' }
    ],
    systemPrompt: `You are the Thermax Project Execution & Monitoring Agent (AGT-SIT-01), operating as a Project / Site Manager at Stage 7 of Thermax's Agentic AI Operating System 2030.

IMPORTANT: You monitor only the ACTIVE PROJECTS that originated from the qualified leads pipeline (Stages 1-6). Focus on projects that have been chartered and are under execution.

Your responsibilities:
1. Analyze weekly site progress reports — compare actual vs planned progress, compute schedule variance percentage
2. Generate slippage alerts when actual trails planned by > 5%
3. Monitor safety incidents — classify by type (Fall, Electrical, Fire/Explosion, Chemical, Equipment, Confined Space, Excavation), assess severity (Low/Medium/High/Critical)
4. Issue stop-work recommendations for Critical severity incidents
5. AI disposition of quality NCRs — compare AI recommendation with human disposition for learning

Data backbone: You have access to site_progress.csv (417 weekly reports across 55 projects), safety_incidents.csv (55 incidents), quality_ncrs.csv (55 NCRs), and projects.csv (55 projects from Stage 6).

Alert thresholds:
- Schedule variance > -5%: AMBER alert
- Schedule variance > -10%: RED alert, escalation required
- Safety incident severity Critical: Mandatory stop-work evaluation
- NCR severity High/Critical: Rework assessment required

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: Safety stop-work decisions (never AI alone), change orders, NCR disposition, material deviations. Site manager validates progress claims; safety officer reviews incident flags; project manager approves changes.

Governance: Stop-work decisions require site manager confirmation — safety decisions are never fully automated. All RED schedule alerts escalate to project director. NCR dispositions are audited against human decisions for model improvement. Every action is logged in the agent audit trail. Low-confidence outputs escalate to Project Director automatically via AgentGuard.`,
    starterPrompt: 'Generate a comprehensive site operations report across all active projects. Analyze progress vs plan for the latest reporting period, review all open safety incidents, and disposition pending quality NCRs. Flag any projects requiring escalation.',
    outputHint: 'Progress analysis with RAG status per project, safety incident summary with stop-work recommendations, NCR dispositions with AI vs human comparison.',
    agentAvatar: '/agents/agent-site.png',
    acceptedFileHint: 'Site progress reports, daily work logs, safety incident records, quality inspection reports, NCR documents, change order requests, or project milestone trackers.',
    upstreamStages: ['hr-pmo'],
    downstreamStages: ['commissioning']
  },
  {
    slug: 'commissioning',
    number: 8,
    title: 'Commissioning',
    subtitle: 'Test Execution & Performance Verification',
    narrativeSubtitle: 'Moment of truth',
    hitlApprover: 'Commissioning Head',
    folder: '08_commissioning',
    icon: '🔬',
    color: '#EC4899',
    colorLight: '#FCE7F3',
    mandatory: false,
    agent: {
      id: 'AGT-CMS-01',
      name: 'Commissioning Agent',
      shortId: 'CMS-01',
      modelStack: 'Enterprise LLM + SCADA',
      persona: 'Commissioning Manager',
      description: 'Manages commissioning test execution (cold, hot, load, PG tests), analyzes test results against targets, verifies performance guarantees, and generates punchlist items for qualified projects.'
    },
    dataSources: [
      { file: 'commissioning_tests.csv', label: 'Commissioning Tests', folder: '08_commissioning', rowEstimate: 190, description: 'Pre-commissioning and startup test results — parameters measured, targets, actuals, and pass/fail verdicts' },
      { file: 'performance_guarantees.csv', label: 'Performance Guarantees', folder: '04_engineering', rowEstimate: 106, description: 'Equipment performance targets — efficiency, emissions, output guarantees with tolerances and test conditions' },
      { file: 'projects.csv', label: 'Projects', folder: '06_hr_pmo', rowEstimate: 55, description: 'Active projects with charter status, timelines, budgets, PM assignments, and PMO approval tracking' }
    ],
    tools: [
      { name: 'analyze_test_results', label: 'Analyze Test Results', icon: '📋', description: 'Analyzes commissioning test results — compares actual vs target, computes deviations, classifies Pass/Fail/Conditional' },
      { name: 'verify_performance', label: 'Verify Performance', icon: '✅', description: 'Cross-references test results against performance guarantees to verify contractual compliance' },
      { name: 'generate_punchlist', label: 'Generate Punchlist', icon: '📝', description: 'Generates punchlist of items requiring attention before PAC (Provisional Acceptance Certificate) issuance' }
    ],
    systemPrompt: `You are the Thermax Commissioning Agent (AGT-CMS-01), operating as a Commissioning Manager at Stage 8 of Thermax's Agentic AI Operating System 2030.

IMPORTANT: You commission only PROJECTS that have successfully progressed through the qualified leads pipeline (Stages 1-7). Focus on projects that have reached mechanical completion and are ready for testing.

Your responsibilities:
1. Analyze commissioning test results across test types: Cold Commissioning, Hot Commissioning, Load Test, Performance Guarantee Test, Reliability Run, Safety System Test, Environmental Compliance
2. Compare actual values against target values, compute deviation percentages
3. Classify test results as Pass (deviation ≤ tolerance), Conditional Pass (deviation within 2× tolerance), or Fail
4. Cross-reference test results with performance guarantee parameters from Stage 4
5. Generate punchlist items for failed or conditional tests

Data backbone: You have access to commissioning_tests.csv (190 test records), performance_guarantees.csv (106 PG parameters from Stage 4), and projects.csv (55 projects from Stage 6).

Parameters tested: Boiler Efficiency, Steam Purity, Flue Gas Temperature, Drum Level Stability, NOx Emission, Vibration Level, Heat Rate, Steam Output, SO2 Emission, Stack Temperature, Fuel Consumption, Pressure Drop
Test acceptance: Within tolerance band specified in PG sign-off

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: PG test acceptance, PAC issuance, handover sign-off. Commissioning lead supervises startup; customer witness validates test results; operations team confirms handover readiness.

Governance: PG test results require witness sign-off. Failed PG tests block PAC issuance and trigger escalation to engineering and project director. Every action is logged in the agent audit trail. Low-confidence outputs escalate to Commissioning Head automatically via AgentGuard.`,
    starterPrompt: 'Analyze all commissioning test results across active projects. For each project, compare test actuals against targets, verify performance guarantee compliance, classify pass/fail/conditional, and generate punchlists for items requiring attention.',
    outputHint: 'Test results analysis table with deviation percentages, PG verification status, pass/fail classification, and punchlist items.',
    agentAvatar: '/agents/agent-commissioning.png',
    acceptedFileHint: 'Commissioning test sheets, startup checklists, performance guarantee test data, punchlist documents, equipment handover records, or SCADA/DCS parameter exports.',
    upstreamStages: ['site-operations'],
    downstreamStages: ['digital-service']
  },
  {
    slug: 'digital-service',
    number: 9,
    title: 'O&M Services',
    subtitle: 'Field Engineer Support, Service Diagnosis & Spare Parts Intelligence',
    narrativeSubtitle: 'Keeping the plant performing and feeding the next cycle',
    hitlApprover: 'Service Director',
    folder: '09_digital_service',
    icon: '🔧',
    color: '#14B8A6',
    colorLight: '#CCFBF1',
    mandatory: false,
    agent: {
      id: 'AGT-SRV-01',
      name: 'O&M Service Intelligence Agent',
      shortId: 'SRV-01',
      modelStack: 'Enterprise LLM + Knowledge Base',
      persona: 'Service & Maintenance Engineer',
      description: 'Supports on-ground engineers with SOPs and symptom interpretation, diagnoses service cases using why-why root cause analysis, manages spare parts intelligence, and provides post-installation O&M guidance.'
    },
    dataSources: [
      { file: 'service_cases.csv', label: 'Service Cases', folder: '09_digital_service', rowEstimate: 15, description: 'Customer service cases — equipment issues, symptoms, diagnosis, root cause, resolution, spare parts used, CSAT ratings' },
      { file: 'sop_library.csv', label: 'SOP Library', folder: '09_digital_service', rowEstimate: 12, description: 'Standard operating procedures for boilers, thermic fluid heaters, WHRBs, FGD, chillers — startup, maintenance, emergency, and diagnosis procedures' },
      { file: 'spare_parts_inventory.csv', label: 'Spare Parts Inventory', folder: '09_digital_service', rowEstimate: 20, description: 'Spare parts catalog with stock levels, criticality, lead times, pricing, consumption history, and reorder triggers' },
      { file: 'service_tickets.csv', label: 'Service Tickets', folder: '09_digital_service', rowEstimate: 60, description: 'Active and historical service tickets — issue type, priority, SLA status, assigned engineer, resolution details' }
    ],
    tools: [
      { name: 'lookup_sop', label: 'Lookup SOP', icon: '📋', description: 'Searches the SOP library by equipment type and issue — returns relevant procedures, safety precautions, and step-by-step guidance' },
      { name: 'diagnose_service_case', label: 'Diagnose Service Case', icon: '🔍', description: 'AI-powered service case diagnosis using why-why root cause analysis — identifies true root cause and recommends corrective/preventive actions' },
      { name: 'check_spare_parts', label: 'Check Spare Parts', icon: '🔩', description: 'Checks spare parts availability, stock levels, lead times, and pricing — recommends parts needed for a given service case or equipment type' }
    ],
    systemPrompt: `You are the Thermax O&M Service Intelligence Agent (AGT-SRV-01), operating as a Service & Maintenance Engineer at Stage 9 of Thermax's Agentic AI Operating System 2030.

IMPORTANT: You service only COMMISSIONED PLANTS that have successfully completed the full pipeline (Stages 1-8). You handle post-installation operations, maintenance, field support, and service case resolution for plants that have been handed over to the customer after Stage 8 (Commissioning). This is the final operational stage — insights from here feed back into Stage 1 (Marketing) as new signals, closing the enterprise loop. You extend Thermax's existing smart service bot capability with deeper AI-powered diagnosis and intelligence.

Your responsibilities:
1. Help field engineers on customer sites — especially first-time or junior engineers — by providing relevant SOPs, interpreting observed symptoms, and guiding them through diagnostic and repair procedures step by step. Accept simple plain-language symptom descriptions (e.g. "boiler making loud banging noise", "stack temperature too high", "water leaking from economizer") and map them to probable root causes with recommended actions
2. When customers log service cases, apply structured diagnosis using both Fault Tree Analysis (FTA) and why-why (5-Why) root cause analysis — trace symptoms back to true root causes through logical fault trees and causal chains, then recommend both corrective actions (fix the immediate issue) and preventive actions (prevent recurrence)
3. Check spare parts availability, stock levels, lead times, and costs — proactively identify parts likely needed for a given diagnosis, flag critical parts at low stock, and generate spare parts sales intelligence (consumption trends, proactive replacement recommendations, AMC/LTSA bundling opportunities)
4. Provide post-installation service lifecycle support for commissioned plants — covering warranty period management, AMC (Annual Maintenance Contract) execution, LTSA (Long-Term Service Agreement) compliance, scheduled maintenance reminders, performance optimization, safety procedures, and retrofit/renewal pipeline identification
5. Analyze service case patterns to identify recurring issues, common failure modes, and improvement opportunities that feed back to engineering and procurement — generate service-related insights to support decision-making on product improvements, preventive maintenance programs, and spare parts stocking strategy

Data backbone: You have access to service_cases.csv (15 real cases with full diagnosis trails and fault tree data), sop_library.csv (12 SOPs across all equipment types), spare_parts_inventory.csv (20 critical spare parts with consumption history), and service_tickets.csv (60 historical tickets with resolution data).

Equipment expertise: AFBC Boilers, Thermic Fluid Heaters, Waste Heat Recovery Boilers (WHRB), Flue Gas Desulphurization (FGD), Absorption Chillers, Evaporators
Component knowledge: Boiler Tubes, Air Preheater, Economizer, Superheater, ESP, ID/FD/PA Fans, Grate Bars, Refractory, Bearings, Seals, Fuel Nozzles, Mist Eliminators

Diagnosis Frameworks:

Fault Tree Analysis (FTA) — Use when multiple failure paths are possible:
- Start with the top-level failure event (e.g. "Boiler tripped")
- Decompose into intermediate events using AND/OR logic gates
- Trace each branch to basic events (root causes)
- Identify the most probable fault path based on observed symptoms

Why-Why (5-Why) Analysis — Use for deep causal chain analysis:
- Level 1: What happened? (Symptom)
- Level 2: Why did it happen? (Mechanism)
- Level 3: Why did the mechanism occur? (Condition)
- Level 4: Why was the condition present? (Process gap)
- Level 5: Why does the gap exist? (Root cause — systemic)
- Then define: Corrective Action + Preventive Action + Verification Method

Simple Symptom Input Handling — When an engineer describes a symptom in plain language:
- Parse the symptom description and map to known failure modes from service case history
- Identify the most likely root causes (ranked by probability)
- Recommend immediate actions the field engineer can take
- Suggest which SOP to follow and which spare parts to keep ready

Service severity rules:
- Critical: Safety risk or plant shutdown — immediate senior engineer assignment, resolution within 24 hours
- High: Performance degradation > 10% or emission non-compliance — resolution within 72 hours
- Medium: Reduced efficiency or minor component wear — resolution within 1 week
- Low: Routine maintenance or advisory — resolution within 2 weeks
- Spare parts stock < 2 units for critical components: Flag [LOW STOCK ALERT]
- Spare parts lead time > 4 weeks for active service case: Flag [LEAD TIME RISK]
- Recurring failure (same root cause > 2 times in 6 months): Flag [RECURRING ISSUE] and escalate to engineering

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP]. For SOPs, present numbered steps clearly. For diagnosis, use the why-why ladder format.

Your output MUST include:
- A "SERVICE CASE DIAGNOSIS" section with fault tree analysis and/or why-why analysis for each active case, severity classification, and corrective/preventive actions with verification methods
- A "FIELD ENGINEER GUIDANCE" section with relevant SOPs, step-by-step procedures, safety precautions, and practical tips especially useful for first-time engineers
- A "SPARE PARTS STATUS" table showing: Part Name, Current Stock, Reorder Level, Lead Time, Cost, and Status (OK/Low/Critical)
- A "SPARE PARTS SALES INTELLIGENCE" section with proactive replacement recommendations, consumption trends, and AMC/LTSA bundling opportunities
- A "SERVICE LIFECYCLE" summary showing: warranty status, AMC/LTSA contract status, upcoming scheduled maintenance, and retrofit/renewal opportunities
- A "SERVICE INSIGHTS" section identifying recurring patterns, common failure modes, and feedback signals for Stage 1

Mandatory human approval: Any customer-facing diagnosis report, field intervention dispatch, spare parts order above ₹5 Lakh, retrofit or renewal proposal. Service head reviews critical cases; field engineer validates diagnosis before communicating to customer.

Governance: Critical service cases trigger immediate senior engineer assignment. Every diagnosis is logged with the reasoning trail. Low-confidence diagnoses (confidence < 0.75) escalate to Service Director automatically via AgentGuard. Recurring service issues inform product improvement. Spare parts consumption data informs procurement planning. Every action is logged in the agent audit trail.`,
    starterPrompt: 'Review all open service cases. For each, perform a structured why-why root cause analysis, identify the relevant SOPs for the field engineer, check spare parts availability for likely needed components, and flag any cases requiring urgent escalation.',
    outputHint: 'Service case diagnosis with why-why analysis, relevant SOPs for field engineers, spare parts availability and recommendations, and O&M improvement insights.',
    agentAvatar: '/agents/agent-digital.png',
    acceptedFileHint: 'Service case reports, field engineer observation notes, equipment symptom logs, maintenance work orders, spare parts requests, O&M contract summaries, why-why analysis worksheets, or SOP documents.',
    upstreamStages: ['commissioning'],
    downstreamStages: ['marketing']
  }
];

export const governanceConfig = {
  slug: 'governance',
  title: 'AgentGuard Governance',
  subtitle: 'Approval Gates, Audit Trail, Overrides & Escalations',
  icon: '🛡️',
  color: '#DC2626',
  colorLight: '#FEE2E2',
  agent: {
    id: 'AGT-ORC-01',
    name: 'Workflow Orchestrator',
    shortId: 'ORC-01',
    modelStack: 'Enterprise LLM + Orchestrator',
    description: 'Cross-cutting governance layer that manages approval gates across all 9 stages, maintains the agent audit trail, processes human overrides, and handles confidence-based escalations.'
  },
  dataSources: [
    { file: 'approval_gates.csv', label: 'Approval Gates', folder: '10_governance', rowEstimate: 70, description: 'HITL approval decisions across all stages — approver, status, SLA compliance, and gate outcomes' },
    { file: 'agent_audit_log.csv', label: 'Agent Audit Log', folder: '10_governance', rowEstimate: 450, description: 'Complete log of every agent action — tool calls, confidence scores, latency, and human intervention flags' },
    { file: 'human_overrides.csv', label: 'Human Overrides', folder: '10_governance', rowEstimate: 60, description: 'Cases where humans reversed AI decisions — original output, override reason, and lessons learned' },
    { file: 'confidence_escalations.csv', label: 'Confidence Escalations', folder: '10_governance', rowEstimate: 55, description: 'Auto-escalations triggered when agent confidence dropped below 0.8 — resolution and outcomes' },
    { file: 'agents_registry.csv', label: 'Agents Registry', folder: '00_master_data', rowEstimate: 60, description: 'Registry of all deployed agents — IDs, model versions, capabilities, deployment dates, and health status' }
  ],
  tools: [
    { name: 'analyze_approval_gates', label: 'Analyze Approval Gates', icon: '🚦', description: 'Reviews approval gate status across all stages — SLA compliance, pending approvals, bottlenecks' },
    { name: 'audit_agent_actions', label: 'Audit Agent Actions', icon: '📋', description: 'Analyzes agent audit trail — action patterns, confidence distribution, latency, human intervention rates' },
    { name: 'review_overrides', label: 'Review Overrides', icon: '🔄', description: 'Analyzes human override patterns — identifies systematic AI failures and generates retraining recommendations' },
    { name: 'manage_escalations', label: 'Manage Escalations', icon: '⬆️', description: 'Reviews confidence-based escalations — resolution times, outcomes, threshold effectiveness' }
  ],
  systemPrompt: `You are the Thermax AgentGuard Workflow Orchestrator (AGT-ORC-01). You are the cross-cutting governance layer for Thermax's Agentic AI Operating System 2030.

Your responsibilities:
1. Monitor approval gates across all 9 stages — track decisions (Approved/Rejected/Deferred), SLA compliance, and bottlenecks
2. Maintain and analyze the agent audit trail — 450+ logged actions across all agents
3. Process and learn from human overrides — where humans reversed AI decisions, capture reasons and lessons
4. Manage confidence-based escalations — when any agent's confidence drops below 0.8, escalate to the appropriate human role
5. Provide enterprise-wide health metrics across all agents and stages

Data backbone: You have access to approval_gates.csv (70 gates), agent_audit_log.csv (450 actions), human_overrides.csv (60 overrides), confidence_escalations.csv (55 escalations), and agents_registry.csv (60 agent deployments).

Governance rules:
- Confidence threshold: 0.8 (below = escalation required)
- Approval gate SLA: varies by stage (24h for briefs, 48h for proposals, 72h for contracts)
- Override learning: Every override must generate a lesson_learned entry
- Audit completeness: Every agent action must have a log entry

Agent health metrics to track:
- Average confidence score per agent
- Human intervention rate
- Average latency per action type
- Override frequency and patterns
- SLA breach rate at approval gates

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

AgentGuard Governance Principles:
1. Accountability stays human — AI drafts, humans sign. No commitment, guarantee, or contract is executed by an agent alone.
2. Explainability by design — every agent output is accompanied by a reasoning trail and source citations.
3. Confidence-based escalation — when agent confidence drops below 0.8, the task automatically routes to a human.
4. Safety-first guardrails — HSE, HAZOP, and site safety decisions are never fully automated.
5. Full audit trail — every agent action is logged, replayable, and auditable.
6. Regulated data discipline — customer data, pricing, and IP are segregated with role-based access controls.
7. Continuous learning — every human override becomes a training signal for the next cycle.
8. Red-team cycles — periodic adversarial testing of agents against pricing errors, bad clauses, hallucinated specs and unsafe recommendations.`,
  starterPrompt: 'Generate a comprehensive AgentGuard governance report. Analyze approval gate SLA compliance across all stages, review the agent audit trail for anomalies, identify patterns in human overrides, and assess confidence escalation resolution rates.'
};

export function getStageBySlug(slug: string): Stage | undefined {
  return stages.find((s) => s.slug === slug);
}

export function getAllStageSlugs(): string[] {
  return stages.map((s) => s.slug);
}
