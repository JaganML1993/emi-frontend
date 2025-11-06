import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, CardHeader, CardBody, CardTitle, Table, Spinner, Button, Badge } from "reactstrap";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import api from "../config/axios";

function Dashboard() {
  const navigate = useNavigate();
  const [upcomingTransactions, setUpcomingTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaidEMIs, setShowPaidEMIs] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchUpcomingTransactions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/payments/transactions/upcoming", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data || [];
      
      // Sort: pending first, then by EMI day from payment object
      const sorted = [...data].sort((a, b) => {
        const aPaid = a.status === 'paid' ? 1 : 0;
        const bPaid = b.status === 'paid' ? 1 : 0;
        if (aPaid !== bPaid) return aPaid - bPaid;
        // Use emiDay from payment object, fallback to paymentDate day
        const aEmiDay = a.payment?.emiDay || new Date(a.paymentDate).getDate();
        const bEmiDay = b.payment?.emiDay || new Date(b.paymentDate).getDate();
        return aEmiDay - bEmiDay;
      });
      setUpcomingTransactions(sorted);
    } catch (error) {
      console.error("Error fetching upcoming transactions:", error);
      setUpcomingTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data || [];
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setPayments([]);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingTransactions();
    fetchPayments();
  }, [fetchUpcomingTransactions, fetchPayments]);

  const handleMarkAsPaid = async (transactionId, transaction) => {
    // Get payment name and amount for confirmation message
    const paymentName = transaction?.payment?.name || 'this payment';
    const amount = Number(transaction?.payment?.amount || transaction?.amount || 0);
    const formattedAmount = amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    
    // Show confirmation popup
    const confirmed = window.confirm(
      `Are you sure you want to mark "${paymentName}" (₹${formattedAmount}) as paid?`
    );
    
    if (!confirmed) {
      return; // User cancelled
    }

    try {
      const token = localStorage.getItem("token");
      await api.put(
        `/api/payments/transactions/${transactionId}/paid`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUpcomingTransactions((prev) => {
        const next = prev.map((t) => (t._id === transactionId ? { ...t, status: "paid" } : t));
        return next.sort((a, b) => {
          const aPaid = a.status === 'paid' ? 1 : 0;
          const bPaid = b.status === 'paid' ? 1 : 0;
          if (aPaid !== bPaid) return aPaid - bPaid;
          // Use emiDay from payment object, fallback to paymentDate day
          const aEmiDay = a.payment?.emiDay || new Date(a.paymentDate).getDate();
          const bEmiDay = b.payment?.emiDay || new Date(b.paymentDate).getDate();
          return aEmiDay - bEmiDay;
        });
      });
      // Refresh payments to update paidCount
      fetchPayments();
      // Calendar will automatically update since it uses upcomingTransactions
    } catch (error) {
      console.error("Error marking transaction as paid:", error);
      alert("Failed to mark payment as paid. Please try again.");
    }
  };

  // Calculate pending EMIs for a payment (same logic as Payments page)
  const calculatePendingEMIs = (payment) => {
    if (!payment) return "-";
    
    if (payment.emiType === "recurring") {
      return "-";
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
    const paidCount = typeof payment.paidCount === "number" ? payment.paidCount : 0;

    // Calculate remaining EMIs from today until end date
    const emiDay = payment.emiDay || startDate.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    
    // Helper function to get days in month
    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    
    // Count EMIs from current month until end date (inclusive)
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

    // Calculate pending EMIs = Remaining EMIs - EMIs paid
    const pendingEMIs = Math.max(0, remainingEMIs - paidCount);

    return pendingEMIs;
  };

  // Calculate summary stats for current month (memoized for performance)
  // Always use payment amount (current) instead of stored transaction amount
  const getTransactionAmount = useCallback((t) => Number(t.payment?.amount || t.amount || 0), []);
  
  // Memoize transaction filtering for performance
  const pendingTransactions = useMemo(
    () => upcomingTransactions.filter(t => t.status !== 'paid'),
    [upcomingTransactions]
  );
  const paidTransactions = useMemo(
    () => upcomingTransactions.filter(t => t.status === 'paid'),
    [upcomingTransactions]
  );

  const { paidEMIAmount, totalEMIAmount, remainingEMIAmount } = useMemo(() => {
    const getAmount = (t) => Number(t.payment?.amount || t.amount || 0);
    const paid = upcomingTransactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + getAmount(t), 0);
    const total = upcomingTransactions
      .reduce((sum, t) => sum + getAmount(t), 0);
    const remaining = upcomingTransactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + getAmount(t), 0);
    return { paidEMIAmount: paid, totalEMIAmount: total, remainingEMIAmount: remaining };
  }, [upcomingTransactions]);

  // Additional insights
  const insights = useMemo(() => {
    const activePayments = payments.filter(p => p.status === 'active');
    const overdueCount = pendingTransactions.filter(t => {
      const paymentDate = new Date(t.paymentDate);
      paymentDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return paymentDate < today;
    }).length;
    
    const completionPercentage = totalEMIAmount > 0 ? (paidEMIAmount / totalEMIAmount) * 100 : 0;
    
    const categoryBreakdown = {
      savings: activePayments.filter(p => p.category === 'savings').reduce((sum, p) => sum + Number(p.amount || 0), 0),
      expenses: activePayments.filter(p => p.category !== 'savings').reduce((sum, p) => sum + Number(p.amount || 0), 0),
    };
    
    const nextPayment = pendingTransactions
      .filter(t => {
        const paymentDate = new Date(t.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return paymentDate >= today;
      })
      .sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate))[0];
    
    const endingSoon = activePayments.filter(p => {
      if (p.emiType !== 'ending' || !p.endDate) return false;
      const endDate = new Date(p.endDate);
      const today = new Date();
      const monthsUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24 * 30));
      return monthsUntilEnd > 0 && monthsUntilEnd <= 3;
    });

    return {
      activePaymentsCount: activePayments.length,
      overdueCount,
      completionPercentage,
      categoryBreakdown,
      nextPayment,
      endingSoon,
    };
  }, [payments, pendingTransactions, totalEMIAmount, paidEMIAmount]);

  return (
    <div className="content">
        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md="4">
            <Card
              style={{
                background: "linear-gradient(135deg, rgba(102, 187, 106, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%)",
                border: "1px solid rgba(102, 187, 106, 0.5)",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 4px 15px rgba(102, 187, 106, 0.2)",
              }}
            >
              <CardBody style={{ padding: "1.5rem" }}>
                <div style={{ color: "#66BB6A", fontSize: "0.9rem", fontWeight: 500, marginBottom: "8px" }}>
                  <i className="tim-icons icon-check-2 mr-1" style={{ color: "#66BB6A" }}></i>
                  Paid EMI
                </div>
                <div style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 600 }}>
                  ₹{paidEMIAmount.toLocaleString()}
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card
              style={{
                background: "linear-gradient(135deg, rgba(0, 191, 255, 0.25) 0%, rgba(30, 144, 255, 0.15) 100%)",
                border: "1px solid rgba(0, 191, 255, 0.5)",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 4px 15px rgba(0, 191, 255, 0.2)",
              }}
            >
              <CardBody style={{ padding: "1.5rem" }}>
                <div style={{ color: "#00BFFF", fontSize: "0.9rem", fontWeight: 500, marginBottom: "8px" }}>
                  <i className="tim-icons icon-chart-pie-36 mr-1" style={{ color: "#00BFFF" }}></i>
                  Total EMI This Month
                </div>
                <div style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 600 }}>
                  ₹{totalEMIAmount.toLocaleString()}
                </div>
                {totalEMIAmount > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ 
                      height: "6px", 
                      background: "rgba(255, 255, 255, 0.1)", 
                      borderRadius: "3px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${insights.completionPercentage}%`,
                        background: "linear-gradient(90deg, rgba(102, 187, 106, 0.9) 0%, rgba(76, 175, 80, 0.8) 100%)",
                        transition: "width 0.3s ease",
                        borderRadius: "3px"
                      }} />
                    </div>
                    <div style={{ color: "#00BFFF", fontSize: "0.75rem", marginTop: "4px" }}>
                      {insights.completionPercentage.toFixed(0)}% completed
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card
              style={{
                background: "linear-gradient(135deg, rgba(255, 82, 82, 0.25) 0%, rgba(255, 107, 107, 0.15) 100%)",
                border: "1px solid rgba(255, 82, 82, 0.5)",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 4px 15px rgba(255, 82, 82, 0.2)",
              }}
            >
              <CardBody style={{ padding: "1.5rem" }}>
                <div style={{ color: "#FF5252", fontSize: "0.9rem", fontWeight: 500, marginBottom: "8px" }}>
                  <i className="tim-icons icon-time-alarm mr-1" style={{ color: "#FF5252" }}></i>
                  Remaining EMI Amount
                </div>
                <div style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 600 }}>
                  ₹{remainingEMIAmount.toLocaleString()}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Alerts */}
        {insights.overdueCount > 0 && (
          <Row className="mb-4">
            <Col xs="12">
              <Card
                style={{
                  background: "linear-gradient(135deg, rgba(229, 57, 53, 0.2) 0%, rgba(244, 67, 54, 0.1) 100%)",
                  border: "1px solid rgba(229, 57, 53, 0.5)",
                  borderRadius: "12px",
                  boxShadow: "0 4px 15px rgba(229, 57, 53, 0.2)",
                }}
              >
                <CardBody style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <i className="tim-icons icon-alert-circle-exc" style={{ color: "#FF6E6E", fontSize: "1.5rem" }}></i>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#FF6E6E", fontWeight: 600, fontSize: "1rem", marginBottom: "4px" }}>
                        ⚠️ {insights.overdueCount} {insights.overdueCount === 1 ? "Payment is" : "Payments are"} Overdue
                      </div>
                      <div style={{ color: "#FFFFFF", fontSize: "0.85rem" }}>
                        Please mark them as paid or review your payment schedule
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        )}

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
                <CardTitle
                  tag="h4"
                  style={{ color: "#FFFFFF", fontWeight: 400, margin: 0, fontSize: "1.15rem" }}
                >
                  <i className="tim-icons icon-chart-pie-36 mr-2" style={{ color: "#00BFFF" }}></i>
                  Dashboard
                </CardTitle>
                <p className="mb-0" style={{ fontSize: "0.8rem", color: "#00BFFF" }}>
                  Upcoming payments - current month
                </p>
              </CardHeader>
              <CardBody style={{ padding: "1rem", background: "#1E1E1E" }}>
                {upcomingTransactions.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="tim-icons icon-calendar-60" style={{ fontSize: "3rem", color: "#00BFFF", marginBottom: "1rem", opacity: 0.5 }}></i>
                    <div style={{ color: "#CCCCCC", fontSize: "1rem", marginBottom: "0.5rem" }}>
                      No upcoming payments for this month
                    </div>
                    <div style={{ color: "#888", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                      Add a payment to start tracking your EMIs
                    </div>
                    <Button
                      onClick={() => navigate("/admin/payments/add")}
                      style={{
                        background: "linear-gradient(135deg, rgba(255, 152, 0, 0.9) 0%, rgba(255, 193, 7, 0.8) 100%)",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 20px",
                        fontWeight: 600,
                        boxShadow: "0 3px 10px rgba(255, 152, 0, 0.3)",
                      }}
                    >
                      <i className="tim-icons icon-simple-add mr-1"></i>
                      Add Your First Payment
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Separate pending and paid transactions */}
                    {(() => {
                      const renderTransaction = (t) => {
                    const isPaid = t.status === 'paid';
                    const paymentDate = new Date(t.paymentDate);
                    paymentDate.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueLabel = format(paymentDate, 'dd MMM');
                    
                    // Determine payment status and matching colors
                    let paymentStatus, statusLabel, statusColor, statusShadow, badgeColor, borderColor;
                    
                    if (isPaid) {
                      paymentStatus = 'paid';
                      statusLabel = 'Paid';
                      statusColor = 'rgba(102, 187, 106, 0.4)'; // green for paid
                      statusShadow = 'rgba(102, 187, 106, 0.25)';
                      badgeColor = 'rgba(102, 187, 106, 0.9)';
                      borderColor = 'rgba(102, 187, 106, 0.5)';
                    } else if (paymentDate < today) {
                      paymentStatus = 'overdue';
                      statusLabel = 'Overdue';
                      statusColor = 'rgba(229, 57, 53, 0.4)'; // red for overdue
                      statusShadow = 'rgba(229, 57, 53, 0.25)';
                      badgeColor = 'rgba(229, 57, 53, 0.9)';
                      borderColor = 'rgba(229, 57, 53, 0.5)';
                    } else {
                      paymentStatus = 'upcoming';
                      statusLabel = 'Upcoming';
                      statusColor = 'rgba(255, 152, 0, 0.4)'; // orange for upcoming
                      statusShadow = 'rgba(255, 152, 0, 0.25)';
                      badgeColor = 'rgba(255, 152, 0, 0.9)';
                      borderColor = 'rgba(255, 152, 0, 0.5)';
                    }
                    const dueTextColor = isPaid
                      ? '#66BB6A'
                      : (paymentDate < today)
                        ? '#FF6E6E'
                        : '#FFD166';
                    
                    return (
                      <div
                        key={t._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '8px 10px',
                          background: `linear-gradient(135deg, ${statusColor} 0%, rgba(255,255,255,0.05) 100%)`,
                          border: `1px solid ${borderColor}`,
                          borderRadius: '10px',
                          marginBottom: '8px',
                          boxShadow: `0 3px 10px ${statusShadow}`,
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: borderColor, opacity: 0.9 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          {/* Left icon container - shows EMI day */}
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 6,
                              background: 'rgba(255,255,255,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              border: '1px solid rgba(255,255,255,0.3)'
                            }}
                          >
                            {t.payment?.emiDay || new Date(t.paymentDate).getDate()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <div style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                                {t.payment?.name || 'N/A'}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '3px 8px',
                                  fontWeight: 600,
                                  borderRadius: '9999px',
                                  backgroundColor: badgeColor,
                                  color: '#FFFFFF',
                                  border: 'none',
                                  display: 'inline-block'
                                }}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ color: '#FFFFFF', fontWeight: 400, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="tim-icons icon-coins" style={{ fontSize: '0.85rem', color: '#FFD166' }} />
                                ₹{Number(t.payment?.amount || t.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </span>
                              {t.payment && (
                                <span style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  color: dueTextColor, 
                                  fontSize: '0.8rem',
                                  fontWeight: 500
                                }}>
                                  <i className="tim-icons icon-time-alarm" style={{ fontSize: '0.85rem', color: dueTextColor }} />
                                  Due {dueLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Right status circle / checkbox */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            title={isPaid ? 'Paid' : paymentStatus === 'overdue' ? 'Overdue' : 'Upcoming'}
                            onClick={() => !isPaid && handleMarkAsPaid(t._id, t)}
                            onMouseDown={(e) => {
                              if (!isPaid) {
                                e.currentTarget.style.transform = 'scale(0.85)';
                              }
                            }}
                            onMouseUp={(e) => {
                              if (!isPaid) {
                                e.currentTarget.style.transform = 'scale(1)';
                              }
                            }}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: isPaid ? '#4CAF50' : 'transparent',
                              border: isPaid ? '2px solid #4CAF50' : '2px solid rgba(255,255,255,0.85)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isPaid ? 'default' : 'pointer',
                              transition: 'all 0.2s ease',
                              transform: 'scale(1)',
                              boxShadow: isPaid ? '0 2px 6px rgba(76, 175, 80, 0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!isPaid) {
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 255, 255, 0.3)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.9)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isPaid) {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = '#FFFFFF';
                              }
                            }}
                          >
                            {isPaid ? (
                              <span style={{ color: '#FFFFFF', fontWeight: 400, transition: 'all 0.2s ease' }}>✓</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      );
                    };
                    
                    return (
                      <>
                        {/* Pending transactions (always visible) */}
                        {pendingTransactions.length > 0 && (
                          <div>
                            {pendingTransactions.map((t) => renderTransaction(t))}
                          </div>
                        )}
                        
                        {/* Paid transactions (collapsible) */}
                        {paidTransactions.length > 0 && (
                          <div style={{ marginTop: pendingTransactions.length > 0 ? '20px' : '0' }}>
                            <div
                              onClick={() => setShowPaidEMIs(!showPaidEMIs)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 14px',
                                background: 'linear-gradient(135deg, rgba(102, 187, 106, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%)',
                                border: '1px solid rgba(102, 187, 106, 0.5)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                marginBottom: '10px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 3px 10px rgba(102, 187, 106, 0.15)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 187, 106, 0.35) 0%, rgba(76, 175, 80, 0.25) 100%)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 187, 106, 0.25)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 187, 106, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%)';
                                e.currentTarget.style.boxShadow = '0 3px 10px rgba(102, 187, 106, 0.15)';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i 
                                  className={`tim-icons ${showPaidEMIs ? 'icon-minimal-down' : 'icon-minimal-right'}`}
                                  style={{ color: '#66BB6A', fontSize: '1rem' }}
                                />
                                <span style={{ color: '#66BB6A', fontWeight: 600, fontSize: '0.95rem' }}>
                                  Paid EMIs ({paidTransactions.length})
                                </span>
                              </div>
                              <span style={{ color: '#66BB6A', fontWeight: 600, fontSize: '1rem' }}>
                                ₹{paidTransactions.reduce((sum, t) => sum + getTransactionAmount(t), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            
                            {showPaidEMIs && (
                              <div>
                                {paidTransactions.map((t) => renderTransaction(t))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Calendar View Section */}
        <Row style={{ marginTop: '30px' }}>
          <Col xs="12">
            <Card
              style={{
                background: "linear-gradient(135deg, #1E1E1E 0%, #2d2b42 100%)",
                border: "1px solid rgba(138, 43, 226, 0.3)",
                borderRadius: "15px",
                boxShadow: "0 8px 32px rgba(138, 43, 226, 0.18)",
              }}
            >
              <CardHeader
                style={{
                  background: "linear-gradient(135deg, rgba(138, 43, 226, 0.2) 0%, rgba(75, 0, 130, 0.15) 100%)",
                  borderBottom: "1px solid rgba(138, 43, 226, 0.3)",
                  borderRadius: "15px 15px 0 0",
                  padding: "0.75rem 1rem",
                }}
              >
                <CardTitle
                  tag="h4"
                  style={{ color: "#FFFFFF", fontWeight: 400, margin: 0, fontSize: "1.25rem" }}
                >
                  <i className="tim-icons icon-calendar-60 mr-2" style={{ color: "#BA68C8" }}></i>
                  Calendar View
                </CardTitle>
                <p className="mb-0" style={{ fontSize: "0.85rem", color: "#BA68C8" }}>
                  All payment transactions in calendar format
                </p>
              </CardHeader>
              <CardBody style={{ padding: "1.5rem", background: "#1E1E1E" }}>
                {loading ? (
                  <div className="text-center py-4">
                    <Spinner color="primary" />
                  </div>
                ) : upcomingTransactions.length === 0 ? (
                  <div className="text-center py-4" style={{ color: "#CCCCCC" }}>
                    No payment transactions found. Transactions will appear here once payments are created.
                  </div>
                ) : (
                  <CalendarView
                    currentMonth={currentMonth}
                    setCurrentMonth={setCurrentMonth}
                    transactions={upcomingTransactions}
                  />
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
  );
}

// Calendar View Component (memoized for performance)
const CalendarView = React.memo(({ currentMonth, setCurrentMonth, transactions }) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group transactions by date (memoized)
  const transactionsByDate = useMemo(() => {
    const grouped = {};
    transactions.forEach((t) => {
      if (!t.paymentDate) {
        return;
      }
      try {
        const paymentDate = new Date(t.paymentDate);
        if (isNaN(paymentDate.getTime())) {
          return;
        }
        const dateKey = format(paymentDate, "yyyy-MM-dd");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(t);
      } catch (error) {
        console.error("Error processing transaction date:", error, t);
      }
    });
    return grouped;
  }, [transactions]);

  const getTransactionsForDate = useCallback((date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return transactionsByDate[dateKey] || [];
  }, [transactionsByDate]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const totalTransactions = transactions.length;
  const transactionsInMonth = Object.keys(transactionsByDate).length;

  return (
    <div>
      {/* Calendar Header with Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          style={{
            background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.3) 0%, rgba(75, 0, 130, 0.2) 100%)',
            border: '1px solid rgba(138, 43, 226, 0.5)',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '8px 16px',
            boxShadow: '0 2px 8px rgba(138, 43, 226, 0.2)'
          }}
        >
          <i className="tim-icons icon-minimal-left"></i>
        </Button>
        <div style={{ textAlign: 'center' }}>
          <h5 style={{ color: '#BA68C8', margin: 0, fontWeight: 500 }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h5>
          <small style={{ color: '#BA68C8', fontSize: '0.8rem' }}>
            {totalTransactions} total transactions
          </small>
        </div>
        <Button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          style={{
            background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.3) 0%, rgba(75, 0, 130, 0.2) 100%)',
            border: '1px solid rgba(138, 43, 226, 0.5)',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '8px 16px',
            boxShadow: '0 2px 8px rgba(138, 43, 226, 0.2)'
          }}
        >
          <i className="tim-icons icon-minimal-right"></i>
        </Button>
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {/* Week Day Headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            style={{
              padding: '12px',
              textAlign: 'center',
              color: '#CCCCCC',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day, idx) => {
          const dayTransactions = getTransactionsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={idx}
              style={{
                minHeight: '100px',
                padding: '8px',
                background: isCurrentMonth ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                border: isToday ? '2px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                position: 'relative'
              }}
            >
              <div
                style={{
                  color: isCurrentMonth ? (isToday ? '#4285F4' : '#FFFFFF') : '#666666',
                  fontWeight: isToday ? 600 : 400,
                  fontSize: '0.9rem',
                  marginBottom: '4px'
                }}
              >
                {format(day, 'd')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dayTransactions.slice(0, 3).map((t, tIdx) => {
                  const isPaid = t.status === 'paid';
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const paymentDate = new Date(t.paymentDate);
                  paymentDate.setHours(0, 0, 0, 0);
                  const isOverdue = !isPaid && paymentDate < today;
                  const bgColor = isPaid ? 'rgba(76, 175, 80, 0.4)' : isOverdue ? 'rgba(229, 57, 53, 0.4)' : 'rgba(255, 152, 0, 0.4)';
                  
                  return (
                    <div
                      key={tIdx}
                      style={{
                        background: bgColor,
                        padding: '4px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#FFFFFF',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        title: `${t.payment?.name || 'N/A'} - ₹${Number(t.payment?.amount || t.amount || 0).toLocaleString('en-IN')}`
                      }}
                    >
                      {t.payment?.name || 'N/A'}
                    </div>
                  );
                })}
                {dayTransactions.length > 3 && (
                  <div style={{ color: '#CCCCCC', fontSize: '0.7rem', padding: '2px' }}>
                    +{dayTransactions.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default Dashboard;