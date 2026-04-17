import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col, Button, Form, FormGroup, Label, Input, Alert, Spinner,
} from "reactstrap";
import { format } from "date-fns";
import api from "../config/axios";

const PAYMENT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  grams: "1",
  pricePerGram: "",
  paymentType: "upi",
  goldType: "physical",
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

function GoldSavingsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData]   = useState(emptyForm);
  const [loading, setLoading]     = useState(isEdit);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [isDirty, setIsDirty]     = useState(false);

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

  if (loading) {
    return (
      <div className="content gold-savings-form-root">
        <style dangerouslySetInnerHTML={{ __html: `@keyframes goldFormSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
          <i className="tim-icons icon-refresh-02" style={{ fontSize: "2.25rem", color: "#f59e0b", animation: "goldFormSpin 0.9s linear infinite", display: "inline-block" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="content gold-savings-form-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes goldFormSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
      <Row className="justify-content-center">
        <Col md="8" lg="6">
          <button
            type="button"
            onClick={() => {
              if (isDirty && !window.confirm("You have unsaved changes. Leave anyway?")) return;
              navigate("/admin/gold-savings");
            }}
            style={{ background: "none", border: "none", color: "rgba(251,191,36,0.85)", fontSize: "0.85rem", cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6, padding: 0, fontWeight: 600 }}
          >
            <i className="tim-icons icon-minimal-left" style={{ fontSize: "0.75rem" }} />
            Back to Gold Savings
          </button>

          <Card style={cardStyle}>
            <CardHeader style={headerStyle}>
              <CardTitle tag="h4" style={{ color: "#fff", fontWeight: 800, margin: 0, fontSize: "1.08rem", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="tim-icons icon-coins" style={{ color: "#fbbf24" }} />
                {isEdit ? "Edit Gold Entry" : "Add Gold Savings"}
              </CardTitle>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", margin: "6px 0 0", lineHeight: 1.45 }}>
                {isEdit ? "Update the details below" : "Record your gold purchase"}
              </p>
            </CardHeader>

            <CardBody style={{ padding: "1.75rem", background: "rgba(0,0,0,0.14)" }}>
              {error && (
                <Alert color="danger" toggle={() => setError("")} style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#FCA5A5", borderRadius: 10, marginBottom: 20 }}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label style={labelStyle}>Date *</Label>
                  <Input type="date" value={formData.date} onChange={set("date")} required style={{ ...inputStyle, colorScheme: "dark" }} />
                </FormGroup>

                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>Grams *</Label>
                      <div style={{ display: "flex", alignItems: "center", gap: 0, background: "rgba(255,160,46,0.06)", border: "1px solid rgba(255,160,46,0.22)", borderRadius: 10, overflow: "hidden" }}>
                        <button
                          type="button"
                          onClick={() => { setIsDirty(true); setFormData(f => ({ ...f, grams: String(Math.max(1, (parseInt(f.grams) || 1) - 1)) })); }}
                          style={{ width: 42, height: 42, background: "rgba(255,160,46,0.1)", border: "none", borderRight: "1px solid rgba(255,160,46,0.2)", color: "#fbbf24", fontSize: "1.2rem", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
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
                          style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontWeight: 800, fontSize: "1.1rem", textAlign: "center", outline: "none", padding: "0 4px", minWidth: 0 }}
                        />
                        <span style={{ color: "rgba(251,191,36,0.75)", fontSize: "0.8rem", paddingRight: 8, fontWeight: 600 }}>g</span>
                        <button
                          type="button"
                          onClick={() => { setIsDirty(true); setFormData(f => ({ ...f, grams: String(Math.min(50, (parseInt(f.grams) || 1) + 1)) })); }}
                          style={{ width: 42, height: 42, background: "rgba(255,160,46,0.1)", border: "none", borderLeft: "1px solid rgba(255,160,46,0.2)", color: "#fbbf24", fontSize: "1.2rem", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >+</button>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {[1, 2, 4, 5, 8, 10, 20, 50].map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => { setIsDirty(true); setFormData(f => ({ ...f, grams: String(g) })); }}
                            style={{
                              padding: "4px 11px", borderRadius: 8, fontSize: "0.75rem", cursor: "pointer",
                              background: parseInt(formData.grams, 10) === g ? "rgba(255,160,46,0.14)" : "transparent",
                              border: `1px solid ${parseInt(formData.grams, 10) === g ? "rgba(255,160,46,0.35)" : "rgba(255,255,255,0.1)"}`,
                              color: parseInt(formData.grams, 10) === g ? "#fbbf24" : "rgba(255,255,255,0.45)",
                              fontWeight: parseInt(formData.grams, 10) === g ? 700 : 500,
                            }}
                          >{g}g</button>
                        ))}
                      </div>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>Amount Paid (₹) *</Label>
                      <Input type="number" step="0.01" min="1" placeholder="e.g. 72000" value={formData.pricePerGram} onChange={set("pricePerGram")} required style={inputStyle} />
                    </FormGroup>
                  </Col>
                </Row>

                {totalValue !== null && formData.grams && formData.pricePerGram && (
                  <div style={{ background: "rgba(255,160,46,0.08)", border: "1px solid rgba(255,160,46,0.22)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
                      ₹{(parseFloat(formData.pricePerGram) / parseFloat(formData.grams)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/g rate
                    </span>
                    <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: "1.1rem" }}>
                      ₹{parseFloat(formData.pricePerGram).toLocaleString("en-IN", { maximumFractionDigits: 0 })} paid
                    </span>
                  </div>
                )}

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
                            background: active ? "rgba(255,160,46,0.14)" : "transparent",
                            border: `1px solid ${active ? "rgba(255,160,46,0.35)" : "rgba(255,255,255,0.1)"}`,
                            borderRadius: 10,
                            padding: "7px 16px",
                            color: active ? "#fbbf24" : "rgba(255,255,255,0.45)",
                            fontWeight: active ? 700 : 500,
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

                <FormGroup>
                  <Label style={labelStyle}>Notes</Label>
                  <Input type="textarea" rows={3} placeholder="e.g. Bought from Tanishq on anniversary…" value={formData.notes} onChange={set("notes")} style={{ ...inputStyle, resize: "vertical" }} />
                </FormGroup>

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                  <Button
                    type="button"
                    className="btn-cancel-outline"
                    onClick={() => {
                      if (isDirty && !window.confirm("You have unsaved changes. Leave anyway?")) return;
                      navigate("/admin/gold-savings");
                    }}
                    style={{ padding: "10px 22px" }}
                  >
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

export default GoldSavingsForm;
