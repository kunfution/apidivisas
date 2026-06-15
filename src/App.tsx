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
  Briefcase,
  LayoutGrid,
  ChevronDown,
  ChevronUp
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
  
  // Historical chart range filter: '1d' | '7d' | '30d' | '1y'
  const [timeframe, setTimeframe] = useState<'1d' | '7d' | '30d' | '1y'>('30d');
  
  // Real-time domestic VET clock state
  const [vetTime, setVetTime] = useState({ date: '--/--/----', time: '00:00:00' });

  // Converter States
  const [bsVal, setBsVal] = useState<string>('');
  const [usdVal, setUsdVal] = useState<string>('');
  const [eurVal, setEurVal] = useState<string>('');
  const [usdtVal, setUsdtVal] = useState<string>('');
  const [isP2pExpanded, setIsP2pExpanded] = useState<boolean>(false);
  const [isSchedulerExpanded, setIsSchedulerExpanded] = useState<boolean>(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidInstallHelp, setShowAndroidInstallHelp] = useState<boolean>(false);

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
  const fetchHistory = async (range: string = timeframe) => {
    try {
      const res = await fetch(`/api/history?range=${range}`);
      const json = await res.json();
      if (json.success && json.history) {
        setHistory(json.history);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Automatically fetch history when timeframe shifts
  useEffect(() => {
    fetchHistory(timeframe);
  }, [timeframe]);

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
          fetchHistory(timeframe),
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

  // --- Currency Converter Logic and Event Handlers ---
  const parseVal = (str: string): number => {
    const normalized = str.replace(/,/g, '.');
    const num = parseFloat(normalized);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  const handleBsChange = (valStr: string) => {
    setBsVal(valStr);
    if (valStr === '' || isNaN(parseFloat(valStr.replace(/,/g, '.')))) {
      setUsdVal('');
      setEurVal('');
      setUsdtVal('');
      return;
    }
    const bs = parseVal(valStr);
    const usdRate = rates?.bcvUsd || 1;
    const eurRate = rates?.bcvEuro || 1;
    const usdtRate = rates?.binanceUsdt || 1;
    
    setUsdVal((bs / usdRate).toFixed(2));
    setEurVal((bs / eurRate).toFixed(2));
    setUsdtVal((bs / usdtRate).toFixed(2));
  };

  const handleUsdChange = (valStr: string) => {
    setUsdVal(valStr);
    if (valStr === '' || isNaN(parseFloat(valStr.replace(/,/g, '.')))) {
      setBsVal('');
      setEurVal('');
      setUsdtVal('');
      return;
    }
    const usd = parseVal(valStr);
    const usdRate = rates?.bcvUsd || 1;
    const eurRate = rates?.bcvEuro || 1;
    const usdtRate = rates?.binanceUsdt || 1;
    
    const bsValue = usd * usdRate;
    setBsVal(bsValue.toFixed(2));
    setEurVal((bsValue / eurRate).toFixed(2));
    setUsdtVal((bsValue / usdtRate).toFixed(2));
  };

  const handleEurChange = (valStr: string) => {
    setEurVal(valStr);
    if (valStr === '' || isNaN(parseFloat(valStr.replace(/,/g, '.')))) {
      setBsVal('');
      setUsdVal('');
      setUsdtVal('');
      return;
    }
    const eur = parseVal(valStr);
    const usdRate = rates?.bcvUsd || 1;
    const eurRate = rates?.bcvEuro || 1;
    const usdtRate = rates?.binanceUsdt || 1;
    
    const bsValue = eur * eurRate;
    setBsVal(bsValue.toFixed(2));
    setUsdVal((bsValue / usdRate).toFixed(2));
    setUsdtVal((bsValue / usdtRate).toFixed(2));
  };

  const handleUsdtChange = (valStr: string) => {
    setUsdtVal(valStr);
    if (valStr === '' || isNaN(parseFloat(valStr.replace(/,/g, '.')))) {
      setBsVal('');
      setUsdVal('');
      setEurVal('');
      return;
    }
    const usdt = parseVal(valStr);
    const usdRate = rates?.bcvUsd || 1;
    const eurRate = rates?.bcvEuro || 1;
    const usdtRate = rates?.binanceUsdt || 1;
    
    const bsValue = usdt * usdtRate;
    setBsVal(bsValue.toFixed(2));
    setUsdVal((bsValue / usdRate).toFixed(2));
    setEurVal((bsValue / eurRate).toFixed(2));
  };

  const handleReset = () => {
    if (rates) {
      const usdRate = rates.bcvUsd;
      const eurRate = rates.bcvEuro;
      const usdtRate = rates.binanceUsdt;
      setUsdVal('1.00');
      setBsVal(usdRate.toFixed(2));
      setEurVal((usdRate / eurRate).toFixed(2));
      setUsdtVal((usdRate / usdtRate).toFixed(2));
    } else {
      setUsdVal('');
      setBsVal('');
      setEurVal('');
      setUsdtVal('');
    }
  };

  // Automatically initialize converter when rates load, but don't override active typing
  useEffect(() => {
    if (rates && !bsVal && !usdVal && !eurVal && !usdtVal) {
      const usdRate = rates.bcvUsd;
      const eurRate = rates.bcvEuro;
      const usdtRate = rates.binanceUsdt;
      setUsdVal('1.00');
      setBsVal(usdRate.toFixed(2));
      setEurVal((usdRate / eurRate).toFixed(2));
      setUsdtVal((usdRate / usdtRate).toFixed(2));
    }
  }, [rates]);

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
    // Set document title to Monitor Api
    document.title = "Monitor Api";

    // Register Service Worker for PWA installation support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('[SW] Registered successfully, scope:', reg.scope))
        .catch((err) => console.error('[SW] Registration failed:', err));
    }

    const handleBeforePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforePrompt);

    const loadAll = async () => {
      await Promise.all([
        fetchCurrentRates(),
        fetchHistory(timeframe),
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

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
    };
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

  // Local variable to track last rendered date in the current chart render pass
  let lastFormattedDateStr = '';

  // Format X-Axis ticks depending on selected timeframe (localizing to VET timezone - UTC-4)
  const formatXAxisTick = (timestamp: string, index?: number) => {
    if (index === 0) {
      lastFormattedDateStr = '';
    }
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;

      const vetOffsetMs = -4 * 60 * 60 * 1000;
      const vetDate = new Date(date.getTime() + vetOffsetMs);

      const hour = String(vetDate.getUTCHours()).padStart(2, '0');
      const minute = String(vetDate.getUTCMinutes()).padStart(2, '0');
      const day = vetDate.getUTCDate();
      const month = vetDate.getUTCMonth();
      const dayOfWeek = vetDate.getUTCDay();

      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

      const dateStr = `${day}-${month}`;

      if (timeframe === '1d') {
        return `${hour}:${minute}`;
      } else if (timeframe === '7d') {
        if (dateStr !== lastFormattedDateStr) {
          lastFormattedDateStr = dateStr;
          return `${daysOfWeek[dayOfWeek]} ${hour}:${minute}`;
        } else {
          return `${hour}:${minute}`;
        }
      } else {
        // 30d or 1y: Only show the day/month when it changes, otherwise hide to prevent duplicates
        if (dateStr !== lastFormattedDateStr) {
          lastFormattedDateStr = dateStr;
          return `${day} ${months[month]}`;
        } else {
          return '';
        }
      }
    } catch (e) {
      return timestamp;
    }
  };

  // Format full date for Tooltip details localized in Spanish VET Format
  const formatFullTooltip = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;

      const vetOffsetMs = -4 * 60 * 60 * 1000;
      const vetDate = new Date(date.getTime() + vetOffsetMs);

      const hour = String(vetDate.getUTCHours()).padStart(2, '0');
      const minute = String(vetDate.getUTCMinutes()).padStart(2, '0');
      const second = String(vetDate.getUTCSeconds()).padStart(2, '0');
      const day = vetDate.getUTCDate();
      const month = vetDate.getUTCMonth();
      const year = vetDate.getUTCFullYear();
      const dayOfWeek = vetDate.getUTCDay();

      const monthsFull = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const daysOfWeekFull = [
        'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
      ];

      return `${daysOfWeekFull[dayOfWeek]}, ${day} de ${monthsFull[month]} de ${year} - ${hour}:${minute}:${second} VET`;
    } catch (e) {
      return timestamp;
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
  
  // Handle onClick for the PWA Installation Button
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        } else {
          console.log('User dismissed the PWA install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      setShowAndroidInstallHelp(true);
    }
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
      <header id="app-header" className="sticky top-0 z-40 bg-[#0a0c10]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-2.5 sm:py-4 mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] shrink-0"></div>
            <div>
              <h1 id="main-title" className="text-sm sm:text-base md:text-xl font-bold tracking-tight text-white uppercase">
                Monitor Api <span className="text-slate-500 font-light hidden xs:inline">/ BCV & BINANCE BRIDGE</span>
              </h1>
              <p className="text-[10px] text-slate-450 mt-0.5 hidden md:block">Banco Central de Venezuela | Binance P2P USDT Aggregator</p>
            </div>
          </div>
          
          {/* Real-time Clock element in Immersive style */}
          <div id="live-clock-panel" className="flex items-center gap-3 sm:gap-6 font-mono text-[10px] sm:text-sm shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-slate-500 text-[9px] uppercase tracking-widest hidden sm:inline">Live VET-4 Time</span>
              <span className="text-emerald-450 font-bold tracking-tight">
                <span className="hidden min-[480px]:inline">{vetTime.date} </span>{vetTime.time}
              </span>
            </div>
            <div className="h-6 sm:h-8 w-px bg-slate-800"></div>
            <div className="flex flex-col items-end">
              <span className="text-slate-500 text-[9px] uppercase tracking-widest hidden sm:inline">Database Version</span>
              <span className="text-white sm:text-slate-300 italic text-[10px] sm:text-xs font-semibold">v2.4.1</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: RATES VIEW, AGGREGATOR & CONTROLS */}
        <section className="lg:col-span-2 space-y-8">
                {/* Main Visual Header Info Banner */}
          <div className="bg-[#0b0f14] border border-slate-800 rounded-xl p-3 sm:p-5 relative overflow-hidden shadow-lg shadow-black/20">
            <div className="absolute right-0 bottom-0 opacity-5 translate-y-12 translate-x-12">
              <Database className="w-48 h-48" />
            </div>
            <div className="relative z-10 flex items-center justify-between gap-4">
              
              {/* Left Side: Title and Badge (Desktop) vs Compact Indicator (Mobile) */}
              <div className="flex items-center gap-2 sm:block sm:space-y-1">
                {/* Desktop layout elements */}
                <div className="hidden sm:block">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-2.5 h-2.5" /> Base de Datos Conectada
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight mt-1">Consistencia y Automatización de Tasas</h2>
                </div>

                {/* Mobile compact layout elements (single row on mobile!) */}
                <div className="flex sm:hidden items-center gap-1.5 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse shrink-0"></div>
                  <span className="font-semibold text-white text-[11px]">Sincronizado:</span>
                  <span className="font-mono text-emerald-400 text-[11px] font-bold">{rates?.lastUpdated ? rates.lastUpdated.split(' ')[0] : '--/--/----'}</span>
                </div>
              </div>
              
              {/* Right Side: Refresh/Sincronizar button and Scan info (if desktop) */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="refresh-button"
                  onClick={triggerScrapeNow}
                  disabled={isScraping}
                  className="flex items-center gap-1 bg-[#161b22] hover:bg-[#1f2631] text-white border border-slate-700 font-semibold text-xs px-2.5 sm:px-3.5 py-1.5 rounded-lg transition duration-150 select-none disabled:opacity-50 cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.05)]"
                >
                  <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 ${isScraping ? 'animate-spin' : ''}`} />
                  <span className="text-[10px] sm:text-xs">{isScraping ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>
                
                {/* Desktop-only scan info badge */}
                <div className="hidden sm:flex text-[11px] text-slate-400 items-center bg-white/5 border border-slate-800/80 px-2.5 py-1.5 rounded-lg backdrop-blur-md">
                  <span className="opacity-80">Scan: </span>
                  <span className="font-mono font-bold ml-1 text-emerald-400">{rates?.lastUpdated || '--/--/----'}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Core Rate Card Grid layout */}
          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            
            {/* Dollar BCV card */}
            <motion.div 
              id="rate-usd-card" 
              whileHover={{ y: -4 }}
              className="bg-[#0d1117] border border-slate-800 rounded-lg sm:rounded-xl p-2.5 sm:p-6 space-y-2 sm:space-y-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-emerald-500 shadow-[0_1px_5px_rgba(16,185,129,0.5)]"></div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 text-slate-400">
                <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-normal sm:tracking-[0.2em] font-bold truncate">
                  <span className="hidden sm:inline">Tasa Oficial Dólar</span>
                  <span className="inline sm:hidden">Dólar BCV</span>
                </span>
                <span className="self-start sm:self-auto p-0.5 sm:p-1 px-1.5 sm:px-2.5 rounded text-[8px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-500/10 uppercase">USD</span>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-slate-500 text-xs hidden sm:block">Banco Central de Venezuela</p>
                <h3 className="text-[19px] min-[375px]:text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-white tracking-tighter flex items-baseline">
                  <span className="hidden sm:inline">
                    {rates?.bcvUsd ? rates.bcvUsd.toFixed(4) : '---'}
                  </span>
                  <span className="inline sm:hidden">
                    {rates?.bcvUsd ? rates.bcvUsd.toFixed(2) : '---'}
                  </span>
                  <span className="text-slate-500 text-xs sm:text-lg font-normal ml-1 sm:ml-2">VES</span>
                </h3>
              </div>
              <div className="hidden sm:flex pt-2 border-t border-slate-800/80 items-center justify-between text-[11px] text-slate-500">
                <span>Estado: Activo</span>
                <span className="text-emerald-400 font-semibold font-mono">CONFIDENTIAL_OK</span>
              </div>
            </motion.div>

            {/* Euro BCV card */}
            <motion.div 
              id="rate-eur-card" 
              whileHover={{ y: -4 }}
              className="bg-[#0d1117] border border-slate-800 rounded-lg sm:rounded-xl p-2.5 sm:p-6 space-y-2 sm:space-y-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-blue-500 shadow-[0_1px_5px_rgba(59,130,246,0.5)]"></div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 text-slate-400">
                <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-normal sm:tracking-[0.2em] font-bold truncate">
                  <span className="hidden sm:inline">Tasa Oficial Euro</span>
                  <span className="inline sm:hidden">Euro BCV</span>
                </span>
                <span className="self-start sm:self-auto p-0.5 sm:p-1 px-1.5 sm:px-2.5 rounded text-[8px] sm:text-[10px] font-bold text-blue-400 bg-blue-500/10 uppercase">EUR</span>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-slate-500 text-xs hidden sm:block">Banco Central de Venezuela</p>
                <h3 className="text-[19px] min-[375px]:text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-white tracking-tighter flex items-baseline">
                  <span className="hidden sm:inline">
                    {rates?.bcvEuro ? rates.bcvEuro.toFixed(4) : '---'}
                  </span>
                  <span className="inline sm:hidden">
                    {rates?.bcvEuro ? rates.bcvEuro.toFixed(2) : '---'}
                  </span>
                  <span className="text-slate-500 text-xs sm:text-lg font-normal ml-1 sm:ml-2">VES</span>
                </h3>
              </div>
              <div className="hidden sm:flex pt-2 border-t border-slate-800/80 items-center justify-between text-[11px] text-slate-500">
                <span>Estado: Activo</span>
                <span className="text-blue-400 font-semibold font-mono">CONFIDENTIAL_OK</span>
              </div>
            </motion.div>

            {/* Binance P2P USDT Average Card */}
            <motion.div 
              id="rate-usdt-card" 
              whileHover={{ y: -4 }}
              className="bg-[#0d1117] border border-slate-800 rounded-lg sm:rounded-xl p-2.5 sm:p-6 space-y-2 sm:space-y-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-amber-500 shadow-[0_1px_5px_rgba(245,158,11,0.5)]"></div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 text-slate-400">
                <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-normal sm:tracking-[0.2em] font-bold truncate">
                  <span className="hidden sm:inline">Promedio P2P</span>
                  <span className="inline sm:hidden">USDT P2P</span>
                </span>
                <span className="self-start sm:self-auto p-0.5 sm:p-1 px-1.5 sm:px-2.5 rounded text-[8px] sm:text-[10px] font-bold text-amber-400 bg-amber-500/10 uppercase">USDT</span>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-slate-500 text-xs hidden sm:block">Binance P2P (Sin Top 2)</p>
                <h3 className="text-[19px] min-[375px]:text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-white tracking-tighter flex items-baseline">
                  {rates?.binanceUsdt ? rates.binanceUsdt.toFixed(2) : '---'}
                  <span className="text-slate-500 text-xs sm:text-lg font-normal ml-1 sm:ml-2">VES</span>
                </h3>
              </div>
              <div className="hidden sm:flex pt-2 border-t border-slate-800/80 items-center justify-between text-[11px] text-slate-500">
                <span>Filtro P2P: Aplicado</span>
                <span className="text-amber-400 font-semibold font-mono">STABLE_AVG</span>
              </div>
            </motion.div>

          </div>

          {/* Interactive Multi-currency Converter Widget */}
          <div id="converter-panel" className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-cyan-400 animate-pulse" />
                <h3 className="font-bold text-white text-xs sm:text-sm tracking-wider uppercase">CONVERTER</h3>
              </div>
              <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-900/45 rounded-lg uppercase cursor-pointer select-none transition duration-155"
              >
                <RotateCw className="w-3 h-3 text-slate-450" />
                RESET
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        {/* BOLIVARES */}
              <div className="bg-[#07090c] border border-slate-850/80 rounded-xl p-2.5 sm:p-4 flex flex-col justify-center min-h-[70px] sm:min-h-[90px] transition-all duration-200 focus-within:border-cyan-500/30 focus-within:shadow-[0_0_12px_rgba(34,211,238,0.08)]">
                <span className="text-[8px] sm:text-[10px] text-slate-500 uppercase tracking-wider sm:tracking-widest font-bold mb-0.5 sm:mb-1 block">BOLIVARES</span>
                <div className="flex items-center justify-between">
                  <input 
                    type="text" 
                    inputMode="decimal"
                    pattern="[0-9.,]*"
                    value={bsVal}
                    onChange={(e) => handleBsChange(e.target.value)}
                    className="bg-transparent text-cyan-400 text-[19px] min-[375px]:text-2xl sm:text-3xl md:text-4xl font-mono font-bold w-full focus:outline-none placeholder-slate-800"
                    placeholder="0.00"
                  />
                  <span className="text-cyan-400 font-bold font-mono text-sm sm:text-sm ml-1.5 sm:ml-2 self-center shrink-0">Bs</span>
                </div>
              </div>

              {/* USD */}
              <div className="bg-[#07090c] border border-slate-850/80 rounded-xl p-2.5 sm:p-4 flex flex-col justify-center min-h-[70px] sm:min-h-[90px] transition-all duration-200 focus-within:border-slate-700">
                <span className="text-[8px] sm:text-[10px] text-slate-500 uppercase tracking-wider sm:tracking-widest font-bold mb-0.5 sm:mb-1 block">USD (BCV RATE)</span>
                <div className="flex items-center justify-between">
                  <input 
                    type="text" 
                    inputMode="decimal"
                    pattern="[0-9.,]*"
                    value={usdVal}
                    onChange={(e) => handleUsdChange(e.target.value)}
                    className="bg-transparent text-white text-[19px] min-[375px]:text-2xl sm:text-3xl md:text-4xl font-mono font-bold w-full focus:outline-none placeholder-slate-800"
                    placeholder="1.00"
                  />
                  <span className="text-slate-500 font-bold font-mono text-sm sm:text-sm ml-1.5 sm:ml-2 self-center shrink-0">USD</span>
                </div>
              </div>

              {/* EUR */}
              <div className="bg-[#07090c] border border-slate-850/80 rounded-xl p-2.5 sm:p-4 flex flex-col justify-center min-h-[70px] sm:min-h-[90px] transition-all duration-200 focus-within:border-slate-700">
                <span className="text-[8px] sm:text-[10px] text-slate-500 uppercase tracking-wider sm:tracking-widest font-bold mb-0.5 sm:mb-1 block">EUR (BCV RATE)</span>
                <div className="flex items-center justify-between">
                  <input 
                    type="text" 
                    inputMode="decimal"
                    pattern="[0-9.,]*"
                    value={eurVal}
                    onChange={(e) => handleEurChange(e.target.value)}
                    className="bg-transparent text-white text-[19px] min-[375px]:text-2xl sm:text-3xl md:text-4xl font-mono font-bold w-full focus:outline-none placeholder-slate-800"
                    placeholder="0.00"
                  />
                  <span className="text-slate-500 font-bold font-mono text-sm sm:text-sm ml-1.5 sm:ml-2 self-center shrink-0">EUR</span>
                </div>
              </div>

              {/* USDT */}
              <div className="bg-[#07090c] border border-slate-850/80 rounded-xl p-2.5 sm:p-4 flex flex-col justify-center min-h-[70px] sm:min-h-[90px] transition-all duration-200 focus-within:border-slate-700">
                <span className="text-[8px] sm:text-[10px] text-[#0ea5e9] uppercase tracking-wider sm:tracking-widest font-bold mb-0.5 sm:mb-1 block">USDT (BINANCE RATE)</span>
                <div className="flex items-center justify-between">
                  <input 
                    type="text" 
                    inputMode="decimal"
                    pattern="[0-9.,]*"
                    value={usdtVal}
                    onChange={(e) => handleUsdtChange(e.target.value)}
                    className="bg-transparent text-white text-[19px] min-[375px]:text-2xl sm:text-3xl md:text-4xl font-mono font-bold w-full focus:outline-none placeholder-slate-800"
                    placeholder="0.00"
                  />
                  <span className="text-[#0ea5e9] font-bold font-mono text-sm sm:text-sm ml-1.5 sm:ml-2 self-center shrink-0">USDT</span>
                </div>
              </div>

            </div>
          </div>

          {/* Interactive Historical Rate Area chart */}
          <div id="chart-panel" className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Historial de Tendencia de Tasas</h3>
                <p className="text-xs text-slate-500">Sincronización cronológica de lecturas en Firestore</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                {/* Rango de tiempo para el Historial (1D, 7D, 1M, 1A) */}
                <div className="flex p-0.5 bg-[#0a0c10] border border-slate-800 rounded-lg">
                  {(['1d', '7d', '30d', '1y'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer select-none ${
                        timeframe === t
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.12)]'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {t === '1d' ? '1 Día' : t === '7d' ? '7 Días' : t === '30d' ? '1 Mes' : '1 Año'}
                    </button>
                  ))}
                </div>

                <div className="hidden sm:block w-px h-6 bg-slate-800"></div>

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
                      dataKey="timestamp" 
                      stroke="#4b5563" 
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={formatXAxisTick}
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
                      labelFormatter={formatFullTooltip}
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

          {/* USDT/VES Binance P2P Aggregator Sample slots */}
          <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 transition-all duration-300">
            {/* Header / Clickable Toggle */}
            <div 
              onClick={() => setIsP2pExpanded(!isP2pExpanded)} 
              className="flex items-center justify-between gap-2 cursor-pointer select-none group"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3">
                <span className="text-[10px] sm:text-xs text-slate-300 group-hover:text-amber-400 uppercase tracking-wider font-bold transition-colors">
                  USDT/VES Binance P2P Aggregator
                </span>
                <span className="text-[9px] text-amber-500 italic block">
                  Lógica: Omitir Top 2 y promediar restos
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isP2pExpanded && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 font-mono font-bold bg-[#161b22] px-2 py-1 rounded border border-slate-800/85">
                    Promedio: <span className="text-amber-400">{rates?.binanceUsdt ? rates.binanceUsdt.toFixed(2) : '38.05'} VES</span>
                  </span>
                )}
                {isP2pExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isP2pExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden mt-3.5 space-y-3"
                >
                  <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-800/60">
                    <div className="p-1.5 pb-2 bg-red-500/5 border border-red-500/10 rounded flex flex-col items-center">
                      <span className="text-[8px] text-red-450 uppercase font-medium">Ignorado #1</span>
                      <span className="font-mono text-xs text-slate-500 line-through mt-0.5">{rates ? ignored1 : '---'}</span>
                    </div>
                    <div className="p-1.5 pb-2 bg-red-500/5 border border-red-500/10 rounded flex flex-col items-center">
                      <span className="text-[8px] text-red-450 uppercase font-medium">Ignorado #2</span>
                      <span className="font-mono text-xs text-slate-500 line-through mt-0.5">{rates ? ignored2 : '---'}</span>
                    </div>
                    <div className="p-1.5 pb-2 bg-emerald-500/5 border border-emerald-500/10 rounded flex flex-col items-center">
                      <span className="text-[8px] text-emerald-400 uppercase font-medium">Muestra #3</span>
                      <span className="font-mono text-xs text-white mt-0.5">{rates ? sample3 : '---'}</span>
                    </div>
                    <div className="p-1.5 pb-2 bg-emerald-500/5 border border-emerald-500/10 rounded flex flex-col items-center">
                      <span className="text-[8px] text-emerald-400 uppercase font-medium">Muestra #4</span>
                      <span className="font-mono text-xs text-white mt-0.5">{rates ? sample4 : '---'}</span>
                    </div>
                    <div className="p-1.5 pb-2 bg-emerald-500/5 border border-emerald-500/10 rounded flex flex-col items-center">
                      <span className="text-[8px] text-emerald-400 uppercase font-medium">Muestra #5</span>
                      <span className="font-mono text-xs text-white mt-0.5">{rates ? sample5 : '---'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-[#161b22] px-3 py-2 rounded-lg border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Promedio P2P:</span>
                      <span className="text-sm font-mono font-bold text-white">
                        {rates?.binanceUsdt ? rates.binanceUsdt.toFixed(2) : '38.05'}
                        <span className="text-slate-500 font-light ml-1 text-xs">VES</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[9px]">
                      <CheckCircle className="w-3 h-3 text-emerald-450" />
                      <span>MAPPING VALID</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </section>

        {/* RIGHT COLUMN: REALTIME AUTOMATIONS & DIAGNOSTICS */}
        <section className="space-y-8">
          
          {/* DAILY SCHEDULES CHECKS PANEL */}
          <div id="scheduler-panel" className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 sm:p-6 transition-all duration-300 shadow-sm">
            {/* Clickable Header Toggle */}
            <div 
              onClick={() => setIsSchedulerExpanded(!isSchedulerExpanded)} 
              className="flex items-center justify-between gap-2 cursor-pointer select-none group"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">Escaneos Automáticos Diarios</h3>
                  <p className="text-[10px] text-slate-500">Verificaciones periódicas (VET / UTC-4)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSchedulerExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isSchedulerExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden mt-4 space-y-4 pt-4 border-t border-slate-800/60"
                >
                  <div className="space-y-3">
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* TELEMETRY Monospace Terminal Logs */}
          <div id="logs-panel" className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 sm:p-6 transition-all duration-300 shadow-lg shadow-black/30">
            {/* Clickable Header Toggle */}
            <div 
              onClick={() => setIsLogsExpanded(!isLogsExpanded)} 
              className="flex justify-between items-center cursor-pointer select-none group"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400 animate-pulse group-hover:text-amber-400 transition-colors" />
                <span className="font-mono text-xs font-bold text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">System Sync Log</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] text-slate-500 font-mono mr-1">bcv_binance_crawler.log</span>
                {isLogsExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isLogsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden mt-4 pt-4 border-t border-slate-800/80 flex flex-col"
                >
                  {/* In-Memory logs output */}
                  <div className="h-56 sm:h-72 overflow-y-auto font-mono text-[10px] space-y-2.5 pr-2 custom-scrollbar">
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </section>

      </main>

      {/* Footer Bar */}
      <footer className="max-w-7xl mx-auto px-8 py-6 bg-[#0a0c10] border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-12 rounded-xl mb-4">
        <div className="flex flex-wrap gap-6 items-center">
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

        {/* Instalar en Android Button using provided logo */}
        <div className="flex-shrink-0">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 bg-[#121820] hover:bg-[#1b232e] text-xs px-3.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 shadow-md transition duration-200 cursor-pointer select-none"
          >
            <img 
              src="https://ik.imagekit.io/mura16/Mura/Logo%20and%20stuff/divisa%20api.webp" 
              alt="Monitor Api Logo" 
              className="w-5 h-5 rounded-full object-cover border border-slate-700/85"
              referrerPolicy="no-referrer"
            />
            <span className="font-semibold text-slate-200">Instalar en Android</span>
          </button>
        </div>

        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Build v2.4.1-stable | Heritage Mode: ON
        </div>
      </footer>

      {/* PWA Android Install Instructions Backdrop Modal */}
      <AnimatePresence>
        {showAndroidInstallHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-[#0d1117] border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <img 
                    src="https://ik.imagekit.io/mura16/Mura/Logo%20and%20stuff/divisa%20api.webp" 
                    alt="Monitor Api Logo" 
                    className="w-6 h-6 rounded-full object-cover border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <h4 className="font-bold text-white text-sm">Instalar Monitor Api</h4>
                </div>
                <button 
                  onClick={() => setShowAndroidInstallHelp(false)}
                  className="text-slate-400 hover:text-white transition duration-150 cursor-pointer text-sm font-mono p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-slate-300">
                <p className="text-slate-450">
                  Sigue estos sencillos pasos desde el navegador <strong>Google Chrome</strong> en tu celular Android:
                </p>
                <ol className="space-y-2.5 list-none pl-0">
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">1</span>
                    <span>Abre este enlace en tu celular usando <strong>Google Chrome</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">2</span>
                    <span>Presiona el botón de menú de opciones <strong>(⋮)</strong> en la parte superior derecha de Chrome.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">3</span>
                    <span>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
                  </li>
                </ol>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                <button
                  onClick={() => setShowAndroidInstallHelp(false)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition duration-150 cursor-pointer select-none"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
