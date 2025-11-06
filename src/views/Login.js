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
        <Row className="justify-content-center">
          <Col lg="5" md="7">
            <Card className="card-user">
              <CardHeader>
                <CardTitle tag="h3">Welcome Back</CardTitle>
                <p className="card-category">Sign in to your account</p>
              </CardHeader>
              <CardBody>
                {error && <Alert color="danger">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                  <FormGroup>
                    <Label for="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email"
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <Label for="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter your password"
                    />
                  </FormGroup>
                  
                  <Button
                    color="primary"
                    type="submit"
                    block
                    disabled={loading}
                    className="btn-round"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </Form>
                
                <div className="text-center mt-3">
                  <p>
                    Don't have an account?{" "}
                    <a href="/auth/register" className="text-info">
                      Sign up here
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

export default Login;
