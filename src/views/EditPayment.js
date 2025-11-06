import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
  Spinner,
} from "reactstrap";
import api from "../config/axios";

function EditPayment() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    emiType: "ending",
    category: "expense",
    amount: "",
    emiDay: "1",
    startDate: "",
    endDate: "",
    notes: "",
  });

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/api/payments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const p = res.data.data;
        setFormData({
          name: p.name || "",
          emiType: p.emiType || "ending",
          category: p.category || "expense",
          amount: (p.amount ?? "").toString(),
          emiDay: (p.emiDay ?? 1).toString(),
          startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : "",
          endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : "",
          notes: p.notes || "",
        });
      } catch (e) {
        setError("Failed to load payment details");
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: formData.name,
        emiType: formData.emiType,
        category: formData.category,
        amount: parseFloat(formData.amount),
        startDate: formData.startDate,
        endDate: formData.emiType === "ending" ? formData.endDate : undefined,
        emiDay: parseInt(formData.emiDay, 10),
        notes: formData.notes,
      };
      await api.put(`/api/payments/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("Payment updated successfully!");
      setTimeout(() => navigate("/admin/payments"), 1200);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update payment");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/admin/payments");

  if (loading) {
    return null;
  }

  return (
    <div className="content">
        <Row>
          <Col md="12">
            <Card
              style={{
                background: "linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "15px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              }}
            >
              <CardHeader
                style={{
                  background:
                    "linear-gradient(135deg, rgba(29, 140, 248, 0.1) 0%, rgba(29, 140, 248, 0.05) 100%)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "15px 15px 0 0",
                }}
              >
                <CardTitle tag="h4" style={{ color: "#ffffff", fontWeight: "700", margin: 0, fontSize: "1.5rem" }}>
                  <i className="tim-icons icon-pencil mr-2" style={{ color: "#1d8cf8" }}></i>
                  Edit EMI
                </CardTitle>
              </CardHeader>
              <CardBody style={{ padding: "1.5rem", color: "#ffffff" }}>
                {error && <Alert color="danger">{error}</Alert>}
                {success && <Alert color="success">{success}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <Label for="name" style={{ color: "#ffffff" }}>EMI Name *</Label>
                        <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required
                               placeholder="e.g., House Rent, Car Loan"
                               style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }} />
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <FormGroup>
                        <Label for="amount" style={{ color: "#ffffff" }}>EMI Amount *</Label>
                        <Input id="amount" name="amount" type="number" step="0.01" min="0" value={formData.amount} onChange={handleChange} required
                               style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }} />
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <FormGroup>
                        <Label for="emiDay" style={{ color: "#ffffff" }}>EMI Date (Day) *</Label>
                        <Input id="emiDay" name="emiDay" type="number" min="1" max="31" value={formData.emiDay} onChange={handleChange} required
                               style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }} />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="4">
                      <FormGroup>
                        <Label for="emiType" style={{ color: "#ffffff" }}>EMI Type *</Label>
                        <Input id="emiType" name="emiType" type="select" value={formData.emiType} onChange={handleChange} required
                               style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}>
                          <option value="ending" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>Ending EMI</option>
                          <option value="recurring" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>Recurring EMI</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <Label for="category" style={{ color: "#ffffff" }}>Category *</Label>
                        <Input id="category" name="category" type="select" value={formData.category} onChange={handleChange} required
                               style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}>
                          <option value="expense" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>Expense</option>
                          <option value="savings" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>Savings</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <Label for="startDate" style={{ color: "#ffffff" }}>Start Date *</Label>
                        <Input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required
                               style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }} />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="4">
                      <FormGroup>
                        <Label for="endDate" style={{ color: "#ffffff" }}>End Date {formData.emiType === "ending" && "*"}</Label>
                        <Input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange}
                               required={formData.emiType === "ending"}
                               disabled={formData.emiType === "recurring"}
                               min={formData.startDate}
                               style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }} />
                        {formData.emiType === "recurring" && (
                          <small className="text-white-50" style={{ fontSize: "0.85rem" }}>Not required for recurring EMIs</small>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md="8">
                      <FormGroup>
                        <Label for="notes" style={{ color: "#ffffff" }}>Notes</Label>
                        <Input id="notes" name="notes" type="textarea" value={formData.notes} onChange={handleChange} rows="3"
                               placeholder="Additional notes or comments..."
                               style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }} />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="12" className="d-flex justify-content-end gap-2">
                      <Button color="secondary" onClick={handleCancel} disabled={saving}
                              style={{ background: "linear-gradient(135deg, #6c757d 0%, #495057 100%)", border: "none" }}>
                        Cancel
                      </Button>
                      <Button color="primary" type="submit" disabled={saving}
                              style={{ background: "linear-gradient(135deg, #1d8cf8 0%, #0056b3 100%)", border: "none" }}>
                        {saving ? (<><Spinner size="sm" className="me-2" />Saving...</>) : ("Update EMI")}
                      </Button>
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

export default EditPayment;


