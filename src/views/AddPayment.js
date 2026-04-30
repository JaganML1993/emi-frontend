import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Form,
  FormGroup,
  Label,
  Input,
  Spinner,
} from "reactstrap";
import { format } from "date-fns";
import api from "../config/axios";

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#ffffff",
  padding: "11px 14px",
  fontSize: "0.9rem",
};

const labelStyle = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "0.73rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

function AddPayment() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    emiType: "ending",
    category: "expense",
    amount: "",
    emiDay: new Date().getDate().toString(),
    endDate: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "emiType" && value === "recurring") updated.endDate = "";
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!formData.name.trim()) {
        setError("Please enter EMI name");
        setSaving(false);
        return;
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setError("Please enter a valid amount");
        setSaving(false);
        return;
      }
      const parsedAmount = parseFloat(formData.amount);
      if (isNaN(parsedAmount)) {
        setError("Please enter a valid amount");
        setSaving(false);
        return;
      }
      if (formData.emiType === "ending" && !formData.endDate) {
        setError("Please select an end date for ending EMI");
        setSaving(false);
        return;
      }

      const token = localStorage.getItem("token");
      const payload = {
        name: formData.name,
        emiType: formData.emiType,
        category: formData.category,
        amount: parsedAmount,
        startDate: formData.startDate,
        emiDay: parseInt(formData.emiDay, 10),
        endDate: formData.endDate || undefined,
        notes: formData.notes || "",
      };
      await api.post("/api/payments", payload, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess("EMI added successfully!");
      setTimeout(() => navigate("/admin/payments"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add EMI. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content add-payment-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .add-payment-root .card { margin-bottom: 0 !important; }
      `,
        }}
      />

      <Row>
        <Col md="12">
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
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
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
                  <i className="tim-icons icon-simple-add" style={{ fontSize: "1rem", color: "#fbbf24" }} />
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
                      Add new EMI
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
                      Create
                    </span>
                  </div>
                  <p className="mb-0" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
                    Add a schedule — it will appear on the dashboard and EMI list
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody style={{ padding: "1.25rem clamp(0.85rem, 3vw, 1.35rem)", background: "rgba(0,0,0,0.14)" }}>
              {error && (
                <div
                  role="alert"
                  style={{
                    marginBottom: 18,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.22)",
                    color: "#fecaca",
                    fontSize: "0.88rem",
                  }}
                >
                  {error}
                </div>
              )}
              {success && (
                <div
                  role="status"
                  style={{
                    marginBottom: 18,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.28)",
                    color: "#a7f3d0",
                    fontSize: "0.88rem",
                  }}
                >
                  {success}
                </div>
              )}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>EMI name *</Label>
                      <Input
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="e.g., House Rent, Car Loan"
                        style={inputStyle}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>EMI amount *</Label>
                      <Input name="amount" type="number" step="0.01" min="0" value={formData.amount} onChange={handleChange} required placeholder="0.00" style={inputStyle} />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>EMI type *</Label>
                      <Input name="emiType" type="select" value={formData.emiType} onChange={handleChange} required style={inputStyle}>
                        <option value="ending">Ending EMI</option>
                        <option value="recurring">Recurring EMI</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label style={labelStyle}>Category *</Label>
                      <Input name="category" type="select" value={formData.category} onChange={handleChange} required style={inputStyle}>
                        <option value="expense">Expense</option>
                        <option value="savings">Savings</option>
                      </Input>
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label style={labelStyle}>Start date *</Label>
                      <Input name="startDate" type="date" value={formData.startDate} onChange={handleChange} required style={inputStyle} />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label style={labelStyle}>EMI day (1–31) *</Label>
                      <Input name="emiDay" type="number" min="1" max="31" value={formData.emiDay} onChange={handleChange} required placeholder="e.g., 5" style={inputStyle} />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label style={labelStyle}>End date {formData.emiType === "ending" && "*"}</Label>
                      <Input
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleChange}
                        required={formData.emiType === "ending"}
                        disabled={formData.emiType === "recurring"}
                        min={formData.startDate}
                        style={{ ...inputStyle, opacity: formData.emiType === "recurring" ? 0.45 : 1 }}
                      />
                      {formData.emiType === "recurring" && (
                        <small style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.32)" }}>Not required for recurring EMIs</small>
                      )}
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="12">
                    <FormGroup>
                      <Label style={labelStyle}>Notes</Label>
                      <Input name="notes" type="textarea" value={formData.notes} onChange={handleChange} rows="3" placeholder="Additional notes…" style={inputStyle} />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="12" className="d-flex justify-content-end flex-wrap">
                    {/* Native <button>: theme .btn uses !important and overrides inline styles on reactstrap Button */}
                    <button
                      type="button"
                      onClick={() => navigate("/admin/payments")}
                      disabled={saving}
                      className="mb-2 mb-md-0 btn-cancel-outline"
                      style={{ marginRight: 10 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="mb-2 mb-md-0 btn-amber-outline"
                    >
                      {saving ? (
                        <>
                          <Spinner size="sm" className="mr-2" style={{ verticalAlign: "middle", color: "#ffb347" }} />
                          Saving…
                        </>
                      ) : (
                        "Add EMI"
                      )}
                    </button>
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default AddPayment;
