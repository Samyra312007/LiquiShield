"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  AlertTriangle, 
  TrendingDown, 
  Layers, 
  Play, 
  Database, 
  Wifi, 
  WifiOff, 
  Clock, 
  ArrowDownRight, 
  AlertCircle, 
  MapPin, 
  ShieldAlert,
  Loader2,
  RefreshCw,
  Sliders,
  DollarSign
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend
} from "recharts";
import { 
  getBaseline, 
  runSimulation, 
  Branch, 
  ForecastBranchResult, 
  BaselineResponse,
  SimulationResponse 
} from "./api";

// High-fidelity count up helper for numbers
function CountUp({ 
  value, 
  prefix = "", 
  suffix = "", 
  decimalPlaces = 0,
  divisor = 1
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  decimalPlaces?: number;
  divisor?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = displayValue;
    const end = value / divisor;
    if (start === end) return;
    
    const duration = 800; // 800ms animation
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      const current = start + (end - start) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    }

    requestAnimationFrame(animate);
  }, [value, divisor]);

  return (
    <span className="font-mono tracking-wider">
      {prefix}
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      })}
      {suffix}
    </span>
  );
}

export default function Dashboard() {
  // Global States
  const [currentTime, setCurrentTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [baselineData, setBaselineData] = useState<BaselineResponse | null>(null);
  const [simResults, setSimResults] = useState<SimulationResponse | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState("BR-NYC-001");
  const [apiStatus, setApiStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  
  // Sidebar Controls
  const [crisisVector, setCrisisVector] = useState("Baseline");
  const [severityMultiplier, setSeverityMultiplier] = useState(1.0);
  const [retailRunoff, setRetailRunoff] = useState(0.05);
  const [corporateRunoff, setCorporateRunoff] = useState(0.10);
  const [newsHeadline, setNewsHeadline] = useState("");
  const [newsImpactAlert, setNewsImpactAlert] = useState<{ pct: number; text: string } | null>(null);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);

  // Live timer for terminal feel
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Baseline data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const baseline = await getBaseline();
        setBaselineData(baseline);
        
        // Execute a baseline simulation right away so charts populate
        const initialSim = await runSimulation({
          severity_multiplier: 1.0,
          retail_runoff_rate: 0.05,
          corporate_runoff_rate: 0.10,
          news_headline: ""
        });
        setSimResults(initialSim);
        setApiStatus(initialSim.is_fallback ? "offline" : "online");
        setExecutionTime(initialSim.execution_time_ms);
        
        if (initialSim.is_fallback) {
          showToast("Connected to local simulation sandbox.", "warning");
        } else {
          showToast("FastAPI banking node connection established.", "success");
        }
      } catch (err) {
        showToast("Error connecting to banking network. Retrying...", "error");
        setApiStatus("offline");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Helper to trigger Toast alerts
  const showToast = (message: string, type: "success" | "warning" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Preset Handler for Crisis Vectors
  const handleVectorChange = (vectorName: string) => {
    setCrisisVector(vectorName);
    if (vectorName === "Baseline") {
      setSeverityMultiplier(1.0);
      setRetailRunoff(0.05);
      setCorporateRunoff(0.10);
      setNewsHeadline("Normative market operations remain stable; standard reserve distributions ongoing.");
    } else if (vectorName === "Sector Tech Crash") {
      setSeverityMultiplier(3.2);
      setRetailRunoff(0.45);
      setCorporateRunoff(0.65);
      setNewsHeadline("Sector tech stocks selloff triggers corporate margin calls and liquidity freeze.");
    } else if (vectorName === "Global Contagion") {
      setSeverityMultiplier(4.8);
      setRetailRunoff(0.75);
      setCorporateRunoff(0.85);
      setNewsHeadline("Global credit markets lock up as tier-1 commercial papers experience extreme defaults.");
    }
  };

  // Run Simulation CTA Action
  const handleRunSimulation = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const results = await runSimulation({
        severity_multiplier: severityMultiplier,
        retail_runoff_rate: retailRunoff,
        corporate_runoff_rate: corporateRunoff,
        news_headline: newsHeadline
      });
      
      setSimResults(results);
      setApiStatus(results.is_fallback ? "offline" : "online");
      setExecutionTime(results.execution_time_ms);
      
      if (results.news_impact) {
        setNewsImpactAlert({
          pct: results.news_impact.applied_nlp_shock_pct,
          text: results.news_impact.headline_evaluated
        });
      } else {
        setNewsImpactAlert(null);
      }

      if (results.is_fallback) {
        showToast("FastAPI offline. Compiled JS local linear stress projection.", "warning");
      } else {
        showToast(`Prophet inference matrices computed successfully in ${results.execution_time_ms}ms.`, "success");
      }
    } catch (err) {
      showToast("Simulation engine connection timeout.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    handleVectorChange("Baseline");
    setNewsImpactAlert(null);
    setLoading(true);
    try {
      const initialSim = await runSimulation({
        severity_multiplier: 1.0,
        retail_runoff_rate: 0.05,
        corporate_runoff_rate: 0.10,
        news_headline: ""
      });
      setSimResults(initialSim);
      setExecutionTime(initialSim.execution_time_ms);
      showToast("System reset to normal operation parameters.", "success");
    } catch (err) {
      showToast("Reset failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Synchronous live preview simulator (running client-side formulas)
  const getLivePreview = () => {
    let nlpShock = 0;
    if (newsHeadline && newsHeadline.trim().length > 10) {
      const headlineUpper = newsHeadline.toUpperCase();
      if (
        headlineUpper.includes("RUN") || 
        headlineUpper.includes("PANIC") || 
        headlineUpper.includes("CRASH") || 
        headlineUpper.includes("FAILURE") || 
        headlineUpper.includes("DOWNGRADE") ||
        headlineUpper.includes("DEFAULT")
      ) {
        nlpShock = 0.15 + Math.min(0.35, newsHeadline.length * 0.002);
      } else if (headlineUpper.includes("STABLE") || headlineUpper.includes("SUPPORT") || headlineUpper.includes("BAILOUT")) {
        nlpShock = -0.05;
      } else {
        nlpShock = 0.08;
      }
    }
    
    const baseDrainFactor = (retailRunoff * 0.35) + (corporateRunoff * 0.45) + (severityMultiplier * 0.08);
    const finalDrainFactor = Math.max(0, Math.min(0.95, baseDrainFactor + nlpShock));
    
    let liveBranchesAtRisk = 0;
    let liveMinDaysUntilBreach = 31;
    let liveFirstBreachedBranch = "";
    
    const branchesMeta = [
      { branch_id: "BR-NYC-001", current_balance: 280000000, min_reserve_threshold: 80000000 },
      { branch_id: "BR-LDN-002", current_balance: 210000000, min_reserve_threshold: 60000000 },
      { branch_id: "BR-TKY-003", current_balance: 170000000, min_reserve_threshold: 50000000 },
      { branch_id: "BR-SGP-004", current_balance: 140000000, min_reserve_threshold: 40000000 },
      { branch_id: "BR-FRA-005", current_balance: 120000000, min_reserve_threshold: 35000000 },
      { branch_id: "BR-ZUR-006", current_balance: 110000000, min_reserve_threshold: 30000000 },
      { branch_id: "BR-HKG-007", current_balance: 95000000, min_reserve_threshold: 25000000 },
      { branch_id: "BR-TOR-008", current_balance: 85000000, min_reserve_threshold: 22000000 },
      { branch_id: "BR-SYD-009", current_balance: 75000000, min_reserve_threshold: 18000000 },
      { branch_id: "BR-MUM-010", current_balance: 65000000, min_reserve_threshold: 15000000 },
      { branch_id: "BR-SAO-011", current_balance: 55000000, min_reserve_threshold: 12000000 },
      { branch_id: "BR-JNB-012", current_balance: 45000000, min_reserve_threshold: 10000000 },
      { branch_id: "BR-CHI-013", current_balance: 40000000, min_reserve_threshold: 8000000 },
      { branch_id: "BR-DXB-014", current_balance: 90000000, min_reserve_threshold: 24000000 },
      { branch_id: "BR-LON-015", current_balance: 50000000, min_reserve_threshold: 12000000 },
    ];
    
    branchesMeta.forEach(b => {
      let breached = false;
      let days = 31;
      
      for (let day = 0; day < 30; day++) {
        const dayFactor = day / 29;
        const decayCoeff = 1.0 - (finalDrainFactor * dayFactor);
        
        let hash = 0;
        for (let i = 0; i < b.branch_id.length; i++) {
          hash = b.branch_id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const fluctuation = Math.sin(hash + day) * 0.01;
        
        const dayCash = b.current_balance * decayCoeff * (1 + fluctuation);
        
        if (dayCash < b.min_reserve_threshold && !breached) {
          breached = true;
          days = day + 1;
        }
      }
      
      if (breached) {
        liveBranchesAtRisk++;
        if (days < liveMinDaysUntilBreach) {
          liveMinDaysUntilBreach = days;
          liveFirstBreachedBranch = b.branch_id;
        }
      }
    });
    
    return {
      branchesAtRisk: liveBranchesAtRisk,
      minDaysUntilBreach: liveMinDaysUntilBreach,
      firstBreachedBranch: liveFirstBreachedBranch,
      panicShockPct: Math.round(finalDrainFactor * 100)
    };
  };

  const livePreview = getLivePreview();

  // Compute stats for current simulation results
  const totalLiquidity = baselineData?.total_liquidity || 1630000000;
  const activeBranches = baselineData?.total_branches || 15;
  
  // Calculate simulated metrics — use actual sim results when available
  const activeForecasts = simResults?.forecasts || [];
  const branchesAtRisk = simResults
    ? simResults.forecasts.filter(f => f.will_breach_minimum).length
    : livePreview.branchesAtRisk;
  const breachedForecasts = activeForecasts.filter(f => f.will_breach_minimum);
  const minDaysUntilBreach = breachedForecasts.length > 0
    ? Math.min(...breachedForecasts.map(f => f.days_until_zero ?? 31))
    : livePreview.minDaysUntilBreach;
  const firstBreachedBranch = breachedForecasts.length > 0
    ? breachedForecasts.sort((a, b) => (a.days_until_zero ?? 31) - (b.days_until_zero ?? 31))[0].branch_id
    : livePreview.firstBreachedBranch;

  // Get current selected branch forecast
  const selectedForecast = activeForecasts.find(f => f.branch_id === selectedBranchId);

  // Format Recharts Data
  const formatChartData = () => {
    if (!selectedForecast) return [];
    
    const chartData: any[] = [];
    const histDates = selectedForecast.historical_dates;
    const histCash = selectedForecast.historical_cash;
    const predDates = selectedForecast.predicted_dates;
    const predCash = selectedForecast.forecasted_cash;
    const limit = selectedForecast.min_reserve_threshold;
    
    const lastHistIndex = histDates.length - 1;
    const connectVal = histCash[lastHistIndex];
    
    // Push historical logs
    histDates.forEach((date, i) => {
      chartData.push({
        dateStr: date,
        label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        historical: histCash[i],
        forecasted: i === lastHistIndex ? connectVal : null,
        limit: limit,
      });
    });
    
    // Push forecasted projections
    predDates.forEach((date, i) => {
      chartData.push({
        dateStr: date,
        label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        historical: null,
        forecasted: predCash[i],
        limit: limit,
      });
    });
    
    return chartData;
  };

  const chartDataPoints = formatChartData();

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHistorical = data.historical !== null;
      const value = isHistorical ? data.historical : data.forecasted;
      const limit = data.limit;
      const breached = value < limit;
      
      return (
        <div className="glass-panel p-3 border border-white/10 rounded shadow-xl text-xs">
          <p className="text-slate-400 font-semibold mb-1">{data.dateStr}</p>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${isHistorical ? "bg-neon-cyan" : breached ? "bg-neon-red animate-pulse" : "bg-neon-cyan"}`} />
            <span className="text-slate-300">
              {isHistorical ? "Historical Logs:" : "Prophet Forecast:"}
            </span>
            <span className="font-mono text-white font-bold ml-auto">
              ${(value / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-amber" />
            <span className="text-slate-400">Min Reserve Limit:</span>
            <span className="font-mono text-neon-amber ml-auto">
              ${(limit / 1000000).toFixed(2)}M
            </span>
          </div>
          {breached && !isHistorical && (
            <div className="mt-2 text-neon-red font-bold flex items-center gap-1 border-t border-neon-red/20 pt-2 animate-pulse">
              <ShieldAlert size={12} />
              CRITICAL RESERVE BREACH
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate current branch metrics for HUD detail
  const currentBranchDetail = SEEDED_BRANCHES_META.find(b => b.branch_id === selectedBranchId) || {
    branch_id: selectedBranchId,
    region: "Global",
    country: "US"
  };

  return (
    <main className="flex-1 min-h-screen mesh-gradient flex flex-col p-4 relative select-none">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-fade-in-up">
          <div className={`glass-panel flex items-center gap-3 px-4 py-3 border rounded shadow-2xl ${
            toast.type === "success" ? "border-neon-cyan/40 bg-[#00171a]/85" :
            toast.type === "warning" ? "border-neon-amber/40 bg-[#1f1a05]/85" :
            "border-neon-red/40 bg-[#1a0508]/85"
          }`}>
            {toast.type === "success" && <Activity className="text-neon-cyan animate-pulse" size={16} />}
            {toast.type === "warning" && <AlertTriangle className="text-neon-amber animate-bounce" size={16} />}
            {toast.type === "error" && <ShieldAlert className="text-neon-red animate-pulse" size={16} />}
            <span className={`text-xs font-semibold ${
              toast.type === "success" ? "text-neon-cyan" :
              toast.type === "warning" ? "text-neon-amber" :
              "text-neon-red"
            }`}>
              {toast.message}
            </span>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="w-full flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-3 mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan"></span>
            </span>
            <h1 className="text-sm font-bold tracking-widest text-slate-400 font-mono">
              LIQUIDSHIELD // LIQUIDITY STRESS TEST MULTIPLEX
            </h1>
          </div>
          <p className="text-2xl font-black tracking-tight text-white font-display">
            GLOBAL STRESS-TESTING COMMAND SIDEPORT
          </p>
        </div>
        
        {/* Terminal Telemetry details */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded">
            <Clock size={12} className="text-neon-cyan animate-spin-slow" />
            <span>{currentTime}</span>
          </div>
          
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded">
            <Database size={12} className="text-slate-400" />
            <span>DB:</span>
            <span className="text-white font-bold">AWS AURORA SERVERLESS</span>
          </div>

          <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded ${
            apiStatus === "online" ? "border-neon-cyan/20 bg-neon-cyan/5 text-neon-cyan" :
            apiStatus === "offline" ? "border-neon-amber/20 bg-neon-amber/5 text-neon-amber" :
            "border-white/10 bg-white/5 text-slate-400"
          }`}>
            {apiStatus === "online" ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>ENGINE:</span>
            <span className="font-bold">{apiStatus.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* DASHBOARD WRAPPER: THREE-ZONE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-hidden">
        
        {/* ZONE 1: CONTROL SIDEBAR (Left, 20% Width / 1 Column) */}
        <section className="lg:col-span-1 glass-panel p-4 rounded-xl flex flex-col gap-4 border border-white/10 overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Sliders className="text-neon-cyan" size={16} />
            <h2 className="text-sm font-bold text-white tracking-wider font-mono">SCENARIO CONTROLS</h2>
          </div>

          {/* Preset selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 tracking-wider font-bold">CRISIS VECTOR MODEL</label>
            <select 
              value={crisisVector} 
              onChange={(e) => handleVectorChange(e.target.value)}
              disabled={loading}
              className="bg-obsidian-950 border border-white/10 text-xs text-white rounded p-2 focus:outline-none focus:border-neon-cyan font-mono"
            >
              <option value="Baseline">Normative Baseline (1.0x)</option>
              <option value="Sector Tech Crash">Sector Tech Crash (3.2x)</option>
              <option value="Global Contagion">Global Contagion (4.8x)</option>
            </select>
          </div>

          {/* Headline NLP area - RE-POSITIONED BELOW VECTOR MODEL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 tracking-wider font-bold">NEWS HEADLINE TRIGGER (NLP)</label>
            <textarea 
              rows={3}
              value={newsHeadline}
              onChange={(e) => {
                setNewsHeadline(e.target.value);
                setCrisisVector("Custom");
              }}
              disabled={loading}
              placeholder="e.g. Severe market panic sparks depositors sprint to pull capital from regional banks..."
              className="bg-obsidian-950 border border-white/10 text-xs text-white rounded p-2 focus:outline-none focus:border-neon-cyan resize-none font-sans leading-relaxed"
            />
          </div>

          {/* AI Calculated Panic Shock Telemetry Badge */}
          <div className="flex flex-col gap-1 bg-white/5 border border-white/10 rounded p-2.5 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">AI PANIC SHOCK:</span>
              <span className={`font-bold transition-colors duration-200 ${
                livePreview.panicShockPct > 50 ? "text-[#FF003C] animate-pulse" : "text-white"
              }`}>
                {livePreview.panicShockPct}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded overflow-hidden mt-1.5">
              <div 
                className={`h-full transition-all duration-300 ${
                  livePreview.panicShockPct > 50 ? "bg-[#FF003C]" : "bg-neon-cyan"
                }`}
                style={{ width: `${livePreview.panicShockPct}%` }}
              />
            </div>
          </div>

          {/* Severity Multiplier Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-400 tracking-wider">SEVERITY MULTIPLIER</span>
              <span className="text-neon-cyan font-mono">{severityMultiplier.toFixed(1)}x</span>
            </div>
            <input 
              type="range" 
              min="1.0" 
              max="5.0" 
              step="0.1"
              value={severityMultiplier}
              onChange={(e) => {
                setSeverityMultiplier(parseFloat(e.target.value));
                setCrisisVector("Custom");
              }}
              disabled={loading}
              className="w-full accent-neon-cyan bg-obsidian-950 cursor-pointer h-1.5 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[8px] text-slate-500 font-mono">
              <span>MIN (1.0x)</span>
              <span>MED (3.0x)</span>
              <span>MAX (5.0x)</span>
            </div>
          </div>

          {/* Retail Runoff rate Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-400 tracking-wider">RETAIL RUNOFF RATE</span>
              <span className="text-neon-cyan font-mono">{(retailRunoff * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="1.0" 
              step="0.05"
              value={retailRunoff}
              onChange={(e) => {
                setRetailRunoff(parseFloat(e.target.value));
                setCrisisVector("Custom");
              }}
              disabled={loading}
              className="w-full accent-neon-cyan bg-obsidian-950 cursor-pointer h-1.5 rounded-lg appearance-none"
            />
          </div>

          {/* Corporate Runoff rate Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-400 tracking-wider">CORP RUNOFF RATE</span>
              <span className="text-neon-cyan font-mono">{(corporateRunoff * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="1.0" 
              step="0.05"
              value={corporateRunoff}
              onChange={(e) => {
                setCorporateRunoff(parseFloat(e.target.value));
                setCrisisVector("Custom");
              }}
              disabled={loading}
              className="w-full accent-neon-cyan bg-obsidian-950 cursor-pointer h-1.5 rounded-lg appearance-none"
            />
          </div>

          {/* NLP Impact Summary Overlay */}
          {newsImpactAlert && (
            <div className="border border-neon-red/20 bg-neon-red/5 p-2 rounded text-[10px] flex items-start gap-1.5 animate-fade-in-up">
              <AlertCircle size={14} className="text-neon-red shrink-0" />
              <div className="text-slate-300">
                <span className="font-bold text-neon-red">NLP CORRELATION: </span>
                Applied news shock: <span className="font-mono text-white font-bold">+{newsImpactAlert.pct}%</span> withdrawal decay bias.
              </div>
            </div>
          )}

          {/* CTA Run Button */}
          <button
            onClick={handleRunSimulation}
            disabled={loading}
            className={`w-full py-3 rounded font-mono font-bold text-xs tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
              loading 
                ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed" 
                : "bg-gradient-to-r from-neon-blue to-neon-cyan hover:from-neon-cyan hover:to-neon-blue text-white shadow-lg hover:shadow-neon-cyan/20 border border-neon-cyan/40 cursor-pointer active:scale-95"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin text-neon-cyan" size={14} />
                COMPUTING MATRICES...
              </>
            ) : (
              <>
                <Play size={12} className="fill-current text-white" />
                RUN STRESS SIMULATION
              </>
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded font-mono text-[10px] tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={10} />
            RESET TO NORMAL OPERATION
          </button>
        </section>

        {/* WORKSPACE AREA (Right, 80% Width / 4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
          
          {/* ZONE 2: MACRO OVERVIEW HUD (Top Banner) */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* KPI CARD 1: GLOBAL LIQUIDITY */}
            <div className="glass-panel glass-panel-hover p-4 rounded-xl border border-white/10 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold tracking-wider mb-2 font-mono">
                <span>TOTAL AVAILABLE LIQUIDITY</span>
                <DollarSign size={14} className="text-neon-cyan" />
              </div>
              <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                <CountUp value={totalLiquidity} prefix="$" suffix="B" decimalPlaces={3} divisor={1000000000} />
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-sans">
                Seeded HQLA across branch networks
              </div>
              {/* Cyan bottom bar line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-blue to-neon-cyan" />
            </div>

            {/* KPI CARD 2: ACTIVE REGISTRIES */}
            <div className="glass-panel glass-panel-hover p-4 rounded-xl border border-white/10 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold tracking-wider mb-2 font-mono">
                <span>ACTIVE BRANCH NETWORK</span>
                <Layers size={14} className="text-slate-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                <CountUp value={activeBranches} decimalPlaces={0} />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Tier-1 global financial nodes online
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-500" />
            </div>

            {/* KPI CARD 3: BRANCHES AT RISK */}
            <div className="glass-panel glass-panel-hover p-4 rounded-xl border border-white/10 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold tracking-wider mb-2 font-mono">
                <span>BRANCHES AT CRITICAL RISK</span>
                <AlertTriangle size={14} className={branchesAtRisk > 0 ? "text-neon-red animate-pulse" : "text-slate-500"} />
              </div>
              <div className={`text-2xl font-black font-mono ${branchesAtRisk > 0 ? "text-neon-red animate-pulse" : "text-white"}`}>
                <CountUp value={branchesAtRisk} decimalPlaces={0} />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {branchesAtRisk > 0 
                  ? "Breaching regulatory reserve threshold" 
                  : "All branches currently secure"
                }
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${branchesAtRisk > 0 ? "bg-neon-red animate-pulse" : "bg-green-500"}`} />
            </div>

            {/* KPI CARD 4: COUNTDOWN TO CRITICAL */}
            <div className="glass-panel glass-panel-hover p-4 rounded-xl border border-white/10 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold tracking-wider mb-2 font-mono">
                <span>COUNTDOWN TO FIRST FAILURE</span>
                <ShieldAlert size={14} className={branchesAtRisk > 0 ? "text-neon-amber animate-bounce" : "text-slate-500"} />
              </div>
              <div className={`text-2xl font-black font-mono ${branchesAtRisk > 0 ? "text-neon-amber animate-pulse" : "text-emerald-500"}`}>
                {branchesAtRisk > 0 ? (
                  <span>T-MINUS {minDaysUntilBreach} DAYS</span>
                ) : (
                  <span>SECURE</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {branchesAtRisk > 0 
                  ? `Earliest failure node: ${firstBreachedBranch}` 
                  : "Stress envelope parameters stable"
                }
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${branchesAtRisk > 0 ? "bg-neon-amber animate-pulse" : "bg-emerald-500"}`} />
            </div>

          </section>

          {/* ZONE 3A: THE TRAJECTORY CHART (Top 60%) */}
          <section className="flex-1 min-h-[300px] glass-panel p-4 rounded-xl border border-white/10 flex flex-col relative overflow-hidden">
            
            {/* Chart laser scanning shimmer bar */}
            {loading && (
              <div className="absolute inset-0 bg-obsidian-950/20 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
                <div className="laser-bar animate-laser" />
              </div>
            )}

            {/* Chart Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-2 mb-3 gap-2">
              <div>
                <h3 className="text-xs font-bold font-mono tracking-widest text-slate-400 flex items-center gap-1.5">
                  <MapPin size={12} className="text-neon-cyan" />
                  STRESS TRAJECTORY FORECAST
                </h3>
                <h4 className="text-lg font-black text-white font-display">
                  {selectedBranchId} <span className="text-xs text-slate-500 font-mono">({currentBranchDetail.region} // MIN REG RESERVE limit: ${(selectedForecast?.min_reserve_threshold || 0) / 1000000}M)</span>
                </h4>
              </div>

              {/* Branch Selector Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">NODE SELECT:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-obsidian-900 border border-white/10 text-xs text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-neon-cyan font-mono"
                >
                  {SEEDED_BRANCHES.map(b => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.branch_id} ({b.region.split("-")[0]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recharts chart area */}
            <div className="flex-1 w-full relative">
              {selectedForecast ? (
                <ResponsiveContainer width="100%" height="95%">
                  <LineChart
                    data={chartDataPoints}
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    
                    <XAxis 
                      dataKey="label" 
                      stroke="#666" 
                      tick={{ fill: "#666", fontSize: 9 }}
                      axisLine={{ stroke: "#444" }}
                    />
                    
                    <YAxis 
                      stroke="#666" 
                      tick={{ fill: "#666", fontSize: 9 }}
                      axisLine={{ stroke: "#444" }}
                      tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`}
                    />
                    
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Regulatory Floor Reference Line */}
                    <ReferenceLine 
                      y={selectedForecast.min_reserve_threshold} 
                      stroke="#FFB800" 
                      strokeDasharray="4 4"
                      label={{ 
                        value: "REGULATORY FLOOR LIMIT", 
                        fill: "#FFB800", 
                        fontSize: 9, 
                        position: "top" 
                      }} 
                    />
                    
                    {/* Efficiency Ceiling Reference Line */}
                    <ReferenceLine 
                      y={selectedForecast.min_reserve_threshold * 2.8} 
                      stroke="#FF5722" 
                      strokeDasharray="4 4"
                      label={{ 
                        value: "EFFICIENCY CEILING", 
                        fill: "#FF5722", 
                        fontSize: 9, 
                        position: "bottom" 
                      }} 
                    />
                    
                    <Legend 
                      verticalAlign="top"
                      height={24}
                      iconType="plainline"
                      wrapperStyle={{ fontSize: 10 }}
                    />
                    
                    {/* Historical curve */}
                    <Line
                      name="Historical Cash Balance (Solid)"
                      type="monotone"
                      dataKey="historical"
                      stroke="#0057FF"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#00F0FF" }}
                    />
                    
                    {/* Projected Curve */}
                    <Line
                      name="Prophet 30-Day Shock Forecast (Dashed)"
                      type="monotone"
                      dataKey="forecasted"
                      stroke={selectedForecast.will_breach_minimum ? "#FF003C" : "#00F0FF"}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 4, fill: selectedForecast.will_breach_minimum ? "#FF003C" : "#00F0FF" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center font-mono text-slate-500 text-xs">
                  Awaiting Stress Parameters Initialization...
                </div>
              )}
            </div>

            {/* Chart footer detail */}
            {simResults && (
              <div className="absolute bottom-2 right-4 flex items-center gap-1.5 text-[8px] font-mono text-slate-500">
                <Database size={10} />
                <span>PROPET FORECAST MATRIX V4 // LATENCY: {simResults.execution_time_ms} ms</span>
              </div>
            )}
          </section>

          {/* ZONE 3B: THE TRIAGE ACTION MATRIX (Bottom 40%) */}
          <section className="h-[200px] glass-panel p-4 rounded-xl border border-white/10 flex flex-col overflow-hidden">
            <div className="border-b border-white/5 pb-2 mb-2 flex justify-between items-center">
              <h3 className="text-xs font-bold font-mono tracking-widest text-slate-400 flex items-center gap-1.5">
                <AlertCircle size={12} className={branchesAtRisk > 0 ? "text-neon-amber animate-pulse" : "text-slate-400"} />
                BRANCH RISK TRIAGE ENVELOPE
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                ORDERED BY SEVERITY (EARLIEST BREACH)
              </span>
            </div>

            {/* Table wrapper */}
            <div className="flex-grow overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 font-mono text-[9px] uppercase tracking-wider">
                    <th className="py-2 pl-2">Branch ID</th>
                    <th className="py-2">Region</th>
                    <th className="py-2">Current Balance</th>
                    <th className="py-2">Reserve Limit</th>
                    <th className="py-2">Days to Breach</th>
                    <th className="py-2 pr-2 text-right">Projected Shortfall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {activeForecasts.length > 0 ? (
                    // Sort forecasts: breached first (earliest breach), then non-breached
                    [...activeForecasts]
                      .sort((a, b) => {
                        if (a.will_breach_minimum && b.will_breach_minimum) {
                          return a.days_until_zero - b.days_until_zero;
                        }
                        if (a.will_breach_minimum) return -1;
                        if (b.will_breach_minimum) return 1;
                        // For non-breached, sort by current balance ascending
                        const aBal = a.historical_cash[a.historical_cash.length - 1] || 0;
                        const bBal = b.historical_cash[b.historical_cash.length - 1] || 0;
                        return aBal - bBal;
                      })
                      .map((f, index) => {
                        const breached = f.will_breach_minimum;
                        const isSelected = f.branch_id === selectedBranchId;
                        
                        // Calculate projected shortfall (min reserve - lowest forecasted balance)
                        const minForecasted = Math.min(...f.forecasted_cash);
                        const shortfall = breached ? Math.max(0, f.min_reserve_threshold - minForecasted) : 0;
                        
                        // Dynamic class configuration based on stagger indexing
                        const staggerClass = `animate-fade-in-up delay-${Math.min(10, index) * 100}`;

                        return (
                          <tr 
                            key={f.branch_id}
                            onClick={() => setSelectedBranchId(f.branch_id)}
                            className={`cursor-pointer transition-all duration-150 hover:bg-white/5 ${staggerClass} ${
                              isSelected ? "bg-neon-cyan/5 border-l-2 border-l-neon-cyan" : ""
                            } ${
                              breached ? "text-neon-red hover:bg-neon-red/5" : "text-slate-300"
                            }`}
                          >
                            <td className="py-2.5 pl-2 font-bold flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                breached ? "bg-neon-red animate-pulse" : "bg-neon-cyan"
                              }`} />
                              {f.branch_id}
                            </td>
                            <td className="py-2.5 text-slate-400 font-sans">
                              {f.region}
                            </td>
                            <td className="py-2.5 font-bold">
                              ${(f.historical_cash[f.historical_cash.length - 1] / 1000000).toFixed(1)}M
                            </td>
                            <td className="py-2.5 text-slate-400">
                              ${(f.min_reserve_threshold / 1000000).toFixed(1)}M
                            </td>
                            <td className="py-2.5">
                              {breached ? (
                                <span className="bg-neon-red/10 border border-neon-red/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {f.days_until_zero} DAYS
                                </span>
                              ) : (
                                <span className="text-slate-500 font-sans">SECURE (&gt;30d)</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-2 text-right font-bold text-white">
                              {breached && shortfall > 0 ? (
                                <span className="text-neon-red font-black">
                                  -${(shortfall / 1000000).toFixed(2)}M
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                        Seeding data nodes... Loading active ledger matrices.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}

// Meta lookup table for additional region/country styling details
const SEEDED_BRANCHES_META = [
  { branch_id: "BR-NYC-001", region: "North America", country: "US" },
  { branch_id: "BR-LDN-002", region: "Europe", country: "UK" },
  { branch_id: "BR-TKY-003", region: "Asia-Pacific", country: "JP" },
  { branch_id: "BR-SGP-004", region: "Asia-Pacific", country: "SG" },
  { branch_id: "BR-FRA-005", region: "Europe", country: "DE" },
  { branch_id: "BR-ZUR-006", region: "Europe", country: "CH" },
  { branch_id: "BR-HKG-007", region: "Asia-Pacific", country: "HK" },
  { branch_id: "BR-TOR-008", region: "North America", country: "CA" },
  { branch_id: "BR-SYD-009", region: "Asia-Pacific", country: "AU" },
  { branch_id: "BR-MUM-010", region: "Asia-Pacific", country: "IN" },
  { branch_id: "BR-SAO-011", region: "South America", country: "BR" },
  { branch_id: "BR-JNB-012", region: "Africa", country: "ZA" },
  { branch_id: "BR-CHI-013", region: "North America", country: "US" },
  { branch_id: "BR-DXB-014", region: "Middle East", country: "AE" },
  { branch_id: "BR-LON-015", region: "Europe", country: "UK" },
];

const SEEDED_BRANCHES = [
  { branch_id: "BR-NYC-001", region: "North America" },
  { branch_id: "BR-LDN-002", region: "Europe" },
  { branch_id: "BR-TKY-003", region: "Asia-Pacific" },
  { branch_id: "BR-SGP-004", region: "Asia-Pacific" },
  { branch_id: "BR-FRA-005", region: "Europe" },
  { branch_id: "BR-ZUR-006", region: "Europe" },
  { branch_id: "BR-HKG-007", region: "Asia-Pacific" },
  { branch_id: "BR-TOR-008", region: "North America" },
  { branch_id: "BR-SYD-009", region: "Asia-Pacific" },
  { branch_id: "BR-MUM-010", region: "Asia-Pacific" },
  { branch_id: "BR-SAO-011", region: "South America" },
  { branch_id: "BR-JNB-012", region: "Africa" },
  { branch_id: "BR-CHI-013", region: "North America" },
  { branch_id: "BR-DXB-014", region: "Middle East" },
  { branch_id: "BR-LON-015", region: "Europe" },
];
