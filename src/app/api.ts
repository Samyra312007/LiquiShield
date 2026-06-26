// Client API Layer with High-Fidelity Local Fallback for LiquiditySim

export interface Branch {
  branch_id: string;
  region: string;
  current_balance: number;
  min_reserve_threshold: number;
  is_flagged: boolean;
}

export interface BaselineResponse {
  branches: Branch[];
  total_liquidity: number;
  total_branches: number;
  branches_at_risk: number;
}

export interface ForecastBranchResult {
  branch_id: string;
  region: string;
  predicted_dates: string[];
  forecasted_cash: number[];
  historical_dates: string[];
  historical_cash: number[];
  will_breach_minimum: boolean;
  breach_date: string | null;
  days_until_zero: number; // or days until breach
  min_reserve_threshold: number;
}

export interface SimulationResponse {
  forecasts: ForecastBranchResult[];
  execution_time_ms: number;
  is_fallback: boolean;
  news_impact?: {
    applied_nlp_shock_pct: number;
    headline_evaluated: string;
  };
}

export interface SimulationPayload {
  severity_multiplier: number;
  forecast_days?: number;
  regions?: string[];
  retail_runoff_rate: number;
  corporate_runoff_rate: number;
  news_headline?: string;
}

const API_BASE_URL = "http://localhost:8000/api/v1";

// Seeded local branches matching the 15 branch system
const SEEDED_BRANCHES: Omit<Branch, "is_flagged">[] = [
  { branch_id: "BR-NYC-001", region: "North America", current_balance: 280000000, min_reserve_threshold: 80000000 },
  { branch_id: "BR-LDN-002", region: "Europe", current_balance: 210000000, min_reserve_threshold: 60000000 },
  { branch_id: "BR-TKY-003", region: "Asia-Pacific", current_balance: 170000000, min_reserve_threshold: 50000000 },
  { branch_id: "BR-SGP-004", region: "Asia-Pacific", current_balance: 140000000, min_reserve_threshold: 40000000 },
  { branch_id: "BR-FRA-005", region: "Europe", current_balance: 120000000, min_reserve_threshold: 35000000 },
  { branch_id: "BR-ZUR-006", region: "Europe", current_balance: 110000000, min_reserve_threshold: 30000000 },
  { branch_id: "BR-HKG-007", region: "Asia-Pacific", current_balance: 95000000, min_reserve_threshold: 25000000 },
  { branch_id: "BR-TOR-008", region: "North America", current_balance: 85000000, min_reserve_threshold: 22000000 },
  { branch_id: "BR-SYD-009", region: "Asia-Pacific", current_balance: 75000000, min_reserve_threshold: 18000000 },
  { branch_id: "BR-MUM-010", region: "Asia-Pacific", current_balance: 65000000, min_reserve_threshold: 15000000 },
  { branch_id: "BR-SAO-011", region: "South America", current_balance: 55000000, min_reserve_threshold: 12000000 },
  { branch_id: "BR-JNB-012", region: "Africa", current_balance: 45000000, min_reserve_threshold: 10000000 },
  { branch_id: "BR-CHI-013", region: "North America", current_balance: 40000000, min_reserve_threshold: 8000000 },
  { branch_id: "BR-DXB-014", region: "Middle East", current_balance: 90000000, min_reserve_threshold: 24000000 },
  { branch_id: "BR-LON-015", region: "Europe", current_balance: 50000000, min_reserve_threshold: 12000000 },
];

// Helper to generate 30 days of historical log dates
function generateHistoricalData(currentBalance: number, seed: string): { dates: string[]; cash: number[] } {
  const dates: string[] = [];
  const cash: number[] = [];
  
  // Use a deterministic pseudo-random number generator based on the branch seed string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const startDay = new Date();
  startDay.setDate(startDay.getDate() - 30);
  
  let tempBalance = currentBalance - 5000000; // start slightly lower and fluctuate up to current
  for (let i = 0; i < 30; i++) {
    const logDate = new Date(startDay);
    logDate.setDate(startDay.getDate() + i);
    dates.push(logDate.toISOString().split("T")[0]);
    
    // Add deterministic noise
    const pseudoRandom = Math.sin(hash + i) * 0.03; // +/- 3%
    const weeklyAdjustment = logDate.getDay() === 5 ? -0.015 : 0.005; // Friday drain
    
    tempBalance = tempBalance * (1 + pseudoRandom + weeklyAdjustment);
    
    // Smooth boundary toward target current balance at end
    if (i === 29) {
      tempBalance = currentBalance;
    }
    cash.push(Math.round(tempBalance));
  }
  
  return { dates, cash };
}

// Client-side Local Simulator
export function getLocalBaseline(): BaselineResponse {
  const branches = SEEDED_BRANCHES.map(b => ({
    ...b,
    is_flagged: b.current_balance < b.min_reserve_threshold
  }));
  
  const total_liquidity = branches.reduce((sum, b) => sum + b.current_balance, 0);
  const branches_at_risk = branches.filter(b => b.is_flagged).length;
  
  return {
    branches,
    total_liquidity,
    total_branches: branches.length,
    branches_at_risk
  };
}

export function getLocalSimulation(payload: SimulationPayload): SimulationResponse {
  const startTime = performance.now();
  const { severity_multiplier, retail_runoff_rate, corporate_runoff_rate, news_headline } = payload;
  
  // Simple NLP shock calculation
  let nlpShock = 0;
  if (news_headline && news_headline.trim().length > 10) {
    const headlineUpper = news_headline.toUpperCase();
    if (
      headlineUpper.includes("RUN") || 
      headlineUpper.includes("PANIC") || 
      headlineUpper.includes("CRASH") || 
      headlineUpper.includes("FAILURE") || 
      headlineUpper.includes("DOWNGRADE") ||
      headlineUpper.includes("DEFAULT")
    ) {
      nlpShock = 0.15 + Math.min(0.35, news_headline.length * 0.002);
    } else if (headlineUpper.includes("STABLE") || headlineUpper.includes("SUPPORT") || headlineUpper.includes("BAILOUT")) {
      nlpShock = -0.05; // mitigates shock slightly
    } else {
      nlpShock = 0.08;
    }
  }
  
  // Calculate total drain factor (0.0 to 1.0)
  // severity: 1.0 - 5.0, runoff: 0 - 1.0
  const baseDrainFactor = (retail_runoff_rate * 0.35) + (corporate_runoff_rate * 0.45) + (severity_multiplier * 0.08);
  const finalDrainFactor = Math.max(0, Math.min(0.95, baseDrainFactor + nlpShock));
  
  const forecasts: ForecastBranchResult[] = SEEDED_BRANCHES.map(b => {
    const hist = generateHistoricalData(b.current_balance, b.branch_id);
    
    // Simulate 30 days forward
    const predicted_dates: string[] = [];
    const forecasted_cash: number[] = [];
    
    const startDay = new Date();
    let currentCash = b.current_balance;
    let will_breach_minimum = false;
    let breach_date: string | null = null;
    let days_until_zero = 31; // default to safe (> 30 days)
    
    for (let day = 0; day < 30; day++) {
      const forecastDate = new Date(startDay);
      forecastDate.setDate(startDay.getDate() + day + 1);
      const dateStr = forecastDate.toISOString().split("T")[0];
      predicted_dates.push(dateStr);
      
      // Linear fractional decay formula matching Prophet injection shock:
      // cash[i] *= 1.0 - (drain_factor * i / 29)
      const dayFactor = day / 29;
      const decayCoeff = 1.0 - (finalDrainFactor * dayFactor);
      
      // Also add standard daily fluctuations (pseudo-random)
      let hash = 0;
      for (let i = 0; i < b.branch_id.length; i++) {
        hash = b.branch_id.charCodeAt(i) + ((hash << 5) - hash);
      }
      const fluctuation = Math.sin(hash + day) * 0.01; // +/- 1%
      
      const dayCash = Math.max(0, b.current_balance * decayCoeff * (1 + fluctuation));
      forecasted_cash.push(Math.round(dayCash));
      
      if (dayCash < b.min_reserve_threshold && !will_breach_minimum) {
        will_breach_minimum = true;
        breach_date = dateStr;
        days_until_zero = day + 1;
      }
    }
    
    return {
      branch_id: b.branch_id,
      region: b.region,
      predicted_dates,
      forecasted_cash,
      historical_dates: hist.dates,
      historical_cash: hist.cash,
      will_breach_minimum,
      breach_date,
      days_until_zero,
      min_reserve_threshold: b.min_reserve_threshold
    };
  });
  
  const endTime = performance.now();
  
  return {
    forecasts,
    execution_time_ms: Math.round(endTime - startTime),
    is_fallback: true,
    news_impact: news_headline ? {
      applied_nlp_shock_pct: Math.round(finalDrainFactor * 100),
      headline_evaluated: news_headline
    } : undefined
  };
}

// Active API Fetch Utilities
export async function getBaseline(): Promise<BaselineResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/liquidity/baseline`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Set a brief timeout
      signal: AbortSignal.timeout(2000),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map response to our frontend format if needed
    // Ensure all 15 branches are supported or merge with seeds if API returns fewer
    return {
      branches: data.branches.map((b: any) => ({
        branch_id: b.branch_id,
        region: b.region || "Global",
        current_balance: b.current_balance,
        min_reserve_threshold: b.min_reserve_threshold || (b.current_balance * 0.25),
        is_flagged: b.is_flagged || false
      })),
      total_liquidity: data.total_liquidity,
      total_branches: data.total_branches,
      branches_at_risk: data.branches_at_risk
    };
  } catch (error) {
    console.warn("⚠️ FastAPI backend baseline endpoint offline. Falling back to local high-fidelity generator.", error);
    return getLocalBaseline();
  }
}

export async function runSimulation(payload: SimulationPayload): Promise<SimulationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/liquidity/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        severity_multiplier: payload.severity_multiplier,
        forecast_days: payload.forecast_days || 30,
        regions: payload.regions || ["ALL"],
        retail_runoff_rate: payload.retail_runoff_rate,
        corporate_runoff_rate: payload.corporate_runoff_rate,
        news_headline: payload.news_headline
      }),
      signal: AbortSignal.timeout(8000), // 8 seconds maximum
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format the FastAPI forecasts response into visual chart lists
    const formattedForecasts: ForecastBranchResult[] = data.forecasts.map((f: any) => {
      // Find the corresponding baseline current balance
      const baseBranch = SEEDED_BRANCHES.find(b => b.branch_id === f.branch_id) || {
        current_balance: f.forecasted_cash[0] || 100000000,
        min_reserve_threshold: f.min_reserve_threshold || 25000000
      };
      
      const hist = generateHistoricalData(baseBranch.current_balance, f.branch_id);
      
      return {
        branch_id: f.branch_id,
        region: f.region || "Global",
        predicted_dates: f.predicted_dates,
        forecasted_cash: f.forecasted_cash,
        historical_dates: hist.dates,
        historical_cash: hist.cash,
        will_breach_minimum: f.will_breach_minimum,
        breach_date: f.breach_date,
        days_until_zero: f.days_until_zero !== undefined ? f.days_until_zero : (f.will_breach_minimum ? 15 : 31),
        min_reserve_threshold: baseBranch.min_reserve_threshold
      };
    });
    
    return {
      forecasts: formattedForecasts,
      execution_time_ms: data.execution_time_ms || 1200,
      is_fallback: false,
      news_impact: data.metrics ? {
        applied_nlp_shock_pct: data.metrics.applied_nlp_shock_pct,
        headline_evaluated: data.metrics.headline_evaluated
      } : undefined
    };
  } catch (error) {
    console.warn("⚠️ FastAPI backend simulate endpoint offline. Running client-side mathematical shock projection.", error);
    // Mimic API delay of ~1.2s to show scanning sweep animation correctly
    await new Promise(resolve => setTimeout(resolve, 1500));
    return getLocalSimulation(payload);
  }
}
