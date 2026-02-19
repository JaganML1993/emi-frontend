import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Row,
  Col,
  Table,
  Button,
  Alert,
  Spinner,
  FormGroup,
  Input,
  Label,
} from "reactstrap";
import api from "../config/axios";

function RolesManagement() {
  const [permissions, setPermissions] = useState({ super_admin: {}, admin: {}, user: {} });
  const [menuPaths, setMenuPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/roles/permissions");
      if (response.data.success) {
        setPermissions(response.data.permissions || { super_admin: {}, admin: {}, user: {} });
        setMenuPaths(response.data.menuPaths || []);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError("Access denied. Admin role required.");
      } else {
        setError("Failed to load role permissions");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleToggle = (role, path, value) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [path]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/api/roles/permissions/bulk", { permissions });
      setSuccess("Permissions saved successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaults = {
      super_admin: {},
      admin: {},
      user: {},
    };
    menuPaths.forEach((m) => {
      defaults.super_admin[m.path] = true;
      defaults.admin[m.path] = true;
      defaults.user[m.path] = m.path !== "/roles-management" && m.path !== "/users";
    });
    setPermissions(defaults);
  };

  if (loading) {
    return (
      <div className="content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="content">
      <Row>
        <Col md="12">
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
                background: "linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 193, 7, 0.15) 100%)",
                borderBottom: "1px solid rgba(255, 152, 0, 0.3)",
                borderRadius: "15px 15px 0 0",
                padding: "0.75rem 1rem",
              }}
            >
              <h5 className="title" style={{ color: "#ffffff", fontWeight: "700", margin: 0, fontSize: "1.25rem" }}>
                <i className="tim-icons icon-lock-circle mr-2" style={{ color: "#FFD166" }}></i>
                Roles Management
              </h5>
              <p className="mb-0" style={{ fontSize: "0.85rem", color: "#FFD166" }}>
                Configure which role can access which menu
              </p>
            </CardHeader>
            <CardBody style={{ padding: "1.5rem", color: "#ffffff" }}>
              {error && (
                <Alert color="danger" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.45)", color: "#FCA5A5", borderRadius: "12px" }}>
                  <div>{error}</div>
                  {error.includes("Access denied") && (
                    <Button color="primary" size="sm" className="mt-2" onClick={() => navigate("/admin/dashboard")}>
                      Go to Dashboard
                    </Button>
                  )}
                </Alert>
              )}
              {success && (
                <Alert color="success" style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.45)", color: "#BBF7D0", borderRadius: "12px" }}>
                  {success}
                </Alert>
              )}

              <Table responsive className="table-hover" style={{ color: "#ffffff" }}>
                <thead>
                  <tr>
                    <th style={{ color: "#FFD166", borderColor: "rgba(255,255,255,0.1)" }}>Menu</th>
                    <th style={{ color: "#FFD166", borderColor: "rgba(255,255,255,0.1)", textAlign: "center" }}>Super Admin</th>
                    <th style={{ color: "#FFD166", borderColor: "rgba(255,255,255,0.1)", textAlign: "center" }}>Admin</th>
                    <th style={{ color: "#FFD166", borderColor: "rgba(255,255,255,0.1)", textAlign: "center" }}>User</th>
                  </tr>
                </thead>
                <tbody>
                  {menuPaths.map((menu) => (
                    <tr key={menu.path}>
                      <td style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                        <strong>{menu.name}</strong>
                        <br />
                        <small className="text-muted">{menu.path}</small>
                      </td>
                      <td style={{ borderColor: "rgba(255,255,255,0.1)", textAlign: "center" }}>
                        <FormGroup check>
                          <Label check>
                            <Input
                              type="checkbox"
                              checked={permissions.super_admin[menu.path] !== false}
                              onChange={(e) => handleToggle("super_admin", menu.path, e.target.checked)}
                            />
                            <span className="form-check-sign">
                              <span className="check" />
                            </span>
                          </Label>
                        </FormGroup>
                      </td>
                      <td style={{ borderColor: "rgba(255,255,255,0.1)", textAlign: "center" }}>
                        <FormGroup check>
                          <Label check>
                            <Input
                              type="checkbox"
                              checked={permissions.admin[menu.path] !== false}
                              onChange={(e) => handleToggle("admin", menu.path, e.target.checked)}
                            />
                            <span className="form-check-sign">
                              <span className="check" />
                            </span>
                          </Label>
                        </FormGroup>
                      </td>
                      <td style={{ borderColor: "rgba(255,255,255,0.1)", textAlign: "center" }}>
                        <FormGroup check>
                          <Label check>
                            <Input
                              type="checkbox"
                              checked={permissions.user[menu.path] !== false}
                              onChange={(e) => handleToggle("user", menu.path, e.target.checked)}
                            />
                            <span className="form-check-sign">
                              <span className="check" />
                            </span>
                          </Label>
                        </FormGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <div className="d-flex justify-content-end gap-2 mt-3">
                <Button color="secondary" onClick={handleReset} disabled={saving}>
                  Reset to Defaults
                </Button>
                <Button color="primary" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default RolesManagement;
