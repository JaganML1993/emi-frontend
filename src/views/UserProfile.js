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
    role: "user",
    houseSavingsGoal: 0,
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
          role: userData.role || "user",
          houseSavingsGoal: userData.houseSavingsGoal || 0,
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

    const inputStyle = { background: "#1e1e2d", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", width: "100%" };
    const labelStyle = { display: "block", marginBottom: "0.5rem", fontWeight: 500 };
    return (
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={{ ...labelStyle, color: "#34D399" }}>Full Name *</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                type="text"
                required
                style={{ ...inputStyle, borderColor: "rgba(52, 211, 153, 0.4)" }}
              />
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={{ ...labelStyle, color: "#60A5FA" }}>Email *</label>
              <Input
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                type="email"
                required
                style={{ ...inputStyle, borderColor: "rgba(96, 165, 250, 0.4)" }}
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={{ ...labelStyle, color: "#A78BFA" }}>Currency</label>
              <Input
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                type="select"
                style={{ ...inputStyle, borderColor: "rgba(167, 139, 250, 0.4)" }}
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
            <FormGroup className="mb-4">
              <label style={{ ...labelStyle, color: "#FBBF24" }}>Monthly Income</label>
              <Input
                name="monthlyIncome"
                value={formData.monthlyIncome}
                onChange={handleChange}
                placeholder="Enter monthly income"
                type="number"
                step="0.01"
                min="0"
                style={{ ...inputStyle, borderColor: "rgba(251, 191, 36, 0.4)" }}
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={{ ...labelStyle, color: "#34D399" }}>House Savings Goal (₹)</label>
              <Input
                name="houseSavingsGoal"
                value={formData.houseSavingsGoal}
                onChange={handleChange}
                placeholder="Target amount for house savings"
                type="number"
                step="0.01"
                min="0"
                style={{ ...inputStyle, borderColor: "rgba(52, 211, 153, 0.4)" }}
              />
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={{ ...labelStyle, color: "#F472B6" }}>Role</label>
              <Input
                name="role"
                value={formData.role}
                onChange={handleChange}
                type="select"
                disabled={user?.role !== "admin" && user?.role !== "super_admin"}
                style={{ ...inputStyle, borderColor: "rgba(244, 114, 182, 0.4)" }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </Input>
              {user?.role !== "admin" && user?.role !== "super_admin" && (
                <small style={{ color: "#9CA3AF", display: "block", marginTop: "0.25rem" }}>Only admins can change role</small>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md="12" className="d-flex justify-content-end align-items-center gap-2 mt-2">
            <Button
              color="secondary"
              onClick={() => fetchUserProfile()}
              disabled={saving}
              style={{ border: "1px solid rgba(96, 165, 250, 0.5)", color: "#60A5FA" }}
            >
              Refresh
            </Button>
            <Button
              type="submit"
              disabled={saving}
              style={{
                background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
                border: "none",
                color: "#fff",
              }}
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
                background: "linear-gradient(135deg, #1E1E1E 0%, #2d2b42 50%, #1e293b 100%)",
                border: "1px solid rgba(251, 191, 36, 0.4)",
                borderRadius: "15px",
                boxShadow: "0 8px 32px rgba(251, 191, 36, 0.15)",
              }}
            >
              <CardHeader
                style={{
                  background:
                    "linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.2) 50%, rgba(34, 211, 153, 0.15) 100%)",
                  borderBottom: "1px solid rgba(251, 191, 36, 0.4)",
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
                  <i className="tim-icons icon-single-02 mr-2" style={{ color: "#FBBF24" }}></i>
                  Profile Settings
                </h5>
                <p className="mb-0" style={{ fontSize: "0.85rem", color: "#34D399" }}>
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
                background: "linear-gradient(135deg, #1e1e2d 0%, #2d2b42 50%, #1e293b 100%)",
                border: "1px solid rgba(96, 165, 250, 0.3)",
                borderRadius: "15px",
                boxShadow: "0 8px 32px rgba(96, 165, 250, 0.15)",
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
                      background: "linear-gradient(135deg, rgba(96, 165, 250, 0.4) 0%, rgba(167, 139, 250, 0.4) 100%)",
                      border: "3px solid rgba(96, 165, 250, 0.6)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      boxShadow: "0 0 24px rgba(96, 165, 250, 0.4), 0 0 48px rgba(167, 139, 250, 0.2)",
                    }}
                  >
                    <img
                      alt="User Avatar"
                      style={{ width: 70, height: 70, borderRadius: "50%", objectFit: "cover" }}
                      src={require("assets/img/default-avatar.png")}
                    />
                  </div>
                  <div>
                    <h5 style={{ color: "#FFFFFF", marginBottom: "6px", fontWeight: 600 }}>{user.name}</h5>
                    <p style={{ color: "#60A5FA", fontSize: "0.8rem", margin: 0 }}>EMI Tracker Member</p>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "20px",
                    display: "grid",
                    gap: "12px",
                    fontSize: "0.8rem",
                  }}
                >
                  <div style={{ padding: "8px 12px", background: "rgba(96, 165, 250, 0.1)", borderRadius: "8px", borderLeft: "3px solid #60A5FA" }}>
                    <strong style={{ color: "#60A5FA" }}>Email</strong>
                    <div style={{ color: "#E2E8F0", marginTop: "4px" }}>{user.email}</div>
                  </div>
                  <div style={{ padding: "8px 12px", background: "rgba(167, 139, 250, 0.1)", borderRadius: "8px", borderLeft: "3px solid #A78BFA" }}>
                    <strong style={{ color: "#A78BFA" }}>Currency</strong>
                    <div style={{ color: "#E2E8F0", marginTop: "4px" }}>{user.currency}</div>
                  </div>
                  <div style={{ padding: "8px 12px", background: "rgba(251, 191, 36, 0.1)", borderRadius: "8px", borderLeft: "3px solid #FBBF24" }}>
                    <strong style={{ color: "#FBBF24" }}>Monthly Income</strong>
                    <div style={{ color: "#E2E8F0", marginTop: "4px" }}>{user.currency} {user.monthlyIncome?.toLocaleString() || 0}</div>
                  </div>
                  <div style={{ padding: "8px 12px", background: "rgba(52, 211, 153, 0.1)", borderRadius: "8px", borderLeft: "3px solid #34D399" }}>
                    <strong style={{ color: "#34D399" }}>House Savings Goal</strong>
                    <div style={{ color: "#E2E8F0", marginTop: "4px" }}>₹{(user.houseSavingsGoal || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ padding: "8px 12px", background: "rgba(244, 114, 182, 0.1)", borderRadius: "8px", borderLeft: "3px solid #F472B6" }}>
                    <strong style={{ color: "#F472B6" }}>Role</strong>
                    <div style={{ color: "#E2E8F0", marginTop: "4px" }}>{user.role === "super_admin" ? "Super Admin" : user.role === "admin" ? "Admin" : "User"}</div>
                  </div>
                  <div style={{ padding: "8px 12px", background: "rgba(34, 211, 255, 0.1)", borderRadius: "8px", borderLeft: "3px solid #22D3EE" }}>
                    <strong style={{ color: "#22D3EE" }}>Member Since</strong>
                    <div style={{ color: "#E2E8F0", marginTop: "4px" }}>{new Date(user.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </CardBody>
              <CardFooter
                style={{
                  borderTop: "1px solid rgba(96, 165, 250, 0.2)",
                  background: "rgba(30, 30, 45, 0.8)",
                  borderRadius: "0 0 15px 15px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <Button
                    className="btn-icon btn-round"
                    style={{
                      background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(96, 165, 250, 0.4)",
                    }}
                  >
                    <i className="tim-icons icon-settings" />
                  </Button>
                  <Button
                    className="btn-icon btn-round"
                    style={{
                      background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(52, 211, 153, 0.4)",
                    }}
                  >
                    <i className="tim-icons icon-bell-55" />
                  </Button>
                  <Button
                    className="btn-icon btn-round"
                    style={{
                      background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(251, 191, 36, 0.4)",
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
