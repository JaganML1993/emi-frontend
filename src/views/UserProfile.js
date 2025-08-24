/*!

=========================================================
* Black Dashboard React v1.2.2
=========================================================

* Product Page: https://www.creative-tim.com/product/black-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/black-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardText,
  FormGroup,
  Form,
  Input,
  Row,
  Col,
  Alert,
  Spinner,
} from "reactstrap";

import api from "../config/axios";

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currency: "INR",
    monthlyIncome: 0,
  });
  const navigate = useNavigate();

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      const response = await api.get("/api/auth/me");
      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          currency: userData.currency || "INR",
          monthlyIncome: userData.monthlyIncome || 0,
        });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/auth/login");
      } else {
        setError("Failed to load user profile");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put("/api/auth/profile", formData);
      if (response.data.success) {
        setSuccess("Profile updated successfully!");
        setUser(response.data.user);
        // Update localStorage
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({
          ...currentUser,
          ...response.data.user
        }));
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
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

  if (!user) {
    return (
      <div className="content">
        <Alert color="danger">Failed to load user profile</Alert>
      </div>
    );
  }

  return (
    <>
      <div className="content">
        <Row>
          <Col md="8">
            <Card>
              <CardHeader>
                <h5 className="title">Edit Profile</h5>
              </CardHeader>
              <CardBody>
                {error && <Alert color="danger">{error}</Alert>}
                {success && <Alert color="success">{success}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <label>Full Name *</label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter your full name"
                          type="text"
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label>Email *</label>
                        <Input
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          type="email"
                          required
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <label>Currency</label>
                        <Input
                          name="currency"
                          value={formData.currency}
                          onChange={handleChange}
                          type="select"
                        >
                          <option value="INR">INR (₹) - Indian Rupee</option>
                          <option value="USD">USD ($) - US Dollar</option>
                          <option value="EUR">EUR (€) - Euro</option>
                          <option value="GBP">GBP (£) - British Pound</option>
                          <option value="JPY">JPY (¥) - Japanese Yen</option>
                          <option value="CAD">CAD (C$) - Canadian Dollar</option>
                          <option value="AUD">AUD (A$) - Australian Dollar</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label>Monthly Income</label>
                        <Input
                          name="monthlyIncome"
                          value={formData.monthlyIncome}
                          onChange={handleChange}
                          placeholder="Enter monthly income"
                          type="number"
                          step="0.01"
                          min="0"
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </Form>
              </CardBody>
              <CardFooter>
                <Button 
                  className="btn-fill" 
                  color="primary" 
                  type="submit"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </Col>
          <Col md="4">
            <Card className="card-user">
              <CardBody>
                <CardText />
                <div className="author">
                  <div className="block block-one" />
                  <div className="block block-two" />
                  <div className="block block-three" />
                  <div className="block block-four" />
                  <a href="#pablo" onClick={(e) => e.preventDefault()}>
                    <img
                      alt="User Avatar"
                      className="avatar"
                      src={require("assets/img/default-avatar.png")}
                    />
                    <h5 className="title">{user.name}</h5>
                  </a>
                  <p className="description">EMI Tracker</p>
                </div>
                <div className="card-description">
                  <div className="mb-3">
                    <strong>Email:</strong> {user.email}
                  </div>
                  <div className="mb-3">
                    <strong>Currency:</strong> {user.currency}
                  </div>
                  <div className="mb-3">
                    <strong>Monthly Income:</strong> {user.currency} {user.monthlyIncome?.toLocaleString() || 0}
                  </div>
                  <div className="mb-3">
                    <strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardBody>
              <CardFooter>
                <div className="button-container">
                  <Button className="btn-icon btn-round" color="info">
                    <i className="tim-icons icon-settings" />
                  </Button>
                  <Button className="btn-icon btn-round" color="success">
                    <i className="tim-icons icon-chart-pie-36" />
                  </Button>
                  <Button className="btn-icon btn-round" color="warning">
                    <i className="tim-icons icon-money-coins" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default UserProfile;
