import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card, CardHeader, CardBody, CardTitle, Row, Col, Modal, ModalBody,
  Button, Label, Input,
} from "reactstrap";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format, parseISO } from "date-fns";
import { getLandPlanMonths, formatLakhs, LAND_PLAN_MONTHS_COUNT } from "../data/landPlan";
import api from "../config/axios";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const accent = "#2dd4bf";
const accentAmber = "#FFA02E";

const cardStyle = {
  background: "linear-gradient(165deg, #18181c 0%, #141416 50%, #121214 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  boxShadow: "0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(45,212,191,0.06) inset",
  overflow: "hidden",
};

const headerStyle = {
  background: "linear-gradient(90deg, rgba(45,212,191,0.08) 0%, transparent 55%)",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  padding: "1rem clamp(0.85rem, 3vw, 1.15rem)",
};

const inputDark = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "#fff",
};

/** Bootstrap 4 + reactstrap 9: built-in Alert close uses BS5 `.btn-close` and breaks here */
function FlashBanner({ variant, children, onDismiss }) {
  const palette =
    variant === "success"
      ? { bg: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.38)", color: "#BBF7D0" }
      : { bg: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.38)", color: "#FCA5A5" };
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 10,
        background: palette.bg,
        border: palette.border,
        color: palette.color,
      }}
    >
      <span style={{ fontSize: "0.9rem", fontWeight: 500, lineHeight: 1.45, flex: "1 1 auto" }}>{children}</span>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{
            flexShrink: 0,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "inherit",
            borderRadius: 8,
            width: 32,
            height: 32,
            padding: 0,
            cursor: "pointer",
            fontSize: "1.25rem",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.92,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function rupee(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `\u20B9${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Mint for freed cash / target amounts in plan copy */
const PLAN_HIGHLIGHT = "#5eead4";

function highlightRupeeTokens(text) {
  const s = String(text);
  const re = /(\+₹[\d,]+(?:\s+freed)?|₹[\d,]+)/gi;
  const nodes = [];
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) nodes.push(<span key={`t-${k++}`}>{s.slice(last, m.index)}</span>);
    nodes.push(
      <span key={`t-${k++}`} style={{ color: PLAN_HIGHLIGHT, fontWeight: 700 }}>
        {m[1]}
      </span>
    );
    last = re.lastIndex;
  }
  if (last < s.length) nodes.push(<span key={`t-${k++}`}>{s.slice(last)}</span>);
  return nodes.length ? nodes : s;
}

/** Em dash (—): first clause neutral, second clause highlight (e.g. +₹… freed) */
function PlanRichText({ text, headline }) {
  const baseColor = headline ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.52)";
  const baseWeight = headline ? 600 : 400;
  const parts = String(text).split(/\s*\u2014\s*/);
  if (parts.length >= 2) {
    const tail = parts.slice(1).join(" \u2014 ");
    return (
      <span style={{ fontWeight: baseWeight, lineHeight: 1.55 }}>
        <span style={{ color: baseColor }}>{highlightRupeeTokens(parts[0])}</span>
        <span style={{ color: "rgba(255,255,255,0.32)" }}> — </span>
        <span style={{ color: PLAN_HIGHLIGHT, fontWeight: 700 }}>{highlightRupeeTokens(tail)}</span>
      </span>
    );
  }
  return (
    <span style={{ color: baseColor, fontWeight: baseWeight, lineHeight: 1.55 }}>{highlightRupeeTokens(text)}</span>
  );
}

function formatRecordedAt(iso) {
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "dd MMM yyyy · HH:mm");
  } catch {
    return "—";
  }
}

function mergeProgress(planMonths, savedRows) {
  const byIdx = {};
  (savedRows || []).forEach((r) => {
    byIdx[r.planMonthIndex] = r;
  });
  let actualCum = 0;
  return planMonths.map((m) => {
    const saved = byIdx[m.planMonthIndex];
    const transferEntries = Array.isArray(saved?.entries) ? saved.entries : [];
    const amount =
      saved != null && saved.amountTransferred != null && !Number.isNaN(Number(saved.amountTransferred))
        ? Number(saved.amountTransferred)
        : null;
    if (amount != null && !Number.isNaN(amount)) actualCum += amount;
    return {
      ...m,
      savedId: saved?._id,
      amountTransferred: amount,
      transferEntries,
      notes: saved?.notes || "",
      actualCumulative: actualCum,
      monthVariance: amount != null ? amount - m.target : null,
    };
  });
}

function currentPlanMonthIndex(planMonths) {
  const now = new Date();
  const i = planMonths.findIndex(
    (m) => m.year === now.getFullYear() && m.monthIndex0 === now.getMonth()
  );
  if (i >= 0) return planMonths[i].planMonthIndex;
  const first = planMonths[0];
  const start = new Date(first.year, first.monthIndex0, 1);
  if (now < start) return first.planMonthIndex;
  const last = planMonths[planMonths.length - 1];
  const end = new Date(last.year, last.monthIndex0 + 1, 0, 23, 59, 59, 999);
  if (now > end) return last.planMonthIndex;
  return null;
}

export default function LandSavings() {
  const planMonths = useMemo(() => getLandPlanMonths(), []);
  const [savedRows, setSavedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalPlanMonthIndex, setModalPlanMonthIndex] = useState(null);
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState(null);

  const enriched = useMemo(() => mergeProgress(planMonths, savedRows), [planMonths, savedRows]);
  const modalRow = useMemo(
    () => enriched.find((r) => r.planMonthIndex === modalPlanMonthIndex) ?? null,
    [enriched, modalPlanMonthIndex]
  );
  const highlightIdx = currentPlanMonthIndex(planMonths);

  const totals = useMemo(() => {
    const final = enriched[enriched.length - 1];
    const plannedTotal = final?.plannedCumulative || 0;
    const actualTotal = final?.actualCumulative || 0;
    return { plannedTotal, actualTotal, gap: plannedTotal - actualTotal };
  }, [enriched]);

  const chartData = useMemo(() => {
    const labels = enriched.map((m) => m.monthShort);
    return {
      labels,
      datasets: [
        {
          label: "Planned cumulative",
          data: enriched.map((m) => m.plannedCumulative),
          borderColor: "rgba(45,212,191,0.9)",
          backgroundColor: "rgba(45,212,191,0.06)",
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
        {
          label: "Your cumulative",
          data: enriched.map((m) => m.actualCumulative),
          borderColor: "rgba(251,191,36,0.95)",
          backgroundColor: "rgba(251,191,36,0.04)",
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [enriched]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: { color: "rgba(255,255,255,0.45)", font: { size: 11 }, boxWidth: 12, padding: 10 },
      },
      tooltip: {
        backgroundColor: "#18181c",
        borderColor: "rgba(45,212,191,0.2)",
        borderWidth: 1,
        titleColor: "rgba(255,255,255,0.9)",
        bodyColor: "rgba(255,255,255,0.55)",
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: \u20B9${Number(ctx.raw).toLocaleString("en-IN")}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "rgba(255,255,255,0.35)", maxRotation: 45, font: { size: 9 }, autoSkip: true, maxTicksLimit: 12 },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: {
          color: "rgba(255,255,255,0.35)",
          callback: (v) => `${(Number(v) / 100000).toFixed(2)}L`,
        },
      },
    },
  };

  const fetchSaved = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/land-savings");
      if (res.data.success) setSavedRows(res.data.data || []);
      else setSavedRows([]);
    } catch {
      setError("Could not load land savings progress.");
      setSavedRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const openModal = (row) => {
    setModalPlanMonthIndex(row.planMonthIndex);
    setFormAmount("");
    setFormNotes("");
    setDeletingEntryId(null);
    setError("");
    setSuccess("");
  };

  const closeModal = () => {
    setModalPlanMonthIndex(null);
    setFormAmount("");
    setFormNotes("");
    setDeletingEntryId(null);
  };

  const handleAppendTransfer = async () => {
    if (!modalRow) return;
    const amt = parseFloat(formAmount);
    if (formAmount.trim() === "" || Number.isNaN(amt)) {
      setError("Enter the transfer amount.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await api.post(`/api/land-savings/month/${modalRow.planMonthIndex}/entries`, {
        amount: amt,
        notes: formNotes.trim(),
      });
      setSuccess("Transfer saved.");
      setFormAmount("");
      setFormNotes("");
      fetchSaved();
    } catch {
      setError("Could not save transfer. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHistoryEntry = async (entryId) => {
    if (!modalRow || !entryId) return;
    try {
      setDeletingEntryId(entryId);
      setError("");
      await api.delete(`/api/land-savings/month/${modalRow.planMonthIndex}/entries/${entryId}`);
      setSuccess("Removed from history.");
      fetchSaved();
    } catch {
      setError("Could not remove that entry.");
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleClearMonth = async () => {
    if (!modalRow) return;
    try {
      setSaving(true);
      setError("");
      await api.delete(`/api/land-savings/month/${modalRow.planMonthIndex}`);
      setSuccess("Month cleared.");
      closeModal();
      fetchSaved();
    } catch {
      setError("Could not clear this month.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content" style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .land-month-card { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .land-month-card.is-current { border-color: rgba(45,212,191,0.35) !important; box-shadow: 0 0 0 1px rgba(45,212,191,0.15) inset; }
      ` }} />

      {(success || (error && modalPlanMonthIndex == null)) && (
        <Row className="mb-3">
          <Col xs="12">
            {success ? (
              <FlashBanner variant="success" onDismiss={() => setSuccess("")}>
                {success}
              </FlashBanner>
            ) : null}
            {!success && error && modalPlanMonthIndex == null ? (
              <FlashBanner variant="danger" onDismiss={() => setError("")}>
                {error}
              </FlashBanner>
            ) : null}
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        <Col xs="12">
          <Card style={{ ...cardStyle, marginBottom: 0 }}>
            <CardHeader style={headerStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "linear-gradient(145deg, rgba(45,212,191,0.22) 0%, rgba(45,212,191,0.06) 100%)",
                    border: "1px solid rgba(45,212,191,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className="tim-icons icon-world" style={{ fontSize: "1.15rem", color: accent }} />
                </div>
                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                  <CardTitle tag="h4" style={{ color: "#fff", fontWeight: 800, marginBottom: 6, fontSize: "1.15rem" }}>
                    Land savings — Krishnagiri
                  </CardTitle>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", lineHeight: 1.5, maxWidth: 720 }}>
                    <strong style={{ color: "rgba(255,255,255,0.7)" }}>Monthly progress tracker.</strong>{" "}
                    Check every month on salary day. Compare target vs cumulative. Your journey to land ownership (
                    {LAND_PLAN_MONTHS_COUNT} months).
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody style={{ padding: "1.15rem clamp(0.85rem, 3vw, 1.35rem)", background: "rgba(0,0,0,0.14)" }}>
              <Row>
                {[
                  { label: "Plan total (end)", value: rupee(totals.plannedTotal), sub: formatLakhs(totals.plannedTotal) + " cumulative target", color: accent },
                  { label: "Your cumulative (end)", value: rupee(totals.actualTotal), sub: formatLakhs(totals.actualTotal), color: accentAmber },
                  { label: "Gap to plan", value: rupee(Math.abs(totals.gap)), sub: totals.gap === 0 ? "On target" : totals.gap > 0 ? "Behind plan" : "Ahead of plan", color: totals.gap > 0 ? "#f87171" : "#6ee7b7" },
                ].map((s) => (
                  <Col xs="12" md="4" key={s.label} className="mb-3 mb-md-0">
                    <div
                      style={{
                        background: "#16161a",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 14,
                        padding: "1rem 1.1rem",
                        borderTop: `2px solid ${s.color}`,
                      }}
                    >
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</div>
                      <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff", marginTop: 6 }}>{s.value}</div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.32)", marginTop: 4 }}>{s.sub}</div>
                    </div>
                  </Col>
                ))}
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col xs="12">
          <Card style={{ ...cardStyle, marginBottom: 0 }}>
            <CardHeader style={headerStyle}>
              <CardTitle tag="h5" style={{ color: "#fff", margin: 0, fontWeight: 800, fontSize: "0.95rem" }}>
                Planned vs your cumulative
              </CardTitle>
            </CardHeader>
            <CardBody style={{ padding: "0.75rem 1rem 1rem", background: "rgba(0,0,0,0.14)" }}>
              {loading ? (
                <div className="text-center py-5" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
              ) : (
                <Line data={chartData} options={chartOptions} style={{ maxHeight: 280 }} />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xs="12">
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Month details &amp; action
          </div>
          {enriched.map((m) => {
            const isCurrent = highlightIdx === m.planMonthIndex;
            return (
              <Card
                key={m.planMonthIndex}
                className={`land-month-card mb-3 ${isCurrent ? "is-current" : ""}`}
                style={{
                  ...cardStyle,
                  border: `1px solid ${isCurrent ? "rgba(45,212,191,0.28)" : "rgba(255,255,255,0.07)"}`,
                }}
              >
                <CardBody style={{ padding: "1rem clamp(0.8rem, 2.5vw, 1.2rem)", background: "rgba(0,0,0,0.1)" }}>
                  <Row className="align-items-start">
                    <Col xs="12" lg="7">
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontWeight: 800, color: "#fff", fontSize: "1.02rem" }}>{m.monthLong}</span>
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                          Month {m.planMonthIndex} of {LAND_PLAN_MONTHS_COUNT}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(45,212,191,0.15)", color: accent, border: "1px solid rgba(45,212,191,0.35)" }}>
                            This month
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: accent, fontWeight: 700, marginBottom: 6 }}>
                        {m.phase} · {m.phaseLabel}
                      </div>
                      <div style={{ fontSize: "0.88rem", marginBottom: 8 }}>
                        <PlanRichText text={m.headline} headline />
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", lineHeight: 1.5, listStylePosition: "outside" }}>
                        {m.bullets.map((b, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>
                            <PlanRichText text={b} headline={false} />
                          </li>
                        ))}
                      </ul>
                    </Col>
                    <Col xs="12" lg="5" className="mt-3 mt-lg-0">
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                          background: "rgba(0,0,0,0.2)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>Monthly target</div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fca5a5", marginTop: 4 }}>{rupee(m.target)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>Plan cumulative</div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: accent, marginTop: 4 }}>{rupee(m.plannedCumulative)}</div>
                          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{formatLakhs(m.plannedCumulative)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>You transferred</div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: m.amountTransferred != null ? accentAmber : "rgba(255,255,255,0.25)", marginTop: 4 }}>
                            {m.amountTransferred != null ? rupee(m.amountTransferred) : "—"}
                          </div>
                          {m.monthVariance != null && (
                            <div style={{ fontSize: "0.68rem", marginTop: 2, color: m.monthVariance >= 0 ? "#6ee7b7" : "#f87171" }}>
                              {m.monthVariance >= 0 ? "+" : ""}
                              {rupee(m.monthVariance)} vs target
                            </div>
                          )}
                          {(m.transferEntries?.length || 0) > 1 && (
                            <div style={{ fontSize: "0.65rem", marginTop: 6, color: "rgba(255,255,255,0.32)", fontWeight: 600 }}>
                              {m.transferEntries.length} separate transfers · total above
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>Your cumulative</div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: accentAmber, marginTop: 4 }}>{rupee(m.actualCumulative)}</div>
                          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{formatLakhs(m.actualCumulative)}</div>
                        </div>
                      </div>
                      <Button
                        className="mt-3 btn-amber-outline"
                        style={{ width: "100%", borderColor: "rgba(45,212,191,0.35)", color: accent }}
                        onClick={() => openModal(m)}
                      >
                        <i className="tim-icons icon-pencil mr-2" style={{ fontSize: "0.75rem" }} />
                        {m.amountTransferred != null ? "Manage transfers" : "Log transfer"}
                      </Button>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            );
          })}
        </Col>
      </Row>

      <Modal isOpen={modalPlanMonthIndex != null} toggle={closeModal} centered size="lg" contentClassName="border-0" style={{ maxWidth: 560 }}>
        <ModalBody style={{ background: "linear-gradient(165deg, #18181c 0%, #141416 100%)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.35rem 1.5rem", color: "#fff" }}>
          {modalRow && (
            <>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 4 }}>{modalRow.monthLong}</div>
              <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                Month {modalRow.planMonthIndex} · Target {rupee(modalRow.target)} · Plan cumulative {rupee(modalRow.plannedCumulative)} ({formatLakhs(modalRow.plannedCumulative)})
              </div>
              <div style={{ fontSize: "0.72rem", color: accentAmber, fontWeight: 700, marginBottom: 14 }}>
                Month-to-date total: {modalRow.amountTransferred != null ? rupee(modalRow.amountTransferred) : rupee(0)}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 8 }}>
                  Transfer history
                </div>
                {(modalRow.transferEntries?.length || 0) === 0 ? (
                  <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.28)", padding: "12px 10px", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.15)" }}>
                    No transfers logged yet for this month. Add one below.
                  </div>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" }}>
                    {(modalRow.transferEntries || []).map((e) => (
                      <div
                        key={e._id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "10px 12px",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: accentAmber, fontSize: "0.95rem" }}>{rupee(e.amount)}</div>
                          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{formatRecordedAt(e.recordedAt)}</div>
                          {e.notes ? (
                            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: 6, lineHeight: 1.4 }}>{e.notes}</div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          aria-label="Remove transfer"
                          onClick={() => handleDeleteHistoryEntry(e._id)}
                          disabled={saving || deletingEntryId === e._id}
                          style={{
                            flexShrink: 0,
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.35)",
                            color: "#fca5a5",
                            borderRadius: 8,
                            padding: "4px 10px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            cursor: saving ? "default" : "pointer",
                            opacity: saving ? 0.5 : 1,
                          }}
                        >
                          {deletingEntryId === e._id ? "…" : "Remove"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    marginBottom: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.14)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    color: "#FCA5A5",
                    fontSize: "0.85rem",
                    lineHeight: 1.45,
                  }}
                >
                  {error}
                </div>
              )}
              <div className="mb-3">
                <Label style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>
                  Add another transfer (₹)
                </Label>
                <Input type="number" step="1" value={formAmount} onChange={(ev) => setFormAmount(ev.target.value)} style={inputDark} placeholder="Amount moved to land fund" />
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.32)", marginTop: 6 }}>
                  Each save adds a line to history. The monthly total is the sum of all lines for this month.
                </div>
              </div>
              <div className="mb-4">
                <Label style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Notes (optional)</Label>
                <Input type="textarea" rows={2} value={formNotes} onChange={(ev) => setFormNotes(ev.target.value)} style={inputDark} placeholder="Salary slice, FD, bonus…" />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <Button
                    color="primary"
                    style={{ background: accent, border: "none", color: "#0f172a", fontWeight: 700 }}
                    onClick={handleAppendTransfer}
                    disabled={saving || !!deletingEntryId}
                  >
                    {saving ? "Saving…" : "Add transfer"}
                  </Button>
                  <Button outline style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }} onClick={closeModal} disabled={saving || !!deletingEntryId}>
                    Close
                  </Button>
                </div>
                {modalRow.amountTransferred != null && (
                  <Button outline color="danger" onClick={handleClearMonth} disabled={saving || !!deletingEntryId}>
                    Clear entire month
                  </Button>
                )}
              </div>
            </>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}
