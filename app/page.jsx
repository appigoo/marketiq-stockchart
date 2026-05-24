"use client";
import { useState } from "react";

const C = {
  bg: "#080c10", panel: "#0d1117", border: "#1c2333",
  accent: "#00d4aa", accentDim: "#00d4aa22",
  bull: "#00c896", bear: "#ff4b6e",
  text: "#e6edf3", muted: "#7d8590", grid: "#161b22",
};

async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxy);
  const outer = await res.json();
  const data = JSON.parse(outer.contents);
  const result = data.chart.result[0];
  const meta = result.meta;
  const quotes = result.indicators.quote[0];
  const timestamps = result.timestamp;
  const candles = timestamps.map((t, i) => ({
    time: new Date(t * 1000),
    open: quotes.open[i], high: quotes.high[i],
    low: quotes.low[i], close: quotes.close[i], volume: quotes.volume[i],
  })).filter(c => c.open && c.high && c.low && c.close);
  return {
    symbol: meta.symbol, name: meta.shortName || meta.symbol,
    price: meta.regularMarketPrice, prevClose: meta.chartPreviousClose,
    currency: meta.currency, exchange: meta.exchangeName, candles,
  };
}

function CandleChart({ candles }) {
  const W = 900, H = 360, PAD = { t: 20, r: 60, b: 30, l: 10 };
  const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices), maxP = Math.max(...prices), range = maxP - minP || 1;
  const scaleY = v => PAD.t + innerH - ((v - minP) / range) * innerH;
  const barW = Math.max(2, Math.floor(innerW / candles.length) - 2);
  const barX = i => PAD.l + (i + 0.5) * (innerW / candles.length);
  const gridLines = Array.from({ length: 6 }, (_, i) => {
    const v = minP + (range * i) / 5;
    return { y: scaleY(v), label: v.toFixed(2) };
  });
  const xLabels = [];
  let lastMonth = -1;
  candles.forEach((c, i) => {
    const m = c.time.getMonth();
    if (m !== lastMonth) { xLabels.push({ i, label: c.time.toLocaleDateString("en", { month: "short" }) }); lastMonth = m; }
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={g.y} y2={g.y} stroke={C.grid} strokeWidth="1" />
          <text x={W - PAD.r + 6} y={g.y + 4} fill={C.muted} fontSize="9" fontFamily="monospace">{g.label}</text>
        </g>
      ))}
      {xLabels.map((xl, i) => (
        <text key={i} x={barX(xl.i)} y={H - 6} fill={C.muted} fontSize="9" textAnchor="middle" fontFamily="monospace">{xl.label}</text>
      ))}
      {candles.map((c, i) => {
        const bull = c.close >= c.open, col = bull ? C.bull : C.bear, x = barX(i);
        const top = scaleY(Math.max(c.open, c.close)), bot = scaleY(Math.min(c.open, c.close));
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={scaleY(c.high)} y2={scaleY(c.low)} stroke={col} strokeWidth="1" opacity="0.8" />
            <rect x={x - barW / 2} y={top} width={barW} height={Math.max(1, bot - top)} fill={col} opacity="0.9" rx="0.5" />
          </g>
        );
      })}
    </svg>
  );
}

function VolumeChart({ candles }) {
  const W = 900, H = 80, PAD = { l: 10, r: 60, t: 5, b: 0 };
  const innerW = W - PAD.l - PAD.r;
  const maxVol = Math.max(...candles.map(c => c.volume));
  const barW = Math.max(2, Math.floor(innerW / candles.length) - 2);
  const barX = i => PAD.l + (i + 0.5) * (innerW / candles.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <text x={W - PAD.r + 6} y={12} fill={C.muted} fontSize="9" fontFamily="monospace">VOL</text>
      {candles.map((c, i) => {
        const bull = c.close >= c.open;
        const barH = (c.volume / maxVol) * (H - PAD.t - 10);
        return <rect key={i} x={barX(i) - barW / 2} y={H - barH} width={barW} height={barH} fill={bull ? C.bull : C.bear} opacity="0.5" rx="0.5" />;
      })}
    </svg>
  );
}

const PRESETS = ["TSLA", "AAPL", "NVDA", "MSFT", "0700.HK"];

export default function App() {
  const [input, setInput] = useState("TSLA");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const load = async (sym) => {
    const s = sym || input.trim().toUpperCase();
    if (!s) return;
    setLoading(true); setError(""); setData(null); setSearched(true);
    try { setData(await fetchQuote(s)); }
    catch { setError("找不到股票代碼，請檢查後重試。"); }
    setLoading(false);
  };

  const change = data ? data.price - data.prevClose : 0;
  const changePct = data ? (change / data.prevClose * 100) : 0;
  const bull = change >= 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Mono','Courier New',monospace", padding: 0 }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", alignItems: "center", gap: "12px", background: C.panel }}>
        <div style={{ color: C.accent, fontSize: "18px", fontWeight: 700, letterSpacing: "2px" }}>◈ MARKETIQ</div>
        <div style={{ color: C.muted, fontSize: "11px" }}>QUOTE TERMINAL</div>
      </div>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "20px 24px", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", color: C.muted, marginBottom: "12px", letterSpacing: "1px" }}>輸入股票代碼 / ENTER TICKER</div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input value={input} onChange={e => setInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && load()}
              placeholder="e.g. TSLA, AAPL, 0700.HK"
              style={{ flex: 1, minWidth: "180px", background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: "16px", fontFamily: "inherit", padding: "10px 14px", borderRadius: "6px", outline: "none", letterSpacing: "1px" }} />
            <button onClick={() => load()} disabled={loading}
              style={{ background: loading ? C.accentDim : C.accent, color: C.bg, border: "none", borderRadius: "6px", padding: "10px 22px", fontSize: "13px", fontWeight: 700, cursor: loading ? "wait" : "pointer", letterSpacing: "1px" }}>
              {loading ? "載入中…" : "查詢 ▶"}
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
            {PRESETS.map(s => (
              <button key={s} onClick={() => { setInput(s); load(s); }}
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: "4px", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "1px" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        {error && <div style={{ background: "#ff4b6e18", border: `1px solid ${C.bear}`, borderRadius: "8px", padding: "14px 20px", color: C.bear, fontSize: "13px", marginBottom: "20px" }}>{error}</div>}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px", color: C.muted, fontSize: "13px" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>◈</div>
            <div>正在抓取市場數據…</div>
          </div>
        )}
        {data && !loading && (
          <div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "20px 24px", marginBottom: "16px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "2px" }}>{data.symbol}</div>
                <div style={{ color: C.muted, fontSize: "12px", marginTop: "2px" }}>{data.name} · {data.exchange}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "32px", fontWeight: 700 }}>{data.currency === "HKD" ? "HK$" : "$"}{data.price?.toFixed(2)}</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: bull ? C.bull : C.bear }}>
                  {bull ? "▲" : "▼"} {Math.abs(change).toFixed(2)} ({Math.abs(changePct).toFixed(2)}%)
                </div>
              </div>
              {[["昨收", data.prevClose?.toFixed(2)], ["成交量", data.candles.at(-1)?.volume?.toLocaleString()], ["高", data.candles.at(-1)?.high?.toFixed(2)], ["低", data.candles.at(-1)?.low?.toFixed(2)]].map(([label, val]) => (
                <div key={label} style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: "16px" }}>
                  <div style={{ color: C.muted, fontSize: "10px" }}>{label}</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px" }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "16px 8px 8px", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px", paddingLeft: "16px", marginBottom: "8px" }}>日K線圖 · 近3個月</div>
              <CandleChart candles={data.candles} />
              <div style={{ borderTop: `1px solid ${C.grid}`, marginTop: "4px" }}><VolumeChart candles={data.candles} /></div>
            </div>
            <div style={{ color: C.muted, fontSize: "10px", textAlign: "right" }}>數據來源 Yahoo Finance · 非實時報價</div>
          </div>
        )}
        {!searched && !loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>◈</div>
            <div style={{ fontSize: "13px" }}>輸入股票代碼開始查詢</div>
            <div style={{ fontSize: "11px", marginTop: "6px" }}>支援美股、港股（如 0700.HK）</div>
          </div>
        )}
      </div>
    </div>
  );
}
