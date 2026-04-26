// ─── Types ───

export type Bucket = 'understand' | 'extract' | 'analyze' | 'compare' | 'govern' | 'visualize';

export interface Operation {
  id: string;
  label: string;
  icon: string;
  bucket: Bucket;
  description: string;
  supportedLevels: ('single' | 'multi')[];
  systemPromptTemplate: string;
  starterPrompts: string[];
}

export interface SampleFile {
  filename: string;
  label: string;
  description: string;
  path: string;
}

export interface Department {
  id: string;
  label: string;
  icon: string;
  description: string;
  typicalDocs: string;
  sampleFiles: SampleFile[];
}

export const BUCKETS: { id: Bucket; label: string; icon: string; color: string }[] = [
  { id: 'understand', label: 'A. Understand', icon: '📖', color: '#3B82F6' },
  { id: 'extract', label: 'B. Extract', icon: '🔍', color: '#8B5CF6' },
  { id: 'analyze', label: 'C. Analyze', icon: '📊', color: '#06B6D4' },
  { id: 'compare', label: 'D. Compare', icon: '⚖️', color: '#F59E0B' },
  { id: 'govern', label: 'E. Govern', icon: '🛡️', color: '#EF4444' },
  { id: 'visualize', label: 'F. Visualize', icon: '📈', color: '#10B981' },
];

// ─── 10 Operations ───

export const OPERATIONS: Operation[] = [
  // A. Understand
  {
    id: 'summarize',
    label: 'Summarization',
    icon: '📝',
    bucket: 'understand',
    description: 'Generate executive summaries, section-wise breakdowns, role-based summaries, key takeaways, action-item summaries, or risk/issue summaries from one or more documents.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Summarization.

Your task: Analyze the uploaded document(s) and produce a clear, structured summary.

Rules:
1. Start with an EXECUTIVE SUMMARY (3-5 sentences capturing the essence).
2. Follow with SECTION-WISE SUMMARY — break the document into logical sections and summarize each.
3. Extract KEY TAKEAWAYS as numbered bullet points.
4. List ACTION ITEMS with owners/deadlines if identifiable.
5. Highlight RISKS / ISSUES found in the document(s).
6. If multiple documents are provided, produce a CROSS-DOCUMENT SUMMARY showing common themes and divergences.
7. Use tables where they improve clarity.
8. Mark inferences with [INFERENCE] and data gaps with [DATA GAP].
9. Always cite which document and section your summary draws from.`,
    starterPrompts: [
      'Summarize this document in 10 key bullet points',
      'Create an executive summary for leadership review',
      'Extract all action items with deadlines and owners',
      'Summarize risks and issues found across all uploaded documents',
    ],
  },
  {
    id: 'qa',
    label: 'Question Answering',
    icon: '❓',
    bucket: 'understand',
    description: 'Ask natural-language questions against one or more uploaded documents. Get grounded answers with source citations and section references.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Question Answering.

Your task: Answer user questions accurately based ONLY on the uploaded document(s).

Rules:
1. Ground every answer in the actual document content — cite the source document and section/row.
2. If the answer is not found in the documents, say "Not found in the uploaded documents" clearly.
3. For multi-document Q&A, indicate which document(s) contain the answer.
4. If documents contain conflicting information, highlight the conflict.
5. Provide confidence level (High/Medium/Low) for each answer.
6. Use direct quotes from documents when helpful, formatted as blockquotes.
7. If the question is ambiguous, ask for clarification before answering.
8. Present tabular answers when the question involves multiple data points.`,
    starterPrompts: [
      'What are the key terms and conditions in this document?',
      'Which section defines the shutdown procedure?',
      'What are the penalties or liquidated damages mentioned?',
      'What PPE requirements are specified?',
    ],
  },

  // B. Extract
  {
    id: 'extract',
    label: 'Information Extraction',
    icon: '🔎',
    bucket: 'extract',
    description: 'Extract structured fields from unstructured files — names, dates, amounts, PO numbers, equipment IDs, contract clauses, compliance checkpoints, part numbers, and more.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Information Extraction.

Your task: Extract structured information from the uploaded document(s) into clean, organized output.

Rules:
1. Identify and extract: names, dates, amounts, locations, IDs (PO, invoice, equipment, asset tag, serial number).
2. Extract contract-specific fields: clauses, renewal dates, payment terms, obligations, penalties.
3. Extract compliance fields: checkpoints, standards referenced, approval status.
4. Extract incident/quality fields: incident type, root cause, corrective action, severity.
5. Extract technical fields: part numbers, specifications, tolerances, test results.
6. Present ALL extracted data in well-structured Markdown tables.
7. Flag fields that could not be extracted with [NOT FOUND].
8. If multiple documents are provided, consolidate into a unified extraction table with a "Source Document" column.`,
    starterPrompts: [
      'Extract all key dates, amounts, and party names from this document',
      'Pull out all PO numbers, vendor names, and payment terms',
      'Extract equipment IDs, serial numbers, and maintenance intervals',
      'List all contract clauses with their renewal and expiry dates',
    ],
  },
  {
    id: 'tabulate',
    label: 'Data Tabulation',
    icon: '📋',
    bucket: 'extract',
    description: 'Convert document content into structured tables, action trackers, registers, obligation matrices, and spreadsheet-ready rows.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Data Tabulation and Structuring.

Your task: Convert unstructured document content into clean, structured tabular outputs.

Rules:
1. Identify the best tabular structure for the content (columns, headers, data types).
2. Output types you can produce:
   - Invoice/PO line item tables
   - Meeting minutes → Action tracker (Action | Owner | Deadline | Status)
   - Incident reports → CAPA log (Incident | Root Cause | Corrective Action | Status | Due Date)
   - Inspection forms → Equipment register
   - Contracts → Obligation matrix (Obligation | Party | Due Date | Penalty | Status)
   - General content → Structured data rows
3. All tables must have clear headers and consistent formatting.
4. Include a "Source" column when consolidating from multiple documents.
5. Flag incomplete data with [INCOMPLETE] in the relevant cell.
6. Add a brief summary above each table explaining what it contains.`,
    starterPrompts: [
      'Convert this document into a structured action tracker with owners and deadlines',
      'Create an obligation matrix from this contract',
      'Tabulate all invoice line items into a spreadsheet-ready format',
      'Build a CAPA log from these incident reports',
    ],
  },

  // C. Analyze
  {
    id: 'insights',
    label: 'Insights & Patterns',
    icon: '💡',
    bucket: 'analyze',
    description: 'Go beyond summarization — identify trends, anomalies, recurring issues, root causes, delay drivers, safety hotspots, and complaint themes across documents.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Insights and Pattern Detection.

Your task: Analyze the uploaded document(s) deeply to identify patterns, trends, anomalies, and actionable insights.

Rules:
1. Look for RECURRING ISSUES — problems that appear multiple times across records.
2. Identify ROOT CAUSE PATTERNS — common underlying causes behind incidents or failures.
3. Detect TRENDS — increasing/decreasing patterns over time in any metric.
4. Flag ANOMALIES — data points or events that deviate significantly from norms.
5. Identify DELAY DRIVERS — factors repeatedly causing schedule/delivery/payment delays.
6. Map SAFETY HOTSPOTS — areas, equipment, or processes with concentrated safety issues.
7. Detect COMPLAINT THEMES — recurring customer/internal complaint categories.
8. Present insights in order of business impact (highest first).
9. For each insight, provide: Description, Evidence (citing specific records), Frequency, Impact Level (High/Medium/Low), Recommended Action.
10. Use tables and structured formatting throughout.`,
    starterPrompts: [
      'Identify recurring issues and their root causes across these documents',
      'What are the top delay drivers and how frequently do they occur?',
      'Detect anomalies or outliers in this data',
      'What are the most common complaint themes and their trends?',
    ],
  },
  {
    id: 'classify',
    label: 'Classification & Tagging',
    icon: '🏷️',
    bucket: 'analyze',
    description: 'Automatically categorize documents by department, type, sensitivity, workflow stage, risk level, or custom taxonomy.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Classification and Tagging.

Your task: Analyze the uploaded document(s) and assign structured classifications and tags.

Classification dimensions:
1. DEPARTMENT: HR / Finance / Legal / Operations / EHS / Procurement / Sales / Service / Engineering / IT
2. DOCUMENT TYPE: Invoice / Contract / Policy / Drawing / Audit Report / SOP / Manual / Memo / Report / Correspondence
3. SENSITIVITY: Confidential / Internal / Public
4. WORKFLOW STAGE: Draft / Under Review / Approved / Expired / Archived
5. RISK LEVEL: Low / Medium / High / Critical
6. PRIORITY: Urgent / High / Normal / Low
7. CUSTOM TAGS: Extract relevant keywords and topics as tags.

Rules:
1. For each document, produce a classification card with all 7 dimensions.
2. Provide confidence score (0.0-1.0) for each classification.
3. If multiple documents are uploaded, produce a classification summary table.
4. Suggest document routing based on classifications (which department/role should handle it).
5. Flag documents with high sensitivity or risk for special attention.`,
    starterPrompts: [
      'Classify this document by department, type, sensitivity, and risk level',
      'Tag all uploaded documents and suggest routing',
      'Identify which documents are high-risk or confidential',
      'Create a classification matrix for all uploaded files',
    ],
  },

  // D. Compare
  {
    id: 'compare',
    label: 'Document Comparison',
    icon: '🔄',
    bucket: 'compare',
    description: 'Compare two or more documents — highlight differences, missing clauses, added/removed sections, version changes, and risk impacts.',
    supportedLevels: ['multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Document Comparison.

Your task: Compare the uploaded documents and produce a detailed comparison analysis.

Rules:
1. Identify the nature of comparison (version comparison, vendor comparison, policy revision, etc.).
2. Produce a DELTA SUMMARY — what changed between documents.
3. List ADDED sections/clauses not present in the baseline.
4. List REMOVED sections/clauses present in baseline but missing in the updated version.
5. List MODIFIED sections with before/after comparison.
6. Highlight MISSING CLAUSES — standard items expected but absent.
7. Assess RISK IMPACT of each change (High/Medium/Low/None).
8. Present comparison in a structured table: Section | Document A | Document B | Change Type | Risk Impact.
9. Provide an overall comparison summary with key concerns.
10. If comparing vendor bids/proposals, include a side-by-side feature/price comparison.

IMPORTANT: This operation requires at least 2 documents. If only 1 is provided, ask for the second document.`,
    starterPrompts: [
      'Compare these two documents and highlight all differences',
      'What clauses are missing in the newer version?',
      'Create a side-by-side comparison of these vendor proposals',
      'Assess the risk impact of changes between these policy versions',
    ],
  },
  {
    id: 'search',
    label: 'Semantic Search',
    icon: '🔍',
    bucket: 'compare',
    description: 'Search semantically across uploaded documents — find relevant sections, clauses, procedures, or data points by meaning, not just keywords.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Semantic Search and Retrieval.

Your task: Search through the uploaded document(s) to find content matching the user's query by meaning and intent, not just keywords.

Rules:
1. Understand the INTENT behind the search query, not just literal keywords.
2. Return ALL relevant matches ranked by relevance (most relevant first).
3. For each match, provide: Document Name, Section/Row, Relevant Excerpt (quoted), Relevance Score (High/Medium/Low).
4. Present results in a structured table.
5. If the search yields related but not exact matches, include them as "Related Results".
6. Highlight connections between matches if they reference each other.
7. Provide a brief synthesis of what the search results collectively reveal.
8. If nothing relevant is found, say so clearly and suggest alternative search terms.`,
    starterPrompts: [
      'Find all sections related to safety shutdown procedures',
      'Show me all clauses mentioning liquidated damages or penalties',
      'Locate documents or sections about pressure vessel inspection',
      'Find all vendor agreements with upcoming expiry dates',
    ],
  },

  // E. Govern
  {
    id: 'compliance',
    label: 'Compliance Checks',
    icon: '✅',
    bucket: 'govern',
    description: 'Evaluate documents against predefined rules, standards, or checklists — detect missing clauses, signatures, approvals, statutory references, and compliance gaps.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Compliance and Policy Checks.

Your task: Evaluate the uploaded document(s) against applicable standards, rules, and best practices.

Check categories:
1. MANDATORY CLAUSES — Are all required clauses/sections present? (indemnity, force majeure, termination, warranty, IP, confidentiality, LD, payment terms)
2. STATUTORY REFERENCES — Are required regulatory/statutory references cited? (BIS, CPCB, OSHA, IBR, ASME, ISO)
3. APPROVALS & SIGNATURES — Are required sign-offs present? Flag missing approvals.
4. COMPLETENESS — Are all required annexures, attachments, supporting documents referenced and present?
5. EXPIRY & RENEWAL — Flag any expired certifications, contracts, or policies.
6. CONSISTENCY — Check for internal contradictions or inconsistencies.
7. RISK ITEMS — Clauses or conditions that create unacceptable risk exposure.

Rules:
1. For each check, report: Check Item | Status (Pass/Fail/Warning) | Finding | Recommendation.
2. Provide an overall COMPLIANCE SCORE (percentage of checks passed).
3. List CRITICAL GAPS that need immediate attention.
4. Suggest corrective actions for each failed check.`,
    starterPrompts: [
      'Check this contract for mandatory clauses and flag any missing ones',
      'Validate this document for regulatory compliance references',
      'Are all required approvals and signatures present?',
      'Identify compliance gaps and suggest corrective actions',
    ],
  },
  {
    id: 'workflow',
    label: 'Workflow Outputs',
    icon: '⚡',
    bucket: 'govern',
    description: 'Generate downstream artifacts from documents — draft emails, management briefs, FAQs, checklists, onboarding notes, vendor comparison notes, and more.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Workflow-Oriented Output Generation.

Your task: Based on the uploaded document(s), generate practical downstream artifacts that can be used directly in business workflows.

Artifact types you can generate:
1. MANAGEMENT BRIEF — Concise 1-page brief from detailed reports for leadership review.
2. DRAFT EMAIL — Professional email summarizing document findings for a specified recipient.
3. FAQ DOCUMENT — Frequently asked questions derived from policy/manual documents.
4. CHECKLIST — Step-by-step checklist extracted from SOPs, manuals, or procedures.
5. ONBOARDING NOTES — Simplified summary of HR/policy docs for new employees.
6. VENDOR COMPARISON NOTE — Structured comparison from bid/proposal documents.
7. ACTION TRACKER — Meeting minutes or report → structured action items with owners/dates.
8. RISK REGISTER — Extract and organize risks into a formal risk register.

Rules:
1. Ask the user which artifact type they want, or infer from context.
2. Generate the artifact in a ready-to-use format (markdown with proper structure).
3. Include metadata: Generated From (document name), Date, Purpose.
4. Keep language professional and suitable for business communication.
5. Flag any assumptions made during generation with [ASSUMPTION].`,
    starterPrompts: [
      'Create a management brief from this report for leadership review',
      'Draft an email summarizing the key findings of this document',
      'Generate a FAQ from this policy document',
      'Build a checklist from this SOP/procedure manual',
    ],
  },

  // F. Visualize
  {
    id: 'visualize',
    label: 'Visualize / Charts',
    icon: '📈',
    bucket: 'visualize',
    description: 'Generate charts, graphs, and visual representations from document data — bar charts, pie charts, trend lines, distribution plots, and more using Mermaid diagrams.',
    supportedLevels: ['single', 'multi'],
    systemPromptTemplate: `You are a Thermax Document Intelligence Agent specializing in Data Visualization.

Your task: Analyze the uploaded document(s) and produce visual chart representations using Mermaid diagram syntax.

Rules:
1. First analyze the data in the document(s) to identify what is visualizable — numeric data, categories, trends, distributions, comparisons.
2. Choose the MOST APPROPRIATE chart type for the data. ONLY use these Mermaid chart types:
   - **Pie chart**: For proportions, market share, budget breakdowns, category distributions. Format: pie title "Title" then "Label" : value
   - **Flowchart** (graph TD or graph LR): For process flows, decision trees, organizational structures, comparisons
   - **Gantt chart**: For timelines, project schedules, milestones
   - **Sequence diagram**: For process interactions and handoff flows
   IMPORTANT: Do NOT use xychart-beta or quadrantChart — they cause rendering errors. Do NOT use emojis or special Unicode characters (×, ², ³, °, ₹, →) inside Mermaid diagrams — use ONLY plain ASCII text. For comparisons and trends, use markdown tables with status indicators instead.
3. Output charts as fenced code blocks with the language tag "mermaid". Example:

\`\`\`mermaid
pie title "Budget Distribution"
    "Engineering" : 40
    "Marketing" : 25
    "Operations" : 20
    "HR" : 15
\`\`\`

\`\`\`mermaid
graph LR
    A["Revenue Q1: ₹120L"] --> B["Revenue Q2: ₹180L"]
    B --> C["Revenue Q3: ₹250L"]
    C --> D["Revenue Q4: ₹310L"]
\`\`\`

4. Always include a MARKDOWN TABLE with the underlying raw data below each chart for reference.
5. Add a brief interpretation/insight paragraph after each visualization.
6. If the user requests a specific chart type, use that type if supported.
7. You may produce MULTIPLE charts from a single dataset if different aspects benefit from different visualizations.
8. If the data is not suitable for visualization, explain why and suggest what additional data would be needed.
9. Use clear, descriptive titles in double quotes for all charts.
10. Keep pie chart labels short (under 20 characters) — abbreviate if needed.`,
    starterPrompts: [
      'Create charts from this data — choose the best visualization type',
      'Show a pie chart breakdown of the key categories in this data',
      'Generate a bar chart comparing the main metrics',
      'Visualize trends and patterns as line/bar charts',
    ],
  },
];

// ─── 7 Departments ───

export const DEPARTMENTS: Department[] = [
  {
    id: 'operations',
    label: 'Operations / Plant',
    icon: '🏭',
    description: 'SOPs, maintenance manuals, shift logs, breakdown reports, inspection reports, technical datasheets',
    typicalDocs: 'Standard operating procedures, maintenance manuals, shift handover logs, breakdown analysis reports, equipment inspection records, technical datasheets',
    sampleFiles: [
      { filename: 'boiler_maintenance_sop.txt', label: 'Boiler Maintenance SOP', description: 'Standard operating procedure for AFBC boiler preventive maintenance and inspection schedule', path: '/sample-data/doc-intelligence/operations/boiler_maintenance_sop.txt' },
      { filename: 'shutdown_startup_procedure.csv', label: 'Shutdown/Startup Procedures', description: 'Step-by-step procedures for plant shutdown and cold/hot startup across equipment types', path: '/sample-data/doc-intelligence/operations/shutdown_startup_procedure.csv' },
      { filename: 'breakdown_log.csv', label: 'Breakdown Log', description: '6-month breakdown records — equipment, failure mode, root cause, downtime hours, corrective action', path: '/sample-data/doc-intelligence/operations/breakdown_log.csv' },
      { filename: 'equipment_inspection.csv', label: 'Equipment Inspection Records', description: 'Periodic inspection findings — equipment ID, parameters checked, condition rating, next inspection due', path: '/sample-data/doc-intelligence/operations/equipment_inspection.csv' },
      { filename: 'shift_handover_log.csv', label: 'Shift Handover Log', description: 'Daily shift handover notes — shift, operator, equipment status, pending jobs, safety alerts', path: '/sample-data/doc-intelligence/operations/shift_handover_log.csv' },
      { filename: 'energy_consumption_report.csv', label: 'Energy Consumption Report', description: 'Monthly energy usage — boiler efficiency, fuel consumption, steam output, specific coal consumption', path: '/sample-data/doc-intelligence/operations/energy_consumption_report.csv' },
      { filename: 'spare_parts_inventory.csv', label: 'Spare Parts Inventory', description: 'Critical spare inventory — part number, description, stock qty, reorder level, lead time, last used', path: '/sample-data/doc-intelligence/operations/spare_parts_inventory.csv' },
      { filename: 'esp_cement_rfp.txt', label: 'ESP RFP Document', description: 'Full RFP for Electrostatic Precipitator at cement plant — technical specs, process parameters, performance guarantees, O&M requirements', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt' },
      { filename: 'ril_dmro_project_schedule.txt', label: 'RIL DM-RO Project Schedule', description: '904-task project schedule for 200 m3/hr DM-RO water treatment plant — engineering, procurement, erection, commissioning phases', path: '/sample-data/presales/ril_dmro_project_schedule.txt' },
      { filename: 'ril_remin_bom.txt', label: 'RIL Remin BOM (632 items)', description: 'Bill of Materials for RIL Remineralization project — 10 categories, 632 items, MOC details, lead times, work orders, for operations planning and maintenance reference', path: '/sample-data/presales/ril_remin_bom.txt' },
    ],
  },
  {
    id: 'procurement',
    label: 'Procurement / Supply Chain',
    icon: '📦',
    description: 'RFQs, quotations, purchase orders, vendor contracts, delivery reports',
    typicalDocs: 'Request for quotations, vendor proposals, purchase orders, supply agreements, goods receipt notes, delivery performance reports',
    sampleFiles: [
      { filename: 'vendor_quotations.csv', label: 'Vendor Quotations', description: 'Comparative quotations from multiple vendors — item, specs, pricing, lead time, terms', path: '/sample-data/doc-intelligence/procurement/vendor_quotations.csv' },
      { filename: 'purchase_orders.csv', label: 'Purchase Orders', description: 'Active POs — vendor, items, quantities, values, delivery dates, payment terms, status', path: '/sample-data/doc-intelligence/procurement/purchase_orders.csv' },
      { filename: 'delivery_performance.csv', label: 'Delivery Performance', description: 'Vendor delivery tracking — promised vs actual dates, delay reasons, penalty applicability', path: '/sample-data/doc-intelligence/procurement/delivery_performance.csv' },
      { filename: 'vendor_contract_terms.csv', label: 'Vendor Contract Terms', description: 'Key contract terms by vendor — warranty, LD, payment, force majeure, IP, termination clauses', path: '/sample-data/doc-intelligence/procurement/vendor_contract_terms.csv' },
      { filename: 'vendor_rating_scorecard.csv', label: 'Vendor Rating Scorecard', description: 'Quarterly vendor performance — quality, delivery, pricing, responsiveness, overall rating', path: '/sample-data/doc-intelligence/procurement/vendor_rating_scorecard.csv' },
      { filename: 'material_requisition.csv', label: 'Material Requisition', description: 'Internal material requests — dept, item, qty, urgency, project code, approval status', path: '/sample-data/doc-intelligence/procurement/material_requisition.csv' },
      { filename: 'goods_receipt_notes.csv', label: 'Goods Receipt Notes', description: 'GRN register — PO ref, vendor, items received, inspection result, discrepancy, warehouse location', path: '/sample-data/doc-intelligence/procurement/goods_receipt_notes.csv' },
      { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — Procurement View', description: 'ESP tender document — BOM extraction, approved sub-vendors list, material specs, delivery schedule, payment milestones for procurement analysis', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt' },
      { filename: 'ril_dmro_project_schedule.txt', label: 'RIL DM-RO Schedule — Procurement', description: 'Procurement timeline for 40+ vendor packages — enquiry, ordering, manufacturing, inspection, dispatch cycles with lead times', path: '/sample-data/presales/ril_dmro_project_schedule.txt' },
      { filename: 'ril_remin_bom.txt', label: 'RIL Remin BOM — Procurement', description: 'Full procurement BOM — 632 items with vendor packages, WO references, lead times (30-180 days), material specs, quantities for sourcing and MRP analysis', path: '/sample-data/presales/ril_remin_bom.txt' },
      { filename: 'ril_remin_bom.csv', label: 'RIL Remin BOM (Raw CSV)', description: 'Complete 632-row hierarchical BOM CSV — item codes, descriptions, UOM, quantities, extended quantities, supply types for tabulation and analysis', path: '/sample-data/presales/ril_remin_bom.csv' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: '💰',
    description: 'Invoices, expense statements, audit reports, budget files, tax/compliance docs',
    typicalDocs: 'Supplier invoices, expense reports, internal/external audit observations, annual budgets, tax compliance documents, bank guarantee records',
    sampleFiles: [
      { filename: 'invoice_register.csv', label: 'Invoice Register', description: 'Invoice log — vendor, PO ref, invoice amount, tax, due date, payment status, aging days', path: '/sample-data/doc-intelligence/finance/invoice_register.csv' },
      { filename: 'audit_observations.csv', label: 'Audit Observations', description: 'Internal audit findings — area, observation, severity, recommendation, management response, status', path: '/sample-data/doc-intelligence/finance/audit_observations.csv' },
      { filename: 'budget_vs_actual.csv', label: 'Budget vs Actual', description: 'Department-wise budget comparison — budgeted, actual, variance, YTD utilization percentage', path: '/sample-data/doc-intelligence/finance/budget_vs_actual.csv' },
      { filename: 'expense_claims.csv', label: 'Expense Claims', description: 'Employee expense reports — category, amount, project allocation, approval status, reimbursement date', path: '/sample-data/doc-intelligence/finance/expense_claims.csv' },
      { filename: 'bank_guarantee_tracker.csv', label: 'Bank Guarantee Tracker', description: 'Active BGs — customer, type, amount, validity period, bank name, claim status', path: '/sample-data/doc-intelligence/finance/bank_guarantee_tracker.csv' },
      { filename: 'project_cost_sheet.csv', label: 'Project Cost Sheet', description: 'Project-wise cost tracking — material, labour, overheads, margin, billed vs collected', path: '/sample-data/doc-intelligence/finance/project_cost_sheet.csv' },
      { filename: 'gst_reconciliation.csv', label: 'GST Reconciliation', description: 'Monthly GST reconciliation — GSTR-1 vs GSTR-3B, ITC claimed, mismatches, action items', path: '/sample-data/doc-intelligence/finance/gst_reconciliation.csv' },
    ],
  },
  {
    id: 'hr',
    label: 'HR',
    icon: '👥',
    description: 'Policies, offer letters, training manuals, appraisal docs, grievance records',
    typicalDocs: 'HR policies, employment offer letters, training materials and records, performance appraisals, employee grievance logs, leave and attendance records',
    sampleFiles: [
      { filename: 'leave_policy.txt', label: 'Leave Policy Document', description: 'Thermax leave policy — types, eligibility, approval process, carry-forward rules, special provisions', path: '/sample-data/doc-intelligence/hr/leave_policy.txt' },
      { filename: 'training_records.csv', label: 'Training Records', description: 'Employee training log — name, program, date, hours, certification, score, expiry, next refresher', path: '/sample-data/doc-intelligence/hr/training_records.csv' },
      { filename: 'appraisal_summary.csv', label: 'Appraisal Summary', description: 'Annual performance reviews — employee, rating, strengths, improvement areas, goals, promotion eligibility', path: '/sample-data/doc-intelligence/hr/appraisal_summary.csv' },
      { filename: 'grievance_log.csv', label: 'Grievance Log', description: 'Employee grievance records — category, description, filed date, assigned to, resolution, days to close', path: '/sample-data/doc-intelligence/hr/grievance_log.csv' },
      { filename: 'manpower_plan.csv', label: 'Manpower Plan', description: 'Dept-wise headcount plan — current, sanctioned, vacancies, hiring pipeline, cost per role', path: '/sample-data/doc-intelligence/hr/manpower_plan.csv' },
      { filename: 'employee_handbook_excerpt.txt', label: 'Employee Handbook', description: 'Key policies — code of conduct, travel policy, IT usage, POSH guidelines, exit process', path: '/sample-data/doc-intelligence/hr/employee_handbook_excerpt.txt' },
      { filename: 'attendance_summary.csv', label: 'Attendance Summary', description: 'Monthly attendance — employee, present, absent, late arrivals, overtime hours, leave balance', path: '/sample-data/doc-intelligence/hr/attendance_summary.csv' },
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: '⚖️',
    description: 'Contracts, NDAs, service agreements, litigation-related documents',
    typicalDocs: 'Customer/vendor contracts, non-disclosure agreements, service level agreements, litigation case files, intellectual property documents',
    sampleFiles: [
      { filename: 'nda_template.txt', label: 'NDA Template', description: 'Standard Thermax mutual NDA — parties, scope, obligations, exclusions, term, remedies, jurisdiction', path: '/sample-data/doc-intelligence/legal/nda_template.txt' },
      { filename: 'service_agreement_clauses.csv', label: 'Service Agreement Clauses', description: 'Clause-by-clause breakdown of active service agreements — clause type, text summary, risk level, notes', path: '/sample-data/doc-intelligence/legal/service_agreement_clauses.csv' },
      { filename: 'contract_obligation_matrix.csv', label: 'Contract Obligation Matrix', description: 'Obligations tracker — contract, obligation, responsible party, due date, penalty, completion status', path: '/sample-data/doc-intelligence/legal/contract_obligation_matrix.csv' },
      { filename: 'litigation_tracker.csv', label: 'Litigation Tracker', description: 'Active legal matters — case type, counterparty, amount at stake, status, next hearing, counsel assigned', path: '/sample-data/doc-intelligence/legal/litigation_tracker.csv' },
      { filename: 'ip_patent_register.csv', label: 'IP & Patent Register', description: 'Thermax IP portfolio — patent title, filing date, jurisdiction, status, renewal due, assignee', path: '/sample-data/doc-intelligence/legal/ip_patent_register.csv' },
      { filename: 'regulatory_license_tracker.csv', label: 'Regulatory Licenses', description: 'Statutory licenses & permits — type, authority, validity, renewal date, responsible officer', path: '/sample-data/doc-intelligence/legal/regulatory_license_tracker.csv' },
      { filename: 'vendor_agreement_summary.csv', label: 'Vendor Agreement Summary', description: 'Active vendor agreements — vendor, scope, term, value, key clauses, risk assessment', path: '/sample-data/doc-intelligence/legal/vendor_agreement_summary.csv' },
      { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — Legal Review', description: 'ESP tender for legal analysis — LD clauses, penalty provisions, BG requirements, warranty terms, IP/NDA, arbitration clause, force majeure', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt' },
    ],
  },
  {
    id: 'ehs',
    label: 'EHS / Quality',
    icon: '🛡️',
    description: 'Incident reports, audit reports, CAPA records, compliance manuals, safety procedures',
    typicalDocs: 'Safety incident reports, EHS audit findings, corrective/preventive action records, ISO/regulatory compliance documents, hazard assessments',
    sampleFiles: [
      { filename: 'incident_reports.csv', label: 'Incident Reports', description: 'Safety incidents — type, location, severity, root cause, injuries, corrective action, lessons learned', path: '/sample-data/doc-intelligence/ehs/incident_reports.csv' },
      { filename: 'capa_register.csv', label: 'CAPA Register', description: 'Corrective and preventive actions — NCR ref, finding, root cause, action, owner, target date, status', path: '/sample-data/doc-intelligence/ehs/capa_register.csv' },
      { filename: 'safety_audit.csv', label: 'Safety Audit Findings', description: 'EHS audit results — area, finding, category, risk rating, recommendation, responsible, due date', path: '/sample-data/doc-intelligence/ehs/safety_audit.csv' },
      { filename: 'compliance_checklist.csv', label: 'Compliance Checklist', description: 'Regulatory compliance tracker — regulation, requirement, applicable area, evidence, status, gap', path: '/sample-data/doc-intelligence/ehs/compliance_checklist.csv' },
      { filename: 'hazard_identification.csv', label: 'Hazard Identification (HIRA)', description: 'Hazard register — activity, hazard, risk rating, existing controls, residual risk, action plan', path: '/sample-data/doc-intelligence/ehs/hazard_identification.csv' },
      { filename: 'fire_safety_inspection.csv', label: 'Fire Safety Inspection', description: 'Fire safety audit — location, equipment type, condition, last tested, next due, non-conformances', path: '/sample-data/doc-intelligence/ehs/fire_safety_inspection.csv' },
      { filename: 'waste_management_log.csv', label: 'Waste Management Log', description: 'Waste disposal records — type, quantity, disposal method, vendor, manifest, compliance status', path: '/sample-data/doc-intelligence/ehs/waste_management_log.csv' },
      { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — EHS Review', description: 'ESP tender for EHS analysis — CPCB/GPCB emission norms, environmental compliance, CEMS requirements, NAAQS, safety standards', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt' },
    ],
  },
  {
    id: 'sales-service',
    label: 'Sales / Service',
    icon: '🤝',
    description: 'Customer complaints, service reports, proposals, AMC contracts, installation records',
    typicalDocs: 'Customer complaint logs, field service reports, commercial proposals, annual maintenance contracts, installation and commissioning records',
    sampleFiles: [
      { filename: 'customer_complaints.csv', label: 'Customer Complaints', description: 'Complaint register — customer, product, issue, severity, date, resolution, days to close, CSAT score', path: '/sample-data/doc-intelligence/sales-service/customer_complaints.csv' },
      { filename: 'service_reports.csv', label: 'Field Service Reports', description: 'Technician visit logs — customer, equipment, issue found, action taken, parts used, follow-up needed', path: '/sample-data/doc-intelligence/sales-service/service_reports.csv' },
      { filename: 'amc_contracts.csv', label: 'AMC Contracts', description: 'Active maintenance contracts — customer, scope, value, start/end dates, SLA terms, renewal status', path: '/sample-data/doc-intelligence/sales-service/amc_contracts.csv' },
      { filename: 'proposal_tracker.csv', label: 'Proposal Tracker', description: 'Sales proposals — customer, scope, value, submitted date, status, competitor, win probability', path: '/sample-data/doc-intelligence/sales-service/proposal_tracker.csv' },
      { filename: 'commissioning_checklist.csv', label: 'Commissioning Checklist', description: 'Equipment commissioning records — project, equipment, test parameters, result, sign-off status', path: '/sample-data/doc-intelligence/sales-service/commissioning_checklist.csv' },
      { filename: 'warranty_claims.csv', label: 'Warranty Claims', description: 'Warranty claim log — customer, product, issue, claim date, resolution, cost, coverage status', path: '/sample-data/doc-intelligence/sales-service/warranty_claims.csv' },
      { filename: 'customer_visit_schedule.csv', label: 'Customer Visit Schedule', description: 'Planned service visits — customer, location, purpose, engineer assigned, date, status', path: '/sample-data/doc-intelligence/sales-service/customer_visit_schedule.csv' },
      { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — Sales Review', description: 'ESP tender for sales analysis — evaluation criteria, vendor qualification, bid submission details, commercial terms, competitive positioning', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt' },
      { filename: 'ril_remin_bom.txt', label: 'RIL Remin BOM — Spares Reference', description: 'BOM with spares breakdown — valve seal kits, agitator/pump spares, media spares, instrumentation spares for service planning and warranty management', path: '/sample-data/presales/ril_remin_bom.txt' },
    ],
  },
];

export function getOperationsByBucket(bucket: Bucket): Operation[] {
  return OPERATIONS.filter(op => op.bucket === bucket);
}

export function getOperationById(id: string): Operation | undefined {
  return OPERATIONS.find(op => op.id === id);
}

export function getDepartmentById(id: string): Department | undefined {
  return DEPARTMENTS.find(d => d.id === id);
}
