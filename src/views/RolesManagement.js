import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Alert,
  Spinner,
  FormGroup,
  Input,
  Label,
} from "reactstrap";
import api from "../config/axios";

const cardStyle = {
  background: "linear-gradient(165deg, #18181c 0%, #141416 50%, #121214 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  boxShadow: "0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,160,46,0.06) inset",
  overflow: "hidden",
};

const headerStyle = {
  background: "linear-gradient(90deg, rgba(255,160,46,0.08) 0%, transparent 55%)",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  padding: "1.1rem clamp(0.85rem, 3vw, 1.35rem)",
};

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
      <div className="content">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <i
            className="tim-icons icon-refresh-02"
            style={{ fontSize: "2.5rem", color: "#f59e0b", animation: "rolesSpin 0.9s linear infinite", display: "inline-block" }}
          />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes rolesSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return (
    <div className="content roles-page-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .roles-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
        .roles-table-wrap table { min-width: 640px; }
        /* Theme uses hidden native checkbox + .form-check-sign; override pink primary to amber */
        .roles-page-root .form-check .form-check-sign::before {
          border-color: rgba(255,255,255,0.28);
        }
        .roles-page-root .form-check input[type="checkbox"]:checked + .form-check-sign::before {
          background: linear-gradient(160deg, #fbbf24 0%, #d97706 100%) !important;
          border: none !important;
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4);
        }
        .roles-page-root .form-check input[type="checkbox"]:checked + .form-check-sign::after {
          color: #1a1a1e;
        }
      `,
        }}
      />

      <Row>
        <Col xs="12">
          <Card style={cardStyle}>
            <CardHeader style={headerStyle}>
              <Row className="align-items-start align-items-md-center" style={{ marginLeft: 0, marginRight: 0 }}>
                <Col xs="12" md="8" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "linear-gradient(145deg, rgba(255,160,46,0.2) 0%, rgba(255,160,46,0.06) 100%)",
                        border: "1px solid rgba(255,160,46,0.28)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 4px 16px rgba(255,160,46,0.12)",
                      }}
                    >
                      <i className="tim-icons icon-lock-circle" style={{ fontSize: "1rem", color: "#fbbf24" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <CardTitle tag="h4" style={{ color: "#fff", fontWeight: 800, margin: 0, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
                          Roles Management
                        </CardTitle>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "rgba(255,160,46,0.12)",
                            color: "#fbbf24",
                            border: "1px solid rgba(255,160,46,0.25)",
                          }}
                        >
                          Access matrix
                        </span>
                      </div>
                      <p className="mb-0" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
                        Configure which role can access which menu
                      </p>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardHeader>

            <CardBody style={{ padding: "1.1rem clamp(0.85rem, 3vw, 1.35rem)", background: "rgba(0,0,0,0.14)" }}>
              {error && (
                <Alert
                  color="danger"
                  toggle={error.includes("Access denied") ? undefined : () => setError("")}
                  style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#FCA5A5", borderRadius: 10 }}
                >
                  <div>{error}</div>
                  {error.includes("Access denied") && (
                    <Button type="button" className="btn-amber-outline mt-2" size="sm" onClick={() => navigate("/admin/dashboard")}>
                      Go to Dashboard
                    </Button>
                  )}
                </Alert>
              )}
              {success && (
                <Alert color="success" toggle={() => setSuccess("")} style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.35)", color: "#BBF7D0", borderRadius: 10 }}>
                  {success}
                </Alert>
              )}

              <div className="roles-table-wrap">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem", color: "#fff" }}>
                  <thead>
                    <tr>
                      {["Menu", "Super Admin", "Admin", "User"].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: "11px 14px",
                            color: "rgba(255,255,255,0.4)",
                            fontWeight: 700,
                            textAlign: i === 0 ? "left" : "center",
                            whiteSpace: "nowrap",
                            fontSize: "0.68rem",
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {menuPaths.map((menu) => (
                      <tr
                        key={menu.path}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s ease" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <td style={{ padding: "11px 14px", verticalAlign: "middle" }}>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.88rem" }}>{menu.name}</div>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", marginTop: 2 }}>{menu.path}</div>
                        </td>
                        {(["super_admin", "admin", "user"]).map((role) => (
                          <td key={role} style={{ padding: "11px 14px", textAlign: "center", verticalAlign: "middle" }}>
                            <FormGroup check className="d-flex justify-content-center mb-0">
                              <Label check className="mb-0 d-flex align-items-center justify-content-center" style={{ cursor: "pointer", margin: 0 }}>
                                <Input
                                  type="checkbox"
                                  checked={permissions[role][menu.path] !== false}
                                  onChange={(e) => handleToggle(role, menu.path, e.target.checked)}
                                />
                                <span className="form-check-sign ms-0">
                                  <span className="check" />
                                </span>
                              </Label>
                            </FormGroup>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-end flex-wrap gap-2 mt-4" style={{ gap: 12 }}>
                <Button type="button" className="btn-cancel-outline" onClick={handleReset} disabled={saving} style={{ padding: "10px 22px" }}>
                  Reset to Defaults
                </Button>
                <Button type="button" className="btn-amber-outline" onClick={handleSave} disabled={saving} style={{ padding: "10px 28px", minWidth: 160 }}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="me-2" style={{ color: "#ffb347" }} />
                      Saving…
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
