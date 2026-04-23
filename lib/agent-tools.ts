import type Anthropic from '@anthropic-ai/sdk';
import { loadCsv } from './csv-loader';

export type ToolName =
  | 'scan_market_signals' | 'generate_account_brief' | 'assess_signal_urgency'
  | 'qualify_opportunity' | 'map_stakeholders' | 'analyze_pipeline'
  | 'draft_proposal' | 'generate_bom' | 'analyze_margins'
  | 'validate_engineering' | 'simulate_performance' | 'assess_hazop'
  | 'assess_commercial_risk' | 'review_contract' | 'evaluate_payment_terms'
  | 'charter_project' | 'match_resources' | 'plan_mobilisation'
  | 'analyze_progress' | 'detect_safety_risks' | 'disposition_ncr'
  | 'analyze_test_results' | 'verify_performance' | 'generate_punchlist'
  | 'lookup_sop' | 'diagnose_service_case' | 'check_spare_parts'
  | 'analyze_approval_gates' | 'audit_agent_actions' | 'review_overrides' | 'manage_escalations';

const marketingTools: Anthropic.Messages.Tool[] = [
  {
    name: 'scan_market_signals',
    description: 'Parses all market signals from the data backbone, classifies by type (Industry Conference, Reliability Issue, Decarbonisation Mandate, Regulatory Change, Analyst Report), scores urgency, and cross-references with customer master data. Returns structured signal analysis with confidence scores.',
    input_schema: {
      type: 'object' as const,
      properties: {
        time_window_days: { type: 'number', description: 'Days of signals to scan (default: 90)' },
        min_urgency: { type: 'number', description: 'Minimum urgency score filter 1-5 (default: 1)' },
        industry_filter: { type: 'string', description: 'Optional industry filter' }
      },
      required: []
    }
  },
  {
    name: 'generate_account_brief',
    description: 'Creates structured account briefs from detected signals — includes pain points, value hypothesis, proposed Thermax solutions, estimated deal size, and confidence scoring. Cross-references customer master for account tier and relationship history.',
    input_schema: {
      type: 'object' as const,
      properties: {
        signal_ids: { type: 'string', description: 'Comma-separated signal IDs to generate briefs for' },
        top_n: { type: 'number', description: 'Generate briefs for top N signals by urgency (default: 5)' }
      },
      required: []
    }
  },
  {
    name: 'assess_signal_urgency',
    description: 'Re-scores and prioritizes signals by urgency, estimated value, strategic fit, and account tier. Returns a ranked priority matrix.',
    input_schema: {
      type: 'object' as const,
      properties: {
        recalculate: { type: 'boolean', description: 'Recalculate urgency scores with latest data (default: true)' }
      },
      required: []
    }
  }
];

const salesTools: Anthropic.Messages.Tool[] = [
  {
    name: 'qualify_opportunity',
    description: 'Applies BANT (Budget, Authority, Need, Timeline) and MEDDIC (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion) scoring to opportunities. Issues GO/NO-GO recommendations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        opportunity_ids: { type: 'string', description: 'Comma-separated opportunity IDs (or "all" for full pipeline)' },
        min_value_cr: { type: 'number', description: 'Minimum deal value filter in Cr (default: 0)' }
      },
      required: []
    }
  },
  {
    name: 'map_stakeholders',
    description: 'Maps stakeholder hierarchy per opportunity with influence levels (1-5), disposition (Champion/Supporter/Neutral/Skeptic/Blocker), and engagement strategy recommendations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        opportunity_id: { type: 'string', description: 'Specific opportunity ID for stakeholder mapping' }
      },
      required: ['opportunity_id']
    }
  },
  {
    name: 'analyze_pipeline',
    description: 'Analyzes the full opportunity pipeline — aggregates by stage, value, probability, expected close dates. Computes weighted pipeline value and conversion forecasts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        group_by: { type: 'string', description: 'Group analysis by: stage, industry, sales_owner, quarter (default: stage)' }
      },
      required: []
    }
  }
];

const presalesTools: Anthropic.Messages.Tool[] = [
  {
    name: 'draft_proposal',
    description: 'Creates structured proposal from qualified opportunity — scope type, solution architecture, delivery timeline, value, and margin. Matches opportunity requirements to Thermax product portfolio.',
    input_schema: {
      type: 'object' as const,
      properties: {
        opportunity_id: { type: 'string', description: 'Opportunity to generate proposal for' },
        scope_type: { type: 'string', description: 'EPC/Supply Only/O&M (default: infer from opportunity)' }
      },
      required: ['opportunity_id']
    }
  },
  {
    name: 'generate_bom',
    description: 'Builds bill of materials by matching proposal requirements to the Thermax product catalog. Calculates quantities, unit prices, total prices, lead times, and margins.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proposal_id: { type: 'string', description: 'Proposal to generate BOM for' }
      },
      required: ['proposal_id']
    }
  },
  {
    name: 'analyze_margins',
    description: 'Performs margin analysis across proposals — flags low-margin deals, compares with historical averages, and identifies margin improvement opportunities.',
    input_schema: {
      type: 'object' as const,
      properties: {
        threshold_pct: { type: 'number', description: 'Margin threshold to flag (default: 15)' }
      },
      required: []
    }
  }
];

const engineeringTools: Anthropic.Messages.Tool[] = [
  {
    name: 'validate_engineering',
    description: 'Performs technical feasibility assessment, design review, and HAZOP evaluation. Issues AI verdict (Approved/Conditional/Rejected) with confidence score and risk flags.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proposal_id: { type: 'string', description: 'Proposal to validate (or "all" for pending validations)' }
      },
      required: []
    }
  },
  {
    name: 'simulate_performance',
    description: 'Simulates performance guarantee parameters — compares AI-simulated values against guaranteed values with tolerance bands. Flags deviations exceeding tolerance.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proposal_id: { type: 'string', description: 'Proposal to simulate PGs for' }
      },
      required: ['proposal_id']
    }
  },
  {
    name: 'assess_hazop',
    description: 'Identifies HAZOP requirements, risk flags, and modifications needed. References engineering validations with hazop_required field.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proposal_id: { type: 'string', description: 'Proposal to assess HAZOP for' }
      },
      required: ['proposal_id']
    }
  }
];

const financeLegalTools: Anthropic.Messages.Tool[] = [
  {
    name: 'assess_commercial_risk',
    description: 'Evaluates commercial risk dimensions — margin %, cash flow score (1-10), currency exposure, payment terms risk, LD exposure %, overall risk rating (Low/Medium/High/Critical). Issues agent recommendation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proposal_id: { type: 'string', description: 'Proposal to assess (or "all" for pending assessments)' }
      },
      required: []
    }
  },
  {
    name: 'review_contract',
    description: 'AI-powered contract review — counts redlines, flags critical clauses, assesses indemnity, IP, and warranty risks. Recommends approval status and negotiation strategy.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proposal_id: { type: 'string', description: 'Proposal whose contract to review' }
      },
      required: ['proposal_id']
    }
  },
  {
    name: 'evaluate_payment_terms',
    description: 'Scores payment terms risk, analyzes cash flow impact, and recommends optimal payment structures.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proposal_id: { type: 'string', description: 'Proposal to evaluate payment terms for' }
      },
      required: ['proposal_id']
    }
  }
];

const hrPmoTools: Anthropic.Messages.Tool[] = [
  {
    name: 'charter_project',
    description: 'Creates project charter from approved proposal — project name, site location, contract value, timeline, PM assignment, PMO approval status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proposal_id: { type: 'string', description: 'Proposal to charter as project' }
      },
      required: ['proposal_id']
    }
  },
  {
    name: 'match_resources',
    description: 'AI-driven resource matching — scores employees against project role requirements on skills, experience, certifications, and availability. Returns ranked candidate lists with match scores.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project to match resources for' },
        role_filter: { type: 'string', description: 'Optional role filter' }
      },
      required: ['project_id']
    }
  },
  {
    name: 'plan_mobilisation',
    description: 'Generates mobilisation plan with team composition, deployment schedule, certification gaps, and resource conflict analysis.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project to plan mobilisation for' }
      },
      required: ['project_id']
    }
  }
];

const siteOpsTools: Anthropic.Messages.Tool[] = [
  {
    name: 'analyze_progress',
    description: 'Analyzes weekly site progress vs plan across all active projects. Computes schedule variance, flags slippage alerts (AMBER > -5%, RED > -10%), and identifies escalation requirements.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Specific project (or "all" for portfolio view)' },
        weeks: { type: 'number', description: 'Number of recent weeks to analyze (default: 4)' }
      },
      required: []
    }
  },
  {
    name: 'detect_safety_risks',
    description: 'Analyzes safety incidents — classifies by type and severity, identifies cross-project patterns, recommends stop-work triggers for critical incidents.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Specific project (or "all")' },
        severity_filter: { type: 'string', description: 'Severity filter: Low/Medium/High/Critical' }
      },
      required: []
    }
  },
  {
    name: 'disposition_ncr',
    description: 'AI disposition of quality non-conformance reports — assesses severity, recommends rework vs accept vs reject, compares AI disposition with human disposition for learning.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Specific project (or "all")' },
        status_filter: { type: 'string', description: 'Status filter: Open/Under Review/Closed' }
      },
      required: []
    }
  }
];

const commissioningTools: Anthropic.Messages.Tool[] = [
  {
    name: 'analyze_test_results',
    description: 'Analyzes commissioning test results — compares actual vs target values, computes deviation percentages, classifies Pass/Conditional/Fail across test types.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project to analyze tests for (or "all")' },
        test_type: { type: 'string', description: 'Filter by test type (Cold/Hot/Load/PG/Reliability/Safety/Environmental)' }
      },
      required: []
    }
  },
  {
    name: 'verify_performance',
    description: 'Cross-references commissioning test results against performance guarantee parameters to verify contractual compliance. Flags PG shortfalls with penalty calculations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project to verify PGs for' }
      },
      required: ['project_id']
    }
  },
  {
    name: 'generate_punchlist',
    description: 'Generates punchlist of items requiring attention before PAC issuance — failed tests, conditional results, outstanding NCRs, and PG shortfalls.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project to generate punchlist for' }
      },
      required: ['project_id']
    }
  }
];

const digitalServiceTools: Anthropic.Messages.Tool[] = [
  {
    name: 'lookup_sop',
    description: 'Searches the SOP library by equipment type, issue category, or keyword. Returns relevant standard operating procedures with step-by-step instructions, safety precautions, and required tools.',
    input_schema: {
      type: 'object' as const,
      properties: {
        equipment_type: { type: 'string', description: 'Equipment type: AFBC Boiler, Thermic Fluid Heater, WHRB, FGD System, Absorption Chiller, or General' },
        category: { type: 'string', description: 'SOP category: Startup, Operation, Maintenance, Emergency, Performance, Safety, Diagnosis' },
        keyword: { type: 'string', description: 'Search keyword (e.g., "tube leak", "vibration", "combustion")' }
      },
      required: []
    }
  },
  {
    name: 'diagnose_service_case',
    description: 'Performs AI-powered diagnosis of a service case using why-why (5-Why) root cause analysis. Traces symptoms to root causes and recommends corrective and preventive actions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: { type: 'string', description: 'Specific case ID (e.g., SC-001) or "all" for open cases' },
        equipment_type: { type: 'string', description: 'Filter by equipment type' },
        severity: { type: 'string', description: 'Filter by severity: Low/Medium/High/Critical' }
      },
      required: []
    }
  },
  {
    name: 'check_spare_parts',
    description: 'Checks spare parts inventory — availability, stock levels, lead times, pricing, and consumption history. Identifies parts needed for a service case or equipment type.',
    input_schema: {
      type: 'object' as const,
      properties: {
        equipment_type: { type: 'string', description: 'Equipment type to check parts for (or "all")' },
        criticality: { type: 'string', description: 'Criticality filter: Critical/High/Medium/Low' },
        low_stock_only: { type: 'boolean', description: 'If true, only show parts below reorder level' }
      },
      required: []
    }
  }
];

const governanceTools: Anthropic.Messages.Tool[] = [
  {
    name: 'analyze_approval_gates',
    description: 'Reviews approval gate status across all 9 stages — SLA compliance, pending approvals, bottlenecks, decision distribution (Approved/Rejected/Deferred).',
    input_schema: {
      type: 'object' as const,
      properties: {
        stage_filter: { type: 'string', description: 'Filter by stage name (or "all")' },
        sla_status: { type: 'string', description: 'Filter by SLA status: Within SLA/Breached/At Risk' }
      },
      required: []
    }
  },
  {
    name: 'audit_agent_actions',
    description: 'Analyzes the full agent audit trail — action type distribution, confidence score patterns, latency analysis, human intervention rates per agent.',
    input_schema: {
      type: 'object' as const,
      properties: {
        agent_id: { type: 'string', description: 'Filter by agent ID (or "all")' },
        action_type: { type: 'string', description: 'Filter by action type: Monitor/Classify/Draft/Extract/Alert/Score/Recommend/Summarize/Analyze/Simulate' }
      },
      required: []
    }
  },
  {
    name: 'review_overrides',
    description: 'Analyzes human override patterns — identifies systematic AI failures, override reasons, lessons learned, and generates retraining recommendations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        agent_id: { type: 'string', description: 'Filter by agent ID (or "all")' }
      },
      required: []
    }
  },
  {
    name: 'manage_escalations',
    description: 'Reviews confidence-based escalations — resolution times, outcomes, threshold effectiveness, and escalation volume trends per agent and role.',
    input_schema: {
      type: 'object' as const,
      properties: {
        threshold: { type: 'number', description: 'Confidence threshold (default: 0.8)' },
        agent_id: { type: 'string', description: 'Filter by agent ID (or "all")' }
      },
      required: []
    }
  }
];

const toolRegistry: Record<string, Anthropic.Messages.Tool[]> = {
  'marketing': marketingTools,
  'sales': salesTools,
  'presales': presalesTools,
  'engineering': engineeringTools,
  'finance-legal': financeLegalTools,
  'hr-pmo': hrPmoTools,
  'site-operations': siteOpsTools,
  'commissioning': commissioningTools,
  'digital-service': digitalServiceTools,
  'governance': governanceTools
};

export function getToolsForSlug(slug: string): Anthropic.Messages.Tool[] | null {
  return toolRegistry[slug] ?? null;
}

export function getAgenticInstructions(slug: string): string {
  const tools = toolRegistry[slug];
  if (!tools) return '';

  const toolNames = tools.map((t) => t.name);
  const numberedList = toolNames.map((n, i) => `${i + 1}. Call ${n}`).join('\n');

  return `\n\nIMPORTANT AGENTIC INSTRUCTIONS:
You have ${tools.length} tools available. You MUST use them in this order before writing your final analysis:
${numberedList}

Always use the tools — do not skip them. The user expects to see you call each tool visibly.
After all tools complete, produce a comprehensive, structured report synthesizing all tool results.
Include confidence scores, data quality flags, and governance recommendations in your final output.`;
}

export function executeToolLocally(
  name: ToolName,
  input: Record<string, unknown>
): string {
  try {
    switch (name) {
      case 'scan_market_signals': return executeMarketSignalsScan(input);
      case 'generate_account_brief': return executeAccountBriefGeneration(input);
      case 'assess_signal_urgency': return executeUrgencyAssessment(input);
      case 'qualify_opportunity': return executeOpportunityQualification(input);
      case 'map_stakeholders': return executeStakeholderMapping(input);
      case 'analyze_pipeline': return executePipelineAnalysis(input);
      case 'draft_proposal': return executeProposalDraft(input);
      case 'generate_bom': return executeBomGeneration(input);
      case 'analyze_margins': return executeMarginAnalysis(input);
      case 'validate_engineering': return executeEngineeringValidation(input);
      case 'simulate_performance': return executePerformanceSimulation(input);
      case 'assess_hazop': return executeHazopAssessment(input);
      case 'assess_commercial_risk': return executeCommercialRiskAssessment(input);
      case 'review_contract': return executeContractReview(input);
      case 'evaluate_payment_terms': return executePaymentTermsEvaluation(input);
      case 'charter_project': return executeProjectCharter(input);
      case 'match_resources': return executeResourceMatching(input);
      case 'plan_mobilisation': return executeMobilisationPlan(input);
      case 'analyze_progress': return executeProgressAnalysis(input);
      case 'detect_safety_risks': return executeSafetyRiskDetection(input);
      case 'disposition_ncr': return executeNcrDisposition(input);
      case 'analyze_test_results': return executeTestResultsAnalysis(input);
      case 'verify_performance': return executePerformanceVerification(input);
      case 'generate_punchlist': return executePunchlistGeneration(input);
      case 'lookup_sop': return executeSOPLookup(input);
      case 'diagnose_service_case': return executeServiceCaseDiagnosis(input);
      case 'check_spare_parts': return executeSparePartsCheck(input);
      case 'analyze_approval_gates': return executeApprovalGateAnalysis(input);
      case 'audit_agent_actions': return executeAuditAnalysis(input);
      case 'review_overrides': return executeOverrideReview(input);
      case 'manage_escalations': return executeEscalationManagement(input);
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({
      error: `Tool execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      tool: name
    });
  }
}

function executeMarketSignalsScan(input: Record<string, unknown>): string {
  const signals = loadCsv('01_marketing', 'market_signals.csv');
  const customers = loadCsv('00_master_data', 'customers_master.csv');
  const minUrgency = Number(input.min_urgency) || 1;
  const industryFilter = input.industry_filter as string | undefined;

  let filtered = signals.rows.filter((r) => Number(r.urgency_score) >= minUrgency);
  if (industryFilter) {
    filtered = filtered.filter((r) => r.industry?.toLowerCase().includes(industryFilter.toLowerCase()));
  }

  const enriched = filtered.slice(0, 20).map((s) => {
    const cust = customers.rows.find((c) => c.customer_id === s.customer_id);
    return {
      signal_id: s.signal_id,
      detected_date: s.detected_date,
      source: s.source,
      signal_type: s.signal_type,
      customer: cust?.customer_name ?? s.customer_id,
      industry: s.industry,
      description: s.description,
      urgency_score: s.urgency_score,
      estimated_value_inr_cr: s.estimated_value_inr_cr,
      agent_confidence: s.agent_confidence,
      status: s.status,
      review_outcome: s.review_outcome,
      account_tier: cust?.account_tier ?? 'Unknown',
      customer_revenue_cr: cust?.annual_revenue_inr_cr ?? 'Unknown'
    };
  });

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const s of signals.rows) {
    byType[s.signal_type] = (byType[s.signal_type] || 0) + 1;
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }

  return JSON.stringify({
    total_signals: signals.rowCount,
    filtered_count: filtered.length,
    displayed: enriched.length,
    breakdown_by_type: byType,
    breakdown_by_status: byStatus,
    avg_confidence: (signals.rows.reduce((a, r) => a + Number(r.agent_confidence || 0), 0) / signals.rowCount).toFixed(3),
    signals: enriched,
    summary: `${signals.rowCount} market signals scanned. ${filtered.length} match filters. Top signals enriched with customer master data.`
  });
}

function executeAccountBriefGeneration(input: Record<string, unknown>): string {
  const briefs = loadCsv('01_marketing', 'account_briefs.csv');
  const customers = loadCsv('00_master_data', 'customers_master.csv');
  const topN = Number(input.top_n) || 5;

  const sorted = [...briefs.rows].sort((a, b) => Number(b.estimated_deal_size_inr_cr) - Number(a.estimated_deal_size_inr_cr));
  const top = sorted.slice(0, topN).map((b) => {
    const cust = customers.rows.find((c) => c.customer_id === b.customer_id);
    return {
      brief_id: b.brief_id,
      signal_id: b.signal_id,
      customer: cust?.customer_name ?? b.customer_id,
      account_tier: b.account_tier,
      pain_points: b.pain_points,
      value_hypothesis: b.value_hypothesis,
      proposed_solutions: b.proposed_solutions,
      estimated_deal_size_inr_cr: b.estimated_deal_size_inr_cr,
      agent_confidence: b.agent_confidence,
      status: b.status,
      approved_by: b.approved_by
    };
  });

  return JSON.stringify({
    total_briefs: briefs.rowCount,
    displayed: top.length,
    briefs: top,
    total_pipeline_value_cr: briefs.rows.reduce((a, r) => a + Number(r.estimated_deal_size_inr_cr || 0), 0).toFixed(1),
    summary: `${briefs.rowCount} account briefs analyzed. Top ${topN} by deal size shown with customer enrichment.`
  });
}

function executeUrgencyAssessment(input: Record<string, unknown>): string {
  const signals = loadCsv('01_marketing', 'market_signals.csv');
  const prioritized = [...signals.rows]
    .map((s) => ({
      signal_id: s.signal_id,
      urgency: Number(s.urgency_score),
      value: Number(s.estimated_value_inr_cr),
      confidence: Number(s.agent_confidence),
      composite_score: Number(s.urgency_score) * 0.4 + Number(s.estimated_value_inr_cr) * 0.3 + Number(s.agent_confidence) * 10 * 0.3,
      status: s.status,
      type: s.signal_type
    }))
    .sort((a, b) => b.composite_score - a.composite_score);

  return JSON.stringify({
    total_assessed: prioritized.length,
    priority_matrix: prioritized.slice(0, 15),
    high_urgency_count: prioritized.filter((p) => p.urgency >= 4).length,
    avg_composite: (prioritized.reduce((a, p) => a + p.composite_score, 0) / prioritized.length).toFixed(2),
    summary: `${prioritized.length} signals re-scored. ${prioritized.filter((p) => p.urgency >= 4).length} high-urgency signals identified.`
  });
}

function executeOpportunityQualification(input: Record<string, unknown>): string {
  const opps = loadCsv('02_sales', 'opportunities.csv');
  const briefs = loadCsv('01_marketing', 'account_briefs.csv');
  const customers = loadCsv('00_master_data', 'customers_master.csv');
  const minValue = Number(input.min_value_cr) || 0;

  let filtered = opps.rows.filter((o) => Number(o.value_inr_cr) >= minValue);
  const sorted = [...filtered].sort((a, b) => Number(b.value_inr_cr) - Number(a.value_inr_cr));

  const qualified = sorted.slice(0, 15).map((o) => {
    const cust = customers.rows.find((c) => c.customer_id === o.customer_id);
    const bant = Number(o.bant_score);
    const meddic = Number(o.meddic_score);
    let recommendation = 'NO-GO';
    if (bant >= 6 && meddic >= 6) recommendation = 'GO';
    else if (bant >= 6 || meddic >= 6) recommendation = 'CONDITIONAL GO';

    return {
      opportunity_id: o.opportunity_id,
      customer: cust?.customer_name ?? o.customer_id,
      description: o.description,
      stage: o.stage,
      value_inr_cr: o.value_inr_cr,
      probability_pct: o.probability_pct,
      bant_score: o.bant_score,
      meddic_score: o.meddic_score,
      competitors: o.competitors,
      agent_confidence: o.agent_confidence,
      human_go_nogo: o.human_go_nogo,
      ai_recommendation: recommendation,
      expected_close: o.expected_close_date
    };
  });

  const goCount = qualified.filter((q) => q.ai_recommendation === 'GO').length;
  const conditionalCount = qualified.filter((q) => q.ai_recommendation === 'CONDITIONAL GO').length;

  return JSON.stringify({
    total_opportunities: opps.rowCount,
    qualified_count: qualified.length,
    go: goCount,
    conditional_go: conditionalCount,
    no_go: qualified.length - goCount - conditionalCount,
    total_pipeline_value_cr: opps.rows.reduce((a, r) => a + Number(r.value_inr_cr || 0), 0).toFixed(1),
    opportunities: qualified,
    summary: `${opps.rowCount} opportunities analyzed. ${goCount} GO, ${conditionalCount} CONDITIONAL GO.`
  });
}

function executeStakeholderMapping(input: Record<string, unknown>): string {
  const stk = loadCsv('02_sales', 'stakeholder_map.csv');
  const oppId = input.opportunity_id as string;

  const filtered = oppId ? stk.rows.filter((s) => s.opportunity_id === oppId) : stk.rows.slice(0, 20);

  const byInfluence = filtered.reduce((acc, s) => {
    const level = s.influence_level || 'Unknown';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byDisposition = filtered.reduce((acc, s) => {
    const d = s.disposition || 'Unknown';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return JSON.stringify({
    total_stakeholders: stk.rowCount,
    filtered_count: filtered.length,
    opportunity_id: oppId || 'all',
    by_influence_level: byInfluence,
    by_disposition: byDisposition,
    stakeholders: filtered.slice(0, 20).map((s) => ({
      stakeholder_id: s.stakeholder_id,
      person_name: s.person_name,
      designation: s.designation,
      role: s.role,
      influence_level: s.influence_level,
      disposition: s.disposition,
      last_interaction: s.last_interaction_date
    })),
    summary: `${filtered.length} stakeholders mapped for ${oppId || 'all opportunities'}. Influence and disposition analysis complete.`
  });
}

function executePipelineAnalysis(input: Record<string, unknown>): string {
  const opps = loadCsv('02_sales', 'opportunities.csv');
  const groupBy = (input.group_by as string) || 'stage';

  const groups: Record<string, { count: number; value: number; weighted: number }> = {};
  for (const o of opps.rows) {
    const key = o[groupBy] || 'Unknown';
    if (!groups[key]) groups[key] = { count: 0, value: 0, weighted: 0 };
    groups[key].count++;
    groups[key].value += Number(o.value_inr_cr || 0);
    groups[key].weighted += Number(o.value_inr_cr || 0) * Number(o.probability_pct || 0) / 100;
  }

  return JSON.stringify({
    total_opportunities: opps.rowCount,
    total_value_cr: opps.rows.reduce((a, r) => a + Number(r.value_inr_cr || 0), 0).toFixed(1),
    weighted_value_cr: opps.rows.reduce((a, r) => a + Number(r.value_inr_cr || 0) * Number(r.probability_pct || 0) / 100, 0).toFixed(1),
    grouped_by: groupBy,
    groups,
    summary: `Pipeline analyzed by ${groupBy}. ${opps.rowCount} opportunities across ${Object.keys(groups).length} groups.`
  });
}

function executeProposalDraft(input: Record<string, unknown>): string {
  const proposals = loadCsv('03_presales', 'proposals.csv');
  const opps = loadCsv('02_sales', 'opportunities.csv');
  const products = loadCsv('00_master_data', 'products_catalog.csv');

  const oppId = input.opportunity_id as string;
  const existing = proposals.rows.filter((p) => p.opportunity_id === oppId);
  const opp = opps.rows.find((o) => o.opportunity_id === oppId);

  return JSON.stringify({
    opportunity: opp ? { id: opp.opportunity_id, description: opp.description, value_cr: opp.value_inr_cr, stage: opp.stage } : null,
    existing_proposals: existing.length,
    proposals: existing.map((p) => ({
      proposal_id: p.proposal_id,
      version: p.version,
      value_inr_cr: p.value_inr_cr,
      margin_pct: p.margin_pct,
      scope_type: p.scope_type,
      delivery_weeks: p.delivery_weeks,
      status: p.status,
      agent_drafted: p.agent_drafted,
      solution_architect: p.solution_architect
    })),
    available_products: products.rowCount,
    product_categories: Array.from(new Set(products.rows.map((p) => p.product_category))),
    summary: `${existing.length} proposals found for ${oppId}. ${products.rowCount} products available across ${Array.from(new Set(products.rows.map((p) => p.product_category))).length} categories.`
  });
}

function executeBomGeneration(input: Record<string, unknown>): string {
  const bom = loadCsv('03_presales', 'bill_of_materials.csv');
  const propId = input.proposal_id as string;
  const items = bom.rows.filter((b) => b.proposal_id === propId);

  const totalValue = items.reduce((a, b) => a + Number(b.total_price_inr_lakh || 0), 0);
  const avgMargin = items.length > 0 ? items.reduce((a, b) => a + Number(b.margin_pct || 0), 0) / items.length : 0;

  return JSON.stringify({
    proposal_id: propId,
    line_items: items.length,
    total_bom_value_lakh: totalValue.toFixed(1),
    average_margin_pct: avgMargin.toFixed(1),
    items: items.slice(0, 20).map((b) => ({
      bom_id: b.bom_id,
      product_id: b.product_id,
      product_name: b.product_name,
      quantity: b.quantity,
      unit_price_lakh: b.unit_price_inr_lakh,
      total_price_lakh: b.total_price_inr_lakh,
      lead_time_weeks: b.lead_time_weeks,
      supply_type: b.supply_type,
      margin_pct: b.margin_pct
    })),
    summary: `${items.length} BOM line items for ${propId}. Total value: ₹${totalValue.toFixed(1)} Lakh. Avg margin: ${avgMargin.toFixed(1)}%.`
  });
}

function executeMarginAnalysis(input: Record<string, unknown>): string {
  const proposals = loadCsv('03_presales', 'proposals.csv');
  const threshold = Number(input.threshold_pct) || 15;

  const analyzed = proposals.rows.map((p) => ({
    proposal_id: p.proposal_id,
    value_cr: Number(p.value_inr_cr),
    margin_pct: Number(p.margin_pct),
    scope_type: p.scope_type,
    status: p.status,
    below_threshold: Number(p.margin_pct) < threshold
  }));

  const belowThreshold = analyzed.filter((a) => a.below_threshold);
  const avgMargin = analyzed.reduce((a, p) => a + p.margin_pct, 0) / analyzed.length;

  return JSON.stringify({
    total_proposals: analyzed.length,
    threshold_pct: threshold,
    below_threshold: belowThreshold.length,
    above_threshold: analyzed.length - belowThreshold.length,
    average_margin_pct: avgMargin.toFixed(1),
    flagged_proposals: belowThreshold.slice(0, 10),
    margin_distribution: {
      below_10: analyzed.filter((a) => a.margin_pct < 10).length,
      '10_to_15': analyzed.filter((a) => a.margin_pct >= 10 && a.margin_pct < 15).length,
      '15_to_20': analyzed.filter((a) => a.margin_pct >= 15 && a.margin_pct < 20).length,
      '20_to_25': analyzed.filter((a) => a.margin_pct >= 20 && a.margin_pct < 25).length,
      above_25: analyzed.filter((a) => a.margin_pct >= 25).length
    },
    summary: `${analyzed.length} proposals analyzed. ${belowThreshold.length} below ${threshold}% margin threshold. Avg margin: ${avgMargin.toFixed(1)}%.`
  });
}

function executeEngineeringValidation(input: Record<string, unknown>): string {
  const validations = loadCsv('04_engineering', 'engineering_validations.csv');
  const propId = input.proposal_id as string;

  const filtered = propId && propId !== 'all'
    ? validations.rows.filter((v) => v.proposal_id === propId)
    : validations.rows;

  const byVerdict: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const v of filtered) {
    byVerdict[v.ai_verdict] = (byVerdict[v.ai_verdict] || 0) + 1;
    byType[v.validation_type] = (byType[v.validation_type] || 0) + 1;
  }

  return JSON.stringify({
    total_validations: filtered.length,
    by_verdict: byVerdict,
    by_type: byType,
    hazop_required_count: filtered.filter((v) => v.hazop_required === 'Yes').length,
    avg_confidence: (filtered.reduce((a, v) => a + Number(v.ai_confidence || 0), 0) / Math.max(filtered.length, 1)).toFixed(3),
    validations: filtered.slice(0, 15).map((v) => ({
      validation_id: v.validation_id,
      proposal_id: v.proposal_id,
      type: v.validation_type,
      ai_verdict: v.ai_verdict,
      ai_confidence: v.ai_confidence,
      risk_flags: v.risk_flags,
      hazop_required: v.hazop_required,
      final_verdict: v.final_verdict,
      modifications: v.modifications_required,
      status: v.status
    })),
    summary: `${filtered.length} engineering validations analyzed. ${byVerdict['Approved'] || 0} Approved, ${byVerdict['Conditional'] || 0} Conditional, ${byVerdict['Rejected'] || 0} Rejected.`
  });
}

function executePerformanceSimulation(input: Record<string, unknown>): string {
  const pgs = loadCsv('04_engineering', 'performance_guarantees.csv');
  const propId = input.proposal_id as string;
  const filtered = pgs.rows.filter((p) => p.proposal_id === propId);

  const results = filtered.map((pg) => {
    const guaranteed = Number(pg.guaranteed_value);
    const simulated = Number(pg.ai_simulated_value);
    const tolerance = Number(pg.tolerance_pct);
    const deviation = guaranteed > 0 ? ((simulated - guaranteed) / guaranteed * 100) : 0;
    const withinTolerance = Math.abs(deviation) <= tolerance;
    return {
      guarantee_id: pg.guarantee_id,
      parameter: pg.parameter,
      unit: pg.unit,
      guaranteed: pg.guaranteed_value,
      simulated: pg.ai_simulated_value,
      deviation_pct: deviation.toFixed(2),
      tolerance_pct: pg.tolerance_pct,
      within_tolerance: withinTolerance,
      penalty_per_shortfall: pg.penalty_per_unit_shortfall_inr_lakh,
      status: withinTolerance ? 'PASS' : 'RISK'
    };
  });

  return JSON.stringify({
    proposal_id: propId,
    total_parameters: results.length,
    passing: results.filter((r) => r.within_tolerance).length,
    at_risk: results.filter((r) => !r.within_tolerance).length,
    parameters: results,
    summary: `${results.length} PG parameters simulated for ${propId}. ${results.filter((r) => r.within_tolerance).length} within tolerance, ${results.filter((r) => !r.within_tolerance).length} at risk.`
  });
}

function executeHazopAssessment(input: Record<string, unknown>): string {
  const validations = loadCsv('04_engineering', 'engineering_validations.csv');
  const propId = input.proposal_id as string;
  const filtered = validations.rows.filter((v) => v.proposal_id === propId && v.hazop_required === 'Yes');

  return JSON.stringify({
    proposal_id: propId,
    hazop_required_count: filtered.length,
    assessments: filtered.map((v) => ({
      validation_id: v.validation_id,
      type: v.validation_type,
      risk_flags: v.risk_flags,
      ai_verdict: v.ai_verdict,
      ai_confidence: v.ai_confidence,
      modifications_required: v.modifications_required,
      reviewed_by: v.reviewed_by_engineer,
      status: v.status
    })),
    summary: `${filtered.length} HAZOP-required validations for ${propId}.`
  });
}

function executeCommercialRiskAssessment(input: Record<string, unknown>): string {
  const assessments = loadCsv('05_finance_legal', 'commercial_risk_assessments.csv');
  const propId = input.proposal_id as string;

  const filtered = propId && propId !== 'all'
    ? assessments.rows.filter((a) => a.proposal_id === propId)
    : assessments.rows;

  const byRating: Record<string, number> = {};
  for (const a of filtered) {
    byRating[a.overall_risk_rating] = (byRating[a.overall_risk_rating] || 0) + 1;
  }

  return JSON.stringify({
    total_assessments: filtered.length,
    by_risk_rating: byRating,
    high_risk_count: filtered.filter((a) => a.overall_risk_rating === 'High' || a.overall_risk_rating === 'Critical').length,
    assessments: filtered.slice(0, 15).map((a) => ({
      assessment_id: a.assessment_id,
      proposal_id: a.proposal_id,
      margin_pct: a.margin_pct,
      cash_flow_score: a.cash_flow_score,
      currency_exposure: a.currency_exposure,
      payment_terms_risk: a.payment_terms_risk,
      ld_exposure_pct: a.ld_exposure_pct,
      overall_risk: a.overall_risk_rating,
      recommendation: a.agent_recommendation,
      decision: a.decision
    })),
    summary: `${filtered.length} commercial risk assessments. ${byRating['High'] || 0} High, ${byRating['Critical'] || 0} Critical risk.`
  });
}

function executeContractReview(input: Record<string, unknown>): string {
  const reviews = loadCsv('05_finance_legal', 'contract_reviews.csv');
  const propId = input.proposal_id as string;
  const filtered = reviews.rows.filter((r) => r.proposal_id === propId);

  return JSON.stringify({
    proposal_id: propId,
    reviews_count: filtered.length,
    reviews: filtered.map((r) => ({
      review_id: r.review_id,
      contract_type: r.contract_type,
      ai_redlines: r.ai_redlines_count,
      critical_clauses: r.critical_clauses_flagged,
      indemnity_risk: r.indemnity_risk,
      ip_risk: r.ip_risk,
      warranty_risk: r.warranty_risk,
      approval_status: r.approval_status,
      negotiation_rounds: r.negotiation_rounds
    })),
    summary: `${filtered.length} contract reviews for ${propId}.`
  });
}

function executePaymentTermsEvaluation(input: Record<string, unknown>): string {
  const assessments = loadCsv('05_finance_legal', 'commercial_risk_assessments.csv');
  const propId = input.proposal_id as string;
  const filtered = assessments.rows.filter((a) => a.proposal_id === propId);

  return JSON.stringify({
    proposal_id: propId,
    evaluations: filtered.map((a) => ({
      assessment_id: a.assessment_id,
      payment_terms_risk: a.payment_terms_risk,
      cash_flow_score: a.cash_flow_score,
      ld_exposure_pct: a.ld_exposure_pct,
      recommendation: a.agent_recommendation
    })),
    summary: `Payment terms evaluated for ${propId}.`
  });
}

function executeProjectCharter(input: Record<string, unknown>): string {
  const projects = loadCsv('06_hr_pmo', 'projects.csv');
  const propId = input.proposal_id as string;
  const project = projects.rows.find((p) => p.proposal_id === propId);

  return JSON.stringify({
    proposal_id: propId,
    project: project ? {
      project_id: project.project_id,
      project_name: project.project_name,
      site_location: project.site_location,
      contract_value_cr: project.contract_value_inr_cr,
      start_date: project.start_date,
      planned_end: project.planned_end_date,
      project_manager: project.project_manager,
      status: project.project_status,
      charter_status: project.agent_charter_status,
      pmo_approver: project.pmo_approver
    } : null,
    summary: project ? `Project ${project.project_id} chartered for ${propId}.` : `No project found for ${propId}.`
  });
}

function executeResourceMatching(input: Record<string, unknown>): string {
  const assignments = loadCsv('06_hr_pmo', 'resource_assignments.csv');
  const employees = loadCsv('00_master_data', 'employees_master.csv');
  const projId = input.project_id as string;

  const projectAssignments = assignments.rows.filter((a) => a.project_id === projId);

  const enriched = projectAssignments.slice(0, 20).map((a) => {
    const emp = employees.rows.find((e) => e.employee_id === a.employee_id);
    return {
      assignment_id: a.assignment_id,
      employee: emp?.name ?? a.employee_id,
      designation: emp?.designation ?? 'Unknown',
      role: a.role,
      certification_required: a.certification_required,
      ai_match_score: a.ai_match_score,
      status: a.status,
      primary_skill: emp?.primary_skill ?? 'Unknown'
    };
  });

  const avgMatch = projectAssignments.length > 0
    ? projectAssignments.reduce((a, r) => a + Number(r.ai_match_score || 0), 0) / projectAssignments.length
    : 0;

  return JSON.stringify({
    project_id: projId,
    total_assignments: projectAssignments.length,
    avg_match_score: avgMatch.toFixed(3),
    low_match_count: projectAssignments.filter((a) => Number(a.ai_match_score) < 0.7).length,
    assignments: enriched,
    summary: `${projectAssignments.length} resource assignments for ${projId}. Avg match score: ${avgMatch.toFixed(3)}.`
  });
}

function executeMobilisationPlan(input: Record<string, unknown>): string {
  const projects = loadCsv('06_hr_pmo', 'projects.csv');
  const assignments = loadCsv('06_hr_pmo', 'resource_assignments.csv');
  const projId = input.project_id as string;
  const project = projects.rows.find((p) => p.project_id === projId);
  const projAssignments = assignments.rows.filter((a) => a.project_id === projId);

  const byRole: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const a of projAssignments) {
    byRole[a.role] = (byRole[a.role] || 0) + 1;
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  }

  return JSON.stringify({
    project: project ? { id: project.project_id, name: project.project_name, location: project.site_location, value_cr: project.contract_value_inr_cr } : null,
    team_size: projAssignments.length,
    by_role: byRole,
    by_status: byStatus,
    certification_gaps: projAssignments.filter((a) => a.certification_required && Number(a.ai_match_score) < 0.7).length,
    summary: `Mobilisation plan for ${projId}: ${projAssignments.length} team members across ${Object.keys(byRole).length} roles.`
  });
}

function executeProgressAnalysis(input: Record<string, unknown>): string {
  const progress = loadCsv('07_site_operations', 'site_progress.csv');
  const projects = loadCsv('06_hr_pmo', 'projects.csv');
  const projId = input.project_id as string;
  const weeks = Number(input.weeks) || 4;

  let filtered = projId && projId !== 'all'
    ? progress.rows.filter((p) => p.project_id === projId)
    : progress.rows;

  const latestWeeks = [...filtered].sort((a, b) => Number(b.week_number) - Number(a.week_number)).slice(0, projId ? weeks : 30);

  const alerts = latestWeeks.filter((p) => Number(p.schedule_variance_pct) < -5);
  const critical = latestWeeks.filter((p) => Number(p.schedule_variance_pct) < -10);

  return JSON.stringify({
    total_records: filtered.length,
    displayed: latestWeeks.length,
    alerts_amber: alerts.length - critical.length,
    alerts_red: critical.length,
    escalation_required: latestWeeks.filter((p) => p.escalation_required === 'Yes').length,
    progress_data: latestWeeks.slice(0, 15).map((p) => ({
      progress_id: p.progress_id,
      project_id: p.project_id,
      week: p.week_number,
      planned_pct: p.planned_progress_pct,
      actual_pct: p.actual_progress_pct,
      variance_pct: p.schedule_variance_pct,
      slippage_alert: p.agent_slippage_alert,
      escalation: p.escalation_required
    })),
    summary: `${filtered.length} progress records. ${alerts.length} slippage alerts (${critical.length} RED, ${alerts.length - critical.length} AMBER).`
  });
}

function executeSafetyRiskDetection(input: Record<string, unknown>): string {
  const incidents = loadCsv('07_site_operations', 'safety_incidents.csv');
  const projId = input.project_id as string;
  const sevFilter = input.severity_filter as string;

  let filtered = incidents.rows;
  if (projId && projId !== 'all') filtered = filtered.filter((i) => i.project_id === projId);
  if (sevFilter) filtered = filtered.filter((i) => i.severity === sevFilter);

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const i of filtered) {
    byType[i.incident_type] = (byType[i.incident_type] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
  }

  return JSON.stringify({
    total_incidents: filtered.length,
    by_type: byType,
    by_severity: bySeverity,
    stop_work_triggered: filtered.filter((i) => i.stop_work_triggered === 'Yes').length,
    agent_detected: filtered.filter((i) => i.agent_detected === 'Yes').length,
    incidents: filtered.slice(0, 15).map((i) => ({
      incident_id: i.incident_id,
      project_id: i.project_id,
      date: i.incident_date,
      type: i.incident_type,
      severity: i.severity,
      description: i.description,
      root_cause: i.root_cause,
      agent_detected: i.agent_detected,
      stop_work: i.stop_work_triggered
    })),
    summary: `${filtered.length} safety incidents. ${bySeverity['Critical'] || 0} Critical, ${bySeverity['High'] || 0} High. ${filtered.filter((i) => i.stop_work_triggered === 'Yes').length} stop-work events.`
  });
}

function executeNcrDisposition(input: Record<string, unknown>): string {
  const ncrs = loadCsv('07_site_operations', 'quality_ncrs.csv');
  const projId = input.project_id as string;
  const statusFilter = input.status_filter as string;

  let filtered = ncrs.rows;
  if (projId && projId !== 'all') filtered = filtered.filter((n) => n.project_id === projId);
  if (statusFilter) filtered = filtered.filter((n) => n.status === statusFilter);

  const aiVsHumanMatch = filtered.filter((n) => n.ai_disposition === n.human_disposition).length;

  return JSON.stringify({
    total_ncrs: filtered.length,
    ai_human_match_rate: filtered.length > 0 ? (aiVsHumanMatch / filtered.length * 100).toFixed(1) + '%' : 'N/A',
    rework_required: filtered.filter((n) => n.rework_required === 'Yes').length,
    ncrs: filtered.slice(0, 15).map((n) => ({
      ncr_id: n.ncr_id,
      project_id: n.project_id,
      component: n.component,
      defect: n.defect_description,
      severity: n.severity,
      ai_disposition: n.ai_disposition,
      human_disposition: n.human_disposition,
      rework: n.rework_required,
      status: n.status
    })),
    summary: `${filtered.length} NCRs analyzed. AI-human disposition match rate: ${filtered.length > 0 ? (aiVsHumanMatch / filtered.length * 100).toFixed(1) : 0}%.`
  });
}

function executeTestResultsAnalysis(input: Record<string, unknown>): string {
  const tests = loadCsv('08_commissioning', 'commissioning_tests.csv');
  const projId = input.project_id as string;
  const testType = input.test_type as string;

  let filtered = tests.rows;
  if (projId && projId !== 'all') filtered = filtered.filter((t) => t.project_id === projId);
  if (testType) filtered = filtered.filter((t) => t.test_type === testType);

  const byResult: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const t of filtered) {
    byResult[t.result] = (byResult[t.result] || 0) + 1;
    byType[t.test_type] = (byType[t.test_type] || 0) + 1;
  }

  return JSON.stringify({
    total_tests: filtered.length,
    by_result: byResult,
    by_type: byType,
    avg_deviation_pct: (filtered.reduce((a, t) => a + Math.abs(Number(t.deviation_pct || 0)), 0) / Math.max(filtered.length, 1)).toFixed(2),
    tests: filtered.slice(0, 15).map((t) => ({
      test_id: t.test_id,
      project_id: t.project_id,
      type: t.test_type,
      parameter: t.parameter_tested,
      target: t.target_value,
      actual: t.actual_value,
      deviation_pct: t.deviation_pct,
      result: t.result,
      ai_analysis: t.ai_analysis,
      witnessed_by: t.witnessed_by
    })),
    summary: `${filtered.length} commissioning tests. ${byResult['Pass'] || 0} Pass, ${byResult['Conditional Pass'] || 0} Conditional, ${byResult['Fail'] || 0} Fail.`
  });
}

function executePerformanceVerification(input: Record<string, unknown>): string {
  const tests = loadCsv('08_commissioning', 'commissioning_tests.csv');
  const pgs = loadCsv('04_engineering', 'performance_guarantees.csv');
  const projId = input.project_id as string;

  const pgTests = tests.rows.filter((t) => t.project_id === projId && t.test_type === 'Performance Guarantee Test');
  const projPgs = pgs.rows.filter((p) => {
    const proposals = loadCsv('06_hr_pmo', 'projects.csv').rows.find((pr) => pr.project_id === projId);
    return proposals ? p.proposal_id === proposals.proposal_id : false;
  });

  return JSON.stringify({
    project_id: projId,
    pg_tests_count: pgTests.length,
    pg_parameters: projPgs.length,
    pg_tests: pgTests.map((t) => ({
      test_id: t.test_id,
      parameter: t.parameter_tested,
      target: t.target_value,
      actual: t.actual_value,
      deviation_pct: t.deviation_pct,
      result: t.result
    })),
    summary: `${pgTests.length} PG tests and ${projPgs.length} PG parameters for ${projId}.`
  });
}

function executePunchlistGeneration(input: Record<string, unknown>): string {
  const tests = loadCsv('08_commissioning', 'commissioning_tests.csv');
  const ncrs = loadCsv('07_site_operations', 'quality_ncrs.csv');
  const projId = input.project_id as string;

  const failedTests = tests.rows.filter((t) => t.project_id === projId && (t.result === 'Fail' || t.result === 'Conditional Pass'));
  const openNcrs = ncrs.rows.filter((n) => n.project_id === projId && n.status !== 'Closed');

  return JSON.stringify({
    project_id: projId,
    punchlist_items: failedTests.length + openNcrs.length,
    failed_tests: failedTests.length,
    open_ncrs: openNcrs.length,
    items: [
      ...failedTests.map((t) => ({ type: 'TEST', id: t.test_id, description: `${t.parameter_tested}: ${t.result} (${t.deviation_pct}% deviation)`, severity: t.result === 'Fail' ? 'High' : 'Medium' })),
      ...openNcrs.map((n) => ({ type: 'NCR', id: n.ncr_id, description: `${n.component}: ${n.defect_description}`, severity: n.severity }))
    ],
    summary: `Punchlist for ${projId}: ${failedTests.length} test issues + ${openNcrs.length} open NCRs = ${failedTests.length + openNcrs.length} items.`
  });
}

function executeSOPLookup(input: Record<string, unknown>): string {
  const sops = loadCsv('09_digital_service', 'sop_library.csv');
  const equipType = input.equipment_type as string;
  const category = input.category as string;
  const keyword = input.keyword as string;

  let filtered = sops.rows;
  if (equipType && equipType !== 'all') filtered = filtered.filter((s) => s.equipment_type?.toLowerCase().includes(equipType.toLowerCase()));
  if (category) filtered = filtered.filter((s) => s.category?.toLowerCase().includes(category.toLowerCase()));
  if (keyword) filtered = filtered.filter((s) =>
    s.sop_title?.toLowerCase().includes(keyword.toLowerCase()) ||
    s.summary?.toLowerCase().includes(keyword.toLowerCase()) ||
    s.key_steps?.toLowerCase().includes(keyword.toLowerCase())
  );

  return JSON.stringify({
    total_sops_found: filtered.length,
    sops: filtered.map((s) => ({
      sop_id: s.sop_id,
      equipment: s.equipment_type,
      title: s.sop_title,
      category: s.category,
      revision: s.revision,
      summary: s.summary,
      key_steps: s.key_steps,
      safety_precautions: s.safety_precautions,
      tools_required: s.tools_required
    })),
    summary: `${filtered.length} SOPs found${equipType ? ` for ${equipType}` : ''}${category ? ` in ${category} category` : ''}${keyword ? ` matching "${keyword}"` : ''}.`
  });
}

function executeServiceCaseDiagnosis(input: Record<string, unknown>): string {
  const cases = loadCsv('09_digital_service', 'service_cases.csv');
  const caseId = input.case_id as string;
  const equipType = input.equipment_type as string;
  const severity = input.severity as string;

  let filtered = cases.rows;
  if (caseId && caseId !== 'all') filtered = filtered.filter((c) => c.case_id === caseId);
  if (equipType) filtered = filtered.filter((c) => c.equipment_type?.toLowerCase().includes(equipType.toLowerCase()));
  if (severity) filtered = filtered.filter((c) => c.severity === severity);

  const bySeverity: Record<string, number> = {};
  const byEquipment: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const c of filtered) {
    bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
    byEquipment[c.equipment_type] = (byEquipment[c.equipment_type] || 0) + 1;
    byStatus[c.diagnosis_status] = (byStatus[c.diagnosis_status] || 0) + 1;
  }

  const avgCsat = filtered.reduce((a, c) => a + Number(c.csat_rating || 0), 0) / Math.max(filtered.filter((c) => c.csat_rating && c.csat_rating !== 'Pending').length, 1);

  return JSON.stringify({
    total_cases: filtered.length,
    by_severity: bySeverity,
    by_equipment: byEquipment,
    by_status: byStatus,
    avg_csat: avgCsat.toFixed(2),
    cases: filtered.slice(0, 15).map((c) => ({
      case_id: c.case_id,
      customer: c.customer_name,
      equipment: c.equipment_type,
      symptom: c.symptom_description,
      severity: c.severity,
      root_cause: c.root_cause,
      resolution: c.resolution,
      spare_parts: c.spare_parts_used,
      engineer: c.assigned_engineer,
      resolve_time_hrs: c.time_to_resolve_hrs,
      csat: c.csat_rating,
      status: c.diagnosis_status
    })),
    summary: `${filtered.length} service cases. ${bySeverity['Critical'] || 0} Critical, ${bySeverity['High'] || 0} High. ${byStatus['In Progress'] || 0} in progress. Avg CSAT: ${avgCsat.toFixed(2)}.`
  });
}

function executeSparePartsCheck(input: Record<string, unknown>): string {
  const parts = loadCsv('09_digital_service', 'spare_parts_inventory.csv');
  const equipType = input.equipment_type as string;
  const criticality = input.criticality as string;
  const lowStockOnly = input.low_stock_only as boolean;

  let filtered = parts.rows;
  if (equipType && equipType !== 'all') filtered = filtered.filter((p) => p.equipment_type?.toLowerCase().includes(equipType.toLowerCase()));
  if (criticality) filtered = filtered.filter((p) => p.criticality === criticality);
  if (lowStockOnly) filtered = filtered.filter((p) => Number(p.stock_qty) <= Number(p.reorder_level));

  const lowStock = filtered.filter((p) => Number(p.stock_qty) <= Number(p.reorder_level));
  const totalValue = filtered.reduce((a, p) => a + Number(p.stock_qty) * Number(p.unit_price_inr || 0), 0);

  return JSON.stringify({
    total_parts: filtered.length,
    low_stock_alerts: lowStock.length,
    total_inventory_value_inr: totalValue,
    parts: filtered.map((p) => ({
      part_id: p.part_id,
      name: p.part_name,
      equipment: p.equipment_type,
      stock: Number(p.stock_qty),
      reorder_level: Number(p.reorder_level),
      low_stock: Number(p.stock_qty) <= Number(p.reorder_level),
      unit_price: p.unit_price_inr,
      lead_time_days: p.lead_time_days,
      criticality: p.criticality,
      consumption_12m: p.consumption_12m,
      warehouse: p.warehouse_location
    })),
    low_stock_items: lowStock.map((p) => ({
      part_id: p.part_id,
      name: p.part_name,
      stock: Number(p.stock_qty),
      reorder_level: Number(p.reorder_level),
      lead_time_days: p.lead_time_days,
      criticality: p.criticality
    })),
    summary: `${filtered.length} spare parts. ${lowStock.length} below reorder level. Inventory value: ₹${(totalValue / 100000).toFixed(1)} lakhs.`
  });
}

function executeApprovalGateAnalysis(input: Record<string, unknown>): string {
  const gates = loadCsv('10_governance', 'approval_gates.csv');
  const stageFilter = input.stage_filter as string;
  const slaStatus = input.sla_status as string;

  let filtered = gates.rows;
  if (stageFilter && stageFilter !== 'all') filtered = filtered.filter((g) => g.stage === stageFilter);
  if (slaStatus) filtered = filtered.filter((g) => g.sla_status === slaStatus);

  const byDecision: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  const bySlaStatus: Record<string, number> = {};
  for (const g of filtered) {
    byDecision[g.decision] = (byDecision[g.decision] || 0) + 1;
    byStage[g.stage] = (byStage[g.stage] || 0) + 1;
    bySlaStatus[g.sla_status] = (bySlaStatus[g.sla_status] || 0) + 1;
  }

  return JSON.stringify({
    total_gates: filtered.length,
    by_decision: byDecision,
    by_stage: byStage,
    by_sla_status: bySlaStatus,
    sla_breach_rate: filtered.length > 0 ? ((bySlaStatus['Breached'] || 0) / filtered.length * 100).toFixed(1) + '%' : 'N/A',
    gates: filtered.slice(0, 15).map((g) => ({
      gate_id: g.gate_id,
      stage: g.stage,
      type: g.approval_type,
      entity_id: g.entity_id,
      approver: g.approver_name,
      decision: g.decision,
      reason: g.decision_reason,
      sla_hours: g.sla_hours,
      sla_status: g.sla_status
    })),
    summary: `${filtered.length} approval gates. ${byDecision['Approved'] || 0} Approved, ${byDecision['Rejected'] || 0} Rejected. SLA breach rate: ${filtered.length > 0 ? ((bySlaStatus['Breached'] || 0) / filtered.length * 100).toFixed(1) : 0}%.`
  });
}

function executeAuditAnalysis(input: Record<string, unknown>): string {
  const audit = loadCsv('10_governance', 'agent_audit_log.csv');
  const agentId = input.agent_id as string;
  const actionType = input.action_type as string;

  let filtered = audit.rows;
  if (agentId && agentId !== 'all') filtered = filtered.filter((a) => a.agent_id === agentId);
  if (actionType) filtered = filtered.filter((a) => a.action_type === actionType);

  const byAgent: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  let totalConfidence = 0;
  let totalLatency = 0;
  let humanRequired = 0;
  for (const a of filtered) {
    byAgent[a.agent_name] = (byAgent[a.agent_name] || 0) + 1;
    byAction[a.action_type] = (byAction[a.action_type] || 0) + 1;
    totalConfidence += Number(a.confidence_score || 0);
    totalLatency += Number(a.latency_ms || 0);
    if (a.human_intervention_required === 'Yes') humanRequired++;
  }

  return JSON.stringify({
    total_actions: filtered.length,
    by_agent: byAgent,
    by_action_type: byAction,
    avg_confidence: (totalConfidence / Math.max(filtered.length, 1)).toFixed(3),
    avg_latency_ms: (totalLatency / Math.max(filtered.length, 1)).toFixed(0),
    human_intervention_rate: filtered.length > 0 ? (humanRequired / filtered.length * 100).toFixed(1) + '%' : 'N/A',
    recent_actions: filtered.slice(0, 10).map((a) => ({
      log_id: a.log_id,
      timestamp: a.timestamp,
      agent: a.agent_name,
      action: a.action_type,
      entity: a.entity_type,
      confidence: a.confidence_score,
      human_required: a.human_intervention_required,
      latency_ms: a.latency_ms
    })),
    summary: `${filtered.length} audit entries. Avg confidence: ${(totalConfidence / Math.max(filtered.length, 1)).toFixed(3)}. Human intervention rate: ${filtered.length > 0 ? (humanRequired / filtered.length * 100).toFixed(1) : 0}%.`
  });
}

function executeOverrideReview(input: Record<string, unknown>): string {
  const overrides = loadCsv('10_governance', 'human_overrides.csv');
  const agentId = input.agent_id as string;

  let filtered = overrides.rows;
  if (agentId && agentId !== 'all') filtered = filtered.filter((o) => o.agent_id === agentId);

  const byAgent: Record<string, number> = {};
  for (const o of filtered) {
    byAgent[o.agent_name] = (byAgent[o.agent_name] || 0) + 1;
  }

  return JSON.stringify({
    total_overrides: filtered.length,
    by_agent: byAgent,
    overrides: filtered.slice(0, 15).map((o) => ({
      override_id: o.override_id,
      agent: o.agent_name,
      entity_id: o.entity_id,
      ai_recommendation: o.ai_recommendation,
      human_decision: o.human_decision,
      reason: o.override_reason,
      overrider: o.overrider_name,
      lesson: o.lesson_learned
    })),
    summary: `${filtered.length} human overrides. Most overridden: ${Object.entries(byAgent).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}.`
  });
}

function executeEscalationManagement(input: Record<string, unknown>): string {
  const escalations = loadCsv('10_governance', 'confidence_escalations.csv');
  const threshold = Number(input.threshold) || 0.8;
  const agentId = input.agent_id as string;

  let filtered = escalations.rows;
  if (agentId && agentId !== 'all') filtered = filtered.filter((e) => e.agent_id === agentId);

  const byAgent: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};
  let totalResTime = 0;
  for (const e of filtered) {
    byAgent[e.agent_name] = (byAgent[e.agent_name] || 0) + 1;
    byOutcome[e.final_outcome] = (byOutcome[e.final_outcome] || 0) + 1;
    totalResTime += Number(e.resolution_time_minutes || 0);
  }

  return JSON.stringify({
    total_escalations: filtered.length,
    confidence_threshold: threshold,
    by_agent: byAgent,
    by_outcome: byOutcome,
    avg_resolution_minutes: (totalResTime / Math.max(filtered.length, 1)).toFixed(0),
    escalations: filtered.slice(0, 15).map((e) => ({
      escalation_id: e.escalation_id,
      agent: e.agent_name,
      entity_id: e.entity_id,
      task: e.task_description,
      confidence: e.confidence_score,
      threshold: e.confidence_threshold,
      escalated_to: e.escalated_to_role,
      resolution_min: e.resolution_time_minutes,
      outcome: e.final_outcome
    })),
    summary: `${filtered.length} confidence escalations. Avg resolution: ${(totalResTime / Math.max(filtered.length, 1)).toFixed(0)} min.`
  });
}
