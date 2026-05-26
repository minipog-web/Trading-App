export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  fundingRate?: number; // Crypto-only
  liquidations?: number; // Crypto-only
  whaleAccumulation?: number;
  proTraderSentiment?: number;
}

export interface AssetInfo {
  id: string;
  name: string;
  category: 'crypto' | 'equity' | 'commodity';
  basePrice: number;
  volatility: number;
  drift: number;
  parentIndex?: string; // e.g. 'NASDAQ', 'SPX', 'NYSE'
}

export interface MacroDataPoint {
  date: string;
  cpi: number;         // CPI YoY %
  fedFundsRate: number; // Fed Funds Rate %
  dxy: number;          // US Dollar Index
  vix: number;          // Volatility Index
  wti: number;          // WTI Crude Oil Price
  liquidity: number;    // Global Liquidity Proxy
}

export interface NewsArticle {
  id: string;
  date: string;
  headline: string;
  assetClass: 'crypto' | 'equity' | 'commodity' | 'macro';
  embedding: number[]; // 4D vector: [Geopolitical, Inflation, Earnings, Regulatory]
  sentiment: number;   // -1 to 1
  impact: number;      // 0 to 100
}

// Seeded random number generator for reproducibility
class SeededRandom {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed;
  }
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  // Box-Muller transform for normal distribution
  nextGaussian(): number {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

const SP500_NAMES: Record<string, string> = {
  MMM: "3M Company",
  AOS: "A. O. Smith Corporation",
  ABT: "Abbott Laboratories",
  ABBV: "AbbVie Inc.",
  ACN: "Accenture plc",
  ADBE: "Adobe Inc.",
  AMD: "Advanced Micro Devices Inc.",
  AES: "AES Corporation",
  AFL: "Aflac Incorporated",
  A: "Agilent Technologies Inc.",
  APD: "Air Products and Chemicals Inc.",
  ABNB: "Airbnb Inc.",
  AKAM: "Akamai Technologies Inc.",
  ALB: "Albemarle Corporation",
  ARE: "Alexandria Real Estate Equities Inc.",
  ALGN: "Align Technology Inc.",
  ALLE: "Allegion plc",
  LNT: "Alliant Energy Corporation",
  ALL: "Allstate Corporation",
  GOOGL: "Alphabet Inc. (Class A)",
  GOOG: "Alphabet Inc. (Class C)",
  MO: "Altria Group Inc.",
  AMZN: "Amazon.com Inc.",
  AMCR: "Amcor plc",
  AEE: "Ameren Corporation",
  AEP: "American Electric Power Company Inc.",
  AXP: "American Express Company",
  AIG: "American International Group Inc.",
  AMT: "American Tower Corporation",
  AWK: "American Water Works Company Inc.",
  AMP: "Ameriprise Financial Inc.",
  AME: "AMETEK Inc.",
  AMGN: "Amgen Inc.",
  APH: "Amphenol Corporation",
  ADI: "Analog Devices Inc.",
  AON: "Aon plc",
  APA: "APA Corporation",
  APO: "Apollo Global Management Inc.",
  AAPL: "Apple Inc.",
  AMAT: "Applied Materials Inc.",
  APP: "AppLovin Corporation",
  APTV: "Aptiv plc",
  ACGL: "Arch Capital Group Ltd.",
  ADM: "Archer-Daniels-Midland Company",
  ARES: "Ares Management Corporation",
  ANET: "Arista Networks Inc.",
  AJG: "Arthur J. Gallagher & Co.",
  AIZ: "Assurant Inc.",
  T: "AT&T Inc.",
  ATO: "Atmos Energy Corporation",
  ADSK: "Autodesk Inc.",
  ADP: "Automatic Data Processing Inc.",
  AZO: "AutoZone Inc.",
  AVB: "AvalonBay Communities Inc.",
  AVY: "Avery Dennison Corporation",
  AXON: "Axon Enterprise Inc.",
  BKR: "Baker Hughes Company",
  BALL: "Ball Corporation",
  BAC: "Bank of America Corporation",
  BAX: "Baxter International Inc.",
  BDX: "Becton, Dickinson and Company",
  "BRK.B": "Berkshire Hathaway Inc.",
  BBY: "Best Buy Co. Inc.",
  TECH: "Bio-Techne Corporation",
  BIIB: "Biogen Inc.",
  BLK: "BlackRock Inc.",
  BX: "Blackstone Inc.",
  BNY: "The Bank of New York Mellon Corporation",
  BA: "The Boeing Company",
  BKNG: "Booking Holdings Inc.",
  BSX: "Boston Scientific Corporation",
  BMY: "Bristol-Myers Squibb Company",
  AVGO: "Broadcom Inc.",
  BR: "Broadridge Financial Solutions Inc.",
  BRO: "Brown & Brown Inc.",
  "BF.B": "Brown-Forman Corporation",
  BLDR: "Builders FirstSource Inc.",
  BG: "Bunge Global SA",
  BXP: "BXP Inc.",
  CHRW: "C.H. Robinson Worldwide Inc.",
  CDNS: "Cadence Design Systems Inc.",
  CPT: "Camden Property Trust",
  CPB: "Campbell Soup Company",
  COF: "Capital One Financial Corporation",
  CAH: "Cardinal Health Inc.",
  CCL: "Carnival Corporation",
  CARR: "Carrier Global Corporation",
  CVNA: "Carvana Co.",
  CASY: "Casey's General Stores Inc.",
  CAT: "Caterpillar Inc.",
  CBOE: "Cboe Global Markets Inc.",
  CBRE: "CBRE Group Inc.",
  CDW: "CDW Corporation",
  COR: "Cencora Inc.",
  CNC: "Centene Corporation",
  CNP: "CenterPoint Energy Inc.",
  CF: "CF Industries Holdings Inc.",
  CRL: "Charles River Laboratories International Inc.",
  SCHW: "The Charles Schwab Corporation",
  CHTR: "Charter Communications Inc.",
  CVX: "Chevron Corporation",
  CMG: "Chipotle Mexican Grill Inc.",
  CB: "Chubb Limited",
  CHD: "Church & Dwight Co. Inc.",
  CIEN: "Ciena Corporation",
  CI: "The Cigna Group",
  CINF: "Cincinnati Financial Corporation",
  CTAS: "Cintas Corporation",
  CSCO: "Cisco Systems Inc.",
  C: "Citigroup Inc.",
  CFG: "Citizens Financial Group Inc.",
  CLX: "The Clorox Company",
  CME: "CME Group Inc.",
  CMS: "CMS Energy Corporation",
  KO: "The Coca-Cola Company",
  CTSH: "Cognizant Technology Solutions Corporation",
  COHR: "Coherent Corp.",
  COIN: "Coinbase Global Inc.",
  CL: "Colgate-Palmolive Company",
  CMCSA: "Comcast Corporation",
  FIX: "Comfort Systems USA Inc.",
  CAG: "Conagra Brands Inc.",
  COP: "ConocoPhillips",
  ED: "Consolidated Edison Inc.",
  STZ: "Constellation Brands Inc.",
  CEG: "Constellation Energy Generation LLC",
  COO: "The Cooper Companies Inc.",
  CPRT: "Copart Inc.",
  GLW: "Corning Incorporated",
  CPAY: "Corpay Inc.",
  CTVA: "Corteva Inc.",
  CSGP: "CoStar Group Inc.",
  COST: "Costco Wholesale Corporation",
  CRH: "CRH plc",
  CRWD: "CrowdStrike Holdings Inc.",
  CCI: "Crown Castle Inc.",
  CSX: "CSX Corporation",
  CMI: "Cummins Inc.",
  CVS: "CVS Health Corporation",
  DHR: "Danaher Corporation",
  DRI: "Darden Restaurants Inc.",
  DDOG: "Datadog Inc.",
  DVA: "DaVita Inc.",
  DECK: "Deckers Outdoor Corporation",
  DE: "Deere & Company",
  DELL: "Dell Technologies Inc.",
  DAL: "Delta Air Lines Inc.",
  DVN: "Devon Energy Corporation",
  DXCM: "Dexcom Inc.",
  FANG: "Diamondback Energy Inc.",
  DLR: "Digital Realty Trust Inc.",
  DG: "Dollar General Corporation",
  DLTR: "Dollar Tree Inc.",
  D: "Dominion Energy Inc.",
  DPZ: "Domino's Pizza Inc.",
  DASH: "DoorDash Inc.",
  DOV: "Dover Corporation",
  DOW: "Dow Inc.",
  DHI: "D.R. Horton Inc.",
  DTE: "DTE Energy Company",
  DUK: "Duke Energy Corporation",
  DD: "DuPont de Nemours Inc.",
  ETN: "Eaton Corporation plc",
  EBAY: "eBay Inc.",
  SATS: "EchoStar Corporation",
  ECL: "Ecolab Inc.",
  EIX: "Edison International",
  EW: "Edwards Lifesciences Corporation",
  EA: "Electronic Arts Inc.",
  ELV: "Elevance Health Inc.",
  EME: "EMCOR Group Inc.",
  EMR: "Emerson Electric Co.",
  ETR: "Entergy Corporation",
  EOG: "EOG Resources Inc.",
  EPAM: "EPAM Systems Inc.",
  EQT: "EQT Corporation",
  EFX: "Equifax Inc.",
  EQIX: "Equinix Inc.",
  EQR: "Equity Residential",
  ERIE: "Erie Indemnity Company",
  ESS: "Essex Property Trust Inc.",
  EL: "The Estée Lauder Companies Inc.",
  EG: "Everest Group Ltd.",
  EVRG: "Evergy Inc.",
  ES: "Eversource Energy",
  EXC: "Exelon Corporation",
  EXE: "Exelixis Inc.",
  EXPE: "Expedia Group Inc.",
  EXPD: "Expeditors International of Washington Inc.",
  EXR: "Extra Space Storage Inc.",
  XOM: "Exxon Mobil Corporation",
  FFIV: "F5 Inc.",
  FDS: "FactSet Research Systems Inc.",
  FICO: "Fair Isaac Corporation",
  FAST: "Fastenal Company",
  FRT: "Federal Realty Investment Trust",
  FDX: "FedEx Corporation",
  FIS: "Fidelity National Information Services Inc.",
  FITB: "Fifth Third Bancorp",
  FSLR: "First Solar Inc.",
  FE: "FirstEnergy Corp.",
  FISV: "Fiserv Inc.",
  F: "Ford Motor Company",
  FTNT: "Fortinet Inc.",
  FTV: "Fortive Corporation",
  FOXA: "Fox Corporation (Class A)",
  FOX: "Fox Corporation (Class B)",
  BEN: "Franklin Resources Inc.",
  FCX: "Freeport-McMoRan Inc.",
  GRMN: "Garmin Ltd.",
  IT: "Gartner Inc.",
  GE: "General Electric Company",
  GEHC: "GE HealthCare Technologies Inc.",
  GEV: "GE Vernova Inc.",
  GEN: "Gen Digital Inc.",
  GNRC: "Generac Holdings Inc.",
  GD: "General Dynamics Corporation",
  GIS: "General Mills Inc.",
  GM: "General Motors Company",
  GPC: "Genuine Parts Company",
  GILD: "Gilead Sciences Inc.",
  GPN: "Global Payments Inc.",
  GL: "Globe Life Inc.",
  GDDY: "GoDaddy Inc.",
  GS: "The Goldman Sachs Group Inc.",
  HAL: "Halliburton Company",
  HIG: "The Hartford Financial Services Group Inc.",
  HAS: "Hasbro Inc.",
  HCA: "HCA Healthcare Inc.",
  DOC: "Healthpeak Properties Inc.",
  HSIC: "Henry Schein Inc.",
  HSY: "The Hershey Company",
  HPE: "Hewlett Packard Enterprise Company",
  HLT: "Hilton Worldwide Holdings Inc.",
  HD: "The Home Depot Inc.",
  HON: "Honeywell International Inc.",
  HRL: "Hormel Foods Corporation",
  HST: "Host Hotels & Resorts Inc.",
  HWM: "Howmet Aerospace Inc.",
  HPQ: "HP Inc.",
  HUBB: "Hubbell Incorporated",
  HUM: "Humana Inc.",
  HBAN: "Huntington Bancshares Incorporated",
  HII: "Huntington Ingalls Industries Inc.",
  IBM: "International Business Machines Corporation",
  IEX: "IDEX Corporation",
  IDXX: "IDEXX Laboratories Inc.",
  ITW: "Illinois Tool Works Inc.",
  INCY: "Incyte Corporation",
  IR: "Ingersoll Rand Inc.",
  PODD: "Insulet Corporation",
  INTC: "Intel Corporation",
  IBKR: "Interactive Brokers Group Inc.",
  ICE: "Intercontinental Exchange Inc.",
  IFF: "International Flavors & Fragrances Inc.",
  IP: "International Paper Company",
  INTU: "Intuit Inc.",
  ISRG: "Intuitive Surgical Inc.",
  IVZ: "Invesco Ltd.",
  INVH: "Invitation Homes Inc.",
  IQV: "IQVIA Holdings Inc.",
  IRM: "Iron Mountain Incorporated",
  JBHT: "J.B. Hunt Transport Services Inc.",
  JBL: "Jabil Inc.",
  JKHY: "Jack Henry & Associates Inc.",
  J: "Jacobs Solutions Inc.",
  JNJ: "Johnson & Johnson",
  JCI: "Johnson Controls International plc",
  JPM: "JPMorgan Chase & Co.",
  KVUE: "Kenvue Inc.",
  KDP: "Keurig Dr Pepper Inc.",
  KEY: "KeyCorp",
  KEYS: "Keysight Technologies Inc.",
  KMB: "Kimberly-Clark Corporation",
  KIM: "Kimco Realty Corporation",
  KMI: "Kinder Morgan Inc.",
  KKR: "KKR & Co. Inc.",
  KLAC: "KLA Corporation",
  KHC: "The Kraft Heinz Company",
  KR: "The Kroger Co.",
  LHX: "L3Harris Technologies Inc.",
  LH: "Labcorp Holdings Inc.",
  LRCX: "Lam Research Corporation",
  LVS: "Las Vegas Sands Corp.",
  LDOS: "Leidos Holdings Inc.",
  LEN: "Lennar Corporation",
  LII: "Lennox International Inc.",
  LLY: "Eli Lilly and Company",
  LIN: "Linde plc",
  LYV: "Live Nation Entertainment Inc.",
  LMT: "Lockheed Martin Corporation",
  L: "Loews Corporation",
  LOW: "Lowe's Companies Inc.",
  LULU: "Lululemon Athletica Inc.",
  LITE: "Lumentum Holdings Inc.",
  LYB: "LyondellBasell Industries NV",
  MTB: "M&T Bank Corporation",
  MPC: "Marathon Petroleum Corporation",
  MAR: "Marriott International Inc.",
  MRSH: "Marsh & McLennan Companies Inc.",
  MLM: "Martin Marietta Materials Inc.",
  MAS: "Masco Corporation",
  MA: "Mastercard Incorporated",
  MKC: "McCormick & Company Inc.",
  MCD: "McDonald's Corporation",
  MCK: "McKesson Corporation",
  MDT: "Medtronic plc",
  MRK: "Merck & Co. Inc.",
  META: "Meta Platforms Inc.",
  MET: "MetLife Inc.",
  MTD: "Mettler-Toledo International Inc.",
  MGM: "MGM Resorts International",
  MCHP: "Microchip Technology Inc.",
  MU: "Micron Technology Inc.",
  MSFT: "Microsoft Corporation",
  MAA: "Mid-America Apartment Communities Inc.",
  MRNA: "Moderna Inc.",
  TAP: "Molson Coors Beverage Company",
  MDLZ: "Mondelez International Inc.",
  MPWR: "Monolithic Power Systems Inc.",
  MNST: "Monster Beverage Corporation",
  MCO: "Moody's Corporation",
  MS: "Morgan Stanley",
  MOS: "The Mosaic Company",
  MSI: "Motorola Solutions Inc.",
  MSCI: "MSCI Inc.",
  NDAQ: "Nasdaq Inc.",
  NTAP: "NetApp Inc.",
  NFLX: "Netflix Inc.",
  NEM: "Newmont Corporation",
  NWSA: "News Corporation (Class A)",
  NWS: "News Corporation (Class B)",
  NEE: "NextEra Energy Inc.",
  NKE: "Nike Inc.",
  NI: "NiSource Inc.",
  NDSN: "Nordson Corporation",
  NSC: "Norfolk Southern Corporation",
  NTRS: "Northern Trust Corporation",
  NOC: "Northrop Grumman Corporation",
  NCLH: "Norwegian Cruise Line Holdings Ltd.",
  NRG: "NRG Energy Inc.",
  NUE: "Nucor Corporation",
  NVDA: "NVIDIA Corporation",
  NVR: "NVR Inc.",
  NXPI: "NXP Semiconductors NV",
  ORLY: "O'Reilly Automotive Inc.",
  OXY: "Occidental Petroleum Corporation",
  ODFL: "Old Dominion Freight Line Inc.",
  OMC: "Omnicom Group Inc.",
  ON: "ON Semiconductor Corporation",
  OKE: "ONEOK Inc.",
  ORCL: "Oracle Corporation",
  OTIS: "Otis Worldwide Corporation",
  PCAR: "PACCAR Inc.",
  PKG: "Packaging Corporation of America",
  PLTR: "Palantir Technologies Inc.",
  PANW: "Palo Alto Networks Inc.",
  PH: "Parker-Hannifin Corporation",
  PAYX: "Paychex Inc.",
  PYPL: "PayPal Holdings Inc.",
  PNR: "Pentair plc",
  PEP: "PepsiCo Inc.",
  PFE: "Pfizer Inc.",
  PCG: "PG&E Corporation",
  PM: "Philip Morris International Inc.",
  PSX: "Phillips 66",
  PNW: "Pinnacle West Capital Corporation",
  PNC: "PNC Financial Services Group Inc.",
  POOL: "Pool Corporation",
  PPG: "PPG Industries Inc.",
  PPL: "PPL Corporation",
  PFG: "Principal Financial Group Inc.",
  PG: "The Procter & Gamble Company",
  PGR: "The Progressive Corporation",
  PLD: "Prologis Inc.",
  PRU: "Prudential Financial Inc.",
  PEG: "Public Service Enterprise Group Inc.",
  PSA: "Public Storage",
  PHM: "PulteGroup Inc.",
  QRVO: "Qorvo Inc.",
  PWR: "Quanta Services Inc.",
  DGX: "Quest Diagnostics Incorporated",
  RL: "Ralph Lauren Corporation",
  RJF: "Raymond James Financial Inc.",
  RTX: "RTX Corporation",
  O: "Realty Income Corporation",
  REG: "Regency Centers Corporation",
  REGN: "Regeneron Pharmaceuticals Inc.",
  RF: "Regions Financial Corporation",
  RSG: "Republic Services Inc.",
  RMD: "ResMed Inc.",
  RVTY: "Revvity Inc.",
  ROK: "Rockwell Automation Inc.",
  ROL: "Rollins Inc.",
  ROP: "Roper Technologies Inc.",
  ROST: "Ross Stores Inc.",
  RCL: "Royal Caribbean Cruises Ltd.",
  SPGI: "S&P Global Inc.",
  CRM: "Salesforce Inc.",
  SBAC: "SBA Communications Corporation",
  SLB: "SLB",
  STX: "Seagate Technology Holdings plc",
  SRE: "Sempra",
  NOW: "ServiceNow Inc.",
  SHW: "The Sherwin-Williams Company",
  SPG: "Simon Property Group Inc.",
  SWKS: "Skyworks Solutions Inc.",
  SO: "The Southern Company",
  LUV: "Southwest Airlines Co.",
  SWK: "Stanley Black & Decker Inc.",
  SBUX: "Starbucks Corporation",
  STT: "State Street Corporation",
  STLD: "Steel Dynamics Inc.",
  STE: "STERIS plc",
  SYK: "Stryker Corporation",
  SYF: "Synchrony Financial",
  SNPS: "Synopsys Inc.",
  SYY: "Sysco Corporation",
  TMUS: "T-Mobile US Inc.",
  TROW: "T. Rowe Price Group Inc.",
  TTWO: "Take-Two Interactive Software Inc.",
  TPR: "Tapestry Inc.",
  TGT: "Target Corporation",
  TECR: "Tecnoglass Inc.",
  TEL: "TE Connectivity Ltd.",
  TDY: "Teledyne Technologies Incorporated",
  TFX: "Teleflex Incorporated",
  TER: "Teradyne Inc.",
  TXN: "Texas Instruments Incorporated",
  TXT: "Textron Inc.",
  TMO: "Thermo Fisher Scientific Inc.",
  TJX: "The TJX Companies Inc.",
  TSCO: "Tractor Supply Company",
  TT: "Trane Technologies plc",
  TDG: "TransDigm Group Incorporated",
  TRV: "The Travelers Companies Inc.",
  TRGP: "Targa Resources Corp.",
  TFC: "Truist Financial Corporation",
  TYL: "Tyler Technologies Inc.",
  TSN: "Tyson Foods Inc.",
  USB: "U.S. Bancorp",
  UBER: "Uber Technologies Inc.",
  UDR: "UDR Inc.",
  ULTA: "Ulta Beauty Inc.",
  UNP: "Union Pacific Corporation",
  UAL: "United Airlines Holdings Inc.",
  UNH: "UnitedHealth Group Incorporated",
  UPS: "United Parcel Service Inc.",
  URI: "United Rentals Inc.",
  UNM: "Unum Group",
  VLO: "Valero Energy Corporation",
  VTR: "Ventas Inc.",
  VRSN: "VeriSign Inc.",
  VRSK: "Verisk Analytics Inc.",
  VERT: "Vertiv Holdings Co.",
  VZ: "Verizon Communications Inc.",
  VRTX: "Vertex Pharmaceuticals Incorporated",
  VFC: "V.F. Corporation",
  VTRS: "Viatris Inc.",
  VICI: "VICI Properties Inc.",
  V: "Visa Inc.",
  VST: "Vistra Corp.",
  VMC: "Vulcan Materials Company",
  WRB: "W. R. Berkley Corporation",
  WAB: "Wabtec Corporation",
  WBA: "Walgreens Boots Alliance Inc.",
  WMT: "Walmart Inc.",
  DIS: "The Walt Disney Company",
  WCG: "Webcor Group",
  WEC: "WEC Energy Group Inc.",
  WFC: "Wells Fargo & Company",
  WEL: "Welltower Inc.",
  WST: "West Pharmaceutical Services Inc.",
  WDC: "Western Digital Corporation",
  WRK: "WestRock Company",
  WY: "Weyerhaeuser Company",
  WHR: "Whirlpool Corporation",
  WMB: "The Williams Companies Inc.",
  WYN: "Wyndham Hotels & Resorts Inc.",
  WYNN: "Wynn Resorts Limited",
  XEL: "Xcel Energy Inc.",
  XYL: "Xylem Inc.",
  YUM: "Yum! Brands Inc.",
  ZBH: "Zimmer Biomet Holdings Inc.",
  ZBRA: "Zebra Technologies Corporation",
  ZTS: "Zoetis Inc."
};

export class MarketDataEngine {
  public assets: AssetInfo[] = [
    // Primary Assets
    { id: 'BTC', name: 'Bitcoin', category: 'crypto', basePrice: 45000, volatility: 0.035, drift: 0.0005 },
    { id: 'ETH', name: 'Ethereum', category: 'crypto', basePrice: 2400, volatility: 0.04, drift: 0.0004 },
    { id: 'SOL', name: 'Solana', category: 'crypto', basePrice: 85, volatility: 0.055, drift: 0.0008 },
    { id: 'NASDAQ', name: 'NASDAQ 100', category: 'equity', basePrice: 15000, volatility: 0.012, drift: 0.0003 },
    { id: 'SPX', name: 'S&P 500', category: 'equity', basePrice: 4500, volatility: 0.009, drift: 0.0002 },
    { id: 'NYSE', name: 'NYSE Composite', category: 'equity', basePrice: 16000, volatility: 0.008, drift: 0.00015 },
    { id: 'GOLD', name: 'Gold', category: 'commodity', basePrice: 2000, volatility: 0.007, drift: 0.0001 },
    { id: 'WTI', name: 'WTI Crude Oil', category: 'commodity', basePrice: 75, volatility: 0.02, drift: 0.0001 },
    { id: 'BCOM', name: 'Broad Commodities Index', category: 'commodity', basePrice: 100, volatility: 0.01, drift: 0.00005 },

    // Constituent Stocks within NASDAQ
    { id: 'AAPL', name: 'Apple Inc.', category: 'equity', basePrice: 175, volatility: 0.015, drift: 0.0003, parentIndex: 'NASDAQ' },
    { id: 'MSFT', name: 'Microsoft Corp.', category: 'equity', basePrice: 380, volatility: 0.013, drift: 0.00035, parentIndex: 'NASDAQ' },
    { id: 'NVDA', name: 'NVIDIA Corp.', category: 'equity', basePrice: 480, volatility: 0.028, drift: 0.001, parentIndex: 'NASDAQ' },
    { id: 'TSLA', name: 'Tesla Inc.', category: 'equity', basePrice: 220, volatility: 0.025, drift: 0.0005, parentIndex: 'NASDAQ' },

    // Constituent Stocks within S&P 500
    { id: 'AMZN', name: 'Amazon.com Inc.', category: 'equity', basePrice: 150, volatility: 0.018, drift: 0.0004, parentIndex: 'SPX' },
    { id: 'META', name: 'Meta Platforms Inc.', category: 'equity', basePrice: 350, volatility: 0.022, drift: 0.0005, parentIndex: 'SPX' },
    { id: 'GOOGL', name: 'Alphabet Inc.', category: 'equity', basePrice: 140, volatility: 0.016, drift: 0.00035, parentIndex: 'SPX' },
    { id: 'BRK.B', name: 'Berkshire Hathaway Inc.', category: 'equity', basePrice: 360, volatility: 0.008, drift: 0.00015, parentIndex: 'SPX' },

    // Constituent Stocks within NYSE Composite
    { id: 'JPM', name: 'JPMorgan Chase & Co.', category: 'equity', basePrice: 170, volatility: 0.012, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'LLY', name: 'Eli Lilly & Co.', category: 'equity', basePrice: 620, volatility: 0.018, drift: 0.0008, parentIndex: 'NYSE' },
    { id: 'WMT', name: 'Walmart Inc.', category: 'equity', basePrice: 60, volatility: 0.009, drift: 0.00015, parentIndex: 'NYSE' },
    { id: 'XOM', name: 'Exxon Mobil Corp.', category: 'equity', basePrice: 100, volatility: 0.016, drift: 0.00015, parentIndex: 'NYSE' }
  ];

  public universeAssets: AssetInfo[] = [
    // 40 NASDAQ Stocks
    { id: 'AMD', name: 'Advanced Micro Devices Inc.', category: 'equity', basePrice: 160, volatility: 0.025, drift: 0.00045, parentIndex: 'NASDAQ' },
    { id: 'NFLX', name: 'Netflix Inc.', category: 'equity', basePrice: 580, volatility: 0.020, drift: 0.0004, parentIndex: 'NASDAQ' },
    { id: 'QCOM', name: 'Qualcomm Inc.', category: 'equity', basePrice: 170, volatility: 0.018, drift: 0.0003, parentIndex: 'NASDAQ' },
    { id: 'ADBE', name: 'Adobe Inc.', category: 'equity', basePrice: 500, volatility: 0.017, drift: 0.00035, parentIndex: 'NASDAQ' },
    { id: 'INTC', name: 'Intel Corp.', category: 'equity', basePrice: 35, volatility: 0.022, drift: 0.0001, parentIndex: 'NASDAQ' },
    { id: 'AMGN', name: 'Amgen Inc.', category: 'equity', basePrice: 280, volatility: 0.012, drift: 0.0002, parentIndex: 'NASDAQ' },
    { id: 'TXN', name: 'Texas Instruments Inc.', category: 'equity', basePrice: 165, volatility: 0.014, drift: 0.00025, parentIndex: 'NASDAQ' },
    { id: 'HON', name: 'Honeywell International Inc.', category: 'equity', basePrice: 195, volatility: 0.011, drift: 0.00018, parentIndex: 'NASDAQ' },
    { id: 'MU', name: 'Micron Technology Inc.', category: 'equity', basePrice: 110, volatility: 0.028, drift: 0.0004, parentIndex: 'NASDAQ' },
    { id: 'SBUX', name: 'Starbucks Corp.', category: 'equity', basePrice: 90, volatility: 0.015, drift: 0.00015, parentIndex: 'NASDAQ' },
    { id: 'LRCX', name: 'Lam Research Corp.', category: 'equity', basePrice: 900, volatility: 0.026, drift: 0.0005, parentIndex: 'NASDAQ' },
    { id: 'ISRG', name: 'Intuitive Surgical Inc.', category: 'equity', basePrice: 380, volatility: 0.016, drift: 0.0004, parentIndex: 'NASDAQ' },
    { id: 'GILD', name: 'Gilead Sciences Inc.', category: 'equity', basePrice: 75, volatility: 0.012, drift: 0.00015, parentIndex: 'NASDAQ' },
    { id: 'MDLZ', name: 'Mondelez International Inc.', category: 'equity', basePrice: 70, volatility: 0.009, drift: 0.00015, parentIndex: 'NASDAQ' },
    { id: 'CSCO', name: 'Cisco Systems Inc.', category: 'equity', basePrice: 50, volatility: 0.012, drift: 0.00018, parentIndex: 'NASDAQ' },
    { id: 'ADP', name: 'Automatic Data Processing Inc.', category: 'equity', basePrice: 240, volatility: 0.011, drift: 0.0002, parentIndex: 'NASDAQ' },
    { id: 'REGN', name: 'Regeneron Pharmaceuticals Inc.', category: 'equity', basePrice: 900, volatility: 0.015, drift: 0.0004, parentIndex: 'NASDAQ' },
    { id: 'VRTX', name: 'Vertex Pharmaceuticals Inc.', category: 'equity', basePrice: 420, volatility: 0.014, drift: 0.00035, parentIndex: 'NASDAQ' },
    { id: 'BKNG', name: 'Booking Holdings Inc.', category: 'equity', basePrice: 3500, volatility: 0.018, drift: 0.0004, parentIndex: 'NASDAQ' },
    { id: 'PANW', name: 'Palo Alto Networks Inc.', category: 'equity', basePrice: 290, volatility: 0.024, drift: 0.0005, parentIndex: 'NASDAQ' },
    { id: 'SNPS', name: 'Synopsys Inc.', category: 'equity', basePrice: 550, volatility: 0.017, drift: 0.00045, parentIndex: 'NASDAQ' },
    { id: 'CDNS', name: 'Cadence Design Systems Inc.', category: 'equity', basePrice: 280, volatility: 0.017, drift: 0.00045, parentIndex: 'NASDAQ' },
    { id: 'MELI', name: 'MercadoLibre Inc.', category: 'equity', basePrice: 1600, volatility: 0.028, drift: 0.0006, parentIndex: 'NASDAQ' },
    { id: 'KLAC', name: 'KLA Corporation', category: 'equity', basePrice: 650, volatility: 0.024, drift: 0.00045, parentIndex: 'NASDAQ' },
    { id: 'MAR', name: 'Marriott International Inc.', category: 'equity', basePrice: 230, volatility: 0.014, drift: 0.00025, parentIndex: 'NASDAQ' },
    { id: 'NXPI', name: 'NXP Semiconductors NV', category: 'equity', basePrice: 240, volatility: 0.020, drift: 0.00035, parentIndex: 'NASDAQ' },
    { id: 'ASML', name: 'ASML Holding NV', category: 'equity', basePrice: 850, volatility: 0.022, drift: 0.0005, parentIndex: 'NASDAQ' },
    { id: 'ADI', name: 'Analog Devices Inc.', category: 'equity', basePrice: 190, volatility: 0.015, drift: 0.0003, parentIndex: 'NASDAQ' },
    { id: 'CTAS', name: 'Cintas Corp.', category: 'equity', basePrice: 600, volatility: 0.012, drift: 0.0003, parentIndex: 'NASDAQ' },
    { id: 'ORLY', name: 'O\'Reilly Automotive Inc.', category: 'equity', basePrice: 1000, volatility: 0.013, drift: 0.00035, parentIndex: 'NASDAQ' },
    { id: 'MNST', name: 'Monster Beverage Corp.', category: 'equity', basePrice: 55, volatility: 0.014, drift: 0.0002, parentIndex: 'NASDAQ' },
    { id: 'LULU', name: 'Lululemon Athletica Inc.', category: 'equity', basePrice: 400, volatility: 0.022, drift: 0.0004, parentIndex: 'NASDAQ' },
    { id: 'PAYX', name: 'Paychex Inc.', category: 'equity', basePrice: 120, volatility: 0.011, drift: 0.00018, parentIndex: 'NASDAQ' },
    { id: 'DXCM', name: 'Dexcom Inc.', category: 'equity', basePrice: 120, volatility: 0.024, drift: 0.00045, parentIndex: 'NASDAQ' },
    { id: 'MCHP', name: 'Microchip Technology Inc.', category: 'equity', basePrice: 85, volatility: 0.018, drift: 0.00025, parentIndex: 'NASDAQ' },
    { id: 'IDXX', name: 'IDEXX Laboratories Inc.', category: 'equity', basePrice: 500, volatility: 0.017, drift: 0.00035, parentIndex: 'NASDAQ' },
    { id: 'KDP', name: 'Keurig Dr Pepper Inc.', category: 'equity', basePrice: 32, volatility: 0.010, drift: 0.00012, parentIndex: 'NASDAQ' },
    { id: 'PDD', name: 'PDD Holdings Inc.', category: 'equity', basePrice: 120, volatility: 0.032, drift: 0.0007, parentIndex: 'NASDAQ' },
    { id: 'WDAY', name: 'Workday Inc.', category: 'equity', basePrice: 260, volatility: 0.018, drift: 0.00035, parentIndex: 'NASDAQ' },
    { id: 'FTNT', name: 'Fortinet Inc.', category: 'equity', basePrice: 65, volatility: 0.022, drift: 0.0004, parentIndex: 'NASDAQ' },

    // 40 NYSE Stocks
    { id: 'UNH', name: 'UnitedHealth Group Inc.', category: 'equity', basePrice: 500, volatility: 0.011, drift: 0.0002, parentIndex: 'SPX' },
    { id: 'V', name: 'Visa Inc.', category: 'equity', basePrice: 260, volatility: 0.011, drift: 0.00025, parentIndex: 'SPX' },
    { id: 'JNJ', name: 'Johnson & Johnson', category: 'equity', basePrice: 160, volatility: 0.009, drift: 0.00015, parentIndex: 'NYSE' },
    { id: 'PG', name: 'Procter & Gamble Co.', category: 'equity', basePrice: 155, volatility: 0.008, drift: 0.00015, parentIndex: 'NYSE' },
    { id: 'MA', name: 'Mastercard Inc.', category: 'equity', basePrice: 420, volatility: 0.012, drift: 0.0003, parentIndex: 'SPX' },
    { id: 'HD', name: 'Home Depot Inc.', category: 'equity', basePrice: 350, volatility: 0.012, drift: 0.00022, parentIndex: 'NYSE' },
    { id: 'BAC', name: 'Bank of America Corp.', category: 'equity', basePrice: 34, volatility: 0.016, drift: 0.00015, parentIndex: 'NYSE' },
    { id: 'MRK', name: 'Merck & Co. Inc.', category: 'equity', basePrice: 120, volatility: 0.011, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'ABBV', name: 'AbbVie Inc.', category: 'equity', basePrice: 175, volatility: 0.012, drift: 0.0003, parentIndex: 'NYSE' },
    { id: 'KO', name: 'Coca-Cola Co.', category: 'equity', basePrice: 60, volatility: 0.008, drift: 0.00015, parentIndex: 'NYSE' },
    { id: 'CVX', name: 'Chevron Corp.', category: 'equity', basePrice: 150, volatility: 0.015, drift: 0.00018, parentIndex: 'NYSE' },
    { id: 'CRM', name: 'Salesforce Inc.', category: 'equity', basePrice: 280, volatility: 0.018, drift: 0.00035, parentIndex: 'SPX' },
    { id: 'ACN', name: 'Accenture plc', category: 'equity', basePrice: 340, volatility: 0.013, drift: 0.00025, parentIndex: 'NYSE' },
    { id: 'TMO', name: 'Thermo Fisher Scientific Inc.', category: 'equity', basePrice: 550, volatility: 0.012, drift: 0.00028, parentIndex: 'NYSE' },
    { id: 'WFC', name: 'Wells Fargo & Co.', category: 'equity', basePrice: 50, volatility: 0.016, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'MCD', name: 'McDonald\'s Corp.', category: 'equity', basePrice: 290, volatility: 0.009, drift: 0.00018, parentIndex: 'NYSE' },
    { id: 'DIS', name: 'Walt Disney Co.', category: 'equity', basePrice: 110, volatility: 0.016, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'ORCL', name: 'Oracle Corp.', category: 'equity', basePrice: 115, volatility: 0.015, drift: 0.00025, parentIndex: 'NYSE' },
    { id: 'PFE', name: 'Pfizer Inc.', category: 'equity', basePrice: 28, volatility: 0.014, drift: 0.00008, parentIndex: 'NYSE' },
    { id: 'CAT', name: 'Caterpillar Inc.', category: 'equity', basePrice: 320, volatility: 0.015, drift: 0.0003, parentIndex: 'NYSE' },
    { id: 'DHR', name: 'Danaher Corp.', category: 'equity', basePrice: 250, volatility: 0.012, drift: 0.00025, parentIndex: 'NYSE' },
    { id: 'VZ', name: 'Verizon Communications Inc.', category: 'equity', basePrice: 40, volatility: 0.011, drift: 0.0001, parentIndex: 'NYSE' },
    { id: 'T', name: 'AT&T Inc.', category: 'equity', basePrice: 17, volatility: 0.012, drift: 0.00008, parentIndex: 'NYSE' },
    { id: 'PM', name: 'Philip Morris International Inc.', category: 'equity', basePrice: 95, volatility: 0.010, drift: 0.00015, parentIndex: 'NYSE' },
    { id: 'IBM', name: 'IBM Corp.', category: 'equity', basePrice: 185, volatility: 0.012, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'GS', name: 'Goldman Sachs Group Inc.', category: 'equity', basePrice: 390, volatility: 0.014, drift: 0.00025, parentIndex: 'NYSE' },
    { id: 'NKE', name: 'Nike Inc.', category: 'equity', basePrice: 100, volatility: 0.016, drift: 0.00018, parentIndex: 'NYSE' },
    { id: 'UNP', name: 'Union Pacific Corp.', category: 'equity', basePrice: 240, volatility: 0.011, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'MS', name: 'Morgan Stanley', category: 'equity', basePrice: 90, volatility: 0.014, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'AXP', name: 'American Express Co.', category: 'equity', basePrice: 220, volatility: 0.013, drift: 0.00028, parentIndex: 'NYSE' },
    { id: 'EL', name: 'Estee Lauder Companies Inc.', category: 'equity', basePrice: 145, volatility: 0.022, drift: 0.00018, parentIndex: 'NYSE' },
    { id: 'SPGI', name: 'S&P Global Inc.', category: 'equity', basePrice: 420, volatility: 0.011, drift: 0.00028, parentIndex: 'NYSE' },
    { id: 'COP', name: 'ConocoPhillips', category: 'equity', basePrice: 115, volatility: 0.018, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'BA', name: 'Boeing Co.', category: 'equity', basePrice: 200, volatility: 0.022, drift: 0.00015, parentIndex: 'NYSE' },
    { id: 'CVS', name: 'CVS Health Corp.', category: 'equity', basePrice: 75, volatility: 0.013, drift: 0.00012, parentIndex: 'NYSE' },
    { id: 'DE', name: 'Deere & Co.', category: 'equity', basePrice: 380, volatility: 0.014, drift: 0.00025, parentIndex: 'NYSE' },
    { id: 'RTX', name: 'RTX Corp.', category: 'equity', basePrice: 95, volatility: 0.012, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'BMY', name: 'Bristol-Myers Squibb Co.', category: 'equity', basePrice: 50, volatility: 0.011, drift: 0.0001, parentIndex: 'NYSE' },
    { id: 'TGT', name: 'Target Corp.', category: 'equity', basePrice: 140, volatility: 0.018, drift: 0.0002, parentIndex: 'NYSE' },
    { id: 'SCHW', name: 'Charles Schwab Corp.', category: 'equity', basePrice: 65, volatility: 0.016, drift: 0.00022, parentIndex: 'NYSE' },

    // 30 Coinbase Cryptos
    { id: 'ADA', name: 'Cardano', category: 'crypto', basePrice: 0.5, volatility: 0.045, drift: 0.0003 },
    { id: 'DOT', name: 'Polkadot', category: 'crypto', basePrice: 6.5, volatility: 0.048, drift: 0.0003 },
    { id: 'LINK', name: 'Chainlink', category: 'crypto', basePrice: 15.0, volatility: 0.05, drift: 0.0005 },
    { id: 'UNI', name: 'Uniswap', category: 'crypto', basePrice: 7.5, volatility: 0.052, drift: 0.0004 },
    { id: 'LTC', name: 'Litecoin', category: 'crypto', basePrice: 80.0, volatility: 0.038, drift: 0.0002 },
    { id: 'BCH', name: 'Bitcoin Cash', category: 'crypto', basePrice: 350.0, volatility: 0.046, drift: 0.0003 },
    { id: 'XLM', name: 'Stellar Lumens', category: 'crypto', basePrice: 0.12, volatility: 0.042, drift: 0.000255 },
    { id: 'ATOM', name: 'Cosmos', category: 'crypto', basePrice: 9.0, volatility: 0.045, drift: 0.0003 },
    { id: 'ETC', name: 'Ethereum Classic', category: 'crypto', basePrice: 22.0, volatility: 0.044, drift: 0.00025 },
    { id: 'ALGO', name: 'Algorand', category: 'crypto', basePrice: 0.18, volatility: 0.048, drift: 0.0002 },
    { id: 'FIL', name: 'Filecoin', category: 'crypto', basePrice: 5.5, volatility: 0.055, drift: 0.0003 },
    { id: 'VET', name: 'VeChain', category: 'crypto', basePrice: 0.03, volatility: 0.046, drift: 0.00025 },
    { id: 'ICP', name: 'Internet Computer', category: 'crypto', basePrice: 12.0, volatility: 0.058, drift: 0.0006 },
    { id: 'GRT', name: 'The Graph', category: 'crypto', basePrice: 0.22, volatility: 0.054, drift: 0.0005 },
    { id: 'AAVE', name: 'Aave', category: 'crypto', basePrice: 90.0, volatility: 0.052, drift: 0.0004 },
    { id: 'MKR', name: 'Maker', category: 'crypto', basePrice: 2200.0, volatility: 0.050, drift: 0.00045 },
    { id: 'EGLD', name: 'MultiversX', category: 'crypto', basePrice: 45.0, volatility: 0.052, drift: 0.0003 },
    { id: 'FLOW', name: 'Flow', category: 'crypto', basePrice: 0.9, volatility: 0.054, drift: 0.00025 },
    { id: 'THETA', name: 'Theta Network', category: 'crypto', basePrice: 1.8, volatility: 0.052, drift: 0.0003 },
    { id: 'MANA', name: 'Decentraland', category: 'crypto', basePrice: 0.45, volatility: 0.055, drift: 0.00035 },
    { id: 'SAND', name: 'The Sandbox', category: 'crypto', basePrice: 0.45, volatility: 0.056, drift: 0.00035 },
    { id: 'AXS', name: 'Axie Infinity', category: 'crypto', basePrice: 7.0, volatility: 0.058, drift: 0.0003 },
    { id: 'TEZOS', name: 'Tezos', category: 'crypto', basePrice: 0.95, volatility: 0.044, drift: 0.000255 },
    { id: 'ENJ', name: 'Enjin Coin', category: 'crypto', basePrice: 0.32, volatility: 0.05, drift: 0.00025 },
    { id: 'CHZ', name: 'Chiliz', category: 'crypto', basePrice: 0.1, volatility: 0.052, drift: 0.0003 },
    { id: 'ZEC', name: 'Zcash', category: 'crypto', basePrice: 28.0, volatility: 0.042, drift: 0.00015 },
    { id: 'BAT', name: 'Basic Attention Token', category: 'crypto', basePrice: 0.25, volatility: 0.044, drift: 0.0002 },
    { id: 'DASH', name: 'Dash', category: 'crypto', basePrice: 30.0, volatility: 0.041, drift: 0.00015 },
    { id: 'YFI', name: 'yearn.finance', category: 'crypto', basePrice: 7500.0, volatility: 0.048, drift: 0.0003 },
    { id: 'COMP', name: 'Compound', category: 'crypto', basePrice: 55.0, volatility: 0.05, drift: 0.00035 }
  ];

  public macroData: MacroDataPoint[] = [];
  public priceData: Record<string, Candle[]> = {};
  public newsData: NewsArticle[] = [];
  private rand: SeededRandom;
  private lastRefreshTime = 0;
  private refreshPromise: Promise<void> | null = null;

  constructor(seed: number = 42) {
    this.rand = new SeededRandom(seed);

    const coreIds = new Set(this.assets.map(a => a.id));
    const universeIds = new Set(this.universeAssets.map(a => a.id));

    for (const [ticker, name] of Object.entries(SP500_NAMES)) {
      if (!coreIds.has(ticker) && !universeIds.has(ticker)) {
        let parentIndex = 'SPX';
        // Categorize exchange / parent index
        const nasdaqTechTickers = new Set([
          'AMD', 'NFLX', 'QCOM', 'ADBE', 'INTC', 'AMGN', 'TXN', 'HON', 'MU',
          'LRCX', 'ISRG', 'GILD', 'MDLZ', 'CSCO', 'ADP', 'REGN', 'VRTX', 'BKNG', 'PANW',
          'SNPS', 'CDNS', 'MELI', 'KLAC', 'MAR', 'NXPI', 'ASML', 'ADI', 'CTAS', 'ORLY',
          'MNST', 'LULU', 'PAYX', 'DXCM', 'MCHP', 'IDXX', 'KDP', 'PDD', 'WDAY', 'FTNT',
          'AVGO', 'CRWD', 'DDOG', 'DASH', 'MDB', 'TEAM', 'ZS'
        ]);
        if (nasdaqTechTickers.has(ticker)) {
          parentIndex = 'NASDAQ';
        } else {
          const nyseTickers = new Set([
            'JNJ', 'PG', 'HD', 'BAC', 'MRK', 'ABBV', 'KO', 'CVX', 'ACN', 'TMO',
            'WFC', 'MCD', 'DIS', 'ORCL', 'PFE', 'CAT', 'DHR', 'VZ', 'T', 'PM',
            'IBM', 'GS', 'NKE', 'UNP', 'MS', 'AXP', 'EL', 'SPGI', 'COP', 'BA',
            'CVS', 'DE', 'RTX', 'BMY', 'TGT', 'SCHW', 'UNH', 'V', 'MA'
          ]);
          if (nyseTickers.has(ticker)) {
            parentIndex = 'NYSE';
          }
        }

        // Generate base price dynamically between $10 and $500 for variety
        let basePrice = 50 + (this.rand.next() * 250);
        if (ticker === 'AVGO') basePrice = 1200;
        if (ticker === 'BKNG') basePrice = 3500;
        if (ticker === 'AZO') basePrice = 2500;
        if (ticker === 'CMG') basePrice = 2000;

        this.universeAssets.push({
          id: ticker,
          name: name,
          category: 'equity',
          basePrice: parseFloat(basePrice.toFixed(2)),
          volatility: parseFloat((0.01 + this.rand.next() * 0.02).toFixed(4)),
          drift: parseFloat((0.0001 + this.rand.next() * 0.0004).toFixed(6)),
          parentIndex
        });
      }
    }

    this.generateData(500); // Generate 500 days of historical data
  }

  public async initialize() {
    const alpacaKey = process.env.APCA_API_KEY_ID;
    const alpacaSecret = process.env.APCA_API_SECRET_KEY;
    const hasAlpacaKeys = !!(alpacaKey && alpacaSecret);
    const universePriceMap: Record<string, { price: number, prevClose: number, volume: number }> = {};

    if (hasAlpacaKeys) {
      console.log('🔄 Fetching price feeds from Alpaca API (Stocks & Crypto) and Yahoo Finance (Indices & Commodities)...');
    } else {
      console.log('🔄 Fetching price feeds from Yahoo Finance (Alpaca API keys not found in environment)...');
    }
    
    const TICKER_MAP: Record<string, string> = {
      BTC: 'BTC-USD',
      ETH: 'ETH-USD',
      SOL: 'SOL-USD',
      NASDAQ: '^NDX',
      SPX: '^SPX',
      NYSE: '^NYA',
      GOLD: 'GC=F',
      WTI: 'CL=F',
      BCOM: '^BCOM',
      AAPL: 'AAPL',
      MSFT: 'MSFT',
      NVDA: 'NVDA',
      TSLA: 'TSLA',
      AMZN: 'AMZN',
      META: 'META',
      GOOGL: 'GOOGL',
      'BRK.B': 'BRK-B',
      JPM: 'JPM',
      LLY: 'LLY',
      WMT: 'WMT',
      XOM: 'XOM',
      VIX: '^VIX',
      DXY: 'DX-Y.NYB'
    };

    const fetchYahooTicker = async (id: string, ticker: string) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2y`;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
          }
        });
        if (res.status !== 200) {
          console.warn(`[Yahoo] Failed to fetch ticker ${ticker} for ${id}, status ${res.status}`);
          return null;
        }
        const data = await res.json() as any;
        const result = data.chart?.result?.[0];
        if (!result) return null;
        return {
          id,
          timestamp: result.timestamp || [],
          open: result.indicators?.quote?.[0]?.open || [],
          high: result.indicators?.quote?.[0]?.high || [],
          low: result.indicators?.quote?.[0]?.low || [],
          close: result.indicators?.quote?.[0]?.close || [],
          volume: result.indicators?.quote?.[0]?.volume || [],
          regularMarketPrice: result.meta?.regularMarketPrice,
          regularMarketVolume: result.meta?.regularMarketVolume
        };
      } catch (e: any) {
        console.error(`[Yahoo] Error fetching ticker ${ticker} for ${id}:`, e.message);
        return null;
      }
    };

    const fetchAlpacaBars = async (category: 'stocks' | 'crypto', symbols: string[]) => {
      const startStr = new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000).toISOString();
      const url = `https://data.alpaca.markets/v2/${category}/bars?symbols=${symbols.join(',')}&timeframe=1Day&start=${startStr}&limit=1000`;
      try {
        const res = await fetch(url, {
          headers: {
            'APCA-API-KEY-ID': alpacaKey!,
            'APCA-API-SECRET-KEY': alpacaSecret!,
            'accept': 'application/json'
          }
        });
        if (res.status !== 200) {
          console.warn(`[Alpaca] Failed to fetch ${category} bars, status ${res.status}`);
          return null;
        }
        return await res.json() as any;
      } catch (e: any) {
        console.error(`[Alpaca] Error fetching ${category} bars:`, e.message);
        return null;
      }
    };

    try {
      const tickerDataMap: Record<string, any> = {};

      // 1. Fetch from Alpaca if keys are available
      let alpacaStocksRes: any = null;
      let alpacaCryptoRes: any = null;

      if (hasAlpacaKeys) {
        const stockSymbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'BRK.B', 'JPM', 'LLY', 'WMT', 'XOM'];
        const cryptoSymbols = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
        
        const [stocksData, cryptoData] = await Promise.all([
          fetchAlpacaBars('stocks', stockSymbols),
          fetchAlpacaBars('crypto', cryptoSymbols)
        ]);
        alpacaStocksRes = stocksData;
        alpacaCryptoRes = cryptoData;
      }

      // 2. Prepare parallel fetches for remaining tickers from Yahoo Finance
      const yahooQueries: Array<{ id: string; ticker: string }> = [];
      
      // Determine what needs to be fetched from Yahoo
      for (const [id, ticker] of Object.entries(TICKER_MAP)) {
        let hasData = false;
        if (alpacaStocksRes?.bars?.[id]) {
          hasData = true;
        }
        // Crypto symbols in Alpaca use '/' division
        const alpacaCryptoKey = id === 'BTC' ? 'BTC/USD' : id === 'ETH' ? 'ETH/USD' : id === 'SOL' ? 'SOL/USD' : '';
        if (alpacaCryptoKey && alpacaCryptoRes?.bars?.[alpacaCryptoKey]) {
          hasData = true;
        }

        if (!hasData) {
          yahooQueries.push({ id, ticker });
        }
      }

      const yahooResults = await Promise.all(yahooQueries.map(q => fetchYahooTicker(q.id, q.ticker)));
      for (const res of yahooResults) {
        if (res) {
          tickerDataMap[res.id] = res;
        }
      }

      // Map Alpaca responses to our standard format
      if (alpacaStocksRes?.bars) {
        for (const [id, bars] of Object.entries(alpacaStocksRes.bars)) {
          const bList = bars as any[];
          tickerDataMap[id] = {
            id,
            timestamp: bList.map(b => Math.floor(new Date(b.t).getTime() / 1000)),
            open: bList.map(b => b.o),
            high: bList.map(b => b.h),
            low: bList.map(b => b.l),
            close: bList.map(b => b.c),
            volume: bList.map(b => b.v)
          };
        }
      }

      if (alpacaCryptoRes?.bars) {
        const cryptoKeys = { 'BTC/USD': 'BTC', 'ETH/USD': 'ETH', 'SOL/USD': 'SOL' };
        for (const [alpacaKey, bars] of Object.entries(alpacaCryptoRes.bars)) {
          const id = cryptoKeys[alpacaKey as keyof typeof cryptoKeys];
          if (id) {
            const bList = bars as any[];
            tickerDataMap[id] = {
              id,
              timestamp: bList.map(b => Math.floor(new Date(b.t).getTime() / 1000)),
              open: bList.map(b => b.o),
              high: bList.map(b => b.h),
              low: bList.map(b => b.l),
              close: bList.map(b => b.c),
              volume: bList.map(b => b.v)
            };
          }
        }
      }

      // Check required core assets
      const requiredCoreAssets = ['BTC', 'NASDAQ', 'SPX', 'NYSE', 'GOLD', 'WTI', 'VIX', 'DXY'];
      const missingCore = requiredCoreAssets.filter(id => !tickerDataMap[id]);
      if (missingCore.length > 0) {
        throw new Error(`Missing core assets from feeds: ${missingCore.join(', ')}`);
      }

      const dates: string[] = [];
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - 500);
      for (let i = 0; i <= 500; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }

      const timestampToDateStr = (ts: number): string => {
        const d = new Date(ts * 1000);
        return d.toISOString().split('T')[0];
      };

      // Determine if stock market is open today by checking the benchmark index (NASDAQ)
      const nasdaqData = tickerDataMap['NASDAQ'];
      let isMarketOpenToday = false;
      if (nasdaqData && nasdaqData.timestamp && nasdaqData.timestamp.length > 0) {
        const lastNasdaqDate = timestampToDateStr(nasdaqData.timestamp[nasdaqData.timestamp.length - 1]);
        const todayDateStr = dates[dates.length - 1];
        isMarketOpenToday = (lastNasdaqDate === todayDateStr);
      }
      console.log(`[Market Status] Is stock market open today (${dates[dates.length - 1]})?`, isMarketOpenToday);

      const newPriceData: Record<string, Candle[]> = {};
      
      const vixData = tickerDataMap['VIX'];
      const dxyData = tickerDataMap['DXY'];
      
      const vixMap = new Map<string, number>();
      const dxyMap = new Map<string, number>();
      
      for (let i = 0; i < vixData.timestamp.length; i++) {
        const dStr = timestampToDateStr(vixData.timestamp[i]);
        if (vixData.close[i] !== null && vixData.close[i] !== undefined) {
          vixMap.set(dStr, vixData.close[i]);
        }
      }
      for (let i = 0; i < dxyData.timestamp.length; i++) {
        const dStr = timestampToDateStr(dxyData.timestamp[i]);
        if (dxyData.close[i] !== null && dxyData.close[i] !== undefined) {
          dxyMap.set(dStr, dxyData.close[i]);
        }
      }

      for (const asset of this.assets) {
        const yahooData = tickerDataMap[asset.id];
        if (!yahooData) {
          console.warn(`[Feeds] No data for ${asset.id}, skipping real feed.`);
          continue;
        }

        const rawCandleMap = new Map<string, { open: number, high: number, low: number, close: number, volume: number }>();
        for (let i = 0; i < yahooData.timestamp.length; i++) {
          const dStr = timestampToDateStr(yahooData.timestamp[i]);
          const o = yahooData.open[i];
          const h = yahooData.high[i];
          const l = yahooData.low[i];
          const c = yahooData.close[i];
          const v = yahooData.volume[i];
          
          if (o !== null && h !== null && l !== null && c !== null && v !== null &&
              o !== undefined && h !== undefined && l !== undefined && c !== undefined && v !== undefined &&
              !isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c) && !isNaN(v)) {
            rawCandleMap.set(dStr, { open: o, high: h, low: l, close: c, volume: v });
          }
        }

        const alignedCandles: Candle[] = [];
        let lastValidCandle: { open: number, high: number, low: number, close: number, volume: number } | null = null;
        
        for (const dStr of dates) {
          const c = rawCandleMap.get(dStr);
          if (c) {
            lastValidCandle = c;
            break;
          }
        }

        if (!lastValidCandle) {
          console.warn(`[Feeds] All candles null or empty for ${asset.id}`);
          continue;
        }

        const useLiveFeed = asset.category === 'crypto' || isMarketOpenToday;

        for (const dStr of dates) {
          const c = rawCandleMap.get(dStr);
          const idx = alignedCandles.length;
          const noise1 = Math.sin(idx * 0.15) * 15 + Math.cos(idx * 0.05) * 10;
          const noise2 = Math.cos(idx * 0.12) * 12 + Math.sin(idx * 0.08) * 8;
          const isToday = dStr === dates[dates.length - 1];

          if (c) {
            lastValidCandle = c;
            const retSig = (c.close - c.open) / (c.open || 1);
            let whaleAccum = 50 + retSig * 400 + noise1;
            let proSentiment = 52 + retSig * 300 + noise2;
            whaleAccum = Math.max(5, Math.min(98, Math.round(whaleAccum)));
            proSentiment = Math.max(5, Math.min(98, Math.round(proSentiment)));

            const closePrice = (isToday && yahooData.regularMarketPrice && useLiveFeed) ? yahooData.regularMarketPrice : c.close;

            alignedCandles.push({
              date: dStr,
              open: parseFloat(c.open.toFixed(2)),
              high: parseFloat(Math.max(c.high, closePrice).toFixed(2)),
              low: parseFloat(Math.min(c.low, closePrice).toFixed(2)),
              close: parseFloat(closePrice.toFixed(2)),
              volume: (isToday && useLiveFeed) ? (yahooData.regularMarketVolume || c.volume) : (isToday && !useLiveFeed ? 0 : c.volume),
              whaleAccumulation: whaleAccum,
              proTraderSentiment: proSentiment
            });
          } else {
            let whaleAccum = Math.max(5, Math.min(98, Math.round(50 + noise1)));
            let proSentiment = Math.max(5, Math.min(98, Math.round(52 + noise2)));

            const livePrice = (isToday && yahooData.regularMarketPrice && useLiveFeed) ? yahooData.regularMarketPrice : lastValidCandle.close;

            alignedCandles.push({
              date: dStr,
              open: parseFloat(lastValidCandle.close.toFixed(2)),
              high: parseFloat(Math.max(livePrice, lastValidCandle.close).toFixed(2)),
              low: parseFloat(Math.min(livePrice, lastValidCandle.close).toFixed(2)),
              close: parseFloat(livePrice.toFixed(2)),
              volume: (isToday && useLiveFeed) ? (yahooData.regularMarketVolume || 0) : 0,
              whaleAccumulation: whaleAccum,
              proTraderSentiment: proSentiment
            });
          }
        }

        if (asset.category === 'crypto') {
          for (let i = 0; i < alignedCandles.length; i++) {
            const candle = alignedCandles[i];
            const prevClose = i > 0 ? alignedCandles[i - 1].close : candle.close;
            const ret = (candle.close - prevClose) / prevClose;
            
            let fundBase = 0.0001;
            if (ret > 0.01) fundBase = 0.0003;
            if (ret < -0.01) fundBase = -0.0001;
            candle.fundingRate = parseFloat((fundBase + Math.sin(i) * 0.00015).toFixed(6));
            
            let liqBase = 500000;
            if (Math.abs(ret) > 0.04) {
              liqBase = (asset.id === 'BTC' ? 15000000 : 5000000) * (0.5 + Math.random() * 1.5);
            } else {
              liqBase = (asset.id === 'BTC' ? 500000 : 150000) * (0.2 + Math.random() * 0.8);
            }
            candle.liquidations = Math.round(liqBase);
          }
        }

        newPriceData[asset.id] = alignedCandles;
      }

      const populatedAssets = Object.keys(newPriceData);
      if (populatedAssets.length < this.assets.length) {
        console.warn(`[Feeds] Only populated ${populatedAssets.length} of ${this.assets.length} assets. Keeping fallback.`);
        return;
      }

      const newMacroData: MacroDataPoint[] = [];
      let lastVix = 15.0;
      let lastDxy = 98.0;
      let currentLiquidity = 100.0;

      const totalDays = dates.length;
      for (let t = 0; t < totalDays; t++) {
        const dStr = dates[t];
        const regime = this.getRegime(t, totalDays);

        const vVal = vixMap.get(dStr);
        const dVal = dxyMap.get(dStr);
        if (vVal !== undefined) lastVix = vVal;
        if (dVal !== undefined) lastDxy = dVal;

        const spxCandles = newPriceData['SPX'];
        const prevSpx = t > 0 ? spxCandles[t - 1].close : spxCandles[t].close;
        const spxRet = (spxCandles[t].close - prevSpx) / prevSpx;
        const prevDxy = t > 0 ? (newMacroData[t - 1]?.dxy || lastDxy) : lastDxy;
        const dxyRet = (lastDxy - prevDxy) / prevDxy;
        
        currentLiquidity = currentLiquidity * (1 + regime.liquidityChange + 0.4 * spxRet - 0.25 * dxyRet);
        currentLiquidity = Math.max(30, currentLiquidity);

        const wtiPrice = newPriceData['WTI'][t].close;

        newMacroData.push({
          date: dStr,
          cpi: parseFloat((regime.cpi + Math.sin(t) * 0.15).toFixed(2)),
          fedFundsRate: regime.rate,
          dxy: parseFloat(lastDxy.toFixed(2)),
          vix: parseFloat(lastVix.toFixed(2)),
          wti: parseFloat(wtiPrice.toFixed(2)),
          liquidity: parseFloat(currentLiquidity.toFixed(2))
        });
      }

      this.priceData = newPriceData;
      this.macroData = newMacroData;

      this.newsData = this.newsData.map((article, idx) => {
        const dateIdx = Math.min(totalDays - 1, Math.floor((idx / this.newsData.length) * totalDays));
        return {
          ...article,
          date: dates[dateIdx]
        };
      });

      // Fetch current price & previous close for all universe assets to scale their history
      console.log('🔄 Fetching real-time prices for universe assets...');
      const universeTickers = this.universeAssets.map(asset => {
        let ticker = asset.id;
        if (asset.category === 'crypto') {
          ticker = asset.id === 'TEZOS' ? 'XTZ-USD' : `${asset.id}-USD`;
        } else if (asset.id === 'BRK.B') {
          ticker = 'BRK-B';
        }
        return { id: asset.id, ticker };
      });

      const batchSize = 100;
      for (let i = 0; i < universeTickers.length; i += batchSize) {
        const batch = universeTickers.slice(i, i + batchSize);
        const batchPromises = batch.map(async ({ id, ticker }) => {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;
          try {
            const res = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
              }
            });
            if (res.status !== 200) return null;
            const data = await res.json() as any;
            const meta = data.chart?.result?.[0]?.meta;
            if (!meta) return null;
            return {
              id,
              price: meta.regularMarketPrice,
              prevClose: meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice,
              volume: meta.regularMarketVolume || 0
            };
          } catch (e) {
            return null;
          }
        });
        const batchResults = await Promise.all(batchPromises);
        for (const res of batchResults) {
          if (res) {
            universePriceMap[res.id] = res;
          }
        }
        if (i + batchSize < universeTickers.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log('✅ Real-time price feeds successfully initialized!');
    } catch (e: any) {
      console.warn(`⚠️ API initialization failed: ${e.message}. Running on simulated fallback data.`);
    } finally {
      this.generateUniverseData(universePriceMap);
    }
  }

  public async refreshLivePrices(force = false): Promise<void> {
    const now = Date.now();
    
    // Return existing active promise if refresh is already in progress
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    // Return early if within 10-second caching window, unless forced
    if (!force && now - this.lastRefreshTime < 10000) {
      return;
    }

    this.refreshPromise = (async () => {
      try {
        console.log('🔄 Refreshing price feeds accurate to the moment...');
        const tickersToFetch: { id: string; ticker: string }[] = [];
        
        const coreTickers: Record<string, string> = {
          BTC: 'BTC-USD',
          ETH: 'ETH-USD',
          SOL: 'SOL-USD',
          NASDAQ: '^NDX',
          SPX: '^SPX',
          NYSE: '^NYA',
          GOLD: 'GC=F',
          WTI: 'CL=F',
          BCOM: '^BCOM',
          AAPL: 'AAPL',
          MSFT: 'MSFT',
          NVDA: 'NVDA',
          TSLA: 'TSLA',
          AMZN: 'AMZN',
          META: 'META',
          GOOGL: 'GOOGL',
          'BRK.B': 'BRK-B',
          JPM: 'JPM',
          LLY: 'LLY',
          WMT: 'WMT',
          XOM: 'XOM',
          VIX: '^VIX',
          DXY: 'DX-Y.NYB'
        };

        for (const asset of this.assets) {
          const ticker = coreTickers[asset.id] || asset.id;
          tickersToFetch.push({ id: asset.id, ticker });
        }

        for (const asset of this.universeAssets) {
          let ticker = asset.id;
          if (asset.category === 'crypto') {
            ticker = asset.id === 'TEZOS' ? 'XTZ-USD' : `${asset.id}-USD`;
          } else if (asset.id === 'BRK.B') {
            ticker = 'BRK-B';
          }
          tickersToFetch.push({ id: asset.id, ticker });
        }

        // Query Yahoo Finance chart API in batched parallel requests
        const results: any[] = [];
        const batchSize = 100;
        for (let i = 0; i < tickersToFetch.length; i += batchSize) {
          const batch = tickersToFetch.slice(i, i + batchSize);
          const batchPromises = batch.map(async ({ id, ticker }) => {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;
            try {
              const res = await fetch(url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
                }
              });
              if (res.status !== 200) return null;
              const data = await res.json() as any;
              const meta = data.chart?.result?.[0]?.meta;
              if (!meta) return null;
              return {
                id,
                price: meta.regularMarketPrice,
                volume: meta.regularMarketVolume,
                regularMarketTime: meta.regularMarketTime
              };
            } catch (e) {
              return null;
            }
          });
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
          if (i + batchSize < tickersToFetch.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        // Determine if stock market is open today by checking NASDAQ trade time
        const nasdaqRes = results.find(r => r && r.id === 'NASDAQ');
        let isMarketOpenToday = false;
        if (nasdaqRes && nasdaqRes.regularMarketTime) {
          const lastTradeDate = new Date(nasdaqRes.regularMarketTime * 1000).toISOString().split('T')[0];
          const btcCandles = this.priceData['BTC'];
          const todayDateStr = (btcCandles && btcCandles.length > 0) ? btcCandles[btcCandles.length - 1].date : new Date().toISOString().split('T')[0];
          isMarketOpenToday = (lastTradeDate === todayDateStr);
        }
        console.log(`[Refresh Status] Is stock market open today?`, isMarketOpenToday);
        
        // Update the last candle for each asset
        for (const res of results) {
          if (res && res.price !== undefined && res.price !== null) {
            const assetInfo = this.assets.find(a => a.id === res.id) || this.universeAssets.find(a => a.id === res.id);
            if (!assetInfo) continue;

            // Skip updating equity/commodity if market is not open today
            if ((assetInfo.category === 'equity' || assetInfo.category === 'commodity') && !isMarketOpenToday) {
              continue;
            }

            const candles = this.priceData[res.id];
            if (candles && candles.length > 0) {
              const lastCandle = candles[candles.length - 1];
              lastCandle.close = parseFloat(res.price.toFixed(2));
              lastCandle.high = parseFloat(Math.max(lastCandle.high, res.price).toFixed(2));
              lastCandle.low = parseFloat(Math.min(lastCandle.low, res.price).toFixed(2));
              if (res.volume !== undefined && res.volume !== null) {
                lastCandle.volume = res.volume;
              }
            }
          }
        }

        // Synchronize macro variables with updated prices
        const wtiCandles = this.priceData['WTI'];
        if (wtiCandles && wtiCandles.length > 0 && this.macroData.length > 0) {
          this.macroData[this.macroData.length - 1].wti = wtiCandles[wtiCandles.length - 1].close;
        }
        
        const vixCandles = this.priceData['VIX'];
        if (vixCandles && vixCandles.length > 0 && this.macroData.length > 0) {
          this.macroData[this.macroData.length - 1].vix = vixCandles[vixCandles.length - 1].close;
        }

        const dxyCandles = this.priceData['DXY'];
        if (dxyCandles && dxyCandles.length > 0 && this.macroData.length > 0) {
          this.macroData[this.macroData.length - 1].dxy = dxyCandles[dxyCandles.length - 1].close;
        }

        this.lastRefreshTime = Date.now();
        console.log('✅ Price feeds successfully refreshed to the moment!');
      } catch (err: any) {
        console.error('Error refreshing price feeds:', err.message);
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private getRegime(day: number, totalDays: number): {
    name: string;
    volMultiplier: number;
    equityDrift: number;
    cryptoDrift: number;
    commodityDrift: number;
    cpi: number;
    rate: number;
    vixBase: number;
    dxyBase: number;
    liquidityChange: number;
  } {
    // Define chronological regimes
    if (day < 100) {
      // 1. Low Volatility & Stable Growth
      return {
        name: 'Low-volatility',
        volMultiplier: 0.7,
        equityDrift: 0.0006,
        cryptoDrift: 0.001,
        commodityDrift: 0.0001,
        cpi: 2.1,
        rate: 1.5,
        vixBase: 12,
        dxyBase: 96,
        liquidityChange: 0.0005
      };
    } else if (day < 200) {
      // 2. High Inflation
      return {
        name: 'High-inflation',
        volMultiplier: 1.1,
        equityDrift: -0.0002,
        cryptoDrift: -0.0005,
        commodityDrift: 0.0012,
        cpi: 7.2,
        rate: 3.0,
        vixBase: 18,
        dxyBase: 100,
        liquidityChange: -0.0002
      };
    } else if (day < 260) {
      // 3. Crisis Regime (Sharp Correction, VIX Spike)
      return {
        name: 'Crisis',
        volMultiplier: 2.2,
        equityDrift: -0.003,
        cryptoDrift: -0.006,
        commodityDrift: -0.0008, // Gold safe haven might offset, but overall commodities drop
        cpi: 6.8,
        rate: 4.25,
        vixBase: 35,
        dxyBase: 106,
        liquidityChange: -0.0015
      };
    } else if (day < 380) {
      // 4. Rate-hiking Regime (Stabilization but high interest rates)
      return {
        name: 'Rate-hiking',
        volMultiplier: 1.2,
        equityDrift: 0.0002,
        cryptoDrift: 0.0004,
        commodityDrift: 0.0002,
        cpi: 4.5,
        rate: 5.25,
        vixBase: 20,
        dxyBase: 104,
        liquidityChange: -0.0005
      };
    } else {
      // 5. Liquidity-expansion (Rate cuts, Risk-on)
      return {
        name: 'Liquidity-expansion',
        volMultiplier: 0.8,
        equityDrift: 0.0008,
        cryptoDrift: 0.002,
        commodityDrift: 0.0004,
        cpi: 2.8,
        rate: 3.5,
        vixBase: 14,
        dxyBase: 98,
        liquidityChange: 0.0012
      };
    }
  }

  private generateData(totalDays: number) {
    const dates: string[] = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - totalDays);

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Initialize asset prices
    const prices: Record<string, number> = {};
    for (const asset of this.assets) {
      prices[asset.id] = asset.basePrice;
      this.priceData[asset.id] = [];
    }

    // Starting macro values
    let currentCpi = 2.0;
    let currentRate = 1.5;
    let currentDxy = 95.0;
    let currentVix = 14.0;
    let currentLiquidity = 100.0;

    // Generate step-by-step
    for (let t = 0; t < totalDays; t++) {
      const date = dates[t];
      const regime = this.getRegime(t, totalDays);

      // 1. Evolve Macro Indicators with noise
      currentCpi = regime.cpi + this.rand.nextGaussian() * 0.15;
      currentRate = regime.rate;
      currentVix = Math.max(9, regime.vixBase + this.rand.nextGaussian() * 1.5);
      currentDxy = regime.dxyBase + this.rand.nextGaussian() * 0.4;
      currentLiquidity = Math.max(50, currentLiquidity * (1 + regime.liquidityChange + this.rand.nextGaussian() * 0.002));

      this.macroData.push({
        date,
        cpi: parseFloat(currentCpi.toFixed(2)),
        fedFundsRate: parseFloat(currentRate.toFixed(2)),
        dxy: parseFloat(currentDxy.toFixed(2)),
        vix: parseFloat(currentVix.toFixed(2)),
        wti: 0, // Will sync with simulated WTI asset price below
        liquidity: parseFloat(currentLiquidity.toFixed(2))
      });

      // 2. Compute Cross-Asset Granger influence returns
      // We will model returns with cross-asset lag correlations:
      // - WTI crude return leads Gold and broad commodities (inflationary pressures)
      // - NASDAQ returns lead BTC and SOL with 1-day lag (Risk-on/off flow)
      // - VIX return negatively influences all risk assets
      const prevReturns: Record<string, number> = {};
      for (const asset of this.assets) {
        const history = this.priceData[asset.id];
        if (history.length > 0) {
          const last = history[history.length - 1];
          const prev = history.length > 1 ? history[history.length - 2] : last;
          prevReturns[asset.id] = (last.close - prev.close) / prev.close;
        } else {
          prevReturns[asset.id] = 0;
        }
      }

      // Generate actual daily returns
      const dailyReturns: Record<string, number> = {};

      const stockBetaMap: Record<string, { parent: string; beta: number; idiosyncraticVol: number }> = {
        AAPL: { parent: 'NASDAQ', beta: 1.1, idiosyncraticVol: 0.008 },
        MSFT: { parent: 'NASDAQ', beta: 1.05, idiosyncraticVol: 0.006 },
        NVDA: { parent: 'NASDAQ', beta: 1.6, idiosyncraticVol: 0.018 },
        TSLA: { parent: 'NASDAQ', beta: 1.4, idiosyncraticVol: 0.016 },
        AMZN: { parent: 'SPX', beta: 1.25, idiosyncraticVol: 0.01 },
        META: { parent: 'SPX', beta: 1.35, idiosyncraticVol: 0.012 },
        GOOGL: { parent: 'SPX', beta: 1.15, idiosyncraticVol: 0.009 },
        'BRK.B': { parent: 'SPX', beta: 0.75, idiosyncraticVol: 0.005 },
        JPM: { parent: 'NYSE', beta: 1.1, idiosyncraticVol: 0.007 },
        LLY: { parent: 'NYSE', beta: 0.8, idiosyncraticVol: 0.012 },
        WMT: { parent: 'NYSE', beta: 0.55, idiosyncraticVol: 0.006 },
        XOM: { parent: 'NYSE', beta: 0.85, idiosyncraticVol: 0.01 }
      };

      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      for (const asset of this.assets) {
        const stockConfig = stockBetaMap[asset.id];

        if (stockConfig) {
          // CAPM Model: Return = beta * parent_return + random_idiosyncratic_noise
          const parentReturn = dailyReturns[stockConfig.parent] || 0;
          const idiosyncraticShock = stockConfig.idiosyncraticVol * regime.volMultiplier * this.rand.nextGaussian();
          let returnShock = stockConfig.beta * parentReturn + idiosyncraticShock;

          // ExxonMobil correlation with WTI Crude returns
          if (asset.id === 'XOM') {
            const wtiReturn = dailyReturns['WTI'] || 0;
            returnShock = 0.6 * (stockConfig.beta * parentReturn) + 0.3 * wtiReturn + idiosyncraticShock;
          }

          if (isWeekend) {
            returnShock = 0;
          }

          dailyReturns[asset.id] = returnShock;
        } else {
          // Set drift based on category and regime
          let drift = asset.drift;
          if (asset.category === 'equity') drift = regime.equityDrift;
          if (asset.category === 'crypto') drift = regime.cryptoDrift;
          if (asset.category === 'commodity') drift = regime.commodityDrift;

          // Base random shock
          const vol = asset.volatility * regime.volMultiplier;
          let returnShock = drift + vol * this.rand.nextGaussian();

          // Add Cross-Asset Lead-Lags (Granger Causality mechanism)
          if (t > 1) {
            // Equities lead Crypto: 0.15 correlation from NASDAQ return yesterday
            if (asset.category === 'crypto') {
              returnShock += 0.25 * prevReturns['NASDAQ'];
            }
            // Commodities drive inflation: WTI return drives GOLD and BCOM
            if (asset.id === 'GOLD') {
              returnShock += 0.12 * prevReturns['WTI'];
            }
            if (asset.id === 'BCOM') {
              returnShock += 0.4 * prevReturns['WTI'];
            }
            // VIX negative feedback on Equities and Crypto
            const vixChange = (currentVix - this.macroData[t - 1].vix) / this.macroData[t - 1].vix;
            if (asset.category === 'equity' || asset.category === 'crypto') {
              returnShock -= 0.05 * vixChange;
            }
          }

          if (isWeekend && (asset.category === 'equity' || asset.category === 'commodity')) {
            returnShock = 0;
          }

          dailyReturns[asset.id] = returnShock;
        }
      }

      // Update prices and construct Candlestick bars
      for (const asset of this.assets) {
        const prevPrice = prices[asset.id];
        const ret = dailyReturns[asset.id];
        const close = Math.max(0.01, prevPrice * Math.exp(ret));
        prices[asset.id] = close;

        // Generate daily high, low, open, volume
        const volMultiplier = regime.volMultiplier * (asset.category === 'crypto' ? 1.5 : 1.1);
        const candleVol = Math.abs(asset.volatility * prevPrice * volMultiplier);
        
        let high = close;
        let low = close;
        let volume = 0;

        const isClosed = isWeekend && (asset.category === 'equity' || asset.category === 'commodity');

        if (!isClosed) {
          high = Math.max(prevPrice, close) + this.rand.next() * candleVol * 0.4;
          low = Math.min(prevPrice, close) - this.rand.next() * candleVol * 0.4;
          low = Math.max(0.01, low);

          // Adjust high/low bounds
          if (low > prevPrice || low > close) low = Math.min(prevPrice, close) * 0.995;
          if (high < prevPrice || high < close) high = Math.max(prevPrice, close) * 1.005;

          const baseVol = asset.category === 'crypto' ? 50000000 : 2000000;
          volume = Math.round(baseVol * (0.5 + this.rand.next() * 1.5) * (1 + Math.abs(ret) * 5));
        }

        const retSig = (close - prevPrice) / (prevPrice || 1);
        const noise1 = Math.sin(t * 0.15) * 15 + this.rand.nextGaussian() * 10;
        let whaleAccum = 50 + retSig * 400 + noise1;
        const noise2 = Math.cos(t * 0.12) * 12 + this.rand.nextGaussian() * 8;
        let proSentiment = 52 + retSig * 300 + noise2;
        whaleAccum = Math.max(5, Math.min(98, Math.round(whaleAccum)));
        proSentiment = Math.max(5, Math.min(98, Math.round(proSentiment)));

        const candle: Candle = {
          date,
          open: parseFloat(prevPrice.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume,
          whaleAccumulation: whaleAccum,
          proTraderSentiment: proSentiment
        };

        // Add crypto specific metrics (liquidations, funding rates)
        if (asset.category === 'crypto') {
          // Funding rates fluctuate around positive drift in expansions, negative in crisis
          let fundBase = 0.0001; // 0.01%
          if (regime.name === 'Liquidity-expansion') fundBase = 0.0003;
          if (regime.name === 'Crisis') fundBase = -0.0001;
          candle.fundingRate = parseFloat((fundBase + this.rand.nextGaussian() * 0.00015).toFixed(6));

          // Liquidations spike during high volatility and large returns
          let liqBase = 100000; // $100k
          if (Math.abs(ret) > 0.04) {
            liqBase = (asset.id === 'BTC' ? 15000000 : 5000000) * (0.5 + this.rand.next() * 1.5);
          } else {
            liqBase = (asset.id === 'BTC' ? 500000 : 150000) * (0.2 + this.rand.next() * 0.8);
          }
          candle.liquidations = Math.round(liqBase);
        }

        this.priceData[asset.id].push(candle);
      }

      // Sync WTI asset price back to Macro Data WTI
      this.macroData[t].wti = parseFloat(prices['WTI'].toFixed(2));

      // 3. Generate Simulated News Articles with semantic embeddings
      // We generate news on ~20% of days
      if (this.rand.next() < 0.22) {
        const headlineInfo = this.generateHeadline(regime.name, date);
        if (headlineInfo) {
          this.newsData.push(headlineInfo);
        }
      }
    }
  }

  private generateHeadline(regimeName: string, date: string): NewsArticle | null {
    const headlineTemplates: Array<{
      category: 'crypto' | 'equity' | 'commodity' | 'macro';
      headline: string;
      embedding: number[]; // [Geopolitical, Inflation, Earnings, Regulatory]
      sentiment: number;
      impact: number;
    }> = [];

    if (regimeName === 'Crisis') {
      headlineTemplates.push(
        {
          category: 'macro',
          headline: 'GLOBAL CRITICAL NEWS: Panic Selling Intensifies Amid Liquidity Crunch, VIX Surges Past 35',
          embedding: [0.95, 0.40, 0.20, 0.10],
          sentiment: -0.9,
          impact: 95
        },
        {
          category: 'crypto',
          headline: 'Crypto Markets Hit by Capitulation Wave: Leverage Liquidations Reach Record $1B',
          embedding: [0.50, 0.30, 0.10, 0.85],
          sentiment: -0.85,
          impact: 88
        },
        {
          category: 'equity',
          headline: 'Wall Street Halts Trading Temporarily as Tech Behemoths Face Unprecedented Downturn',
          embedding: [0.80, 0.25, 0.85, 0.30],
          sentiment: -0.8,
          impact: 85
        }
      );
    } else if (regimeName === 'High-inflation') {
      headlineTemplates.push(
        {
          category: 'macro',
          headline: 'CPI Inflation Climbs to Multi-Year High, Fed Signals Aggressive Balance Sheet Reduction',
          embedding: [0.20, 0.95, 0.40, 0.30],
          sentiment: -0.6,
          impact: 82
        },
        {
          category: 'commodity',
          headline: 'WTI Oil Prices Barrel Past $95 as Global Supply Chain Disruptions Spark Energy Panic',
          embedding: [0.85, 0.90, 0.30, 0.10],
          sentiment: 0.4, // Bullish for oil, bearish for macro
          impact: 78
        },
        {
          category: 'commodity',
          headline: 'Gold Surges to Historical Heights as Investors Seek Safe-Haven Against Fiat Debasement',
          embedding: [0.70, 0.92, 0.10, 0.10],
          sentiment: 0.6,
          impact: 75
        }
      );
    } else if (regimeName === 'Liquidity-expansion') {
      headlineTemplates.push(
        {
          category: 'macro',
          headline: 'Federal Reserve Announces Key Interest Rate Cut, Embarks on Quantitative Easing Program',
          embedding: [0.10, 0.15, 0.85, 0.20],
          sentiment: 0.85,
          impact: 90
        },
        {
          category: 'crypto',
          headline: 'Bitcoin Breaches Key Resistance as Institutional Inflows Accelerate Post Rate Cuts',
          embedding: [0.15, 0.10, 0.70, 0.60],
          sentiment: 0.9,
          impact: 84
        },
        {
          category: 'equity',
          headline: 'Nasdaq Reaches New Record High Led by Exponential Artificial Intelligence Growth',
          embedding: [0.10, 0.10, 0.95, 0.25],
          sentiment: 0.85,
          impact: 82
        }
      );
    } else if (regimeName === 'Rate-hiking') {
      headlineTemplates.push(
        {
          category: 'macro',
          headline: 'FOMC Raises Benchmark Interest Rate by 75bps; Powell Vows to Defeat Inflationary Pressures',
          embedding: [0.10, 0.85, 0.50, 0.40],
          sentiment: -0.4,
          impact: 72
        },
        {
          category: 'equity',
          headline: 'Yield Curve Inversion Deepens as Bond Markets Price in Aggressive Fed Tightening Cycles',
          embedding: [0.30, 0.80, 0.60, 0.20],
          sentiment: -0.5,
          impact: 68
        }
      );
    } else {
      // Low volatility / Sideways
      headlineTemplates.push(
        {
          category: 'equity',
          headline: 'Corporate Earnings Report Season Begins with Modest Beat, Core Volatility Subsided',
          embedding: [0.10, 0.30, 0.75, 0.10],
          sentiment: 0.2,
          impact: 45
        },
        {
          category: 'crypto',
          headline: 'Regulators Propose Framework to Clear Sandbox Rules for Virtual Digital Asset custody',
          embedding: [0.15, 0.20, 0.30, 0.90],
          sentiment: 0.3,
          impact: 50
        }
      );
    }

    if (headlineTemplates.length === 0) return null;

    const selectIdx = Math.floor(this.rand.next() * headlineTemplates.length);
    const template = headlineTemplates[selectIdx];

    // Add slight random noise to embeddings for realistic clustering
    const perturbedEmbedding = template.embedding.map(v => 
      Math.min(1.0, Math.max(0.0, v + this.rand.nextGaussian() * 0.05))
    );

    return {
      id: `art_${date.replace(/-/g, '')}_${selectIdx}`,
      date,
      headline: template.headline,
      assetClass: template.category,
      embedding: perturbedEmbedding,
      sentiment: parseFloat((template.sentiment + this.rand.nextGaussian() * 0.05).toFixed(3)),
      impact: parseFloat((template.impact + this.rand.nextGaussian() * 3).toFixed(1))
    };
  }

  private generateUniverseData(realPrices?: Record<string, { price: number, prevClose: number, volume: number }>) {
    const dates = this.priceData['BTC'].map(c => c.date);
    const totalDays = dates.length;

    const prices: Record<string, number> = {};
    for (const asset of this.universeAssets) {
      prices[asset.id] = asset.basePrice;
      this.priceData[asset.id] = [];
    }

    for (let t = 0; t < totalDays; t++) {
      const date = dates[t];
      const regime = this.getRegime(t, totalDays);
      const regimeName = regime.name;
      const volMultiplier = regime.volMultiplier;
      const equityDrift = regime.equityDrift;
      const cryptoDrift = regime.cryptoDrift;

      // Extract daily returns of core index/leaders for correlation
      let ndxRet = 0;
      const nasdaqHistory = this.priceData['NASDAQ'];
      if (t > 0 && nasdaqHistory && nasdaqHistory[t - 1]) {
        ndxRet = (nasdaqHistory[t].close - nasdaqHistory[t - 1].close) / nasdaqHistory[t - 1].close;
      }

      let spxRet = 0;
      const spxHistory = this.priceData['SPX'];
      if (t > 0 && spxHistory && spxHistory[t - 1]) {
        spxRet = (spxHistory[t].close - spxHistory[t - 1].close) / spxHistory[t - 1].close;
      }

      let nyseRet = 0;
      const nyseHistory = this.priceData['NYSE'];
      if (t > 0 && nyseHistory && nyseHistory[t - 1]) {
        nyseRet = (nyseHistory[t].close - nyseHistory[t - 1].close) / nyseHistory[t - 1].close;
      }

      let btcRet = 0;
      const btcHistory = this.priceData['BTC'];
      if (t > 0 && btcHistory && btcHistory[t - 1]) {
        btcRet = (btcHistory[t].close - btcHistory[t - 1].close) / btcHistory[t - 1].close;
      }

      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      // Check if equity markets were closed (either weekend or NASDAQ has 0 volume and 0 price change)
      let ndxVol = 0;
      if (nasdaqHistory && nasdaqHistory[t]) {
        ndxVol = nasdaqHistory[t].volume;
      }
      const isEquityClosed = isWeekend || (t > 0 && ndxRet === 0 && ndxVol === 0);

      // Check if commodity markets were closed
      let bcomRet = 0;
      let bcomVol = 0;
      const bcomHistory = this.priceData['BCOM'];
      if (t > 0 && bcomHistory && bcomHistory[t - 1]) {
        bcomRet = (bcomHistory[t].close - bcomHistory[t - 1].close) / bcomHistory[t - 1].close;
        bcomVol = bcomHistory[t].volume;
      }
      const isCommodityClosed = isWeekend || (t > 0 && bcomRet === 0 && bcomVol === 0);

      const dailyReturns: Record<string, number> = {};

      for (const asset of this.universeAssets) {
        let parentReturn = 0;
        let beta = 1.0;

        if (asset.category === 'equity') {
          if (asset.parentIndex === 'NASDAQ') {
            parentReturn = ndxRet;
            beta = 0.8 + this.rand.next() * 0.8;
          } else if (asset.parentIndex === 'SPX') {
            parentReturn = spxRet;
            beta = 0.7 + this.rand.next() * 0.7;
          } else {
            parentReturn = nyseRet;
            beta = 0.5 + this.rand.next() * 0.7;
          }
        } else if (asset.category === 'crypto') {
          parentReturn = btcRet;
          beta = 1.0 + this.rand.next() * 0.8;
        }

        const vol = asset.volatility * volMultiplier;
        const idiosyncraticShock = vol * this.rand.nextGaussian() * 0.6;
        let returnShock = beta * parentReturn + idiosyncraticShock;

        if (asset.category === 'equity') returnShock += equityDrift * 0.4;
        else if (asset.category === 'crypto') returnShock += cryptoDrift * 0.4;

        if (t > 0 && this.macroData[t - 1]) {
          const vixChange = (this.macroData[t].vix - this.macroData[t - 1].vix) / (this.macroData[t - 1].vix || 1);
          returnShock -= 0.04 * vixChange;
        }

        // OVERRIDE: Suppress returns if markets are closed
        if (asset.category === 'equity' && isEquityClosed) {
          returnShock = 0;
        } else if (asset.category === 'commodity' && isCommodityClosed) {
          returnShock = 0;
        }

        dailyReturns[asset.id] = returnShock;
      }

      for (const asset of this.universeAssets) {
        const prevPrice = prices[asset.id];
        const ret = dailyReturns[asset.id];
        const close = Math.max(0.01, prevPrice * Math.exp(ret));
        prices[asset.id] = close;

        const volMultiplierFactor = volMultiplier * (asset.category === 'crypto' ? 1.5 : 1.1);
        const candleVol = Math.abs(asset.volatility * prevPrice * volMultiplierFactor);

        let high = close;
        let low = close;
        let volume = 0;

        const isClosed = (asset.category === 'equity' && isEquityClosed) || (asset.category === 'commodity' && isCommodityClosed);

        if (!isClosed) {
          high = Math.max(prevPrice, close) + this.rand.next() * candleVol * 0.4;
          low = Math.min(prevPrice, close) - this.rand.next() * candleVol * 0.4;
          low = Math.max(0.01, low);

          if (low > prevPrice || low > close) low = Math.min(prevPrice, close) * 0.995;
          if (high < prevPrice || high < close) high = Math.max(prevPrice, close) * 1.005;

          const baseVol = asset.category === 'crypto' ? 10000000 : 800000;
          volume = Math.round(baseVol * (0.5 + this.rand.next() * 1.5) * (1 + Math.abs(ret) * 4));
        }

        const retSig = (close - prevPrice) / (prevPrice || 1);
        const noise1 = Math.sin(t * 0.15) * 15 + this.rand.nextGaussian() * 10;
        let whaleAccum = 50 + retSig * 400 + noise1;
        const noise2 = Math.cos(t * 0.12) * 12 + this.rand.nextGaussian() * 8;
        let proSentiment = 52 + retSig * 300 + noise2;
        whaleAccum = Math.max(5, Math.min(98, Math.round(whaleAccum)));
        proSentiment = Math.max(5, Math.min(98, Math.round(proSentiment)));

        const candle: Candle = {
          date,
          open: parseFloat(prevPrice.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume,
          whaleAccumulation: whaleAccum,
          proTraderSentiment: proSentiment
        };

        if (asset.category === 'crypto') {
          let fundBase = 0.0001;
          if (regimeName === 'Liquidity-expansion') fundBase = 0.00025;
          if (regimeName === 'Crisis') fundBase = -0.00008;
          candle.fundingRate = parseFloat((fundBase + this.rand.nextGaussian() * 0.00012).toFixed(6));

          let liqBase = 80000;
          if (Math.abs(ret) > 0.04) {
            liqBase = 1500000 * (0.5 + this.rand.next() * 1.5);
          } else {
            liqBase = 50000 * (0.2 + this.rand.next() * 0.8);
          }
          candle.liquidations = Math.round(liqBase);
        }

        this.priceData[asset.id].push(candle);
      }
    }

    // Find the last and previous trading day indices from the aligned NASDAQ index
    const nasdaqHistory = this.priceData['NASDAQ'];
    let lastTradeIdx = totalDays - 1;
    let prevTradeIdx = totalDays - 2;

    if (nasdaqHistory && nasdaqHistory.length > 0) {
      // Find last index with non-zero volume
      let foundLast = false;
      for (let i = totalDays - 1; i >= 0; i--) {
        if (nasdaqHistory[i].volume > 0) {
          lastTradeIdx = i;
          foundLast = true;
          break;
        }
      }
      // Find previous index with non-zero volume
      if (foundLast) {
        for (let i = lastTradeIdx - 1; i >= 0; i--) {
          if (nasdaqHistory[i].volume > 0) {
            prevTradeIdx = i;
            break;
          }
        }
      }
    }

    // Scale the simulated history for each asset to align with real prices
    for (const asset of this.universeAssets) {
      const candles = this.priceData[asset.id];
      if (!candles || candles.length < Math.max(lastTradeIdx, prevTradeIdx) + 1) continue;

      const realData = realPrices?.[asset.id];
      if (realData && realData.price !== undefined && realData.price !== null) {
        const simulatedPrevClose = candles[prevTradeIdx].close;

        // Use real price for the last trading day, real prevClose for the previous trading day
        const realLastClose = realData.price;
        const realPrevClose = realData.prevClose;

        // Scale the entire history up to the previous trading day to end at realPrevClose
        const scaleFactor = realPrevClose / (simulatedPrevClose || 1);
        for (let i = 0; i <= prevTradeIdx; i++) {
          candles[i].open = parseFloat((candles[i].open * scaleFactor).toFixed(2));
          candles[i].close = parseFloat((candles[i].close * scaleFactor).toFixed(2));
          candles[i].high = parseFloat((candles[i].high * scaleFactor).toFixed(2));
          candles[i].low = parseFloat((candles[i].low * scaleFactor).toFixed(2));
        }

        // Set the last trading day candle to realLastClose and open = realPrevClose
        const lastTradeCandle = candles[lastTradeIdx];
        lastTradeCandle.open = parseFloat(realPrevClose.toFixed(2));
        lastTradeCandle.close = parseFloat(realLastClose.toFixed(2));
        lastTradeCandle.high = parseFloat(Math.max(realPrevClose, realLastClose).toFixed(2));
        lastTradeCandle.low = parseFloat(Math.min(realPrevClose, realLastClose).toFixed(2));
        lastTradeCandle.volume = realData.volume;

        // Forward-fill scaled values from lastTradeIdx + 1 to today (t = totalDays - 1)
        for (let i = lastTradeIdx + 1; i < totalDays; i++) {
          candles[i].open = parseFloat(realLastClose.toFixed(2));
          candles[i].close = parseFloat(realLastClose.toFixed(2));
          candles[i].high = parseFloat(realLastClose.toFixed(2));
          candles[i].low = parseFloat(realLastClose.toFixed(2));
          candles[i].volume = 0;
        }
      }
    }

    console.log(`✅ Pre-computed price history for ${this.universeAssets.length} expanded universe assets!`);
  }
}
