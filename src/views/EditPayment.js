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
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };
      if (name === "emiType" && value === "recurring") {
        updated.endDate = "";
      }
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
        endDate: formData.emiType === "ending" ? formData.endDate : undefined,
        emiDay: parseInt(formData.emiDay, 10),
        notes: formData.notes || "",
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
    return (
      <div className="content">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px'
        }}>
          <i 
            className="tim-icons icon-refresh-02" 
            style={{ 
              fontSize: '3rem', 
              color: '#FFFFFF',
              animation: 'spin 1s linear infinite',
              display: 'inline-block'
            }} 
          />
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          select option {
            background-color: #2d2b42 !important;
            color: #ffffff !important;
          }
          select:focus option {
            background-color: #1e1e2d !important;
            color: #ffffff !important;
          }
          select option:checked {
            background-color: #1d8cf8 !important;
            color: #ffffff !important;
          }
          select option:hover {
            background-color: #1e1e2d !important;
            color: #ffffff !important;
          }
        `}
      </style>
      <div className="content">
        <Row>
          <Col md="12">
            <Card
              style={{
                background: "linear-gradient(135deg, #1E1E1E 0%, #2d2b42 100%)",
                border: "1px solid rgba(255, 152, 0, 0.3)",
                borderRadius: "15px",
                boxShadow: "0 8px 32px rgba(255, 152, 0, 0.18)",
              }}
            >
              <CardHeader
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 193, 7, 0.15) 100%)",
                  borderBottom: "1px solid rgba(255, 152, 0, 0.3)",
                  borderRadius: "15px 15px 0 0",
                  padding: "0.75rem 1rem",
                }}
              >
                <CardTitle
                  tag="h4"
                  style={{
                    color: "#ffffff",
                    fontWeight: "700",
                    margin: "0",
                    fontSize: "1.25rem",
                  }}
                >
                  <i
                    className="tim-icons icon-pencil mr-2"
                    style={{ color: "#FFD166" }}
                  ></i>
                  Edit EMI
                </CardTitle>
                <p className="mb-0" style={{ fontSize: "0.85rem", color: "#FFD166" }}>
                  Update your EMI details below
                </p>
              </CardHeader>
              <CardBody style={{ padding: "1.5rem", color: "#ffffff" }}>
                {error && <Alert color="danger">{error}</Alert>}
                {success && <Alert color="success">{success}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <Label for="name" style={{ color: "#FFD166", fontWeight: 500 }}>
                          EMI Name *
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="e.g., House Rent, Car Loan"
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 152, 0, 0.3)",
                            color: "#ffffff",
                            borderRadius: "8px",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.3)")}
                        />
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <FormGroup>
                        <Label for="amount" style={{ color: "#FFD166", fontWeight: 500 }}>
                          EMI Amount *
                        </Label>
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.amount}
                          onChange={handleChange}
                          required
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 152, 0, 0.3)",
                            color: "#ffffff",
                            borderRadius: "8px",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.3)")}
                        />
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <FormGroup>
                        <Label for="emiDay" style={{ color: "#FFD166", fontWeight: 500 }}>
                          EMI Date (Day of Month) *
                        </Label>
                        <Input
                          id="emiDay"
                          name="emiDay"
                          type="number"
                          min="1"
                          max="31"
                          value={formData.emiDay}
                          onChange={handleChange}
                          required
                          placeholder="e.g., 5 for 5th of every month"
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 152, 0, 0.3)",
                            color: "#ffffff",
                            borderRadius: "8px",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.3)")}
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="4">
                      <FormGroup>
                        <Label for="emiType" style={{ color: "#FFD166", fontWeight: 500 }}>
                          EMI Type *
                        </Label>
                        <Input
                          id="emiType"
                          name="emiType"
                          type="select"
                          value={formData.emiType}
                          onChange={handleChange}
                          required
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 152, 0, 0.3)",
                            color: "#ffffff",
                            borderRadius: "8px",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.3)")}
                        >
                          <option value="ending" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>
                            Ending EMI
                          </option>
                          <option value="recurring" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>
                            Recurring EMI
                          </option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <Label for="category" style={{ color: "#FFD166", fontWeight: 500 }}>
                          Category *
                        </Label>
                        <Input
                          id="category"
                          name="category"
                          type="select"
                          value={formData.category}
                          onChange={handleChange}
                          required
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 152, 0, 0.3)",
                            color: "#ffffff",
                            borderRadius: "8px",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.3)")}
                        >
                          <option value="expense" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>
                            Expense
                          </option>
                          <option value="savings" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>
                            Savings
                          </option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <Label for="startDate" style={{ color: "#FFD166", fontWeight: 500 }}>
                          Start Date *
                        </Label>
                        <Input
                          id="startDate"
                          name="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={handleChange}
                          required
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 152, 0, 0.3)",
                            color: "#ffffff",
                            borderRadius: "8px",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.3)")}
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="4">
                      <FormGroup>
                        <Label for="endDate" style={{ color: "#FFD166", fontWeight: 500 }}>
                          End Date {formData.emiType === "ending" && "*"}
                        </Label>
                        <Input
                          id="endDate"
                          name="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={handleChange}
                          required={formData.emiType === "ending"}
                          disabled={formData.emiType === "recurring"}
                          min={formData.startDate}
                          style={{
                            backgroundColor:
                              formData.emiType === "recurring"
                                ? "rgba(255, 255, 255, 0.04)"
                                : "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 152, 0, 0.3)",
                            color: formData.emiType === "recurring" ? "#888" : "#ffffff",
                            borderRadius: "8px",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.3)")}
                        />
                        {formData.emiType === "recurring" && (
                          <small style={{ fontSize: "0.85rem", color: "#BA68C8" }}>
                            Not required for recurring EMIs
                          </small>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md="8">
                      <FormGroup>
                        <Label for="notes" style={{ color: "#FFD166", fontWeight: 500 }}>
                          Notes
                        </Label>
                        <Input
                          id="notes"
                          name="notes"
                          type="textarea"
                          value={formData.notes}
                          onChange={handleChange}
                          rows="3"
                          placeholder="Additional notes or comments..."
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 152, 0, 0.3)",
                            color: "#ffffff",
                            borderRadius: "8px",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255, 152, 0, 0.3)")}
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="12" className="d-flex justify-content-end gap-2">
                      <Button
                        color="secondary"
                        onClick={handleCancel}
                        disabled={saving}
                        style={{
                          background: "linear-gradient(135deg, rgba(108, 117, 125, 0.8) 0%, rgba(73, 80, 87, 0.7) 100%)",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 20px",
                          fontWeight: 600,
                          boxShadow: "0 3px 10px rgba(108, 117, 125, 0.25)",
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="primary"
                        type="submit"
                        disabled={saving}
                        style={{
                          background: "linear-gradient(135deg, rgba(255, 152, 0, 0.9) 0%, rgba(255, 193, 7, 0.8) 100%)",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 20px",
                          fontWeight: 600,
                          boxShadow: "0 4px 15px rgba(255, 152, 0, 0.35)",
                        }}
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Saving...
                          </>
                        ) : (
                          "Update EMI"
                        )}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </CardBody>
            </Card>
        </Col>
      </Row>
      </div>
    </>
  );
}

export default EditPayment;


