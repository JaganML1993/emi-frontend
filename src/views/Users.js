import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Table,
  Badge,
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

  if (loading) {
    return (
      <div className="content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card
            style={{
              background: "linear-gradient(135deg, #1E1E1E 0%, #2d2b42 100%)",
              border: "1px solid rgba(0, 191, 255, 0.3)",
              borderRadius: "15px",
              boxShadow: "0 8px 32px rgba(0, 191, 255, 0.18)",
            }}
          >
            <CardHeader
              style={{
                background: "linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(30, 144, 255, 0.15) 100%)",
                borderBottom: "1px solid rgba(0, 191, 255, 0.3)",
                borderRadius: "15px 15px 0 0",
                padding: "0.5rem 0.75rem",
              }}
            >
              <Row>
                <Col className="text-left" sm="6">
                  <CardTitle tag="h4" style={{ color: "#ffffff", fontWeight: "700", margin: "0", fontSize: "1.15rem" }}>
                    <i className="tim-icons icon-single-02 mr-2" style={{ color: "#00BFFF" }}></i>
                    Users
                  </CardTitle>
                  <p className="mb-0" style={{ fontSize: "0.8rem", color: "#7FB7FF" }}>
                    Manage users (admin only)
                  </p>
                </Col>
                <Col sm="6" className="text-right">
                  <Button
                    style={{
                      background: "linear-gradient(135deg, rgba(0, 191, 255, 0.9) 0%, rgba(30, 144, 255, 0.8) 100%)",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontWeight: "600",
                    }}
                    onClick={openAddModal}
                  >
                    <i className="tim-icons icon-simple-add mr-1"></i>
                    Add User
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody style={{ padding: "1rem" }}>
              {error && (
                <Alert color="danger" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.45)", color: "#FCA5A5" }}>
                  {error}
                  {error.includes("Access denied") && (
                    <Button color="primary" size="sm" className="ml-2" onClick={() => navigate("/admin/dashboard")}>
                      Go to Dashboard
                    </Button>
                  )}
                </Alert>
              )}
              {success && (
                <Alert color="success" style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.45)", color: "#BBF7D0" }}>
                  {success}
                </Alert>
              )}

              {users.length === 0 ? (
                <div className="text-center py-4" style={{ color: "#CCCCCC" }}>
                  No users found. Click "Add User" to create one.
                </div>
              ) : (
                <Table responsive className="table-hover" style={{ color: "#ffffff" }}>
                  <thead>
                    <tr>
                      <th style={{ color: "#00BFFF", borderColor: "rgba(255,255,255,0.1)" }}>Name</th>
                      <th style={{ color: "#00BFFF", borderColor: "rgba(255,255,255,0.1)" }}>Email</th>
                      <th style={{ color: "#00BFFF", borderColor: "rgba(255,255,255,0.1)" }}>Role</th>
                      <th style={{ color: "#00BFFF", borderColor: "rgba(255,255,255,0.1)" }}>Created</th>
                      <th style={{ color: "#00BFFF", borderColor: "rgba(255,255,255,0.1)", width: 120 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td style={{ borderColor: "rgba(255,255,255,0.1)" }}>{user.name}</td>
                        <td style={{ borderColor: "rgba(255,255,255,0.1)" }}>{user.email}</td>
                        <td style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                          <Badge color={user.role === "super_admin" ? "danger" : user.role === "admin" ? "warning" : "info"}>
                            {user.role === "super_admin" ? "Super Admin" : user.role}
                          </Badge>
                        </td>
                        <td style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                          <Button color="primary" size="sm" className="mr-1" onClick={() => openEditModal(user)}>
                            <i className="tim-icons icon-pencil" />
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                            disabled={String(user._id) === String(JSON.parse(localStorage.getItem("user") || "{}")?.id)}
                            title={String(user._id) === String(JSON.parse(localStorage.getItem("user") || "{}")?.id) ? "Cannot delete yourself" : "Delete"}
                          >
                            <i className="tim-icons icon-trash-simple" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} toggle={closeModal} size="lg" style={{ maxWidth: "500px" }}>
        <ModalHeader toggle={closeModal} style={{ background: "#1e1e2d", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {editId ? "Edit User" : "Add User"}
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody style={{ background: "#2d2b42", color: "#fff" }}>
            {error && <Alert color="danger">{error}</Alert>}
            {success && <Alert color="success">{success}</Alert>}
            <FormGroup>
              <Label>Name *</Label>
              <Input name="name" value={formData.name} onChange={handleChange} placeholder="Full name" required />
            </FormGroup>
            <FormGroup>
              <Label>Email *</Label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Password {editId ? "(leave blank to keep)" : "*"}</Label>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={editId ? "••••••••" : "Min 6 characters"}
                required={!editId}
                minLength={6}
              />
            </FormGroup>
            <FormGroup>
              <Label>Role</Label>
              <Input name="role" type="select" value={formData.role} onChange={handleChange}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </Input>
            </FormGroup>
          </ModalBody>
          <ModalFooter style={{ background: "#1e1e2d", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <Button color="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={saving}>
              {saving ? <><Spinner size="sm" className="mr-2" />Saving...</> : (editId ? "Update" : "Create")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} toggle={() => setDeleteConfirm(null)}>
        <ModalHeader toggle={() => setDeleteConfirm(null)}>Confirm Delete</ModalHeader>
        <ModalBody>
          Are you sure you want to delete user <strong>{deleteConfirm?.name}</strong> ({deleteConfirm?.email})?
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="danger" onClick={handleDeleteConfirm}>Delete</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default Users;
