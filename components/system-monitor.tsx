"use client"

import { useState, useEffect } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Cpu, HardDrive, Battery, RefreshCw, AlertTriangle } from "lucide-react"

interface ProcessItem {
  pid: string
  cpu: string
  mem: string
  name: string
}

interface SysInfoData {
  cpuPct: number
  ramPct: number
  ramUsedGB: string
  ramTotalGB: string
  disk: {
    totalGB: string
    usedGB: string
    freeGB: string
    pct: number
  }
  battery: {
    percent: number | null
    status: string
    isAcConnected: boolean
  }
  processes: ProcessItem[]
}

export function SystemMonitor() {
  const [data, setData] = useState<SysInfoData | null>(null)
  const [history, setHistory] = useState<Array<{ time: string; cpu: number; ram: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSysInfo = async () => {
    try {
      const res = await fetch("/api/sysinfo")
      const json = await res.json()
      if (json.success) {
        setData(json)
        
        // Add to history
        const now = new Date()
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
        
        setHistory((prev) => {
          const next = [...prev, { time: timeStr, cpu: json.cpuPct, ram: json.ramPct }]
          if (next.length > 25) {
            return next.slice(1) // Keep last 25 entries (approx 50 seconds)
          }
          return next
        })
        setError(null)
      } else {
        setError(json.error || "Failed to parse system metrics.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to contact system endpoint.")
    } finally {
      setLoading(false)
    }
  }

  const [pollInterval, setPollInterval] = useState<number>(2000)

  useEffect(() => {
    let batteryObj: any = null

    const handleBatteryUpdate = () => {
      if (batteryObj) {
        // Dynamic throttle: Slow down polling to 10s if battery is < 20% and discharging
        if (batteryObj.level < 0.20 && !batteryObj.charging) {
          setPollInterval(10000)
        } else {
          setPollInterval(2000)
        }
      }
    }

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // navigator.getBattery
      (navigator as any).getBattery().then((battery: any) => {
        batteryObj = battery
        handleBatteryUpdate()

        battery.addEventListener('levelchange', handleBatteryUpdate)
        battery.addEventListener('chargingchange', handleBatteryUpdate)
      }).catch((e: any) => console.log('Battery API not supported on this context', e))
    }

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', handleBatteryUpdate)
        batteryObj.removeEventListener('chargingchange', handleBatteryUpdate)
      }
    }
  }, [])

  useEffect(() => {
    fetchSysInfo()
    const interval = setInterval(fetchSysInfo, pollInterval)
    return () => clearInterval(interval)
  }, [pollInterval])

  if (loading && !data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <span className="text-sm font-semibold tracking-wider uppercase font-[var(--font-heading)]">
          Connecting to System Monitor...
        </span>
      </div>
    )
  }

  // Visual helper variables
  const cpuVal = data?.cpuPct || 0
  const ramVal = data?.ramPct || 0
  const diskVal = data?.disk?.pct || 0
  
  // CPU circumference for circular gauge (radius = 36, circumference = 2 * PI * 36 = 226.19)
  const strokeCircumference = 226.2
  const cpuOffset = strokeCircumference - (cpuVal / 100) * strokeCircumference
  const ramOffset = strokeCircumference - (ramVal / 100) * strokeCircumference

  return (
    <div className="w-full h-full space-y-6 overflow-y-auto pr-1 pb-4 scrollbar-thin">
      
      {/* ERROR HEADER ALERT */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/40 text-destructive rounded-xl px-4 py-2.5 text-xs flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span>API Connection Warning: {error}</span>
        </div>
      )}

      {/* ROW 1: CIRCULAR GAUGES & STATUS METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* CPU Circular Gauge */}
        <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 flex flex-col items-center justify-center backdrop-blur-xl shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">CPU Usage</h4>
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* SVG circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="36" className="stroke-secondary fill-none" strokeWidth="6" />
              <circle
                cx="56" cy="56" r="36"
                className="stroke-cyan-400 fill-none transition-all duration-500"
                strokeWidth="6"
                strokeDasharray={strokeCircumference}
                strokeDashoffset={cpuOffset}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 4px #22d3ee)" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground font-mono">{cpuVal}%</span>
              <span className="text-[9px] font-medium text-cyan-400/80 uppercase">Active</span>
            </div>
          </div>
        </div>

        {/* RAM Circular Gauge */}
        <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 flex flex-col items-center justify-center backdrop-blur-xl shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">RAM Usage</h4>
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="36" className="stroke-secondary fill-none" strokeWidth="6" />
              <circle
                cx="56" cy="56" r="36"
                className="stroke-violet-500 fill-none transition-all duration-500"
                strokeWidth="6"
                strokeDasharray={strokeCircumference}
                strokeDashoffset={ramOffset}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 4px #a855f7)" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground font-mono">{ramVal}%</span>
              <span className="text-[9px] text-muted-foreground font-mono">{data?.ramUsedGB}G / {data?.ramTotalGB}G</span>
            </div>
          </div>
        </div>

        {/* Disk Space Meter Card */}
        <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Storage Volume</h4>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-foreground font-mono">{diskVal}%</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {data?.disk?.usedGB} GB used of {data?.disk?.totalGB} GB
              </span>
            </div>
            {/* Custom linear gradient progress bar */}
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 rounded-full"
                style={{ width: `${diskVal}%` }}
              />
            </div>
          </div>
        </div>

        {/* Battery Monitor Card */}
        <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Power Status</h4>
            <Battery className={`w-4 h-4 ${data?.battery?.isAcConnected ? "text-emerald-400" : "text-amber-500"}`} />
          </div>
          <div className="mt-3 space-y-1">
            {data?.battery?.percent !== null ? (
              <>
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold text-foreground font-mono">
                    {data?.battery?.percent}%
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase font-mono">
                    {data?.battery?.isAcConnected ? "Charging" : data?.battery?.status}
                  </span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      data?.battery?.isAcConnected
                        ? "bg-emerald-400"
                        : (data?.battery?.percent || 0) < 20
                        ? "bg-red-500 animate-pulse"
                        : "bg-amber-400"
                    }`}
                    style={{ width: `${data?.battery?.percent}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="py-2 text-xs text-muted-foreground italic">
                Desktop / Wall AC Connected (No battery detected)
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ROW 2: GRAPHICAL TIMELINE OF PERFORMANCE */}
      <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 backdrop-blur-xl shadow-xl">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Real-time Engine Load (CPU & Memory Timeline)
        </h4>
        <div className="w-full h-56 font-mono text-[9px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a/30" />
              <XAxis dataKey="time" stroke="#71717a" />
              <YAxis domain={[0, 100]} stroke="#71717a" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "10px",
                  color: "#f4f4f5",
                  fontFamily: "monospace",
                  fontSize: "10px"
                }}
              />
              <Line
                type="monotone"
                dataKey="cpu"
                name="CPU Load %"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                style={{ filter: "drop-shadow(0 0 3px #06b6d4)" }}
              />
              <Line
                type="monotone"
                dataKey="ram"
                name="Memory Load %"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                style={{ filter: "drop-shadow(0 0 3px #8b5cf6)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROW 3: PROCESS LIST (PROCESS MANAGER) */}
      <div className="bg-[#09090b]/80 border border-border/40 rounded-2xl p-5 backdrop-blur-xl shadow-xl">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Top Engine Processes (High CPU Resource Consumers)
        </h4>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground uppercase tracking-wider text-[9px] font-semibold">
                <th className="pb-2.5 pl-3">Process Name</th>
                <th className="pb-2.5">PID</th>
                <th className="pb-2.5">CPU %</th>
                <th className="pb-2.5 pr-3">Memory %</th>
              </tr>
            </thead>
            <tbody>
              {data?.processes && data.processes.length > 0 ? (
                data.processes.map((proc, index) => (
                  <tr
                    key={index}
                    className="border-b border-border/15 hover:bg-secondary/20 transition-colors py-2"
                  >
                    <td className="py-2.5 pl-3 text-foreground font-medium max-w-[200px] truncate">{proc.name}</td>
                    <td className="py-2.5 text-muted-foreground">{proc.pid}</td>
                    <td className="py-2.5 text-cyan-400 font-semibold">{proc.cpu}%</td>
                    <td className="py-2.5 text-violet-400">{proc.mem}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground italic">
                    No active high CPU processes listed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
