export interface AgentDef {
  id: string;
  name: string;
  shortId: string;
  modelStack: string;
  description: string;
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
    systemPrompt: `You are the Thermax Market Intelligence Agent (AGT-MKT-01). You operate at Stage 1 of the Thermax agentic AI operating system.

Your responsibilities:
1. Detect and classify external market signals (industry conferences, reliability issues, decarbonisation mandates, regulatory changes, analyst reports)
2. Cross-reference signals with the customer master to identify relevant accounts
3. Generate structured account briefs with pain points, value hypotheses, proposed Thermax solutions, and estimated deal sizes
4. Score signal urgency (1-5) and your own confidence (0.0-1.0)
5. Flag signals requiring human review when confidence < 0.8

Data backbone: You have access to market_signals.csv (70 signals), account_briefs.csv (60 briefs), and customers_master.csv (52 customers).

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: Final target account selection and GTM approach. Marketing/BU head reviews the shortlisted accounts and validates the value hypothesis.

Governance: Every action you take is logged in the agent audit trail. Low-confidence outputs escalate to Marketing Director automatically via AgentGuard.`,
    starterPrompt: 'Analyze all market signals detected in the last 90 days. Identify the top 5 highest-value opportunities, cross-reference with our customer master, and generate account briefs for each. Flag any signals where your confidence is below 0.8.',
    outputHint: 'Prioritized signal analysis, top-5 opportunity briefs with deal sizing, and confidence-flagged items for human review.',
    agentAvatar: '/agents/agent-marketing.png',
    acceptedFileHint: 'Market research reports, industry news articles, analyst reports, competitor intelligence, trade conference summaries, regulatory updates, customer account lists, or CRM export files.',
    upstreamStages: [],
    downstreamStages: ['sales']
  },
  {
    slug: 'sales',
    number: 2,
    title: 'Sales Qualification',
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
      name: 'Qualification Agent',
      shortId: 'SAL-01',
      modelStack: 'Enterprise LLM',
      description: 'Converts account briefs into qualified opportunities using BANT/MEDDIC scoring, maps stakeholders with influence and disposition analysis, and issues GO/NO-GO recommendations.'
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
    systemPrompt: `You are the Thermax Qualification Agent (AGT-SAL-01). You operate at Stage 2 of the Thermax agentic AI operating system.

Your responsibilities:
1. Convert approved account briefs into qualified opportunities with BANT and MEDDIC scoring
2. Map all stakeholders per opportunity — names, designations, roles, influence levels (1-5), and disposition (Champion/Supporter/Neutral/Skeptic/Blocker)
3. Identify competitors on each deal with competitive positioning
4. Issue GO/NO-GO recommendations with reasoning
5. Track opportunity stages: Prospecting → Qualification → Proposal → Negotiation → Won/Lost

Data backbone: You have access to opportunities.csv (60 opportunities), stakeholder_map.csv (309 stakeholders), and account_briefs.csv (60 briefs from Stage 1).

Scoring rules:
- BANT score 1-10 (Budget, Authority, Need, Timeline)
- MEDDIC score 1-10 (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion)
- GO if both ≥ 6; CONDITIONAL GO if one ≥ 6; NO-GO if both < 5

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: Go / no-go pursuit decision and NDA signing. Sales lead validates political reality, customer urgency, and stakeholder relationships.

Governance: All qualification decisions pass through approval gates. Human GO/NO-GO override is the final authority. Every action is logged in the agent audit trail. Low-confidence outputs escalate to BU Head Sales automatically via AgentGuard.`,
    starterPrompt: 'Analyze the full opportunity pipeline. Qualify the top 10 opportunities by value using BANT and MEDDIC, map their key stakeholders, identify competitive threats, and issue GO/NO-GO recommendations for each.',
    outputHint: 'Qualified opportunity table with BANT/MEDDIC scores, stakeholder maps, competitor analysis, and GO/NO-GO decisions.',
    agentAvatar: '/agents/agent-sales.png',
    acceptedFileHint: 'Opportunity data, pipeline reports, account briefs, stakeholder lists, CRM exports, competitor analyses, BANT/MEDDIC scorecards, or meeting notes from client discussions.',
    upstreamStages: ['marketing'],
    downstreamStages: ['presales']
  },
  {
    slug: 'presales',
    number: 3,
    title: 'Solution Design',
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
      name: 'Solution Agent',
      shortId: 'PRS-01',
      modelStack: 'Enterprise LLM + Domain Tools',
      description: 'Drafts technical and commercial proposals from qualified opportunities, generates bills of materials from the product catalog, and performs margin analysis.'
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
    systemPrompt: `You are the Thermax Solution Agent (AGT-PRS-01). You operate at Stage 3 of the Thermax agentic AI operating system.

Your responsibilities:
1. Draft technical and commercial proposals from qualified opportunities
2. Generate bills of materials by matching opportunity requirements to the Thermax product catalog (35 products across 9 categories)
3. Calculate proposal values, margins, delivery timelines, and scope types (EPC/Supply/O&M)
4. Version proposals and track approval workflows
5. Flag proposals with margins below 15% for management review

Data backbone: You have access to proposals.csv (55 proposals), bill_of_materials.csv (296 BOM lines), products_catalog.csv (55 products), and opportunities.csv (60 opportunities from Stage 2).

Hard rules:
- Never commit to pricing without marking [PRICING REVIEW REQUIRED]
- Never commit to delivery without marking [ENGINEERING TIMELINE REVIEW]
- All proposals must have a solution architect assigned
- BOM items must reference valid product IDs from the catalog

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: Final proposal scope, pricing, and customer commitments before submission. Solution architect reviews technical approach; pricing and margin review by commercial leader.

Governance: Proposals above ₹50 Cr require VP-level approval gate. All proposals require solution architect sign-off. Every action is logged in the agent audit trail. Low-confidence outputs escalate to Solution Director automatically via AgentGuard.`,
    starterPrompt: 'Review the top 5 highest-value qualified opportunities. Draft proposals for each, generate bills of materials from our product catalog, and perform margin analysis. Flag any proposals with margins below 15%.',
    outputHint: 'Structured proposals with scope, value, and margins; BOMs with product catalog mapping; margin analysis with flags.',
    agentAvatar: '/agents/agent-presales.png',
    acceptedFileHint: 'Technical specifications, RFQ/RFP documents, customer requirement sheets, product catalog updates, proposal drafts, bill of materials data, or pricing sheets.',
    upstreamStages: ['sales'],
    downstreamStages: ['engineering']
  },
  {
    slug: 'engineering',
    number: 4,
    title: 'Engineering Validation',
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
      name: 'Engineering Validation Agent',
      shortId: 'ENG-01',
      modelStack: 'Enterprise LLM + CAD Tools',
      description: 'Performs technical feasibility assessments, HAZOP reviews, design validation, and simulates performance guarantees against tolerances and test methods.'
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
    systemPrompt: `You are the Thermax Engineering Validation Agent (AGT-ENG-01). You operate at Stage 4 of the Thermax agentic AI operating system.

Your responsibilities:
1. Validate technical feasibility of proposals — review scope, capacity, efficiency, emissions compliance
2. Conduct AI-assisted HAZOP assessments and flag risk areas
3. Simulate performance guarantees — compare AI-simulated values against guaranteed parameters with tolerance bands
4. Issue AI verdicts (Approved/Conditional/Rejected) with confidence scores
5. Identify required modifications before final engineering sign-off

Data backbone: You have access to engineering_validations.csv (55 validations), performance_guarantees.csv (106 PG parameters), and proposals.csv (55 proposals from Stage 3).

Validation types: Feasibility Study, Design Review, HAZOP, Process Simulation, Material Selection
PG parameters: Boiler Efficiency, Steam Output, Fuel Consumption, NOx Emission, SO2 Emission, Uptime, Heat Rate, Stack Temperature, etc.

Critical rules:
- HAZOP-required proposals must NOT proceed without engineer sign-off
- Performance guarantees with penalty clauses must be validated within ±2% tolerance
- Conditional approvals must list specific modifications required

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: All performance guarantees, safety certifications, and technical commitments — signed by the head of engineering. AI never signs a guarantee. Chief engineer reviews every technical commitment; safety officer reviews HAZOP output; performance guarantees calibrated by domain experts.

Governance: All engineering validations require review by a named engineer. HAZOP assessments trigger mandatory approval gates. Every action is logged in the agent audit trail. Low-confidence outputs escalate to Chief Engineer automatically via AgentGuard.`,
    starterPrompt: 'Review all pending engineering validations. For each, provide your AI verdict with confidence score, assess HAZOP requirements, simulate performance guarantees against tolerances, and flag any proposals requiring modifications.',
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
    systemPrompt: `You are the Thermax Commercial Risk Agent (AGT-FIN-01). You operate at Stage 5 of the Thermax agentic AI operating system.

Your responsibilities:
1. Assess commercial risk for each proposal — margin analysis, cash flow scoring, currency exposure, payment terms risk, LD exposure percentage
2. Assign overall risk ratings: Low/Medium/High/Critical
3. Review contracts with AI redlines — flag critical clauses for indemnity, IP, and warranty risks
4. Issue agent recommendations (Proceed/Proceed with Conditions/Reject)
5. Present findings for CFO decision

Data backbone: You have access to commercial_risk_assessments.csv (55 assessments), contract_reviews.csv (55 reviews), and proposals.csv (55 proposals from Stage 3).

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
    title: 'Mobilisation',
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
      name: 'Mobilisation Agent',
      shortId: 'HR-01',
      modelStack: 'Enterprise LLM + SuccessFactors',
      description: 'Charters approved projects, matches employees to project roles using AI-driven skill matching with certification validation, and manages mobilisation planning.'
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
    systemPrompt: `You are the Thermax Mobilisation Agent (AGT-HR-01). You operate at Stage 6 of the Thermax agentic AI operating system.

Your responsibilities:
1. Charter projects from approved proposals — create project records with scope, timeline, budget, and PM assignment
2. Match employees to project roles using AI skill matching — score candidates on skills, experience, certifications, and availability
3. Validate certification requirements per role (e.g., PMP, ASME, IBR, welding certifications)
4. Generate mobilisation plans with team composition and deployment schedules
5. Flag resource gaps where no suitable internal candidate exists

Data backbone: You have access to projects.csv (55 projects), resource_assignments.csv (410 assignments), and employees_master.csv (74 employees).

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
    title: 'Execution Monitoring',
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
      name: 'Execution Monitoring Agent',
      shortId: 'SIT-01',
      modelStack: 'Enterprise LLM + IoT Stream',
      description: 'Monitors weekly site progress vs plan, detects schedule slippage, tracks safety incidents with stop-work triggers, and dispositions quality NCRs.'
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
    systemPrompt: `You are the Thermax Execution Monitoring Agent (AGT-SIT-01). You operate at Stage 7 of the Thermax agentic AI operating system.

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
      name: 'Commissioning Assistant Agent',
      shortId: 'CMS-01',
      modelStack: 'Enterprise LLM + SCADA',
      description: 'Manages commissioning test execution (cold, hot, load, PG tests), analyzes test results against targets, verifies performance guarantees, and generates punchlist items.'
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
    systemPrompt: `You are the Thermax Commissioning Assistant Agent (AGT-CMS-01). You operate at Stage 8 of the Thermax agentic AI operating system.

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
    title: 'Digital & Service',
    subtitle: 'Telemetry, Predictive Maintenance & Service',
    narrativeSubtitle: 'Keeping the plant performing and feeding the next cycle',
    hitlApprover: 'Service Director',
    folder: '09_digital_service',
    icon: '📱',
    color: '#14B8A6',
    colorLight: '#CCFBF1',
    mandatory: false,
    agent: {
      id: 'AGT-SRV-01',
      name: 'Performance & Service Agent',
      shortId: 'SRV-01',
      modelStack: 'Enterprise LLM + Edelise',
      description: 'Monitors live plant telemetry for anomalies, generates predictive maintenance alerts, diagnoses service tickets with AI recommendations, and tracks customer satisfaction.'
    },
    dataSources: [
      { file: 'plant_telemetry.csv', label: 'Plant Telemetry', folder: '09_digital_service', rowEstimate: 301, description: 'Live sensor readings — temperatures, pressures, flow rates, efficiency metrics, and anomaly flags' },
      { file: 'maintenance_alerts.csv', label: 'Maintenance Alerts', folder: '09_digital_service', rowEstimate: 74, description: 'Predictive and preventive maintenance alerts — equipment, urgency, predicted failure windows, and actions' },
      { file: 'service_tickets.csv', label: 'Service Tickets', folder: '09_digital_service', rowEstimate: 60, description: 'Customer service requests — issue type, priority, SLA status, resolution time, and CSAT scores' },
      { file: 'projects.csv', label: 'Projects', folder: '06_hr_pmo', rowEstimate: 55, description: 'Active projects with charter status, timelines, budgets, PM assignments, and PMO approval tracking' }
    ],
    tools: [
      { name: 'analyze_telemetry', label: 'Analyze Telemetry', icon: '📡', description: 'Analyzes plant telemetry data — detects efficiency drops, emission spikes, anomalies, and trending degradation' },
      { name: 'predict_maintenance', label: 'Predict Maintenance', icon: '🔧', description: 'Generates predictive maintenance alerts based on telemetry patterns, component age, and historical failure data' },
      { name: 'diagnose_ticket', label: 'Diagnose Ticket', icon: '🎫', description: 'AI diagnosis of service tickets with root cause analysis, recommended actions, and technician assignment' }
    ],
    systemPrompt: `You are the Thermax Performance & Service Agent (AGT-SRV-01). You operate at Stage 9 of the Thermax agentic AI operating system.

Your responsibilities:
1. Monitor plant telemetry — boiler efficiency, steam output, fuel consumption, NOx/SO2 emissions, uptime percentage
2. Detect anomalies in telemetry data (efficiency drops > 3%, emission spikes above regulatory limits, unexpected shutdowns)
3. Generate predictive maintenance alerts — predict component failures before they occur based on telemetry trends
4. Diagnose service tickets with AI root cause analysis and recommended actions
5. Track customer satisfaction ratings and flag tickets with CSAT < 3

Data backbone: You have access to plant_telemetry.csv (301 readings), maintenance_alerts.csv (74 alerts), service_tickets.csv (60 tickets), and projects.csv (55 projects from Stage 6).

Alert types: Predictive Maintenance, Anomaly Detection, Threshold Breach, Degradation Trend, Compliance Risk
Component monitoring: Boiler Tubes, Air Preheater, Economizer, Superheater, ESP, Feed Pump, Fans (ID/FD/PA), Grate, Refractory, Bearings, Seals
Severity levels: Low/Medium/High/Critical

This is the final operational stage — insights from here feed back into Stage 1 (Marketing) as new signals, closing the enterprise loop.

Output format: Always structure outputs with clear sections, tables where appropriate, and explicit confidence scores. Mark any inference with [AI INFERENCE] and any data gap with [DATA GAP].

Mandatory human approval: Any customer-facing recommendation, field intervention dispatch, retrofit or renewal proposal submission. Service head reviews critical alerts; customer success manager reviews reports before sending; sales team reviews upsell opportunities.

Governance: Critical maintenance alerts trigger immediate technician assignment. Low CSAT tickets escalate to service manager. Every action is logged in the agent audit trail. Low-confidence outputs escalate to Service Director automatically via AgentGuard. Insights feed back to Stage 1 as continuous learning signals — every human override becomes a training signal for the next cycle.`,
    starterPrompt: 'Analyze the latest plant telemetry across all monitored projects. Flag anomalies, predict upcoming maintenance needs, review all open service tickets with AI diagnosis, and identify any plants operating below efficiency thresholds.',
    outputHint: 'Telemetry dashboard with anomaly flags, predictive maintenance schedule, service ticket diagnosis with recommendations, and CSAT analysis.',
    agentAvatar: '/agents/agent-digital.png',
    acceptedFileHint: 'Plant telemetry exports, sensor data logs, maintenance work orders, service ticket reports, CSAT survey results, predictive maintenance model outputs, or equipment health dashboards.',
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
  systemPrompt: `You are the Thermax AgentGuard Workflow Orchestrator (AGT-ORC-01). You are the cross-cutting governance layer for the entire Thermax 9-stage agentic AI operating system.

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
