import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
} from "reactstrap";
import api from "../config/axios";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "user",
};

const accentAmber = "#FFA02E";

const labelStyle = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  borderRadius: 10,
};

function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const currentUserId = useMemo(() => {
    try {
      return String(JSON.parse(localStorage.getItem("user") || "{}")?.id || "");
    } catch {
      return "";
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/users");
      setUsers(res.data.data || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("Access denied. Admin role required.");
      } else {
        setError("Failed to load users");
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditId(null);
    setFormData({ ...emptyForm });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditId(user._id);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "user",
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editId) {
        const payload = { name: formData.name, email: formData.email, role: formData.role };
        if (formData.password) payload.password = formData.password;
        await api.put(`/api/users/${editId}`, payload);
        setSuccess("User updated successfully");
      } else {
        if (!formData.password) {
          setError("Password is required for new users");
          setSaving(false);
          return;
        }
        await api.post("/api/users", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
        setSuccess("User created successfully");
      }
      fetchUsers();
      setTimeout(() => {
        closeModal();
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (user) => {
    setDeleteConfirm(user);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/users/${deleteConfirm._id}`);
      setSuccess("User deleted successfully");
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const roleChip = (role) => {
    const isSuper = role === "super_admin";
    const isAdmin = role === "admin";
    const label = isSuper ? "Super Admin" : isAdmin ? "Admin" : "User";
    const accent = isSuper ? "#ff5a5a" : isAdmin ? accentAmber : "#3cd278";
    return (
      <span
        style={{
          fontSize: "0.6rem",
          fontWeight: 800,
          padding: "3px 8px",
          borderRadius: 6,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          background: `${accent}18`,
          color: accent,
          border: `1px solid ${accent}35`,
        }}
      >
        {label}
      </span>
    );
  };

  const formatCreated = (d) => {
    if (!d) return "—";
    const t = new Date(d);
    return Number.isNaN(t.getTime()) ? "—" : t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="content">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <i
            className="tim-icons icon-refresh-02"
            style={{
              fontSize: "2.5rem",
              color: "#f59e0b",
              animation: "usersSpin 0.9s linear infinite",
              display: "inline-block",
            }}
          />
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes usersSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  return (
    <div className="content users-page-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes usersFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .users-section { animation: usersFadeUp 0.35s ease both; }
        .users-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
        .users-table-wrap table { min-width: 640px; }
      `,
        }}
      />

      <Row className="users-section">
        <Col xs="12">
          <Card
            style={{
              background: "linear-gradient(165deg, #18181c 0%, #141416 50%, #121214 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              boxShadow: "0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,160,46,0.06) inset",
              overflow: "hidden",
            }}
          >
            <CardHeader
              style={{
                background: "linear-gradient(90deg, rgba(255,160,46,0.08) 0%, transparent 55%)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                padding: "1.1rem clamp(0.85rem, 3vw, 1.35rem)",
              }}
            >
              <Row className="align-items-start align-items-md-center" style={{ marginLeft: 0, marginRight: 0 }}>
                <Col xs="12" md="7" style={{ paddingLeft: 0, paddingRight: 0 }}>
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
                      <i className="tim-icons icon-single-02" style={{ fontSize: "1rem", color: "#fbbf24" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <CardTitle
                          tag="h4"
                          style={{
                            color: "#fff",
                            fontWeight: 800,
                            margin: 0,
                            fontSize: "1.05rem",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          Users
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
                          Admin
                        </span>
                      </div>
                      <p className="mb-0" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
                        Manage accounts, roles, and access
                      </p>
                    </div>
                  </div>
                </Col>
                <Col xs="12" md="5" className="d-flex justify-content-md-end mt-3 mt-md-0" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <button type="button" onClick={openAddModal} className="btn-amber-outline">
                    <i className="tim-icons icon-simple-add mr-1" />
                    Add User
                  </button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody style={{ padding: "1.1rem clamp(0.85rem, 3vw, 1.35rem)", background: "rgba(0,0,0,0.14)" }}>
              {error && (
                <Alert
                  color="danger"
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    color: "#FCA5A5",
                    borderRadius: 10,
                  }}
                >
                  {error}
                  {error.includes("Access denied") && (
                    <button type="button" className="btn-amber-outline ml-2" style={{ padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => navigate("/admin/dashboard")}>
                      Go to Dashboard
                    </button>
                  )}
                </Alert>
              )}
              {success && (
                <Alert
                  color="success"
                  style={{
                    background: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    color: "#BBF7D0",
                    borderRadius: 10,
                  }}
                >
                  {success}
                </Alert>
              )}

              {users.length === 0 ? (
                <div className="text-center py-5">
                  <i className="tim-icons icon-single-02" style={{ fontSize: "3rem", color: accentAmber, marginBottom: "1rem", opacity: 0.45 }} />
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem", marginBottom: "0.5rem", fontWeight: 600 }}>No users found</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                    Add a user to grant access to the app
                  </div>
                  <button type="button" onClick={openAddModal} className="btn-amber-outline">
                    <i className="tim-icons icon-simple-add mr-1" />
                    Add your first user
                  </button>
                </div>
              ) : (
                <div className="users-table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                    <thead>
                      <tr>
                        {["Name", "Email", "Role", "Created", ""].map((h, i) => (
                          <th
                            key={h || i}
                            style={{
                              padding: "11px 14px",
                              color: "rgba(255,255,255,0.4)",
                              fontWeight: 700,
                              textAlign: "left",
                              whiteSpace: "nowrap",
                              fontSize: "0.68rem",
                              letterSpacing: "0.07em",
                              textTransform: "uppercase",
                              borderBottom: "1px solid rgba(255,255,255,0.08)",
                              background: "rgba(255,255,255,0.03)",
                              width: i === 4 ? 100 : undefined,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const isSelf = String(user._id) === currentUserId;
                        return (
                          <tr
                            key={user._id}
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s ease" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <td style={{ padding: "11px 14px", color: "#fff", fontWeight: 700, fontSize: "0.88rem" }}>{user.name}</td>
                            <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.65)" }}>{user.email}</td>
                            <td style={{ padding: "11px 14px" }}>{roleChip(user.role)}</td>
                            <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                              {formatCreated(user.createdAt)}
                            </td>
                            <td style={{ padding: "11px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onClick={() => openEditModal(user)}
                                title="Edit"
                                style={{
                                  background: "rgba(255,160,46,0.12)",
                                  border: "1px solid rgba(255,160,46,0.3)",
                                  borderRadius: 8,
                                  width: 32,
                                  height: 32,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "#fbbf24",
                                  marginRight: 6,
                                }}
                              >
                                <i className="tim-icons icon-pencil" style={{ fontSize: "0.7rem" }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(user)}
                                disabled={isSelf}
                                title={isSelf ? "Cannot delete yourself" : "Delete"}
                                style={{
                                  background: isSelf ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.08)",
                                  border: isSelf ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(239,68,68,0.22)",
                                  borderRadius: 8,
                                  width: 32,
                                  height: 32,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: isSelf ? "not-allowed" : "pointer",
                                  color: isSelf ? "rgba(255,255,255,0.25)" : "#f87171",
                                  opacity: isSelf ? 0.5 : 1,
                                }}
                              >
                                <i className="tim-icons icon-trash-simple" style={{ fontSize: "0.7rem" }} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal isOpen={modalOpen} toggle={closeModal} size="lg" style={{ maxWidth: "500px" }} contentClassName="bg-dark border-0">
        <ModalHeader
          toggle={closeModal}
          style={{ background: "#141416", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          close={
            <button type="button" className="close text-white" onClick={closeModal} style={{ opacity: 0.75 }}>
              &times;
            </button>
          }
        >
          {editId ? "Edit User" : "Add User"}
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody style={{ background: "#1a1a1e", color: "#fff" }}>
            {error && (
              <Alert color="danger" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#FCA5A5" }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert color="success" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", color: "#BBF7D0" }}>
                {success}
              </Alert>
            )}
            <FormGroup>
              <Label style={labelStyle}>Name *</Label>
              <Input name="name" value={formData.name} onChange={handleChange} placeholder="Full name" required style={inputStyle} />
            </FormGroup>
            <FormGroup>
              <Label style={labelStyle}>Email *</Label>
              <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" required style={inputStyle} />
            </FormGroup>
            <FormGroup>
              <Label style={labelStyle}>Password {editId ? "(leave blank to keep)" : "*"}</Label>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={editId ? "••••••••" : "Min 6 characters"}
                required={!editId}
                minLength={6}
                style={inputStyle}
              />
            </FormGroup>
            <FormGroup className="mb-0">
              <Label style={labelStyle}>Role</Label>
              <Input name="role" type="select" value={formData.role} onChange={handleChange} style={inputStyle}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </Input>
            </FormGroup>
          </ModalBody>
          <ModalFooter style={{ background: "#141416", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Button type="button" className="btn-cancel-outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="btn-amber-outline" disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" style={{ color: "#ffb347" }} />
                  Saving…
                </>
              ) : editId ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={!!deleteConfirm} toggle={() => setDeleteConfirm(null)} contentClassName="bg-dark border-0">
        <ModalHeader
          toggle={() => setDeleteConfirm(null)}
          style={{ background: "#141416", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          close={
            <button type="button" className="close text-white" onClick={() => setDeleteConfirm(null)} style={{ opacity: 0.75 }}>
              &times;
            </button>
          }
        >
          Confirm Delete
        </ModalHeader>
        <ModalBody style={{ background: "#1a1a1e", color: "rgba(255,255,255,0.85)" }}>
          Are you sure you want to delete user <strong style={{ color: "#fff" }}>{deleteConfirm?.name}</strong> ({deleteConfirm?.email})?
        </ModalBody>
        <ModalFooter style={{ background: "#141416", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Button className="btn-cancel-outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button color="danger" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default Users;
