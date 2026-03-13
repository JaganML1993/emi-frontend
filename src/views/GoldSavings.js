import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col, Button, Modal, ModalBody, Spinner,
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

const cardStyle = (accent) => ({
  background: `linear-gradient(135deg, ${accent}28 0%, ${accent}12 100%)`,
  border: `1px solid ${accent}55`,
  borderRadius: 14,
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  boxShadow: `0 4px 18px ${accent}25`,
});


const labelStyle = { color: "#CCCCCC", fontSize: "0.8rem", fontWeight: 500, marginBottom: 4 };

const inputStyle = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 8,
  color: "#FFFFFF",
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

  // Export entries to CSV
  const exportCSV = () => {
    const rows = [["Date", "Grams", "Amount Paid (₹)", "Rate/g (₹)", "Payment Type", "Notes"]];
    entries.forEach(e => {
      rows.push([
        format(new Date(e.date), "dd MMM yyyy"),
        e.grams.toFixed(3),
        (e.pricePerGram).toFixed(0),
        (e.pricePerGram / e.grams).toFixed(0),
        e.paymentType.replace("_", " "),
        `"${(e.notes || "").replace(/"/g, '""')}"`,
      ]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "gold-savings.csv"; a.click();
    URL.revokeObjectURL(url);
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

  const GOLD_ACCENT = "#FFD700";

  return (
    <div className="content">
      {error && (
        <div style={{ background: "rgba(229,57,53,0.15)", border: "1px solid rgba(229,57,53,0.4)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#FF6B6B", fontSize: "0.875rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <span style={{ cursor: "pointer", fontWeight: 700 }} onClick={() => setError("")}>✕</span>
        </div>
      )}
      {success && (
        <div style={{ background: "rgba(102,187,106,0.15)", border: "1px solid rgba(102,187,106,0.4)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#66BB6A", fontSize: "0.875rem", display: "flex", justifyContent: "space-between" }}>
          {success}
          <span style={{ cursor: "pointer", fontWeight: 700 }} onClick={() => setSuccess("")}>✕</span>
        </div>
      )}

      {/* Summary Cards */}
      <Row className="mb-3">
        <Col md="3">
          <Card style={cardStyle(GOLD_ACCENT)}>
            <CardBody style={{ padding: "1.4rem" }}>
              <div style={{ color: GOLD_ACCENT, fontSize: "0.85rem", fontWeight: 500, marginBottom: 8 }}>
                <i className="tim-icons icon-coins mr-1" /> Total Grams
              </div>
              <div style={{ color: "#FFFFFF", fontSize: "1.9rem", fontWeight: 700 }}>
                {summary.totalGrams.toFixed(3)} g
              </div>
              {/* Goal progress bar */}
              {goalGrams > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "#9a9a9a", fontSize: "0.68rem" }}>Goal: {goalGrams}g</span>
                    <span style={{ color: GOLD_ACCENT, fontSize: "0.68rem", fontWeight: 700 }}>
                      {Math.min(100, ((summary.totalGrams / goalGrams) * 100)).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,0.1)" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#FFD700,#FFA000)", width: `${Math.min(100, (summary.totalGrams / goalGrams) * 100)}%`, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ color: "#9a9a9a", fontSize: "0.68rem", marginTop: 3 }}>
                    {Math.max(0, goalGrams - summary.totalGrams).toFixed(3)}g remaining
                  </div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: goalGrams > 0 ? 8 : 4 }}>
                <span style={{ color: "#9a9a9a", fontSize: "0.72rem" }}>{summary.count} {summary.count === 1 ? "entry" : "entries"}</span>
                <button onClick={() => { setGoalInput(String(goalGrams || "")); setGoalModalOpen(true); }} style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 5, color: GOLD_ACCENT, fontSize: "0.65rem", padding: "2px 7px", cursor: "pointer" }}>
                  {goalGrams > 0 ? "Edit Goal" : "Set Goal"}
                </button>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card style={cardStyle("#66BB6A")}>
            <CardBody style={{ padding: "1.4rem" }}>
              <div style={{ color: "#66BB6A", fontSize: "0.85rem", fontWeight: 500, marginBottom: 8 }}>
                <i className="tim-icons icon-money-coins mr-1" /> Total Invested
              </div>
              <div style={{ color: "#FFFFFF", fontSize: "1.9rem", fontWeight: 700 }}>
                ₹{summary.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              {/* Avg buy vs live price */}
              {livePrice && summary.avgPricePerGram > 0 && (
                <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "#9a9a9a", fontSize: "0.68rem" }}>Avg buy</span>
                    <span style={{ color: "#CCCCCC", fontSize: "0.72rem", fontWeight: 600 }}>₹{Math.round(summary.avgPricePerGram).toLocaleString("en-IN")}/g</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "#9a9a9a", fontSize: "0.68rem" }}>Live 24K</span>
                    <span style={{ color: GOLD_ACCENT, fontSize: "0.72rem", fontWeight: 600 }}>₹{livePrice.pricePerGram24k.toLocaleString("en-IN")}/g</span>
                  </div>
                  {(() => {
                    const diff = livePrice.pricePerGram24k - Math.round(summary.avgPricePerGram);
                    const pct = ((diff / summary.avgPricePerGram) * 100).toFixed(1);
                    const up = diff >= 0;
                    return (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: up ? "#66BB6A" : "#FF6B6B" }}>
                          {up ? "▲" : "▼"} {up ? "+" : ""}{pct}% vs avg
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
              {!livePrice && <div style={{ color: "#9a9a9a", fontSize: "0.72rem", marginTop: 4 }}>Avg ₹{summary.avgPricePerGram.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/g</div>}
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card style={cardStyle("#F59E0B")}>
            <CardBody style={{ padding: "1.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ color: "#F59E0B", fontSize: "0.85rem", fontWeight: 500, marginBottom: 8 }}>
                  <i className="tim-icons icon-chart-bar-32 mr-1" /> Today's Gold Price
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {minutesSinceUpdate !== null && (
                    <span style={{ color: "#9a9a9a", fontSize: "0.62rem" }}>
                      {minutesSinceUpdate === 0 ? "just now" : `${minutesSinceUpdate}m ago`}
                    </span>
                  )}
                  {!priceLoading && (
                    <button onClick={fetchLivePrice} title="Refresh" style={{ background: "none", border: "none", color: "#9a9a9a", cursor: "pointer", padding: 0, fontSize: "0.8rem" }}>
                      ↻
                    </button>
                  )}
                </div>
              </div>
              {priceLoading ? (
                <div style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>Fetching live price…</div>
              ) : livePrice ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <div style={{ color: "#FFFFFF", fontSize: "1.9rem", fontWeight: 700 }}>
                      ₹{livePrice.pricePerGram24k.toLocaleString("en-IN")}
                      <span style={{ fontSize: "0.8rem", color: "#9a9a9a", fontWeight: 400, marginLeft: 4 }}>/g · 24K</span>
                    </div>
                    {livePrice.change24k !== null && (
                      <span style={{
                        fontSize: "0.78rem", fontWeight: 700,
                        color: livePrice.change24k >= 0 ? "#66BB6A" : "#FF6B6B",
                        background: livePrice.change24k >= 0 ? "rgba(102,187,106,0.12)" : "rgba(255,107,107,0.12)",
                        border: `1px solid ${livePrice.change24k >= 0 ? "rgba(102,187,106,0.3)" : "rgba(255,107,107,0.3)"}`,
                        borderRadius: 6, padding: "1px 7px"
                      }}>
                        {livePrice.change24k >= 0 ? "▲" : "▼"} ₹{Math.abs(livePrice.change24k).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#9a9a9a", fontSize: "0.72rem", marginTop: 4 }}>
                    22K ₹{livePrice.pricePerGram22k.toLocaleString("en-IN")}/g
                  </div>
                </>
              ) : (
                <div style={{ color: "#9a9a9a", fontSize: "0.82rem" }}>
                  Unable to fetch price.{" "}
                  <span onClick={fetchLivePrice} style={{ color: "#F59E0B", cursor: "pointer", textDecoration: "underline" }}>Retry</span>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          {(() => {
            const currentValue = livePrice && summary.totalGrams > 0
              ? Math.round(summary.totalGrams * livePrice.pricePerGram24k)
              : null;
            const pnl = currentValue !== null ? currentValue - Math.round(summary.totalValue) : null;
            const pnlPct = pnl !== null && summary.totalValue > 0
              ? ((pnl / summary.totalValue) * 100).toFixed(2)
              : null;
            const isProfit = pnl !== null && pnl >= 0;
            const accentColor = pnl === null ? "#A78BFA" : isProfit ? "#66BB6A" : "#FF6B6B";
            return (
              <Card style={cardStyle(accentColor)}>
                <CardBody style={{ padding: "1.4rem" }}>
                  <div style={{ color: accentColor, fontSize: "0.85rem", fontWeight: 500, marginBottom: 8 }}>
                    <i className="tim-icons icon-trophy mr-1" /> Current Value
                  </div>
                  {priceLoading || !livePrice ? (
                    <div style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>
                      {priceLoading ? "Calculating…" : "Price unavailable"}
                    </div>
                  ) : summary.totalGrams === 0 ? (
                    <div style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>No gold yet</div>
                  ) : (
                    <>
                      <div style={{ color: "#FFFFFF", fontSize: "1.9rem", fontWeight: 700 }}>
                        ₹{currentValue.toLocaleString("en-IN")}
                      </div>
                      {pnl !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                          <span style={{
                            fontSize: "0.82rem", fontWeight: 700,
                            color: isProfit ? "#66BB6A" : "#FF6B6B",
                            background: isProfit ? "rgba(102,187,106,0.12)" : "rgba(255,107,107,0.12)",
                            border: `1px solid ${isProfit ? "rgba(102,187,106,0.3)" : "rgba(255,107,107,0.3)"}`,
                            borderRadius: 6, padding: "2px 8px"
                          }}>
                            {isProfit ? "▲" : "▼"} ₹{Math.abs(pnl).toLocaleString("en-IN")}
                          </span>
                          <span style={{ color: isProfit ? "#66BB6A" : "#FF6B6B", fontSize: "0.78rem", fontWeight: 600 }}>
                            {isProfit ? "+" : ""}{pnlPct}%
                          </span>
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

      {/* Date Filter — controls both chart and entries */}
      <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 12 }}>
        {/* Row 1: preset buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
            <i className="tim-icons icon-calendar-60" style={{ color: "#FFD700", fontSize: "0.85rem" }} />
            <span style={{ color: "#FFD700", fontWeight: 600, fontSize: "0.8rem" }}>Period</span>
          </div>
          {PRESETS.map(p => {
            const active = activePreset === p.key;
            return (
              <button
                key={p.key}
                onClick={() => applyPreset(p)}
                style={{
                  padding: "5px 14px", borderRadius: 7, fontSize: "0.78rem", fontWeight: active ? 700 : 400, cursor: "pointer",
                  background: active ? "linear-gradient(135deg,#FFD700,#FFA000)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${active ? "#FFD700" : "rgba(255,255,255,0.12)"}`,
                  color: active ? "#1E1E1E" : "#9a9a9a",
                  transition: "all 0.15s ease",
                }}
              >{p.label}</button>
            );
          })}
          {(filterFrom || filterTo) && entries.length > 0 && (
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <span style={{ color: "#FFD700", fontWeight: 700, fontSize: "0.85rem" }}>{totalGramsFiltered.toFixed(3)} g</span>
              <span style={{ color: "#9a9a9a", fontSize: "0.75rem", marginLeft: 8 }}>₹{totalInvestedFiltered.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span style={{ color: "#9a9a9a", fontSize: "0.7rem" }}>Applies to chart &amp; entries</span>
        </div>
      </div>

      {/* Price Trend Chart */}
      {entries.length > 0 && (
        <Card style={{ background: "#1E1E1E", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 14, marginBottom: 24 }}>
          <CardHeader style={{ background: "rgba(255,215,0,0.06)", borderBottom: "1px solid rgba(255,215,0,0.15)", padding: "0.9rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <CardTitle tag="h5" style={{ color: "#FFD700", fontWeight: 600, margin: 0, fontSize: "0.95rem" }}>
              <i className="tim-icons icon-chart-bar-32 mr-2" style={{ color: "#FFD700" }} />
              Gold Price Trend — My Purchases
            </CardTitle>
            <span style={{ color: "#9a9a9a", fontSize: "0.75rem" }}>
              {filterFrom || filterTo
                ? `${filterFrom || "start"} → ${filterTo || "today"}`
                : "all time · ₹/gram"}
            </span>
          </CardHeader>
          <CardBody style={{ padding: "1.2rem 1.2rem 0.8rem", background: "#1E1E1E" }}>
            {(() => {
              const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
              const labels = sorted.map(e => format(new Date(e.date), "dd MMM yy"));
              const prices = sorted.map(e => parseFloat((e.pricePerGram / e.grams).toFixed(0)));
              const avgBuy = summary.avgPricePerGram > 0 ? Math.round(summary.avgPricePerGram) : null;

              if (livePrice) { labels.push("Live"); prices.push(livePrice.pricePerGram24k); }

              const mkGradient = (ctx, chartArea) => {
                if (!ctx || !chartArea) return "rgba(255,215,0,0.3)";
                const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                grad.addColorStop(0, "rgba(255,215,0,0.35)");
                grad.addColorStop(1, "rgba(255,215,0,0.02)");
                return grad;
              };

              const data = {
                labels,
                datasets: [
                  {
                    label: "Price/g",
                    data: prices,
                    borderColor: "#FFD700",
                    borderWidth: 2.5,
                    pointRadius: prices.map((_, i) => i === prices.length - 1 && livePrice ? 6 : 4),
                    pointBackgroundColor: prices.map((_, i) => i === prices.length - 1 && livePrice ? "#00BFFF" : "#FFD700"),
                    pointBorderColor: prices.map((_, i) => i === prices.length - 1 && livePrice ? "#00BFFF" : "#FFD700"),
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: (ctx) => {
                      const { chart } = ctx;
                      if (!chart.chartArea) return "rgba(255,215,0,0.1)";
                      return mkGradient(chart.ctx, chart.chartArea);
                    },
                  },
                  // Avg buy price dashed line
                  ...(avgBuy ? [{
                    label: "Avg Buy",
                    data: labels.map(() => avgBuy),
                    borderColor: "rgba(167,139,250,0.7)",
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
                  legend: {
                    display: true,
                    labels: { color: "#9a9a9a", font: { size: 11 }, boxWidth: 14, padding: 12 },
                  },
                  tooltip: {
                    backgroundColor: "rgba(30,30,30,0.95)",
                    borderColor: "rgba(255,215,0,0.4)",
                    borderWidth: 1,
                    titleColor: "#FFD700",
                    bodyColor: "#CCCCCC",
                    callbacks: {
                      label: (ctx) => {
                        if (ctx.datasetIndex === 1) return ` Avg Buy: ₹${ctx.parsed.y.toLocaleString("en-IN")}/g`;
                        const idx = ctx.dataIndex;
                        const isLive = livePrice && idx === prices.length - 1;
                        if (isLive) return ` Live: ₹${ctx.parsed.y.toLocaleString("en-IN")}/g`;
                        const entry = sorted[idx];
                        if (!entry) return ` ₹${ctx.parsed.y.toLocaleString("en-IN")}/g`;
                        const pnlPerGram = livePrice ? livePrice.pricePerGram24k - ctx.parsed.y : null;
                        const pnlStr = pnlPerGram !== null
                          ? `  ${pnlPerGram >= 0 ? "▲" : "▼"} ₹${Math.abs(Math.round(pnlPerGram * entry.grams)).toLocaleString("en-IN")} P&L`
                          : "";
                        return [` ₹${ctx.parsed.y.toLocaleString("en-IN")}/g · ${entry.grams}g`, pnlStr].filter(Boolean);
                      },
                    },
                  },
                },
                scales: {
                  x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9a9a9a", font: { size: 11 } } },
                  y: {
                    grid: { color: "rgba(255,255,255,0.05)" },
                    ticks: { color: "#9a9a9a", font: { size: 11 }, callback: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
                  },
                },
              };

              return <Line data={data} options={options} style={{ maxHeight: 260 }} />;
            })()}
          </CardBody>
        </Card>
      )}

      {/* Main Card */}
      <Card style={{ background: "#1E1E1E", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 14 }}>
        <CardHeader style={{ background: "rgba(255,215,0,0.08)", borderBottom: "1px solid rgba(255,215,0,0.2)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <CardTitle tag="h4" style={{ color: "#FFD700", fontWeight: 600, margin: 0, fontSize: "1.1rem" }}>
              <i className="tim-icons icon-coins mr-2" style={{ color: "#FFD700" }} />
              Gold Savings
            </CardTitle>
            <p style={{ color: "#9a9a9a", fontSize: "0.78rem", margin: "2px 0 0" }}>
              Track every gram you own
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {entries.length > 0 && (
              <button
                onClick={exportCSV}
                title="Export to CSV"
                style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 9, padding: "7px 14px", color: "#FFD700", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              >
                <i className="tim-icons icon-cloud-download-93" style={{ fontSize: "0.85rem" }} /> CSV
              </button>
            )}
            <Button
              onClick={() => navigate("/admin/gold-savings/add")}
              style={{ background: "linear-gradient(135deg, #FFD700, #FFA000)", border: "none", borderRadius: 9, padding: "8px 18px", fontWeight: 700, color: "#1E1E1E", fontSize: "0.85rem", boxShadow: "0 3px 12px rgba(255,215,0,0.35)" }}
            >
              <i className="tim-icons icon-simple-add mr-1" /> Add Entry
            </Button>
          </div>
        </CardHeader>

        <CardBody style={{ padding: "1rem", background: "#1E1E1E" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <Spinner style={{ color: "#FFD700" }} />
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <i className="tim-icons icon-coins" style={{ fontSize: "3rem", color: "#FFD700", opacity: 0.3, display: "block", marginBottom: 12 }} />
              <div style={{ color: "#CCCCCC", fontSize: "1rem", marginBottom: 6 }}>No gold savings entries yet</div>
              <div style={{ color: "#888", fontSize: "0.85rem", marginBottom: 20 }}>Start tracking your gold portfolio</div>
              <Button
                onClick={() => navigate("/admin/gold-savings/add")}
                style={{ background: "linear-gradient(135deg,#FFD700,#FFA000)", border: "none", borderRadius: 9, padding: "8px 20px", fontWeight: 700, color: "#1E1E1E" }}
              >
                <i className="tim-icons icon-simple-add mr-1" /> Add First Entry
              </Button>
            </div>
          ) : (() => {
              // Group entries by year for yearly section headers
              const groups = {};
              let cumGrams = (page - 1) * PAGE_SIZE > 0 ? 0 : 0; // will accumulate as we render
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
                      {/* Year separator */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(255,215,0,0.15)" }} />
                        <span style={{ color: "#FFD700", fontSize: "0.72rem", fontWeight: 700, letterSpacing: 1.5, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 6, padding: "2px 10px" }}>
                          {yr} · {groups[yr].reduce((s, e) => s + e.grams, 0).toFixed(3)}g · ₹{groups[yr].reduce((s, e) => s + e.grams * e.pricePerGram, 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                        <div style={{ flex: 1, height: 1, background: "rgba(255,215,0,0.15)" }} />
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
                            <div
                              key={entry._id}
                              style={{
                                background: "linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                                border: `1px solid ${isBest ? "rgba(102,187,106,0.35)" : isWorst ? "rgba(255,107,107,0.3)" : "rgba(255,215,0,0.18)"}`,
                                borderRadius: 12,
                                overflow: "hidden",
                                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                              }}
                            >
                              {/* Top row */}
                              <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>

                                {/* Left accent + entry number */}
                                <div style={{ width: 48, background: "rgba(255,215,0,0.1)", borderRight: "1px solid rgba(255,215,0,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 0", flexShrink: 0 }}>
                                  <i className="tim-icons icon-coins" style={{ color: "#FFD700", fontSize: "1rem", marginBottom: 4 }} />
                                  <span style={{ color: "#FFD700", fontSize: "0.65rem", fontWeight: 700, opacity: 0.6 }}>#{(page - 1) * PAGE_SIZE + absIdx + 1}</span>
                                </div>

                                {/* Centre */}
                                <div style={{ flex: 1, padding: "12px 14px" }}>
                                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                                    <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1.15rem" }}>
                                      {entry.grams.toFixed(3)}
                                      <span style={{ color: "#FFD700", fontWeight: 500, fontSize: "0.8rem", marginLeft: 3 }}>g</span>
                                    </span>
                                    <span style={{ color: "#9a9a9a", fontSize: "0.78rem" }}>
                                      {format(new Date(entry.date), "dd MMM yyyy")}
                                    </span>
                                    {/* Best / Worst badge */}
                                    {isBest && <span style={{ background: "rgba(102,187,106,0.15)", border: "1px solid rgba(102,187,106,0.4)", borderRadius: 5, padding: "1px 6px", color: "#66BB6A", fontSize: "0.62rem", fontWeight: 700 }}>BEST BUY</span>}
                                    {isWorst && <span style={{ background: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.35)", borderRadius: 5, padding: "1px 6px", color: "#FF6B6B", fontSize: "0.62rem", fontWeight: 700 }}>HIGHEST</span>}
                                  </div>

                                  {/* Tags row */}
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                    <span style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 6, padding: "2px 8px", color: "#FFD700", fontSize: "0.72rem", fontWeight: 600 }}>
                                      ₹{Number(ratePerGram).toLocaleString("en-IN")}/g
                                    </span>
                                    <span style={{ background: "rgba(0,191,255,0.08)", border: "1px solid rgba(0,191,255,0.2)", borderRadius: 6, padding: "2px 8px", color: "#00BFFF", fontSize: "0.72rem", textTransform: "capitalize" }}>
                                      {entry.paymentType.replace("_", " ")}
                                    </span>
                                    {/* Cumulative grams running total */}
                                    <span style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 6, padding: "2px 8px", color: "#A78BFA", fontSize: "0.72rem" }}>
                                      ∑ {snapGrams.toFixed(3)}g
                                    </span>
                                    {entry.notes && (
                                      <span style={{ color: "#9a9a9a", fontSize: "0.75rem", fontStyle: "italic" }}>
                                        {entry.notes.length > 50 ? entry.notes.slice(0, 50) + "…" : entry.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right: value + P&L */}
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", padding: "12px 14px", gap: 4, borderLeft: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                                  <div style={{ color: GOLD_ACCENT, fontWeight: 700, fontSize: "1.05rem" }}>
                                    ₹{totalVal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                  </div>
                                  <div style={{ color: "#9a9a9a", fontSize: "0.68rem" }}>paid</div>
                                  {pnl !== null && (
                                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: isProfit ? "#66BB6A" : "#FF6B6B" }}>
                                      {isProfit ? "▲" : "▼"} ₹{Math.abs(pnl).toLocaleString("en-IN")}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Bottom action bar */}
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "6px 12px 8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                <button
                                  onClick={() => navigate(`/admin/gold-savings/edit/${entry._id}`)}
                                  title="Edit"
                                  style={{ background: "rgba(0,191,255,0.1)", border: "1px solid rgba(0,191,255,0.25)", borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#00BFFF" }}
                                >
                                  <i className="tim-icons icon-pencil" style={{ fontSize: "0.75rem" }} />
                                </button>
                                <button
                                  onClick={() => setDeleteId(entry._id)}
                                  title="Delete"
                                  style={{ background: "rgba(229,57,53,0.1)", border: "1px solid rgba(229,57,53,0.25)", borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FF6B6B" }}
                                >
                                  <i className="tim-icons icon-simple-remove" style={{ fontSize: "0.75rem" }} />
                                </button>
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
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "5px 10px", color: page === 1 ? "#555" : "#9a9a9a", cursor: page === 1 ? "default" : "pointer", fontSize: "0.8rem" }}
                >«</button>
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "5px 12px", color: page === 1 ? "#555" : "#9a9a9a", cursor: page === 1 ? "default" : "pointer", fontSize: "0.8rem" }}
                >‹ Prev</button>

                {/* Page number buttons */}
                {Array.from({ length: Math.ceil(totalEntries / PAGE_SIZE) }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === Math.ceil(totalEntries / PAGE_SIZE) || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) => p === "…" ? (
                    <span key={`dots-${idx}`} style={{ color: "#555", padding: "5px 4px", fontSize: "0.8rem" }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        background: p === page ? "linear-gradient(135deg,#FFD700,#FFA000)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${p === page ? "#FFD700" : "rgba(255,255,255,0.12)"}`,
                        borderRadius: 7, padding: "5px 10px", minWidth: 32,
                        color: p === page ? "#1E1E1E" : "#9a9a9a",
                        fontWeight: p === page ? 700 : 400,
                        cursor: "pointer", fontSize: "0.8rem"
                      }}
                    >{p}</button>
                  ))
                }

                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * PAGE_SIZE >= totalEntries}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "5px 12px", color: page * PAGE_SIZE >= totalEntries ? "#555" : "#9a9a9a", cursor: page * PAGE_SIZE >= totalEntries ? "default" : "pointer", fontSize: "0.8rem" }}
                >Next ›</button>
                <button
                  onClick={() => setPage(Math.ceil(totalEntries / PAGE_SIZE))}
                  disabled={page * PAGE_SIZE >= totalEntries}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "5px 10px", color: page * PAGE_SIZE >= totalEntries ? "#555" : "#9a9a9a", cursor: page * PAGE_SIZE >= totalEntries ? "default" : "pointer", fontSize: "0.8rem" }}
                >»</button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteId} toggle={() => setDeleteId(null)} centered size="sm">
        <ModalBody style={{ background: "#1E1E1E", textAlign: "center", padding: "2rem" }}>
          <i className="tim-icons icon-simple-remove" style={{ fontSize: "2.5rem", color: "#FF6B6B", marginBottom: 12, display: "block" }} />
          <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1rem", marginBottom: 8 }}>Delete Entry?</div>
          <div style={{ color: "#9a9a9a", fontSize: "0.85rem", marginBottom: 20 }}>This action cannot be undone.</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Button onClick={() => setDeleteId(null)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#9a9a9a" }}>Cancel</Button>
            <Button onClick={handleDelete} style={{ background: "linear-gradient(135deg, rgba(229,57,53,0.9), rgba(255,82,82,0.8))", border: "none", borderRadius: 8, color: "#FFFFFF", fontWeight: 700 }}>Delete</Button>
          </div>
        </ModalBody>
      </Modal>

      {/* Goal Tracker Modal */}
      <Modal isOpen={goalModalOpen} toggle={() => setGoalModalOpen(false)} centered size="sm">
        <ModalBody style={{ background: "#1E1E1E", padding: "2rem" }}>
          <div style={{ color: "#FFD700", fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>
            <i className="tim-icons icon-trophy mr-2" />Set Gold Goal
          </div>
          <div style={{ color: "#9a9a9a", fontSize: "0.8rem", marginBottom: 16 }}>
            How many grams are you aiming to accumulate?
          </div>
          <input
            type="number"
            min="1"
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            placeholder="e.g. 10"
            style={{ ...inputStyle, width: "100%", marginBottom: 16 }}
            onKeyDown={e => e.key === "Enter" && saveGoal()}
          />
          {goalGrams > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#FFD700,#FFA000)", width: `${Math.min(100, (summary.totalGrams / goalGrams) * 100)}%` }} />
              </div>
              <div style={{ color: "#9a9a9a", fontSize: "0.72rem", marginTop: 4 }}>
                Currently at {summary.totalGrams.toFixed(3)}g of {goalGrams}g goal
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={() => setGoalModalOpen(false)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#9a9a9a", flex: 1 }}>Cancel</Button>
            {goalGrams > 0 && (
              <Button onClick={() => { setGoalGrams(0); localStorage.removeItem("goldGoalGrams"); setGoalModalOpen(false); }} style={{ background: "rgba(229,57,53,0.15)", border: "1px solid rgba(229,57,53,0.3)", borderRadius: 8, color: "#FF6B6B" }}>Clear</Button>
            )}
            <Button onClick={saveGoal} style={{ background: "linear-gradient(135deg,#FFD700,#FFA000)", border: "none", borderRadius: 8, color: "#1E1E1E", fontWeight: 700, flex: 1 }}>Save</Button>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}

export default GoldSavings;
