import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col, Button, Modal, ModalBody, Alert, Collapse,
} from "reactstrap";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import api from "../config/axios";

/** Red monochrome ramp by bar index: largest amounts first (sorted slices) → darkest red … pale rose (donut-style single hue). */
function redRampCategoryBarStyles(barCount) {
  const fills = [];
  const hovers = [];
  const rDark = 118;
  const gDark = 10;
  const bDark = 18;
  const rLight = 253;
  const gLight = 216;
  const bLight = 219;

  for (let i = 0; i < barCount; i++) {
    const u = barCount <= 1 ? 0 : i / (barCount - 1);
    const r = Math.round(rDark + (rLight - rDark) * u);
    const g = Math.round(gDark + (gLight - gDark) * u);
    const b = Math.round(bDark + (bLight - bDark) * u);
    fills.push(`rgba(${r},${g},${b},0.92)`);
    hovers.push(`rgba(${Math.min(255, r + 16)},${Math.min(255, g + 14)},${Math.min(255, b + 12)},0.98)`);
  }
  return { fills, hovers };
}

/** ₹ labels on horizontal category bars (inside bar when wide enough, else beside). */
const categoryBarSpendLabelsPlugin = {
  id: "categoryBarSpendLabels",
  afterDatasetsDraw(chart) {
    const opts = chart.options.plugins?.categoryBarSpendLabels;
    if (opts?.enabled === false || chart.options.indexAxis !== "y") return;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets?.[0]?.data;
    if (!meta?.data?.length || !values?.length) return;
    const ctx = chart.ctx;
    const { chartArea } = chart;
    const nBars = meta.data.length;
    meta.data.forEach((bar, i) => {
      if (!bar || bar.hidden || bar.skip) return;
      const paleRatio = nBars <= 1 ? 0 : i / (nBars - 1);
      const paleBar = paleRatio >= 0.55;
      const v = Number(values[i]) || 0;
      const text = `\u20B9${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
      const left = Math.min(bar.base, bar.x);
      const right = Math.max(bar.base, bar.x);
      const cy = bar.y;
      const bw = right - left;
      ctx.save();
      ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(text).width;
      const gap = 8;
      if (bw >= tw + gap * 2) {
        ctx.textAlign = "right";
        ctx.fillStyle = paleBar ? "rgba(88,12,18,0.95)" : "rgba(255,255,255,0.94)";
        ctx.fillText(text, right - gap, cy);
      } else if (right + tw + gap <= chartArea.right - 2) {
        ctx.textAlign = "left";
        ctx.fillStyle = paleBar ? "rgba(255,245,246,0.88)" : "rgba(255,255,255,0.72)";
        ctx.fillText(text, right + gap, cy);
      } else {
        ctx.textAlign = "right";
        ctx.fillStyle = paleBar ? "rgba(255,235,237,0.82)" : "rgba(255,255,255,0.72)";
        ctx.fillText(text, Math.max(chartArea.left + tw + gap, left - gap), cy);
      }
      ctx.restore();
    });
  },
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarController,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  categoryBarSpendLabelsPlugin,
);

const accentAmber = "#FFA02E";

const PIE_MAX_SLICES = 10;

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

const dateInputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#fff",
  padding: "6px 10px",
  fontSize: "0.78rem",
  colorScheme: "dark",
};

const amberChip = (active) => ({
  padding: "4px 11px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
  background: active ? "rgba(255,160,46,0.14)" : "transparent",
  border: `1px solid ${active ? "rgba(255,160,46,0.35)" : "rgba(255,255,255,0.1)"}`,
  color: active ? "#fbbf24" : "rgba(255,255,255,0.45)",
});

const PRESETS = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "3m", label: "3M" },
  { key: "6m",         label: "6M" },
  { key: "custom",     label: "Custom" },
];

function applyPreset(key) {
  const now = new Date();
  if (key === "this_month") return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
  if (key === "last_month") {
    const lm = subMonths(now, 1);
    return { from: format(startOfMonth(lm), "yyyy-MM-dd"), to: format(endOfMonth(lm), "yyyy-MM-dd") };
  }
  if (key === "3m")  return { from: format(subMonths(now, 3), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
  if (key === "6m")  return { from: format(subMonths(now, 6), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
  return { from: "", to: "" };
}

const PAGE_SIZE = 25;

/** Match backend: explicit type, else category "Savings" (trimmed) when type is missing. */
function rowEffectiveType(e) {
  if (e.type === "savings") return "savings";
  if (e.type === "expense") return "expense";
  const c = (e.category || "").trim().toLowerCase();
  if (c === "savings") return "savings";
  return "expense";
}

function Expenses() {
  const navigate = useNavigate();
  const [entries, setEntries]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [summary, setSummary]         = useState(null);
  const [deleteId, setDeleteId]       = useState(null);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  const [activePreset, setActivePreset] = useState("this_month");
  const [filterFrom, setFilterFrom]   = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterTo, setFilterTo]       = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterType, setFilterType]   = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showCustom, setShowCustom]   = useState(false);
  const [dailyChartOpen, setDailyChartOpen] = useState(false);
  const [categoryChartOpen, setCategoryChartOpen] = useState(false);

  const bumpChartsAfterExpand = () => {
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    setTimeout(() => window.dispatchEvent(new Event("resize")), 320);
  };

  const chartCollapseHeaderKeys = (e, setOpen) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    }
  };

  const handlePreset = (key) => {
    setActivePreset(key);
    setPage(1);
    if (key !== "custom") {
      const { from, to } = applyPreset(key);
      setFilterFrom(from);
      setFilterTo(to);
      setShowCustom(false);
    } else {
      setShowCustom(true);
    }
  };

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (filterFrom) params.from = filterFrom;
      if (filterTo)   params.to   = filterTo;
      if (filterType) params.type = filterType;
      if (filterCategory) params.category = filterCategory;
      const res = await api.get("/api/expenses", { params });
      if (res.data.success) {
        setEntries(res.data.data);
        setTotal(res.data.total || 0);
      }
    } catch { setError("Failed to load entries."); }
    finally { setLoading(false); }
  }, [page, filterFrom, filterTo, filterType, filterCategory]);

  const fetchSummary = useCallback(async () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await api.get("/api/expenses/summary", { params: { months: 1, timezone: tz } });
      if (res.data.success) setSummary(res.data.data);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchSummary();
  }, [fetchEntries, fetchSummary]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/expenses/${deleteId}`);
      setSuccess("Entry deleted.");
      setDeleteId(null);
      fetchEntries();
      fetchSummary();
    } catch {
      setError("Failed to delete entry.");
      setDeleteId(null);
    }
  };

  const filteredExpenseTotal = useMemo(() => entries.filter(e => rowEffectiveType(e) === "expense").reduce((s, e) => s + e.amount, 0), [entries]);
  const filteredSavingsTotal = useMemo(() => entries.filter(e => rowEffectiveType(e) === "savings").reduce((s, e) => s + e.amount, 0), [entries]);

  const chartData = useMemo(() => {
    if (!summary?.dailyExpenseData?.length) return null;
    const dd = summary.dailyExpenseData;
    return {
      labels: dd.map(d => d.label),
      datasets: [
        {
          label: "Expenses",
          data: dd.map(d => d.expense),
          borderColor: "rgba(248,113,113,0.72)",
          backgroundColor: "rgba(248,113,113,0.07)",
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "rgba(248,113,113,0.82)",
          pointBorderColor: "rgba(255,255,255,0.35)",
          pointBorderWidth: 1,
        },
      ],
    };
  }, [summary]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: "rgba(255,255,255,0.4)", font: { size: 11 }, boxWidth: 12, padding: 12 } },
      tooltip: {
        backgroundColor: "rgba(24,24,30,0.92)",
        borderColor: "rgba(255,255,255,0.14)",
        borderWidth: 1,
        titleColor: "rgba(255,255,255,0.88)",
        bodyColor: "rgba(255,255,255,0.52)",
        callbacks: { label: ctx => ` ₹${(ctx.parsed?.y ?? ctx.raw).toLocaleString("en-IN")}` },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: {
          color: "rgba(255,255,255,0.35)",
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 16,
        },
      },
      y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 11 }, callback: v => `\u20B9${Number(v).toLocaleString("en-IN")}` } },
    },
  };

  const categoryBarSlices = useMemo(() => {
    const rows = summary?.topCategories;
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const sorted = [...rows].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
    const head = sorted.slice(0, PIE_MAX_SLICES);
    const tail = sorted.slice(PIE_MAX_SLICES);
    const otherTotal = tail.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const slices = head.map((r) => ({
      label: (r._id && String(r._id).trim()) ? String(r._id).trim() : "Uncategorized",
      total: Number(r.total) || 0,
    }));
    if (otherTotal > 0) slices.push({ label: "Other", total: otherTotal });
    return slices;
  }, [summary]);

  const categoryBarHeight = useMemo(() => {
    const n = categoryBarSlices.length;
    if (!n) return 280;
    return Math.min(560, Math.max(240, 56 + n * 44));
  }, [categoryBarSlices.length]);

  const categoryBarMax = useMemo(() => {
    if (!categoryBarSlices.length) return 1;
    const totals = categoryBarSlices.map((s) => Math.max(0, Number(s.total) || 0));
    return Math.max(...totals, 1);
  }, [categoryBarSlices]);

  const categoryBarData = useMemo(() => {
    if (!categoryBarSlices.length) return null;
    const totals = categoryBarSlices.map((s) => s.total);
    const { fills, hovers } = redRampCategoryBarStyles(totals.length);
    return {
      labels: categoryBarSlices.map((s) => s.label),
      datasets: [
        {
          label: "Spent",
          data: totals,
          backgroundColor: fills,
          borderWidth: 0,
          borderRadius: 0,
          borderSkipped: false,
          hoverBackgroundColor: hovers,
          hoverBorderWidth: 0,
          maxBarThickness: 34,
          barPercentage: 0.88,
          categoryPercentage: 0.94,
        },
      ],
    };
  }, [categoryBarSlices]);

  const categoryBarOptions = useMemo(() => {
    const maxVal = categoryBarMax;
    return {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { left: 6, right: 18, top: 8, bottom: 8 },
      },
      plugins: {
        legend: { display: false },
        categoryBarSpendLabels: {
          enabled: true,
        },
        tooltip: {
          backgroundColor: "rgba(28,26,34,0.92)",
          borderColor: "rgba(255,255,255,0.14)",
          borderWidth: 1,
          titleColor: "rgba(255,255,255,0.9)",
          bodyColor: "rgba(255,255,255,0.58)",
          callbacks: {
            title: (items) => (items[0]?.label ? String(items[0].label) : ""),
            label: (ctx) => {
              const v = Number(ctx.parsed?.x ?? ctx.raw) || 0;
              const vsTop = maxVal ? ((v / maxVal) * 100).toFixed(1) : "0";
              const arr = ctx.chart?.data?.datasets?.[0]?.data || [];
              const sum = arr.reduce((a, x) => a + Number(x), 0);
              const pctAll = sum ? ((v / sum) * 100).toFixed(1) : "0";
              return ` ₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })} · ${vsTop}% of top · ${pctAll}% of shown total`;
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: maxVal,
          stacked: false,
          grid: { color: "rgba(255,255,255,0.055)", drawBorder: false },
          ticks: {
            color: "rgba(255,255,255,0.36)",
            font: { size: 10 },
            maxTicksLimit: 8,
            callback: (value) => `\u20B9${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
          },
        },
        y: {
          stacked: false,
          grid: { display: false, drawBorder: false },
          ticks: {
            color: "rgba(255,255,255,0.88)",
            font: { size: 11 },
            autoSkip: false,
            padding: 10,
          },
        },
      },
      elements: {
        bar: {
          borderRadius: 4,
        },
      },
      interaction: {
        mode: "index",
        axis: "y",
        intersect: false,
      },
    };
  }, [categoryBarMax]);

  const thisMonthExpense = summary?.thisMonth?.expense?.total || 0;
  const lastMonthExpense = summary?.lastMonth?.expense?.total || 0;
  const expenseDelta = thisMonthExpense - lastMonthExpense;
  const expenseDeltaPct = lastMonthExpense > 0 ? ((expenseDelta / lastMonthExpense) * 100).toFixed(1) : null;

  return (
    <div className="content expenses-page-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes expFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes expSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .exp-section { animation: expFadeUp 0.35s ease both; }
        .exp-section:nth-child(2) { animation-delay: 0.05s; }
        .exp-stat-value { font-size: clamp(1.35rem, 5.5vw, 1.85rem) !important; word-break: break-word; }
        .expenses-page-root .dash-summary-stat-row .card { margin-bottom: 0 !important; }
        @media (max-width: 991.98px) {
          .expenses-page-root .dash-summary-stat-col { margin-bottom: 16px !important; }
          .expenses-page-root .dash-summary-stat-row > .dash-summary-stat-col:last-child { margin-bottom: 0 !important; }
        }
        .expenses-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
        .expenses-table-wrap table { min-width: 640px; }
        .expenses-modal-content.modal-content {
          background: linear-gradient(165deg, #18181c 0%, #141416 50%, #121214 100%);
          border: 1px solid rgba(255,255,255,0.07) !important;
          border-radius: 16px !important;
          box-shadow: 0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,160,46,0.06) inset;
          overflow: hidden;
        }
        .exp-charts-row > [class*="col-"] {
          min-width: 0;
        }
        .exp-glass-chart-well {
          background: linear-gradient(145deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 42%, rgba(0,0,0,0.2) 100%);
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 14px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 40px rgba(0,0,0,0.22);
        }
        @supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
          .exp-glass-chart-well {
            -webkit-backdrop-filter: blur(16px);
            backdrop-filter: blur(16px);
          }
        }
        .exp-category-bar-wrap {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding: 6px 8px 8px;
          box-sizing: border-box;
          overflow-x: auto;
          overflow-y: hidden;
        }
        .exp-category-bar-wrap canvas {
          filter: drop-shadow(0 4px 14px rgba(0,0,0,0.35));
        }
        .exp-chart-collapse-header {
          cursor: pointer;
          user-select: none;
        }
        .exp-chart-collapse-header:focus-visible {
          outline: 2px solid rgba(251, 191, 36, 0.45);
          outline-offset: 2px;
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

      <Row className="mb-3 mb-lg-4 dash-summary-stat-row exp-section">
        {[
          { icon: "icon-money-coins", label: "This Month Expenses", value: `\u20B9${thisMonthExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: `${summary?.thisMonth?.expense?.count || 0} entries · summed by txn date`, accent: "#ff5a5a" },
          {
            icon: "icon-time-alarm",
            label: "Last Month Expenses",
            value: `\u20B9${lastMonthExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
            sub: expenseDeltaPct !== null ? (
              <>
                <span style={{ color: expenseDelta <= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>
                  {expenseDelta <= 0 ? "\u25BC" : "\u25B2"} {Math.abs(expenseDeltaPct)}% {expenseDelta <= 0 ? "less" : "more"}
                </span>
                <span style={{ color: "rgba(255,255,255,0.32)" }}> this month</span>
              </>
            ) : null,
            accent: "#6366f1",
          },
          { icon: "icon-bank", label: "This Month Savings", value: `\u20B9${(summary?.thisMonth?.savings?.total || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: `${summary?.thisMonth?.savings?.count || 0} entries · summed by txn date`, accent: "#10b981" },
          { icon: "icon-chart-bar-32", label: "Top Category", value: summary?.topCategories?.[0]?._id || "\u2014", sub: summary?.topCategories?.[0] ? `\u20B9${summary.topCategories[0].total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : null, accent: accentAmber },
        ].map(({ icon, label, value, sub, accent }) => (
          <Col xs="12" sm="6" lg="3" className="mb-lg-0 dash-summary-stat-col" key={label}>
            <Card
              style={statCardShell(accent)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 6px 28px rgba(0,0,0,0.5), 0 0 24px ${accent}22`;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <CardBody style={{ padding: "1.4rem 1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.73rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {label}
                  </span>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}1a`, border: `1px solid ${accent}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`tim-icons ${icon}`} style={{ fontSize: "0.9rem", color: accent }} />
                  </div>
                </div>
                <div className="exp-stat-value" style={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  {value}
                </div>
                {sub && <div style={{ color: "rgba(255,255,255,0.28)", fontSize: "0.71rem", marginTop: 6 }}>{sub}</div>}
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="exp-section exp-charts-row">
        <Col xs="12" lg="7">
          <Card style={{ ...cardStyle, marginBottom: 20 }}>
            <CardHeader
              className="exp-chart-collapse-header"
              style={headerStyle}
              role="button"
              tabIndex={0}
              aria-expanded={dailyChartOpen}
              aria-controls="expenses-daily-chart-panel"
              onClick={() => setDailyChartOpen((v) => !v)}
              onKeyDown={(e) => chartCollapseHeaderKeys(e, setDailyChartOpen)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, width: "100%" }}>
                <CardTitle tag="h5" style={{ color: "#fff", margin: 0, fontSize: "0.98rem", fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "1 1 auto", minWidth: 0 }}>
                  <i className="tim-icons icon-chart-bar-32" style={{ color: "#fbbf24" }} />
                  <span>
                    Daily expenses
                    <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.38)", marginTop: 4, letterSpacing: "0.04em" }}>
                      {format(new Date(), "MMMM yyyy")} · expense entries only · click header to {dailyChartOpen ? "hide" : "show"} chart
                    </span>
                  </span>
                </CardTitle>
                <i className={`tim-icons ${dailyChartOpen ? "icon-minimal-up" : "icon-minimal-down"}`} style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.05rem", marginTop: 6, flexShrink: 0 }} aria-hidden />
              </div>
            </CardHeader>
            <Collapse isOpen={dailyChartOpen} onEntered={bumpChartsAfterExpand}>
              <CardBody id="expenses-daily-chart-panel" style={{ padding: "10px 12px 12px", background: "rgba(0,0,0,0.06)" }}>
                <div className="exp-glass-chart-well" style={{ padding: "12px 14px 10px" }}>
                  {chartData ? <Line data={chartData} options={chartOptions} style={{ maxHeight: 260 }} /> : <div style={{ textAlign: "center", color: "rgba(255,255,255,0.28)", padding: "2rem", fontSize: "0.85rem" }}>No data for this period</div>}
                </div>
              </CardBody>
            </Collapse>
          </Card>
        </Col>
        <Col xs="12" lg="5">
          <Card style={{ ...cardStyle, marginBottom: 20 }}>
            <CardHeader
              className="exp-chart-collapse-header"
              style={headerStyle}
              role="button"
              tabIndex={0}
              aria-expanded={categoryChartOpen}
              aria-controls="expenses-category-chart-panel"
              onClick={() => setCategoryChartOpen((v) => !v)}
              onKeyDown={(e) => chartCollapseHeaderKeys(e, setCategoryChartOpen)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, width: "100%" }}>
                <CardTitle tag="h5" style={{ color: "#fff", margin: 0, fontSize: "0.98rem", fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "1 1 auto", minWidth: 0 }}>
                  <i className="tim-icons icon-chart-bar-32" style={{ color: "#fbbf24" }} />
                  <span>
                    Expenses by category
                    <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.38)", marginTop: 4, letterSpacing: "0.04em" }}>
                      {format(new Date(), "MMMM yyyy")} · red ramp · darker = larger spend · top {PIE_MAX_SLICES} + Other · click header to {categoryChartOpen ? "hide" : "show"} chart
                    </span>
                  </span>
                </CardTitle>
                <i className={`tim-icons ${categoryChartOpen ? "icon-minimal-up" : "icon-minimal-down"}`} style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.05rem", marginTop: 6, flexShrink: 0 }} aria-hidden />
              </div>
            </CardHeader>
            <Collapse isOpen={categoryChartOpen} onEntered={bumpChartsAfterExpand}>
              <CardBody id="expenses-category-chart-panel" style={{ padding: "1rem 1rem 0.75rem", background: "rgba(0,0,0,0.08)" }}>
                {categoryBarData ? (
                  <div className="exp-glass-chart-well exp-category-bar-wrap" style={{ height: categoryBarHeight }}>
                    <Bar data={categoryBarData} options={categoryBarOptions} />
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.28)", padding: "2rem", fontSize: "0.85rem" }}>No expense categories this month</div>
                )}
              </CardBody>
            </Collapse>
          </Card>
        </Col>
      </Row>

      <Row className="exp-section">
        <Col xs="12">
          <Card style={cardStyle}>
            <CardHeader style={headerStyle}>
              <Row className="align-items-start align-items-md-center" style={{ marginLeft: 0, marginRight: 0 }}>
                <Col xs="12" md="7" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "linear-gradient(145deg, rgba(255,160,46,0.2) 0%, rgba(255,160,46,0.06) 100%)",
                        border: "1px solid rgba(255,160,46,0.28)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 4px 16px rgba(255,160,46,0.12)",
                      }}
                    >
                      <i className="tim-icons icon-notes" style={{ fontSize: "1rem", color: "#fbbf24" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <CardTitle tag="h4" style={{ color: "#fff", fontWeight: 800, margin: 0, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
                          Expenses
                        </CardTitle>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 6, background: "rgba(255,160,46,0.12)", color: "#fbbf24", border: "1px solid rgba(255,160,46,0.25)" }}>
                          Ledger
                        </span>
                      </div>
                      <p className="mb-0" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
                        Track your spending &amp; savings
                      </p>
                    </div>
                  </div>
                </Col>
                <Col xs="12" md="5" className="d-flex justify-content-md-end mt-3 mt-md-0" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <button type="button" onClick={() => navigate("/admin/expenses/add")} className="btn-amber-outline">
                    <i className="tim-icons icon-simple-add mr-1" />
                    Add Entry
                  </button>
                </Col>
              </Row>
            </CardHeader>

            <CardBody style={{ padding: "1.1rem clamp(0.85rem, 3vw, 1.35rem)", background: "rgba(0,0,0,0.14)" }}>
              <div style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Period</span>
                  {PRESETS.map(p => (
                    <button key={p.key} type="button" onClick={() => handlePreset(p.key)} style={{ ...amberChip(activePreset === p.key), fontSize: "0.72rem" }}>{p.label}</button>
                  ))}
                </div>
                {showCustom && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.72rem" }}>From</span>
                      <input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }} style={dateInputStyle} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.72rem" }}>To</span>
                      <input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }} style={dateInputStyle} />
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</span>
                  {[{ v: "", label: "All" }, { v: "expense", label: "Expense" }, { v: "savings", label: "Savings" }].map(opt => (
                    <button key={opt.v || "all"} type="button" onClick={() => { setFilterType(opt.v); setPage(1); }} style={{ ...amberChip(filterType === opt.v), fontSize: "0.71rem", padding: "3px 10px" }}>{opt.label}</button>
                  ))}
                  {filterCategory && (
                    <span style={{ background: "rgba(255,160,46,0.1)", border: "1px solid rgba(255,160,46,0.28)", borderRadius: 8, padding: "3px 10px", color: "#fbbf24", fontSize: "0.71rem", display: "flex", alignItems: "center", gap: 6 }}>
                      {filterCategory}
                      <button type="button" aria-label="Clear category" onClick={() => { setFilterCategory(""); setPage(1); }} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "0.85rem" }}>×</button>
                    </span>
                  )}
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "3rem" }}>
                  <i className="tim-icons icon-refresh-02" style={{ fontSize: "2.25rem", color: "#f59e0b", animation: "expSpin 0.9s linear infinite", display: "inline-block" }} />
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-5">
                  <i className="tim-icons icon-notes" style={{ fontSize: "3rem", color: accentAmber, marginBottom: "1rem", opacity: 0.45 }} />
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem", marginBottom: "0.5rem", fontWeight: 600 }}>No entries found</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Add your first expense or saving</div>
                  <button type="button" onClick={() => navigate("/admin/expenses/add")} className="btn-amber-outline">
                    <i className="tim-icons icon-simple-add mr-1" />
                    Add Entry
                  </button>
                </div>
              ) : (
                <div className="expenses-table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                    <thead>
                      <tr>
                        {["#", "Recorded", "Name", "Amount", "Category", ""].map((h, i) => (
                          <th key={i} style={{ padding: "11px 14px", color: "rgba(255,255,255,0.4)", fontWeight: 700, textAlign: i === 3 || i === 5 ? "right" : "left", whiteSpace: "nowrap", fontSize: "0.68rem", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, idx) => {
                        const isExpense = rowEffectiveType(entry) === "expense";
                        const amtColor = isExpense ? "#f87171" : "#6ee7b7";
                        return (
                          <tr
                            key={entry._id}
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s ease" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.28)", fontWeight: 600, width: 40 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                            <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", verticalAlign: "top" }}>
                              <div>{format(entry.createdAt ? new Date(entry.createdAt) : new Date(entry.date), "dd MMM yyyy")}</div>
                              {entry.createdAt ? (
                                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.32)", marginTop: 3, fontWeight: 600 }}>
                                  Txn · {format(new Date(entry.date), "dd MMM yyyy")}
                                </div>
                              ) : null}
                            </td>
                            <td style={{ padding: "11px 14px", color: "#fff", fontWeight: 700, fontSize: "0.88rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</td>
                            <td style={{ padding: "11px 14px", textAlign: "right", whiteSpace: "nowrap", color: amtColor, fontWeight: 800, fontSize: "0.9rem" }}>
                              {`${isExpense ? "−" : "+"}\u20B9${entry.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                            </td>
                            <td style={{ padding: "11px 14px" }}>
                              <button type="button" onClick={() => { setFilterCategory(entry.category); setPage(1); }} title="Filter by category" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 10px", color: "rgba(255,255,255,0.5)", fontSize: "0.68rem", cursor: "pointer", whiteSpace: "nowrap" }}>{entry.category}</button>
                            </td>
                            <td style={{ padding: "11px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <button type="button" onClick={() => navigate(`/admin/expenses/edit/${entry._id}`)} title="Edit" style={{ background: "rgba(255,160,46,0.12)", border: "1px solid rgba(255,160,46,0.3)", borderRadius: 8, width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fbbf24", marginRight: 6 }}>
                                <i className="tim-icons icon-pencil" style={{ fontSize: "0.7rem" }} />
                              </button>
                              <button type="button" onClick={() => setDeleteId(entry._id)} title="Delete" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#f87171" }}>
                                <i className="tim-icons icon-trash-simple" style={{ fontSize: "0.7rem" }} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {entries.length > 0 && (
                      <tfoot>
                        <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
                          <td colSpan={3} style={{ padding: "12px 14px", color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} entries
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                            {filteredExpenseTotal > 0 && <span style={{ color: "#f87171", fontWeight: 800 }}>{`−\u20B9${filteredExpenseTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}</span>}
                            {filteredExpenseTotal > 0 && filteredSavingsTotal > 0 && <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>·</span>}
                            {filteredSavingsTotal > 0 && <span style={{ color: "#6ee7b7", fontWeight: 800 }}>{`+\u20B9${filteredSavingsTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}</span>}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {total > PAGE_SIZE && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.78rem" }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[{ label: "«", fn: () => setPage(1), dis: page === 1 }, { label: "\u2039 Prev", fn: () => setPage(p => p - 1), dis: page === 1 }].map(({ label, fn, dis }) => (
                      <button key={label} type="button" onClick={fn} disabled={dis} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: dis ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)", cursor: dis ? "default" : "pointer", fontSize: "0.78rem" }}>{label}</button>
                    ))}
                    {Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === Math.ceil(total / PAGE_SIZE) || Math.abs(p - page) <= 1)
                      .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
                      .map((p, i) => p === "…"
                        ? <span key={`exp-${i}`} style={{ color: "rgba(255,255,255,0.2)", padding: "4px 3px", fontSize: "0.78rem" }}>…</span>
                        : (
                          <button key={p} type="button" onClick={() => setPage(p)} style={{ background: p === page ? "rgba(255,160,46,0.15)" : "transparent", border: `1px solid ${p === page ? "rgba(255,160,46,0.35)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "6px 10px", minWidth: 32, color: p === page ? "#fbbf24" : "rgba(255,255,255,0.45)", fontWeight: p === page ? 700 : 500, cursor: "pointer", fontSize: "0.78rem" }}>{p}</button>
                        ))}
                    {[{ label: "Next ›", fn: () => setPage(p => p + 1), dis: page * PAGE_SIZE >= total }, { label: "»", fn: () => setPage(Math.ceil(total / PAGE_SIZE)), dis: page * PAGE_SIZE >= total }].map(({ label, fn, dis }) => (
                      <button key={label} type="button" onClick={fn} disabled={dis} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: dis ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)", cursor: dis ? "default" : "pointer", fontSize: "0.78rem" }}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal isOpen={!!deleteId} toggle={() => setDeleteId(null)} centered size="sm" contentClassName="expenses-modal-content border-0">
        <ModalBody style={{ padding: 0, color: "#fff" }}>
          <div style={{ ...headerStyle, textAlign: "center", padding: "1.25rem 1.5rem 1rem" }}>
            <i className="tim-icons icon-simple-remove" style={{ fontSize: "2.25rem", color: "rgba(251,191,36,0.85)", marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>Delete Entry?</div>
          </div>
          <div style={{ textAlign: "center", padding: "0 1.75rem 1.75rem", background: "rgba(0,0,0,0.14)" }}>
            <div style={{ color: "rgba(255,255,255,0.42)", fontSize: "0.85rem", marginBottom: 20, lineHeight: 1.45 }}>This cannot be undone.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Button type="button" className="btn-cancel-outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button type="button" color="danger" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}

export default Expenses;
