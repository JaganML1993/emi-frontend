import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col, Button, Form, FormGroup, Label, Input, Alert, Spinner,
} from "reactstrap";
import { format } from "date-fns";
import api from "../config/axios";
import { EXPENSE_CATEGORY_VALUES } from "../constants/expenseCategories";

const PAYMENT_MODES = [
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  name: "",
  amount: "",
  category: "",
  paymentMode: "upi",
  type: "expense",
  notes: "",
};

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
  padding: "1.1rem clamp(1rem, 3vw, 1.5rem)",
};

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "#fff",
  padding: "10px 14px",
  fontSize: "0.9rem",
};

const labelStyle = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};

const suggestPanelStyle = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  background: "linear-gradient(180deg, #1e1e22 0%, #18181c 100%)",
  border: "1px solid rgba(255,160,46,0.18)",
  borderRadius: 10,
  zIndex: 200,
  maxHeight: 220,
  overflowY: "auto",
  boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
};

const amberChip = (active) => ({
  padding: "7px 16px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: "0.82rem",
  cursor: "pointer",
  transition: "all 0.18s ease",
  background: active ? "rgba(255,160,46,0.14)" : "transparent",
  border: `1px solid ${active ? "rgba(255,160,46,0.35)" : "rgba(255,255,255,0.1)"}`,
  color: active ? "#fbbf24" : "rgba(255,255,255,0.45)",
});

function ExpenseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading]   = useState(isEdit);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [isDirty, setIsDirty]   = useState(false);
  const [catalogCategories, setCatalogCategories] = useState(EXPENSE_CATEGORY_VALUES);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [nameDebounce, setNameDebounce] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    api.get("/api/expenses/categories").then((res) => {
      if (res.data.success && Array.isArray(res.data.data) && res.data.data.length)
        setCatalogCategories(res.data.data);
    }).catch(() => {});
    api.get("/api/expenses/names").then(res => {
      if (res.data.success) setNameSuggestions(res.data.data);
    }).catch(() => {});
  }, []);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setIsDirty(true);
    setFormData(f => ({ ...f, name: val }));
    setShowNameSuggestions(true);
    if (nameDebounce) clearTimeout(nameDebounce);
    const t = setTimeout(() => {
      api.get(`/api/expenses/names?q=${encodeURIComponent(val)}`).then(res => {
        if (res.data.success) setNameSuggestions(res.data.data);
      }).catch(() => {});
    }, 250);
    setNameDebounce(t);
  };

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const res = await api.get(`/api/expenses/${id}`);
        if (res.data.success) {
          const e = res.data.data;
          setFormData({
            date:        format(new Date(e.date), "yyyy-MM-dd"),
            name:        e.name,
            amount:      String(e.amount),
            category:    e.category || "",
            paymentMode: e.paymentMode,
            type:        e.type,
            notes:       e.notes || "",
          });
        }
      } catch { setError("Failed to load entry."); }
      finally { setLoading(false); }
    };
    load();
  }, [id, isEdit]);

  const set = (field) => (e) => {
    setIsDirty(true);
    setFormData(f => ({ ...f, [field]: e.target.value }));
  };

  const categoryOptions = useMemo(() => {
    const base = [...catalogCategories];
    if (formData.category && !base.includes(formData.category))
      return [formData.category, ...base];
    return base;
  }, [catalogCategories, formData.category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.name.trim()) { setError("Please enter a name."); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { setError("Amount must be greater than 0."); return; }
    if (!formData.category.trim()) { setError("Please select a category."); return; }

    try {
      setSaving(true);
      const payload = { ...formData, amount: parseFloat(formData.amount) };
      if (isEdit) {
        await api.put(`/api/expenses/${id}`, payload);
      } else {
        await api.post("/api/expenses", payload);
      }
      setIsDirty(false);
      navigate("/admin/expenses");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Leave anyway?")) return;
    navigate("/admin/expenses");
  };

  if (loading) {
    return (
      <div className="content expense-form-root">
        <style dangerouslySetInnerHTML={{ __html: `@keyframes expenseFormSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
          <i className="tim-icons icon-refresh-02" style={{ fontSize: "2.25rem", color: "#f59e0b", animation: "expenseFormSpin 0.9s linear infinite", display: "inline-block" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="content expense-form-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes expenseFormSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
      <Row className="justify-content-center">
        <Col md="8" lg="7">
          <button type="button" onClick={goBack} style={{ background: "none", border: "none", color: "rgba(251,191,36,0.85)", fontSize: "0.85rem", cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6, padding: 0, fontWeight: 600 }}>
            <i className="tim-icons icon-minimal-left" style={{ fontSize: "0.75rem" }} />
            Back to Expenses
          </button>

          <Card style={cardStyle}>
            <CardHeader style={headerStyle}>
              <CardTitle tag="h4" style={{ color: "#fff", fontWeight: 800, margin: 0, fontSize: "1.08rem", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="tim-icons icon-notes" style={{ color: "#fbbf24" }} />
                {isEdit ? "Edit Expense" : "Add Expense"}
              </CardTitle>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", margin: "6px 0 0", lineHeight: 1.45 }}>
                {isEdit ? "Update the entry below" : "Record a new expense or saving"}
              </p>
            </CardHeader>

            <CardBody style={{ padding: "1.75rem", background: "rgba(0,0,0,0.14)" }}>
              {error && (
                <Alert color="danger" toggle={() => setError("")} style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#FCA5A5", borderRadius: 10, marginBottom: 20 }}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Type toggle */}
                <FormGroup>
                  <Label style={labelStyle}>Type *</Label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ v: "expense", label: "Expense" }, { v: "savings", label: "Savings" }].map((opt) => {
                      const active = formData.type === opt.v;
                      const expenseActive = active && opt.v === "expense";
                      const savingsActive = active && opt.v === "savings";
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => { setIsDirty(true); setFormData(f => ({ ...f, type: opt.v })); }}
                          style={{
                            flex: 1,
                            padding: "12px 10px",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontWeight: 800,
                            fontSize: "0.88rem",
                            transition: "all 0.18s ease",
                            background: expenseActive
                              ? "rgba(248,113,113,0.12)"
                              : savingsActive
                                ? "rgba(52,211,153,0.12)"
                                : "transparent",
                            border: expenseActive
                              ? "1px solid rgba(248,113,113,0.4)"
                              : savingsActive
                                ? "1px solid rgba(52,211,153,0.38)"
                                : "1px solid rgba(255,255,255,0.1)",
                            color: expenseActive ? "#fca5a5" : savingsActive ? "#6ee7b7" : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {opt.v === "expense" ? "\uD83D\uDCB8" : "\uD83D\uDCB0"} {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </FormGroup>

                <Row>
                  <Col md="6">
                    <FormGroup style={{ position: "relative" }}>
                      <Label style={labelStyle}>Name *</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Dinner at restaurant"
                        value={formData.name}
                        onChange={handleNameChange}
                        onFocus={() => setShowNameSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
                        required
                        style={inputStyle}
                        autoComplete="off"
                      />
                      {showNameSuggestions && nameSuggestions.length > 0 && (
                        <div style={suggestPanelStyle}>
                          {nameSuggestions
                            .filter(n => !formData.name || n.toLowerCase().includes(formData.name.toLowerCase()))
                            .map(name => (
                              <div
                                key={name}
                                onMouseDown={() => { setFormData(f => ({ ...f, name })); setShowNameSuggestions(false); setIsDirty(true); }}
                                style={{ padding: "9px 14px", cursor: "pointer", color: "rgba(255,255,255,0.65)", fontSize: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8 }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >
                                <i className="tim-icons icon-zoom-split" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                                {name}
                              </div>
                            ))}
                        </div>
                      )}
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>Amount (₹) *</Label>
                      <Input type="number" min="0.01" step="0.01" placeholder="e.g. 500" value={formData.amount} onChange={set("amount")} required style={inputStyle} />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>Category *</Label>
                      <Input
                        type="select"
                        value={formData.category}
                        onChange={(e) => {
                          setIsDirty(true);
                          setFormData((f) => ({ ...f, category: e.target.value }));
                        }}
                        required
                        style={{ ...inputStyle, colorScheme: "dark" }}
                      >
                        <option value="">Select category</option>
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>Payment Mode</Label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {PAYMENT_MODES.map((m) => {
                          const active = formData.paymentMode === m.value;
                          return (
                            <button
                              key={m.value}
                              type="button"
                              onClick={() => { setIsDirty(true); setFormData((f) => ({ ...f, paymentMode: m.value })); }}
                              style={amberChip(active)}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </FormGroup>
                  </Col>
                </Row>

                <FormGroup>
                  <Label style={labelStyle}>Date *</Label>
                  <Input type="date" value={formData.date} onChange={set("date")} required style={{ ...inputStyle, colorScheme: "dark" }} />
                </FormGroup>

                <FormGroup>
                  <Label style={labelStyle}>Notes</Label>
                  <Input type="textarea" rows="3" placeholder="Optional note..." value={formData.notes} onChange={set("notes")} style={{ ...inputStyle, resize: "vertical" }} />
                </FormGroup>

                {formData.amount && parseFloat(formData.amount) > 0 && (
                  <div style={{ background: "rgba(255,160,46,0.08)", border: "1px solid rgba(255,160,46,0.22)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
                      {formData.type === "savings" ? "💰 Saving" : "💸 Expense"}
                      {formData.category ? ` · ${formData.category}` : ""}
                    </span>
                    <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: "1.1rem" }}>
                      {"\u20B9"}{parseFloat(formData.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <Button type="button" className="btn-cancel-outline" onClick={goBack} style={{ padding: "10px 22px" }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-amber-outline" disabled={saving} style={{ padding: "10px 28px", minWidth: 140 }}>
                    {saving ? (
                      <>
                        <Spinner size="sm" className="mr-2" style={{ color: "#ffb347" }} />
                        Saving…
                      </>
                    ) : isEdit ? (
                      "Save Changes"
                    ) : (
                      "Add Entry"
                    )}
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ExpenseForm;
