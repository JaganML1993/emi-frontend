import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
} from "reactstrap";
import { Line } from "react-chartjs-2";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import api from "../config/axios";

const emptyForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  notes: "",
};

const accentAmber = "#FFA02E";

const filterInputStyle = {
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
};

const modalLabelStyle = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const modalInputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  borderRadius: 10,
};

const modalCloseBtn = (onClick) => (
  <button type="button" className="close text-white" onClick={onClick} style={{ opacity: 0.75 }}>
    &times;
  </button>
);

function HouseSavings() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const isInitialHouseSavingsLoad = useRef(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [goal, setGoal] = useState(0);
  const [chartMode, setChartMode] = useState("cumulative");
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const fetchUserRole = useCallback(async () => {
    try {
      const res = await api.get("/api/auth/me");
      if (res.data.success && res.data.user) {
        setIsSuperAdmin(res.data.user.role === "super_admin");
      }
    } catch {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      setIsSuperAdmin(stored?.role === "super_admin");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await api.get("/api/users");
      setUsers(res.data.data || []);
    } catch {
      setUsers([]);
    }
  }, [isSuperAdmin]);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let fromDate = null;
    let toDate = null;
    if (dateFilter === "this_month") {
      fromDate = format(startOfMonth(now), "yyyy-MM-dd");
      toDate = format(endOfMonth(now), "yyyy-MM-dd");
    } else if (dateFilter === "last_3_months") {
      fromDate = format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd");
      toDate = format(endOfMonth(now), "yyyy-MM-dd");
    } else if (dateFilter === "this_year") {
      fromDate = format(startOfYear(now), "yyyy-MM-dd");
      toDate = format(endOfYear(now), "yyyy-MM-dd");
    } else if (dateFilter === "custom" && customFrom && customTo) {
      fromDate = customFrom;
      toDate = customTo;
    }
    return { fromDate, toDate };
  }, [dateFilter, customFrom, customTo]);

  const fetchGoal = useCallback(async () => {
    try {
      const params = isSuperAdmin && selectedUserId ? `?userId=${selectedUserId}` : "";
      const res = await api.get(`/api/house-savings/goal${params}`);
      if (res.data.success) setGoal(res.data.goal || 0);
    } catch {
      setGoal(0);
    }
  }, [isSuperAdmin, selectedUserId]);

  const fetchEntries = useCallback(async () => {
    try {
      if (isInitialHouseSavingsLoad.current) setLoading(true);
      const { fromDate, toDate } = getDateRange();
      const params = new URLSearchParams();
      if (isSuperAdmin && selectedUserId) params.set("userId", selectedUserId);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      params.set("sortBy", "date");
      params.set("sortOrder", "desc");
      params.set("page", page);
      params.set("limit", pageSize);
      const res = await api.get(`/api/house-savings?${params.toString()}`);
      setEntries(res.data.data || []);
      setTotalEntries(res.data.total ?? res.data.data?.length ?? 0);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Failed to load house savings");
      setEntries([]);
    } finally {
      setLoading(false);
      isInitialHouseSavingsLoad.current = false;
    }
  }, [isSuperAdmin, selectedUserId, getDateRange, page, pageSize]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  useEffect(() => {
    if (isSuperAdmin) fetchUsers();
  }, [isSuperAdmin, fetchUsers]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, customFrom, customTo, selectedUserId]);

  const handleRefresh = useCallback(() => {
    setError("");
    setSuccess("");
    fetchEntries();
    fetchGoal();
  }, [fetchEntries, fetchGoal]);

  const handleSetGoal = async () => {
    const val = parseFloat(goalInput);
    if (isNaN(val) || val < 0) {
      setError("Please enter a valid goal amount");
      return;
    }
    try {
      const payload = { goal: val };
      if (isSuperAdmin && selectedUserId) payload.userId = selectedUserId;
      await api.put("/api/house-savings/goal", payload);
      setGoal(val);
      setGoalModalOpen(false);
      setGoalInput("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to set goal");
    }
  };

  const totalPages = Math.ceil(totalEntries / pageSize) || 1;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditId(null);
    setFormData({
      ...emptyForm,
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (entry) => {
    setEditId(entry._id);
    setFormData({
      date: format(new Date(entry.date), "yyyy-MM-dd"),
      amount: entry.amount || "",
      notes: entry.notes || "",
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        date: formData.date,
        amount: parseFloat(formData.amount) || 0,
        notes: formData.notes,
      };
      if (editId) {
        await api.put(`/api/house-savings/${editId}`, payload);
        setSuccess("Savings updated successfully");
      } else {
        const addPayload = isSuperAdmin && selectedUserId ? { ...payload, userId: selectedUserId } : payload;
        await api.post("/api/house-savings", addPayload);
        setSuccess("Savings added successfully");
      }
      fetchEntries();
      setTimeout(closeModal, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/house-savings/${deleteConfirm._id}`);
      setSuccess("Savings entry deleted");
      setDeleteConfirm(null);
      fetchEntries();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const goalProgress = goal > 0 ? Math.min(100, (totalAmount / goal) * 100) : 0;
  const viewingUser = isSuperAdmin && selectedUserId ? users.find((u) => u._id === selectedUserId) : null;

  const chartData = useMemo(() => {
    if (!entries.length) return null;
    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sorted.map((e) => format(new Date(e.date), "dd MMM yy"));
    const data =
      chartMode === "cumulative"
        ? (() => {
            let t = 0;
            return sorted.map((e) => {
              t += Number(e.amount || 0);
              return t;
            });
          })()
        : sorted.map((e) => Number(e.amount || 0));
    return {
      labels,
      datasets: [
        {
          label: chartMode === "cumulative" ? "Cumulative" : "Amount",
          data,
          borderColor: "#fbbf24",
          backgroundColor: chartMode === "cumulative" ? "rgba(255,160,46,0.12)" : "rgba(255,160,46,0.06)",
          borderWidth: 2,
          tension: 0.4,
          fill: chartMode === "cumulative",
          pointBackgroundColor: "#141416",
          pointBorderColor: "#fbbf24",
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [entries, chartMode]);

  const chipBtn = (active) =>
    active
      ? {
          background: "rgba(255,160,46,0.14)",
          border: "1px solid rgba(255,160,46,0.35)",
          color: "#fbbf24",
          borderRadius: 8,
          padding: "4px 10px",
          fontSize: "0.72rem",
          fontWeight: 700,
          cursor: "pointer",
        }
      : {
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.4)",
          borderRadius: 8,
          padding: "4px 10px",
          fontSize: "0.72rem",
          fontWeight: 600,
          cursor: "pointer",
        };

  if (loading) {
    return (
      <div className="content">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <i
            className="tim-icons icon-refresh-02"
            style={{
              fontSize: "2.5rem",
              color: "#f59e0b",
              animation: "hsSpin 0.9s linear infinite",
              display: "inline-block",
            }}
          />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes hsSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return (
    <div className="content house-savings-page-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes hsFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hs-section { animation: hsFadeUp 0.35s ease both; }
        .hs-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
        .hs-table-wrap table { min-width: 520px; }
      `,
        }}
      />

      <Row className="hs-section">
        <Col xs="12">
          <Card
            style={{
              background: "linear-gradient(165deg, #18181c 0%, #141416 50%, #121214 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              boxShadow: "0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,160,46,0.06) inset",
              overflow: "hidden",
            }}
          >
            <CardHeader
              style={{
                background: "linear-gradient(90deg, rgba(255,160,46,0.08) 0%, transparent 55%)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                padding: "1.1rem clamp(0.85rem, 3vw, 1.35rem)",
              }}
            >
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
                      <i className="tim-icons icon-bank" style={{ fontSize: "1rem", color: "#fbbf24" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <CardTitle
                          tag="h4"
                          style={{
                            color: "#fff",
                            fontWeight: 800,
                            margin: 0,
                            fontSize: "1.05rem",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          House Savings
                        </CardTitle>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "rgba(255,160,46,0.12)",
                            color: "#fbbf24",
                            border: "1px solid rgba(255,160,46,0.25)",
                          }}
                        >
                          House fund
                        </span>
                      </div>
                      <p className="mb-0" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
                        Track deposits toward your home goal
                      </p>
                    </div>
                  </div>
                </Col>
                <Col xs="12" md="5" className="d-flex justify-content-md-end align-items-center flex-wrap mt-3 mt-md-0" style={{ paddingLeft: 0, paddingRight: 0, gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    title="Refresh"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 9,
                      padding: "8px 14px",
                      color: "rgba(255,255,255,0.65)",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <i className="tim-icons icon-refresh-02" />
                  </button>
                  <button type="button" onClick={openAddModal} className="btn-amber-outline">
                    <i className="tim-icons icon-simple-add mr-1" />
                    Add Savings
                  </button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody style={{ padding: "1.1rem clamp(0.85rem, 3vw, 1.35rem)", background: "rgba(0,0,0,0.14)" }}>
              {error && (
                <Alert
                  color="danger"
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    color: "#FCA5A5",
                    borderRadius: 10,
                  }}
                >
                  {error}
                </Alert>
              )}
              {success && (
                <Alert
                  color="success"
                  style={{
                    background: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    color: "#BBF7D0",
                    borderRadius: 10,
                  }}
                >
                  {success}
                </Alert>
              )}

              <div
                className="hs-filters-row mb-3"
                style={{
                  display: "flex",
                  flexWrap: "nowrap",
                  alignItems: "flex-end",
                  gap: "12px 14px",
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  paddingBottom: 2,
                  marginLeft: 0,
                  marginRight: 0,
                }}
              >
                {isSuperAdmin && (
                  <div style={{ flex: "0 0 auto", minWidth: 200, maxWidth: 280 }}>
                    <Label style={{ ...modalLabelStyle, display: "block", marginBottom: 6 }}>Filter by user</Label>
                    <Input
                      type="select"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      style={{ ...filterInputStyle, width: "100%", minWidth: 200 }}
                    >
                      <option value="">Me (current user)</option>
                      {users.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </Input>
                  </div>
                )}
                {isSuperAdmin && viewingUser && (
                  <div style={{ flex: "0 0 auto", paddingBottom: 10, whiteSpace: "nowrap", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>
                    Viewing: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{viewingUser.name}</strong>
                  </div>
                )}
                <div style={{ flex: "0 0 auto", minWidth: 148, width: 148 }}>
                  <Label style={{ ...modalLabelStyle, display: "block", marginBottom: 6 }}>Date range</Label>
                  <Input
                    type="select"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setPage(1);
                    }}
                    style={{ ...filterInputStyle, width: "100%" }}
                  >
                    <option value="all">All time</option>
                    <option value="this_month">This month</option>
                    <option value="last_3_months">Last 3 months</option>
                    <option value="this_year">This year</option>
                    <option value="custom">Custom</option>
                  </Input>
                </div>
                {dateFilter === "custom" && (
                  <>
                    <div style={{ flex: "0 0 auto", minWidth: 132, width: 132 }}>
                      <Label style={{ ...modalLabelStyle, display: "block", marginBottom: 6 }}>From</Label>
                      <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ ...filterInputStyle, width: "100%" }} />
                    </div>
                    <div style={{ flex: "0 0 auto", minWidth: 132, width: 132 }}>
                      <Label style={{ ...modalLabelStyle, display: "block", marginBottom: 6 }}>To</Label>
                      <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ ...filterInputStyle, width: "100%" }} />
                    </div>
                  </>
                )}
              </div>
              {lastUpdated && (
                <p className="mb-3" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.32)" }}>
                  Last updated: {format(lastUpdated, "dd MMM yyyy HH:mm")}
                </p>
              )}

              <Row className="mb-4">
                <Col md="4" className="mb-3 mb-md-0">
                  <Card
                    style={{
                      background: "#16161a",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderTop: "2px solid #10b981",
                      borderRadius: 14,
                      height: "100%",
                    }}
                  >
                    <CardBody className="py-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Savings goal
                        </span>
                        <button
                          type="button"
                          className="p-0 border-0 bg-transparent"
                          style={{ color: "#fbbf24", cursor: "pointer" }}
                          onClick={() => {
                            setGoalModalOpen(true);
                            setGoalInput(goal.toString());
                          }}
                          title="Edit goal"
                        >
                          <i className="tim-icons icon-pencil" style={{ fontSize: "0.85rem" }} />
                        </button>
                      </div>
                      {goal > 0 ? (
                        <>
                          <div className="progress" style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 6 }}>
                            <div
                              className="progress-bar"
                              role="progressbar"
                              style={{
                                width: `${goalProgress}%`,
                                background: "linear-gradient(90deg, #fbbf24, #e8890c)",
                                borderRadius: 6,
                              }}
                            />
                          </div>
                          <p className="mb-0 mt-2" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.72)" }}>
                            ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} / ₹{goal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}{" "}
                            <span style={{ color: "#fbbf24" }}>({goalProgress.toFixed(0)}%)</span>
                          </p>
                        </>
                      ) : (
                        <p className="mb-0" style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>
                          Set a goal to track progress
                        </p>
                      )}
                    </CardBody>
                  </Card>
                </Col>
                {chartData && (
                  <Col md="8">
                    <Card
                      style={{
                        background: "#16161a",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderTop: `2px solid ${accentAmber}`,
                        borderRadius: 14,
                      }}
                    >
                      <CardBody className="py-3">
                        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap" style={{ gap: 8 }}>
                          <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Trend
                          </span>
                          <div>
                            <button type="button" className="mr-1 border-0" style={chipBtn(chartMode === "cumulative")} onClick={() => setChartMode("cumulative")}>
                              Cumulative
                            </button>
                            <button type="button" className="border-0" style={chipBtn(chartMode === "individual")} onClick={() => setChartMode("individual")}>
                              Individual
                            </button>
                          </div>
                        </div>
                        <div style={{ height: 140 }}>
                          <Line
                            data={chartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  grid: { color: "rgba(255,255,255,0.06)" },
                                  ticks: {
                                    color: "rgba(255,255,255,0.45)",
                                    callback: (v) => "\u20B9" + Number(v).toLocaleString(),
                                  },
                                },
                                x: {
                                  grid: { color: "rgba(255,255,255,0.06)" },
                                  ticks: { color: "rgba(255,255,255,0.45)", maxRotation: 45 },
                                },
                              },
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  callbacks: {
                                    label: (ctx) => "\u20B9" + Number(ctx.raw).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
                                  },
                                },
                              },
                            }}
                            height={140}
                          />
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                )}
              </Row>

              {entries.length === 0 ? (
                <div className="text-center py-5">
                  <i className="tim-icons icon-bank" style={{ fontSize: "3rem", color: accentAmber, marginBottom: "1rem", opacity: 0.45 }} />
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem", marginBottom: "0.5rem", fontWeight: 600 }}>No savings entries yet</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                    {dateFilter !== "all" ? "Try adjusting your date filter" : "Start tracking your house savings"}
                  </div>
                  {dateFilter === "all" && (
                    <button type="button" onClick={openAddModal} className="btn-amber-outline">
                      <i className="tim-icons icon-simple-add mr-1" /> Add your first entry
                    </button>
                  )}
                </div>
              ) : (
                <div className="hs-table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                    <thead>
                      <tr>
                        {["Date", "Amount", "Notes", ...(isSuperAdmin ? [""] : [])].map((h, i) => (
                          <th
                            key={i}
                            style={{
                              padding: "11px 14px",
                              color: "rgba(255,255,255,0.4)",
                              fontWeight: 700,
                              textAlign: h === "" ? "right" : "left",
                              whiteSpace: "nowrap",
                              fontSize: "0.68rem",
                              letterSpacing: "0.07em",
                              textTransform: "uppercase",
                              borderBottom: "1px solid rgba(255,255,255,0.08)",
                              background: "rgba(255,255,255,0.03)",
                              width: h === "" ? 100 : undefined,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr
                          key={entry._id}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s ease" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.65)" }}>{format(new Date(entry.date), "dd MMM yyyy")}</td>
                          <td
                            style={{
                              padding: "11px 14px",
                              color: "#fbbf24",
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ₹{Number(entry.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.55)" }}>{entry.notes || "—"}</td>
                          {isSuperAdmin && (
                            <td style={{ padding: "11px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onClick={() => openEditModal(entry)}
                                title="Edit"
                                style={{
                                  background: "rgba(255,160,46,0.12)",
                                  border: "1px solid rgba(255,160,46,0.3)",
                                  borderRadius: 8,
                                  width: 32,
                                  height: 32,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "#fbbf24",
                                  marginRight: 6,
                                }}
                              >
                                <i className="tim-icons icon-pencil" style={{ fontSize: "0.7rem" }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(entry)}
                                title="Delete"
                                style={{
                                  background: "rgba(239,68,68,0.08)",
                                  border: "1px solid rgba(239,68,68,0.22)",
                                  borderRadius: 8,
                                  width: 32,
                                  height: 32,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "#f87171",
                                }}
                              >
                                <i className="tim-icons icon-trash-simple" style={{ fontSize: "0.7rem" }} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {entries.length > 0 && totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap" style={{ gap: 12 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
                    Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalEntries)} of {totalEntries}
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        color: page <= 1 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.65)",
                        cursor: page <= 1 ? "not-allowed" : "pointer",
                        marginRight: 8,
                      }}
                    >
                      Previous
                    </button>
                    <span className="mx-1" style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        color: page >= totalPages ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.65)",
                        cursor: page >= totalPages ? "not-allowed" : "pointer",
                        marginLeft: 8,
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal isOpen={modalOpen} toggle={closeModal} style={{ maxWidth: "500px" }} contentClassName="bg-dark border-0">
        <ModalHeader
          toggle={closeModal}
          close={modalCloseBtn(closeModal)}
          style={{ background: "#141416", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          {editId ? "Edit Savings" : "Add Savings"}
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody style={{ background: "#1a1a1e", color: "#fff" }}>
            {error && (
              <Alert color="danger" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#FCA5A5" }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert color="success" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", color: "#BBF7D0" }}>
                {success}
              </Alert>
            )}
            <FormGroup>
              <Label style={modalLabelStyle}>Date *</Label>
              <Input name="date" type="date" value={formData.date} onChange={handleChange} required style={modalInputStyle} />
            </FormGroup>
            <FormGroup>
              <Label style={modalLabelStyle}>Amount (₹) *</Label>
              <Input name="amount" type="number" value={formData.amount} onChange={handleChange} min="0" step="0.01" required style={modalInputStyle} />
            </FormGroup>
            <FormGroup className="mb-0">
              <Label style={modalLabelStyle}>Notes (optional)</Label>
              <Input name="notes" type="textarea" value={formData.notes} onChange={handleChange} placeholder="Optional notes" rows={2} style={modalInputStyle} />
            </FormGroup>
          </ModalBody>
          <ModalFooter style={{ background: "#141416", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Button type="button" className="btn-cancel-outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="btn-amber-outline" disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" style={{ color: "#ffb347" }} />
                  Saving…
                </>
              ) : editId ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={goalModalOpen} toggle={() => setGoalModalOpen(false)} style={{ maxWidth: "500px" }} contentClassName="bg-dark border-0">
        <ModalHeader
          toggle={() => setGoalModalOpen(false)}
          close={modalCloseBtn(() => setGoalModalOpen(false))}
          style={{ background: "#141416", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          Set Savings Goal
        </ModalHeader>
        <ModalBody style={{ background: "#1a1a1e", color: "#fff" }}>
          <FormGroup className="mb-0">
            <Label style={modalLabelStyle}>Goal amount (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Enter your savings goal"
              style={modalInputStyle}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter style={{ background: "#141416", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Button type="button" className="btn-cancel-outline" onClick={() => setGoalModalOpen(false)}>
            Cancel
          </Button>
          <Button type="button" className="btn-amber-outline" onClick={handleSetGoal}>
            Save goal
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!deleteConfirm} toggle={() => setDeleteConfirm(null)} contentClassName="bg-dark border-0">
        <ModalHeader
          toggle={() => setDeleteConfirm(null)}
          close={modalCloseBtn(() => setDeleteConfirm(null))}
          style={{ background: "#141416", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          Confirm Delete
        </ModalHeader>
        <ModalBody style={{ background: "#1a1a1e", color: "rgba(255,255,255,0.85)" }}>
          Are you sure you want to delete this savings entry (₹{deleteConfirm?.amount?.toLocaleString("en-IN")} on{" "}
          {deleteConfirm ? format(new Date(deleteConfirm.date), "dd MMM yyyy") : ""})?
        </ModalBody>
        <ModalFooter style={{ background: "#141416", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Button className="btn-cancel-outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button color="danger" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default HouseSavings;
