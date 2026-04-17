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

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/auth/login", formData);
      
      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/admin/dashboard");
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different types of errors
      if (error.response?.status === 401) {
        setError("Invalid email or password. Please check your credentials.");
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError("An error occurred during login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="content">
        <Row className="justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
          <Col lg="4" md="6" sm="10">
            {/* Logo / brand mark */}
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 56, height: 56, borderRadius: 16,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                marginBottom: 14,
              }}>
                <span style={{ fontSize: "1.6rem" }}>💎</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                EMI Tracker
              </div>
            </div>

            <Card>
              <CardHeader style={{ textAlign: "center", padding: "1.75rem 1.5rem 1rem" }}>
                <CardTitle tag="h3" style={{ marginBottom: "4px" }}>Welcome Back</CardTitle>
                <p className="card-category">Sign in to your account</p>
              </CardHeader>
              <CardBody style={{ padding: "1.5rem" }}>
                {error && <Alert color="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <FormGroup style={{ marginBottom: "1.25rem" }}>
                    <Label for="email" style={{ marginBottom: "6px" }}>Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@example.com"
                      style={{ height: 44 }}
                    />
                  </FormGroup>

                  <FormGroup style={{ marginBottom: "1.75rem" }}>
                    <Label for="password" style={{ marginBottom: "6px" }}>Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      style={{ height: 44 }}
                    />
                  </FormGroup>

                  <Button
                    color="primary"
                    type="submit"
                    block
                    disabled={loading}
                    style={{ height: 46, fontSize: "0.95rem", letterSpacing: "0.03em" }}
                  >
                    {loading ? (
                      <span>
                        <i className="tim-icons icon-refresh-02 mr-2" style={{ animation: "spin 1s linear infinite", display: "inline-block" }} />
                        Signing In…
                      </span>
                    ) : "Sign In"}
                  </Button>
                </Form>

                <div className="text-center mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.25rem" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>
                    Don't have an account?{" "}
                    <a href="/auth/register">Sign up here</a>
                  </p>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default Login;
