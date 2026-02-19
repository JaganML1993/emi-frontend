import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Table,
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

function HouseSavings() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(""); // empty = current user
  const [currentUserId, setCurrentUserId] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, this_month, last_3_months, this_year, custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [goal, setGoal] = useState(0);
  const [chartMode, setChartMode] = useState("cumulative"); // cumulative | individual
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const fetchUserRole = useCallback(async () => {
    try {
      const res = await api.get("/api/auth/me");
      if (res.data.success && res.data.user) {
        setIsSuperAdmin(res.data.user.role === "super_admin");
        setCurrentUserId(res.data.user.id);
      }
    } catch {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      setIsSuperAdmin(stored?.role === "super_admin");
      setCurrentUserId(stored?.id || "");
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
    let fromDate = null, toDate = null;
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
      setLoading(true);
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
  }, [dateFilter, customFrom, customTo]);

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

  const exportCSV = () => {
    const headers = "Date,Amount,Notes\n";
    const rows = entries.map((e) =>
      `${format(new Date(e.date), "yyyy-MM-dd")},${Number(e.amount || 0).toFixed(2)},"${(e.notes || "").replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `house-savings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const thisMonthSum = entries
    .filter((e) => { const d = new Date(e.date); return d >= thisMonthStart && d <= thisMonthEnd; })
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const lastMonthSum = entries
    .filter((e) => { const d = new Date(e.date); return d >= lastMonthStart && d <= lastMonthEnd; })
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const goalProgress = goal > 0 ? Math.min(100, (totalAmount / goal) * 100) : 0;
  const viewingUser = isSuperAdmin && selectedUserId ? users.find((u) => u._id === selectedUserId) : null;

  const chartData = useMemo(() => {
    if (!entries.length) return null;
    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sorted.map((e) => format(new Date(e.date), "dd MMM yy"));
    const data = chartMode === "cumulative"
      ? (() => { let t = 0; return sorted.map((e) => { t += Number(e.amount || 0); return t; }); })()
      : sorted.map((e) => Number(e.amount || 0));
    return {
      labels,
      datasets: [
        {
          label: chartMode === "cumulative" ? "Cumulative" : "Amount",
          data,
          borderColor: "#34D399",
          backgroundColor: "rgba(52, 211, 153, 0.2)",
          borderWidth: 2,
          tension: 0.4,
          fill: chartMode === "cumulative",
          pointBackgroundColor: "#60A5FA",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [entries, chartMode]);

  if (loading) {
    return (
      <div className="content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card
            style={{
              background: "linear-gradient(135deg, #1E1E1E 0%, #2d2b42 50%, #1e293b 100%)",
              border: "1px solid rgba(96, 165, 250, 0.35)",
              borderRadius: "15px",
              boxShadow: "0 8px 32px rgba(96, 165, 250, 0.12), 0 0 0 1px rgba(248, 113, 113, 0.08)",
            }}
          >
            <CardHeader
              style={{
                background: "linear-gradient(135deg, rgba(52, 211, 153, 0.25) 0%, rgba(96, 165, 250, 0.2) 50%, rgba(248, 113, 113, 0.15) 100%)",
                borderBottom: "1px solid rgba(248, 113, 113, 0.25)",
                borderRadius: "15px 15px 0 0",
                padding: "0.5rem 0.75rem",
              }}
            >
              <Row>
                <Col className="text-left" sm="6">
                  <CardTitle tag="h4" style={{ color: "#ffffff", fontWeight: "700", margin: "0", fontSize: "1.15rem" }}>
                    <i className="tim-icons icon-bank mr-2" style={{ color: "#34D399" }}></i>
                    House Savings
                  </CardTitle>
                  <p className="mb-0" style={{ fontSize: "0.8rem", color: "#60A5FA" }}>
                    Track your house savings independently
                  </p>
                </Col>
                <Col sm="6" className="text-right">
                  <Button
                    size="sm"
                    className="mr-2"
                    onClick={handleRefresh}
                    title="Refresh"
                    style={{ background: "rgba(248, 113, 113, 0.25)", border: "1px solid rgba(248, 113, 113, 0.5)", color: "#F87171" }}
                  >
                    <i className="tim-icons icon-refresh-02" />
                  </Button>
                  <Button
                    style={{
                      background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontWeight: "600",
                      boxShadow: "0 4px 12px rgba(52, 211, 153, 0.4)",
                    }}
                    onClick={openAddModal}
                  >
                    <i className="tim-icons icon-simple-add mr-1"></i>
                    Add Savings
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody style={{ padding: "1rem" }}>
              {error && (
                <Alert color="danger" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.45)", color: "#FCA5A5" }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert color="success" style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.45)", color: "#BBF7D0" }}>
                  {success}
                </Alert>
              )}

              {isSuperAdmin && (
                <FormGroup className="mb-3">
                  <Label style={{ color: "#A78BFA", marginRight: "8px" }}>Filter by User</Label>
                  <Input
                    type="select"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    style={{ maxWidth: "280px", display: "inline-block", background: "#1e1e2d", color: "#fff", border: "1px solid rgba(167, 139, 250, 0.4)" }}
                  >
                    <option value="">Me (Current User)</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </Input>
                  {viewingUser && (
                    <span className="ml-3" style={{ color: "#60A5FA", fontSize: "0.9rem" }}>
                      Viewing: <strong style={{ color: "#34D399" }}>{viewingUser.name}</strong>
                    </span>
                  )}
                </FormGroup>
              )}

              <Row className="mb-3">
                <Col md="3">
                  <Label style={{ color: "#60A5FA", fontSize: "0.8rem" }}>Date Range</Label>
                  <Input
                    type="select"
                    value={dateFilter}
                    onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                    style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(96, 165, 250, 0.4)" }}
                  >
                    <option value="all">All time</option>
                    <option value="this_month">This month</option>
                    <option value="last_3_months">Last 3 months</option>
                    <option value="this_year">This year</option>
                    <option value="custom">Custom</option>
                  </Input>
                </Col>
                {dateFilter === "custom" && (
                  <>
                    <Col md="2">
                      <Label style={{ color: "#FBBF24", fontSize: "0.8rem" }}>From</Label>
                      <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(251, 191, 36, 0.4)" }} />
                    </Col>
                    <Col md="2">
                      <Label style={{ color: "#FBBF24", fontSize: "0.8rem" }}>To</Label>
                      <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(251, 191, 36, 0.4)" }} />
                    </Col>
                  </>
                )}
                <Col md="2" className="d-flex align-items-end">
                  <Button
                    size="sm"
                    onClick={exportCSV}
                    disabled={entries.length === 0}
                    style={{ background: "rgba(167, 139, 250, 0.3)", border: "1px solid rgba(167, 139, 250, 0.5)", color: "#A78BFA" }}
                  >
                    <i className="tim-icons icon-single-copy-04 mr-1" /> Export CSV
                  </Button>
                </Col>
              </Row>
              {lastUpdated && (
                <p className="mb-2" style={{ fontSize: "0.75rem", color: "#A78BFA" }}>
                  Last updated: {format(lastUpdated, "dd MMM yyyy HH:mm")}
                </p>
              )}

              <Row className="mb-4">
                <Col md="4">
                  <Card style={{ background: "linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(96, 165, 250, 0.1) 100%)", border: "1px solid rgba(52, 211, 153, 0.5)", borderRadius: "12px", boxShadow: "0 4px 16px rgba(52, 211, 153, 0.15)" }}>
                    <CardBody className="py-3">
                      <p className="mb-0" style={{ fontSize: "0.8rem", color: "#34D399" }}>Total Savings</p>
                      <h4 style={{ color: "#fff", margin: 0 }}>₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</h4>
                      <div className="mt-2">
                        <small style={{ color: "#60A5FA" }}>This month: ₹{thisMonthSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</small>
                        <br />
                        <small style={{ color: "#A78BFA" }}>Last month: ₹{lastMonthSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</small>
                      </div>
                    </CardBody>
                  </Card>
                </Col>
                <Col md="4">
                  <Card style={{ background: "linear-gradient(135deg, rgba(96, 165, 250, 0.12) 0%, rgba(248, 113, 113, 0.08) 100%)", border: "1px solid rgba(248, 113, 113, 0.4)", borderRadius: "12px", boxShadow: "0 4px 16px rgba(248, 113, 113, 0.12)" }}>
                    <CardBody className="py-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <p className="mb-0" style={{ fontSize: "0.8rem", color: "#F87171" }}>Savings Goal</p>
                        <Button color="link" size="sm" className="p-0" style={{ color: "#F87171" }} onClick={() => { setGoalModalOpen(true); setGoalInput(goal.toString()); }}>
                          <i className="tim-icons icon-pencil" />
                        </Button>
                      </div>
                      {goal > 0 ? (
                        <>
                          <div className="progress" style={{ height: "8px", background: "rgba(0,0,0,0.3)", borderRadius: "4px" }}>
                            <div
                              className="progress-bar"
                              role="progressbar"
                              style={{ width: `${goalProgress}%`, background: "linear-gradient(90deg, #34D399, #F87171)", borderRadius: "4px" }}
                            />
                          </div>
                          <p className="mb-0 mt-1" style={{ fontSize: "0.8rem", color: "#fff" }}>
                            ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} / ₹{goal.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ({goalProgress.toFixed(0)}%)
                          </p>
                        </>
                      ) : (
                        <p className="mb-0" style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>Set a goal to track progress</p>
                      )}
                    </CardBody>
                  </Card>
                </Col>
                {chartData && (
                  <Col md="4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Label style={{ color: "#A78BFA", fontSize: "0.8rem", margin: 0 }}>Chart</Label>
                      <div>
                        <Button
                          size="sm"
                          className="mr-1"
                          onClick={() => setChartMode("cumulative")}
                          style={chartMode === "cumulative" ? { background: "linear-gradient(135deg, #34D399, #10B981)", border: "none", color: "#fff" } : { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#9a9a9a" }}
                        >
                          Cumulative
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setChartMode("individual")}
                          style={chartMode === "individual" ? { background: "linear-gradient(135deg, #60A5FA, #3B82F6)", border: "none", color: "#fff" } : { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#9a9a9a" }}
                        >
                          Individual
                        </Button>
                      </div>
                    </div>
                    <div style={{ height: "120px" }}>
                      <Line
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: { color: "rgba(255,255,255,0.08)" },
                          ticks: {
                            color: "#9a9a9a",
                            callback: (v) => "₹" + Number(v).toLocaleString(),
                          },
                        },
                        x: {
                          grid: { color: "rgba(255,255,255,0.08)" },
                          ticks: { color: "#9a9a9a", maxRotation: 45 },
                        },
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => "₹" + Number(ctx.raw).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
                          },
                        },
                      },
                    }}
                    height={120}
                  />
                    </div>
                  </Col>
                )}
              </Row>

              {entries.length === 0 ? (
                <div
                  className="text-center py-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(96, 165, 250, 0.06) 100%)",
                    borderRadius: "12px",
                    border: "1px dashed rgba(96, 165, 250, 0.4)",
                  }}
                >
                  <i className="tim-icons icon-bank" style={{ fontSize: "3rem", color: "#34D399", opacity: 0.8 }} />
                  <h5 style={{ color: "#fff", marginTop: "1rem" }}>No savings entries yet</h5>
                  <p style={{ color: "#60A5FA", marginBottom: "1rem" }}>
                    {dateFilter !== "all" ? "Try adjusting your date filter" : "Start tracking your house savings"}
                  </p>
                  {dateFilter === "all" && (
                    <Button
                      onClick={openAddModal}
                      style={{ background: "linear-gradient(135deg, #34D399, #10B981)", border: "none", color: "#fff" }}
                    >
                      <i className="tim-icons icon-simple-add mr-1" /> Add your first entry
                    </Button>
                  )}
                </div>
              ) : (
                <Table responsive className="table-hover" style={{ color: "#ffffff" }}>
                  <thead>
                    <tr>
                      <th style={{ color: "#60A5FA", borderColor: "rgba(255,255,255,0.1)" }}>Date</th>
                      <th style={{ color: "#34D399", borderColor: "rgba(255,255,255,0.1)" }}>Amount</th>
                      <th style={{ color: "#A78BFA", borderColor: "rgba(255,255,255,0.1)" }}>Notes</th>
                      {isSuperAdmin && (
                        <th style={{ color: "#F87171", borderColor: "rgba(255,255,255,0.1)", width: 120 }}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry._id}>
                        <td style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                          {format(new Date(entry.date), "dd MMM yyyy")}
                        </td>
                        <td style={{ borderColor: "rgba(255,255,255,0.1)", color: "#34D399", fontWeight: 500 }}>
                          ₹{Number(entry.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ borderColor: "rgba(255,255,255,0.1)" }}>{entry.notes || "-"}</td>
                        {isSuperAdmin && (
                          <td style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                            <Button size="sm" className="mr-1" onClick={() => openEditModal(entry)} style={{ background: "rgba(96, 165, 250, 0.4)", border: "1px solid rgba(96, 165, 250, 0.6)", color: "#60A5FA" }}>
                              <i className="tim-icons icon-pencil" />
                            </Button>
                            <Button size="sm" onClick={() => setDeleteConfirm(entry)} style={{ background: "rgba(239, 68, 68, 0.3)", border: "1px solid rgba(239, 68, 68, 0.5)", color: "#FCA5A5" }}>
                              <i className="tim-icons icon-trash-simple" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              {entries.length > 0 && totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <span style={{ color: "#F87171", fontSize: "0.85rem" }}>
                    Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalEntries)} of {totalEntries}
                  </span>
                  <div>
                    <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ background: "rgba(248, 113, 113, 0.25)", border: "1px solid rgba(248, 113, 113, 0.5)", color: "#F87171" }}>
                      Previous
                    </Button>
                    <span className="mx-2" style={{ color: "#fff" }}>Page {page} of {totalPages}</span>
                    <Button size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ background: "rgba(248, 113, 113, 0.25)", border: "1px solid rgba(248, 113, 113, 0.5)", color: "#F87171" }}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal isOpen={modalOpen} toggle={closeModal} style={{ maxWidth: "500px" }}>
        <ModalHeader toggle={closeModal} style={{ background: "linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)", color: "#fff", borderBottom: "1px solid rgba(52, 211, 153, 0.3)" }}>
          <span style={{ color: "#34D399" }}>{editId ? "Edit Savings" : "Add Savings"}</span>
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody style={{ background: "#2d2b42", color: "#fff" }}>
            {error && <Alert color="danger">{error}</Alert>}
            {success && <Alert color="success">{success}</Alert>}
            <FormGroup>
              <Label style={{ color: "#60A5FA" }}>Date *</Label>
              <Input name="date" type="date" value={formData.date} onChange={handleChange} required style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(96, 165, 250, 0.4)" }} />
            </FormGroup>
            <FormGroup>
              <Label style={{ color: "#34D399" }}>Amount (₹) *</Label>
              <Input name="amount" type="number" value={formData.amount} onChange={handleChange} min="0" step="0.01" required style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(52, 211, 153, 0.4)" }} />
            </FormGroup>
            <FormGroup>
              <Label style={{ color: "#A78BFA" }}>Notes (optional)</Label>
              <Input name="notes" type="textarea" value={formData.notes} onChange={handleChange} placeholder="Optional notes" rows={2} style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(167, 139, 250, 0.4)" }} />
            </FormGroup>
          </ModalBody>
          <ModalFooter style={{ background: "#1e1e2d", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <Button onClick={closeModal} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#9a9a9a" }}>Cancel</Button>
            <Button type="submit" disabled={saving} style={{ background: "linear-gradient(135deg, #34D399, #10B981)", border: "none", color: "#fff" }}>
              {saving ? <><Spinner size="sm" className="mr-2" />Saving...</> : (editId ? "Update" : "Add")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={goalModalOpen} toggle={() => setGoalModalOpen(false)} style={{ maxWidth: "500px" }}>
        <ModalHeader toggle={() => setGoalModalOpen(false)} style={{ background: "linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)", color: "#fff", borderBottom: "1px solid rgba(248, 113, 113, 0.3)" }}>
          <span style={{ color: "#F87171" }}>Set Savings Goal</span>
        </ModalHeader>
        <ModalBody style={{ background: "#2d2b42", color: "#fff" }}>
          <FormGroup>
            <Label style={{ color: "#F87171" }}>Goal amount (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Enter your savings goal"
              style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(248, 113, 113, 0.4)" }}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter style={{ background: "#1e1e2d", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <Button onClick={() => setGoalModalOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#9a9a9a" }}>Cancel</Button>
            <Button onClick={handleSetGoal} style={{ background: "linear-gradient(135deg, #F87171, #EF4444)", border: "none", color: "#fff" }}>Save Goal</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!deleteConfirm} toggle={() => setDeleteConfirm(null)}>
        <ModalHeader toggle={() => setDeleteConfirm(null)}>Confirm Delete</ModalHeader>
        <ModalBody>
          Are you sure you want to delete this savings entry (₹{deleteConfirm?.amount?.toLocaleString?.()} on {deleteConfirm ? format(new Date(deleteConfirm.date), "dd MMM yyyy") : ""})?
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="danger" onClick={handleDeleteConfirm}>Delete</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default HouseSavings;
