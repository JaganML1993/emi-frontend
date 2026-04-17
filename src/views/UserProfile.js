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
        <Alert color="danger" style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "1rem" }}>
          Failed to load user profile
        </Alert>
      );
    }

    const inputStyle = { background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, width: "100%", padding: "10px 14px", fontSize: "0.9rem" };
    const labelStyle = { display: "block", marginBottom: "0.4rem", fontWeight: 500, color: "rgba(255,255,255,0.55)", fontSize: "0.82rem" };
    return (
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={labelStyle}>Full Name *</label>
              <Input name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name" type="text" required style={inputStyle} />
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={labelStyle}>Email *</label>
              <Input name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" type="email" required style={inputStyle} />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={labelStyle}>Currency</label>
              <Input name="currency" value={formData.currency} onChange={handleChange} type="select" style={inputStyle}>
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
              <label style={labelStyle}>Monthly Income</label>
              <Input name="monthlyIncome" value={formData.monthlyIncome} onChange={handleChange} placeholder="Enter monthly income" type="number" step="0.01" min="0" style={inputStyle} />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={labelStyle}>House Savings Goal (₹)</label>
              <Input name="houseSavingsGoal" value={formData.houseSavingsGoal} onChange={handleChange} placeholder="Target amount" type="number" step="0.01" min="0" style={inputStyle} />
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup className="mb-4">
              <label style={labelStyle}>Role</label>
              <Input name="role" value={formData.role} onChange={handleChange} type="select" disabled={user?.role !== "admin" && user?.role !== "super_admin"} style={inputStyle}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </Input>
              {user?.role !== "admin" && user?.role !== "super_admin" && (
                <small style={{ color: "rgba(255,255,255,0.3)", display: "block", marginTop: "0.25rem" }}>Only admins can change role</small>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md="12" className="d-flex justify-content-end align-items-center gap-2 mt-2">
            <Button color="secondary" onClick={() => fetchUserProfile()} disabled={saving}
              style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.6)" }}>
              Refresh
            </Button>
            <Button type="submit" disabled={saving}
              style={{ background: "#2e2e30", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
              {saving ? <><Spinner size="sm" className="me-2" />Saving...</> : "Save Changes"}
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
      <div className="content">
        <Row>
          <Col md="8">
            <Card style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
              <CardHeader style={{ background: "#111113", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0.85rem 1.25rem", borderRadius: "14px 14px 0 0" }}>
                <h5 className="title" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700, margin: 0, fontSize: "1.15rem" }}>
                  <i className="tim-icons icon-single-02 mr-2" style={{ color: "rgba(255,255,255,0.45)" }} />
                  Profile Settings
                </h5>
                <p className="mb-0" style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>Update your personal details and preferences</p>
              </CardHeader>
              <CardBody style={{ padding: "1.5rem" }}>
                {error && <Alert color="danger" style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 10 }}>{error}</Alert>}
                {success && <Alert color="success" style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 10 }}>{success}</Alert>}
                {renderContent()}
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
              <CardBody style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "3px solid rgba(255,255,255,0.15)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <img alt="User Avatar" style={{ width: 70, height: 70, borderRadius: "50%", objectFit: "cover" }} src={require("assets/img/default-avatar.png")} />
                  </div>
                  <div>
                    <h5 style={{ color: "rgba(255,255,255,0.85)", marginBottom: 6, fontWeight: 600 }}>{user.name}</h5>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", margin: 0 }}>EMI Tracker Member</p>
                  </div>
                </div>
                <div style={{ marginTop: 20, display: "grid", gap: 10, fontSize: "0.8rem" }}>
                  {[
                    { label: "Email", value: user.email },
                    { label: "Currency", value: user.currency },
                    { label: "Monthly Income", value: `${user.currency} ${user.monthlyIncome?.toLocaleString() || 0}` },
                    { label: "House Savings Goal", value: `₹${(user.houseSavingsGoal || 0).toLocaleString()}` },
                    { label: "Role", value: user.role === "super_admin" ? "Super Admin" : user.role === "admin" ? "Admin" : "User" },
                    { label: "Member Since", value: new Date(user.createdAt).toLocaleDateString() },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 8, borderLeft: "3px solid rgba(255,255,255,0.18)" }}>
                      <strong style={{ color: "rgba(255,255,255,0.55)" }}>{label}</strong>
                      <div style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </CardBody>
              <CardFooter style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "#111113", borderRadius: "0 0 14px 14px" }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                  <Button className="btn-icon btn-round" style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.12)" }}><i className="tim-icons icon-settings" /></Button>
                  <Button className="btn-icon btn-round" style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.12)" }}><i className="tim-icons icon-bell-55" /></Button>
                  <Button className="btn-icon btn-round" style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.12)" }}><i className="tim-icons icon-coins" /></Button>
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
