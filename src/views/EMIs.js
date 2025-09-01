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
  Progress,
  Badge,
  Table,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";

import { format } from "date-fns";
import classnames from "classnames";

import api from "../config/axios";



// Helper functions
const getStatusColor = (status) => {
  switch (status) {
    case "active":
      return "primary";
    case "completed":
      return "success";
    case "defaulted":
      return "warning";
    default:
      return "secondary";
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case "car_loan":
      return "tim-icons icon-delivery-fast";
    case "bike_emi":
      return "tim-icons icon-delivery-fast";
    case "home_loan":
      return "tim-icons icon-bank";
    case "personal_loan":
      return "tim-icons icon-money-coins";
    case "business_loan":
      return "tim-icons icon-chart-bar-32";
    case "education_loan":
      return "tim-icons icon-bulb-63";
    case "cheetu":
      return "tim-icons icon-chart-pie-36";
    default:
      return "tim-icons icon-chart-pie-36";
  }
};

const getTypeDisplayName = (type) => {
  switch (type) {
    case "personal_loan":
      return "Personal Loan";
    case "mobile_emi":
      return "Mobile EMI";
    case "laptop_emi":
      return "Laptop EMI";
    case "savings_emi":
      return "Savings EMI";
    case "car_loan":
      return "Car Loan";
    case "home_loan":
      return "Home Loan";
    case "business_loan":
      return "Business Loan";
    case "education_loan":
      return "Education Loan";
    case "credit_card":
      return "Credit Card";
    case "appliance_emi":
      return "Appliance EMI";
    case "furniture_emi":
      return "Furniture EMI";
    case "bike_emi":
      return "Bike EMI";
    case "cheetu":
      return "Cheetu";
    default:
      return type.replace('_', ' ');
  }
};

const calculateProgress = (emi) => {
  return (emi.paidInstallments / emi.totalInstallments) * 100;
};

const getDaysUntilDue = (emi) => {
  if (emi.paymentType === 'full_payment' || !emi.nextDueDate) {
    return null;
  }
  const today = new Date();
  const dueDate = new Date(emi.nextDueDate);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getDueStatus = (emi) => {
  if (emi.paymentType === 'full_payment' || !emi.nextDueDate) {
    return null;
  }
  const daysUntilDue = getDaysUntilDue(emi);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 7) return "due-soon";
  return "upcoming";
};

const getDueStatusColor = (status) => {
  if (!status) return "secondary";
  switch (status) {
    case "overdue":
      return "danger";
    case "due-soon":
      return "warning";
    default:
      return "info";
  }
};

function EMIs() {
  const [loading, setLoading] = useState(true);
  const [emis, setEmis] = useState([]);

  const [activeTab, setActiveTab] = useState("1");



  const navigate = useNavigate();

  const fetchEMIs = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/emis", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmis(response.data.data);
    } catch (error) {
      console.error("Error fetching EMIs:", error);
    } finally {
      setLoading(false);
    }
  }, []);





  useEffect(() => {
    fetchEMIs();
  }, [fetchEMIs]);

  // Refresh data when component comes into focus (e.g., after navigation back from payment)
  useEffect(() => {
    const handleFocus = () => {
      fetchEMIs();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchEMIs]);

  const openPaymentModal = (emi) => {
    navigate(`/admin/emis/${emi._id}/pay`);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this EMI?")) {
      try {
        const token = localStorage.getItem("token");
        await api.delete(`/api/emis/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchEMIs();
      } catch (error) {
        console.error("Error deleting EMI:", error);
      }
    }
  };







  const handleAddEMI = () => {
    navigate("/admin/emis/add");
  };

  const handleEditEMI = (emi) => {
    navigate(`/admin/emis/edit/${emi._id}`);
  };

  if (loading) {
    return (
      <div className="content">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <i className="tim-icons icon-refresh-02 fa-spin" style={{ fontSize: '2rem', color: '#1d8cf8' }} />
            <h5 className="mt-3">Loading EMIs...</h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="content">
        {/* EMI Management */}
        <Row>
          <Col md="12">
            <Card style={{ 
              background: 'linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '15px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <CardHeader style={{ 
                background: 'linear-gradient(135deg, rgba(29, 140, 248, 0.1) 0%, rgba(29, 140, 248, 0.05) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '15px 15px 0 0'
              }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <CardTitle tag="h4" style={{ 
                      color: '#ffffff',
                      fontWeight: '700',
                      margin: '0',
                      fontSize: '1.5rem'
                    }}>
                      <i className="tim-icons icon-chart-pie-36 mr-2" style={{ color: '#1d8cf8' }}></i>
                      EMI Management
                    </CardTitle>
                    <p className="text-white-50 mb-0" style={{ fontSize: '0.9rem' }}>
                      Manage and track your EMI payments
                    </p>
                  </div>
                  <div>
                    <Button
                      style={{
                        background: 'linear-gradient(135deg, #1d8cf8 0%, #0056b3 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontWeight: '600',
                        boxShadow: '0 4px 15px rgba(29, 140, 248, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      size="sm"
                      onClick={handleAddEMI}
                      className="me-2"
                    >
                      <i className="tim-icons icon-simple-add mr-1"></i>
                      Add New EMI
                    </Button>
                    <Button
                      style={{
                        background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontWeight: '600',
                        boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      size="sm"
                      onClick={fetchEMIs}
                    >
                      <i className="tim-icons icon-refresh-02"></i> Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardBody style={{ padding: '1.5rem' }}>
                <Nav tabs style={{ 
                  borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '1.5rem'
                }}>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === "1" })}
                      onClick={() => setActiveTab("1")}
                      style={{
                        color: activeTab === "1" ? '#1d8cf8' : '#ffffff',
                        backgroundColor: activeTab === "1" ? 'rgba(29, 140, 248, 0.1)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px 8px 0 0',
                        fontWeight: '600',
                        padding: '12px 20px',
                        transition: 'all 0.3s ease',
                        borderBottom: activeTab === "1" ? '3px solid #1d8cf8' : 'none'
                      }}
                    >
                      <i className="tim-icons icon-chart-pie-36 mr-2"></i>
                      Active EMIs
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === "2" })}
                      onClick={() => setActiveTab("2")}
                      style={{
                        color: activeTab === "2" ? '#00d25b' : '#ffffff',
                        backgroundColor: activeTab === "2" ? 'rgba(0, 210, 91, 0.1)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px 8px 0 0',
                        fontWeight: '600',
                        padding: '12px 20px',
                        transition: 'all 0.3s ease',
                        borderBottom: activeTab === "2" ? '3px solid #00d25b' : 'none'
                      }}
                    >
                      <i className="tim-icons icon-check-2 mr-2"></i>
                      Completed EMIs
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === "3" })}
                      onClick={() => setActiveTab("3")}
                      style={{
                        color: activeTab === "3" ? '#ff8d72' : '#ffffff',
                        backgroundColor: activeTab === "3" ? 'rgba(255, 141, 114, 0.1)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px 8px 0 0',
                        fontWeight: '600',
                        padding: '12px 20px',
                        transition: 'all 0.3s ease',
                        borderBottom: activeTab === "3" ? '3px solid #ff8d72' : 'none'
                      }}
                    >
                      <i className="tim-icons icon-chart-bar-32 mr-2"></i>
                      All EMIs
                    </NavLink>
                  </NavItem>
                </Nav>
                <TabContent activeTab={activeTab}>
                  <TabPane tabId="1">
                    <EMITable
                      emis={emis.filter((emi) => emi.status === "active")}
                      onEdit={handleEditEMI}
                      onDelete={handleDelete}
                      onPayment={openPaymentModal}
                      showActions={true}
                    />
                  </TabPane>
                  <TabPane tabId="2">
                    <EMITable
                      emis={emis.filter((emi) => emi.status === "completed")}
                      onEdit={handleEditEMI}
                      onDelete={handleDelete}
                      onPayment={openPaymentModal}
                      showActions={false}
                    />
                  </TabPane>
                  <TabPane tabId="3">
                    <EMITable
                      emis={emis}
                      onEdit={handleEditEMI}
                      onDelete={handleDelete}
                      onPayment={openPaymentModal}
                      showActions={true}
                    />
                  </TabPane>
                </TabContent>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>




    </>
  );
}

// EMI Table Component
function EMITable({ emis, onEdit, onDelete, onPayment, showActions }) {
  if (emis.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="tim-icons icon-chart-pie-36" style={{ fontSize: '3rem', color: '#6c757d', marginBottom: '1rem' }}></i>
        <h5 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>No EMIs Found</h5>
        <p style={{ color: '#6c757d' }}>Start by adding your first EMI to track your payments.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <style>
        {`
          .emi-table th,
          .emi-table td {
            border: none !important;
            border-top: none !important;
            border-bottom: none !important;
            border-left: none !important;
            border-right: none !important;
          }
          .emi-table {
            border: none !important;
          }
        `}
      </style>
      <Table className="emi-table" style={{ 
        minWidth: '800px',
        color: '#ffffff',
        borderCollapse: 'separate',
        borderSpacing: '0',
        border: 'none'
      }}>
              <thead>
                <tr style={{ 
                  background: 'linear-gradient(135deg, rgba(29, 140, 248, 0.1) 0%, rgba(29, 140, 248, 0.05) 100%)',
                  borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <th style={{ 
                    minWidth: '150px',
                    color: '#1d8cf8',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '15px 10px',
                    border: 'none'
                  }}>
                    <i className="tim-icons icon-single-02 mr-1"></i>
                    EMI Details
                  </th>
                  <th style={{ 
                    minWidth: '120px',
                    color: '#1d8cf8',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '15px 10px',
                    border: 'none'
                  }}>
                    <i className="tim-icons icon-chart-pie-36 mr-1"></i>
                    Progress
                  </th>
                  <th style={{ 
                    minWidth: '120px',
                    color: '#1d8cf8',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '15px 10px',
                    border: 'none'
                  }}>
                    <i className="tim-icons icon-calendar-60 mr-1"></i>
                    Next Due
                  </th>
                  <th style={{ 
                    minWidth: '150px',
                    color: '#1d8cf8',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '15px 10px',
                    border: 'none'
                  }}>
                    <i className="tim-icons icon-money-coins mr-1"></i>
                    Amount
                  </th>
                  <th style={{ 
                    minWidth: '100px',
                    color: '#1d8cf8',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '15px 10px',
                    border: 'none'
                  }}>
                    <i className="tim-icons icon-badge mr-1"></i>
                    Status
                  </th>
                  {showActions && (
                    <th style={{ 
                      minWidth: '160px',
                      color: '#1d8cf8',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '15px 10px',
                      border: 'none'
                    }}>
                      <i className="tim-icons icon-settings mr-1"></i>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {emis.map((emi, index) => (
                  <tr key={emi._id} style={{
                    background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(29, 140, 248, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <td style={{ 
                      verticalAlign: 'top', 
                      wordWrap: 'break-word',
                      padding: '15px 10px',
                      border: 'none'
                    }}>
                      <div>
                        <strong style={{ 
                          color: '#ffffff',
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}>
                          {emi.name}
                        </strong>
                        <br />
                        <small style={{ 
                          color: '#6c757d',
                          fontSize: '0.85rem'
                        }}>
                          <i className={getTypeIcon(emi.type)} style={{ color: '#1d8cf8' }}></i> {getTypeDisplayName(emi.type)}
                        </small>
                      </div>
                    </td>
                    <td style={{ 
                      verticalAlign: 'top',
                      padding: '15px 10px',
                      border: 'none'
                    }}>
                      <div style={{ border: 'none' }}>
                        <Progress
                          value={calculateProgress(emi)}
                          color={emi.status === "completed" ? "success" : "info"}
                          style={{ 
                            height: '8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            boxShadow: 'none'
                          }}
                        />
                        <small style={{ 
                          color: '#6c757d',
                          fontSize: '0.8rem',
                          marginTop: '5px',
                          display: 'block'
                        }}>
                          {emi.paidInstallments} / {emi.totalInstallments}
                        </small>
                      </div>
                    </td>
                    {emi.paymentType === 'emi' ? (
                      <td style={{ 
                        verticalAlign: 'top',
                        padding: '15px 10px',
                        border: 'none'
                      }}>
                        <div>
                          <strong style={{ 
                            color: '#ffffff',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>
                            {emi.nextDueDate ? format(new Date(emi.nextDueDate), "MMM dd, yyyy") : "-"}
                          </strong>
                          <br />
                          <Badge 
                            style={{
                              fontSize: '0.7rem',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontWeight: '600',
                              background: getDueStatus(emi) === "overdue" 
                                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                                : getDueStatus(emi) === "due-soon"
                                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                                : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                              color: '#ffffff',
                              border: 'none',
                              boxShadow: getDueStatus(emi) === "overdue" 
                                ? '0 2px 8px rgba(239, 68, 68, 0.3)'
                                : getDueStatus(emi) === "due-soon"
                                ? '0 2px 8px rgba(239, 68, 68, 0.3)'
                                : '0 2px 8px rgba(139, 92, 246, 0.3)'
                            }}
                          >
                            {getDueStatus(emi) === "overdue" && "Overdue"}
                            {getDueStatus(emi) === "due-soon" && "Due Soon"}
                            {getDueStatus(emi) === "upcoming" && "Upcoming"}
                          </Badge>
                        </div>
                      </td>
                    ) : (
                      <td style={{ 
                        verticalAlign: 'top',
                        padding: '15px 10px',
                        border: 'none'
                      }}>
                        <div>
                          <strong style={{ color: '#6c757d' }}>-</strong>
                          <br />
                          <small style={{ color: '#6c757d' }}>Full Payment</small>
                        </div>
                      </td>
                    )}
                    <td style={{ 
                      verticalAlign: 'top', 
                      wordWrap: 'break-word',
                      padding: '15px 10px',
                      border: 'none'
                    }}>
                      <div>
                        <strong style={{ 
                          color: '#00d25b',
                          fontSize: '1rem',
                          fontWeight: '700'
                        }}>
                          ₹{emi.emiAmount.toLocaleString()}
                        </strong>
                        <br />
                        <small style={{ 
                          color: '#6c757d',
                          fontSize: '0.8rem'
                        }}>
                          Total: ₹{(emi.emiAmount * emi.totalInstallments).toLocaleString()}
                        </small>
                        <br />
                        <small style={{ 
                          color: '#ff8d72',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}>
                          Remaining: ₹{emi.remainingAmount.toLocaleString()}
                        </small>
                      </div>
                    </td>
                    <td style={{ 
                      verticalAlign: 'top',
                      padding: '15px 10px',
                      border: 'none'
                    }}>
                      <Badge 
                        style={{
                          fontSize: '0.75rem',
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: emi.status === "active" 
                            ? 'linear-gradient(135deg, #1d8cf8 0%, #0056b3 100%)'
                            : emi.status === "completed"
                            ? 'linear-gradient(135deg, #00d25b 0%, #00a854 100%)'
                            : emi.status === "defaulted"
                            ? 'linear-gradient(135deg, #ff8d72 0%, #ff6b6b 100%)'
                            : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                          color: '#ffffff',
                          border: 'none',
                          boxShadow: emi.status === "active" 
                            ? '0 2px 8px rgba(29, 140, 248, 0.3)'
                            : emi.status === "completed"
                            ? '0 2px 8px rgba(0, 210, 91, 0.3)'
                            : emi.status === "defaulted"
                            ? '0 2px 8px rgba(255, 141, 114, 0.3)'
                            : '0 2px 8px rgba(108, 117, 125, 0.3)'
                        }}
                      >
                        {emi.status.charAt(0).toUpperCase() + emi.status.slice(1)}
                      </Badge>
                    </td>
                    {showActions && (
                      <td style={{ 
                        verticalAlign: 'top',
                        padding: '15px 10px',
                        border: 'none'
                      }}>
                        <Button
                          style={{
                            background: 'linear-gradient(135deg, #e14eca 0%, #ba54f5 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(225, 78, 202, 0.3)',
                            transition: 'all 0.3s ease'
                          }}
                          size="sm"
                          onClick={() => onEdit(emi)}
                          className="mr-2"
                        >
                          <i className="tim-icons icon-pencil mr-1"></i>
                          Edit
                        </Button>
                        {emi.status === "active" && (
                          <Button
                            style={{
                              background: 'linear-gradient(135deg, #00d25b 0%, #00a854 100%)',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              boxShadow: '0 2px 8px rgba(0, 210, 91, 0.3)',
                              transition: 'all 0.3s ease'
                            }}
                            size="sm"
                            onClick={() => onPayment(emi)}
                            className="mr-2"
                          >
                            <i className="tim-icons icon-money-coins mr-1"></i>
                            Pay
                          </Button>
                        )}
                        <Button
                          style={{
                            background: 'linear-gradient(135deg, #fd5d93 0%, #ec250d 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(253, 93, 147, 0.3)',
                            transition: 'all 0.3s ease'
                          }}
                          size="sm"
                          onClick={() => onDelete(emi._id)}
                        >
                          <i className="tim-icons icon-simple-remove mr-1"></i>
                          Delete
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
  );
}

export default EMIs;
