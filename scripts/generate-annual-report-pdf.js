const { jsPDF } = require("jspdf");
const path = require("path");

const OUTPUT = path.join(
  __dirname,
  "..",
  "public",
  "sample-data",
  "marketing",
  "thermax_annual_report_fy2025_26.pdf"
);

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const W = 210;
const H = 297;
const M = 18; // margin
const CW = W - 2 * M; // content width

let y = 0;

function setFont(style, size) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

function textBlock(text, x, startY, maxW, lineH) {
  const lines = doc.splitTextToSize(text, maxW);
  lines.forEach((line) => {
    if (startY > H - 20) {
      doc.addPage();
      startY = M;
      drawFooter();
    }
    doc.text(line, x, startY);
    startY += lineH;
  });
  return startY;
}

function drawFooter() {
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.3);
  doc.line(M, H - 12, W - M, H - 12);
  setFont("normal", 7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Thermax Limited | Annual Report & Market Outlook FY2025-26 | CONFIDENTIAL — For Internal Use Only",
    M,
    H - 8
  );
  doc.text(
    `Page ${doc.internal.getNumberOfPages()}`,
    W - M,
    H - 8,
    { align: "right" }
  );
  doc.setTextColor(0, 0, 0);
}

function sectionTitle(title) {
  if (y > H - 50) {
    doc.addPage();
    y = M;
    drawFooter();
  }
  doc.setDrawColor(204, 102, 0);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + 40, y);
  y += 6;
  setFont("bold", 13);
  doc.setTextColor(0, 51, 102);
  doc.text(title, M, y);
  y += 3;
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 7;
  doc.setTextColor(0, 0, 0);
}

function subTitle(title) {
  if (y > H - 30) {
    doc.addPage();
    y = M;
    drawFooter();
  }
  setFont("bold", 10);
  doc.setTextColor(0, 51, 102);
  doc.text(title, M, y);
  y += 5;
  doc.setTextColor(0, 0, 0);
}

function para(text) {
  setFont("normal", 9);
  y = textBlock(text, M, y, CW, 4.2);
  y += 3;
}

function bulletList(items) {
  setFont("normal", 9);
  items.forEach((item) => {
    if (y > H - 20) {
      doc.addPage();
      y = M;
      drawFooter();
    }
    doc.text("\u2022", M + 2, y);
    y = textBlock(item, M + 7, y, CW - 7, 4.2);
    y += 1;
  });
  y += 2;
}

function simpleTable(headers, rows, colWidths) {
  const rowH = 5.5;
  const startX = M;
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  if (y + (rows.length + 1) * rowH > H - 25) {
    doc.addPage();
    y = M;
    drawFooter();
  }

  // Header
  doc.setFillColor(0, 51, 102);
  doc.rect(startX, y - 3.5, totalW, rowH, "F");
  setFont("bold", 7.5);
  doc.setTextColor(255, 255, 255);
  let cx = startX + 1;
  headers.forEach((h, i) => {
    doc.text(h, cx, y);
    cx += colWidths[i];
  });
  y += rowH;
  doc.setTextColor(0, 0, 0);

  // Rows
  rows.forEach((row, ri) => {
    if (y > H - 20) {
      doc.addPage();
      y = M;
      drawFooter();
    }
    if (ri % 2 === 0) {
      doc.setFillColor(240, 245, 250);
      doc.rect(startX, y - 3.5, totalW, rowH, "F");
    }
    setFont("normal", 7.5);
    cx = startX + 1;
    row.forEach((cell, i) => {
      const txt = doc.splitTextToSize(String(cell), colWidths[i] - 2);
      doc.text(txt[0] || "", cx, y);
      cx += colWidths[i];
    });
    y += rowH;
  });
  y += 4;
}

// ========== PAGE 1: COVER ==========
doc.setFillColor(0, 51, 102);
doc.rect(0, 0, W, H, "F");

doc.setFillColor(204, 102, 0);
doc.rect(0, 0, W, 8, "F");
doc.rect(0, H - 8, W, 8, "F");

setFont("normal", 10);
doc.setTextColor(204, 102, 0);
doc.text("THERMAX LIMITED", W / 2, 45, { align: "center" });

setFont("bold", 28);
doc.setTextColor(255, 255, 255);
doc.text("Annual Report", W / 2, 70, { align: "center" });
doc.text("& Market Outlook", W / 2, 82, { align: "center" });

setFont("bold", 18);
doc.setTextColor(204, 102, 0);
doc.text("FY 2025-26", W / 2, 100, { align: "center" });

doc.setDrawColor(204, 102, 0);
doc.setLineWidth(1);
doc.line(W / 2 - 40, 107, W / 2 + 40, 107);

setFont("normal", 11);
doc.setTextColor(200, 210, 220);
doc.text("Energising Industrial Growth.", W / 2, 120, { align: "center" });
doc.text("Engineering a Sustainable Future.", W / 2, 127, { align: "center" });

setFont("normal", 9);
doc.setTextColor(180, 190, 200);
const coverLines = [
  "Registered Office: D-13, MIDC Industrial Estate, Chinchwad, Pune 411 019, Maharashtra, India",
  "CIN: L29299PN1980PLC022787 | BSE: 500411 | NSE: THERMAX",
  "",
  "This document is prepared for internal strategic planning and AI system data integration.",
  "It contains synthetic data modelled on publicly available Thermax information.",
  "Strictly Confidential — Not for External Distribution.",
];
let coverY = 160;
coverLines.forEach((l) => {
  doc.text(l, W / 2, coverY, { align: "center" });
  coverY += 5;
});

setFont("bold", 9);
doc.setTextColor(204, 102, 0);
doc.text("Divisions: Energy | Environment | Chemical | Cooling", W / 2, 210, {
  align: "center",
});
doc.text("Subsidiaries: Thermax Babcock & Wilcox | Thermax Engineering Construction | Thermax Onsite Energy Solutions", W / 2, 217, {
  align: "center",
});

drawFooter();

// ========== PAGE 2: TABLE OF CONTENTS ==========
doc.addPage();
y = M;
drawFooter();

setFont("bold", 16);
doc.setTextColor(0, 51, 102);
doc.text("Table of Contents", M, y);
y += 12;

const toc = [
  ["1.", "Chairman's Statement & Strategic Outlook", "3"],
  ["2.", "Financial Performance Summary — FY2025-26", "3"],
  ["3.", "Division-wise Performance Analysis", "4"],
  ["4.", "Order Book & Pipeline Analysis", "5"],
  ["5.", "Key Market Trends & Regulatory Landscape", "6"],
  ["6.", "Competitive Positioning & Win/Loss Analysis", "7"],
  ["7.", "Customer Portfolio & Account Intelligence", "8"],
  ["8.", "Geographic Expansion & International Markets", "8"],
  ["9.", "Innovation, R&D & Technology Roadmap", "9"],
  ["10.", "FY2026-27 Guidance & Strategic Growth Drivers", "9"],
  ["", "Annexure A — Top 25 Target Accounts", "10"],
  ["", "Annexure B — Sector-wise Opportunity Matrix", "10"],
  ["", "Annexure C — Risk Register & Mitigation", "10"],
];
setFont("normal", 10);
doc.setTextColor(0, 0, 0);
toc.forEach((item) => {
  doc.text(item[0], M, y);
  doc.text(item[1], M + 10, y);
  setFont("normal", 10);
  doc.setTextColor(100, 100, 100);
  doc.text(item[2], W - M, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(M + 10 + doc.getTextWidth(item[1]) + 2, y, W - M - 8, y);
  doc.setLineDashPattern([], 0);
  y += 7;
});

// ========== PAGE 3: CHAIRMAN'S STATEMENT + FINANCIAL SUMMARY ==========
doc.addPage();
y = M;
drawFooter();

sectionTitle("1. Chairman's Statement & Strategic Outlook");

para(
  "Dear Stakeholders, FY2025-26 has been a transformational year for Thermax Limited. We achieved consolidated revenue of INR 9,847 Cr, a growth of 14.2% over FY2024-25, driven by strong order inflows across all four divisions. Our EBITDA margin expanded to 12.8%, reflecting operational efficiencies and a favourable product mix. The order book as of March 2026 stands at INR 12,340 Cr — the highest in Thermax's history — providing revenue visibility for the next 18-24 months."
);

para(
  "The global decarbonisation imperative continues to create significant tailwinds for our business. India's tightening emission norms (CPCB Phase III mandating NOx limits of 100 mg/Nm3 for thermal plants), the European CBAM mechanism affecting Indian exporters, and MNRE's biomass co-firing mandates are driving unprecedented demand for our flue gas desulphurisation (FGD), waste heat recovery systems (WHRS), and biomass boiler technologies."
);

para(
  "Internationally, we see accelerating opportunities in the Middle East (NEOM, Saudi Vision 2030 industrial zones), Southeast Asia (Thailand and Vietnam coal-to-gas transitions), and Africa (municipal water treatment under World Bank financing). Our international order book grew 22% to INR 2,890 Cr. I am particularly excited about our strategic partnership with Saudi Aramco for process heaters at Ras Tanura refinery — our largest single international order at INR 210 Cr."
);

para(
  "Looking ahead, we are investing aggressively in AI-powered operations through the Thermax Agentic AI Operating System 2030. This initiative deploys 9 specialised AI agents across our end-to-end business flow — from market intelligence to O&M services — with robust human-in-the-loop governance. The system has already demonstrated a 40% reduction in proposal turnaround time and a 60% improvement in lead qualification accuracy during pilot deployment."
);

setFont("italic", 9);
doc.setTextColor(100, 100, 100);
y = textBlock(
  "— Meher Pudumjee, Chairperson, Thermax Limited",
  M,
  y,
  CW,
  4.2
);
y += 8;
doc.setTextColor(0, 0, 0);

sectionTitle("2. Financial Performance Summary — FY2025-26");

simpleTable(
  ["Metric", "FY2025-26", "FY2024-25", "Growth %", "Remarks"],
  [
    ["Consolidated Revenue", "INR 9,847 Cr", "INR 8,623 Cr", "14.2%", "All divisions contributed"],
    ["EBITDA", "INR 1,260 Cr", "INR 1,035 Cr", "21.7%", "Margin: 12.8% vs 12.0%"],
    ["PAT (Net Profit)", "INR 782 Cr", "INR 645 Cr", "21.2%", "PAT Margin: 7.9%"],
    ["Order Inflow", "INR 13,210 Cr", "INR 10,870 Cr", "21.5%", "Record inflows"],
    ["Order Book (closing)", "INR 12,340 Cr", "INR 9,980 Cr", "23.6%", "Highest ever"],
    ["RoCE", "22.4%", "19.8%", "+260 bps", "Capital efficiency improving"],
    ["Free Cash Flow", "INR 520 Cr", "INR 380 Cr", "36.8%", "Working capital discipline"],
    ["Dividend per Share", "INR 12", "INR 10", "20.0%", "Payout ratio: 18%"],
    ["International Revenue", "INR 2,460 Cr", "INR 1,980 Cr", "24.2%", "25% of total revenue"],
    ["R&D Spend", "INR 285 Cr", "INR 230 Cr", "23.9%", "2.9% of revenue"],
  ],
  [32, 28, 28, 18, 68]
);

subTitle("Revenue Segmentation by Division (FY2025-26)");
simpleTable(
  ["Division", "Revenue (INR Cr)", "% Share", "YoY Growth", "Order Book (Cr)", "Key Driver"],
  [
    ["Energy", "4,135", "42%", "12.8%", "5,200", "Boilers, WHRS, biomass"],
    ["Environment", "2,856", "29%", "18.4%", "3,700", "FGD, water treatment, ZLD"],
    ["Chemical", "1,872", "19%", "11.2%", "2,040", "Ion exchange, specialty chemicals"],
    ["Cooling", "984", "10%", "9.6%", "1,400", "Absorption chillers, HVAC"],
  ],
  [26, 28, 16, 20, 28, 56]
);

// ========== PAGE 4: DIVISION-WISE PERFORMANCE ==========
doc.addPage();
y = M;
drawFooter();

sectionTitle("3. Division-wise Performance Analysis");

subTitle("3.1 Energy Division (42% of Revenue — INR 4,135 Cr)");
para(
  "The Energy division delivered robust growth of 12.8%, driven by large-ticket boiler orders from the cement and steel sectors. FGD orders from state gencos (NTPC Singrauli Units 3-5 at INR 280 Cr, MSEDCL Bhusawal at INR 145 Cr) were significant contributors. Biomass boilers gained traction due to MNRE's 5% co-firing mandate — Adani Power Mundra (INR 95 Cr) and Tata Power Trombay (INR 78 Cr) entered the pipeline. WHRS orders from UltraTech Cement (INR 120 Cr) and Dalmia Cement (INR 85 Cr) reflect the cement industry's aggressive decarbonisation push."
);

para(
  "Key risks: Execution timelines on large EPC projects remain stretched (average 18-24 months); raw material price volatility (steel, nickel) compresses margins on fixed-price contracts; BHEL and L&T remain aggressive competitors on FGD projects with government clients."
);

subTitle("3.2 Environment Division (29% of Revenue — INR 2,856 Cr)");
para(
  "Environment grew fastest at 18.4%, fuelled by Zero Liquid Discharge (ZLD) mandates in textiles (Arvind Ltd — INR 38 Cr ZLD system) and pharma (Cipla Goa — INR 45 Cr clean utility system). Water treatment for industrial zones continues to expand — Dahej PCPIR (INR 112 Cr), Vizag SEZ (INR 87 Cr). The Saudi NEOM water treatment consortium (where Thermax is an EPC sub-contractor to ACCIONA) represents a breakthrough in mega-project participation. Municipal water treatment under Smart Cities Mission Phase 2 yielded 3 new orders worth INR 210 Cr total."
);

para(
  "Innovation highlight: Launch of the 'AquaSure-AI' real-time water quality prediction system — an IoT+ML platform that reduces chemical dosing costs by 15-20% and has been piloted at 8 customer sites with positive results."
);

subTitle("3.3 Chemical Division (19% of Revenue — INR 1,872 Cr)");
para(
  "The Chemical division grew 11.2%, led by strong demand for ion exchange resins from pharma (water-for-injection grade) and power (condensate polishing). Specialty chemical sales to food & beverage processing rose 28% due to FSSAI's stricter water quality standards for packaged foods. Our joint venture with Solenis (now Diversey) for paper industry chemicals contributed INR 180 Cr. Export revenues from the chemical division reached INR 320 Cr — a 32% increase — largely driven by sales to Southeast Asian markets."
);

subTitle("3.4 Cooling Division (10% of Revenue — INR 984 Cr)");
para(
  "Cooling division grew 9.6%, with vapour absorption machines (VAMs) seeing a resurgence in data centre cooling applications. Three data centre cooling orders (totaling INR 135 Cr) from Yotta Infrastructure, NTT Communications, and AdaniConneX highlight this emerging vertical. The HVAC segment for pharmaceutical clean rooms contributed INR 220 Cr. District cooling projects in Dubai (INR 65 Cr) represent our expanding footprint in Middle East real estate and hospitality sectors."
);

// ========== PAGE 5: ORDER BOOK & PIPELINE ==========
doc.addPage();
y = M;
drawFooter();

sectionTitle("4. Order Book & Pipeline Analysis");

subTitle("4.1 Order Book Composition (INR 12,340 Cr as of March 2026)");
simpleTable(
  ["Sector", "Order Book (Cr)", "% Share", "Avg. Ticket (Cr)", "Execution (months)", "Top Customer"],
  [
    ["Cement", "2,470", "20%", "95", "18", "UltraTech, Dalmia, Shree Cement"],
    ["Power & Utilities", "2,220", "18%", "180", "24", "NTPC, MSEDCL, Tata Power"],
    ["Oil & Gas", "1,850", "15%", "150", "20", "Reliance, Saudi Aramco, KNPC"],
    ["Steel & Metals", "1,600", "13%", "120", "18", "Tata Steel, JSW, Hindalco"],
    ["Pharma & Healthcare", "1,110", "9%", "42", "12", "Cipla, Aurobindo, Dr. Reddy's"],
    ["Textiles", "740", "6%", "35", "10", "Arvind, Raymond, Welspun"],
    ["Water & Municipal", "1,234", "10%", "70", "15", "Pune MC, Chennai Metro, NEOM"],
    ["Chemicals", "620", "5%", "55", "12", "PI Industries, SRF, Aarti"],
    ["Data Centres", "496", "4%", "135", "14", "Yotta, NTT, AdaniConneX"],
  ],
  [28, 24, 14, 22, 24, 62]
);

subTitle("4.2 Active Pipeline (INR 18,500 Cr — Weighted Value INR 8,900 Cr)");
para(
  "Our active pipeline stands at INR 18,500 Cr across 142 tracked opportunities, with a weighted probability-adjusted value of INR 8,900 Cr. The win rate in FY2025-26 improved to 34% (from 28% in FY2024-25), reflecting better proposal quality and earlier engagement in the customer decision cycle."
);

simpleTable(
  ["Pipeline Stage", "Opportunities", "Gross Value (Cr)", "Weighted (Cr)", "Avg. Probability"],
  [
    ["Qualification", "42", "6,200", "2,170", "35%"],
    ["Proposal Submitted", "38", "5,800", "3,190", "55%"],
    ["Negotiation", "28", "3,400", "2,380", "70%"],
    ["Final Decision", "18", "2,100", "1,680", "80%"],
    ["Won — Pending PO", "16", "1,000", "950", "95%"],
  ],
  [30, 24, 30, 30, 30]
);

subTitle("4.3 Top 10 Pipeline Opportunities (Active Pursuit)");
simpleTable(
  ["Account", "Project", "Value (Cr)", "Stage", "Win Prob.", "Competitor"],
  [
    ["Reliance Industries", "Hydrogen Unit — Jamnagar", "340", "Qualification", "40%", "Linde / L&T"],
    ["NTPC Ltd", "FGD — Singrauli Units 3-5", "280", "Proposal", "55%", "BHEL / L&T"],
    ["Saudi Aramco", "Process Heaters — Ras Tanura", "210", "Proposal", "50%", "Alfa Laval"],
    ["Tata Steel", "WHR — Jamshedpur BF#3", "185", "Proposal", "65%", "L&T"],
    ["JSW Steel", "COG Recovery — Vijayanagar", "155", "Qualification", "35%", "Danieli"],
    ["UltraTech Cement", "Kiln WHRS + Bag Filter", "120", "Negotiation", "80%", "ISGEC"],
    ["Adani Power", "Biomass Co-firing — Mundra", "95", "Qualification", "45%", "Babcock"],
    ["Hindalco", "Captive Power Boiler", "92", "Proposal", "60%", "BHEL"],
    ["NEOM (via ACCIONA)", "Water Treatment Package", "85", "Negotiation", "75%", "Veolia"],
    ["Cipla Ltd", "Clean Utility — Goa Plant", "45", "Proposal", "70%", "Forbes Marshall"],
  ],
  [30, 38, 18, 22, 18, 28]
);

// ========== PAGE 6: MARKET TRENDS ==========
doc.addPage();
y = M;
drawFooter();

sectionTitle("5. Key Market Trends & Regulatory Landscape");

subTitle("5.1 Emission Norms — CPCB Phase III (Critical)");
para(
  "The Central Pollution Control Board has mandated NOx limits of 100 mg/Nm3 for all thermal power plants above 500 MW, effective January 2027. This creates a retrofit window of 18-24 months for approximately 85 GW of installed coal-based capacity. Thermax's addressable market for FGD and SCR systems is estimated at INR 8,000-10,000 Cr. Currently, only 35% of the installed base has contracted for retrofits — the remaining 55 GW represents an immediate opportunity. Key competitors: BHEL (incumbent in 40% of plants), L&T (aggressive pricing), and Chinese EPC firms (SEPCO, DEC) offering 15-20% lower prices but facing quality perception issues."
);

subTitle("5.2 Industrial Boiler Market (High Growth)");
para(
  "India's industrial boiler market is projected to grow at 8.2% CAGR through 2030 (Frost & Sullivan). Biomass boilers are gaining share rapidly — from 12% in FY2024 to a projected 22% by FY2028 — driven by MNRE's co-firing mandates and carbon credit monetisation. Thermax holds an estimated 28% market share in industrial boilers (by value) and 35% in biomass-capable boilers. The shift from imported coal to domestic biomass pellets is creating a structural cost advantage for biomass boiler operators, with payback periods reducing from 5 years to 3.2 years."
);

subTitle("5.3 Zero Liquid Discharge (ZLD) Mandates");
para(
  "State Pollution Control Boards in Gujarat, Maharashtra, Tamil Nadu, and Andhra Pradesh have mandated ZLD for textiles, pharma, and chemical industries in 23 industrial zones. The addressable market is estimated at INR 4,500 Cr over 3 years. Thermax's multi-effect evaporator + RO + crystalliser combination is the preferred technology for high-TDS effluent treatment (>50,000 mg/L). We have a 32% share in industrial ZLD systems by installed capacity."
);

subTitle("5.4 European Carbon Border Adjustment Mechanism (CBAM)");
para(
  "CBAM, effective from January 2026 (reporting phase), will impose carbon tariffs on Indian exports of steel, cement, aluminium, fertilisers, and hydrogen. An estimated 120 Indian exporters with combined exports of USD 8.5 Bn will be affected. These companies urgently need to reduce carbon intensity — creating demand for Thermax's waste heat recovery, energy-efficient boilers, and process optimisation solutions. We estimate an addressable market of INR 2,200 Cr from CBAM-driven technology upgrades over the next 3 years."
);

subTitle("5.5 Data Centre Cooling (Emerging)");
para(
  "India's data centre capacity is projected to triple from 800 MW in 2025 to 2,400 MW by 2028 (CRISIL). Each MW of IT load requires approximately 0.4 MW of cooling. Absorption chillers running on waste heat or natural gas offer 30-40% lower operating costs than conventional electric chillers at scale. Thermax has secured 3 data centre cooling orders (INR 135 Cr) in FY26 and targets INR 500 Cr annual revenue from this vertical by FY2028."
);

subTitle("5.6 Waste-to-Energy (WtE)");
para(
  "The Smart Cities Mission Phase 2 has allocated INR 8,000 Cr for municipal solid waste-to-energy plants across 15 cities. Thermax's moving grate combustion technology (licensed from Martin GmbH) positions us as a preferred EPC partner. We are in active pursuit for 4 WtE projects (Pune, Nagpur, Indore, Ahmedabad) with a combined pipeline of INR 1,400 Cr. The competitive landscape includes Hitachi Zosen, CNIM, and Keppel Seghers."
);

// ========== PAGE 7: COMPETITIVE POSITIONING ==========
doc.addPage();
y = M;
drawFooter();

sectionTitle("6. Competitive Positioning & Win/Loss Analysis");

subTitle("6.1 Market Position by Segment");
simpleTable(
  ["Segment", "Thermax Share", "Rank", "#1 Competitor", "#2 Competitor", "Thermax Advantage"],
  [
    ["Industrial Boilers", "28%", "#1", "BHEL (22%)", "ISGEC (15%)", "Tech range + service"],
    ["Biomass Boilers", "35%", "#1", "Cethar (18%)", "ISGEC (12%)", "Fuel flexibility"],
    ["FGD Systems", "15%", "#3", "BHEL (35%)", "L&T (20%)", "Quality + speed"],
    ["Water Treatment", "18%", "#2", "Veolia (22%)", "SUEZ (14%)", "Domestic + chemical"],
    ["ZLD Systems", "32%", "#1", "Praj (18%)", "ENCON (10%)", "Integrated solution"],
    ["Absorption Chillers", "45%", "#1", "Carrier (20%)", "Broad (12%)", "Technology leader"],
    ["Ion Exchange Resins", "24%", "#2", "Purolite (28%)", "Lanxess (18%)", "Cost + local mfg."],
    ["Process Heaters", "20%", "#2", "Alfa Laval (25%)", "Wesman (15%)", "Full EPC capability"],
  ],
  [28, 22, 12, 28, 28, 36]
);

subTitle("6.2 Win/Loss Analysis — FY2025-26");
simpleTable(
  ["Metric", "FY2025-26", "FY2024-25", "Change", "Root Cause"],
  [
    ["Total Bids Submitted", "218", "195", "+12%", "Pipeline expansion"],
    ["Wins", "74", "55", "+35%", "Better solutioning"],
    ["Losses", "112", "108", "+4%", "Price competition"],
    ["Win Rate", "34%", "28%", "+6 pp", "Improved proposal quality"],
    ["Avg. Win Value", "INR 42 Cr", "INR 38 Cr", "+11%", "Larger ticket pursuits"],
    ["Top Loss Reason", "Price", "Price", "—", "65% of losses on price"],
    ["#2 Loss Reason", "Tech Spec Mismatch", "Delivery Time", "Changed", "Better logistics"],
    ["Competitor Most Lost To", "BHEL", "L&T", "Changed", "Govt. projects"],
  ],
  [34, 26, 24, 18, 72]
);

subTitle("6.3 Strategic Response to Competitive Threats");
bulletList([
  "Price Competition (BHEL, Chinese EPC): Thermax is launching 'Value Engineering 2.0' — a standardised design library that reduces engineering hours by 30% and enables 8-12% cost reduction on repeat configurations without margin impact.",
  "Technology Gap (Hydrogen, Carbon Capture): R&D collaboration with IIT Bombay on green hydrogen electrolysers (INR 45 Cr investment over 3 years). Pilot hydrogen unit at Thermax Chinchwad campus by Q2 FY2027.",
  "International Expansion (Middle East, SE Asia): New sales offices in Riyadh and Ho Chi Minh City. Local engineering centres to reduce proposal turnaround from 6 weeks to 3 weeks for international bids.",
  "Service Revenue Growth: Target 15% of revenue from O&M services by FY2028 (currently 8%). Digital twin deployment on top 50 installed boilers for predictive maintenance monetisation.",
]);

// ========== PAGE 8: CUSTOMER PORTFOLIO + GEOGRAPHY ==========
doc.addPage();
y = M;
drawFooter();

sectionTitle("7. Customer Portfolio & Account Intelligence");

subTitle("7.1 Customer Concentration & Health");
simpleTable(
  ["Tier", "Accounts", "Revenue (Cr)", "% Share", "Avg. LTV (Cr)", "CSAT", "Strategy"],
  [
    ["Tier 1 — Strategic", "12", "4,430", "45%", "185", "4.2", "Deepen, cross-sell"],
    ["Tier 2 — Growth", "28", "3,150", "32%", "72", "4.1", "Expand wallet share"],
    ["Tier 3 — Explore", "45", "1,580", "16%", "18", "3.8", "Qualify & convert"],
    ["Tier 4 — Transactional", "180+", "687", "7%", "4", "3.5", "Automate & standardise"],
  ],
  [32, 18, 24, 16, 24, 12, 48]
);

subTitle("7.2 Top 10 Accounts by Revenue (FY2025-26)");
simpleTable(
  ["Rank", "Account", "Industry", "Revenue (Cr)", "Installed Base", "Open Pipeline (Cr)", "Relationship"],
  [
    ["1", "NTPC Ltd", "Power", "620", "14 boilers, 3 FGD", "280", "20+ years"],
    ["2", "Tata Steel", "Steel", "485", "8 boilers, 2 WHRS", "185", "25+ years"],
    ["3", "UltraTech Cement", "Cement", "380", "12 boilers, 4 WHRS", "120", "15+ years"],
    ["4", "Reliance Industries", "Oil & Gas", "310", "6 heaters, 2 WTP", "340", "10+ years"],
    ["5", "Cipla Ltd", "Pharma", "180", "3 chillers, 1 WTP", "45", "8+ years"],
    ["6", "Arvind Ltd", "Textiles", "145", "2 boilers, 1 ZLD", "38", "12+ years"],
    ["7", "Hindalco", "Metals", "130", "4 boilers, 1 WHRS", "92", "15+ years"],
    ["8", "Saudi Aramco", "Oil & Gas", "125", "New account", "210", "2 years"],
    ["9", "Adani Power", "Power", "110", "2 boilers", "95", "5 years"],
    ["10", "JSW Steel", "Steel", "105", "3 boilers, 1 WHRS", "155", "10+ years"],
  ],
  [10, 26, 18, 22, 28, 28, 22]
);

para(
  "Customer concentration risk: Top 10 accounts contribute 58% of revenue. Strategic action: Expand Tier 3 conversion rate from 12% to 20% through early-engagement marketing automation and the AI-powered Market Intelligence Agent. Target: reduce top-10 concentration to below 50% by FY2028."
);

sectionTitle("8. Geographic Expansion & International Markets");

subTitle("8.1 Revenue by Geography");
simpleTable(
  ["Region", "Revenue (Cr)", "% Share", "Growth %", "Key Markets", "Order Book (Cr)"],
  [
    ["India — North & Central", "2,660", "27%", "11%", "UP, MP, Rajasthan, Delhi NCR", "3,200"],
    ["India — West", "2,560", "26%", "13%", "Gujarat, Maharashtra, Goa", "3,100"],
    ["India — South", "1,480", "15%", "15%", "Tamil Nadu, AP, Karnataka, Telangana", "1,800"],
    ["India — East", "690", "7%", "9%", "WB, Jharkhand, Odisha, Bihar", "870"],
    ["Middle East & Africa", "1,280", "13%", "28%", "Saudi Arabia, UAE, Egypt, Kenya", "1,650"],
    ["Southeast Asia", "680", "7%", "22%", "Thailand, Vietnam, Indonesia", "920"],
    ["Rest of World", "497", "5%", "18%", "Europe, Bangladesh, Sri Lanka", "800"],
  ],
  [36, 22, 14, 16, 44, 24]
);

para(
  "International revenue crossed 25% of total revenue for the first time, up from 23% in FY2025. The Middle East is the fastest-growing region at 28%, driven by Saudi Vision 2030 industrial mega-projects. Southeast Asia growth (22%) is fuelled by coal-to-gas transitions and industrial water treatment demand. Target: 30% of revenue from international markets by FY2028."
);

// ========== PAGE 9: INNOVATION + GUIDANCE ==========
doc.addPage();
y = M;
drawFooter();

sectionTitle("9. Innovation, R&D & Technology Roadmap");

subTitle("9.1 R&D Investment & Focus Areas");
para(
  "R&D spend increased 23.9% to INR 285 Cr (2.9% of revenue). We filed 18 new patents in FY26 (total portfolio: 142 active patents). Key R&D centres: Pune (headquarters, 180 engineers), Hyderabad (combustion lab, 45 engineers), and Baroda (chemical R&D, 30 engineers). R&D collaborations: IIT Bombay (hydrogen), IIT Madras (CFD for boiler optimisation), and CSIR-NCL (advanced ion exchange resins)."
);

simpleTable(
  ["R&D Program", "Investment (Cr)", "Stage", "Expected Launch", "Market Potential (Cr/yr)", "Partner"],
  [
    ["Green Hydrogen Electrolyser", "45", "Pilot", "Q2 FY2027", "800", "IIT Bombay"],
    ["AquaSure-AI (WTP Digital Twin)", "22", "Deployed (8 sites)", "Launched Q3 FY26", "120", "In-house"],
    ["Next-Gen Biomass Boiler (50 TPH)", "35", "Prototype", "Q4 FY2027", "400", "Thermax R&D"],
    ["Carbon Capture (Post-combustion)", "38", "Lab Scale", "FY2029", "1,500", "CSIR-NCL"],
    ["AI-Optimised Combustion Control", "18", "Pilot (3 sites)", "Q1 FY2027", "200", "TCS Research"],
    ["Electric Boiler Range", "28", "Design", "Q3 FY2027", "300", "ABB India"],
    ["Smart Chemical Dosing Platform", "15", "Deployed (12 sites)", "Launched Q1 FY26", "80", "In-house"],
    ["Modular Waste-to-Energy Unit", "42", "Engineering", "FY2028", "600", "Martin GmbH"],
  ],
  [40, 22, 28, 24, 30, 24]
);

subTitle("9.2 Digital & AI Initiatives");
bulletList([
  "Thermax Agentic AI Operating System 2030: 9 specialised AI agents deployed across the business flow with human-in-the-loop governance. Pilot results: 40% faster proposals, 60% better lead scoring, 25% reduction in contract review time.",
  "AI Nexus Platform: Asset Performance Monitoring (2,000+ failure modes, 4 site locations) and Tender Intelligence Tool (automated RFP extraction across Water Treatment, Boilers, Heating, Solar Thermal divisions).",
  "Digital Twin Deployment: 50 boiler digital twins operational, providing predictive maintenance insights. Targeting 200 by FY2028. Estimated O&M revenue uplift: INR 80 Cr/year from service contract upgrades.",
  "IoT Sensor Network: 12,000+ sensors deployed across 35 customer sites. Real-time telemetry ingestion for the Asset Performance Platform. Anomaly detection accuracy: 94.2%.",
]);

y += 4;
sectionTitle("10. FY2026-27 Guidance & Strategic Growth Drivers");

subTitle("10.1 Financial Targets");
simpleTable(
  ["Metric", "FY2025-26 (Actual)", "FY2026-27 (Target)", "Growth Implied", "Key Assumption"],
  [
    ["Revenue", "INR 9,847 Cr", "INR 11,200-11,500 Cr", "14-17%", "Order execution + new wins"],
    ["EBITDA Margin", "12.8%", "13.0-13.5%", "+20-70 bps", "Value engineering savings"],
    ["Order Inflow", "INR 13,210 Cr", "INR 15,000+ Cr", "14%+", "FGD + biomass + international"],
    ["International Revenue %", "25%", "28-30%", "+3-5 pp", "Saudi, Vietnam expansion"],
    ["R&D as % Revenue", "2.9%", "3.0-3.2%", "+10-30 bps", "Hydrogen + carbon capture"],
    ["Service Revenue %", "8%", "10%", "+2 pp", "Digital twin monetisation"],
  ],
  [30, 30, 30, 22, 62]
);

subTitle("10.2 Strategic Growth Drivers for FY2027");
bulletList([
  "FGD Retrofit Wave (INR 3,000+ Cr addressable): Target 5-6 new FGD orders from NTPC, DVC, MSEDCL, and Tata Power before CPCB Phase III deadline of Jan 2027.",
  "Biomass Boiler Expansion: Launch 50 TPH next-gen boiler with 15% higher efficiency. Target 20+ orders from sugar, paper, and rice industries.",
  "Middle East Breakthrough: Scale Saudi operations with 2-3 large process heater orders from Aramco, KNPC, and ADNOC. Target INR 500+ Cr in ME order inflow.",
  "Data Centre Cooling: Secure 5+ data centre orders (INR 300+ Cr) from hyperscalers and colocation providers in India and Southeast Asia.",
  "ZLD + Water: Capture 10+ ZLD orders from textile and pharma clusters in Gujarat, Tamil Nadu, and AP. Target INR 400+ Cr.",
  "AI-Powered Operations: Full rollout of the Agentic AI Operating System across all business units. Target 50% adoption by March 2027. Expected productivity gain: 25% in proposal and engineering functions.",
  "Service Revenue Ramp: Deploy digital twins on 100 additional boilers. Launch 'TherMax Care' subscription O&M service. Target INR 1,000+ Cr service revenue by FY2028.",
]);

// ========== PAGE 10: ANNEXURES ==========
doc.addPage();
y = M;
drawFooter();

sectionTitle("Annexure A — Top 25 Target Accounts for FY2027 Pursuit");

simpleTable(
  ["#", "Account", "Sector", "Region", "Est. Potential (Cr)", "Priority", "Current Status"],
  [
    ["1", "NTPC Ltd", "Power", "India — North", "500+", "P1", "Active Customer"],
    ["2", "Reliance Industries", "Oil & Gas", "India — West", "400+", "P1", "Active Prospect"],
    ["3", "Saudi Aramco", "Oil & Gas", "Middle East", "350+", "P1", "Active Prospect"],
    ["4", "Tata Steel", "Steel", "India — East", "300+", "P1", "Active Customer"],
    ["5", "UltraTech Cement", "Cement", "India — West", "250+", "P1", "Active Customer"],
    ["6", "JSW Steel", "Steel", "India — South", "200+", "P2", "Dormant"],
    ["7", "Adani Group", "Multi", "India — West", "200+", "P1", "Active Prospect"],
    ["8", "KNPC (Kuwait)", "Oil & Gas", "Middle East", "180+", "P2", "New Prospect"],
    ["9", "Hindalco", "Metals", "India — East", "150+", "P2", "Active Customer"],
    ["10", "DVC (Damodar Valley)", "Power", "India — East", "140+", "P2", "Active Prospect"],
    ["11", "Dalmia Cement", "Cement", "India — South", "120+", "P2", "Active Customer"],
    ["12", "Cipla Ltd", "Pharma", "India — West", "100+", "P2", "Active Customer"],
    ["13", "Aurobindo Pharma", "Pharma", "India — South", "80+", "P3", "New Prospect"],
    ["14", "NEOM (Saudi)", "Multi", "Middle East", "150+", "P1", "Via ACCIONA"],
    ["15", "Vietnam Oil & Gas (PVN)", "Oil & Gas", "SE Asia", "120+", "P2", "New Prospect"],
    ["16", "SCG Chemicals (Thailand)", "Chemicals", "SE Asia", "90+", "P3", "New Prospect"],
    ["17", "Yotta Infrastructure", "Data Centre", "India — West", "80+", "P2", "New Customer"],
    ["18", "PI Industries", "Chemicals", "India — West", "60+", "P3", "New Prospect"],
    ["19", "SRF Ltd", "Chemicals", "India — North", "55+", "P3", "New Prospect"],
    ["20", "Arvind Ltd", "Textiles", "India — West", "50+", "P2", "Active Customer"],
  ],
  [8, 30, 18, 26, 28, 14, 28]
);

y += 2;
sectionTitle("Annexure B — Sector-wise Opportunity Matrix (FY2027)");

simpleTable(
  ["Sector", "TAM (Cr)", "Thermax SAM (Cr)", "Current Share", "Target Share", "Key Lever"],
  [
    ["Power — FGD/SCR", "10,000", "3,500", "15%", "22%", "CPCB Phase III mandate"],
    ["Industrial Boilers", "6,500", "4,200", "28%", "32%", "Biomass transition"],
    ["Water & ZLD", "4,500", "2,800", "18%", "24%", "State pollution mandates"],
    ["Oil & Gas Equipment", "3,200", "1,600", "20%", "25%", "Refinery modernisation"],
    ["Cooling & HVAC", "2,800", "1,200", "12%", "18%", "Data centre expansion"],
    ["Waste-to-Energy", "2,000", "800", "5%", "12%", "Smart Cities Phase 2"],
    ["Specialty Chemicals", "1,500", "900", "24%", "28%", "Pharma + F&B quality"],
    ["Hydrogen & CCUS", "800", "200", "0%", "5%", "First-mover play"],
  ],
  [28, 18, 28, 22, 22, 36]
);

y += 2;
sectionTitle("Annexure C — Risk Register & Mitigation");

simpleTable(
  ["Risk", "Probability", "Impact", "Score", "Mitigation", "Owner"],
  [
    ["Raw material price spike (steel, nickel)", "High", "High", "9", "Hedging + price variation clauses", "CFO"],
    ["FGD order delays (regulatory timeline)", "Medium", "High", "6", "Diversify into non-FGD revenue", "BU Head Energy"],
    ["Chinese EPC undercutting", "High", "Medium", "6", "Value engineering + service bundling", "Sales Director"],
    ["Key talent attrition (engineers)", "Medium", "High", "6", "Retention incentives + upskilling", "CHRO"],
    ["Customer concentration (top 10 = 58%)", "Medium", "Medium", "4", "Expand Tier 3 conversion", "CMO"],
    ["Technology obsolescence (H2, CCUS)", "Low", "High", "3", "R&D investment + partnerships", "CTO"],
    ["Geopolitical (Middle East operations)", "Low", "Medium", "2", "Political risk insurance", "CFO"],
    ["Cybersecurity (AI/IoT systems)", "Low", "High", "3", "SOC + zero-trust architecture", "CIO"],
  ],
  [34, 18, 16, 12, 42, 28]
);

// Save
doc.save(OUTPUT);
console.log("PDF generated at:", OUTPUT);
console.log("Pages:", doc.internal.getNumberOfPages());
