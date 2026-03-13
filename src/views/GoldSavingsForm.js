import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col, Button, Form, FormGroup, Label, Input, Spinner,
} from "reactstrap";
import { format } from "date-fns";
import api from "../config/axios";


const PAYMENT_TYPES = [
  { value: "cash",          label: "Cash" },
  { value: "card",          label: "Card" },
  { value: "upi",           label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other",         label: "Other" },
];

const emptyForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  grams: "1",
  pricePerGram: "",
  paymentType: "upi",
  goldType: "physical",
  notes: "",
};

const inputStyle = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 9,
  color: "#FFFFFF",
  padding: "10px 14px",
  fontSize: "0.9rem",
};

const labelStyle = {
  color: "#CCCCCC",
  fontSize: "0.82rem",
  fontWeight: 500,
  marginBottom: 5,
};

function GoldSavingsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData]   = useState(emptyForm);
  const [loading, setLoading]     = useState(isEdit);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [isDirty, setIsDirty]     = useState(false);

  // Fetch existing entry when editing
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const res = await api.get(`/api/gold-savings?limit=200`);
        const entry = res.data.data?.find((e) => e._id === id);
        if (!entry) { setError("Entry not found."); setLoading(false); return; }
        setFormData({
          date:         format(new Date(entry.date), "yyyy-MM-dd"),
          grams:        String(entry.grams),
          pricePerGram: String(entry.pricePerGram),
          paymentType:  entry.paymentType,
          goldType:     entry.goldType,
          notes:        entry.notes || "",
        });
      } catch {
        setError("Failed to load entry.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  // Warn browser on tab close/refresh when form is dirty
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const set = (field) => (e) => { setIsDirty(true); setFormData((f) => ({ ...f, [field]: e.target.value })); };

  const totalValue =
    formData.grams && formData.pricePerGram
      ? parseFloat(formData.grams) * parseFloat(formData.pricePerGram)
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.date) { setError("Please select a date."); return; }
    if (!formData.grams || parseFloat(formData.grams) <= 0) { setError("Grams must be greater than 0."); return; }
    if (!formData.pricePerGram || parseFloat(formData.pricePerGram) <= 0) { setError("Amount paid must be greater than 0."); return; }

    try {
      setSaving(true);
      if (isEdit) {
        await api.put(`/api/gold-savings/${id}`, formData);
      } else {
        await api.post("/api/gold-savings", formData);
      }
      setIsDirty(false);
      navigate("/admin/gold-savings");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const GOLD_ACCENT = "#FFD700";

  if (loading) {
    return (
      <div className="content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Spinner style={{ color: GOLD_ACCENT, width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="content">
      <Row className="justify-content-center">
        <Col md="8" lg="6">
          {/* Back button */}
          <button
            onClick={() => {
              if (isDirty && !window.confirm("You have unsaved changes. Leave anyway?")) return;
              navigate("/admin/gold-savings");
            }}
            style={{ background: "none", border: "none", color: "#9a9a9a", fontSize: "0.85rem", cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6, padding: 0 }}
          >
            <i className="tim-icons icon-minimal-left" style={{ fontSize: "0.75rem" }} />
            Back to Gold Savings
          </button>

          <Card style={{ background: "#1E1E1E", border: `1px solid ${GOLD_ACCENT}33`, borderRadius: 16, overflow: "hidden" }}>
            {/* Header */}
            <CardHeader style={{ background: `linear-gradient(135deg, ${GOLD_ACCENT}18 0%, ${GOLD_ACCENT}08 100%)`, borderBottom: `1px solid ${GOLD_ACCENT}25`, padding: "1.2rem 1.5rem" }}>
              <CardTitle tag="h4" style={{ color: GOLD_ACCENT, fontWeight: 700, margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="tim-icons icon-coins" style={{ color: GOLD_ACCENT }} />
                {isEdit ? "Edit Gold Entry" : "Add Gold Savings"}
              </CardTitle>
              <p style={{ color: "#9a9a9a", fontSize: "0.78rem", margin: "4px 0 0" }}>
                {isEdit ? "Update the details below" : "Record your gold purchase"}
              </p>
            </CardHeader>

            <CardBody style={{ padding: "1.75rem" }}>
              {error && (
                <div style={{ background: "rgba(229,57,53,0.12)", border: "1px solid rgba(229,57,53,0.35)", borderRadius: 9, padding: "10px 14px", color: "#FF6B6B", fontSize: "0.85rem", marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
                  {error}
                  <span style={{ cursor: "pointer", fontWeight: 700 }} onClick={() => setError("")}>✕</span>
                </div>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Date */}
                <FormGroup>
                  <Label style={labelStyle}>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={set("date")}
                    required
                    style={{ ...inputStyle, colorScheme: "dark" }}
                  />
                </FormGroup>

                {/* Grams + Amount Paid */}
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>Grams *</Label>
                      {/* Stepper: 1–50 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 0, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 9, overflow: "hidden" }}>
                        <button
                          type="button"
                          onClick={() => { setIsDirty(true); setFormData(f => ({ ...f, grams: String(Math.max(1, (parseInt(f.grams) || 1) - 1)) })); }}
                          style={{ width: 42, height: 42, background: "rgba(255,215,0,0.1)", border: "none", borderRight: "1px solid rgba(255,255,255,0.1)", color: "#FFD700", fontSize: "1.2rem", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >−</button>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={formData.grams}
                          onChange={(e) => {
                            const v = Math.min(50, Math.max(1, parseInt(e.target.value) || 1));
                            setIsDirty(true);
                            setFormData(f => ({ ...f, grams: String(v) }));
                          }}
                          style={{ flex: 1, background: "transparent", border: "none", color: "#FFD700", fontWeight: 700, fontSize: "1.1rem", textAlign: "center", outline: "none", padding: "0 4px", minWidth: 0 }}
                        />
                        <span style={{ color: "#9a9a9a", fontSize: "0.8rem", paddingRight: 8 }}>g</span>
                        <button
                          type="button"
                          onClick={() => { setIsDirty(true); setFormData(f => ({ ...f, grams: String(Math.min(50, (parseInt(f.grams) || 1) + 1)) })); }}
                          style={{ width: 42, height: 42, background: "rgba(255,215,0,0.1)", border: "none", borderLeft: "1px solid rgba(255,255,255,0.1)", color: "#FFD700", fontSize: "1.2rem", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >+</button>
                      </div>
                      {/* Quick-pick row */}
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {[1, 2, 4, 5, 8, 10, 20, 50].map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => { setIsDirty(true); setFormData(f => ({ ...f, grams: String(g) })); }}
                            style={{
                              padding: "3px 10px", borderRadius: 6, fontSize: "0.75rem", cursor: "pointer",
                              background: parseInt(formData.grams) === g ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.05)",
                              border: `1px solid ${parseInt(formData.grams) === g ? "rgba(255,215,0,0.6)" : "rgba(255,255,255,0.1)"}`,
                              color: parseInt(formData.grams) === g ? "#FFD700" : "#9a9a9a",
                              fontWeight: parseInt(formData.grams) === g ? 700 : 400,
                            }}
                          >{g}g</button>
                        ))}
                      </div>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>Amount Paid (₹) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="e.g. 72000"
                        value={formData.pricePerGram}
                        onChange={set("pricePerGram")}
                        required
                        style={inputStyle}
                      />
                    </FormGroup>
                  </Col>
                </Row>

                {/* Auto-calculated total value */}
                {totalValue !== null && formData.grams && formData.pricePerGram && (
                  <div style={{ background: `${GOLD_ACCENT}12`, border: `1px solid ${GOLD_ACCENT}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>
                      ₹{(parseFloat(formData.pricePerGram) / parseFloat(formData.grams)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/g rate
                    </span>
                    <span style={{ color: GOLD_ACCENT, fontWeight: 700, fontSize: "1.1rem" }}>
                      ₹{parseFloat(formData.pricePerGram).toLocaleString("en-IN", { maximumFractionDigits: 0 })} paid
                    </span>
                  </div>
                )}

                {/* Payment Type */}
                <FormGroup>
                  <Label style={labelStyle}>Payment Type</Label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {PAYMENT_TYPES.map((p) => {
                      const active = formData.paymentType === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setFormData((f) => ({ ...f, paymentType: p.value }))}
                          style={{
                            background: active ? "rgba(0,191,255,0.18)" : "rgba(255,255,255,0.05)",
                            border: `1.5px solid ${active ? "rgba(0,191,255,0.7)" : "rgba(255,255,255,0.12)"}`,
                            borderRadius: 9,
                            padding: "7px 16px",
                            color: active ? "#00BFFF" : "#9a9a9a",
                            fontWeight: active ? 700 : 400,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </FormGroup>

                {/* Notes */}
                <FormGroup>
                  <Label style={labelStyle}>Notes</Label>
                  <Input
                    type="textarea"
                    rows={3}
                    placeholder="e.g. Bought from Tanishq on anniversary…"
                    value={formData.notes}
                    onChange={set("notes")}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </FormGroup>

                {/* Actions */}
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                  <Button
                    type="button"
                    onClick={() => {
                      if (isDirty && !window.confirm("You have unsaved changes. Leave anyway?")) return;
                      navigate("/admin/gold-savings");
                    }}
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 9, color: "#9a9a9a", padding: "10px 22px" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    style={{ background: `linear-gradient(135deg, ${GOLD_ACCENT}, #FFA000)`, border: "none", borderRadius: 9, color: "#1E1E1E", fontWeight: 700, padding: "10px 28px", minWidth: 120, boxShadow: `0 3px 14px ${GOLD_ACCENT}40` }}
                  >
                    {saving ? <Spinner size="sm" /> : isEdit ? "Save Changes" : "Add Entry"}
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

export default GoldSavingsForm;
