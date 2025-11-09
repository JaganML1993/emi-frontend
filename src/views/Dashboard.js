import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, CardHeader, CardBody, CardTitle, Button, Badge } from "reactstrap";
import { format, addMonths, endOfMonth } from "date-fns";
import api from "../config/axios";

function Dashboard() {
  const navigate = useNavigate();
  const [upcomingTransactions, setUpcomingTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaidEMIs, setShowPaidEMIs] = useState(false);
  const [months, setMonths] = useState(6);

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
      return true;
    } catch (error) {
      console.error("Error fetching upcoming transactions:", error);
      setUpcomingTransactions([]);
      return false;
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
      return true;
    } catch (error) {
      console.error("Error fetching payments:", error);
      setPayments([]);
      return false;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUpcomingTransactions(), fetchPayments()]);
      setLoading(false);
    };
    loadData();
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

    const paidCount = typeof payment.paidCount === "number" ? payment.paidCount : 0;

    const emiDay = payment.emiDay || startDate.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

    let remainingEMIs = 0;

    let yearDiff = endYear - currentYear;
    let monthDiff = endMonth - currentMonth;
    let totalMonths = yearDiff * 12 + monthDiff + 1;

    if (totalMonths < 0) {
      totalMonths = 0;
    }

    for (let i = 0; i < totalMonths; i++) {
      let year = currentYear;
      let month = currentMonth + i;

      while (month > 11) {
        month -= 12;
        year += 1;
      }

      const paymentDate = new Date(year, month, Math.min(emiDay, daysInMonth(year, month)));
      paymentDate.setHours(0, 0, 0, 0);

      if (paymentDate <= endDate) {
        remainingEMIs += 1;
      }
    }

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

  // EMI Forecast logic
  const now = useMemo(() => new Date(), []);

  const forecastSeries = useMemo(() => {
    // Build month buckets from current month forward for `months` count
    const buckets = [];
    for (let i = 0; i < months; i++) {
      const monthDate = addMonths(now, i);
      buckets.push({
        key: format(monthDate, "yyyy-MM"),
        label: format(monthDate, "MMM yyyy"),
        start: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
        end: endOfMonth(monthDate),
        total: 0,
      });
    }

    // Sum EMI amounts into month buckets
    payments.forEach((p) => {
      const amount = Number(p.amount || 0);
      if (!amount || p.status === "completed") return;

      const emiType = p.emiType; // 'recurring' or 'ending'
      const endDate = p.endDate ? new Date(p.endDate) : null;

      buckets.forEach((bucket) => {
        if (emiType === "recurring") {
          bucket.total += amount;
        } else if (emiType === "ending") {
          // include only if this bucket month is <= endDate month
          if (endDate && bucket.start <= endDate) {
            bucket.total += amount;
          }
        } else {
          // unknown type, include conservatively
          bucket.total += amount;
        }
      });
    });

    return buckets;
  }, [payments, months, now]);

  const handleMonthsChange = (delta) => {
    setMonths((prev) => Math.min(12, Math.max(1, prev + delta)));
  };

  const maxForecastTotal = useMemo(() => {
    if (!forecastSeries.length) return 0;
    return Math.max(...forecastSeries.map((bucket) => bucket.total));
  }, [forecastSeries]);

  const MonthBar = ({ label, value }) => {
    const effectiveMax = Math.max(1, maxForecastTotal);
    const heightPct = Math.max(4, Math.round((value / effectiveMax) * 100));
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div
          style={{
            height: 140,
            width: 24,
            display: "flex",
            alignItems: "flex-end",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            overflow: "hidden",
          }}
          title={`₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
        >
          <div
            style={{
              width: "100%",
              height: `${heightPct}%`,
              background:
                "linear-gradient(180deg, rgba(255, 152, 0, 0.9) 0%, rgba(255, 193, 7, 0.85) 60%, rgba(255, 209, 102, 0.8) 100%)",
              boxShadow: "0 4px 12px rgba(255, 152, 0, 0.35)",
              transition: "height 0.3s ease",
            }}
          />
        </div>
        <div style={{ color: "#FFFFFF", fontSize: "0.75rem", textAlign: "center" }}>{label}</div>
        <div style={{ color: "#FFD166", fontSize: "0.75rem", fontWeight: 600 }}>
          ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </div>
      </div>
    );
  };

  // Chart data for EMI Forecast line chart
  const paymentMap = useMemo(() => {
    const map = new Map();
    payments.forEach((payment) => {
      if (payment?._id) {
        map.set(payment._id, payment);
      }
    });
    return map;
  }, [payments]);

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
                    const paymentData = paymentMap.get(t.payment?._id || t.paymentId) || t.payment;
                    const pendingEmis = calculatePendingEMIs(paymentData);
                    const pendingLabel = typeof pendingEmis === "number" ? pendingEmis : pendingEmis ?? "-";
                    
                    // Determine payment status and matching colors
                    let paymentStatus, statusLabel, statusColor, statusShadow, badgeColor, borderColor, statusIcon, statusIconColor;
                    
                    if (isPaid) {
                      paymentStatus = 'paid';
                      statusLabel = 'Paid';
                      statusColor = 'rgba(102, 187, 106, 0.4)'; // green for paid
                      statusShadow = 'rgba(102, 187, 106, 0.25)';
                      badgeColor = 'rgba(102, 187, 106, 0.9)';
                      borderColor = 'rgba(102, 187, 106, 0.5)';
                      statusIcon = 'tim-icons icon-check-2';
                      statusIconColor = '#66BB6A';
                    } else if (paymentDate < today) {
                      paymentStatus = 'overdue';
                      statusLabel = 'Overdue';
                      statusColor = 'rgba(229, 57, 53, 0.4)'; // red for overdue
                      statusShadow = 'rgba(229, 57, 53, 0.25)';
                      badgeColor = 'rgba(229, 57, 53, 0.9)';
                      borderColor = 'rgba(229, 57, 53, 0.5)';
                      statusIcon = 'tim-icons icon-alert-circle-exc';
                      statusIconColor = '#FF6E6E';
                    } else {
                      paymentStatus = 'upcoming';
                      statusLabel = 'Upcoming';
                      statusColor = 'rgba(255, 152, 0, 0.4)'; // orange for upcoming
                      statusShadow = 'rgba(255, 152, 0, 0.25)';
                      badgeColor = 'rgba(255, 152, 0, 0.9)';
                      borderColor = 'rgba(255, 152, 0, 0.5)';
                      statusIcon = 'tim-icons icon-time-alarm';
                      statusIconColor = '#FFD166';
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
                              minWidth: 90,
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.18)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              color: '#FFFFFF',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              gap: 10,
                              padding: '6px 10px',
                              border: '1px solid rgba(255,255,255,0.25)',
                              textAlign: 'left',
                              lineHeight: 1.15
                            }}
                          >
                            <i
                              className={statusIcon}
                              style={{
                                fontSize: '1.1rem',
                                color: statusIconColor,
                                marginBottom: 2,
                                animation: paymentStatus === 'upcoming' ? 'pulse 1.8s ease-in-out infinite' : 'none'
                              }}
                            />
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#FFD166' }}>{pendingLabel}</span>
                          </div>
                          {paymentStatus === 'upcoming' && (
                            <style>
                              {`
                                @keyframes pulse {
                                  0% { transform: scale(1); opacity: 0.85; }
                                  50% { transform: scale(1.08); opacity: 1; }
                                  100% { transform: scale(1); opacity: 0.85; }
                                }
                              `}
                            </style>
                          )}
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

        {/* EMI Forecast Chart Section */}
        <Row style={{ marginTop: '30px' }}>
          <Col xs="12">
            <Card
              style={{
                background: "linear-gradient(135deg, #1E1E1E 0%, #2d2b42 100%)",
                border: "1px solid rgba(255, 82, 82, 0.3)",
                borderRadius: "15px",
                boxShadow: "0 8px 32px rgba(255, 82, 82, 0.2)",
              }}
            >
              <CardHeader
                style={{
                  background: "linear-gradient(135deg, rgba(255, 82, 82, 0.2) 0%, rgba(255, 152, 0, 0.15) 100%)",
                  borderBottom: "1px solid rgba(255, 82, 82, 0.3)",
                  borderRadius: "15px 15px 0 0",
                  padding: "0.75rem 1rem",
                }}
              >
                <Row>
                  <Col sm="6">
                    <CardTitle tag="h4" style={{ color: "#FFFFFF", margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                      <i className="tim-icons icon-chart-bar-32 mr-2" style={{ color: "#FFD166" }}></i>
                      EMI Forecast
                    </CardTitle>
                    <p className="mb-0" style={{ fontSize: "0.85rem", color: "#FFD166" }}>
                      Month-wise EMI totals from the current month
                    </p>
                  </Col>
                  <Col sm="6" className="text-right" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                    <Button
                      onClick={() => handleMonthsChange(-1)}
                      style={{
                        background: "linear-gradient(135deg, rgba(255, 82, 82, 0.3) 0%, rgba(255, 107, 107, 0.2) 100%)",
                        border: "1px solid rgba(255, 82, 82, 0.5)",
                        color: "#FFFFFF",
                        borderRadius: 8,
                        padding: "6px 12px",
                        boxShadow: "0 2px 8px rgba(255, 82, 82, 0.2)",
                      }}
                    >
                      -
                    </Button>
                    <div style={{ color: "#FFD166", fontWeight: 600, minWidth: 90, textAlign: "center" }}>
                      {months} {months === 1 ? "month" : "months"}
                    </div>
                    <Button
                      onClick={() => handleMonthsChange(1)}
                      style={{
                        background: "linear-gradient(135deg, rgba(255, 82, 82, 0.3) 0%, rgba(255, 107, 107, 0.2) 100%)",
                        border: "1px solid rgba(255, 82, 82, 0.5)",
                        color: "#FFFFFF",
                        borderRadius: 8,
                        padding: "6px 12px",
                        boxShadow: "0 2px 8px rgba(255, 82, 82, 0.2)",
                      }}
                    >
                      +
                    </Button>
                    <Button
                      onClick={() => setMonths(12)}
                      style={{
                        background: "linear-gradient(135deg, rgba(255, 152, 0, 0.8) 0%, rgba(255, 193, 7, 0.6) 100%)",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontWeight: 600,
                        boxShadow: "0 3px 12px rgba(255, 152, 0, 0.4)",
                      }}
                    >
                      1 Year
                    </Button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody style={{ padding: "1rem", background: "#1E1E1E" }}>
                {forecastSeries.length > 0 ? (
                  <div style={{ overflowX: "auto", padding: "8px 4px" }}>
                    <div
                      style={{
                        display: "grid",
                        gridAutoFlow: "column",
                        gridAutoColumns: "minmax(70px, 1fr)",
                        gap: 16,
                        minHeight: 200,
                      }}
                    >
                      {forecastSeries.map((bucket) => (
                        <MonthBar
                          key={bucket.key}
                          label={bucket.label}
                          value={Number(bucket.total || 0)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4" style={{ color: "#CCCCCC" }}>
                    <i className="tim-icons icon-chart-line-32" style={{ fontSize: "3rem", opacity: 0.5, marginBottom: "1rem" }}></i>
                    <div style={{ fontSize: "1rem" }}>
                      No payment data available for forecast
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
  );
}

export default Dashboard;