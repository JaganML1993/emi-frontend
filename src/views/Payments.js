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
  Badge,
  Spinner,
} from "reactstrap";
import { format } from "date-fns";
import api from "../config/axios";

function Payments() {
  const navigate = useNavigate();
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payments = response.data.data || [];
      // Sort by EMI day
      const sorted = [...payments].sort((a, b) => {
        const aEmiDay = a.emiDay || 0;
        const bEmiDay = b.emiDay || 0;
        return aEmiDay - bEmiDay;
      });
      setEmis(sorted);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setEmis([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Refresh payments when window regains focus (e.g., after marking payment as paid in Dashboard)
  useEffect(() => {
    const handleFocus = () => {
      fetchPayments();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchPayments]);

  const handleAddEMI = () => {
    navigate("/admin/payments/add");
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      try {
        const token = localStorage.getItem("token");
        await api.delete(`/api/payments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchPayments();
      } catch (error) {
        console.error("Error deleting payment:", error);
      }
    }
  };

  const getCategoryBadge = (payment) => {
    // Get category from payment object
    const isSavings = payment.category === "savings";
    
    return (
      <span
        style={{
          fontSize: '0.75rem',
          padding: '4px 8px',
          fontWeight: 600,
          borderRadius: '6px',
          backgroundColor: isSavings ? 'rgba(102, 187, 106, 0.9)' : 'rgba(229, 57, 53, 0.9)',
          color: '#FFFFFF',
          border: 'none',
          display: 'inline-block'
        }}
      >
        {isSavings ? "Savings" : "Expense"}
      </span>
    );
  };

  const getNextEMIDate = (payment) => {
    if (!payment.startDate) {
      return "-";
    }

    const startDate = new Date(payment.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const startDay = payment.emiDay || startDate.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Calculate months difference
    let monthsDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);

    // Calculate next payment date
    let nextPaymentDate = new Date(startDate);
    
    if (monthsDiff < 0) {
      // Before start date, next payment is the start date
      return startDate;
    } else if (monthsDiff === 0) {
      // Same month as start
      if (currentDay < startDay) {
        // Payment hasn't come yet this month
        return startDate;
      } else {
        // Payment day has passed or is today, next is next month
        nextPaymentDate.setMonth(startMonth + 1);
        return nextPaymentDate;
      }
    } else {
      // Later month
      nextPaymentDate.setMonth(startMonth + monthsDiff);
      
      if (currentDay < startDay) {
        // Payment hasn't come yet this month
        return nextPaymentDate;
      } else {
        // Payment day has passed or is today, next is next month
        nextPaymentDate.setMonth(startMonth + monthsDiff + 1);
        return nextPaymentDate;
      }
    }
  };

  const calculatePendingEMIs = (payment) => {
    if (payment.emiType === "recurring") {
      return "Ongoing";
    }

    if (!payment.startDate || !payment.endDate) {
      return "-";
    }

    const startDate = new Date(payment.startDate);
    const endDate = new Date(payment.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // If the schedule is invalid, nothing is pending
    if (endDate < startDate) {
      return 0;
    }

    const emiDay = payment.emiDay || startDate.getDate();
    const paidCount = typeof payment.paidCount === "number" ? payment.paidCount : 0;

    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

    // Count total scheduled EMIs from start to end (inclusive)
    let totalEmis = 0;
    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

    for (let i = 0; i < totalMonths; i++) {
      let year = startYear;
      let month = startMonth + i;

      while (month > 11) {
        month -= 12;
        year += 1;
      }

      const paymentDate = new Date(year, month, Math.min(emiDay, daysInMonth(year, month)));
      paymentDate.setHours(0, 0, 0, 0);

      if (paymentDate <= endDate) {
        totalEmis += 1;
      }
    }

    // Pending = total scheduled - already paid
    return Math.max(0, totalEmis - paidCount);
  };

  if (loading) {
    return (
      <div className="content">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px'
        }}>
          <i 
            className="tim-icons icon-refresh-02" 
            style={{ 
              fontSize: '3rem', 
              color: '#FFFFFF',
              animation: 'spin 1s linear infinite',
              display: 'inline-block'
            }} 
          />
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}} />
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
                border: "1px solid rgba(255, 82, 82, 0.3)",
                borderRadius: "15px",
                boxShadow: "0 8px 32px rgba(255, 82, 82, 0.18)",
              }}
            >
              <CardHeader
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 82, 82, 0.2) 0%, rgba(255, 152, 0, 0.15) 100%)",
                  borderBottom: "1px solid rgba(255, 82, 82, 0.3)",
                  borderRadius: "15px 15px 0 0",
                  padding: "0.5rem 0.75rem",
                }}
              >
                <Row>
                  <Col className="text-left" sm="6">
                    <CardTitle
                      tag="h4"
                      style={{
                        color: "#ffffff",
                        fontWeight: "700",
                        margin: "0",
                        fontSize: "1.15rem",
                      }}
                    >
                      <i
                        className="tim-icons icon-credit-card mr-2"
                        style={{ color: "#FFD166" }}
                      ></i>
                      Payments
                    </CardTitle>
                    <p className="mb-0" style={{ fontSize: "0.8rem", color: "#FFD166" }}>Manage your EMI payments</p>
                  </Col>
                  <Col sm="6" className="text-right">
                    <Button
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255, 152, 0, 0.9) 0%, rgba(255, 193, 7, 0.8) 100%)",
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        fontWeight: "600",
                        boxShadow: "0 3px 12px rgba(255, 152, 0, 0.35)",
                      }}
                      onClick={handleAddEMI}
                    >
                      <i className="tim-icons icon-simple-add mr-1"></i>
                      Add EMI
                    </Button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody style={{ padding: "1rem" }}>
                {emis.length === 0 ? (
                  <div className="text-center py-4" style={{ color: "#CCCCCC" }}>
                    No payments found. Click "Add EMI" to create one.
                  </div>
                ) : (
                  <Row>
                    {emis.map((payment) => {
                      const isSavings = payment.category === "savings";
                      const isRecurring = payment.emiType === "recurring";
                      const cardBg = isSavings 
                        ? "linear-gradient(135deg, rgba(102, 187, 106, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)" 
                        : "linear-gradient(135deg, rgba(255, 82, 82, 0.2) 0%, rgba(255, 107, 107, 0.1) 100%)";
                      const borderColor = isSavings 
                        ? "rgba(102, 187, 106, 0.45)" 
                        : "rgba(255, 82, 82, 0.45)";
                      
                      return (
                        <Col key={payment._id} md="4" lg="3" className="mb-3">
                          <Card
                            style={{
                              background: cardBg,
                              border: `1px solid ${borderColor}`,
                              borderRadius: "12px",
                              boxShadow: isSavings ? "0 3px 10px rgba(102, 187, 106, 0.18)" : "0 3px 10px rgba(255, 82, 82, 0.18)",
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                              height: "100%",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            <CardBody style={{ padding: "0.75rem" }}>
                              {/* Header with name and category */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                <div style={{ flex: 1 }}>
                                  <h5 style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: "4px", fontSize: "0.95rem" }}>
                                    {payment.name}
                                  </h5>
                                  {getCategoryBadge(payment)}
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <Button
                                    size="sm"
                                    style={{
                                      background: "linear-gradient(135deg, rgba(0, 191, 255, 0.8) 0%, rgba(30, 144, 255, 0.7) 100%)",
                                      border: "none",
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                    }}
                                    onClick={() => navigate(`/admin/payments/edit/${payment._id}`)}
                                  >
                                    <i className="tim-icons icon-pencil" style={{ fontSize: "0.85rem" }} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    style={{
                                      background: "linear-gradient(135deg, rgba(255, 82, 82, 0.9) 0%, rgba(255, 107, 107, 0.8) 100%)",
                                      border: "none",
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                    }}
                                    onClick={() => handleDelete(payment._id)}
                                  >
                                    <i className="tim-icons icon-trash-simple" style={{ fontSize: "0.85rem" }} />
                                  </Button>
                                </div>
                              </div>

                              {/* Amount */}
                              <div style={{ marginBottom: "0.5rem" }}>
                                <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem", marginBottom: "2px" }}>
                                  Amount
                                </div>
                                <div style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 600 }}>
                                  ₹{payment.amount?.toLocaleString() || "0.00"}
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div style={{ 
                                display: "grid", 
                                gridTemplateColumns: "1fr 1fr", 
                                gap: "0.5rem",
                                marginBottom: "0.5rem"
                              }}>
                                <div>
                                  <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem", marginBottom: "2px" }}>
                                    EMI Day
                                  </div>
                                  <div style={{ color: "#FFFFFF", fontWeight: 500 }}>
                                    {payment.emiDay || "-"}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem", marginBottom: "2px" }}>
                                    End Date
                                  </div>
                                  <div style={{ color: "#FFFFFF", fontWeight: 500 }}>
                                    {payment.endDate
                                      ? format(new Date(payment.endDate), "MMM dd, yyyy")
                                      : payment.emiType === "recurring"
                                      ? "Ongoing"
                                      : "-"}
                                  </div>
                                </div>
                              </div>

                              {/* Pending EMIs and Status */}
                              <div style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center",
                                paddingTop: "0.5rem",
                                borderTop: "1px solid rgba(255, 255, 255, 0.1)"
                              }}>
                                <div>
                                  <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem", marginBottom: "2px" }}>
                                    Pending EMIs
                                  </div>
                                  <div style={{ color: "#FFD166", fontSize: "1rem", fontWeight: 600 }}>
                                    {calculatePendingEMIs(payment)}
                                  </div>
                                </div>
                                <div>
                                  <Badge
                                    style={{
                                      background: payment.status === "active"
                                        ? "linear-gradient(135deg, rgba(102, 187, 106, 0.9) 0%, rgba(76, 175, 80, 0.8) 100%)"
                                        : payment.status === "completed"
                                        ? "linear-gradient(135deg, rgba(0, 191, 255, 0.9) 0%, rgba(30, 144, 255, 0.8) 100%)"
                                        : "linear-gradient(135deg, rgba(108, 117, 125, 0.9) 0%, rgba(108, 117, 125, 0.8) 100%)",
                                      border: "none",
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1) || "Active"}
                                  </Badge>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </CardBody>
            </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Payments;
