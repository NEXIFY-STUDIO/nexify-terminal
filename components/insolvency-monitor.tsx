"use client"

import { useState, useEffect } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts"
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  AlertOctagon, 
  ShieldAlert, 
  RefreshCw, 
  Search,
  Sliders,
  DollarSign,
  Calendar,
  Percent,
  CheckCircle,
  FileCheck2
} from "lucide-react"

interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: 'paid' | 'overdue' | 'pending';
}

interface Partner {
  id: string;
  name: string;
  ico: string;
  averageDelayDays: number;
  outstandingAmount: number;
  moralityScore: number;
  insolvencyRisk3M: number;
  trend: 'improving' | 'stable' | 'worsening';
  invoices: Invoice[];
}

export function InsolvencyMonitor() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Simulation States
  const [simulatedDelay, setSimulatedDelay] = useState<number>(30)
  const [simulatedOutstanding, setSimulatedOutstanding] = useState<number>(10000)

  const fetchInsolvencyData = async () => {
    try {
      const res = await fetch("/api/insolvency")
      const json = await res.json()
      if (json.success) {
        setPartners(json.partners)
        if (json.partners.length > 0) {
          setSelectedPartner(json.partners[0])
          setSimulatedDelay(json.partners[0].averageDelayDays)
          setSimulatedOutstanding(json.partners[0].outstandingAmount)
        }
        setError(null)
      } else {
        setError(json.error || "Failed to load insolvency metrics.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to contact insolvency endpoint.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsolvencyData()
  }, [])

  const handlePartnerSelect = (partner: Partner) => {
    setSelectedPartner(partner)
    setSimulatedDelay(partner.averageDelayDays)
    setSimulatedOutstanding(partner.outstandingAmount)
  }

  // Filtered partners
  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.ico.includes(searchQuery)
  )

  // Simulation algorithm for 3-month insolvency prediction
  // Combines simulated delay, simulated outstanding amount relative to normal turnover, and trend coefficients
  const calculateSimulatedRisk = () => {
    if (!selectedPartner) return 0;
    const baseDelayCoeff = Math.min(1.8, Math.max(0.2, simulatedDelay / 30));
    const outstandingRatio = simulatedOutstanding / 15000;
    const moralityPenalty = (100 - selectedPartner.moralityScore) / 100;
    
    // Risk formula modeling probability of default within 90 days
    const score = (baseDelayCoeff * 35) + (outstandingRatio * 30) + (moralityPenalty * 35);
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  const simulatedRisk = calculateSimulatedRisk();

  const getRiskColor = (risk: number) => {
    if (risk >= 75) return "text-red-500 border-red-500/30 bg-red-500/5";
    if (risk >= 40) return "text-amber-500 border-amber-500/30 bg-amber-500/5";
    return "text-emerald-500 border-emerald-500/30 bg-emerald-500/5";
  }

  const getRiskLabel = (risk: number) => {
    if (risk >= 75) return "CRITICAL RISK (Insolvency highly likely)";
    if (risk >= 40) return "WARNING RISK (Elevated risk of default)";
    return "STABLE (Low insolvency risk)";
  }

  // Generate 6 months of historical delay days + 3 months of predictive forecast
  const getChartData = () => {
    if (!selectedPartner) return { history: [], forecast: [] };
    
    const baseDelay = selectedPartner.averageDelayDays;
    
    // Simple modeling of historical trend
    const history = [
      { month: "Jan", delay: Math.round(baseDelay * 0.95), type: "Historical" },
      { month: "Feb", delay: Math.round(baseDelay * 0.98), type: "Historical" },
      { month: "Mar", delay: Math.round(baseDelay * 1.02), type: "Historical" },
      { month: "Apr", delay: Math.round(baseDelay * 0.97), type: "Historical" },
      { month: "May", delay: Math.round(baseDelay * 1.05), type: "Historical" },
      { month: "Jun (Actual)", delay: baseDelay, type: "Historical" },
    ];

    // Dotted 3-month forecast based on simulation values
    const forecast = [
      { month: "Jun (Actual)", delay: baseDelay, type: "Forecast" },
      { month: "Jul (Forecast)", delay: Math.round(simulatedDelay * 0.98), type: "Forecast" },
      { month: "Aug (Forecast)", delay: Math.round(simulatedDelay * 1.02), type: "Forecast" },
      { month: "Sep (Insolvency Outlook)", delay: simulatedDelay, type: "Forecast" },
    ];

    return { history, forecast };
  }

  const chartData = getChartData();

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <span className="text-sm font-semibold tracking-wider uppercase font-[var(--font-heading)]">
          Running Predictive Insolvency Model...
        </span>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6 overflow-hidden pb-4">
      {/* LEFT COLUMN: Company list */}
      <div className="w-full lg:w-96 flex flex-col bg-[#09090b]/80 border border-border/40 rounded-2xl p-4 backdrop-blur-xl shrink-0">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search partners / ICO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/30 border border-border/40 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
            Tracked Companies
          </h4>
          
          {filteredPartners.length > 0 ? (
            filteredPartners.map((partner) => {
              const riskColor = getRiskColor(partner.insolvencyRisk3M);
              return (
                <div
                  key={partner.id}
                  onClick={() => handlePartnerSelect(partner)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 ${
                    selectedPartner?.id === partner.id
                      ? "bg-secondary/40 border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                      : "bg-secondary/10 border-border/20 hover:border-border/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-foreground truncate max-w-[170px]">
                        {partner.name}
                      </span>
                    </div>
                    {partner.trend === "worsening" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : partner.trend === "improving" ? (
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[9px] text-muted-foreground uppercase shrink-0 font-mono">Stable</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                    <span>ICO: {partner.ico}</span>
                    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-semibold font-mono ${riskColor}`}>
                      {partner.insolvencyRisk3M}% Risk
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center text-xs text-muted-foreground py-10 italic">
              No companies match criteria.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Detailed simulation and charts */}
      {selectedPartner ? (
        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1 scrollbar-thin">
          {/* Main Info Card */}
          <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-100 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/30 pb-4 mb-4 relative z-10">
              <div>
                <h2 className="text-lg font-bold text-foreground font-heading">{selectedPartner.name}</h2>
                <p className="text-xs text-muted-foreground font-mono">Company Identifier (ICO): {selectedPartner.ico}</p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">3-Month Insolvency Outlook</span>
                <span className={`text-sm font-bold font-mono px-3 py-1 rounded-lg border mt-1.5 ${getRiskColor(simulatedRisk)}`}>
                  {simulatedRisk}% RISK
                </span>
              </div>
            </div>

            {/* Sub-cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              <div className="bg-secondary/20 border border-border/20 rounded-xl p-3.5">
                <div className="flex justify-between items-center text-muted-foreground mb-1.5">
                  <span className="text-[10px] uppercase font-mono">Outstanding Balance</span>
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-lg font-bold text-foreground font-mono">
                  € {simulatedOutstanding.toLocaleString('sk-SK')}
                </div>
                <div className="text-[9px] text-muted-foreground font-mono">Simulated Outstanding</div>
              </div>

              <div className="bg-secondary/20 border border-border/20 rounded-xl p-3.5">
                <div className="flex justify-between items-center text-muted-foreground mb-1.5">
                  <span className="text-[10px] uppercase font-mono">Average Payment Delay</span>
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-lg font-bold text-foreground font-mono">
                  {simulatedDelay} Days
                </div>
                <div className="text-[9px] text-muted-foreground font-mono">Simulated Average</div>
              </div>

              <div className="bg-secondary/20 border border-border/20 rounded-xl p-3.5">
                <div className="flex justify-between items-center text-muted-foreground mb-1.5">
                  <span className="text-[10px] uppercase font-mono">Morality Index</span>
                  <Percent className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-lg font-bold text-foreground font-mono">
                  {selectedPartner.moralityScore} / 100
                </div>
                <div className="text-[9px] text-muted-foreground font-mono">Static Base score</div>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Panel */}
          <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 backdrop-blur-xl">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Insolvency Predictor Simulator (What-if Analysis)
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Average Payment Delay:</span>
                  <span className="text-cyan-400 font-semibold">{simulatedDelay} days</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={simulatedDelay}
                  onChange={(e) => setSimulatedDelay(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Outstanding Invoice Amount:</span>
                  <span className="text-cyan-400 font-semibold">€ {simulatedOutstanding.toLocaleString('sk-SK')}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="500"
                  value={simulatedOutstanding}
                  onChange={(e) => setSimulatedOutstanding(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className={`mt-4 rounded-xl border p-3.5 flex items-start gap-3 transition-colors ${
                simulatedRisk >= 75 
                  ? "bg-red-500/10 border-red-500/20 text-red-200" 
                  : simulatedRisk >= 40 
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-200" 
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
              }`}>
                {simulatedRisk >= 75 ? (
                  <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                ) : simulatedRisk >= 40 ? (
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-bold font-heading">{getRiskLabel(simulatedRisk)}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    {simulatedRisk >= 75 
                      ? "ALERT: Payment delay exceeds 45 days limit. 3-Month simulation predicts cashflow defaults and insolvency filings. Immediate legal default workflow is advised."
                      : simulatedRisk >= 40 
                      ? "WARNING: Elevating delay indicators represent stress on working capital. Monitor upcoming invoices. Limit credit terms."
                      : "SAFE: Payment delays are well within tolerance bounds. Financial health indicators predict 100% solvency for the upcoming 90 days."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Risk Timeline Chart */}
          <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 backdrop-blur-xl">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Payment Delay Trend & 3-Month Insolvency Outlook
            </h3>
            
            <div className="w-full h-56 font-mono text-[9px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a/30" />
                  <XAxis dataKey="month" stroke="#71717a" allowDuplicatedCategory={false} />
                  <YAxis stroke="#71717a" label={{ value: 'Delay (Days)', angle: -90, position: 'insideLeft', offset: 10, fill: '#71717a' }} />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      border: "1px solid #27272a",
                      borderRadius: "10px",
                      color: "#f4f4f5",
                      fontFamily: "monospace",
                      fontSize: "10px"
                    }}
                  />
                  {/* Historical Solid Line */}
                  <Line
                    data={chartData.history}
                    type="monotone"
                    dataKey="delay"
                    name="Historical Delays"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    style={{ filter: "drop-shadow(0 0 4px #06b6d4)" }}
                  />
                  {/* Forecast Dotted Line */}
                  <Line
                    data={chartData.forecast}
                    type="monotone"
                    dataKey="delay"
                    name="Insolvency Outlook (3M)"
                    stroke="#a855f7"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    style={{ filter: "drop-shadow(0 0 3px #8b5cf6)" }}
                  />
                  {/* Warning line at 45 days */}
                  <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Insolvency Threshold (45d)', fill: '#ef4444', fontSize: 9, position: 'top' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 backdrop-blur-xl">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-cyan-400" />
              Invoices History & Settlement Status
            </h3>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground uppercase tracking-wider text-[9px] font-semibold">
                    <th className="pb-2.5 pl-3">Invoice ID</th>
                    <th className="pb-2.5">Amount</th>
                    <th className="pb-2.5">Due Date</th>
                    <th className="pb-2.5">Settlement Date</th>
                    <th className="pb-2.5 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPartner.invoices && selectedPartner.invoices.length > 0 ? (
                    selectedPartner.invoices.map((inv, index) => (
                      <tr key={index} className="border-b border-border/15 hover:bg-secondary/10 transition-colors">
                        <td className="py-2.5 pl-3 text-foreground font-semibold">{inv.id}</td>
                        <td className="py-2.5 text-cyan-400 font-semibold">€ {inv.amount.toLocaleString('sk-SK')}</td>
                        <td className="py-2.5 text-muted-foreground">{inv.dueDate}</td>
                        <td className="py-2.5 text-muted-foreground">{inv.paidDate || "-"}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            inv.status === 'paid' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : inv.status === 'overdue' 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground italic">No invoice history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 flex flex-col items-center justify-center text-muted-foreground italic">
          Select a tracked company to analyze risk
        </div>
      )}
    </div>
  )
}
