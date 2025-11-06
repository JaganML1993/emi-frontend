import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Row,
  Col,
  Alert,
} from "reactstrap";
import api from "../config/axios";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    currency: "INR",
    monthlyIncome: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Clear validation error for this field
    if (validationErrors[e.target.name]) {
      setValidationErrors({
        ...validationErrors,
        [e.target.name]: "",
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }
    
    if (formData.monthlyIncome && parseFloat(formData.monthlyIncome) < 0) {
      errors.monthlyIncome = "Monthly income cannot be negative";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        currency: formData.currency,
        monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : 0,
      });
      
      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/admin/dashboard");
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach((err) => {
          fieldErrors[err.param] = err.msg;
        });
        setValidationErrors(fieldErrors);
      } else {
        setError(
          error.response?.data?.message || "An error occurred during registration"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (fieldName) => {
    return validationErrors[fieldName] || "";
  };

  return (
    <div className="auth-page">
      <div className="content">
        <Row className="justify-content-center">
          <Col lg="6" md="8">
            <Card className="card-user">
              <CardHeader>
                <CardTitle tag="h3">Create Account</CardTitle>
                <p className="card-category">Join us to start tracking your EMIs</p>
              </CardHeader>
              <CardBody>
                {error && <Alert color="danger">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <Label for="name">Full Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="Enter your full name"
                          invalid={!!getFieldError("name")}
                        />
                        {getFieldError("name") && (
                          <div className="invalid-feedback d-block">
                            {getFieldError("name")}
                          </div>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <Label for="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="Enter your email"
                          invalid={!!getFieldError("email")}
                        />
                        {getFieldError("email") && (
                          <div className="invalid-feedback d-block">
                            {getFieldError("email")}
                          </div>
                        )}
                      </FormGroup>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <Label for="password">Password *</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          placeholder="Enter your password"
                          invalid={!!getFieldError("password")}
                        />
                        {getFieldError("password") && (
                          <div className="invalid-feedback d-block">
                            {getFieldError("password")}
                          </div>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <Label for="confirmPassword">Confirm Password *</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          placeholder="Confirm your password"
                          invalid={!!getFieldError("confirmPassword")}
                        />
                        {getFieldError("confirmPassword") && (
                          <div className="invalid-feedback d-block">
                            {getFieldError("confirmPassword")}
                          </div>
                        )}
                      </FormGroup>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <Label for="currency">Currency</Label>
                        <Input
                          id="currency"
                          name="currency"
                          type="text"
                          value="INR (₹)"
                          disabled
                          className="bg-light"
                        />
                        <small className="text-muted">Indian Rupee (₹)</small>
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <Label for="monthlyIncome">Monthly Income (₹)</Label>
                        <Input
                          id="monthlyIncome"
                          name="monthlyIncome"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.monthlyIncome}
                          onChange={handleChange}
                          placeholder="Enter monthly income in INR"
                          invalid={!!getFieldError("monthlyIncome")}
                        />
                        {getFieldError("monthlyIncome") && (
                          <div className="invalid-feedback d-block">
                            {getFieldError("monthlyIncome")}
                          </div>
                        )}
                      </FormGroup>
                    </Col>
                  </Row>
                  
                  <Button
                    color="primary"
                    type="submit"
                    block
                    disabled={loading}
                    className="btn-round"
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </Form>
                
                <div className="text-center mt-3">
                  <p>
                    Already have an account?{" "}
                    <a href="/auth/login" className="text-info">
                      Sign in here
                    </a>
                  </p>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default Register;
