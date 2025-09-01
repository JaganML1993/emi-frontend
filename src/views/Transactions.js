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
      setLoading(true);
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
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
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
                  <Col md="3">
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
                  <Col md="3" className="d-flex align-items-end">
                    <Button
                      color="secondary"
                      outline
                      onClick={() => {
                        setFilters({
                          type: "",
                          startDate: "",
                          endDate: "",
                        });
                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                      }}
                      disabled={!Object.values(filters).some(f => f)}
                    >
                      <i className="tim-icons icon-refresh-02" /> Clear Filters
                    </Button>
                  </Col>
                </Row>

                {/* Transactions Table */}
                <div className="table-responsive">
                  <Table className="table-dark">
                    <thead>
                      <tr>
                        <th className="text-white border-0" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.75rem 0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
                          <i className="tim-icons icon-calendar-60 mr-2" style={{ fontSize: '0.8rem' }}></i>
                          Date
                        </th>
                        <th className="text-white border-0" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.75rem 0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
                          <i className="tim-icons icon-tag mr-2" style={{ fontSize: '0.8rem' }}></i>
                          Type
                        </th>
                        <th className="text-white border-0" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.75rem 0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
                          <i className="tim-icons icon-notes mr-2" style={{ fontSize: '0.8rem' }}></i>
                          Description
                        </th>
                        <th className="text-white border-0" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.75rem 0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
                          <i className="tim-icons icon-money-coins mr-2" style={{ fontSize: '0.8rem' }}></i>
                          Amount
                        </th>
                        <th className="text-white border-0" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.75rem 0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
                          <i className="tim-icons icon-credit-card mr-2" style={{ fontSize: '0.8rem' }}></i>
                          Payment Method
                        </th>
                        <th className="text-white border-0 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.75rem 0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
                          <i className="tim-icons icon-settings mr-2" style={{ fontSize: '0.8rem' }}></i>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="text-center border-0">
                            <div className="d-flex justify-content-center align-items-center py-5">
                              <div className="spinner-border text-primary" role="status">
                                <span className="sr-only">Loading...</span>
                              </div>
                              <span className="ml-3 text-white">Loading transactions...</span>
                            </div>
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center border-0">
                            <div className="py-5">
                              <i className="tim-icons icon-chart-pie-36" style={{ fontSize: '4rem', opacity: 0.3, color: '#fff' }}></i>
                              <p className="mt-3 mb-1 text-white">No transactions found</p>
                              <small className="text-muted">
                                {Object.values(filters).some(f => f) 
                                  ? "Try adjusting your filters" 
                                  : "Add your first transaction to get started"}
                              </small>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        transactions.map((transaction, index) => (
                          <tr key={transaction._id} className="border-0" style={{ 
                            backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                            transition: 'all 0.3s ease'
                          }}>
                            <td className="text-white border-0" style={{ padding: '0.6rem 0.75rem' }}>
                              <div className="d-flex align-items-center">
                                <div className="mr-2" style={{ 
                                  width: '6px', 
                                  height: '6px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#11cdef' 
                                }}></div>
                                <span style={{ fontSize: '0.875rem' }}>
                                  {format(new Date(transaction.date), "MMM dd, yyyy")}
                                </span>
                              </div>
                            </td>
                            <td className="border-0" style={{ padding: '0.6rem 0.75rem' }}>
                              <Badge
                                color={transaction.type === "income" ? "success" : "danger"}
                                style={{ 
                                  fontSize: '0.7rem', 
                                  padding: '0.3rem 0.6rem',
                                  borderRadius: '12px',
                                  fontWeight: '500'
                                }}
                              >
                                <i className={`tim-icons ${transaction.type === "income" ? "icon-chart-line-32" : "icon-chart-pie-36"} mr-1`} style={{ fontSize: '0.7rem' }}></i>
                                {transaction.type === "income" ? "Income" : "Expense"}
                              </Badge>
                            </td>
                            <td className="text-white border-0" style={{ padding: '0.6rem 0.75rem' }}>
                              <div className="font-weight-bold" style={{ color: '#f8f9fa', fontSize: '0.875rem' }}>
                                {transaction.description}
                              </div>
                              {transaction.notes && (
                                <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                                  {transaction.notes}
                                </small>
                              )}
                            </td>
                            <td className="border-0" style={{ padding: '0.6rem 0.75rem' }}>
                              <div className="d-flex align-items-center">
                                <span
                                  className="font-weight-bold"
                                  style={{ 
                                    fontSize: '0.95rem',
                                    color: transaction.type === "income" ? "#00f2c3" : "#fd5d93",
                                    textShadow: transaction.type === "income" 
                                      ? "0 0 8px rgba(0, 242, 195, 0.3)" 
                                      : "0 0 8px rgba(253, 93, 147, 0.3)"
                                  }}
                                >
                                  {transaction.type === "income" ? "+" : "-"} ₹{transaction.amount.toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="text-white border-0" style={{ padding: '0.6rem 0.75rem' }}>
                              <div className="d-flex align-items-center">
                                <i className="tim-icons icon-credit-card mr-2" style={{ color: '#11cdef', fontSize: '0.8rem' }}></i>
                                <span style={{ color: '#f8f9fa', fontSize: '0.875rem' }}>
                                  {getPaymentMethodLabel(transaction.paymentMethod)}
                                </span>
                              </div>
                            </td>
                            <td className="border-0 text-center" style={{ padding: '0.6rem 0.75rem' }}>
                              <div className="d-flex justify-content-center">
                                <Button
                                  size="sm"
                                  color="info"
                                  className="mr-1"
                                  style={{ 
                                    borderRadius: '6px',
                                    padding: '0.3rem 0.5rem',
                                    border: 'none',
                                    boxShadow: '0 2px 6px rgba(17, 205, 239, 0.3)',
                                    fontSize: '0.75rem'
                                  }}
                                  onClick={() => handleEdit(transaction)}
                                >
                                  <i className="tim-icons icon-pencil" style={{ fontSize: '0.7rem' }} />
                                </Button>
                                <Button
                                  size="sm"
                                  color="danger"
                                  style={{ 
                                    borderRadius: '6px',
                                    padding: '0.3rem 0.5rem',
                                    border: 'none',
                                    boxShadow: '0 2px 6px rgba(253, 93, 147, 0.3)',
                                    fontSize: '0.75rem'
                                  }}
                                  onClick={() => handleDelete(transaction._id)}
                                >
                                  <i className="tim-icons icon-trash-simple" style={{ fontSize: '0.7rem' }} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Row>
                    <Col className="text-center">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{" "}
                          {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{" "}
                          {pagination.totalItems} transactions
                        </div>
                        <div>
                          <FormGroup className="mb-0">
                            <Input
                              type="select"
                              value={pagination.itemsPerPage}
                              onChange={(e) => {
                                setPagination(prev => ({
                                  ...prev,
                                  itemsPerPage: parseInt(e.target.value),
                                  currentPage: 1
                                }));
                              }}
                              style={{ width: 'auto', display: 'inline-block' }}
                            >
                              <option value={5}>5 per page</option>
                              <option value={10}>10 per page</option>
                              <option value={20}>20 per page</option>
                              <option value={50}>50 per page</option>
                            </Input>
                          </FormGroup>
                        </div>
                      </div>
                      <Pagination>
                        <PaginationItem disabled={pagination.currentPage === 1}>
                          <PaginationLink
                            previous
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                          />
                        </PaginationItem>
                        
                        {/* Show first page */}
                        {pagination.currentPage > 3 && (
                          <PaginationItem>
                            <PaginationLink onClick={() => handlePageChange(1)}>
                              1
                            </PaginationLink>
                          </PaginationItem>
                        )}
                        
                        {/* Show ellipsis if needed */}
                        {pagination.currentPage > 4 && (
                          <PaginationItem disabled>
                            <PaginationLink>...</PaginationLink>
                          </PaginationItem>
                        )}
                        
                        {/* Show pages around current page */}
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(page => 
                            page === 1 || 
                            page === pagination.totalPages || 
                            Math.abs(page - pagination.currentPage) <= 1
                          )
                          .map((page) => (
                            <PaginationItem key={page} active={page === pagination.currentPage}>
                              <PaginationLink onClick={() => handlePageChange(page)}>
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                        
                        {/* Show ellipsis if needed */}
                        {pagination.currentPage < pagination.totalPages - 3 && (
                          <PaginationItem disabled>
                            <PaginationLink>...</PaginationLink>
                          </PaginationItem>
                        )}
                        
                        {/* Show last page */}
                        {pagination.currentPage < pagination.totalPages - 2 && (
                          <PaginationItem>
                            <PaginationLink onClick={() => handlePageChange(pagination.totalPages)}>
                              {pagination.totalPages}
                            </PaginationLink>
                          </PaginationItem>
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
        <Modal 
          isOpen={modal} 
          toggle={closeModal} 
          size="lg" 
          className="modal-dark"
          style={{ 
            marginTop: '5vh',
            marginBottom: '5vh'
          }}
        >
          <ModalHeader toggle={closeModal} style={{ 
            backgroundColor: '#1e1e2d', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            color: '#fff'
          }}>
            <div className="d-flex align-items-center">
              <i className={`tim-icons ${editingTransaction ? "icon-pencil" : "icon-simple-add"} mr-3`} style={{ color: '#11cdef' }}></i>
              <h5 className="mb-0">
                {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
              </h5>
            </div>
          </ModalHeader>
          <ModalBody style={{ backgroundColor: '#1e1e2d', color: '#fff' }}>
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label style={{ color: '#f8f9fa', fontWeight: '500', marginBottom: '0.5rem' }}>
                      <i className="tim-icons icon-tag mr-2" style={{ color: '#11cdef' }}></i>
                      Type *
                    </Label>
                    <Input
                      type="select"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      required
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '8px'
                      }}
                    >
                      <option value="expense" style={{ backgroundColor: '#1e1e2d' }}>Expense</option>
                      <option value="income" style={{ backgroundColor: '#1e1e2d' }}>Income</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label style={{ color: '#f8f9fa', fontWeight: '500', marginBottom: '0.5rem' }}>
                      <i className="tim-icons icon-money-coins mr-2" style={{ color: '#11cdef' }}></i>
                      Amount *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '8px'
                      }}
                      placeholder="Enter amount"
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <Label style={{ color: '#f8f9fa', fontWeight: '500', marginBottom: '0.5rem' }}>
                      <i className="tim-icons icon-notes mr-2" style={{ color: '#11cdef' }}></i>
                      Description *
                    </Label>
                    <Input
                      type="text"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      required
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '8px'
                      }}
                      placeholder="Enter transaction description"
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label style={{ color: '#f8f9fa', fontWeight: '500', marginBottom: '0.5rem' }}>
                      <i className="tim-icons icon-calendar-60 mr-2" style={{ color: '#11cdef' }}></i>
                      Date *
                    </Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '8px'
                      }}
                    />
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label style={{ color: '#f8f9fa', fontWeight: '500', marginBottom: '0.5rem' }}>
                      <i className="tim-icons icon-credit-card mr-2" style={{ color: '#11cdef' }}></i>
                      Payment Method
                    </Label>
                    <Input
                      type="select"
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentMethod: e.target.value })
                      }
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '8px'
                      }}
                    >
                      <option value="cash" style={{ backgroundColor: '#1e1e2d' }}>Cash</option>
                      <option value="credit_card" style={{ backgroundColor: '#1e1e2d' }}>Credit Card</option>
                      <option value="debit_card" style={{ backgroundColor: '#1e1e2d' }}>Debit Card</option>
                      <option value="bank_transfer" style={{ backgroundColor: '#1e1e2d' }}>Bank Transfer</option>
                      <option value="digital_wallet" style={{ backgroundColor: '#1e1e2d' }}>Digital Wallet</option>
                      <option value="other" style={{ backgroundColor: '#1e1e2d' }}>Other</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <Label style={{ color: '#f8f9fa', fontWeight: '500', marginBottom: '0.5rem' }}>
                      <i className="tim-icons icon-single-02 mr-2" style={{ color: '#11cdef' }}></i>
                      Notes
                    </Label>
                    <Input
                      type="textarea"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '8px',
                        minHeight: '80px'
                      }}
                      placeholder="Add any additional notes (optional)"
                    />
                  </FormGroup>
                </Col>
              </Row>
            </Form>
          </ModalBody>
          <ModalFooter style={{ 
            backgroundColor: '#1e1e2d', 
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Button 
              color="secondary" 
              onClick={closeModal}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: '8px',
                padding: '0.5rem 1.5rem'
              }}
            >
              <i className="tim-icons icon-simple-remove mr-2"></i>
              Cancel
            </Button>
            <Button 
              color="primary" 
              type="submit"
              onClick={handleSubmit}
              style={{
                backgroundColor: '#11cdef',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1.5rem',
                boxShadow: '0 4px 15px rgba(17, 205, 239, 0.3)'
              }}
            >
              <i className={`tim-icons ${editingTransaction ? "icon-check-2" : "icon-simple-add"} mr-2`}></i>
              {editingTransaction ? "Update" : "Save"}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </>
  );
}

export default Transactions;
