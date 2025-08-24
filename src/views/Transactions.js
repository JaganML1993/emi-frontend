import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
  Row,
  Col,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Badge,
  Pagination,
  PaginationItem,
  PaginationLink,
} from "reactstrap";
import { format } from "date-fns";
import api from "../config/axios";

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "other",
    notes: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [filters, setFilters] = useState({
    type: "",
    startDate: "",
    endDate: "",
  });

  const fetchTransactions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/transactions", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pagination.currentPage,
          limit: pagination.itemsPerPage,
          ...filters,
        },
      });
      setTransactions(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const url = editingTransaction
        ? `/api/transactions/${editingTransaction._id}`
        : "/api/transactions";
      const method = editingTransaction ? "put" : "post";

      await api[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setModal(false);
      setEditingTransaction(null);
      resetForm();
      fetchTransactions();
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      date: format(new Date(transaction.date), "yyyy-MM-dd"),
      paymentMethod: transaction.paymentMethod,
      notes: transaction.notes || "",
    });
    setModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        const token = localStorage.getItem("token");
        await api.delete(`/api/transactions/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchTransactions();
      } catch (error) {
        console.error("Error deleting transaction:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      type: "expense",
      amount: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "other",
      notes: "",
    });
  };

  const openModal = () => {
    setEditingTransaction(null);
    resetForm();
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditingTransaction(null);
    resetForm();
  };

  const handlePageChange = (page) => {
    setPagination({ ...pagination, currentPage: page });
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, currentPage: 1 });
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: "Cash",
      credit_card: "Credit Card",
      debit_card: "Debit Card",
      bank_transfer: "Bank Transfer",
      digital_wallet: "Digital Wallet",
      other: "Other",
    };
    return labels[method] || method;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="content">
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <Row>
                  <Col className="text-left" sm="6">
                    <CardTitle tag="h4">Transactions</CardTitle>
                    <p className="card-category">
                      Manage your income and expenses
                    </p>
                  </Col>
                  <Col sm="6">
                    <Button
                      className="btn-round float-right"
                      color="info"
                      onClick={openModal}
                    >
                      <i className="tim-icons icon-simple-add" /> Add Transaction
                    </Button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                {/* Filters */}
                <Row className="mb-4">
                  <Col md="3">
                    <FormGroup>
                      <Label>Type</Label>
                      <Input
                        type="select"
                        value={filters.type}
                        onChange={(e) => handleFilterChange("type", e.target.value)}
                      >
                        <option value="">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange("startDate", e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                </Row>

                {/* Transactions Table */}
                <div className="table-responsive">
                  <Table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Payment Method</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction._id}>
                          <td>
                            {format(new Date(transaction.date), "MMM dd, yyyy")}
                          </td>
                          <td>
                            <Badge
                              color={transaction.type === "income" ? "success" : "danger"}
                            >
                              {transaction.type === "income" ? "Income" : "Expense"}
                            </Badge>
                          </td>
                          <td>{transaction.description}</td>
                          <td>
                            <span
                              className={
                                transaction.type === "income" ? "text-success" : "text-danger"
                              }
                              style={{ fontWeight: "bold" }}
                            >
                              ₹{transaction.amount.toFixed(2)}
                            </span>
                          </td>
                          <td>{getPaymentMethodLabel(transaction.paymentMethod)}</td>
                          <td>
                            <Button
                              size="sm"
                              color="info"
                              className="mr-2"
                              onClick={() => handleEdit(transaction)}
                            >
                              <i className="tim-icons icon-pencil" />
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              onClick={() => handleDelete(transaction._id)}
                            >
                              <i className="tim-icons icon-trash-simple" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Row>
                    <Col className="text-center">
                      <Pagination>
                        <PaginationItem disabled={pagination.currentPage === 1}>
                          <PaginationLink
                            previous
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                          />
                        </PaginationItem>
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                          (page) => (
                            <PaginationItem key={page} active={page === pagination.currentPage}>
                              <PaginationLink onClick={() => handlePageChange(page)}>
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        <PaginationItem disabled={pagination.currentPage === pagination.totalPages}>
                          <PaginationLink
                            next
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                          />
                        </PaginationItem>
                      </Pagination>
                    </Col>
                  </Row>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Add/Edit Transaction Modal */}
        <Modal isOpen={modal} toggle={closeModal} size="lg">
          <ModalHeader toggle={closeModal}>
            {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
          </ModalHeader>
          <Form onSubmit={handleSubmit}>
            <ModalBody>
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label>Type *</Label>
                    <Input
                      type="select"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      required
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <Label>Description *</Label>
                    <Input
                      type="text"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      required
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label>Payment Method</Label>
                    <Input
                      type="select"
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentMethod: e.target.value })
                      }
                    >
                      <option value="cash">Cash</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="digital_wallet">Digital Wallet</option>
                      <option value="other">Other</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <Label>Notes</Label>
                    <Input
                      type="textarea"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button color="primary" type="submit">
                {editingTransaction ? "Update" : "Save"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </div>
    </>
  );
}

export default Transactions;
