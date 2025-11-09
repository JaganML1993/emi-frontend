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
import { Button, Card, CardHeader, CardBody, CardFooter, FormGroup, Form, Input, Row, Col, Alert, Spinner } from "reactstrap";

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

  const renderContent = () => {
    if (loading) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "300px",
          }}
        >
          <i
            className="tim-icons icon-refresh-02"
            style={{
              fontSize: "2.5rem",
              color: "#FFFFFF",
              animation: "spin 1s linear infinite",
              display: "inline-block",
            }}
          />
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          ` }} />
        </div>
      );
    }

    if (!user) {
      return (
        <Alert
          color="danger"
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.45)",
            color: "#FCA5A5",
            borderRadius: "12px",
            padding: "1rem",
          }}
        >
          Failed to load user profile
        </Alert>
      );
    }

    return (
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
        <Row>
          <Col md="12" className="d-flex justify-content-end gap-2">
            <Button
              color="secondary"
              onClick={() => fetchUserProfile()}
              disabled={saving}
            >
              Refresh
            </Button>
            <Button color="primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </Col>
        </Row>
      </Form>
    );
  };

  if (loading || !user) {
    return <div className="content">{renderContent()}</div>;
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
          <Col md="8">
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
                <h5
                  className="title"
                  style={{
                    color: "#ffffff",
                    fontWeight: "700",
                    margin: 0,
                    fontSize: "1.25rem",
                  }}
                >
                  <i className="tim-icons icon-single-02 mr-2" style={{ color: "#FFD166" }}></i>
                  Profile Settings
                </h5>
                <p className="mb-0" style={{ fontSize: "0.85rem", color: "#FFD166" }}>
                  Update your personal details and preferences
                </p>
              </CardHeader>
              <CardBody style={{ padding: "1.5rem", color: "#ffffff" }}>
                {error && (
                  <Alert
                    color="danger"
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.45)",
                      color: "#FCA5A5",
                      borderRadius: "12px",
                    }}
                  >
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert
                    color="success"
                    style={{
                      background: "rgba(34, 197, 94, 0.15)",
                      border: "1px solid rgba(34, 197, 94, 0.45)",
                      color: "#BBF7D0",
                      borderRadius: "12px",
                    }}
                  >
                    {success}
                  </Alert>
                )}
                {renderContent()}
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)",
                border: "1px solid rgba(127, 183, 255, 0.25)",
                borderRadius: "15px",
                boxShadow: "0 8px 28px rgba(15, 23, 42, 0.45)",
              }}
            >
              <CardBody style={{ padding: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "rgba(127, 183, 255, 0.2)",
                      border: "2px solid rgba(127, 183, 255, 0.45)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <img
                      alt="User Avatar"
                      style={{ width: 70, height: 70, borderRadius: "50%" }}
                      src={require("assets/img/default-avatar.png")}
                    />
                  </div>
                  <div>
                    <h5 style={{ color: "#FFFFFF", marginBottom: "6px", fontWeight: 600 }}>{user.name}</h5>
                    <p style={{ color: "#7FB7FF", fontSize: "0.8rem", margin: 0 }}>EMI Tracker Member</p>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "20px",
                    display: "grid",
                    gap: "10px",
                    fontSize: "0.8rem",
                    color: "#E2E8F0",
                  }}
                >
                  <div>
                    <strong style={{ color: "#7FB7FF" }}>Email:</strong>
                    <div>{user.email}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#7FB7FF" }}>Currency:</strong>
                    <div>{user.currency}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#7FB7FF" }}>Monthly Income:</strong>
                    <div>
                      {user.currency} {user.monthlyIncome?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: "#7FB7FF" }}>Member Since:</strong>
                    <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </CardBody>
              <CardFooter
                style={{
                  borderTop: "1px solid rgba(127, 183, 255, 0.25)",
                  background: "rgba(15, 23, 42, 0.75)",
                  borderRadius: "0 0 15px 15px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <Button
                    className="btn-icon btn-round"
                    color="info"
                    style={{
                      background: "linear-gradient(135deg, rgba(0, 191, 255, 0.8) 0%, rgba(30, 144, 255, 0.7) 100%)",
                      border: "none",
                    }}
                  >
                    <i className="tim-icons icon-settings" />
                  </Button>
                  <Button
                    className="btn-icon btn-round"
                    color="success"
                    style={{
                      background: "linear-gradient(135deg, rgba(102, 187, 106, 0.8) 0%, rgba(76, 175, 80, 0.7) 100%)",
                      border: "none",
                    }}
                  >
                    <i className="tim-icons icon-bell-55" />
                  </Button>
                  <Button
                    className="btn-icon btn-round"
                    color="warning"
                    style={{
                      background: "linear-gradient(135deg, rgba(255, 152, 0, 0.85) 0%, rgba(255, 193, 7, 0.75) 100%)",
                      border: "none",
                    }}
                  >
                    <i className="tim-icons icon-coins" />
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
