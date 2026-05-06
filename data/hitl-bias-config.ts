export interface BiasType {
  id: string;
  name: string;
  part: 'pipeline' | 'societal' | 'meta';
  stage?: 'data' | 'model' | 'deployment';
  subcategory?: string;
  description: string;
  howToDetect: string;
  howToMitigate: string;
  hdfc_priority: boolean;
  hdfc_context?: string;
}

export interface BiasCheckResult {
  overallBiasScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  detectedBiases: DetectedBias[];
  mitigationPlan: BiasMitigationPlan;
  fairnessFactors: FairnessFactors;
}

export interface DetectedBias {
  id: number;
  biasTypeId: string;
  biasTypeName: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string;
  affectedGroup: string;
  recommendation: string;
}

export interface BiasMitigationPlan {
  immediateActions: string[];
  rewriteSuggestions: string[];
  complianceFlags: string[];
  groundingInstructions: string;
}

export interface FairnessFactors {
  genderNeutrality: number;
  demographicParity: number;
  linguisticInclusion: number;
  socioeconomicFairness: number;
  regulatoryCompliance: number;
}

export interface CriticalFactorResult {
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  factors: CriticalFactor[];
  complianceMitigations: string[];
}

export interface CriticalFactor {
  id: number;
  category: 'DATA_PRIVACY' | 'REGULATORY' | 'COMPLIANCE' | 'ACCURACY' | 'ETHICAL' | 'OPERATIONAL';
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation: string;
}

export const BIAS_TYPES: BiasType[] = [
  // Part 1: Pipeline Biases — Data Stage
  { id: 'historical', name: 'Historical Bias', part: 'pipeline', stage: 'data', description: 'The world the data was collected from was already unequal, so the model faithfully learns and reproduces that inequality. Past lending decisions that excluded certain communities become "the norm" the model learns from.', howToDetect: 'Compare model outcomes against population-level base rates from external, neutral sources (Census, RBI publications). If model-implied rates differ sharply for a protected group, the inheritance of historical inequity is the suspect.', howToMitigate: 'Re-weight or augment underserved-group data; add fairness constraints to the training objective; explicitly document the historical context the data carries.', hdfc_priority: false },
  { id: 'representation', name: 'Representation / Sampling Bias', part: 'pipeline', stage: 'data', description: 'Some groups are underrepresented in the training data, so the model performs measurably worse on them — not out of malice, but out of statistical thinness.', howToDetect: 'Run subgroup performance audits: accuracy, precision, recall sliced by every protected attribute. Look for performance deltas of >5 percentage points across subgroups.', howToMitigate: 'Targeted data collection for thin segments; oversampling/SMOTE during training; subgroup-specific evaluation thresholds.', hdfc_priority: false },
  { id: 'measurement', name: 'Measurement Bias', part: 'pipeline', stage: 'data', description: 'The label or proxy used to train the model is itself imperfect. Using "arrest" as a proxy for "crime committed" when arrest rates are themselves unequally distributed.', howToDetect: 'Audit labels and their sources. Ask: "What does this label actually measure?" Run sensitivity tests with alternative labels.', howToMitigate: 'Replace flawed proxies with better-grounded labels; model the proxy gap explicitly; document the proxy in model-card notes.', hdfc_priority: false },
  { id: 'aggregation', name: 'Aggregation Bias', part: 'pipeline', stage: 'data', description: 'One model applied across populations that genuinely behave differently masks the differences.', howToDetect: 'Test whether subgroup-specific models meaningfully outperform the general one.', howToMitigate: 'Train subgroup-specific models or add interaction features; never deploy single model across distinct populations without validation.', hdfc_priority: false },

  // Part 1: Pipeline Biases — Model/Training Stage
  { id: 'algorithmic', name: 'Algorithmic Bias', part: 'pipeline', stage: 'model', description: 'The choice of optimisation objective itself disadvantages someone. Optimising overall accuracy on imbalanced data rewards ignoring the minority.', howToDetect: 'Look beyond aggregate accuracy. Compute false-positive and false-negative rates per subgroup.', howToMitigate: 'Switch to balanced metrics; add fairness constraints; use adversarial debiasing or re-weighted loss.', hdfc_priority: false },
  { id: 'evaluation', name: 'Evaluation Bias', part: 'pipeline', stage: 'model', description: 'The benchmark used to judge the model doesn\'t reflect the population the model will face in production.', howToDetect: 'Inspect benchmark composition. Build a "red-team" test set from underrepresented segments.', howToMitigate: 'Construct deployment-representative evaluation sets; report subgroup metrics in every model release.', hdfc_priority: false },

  // Part 1: Pipeline Biases — Deployment/Interaction Stage
  { id: 'confirmation', name: 'Confirmation Bias (User-side)', part: 'pipeline', stage: 'deployment', description: 'Users accept AI outputs that match their priors and override ones that don\'t. The system as a whole becomes biased even if the model alone is fair.', howToDetect: 'Track override patterns. If users override the model in one direction far more than the other, confirmation bias is at work.', howToMitigate: 'Force consideration of dissenting outputs; show the model\'s confidence and alternatives explicitly; rotate decision panels.', hdfc_priority: false },
  { id: 'automation', name: 'Automation Bias', part: 'pipeline', stage: 'deployment', description: 'Users over-trust AI output simply because it\'s machine-generated, including when it\'s wrong. Dangerous in credit, clinical, and compliance settings.', howToDetect: 'Set up shadow audits where humans decide independently first. Track how often wrong AI answers were accepted.', howToMitigate: 'Calibrated confidence displays; require human reasoning before showing AI output; HITL review with explicit "do you agree, and why."', hdfc_priority: false },
  { id: 'feedback-loop', name: 'Feedback-loop Bias', part: 'pipeline', stage: 'deployment', description: 'The model\'s outputs become tomorrow\'s training data. Bias in version 1 is amplified in version 2, then version 3.', howToDetect: 'Compare model behaviour over successive retraining cycles on a frozen, externally-curated test set.', howToMitigate: 'Hold out training data from production outputs; retrain on original ground-truth distribution periodically; introduce diverse exploration.', hdfc_priority: false },
  { id: 'anchoring', name: 'Anchoring / Framing Bias (GenAI)', part: 'pipeline', stage: 'deployment', description: 'GenAI output is heavily skewed by how the prompt was phrased — not by what was asked. Contradictory but equally confident answers from different framings.', howToDetect: 'A/B-test prompts that frame the same question differently. Particularly visible in opinion-style outputs.', howToMitigate: 'Use neutral, structured prompts (CRAFT); always check the inverse phrasing; treat single-prompt outputs as drafts.', hdfc_priority: false },

  // Part 2: Societal Biases — Identity-based
  { id: 'gender', name: 'Gender Bias', part: 'societal', subcategory: 'identity', description: 'Output that systematically favours or disadvantages one gender, including non-binary erasure.', howToDetect: 'Counterfactual testing: change only gender on otherwise-identical inputs and check for output divergence.', howToMitigate: 'Gender-neutralise inputs; train on counterfactual pairs; explicitly de-bias output via constrained decoding.', hdfc_priority: false },
  { id: 'racial', name: 'Racial / Ethnic Bias', part: 'societal', subcategory: 'identity', description: 'Different outcomes for inputs that differ only in racial or ethnic markers (names, photos, language).', howToDetect: 'Subgroup performance audits; counterfactual name-substitution tests; check disparate-impact ratios (the 80% rule).', howToMitigate: 'Diverse training data; demographic-parity or equal-opportunity constraints; mandatory HITL for high-stakes decisions.', hdfc_priority: false },
  { id: 'caste', name: 'Caste Bias', part: 'societal', subcategory: 'identity', description: 'Surnames, PIN codes, and occupation history all carry caste signal. Models pick this up even when caste isn\'t a feature.', howToDetect: 'Surname and PIN-code substitution tests; audit lending outcomes by surname clusters correlated with caste.', howToMitigate: 'Mask surnames during scoring; audit PIN-code-based features; mandatory disparate-impact review.', hdfc_priority: true, hdfc_context: 'Surnames, PIN codes, and occupation history all carry caste signal. Models pick this up even when caste isn\'t a feature.' },
  { id: 'religious', name: 'Religious / Name Bias', part: 'societal', subcategory: 'identity', description: 'Sanction-screening and KYC models disproportionately flagging Muslim or other minority names.', howToDetect: 'Name-substitution tests across communities; audit false-flag rates in AML/KYC by name pattern.', howToMitigate: 'De-couple name from scoring; audit name-based features; mandatory HITL for all flagged accounts.', hdfc_priority: true, hdfc_context: 'Sanction-screening and KYC models disproportionately flagging Muslim or other minority names.' },
  { id: 'age', name: 'Age Bias', part: 'societal', subcategory: 'identity', description: 'Ageism in both directions — disadvantaging older applicants or younger professionals with thin files.', howToDetect: 'Audit outcomes by age cohort; check for non-linear age effects in scoring models.', howToMitigate: 'Age-aware fairness constraints; alternative signals for thin-file young applicants.', hdfc_priority: false },
  { id: 'disability', name: 'Disability Bias', part: 'societal', subcategory: 'identity', description: 'Accessibility gaps in digital products and penalisation of disability-related career gaps.', howToDetect: 'Accessibility audit; test with assistive technology; audit career-gap penalties.', howToMitigate: 'WCAG compliance; career-gap-neutral assessment; explicit disability inclusion.', hdfc_priority: false },

  // Part 2: Societal Biases — Geographic/Linguistic
  { id: 'geographic', name: 'Geographic / PIN-code Bias', part: 'societal', subcategory: 'geographic', description: 'Borderline redlining if approval or pricing tracks PIN code beyond actual default evidence.', howToDetect: 'Map approval and pricing rates by PIN code overlaid on demographic data; check if PIN code is proxying for protected attributes.', howToMitigate: 'PIN-code-level fairness constraints; decoupled scoring; mandatory review for PIN-codes with disparate outcomes.', hdfc_priority: true, hdfc_context: 'Borderline redlining if approval or pricing tracks PIN code beyond actual default evidence.' },
  { id: 'linguistic', name: 'Linguistic Bias', part: 'societal', subcategory: 'geographic', description: 'Hindi and regional-language customer queries getting worse responses than English ones.', howToDetect: 'Run identical semantic queries in English, Hindi, and regional languages; compare response quality, accuracy, and completeness.', howToMitigate: 'Multilingual evaluation; language-specific quality gates; explicit parity requirements.', hdfc_priority: true, hdfc_context: 'Hindi and regional-language customer queries getting worse responses than English ones.' },
  { id: 'urban-rural', name: 'Urban-Rural Bias', part: 'societal', subcategory: 'geographic', description: 'Models trained on urban data systematically underperforming on rural profiles — income patterns, collateral types, seasonality.', howToDetect: 'Split performance by urban/rural classification; check agricultural income assessment accuracy.', howToMitigate: 'Rural-specific model tuning; seasonal income assessment; doorstep verification alternatives.', hdfc_priority: false },

  // Part 2: Societal Biases — Political/Ideological
  { id: 'political', name: 'Political / Ideological Bias', part: 'societal', subcategory: 'ideological', description: 'AI models pick up the dominant framing of their training corpus and present it as neutral.', howToDetect: 'Test each contested issue from both sides; compare framing, hedging, and certainty levels.', howToMitigate: 'Train models to present multiple perspectives; refuse strong opinion on contested topics.', hdfc_priority: false },

  // Part 2: Societal Biases — Socioeconomic
  { id: 'class', name: 'Class / Socioeconomic Bias', part: 'societal', subcategory: 'socioeconomic', description: 'Income, education level, occupation prestige. Models can disadvantage gig workers, blue-collar professions, and the informal economy.', howToDetect: 'Subgroup audits by income decile, occupation category, employment type (formal/informal).', howToMitigate: 'Alternative-data signals for thin-file applicants; subgroup performance gates.', hdfc_priority: false },
  { id: 'educational', name: 'Educational-pedigree Bias', part: 'societal', subcategory: 'socioeconomic', description: 'Tier-1 vs tier-2/3 college signal in lending and credit-card pricing. The model reinforces historical correlations.', howToDetect: 'Counterfactual testing by college name. Compare outcomes for tier-1 vs tier-2 alumni with identical profiles.', howToMitigate: 'Remove college-name as a feature; use skill-based signals instead; document any pedigree-based decision.', hdfc_priority: true, hdfc_context: 'PL pricing models implicitly favouring tier-1 college alumni.' },
  { id: 'digital-access', name: 'Digital-access Bias', part: 'societal', subcategory: 'socioeconomic', description: 'People with less digital footprint — rural, older, under-banked — get worse predictions because the model treats absence-of-data as risk.', howToDetect: 'Audit performance by digital-footprint thickness. Are thin-data users disproportionately denied?', howToMitigate: 'Alternative data sources (utility, telco, agri); explicit thin-file pathway; mandatory human review for thin-data denials.', hdfc_priority: false },
  { id: 'name', name: 'Name Bias', part: 'societal', subcategory: 'socioeconomic', description: 'Outcomes that change just because the name on the application changes — documented in resume screening, KYC flag rates.', howToDetect: 'Counterfactual name-substitution tests across communities.', howToMitigate: 'Mask names from scoring features; tightly audit any pipeline where the name reaches the model.', hdfc_priority: false },

  // Part 2: Societal Biases — Family & Relationship
  { id: 'marital', name: 'Marital-status Bias', part: 'societal', subcategory: 'family', description: 'Outputs that change based on married, divorced, or widowed status. Common in lending and insurance underwriting.', howToDetect: 'Counterfactual marital-status tests; audit pricing and approval rates by status.', howToMitigate: 'Remove or strictly justify marital-status features; subgroup audits.', hdfc_priority: true, hdfc_context: 'Penalising young married women in salaried-loan and credit-card models.' },
  { id: 'parental', name: 'Parental-status Bias', part: 'societal', subcategory: 'family', description: 'Particularly affects working women in employment and lending models. Career-gap penalties act as hidden parental-status signal.', howToDetect: 'Counterfactual testing for career gaps; audit outcomes by gender + career-gap intersection.', howToMitigate: 'Skill-recency signals instead of continuous-employment; mandatory subgroup performance gates.', hdfc_priority: false },
  { id: 'household', name: 'Household-structure Bias', part: 'societal', subcategory: 'family', description: 'Assumptions of nuclear family vs joint family vs single-parent households. Models built for one structure misjudge the others.', howToDetect: 'Test with diverse household-structure inputs. Check for nuclear-family defaults.', howToMitigate: 'Locale-aware data collection; flexible household-structure inputs.', hdfc_priority: false },

  // Part 2: Societal Biases — Subtle
  { id: 'beauty', name: 'Beauty / Attractiveness Bias', part: 'societal', subcategory: 'subtle', description: 'Image models systematically equating "professional" or "trustworthy" with conventional beauty standards.', howToDetect: 'Generate images for trait prompts and analyse demographic distribution.', howToMitigate: 'Refuse appearance-trait associations; constrained generation.', hdfc_priority: false },
  { id: 'voice', name: 'Voice / Speech-pattern Bias', part: 'societal', subcategory: 'subtle', description: 'Speech models penalising stutters, non-native accents, dialects. Voice biometrics may fail on underrepresented groups.', howToDetect: 'Test speech recognition WER by accent, disfluency, dialect.', howToMitigate: 'Diverse speech training data; accent-aware models.', hdfc_priority: false },
  { id: 'health', name: 'Health-status Bias', part: 'societal', subcategory: 'subtle', description: 'Assumptions about productivity, risk, or character based on health history. Critical in insurance and lending.', howToDetect: 'Audit decisions involving health-related features. Check disparate impact on chronic-condition cohorts.', howToMitigate: 'Strict separation of health data from non-health pipelines; legal review.', hdfc_priority: false },
  { id: 'veteran', name: 'Veteran / Military-service Bias', part: 'societal', subcategory: 'subtle', description: 'Can swing positive or negative across geographies. Worth auditing in HR and lending models.', howToDetect: 'Counterfactual testing on service indicators; audit outcomes for veteran cohorts.', howToMitigate: 'Remove or justify veteran-status features; subgroup audits.', hdfc_priority: false },
  { id: 'criminal', name: 'Criminal-record Bias', part: 'societal', subcategory: 'subtle', description: 'Including for arrests without conviction or expunged records that resurface. Heavy-footprint bias with severe consequences.', howToDetect: 'Audit feature lineage for criminal-record signal. Check whether expunged or arrest-only records reach scoring.', howToMitigate: 'Strict provenance controls on criminal-record data; never use arrest-only records in scoring.', hdfc_priority: false },

  // Part 3: Meta-biases
  { id: 'intersectional', name: 'Intersectional Bias', part: 'meta', description: 'Bias that only appears at the intersection of two attributes. A model can be fair for "women" and fair for "Black people" but unfair for Black women specifically.', howToDetect: 'Subgroup audits at intersections, not just single attributes. Test all combinations of protected attributes.', howToMitigate: 'Intersectional fairness metrics; reweighting joint distributions; never claim fairness from single-attribute audits alone.', hdfc_priority: false },
  { id: 'stereotyping', name: 'Stereotyping Bias', part: 'meta', description: 'The model reliably associates groups with reductive descriptors. Nurses=female, CEOs=male, criminals=specific ethnicities.', howToDetect: 'Run controlled prompts for occupations, traits, and roles; analyse demographic distribution.', howToMitigate: 'Constrained generation with diversity requirements; instruction-tuning with counterstereotype examples.', hdfc_priority: false },
];

export const HDFC_PRIORITY_BIASES = BIAS_TYPES.filter(b => b.hdfc_priority);

export const BIAS_CATEGORIES = {
  pipeline_data: { label: 'Data-stage Biases', description: 'Biases entering through training data', biases: BIAS_TYPES.filter(b => b.stage === 'data') },
  pipeline_model: { label: 'Model/Training-stage Biases', description: 'Biases from optimisation and evaluation choices', biases: BIAS_TYPES.filter(b => b.stage === 'model') },
  pipeline_deployment: { label: 'Deployment/Interaction-stage Biases', description: 'Biases from user interaction and feedback loops', biases: BIAS_TYPES.filter(b => b.stage === 'deployment') },
  societal_identity: { label: 'Identity-based Biases', description: 'Biases based on gender, race, caste, religion, age, disability', biases: BIAS_TYPES.filter(b => b.subcategory === 'identity') },
  societal_geographic: { label: 'Geographic & Linguistic Biases', description: 'Location, language, and urban-rural disparities', biases: BIAS_TYPES.filter(b => b.subcategory === 'geographic') },
  societal_socioeconomic: { label: 'Socioeconomic Biases', description: 'Class, education, digital access, and name-based', biases: BIAS_TYPES.filter(b => b.subcategory === 'socioeconomic') },
  societal_family: { label: 'Family & Relationship Biases', description: 'Marital, parental, and household structure', biases: BIAS_TYPES.filter(b => b.subcategory === 'family') },
  meta: { label: 'Meta-biases', description: 'How biases compound or hide', biases: BIAS_TYPES.filter(b => b.part === 'meta') },
};
