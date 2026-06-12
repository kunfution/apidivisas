import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import * as cheerio from 'cheerio';

// Initialize Express App
const app = express();
const PORT = 3000;

app.use(express.json());

// Load Firebase configuration safely
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any;
try {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  console.log('[Firebase] Successfully loaded config for project:', firebaseConfig.projectId);
} catch (err) {
  console.error('[Firebase] Failed to load firebase-applet-config.json:', err);
  process.exit(1);
}

// Initialize Firebase Web SDK
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Logs variable to keep up to 100 historical logs in-memory for UI debugging
interface SystemLog {
  timestamp: string;
  type: 'info' | 'warn' | 'error';
  message: string;
}
const systemLogs: SystemLog[] = [];

function logSystem(type: 'info' | 'warn' | 'error', message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  systemLogs.unshift({ timestamp, type, message });
  if (systemLogs.length > 100) {
    systemLogs.pop();
  }
}

// Helper to calculate Venezuela Time (VET, UTC-4)
function getVenezuelaTime() {
  const utcDate = new Date();
  const vetOffsetMs = -4 * 60 * 60 * 1000;
  const vetDate = new Date(utcDate.getTime() + vetOffsetMs);
  
  const hour = vetDate.getUTCHours();
  const minute = vetDate.getUTCMinutes();
  const second = vetDate.getUTCSeconds();
  
  const year = vetDate.getUTCFullYear();
  const month = String(vetDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vetDate.getUTCDate()).padStart(2, '0');
  
  const dateString = `${year}-${month}-${day}`;
  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  
  return {
    hour,
    minute,
    second,
    dateString,
    timeString
  };
}

// ----------------------------------------------------
// EXCHANGE RATES SCRAPING LOGIC
// ----------------------------------------------------

async function fetchBcvHtml(): Promise<{ usd: number | null; euro: number | null }> {
  try {
    const response = await fetch("https://www.bcv.org.ve/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3"
      }
    });

    if (!response.ok) {
      throw new Error(`BCV HTTP error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraction parsing
    const usdText = $('#dolar strong').text().trim() || $('#dolar').find('.centrado strong').text().trim();
    const euroText = $('#euro strong').text().trim() || $('#euro').find('.centrado strong').text().trim();

    const usdVal = usdText ? parseFloat(usdText.replace(',', '.')) : null;
    const euroVal = euroText ? parseFloat(euroText.replace(',', '.')) : null;

    if (usdVal && euroVal) {
      return { usd: usdVal, euro: euroVal };
    }
    
    // Regex backup parsing
    const dolarRegex = /id=["']dolar["'][\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/im;
    const euroRegex = /id=["']euro["'][\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/im;

    const dolarMatch = html.match(dolarRegex);
    const euroMatch = html.match(euroRegex);

    const regexUsd = dolarMatch ? parseFloat(dolarMatch[1].replace(',', '.')) : null;
    const regexEuro = euroMatch ? parseFloat(euroMatch[1].replace(',', '.')) : null;

    return { usd: regexUsd, euro: regexEuro };
  } catch (error: any) {
    logSystem('warn', `Direct BCV HTML parse failed: ${error?.message || error}`);
    return { usd: null, euro: null };
  }
}

async function fetchBcvViaGemini(): Promise<{ usd: number; euro: number }> {
  logSystem('info', 'Executing fallback: Gemini AI Search Grounding for BCV exchange rates...');
  const result = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "Please find the current official exchange rates in VES (Venezuelan Bolivars) of the USD (US Dollar) and EUR (Euro) from the Banco Central de Venezuela (BCV) official portal (bcv.org.ve). Ensure they are the official front-page rates.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          usd: {
            type: Type.NUMBER,
            description: "Current BCV official USD rate in VES (e.g. 36.45)"
          },
          euro: {
            type: Type.NUMBER,
            description: "Current BCV official EUR rate in VES (e.g. 39.24)"
          }
        },
        required: ["usd", "euro"]
      },
      tools: [
        { googleSearch: {} }
      ]
    }
  });

  const parsed = JSON.parse(result.text || "{}");
  if (!parsed.usd || !parsed.euro) {
    throw new Error("Gemini returned invalid or empty rate payload");
  }

  return { usd: parsed.usd, euro: parsed.euro };
}

async function getBcvRates(): Promise<{ usd: number; euro: number }> {
  logSystem('info', 'Attempting direct scraping of BCV website...');
  const scraped = await fetchBcvHtml();
  if (scraped.usd && scraped.euro) {
    logSystem('info', `Direct scraping succeeded! USD=${scraped.usd}, EUR=${scraped.euro}`);
    return { usd: scraped.usd, euro: scraped.euro };
  }

  logSystem('warn', 'Direct BCV scraping failed or was blocked. Initiating fallback...');
  try {
    const geminiData = await fetchBcvViaGemini();
    logSystem('info', `Gemini AI Grounding succeeded! USD=${geminiData.usd}, EUR=${geminiData.euro}`);
    return geminiData;
  } catch (err: any) {
    logSystem('error', `BCV Fallback also failed: ${err.message}`);
    throw err;
  }
}

async function fetchBinanceP2P(): Promise<number> {
  logSystem('info', 'Attempting direct call to Binance P2P Search API...');
  try {
    const response = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        asset: "USDT",
        fiat: "VES",
        tradeType: "BUY",
        page: 1,
        rows: 15, // Retrieve 15 ads to confidently filter top 2
        payTypes: [],
        countries: [],
        publisherType: null
      })
    });

    if (!response.ok) {
      throw new Error(`Binance P2P endpoint returned HTTP ${response.status}`);
    }

    const { data } = await response.json();
    if (data && Array.isArray(data) && data.length > 0) {
      const prices = data
        .map((item: any) => item?.adv?.price ? parseFloat(item.adv.price) : null)
        .filter((p): p is number => p !== null && !isNaN(p));
      
      logSystem('info', `Successfully fetched ${prices.length} USDT/VES P2P ads.`);

      if (prices.length > 2) {
        // "ignora las 2 primeras publicaciones y saca el promedio"
        const filteredPrices = prices.slice(2);
        const average = filteredPrices.reduce((a, b) => a + b, 0) / filteredPrices.length;
        logSystem('info', `Binance average (excluding top 2): ${average.toFixed(2)} (on ${filteredPrices.length} ads)`);
        return parseFloat(average.toFixed(2));
      } else {
        const average = prices.reduce((a, b) => a + b, 0) / prices.length;
        logSystem('warn', `Fewer than 3 ads found. Simple average rate computed: ${average.toFixed(2)}`);
        return parseFloat(average.toFixed(2));
      }
    }
    throw new Error("No ads returned or data payload was empty");
  } catch (err: any) {
    logSystem('warn', `Binance P2P direct call failed. Falling back to Gemini search: ${err?.message || err}`);
    try {
      const geminiAvg = await fetchBinanceUsdtViaGemini();
      logSystem('info', `Gemini AI Binance grounding succeeded! Average USDT=${geminiAvg}`);
      return geminiAvg;
    } catch (gErr: any) {
      logSystem('error', `Binance fallback failed: ${gErr.message}`);
      throw gErr;
    }
  }
}

async function fetchBinanceUsdtViaGemini(): Promise<number> {
  logSystem('info', 'Querying Gemini Search Grounding for Binance P2P USDT/VES exchange rates...');
  const result = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "Find the current active market price for USDT in VES on Binance P2P. Ignore the first 2 highest/adpromoted rates and calculate the average of the remaining main rates. Return only the average rate price.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          averageRate: {
            type: Type.NUMBER,
            description: "Average rate value of Binance P2P USDT/VES (e.g. 40.25)"
          }
        },
        required: ["averageRate"]
      },
      tools: [{ googleSearch: {} }]
    }
  });

  const parsed = JSON.parse(result.text || "{}");
  if (!parsed.averageRate) {
    throw new Error("Gemini returned invalid or missing Binance rate field");
  }
  return parsed.averageRate;
}

// Full execution flow to scrape and update firestore
async function runFullScrape() {
  logSystem('info', '======================================');
  logSystem('info', 'Starting scheduled exchange rate update job...');
  
  const bcv = await getBcvRates();
  const usdt = await fetchBinanceP2P();
  
  const { dateString, timeString } = getVenezuelaTime();
  logSystem('info', `Rates collected successfully: USD=${bcv.usd}, EUR=${bcv.euro}, USDT/VES=${usdt}`);
  
  // Update Firestore main document with exact original format and column naming
  const docRef = doc(db, "exchangeRates", "current");
  await setDoc(docRef, {
    bcvEuro: bcv.euro,
    bcvUsd: bcv.usd,
    binanceUsdt: usdt,
    lastUpdated: dateString
  });
  logSystem('info', `Firestore document 'exchangeRates/current' updated successfully!`);

  // Log in chronological subcollection for timeline view
  const historyRef = doc(db, "exchangeRates", `history_${dateString}_${timeString.replace(/:/g, '')}`);
  await setDoc(historyRef, {
    bcvEuro: bcv.euro,
    bcvUsd: bcv.usd,
    binanceUsdt: usdt,
    lastUpdated: dateString,
    timestamp: new Date().toISOString(),
    vetTime: timeString
  });
  
  logSystem('info', 'Exchange rate job completed perfectly!');
  logSystem('info', '======================================');
  
  return { bcvEuro: bcv.euro, bcvUsd: bcv.usd, binanceUsdt: usdt, lastUpdated: dateString };
}

// ----------------------------------------------------
// AUTO-VERIFICATION BACKGROUND SYSTEM (3 times a day)
// ----------------------------------------------------
// Target Times: 6:00 AM (06:00), 12:00 PM (12:00), 7:00 PM (19:00)
let lastTriggeredMinuteString = "";

setInterval(() => {
  const { hour, minute, dateString, timeString } = getVenezuelaTime();
  const timeKey = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  
  const scheduledHours = ["06:00", "12:00", "19:00"];
  
  if (scheduledHours.includes(timeKey)) {
    const triggerString = `${dateString} ${timeKey}`;
    if (lastTriggeredMinuteString !== triggerString) {
      lastTriggeredMinuteString = triggerString;
      logSystem('info', `Alarm triggered for scheduled scan at: ${timeKey} VET`);
      runFullScrape().catch(err => {
        logSystem('error', `Error executing automatic scheduled scrape: ${err?.message || err}`);
      });
    }
  }
}, 15000); // Check every 15 seconds to ensure precision

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Get current tracked rates
app.get('/api/rates', async (req, res) => {
  try {
    const docRef = doc(db, "exchangeRates", "current");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      res.json({ success: true, data: docSnap.data() });
    } else {
      res.json({ success: false, message: "No data stored in database yet." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || error });
  }
});

// Trigger a manual scrape now
app.post('/api/trigger-scrape', async (req, res) => {
  try {
    const result = await runFullScrape();
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || error });
  }
});

// Fetch system logs
app.get('/api/logs', (req, res) => {
  res.json({ success: true, logs: systemLogs });
});

// Fetch server status information
app.get('/api/status', (req, res) => {
  const vetTime = getVenezuelaTime();
  res.json({
    success: true,
    serverTimeUTC: new Date().toISOString(),
    venezuelaTime: `${vetTime.dateString} ${vetTime.timeString}`,
    lastScheduledTrigger: lastTriggeredMinuteString || "None today yet"
  });
});

// Fetch historical rate logs
app.get('/api/history', async (req, res) => {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const querySnapshot = await getDocs(collection(db, "exchangeRates"));
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      const id = docSnap.id;
      if (id !== 'current') {
        list.push({ id, ...docSnap.data() });
      }
    });
    
    // Sort chronologically by timestamp
    list.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateA - dateB;
    });

    res.json({ success: true, history: list.slice(-30) }); // Get last 30 readings
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || error });
  }
});

// ----------------------------------------------------
// VITE DEV SERVER MIDDLEWARE AND STATIC SERVING
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    logSystem('info', 'Vite Development Middleware loaded.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    logSystem('info', 'Static Production Assets serving mode loaded.');
  }

  app.listen(PORT, "0.0.0.0", () => {
    logSystem('info', `Server listening on http://0.0.0.0:${PORT}`);
    
    // Auto run first scrape check on startup to seed/verify the database instantly
    logSystem('info', 'Executing startup seed scrape to check database connection...');
    runFullScrape().then(() => {
      logSystem('info', 'Startup seed completed successfully!');
    }).catch(err => {
      logSystem('error', `Startup seed rate fetch failed: ${err.message}`);
    });
  });
}

startServer();
