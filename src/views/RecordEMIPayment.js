import React, { useState, useEffect, useCallback } from "react";
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
  Badge,
} from "reactstrap";
import { format } from "date-fns";

import api from "../config/axios";

function RecordEMIPayment() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emi, setEmi] = useState(null);
  const [formData, setFormData] = useState({
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const navigate = useNavigate();
  const { id } = useParams();

  const fetchEMI = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/api/emis/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const emiData = response.data.data;
      setEmi(emiData);
      
      // Set default payment amount to EMI amount
      setFormData(prev => ({
        ...prev,
        amount: emiData.emiAmount || emiData.totalAmount
      }));
    } catch (error) {
      console.error("Error fetching EMI:", error);
      setError("Failed to load EMI details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEMI();
  }, [fetchEMI]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      await api.post(`/api/emis/${id}/pay`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess("EMI payment recorded successfully!");
      setTimeout(() => {
        // Navigate back and force a refresh
        navigate("/admin/emis", { replace: true });
        // Force a page reload to ensure fresh data
        window.location.reload();
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to record EMI payment");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/emis");
  };

  if (loading) {
    return (
      <div className="content">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
          <Spinner color="primary" />
        </div>
      </div>
    );
  }

  if (!emi) {
    return (
      <div className="content">
        <Alert color="danger">EMI not found</Alert>
        <Button color="secondary" onClick={handleCancel}>
          Back to EMIs
        </Button>
      </div>
    );
  }

  if (emi.status !== 'active') {
    return (
      <div className="content">
        <Alert color="warning">
          Cannot record payment for {emi.status} EMI. Only active EMIs can receive payments.
        </Alert>
        <Button color="secondary" onClick={handleCancel}>
          Back to EMIs
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="content">
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Record EMI Payment</CardTitle>
                <p className="card-category">Record payment for: {emi.name}</p>
              </CardHeader>
              <CardBody>
                {error && <Alert color="danger">{error}</Alert>}
                {success && <Alert color="success">{success}</Alert>}

                                 {/* EMI Summary Card */}
                 <Card className="mb-4" style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                  <CardBody>
                                                                  <Row>
                           <Col md="4">
                             <h6 className="text-light mb-1">EMI Name</h6>
                             <p className="mb-0 font-weight-bold text-white">{emi.name}</p>
                           </Col>
                           
                           <Col md="4">
                             <h6 className="text-light mb-1">Status</h6>
                             <Badge 
                               color={emi.status === 'active' ? 'success' : emi.status === 'completed' ? 'info' : 'warning'}
                               className="mb-0"
                             >
                               {emi.status.charAt(0).toUpperCase() + emi.status.slice(1)}
                             </Badge>
                           </Col>
                           <Col md="4">
                             <h6 className="text-light mb-1">Type</h6>
                             <p className="mb-0 text-white">{emi.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                           </Col>
                         </Row>
                    <hr />
                                         <Row>
                                                <Col md="3">
                           <h6 className="text-light mb-1">Total Amount</h6>
                           <p className="mb-0 font-weight-bold text-white">₹{(emi.emiAmount * emi.totalInstallments)?.toLocaleString()}</p>
                         </Col>
                       <Col md="3">
                         <h6 className="text-light mb-1">Monthly EMI</h6>
                         <p className="mb-0 text-white">₹{emi.emiAmount?.toLocaleString()}</p>
                       </Col>
                       <Col md="3">
                         <h6 className="text-light mb-1">Paid Installments</h6>
                         <p className="mb-0 text-white">{emi.paidInstallments} / {emi.totalInstallments}</p>
                       </Col>
                       <Col md="3">
                         <h6 className="text-light mb-1">Remaining Amount</h6>
                         <p className="mb-0 font-weight-bold text-warning">₹{emi.remainingAmount?.toLocaleString()}</p>
                       </Col>
                     </Row>
                    <hr />
                                         <Row>
                       {emi.paymentType === 'emi' && (
                         <Col md="6">
                           <h6 className="text-light mb-1">Next Due Date</h6>
                           <p className="mb-0 text-white">{emi.nextDueDate ? format(new Date(emi.nextDueDate), 'MMM dd, yyyy') : 'N/A'}</p>
                         </Col>
                       )}
                       <Col md={emi.paymentType === 'emi' ? "6" : "12"}>
                         <h6 className="text-light mb-1">End Date</h6>
                         <p className="mb-0 text-white">{emi.endDate ? format(new Date(emi.endDate), 'MMM dd, yyyy') : 'N/A'}</p>
                       </Col>
                     </Row>
                  </CardBody>
                </Card>

                {/* Payment Form */}
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <Label for="amount">Payment Amount *</Label>
                                                 <Input
                           id="amount"
                           name="amount"
                           type="number"
                           value={formData.amount}
                           onChange={handleChange}
                           min="0"
                           step="0.01"
                           placeholder="0.00"
                           required
                           bsSize="lg"
                           style={{ 
                             height: '48px',
                             lineHeight: '48px',
                             padding: '12px 16px'
                           }}
                         />
                        <small className="text-muted">
                          Recommended: ₹{emi.emiAmount?.toLocaleString()} (Monthly EMI amount)
                        </small>
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <Label for="date">Payment Date *</Label>
                                                 <Input
                           id="date"
                           name="date"
                           type="date"
                           value={formData.date}
                           onChange={handleChange}
                           required
                           bsSize="lg"
                           style={{ 
                             height: '48px',
                             lineHeight: '48px',
                             padding: '12px 16px'
                           }}
                         />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="12">
                      <FormGroup>
                        <Label for="notes">Payment Notes</Label>
                                                 <Input
                           id="notes"
                           name="notes"
                           type="textarea"
                           value={formData.notes}
                           onChange={handleChange}
                           rows="3"
                           placeholder="Optional notes about this payment..."
                           bsSize="lg"
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
                        size="lg"
                      >
                        Cancel
                      </Button>
                      <Button
                        color="success"
                        type="submit"
                        disabled={saving}
                        size="lg"
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Recording Payment...
                          </>
                        ) : (
                          "Record Payment"
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

export default RecordEMIPayment;
