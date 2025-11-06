import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { format } from "date-fns";
import api from "../config/axios";

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
      const updated = {
        ...prev,
        [name]: value,
      };
      // Clear endDate when switching to recurring EMI
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
      // Validate form
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
      
      // Ensure amount is properly parsed as a number (not multiplied)
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

      await api.post("/api/payments", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess("EMI added successfully!");
      setTimeout(() => {
        navigate("/admin/payments");
      }, 1500);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to add EMI. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/payments");
  };

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
                <CardTitle
                  tag="h4"
                  style={{
                    color: "#ffffff",
                    fontWeight: "700",
                    margin: "0",
                    fontSize: "1.5rem",
                  }}
                >
                  <i
                    className="tim-icons icon-simple-add mr-2"
                    style={{ color: "#1d8cf8" }}
                  ></i>
                  Add New EMI
                </CardTitle>
                <p className="text-white-50 mb-0" style={{ fontSize: "0.9rem" }}>
                  Enter EMI details below
                </p>
              </CardHeader>
              <CardBody style={{ padding: "1.5rem", color: "#ffffff" }}>
                {error && <Alert color="danger">{error}</Alert>}
                {success && <Alert color="success">{success}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <Label for="name" style={{ color: "#ffffff" }}>
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
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}
                        />
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <Label for="amount" style={{ color: "#ffffff" }}>
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
                          placeholder="0.00"
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <Label for="emiType" style={{ color: "#ffffff" }}>
                          EMI Type *
                        </Label>
                        <Input
                          id="emiType"
                          name="emiType"
                          type="select"
                          value={formData.emiType}
                          onChange={handleChange}
                          required
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}
                        >
                          <option value="ending" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>Ending EMI</option>
                          <option value="recurring" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>Recurring EMI</option>
                        </Input>
                        <small className="text-white-50" style={{ fontSize: "0.85rem" }}>
                          Ending: One-time with end date. Recurring: Ongoing like rent/subscriptions
                        </small>
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <Label for="category" style={{ color: "#ffffff" }}>
                          Category *
                        </Label>
                        <Input
                          id="category"
                          name="category"
                          type="select"
                          value={formData.category}
                          onChange={handleChange}
                          required
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}
                        >
                          <option value="expense" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>Expense</option>
                          <option value="savings" style={{ backgroundColor: "#2d2b42", color: "#ffffff" }}>Savings</option>
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="4">
                      <FormGroup>
                        <Label for="startDate" style={{ color: "#ffffff" }}>
                          Start Date *
                        </Label>
                        <Input
                          id="startDate"
                          name="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={handleChange}
                          required
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}
                        />
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <Label for="emiDay" style={{ color: "#ffffff" }}>
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
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}
                        />
                        <small className="text-white-50" style={{ fontSize: "0.85rem" }}>
                          We will auto-adjust for shorter months.
                        </small>
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <Label for="endDate" style={{ color: "#ffffff" }}>
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
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}
                        />
                        {formData.emiType === "recurring" && (
                          <small className="text-white-50" style={{ fontSize: "0.85rem" }}>
                            Not required for recurring EMIs
                          </small>
                        )}
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="12">
                      <FormGroup>
                        <Label for="notes" style={{ color: "#ffffff" }}>
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
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff" }}
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
                          background: "linear-gradient(135deg, #6c757d 0%, #495057 100%)",
                          border: "none",
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="primary"
                        type="submit"
                        disabled={saving}
                        style={{
                          background: "linear-gradient(135deg, #1d8cf8 0%, #0056b3 100%)",
                          border: "none",
                        }}
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Saving...
                          </>
                        ) : (
                          "Add EMI"
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

export default AddPayment;

