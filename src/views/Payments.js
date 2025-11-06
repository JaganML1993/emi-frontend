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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // If end date has passed, no pending EMIs
    if (today > endDate) {
      return 0;
    }

    // Get paid count from backend - this is based on PaymentTransaction status='paid'
    // When transactions are marked as paid in dashboard, this count increases
    const paidCount = typeof payment.paidCount === "number" ? payment.paidCount : 0;

    // Calculate remaining EMIs from today until end date
    const emiDay = payment.emiDay || startDate.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    
    // Helper function to get days in month
    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    
    // Count EMIs from current month until end date (inclusive)
    // Example: Nov 2025 to Jan 2026 = Nov, Dec, Jan = 3 EMIs
    let remainingEMIs = 0;
    
    // Calculate number of months from current month to end month (inclusive)
    let yearDiff = endYear - currentYear;
    let monthDiff = endMonth - currentMonth;
    let totalMonths = yearDiff * 12 + monthDiff + 1; // +1 to include both start and end months
    
    // Ensure we don't count negative months
    if (totalMonths < 0) {
      totalMonths = 0;
    }
    
    // Count each month's payment date
    for (let i = 0; i < totalMonths; i++) {
      let year = currentYear;
      let month = currentMonth + i;
      
      // Handle year rollover
      while (month > 11) {
        month -= 12;
        year += 1;
      }
      
      // Calculate payment date for this month
      const paymentDate = new Date(year, month, Math.min(emiDay, daysInMonth(year, month)));
      paymentDate.setHours(0, 0, 0, 0);
      
      // Count if payment date is on or before the end date
      if (paymentDate <= endDate) {
        remainingEMIs += 1;
      }
    }

    // Calculate pending EMIs = Remaining EMIs - EMIs paid (based on dashboard status)
    // This shows how many EMIs are still pending from today until the end date
    // Example: If payment ends Jan 1, 2026 and today is Nov 2024,
    // remaining would be Nov, Dec, Jan = 3, minus any paid = pending
    const pendingEMIs = Math.max(0, remainingEMIs - paidCount);

    return pendingEMIs;
  };

  return (
    <div className="content">
        <Row>
          <Col xs="12">
            <Card
              style={{
                background: "linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "15px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              }}
            >
              <CardHeader
                style={{
                  background:
                    "linear-gradient(135deg, rgba(29, 140, 248, 0.1) 0%, rgba(29, 140, 248, 0.05) 100%)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "15px 15px 0 0",
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
                        fontSize: "1.5rem",
                      }}
                    >
                      <i
                        className="tim-icons icon-credit-card mr-2"
                        style={{ color: "#1d8cf8" }}
                      ></i>
                      Payments
                    </CardTitle>
                    <p
                      className="text-white-50 mb-0"
                      style={{ fontSize: "0.9rem" }}
                    >
                      Manage your EMI payments
                    </p>
                  </Col>
                  <Col sm="6" className="text-right">
                    <Button
                      style={{
                        background:
                          "linear-gradient(135deg, #1d8cf8 0%, #0056b3 100%)",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontWeight: "600",
                        boxShadow: "0 4px 15px rgba(29, 140, 248, 0.3)",
                      }}
                      onClick={handleAddEMI}
                    >
                      <i className="tim-icons icon-simple-add mr-1"></i>
                      Add EMI
                    </Button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody style={{ padding: "1.5rem" }}>
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
                        ? "rgba(102, 187, 106, 0.15)" 
                        : "rgba(229, 57, 53, 0.15)";
                      const borderColor = isSavings 
                        ? "rgba(102, 187, 106, 0.4)" 
                        : "rgba(229, 57, 53, 0.4)";
                      
                      return (
                        <Col key={payment._id} md="6" lg="4" className="mb-4">
                          <Card
                            style={{
                              background: cardBg,
                              border: `1px solid ${borderColor}`,
                              borderRadius: "15px",
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                              height: "100%",
                            }}
                          >
                            <CardBody style={{ padding: "1.5rem" }}>
                              {/* Header with name and category */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                <div style={{ flex: 1 }}>
                                  <h5 style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: "8px", fontSize: "1.1rem" }}>
                                    {payment.name}
                                  </h5>
                                  {getCategoryBadge(payment)}
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <Button
                                    size="sm"
                                    style={{
                                      background: "rgba(29, 140, 248, 0.8)",
                                      border: "none",
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                    }}
                                    onClick={() => navigate(`/admin/payments/edit/${payment._id}`)}
                                  >
                                    <i className="tim-icons icon-pencil" style={{ fontSize: "0.9rem" }} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    style={{
                                      background: "rgba(229, 57, 53, 0.8)",
                                      border: "none",
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                    }}
                                    onClick={() => handleDelete(payment._id)}
                                  >
                                    <i className="tim-icons icon-trash-simple" style={{ fontSize: "0.9rem" }} />
                                  </Button>
                                </div>
                              </div>

                              {/* Amount */}
                              <div style={{ marginBottom: "1rem" }}>
                                <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.85rem", marginBottom: "4px" }}>
                                  Amount
                                </div>
                                <div style={{ color: "#FFFFFF", fontSize: "1.5rem", fontWeight: 600 }}>
                                  ₹{payment.amount?.toLocaleString() || "0.00"}
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div style={{ 
                                display: "grid", 
                                gridTemplateColumns: "1fr 1fr", 
                                gap: "1rem",
                                marginBottom: "1rem"
                              }}>
                                <div>
                                  <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.85rem", marginBottom: "4px" }}>
                                    EMI Day
                                  </div>
                                  <div style={{ color: "#FFFFFF", fontWeight: 500 }}>
                                    {payment.emiDay || "-"}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.85rem", marginBottom: "4px" }}>
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
                                paddingTop: "1rem",
                                borderTop: "1px solid rgba(255, 255, 255, 0.1)"
                              }}>
                                <div>
                                  <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.85rem", marginBottom: "4px" }}>
                                    Pending EMIs
                                  </div>
                                  <div style={{ color: "#ff8d72", fontSize: "1.2rem", fontWeight: 600 }}>
                                    {calculatePendingEMIs(payment)}
                                  </div>
                                </div>
                                <div>
                                  <Badge
                                    style={{
                                      background: payment.status === "active"
                                        ? "rgba(102, 187, 106, 0.8)"
                                        : payment.status === "completed"
                                        ? "rgba(29, 140, 248, 0.8)"
                                        : "rgba(108, 117, 125, 0.8)",
                                      border: "none",
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      fontSize: "0.85rem",
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
