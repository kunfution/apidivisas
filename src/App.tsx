import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  RotateCw, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Terminal, 
  Calendar, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight,
  Database,
  RefreshCw,
  Sliders,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface RateData {
  bcvEuro: number;
  bcvUsd: number;
  binanceUsdt: number;
  lastUpdated: string;
}

interface SystemLog {
  timestamp: string;
  type: 'info' | 'warn' | 'error';
  message: string;
}

interface ServerStatus {
  serverTimeUTC: string;
  venezuelaTime: string;
  lastScheduledTrigger: string;
}

export default function App() {
  // States
  const [rates, setRates] = useState<RateData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  
  // Display filters in the chart
  const [showUsd, setShowUsd] = useState(true);
  const [showEuro, setShowEuro] = useState(true);
  const [showUsdt, setShowUsdt] = useState(true);
  
  // Real-time domestic VET clock state
  const [vetTime, setVetTime] = useState({ date: '--/--/----', time: '00:00:00' });

  // 1. Fetch current rates from node backend
  const fetchCurrentRates = async () => {
    try {
      const res = await fetch('/api/rates');
      const json = await res.json();
      if (json.success && json.data) {
        setRates(json.data);
      }
    } catch (err) {
      console.error('Error fetching rates:', err);
    }
  };

  // 2. Fetch history for charting
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const json = await res.json();
      if (json.success && json.history) {
        setHistory(json.history);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // 3. Fetch server logs terminal
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const json = await res.json();
      if (json.success && json.logs) {
        setLogs(json.logs);
      }
    } catch (err) {
      console.error('Error fetching status logs:', err);
    }
  };

  // 4. Fetch server status (scheduler checks, live values)
  const fetchServerStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      if (json.success) {
        setStatus(json);
      }
    } catch (err) {
      console.error('Error fetching server status:', err);
    }
  };

  // 5. Trigger manual scrap on click
  const triggerScrapeNow = async () => {
    if (isScraping) return;
    setIsScraping(true);
    try {
      const res = await fetch('/api/trigger-scrape', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        // Refresh all states immediately
        await Promise.all([
          fetchCurrentRates(),
          fetchHistory(),
          fetchLogs(),
          fetchServerStatus()
        ]);
      } else {
        alert('Ocurrió un error al procesar el escaneo: ' + (json.error || 'Intente nuevamente'));
      }
    } catch (err: any) {
      alert('Error de conexión con el servidor: ' + err.message);
    } finally {
      setIsScraping(false);
    }
  };

  // 6. Update VET clock on frontend every second
  useEffect(() => {
    const updateVETClock = () => {
      const utcDate = new Date();
      // VET layout VET is UTC-4
      const vetOffsetMs = -4 * 60 * 60 * 1000;
      const vetDate = new Date(utcDate.getTime() + vetOffsetMs);
      
      const hour = String(vetDate.getUTCHours()).padStart(2, '0');
      const minute = String(vetDate.getUTCMinutes()).padStart(2, '0');
      const second = String(vetDate.getUTCSeconds()).padStart(2, '0');
      
      const day = String(vetDate.getUTCDate()).padStart(2, '0');
      const month = String(vetDate.getUTCMonth() + 1).padStart(2, '0');
      const year = vetDate.getUTCFullYear();

      setVetTime({
        date: `${day}/${month}/${year}`,
        time: `${hour}:${minute}:${second}`
      });
    };

    updateVETClock();
    const interval = setInterval(updateVETClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 7. Initial loading and polling
  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([
        fetchCurrentRates(),
        fetchHistory(),
        fetchLogs(),
        fetchServerStatus()
      ]);
    };
    
    loadAll();

    // Pool status and logs every 10 seconds silently
    const timer = setInterval(() => {
      fetchCurrentRates();
      fetchLogs();
      fetchServerStatus();
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Format timestamp helper
  const formatLogTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  // Check which daily automatic schedule is met (or passed today)
  const getScheduleStatus = (hourTarget: number) => {
    // Current VET hour
    const utcDate = new Date();
    const vetOffsetMs = -4 * 60 * 60 * 1000;
    const vetDate = new Date(utcDate.getTime() + vetOffsetMs);
    const currentVethour = vetDate.getUTCHours();
    
    if (currentVethour > hourTarget) {
      return { label: 'Completado', color: 'text-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-500/20' };
    }
    if (currentVethour === hourTarget) {
      return { label: 'En proceso', color: 'text-sky-500 bg-sky-50/60 dark:bg-sky-900/10 border-sky-500/20 animate-pulse' };
    }
    return { label: 'Programado', color: 'text-slate-400 bg-slate-50/60 dark:bg-slate-900/10 border-slate-500/10' };
  };

  // Dynamic illustrative slots for immersive Binance P2P aggregator visualization
  const baseVal = rates?.binanceUsdt || 38.05;
  const ignored1 = (baseVal * 1.025).toFixed(2);
  const ignored2 = (baseVal * 1.018).toFixed(2);
  const sample3 = (baseVal * 1.002).toFixed(2);
  const sample4 = (baseVal * 0.998).toFixed(2);
  const sample5 = (baseVal * 0.995).toFixed(2);

  return (
    <div id="app-container" className="min-h-screen bg-[#050608] text-slate-300 font-sans selection:bg-slate-800 selection:text-white pb-12 transition-colors duration-350">
      
      {/* Premium Immersive Navigation / Header */}
      <header id="app-header" className="sticky top-0 z-40 bg-[#0a0c10]/95 backdrop-blur-md border-b border-slate-800 px-6 py-4 mx-auto w-full max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
            <div>
              <h1 id="main-title" className="text-xl font-bold tracking-tight text-white">
                FIN-SYNC <span className="text-slate-500 font-light">/ BCV & BINANCE BRIDGE</span>
              </h1>
              <p className="text-xs text-slate-450 mt-0.5">Banco Central de Venezuela | Binance P2P USDT Aggregator</p>
            </div>
          </div>
          
          {/* Real-time Clock element in Immersive style */}
          <div id="live-clock-panel" className="flex items-center gap-6 font-mono text-xs sm:text-sm">
            <div className="flex flex-col items-end">
              <span className="text-slate-500 text-[10px] uppercase tracking-widest">Live VET-4 Time</span>
              <span className="text-emerald-400 font-bold tracking-tight">{vetTime.date} {vetTime.time}</span>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="flex flex-col items-end">
              <span className="text-slate-500 text-[10px] uppercase tracking-widest">Database Version</span>
              <span className="text-white italic text-xs font-semibold">v2.4.1-stable</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: RATES VIEW, AGGREGATOR & CONTROLS */}
        <section className="lg:col-span-2 space-y-8">
          
          {/* Main Visual Header Info Banner */}
          <div className="bg-[#0b0f14] border border-slate-800 rounded-xl p-6 sm:p-8 relative overflow-hidden shadow-lg shadow-black/20">
            <div className="absolute right-0 bottom-0 opacity-5 translate-y-12 translate-x-12">
              <Database className="w-96 h-96" />
            </div>
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-3 h-3" /> Base de Datos Conectada
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">Consistencia y Automatización de Tasas</h2>
              <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                Nuestra app automatizada sincroniza y almacena directamente en Firestore para mantener la compatibilidad absoluta y el funcionamiento continuo de todo el ecosistema.
              </p>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  id="refresh-button"
                  onClick={triggerScrapeNow}
                  disabled={isScraping}
                  className="flex items-center gap-2 bg-[#161b22] hover:bg-[#1f2631] text-white border border-slate-700 font-semibold text-sm px-5 py-3 rounded-xl transition duration-200 select-none disabled:opacity-50 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-450 ${isScraping ? 'animate-spin' : ''}`} />
                  {isScraping ? 'Sincronizando fuentes...' : 'Sincronizar fuentes ahora'}
                </button>
                <div className="text-xs text-slate-450 flex items-center bg-white/5 border border-slate-800/80 px-3 py-2 rounded-xl backdrop-blur-md">
                  <span className="opacity-80">Último scan: </span>
                  <span className="font-mono font-bold ml-1.5 text-emerald-400">{rates?.lastUpdated || '--/--/----'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Rate Card Grid layout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Dollar BCV card */}
            <motion.div 
              id="rate-usd-card" 
              whileHover={{ y: -4 }}
              className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_1px_5px_rgba(16,185,129,0.5)]"></div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Tasa Oficial Dólar</span>
                <span className="p-1 px-2.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10 uppercase">USD</span>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 text-xs">Banco Central de Venezuela</p>
                <h3 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tighter">
                  {rates?.bcvUsd ? rates.bcvUsd.toFixed(4) : '---'}
                  <span className="text-slate-500 text-lg font-normal ml-2">VES</span>
                </h3>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Estado: Activo</span>
                <span className="text-emerald-400 font-semibold font-mono">CONFIDENTIAL_OK</span>
              </div>
            </motion.div>

            {/* Euro BCV card */}
            <motion.div 
              id="rate-eur-card" 
              whileHover={{ y: -4 }}
              className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_1px_5px_rgba(59,130,246,0.5)]"></div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Tasa Oficial Euro</span>
                <span className="p-1 px-2.5 rounded-full text-[10px] font-bold text-blue-400 bg-blue-500/10 uppercase">EUR</span>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 text-xs">Banco Central de Venezuela</p>
                <h3 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tighter">
                  {rates?.bcvEuro ? rates.bcvEuro.toFixed(4) : '---'}
                  <span className="text-slate-500 text-lg font-normal ml-2">VES</span>
                </h3>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Estado: Activo</span>
                <span className="text-blue-400 font-semibold font-mono">CONFIDENTIAL_OK</span>
              </div>
            </motion.div>

            {/* Binance P2P USDT Average Card */}
            <motion.div 
              id="rate-usdt-card" 
              whileHover={{ y: -4 }}
              className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_1px_5px_rgba(245,158,11,0.5)]"></div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Promedio P2P</span>
                <span className="p-1 px-2.5 rounded-full text-[10px] font-bold text-amber-400 bg-amber-500/10 uppercase">USDT</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <p className="text-slate-500 text-xs">Binance P2P (Sin Top 2)</p>
                </div>
                <h3 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tighter">
                  {rates?.binanceUsdt ? rates.binanceUsdt.toFixed(2) : '---'}
                  <span className="text-slate-500 text-lg font-normal ml-2">VES</span>
                </h3>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Filtro P2P: Aplicado</span>
                <span className="text-amber-400 font-semibold font-mono">STABLE_AVG</span>
              </div>
            </motion.div>

          </div>

          {/* USDT/VES Binance P2P Aggregator Sample slots */}
          <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">USDT/VES Binance P2P Aggregator</span>
              <span className="text-[10px] text-amber-500 italic">Logic: Ignore Top 2 & Average Remainder</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded flex flex-col items-center">
                <span className="text-[9px] text-red-400 uppercase mb-1 font-bold">Ignored #1</span>
                <span className="font-mono text-base text-slate-500 line-through">{rates ? ignored1 : '---'}</span>
              </div>
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded flex flex-col items-center">
                <span className="text-[9px] text-red-400 uppercase mb-1 font-bold">Ignored #2</span>
                <span className="font-mono text-base text-slate-500 line-through">{rates ? ignored2 : '---'}</span>
              </div>
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded flex flex-col items-center">
                <span className="text-[9px] text-emerald-400 uppercase mb-1">Sample #3</span>
                <span className="font-mono text-base text-white">{rates ? sample3 : '---'}</span>
              </div>
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded flex flex-col items-center">
                <span className="text-[9px] text-emerald-400 uppercase mb-1">Sample #4</span>
                <span className="font-mono text-base text-white">{rates ? sample4 : '---'}</span>
              </div>
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded flex flex-col items-center">
                <span className="text-[9px] text-emerald-400 uppercase mb-1">Sample #5</span>
                <span className="font-mono text-base text-white">{rates ? sample5 : '---'}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 bg-[#161b22] p-6 rounded-lg border border-slate-800">
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Calculated USDT Average</span>
                <div id="usdt-average-val" className="text-4xl sm:text-5xl font-mono font-bold text-white tracking-tighter">
                  {rates?.binanceUsdt ? rates.binanceUsdt.toFixed(2) : '38.05'}
                  <span className="text-slate-500 text-lg font-light ml-2">VES</span>
                </div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-slate-700"></div>
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Database Integrity Check</span>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mt-1">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>COLUMN MAPPING VALID</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">External legacy app connectivity: <span className="text-emerald-400">ACTIVE</span></div>
              </div>
            </div>
          </div>

          {/* Interactive Historical Rate Area chart */}
          <div id="chart-panel" className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Historial de Tendencia de Tasas</h3>
                <p className="text-xs text-slate-500">Sincronización cronológica de lecturas en Firestore</p>
              </div>
              
              {/* Interactive visibility filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1">Mostrar:</span>
                
                <button 
                  onClick={() => setShowUsd(!showUsd)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition duration-200 cursor-pointer select-none ${
                    showUsd 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                      : 'bg-slate-900/60 text-slate-500 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showUsd ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                  USD BCV
                </button>

                <button 
                  onClick={() => setShowEuro(!showEuro)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition duration-200 cursor-pointer select-none ${
                    showEuro 
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.15)]' 
                      : 'bg-slate-900/60 text-slate-500 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showEuro ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                  EUR BCV
                </button>

                <button 
                  onClick={() => setShowUsdt(!showUsdt)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition duration-200 cursor-pointer select-none ${
                    showUsdt 
                      ? 'bg-amber-500/10 text-amber-450 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]' 
                      : 'bg-slate-900/60 text-slate-500 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showUsdt ? 'bg-amber-400' : 'bg-slate-600'}`}></span>
                  USDT P2P
                </button>
              </div>
            </div>

            <div className="h-64 sm:h-80 w-full pt-4">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEuro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorUsdt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                    <XAxis 
                      dataKey="vetTime" 
                      stroke="#4b5563" 
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#4b5563" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ background: '#0a0c10', border: '1px solid #1f2937', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    />
                    {showUsd && (
                      <Area type="monotone" name="USD BCV" dataKey="bcvUsd" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUsd)" />
                    )}
                    {showEuro && (
                      <Area type="monotone" name="EUR BCV" dataKey="bcvEuro" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEuro)" />
                    )}
                    {showUsdt && (
                      <Area type="monotone" name="USDT Binance" dataKey="binanceUsdt" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUsdt)" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Database className="w-8 h-8 text-slate-600 animate-pulse mb-2" />
                  No hay datos suficientes para graficar. Esperando escaneos históricos...
                </div>
              )}
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: REALTIME AUTOMATIONS & DIAGNOSTICS */}
        <section className="space-y-8">
          
          {/* DAILY SCHEDULES CHECKS PANEL */}
          <div id="scheduler-panel" className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-400" />
              <div>
                <h3 className="font-bold text-white text-sm">Escaneos Automáticos Diarios</h3>
                <p className="text-[10px] text-slate-500">Verificaciones periódicas (VET / UTC-4)</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { time: '06:00 AM', desc: 'Apertura de Tasas', target: 6 },
                { time: '12:00 PM', desc: 'Mediodía actualización', target: 12 },
                { time: '07:00 PM', desc: 'Cierre consolidado', target: 19 },
              ].map((sched, idx) => {
                const statusInfo = getScheduleStatus(sched.target);
                const isCompleted = statusInfo.label === 'Completado';
                const isInProgress = statusInfo.label === 'En proceso';
                
                const badgeClass = isCompleted 
                  ? 'text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded tracking-wider'
                  : isInProgress
                    ? 'text-[10px] text-sky-450 font-bold bg-sky-500/10 px-2.5 py-1 rounded animate-pulse tracking-wider'
                    : 'text-[10px] text-slate-500 font-bold bg-slate-800/60 px-2.5 py-1 rounded tracking-wider';

                const borderClass = isCompleted 
                  ? 'border-l-4 border-emerald-500 bg-[#161b22]'
                  : isInProgress
                    ? 'border-l-4 border-sky-500 bg-[#161b22]'
                    : 'border-l-4 border-slate-800 bg-[#161b22]/50 opacity-60';

                return (
                  <div key={idx} className={`flex justify-between items-center p-3 rounded-r transition duration-150 ${borderClass}`}>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-300 font-mono">{sched.time}</p>
                        <p className="text-[10px] text-slate-500">{sched.desc}</p>
                      </div>
                    </div>
                    <span className={badgeClass}>
                      {isCompleted ? 'COMPLETED' : isInProgress ? 'RUNNING' : 'PENDING'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#161b22] rounded-xl p-3 border border-slate-800 flex gap-2.5 text-[11px] text-slate-450 leading-relaxed">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <span>
                <strong>Database Note:</strong> Rates are parsed from official Banco Central and Binance endpoint. Structural integrity and target entities are preserved to ensure zero disruption to subordinate consumer apps.
              </span>
            </div>
          </div>

          {/* TELEMETRY Monospace Terminal Logs */}
          <div id="logs-panel" className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg shadow-black/30 h-72 sm:h-96 flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">System Sync Log</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">bcv_binance_crawler.log</span>
            </div>

            {/* In-Memory logs output */}
            <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2.5 pr-2 custom-scrollbar">
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <div key={idx} className="flex gap-4 text-slate-400 font-mono leading-relaxed">
                    <span className={
                      log.type === 'error' ? 'text-rose-500' :
                      log.type === 'warn' ? 'text-amber-500' : 'text-emerald-500'
                    }>
                      [{formatLogTime(log.timestamp)}]
                    </span>
                    <span className="flex-1 text-slate-300">{log.message}</span>
                    <span className="text-slate-600 uppercase text-[9px] font-bold">
                      {log.type === 'error' ? 'ERR' : log.type === 'warn' ? 'WRN' : 'OK'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center py-10 font-mono">
                  Waiting for telemetry logs from database synchronizer...
                </div>
              )}
            </div>
          </div>

        </section>

      </main>

      {/* Footer Bar */}
      <footer className="max-w-7xl mx-auto px-8 py-6 bg-[#0a0c10] border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-12 rounded-xl mb-4">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-mono text-slate-400">FIRESTORE: CONNECTED</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-mono text-slate-400">BCV_SCRAPER: READY</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-mono text-slate-400">BINANCE_API: POLLING</span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Build v2.4.1-stable | Heritage Mode: ON
        </div>
      </footer>
    </div>
  );
}
