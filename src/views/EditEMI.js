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
} from "reactstrap";
import { format } from "date-fns";

import api from "../config/axios";

function EditEMI() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emi, setEmi] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "personal_loan",
    paymentType: "emi",
    emiAmount: "",
    totalInstallments: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
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
             setFormData({
         name: emiData.name,
         type: emiData.type,
         paymentType: emiData.paymentType || "emi",
         emiAmount: emiData.emiAmount,
         totalInstallments: emiData.totalInstallments,
         startDate: format(new Date(emiData.startDate), "yyyy-MM-dd"),
         interestRate: emiData.interestRate || "",
         notes: emiData.notes || "",
       });
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

    // Auto-calculate EMI amount for full payment
    if (name === 'paymentType' && value === 'full_payment') {
      setFormData(prev => ({
        ...prev,
        emiAmount: prev.totalAmount,
        totalInstallments: "1"
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      await api.put(`/api/emis/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess("EMI updated successfully!");
      setTimeout(() => {
        navigate("/admin/emis");
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update EMI");
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

  return (
    <>
      <div className="content">
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Edit EMI: {emi.name}</CardTitle>
                <p className="card-category">Update EMI details below</p>
              </CardHeader>
              <CardBody>
                {error && <Alert color="danger">{error}</Alert>}
                {success && <Alert color="success">{success}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                                     <Row>
                     <Col md="6">
                       <FormGroup>
                         <Label for="name">EMI Name *</Label>
                         <Input
                           id="name"
                           name="name"
                           type="text"
                           value={formData.name}
                           onChange={handleChange}
                           required
                           placeholder="e.g., Car Loan, Home Loan"
                         />
                       </FormGroup>
                     </Col>
                     <Col md="6">
                       <FormGroup>
                         <Label for="type">EMI Type *</Label>
                         <Input
                           id="type"
                           name="type"
                           type="select"
                           value={formData.type}
                           onChange={handleChange}
                           required
                         >
                           <option value="personal_loan">Personal Loan</option>
                           <option value="mobile_emi">Mobile EMI</option>
                           <option value="laptop_emi">Laptop EMI</option>
                           <option value="savings_emi">Savings EMI</option>
                           <option value="car_loan">Car Loan</option>
                           <option value="home_loan">Home Loan</option>
                           <option value="business_loan">Business Loan</option>
                           <option value="education_loan">Education Loan</option>
                           <option value="credit_card">Credit Card</option>
                           <option value="appliance_emi">Appliance EMI</option>
                           <option value="furniture_emi">Furniture EMI</option>
                           <option value="bike_emi">Bike EMI</option>
                           <option value="cheetu">Cheetu</option>
                           <option value="other">Other</option>
                         </Input>
                       </FormGroup>
                     </Col>
                   </Row>

                                     <Row>
                     <Col md="6">
                       <FormGroup>
                         <Label for="paymentType">Payment Type *</Label>
                         <Input
                           id="paymentType"
                           name="paymentType"
                           type="select"
                           value={formData.paymentType}
                           onChange={handleChange}
                           required
                         >
                           <option value="emi">EMI</option>
                           <option value="full_payment">Full Payment</option>
                         </Input>
                       </FormGroup>
                     </Col>
                     <Col md="6">
                       <FormGroup>
                         <Label>Calculated Total Amount</Label>
                         <div className="form-control-plaintext">
                           ₹{formData.emiAmount && formData.totalInstallments ? 
                             (parseFloat(formData.emiAmount) * parseInt(formData.totalInstallments)).toLocaleString() : 
                             '0.00'}
                         </div>
                         <small className="text-muted">
                           Monthly EMI × Total Installments
                         </small>
                       </FormGroup>
                     </Col>
                   </Row>

                                     <Row>
                     <Col md="6">
                       <FormGroup>
                         <Label for="startDate">Start Date *</Label>
                         <Input
                           id="startDate"
                           name="startDate"
                           type="date"
                           value={formData.startDate}
                           onChange={handleChange}
                           required
                         />
                       </FormGroup>
                     </Col>
                   </Row>

                  {formData.paymentType === 'emi' && (
                    <>
                      <Row>
                        <Col md="6">
                          <FormGroup>
                            <Label for="emiAmount">Monthly EMI Amount *</Label>
                            <Input
                              id="emiAmount"
                              name="emiAmount"
                              type="number"
                              value={formData.emiAmount}
                              onChange={handleChange}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              required
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup>
                            <Label for="totalInstallments">Total Installments *</Label>
                            <Input
                              id="totalInstallments"
                              name="totalInstallments"
                              type="number"
                              value={formData.totalInstallments}
                              onChange={handleChange}
                              min="1"
                              placeholder="12"
                              required
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </>
                  )}

                  {formData.paymentType === 'full_payment' && (
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label for="emiAmount">Total Amount *</Label>
                          <Input
                            id="emiAmount"
                            name="emiAmount"
                            type="number"
                            value={formData.emiAmount}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            required
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                  )}


                  <Row>
                    <Col md="12">
                      <FormGroup>
                        <Label for="notes">Notes</Label>
                        <Input
                          id="notes"
                          name="notes"
                          type="textarea"
                          value={formData.notes}
                          onChange={handleChange}
                          rows="3"
                          placeholder="Additional notes or comments..."
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
                      >
                        Cancel
                      </Button>
                      <Button
                        color="primary"
                        type="submit"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Updating...
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

export default EditEMI;
