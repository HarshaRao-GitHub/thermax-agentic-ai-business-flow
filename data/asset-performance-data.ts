export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  site: string;
  siteId: string;
  status: 'online' | 'offline' | 'alert';
  dataConnected: boolean;
  healthScore: number;
  efficiency: number;
  lastReading: string;
  vitals: Record<string, { value: number; unit: string; min: number; max: number; status: 'normal' | 'warning' | 'critical' }>;
}

export type AssetType = 'boiler' | 'heater' | 'water-treatment' | 'solar-thermal';

export interface FailureMode {
  id: string;
  assetType: AssetType;
  code: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  symptoms: string[];
  rootCauses: string[];
  actions: string[];
}

export interface Incident {
  id: string;
  assetId: string;
  assetName: string;
  site: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  deviation: string;
  failureModeCode: string;
  aiRootCause: string;
  recommendedAction: string;
  status: 'open' | 'acknowledged' | 'resolved';
  comments: string[];
}

export interface Site {
  id: string;
  name: string;
  location: string;
  assetCount: number;
}

export const SITES: Site[] = [
  { id: 'site-1', name: 'Pune Chemical Complex', location: 'Pune, Maharashtra', assetCount: 4 },
  { id: 'site-2', name: 'Gujarat Refinery Plant', location: 'Vadodara, Gujarat', assetCount: 3 },
  { id: 'site-3', name: 'Hyderabad Food Processing', location: 'Hyderabad, Telangana', assetCount: 3 },
  { id: 'site-4', name: 'Chennai Pharma Unit', location: 'Chennai, Tamil Nadu', assetCount: 2 },
];

export const ASSETS: Asset[] = [
  {
    id: 'AST-001', name: '45 TPH AFBC Boiler', type: 'boiler', site: 'Pune Chemical Complex', siteId: 'site-1',
    status: 'online', dataConnected: true, healthScore: 87, efficiency: 82.3, lastReading: '2026-04-25T06:30:00Z',
    vitals: {
      steamPressure: { value: 44.2, unit: 'kg/cm2', min: 40, max: 48, status: 'normal' },
      steamTemperature: { value: 485, unit: 'C', min: 460, max: 510, status: 'normal' },
      feedWaterTemp: { value: 152, unit: 'C', min: 140, max: 165, status: 'normal' },
      bedTemperature: { value: 870, unit: 'C', min: 820, max: 920, status: 'normal' },
      stackTemperature: { value: 168, unit: 'C', min: 140, max: 180, status: 'warning' },
      oxygenLevel: { value: 4.8, unit: '%', min: 3, max: 6, status: 'normal' },
    },
  },
  {
    id: 'AST-002', name: '20 TPH FBC Boiler', type: 'boiler', site: 'Pune Chemical Complex', siteId: 'site-1',
    status: 'alert', dataConnected: true, healthScore: 62, efficiency: 74.1, lastReading: '2026-04-25T06:28:00Z',
    vitals: {
      steamPressure: { value: 18.5, unit: 'kg/cm2', min: 16, max: 22, status: 'normal' },
      steamTemperature: { value: 355, unit: 'C', min: 340, max: 370, status: 'normal' },
      feedWaterTemp: { value: 108, unit: 'C', min: 100, max: 125, status: 'normal' },
      bedTemperature: { value: 940, unit: 'C', min: 820, max: 920, status: 'critical' },
      stackTemperature: { value: 192, unit: 'C', min: 140, max: 180, status: 'critical' },
      fdFanBearingTemp: { value: 78, unit: 'C', min: 40, max: 75, status: 'critical' },
    },
  },
  {
    id: 'AST-003', name: 'Thermic Fluid Heater 3M kcal/hr', type: 'heater', site: 'Pune Chemical Complex', siteId: 'site-1',
    status: 'online', dataConnected: true, healthScore: 91, efficiency: 86.7, lastReading: '2026-04-25T06:25:00Z',
    vitals: {
      outletTemp: { value: 285, unit: 'C', min: 260, max: 300, status: 'normal' },
      inletTemp: { value: 248, unit: 'C', min: 230, max: 260, status: 'normal' },
      flowRate: { value: 125, unit: 'm3/hr', min: 100, max: 150, status: 'normal' },
      flueGasTemp: { value: 245, unit: 'C', min: 200, max: 280, status: 'normal' },
      coilPressureDrop: { value: 2.1, unit: 'kg/cm2', min: 1.5, max: 3, status: 'normal' },
    },
  },
  {
    id: 'AST-004', name: 'DM Water Treatment Plant 50 m3/hr', type: 'water-treatment', site: 'Pune Chemical Complex', siteId: 'site-1',
    status: 'online', dataConnected: true, healthScore: 79, efficiency: 92.1, lastReading: '2026-04-25T06:20:00Z',
    vitals: {
      outputTDS: { value: 2.3, unit: 'ppm', min: 0, max: 5, status: 'normal' },
      inputTDS: { value: 450, unit: 'ppm', min: 200, max: 600, status: 'normal' },
      flowRate: { value: 42, unit: 'm3/hr', min: 30, max: 55, status: 'normal' },
      pH: { value: 7.2, unit: '', min: 6.5, max: 8.5, status: 'normal' },
      recoveryRate: { value: 78, unit: '%', min: 70, max: 90, status: 'normal' },
    },
  },
  {
    id: 'AST-005', name: '30 TPH Biomass Boiler', type: 'boiler', site: 'Gujarat Refinery Plant', siteId: 'site-2',
    status: 'online', dataConnected: true, healthScore: 84, efficiency: 79.5, lastReading: '2026-04-25T06:30:00Z',
    vitals: {
      steamPressure: { value: 32.8, unit: 'kg/cm2', min: 28, max: 35, status: 'normal' },
      steamTemperature: { value: 420, unit: 'C', min: 400, max: 440, status: 'normal' },
      bedTemperature: { value: 855, unit: 'C', min: 820, max: 920, status: 'normal' },
      stackTemperature: { value: 175, unit: 'C', min: 140, max: 180, status: 'warning' },
      fuelFeedRate: { value: 4.2, unit: 'TPH', min: 3, max: 5, status: 'normal' },
    },
  },
  {
    id: 'AST-006', name: 'Waste Heat Recovery Boiler', type: 'boiler', site: 'Gujarat Refinery Plant', siteId: 'site-2',
    status: 'online', dataConnected: true, healthScore: 93, efficiency: 88.2, lastReading: '2026-04-25T06:28:00Z',
    vitals: {
      steamPressure: { value: 10.5, unit: 'kg/cm2', min: 8, max: 12, status: 'normal' },
      steamTemperature: { value: 195, unit: 'C', min: 180, max: 210, status: 'normal' },
      exhaustGasInlet: { value: 520, unit: 'C', min: 450, max: 600, status: 'normal' },
      exhaustGasOutlet: { value: 175, unit: 'C', min: 150, max: 200, status: 'normal' },
      heatRecoveryRate: { value: 72, unit: '%', min: 65, max: 80, status: 'normal' },
    },
  },
  {
    id: 'AST-007', name: 'Solar Thermal Concentrator Array', type: 'solar-thermal', site: 'Gujarat Refinery Plant', siteId: 'site-2',
    status: 'online', dataConnected: true, healthScore: 88, efficiency: 68.4, lastReading: '2026-04-25T06:30:00Z',
    vitals: {
      htfOutletTemp: { value: 310, unit: 'C', min: 250, max: 350, status: 'normal' },
      htfInletTemp: { value: 220, unit: 'C', min: 180, max: 250, status: 'normal' },
      solarIrradiance: { value: 820, unit: 'W/m2', min: 0, max: 1000, status: 'normal' },
      mirrorReflectivity: { value: 91, unit: '%', min: 85, max: 97, status: 'normal' },
      thermalOutput: { value: 2.8, unit: 'MW', min: 0, max: 4, status: 'normal' },
    },
  },
  {
    id: 'AST-008', name: '60 TPH CFBC Boiler', type: 'boiler', site: 'Hyderabad Food Processing', siteId: 'site-3',
    status: 'alert', dataConnected: true, healthScore: 58, efficiency: 71.2, lastReading: '2026-04-25T06:25:00Z',
    vitals: {
      steamPressure: { value: 66, unit: 'kg/cm2', min: 60, max: 70, status: 'normal' },
      steamTemperature: { value: 540, unit: 'C', min: 520, max: 550, status: 'normal' },
      bedTemperature: { value: 910, unit: 'C', min: 820, max: 920, status: 'warning' },
      stackTemperature: { value: 195, unit: 'C', min: 140, max: 180, status: 'critical' },
      tubeMetal: { value: 510, unit: 'C', min: 400, max: 480, status: 'critical' },
      superheaterSpray: { value: 8.5, unit: 'TPH', min: 2, max: 6, status: 'critical' },
    },
  },
  {
    id: 'AST-009', name: 'Hot Water Generator 5M kcal/hr', type: 'heater', site: 'Hyderabad Food Processing', siteId: 'site-3',
    status: 'online', dataConnected: true, healthScore: 90, efficiency: 91.3, lastReading: '2026-04-25T06:30:00Z',
    vitals: {
      hotWaterOutlet: { value: 95, unit: 'C', min: 85, max: 100, status: 'normal' },
      hotWaterInlet: { value: 65, unit: 'C', min: 55, max: 75, status: 'normal' },
      flowRate: { value: 180, unit: 'm3/hr', min: 150, max: 200, status: 'normal' },
      burnerEfficiency: { value: 91.3, unit: '%', min: 85, max: 95, status: 'normal' },
    },
  },
  {
    id: 'AST-010', name: 'RO + UF Water Treatment 100 m3/hr', type: 'water-treatment', site: 'Hyderabad Food Processing', siteId: 'site-3',
    status: 'offline', dataConnected: true, healthScore: 45, efficiency: 0, lastReading: '2026-04-24T18:00:00Z',
    vitals: {
      outputTDS: { value: 0, unit: 'ppm', min: 0, max: 5, status: 'normal' },
      membranePressure: { value: 0, unit: 'bar', min: 8, max: 15, status: 'critical' },
      flowRate: { value: 0, unit: 'm3/hr', min: 60, max: 110, status: 'critical' },
      pH: { value: 0, unit: '', min: 6.5, max: 8.5, status: 'critical' },
    },
  },
  {
    id: 'AST-011', name: '15 TPH Oil/Gas Fired Boiler', type: 'boiler', site: 'Chennai Pharma Unit', siteId: 'site-4',
    status: 'online', dataConnected: true, healthScore: 95, efficiency: 90.8, lastReading: '2026-04-25T06:30:00Z',
    vitals: {
      steamPressure: { value: 10.5, unit: 'kg/cm2', min: 8, max: 12, status: 'normal' },
      steamTemperature: { value: 185, unit: 'C', min: 175, max: 195, status: 'normal' },
      exhaustTemp: { value: 178, unit: 'C', min: 150, max: 200, status: 'normal' },
      fuelConsumption: { value: 620, unit: 'kg/hr', min: 500, max: 800, status: 'normal' },
      waterLevel: { value: 62, unit: '%', min: 50, max: 80, status: 'normal' },
    },
  },
  {
    id: 'AST-012', name: 'Absorption Chiller 500 TR', type: 'heater', site: 'Chennai Pharma Unit', siteId: 'site-4',
    status: 'online', dataConnected: true, healthScore: 82, efficiency: 1.35, lastReading: '2026-04-25T06:30:00Z',
    vitals: {
      chilledWaterOut: { value: 7.2, unit: 'C', min: 5, max: 9, status: 'normal' },
      chilledWaterIn: { value: 12.8, unit: 'C', min: 10, max: 15, status: 'normal' },
      hotWaterIn: { value: 92, unit: 'C', min: 85, max: 100, status: 'normal' },
      coolingWaterIn: { value: 32, unit: 'C', min: 28, max: 35, status: 'normal' },
      cop: { value: 1.35, unit: 'COP', min: 1.2, max: 1.6, status: 'normal' },
    },
  },
];

export const FAILURE_MODES: FailureMode[] = [
  { id: 'FM-001', assetType: 'boiler', code: 'BLR-TF-001', name: 'Superheater Tube Failure', severity: 'critical',
    symptoms: ['Sudden drop in steam temperature', 'Abnormal spray water consumption', 'Tube metal temperature exceeding limits', 'Unusual noise from superheater area'],
    rootCauses: ['Long-term overheating due to inadequate desuperheating', 'Fly ash erosion on tube bends', 'Coal ash corrosion from high sodium/potassium content', 'Manufacturing defect in tube welding'],
    actions: ['Immediate shutdown and hydrostatic test', 'Inspect tube thickness with UT', 'Replace affected tubes with upgraded alloy', 'Review desuperheating spray control logic'] },
  { id: 'FM-002', assetType: 'boiler', code: 'BLR-BD-001', name: 'Bed Agglomeration in FBC', severity: 'critical',
    symptoms: ['Bed temperature rising above 950C', 'Bed pressure drop decreasing', 'Clinker formation visible in bed drain', 'Uneven temperature distribution across bed'],
    rootCauses: ['High sodium/potassium in fuel ash', 'Inadequate bed material replenishment', 'Loss of fluidization due to air distribution plate blockage', 'Fuel moisture variation causing temperature spikes'],
    actions: ['Emergency bed drain and replace with fresh sand', 'Analyze fuel ash composition', 'Inspect air distribution plate nozzles', 'Adjust fuel blend to control alkali content'] },
  { id: 'FM-003', assetType: 'boiler', code: 'BLR-FN-001', name: 'FD Fan Bearing Overheating', severity: 'high',
    symptoms: ['Bearing temperature above 75C', 'Increased vibration on FD fan', 'Unusual noise from bearing housing', 'Lubricant discoloration'],
    rootCauses: ['Insufficient lubrication or wrong grade lubricant', 'Misalignment of fan shaft and motor', 'Bearing wear due to prolonged operation', 'Cooling water supply interruption to bearing housing'],
    actions: ['Check and replenish lubricant', 'Perform shaft alignment check', 'Inspect bearing condition and replace if worn', 'Verify cooling water flow to bearing housing'] },
  { id: 'FM-004', assetType: 'boiler', code: 'BLR-EF-001', name: 'High Stack Temperature / Efficiency Loss', severity: 'high',
    symptoms: ['Stack temperature above 180C', 'Boiler efficiency dropping below 78%', 'Increased specific fuel consumption', 'Higher flue gas oxygen percentage'],
    rootCauses: ['Soot deposition on tube surfaces', 'Air ingress through casing leaks', 'Economizer tube fouling', 'Excess air operation due to damper malposition'],
    actions: ['Perform soot blowing cycle', 'Inspect and seal casing leaks', 'Chemical cleaning of economizer', 'Recalibrate combustion controls and dampers'] },
  { id: 'FM-005', assetType: 'boiler', code: 'BLR-WL-001', name: 'Drum Level Fluctuation', severity: 'high',
    symptoms: ['Erratic drum level indication', 'Frequent feedwater control valve hunting', 'Steam pressure instability', 'Water carry-over in steam'],
    rootCauses: ['Faulty drum level transmitter', 'Feedwater control valve positioner malfunction', 'Sudden load changes', 'Foaming due to high TDS in boiler water'],
    actions: ['Calibrate drum level transmitter', 'Check feedwater control valve and positioner', 'Implement load change rate limiters', 'Check boiler water chemistry and blow down'] },
  { id: 'FM-006', assetType: 'heater', code: 'HTR-CL-001', name: 'Thermic Fluid Coil Leakage', severity: 'critical',
    symptoms: ['Drop in thermic fluid level in expansion tank', 'Smell of thermic fluid near heater', 'Visible smoke or flames near coil joints', 'Pressure drop in thermic fluid circuit'],
    rootCauses: ['Thermal fatigue cracking at coil bends', 'Coking deposits causing hotspots', 'Corrosion due to thermic fluid degradation', 'Manufacturing defect in coil welding'],
    actions: ['Immediate shutdown and isolate thermic fluid circuit', 'Inspect coil with dye penetrant test', 'Replace damaged coil section', 'Flush and replace degraded thermic fluid'] },
  { id: 'FM-007', assetType: 'heater', code: 'HTR-CK-001', name: 'Thermic Fluid Coking/Degradation', severity: 'medium',
    symptoms: ['Increasing coil pressure drop over time', 'Reducing heat transfer rate', 'Film temperature rising', 'Thermic fluid turning dark and viscous'],
    rootCauses: ['Operation above recommended bulk temperature', 'Inadequate thermic fluid circulation', 'Air ingress into thermic fluid system', 'Using thermic fluid beyond service life'],
    actions: ['Conduct thermic fluid lab analysis', 'Flush system with cleaning fluid', 'Top up or replace thermic fluid', 'Check and repair expansion tank breather'] },
  { id: 'FM-008', assetType: 'water-treatment', code: 'WTP-MF-001', name: 'RO Membrane Fouling', severity: 'high',
    symptoms: ['Declining permeate flow rate', 'Increasing feed pressure required', 'Rising salt passage percentage', 'Increased differential pressure across membrane'],
    rootCauses: ['Biological fouling from inadequate pre-treatment', 'Scaling due to high silica or hardness', 'Colloidal fouling from suspended solids', 'Organic fouling from source water'],
    actions: ['Perform CIP (Clean-in-Place) with appropriate chemicals', 'Review pre-treatment adequacy', 'Check anti-scalant dosing', 'Normalize and trend membrane performance data'] },
  { id: 'FM-009', assetType: 'water-treatment', code: 'WTP-PH-001', name: 'pH Control Deviation', severity: 'medium',
    symptoms: ['Output pH outside 6.5-8.5 range', 'Chemical dosing pump running continuously', 'Scaling in downstream equipment', 'Corrosion indicators in treated water'],
    rootCauses: ['Faulty pH sensor calibration', 'Chemical dosing pump malfunction', 'Variations in raw water chemistry', 'Air bubbles in pH sensor housing'],
    actions: ['Recalibrate pH sensor with buffer solutions', 'Inspect and service dosing pump', 'Adjust dosing setpoint based on raw water trends', 'Clean and deaerate sensor housing'] },
  { id: 'FM-010', assetType: 'solar-thermal', code: 'SOL-MR-001', name: 'Mirror Reflectivity Degradation', severity: 'medium',
    symptoms: ['Thermal output declining despite good irradiance', 'Visible soiling or spots on mirrors', 'HTF outlet temperature lower than expected', 'Efficiency trending downward'],
    rootCauses: ['Dust and particulate deposition', 'Moisture damage to mirror coating', 'Abrasion from sandstorms', 'Aging of reflective coating'],
    actions: ['Schedule mirror cleaning cycle', 'Inspect for coating damage', 'Apply protective coating where needed', 'Trend reflectivity measurements monthly'] },
  { id: 'FM-011', assetType: 'boiler', code: 'BLR-ER-001', name: 'Economizer Tube Erosion', severity: 'high',
    symptoms: ['Thinning detected during UT inspection', 'Small leaks during hydro test', 'Reduced feedwater heating', 'Ash accumulation patterns near economizer'],
    rootCauses: ['High ash content fuel with abrasive particles', 'Gas velocity exceeding design limits', 'Improper baffle arrangement', 'Erosion-corrosion at tube bends'],
    actions: ['UT thickness survey of all economizer tubes', 'Install erosion shields on affected tubes', 'Review gas velocity and baffle design', 'Consider tube material upgrade to SS 304'] },
  { id: 'FM-012', assetType: 'boiler', code: 'BLR-CP-001', name: 'Cyclone Separator Efficiency Drop', severity: 'medium',
    symptoms: ['Higher particulate emissions', 'Increased bed material loss rate', 'Erosion marks inside cyclone', 'Stack opacity increasing'],
    rootCauses: ['Erosion of cyclone refractory lining', 'Seal pot malfunction', 'Gas distribution imbalance', 'Operating above design gas velocity'],
    actions: ['Inspect cyclone refractory during next shutdown', 'Check seal pot water level and piping', 'Review operating load vs design parameters', 'Install erosion-resistant lining material'] },
  { id: 'FM-013', assetType: 'heater', code: 'HTR-BN-001', name: 'Burner Flame Instability', severity: 'high',
    symptoms: ['Flickering or pulsating flame', 'Flame scanner alarms', 'Incomplete combustion products in flue gas', 'Abnormal furnace pressure fluctuations'],
    rootCauses: ['Fuel supply pressure variation', 'Worn or damaged burner nozzle', 'Combustion air fan issues', 'Flame scanner lens contamination'],
    actions: ['Check fuel supply pressure regulation', 'Inspect and clean/replace burner nozzle', 'Verify combustion air fan operation', 'Clean flame scanner lens and recalibrate'] },
  { id: 'FM-014', assetType: 'water-treatment', code: 'WTP-CL-001', name: 'Chlorination System Malfunction', severity: 'medium',
    symptoms: ['Residual chlorine below target', 'Biological growth in treated water tanks', 'Dosing pump pressure fluctuation', 'Chemical consumption higher than expected'],
    rootCauses: ['Dosing pump diaphragm failure', 'Chemical supply line blockage', 'Chlorine analyzer drift', 'Incorrect chemical concentration'],
    actions: ['Inspect and replace dosing pump diaphragm', 'Flush chemical supply lines', 'Recalibrate chlorine analyzer', 'Verify chemical concentration and storage'] },
  { id: 'FM-015', assetType: 'solar-thermal', code: 'SOL-HT-001', name: 'HTF Leakage in Solar Field', severity: 'critical',
    symptoms: ['Drop in HTF expansion tank level', 'Visible fluid stains near piping joints', 'Pressure loss in HTF circuit', 'Reduced thermal output'],
    rootCauses: ['Thermal expansion joint failure', 'Flex hose deterioration from UV exposure', 'Flange gasket degradation', 'Piping support failure causing stress on joints'],
    actions: ['Isolate affected loop immediately', 'Replace damaged expansion joints/flex hoses', 'Inspect all flange connections in affected zone', 'Review piping support adequacy and thermal expansion allowance'] },
];

export const INCIDENTS: Incident[] = [
  {
    id: 'INC-001', assetId: 'AST-002', assetName: '20 TPH FBC Boiler', site: 'Pune Chemical Complex',
    timestamp: '2026-04-25T04:15:00Z', severity: 'critical',
    deviation: 'FD fan bearing temperature reached 78C (limit: 75C), bed temperature at 940C (limit: 920C)',
    failureModeCode: 'BLR-FN-001', aiRootCause: 'Likely combination of bearing lubrication degradation and excess coal feed causing bed temperature rise. FD fan bearing cooling water flow reduced by 30% since last maintenance.',
    recommendedAction: 'Reduce boiler load to 60%. Check FD fan bearing lubricant level and cooling water flow immediately. Schedule bearing replacement within 48 hours.',
    status: 'open', comments: ['Operator: Noticed vibration increasing since yesterday shift']
  },
  {
    id: 'INC-002', assetId: 'AST-002', assetName: '20 TPH FBC Boiler', site: 'Pune Chemical Complex',
    timestamp: '2026-04-25T05:00:00Z', severity: 'high',
    deviation: 'Stack temperature at 192C, exceeding 180C limit. Efficiency dropped to 74.1%.',
    failureModeCode: 'BLR-EF-001', aiRootCause: 'Soot deposition on economizer tubes reducing heat transfer. Last soot blowing was 72 hours ago. Combined with excess air due to air ingress through damaged inspection door gasket.',
    recommendedAction: 'Initiate emergency soot blowing sequence. Inspect economizer area inspection doors for gasket damage. Recalibrate O2 trim controller.',
    status: 'open', comments: []
  },
  {
    id: 'INC-003', assetId: 'AST-008', assetName: '60 TPH CFBC Boiler', site: 'Hyderabad Food Processing',
    timestamp: '2026-04-24T22:30:00Z', severity: 'critical',
    deviation: 'Tube metal temperature at 510C (design limit: 480C). Superheater spray flow at 8.5 TPH (normal: 2-6 TPH).',
    failureModeCode: 'BLR-TF-001', aiRootCause: 'Superheater tube overheating due to flue gas channeling from damaged baffle. Excessive spray attempting to compensate is masking the severity. Imminent tube failure risk.',
    recommendedAction: 'Plan controlled shutdown within 24 hours. Prepare for superheater inspection. Arrange UT thickness survey of all superheater tubes. Pre-order SA213 T22 tubes.',
    status: 'acknowledged', comments: ['Maintenance lead: Shutdown scheduled for 26-Apr-2026 06:00', 'Plant manager: Approved shutdown. Arrange standby steam from Site-1 via cross-connect.']
  },
  {
    id: 'INC-004', assetId: 'AST-010', assetName: 'RO + UF Water Treatment 100 m3/hr', site: 'Hyderabad Food Processing',
    timestamp: '2026-04-24T18:00:00Z', severity: 'high',
    deviation: 'System offline. Membrane pressure dropped to 0 bar. Flow rate at 0 m3/hr.',
    failureModeCode: 'WTP-MF-001', aiRootCause: 'Severe biological fouling of RO membranes after anti-scalant dosing pump failure 5 days ago went unaddressed. Pre-treatment filter integrity compromised.',
    recommendedAction: 'Perform emergency CIP with biocide followed by alkaline cleaning. Replace anti-scalant dosing pump. Inspect and replace pre-treatment cartridge filters. Conduct membrane autopsy if flux does not recover to 80% of baseline.',
    status: 'open', comments: ['Water treatment operator: Anti-scalant pump showed error codes last week but was reset']
  },
  {
    id: 'INC-005', assetId: 'AST-005', assetName: '30 TPH Biomass Boiler', site: 'Gujarat Refinery Plant',
    timestamp: '2026-04-25T02:00:00Z', severity: 'medium',
    deviation: 'Stack temperature trending up to 175C (warning at 180C). Efficiency at 79.5%, declining 0.3% per day.',
    failureModeCode: 'BLR-EF-001', aiRootCause: 'Gradual soot buildup on air preheater tubes. Biomass fuel with higher moisture content than design leading to incomplete combustion.',
    recommendedAction: 'Schedule soot blowing within next shift. Review biomass fuel moisture specification with procurement. Consider blending with drier fuel source.',
    status: 'open', comments: []
  },
];

export function buildAssetContextForAI(): string {
  let ctx = '=== THERMAX ASSET FLEET DATA ===\n\n';
  ctx += '--- SITES ---\n';
  for (const s of SITES) ctx += `${s.name} | ${s.location} | ${s.assetCount} assets\n`;

  ctx += '\n--- ASSETS ---\n';
  for (const a of ASSETS) {
    ctx += `\n[${a.id}] ${a.name} | Type: ${a.type} | Site: ${a.site} | Status: ${a.status} | Health: ${a.healthScore}/100 | Efficiency: ${a.efficiency}%\n`;
    ctx += 'Vitals:\n';
    for (const [k, v] of Object.entries(a.vitals)) {
      ctx += `  ${k}: ${v.value} ${v.unit} (range: ${v.min}-${v.max}) [${v.status}]\n`;
    }
  }

  ctx += '\n--- FAILURE MODE LIBRARY (selected) ---\n';
  for (const fm of FAILURE_MODES) {
    ctx += `\n[${fm.code}] ${fm.name} | Asset: ${fm.assetType} | Severity: ${fm.severity}\n`;
    ctx += `  Symptoms: ${fm.symptoms.join('; ')}\n`;
    ctx += `  Root Causes: ${fm.rootCauses.join('; ')}\n`;
    ctx += `  Actions: ${fm.actions.join('; ')}\n`;
  }

  ctx += '\n--- ACTIVE INCIDENTS ---\n';
  for (const inc of INCIDENTS) {
    ctx += `\n[${inc.id}] ${inc.assetName} @ ${inc.site} | ${inc.timestamp} | Severity: ${inc.severity} | Status: ${inc.status}\n`;
    ctx += `  Deviation: ${inc.deviation}\n`;
    ctx += `  AI Root Cause: ${inc.aiRootCause}\n`;
    ctx += `  Recommended Action: ${inc.recommendedAction}\n`;
    if (inc.comments.length) ctx += `  Comments: ${inc.comments.join(' | ')}\n`;
  }

  return ctx;
}
