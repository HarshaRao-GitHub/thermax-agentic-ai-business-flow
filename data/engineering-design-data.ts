export interface EquipmentCategory {
  id: string;
  name: string;
  division: string;
  icon: string;
  sizingParams: string[];
  standards: string[];
  typicalCapacity: string;
}

export interface SizingScenario {
  id: string;
  title: string;
  category: string;
  customer: string;
  industry: string;
  fuelType: string;
  capacity: string;
  steamPressure: string;
  steamTemp: string;
  feedWaterTemp: string;
  manualDays: string;
  agenticHours: string;
  reduction: string;
  status: 'completed' | 'in-progress' | 'queued';
}

export interface AgentRole {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  inputs: string[];
  outputs: string[];
  tools: string[];
  avgTime: string;
}

export interface ComplianceItem {
  code: string;
  standard: string;
  description: string;
  applicableTo: string[];
  mandatory: boolean;
  checkType: string;
}

export interface BOMLineItem {
  itemNo: string;
  component: string;
  material: string;
  specification: string;
  quantity: string;
  unit: string;
  unitCostLakh: number;
  totalCostLakh: number;
  leadTimeWeeks: number;
  makeOrBuy: 'Make' | 'Buy';
  vendor?: string;
}

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    id: 'boiler-afbc', name: 'AFBC Boiler', division: 'Boilers', icon: '🔥',
    sizingParams: ['Steam capacity (TPH)', 'Steam pressure (kg/cm2)', 'Steam temp (C)', 'Feed water temp (C)', 'Fuel type', 'Fuel GCV (kcal/kg)'],
    standards: ['IBR-1950', 'ASME-BPVC-SEC-I', 'NFPA-85', 'CPCB-2024'],
    typicalCapacity: '20-150 TPH',
  },
  {
    id: 'boiler-cfbc', name: 'CFBC Boiler', division: 'Boilers', icon: '🔥',
    sizingParams: ['Steam capacity (TPH)', 'Steam pressure (kg/cm2)', 'Steam temp (C)', 'Fuel type', 'Fuel ash content (%)', 'Bed material'],
    standards: ['IBR-1950', 'ASME-BPVC-SEC-I', 'NFPA-85', 'IS-2062'],
    typicalCapacity: '30-250 TPH',
  },
  {
    id: 'boiler-whr', name: 'Waste Heat Recovery Boiler', division: 'Boilers', icon: '♻️',
    sizingParams: ['Flue gas flow (Nm3/hr)', 'Inlet gas temp (C)', 'Outlet gas temp (C)', 'Gas composition', 'Steam pressure (kg/cm2)', 'Dust loading (g/Nm3)'],
    standards: ['IBR-1950', 'ASME-BPVC-SEC-I', 'API-560', 'TEMA-R'],
    typicalCapacity: '5-80 TPH',
  },
  {
    id: 'heater-thermic', name: 'Thermic Fluid Heater', division: 'Heating', icon: '🌡️',
    sizingParams: ['Heat duty (lakh kcal/hr)', 'TF inlet temp (C)', 'TF outlet temp (C)', 'Fuel type', 'Max film temp (C)'],
    standards: ['API-560', 'NFPA-85', 'IS-2062', 'ASME-BPVC-SEC-VIII'],
    typicalCapacity: '5-60 lakh kcal/hr',
  },
  {
    id: 'water-ro', name: 'Reverse Osmosis Plant', division: 'Water', icon: '💧',
    sizingParams: ['Feed water flow (m3/hr)', 'Feed TDS (ppm)', 'Recovery rate (%)', 'Permeate quality (ppm)', 'Feed water source'],
    standards: ['IS-10500', 'WHO Guidelines', 'CPCB-2024'],
    typicalCapacity: '10-500 m3/hr',
  },
  {
    id: 'water-zld', name: 'Zero Liquid Discharge', division: 'Water', icon: '🔄',
    sizingParams: ['Effluent flow (m3/day)', 'Effluent TDS (ppm)', 'COD (mg/L)', 'Specific pollutants', 'Recovery target (%)'],
    standards: ['CPCB-2024', 'MOEF-2024', 'IS-10500'],
    typicalCapacity: '50-1000 m3/day',
  },
  {
    id: 'apc-fgd', name: 'Flue Gas Desulphurisation', division: 'APC', icon: '🌬️',
    sizingParams: ['Flue gas flow (Nm3/hr)', 'Inlet SO2 (mg/Nm3)', 'Target SO2 (mg/Nm3)', 'Reagent type', 'Gas temperature (C)'],
    standards: ['CPCB-2024', 'MOEF-2024', 'ASME-BPVC-SEC-VIII'],
    typicalCapacity: '100,000-2,000,000 Nm3/hr',
  },
];

export const AGENT_ROLES: AgentRole[] = [
  {
    id: 'requirement-parsing',
    name: 'Requirement Parsing Agent',
    icon: '📋',
    color: 'blue',
    description: 'Parses customer RFQ using NLP and Thermax domain ontology. Extracts fuel type, load profile, duty cycle, site conditions, and constraint parameters.',
    inputs: ['Customer RFQ document', 'Fuel specifications', 'Site ambient conditions', 'Duty cycle requirements'],
    outputs: ['Structured requirement matrix', 'Equipment type recommendation', 'Missing parameter flags'],
    tools: ['NLP Extraction Engine', 'Domain Ontology Mapper', 'Requirement Validator'],
    avgTime: '10-15 min',
  },
  {
    id: 'sizing',
    name: 'Sizing Agent',
    icon: '📐',
    color: 'green',
    description: 'Performs thermodynamic calculations, heat balance, mass balance, and equipment sizing using Thermax proprietary calculation engines.',
    inputs: ['Structured requirement matrix', 'Fuel analysis data', 'Design standards'],
    outputs: ['Heat balance sheet', 'Mass balance', 'Equipment sizing datasheet', 'Performance guarantees'],
    tools: ['Thermodynamic Calculator', 'Heat Balance Engine', 'Steam Table Lookup', 'Fuel Analysis Module'],
    avgTime: '30-60 min',
  },
  {
    id: 'configuration',
    name: 'Configuration Agent',
    icon: '⚙️',
    color: 'purple',
    description: 'Selects optimal equipment configuration — boiler type, pressure class, drum layout, combustion system, and auxiliary equipment arrangement.',
    inputs: ['Equipment sizing datasheet', 'Product catalog', 'Site layout constraints'],
    outputs: ['Equipment configuration', 'GA drawing parameters', 'Auxiliary equipment list', '3D layout suggestions'],
    tools: ['Product Selector', 'Configuration Optimizer', 'Layout Generator', 'Thermax Product Database'],
    avgTime: '20-40 min',
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    icon: '✅',
    color: 'teal',
    description: 'Validates design against IBR, ASME, EN, CPCB, and other applicable standards. Flags non-compliances and suggests corrective actions.',
    inputs: ['Equipment configuration', 'Sizing datasheet', 'Applicable standards list'],
    outputs: ['Compliance report', 'Non-compliance flags', 'Material certification requirements', 'Test requirements'],
    tools: ['Standards Library (IBR/ASME/EN)', 'Material Grade Validator', 'Emission Calculator', 'Safety Interlock Checker'],
    avgTime: '15-25 min',
  },
  {
    id: 'cost-estimation',
    name: 'Cost Estimation Agent',
    icon: '💰',
    color: 'amber',
    description: 'Generates detailed BOM with current market pricing, calculates total project cost, and evaluates make-vs-buy decisions for each component.',
    inputs: ['Equipment configuration', 'Compliance report', 'Vendor master', 'Current market prices'],
    outputs: ['Detailed BOM', 'Cost breakdown', 'Make-vs-buy analysis', 'Lead time estimate', 'Payment milestone plan'],
    tools: ['BOM Generator', 'Market Price Engine', 'Vendor Quotation Matcher', 'Make-Buy Classifier'],
    avgTime: '20-30 min',
  },
  {
    id: 'proposal-generation',
    name: 'Proposal Generation Agent',
    icon: '📄',
    color: 'rose',
    description: 'Compiles all outputs into a professional proposal document with datasheets, drawings, compliance certificates, and commercial terms.',
    inputs: ['Sizing datasheet', 'Configuration', 'Compliance report', 'BOM and cost'],
    outputs: ['Technical proposal document', 'Equipment datasheets', 'GA drawing package', 'Commercial offer'],
    tools: ['Document Composer', 'Datasheet Generator', 'Drawing Annotator', 'PDF Renderer'],
    avgTime: '15-20 min',
  },
];

export const SIZING_SCENARIOS: SizingScenario[] = [
  {
    id: 'SC-001', title: '45 TPH AFBC Boiler for Sugar Mill', category: 'boiler-afbc',
    customer: 'Balrampur Chini Mills', industry: 'Sugar', fuelType: 'Bagasse + Coal (70:30)',
    capacity: '45 TPH', steamPressure: '45 kg/cm2', steamTemp: '485 C', feedWaterTemp: '150 C',
    manualDays: '4 days', agenticHours: '3 hours', reduction: '91%', status: 'completed',
  },
  {
    id: 'SC-002', title: '100 TPH CFBC Boiler for Steel Plant', category: 'boiler-cfbc',
    customer: 'JSW Steel', industry: 'Steel', fuelType: 'Coal (Indian E-grade)',
    capacity: '100 TPH', steamPressure: '87 kg/cm2', steamTemp: '540 C', feedWaterTemp: '180 C',
    manualDays: '5 days', agenticHours: '4.5 hours', reduction: '89%', status: 'completed',
  },
  {
    id: 'SC-003', title: 'WHRS for Cement Kiln Exhaust', category: 'boiler-whr',
    customer: 'UltraTech Cement', industry: 'Cement', fuelType: 'Kiln exhaust gas',
    capacity: '25 TPH', steamPressure: '35 kg/cm2', steamTemp: '380 C', feedWaterTemp: '120 C',
    manualDays: '6 days', agenticHours: '5 hours', reduction: '88%', status: 'completed',
  },
  {
    id: 'SC-004', title: 'ZLD System for Textile Effluent', category: 'water-zld',
    customer: 'Arvind Limited', industry: 'Textile', fuelType: 'N/A',
    capacity: '500 m3/day', steamPressure: 'N/A', steamTemp: 'N/A', feedWaterTemp: 'N/A',
    manualDays: '5 days', agenticHours: '4 hours', reduction: '85%', status: 'completed',
  },
  {
    id: 'SC-005', title: 'FGD System for 2x660 MW Power Plant', category: 'apc-fgd',
    customer: 'NTPC Sipat', industry: 'Power', fuelType: 'Limestone slurry',
    capacity: '2,000,000 Nm3/hr', steamPressure: 'N/A', steamTemp: 'N/A', feedWaterTemp: 'N/A',
    manualDays: '7 days', agenticHours: '6 hours', reduction: '83%', status: 'in-progress',
  },
  {
    id: 'SC-006', title: 'Thermic Fluid Heater for Pharma', category: 'heater-thermic',
    customer: 'Cipla Ltd', industry: 'Pharma', fuelType: 'Natural Gas',
    capacity: '30 lakh kcal/hr', steamPressure: 'N/A', steamTemp: '280 C (TF outlet)', feedWaterTemp: 'N/A',
    manualDays: '3 days', agenticHours: '2 hours', reduction: '90%', status: 'completed',
  },
];

export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { code: 'IBR-1950', standard: 'Indian Boiler Regulations', description: 'Mandatory registration and inspection for all boilers', applicableTo: ['Boilers', 'Pressure Vessels'], mandatory: true, checkType: 'Design + Manufacturing' },
  { code: 'ASME-SEC-I', standard: 'ASME Boiler & Pressure Vessel Code Section I', description: 'Power boiler design and construction', applicableTo: ['Power Boilers', 'HRSG'], mandatory: true, checkType: 'Design' },
  { code: 'ASME-SEC-VIII', standard: 'ASME BPVC Section VIII Div 1', description: 'Unfired pressure vessel design', applicableTo: ['Deaerators', 'Drums', 'Heat Exchangers'], mandatory: true, checkType: 'Design' },
  { code: 'IS-2062', standard: 'Indian Standard Hot Rolled Steel', description: 'Structural steel for industrial equipment', applicableTo: ['All Structural Components'], mandatory: true, checkType: 'Material' },
  { code: 'NFPA-85', standard: 'Boiler & Combustion Systems Hazards Code', description: 'Safety interlocks and combustion safeguards', applicableTo: ['All Combustion Equipment'], mandatory: true, checkType: 'Safety' },
  { code: 'CPCB-2024', standard: 'Central Pollution Control Board Phase III', description: 'Emission limits: NOx<100, SOx<200, PM<30 mg/Nm3', applicableTo: ['All Emission Sources'], mandatory: true, checkType: 'Environmental' },
  { code: 'MOEF-2024', standard: 'Ministry of Environment Norms', description: 'Environmental clearance and ZLD mandates', applicableTo: ['Water Treatment', 'APC'], mandatory: true, checkType: 'Environmental' },
  { code: 'API-560', standard: 'Fired Heaters for General Refinery Service', description: 'Thermic fluid heater design standards', applicableTo: ['Thermic Fluid Heaters'], mandatory: true, checkType: 'Design' },
  { code: 'TEMA-R', standard: 'Tubular Exchanger Manufacturers Association', description: 'Heat exchanger design — Class R for refinery', applicableTo: ['Heat Exchangers', 'Economizers'], mandatory: false, checkType: 'Design' },
  { code: 'IS-10500', standard: 'Indian Standard Drinking Water', description: 'Water quality specifications', applicableTo: ['Water Treatment Plants'], mandatory: true, checkType: 'Quality' },
];

export const SAMPLE_BOM: BOMLineItem[] = [
  { itemNo: '1.0', component: 'Steam Drum (Mud + Steam)', material: 'SA-516 Gr 70', specification: 'IBR approved, 1500mm ID x 12000mm L', quantity: '1', unit: 'Set', unitCostLakh: 42, totalCostLakh: 42, leadTimeWeeks: 16, makeOrBuy: 'Make' },
  { itemNo: '2.0', component: 'Evaporator Bank Tubes', material: 'SA-210 Gr A1', specification: 'OD 51mm x 3.25mm thk, bent', quantity: '2400', unit: 'Nos', unitCostLakh: 0.018, totalCostLakh: 43.2, leadTimeWeeks: 12, makeOrBuy: 'Make' },
  { itemNo: '3.0', component: 'Superheater Tubes', material: 'SA-213 T11', specification: 'OD 44.5mm x 3.5mm thk', quantity: '480', unit: 'Nos', unitCostLakh: 0.035, totalCostLakh: 16.8, leadTimeWeeks: 14, makeOrBuy: 'Make' },
  { itemNo: '4.0', component: 'Economizer Coils', material: 'SA-210 Gr A1', specification: 'OD 44.5mm x 3.25mm, finned', quantity: '360', unit: 'Nos', unitCostLakh: 0.028, totalCostLakh: 10.08, leadTimeWeeks: 10, makeOrBuy: 'Make' },
  { itemNo: '5.0', component: 'Air Preheater (Tubular)', material: 'IS-3589 Gr 330', specification: 'OD 63.5mm x 2.9mm', quantity: '1', unit: 'Set', unitCostLakh: 28, totalCostLakh: 28, leadTimeWeeks: 12, makeOrBuy: 'Make' },
  { itemNo: '6.0', component: 'FD Fan', material: 'IS-2062', specification: '85,000 m3/hr, 250 mmWC', quantity: '2', unit: 'Nos', unitCostLakh: 12.5, totalCostLakh: 25, leadTimeWeeks: 18, makeOrBuy: 'Buy', vendor: 'TLT Babcock' },
  { itemNo: '7.0', component: 'ID Fan', material: 'IS-2062', specification: '120,000 m3/hr, 350 mmWC', quantity: '2', unit: 'Nos', unitCostLakh: 18.5, totalCostLakh: 37, leadTimeWeeks: 18, makeOrBuy: 'Buy', vendor: 'TLT Babcock' },
  { itemNo: '8.0', component: 'Electrostatic Precipitator', material: 'IS-2062', specification: '3-field ESP, 99.5% efficiency', quantity: '1', unit: 'Set', unitCostLakh: 145, totalCostLakh: 145, leadTimeWeeks: 24, makeOrBuy: 'Buy', vendor: 'Thermax APC Div' },
  { itemNo: '9.0', component: 'Feed Water Pump', material: 'SS-316', specification: '55 m3/hr, 65 kg/cm2', quantity: '2', unit: 'Nos', unitCostLakh: 8.5, totalCostLakh: 17, leadTimeWeeks: 14, makeOrBuy: 'Buy', vendor: 'KSB Pumps' },
  { itemNo: '10.0', component: 'Deaerator', material: 'SA-516 Gr 70', specification: '60 m3/hr, spray type', quantity: '1', unit: 'Set', unitCostLakh: 22, totalCostLakh: 22, leadTimeWeeks: 14, makeOrBuy: 'Make' },
  { itemNo: '11.0', component: 'Safety Valves', material: 'Forged Steel', specification: 'IBR approved, spring loaded', quantity: '4', unit: 'Nos', unitCostLakh: 3.8, totalCostLakh: 15.2, leadTimeWeeks: 10, makeOrBuy: 'Buy', vendor: 'Dresser' },
  { itemNo: '12.0', component: 'DCS Control System', material: 'N/A', specification: 'Redundant DCS with HMI', quantity: '1', unit: 'Set', unitCostLakh: 85, totalCostLakh: 85, leadTimeWeeks: 16, makeOrBuy: 'Buy', vendor: 'ABB/Honeywell' },
  { itemNo: '13.0', component: 'Refractory & Insulation', material: 'IS-8 Castable + Mineral Wool', specification: '100mm castable + 150mm insulation', quantity: '1', unit: 'Lot', unitCostLakh: 35, totalCostLakh: 35, leadTimeWeeks: 8, makeOrBuy: 'Buy', vendor: 'Carborundum' },
  { itemNo: '14.0', component: 'Structural Steel', material: 'IS-2062', specification: 'Boiler supporting structure, 180 MT', quantity: '180', unit: 'MT', unitCostLakh: 0.85, totalCostLakh: 153, leadTimeWeeks: 12, makeOrBuy: 'Make' },
  { itemNo: '15.0', component: 'Piping & Valves Package', material: 'Various', specification: 'IBR piping, valves, fittings', quantity: '1', unit: 'Lot', unitCostLakh: 65, totalCostLakh: 65, leadTimeWeeks: 14, makeOrBuy: 'Buy', vendor: 'Various' },
];

export const TIME_COMPARISON = [
  { task: 'Boiler sizing and selection', manualTime: '3-5 days', agenticTime: '2-4 hours', reduction: '~90%' },
  { task: 'WHRS configuration', manualTime: '5-7 days', agenticTime: '4-6 hours', reduction: '~88%' },
  { task: 'ZLD/water treatment design', manualTime: '4-6 days', agenticTime: '3-5 hours', reduction: '~85%' },
  { task: 'FGD system sizing', manualTime: '5-8 days', agenticTime: '6-8 hours', reduction: '~83%' },
  { task: 'Full proposal document', manualTime: '2-3 days', agenticTime: '30-60 minutes', reduction: '~95%' },
];

export function buildEngineeringDesignContextForAI(): string {
  let ctx = '=== THERMAX AGENTIC ENGINEERING DESIGN SYSTEM ===\n\n';

  ctx += '--- EQUIPMENT CATEGORIES ---\n';
  for (const eq of EQUIPMENT_CATEGORIES) {
    ctx += `[${eq.id}] ${eq.name} | Division: ${eq.division} | Capacity: ${eq.typicalCapacity}\n`;
    ctx += `  Sizing Params: ${eq.sizingParams.join(', ')}\n`;
    ctx += `  Standards: ${eq.standards.join(', ')}\n`;
  }

  ctx += '\n--- AGENT PIPELINE (6 agents in sequence) ---\n';
  for (const agent of AGENT_ROLES) {
    ctx += `\n[${agent.id}] ${agent.name} | Avg Time: ${agent.avgTime}\n`;
    ctx += `  ${agent.description}\n`;
    ctx += `  Inputs: ${agent.inputs.join(', ')}\n`;
    ctx += `  Outputs: ${agent.outputs.join(', ')}\n`;
    ctx += `  Tools: ${agent.tools.join(', ')}\n`;
  }

  ctx += '\n--- COMPLETED DESIGN SCENARIOS ---\n';
  for (const sc of SIZING_SCENARIOS) {
    ctx += `\n[${sc.id}] ${sc.title} | Customer: ${sc.customer} | Industry: ${sc.industry}\n`;
    ctx += `  Category: ${sc.category} | Fuel: ${sc.fuelType} | Capacity: ${sc.capacity}\n`;
    ctx += `  Steam: ${sc.steamPressure} @ ${sc.steamTemp} | Feed Water: ${sc.feedWaterTemp}\n`;
    ctx += `  Manual: ${sc.manualDays} -> Agentic: ${sc.agenticHours} (${sc.reduction} reduction)\n`;
  }

  ctx += '\n--- COMPLIANCE STANDARDS ---\n';
  for (const c of COMPLIANCE_ITEMS) {
    ctx += `[${c.code}] ${c.standard} | ${c.description} | Mandatory: ${c.mandatory} | Type: ${c.checkType}\n`;
  }

  ctx += '\n--- SAMPLE BOM (45 TPH AFBC Boiler) ---\n';
  ctx += 'Item | Component | Material | Qty | Cost (Lakh) | Lead Time | Make/Buy\n';
  for (const b of SAMPLE_BOM) {
    ctx += `${b.itemNo} | ${b.component} | ${b.material} | ${b.quantity} ${b.unit} | ${b.totalCostLakh} | ${b.leadTimeWeeks}w | ${b.makeOrBuy}${b.vendor ? ` (${b.vendor})` : ''}\n`;
  }
  const totalCost = SAMPLE_BOM.reduce((s, b) => s + b.totalCostLakh, 0);
  ctx += `TOTAL ESTIMATED COST: INR ${totalCost.toFixed(1)} Lakh\n`;

  ctx += '\n--- TIME COMPARISON (Manual vs Agentic AI) ---\n';
  for (const t of TIME_COMPARISON) {
    ctx += `${t.task}: Manual ${t.manualTime} -> Agentic ${t.agenticTime} (${t.reduction})\n`;
  }

  return ctx;
}
