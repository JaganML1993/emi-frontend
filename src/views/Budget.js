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
  Badge,
} from "reactstrap";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import api from "../config/axios";

const COLORS = [
  "#60A5FA", "#34D399", "#F87171", "#FBBF24", "#A78BFA",
  "#F472B6", "#38BDF8", "#4ADE80", "#FB923C", "#E879F9",
];

const ICONS = [
  { value: "icon-wallet-43", label: "Wallet" },
  { value: "icon-cart", label: "Cart" },
  { value: "icon-bus-front-12", label: "Travel" },
  { value: "icon-gift-2", label: "Gift" },
  { value: "icon-heart-2", label: "Family" },
  { value: "icon-istanbul", label: "Events" },
  { value: "icon-laptop", label: "Electronics" },
  { value: "icon-bulb-63", label: "Utilities" },
  { value: "icon-coins", label: "Finance" },
  { value: "icon-satisfied", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const emptyCatForm = { name: "", description: "", color: "#60A5FA", icon: "icon-wallet-43", budgetLimit: "", isDefault: false };
const emptyExpForm = { title: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), notes: "", paymentMethod: "cash", categoryId: "" };

const cardStyle = {
  background: "linear-gradient(135deg, #1E1E1E 0%, #2d2b42 50%, #1e293b 100%)",
  border: "1px solid rgba(96, 165, 250, 0.35)",
  borderRadius: "15px",
  boxShadow: "0 8px 32px rgba(96, 165, 250, 0.12)",
};

const headerStyle = {
  background: "linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(167, 139, 250, 0.2) 50%, rgba(52, 211, 153, 0.15) 100%)",
  borderBottom: "1px solid rgba(96, 165, 250, 0.25)",
  borderRadius: "15px 15px 0 0",
  padding: "0.5rem 0.75rem",
};

const inputStyle = { background: "#1e1e2d", color: "#fff", border: "1px solid rgba(96, 165, 250, 0.4)" };
const modalBodyStyle = { background: "#2d2b42", color: "#fff" };
const modalFooterStyle = { background: "#1e1e2d", borderTop: "1px solid rgba(255,255,255,0.1)" };

function Budget() {
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expLoading, setExpLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editCatId, setEditCatId] = useState(null);
  const [catForm, setCatForm] = useState(emptyCatForm);
  const [catSaving, setCatSaving] = useState(false);
  const [deleteCatConfirm, setDeleteCatConfirm] = useState(null);

  // Expense modal
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editExpId, setEditExpId] = useState(null);
  const [expForm, setExpForm] = useState(emptyExpForm);
  const [expSaving, setExpSaving] = useState(false);
  const [deleteExpConfirm, setDeleteExpConfirm] = useState(null);

  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const getDateRange = useCallback(() => {
    const now = new Date();
    if (dateFilter === "this_month") return { fromDate: format(startOfMonth(now), "yyyy-MM-dd"), toDate: format(endOfMonth(now), "yyyy-MM-dd") };
    if (dateFilter === "last_3_months") return { fromDate: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"), toDate: format(endOfMonth(now), "yyyy-MM-dd") };
    if (dateFilter === "this_year") return { fromDate: format(startOfYear(now), "yyyy-MM-dd"), toDate: format(endOfYear(now), "yyyy-MM-dd") };
    if (dateFilter === "custom" && customFrom && customTo) return { fromDate: customFrom, toDate: customTo };
    return { fromDate: null, toDate: null };
  }, [dateFilter, customFrom, customTo]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/api/budget/categories");
      const data = res.data.data || [];
      setCategories(data);
      return data;
    } catch {
      setError("Failed to load budget categories");
      return [];
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setExpLoading(true);
    try {
      const { fromDate, toDate } = getDateRange();
      const params = new URLSearchParams();
      if (selectedCategoryId && selectedCategoryId !== "all") params.set("categoryId", selectedCategoryId);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      params.set("page", page);
      params.set("limit", pageSize);
      const res = await api.get(`/api/budget/expenses?${params.toString()}`);
      setExpenses(res.data.data || []);
    } catch {
      setError("Failed to load expenses");
      setExpenses([]);
    } finally {
      setExpLoading(false);
    }
  }, [selectedCategoryId, getDateRange, page, pageSize]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const cats = await fetchCategories();
      const defaultCat = cats.find(c => c.isDefault);
      if (defaultCat) setSelectedCategoryId(defaultCat._id);
      setLoading(false);
    };
    init();
  }, [fetchCategories]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategoryId, dateFilter, customFrom, customTo]);

  // ─── Totals ───────────────────────────────────────────────────────────────
  const summaryCards = useMemo(() => {
    const totalCategories = categories.length;
    const grandTotal = categories.reduce((s, c) => s + (c.totalSpent || 0), 0);
    const selectedCat = selectedCategoryId !== "all" ? categories.find(c => c._id === selectedCategoryId) : null;
    const selectedTotal = selectedCat ? (selectedCat.totalSpent || 0) : grandTotal;
    const selectedLimit = selectedCat ? (selectedCat.budgetLimit || 0) : categories.reduce((s, c) => s + (c.budgetLimit || 0), 0);
    const remaining = selectedLimit > 0 ? Math.max(0, selectedLimit - selectedTotal) : null;
    return { totalCategories, grandTotal, selectedTotal, selectedLimit, remaining };
  }, [categories, selectedCategoryId]);

  const totalExpPages = useMemo(() => {
    // rough count from current page data for pagination display
    return expenses.length === pageSize ? page + 1 : page;
  }, [expenses, page, pageSize]);

  // ─── Category CRUD ────────────────────────────────────────────────────────
  const openAddCat = () => { setEditCatId(null); setCatForm(emptyCatForm); setError(""); setCatModalOpen(true); };
  const openEditCat = (cat) => {
    setEditCatId(cat._id);
    setCatForm({ name: cat.name, description: cat.description || "", color: cat.color || "#60A5FA", icon: cat.icon || "icon-wallet-43", budgetLimit: cat.budgetLimit || "", isDefault: cat.isDefault || false });
    setError("");
    setCatModalOpen(true);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    setCatSaving(true);
    setError("");
    try {
      const payload = { name: catForm.name, description: catForm.description, color: catForm.color, icon: catForm.icon, budgetLimit: catForm.budgetLimit || 0, isDefault: catForm.isDefault };
      if (editCatId) {
        await api.put(`/api/budget/categories/${editCatId}`, payload);
        setSuccess("Category updated");
      } else {
        await api.post("/api/budget/categories", payload);
        setSuccess("Category created");
      }
      const updated = await fetchCategories();
      // If this category is now the default, select it
      if (catForm.isDefault) {
        const saved = updated.find(c => editCatId ? c._id === editCatId : c.isDefault);
        if (saved) setSelectedCategoryId(saved._id);
      }
      setCatModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Operation failed");
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCat = async () => {
    if (!deleteCatConfirm) return;
    try {
      await api.delete(`/api/budget/categories/${deleteCatConfirm._id}`);
      setSuccess("Category deleted");
      if (selectedCategoryId === deleteCatConfirm._id) setSelectedCategoryId("all");
      setDeleteCatConfirm(null);
      fetchCategories();
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  // ─── Expense CRUD ─────────────────────────────────────────────────────────
  const openAddExp = () => {
    setEditExpId(null);
    setExpForm({ ...emptyExpForm, date: format(new Date(), "yyyy-MM-dd"), categoryId: selectedCategoryId !== "all" ? selectedCategoryId : (categories[0]?._id || "") });
    setError("");
    setExpModalOpen(true);
  };

  const openEditExp = (exp) => {
    setEditExpId(exp._id);
    setExpForm({
      title: exp.title,
      amount: exp.amount,
      date: format(new Date(exp.date), "yyyy-MM-dd"),
      notes: exp.notes || "",
      paymentMethod: exp.paymentMethod || "cash",
      categoryId: exp.category?._id || exp.category || ""
    });
    setError("");
    setExpModalOpen(true);
  };

  const handleExpSubmit = async (e) => {
    e.preventDefault();
    setExpSaving(true);
    setError("");
    try {
      const payload = { categoryId: expForm.categoryId, title: expForm.title, amount: parseFloat(expForm.amount), date: expForm.date, notes: expForm.notes, paymentMethod: expForm.paymentMethod };
      if (editExpId) {
        await api.put(`/api/budget/expenses/${editExpId}`, payload);
        setSuccess("Expense updated");
      } else {
        await api.post("/api/budget/expenses", payload);
        setSuccess("Expense added");
      }
      await fetchCategories();
      await fetchExpenses();
      setExpModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Operation failed");
    } finally {
      setExpSaving(false);
    }
  };

  const handleDeleteExp = async () => {
    if (!deleteExpConfirm) return;
    try {
      await api.delete(`/api/budget/expenses/${deleteExpConfirm._id}`);
      setSuccess("Expense deleted");
      setDeleteExpConfirm(null);
      fetchCategories();
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const exportCSV = () => {
    const headers = "Date,Category,Title,Amount,Payment Method,Notes\n";
    const rows = expenses.map(e =>
      `${format(new Date(e.date), "yyyy-MM-dd")},"${e.category?.name || ""}","${e.title}",${Number(e.amount || 0).toFixed(2)},${e.paymentMethod},"${(e.notes || "").replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <Spinner color="primary" />
      </div>
    );
  }

  const selectedCat = selectedCategoryId !== "all" ? categories.find(c => c._id === selectedCategoryId) : null;
  const budgetProgress = selectedCat?.budgetLimit > 0 ? Math.min(100, ((selectedCat.totalSpent || 0) / selectedCat.budgetLimit) * 100) : null;

  return (
    <div className="content">
      {/* ── Alerts ── */}
      {(error || success) && (
        <Row>
          <Col xs="12">
            {error && <Alert color="danger" toggle={() => setError("")} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.45)", color: "#FCA5A5" }}>{error}</Alert>}
            {success && <Alert color="success" toggle={() => setSuccess("")} style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.45)", color: "#BBF7D0" }}>{success}</Alert>}
          </Col>
        </Row>
      )}

      {/* ── Top Filter Bar ── */}
      <Row className="mb-3 align-items-end">
        <Col md="3">
          <Label style={{ color: "#A78BFA", fontSize: "0.8rem", marginBottom: "4px" }}>
            <i className="tim-icons icon-tag mr-1" style={{ fontSize: "0.75rem" }} /> Category
          </Label>
          <Input
            type="select"
            value={selectedCategoryId}
            onChange={e => setSelectedCategoryId(e.target.value)}
            style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(167,139,250,0.5)", borderRadius: "8px" }}
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>
                {c.name}{c.isDefault ? " ★" : ""}
              </option>
            ))}
          </Input>
        </Col>
        <Col md="3">
          <Label style={{ color: "#60A5FA", fontSize: "0.8rem", marginBottom: "4px" }}>
            <i className="tim-icons icon-calendar-60 mr-1" style={{ fontSize: "0.75rem" }} /> Date Range
          </Label>
          <Input
            type="select"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(96,165,250,0.5)", borderRadius: "8px" }}
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
              <Label style={{ color: "#FBBF24", fontSize: "0.8rem", marginBottom: "4px" }}>From</Label>
              <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(251,191,36,0.5)", borderRadius: "8px" }} />
            </Col>
            <Col md="2">
              <Label style={{ color: "#FBBF24", fontSize: "0.8rem", marginBottom: "4px" }}>To</Label>
              <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ background: "#1e1e2d", color: "#fff", border: "1px solid rgba(251,191,36,0.5)", borderRadius: "8px" }} />
            </Col>
          </>
        )}
        {selectedCategoryId !== "all" && selectedCat && (
          <Col md="2" className="d-flex align-items-end">
            <div style={{
              padding: "6px 12px", borderRadius: "8px",
              background: `${selectedCat.color}20`,
              border: `1px solid ${selectedCat.color}60`,
              fontSize: "0.8rem", color: selectedCat.color, fontWeight: 600
            }}>
              <i className={`tim-icons ${selectedCat.icon} mr-1`} />
              {selectedCat.name}
              {selectedCat.isDefault && <span style={{ marginLeft: "4px", color: "#FBBF24" }}>★</span>}
            </div>
          </Col>
        )}
      </Row>

      {/* ── Summary Cards ── */}
      <Row className="mb-3">
        <Col md="3">
          <Card style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(96,165,250,0.05) 100%)", border: "1px solid rgba(96,165,250,0.4)", borderRadius: "12px" }}>
            <CardBody className="py-3">
              <p style={{ fontSize: "0.75rem", color: "#60A5FA", margin: 0 }}>Total Categories</p>
              <h4 style={{ color: "#fff", margin: 0 }}>{summaryCards.totalCategories}</h4>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card style={{ background: "linear-gradient(135deg, rgba(248,113,113,0.15) 0%, rgba(248,113,113,0.05) 100%)", border: "1px solid rgba(248,113,113,0.4)", borderRadius: "12px" }}>
            <CardBody className="py-3">
              <p style={{ fontSize: "0.75rem", color: "#F87171", margin: 0 }}>
                {selectedCategoryId === "all" ? "Grand Total Spent" : `${selectedCat?.name || ""} Spent`}
              </p>
              <h4 style={{ color: "#fff", margin: 0 }}>₹{summaryCards.selectedTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</h4>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(52,211,153,0.05) 100%)", border: "1px solid rgba(52,211,153,0.4)", borderRadius: "12px" }}>
            <CardBody className="py-3">
              <p style={{ fontSize: "0.75rem", color: "#34D399", margin: 0 }}>
                {selectedCategoryId === "all" ? "Total Budget Limit" : "Budget Limit"}
              </p>
              <h4 style={{ color: "#fff", margin: 0 }}>
                {summaryCards.selectedLimit > 0 ? `₹${summaryCards.selectedLimit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : <span style={{ fontSize: "1rem", color: "#9a9a9a" }}>Not set</span>}
              </h4>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(167,139,250,0.05) 100%)", border: "1px solid rgba(167,139,250,0.4)", borderRadius: "12px" }}>
            <CardBody className="py-3">
              <p style={{ fontSize: "0.75rem", color: "#A78BFA", margin: 0 }}>Remaining Budget</p>
              <h4 style={{ color: summaryCards.remaining !== null && summaryCards.remaining === 0 ? "#F87171" : "#fff", margin: 0 }}>
                {summaryCards.remaining !== null ? `₹${summaryCards.remaining.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : <span style={{ fontSize: "1rem", color: "#9a9a9a" }}>—</span>}
              </h4>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* ── Categories Panel ── */}
        <Col md="4" lg="3">
          <Card style={cardStyle}>
            <CardHeader style={headerStyle}>
              <div className="d-flex justify-content-between align-items-center">
                <CardTitle tag="h5" style={{ color: "#fff", margin: 0, fontSize: "1rem" }}>
                  <i className="tim-icons icon-tag mr-2" style={{ color: "#A78BFA" }}></i>
                  Categories
                </CardTitle>
                <Button
                  size="sm"
                  onClick={openAddCat}
                  style={{ background: "linear-gradient(135deg, #A78BFA, #7C3AED)", border: "none", borderRadius: "6px", padding: "4px 10px" }}
                  title="New Category"
                >
                  <i className="tim-icons icon-simple-add" />
                </Button>
              </div>
            </CardHeader>
            <CardBody style={{ padding: "0.5rem" }}>
              {/* All categories option */}
              <div
                onClick={() => setSelectedCategoryId("all")}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 10px", borderRadius: "8px", cursor: "pointer", marginBottom: "4px",
                  background: selectedCategoryId === "all"
                    ? "linear-gradient(135deg, rgba(96,165,250,0.2), rgba(167,139,250,0.15))"
                    : "rgba(255,255,255,0.04)",
                  border: selectedCategoryId === "all" ? "1px solid rgba(96,165,250,0.45)" : "1px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(96,165,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="tim-icons icon-app" style={{ color: "#60A5FA", fontSize: "0.85rem" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>All Categories</div>
                  <div style={{ fontSize: "0.72rem", color: "#9a9a9a", marginTop: "1px" }}>
                    ₹{summaryCards.grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })} total
                  </div>
                </div>
                <Badge style={{ background: "rgba(96,165,250,0.25)", color: "#60A5FA", flexShrink: 0 }}>{categories.length}</Badge>
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-4" style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>
                  <i className="tim-icons icon-tag" style={{ fontSize: "2rem", marginBottom: "8px", display: "block", color: "#A78BFA", opacity: 0.6 }} />
                  No categories yet.<br />
                  <span style={{ color: "#A78BFA", cursor: "pointer" }} onClick={openAddCat}>Create one</span>
                </div>
              ) : (
                categories.map(cat => {
                  const isSelected = selectedCategoryId === cat._id;
                  const progress = cat.budgetLimit > 0 ? Math.min(100, ((cat.totalSpent || 0) / cat.budgetLimit) * 100) : null;
                  const isOver = progress !== null && progress >= 100;
                  return (
                    <div
                      key={cat._id}
                      onClick={() => setSelectedCategoryId(cat._id)}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "9px 10px", borderRadius: "8px", cursor: "pointer", marginBottom: "4px",
                        background: isSelected ? `linear-gradient(135deg, ${cat.color}22, ${cat.color}10)` : "rgba(255,255,255,0.04)",
                        border: isSelected ? `1px solid ${cat.color}60` : "1px solid transparent",
                        transition: "all 0.2s"
                      }}
                    >
                      {/* Icon box */}
                      <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: `${cat.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className={`tim-icons ${cat.icon}`} style={{ color: cat.color, fontSize: "0.85rem" }} />
                      </div>

                      {/* Name + amount */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {cat.name}
                          {cat.isDefault && <span title="Default" style={{ marginLeft: "5px", color: "#FBBF24", fontSize: "0.72rem" }}>★</span>}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: isOver ? "#F87171" : "#9a9a9a", marginTop: "1px" }}>
                          ₹{(cat.totalSpent || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          {cat.budgetLimit > 0 && ` / ₹${cat.budgetLimit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                        </div>
                        {progress !== null && (
                          <div style={{ marginTop: "4px", height: "3px", background: "rgba(0,0,0,0.3)", borderRadius: "2px" }}>
                            <div style={{ width: `${progress}%`, height: "100%", background: isOver ? "#F87171" : cat.color, borderRadius: "2px", transition: "width 0.4s ease" }} />
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: "3px", flexShrink: 0 }}>
                        <button
                          onClick={() => openEditCat(cat)}
                          title="Edit"
                          style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: "4px", color: "#60A5FA", width: "22px", height: "22px", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <i className="tim-icons icon-pencil" style={{ fontSize: "0.6rem" }} />
                        </button>
                        <button
                          onClick={() => setDeleteCatConfirm(cat)}
                          title="Delete"
                          style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "4px", color: "#F87171", width: "22px", height: "22px", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <i className="tim-icons icon-trash-simple" style={{ fontSize: "0.6rem" }} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </Col>

        {/* ── Expenses Panel ── */}
        <Col md="8" lg="9">
          <Card style={cardStyle}>
            <CardHeader style={{ ...headerStyle, background: "linear-gradient(135deg, rgba(52,211,153,0.2) 0%, rgba(96,165,250,0.15) 50%, rgba(248,113,113,0.1) 100%)" }}>
              <Row className="align-items-center">
                <Col sm="6">
                  <CardTitle tag="h5" style={{ color: "#fff", margin: 0, fontSize: "1rem" }}>
                    <i className="tim-icons icon-money-coins mr-2" style={{ color: "#34D399" }}></i>
                    {selectedCategoryId === "all" ? "All Expenses" : `${selectedCat?.name || ""} Expenses`}
                  </CardTitle>
                  {budgetProgress !== null && (
                    <div className="mt-1">
                      <div style={{ height: "5px", background: "rgba(0,0,0,0.3)", borderRadius: "3px", maxWidth: "200px" }}>
                        <div style={{
                          width: `${budgetProgress}%`, height: "100%",
                          background: budgetProgress >= 100 ? "#F87171" : budgetProgress >= 80 ? "#FBBF24" : "#34D399",
                          borderRadius: "3px"
                        }} />
                      </div>
                      <small style={{ color: "#9a9a9a", fontSize: "0.7rem" }}>{budgetProgress.toFixed(0)}% of budget used</small>
                    </div>
                  )}
                </Col>
                <Col sm="6" className="text-right">
                  <Button size="sm" className="mr-2" onClick={exportCSV} disabled={expenses.length === 0}
                    style={{ background: "rgba(167,139,250,0.3)", border: "1px solid rgba(167,139,250,0.5)", color: "#A78BFA" }}>
                    <i className="tim-icons icon-single-copy-04 mr-1" /> CSV
                  </Button>
                  <Button
                    onClick={openAddExp}
                    disabled={categories.length === 0}
                    style={{ background: "linear-gradient(135deg, #34D399, #10B981)", border: "none", borderRadius: "8px", padding: "6px 14px", fontWeight: "600", boxShadow: "0 4px 12px rgba(52,211,153,0.4)" }}
                  >
                    <i className="tim-icons icon-simple-add mr-1" /> Add Expense
                  </Button>
                </Col>
              </Row>

            </CardHeader>

            <CardBody style={{ padding: "1rem" }}>
              {expLoading ? (
                <div className="text-center py-5"><Spinner color="primary" /></div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-5" style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.06), rgba(96,165,250,0.04))", borderRadius: "12px", border: "1px dashed rgba(96,165,250,0.3)" }}>
                  <i className="tim-icons icon-money-coins" style={{ fontSize: "3rem", color: "#34D399", opacity: 0.7 }} />
                  <h5 style={{ color: "#fff", marginTop: "1rem" }}>No expenses yet</h5>
                  <p style={{ color: "#60A5FA" }}>
                    {categories.length === 0 ? "Create a category first, then add expenses" : "Add your first expense to track spending"}
                  </p>
                  {categories.length > 0 && (
                    <Button onClick={openAddExp} style={{ background: "linear-gradient(135deg, #34D399, #10B981)", border: "none" }}>
                      <i className="tim-icons icon-simple-add mr-1" /> Add Expense
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Table responsive className="table-hover" style={{ color: "#fff" }}>
                    <thead>
                      <tr>
                        <th style={{ color: "#60A5FA", borderColor: "rgba(255,255,255,0.1)", fontSize: "0.8rem" }}>Date</th>
                        {selectedCategoryId === "all" && <th style={{ color: "#A78BFA", borderColor: "rgba(255,255,255,0.1)", fontSize: "0.8rem" }}>Category</th>}
                        <th style={{ color: "#34D399", borderColor: "rgba(255,255,255,0.1)", fontSize: "0.8rem" }}>Title</th>
                        <th style={{ color: "#FBBF24", borderColor: "rgba(255,255,255,0.1)", fontSize: "0.8rem" }}>Amount</th>
                        <th style={{ color: "#9a9a9a", borderColor: "rgba(255,255,255,0.1)", fontSize: "0.8rem" }}>Method</th>
                        <th style={{ color: "#9a9a9a", borderColor: "rgba(255,255,255,0.1)", fontSize: "0.8rem" }}>Notes</th>
                        <th style={{ color: "#F87171", borderColor: "rgba(255,255,255,0.1)", fontSize: "0.8rem", width: 90 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(exp => (
                        <tr key={exp._id}>
                          <td style={{ borderColor: "rgba(255,255,255,0.07)", fontSize: "0.85rem" }}>
                            {format(new Date(exp.date), "dd MMM yyyy")}
                          </td>
                          {selectedCategoryId === "all" && (
                            <td style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                              {exp.category ? (
                                <span style={{ color: exp.category.color || "#A78BFA", fontSize: "0.85rem", fontWeight: 500 }}>
                                  <i className={`tim-icons ${exp.category.icon || "icon-tag"} mr-1`} style={{ fontSize: "0.7rem" }} />
                                  {exp.category.name}
                                </span>
                              ) : <span style={{ color: "#9a9a9a" }}>—</span>}
                            </td>
                          )}
                          <td style={{ borderColor: "rgba(255,255,255,0.07)", fontSize: "0.85rem" }}>{exp.title}</td>
                          <td style={{ borderColor: "rgba(255,255,255,0.07)", color: "#FBBF24", fontWeight: 600, fontSize: "0.85rem" }}>
                            ₹{Number(exp.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                            <Badge style={{
                              background: exp.paymentMethod === "upi" ? "rgba(96,165,250,0.25)" : exp.paymentMethod === "card" ? "rgba(167,139,250,0.25)" : "rgba(52,211,153,0.25)",
                              color: exp.paymentMethod === "upi" ? "#60A5FA" : exp.paymentMethod === "card" ? "#A78BFA" : "#34D399",
                              fontSize: "0.7rem", textTransform: "uppercase"
                            }}>
                              {exp.paymentMethod}
                            </Badge>
                          </td>
                          <td style={{ borderColor: "rgba(255,255,255,0.07)", color: "#9a9a9a", fontSize: "0.8rem", maxWidth: "150px" }}>
                            <span title={exp.notes}>{exp.notes ? (exp.notes.length > 30 ? exp.notes.slice(0, 30) + "…" : exp.notes) : "—"}</span>
                          </td>
                          <td style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                            <Button size="sm" className="mr-1" onClick={() => openEditExp(exp)}
                              style={{ background: "rgba(96,165,250,0.3)", border: "1px solid rgba(96,165,250,0.5)", color: "#60A5FA", padding: "3px 7px" }}>
                              <i className="tim-icons icon-pencil" style={{ fontSize: "0.7rem" }} />
                            </Button>
                            <Button size="sm" onClick={() => setDeleteExpConfirm(exp)}
                              style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.45)", color: "#FCA5A5", padding: "3px 7px" }}>
                              <i className="tim-icons icon-trash-simple" style={{ fontSize: "0.7rem" }} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Pagination */}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <span style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>Page {page}</span>
                    <div>
                      <Button size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                        style={{ background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.4)", color: "#60A5FA", marginRight: "8px" }}>
                        ‹ Prev
                      </Button>
                      <Button size="sm" disabled={expenses.length < pageSize} onClick={() => setPage(p => p + 1)}
                        style={{ background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.4)", color: "#60A5FA" }}>
                        Next ›
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ── Category Modal ── */}
      <Modal isOpen={catModalOpen} toggle={() => setCatModalOpen(false)} style={{ maxWidth: "480px" }}>
        <ModalHeader toggle={() => setCatModalOpen(false)} style={{ background: "linear-gradient(135deg, #1e1e2d, #2d2b42)", color: "#fff", borderBottom: "1px solid rgba(167,139,250,0.3)" }}>
          <span style={{ color: "#A78BFA" }}>{editCatId ? "Edit Category" : "New Budget Category"}</span>
        </ModalHeader>
        <Form onSubmit={handleCatSubmit}>
          <ModalBody style={modalBodyStyle}>
            {error && <Alert color="danger" style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5" }}>{error}</Alert>}
            <FormGroup>
              <Label style={{ color: "#A78BFA" }}>Category Name *</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Trip Expenses, Wedding Budget" required style={inputStyle} />
            </FormGroup>
            <FormGroup>
              <Label style={{ color: "#60A5FA" }}>Description (optional)</Label>
              <Input type="textarea" rows={2} value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" style={inputStyle} />
            </FormGroup>
            <FormGroup>
              <Label style={{ color: "#FBBF24" }}>Budget Limit ₹ (optional)</Label>
              <Input type="number" min="0" step="0.01" value={catForm.budgetLimit} onChange={e => setCatForm(f => ({ ...f, budgetLimit: e.target.value }))} placeholder="0 = no limit" style={inputStyle} />
            </FormGroup>
            <FormGroup>
              <div
                onClick={() => setCatForm(f => ({ ...f, isDefault: !f.isDefault }))}
                style={{
                  display: "flex", alignItems: "center", gap: "12px", cursor: "pointer",
                  padding: "10px 14px", borderRadius: "8px",
                  background: catForm.isDefault ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
                  border: catForm.isDefault ? "1px solid rgba(251,191,36,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  transition: "all 0.2s"
                }}
              >
                <div style={{
                  width: "20px", height: "20px", borderRadius: "4px", flexShrink: 0,
                  background: catForm.isDefault ? "#FBBF24" : "rgba(255,255,255,0.1)",
                  border: catForm.isDefault ? "none" : "1px solid rgba(255,255,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s"
                }}>
                  {catForm.isDefault && <span style={{ color: "#1e1e2d", fontWeight: 900, fontSize: "0.75rem" }}>✓</span>}
                </div>
                <div>
                  <div style={{ color: "#FBBF24", fontWeight: 600, fontSize: "0.9rem" }}>
                    ★ Set as Default Category
                  </div>
                  <div style={{ color: "#9a9a9a", fontSize: "0.75rem" }}>
                    This category will be selected automatically when you open Budget
                  </div>
                </div>
              </div>
            </FormGroup>
            <FormGroup>
              <Label style={{ color: "#34D399" }}>Color</Label>
              <div className="d-flex flex-wrap" style={{ gap: "8px" }}>
                {COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setCatForm(f => ({ ...f, color: c }))}
                    style={{
                      width: "28px", height: "28px", borderRadius: "50%", background: c, cursor: "pointer",
                      border: catForm.color === c ? "3px solid #fff" : "2px solid transparent",
                      boxShadow: catForm.color === c ? `0 0 8px ${c}` : "none",
                      transition: "all 0.2s"
                    }}
                  />
                ))}
              </div>
            </FormGroup>
            <FormGroup>
              <Label style={{ color: "#F87171" }}>Icon</Label>
              <div className="d-flex flex-wrap" style={{ gap: "8px" }}>
                {ICONS.map(ic => (
                  <div
                    key={ic.value}
                    onClick={() => setCatForm(f => ({ ...f, icon: ic.value }))}
                    title={ic.label}
                    style={{
                      width: "36px", height: "36px", borderRadius: "8px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: catForm.icon === ic.value ? `${catForm.color}40` : "rgba(255,255,255,0.07)",
                      border: catForm.icon === ic.value ? `1px solid ${catForm.color}` : "1px solid rgba(255,255,255,0.1)",
                      transition: "all 0.2s"
                    }}
                  >
                    <i className={`tim-icons ${ic.value}`} style={{ color: catForm.icon === ic.value ? catForm.color : "#9a9a9a", fontSize: "1rem" }} />
                  </div>
                ))}
              </div>
            </FormGroup>
          </ModalBody>
          <ModalFooter style={modalFooterStyle}>
            <Button onClick={() => setCatModalOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#9a9a9a" }}>Cancel</Button>
            <Button type="submit" disabled={catSaving} style={{ background: "linear-gradient(135deg, #A78BFA, #7C3AED)", border: "none", color: "#fff" }}>
              {catSaving ? <><Spinner size="sm" className="mr-1" />Saving...</> : (editCatId ? "Update" : "Create")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ── Expense Modal ── */}
      <Modal isOpen={expModalOpen} toggle={() => setExpModalOpen(false)} style={{ maxWidth: "500px" }}>
        <ModalHeader toggle={() => setExpModalOpen(false)} style={{ background: "linear-gradient(135deg, #1e1e2d, #2d2b42)", color: "#fff", borderBottom: "1px solid rgba(52,211,153,0.3)" }}>
          <span style={{ color: "#34D399" }}>{editExpId ? "Edit Expense" : "Add Expense"}</span>
        </ModalHeader>
        <Form onSubmit={handleExpSubmit}>
          <ModalBody style={modalBodyStyle}>
            {error && <Alert color="danger" style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5" }}>{error}</Alert>}
            <FormGroup>
              <Label style={{ color: "#A78BFA" }}>Category *</Label>
              <Input type="select" value={expForm.categoryId} onChange={e => setExpForm(f => ({ ...f, categoryId: e.target.value }))} required style={inputStyle}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Input>
            </FormGroup>
            <FormGroup>
              <Label style={{ color: "#34D399" }}>Title *</Label>
              <Input value={expForm.title} onChange={e => setExpForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Hotel booking, Flowers, Catering" required style={inputStyle} />
            </FormGroup>
            <Row>
              <Col sm="6">
                <FormGroup>
                  <Label style={{ color: "#FBBF24" }}>Amount (₹) *</Label>
                  <Input type="number" min="0" step="0.01" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} required style={inputStyle} />
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label style={{ color: "#60A5FA" }}>Date *</Label>
                  <Input type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} required style={inputStyle} />
                </FormGroup>
              </Col>
            </Row>
            <FormGroup>
              <Label style={{ color: "#9a9a9a" }}>Payment Method</Label>
              <Input type="select" value={expForm.paymentMethod} onChange={e => setExpForm(f => ({ ...f, paymentMethod: e.target.value }))} style={inputStyle}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Input>
            </FormGroup>
            <FormGroup>
              <Label style={{ color: "#9a9a9a" }}>Notes (optional)</Label>
              <Input type="textarea" rows={2} value={expForm.notes} onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" style={inputStyle} />
            </FormGroup>
          </ModalBody>
          <ModalFooter style={modalFooterStyle}>
            <Button onClick={() => setExpModalOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#9a9a9a" }}>Cancel</Button>
            <Button type="submit" disabled={expSaving} style={{ background: "linear-gradient(135deg, #34D399, #10B981)", border: "none", color: "#fff" }}>
              {expSaving ? <><Spinner size="sm" className="mr-1" />Saving...</> : (editExpId ? "Update" : "Add")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ── Delete Category Confirm ── */}
      <Modal isOpen={!!deleteCatConfirm} toggle={() => setDeleteCatConfirm(null)}>
        <ModalHeader toggle={() => setDeleteCatConfirm(null)} style={{ background: "#1e1e2d", color: "#fff" }}>
          Delete Category
        </ModalHeader>
        <ModalBody style={modalBodyStyle}>
          <p>Are you sure you want to delete <strong style={{ color: "#A78BFA" }}>{deleteCatConfirm?.name}</strong>?</p>
          <p style={{ color: "#F87171", fontSize: "0.9rem" }}>
            <i className="tim-icons icon-alert-circle-exc mr-1" />
            This will also delete <strong>all expenses</strong> in this category. This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter style={modalFooterStyle}>
          <Button onClick={() => setDeleteCatConfirm(null)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#9a9a9a" }}>Cancel</Button>
          <Button onClick={handleDeleteCat} style={{ background: "linear-gradient(135deg, #F87171, #EF4444)", border: "none", color: "#fff" }}>Delete</Button>
        </ModalFooter>
      </Modal>

      {/* ── Delete Expense Confirm ── */}
      <Modal isOpen={!!deleteExpConfirm} toggle={() => setDeleteExpConfirm(null)}>
        <ModalHeader toggle={() => setDeleteExpConfirm(null)} style={{ background: "#1e1e2d", color: "#fff" }}>
          Delete Expense
        </ModalHeader>
        <ModalBody style={modalBodyStyle}>
          Are you sure you want to delete <strong style={{ color: "#34D399" }}>{deleteExpConfirm?.title}</strong> (₹{deleteExpConfirm?.amount?.toLocaleString?.()})?
        </ModalBody>
        <ModalFooter style={modalFooterStyle}>
          <Button onClick={() => setDeleteExpConfirm(null)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#9a9a9a" }}>Cancel</Button>
          <Button onClick={handleDeleteExp} style={{ background: "linear-gradient(135deg, #F87171, #EF4444)", border: "none", color: "#fff" }}>Delete</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default Budget;
