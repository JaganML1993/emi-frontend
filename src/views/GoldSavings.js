import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col, Button, Modal, ModalBody, Alert,
} from "reactstrap";
import { format, subMonths, subYears } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LineElement, PointElement,
  Filler, Tooltip, Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import api from "../config/axios";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

const accentAmber = "#FFA02E";

const cardStyle = {
  background: "linear-gradient(165deg, #18181c 0%, #141416 50%, #121214 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  boxShadow: "0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,160,46,0.06) inset",
  overflow: "hidden",
};

const headerStyle = {
  background: "linear-gradient(90deg, rgba(255,160,46,0.08) 0%, transparent 55%)",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  padding: "1rem clamp(0.85rem, 3vw, 1.15rem)",
};

const statCardShell = (accent) => ({
  background: "#16161a",
  border: "1px solid rgba(255,255,255,0.06)",
  borderTop: `2px solid ${accent}`,
  borderRadius: 14,
  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
  transition: "box-shadow 0.2s ease, transform 0.2s ease",
});

const labelStyle = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
  display: "block",
};

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "8px 12px",
};

function GoldSavings() {
  const navigate = useNavigate();
  const [entries, setEntries]       = useState([]);
  const [summary, setSummary]       = useState({ totalGrams: 0, totalValue: 0, avgPricePerGram: 0, count: 0, breakdown: [] });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [deleteId, setDeleteId]     = useState(null);
  const [filterFrom, setFilterFrom]     = useState("");
  const [filterTo, setFilterTo]         = useState("");
  const [activePreset, setActivePreset] = useState("all");

  const PRESETS = [
    { key: "all", label: "All" },
    { key: "1m",  label: "1M",  months: 1 },
    { key: "3m",  label: "3M",  months: 3 },
    { key: "6m",  label: "6M",  months: 6 },
    { key: "1y",  label: "1Y",  years: 1 },
    { key: "3y",  label: "3Y",  years: 3 },
    { key: "5y",  label: "5Y",  years: 5 },
  ];

  const applyPreset = (preset) => {
    setActivePreset(preset.key);
    setPage(1);
    if (preset.key === "all") {
      setFilterFrom(""); setFilterTo("");
    } else {
      const from = preset.months
        ? subMonths(new Date(), preset.months)
        : subYears(new Date(), preset.years);
      setFilterFrom(format(from, "yyyy-MM-dd"));
      setFilterTo(format(new Date(), "yyyy-MM-dd"));
    }
  };

  const [livePrice, setLivePrice]       = useState(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [lastUpdated, setLastUpdated]   = useState(null);
  const [page, setPage]                 = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [goalGrams, setGoalGrams]       = useState(() => parseFloat(localStorage.getItem("goldGoalGrams") || "0"));
  const [goalInput, setGoalInput]       = useState("");
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const PAGE_SIZE = 10;

  const fetchLivePrice = useCallback(async () => {
    try {
      setPriceLoading(true);
      const res = await api.get("/api/gold-savings/gold-price");
      if (res.data.success) { setLivePrice(res.data.data); setLastUpdated(new Date()); }
    } catch { setLivePrice(null); }
    finally { setPriceLoading(false); }
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(fetchLivePrice, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchLivePrice]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get("/api/gold-savings/summary");
      if (res.data.success) setSummary(res.data.data);
    } catch { /* non-critical */ }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: PAGE_SIZE, page };
      if (filterFrom) params.from = filterFrom;
      if (filterTo)   params.to   = filterTo;
      const res = await api.get("/api/gold-savings", { params });
      if (res.data.success) {
        setEntries(res.data.data);
        setTotalEntries(res.data.total || 0);
      }
    } catch {
      setError("Failed to load entries.");
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo, page, PAGE_SIZE]);

  useEffect(() => {
    fetchLivePrice();
    fetchSummary();
    fetchEntries();
  }, [fetchLivePrice, fetchSummary, fetchEntries]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/gold-savings/${deleteId}`);
      setSuccess("Entry deleted.");
      setDeleteId(null);
      fetchSummary();
      fetchEntries();
    } catch {
      setError("Failed to delete entry.");
      setDeleteId(null);
    }
  };

  const saveGoal = () => {
    const v = parseFloat(goalInput);
    if (!isNaN(v) && v > 0) {
      setGoalGrams(v);
      localStorage.setItem("goldGoalGrams", String(v));
    }
    setGoalModalOpen(false);
  };

  const totalInvestedFiltered = useMemo(() =>
    entries.reduce((s, e) => s + e.grams * e.pricePerGram, 0), [entries]);
  const totalGramsFiltered = useMemo(() =>
    entries.reduce((s, e) => s + e.grams, 0), [entries]);

  // Best/worst buy rate per gram across ALL entries on current page
  const ratesOnPage = useMemo(() =>
    entries.map(e => e.pricePerGram / e.grams), [entries]);
  const bestRate  = useMemo(() => Math.min(...ratesOnPage), [ratesOnPage]);
  const worstRate = useMemo(() => Math.max(...ratesOnPage), [ratesOnPage]);

  const minutesSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 60000)
    : null;

  return (
    <div className="content gold-savings-page-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes goldSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gold-savings-modal-content.modal-content {
          background: linear-gradient(165deg, #18181c 0%, #141416 50%, #121214 100%);
          border: 1px solid rgba(255,255,255,0.07) !important;
          border-radius: 16px !important;
          box-shadow: 0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,160,46,0.06) inset;
          overflow: hidden;
        }
      ` }} />
      {(error || success) && (
        <Row className="mb-3">
          <Col xs="12">
            {error && (
              <Alert color="danger" toggle={() => setError("")} style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#FCA5A5", borderRadius: 10 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert color="success" toggle={() => setSuccess("")} style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.35)", color: "#BBF7D0", borderRadius: 10 }}>
                {success}
              </Alert>
            )}
          </Col>
        </Row>
      )}

      {/* Summary Cards */}
      <Row className="mb-3">
        <Col md="3">
          <Card style={statCardShell(accentAmber)}>
            <CardBody style={{ padding: "1.4rem" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <i className="tim-icons icon-coins mr-1" style={{ color: "#fbbf24" }} /> Total Grams
              </div>
              <div style={{ color: "#fff", fontSize: "1.9rem", fontWeight: 700 }}>{summary.totalGrams.toFixed(3)} g</div>
              {goalGrams > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.67rem" }}>Goal: {goalGrams}g</span>
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.67rem", fontWeight: 700 }}>{Math.min(100,((summary.totalGrams/goalGrams)*100)).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #fbbf24, #e8890c)", width: `${Math.min(100,(summary.totalGrams/goalGrams)*100)}%`, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.67rem", marginTop: 3 }}>{Math.max(0,goalGrams-summary.totalGrams).toFixed(3)}g remaining</div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem" }}>{summary.count} entries</span>
                <button type="button" onClick={() => { setGoalInput(String(goalGrams || "")); setGoalModalOpen(true); }} className="btn-cancel-outline" style={{ fontSize: "0.63rem", padding: "2px 8px", borderRadius: 6 }}>{goalGrams > 0 ? "Edit Goal" : "Set Goal"}</button>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card style={statCardShell("#6366f1")}>
            <CardBody style={{ padding: "1.4rem" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <i className="tim-icons icon-money-coins mr-1" style={{ color: "#a5b4fc" }} /> Total Invested
              </div>
              <div style={{ color: "#fff", fontSize: "1.9rem", fontWeight: 700 }}>₹{summary.totalValue.toLocaleString("en-IN",{maximumFractionDigits:0})}</div>
              {livePrice && summary.avgPricePerGram > 0 && (
                <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.67rem" }}>Avg buy</span>
                    <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.7rem", fontWeight: 600 }}>₹{Math.round(summary.avgPricePerGram).toLocaleString("en-IN")}/g</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.67rem" }}>Live 24K</span>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontWeight: 600 }}>₹{livePrice.pricePerGram24k.toLocaleString("en-IN")}/g</span>
                  </div>
                  {(() => {
                    const diff = livePrice.pricePerGram24k - Math.round(summary.avgPricePerGram);
                    const pct = ((diff/summary.avgPricePerGram)*100).toFixed(1);
                    return <div style={{ display: "flex", justifyContent: "flex-end" }}><span style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>{diff>=0?"▲":"▼"} {diff>=0?"+":""}{pct}% vs avg</span></div>;
                  })()}
                </div>
              )}
              {!livePrice && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", marginTop: 4 }}>Avg ₹{summary.avgPricePerGram.toLocaleString("en-IN",{maximumFractionDigits:0})}/g</div>}
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card style={statCardShell(accentAmber)}>
            <CardBody style={{ padding: "1.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <i className="tim-icons icon-chart-bar-32 mr-1" style={{ color: "#fbbf24" }} /> Today&apos;s Gold Price
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {minutesSinceUpdate !== null && <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.6rem" }}>{minutesSinceUpdate === 0 ? "just now" : `${minutesSinceUpdate}m ago`}</span>}
                  {!priceLoading && <button onClick={fetchLivePrice} title="Refresh" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, fontSize: "0.8rem" }}>↻</button>}
                </div>
              </div>
              {priceLoading ? (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>Fetching live price…</div>
              ) : livePrice ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <div style={{ color: "#fff", fontSize: "1.9rem", fontWeight: 700 }}>₹{livePrice.pricePerGram24k.toLocaleString("en-IN")}<span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", fontWeight: 400, marginLeft: 4 }}>/g · 24K</span></div>
                    {livePrice.change24k !== null && <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "1px 7px" }}>{livePrice.change24k>=0?"▲":"▼"} ₹{Math.abs(livePrice.change24k).toLocaleString("en-IN")}</span>}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", marginTop: 4 }}>22K ₹{livePrice.pricePerGram22k.toLocaleString("en-IN")}/g</div>
                </>
              ) : (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.82rem" }}>Unable to fetch price. <span onClick={fetchLivePrice} style={{ color: "rgba(255,255,255,0.5)", cursor: "pointer", textDecoration: "underline" }}>Retry</span></div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          {(() => {
            const currentValue = livePrice && summary.totalGrams > 0 ? Math.round(summary.totalGrams * livePrice.pricePerGram24k) : null;
            const pnl = currentValue !== null ? currentValue - Math.round(summary.totalValue) : null;
            const pnlPct = pnl !== null && summary.totalValue > 0 ? ((pnl/summary.totalValue)*100).toFixed(2) : null;
            const isProfit = pnl !== null && pnl >= 0;
            return (
              <Card style={statCardShell("#10b981")}>
                <CardBody style={{ padding: "1.4rem" }}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    <i className="tim-icons icon-trophy mr-1" style={{ color: "#6ee7b7" }} /> Current Value
                  </div>
                  {priceLoading || !livePrice ? (
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>{priceLoading ? "Calculating…" : "Price unavailable"}</div>
                  ) : summary.totalGrams === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>No gold yet</div>
                  ) : (
                    <>
                      <div style={{ color: "#fff", fontSize: "1.9rem", fontWeight: 700 }}>₹{currentValue.toLocaleString("en-IN")}</div>
                      {pnl !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 8px" }}>{isProfit?"▲":"▼"} ₹{Math.abs(pnl).toLocaleString("en-IN")}</span>
                          <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.76rem", fontWeight: 600 }}>{isProfit?"+":""}{pnlPct}%</span>
                        </div>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>
            );
          })()}
        </Col>
      </Row>

      {/* Date Filter */}
      <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(0,0,0,0.14)", border: "1px solid rgba(255,160,46,0.18)", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 6 }}>
          <i className="tim-icons icon-calendar-60" style={{ color: "#fbbf24", fontSize: "0.82rem" }} />
          <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: "0.76rem" }}>Period</span>
          {PRESETS.map(p => {
            const active = activePreset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: "0.75rem",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  background: active ? "rgba(255,160,46,0.14)" : "transparent",
                  border: `1px solid ${active ? "rgba(255,160,46,0.35)" : "rgba(255,255,255,0.1)"}`,
                  color: active ? "#fbbf24" : "rgba(255,255,255,0.45)",
                }}
              >
                {p.label}
              </button>
            );
          })}
          {(filterFrom || filterTo) && entries.length > 0 && (
            <div style={{ marginLeft: "auto" }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: "0.82rem" }}>{totalGramsFiltered.toFixed(3)} g</span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.73rem", marginLeft: 8 }}>₹{totalInvestedFiltered.toLocaleString("en-IN",{maximumFractionDigits:0})}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.68rem" }}>Applies to chart &amp; entries</span>
        </div>
      </div>

      {entries.length > 0 && (
        <Card style={{ ...cardStyle, marginBottom: 20 }}>
          <CardHeader style={{ ...headerStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <CardTitle tag="h5" style={{ color: "#fff", fontWeight: 800, margin: 0, fontSize: "1.02rem", letterSpacing: "-0.02em" }}>
              <i className="tim-icons icon-chart-bar-32 mr-2" style={{ color: "#fbbf24" }} />
              Gold Price Trend
            </CardTitle>
            <span style={{ color: "rgba(251,191,36,0.75)", fontSize: "0.73rem", fontWeight: 600 }}>
              {filterFrom || filterTo ? `${filterFrom || "start"} → ${filterTo || "today"}` : "all time · ₹/gram"}
            </span>
          </CardHeader>
          <CardBody style={{ padding: "1.2rem 1.2rem 0.8rem", background: "rgba(0,0,0,0.14)" }}>
            {(() => {
              const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
              const labels = sorted.map(e => format(new Date(e.date), "dd MMM yy"));
              const prices = sorted.map(e => parseFloat((e.pricePerGram / e.grams).toFixed(0)));
              const avgBuy = summary.avgPricePerGram > 0 ? Math.round(summary.avgPricePerGram) : null;

              if (livePrice) { labels.push("Live"); prices.push(livePrice.pricePerGram24k); }

              const mkGradient = (ctx, chartArea) => {
                if (!ctx || !chartArea) return "rgba(255,160,46,0.06)";
                const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                grad.addColorStop(0, "rgba(255,160,46,0.22)");
                grad.addColorStop(1, "rgba(255,160,46,0.02)");
                return grad;
              };

              const data = {
                labels,
                datasets: [
                  {
                    label: "Price/g",
                    data: prices,
                    borderColor: "#fbbf24",
                    borderWidth: 2,
                    pointRadius: prices.map(() => 3),
                    pointBackgroundColor: "#fbbf24",
                    pointBorderColor: "#141416",
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: (ctx) => { const { chart } = ctx; if (!chart.chartArea) return "rgba(255,160,46,0.04)"; return mkGradient(chart.ctx, chart.chartArea); },
                  },
                  ...(avgBuy ? [{
                    label: "Avg Buy",
                    data: labels.map(() => avgBuy),
                    borderColor: "rgba(251,191,36,0.35)",
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0,
                    fill: false,
                  }] : []),
                ],
              };

              const options = {
                responsive: true,
                maintainAspectRatio: true,
                interaction: { mode: "index", intersect: false },
                plugins: {
                  legend: { display: true, labels: { color: "rgba(251,191,36,0.75)", font: { size: 11 }, boxWidth: 12, padding: 12 } },
                  tooltip: {
                    backgroundColor: "#141416", borderColor: "rgba(255,160,46,0.25)", borderWidth: 1,
                    titleColor: "rgba(255,255,255,0.8)", bodyColor: "rgba(255,255,255,0.5)",
                    callbacks: {
                      label: (ctx) => {
                        if (ctx.datasetIndex === 1) return ` Avg Buy: ₹${ctx.parsed.y.toLocaleString("en-IN")}/g`;
                        const idx = ctx.dataIndex;
                        const isLive = livePrice && idx === prices.length - 1;
                        if (isLive) return ` Live: ₹${ctx.parsed.y.toLocaleString("en-IN")}/g`;
                        const entry = sorted[idx];
                        if (!entry) return ` ₹${ctx.parsed.y.toLocaleString("en-IN")}/g`;
                        const pnlPerGram = livePrice ? livePrice.pricePerGram24k - ctx.parsed.y : null;
                        const pnlStr = pnlPerGram !== null ? `  ${pnlPerGram>=0?"▲":"▼"} ₹${Math.abs(Math.round(pnlPerGram*entry.grams)).toLocaleString("en-IN")} P&L` : "";
                        return [` ₹${ctx.parsed.y.toLocaleString("en-IN")}/g · ${entry.grams}g`, pnlStr].filter(Boolean);
                      },
                    },
                  },
                },
                scales: {
                  x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 11 } } },
                  y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 11 }, callback: (v) => `₹${Number(v).toLocaleString("en-IN")}` } },
                },
              };

              return <Line data={data} options={options} style={{ maxHeight: 260 }} />;
            })()}
          </CardBody>
        </Card>
      )}

      <Card style={cardStyle}>
        <CardHeader style={{ ...headerStyle, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <CardTitle tag="h4" style={{ color: "#fff", fontWeight: 800, margin: 0, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
              <i className="tim-icons icon-coins mr-2" style={{ color: "#fbbf24" }} />
              Gold Savings
            </CardTitle>
            <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.78rem", margin: "4px 0 0", lineHeight: 1.4 }}>Track every gram you own</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button type="button" className="btn-amber-outline" onClick={() => navigate("/admin/gold-savings/add")} style={{ padding: "7px 16px", fontSize: "0.83rem" }}>
              <i className="tim-icons icon-simple-add mr-1" /> Add Entry
            </Button>
          </div>
        </CardHeader>

        <CardBody style={{ padding: "1rem", background: "rgba(0,0,0,0.14)" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <i className="tim-icons icon-refresh-02" style={{ fontSize: "2rem", color: "#f59e0b", animation: "goldSpin 0.9s linear infinite", display: "inline-block" }} />
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <i className="tim-icons icon-coins" style={{ fontSize: "3rem", color: accentAmber, opacity: 0.45, display: "block", marginBottom: 12 }} />
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem", marginBottom: 6, fontWeight: 600 }}>No gold savings entries yet</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem", marginBottom: 20 }}>Start tracking your gold portfolio</div>
              <Button type="button" className="btn-amber-outline" onClick={() => navigate("/admin/gold-savings/add")}>
                <i className="tim-icons icon-simple-add mr-1" /> Add First Entry
              </Button>
            </div>
          ) : (() => {
              // Group entries by year for yearly section headers
              const groups = {};
              entries.forEach(e => {
                const yr = new Date(e.date).getFullYear();
                if (!groups[yr]) groups[yr] = [];
                groups[yr].push(e);
              });
              const years = Object.keys(groups).sort((a, b) => b - a);

              let globalIdx = 0;
              let runningGrams = 0;

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {years.map(yr => (
                    <div key={yr}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                        <span style={{ color: "rgba(251,191,36,0.9)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: 1.5, background: "rgba(255,160,46,0.1)", border: "1px solid rgba(255,160,46,0.25)", borderRadius: 6, padding: "2px 10px" }}>
                          {yr} · {groups[yr].reduce((s,e)=>s+e.grams,0).toFixed(3)}g · ₹{groups[yr].reduce((s,e)=>s+e.grams*e.pricePerGram,0).toLocaleString("en-IN",{maximumFractionDigits:0})}
                        </span>
                        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {groups[yr].map((entry) => {
                          const absIdx = globalIdx++;
                          runningGrams += entry.grams;
                          const totalVal   = entry.grams * entry.pricePerGram;
                          const ratePerGram = (entry.pricePerGram / entry.grams).toFixed(0);
                          const currentVal = livePrice ? Math.round(entry.grams * livePrice.pricePerGram24k) : null;
                          const pnl = currentVal !== null ? currentVal - Math.round(totalVal) : null;
                          const isProfit = pnl !== null && pnl >= 0;
                          const entryRate  = parseFloat(ratePerGram);
                          const isBest  = ratesOnPage.length > 1 && entryRate === bestRate;
                          const isWorst = ratesOnPage.length > 1 && entryRate === worstRate;
                          const snapGrams = runningGrams;

                          return (
                            <div key={entry._id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", boxShadow: "0 0 0 1px rgba(255,160,46,0.04) inset" }}>
                              <div style={{ display: "flex", alignItems: "stretch" }}>
                                <div style={{ width: 44, background: "rgba(255,160,46,0.08)", borderRight: "1px solid rgba(255,160,46,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0", flexShrink: 0 }}>
                                  <i className="tim-icons icon-coins" style={{ color: "#fbbf24", fontSize: "0.9rem", marginBottom: 3, opacity: 0.85 }} />
                                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.6rem", fontWeight: 700 }}>#{(page-1)*PAGE_SIZE+absIdx+1}</span>
                                </div>
                                <div style={{ flex: 1, padding: "10px 12px" }}>
                                  <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 5 }}>
                                    <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{entry.grams.toFixed(3)}<span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400, fontSize: "0.76rem", marginLeft: 2 }}>g</span></span>
                                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.76rem" }}>{format(new Date(entry.date),"dd MMM yyyy")}</span>
                                    {isBest && <span style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, padding: "1px 5px", color: "rgba(255,255,255,0.55)", fontSize: "0.58rem", fontWeight: 700 }}>BEST</span>}
                                    {isWorst && <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 5px", color: "rgba(255,255,255,0.35)", fontSize: "0.58rem", fontWeight: 700 }}>HIGH</span>}
                                  </div>
                                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                                    <span style={{ background: "rgba(255,160,46,0.1)", border: "1px solid rgba(255,160,46,0.28)", borderRadius: 5, padding: "2px 7px", color: "#fbbf24", fontSize: "0.7rem", fontWeight: 700 }}>₹{Number(ratePerGram).toLocaleString("en-IN")}/g</span>
                                    <span style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 7px", color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", textTransform: "capitalize" }}>{entry.paymentType.replace("_"," ")}</span>
                                    <span style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 5, padding: "2px 7px", color: "rgba(255,255,255,0.3)", fontSize: "0.7rem" }}>∑ {snapGrams.toFixed(3)}g</span>
                                    {entry.notes && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", fontStyle: "italic" }}>{entry.notes.length>50?entry.notes.slice(0,50)+"…":entry.notes}</span>}
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", padding: "10px 12px", gap: 3, borderLeft: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                                  <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: "1rem" }}>₹{totalVal.toLocaleString("en-IN",{maximumFractionDigits:0})}</div>
                                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.66rem" }}>paid</div>
                                  {pnl !== null && <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{isProfit?"▲":"▼"} ₹{Math.abs(pnl).toLocaleString("en-IN")}</div>}
                                </div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, padding: "5px 10px 7px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                <button type="button" onClick={() => navigate(`/admin/gold-savings/edit/${entry._id}`)} title="Edit" style={{ background: "rgba(255,160,46,0.12)", border: "1px solid rgba(255,160,46,0.3)", borderRadius: 5, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fbbf24" }}><i className="tim-icons icon-pencil" style={{ fontSize: "0.65rem" }} /></button>
                                <button type="button" onClick={() => setDeleteId(entry._id)} title="Delete" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 5, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#f87171" }}><i className="tim-icons icon-simple-remove" style={{ fontSize: "0.65rem" }} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

          {/* Pagination */}
          {totalEntries > PAGE_SIZE && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalEntries)} of {totalEntries} entries
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {[{label:"«",fn:()=>setPage(1),dis:page===1},{label:"‹ Prev",fn:()=>setPage(p=>p-1),dis:page===1}].map(({label,fn,dis})=>
                  <button type="button" key={label} onClick={fn} disabled={dis} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"6px 10px",color:dis?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.65)",cursor:dis?"default":"pointer",fontSize:"0.78rem" }}>{label}</button>
                )}
                {Array.from({length:Math.ceil(totalEntries/PAGE_SIZE)},(_,i)=>i+1)
                  .filter(p=>p===1||p===Math.ceil(totalEntries/PAGE_SIZE)||Math.abs(p-page)<=1)
                  .reduce((acc,p,idx,arr)=>{if(idx>0&&p-arr[idx-1]>1)acc.push("…");acc.push(p);return acc;},[])
                  .map((p,idx)=>p==="…"?<span key={`dots-${idx}`} style={{color:"rgba(255,255,255,0.2)",padding:"4px 3px",fontSize:"0.78rem"}}>…</span>:
                    <button type="button" key={p} onClick={()=>setPage(p)} style={{background:p===page?"rgba(255,160,46,0.15)":"transparent",border:`1px solid ${p===page?"rgba(255,160,46,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:8,padding:"6px 10px",minWidth:32,color:p===page?"#fbbf24":"rgba(255,255,255,0.5)",fontWeight:p===page?700:500,cursor:"pointer",fontSize:"0.78rem"}}>{p}</button>
                  )}
                {[{label:"Next ›",fn:()=>setPage(p=>p+1),dis:page*PAGE_SIZE>=totalEntries},{label:"»",fn:()=>setPage(Math.ceil(totalEntries/PAGE_SIZE)),dis:page*PAGE_SIZE>=totalEntries}].map(({label,fn,dis})=>
                  <button type="button" key={label} onClick={fn} disabled={dis} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"6px 10px",color:dis?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.65)",cursor:dis?"default":"pointer",fontSize:"0.78rem" }}>{label}</button>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={!!deleteId} toggle={() => setDeleteId(null)} centered size="sm" contentClassName="gold-savings-modal-content border-0">
        <ModalBody style={{ padding: 0, color: "#fff" }}>
          <div style={{ ...headerStyle, textAlign: "center", padding: "1.25rem 1.5rem 1rem" }}>
            <i className="tim-icons icon-simple-remove" style={{ fontSize: "2.25rem", color: "rgba(251,191,36,0.85)", marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>Delete Entry?</div>
          </div>
          <div style={{ textAlign: "center", padding: "0 1.75rem 1.75rem", background: "rgba(0,0,0,0.14)" }}>
            <div style={{ color: "rgba(255,255,255,0.42)", fontSize: "0.85rem", marginBottom: 20, lineHeight: 1.45 }}>This action cannot be undone.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Button type="button" className="btn-cancel-outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button type="button" color="danger" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={goalModalOpen} toggle={() => setGoalModalOpen(false)} centered size="sm" contentClassName="gold-savings-modal-content border-0">
        <ModalBody style={{ padding: 0, color: "#fff" }}>
          <div style={{ ...headerStyle, padding: "1.1rem 1.35rem" }}>
            <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: "1.02rem", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="tim-icons icon-trophy" style={{ fontSize: "1.1rem" }} />
              Set Gold Goal
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", margin: "8px 0 0", lineHeight: 1.45 }}>How many grams are you aiming to accumulate?</p>
          </div>
          <div style={{ padding: "1.35rem 1.5rem 1.5rem", background: "rgba(0,0,0,0.14)" }}>
            <label htmlFor="gold-goal-input" style={labelStyle}>Target (grams)</label>
            <input id="gold-goal-input" type="number" min="1" value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="e.g. 10" style={{ ...inputStyle, width: "100%", marginBottom: 14 }} onKeyDown={e => e.key === "Enter" && saveGoal()} />
            {goalGrams > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 4, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #fbbf24, #e8890c)", width: `${Math.min(100,(summary.totalGrams/goalGrams)*100)}%` }} />
                </div>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.7rem", marginTop: 4 }}>Currently at {summary.totalGrams.toFixed(3)}g of {goalGrams}g goal</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <Button type="button" className="btn-cancel-outline" onClick={() => setGoalModalOpen(false)} style={{ flex: 1 }}>Cancel</Button>
              {goalGrams > 0 && <Button type="button" className="btn-cancel-outline" onClick={() => { setGoalGrams(0); localStorage.removeItem("goldGoalGrams"); setGoalModalOpen(false); }}>Clear</Button>}
              <Button type="button" className="btn-amber-outline" onClick={saveGoal} style={{ flex: 1 }}>Save</Button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}

export default GoldSavings;
