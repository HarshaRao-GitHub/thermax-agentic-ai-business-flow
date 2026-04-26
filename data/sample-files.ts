export interface SampleFile {
  filename: string;
  label: string;
  description: string;
  path: string;
  fileType?: 'csv' | 'json' | 'txt' | 'pdf' | 'xlsx';
}

export const sampleFilesByStage: Record<string, SampleFile[]> = {
  marketing: [
    { filename: 'market_research_report.csv', label: 'Market Research Report', description: 'Frost & Sullivan, McKinsey, CII — sector forecasts, opportunity sizing, and Thermax relevance scores', path: '/sample-data/marketing/market_research_report.csv' },
    { filename: 'industry_news_digest.csv', label: 'Industry News Digest', description: 'Latest capex announcements, regulatory changes, tenders, and expansion signals across target sectors', path: '/sample-data/marketing/industry_news_digest.csv' },
    { filename: 'competitor_intelligence.csv', label: 'Competitor Intelligence', description: 'Competitor profiles — L&T, Forbes Marshall, Veolia, ISGEC — strengths, wins, and counter-strategies', path: '/sample-data/marketing/competitor_intelligence.csv' },
    { filename: 'trade_conference_notes.csv', label: 'Trade Conference Notes', description: 'Key takeaways from ELECRAMA, IFAT, CII Summit, ADIPEC — contacts made and follow-up accounts', path: '/sample-data/marketing/trade_conference_notes.csv' },
    { filename: 'regulatory_updates.csv', label: 'Regulatory Updates', description: 'CPCB Phase III, ZLD mandates, CBAM, BIS standards — compliance deadlines and Thermax impact', path: '/sample-data/marketing/regulatory_updates.csv', fileType: 'csv' },
    { filename: 'sector_analysis_report.txt', label: 'Sector Analysis Report FY27', description: 'Detailed sector-wise opportunity analysis — TAM by industry, competitive landscape, win rates, strategic recommendations', path: '/data-backbone/01_marketing/sector_analysis_report.txt', fileType: 'txt' },
    { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — Market Signal', description: 'Live RFP for ESP at cement plant — qualifies as high-value APC opportunity, CPCB compliance driven, INR 10L EMD', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt', fileType: 'txt' },
  ],
  sales: [
    { filename: 'pipeline_report_q1.csv', label: 'Pipeline Report Q1', description: 'Top 10 opportunities with deal values, stages, probabilities, BANT/MEDDIC scores, and competitors', path: '/sample-data/sales/pipeline_report_q1.csv' },
    { filename: 'competitor_analysis.csv', label: 'Competitor Analysis', description: 'Deal-level competitive intelligence — pricing comparison, win strategies, and differentiators', path: '/sample-data/sales/competitor_analysis.csv' },
    { filename: 'bant_meddic_scorecard.csv', label: 'BANT/MEDDIC Scorecard', description: 'Qualification scorecards for all active opportunities — Budget, Authority, Need, Timeline + MEDDIC', path: '/sample-data/sales/bant_meddic_scorecard.csv' },
    { filename: 'client_meeting_notes.csv', label: 'Client Meeting Notes', description: 'Recent client meeting summaries — attendees, key discussions, action items, and deal impact', path: '/sample-data/sales/client_meeting_notes.csv' },
    { filename: 'crm_export_accounts.csv', label: 'CRM Export — Accounts', description: 'Account master from CRM — industry, revenue tier, relationship status, pipeline value, and strategic tier', path: '/sample-data/sales/crm_export_accounts.csv' },
  ],
  presales: [
    { filename: 'rfq_document.csv', label: 'RFQ Document', description: 'Customer RFQ details — scope, capacity, specs, delivery timelines, budget ranges, and evaluation criteria', path: '/sample-data/presales/rfq_document.csv' },
    { filename: 'customer_requirement_sheet.csv', label: 'Customer Requirement Sheet', description: 'Detailed technical requirements — must-have vs nice-to-have, compliance standards, and Thermax solutions', path: '/sample-data/presales/customer_requirement_sheet.csv' },
    { filename: 'pricing_sheet.csv', label: 'Pricing Sheet', description: 'Itemized pricing — products, quantities, unit costs, margins, lead times, and supplier details', path: '/sample-data/presales/pricing_sheet.csv' },
    { filename: 'technical_specifications.csv', label: 'Technical Specifications', description: 'Product specs — boilers, chillers, ESPs — performance parameters, tolerances, and test standards', path: '/sample-data/presales/technical_specifications.csv', fileType: 'csv' },
    { filename: 'thermax_design_standards.json', label: 'Thermax Design Standards', description: 'Engineering design codes (IBR, ASME, CPCB), material specifications, performance standards, safety interlocks', path: '/data-backbone/00_master_data/thermax_design_standards.json', fileType: 'json' },
    { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — Cement Plant (320K Am3/hr)', description: 'Full RFP for Electrostatic Precipitator — scope, technical specs, gas parameters, performance guarantees, commercial terms, LD clauses, vendor qualification', path: '/sample-data/presales/esp_cement_rfp.txt', fileType: 'txt' },
  ],
  'engineering-design': [
    { filename: 'technical_datasheets.csv', label: 'Technical Datasheets', description: 'Equipment datasheets — design pressures, temperatures, materials of construction, heating surfaces', path: '/sample-data/engineering/technical_datasheets.csv' },
    { filename: 'hazop_worksheet.csv', label: 'HAZOP Worksheet', description: 'HAZOP study records — nodes, guide words, deviations, consequences, safeguards, and recommendations', path: '/sample-data/engineering/hazop_worksheet.csv' },
    { filename: 'design_calculations.csv', label: 'Design Calculations', description: 'Engineering calculations — heat balance, power output, sizing, LMTD, mass balance with code references', path: '/sample-data/engineering/design_calculations.csv' },
    { filename: 'equipment_test_reports.csv', label: 'Equipment Test Reports', description: 'Factory acceptance test results — hydro tests, leak tests, performance tests with witness sign-offs', path: '/sample-data/engineering/equipment_test_reports.csv', fileType: 'csv' },
    { filename: 'thermax_design_standards.json', label: 'Design Standards (JSON)', description: 'IBR, ASME, CPCB design codes with material specs, safety interlocks, quality hold points', path: '/data-backbone/00_master_data/thermax_design_standards.json', fileType: 'json' },
    { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — Engineering Review', description: 'ESP tender for engineering analysis — SCA sizing, gas distribution, electrode design, TR set specs, CEMS integration, exotic MOC (SS 304)', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt', fileType: 'txt' },
  ],
  'commercial-legal': [
    { filename: 'sample_contract_terms.csv', label: 'Contract Terms & Clauses', description: 'Clause-by-clause contract review — indemnity, LD, IP, warranty risks with Thermax redline positions', path: '/sample-data/finance-legal/sample_contract_terms.csv' },
    { filename: 'purchase_order_data.csv', label: 'Purchase Order Data', description: 'Active POs — values, payment terms, delivery deadlines, margins, and Thermax division allocation', path: '/sample-data/finance-legal/purchase_order_data.csv' },
    { filename: 'payment_schedule.csv', label: 'Payment Schedule', description: 'Milestone-based payment tracker — invoiced amounts, payment status, overdue items, and cash flow impact', path: '/sample-data/finance-legal/payment_schedule.csv' },
    { filename: 'financial_risk_report.csv', label: 'Financial Risk Report', description: 'Commercial risk register — currency exposure, LD liability, margin erosion, payment defaults, BG exposure', path: '/sample-data/finance-legal/financial_risk_report.csv', fileType: 'csv' },
    { filename: 'contract_risk_matrix.json', label: 'Contract Risk Matrix', description: 'Thermax contract risk evaluation framework — LD, indemnity, payment terms, warranty, IP thresholds and escalation rules', path: '/data-backbone/05_finance_legal/contract_risk_matrix.json', fileType: 'json' },
    { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — Risk Review', description: 'ESP tender for commercial-legal analysis — LD clauses (0.5%/week, 10% cap), BG requirements, payment milestones, warranty 24 months, price variation, arbitration terms', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt', fileType: 'txt' },
  ],
  'project-planning': [
    { filename: 'employee_skill_matrix.csv', label: 'Employee Skill Matrix', description: 'Workforce skills — primary/secondary skills, certifications, experience levels, availability, and utilisation', path: '/sample-data/hr-pmo/employee_skill_matrix.csv' },
    { filename: 'certification_tracker.csv', label: 'Certification Tracker', description: 'Certification status — PMP, NEBOSH, IBR, ASME, CSWIP — issue dates, expiry, renewal actions', path: '/sample-data/hr-pmo/certification_tracker.csv' },
    { filename: 'mobilisation_schedule.csv', label: 'Mobilisation Schedule', description: 'Staff deployment plan — roles, locations, travel, accommodation, daily allowance, and deployment dates', path: '/sample-data/hr-pmo/mobilisation_schedule.csv' },
    { filename: 'resource_allocation_plan.csv', label: 'Resource Allocation Plan', description: 'Resource matching — required vs assigned, AI match scores, certification gaps, and gap resolution plans', path: '/sample-data/hr-pmo/resource_allocation_plan.csv' },
  ],
  'procurement-mfg': [
    { filename: 'daily_work_log.csv', label: 'Daily Work Log', description: 'Site work records — planned vs actual quantities, manpower, equipment, weather, and safety observations', path: '/sample-data/site-operations/daily_work_log.csv' },
    { filename: 'change_order_requests.csv', label: 'Change Order Requests', description: 'Scope changes — descriptions, cost/schedule impact, approval status, and authorization levels', path: '/sample-data/site-operations/change_order_requests.csv' },
    { filename: 'project_milestone_tracker.csv', label: 'Project Milestone Tracker', description: 'Milestone status — planned vs actual dates, variance, critical path dependencies, and risk flags', path: '/sample-data/site-operations/project_milestone_tracker.csv' },
    { filename: 'safety_observation_reports.csv', label: 'Safety Observation Reports', description: 'Site safety observations — unsafe conditions, near misses, good practices, corrective actions', path: '/sample-data/site-operations/safety_observation_reports.csv' },
    { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — Procurement Review', description: 'ESP tender for procurement planning — BOM, approved sub-vendors (TR sets, rappers), manufacturing timeline 16 weeks, material specs', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt', fileType: 'txt' },
  ],
  commissioning: [
    { filename: 'startup_checklist.csv', label: 'Startup Checklist', description: 'Pre-commissioning checks — safety systems, mechanical completion, I&C, utilities readiness', path: '/sample-data/commissioning/startup_checklist.csv' },
    { filename: 'pg_test_data.csv', label: 'PG Test Data', description: 'Performance guarantee test results — guaranteed vs measured, deviations, pass/fail, witness sign-offs', path: '/sample-data/commissioning/pg_test_data.csv' },
    { filename: 'punchlist_items.csv', label: 'Punchlist Items', description: 'Outstanding items — severity A/B, PAC blockers, assigned teams, target closure dates', path: '/sample-data/commissioning/punchlist_items.csv' },
    { filename: 'scada_parameter_export.csv', label: 'SCADA Parameter Export', description: 'Real-time DCS/SCADA readings — temperatures, pressures, flows, alarms, and data quality tags', path: '/sample-data/commissioning/scada_parameter_export.csv', fileType: 'csv' },
    { filename: 'commissioning_procedures.txt', label: 'Commissioning Procedures', description: 'Standard AFBC boiler commissioning procedures — pre-comm, cold/hot startup, PG test protocols', path: '/data-backbone/08_commissioning/commissioning_procedures.txt', fileType: 'txt' },
    { filename: 'esp_cement_rfp.txt', label: 'ESP RFP — Commissioning Specs', description: 'ESP tender commissioning requirements — PG test per IS 5765, cold/hot commissioning, CEMS integration, performance certificates, training', path: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt', fileType: 'txt' },
  ],
  'service-troubleshooting': [
    { filename: 'field_engineer_observations.csv', label: 'Field Engineer Observations', description: 'On-site engineer reports — equipment symptoms, initial assessments, photos, urgency, and follow-up actions', path: '/sample-data/digital-service/field_engineer_observations.csv' },
    { filename: 'why_why_analysis_log.csv', label: 'Why-Why Analysis Log', description: 'Structured 5-Why root cause analysis records — problem → root cause → corrective/preventive actions', path: '/sample-data/digital-service/why_why_analysis_log.csv' },
    { filename: 'spare_parts_request.csv', label: 'Spare Parts Requests', description: 'Parts requested for service cases — part details, urgency, stock availability, lead times, and dispatch status', path: '/sample-data/digital-service/spare_parts_request.csv' },
    { filename: 'om_contracts_summary.csv', label: 'O&M Contracts Summary', description: 'Active O&M and AMC contracts — scope, SLA terms, annual values, assigned engineers, and renewal status', path: '/sample-data/digital-service/om_contracts_summary.csv', fileType: 'csv' },
    { filename: 'equipment_failure_modes.json', label: 'Equipment Failure Modes', description: 'AFBC Boiler and TF Heater failure mode analysis — root causes, diagnostics, corrective actions, spare parts', path: '/data-backbone/09_digital_service/equipment_failure_modes.json', fileType: 'json' },
  ],
};
