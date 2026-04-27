'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Markdown from './Markdown';
import { saveChatHistory, loadChatHistory, clearChatHistory, CHAT_KEYS } from '@/lib/chat-history';
import DownloadMenu from './DownloadMenu';

type Role = 'user' | 'assistant';
interface ChatMessage { role: Role; content: string; }

interface PromptLadder {
  theme: string;
  icon: string;
  levels: { label: string; tag: string; prompt: string; color: string }[];
}

interface LabExperiment {
  theme: string;
  icon: string;
  description: string;
  levels: { label: string; tag: string; prompt: string; color: string }[];
}

const LAB_EXPERIMENTS: LabExperiment[] = [
  {
    theme: 'GTM Strategy — Edge Live in Middle East',
    icon: '🚀',
    description: 'See how the same GTM ask transforms from a generic list into a board-ready strategy as the prompt gets richer.',
    levels: [
      {
        label: 'Simple',
        tag: 'L1',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        prompt: 'Create a Go-To-Market strategy to launch Edge Live in the Middle East.'
      },
      {
        label: 'Detailed',
        tag: 'L2',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        prompt: 'Create a Go-To-Market strategy to launch Edge Live — an industrial AI and IoT platform — in the Middle East. The platform delivers real-time equipment monitoring, predictive maintenance, and energy optimisation for heavy industry. Target customer segments include oil & gas, petrochemicals, power generation, and large-scale manufacturing. The region\'s Vision 2030 industrial diversification programs are creating strong pull for digital transformation. Plan for a 12-month launch horizon with initial focus on UAE and Saudi Arabia.'
      },
      {
        label: 'Analytical',
        tag: 'L3',
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        prompt: 'Create a Go-To-Market strategy to launch Edge Live in the Middle East. Analyse: (1) the competitive landscape — incumbent industrial IoT platforms from Siemens MindSphere, Honeywell Forge, ABB Ability, and regional players, (2) regulatory requirements around data localisation, cybersecurity frameworks (NCA in Saudi, DESC in UAE), and technology transfer mandates, (3) channel economics — direct enterprise sales vs. system integrator partnerships vs. strategic distributor model, (4) build-vs-partner trade-offs for local deployment infrastructure and support operations, (5) success metrics and leading indicators for the first 12 months. The output should be a reasoned strategic recommendation with clear trade-off analysis, not a generic feature list.'
      },
      {
        label: 'CRAFT Framework',
        tag: 'L4',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        prompt: 'Context: We are launching Edge Live — an industrial AI and IoT platform for real-time equipment monitoring, predictive maintenance, and energy optimisation — into the Middle East market. The region\'s Vision 2030 programs are driving rapid industrial digitisation. Incumbent platforms (Siemens MindSphere, Honeywell Forge, ABB Ability) have an established presence but are perceived as expensive and slow to localise. Data sovereignty regulations are tightening across the GCC.\n\nRole: You are a senior Go-To-Market strategist with deep expertise in industrial technology markets in MENA. You have launched multiple B2B SaaS and platform products in the region.\n\nAction: Develop a comprehensive GTM strategy covering market entry sequencing, customer segmentation and prioritisation, competitive positioning, channel architecture, pricing framework, partnership strategy, regulatory compliance plan, and a 90-day launch playbook with clear milestones.\n\nFormat: Deliver as (1) a 2-page executive memo summarising the strategic recommendation, (2) a market entry decision matrix comparing UAE-first vs. Saudi-first vs. parallel entry, (3) a 90-day launch plan with weekly milestones, and (4) a one-page competitive differentiation table.\n\nTarget Audience: The MD and Business Unit heads reviewing this for investment approval. The document will also be shared with the regional partnership team for execution planning.'
      }
    ]
  },
  {
    theme: 'Industrial Decarbonisation — Customer Pitch',
    icon: '🌍',
    description: 'Watch a generic pitch evolve into a deal-advancing document as context, analysis, and structure are layered in.',
    levels: [
      {
        label: 'Simple',
        tag: 'L1',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        prompt: 'Draft a customer pitch for our industrial decarbonisation offering.'
      },
      {
        label: 'Detailed',
        tag: 'L2',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        prompt: 'Draft a customer pitch for our industrial decarbonisation offering targeting a large refinery in the Gulf. The scope covers green hydrogen integration and waste-heat recovery systems for a 25-MW capacity. The customer has publicly declared net-zero targets and is actively evaluating technology partners for their first decarbonisation phase.'
      },
      {
        label: 'Analytical',
        tag: 'L3',
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        prompt: 'Draft a customer pitch for our industrial decarbonisation offering targeting a large Gulf refinery with a 25-MW green hydrogen and waste-heat recovery scope. Analyse: (1) why this customer should choose Thermax over the two incumbent vendors currently serving them, (2) how their declared net-zero-by-2040 targets create urgency and budget allocation pressure, (3) the regulatory environment they operate under (national carbon pricing, CBAM exposure for exports to the EU), (4) typical procurement pushbacks their team raises (lifecycle cost justification, technology risk, local support capability), and (5) what Thermax won at a comparable account last quarter and how that reference strengthens our position. The output should be a persuasive, evidence-backed pitch — not a generic capability overview.'
      },
      {
        label: 'CRAFT Framework',
        tag: 'L4',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        prompt: 'Context: A large Gulf refinery has declared net-zero by 2040. Their current energy vendors are two global incumbents. They face regulatory pressure from emerging national carbon pricing and EU CBAM on exports. Recent procurement decisions have shifted towards lifecycle-cost-led evaluations rather than lowest capex. Thermax won a comparable 20-MW waste-heat recovery project at a similar account last quarter.\n\nRole: You are a senior GTM strategist for Thermax\'s industrial decarbonisation portfolio in the MENA region, with deep knowledge of refinery energy systems, green hydrogen economics, and competitive positioning against global EPC firms.\n\nAction: Draft a compelling customer pitch that persuades the refinery\'s leadership to shortlist Thermax for their first decarbonisation phase.\n\nFormat: Deliver as (1) a 1-page executive narrative connecting their net-zero ambition to Thermax\'s solution, (2) a 5-row differentiation table comparing Thermax against the two incumbents on the dimensions that matter most to this buyer, and (3) a recommended next-meeting agenda with three discussion items designed to advance the deal.\n\nTarget Audience: The customer\'s CEO, COO, and Head of Sustainability will read this alongside Thermax\'s own MD during the joint review.'
      }
    ]
  }
];

const PROMPT_LADDERS: PromptLadder[] = [
  {
    theme: 'Boiler Efficiency Optimization',
    icon: '🔥',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'What are the key factors affecting boiler efficiency in industrial AFBC boilers operating in the cement sector?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Analyze boiler efficiency losses in a 75 TPH AFBC boiler firing high-ash Indian coal (40% ash). Break down losses: dry flue gas loss, moisture in fuel, unburnt carbon in ash, radiation loss, and blowdown. Recommend Thermax-specific retrofit solutions (air preheater upgrade, economizer optimization, combustion tuning) with expected efficiency gains and ROI calculations.' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'As Thermax\'s Engineering Head, prepare a comprehensive boiler performance enhancement proposal for UltraTech Cement\'s 3×75 TPH AFBC boiler plant at Tadipatri. Include: (1) baseline efficiency audit findings with heat balance, (2) loss-wise breakdown with Sankey diagram, (3) recommended modifications ranked by cost-benefit, (4) Thermax product solutions (air preheater, economizer, combustion optimization), (5) guaranteed efficiency improvement with penalty/bonus structure, (6) 5-year TCO comparison. Deliver a board-ready investment proposal with IRR and payback analysis.' }
    ]
  },
  {
    theme: 'ZLD Implementation Strategy',
    icon: '💧',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'What is Zero Liquid Discharge (ZLD) and why is it becoming mandatory for Indian industries?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Design a ZLD system for a textile dyeing unit in Tirupur generating 500 KLD effluent with TDS of 8,000 ppm. Compare MEE+ATFD vs MVR-based approaches. Include: treatment train, equipment sizing, operating costs (₹/KL), chemical consumption, salt recovery potential, and Thermax product portfolio mapping (RO, MEE, evaporators, crystallizers).' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'Develop Thermax\'s ZLD market strategy for the Indian textile sector. Analyze: (1) regulatory timeline (CPCB/SPCB mandates by state), (2) market sizing — 200+ units in Tirupur, Surat, Ludhiana requiring ZLD, (3) competitive landscape (Veolia, Aquatech, IDE), (4) Thermax\'s technology portfolio gaps, (5) standardized ZLD solution packages for different effluent profiles, (6) ESCO financing model feasibility, (7) strategic partnerships needed. Produce a go-to-market plan with ₹500 Cr revenue target over 3 years.' }
    ]
  },
  {
    theme: 'FGD for Power Sector',
    icon: '🏭',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'What are the different Flue Gas Desulphurization (FGD) technologies available for coal-fired power plants in India?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Compare Wet Limestone FGD vs Dry Sorbent Injection vs Seawater FGD for a 2×660 MW supercritical coal power plant. Evaluate: capital cost (₹ Cr/MW), operating cost (₹/kWh), SOx removal efficiency, water consumption, waste disposal, space requirements, and suitability for Indian coal (0.3-0.7% sulphur). Reference CPCB 2024 emission norms (SOx < 200 mg/Nm3 for units > 500 MW).' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'Build Thermax\'s FGD business case for the Indian power sector. Analyze: (1) 150 GW installed capacity requiring FGD by Dec 2027, (2) BHEL\'s dominant position and Thermax differentiation strategy, (3) technology licensing vs in-house development (Thermax wet FGD proven at 3 stations), (4) L1/T1 bid strategy to win NTPC/Adani/Tata Power tenders, (5) manufacturing capacity constraints and expansion plan, (6) O&M revenue opportunity post-installation, (7) risk assessment (delayed compliance, payment delays, Chinese competition). Model ₹2,000 Cr order book scenario with timeline and margin projections.' }
    ]
  },
  {
    theme: 'Decarbonization Roadmap',
    icon: '🌱',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'How can Thermax help its industrial customers reduce carbon emissions from their energy systems?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Map Thermax\'s decarbonization product portfolio against customer needs: biomass co-firing for existing coal boilers, waste heat recovery systems, solar thermal integration for process heating, heat pumps for sub-200°C applications, and green hydrogen blending. For each solution, provide: CO2 reduction potential (%), capex range, payback period, and applicable industries. Include India\'s PAT scheme targets and carbon credit market pricing.' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'Design a "Net Zero Industrial Campus" solution for JSW Steel\'s Bellary integrated steel plant. Create a comprehensive decarbonization roadmap covering: (1) current carbon footprint baseline (Scope 1, 2, 3), (2) phased reduction targets aligned with India\'s NDC and SBTi, (3) technology interventions with Thermax products (WHRS, biomass boiler, solar thermal, green hydrogen), (4) carbon credit generation and monetization, (5) CBAM compliance strategy for EU exports, (6) investment phasing over 2025-2035 with cumulative emission reductions. Include Sankey diagrams, Gantt chart for implementation, and NPV analysis at 12% discount rate.' }
    ]
  },
  {
    theme: 'Waste Heat Recovery',
    icon: '♻️',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'What is waste heat recovery and what are the main WHRS opportunities in the Indian cement industry?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Design a WHRS for a 5,000 TPD cement plant with preheater exit gas at 320°C and clinker cooler exhaust at 350°C. Calculate: power generation potential (MW), steam conditions, equipment list (WHRB, STG, condenser, cooling tower), estimated capex (₹ Cr), annual power savings, and payback period. Compare with Thermax\'s WHRS installations at Dalmia, UltraTech, and Ambuja plants.' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'Prepare a market penetration strategy for Thermax WHRS in the Indian cement sector. Assess: (1) 42 cement groups with 550+ MTPA capacity — segment by WHRS adoption status, (2) competitive analysis (Kalina cycle, ORC systems, Chinese WHRS vs Thermax Rankine cycle), (3) technology differentiation (dual-pressure WHRS, high-efficiency turbines), (4) pricing strategy for ₹6-8 Cr/MW range, (5) reference case studies with guaranteed performance data, (6) financing models (ESCO, carbon credit monetization), (7) after-market service revenue opportunity. Target: 15 new WHRS orders (₹1,200 Cr) over 3 years.' }
    ]
  },
  {
    theme: 'Digital Transformation (Edelise)',
    icon: '📊',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'What is Thermax\'s Edelise digital monitoring platform and how does it help industrial customers improve equipment performance?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Analyze Thermax Edelise platform capabilities: remote monitoring, predictive maintenance, performance optimization, and digital twin technology. Compare with Forbes Marshall\'s IntelliSense and Honeywell\'s Connected Plant. Map Edelise features to customer pain points: unplanned downtime reduction, efficiency improvement, compliance reporting, and spare parts optimization. Include pricing model (subscription vs one-time) and value proposition per customer segment.' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'Build a 5-year digital services business plan for Thermax. Evaluate: (1) current installed base of 15,000+ equipment across 75 countries — addressable market for Edelise, (2) SaaS revenue model with tiered pricing (Basic/Pro/Enterprise), (3) AI/ML capabilities for predictive maintenance (reduce unplanned downtime by 40%), (4) integration with SAP PM/IoT platforms, (5) data monetization opportunities, (6) required investment in cloud infrastructure, data science team, and customer success, (7) competitive moat building through proprietary algorithms. Model ₹200 Cr ARR target by 2030 with margin progression.' }
    ]
  },
  {
    theme: 'Pharma Clean Utilities',
    icon: '💊',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'What clean utility systems does the pharmaceutical industry require, and which ones can Thermax provide?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Design the complete clean utility system for a new API manufacturing facility in Hyderabad (capacity: 500 MT/year). Specify: pure steam generator (500 kg/hr), WFI system (5 m3/hr), DM plant (25 m3/hr), absorption chiller (1000 TR for process cooling), HVAC system integration, and compressed air (oil-free, ISO 8573 Class 1). Include equipment selection from Thermax catalog, layout considerations, and qualification requirements (IQ/OQ/PQ).' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'Develop Thermax\'s pharmaceutical sector strategy. Analyze: (1) China+1 driving 15+ new API plants in Gujarat, Telangana, and Maharashtra, (2) clean utility project pipeline (₹2,100 Cr TAM), (3) bundled solution approach (boiler + chiller + DM + pure steam), (4) competitive positioning vs Spirax Sarco, Atlas Copco, Veolia, (5) compliance requirements (WHO-GMP, US FDA, EU GMP), (6) dedicated pharma vertical team structure, (7) reference installations and qualification track record. Create an account plan for top 10 pharma companies with deal pipeline projections.' }
    ]
  },
  {
    theme: 'EPC Project Execution',
    icon: '🏗️',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'What are the key challenges in executing large EPC projects for industrial energy systems in India?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Analyze Thermax\'s EPC project execution framework for a 100 TPH biomass-fired cogeneration plant. Break down: (1) project phases (FEED → detailed engineering → procurement → fabrication → erection → commissioning), (2) typical timeline (14-18 months), (3) critical path activities, (4) risk register (monsoon delays, labor shortage, material price escalation, regulatory approvals), (5) quality control hold points, (6) safety management (LTIFR targets), (7) vendor management for 50+ subcontractors. Include a milestone payment schedule and cash flow projection.' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'Redesign Thermax\'s EPC project management methodology to achieve 95% on-time delivery (currently ~75%). Evaluate: (1) root cause analysis of past project delays (material, design, site, regulatory), (2) digital project management tools (Primavera, BIM, drone surveys), (3) modular construction approach to reduce site time by 30%, (4) vendor pre-qualification and performance scoring, (5) earned value management (EVM) implementation, (6) lessons-learned database integration, (7) PMO restructuring with certified PMP resources, (8) incentive alignment (LD sharing with subcontractors). Model the business impact of 20% cycle time reduction on working capital and customer satisfaction scores.' }
    ]
  },
  {
    theme: 'Absorption Chiller Market',
    icon: '❄️',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'How do absorption chillers work and what advantages do they offer over conventional electric chillers for industrial cooling?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Compare Thermax absorption chillers (single-effect, double-effect LiBr, triple-effect) for a petrochemical complex requiring 3,000 TR cooling capacity. Analyze: COP values, heat source requirements (steam, hot water, direct-fired), space footprint, maintenance costs, refrigerant considerations, and life-cycle cost vs electric centrifugal chillers at ₹8/kWh and ₹12/kWh electricity rates. Include district cooling and trigeneration applications.' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'Create a global market expansion strategy for Thermax absorption chillers. Assess: (1) Middle East district cooling market (UAE, Saudi — ₹4,000 Cr opportunity), (2) Southeast Asia data center cooling demand, (3) European industrial waste heat utilization (aligned with EU Energy Efficiency Directive), (4) competitive landscape (Ebara, LG, Broad, Shuangliang), (5) local manufacturing vs export model per region, (6) technology gaps (ammonia-water chillers for sub-zero applications), (7) after-sales service network requirements. Develop a 5-year international business plan with revenue targets by geography.' }
    ]
  },
  {
    theme: 'Supply Chain Resilience',
    icon: '🔗',
    levels: [
      { label: 'Simple', tag: 'L1', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', prompt: 'What are the major supply chain risks faced by capital equipment manufacturers like Thermax in India?' },
      { label: 'Detailed', tag: 'L2', color: 'bg-blue-100 text-blue-700 border-blue-200', prompt: 'Map Thermax\'s critical supply chain dependencies: pressure part materials (SA-210, SA-213, SA-516 steel), specialized forgings, refractory materials, instrumentation (from Yokogawa, Emerson, ABB), motors and drives, and chemical raw materials. Identify single-source risks, lead time bottlenecks, and price volatility exposure. Evaluate dual-sourcing strategies, strategic inventory buffers, and vendor development programs for import substitution aligned with Atmanirbhar Bharat.' },
      { label: 'Analytical', tag: 'L3', color: 'bg-purple-100 text-purple-700 border-purple-200', prompt: 'Design a comprehensive supply chain resilience program for Thermax. Cover: (1) critical material risk assessment with 50+ key components, (2) supplier diversification strategy (target: no single source > 40% of any critical item), (3) digital procurement platform with real-time visibility, (4) strategic inventory policy (ABC-XYZ analysis based), (5) vendor rating system with auto-escalation, (6) import substitution roadmap (target 80% indigenization by 2028), (7) hedging strategy for steel, copper, and forex, (8) sustainability-linked supply chain requirements (Scope 3 emissions). Model working capital optimization impact and procurement cost reduction targets.' }
    ]
  }
];

export default function PromptPlayground() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [labExpanded, setLabExpanded] = useState(true);
  const [expandedLabLadders, setExpandedLabLadders] = useState<Set<number>>(new Set([0]));
  const [themesExpanded, setThemesExpanded] = useState(false);
  const [webSearchStatus, setWebSearchStatus] = useState<null | 'searching' | 'done'>(null);
  const [webSearchMeta, setWebSearchMeta] = useState<{ resultCount?: number; ms?: number } | null>(null);
  const [expandedLadders, setExpandedLadders] = useState<Set<number>>(new Set([0]));
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamThrottleRef = useRef<number>(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transcript: ChatMessage[] =
    streaming && streamBuffer
      ? [...messages, { role: 'assistant', content: streamBuffer }]
      : messages;

  useEffect(() => {
    const saved = loadChatHistory(CHAT_KEYS.PROMPT_PLAYGROUND);
    if (saved.length > 0) setMessages(saved);
  }, []);

  useEffect(() => {
    if (messages.length > 0 && !streaming) {
      saveChatHistory(CHAT_KEYS.PROMPT_PLAYGROUND, messages);
    }
  }, [messages, streaming]);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  function toggleLabLadder(idx: number) {
    setExpandedLabLadders(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function toggleLadder(idx: number) {
    setExpandedLadders(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setStreaming(true);
    setStreamBuffer('');
    setWebSearchStatus(null);
    setWebSearchMeta(null);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch('/api/chat-prompting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Request failed');
        setMessages([...next, { role: 'assistant', content: `*Error: ${errText}*` }]);
        setStreaming(false);
        return;
      }

      await readSSE(res.body, next);
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: `*Network error: ${err instanceof Error ? err.message : 'unknown'}*` }]);
    } finally {
      setStreaming(false);
      setStreamBuffer('');
      setWebSearchStatus(null);
    }
  }

  async function readSSE(body: ReadableStream<Uint8Array>, prev: ChatMessage[]) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assembled = '';

    const flushStream = () => {
      setStreamBuffer(assembled);
      streamThrottleRef.current = 0;
      scrollToBottom();
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const raw = line.slice(6);
          try {
            const data = JSON.parse(raw);
            switch (currentEvent) {
              case 'web_search':
                if (data.status === 'searching') {
                  setWebSearchStatus('searching');
                } else if (data.status === 'done') {
                  setWebSearchStatus('done');
                  setWebSearchMeta({ resultCount: data.resultCount, ms: data.ms });
                }
                break;
              case 'text_delta':
                assembled += data;
                if (!streamThrottleRef.current) {
                  streamThrottleRef.current = requestAnimationFrame(flushStream);
                }
                break;
              case 'error':
                assembled += `\n\n*Error: ${data.message}*`;
                setStreamBuffer(assembled);
                break;
              case 'done':
                break;
            }
          } catch { /* skip malformed SSE lines */ }
          currentEvent = '';
        }
      }
    }
    if (streamThrottleRef.current) cancelAnimationFrame(streamThrottleRef.current);
    setMessages([...prev, { role: 'assistant', content: assembled }]);
    setTimeout(scrollToBottom, 100);
  }

  function clearChat() {
    setMessages([]);
    setStreamBuffer('');
    setInput('');
    clearChatHistory(CHAT_KEYS.PROMPT_PLAYGROUND);
  }

  function handlePromptClick(prompt: string) {
    setInput(prompt);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Hero Header */}
      <section className="bg-gradient-to-r from-[#0f1b3d] to-[#162450] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-white mb-2 tracking-wide">
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                AI-Powered Prompt Engine
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Prompt Engineering Playground</h1>
              <p className="mt-1.5 text-white/80 text-sm max-w-xl leading-relaxed">
                Explore ideas, research markets, and build structured thinking through progressively detailed prompts.
                Web search is auto-enabled for queries needing live data.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  disabled={streaming}
                  className="text-sm text-red-300 hover:text-red-200 border border-red-400/30 hover:border-red-400/60 px-4 py-2 rounded-lg font-medium transition disabled:opacity-40"
                >
                  Clear Chat
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content — Single Column */}
      <div className="max-w-7xl mx-auto px-6 py-5 space-y-4">

          {/* Lab + Chat + Templates stacked vertically */}
          <section className="flex flex-col min-h-[calc(100vh-200px)] gap-4">

            {/* ═══ PROMPT EXPERIMENTATION LAB — Prominent Card ═══ */}
            <div className="rounded-xl border border-indigo-200 shadow-lg overflow-hidden bg-white">
              <button
                onClick={() => setLabExpanded(!labExpanded)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 text-left group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🧪</span>
                  <div>
                    <h2 className="text-lg font-extrabold text-white tracking-tight">Prompt Experimentation Lab</h2>
                    <p className="text-sm text-white/85 mt-0.5">Run the same problem through 4 progressively stronger prompts — see how the answer gets sharper at each level</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden md:flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-400/30 text-white">L1</span>
                    <span className="text-white/60 text-sm">→</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-400/30 text-white">L2</span>
                    <span className="text-white/60 text-sm">→</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-400/30 text-white">L3</span>
                    <span className="text-white/60 text-sm">→</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-400/30 text-white">L4</span>
                  </div>
                  <svg className={`w-5 h-5 text-white/80 transition-transform duration-300 ${labExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {labExpanded && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600 italic">
                      <strong className="text-gray-800 not-italic">Principle:</strong> The complexity belongs in the prompt, not in the expected outcome — better prompts yield sharper answers for the same goal.
                    </p>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full shrink-0 ml-3">
                      CRAFT = Context · Role · Action · Format · Target
                    </span>
                  </div>

                  <div className="space-y-4">
                    {LAB_EXPERIMENTS.map((exp, ei) => {
                      const isOpen = expandedLabLadders.has(ei);
                      return (
                        <div key={ei} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                          <button
                            onClick={() => toggleLabLadder(ei)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{exp.icon}</span>
                              <div>
                                <h3 className="text-[15px] font-bold text-gray-900 leading-tight">{exp.theme}</h3>
                                <p className="text-xs text-gray-600 mt-1 leading-snug">{exp.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">4 levels</span>
                              <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-4 pt-1 border-t border-gray-100 space-y-2.5">
                              {exp.levels.map((level, lvi) => {
                                const stepColors = [
                                  'border-l-emerald-400 hover:bg-emerald-50/50',
                                  'border-l-blue-400 hover:bg-blue-50/50',
                                  'border-l-purple-400 hover:bg-purple-50/50',
                                  'border-l-amber-400 hover:bg-amber-50/50',
                                ];
                                return (
                                  <button
                                    key={lvi}
                                    onClick={() => handlePromptClick(level.prompt)}
                                    className={`w-full text-left group rounded-lg border border-gray-100 border-l-[3px] ${stepColors[lvi]} bg-white p-3.5 transition-all hover:shadow-sm`}
                                  >
                                    <div className="flex items-center gap-2.5 mb-2">
                                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${level.color}`}>
                                        {level.tag}
                                      </span>
                                      <span className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition">
                                        {level.label}
                                      </span>
                                      {lvi === 3 && (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">C · R · A · F · T</span>
                                      )}
                                      <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 ml-auto transition shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                      </svg>
                                    </div>
                                    <p className="text-[13px] text-gray-700 leading-relaxed transition whitespace-pre-line">
                                      {level.prompt}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ═══ CHAT AREA ═══ */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden flex flex-col">

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {transcript.length === 0 && !streaming && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="text-5xl mb-3">💬</div>
                    <h3 className="text-lg font-bold text-gray-800">Start Your Prompt Experiment</h3>
                    <p className="text-sm text-gray-500 max-w-md mt-2 leading-relaxed">
                      Pick a prompt level from the Lab above, or type your own prompt below. Watch the answer quality evolve as the prompt complexity increases.
                    </p>
                    <div className="mt-4 text-xs text-gray-500">
                      {LAB_EXPERIMENTS.length} experimentation themes · {PROMPT_LADDERS.length} use-case templates · {LAB_EXPERIMENTS.length * 4 + PROMPT_LADDERS.length * 3} total prompts
                    </div>
                  </div>
                )}

                {transcript.map((msg, i) => (
                  <ChatBubble key={i} message={msg} isStreaming={streaming && msg.role === 'assistant' && i === transcript.length - 1} />
                ))}

                {streaming && !streamBuffer && (
                  <div className="px-4 py-3 space-y-2">
                    {webSearchStatus === 'searching' && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 animate-pulse">
                        <svg className="w-4 h-4 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-xs text-amber-700 font-semibold">Searching the web for live data...</span>
                      </div>
                    )}
                    {webSearchStatus === 'done' && webSearchMeta && (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-emerald-700 font-semibold">
                          {webSearchMeta.resultCount} web result{webSearchMeta.resultCount !== 1 ? 's' : ''} found ({webSearchMeta.ms}ms)
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {webSearchStatus === 'done' ? 'Analyzing web results...' : 'AI is thinking...'}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your prompt here... (Ctrl/Cmd+Enter to send)"
                    rows={3}
                    disabled={streaming}
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 resize-y focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-40 transition shadow-sm"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => send()}
                      disabled={streaming || !input.trim()}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold px-6 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition text-sm shadow-md"
                    >
                      Send
                    </button>
                    {messages.length > 0 && (
                      <button
                        onClick={clearChat}
                        disabled={streaming}
                        className="text-[10px] font-semibold text-gray-400 hover:text-red-500 transition disabled:opacity-40"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-gray-400">
                    {messages.length > 0
                      ? `${Math.ceil(messages.filter(m => m.role === 'user').length)} turn${messages.filter(m => m.role === 'user').length !== 1 ? 's' : ''} in conversation`
                      : 'Start a new conversation or pick a prompt from the library'}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    Ctrl/Cmd + Enter to send
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Use-case Driven Prompt Templates — Below Chat */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
            <button
              onClick={() => setThemesExpanded(!themesExpanded)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-bold bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-lg">📚</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Use-case Driven Prompt Templates</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {PROMPT_LADDERS.length} industry themes · L1 (Simple) → L2 (Detailed) → L3 (Analytical)
                  </p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-blue-400 transition-transform duration-200 shrink-0 ${themesExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {themesExpanded && (
              <>
                <div className="divide-y divide-gray-100">
                  {PROMPT_LADDERS.map((ladder, li) => {
                    const isOpen = expandedLadders.has(li);
                    return (
                      <div key={li}>
                        <button
                          onClick={() => toggleLadder(li)}
                          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{ladder.icon}</span>
                            <span className="text-sm font-bold text-gray-800">{ladder.theme}</span>
                          </div>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-3 space-y-2">
                            {ladder.levels.map((level, lvi) => (
                              <button
                                key={lvi}
                                onClick={() => handlePromptClick(level.prompt)}
                                className="w-full text-left group"
                              >
                                <div className="rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition p-3 shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${level.color}`}>
                                      {level.tag}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-700 group-hover:text-blue-700 transition">
                                      {level.label}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 group-hover:text-gray-800 leading-snug transition line-clamp-2">
                                    {level.prompt}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 py-3 bg-amber-50 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 text-xs mt-0.5 shrink-0">💡</span>
                    <p className="text-xs text-amber-800 leading-snug">
                      <strong>Tip:</strong> Start with L1 to explore, refine with L2 for depth, then use L3 for board-ready strategic output.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

      </div>
    </div>
  );
}

function ChatBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-md px-5 py-3 text-sm leading-relaxed shadow-md">
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  const preview = message.content.slice(0, 500).replace(/\n/g, ' ');
  const showCollapse = !isStreaming && message.content.length > 0;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] w-full bg-slate-50 border border-gray-200 rounded-2xl rounded-tl-md px-5 py-4 text-sm shadow-sm">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-2 group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">AI Research Assistant</span>
          </div>
          {showCollapse && (
            <span className="text-xs font-bold text-blue-500 group-hover:text-blue-700 tracking-wide transition">
              {expanded ? 'COLLAPSE ▲' : 'EXPAND ▼'}
            </span>
          )}
        </button>

        {isStreaming || expanded ? (
          <>
            <div className="text-gray-900 leading-relaxed prompt-markdown">
              <Markdown>{message.content}</Markdown>
            </div>
            {isStreaming && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <span className="text-xs text-gray-500 font-medium">streaming...</span>
              </div>
            )}
            {!isStreaming && message.content && (
              <div className="mt-3 pt-2.5 border-t border-gray-200 flex items-center gap-3">
                <DownloadMenu content={message.content} filenamePrefix="thermax-analysis" />
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
                  {copied ? (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg><span className="text-emerald-700 font-bold">Copied!</span></>
                  ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-500 text-xs leading-relaxed cursor-pointer" onClick={() => setExpanded(true)}>
            {preview}{message.content.length > 500 ? '...' : ''}
            <span className="ml-2 text-blue-600 font-semibold">Click to expand</span>
          </div>
        )}
      </div>
    </div>
  );
}
