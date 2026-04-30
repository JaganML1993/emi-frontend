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
import { format } from "date-fns";
import api from "../config/axios";

const COLORS = [
  "rgba(255,255,255,0.55)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0.38)",
  "rgba(255,255,255,0.32)", "rgba(255,255,255,0.27)", "rgba(255,255,255,0.22)",
  "rgba(255,255,255,0.55)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0.38)", "rgba(255,255,255,0.32)",
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
const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
};
const modalBodyStyle = { background: "#1a1a1e", color: "#fff" };
const modalFooterStyle = { background: "#141416", borderTop: "1px solid rgba(255,255,255,0.08)" };
const labelStyle = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};
const modalHeaderStyle = {
  background: "#141416",
  color: "#fff",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

function Budget() {
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
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

  const [page, setPage] = useState(1);
  const pageSize = 15;

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
    if (!selectedCategoryId) {
      setExpenses([]);
      setExpLoading(false);
      return;
    }
    setExpLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("categoryId", selectedCategoryId);
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
  }, [selectedCategoryId, page, pageSize]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchCategories();
      setLoading(false);
    };
    init();
  }, [fetchCategories]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategoryId]);

  const grandTotal = useMemo(() => categories.reduce((s, c) => s + (c.totalSpent || 0), 0), [categories]);

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
      await fetchCategories();
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
      if (selectedCategoryId === deleteCatConfirm._id) setSelectedCategoryId("");
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
    setExpForm({ ...emptyExpForm, date: format(new Date(), "yyyy-MM-dd"), categoryId: selectedCategoryId || "" });
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

  if (loading) {
    return (
      <div className="content">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <i
            className="tim-icons icon-refresh-02"
            style={{
              fontSize: "2.5rem",
              color: "#f59e0b",
              animation: "budgetSpin 0.9s linear infinite",
              display: "inline-block",
            }}
          />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes budgetSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  const selectedCat = selectedCategoryId ? categories.find((c) => c._id === selectedCategoryId) : null;
  const budgetProgress = selectedCat?.budgetLimit > 0 ? Math.min(100, ((selectedCat.totalSpent || 0) / selectedCat.budgetLimit) * 100) : null;

  return (
    <div className="content budget-page-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes budgetSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .budget-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
        .budget-table-wrap table { min-width: 640px; }
      `,
        }}
      />
      {/* ── Alerts ── */}
      {(error || success) && (
        <Row>
          <Col xs="12">
            {error && (
              <Alert
                color="danger"
                toggle={() => setError("")}
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
                toggle={() => setSuccess("")}
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
          </Col>
        </Row>
      )}

      <Row>
        {/* ── Categories Panel ── */}
        <Col md="4" lg="3">
          <Card style={cardStyle}>
            <CardHeader style={headerStyle}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <CardTitle tag="h5" style={{ color: "#fff", margin: 0, fontSize: "1.02rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                    <i className="tim-icons icon-tag mr-2" style={{ color: "#fbbf24" }} />
                    Categories
                  </CardTitle>
                  {categories.length > 0 && (
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.38)", marginTop: 6 }}>
                      Total spent (all):{" "}
                      <span style={{ color: "rgba(251,191,36,0.9)", fontWeight: 700 }}>₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
                <Button type="button" className="btn-amber-outline" size="sm" onClick={openAddCat} style={{ padding: "6px 12px" }} title="New Category">
                  <i className="tim-icons icon-simple-add" />
                </Button>
              </div>
            </CardHeader>
            <CardBody style={{ padding: "0.65rem", background: "rgba(0,0,0,0.14)" }}>
              {categories.length > 0 && (
                <div
                  style={{
                    padding: "8px 10px 10px",
                    marginBottom: 6,
                    fontSize: "0.74rem",
                    color: "rgba(255,255,255,0.42)",
                    lineHeight: 1.45,
                    background: "rgba(255,160,46,0.06)",
                    border: "1px solid rgba(255,160,46,0.12)",
                    borderRadius: 8,
                  }}
                >
                  <i className="tim-icons icon-bulb-63 mr-1" style={{ color: "#fbbf24", opacity: 0.85 }} />
                  Select a category to load its expenses. Nothing is shown until you choose one.
                </div>
              )}

              {categories.length === 0 ? (
                <div className="text-center py-4" style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem" }}>
                  <i className="tim-icons icon-tag" style={{ fontSize: "2rem", marginBottom: "8px", display: "block", color: accentAmber, opacity: 0.45 }} />
                  No categories yet.<br />
                  <span style={{ color: "rgba(255,255,255,0.5)", cursor: "pointer" }} onClick={openAddCat}>Create one</span>
                </div>
              ) : (
                categories.map(cat => {
                  const isSelected = selectedCategoryId === cat._id;
                  const progress = cat.budgetLimit > 0 ? Math.min(100, ((cat.totalSpent || 0) / cat.budgetLimit) * 100) : null;
                  return (
                    <div
                      key={cat._id}
                      onClick={() => setSelectedCategoryId(cat._id)}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "9px 10px", borderRadius: "8px", cursor: "pointer", marginBottom: "4px",
                        background: isSelected ? "rgba(255,160,46,0.1)" : "rgba(255,255,255,0.03)",
                        border: isSelected ? "1px solid rgba(255,160,46,0.28)" : "1px solid transparent",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className={`tim-icons ${cat.icon}`} style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }} />
                      </div>

                      {/* Name + amount */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {cat.name}
                          {cat.isDefault && <span title="Default" style={{ marginLeft: "5px", color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>★</span>}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>
                          ₹{(cat.totalSpent || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          {cat.budgetLimit > 0 && ` / ₹${cat.budgetLimit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                        </div>
                        {progress !== null && (
                          <div style={{ marginTop: "4px", height: "3px", background: "rgba(255,255,255,0.07)", borderRadius: "2px" }}>
                            <div
                              style={{
                                width: `${progress}%`,
                                height: "100%",
                                background: "linear-gradient(90deg, #fbbf24, #e8890c)",
                                borderRadius: "2px",
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: "3px", flexShrink: 0 }}>
                        <button onClick={() => openEditCat(cat)} title="Edit" style={{ background: "rgba(255,160,46,0.12)", border: "1px solid rgba(255,160,46,0.3)", borderRadius: 4, color: "#fbbf24", width: 22, height: 22, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="tim-icons icon-pencil" style={{ fontSize: "0.6rem" }} />
                        </button>
                        <button onClick={() => setDeleteCatConfirm(cat)} title="Delete" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 4, color: "#f87171", width: 22, height: 22, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
            <CardHeader style={headerStyle}>
              <Row className="align-items-center">
                <Col sm="6">
                  <CardTitle tag="h5" style={{ color: "#fff", margin: 0, fontSize: "1.02rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                    <i className="tim-icons icon-money-coins mr-2" style={{ color: "#fbbf24" }} />
                    {!selectedCategoryId ? "Expenses" : `${selectedCat?.name || "Category"} · expenses`}
                  </CardTitle>
                  {budgetProgress !== null && (
                    <div className="mt-1">
                      <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 3, maxWidth: "180px" }}>
                        <div
                          style={{
                            width: `${budgetProgress}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #fbbf24, #e8890c)",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <small style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.68rem" }}>{budgetProgress.toFixed(0)}% of budget used</small>
                    </div>
                  )}
                </Col>
                <Col sm="6" className="text-right">
                  <Button type="button" className="btn-amber-outline" onClick={openAddExp} disabled={categories.length === 0 || !selectedCategoryId} style={{ padding: "6px 14px" }} title={!selectedCategoryId ? "Select a category first" : undefined}>
                    <i className="tim-icons icon-simple-add mr-1" /> Add Expense
                  </Button>
                </Col>
              </Row>
            </CardHeader>

            <CardBody style={{ padding: "1rem", background: "rgba(0,0,0,0.14)" }}>
              {!selectedCategoryId ? (
                <div className="text-center py-5" style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)" }}>
                  <i className="tim-icons icon-tag" style={{ fontSize: "3rem", color: "rgba(255,255,255,0.2)" }} />
                  <h5 style={{ color: "rgba(255,255,255,0.65)", marginTop: "1rem" }}>Choose a category</h5>
                  <p style={{ color: "rgba(255,255,255,0.38)", maxWidth: 360, margin: "0.5rem auto 0" }}>
                    Pick a budget category on the left to load expenses for that category only.
                  </p>
                </div>
              ) : expLoading ? (
                <div className="text-center py-5">
                  <i
                    className="tim-icons icon-refresh-02"
                    style={{
                      fontSize: "2rem",
                      color: "#f59e0b",
                      animation: "budgetSpin 0.9s linear infinite",
                      display: "inline-block",
                    }}
                  />
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-5" style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,160,46,0.22)" }}>
                  <i className="tim-icons icon-money-coins" style={{ fontSize: "3rem", color: "rgba(255,160,46,0.35)" }} />
                  <h5 style={{ color: "rgba(255,255,255,0.75)", marginTop: "1rem" }}>No expenses in this category</h5>
                  <p style={{ color: "rgba(255,255,255,0.4)" }}>
                    {categories.length === 0 ? "Create a category first, then add expenses" : "Add an expense to this category"}
                  </p>
                  {categories.length > 0 && selectedCategoryId && (
                    <Button type="button" className="btn-amber-outline" onClick={openAddExp}>
                      <i className="tim-icons icon-simple-add mr-1" /> Add Expense
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="budget-table-wrap">
                    <Table responsive className="table-hover" style={{ color: "rgba(255,255,255,0.78)", marginBottom: 0 }}>
                      <thead>
                        <tr style={{ background: "rgba(255,160,46,0.06)" }}>
                          {["Date", "Title", "Amount", "Method", "Notes", "Actions"].map((h) => (
                            <th
                              key={h}
                              style={{
                                color: "rgba(251,191,36,0.85)",
                                borderColor: "rgba(255,255,255,0.07)",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                ...(h === "Actions" ? { width: 90 } : {}),
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((exp) => (
                          <tr key={exp._id}>
                            <td style={{ borderColor: "rgba(255,255,255,0.05)", fontSize: "0.83rem" }}>{format(new Date(exp.date), "dd MMM yyyy")}</td>
                            <td style={{ borderColor: "rgba(255,255,255,0.05)", fontSize: "0.83rem" }}>{exp.title}</td>
                            <td style={{ borderColor: "rgba(255,255,255,0.05)", color: "#fbbf24", fontWeight: 700, fontSize: "0.83rem" }}>
                              ₹{Number(exp.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                              <Badge
                                style={{
                                  background: "rgba(255,160,46,0.1)",
                                  border: "1px solid rgba(255,160,46,0.25)",
                                  color: "rgba(251,191,36,0.9)",
                                  fontSize: "0.68rem",
                                  textTransform: "uppercase",
                                }}
                              >
                                {exp.paymentMethod}
                              </Badge>
                            </td>
                            <td style={{ borderColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.38)", fontSize: "0.78rem", maxWidth: "150px" }}>
                              <span title={exp.notes}>{exp.notes ? (exp.notes.length > 30 ? exp.notes.slice(0, 30) + "…" : exp.notes) : "—"}</span>
                            </td>
                            <td style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                              <button
                                type="button"
                                onClick={() => openEditExp(exp)}
                                title="Edit"
                                style={{
                                  background: "rgba(255,160,46,0.12)",
                                  border: "1px solid rgba(255,160,46,0.3)",
                                  borderRadius: 4,
                                  color: "#fbbf24",
                                  width: 28,
                                  height: 28,
                                  padding: 0,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginRight: 6,
                                }}
                              >
                                <i className="tim-icons icon-pencil" style={{ fontSize: "0.65rem" }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteExpConfirm(exp)}
                                title="Delete"
                                style={{
                                  background: "rgba(239,68,68,0.08)",
                                  border: "1px solid rgba(239,68,68,0.22)",
                                  borderRadius: 4,
                                  color: "#f87171",
                                  width: 28,
                                  height: 28,
                                  padding: 0,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <i className="tim-icons icon-trash-simple" style={{ fontSize: "0.65rem" }} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem" }}>Page {page}</span>
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
                        ‹ Prev
                      </button>
                      <button
                        type="button"
                        disabled={expenses.length < pageSize}
                        onClick={() => setPage((p) => p + 1)}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          padding: "6px 12px",
                          color: expenses.length < pageSize ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.65)",
                          cursor: expenses.length < pageSize ? "not-allowed" : "pointer",
                        }}
                      >
                        Next ›
                      </button>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ── Category Modal ── */}
      <Modal isOpen={catModalOpen} toggle={() => setCatModalOpen(false)} style={{ maxWidth: "480px" }} contentClassName="bg-dark border-0">
        <ModalHeader toggle={() => setCatModalOpen(false)} style={modalHeaderStyle}>
          <span style={{ color: "#fbbf24", fontWeight: 700 }}>{editCatId ? "Edit Category" : "New Budget Category"}</span>
        </ModalHeader>
        <Form onSubmit={handleCatSubmit}>
          <ModalBody style={modalBodyStyle}>
            {error && (
              <Alert color="danger" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#FCA5A5", borderRadius: 10 }}>
                {error}
              </Alert>
            )}
            <FormGroup>
              <Label style={labelStyle}>Category Name *</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Trip Expenses, Wedding Budget" required style={inputStyle} />
            </FormGroup>
            <FormGroup>
              <Label style={labelStyle}>Description (optional)</Label>
              <Input type="textarea" rows={2} value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" style={inputStyle} />
            </FormGroup>
            <FormGroup>
              <Label style={labelStyle}>Budget Limit ₹ (optional)</Label>
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
                    Shown as ★ in the list; you still choose a category to view expenses
                  </div>
                </div>
              </div>
            </FormGroup>
            <FormGroup>
              <Label style={labelStyle}>Color</Label>
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
              <Label style={labelStyle}>Icon</Label>
              <div className="d-flex flex-wrap" style={{ gap: "8px" }}>
                {ICONS.map(ic => (
                  <div
                    key={ic.value}
                    onClick={() => setCatForm(f => ({ ...f, icon: ic.value }))}
                    title={ic.label}
                    style={{ width: 36, height: 36, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: catForm.icon === ic.value ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)", border: catForm.icon === ic.value ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.08)", transition: "all 0.2s" }}
                  >
                    <i className={`tim-icons ${ic.value}`} style={{ color: catForm.icon === ic.value ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)", fontSize: "1rem" }} />
                  </div>
                ))}
              </div>
            </FormGroup>
          </ModalBody>
          <ModalFooter style={modalFooterStyle}>
            <Button type="button" className="btn-cancel-outline" onClick={() => setCatModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-amber-outline" disabled={catSaving}>
              {catSaving ? (
                <>
                  <Spinner size="sm" className="mr-2" style={{ color: "#ffb347" }} />
                  Saving…
                </>
              ) : editCatId ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={expModalOpen} toggle={() => setExpModalOpen(false)} style={{ maxWidth: "500px" }} contentClassName="bg-dark border-0">
        <ModalHeader toggle={() => setExpModalOpen(false)} style={modalHeaderStyle}>
          <span style={{ color: "#fbbf24", fontWeight: 700 }}>{editExpId ? "Edit Expense" : "Add Expense"}</span>
        </ModalHeader>
        <Form onSubmit={handleExpSubmit}>
          <ModalBody style={modalBodyStyle}>
            {error && (
              <Alert color="danger" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#FCA5A5", borderRadius: 10 }}>
                {error}
              </Alert>
            )}
            <FormGroup><Label style={labelStyle}>Category *</Label><Input type="select" value={expForm.categoryId} onChange={e => setExpForm(f=>({...f,categoryId:e.target.value}))} required style={inputStyle}><option value="">Select category</option>{categories.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</Input></FormGroup>
            <FormGroup><Label style={labelStyle}>Title *</Label><Input value={expForm.title} onChange={e => setExpForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Hotel booking" required style={inputStyle} /></FormGroup>
            <Row>
              <Col sm="6"><FormGroup><Label style={labelStyle}>Amount (₹) *</Label><Input type="number" min="0" step="0.01" value={expForm.amount} onChange={e => setExpForm(f=>({...f,amount:e.target.value}))} required style={inputStyle} /></FormGroup></Col>
              <Col sm="6"><FormGroup><Label style={labelStyle}>Date *</Label><Input type="date" value={expForm.date} onChange={e => setExpForm(f=>({...f,date:e.target.value}))} required style={inputStyle} /></FormGroup></Col>
            </Row>
            <FormGroup><Label style={labelStyle}>Payment Method</Label><Input type="select" value={expForm.paymentMethod} onChange={e => setExpForm(f=>({...f,paymentMethod:e.target.value}))} style={inputStyle}>{PAYMENT_METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</Input></FormGroup>
            <FormGroup><Label style={labelStyle}>Notes (optional)</Label><Input type="textarea" rows={2} value={expForm.notes} onChange={e => setExpForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes" style={inputStyle} /></FormGroup>
          </ModalBody>
          <ModalFooter style={modalFooterStyle}>
            <Button type="button" className="btn-cancel-outline" onClick={() => setExpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-amber-outline" disabled={expSaving}>
              {expSaving ? (
                <>
                  <Spinner size="sm" className="mr-2" style={{ color: "#ffb347" }} />
                  Saving…
                </>
              ) : editExpId ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={!!deleteCatConfirm} toggle={() => setDeleteCatConfirm(null)} contentClassName="bg-dark border-0">
        <ModalHeader toggle={() => setDeleteCatConfirm(null)} style={modalHeaderStyle}>
          Delete Category
        </ModalHeader>
        <ModalBody style={modalBodyStyle}>
          <p>Are you sure you want to delete <strong style={{ color: "rgba(255,255,255,0.7)" }}>{deleteCatConfirm?.name}</strong>?</p>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>
            <i className="tim-icons icon-alert-circle-exc mr-1" />This will also delete <strong>all expenses</strong> in this category. This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter style={modalFooterStyle}>
          <Button type="button" className="btn-cancel-outline" onClick={() => setDeleteCatConfirm(null)}>
            Cancel
          </Button>
          <Button type="button" color="danger" onClick={handleDeleteCat}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!deleteExpConfirm} toggle={() => setDeleteExpConfirm(null)} contentClassName="bg-dark border-0">
        <ModalHeader toggle={() => setDeleteExpConfirm(null)} style={modalHeaderStyle}>
          Delete Expense
        </ModalHeader>
        <ModalBody style={modalBodyStyle}>
          Are you sure you want to delete <strong style={{ color: "rgba(255,255,255,0.7)" }}>{deleteExpConfirm?.title}</strong> (₹{deleteExpConfirm?.amount?.toLocaleString?.()})?
        </ModalBody>
        <ModalFooter style={modalFooterStyle}>
          <Button type="button" className="btn-cancel-outline" onClick={() => setDeleteExpConfirm(null)}>
            Cancel
          </Button>
          <Button type="button" color="danger" onClick={handleDeleteExp}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default Budget;
