export interface ExtractionCategory {
  id: string;
  name: string;
  description: string;
  pack: 'estimation' | 'risk' | 'both' | 'general';
}

export interface DivisionTemplate {
  id: string;
  name: string;
  icon: string;
  categories: ExtractionCategory[];
}

export const EXTRACTION_CATEGORIES: ExtractionCategory[] = [
  { id: 'scope', name: 'Scope of Work', description: 'Project scope, deliverables, boundaries, inclusions and exclusions', pack: 'general' },
  { id: 'technical', name: 'Key Technical Parameters', description: 'Capacity, pressure, temperature, flow rates, fuel specs, performance requirements', pack: 'estimation' },
  { id: 'moc', name: 'Material of Construction (MOC)', description: 'Specified materials, exotic alloys, corrosion requirements, material certifications', pack: 'estimation' },
  { id: 'tnc', name: 'Terms & Conditions', description: 'Payment terms, delivery schedule, warranty period, insurance requirements', pack: 'risk' },
  { id: 'special', name: 'Special Clauses', description: 'LD clauses, performance guarantee, penalty provisions, force majeure, IP rights', pack: 'risk' },
  { id: 'commercial', name: 'Commercial Requirements', description: 'Pricing structure, bid bond, EMD, price variation formula, taxes', pack: 'estimation' },
  { id: 'compliance', name: 'Compliance & Certifications', description: 'ISO, IBR, ASME, CE, BIS certifications, statutory approvals, environmental clearances', pack: 'general' },
  { id: 'timeline', name: 'Submission Timeline & Format', description: 'Bid submission deadline, format requirements, number of copies, e-tendering portal details', pack: 'general' },
];

export const DIVISION_TEMPLATES: DivisionTemplate[] = [
  {
    id: 'water-treatment',
    name: 'Water Treatment',
    icon: '💧',
    categories: [
      ...EXTRACTION_CATEGORIES,
      { id: 'water-source', name: 'Raw Water Source & Quality', description: 'Source water type, TDS, hardness, silica, pH, turbidity, seasonal variation', pack: 'estimation' },
      { id: 'treated-water', name: 'Treated Water Specifications', description: 'Output quality requirements, TDS, conductivity, silica limits, pH range', pack: 'estimation' },
      { id: 'chemicals', name: 'Chemical Regime', description: 'Required chemicals, dosing requirements, approved chemical vendors, storage requirements', pack: 'estimation' },
    ],
  },
  {
    id: 'boilers',
    name: 'Boilers',
    icon: '🔥',
    categories: [
      ...EXTRACTION_CATEGORIES,
      { id: 'fuel-spec', name: 'Fuel Specifications', description: 'Fuel type, GCV, moisture, ash content, volatile matter, multi-fuel requirements', pack: 'estimation' },
      { id: 'steam-params', name: 'Steam Parameters', description: 'Steam pressure, temperature, quality, flow rate, turndown ratio', pack: 'estimation' },
      { id: 'emissions', name: 'Emission Norms', description: 'SPM, SOx, NOx limits, CPCB/SPCB requirements, stack height, CEMS requirements', pack: 'both' },
    ],
  },
  {
    id: 'heating',
    name: 'Heating Systems',
    icon: '♨️',
    categories: [
      ...EXTRACTION_CATEGORIES,
      { id: 'process-req', name: 'Process Requirements', description: 'Heating medium, temperature range, heat duty, process fluid properties', pack: 'estimation' },
      { id: 'heat-recovery', name: 'Heat Recovery Scope', description: 'Waste heat source, temperature, flow, recovery potential, integration requirements', pack: 'estimation' },
      { id: 'energy-audit', name: 'Energy Audit Compliance', description: 'PAT scheme applicability, designated consumer status, energy savings targets', pack: 'both' },
    ],
  },
  {
    id: 'solar-water',
    name: 'Solar Water Systems',
    icon: '☀️',
    categories: [
      ...EXTRACTION_CATEGORIES,
      { id: 'solar-resource', name: 'Solar Resource Data', description: 'Location DNI/GHI, land availability, grid connectivity, net metering requirements', pack: 'estimation' },
      { id: 'integration', name: 'System Integration', description: 'Existing system interface, backup requirements, control system integration, SCADA', pack: 'estimation' },
      { id: 'subsidy', name: 'Subsidy & Incentive', description: 'MNRE scheme, state subsidy, REC eligibility, carbon credit requirements', pack: 'both' },
    ],
  },
  {
    id: 'air-pollution-control',
    name: 'Air Pollution Control (ESP/Bag Filter/FGD)',
    icon: '🌬️',
    categories: [
      ...EXTRACTION_CATEGORIES,
      { id: 'gas-params', name: 'Flue Gas Parameters', description: 'Gas flow rate, temperature, dust concentration, gas composition (CO2, SO2, moisture), dust resistivity, particle size distribution', pack: 'estimation' },
      { id: 'esp-design', name: 'ESP/APC Design Requirements', description: 'Number of fields, SCA, collection efficiency, electrode type, rapping system, hopper design, gas distribution requirements', pack: 'estimation' },
      { id: 'emission-norms', name: 'Emission Norms & Environmental', description: 'CPCB/SPCB emission limits, CEMS requirements, stack parameters, ambient air quality standards, regulatory compliance', pack: 'both' },
      { id: 'electrical-control', name: 'Electrical & Control System', description: 'TR set specifications, ESP controller features, DCS integration, remote monitoring, power consumption guarantees', pack: 'estimation' },
      { id: 'performance-guarantee', name: 'Performance Guarantees & Penalties', description: 'Outlet emission guarantee, pressure drop, power consumption, availability, LD clauses, penalty calculations', pack: 'risk' },
    ],
  },
];

export const SAMPLE_TENDERS = [
  {
    id: 'tender-water-1',
    name: 'RFP - 200 m3/hr ZLD Water Treatment Plant',
    division: 'water-treatment',
    file: '/sample-data/ai-nexus/tenders/water_treatment_rfp.txt',
    pages: 180,
  },
  {
    id: 'tender-boiler-1',
    name: 'Tender - 100 TPH CFBC Boiler for Cement Plant',
    division: 'boilers',
    file: '/sample-data/ai-nexus/tenders/boiler_tender_cfbc.txt',
    pages: 250,
  },
  {
    id: 'tender-heating-1',
    name: 'RFP - 10M kcal/hr Thermic Fluid Heater System',
    division: 'heating',
    file: '/sample-data/ai-nexus/tenders/heating_system_rfp.txt',
    pages: 120,
  },
  {
    id: 'tender-solar-1',
    name: 'Tender - 5 MW Solar Thermal Concentrator Project',
    division: 'solar-water',
    file: '/sample-data/ai-nexus/tenders/solar_thermal_tender.txt',
    pages: 150,
  },
  {
    id: 'tender-esp-1',
    name: 'RFP - ESP for Cement Plant Kiln/Raw Mill (320,000 Am3/hr)',
    division: 'air-pollution-control',
    file: '/sample-data/ai-nexus/tenders/esp_cement_rfp.txt',
    pages: 220,
  },
];
