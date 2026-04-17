import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, CardHeader, CardBody, CardTitle, Button, Badge } from "reactstrap";
import { format, addMonths, endOfMonth } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import api from "../config/axios";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, Filler, Title, Tooltip, Legend);

function Dashboard() {
  const navigate = useNavigate();
  const [upcomingTransactions, setUpcomingTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaidEMIs, setShowPaidEMIs] = useState(false);
  const [months, setMonths] = useState(6);
  const [totalSavingsPaid, setTotalSavingsPaid] = useState(0);
  const [expenseSummary, setExpenseSummary]     = useState(null);
  const [expenseChartMonths, setExpenseChartMonths] = useState(3);

  const fetchUpcomingTransactions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/payments/transactions/upcoming", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("Dashboard API Response:", response.data);
      
      // Handle different response structures
      let data = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data.data) {
          data = response.data.data;
        } else if (response.data.success && response.data.data) {
          data = response.data.data;
        }
      }
      
      console.log("Dashboard parsed transactions:", data);
      console.log("Number of transactions:", data.length);
      
      // Filter out any transactions without payment data
      const validData = data.filter(t => t.payment);
      
      // Sort: pending first, then by EMI day from payment object
      const sorted = [...validData].sort((a, b) => {
        const aPaid = a.status === 'paid' ? 1 : 0;
        const bPaid = b.status === 'paid' ? 1 : 0;
        if (aPaid !== bPaid) return aPaid - bPaid;
        // Use emiDay from payment object, fallback to paymentDate day
        const aEmiDay = a.payment?.emiDay || new Date(a.paymentDate).getDate();
        const bEmiDay = b.payment?.emiDay || new Date(b.paymentDate).getDate();
        return aEmiDay - bEmiDay;
      });
      
      console.log("Dashboard sorted transactions:", sorted);
      setUpcomingTransactions(sorted);
      return true;
    } catch (error) {
      console.error("Error fetching upcoming transactions:", error);
      console.error("Error details:", error.response?.data || error.message);
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

  const fetchSavingsTotal = useCallback(async () => {
    try {
      const res = await api.get("/api/payments/savings-total");
      if (res.data.success) setTotalSavingsPaid(res.data.data.total || 0);
    } catch {
      setTotalSavingsPaid(0);
    }
  }, []);

  const fetchExpenseSummary = useCallback(async (months) => {
    try {
      const res = await api.get("/api/expenses/summary", { params: { months } });
      if (res.data.success) setExpenseSummary(res.data.data);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchExpenseSummary(expenseChartMonths);
  }, [expenseChartMonths, fetchExpenseSummary]);


  // Core dashboard data only — do not depend on expenseChartMonths or changing the
  // Monthly Expenses filter would set loading=true and flash the full-page spinner.
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUpcomingTransactions(), fetchPayments(), fetchSavingsTotal()]);
      setLoading(false);
    };
    loadData();
  }, [fetchUpcomingTransactions, fetchPayments, fetchSavingsTotal]);


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

  // Calculate pending EMIs for a payment (kept consistent with Payments page)
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
    const buckets = [];
    for (let i = 0; i < months; i++) {
      const monthDate = addMonths(now, i);
      buckets.push({
        key: format(monthDate, "yyyy-MM"),
        label: format(monthDate, "MMM yy"),
        start: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
        end: endOfMonth(monthDate),
        savings: 0,
        expenses: 0,
        total: 0,
      });
    }

    payments.forEach((p) => {
      const amount = Number(p.amount || 0);
      if (!amount || p.status === "completed") return;
      const isEnding = p.emiType === "ending";
      const endDate = p.endDate ? new Date(p.endDate) : null;
      const isSavings = p.category === "savings";

      buckets.forEach((bucket) => {
        const applies = !isEnding || (endDate && bucket.start <= endDate);
        if (applies) {
          if (isSavings) bucket.savings += amount;
          else bucket.expenses += amount;
          bucket.total += amount;
        }
      });
    });

    return buckets;
  }, [payments, months, now]);

  const handleMonthsChange = (delta) => {
    setMonths((prev) => Math.min(12, Math.max(1, prev + delta)));
  };

  const forecastChartData = useMemo(() => {
    const mkGradient = (ctx, color1, color2) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 320);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      return gradient;
    };

    return {
      labels: forecastSeries.map(b => b.label),
      datasets: [
        {
          label: "Total EMI",
          data: forecastSeries.map(b => b.total),
          borderColor: "#FFA02E",
          borderWidth: 2,
          backgroundColor: (ctx) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return "rgba(255,160,46,0.08)";
            return mkGradient(c, "rgba(255,160,46,0.28)", "rgba(255,160,46,0.02)");
          },
          fill: true, tension: 0.45, pointRadius: 3, pointHoverRadius: 6,
          pointBackgroundColor: "#FFA02E", pointBorderColor: "#1c1c1e", pointBorderWidth: 2, order: 1,
        },
      ],
    };
  }, [forecastSeries]);

  const forecastChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 600, easing: "easeInOutQuart" },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: {
          color: "rgba(255,255,255,0.4)",
          font: { size: 11 },
          boxWidth: 12,
          boxHeight: 3,
          padding: 18,
          usePointStyle: true,
          pointStyle: "line",
        },
      },
      tooltip: {
        backgroundColor: "#1c1c1e",
        titleColor: "rgba(255,255,255,0.85)",
        titleFont: { size: 12, weight: "bold" },
        bodyColor: "rgba(255,255,255,0.55)",
        bodyFont: { size: 11 },
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 14,
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10,
        callbacks: {
          label: (item) =>
            `  ${item.dataset.label}:  ₹${Number(item.raw).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
        ticks: { color: "rgba(255,255,255,0.35)", font: { size: 11 } },
        border: { color: "rgba(255,255,255,0.07)" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
        ticks: {
          color: "rgba(255,255,255,0.35)",
          font: { size: 11 },
          maxTicksLimit: 6,
          callback: (v) => {
            if (v >= 100000) return "₹" + (v / 100000).toFixed(1) + "L";
            if (v >= 1000) return "₹" + (v / 1000).toFixed(0) + "K";
            return "₹" + v;
          },
        },
        border: { color: "rgba(255,255,255,0.1)", dash: [4, 4] },
      },
    },
  }), []);

  const paymentMap = useMemo(() => {
    const map = new Map();
    payments.forEach((payment) => {
      if (payment?._id) map.set(payment._id, payment);
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
            style={{ fontSize: '2.5rem', color: '#f59e0b', animation: 'spin 0.9s linear infinite', display: 'inline-block' }}
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
    <div className="content dashboard-root" style={{ maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes dashFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .dash-section { animation: dashFadeUp 0.35s ease both; }
        .dash-section:nth-child(2) { animation-delay: 0.05s; }
        .dash-section:nth-child(3) { animation-delay: 0.1s; }
        .dash-section:nth-child(4) { animation-delay: 0.15s; }
        .dash-stat-value { font-size: clamp(1.35rem, 5.5vw, 1.85rem) !important; word-break: break-word; }
        .dash-tx-row { display: flex; align-items: center; gap: 12px; }
        .dash-tx-main { flex: 1; min-width: 0; }
        .dash-tx-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
        .dash-chart-toolbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: flex-end; width: 100%; }
        .dash-chart-header-row { margin-left: 0; margin-right: 0; }
        /* Theme .card { margin-bottom: 30px } — remove for stat row so mobile gaps match col spacing */
        .dash-summary-stat-row .card { margin-bottom: 0 !important; }
        @media (max-width: 991.98px) {
          .dash-summary-stat-col { margin-bottom: 16px !important; }
          .dash-summary-stat-row > .dash-summary-stat-col:last-child { margin-bottom: 0 !important; }
        }
        @media (max-width: 767.98px) {
          .dash-chart-toolbar { justify-content: flex-start; }
          .dash-chart-header-col-tools { margin-top: 0.85rem !important; }
        }
        @media (max-width: 575.98px) {
          .dash-tx-row { flex-wrap: wrap; align-items: flex-start; }
          .dash-tx-actions { width: 100%; flex-direction: row !important; justify-content: space-between !important; align-items: center !important; margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
          .dash-paid-bar { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .dash-paid-bar > span:last-child { text-align: left; }
        }
      `}} />
      
        {/* Summary Cards */}
        <Row className="mb-3 mb-lg-4 dash-summary-stat-row">
          {[
            { icon: "icon-check-2",      label: "Paid EMI",            value: `₹${paidEMIAmount.toLocaleString('en-IN')}`,      sub: null, accent: '#10b981', progress: totalEMIAmount > 0 ? Math.min(100, Math.round((paidEMIAmount/totalEMIAmount)*100)) : null },
            { icon: "icon-time-alarm",   label: "Remaining EMI",       value: `₹${remainingEMIAmount.toLocaleString('en-IN')}`, sub: null, accent: '#f59e0b', progress: null },
            { icon: "icon-chart-pie-36", label: "Total This Month",     value: `₹${totalEMIAmount.toLocaleString('en-IN')}`,     sub: null, accent: '#8b5cf6', progress: null },
            { icon: "icon-bank",         label: "Total Savings",       value: `₹${totalSavingsPaid.toLocaleString("en-IN",{maximumFractionDigits:0})}`, sub: "All-time paid", accent: '#06b6d4', progress: null },
          ].map(({ icon, label, value, sub, accent, progress }) => (
            <Col xs="12" sm="6" lg="3" className="mb-lg-0 dash-summary-stat-col" key={label}>
              <Card
                style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.06)', borderTop: `2px solid ${accent}`, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transition: 'box-shadow 0.2s ease, transform 0.2s ease', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 28px rgba(0,0,0,0.5), 0 0 24px ${accent}22`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <CardBody style={{ padding: '1.4rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}1a`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`tim-icons ${icon}`} style={{ fontSize: '0.9rem', color: accent }} />
                    </div>
                  </div>
                  <div className="dash-stat-value" style={{ color: '#fff', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
                  {sub && <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.71rem', marginTop: 6 }}>{sub}</div>}
                  {progress !== null && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem' }}>Progress</span>
                        <span style={{ color: accent, fontSize: '0.68rem', fontWeight: 700 }}>{progress}%</span>
                      </div>
                      <div
                        style={{
                          height: 2,
                          minHeight: 2,
                          borderRadius: 1,
                          background: 'rgba(255,255,255,0.1)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            minHeight: 2,
                            width: `${Math.max(0, Math.min(100, progress))}%`,
                            borderRadius: 1,
                            background: accent,
                            boxShadow: `0 0 8px ${accent}44`,
                            transition: 'width 0.7s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Alerts */}
        {insights.overdueCount > 0 && (
          <Row className="mb-4">
            <Col xs="12">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: '12px 18px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderLeft: '3px solid #ef4444', borderRadius: 12, boxShadow: '0 2px 16px rgba(239,68,68,0.08)' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="tim-icons icon-alert-circle-exc" style={{ color: '#ef4444', fontSize: '1rem' }} />
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{insights.overdueCount} {insights.overdueCount === 1 ? 'Payment' : 'Payments'} Overdue</div>
                  <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.78rem', marginTop: 2 }}>Please mark them as paid or review your payment schedule</div>
                </div>
              </div>
            </Col>
          </Row>
        )}

        <Row>
          <Col xs="12">
            <Card style={{ background: 'linear-gradient(165deg, #18181c 0%, #141416 50%, #121214 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,160,46,0.06) inset', overflow: 'hidden' }}>
              <CardHeader style={{ background: 'linear-gradient(90deg, rgba(255,160,46,0.08) 0%, transparent 55%)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '1.1rem clamp(0.85rem, 3vw, 1.35rem)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(145deg, rgba(255,160,46,0.2) 0%, rgba(255,160,46,0.06) 100%)', border: '1px solid rgba(255,160,46,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(255,160,46,0.12)' }}>
                    <i className="tim-icons icon-calendar-60" style={{ fontSize: '1rem', color: '#fbbf24' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <CardTitle tag="h4" style={{ color: '#fff', fontWeight: 800, margin: 0, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>Upcoming Payments</CardTitle>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 6, background: 'rgba(255,160,46,0.12)', color: '#fbbf24', border: '1px solid rgba(255,160,46,0.25)' }}>This month</span>
                    </div>
                    <p className="mb-0" style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>Track and mark EMIs due in {format(new Date(), 'MMMM yyyy')}</p>
                  </div>
                </div>
              </CardHeader>
              <CardBody style={{ padding: '1.1rem clamp(0.85rem, 3vw, 1.35rem)', background: 'rgba(0,0,0,0.14)' }}>
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
                        background: "transparent",
                        border: "1px solid rgba(255,160,46,0.55)",
                        borderRadius: 9,
                        padding: "8px 20px",
                        fontWeight: 700,
                        color: "#fbbf24",
                        boxShadow: "none",
                        transition: "background 0.18s ease, border-color 0.18s ease, color 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,160,46,0.1)";
                        e.currentTarget.style.borderColor = "rgba(255,160,46,0.85)";
                        e.currentTarget.style.color = "#fde68a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "rgba(255,160,46,0.55)";
                        e.currentTarget.style.color = "#fbbf24";
                      }}
                    >
                      <i className="tim-icons icon-simple-add mr-1" />
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
                    const pendingLabel = (() => {
                      if (pendingEmis === "Ongoing") return "♾";
                      if (typeof pendingEmis === "number") return pendingEmis;
                      return pendingEmis ?? "-";
                    })();
                    
                    const isSavings = t.payment?.category === 'savings';
                    const isOverdue = !isPaid && paymentDate < today;
                    const accentColor = isSavings ? '#3cd278' : '#ff5a5a';
                    const statusPill = isOverdue
                      ? { label: '⚠ Overdue', bg: 'rgba(255,70,70,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,70,70,0.3)' }
                      : { label: `Due ${dueLabel}`, bg: 'rgba(255,160,46,0.1)', color: '#FFA02E', border: '1px solid rgba(255,160,46,0.25)' };

                    return (
                      <div
                        key={t._id}
                        className="dash-tx-row"
                        style={{
                          padding: '13px 16px',
                          background: isPaid
                            ? 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
                            : 'linear-gradient(135deg, rgba(28,28,33,0.98) 0%, rgba(22,22,26,0.99) 100%)',
                          border: `1px solid ${isPaid ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.09)'}`,
                          borderLeft: `4px solid ${isPaid ? 'rgba(255,255,255,0.12)' : accentColor}`,
                          borderRadius: 14,
                          marginBottom: 10,
                          boxShadow: isPaid ? 'none' : '0 2px 12px rgba(0,0,0,0.2),0 0 0 1px rgba(255,255,255,0.02) inset',
                          opacity: isPaid ? 0.72 : 1,
                          transition: 'box-shadow 0.2s ease, background 0.2s ease, opacity 0.2s ease, transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isPaid ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #222228 0%, #1a1a1f 100%)';
                          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04) inset';
                          e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isPaid
                            ? 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
                            : 'linear-gradient(135deg, rgba(28,28,33,0.98) 0%, rgba(22,22,26,0.99) 100%)';
                          e.currentTarget.style.boxShadow = isPaid ? 'none' : '0 2px 12px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.02) inset';
                          e.currentTarget.style.opacity = isPaid ? '0.72' : '1';
                        }}
                      >
                        {/* Icon */}
                        <div style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          flexShrink: 0,
                          background: `linear-gradient(145deg, ${accentColor}22 0%, ${accentColor}0d 100%)`,
                          border: `1px solid ${accentColor}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 2px 8px ${accentColor}18`,
                        }}>
                          <i className={`tim-icons ${isSavings ? 'icon-bank' : 'icon-credit-card'}`} style={{ fontSize: '0.95rem', color: accentColor }} />
                        </div>

                        {/* Name + meta */}
                        <div className="dash-tx-main">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ color: isPaid ? 'rgba(255,255,255,0.52)' : '#fff', fontWeight: 700, fontSize: '0.92rem', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                              {t.payment?.name || 'N/A'}
                            </span>
                            {t.payment?.category && (
                              <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.08em', background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}35`, flexShrink: 0 }}>
                                {t.payment.category}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.95rem', textShadow: '0 0 24px rgba(251,191,36,0.15)' }}>
                              ₹{Number(t.payment?.amount || t.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                            <span style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.74rem', fontWeight: 500 }}>
                              <span style={{ color: 'rgba(255,255,255,0.55)' }}>{pendingLabel}</span>
                              {' '}EMIs left
                            </span>
                          </div>
                        </div>

                        {/* Right: status + action */}
                        <div className="dash-tx-actions">
                          {!isPaid && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '4px 11px', borderRadius: 8, background: statusPill.bg, color: statusPill.color, border: statusPill.border, whiteSpace: 'nowrap', letterSpacing: '0.03em', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                              {statusPill.label}
                            </span>
                          )}
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(t._id, t)}
                              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                padding: '6px 12px',
                                borderRadius: 8,
                                background: 'transparent',
                                color: '#fbbf24',
                                border: '1px solid rgba(255,160,46,0.55)',
                                boxShadow: 'none',
                                cursor: 'pointer',
                                transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease',
                                whiteSpace: 'nowrap',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,160,46,0.12)';
                                e.currentTarget.style.borderColor = 'rgba(255,160,46,0.85)';
                                e.currentTarget.style.color = '#fde68a';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'rgba(255,160,46,0.55)';
                                e.currentTarget.style.color = '#fbbf24';
                              }}
                            >
                              Mark Paid
                            </button>
                          )}
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
                              className="dash-paid-bar"
                              onClick={() => setShowPaidEMIs(!showPaidEMIs)}
                              style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'linear-gradient(90deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.04) 100%)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 12, cursor: 'pointer', marginBottom: 10, transition: 'all 0.18s ease', gap: 10, boxShadow: '0 2px 10px rgba(16,185,129,0.08)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.07) 100%)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.32)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.04) 100%)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.22)'; }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <i className={`tim-icons ${showPaidEMIs ? 'icon-minimal-down' : 'icon-minimal-right'}`} style={{ color: '#34d399', fontSize: '0.75rem' }} />
                                </div>
                                <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '-0.01em' }}>
                                  Paid this month
                                </span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 9px', borderRadius: 8, background: 'rgba(16,185,129,0.18)', color: '#a7f3d0', border: '1px solid rgba(16,185,129,0.28)' }}>
                                  {paidTransactions.length}
                                </span>
                              </div>
                              <span style={{ color: '#34d399', fontWeight: 800, fontSize: '0.92rem' }}>
                                ₹{paidTransactions.reduce((sum, t) => sum + getTransactionAmount(t), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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

        {/* Expense Chart Section */}
        <Row style={{ marginTop: '28px' }}>
          <Col xs="12">
            <Card style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
              <CardHeader style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem clamp(0.85rem, 3vw, 1.25rem)' }}>
                <Row className="align-items-start align-items-md-center dash-chart-header-row">
                  <Col xs="12" md="6">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="tim-icons icon-chart-bar-32" style={{ fontSize: '0.8rem', color: '#6366f1' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <CardTitle tag="h4" style={{ color: '#fff', margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Monthly Expenses &amp; Savings</CardTitle>
                        <p className="mb-0" style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Last {expenseChartMonths} months</p>
                      </div>
                    </div>
                  </Col>
                  <Col xs="12" md="6" className="dash-chart-header-col-tools d-flex justify-content-md-end">
                    <div className="dash-chart-toolbar">
                    <button onClick={() => navigate("/admin/expenses/add")}
                      type="button"
                      style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        background: "transparent",
                        border: "1px solid rgba(255,160,46,0.55)",
                        color: "#fbbf24",
                        fontWeight: 700,
                        fontSize: "0.76rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "background 0.18s ease, border-color 0.18s ease, color 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,160,46,0.1)";
                        e.currentTarget.style.borderColor = "rgba(255,160,46,0.85)";
                        e.currentTarget.style.color = "#fde68a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "rgba(255,160,46,0.55)";
                        e.currentTarget.style.color = "#fbbf24";
                      }}
                    >
                      <i className="tim-icons icon-simple-add" style={{ fontSize: "0.7rem" }} />Add Expense
                    </button>
                    <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />
                    <button onClick={() => setExpenseChartMonths(m => Math.max(1, m - 1))} disabled={expenseChartMonths <= 1}
                      style={{ width: 26, height: 26, borderRadius: 6, background: "#252527", border: "1px solid rgba(255,255,255,0.1)", color: expenseChartMonths <= 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", cursor: expenseChartMonths <= 1 ? "default" : "pointer", fontSize: "1rem" }}>−</button>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700, minWidth: 40, textAlign: "center", fontSize: "0.82rem" }}>{expenseChartMonths}M</span>
                    <button onClick={() => setExpenseChartMonths(m => Math.min(12, m + 1))} disabled={expenseChartMonths >= 12}
                      style={{ width: 26, height: 26, borderRadius: 6, background: "#252527", border: "1px solid rgba(255,255,255,0.1)", color: expenseChartMonths >= 12 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", cursor: expenseChartMonths >= 12 ? "default" : "pointer", fontSize: "1rem" }}>+</button>
                    {[3, 6, 12].map(n => (
                      <button key={n} onClick={() => setExpenseChartMonths(n)}
                        style={{ padding: "3px 9px", borderRadius: 5, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", background: expenseChartMonths === n ? "#3a3a3c" : "#252527", color: expenseChartMonths === n ? "#fff" : "rgba(255,255,255,0.4)", border: `1px solid ${expenseChartMonths === n ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}` }}>{n}M</button>
                    ))}
                    </div>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody style={{ padding: "1.25rem clamp(0.85rem, 3vw, 1.5rem)", background: "transparent" }}>
                {expenseSummary?.monthlyData?.length > 0 ? (
                  <>
                    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                      {[
                        { label: "This Month Exp", value: expenseSummary.thisMonth?.expense?.total || 0, color: '#ef4444' },
                        { label: "This Month Sav", value: expenseSummary.thisMonth?.savings?.total || 0, color: '#10b981' },
                        { label: "Last Month Exp", value: expenseSummary.lastMonth?.expense?.total || 0, color: '#ef444466' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.71rem" }}>{label}</span>
                          <span style={{ color: "#fff", fontSize: "0.78rem", fontWeight: 700 }}>₹{Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 230, minHeight: 200, position: 'relative', width: '100%', maxWidth: '100%' }}>
                      <Bar
                        data={{
                          labels: expenseSummary.monthlyData.map(m => m.label),
                          datasets: [
                            { label: "Expenses", data: expenseSummary.monthlyData.map(m => m.expense), backgroundColor: "rgba(255,90,90,0.45)", borderColor: "rgba(255,90,90,0.8)", borderWidth: 1, borderRadius: 5 },
                            { label: "Savings",  data: expenseSummary.monthlyData.map(m => m.savings), backgroundColor: "rgba(60,210,120,0.35)", borderColor: "rgba(60,210,120,0.7)", borderWidth: 1, borderRadius: 5 },
                          ],
                        }}
                        options={{
                          responsive: true, maintainAspectRatio: false,
                          plugins: {
                            legend: { labels: { color: "rgba(255,255,255,0.4)", font: { size: 11 }, boxWidth: 12, padding: 12 } },
                            tooltip: { backgroundColor: "#1c1c1e", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, titleColor: "rgba(255,255,255,0.8)", bodyColor: "rgba(255,255,255,0.55)", padding: 10, callbacks: { label: ctx => ` ₹${ctx.parsed.y.toLocaleString("en-IN")}` } },
                          },
                          scales: {
                            x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 11 } } },
                            y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 11 }, callback: v => v >= 1000 ? "₹"+(v/1000).toFixed(0)+"K" : "₹"+v } },
                          },
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.25)" }}>
                    <i className="tim-icons icon-chart-bar-32" style={{ fontSize: "2.5rem", display: "block", marginBottom: 10 }} />
                    No expense data for this period
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* EMI Forecast Chart Section */}
        <Row style={{ marginTop: '28px' }}>
          <Col xs="12">
            <Card style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
              <CardHeader style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem clamp(0.85rem, 3vw, 1.25rem)' }}>
                <Row className="align-items-start align-items-md-center dash-chart-header-row">
                  <Col xs="12" md="6">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="tim-icons icon-chart-bar-32" style={{ fontSize: '0.8rem', color: '#f59e0b' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <CardTitle tag="h4" style={{ color: '#fff', margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>EMI Forecast</CardTitle>
                        <p className="mb-0" style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Month-wise totals from current month</p>
                      </div>
                    </div>
                  </Col>
                  <Col xs="12" md="6" className="dash-chart-header-col-tools d-flex justify-content-md-end">
                    <div className="dash-chart-toolbar">
                    <Button onClick={() => handleMonthsChange(-1)} style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 7, padding: "5px 11px" }}>-</Button>
                    <div style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600, minWidth: 72, textAlign: "center", fontSize: "0.85rem" }}>
                      {months} {months === 1 ? "month" : "months"}
                    </div>
                    <Button onClick={() => handleMonthsChange(1)} style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 7, padding: "5px 11px" }}>+</Button>
                    <Button onClick={() => setMonths(12)} style={{ background: "#2e2e30", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.75)", borderRadius: 7, padding: "5px 11px", fontWeight: 600 }}>1 Year</Button>
                    </div>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody style={{ padding: "1.25rem clamp(0.85rem, 3vw, 1.5rem)", background: "transparent" }}>
                {forecastSeries.length > 0 && forecastSeries.some(b => b.total > 0) ? (
                  <>
                    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                      {[
                        { label: "Avg Monthly EMI", total: forecastSeries.reduce((s, b) => s + b.total, 0) / forecastSeries.length },
                      ].map(({ label, total }) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: '5px 12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 8 }}>
                          <div style={{ width: 14, height: 2, borderRadius: 2, background: "#f59e0b", flexShrink: 0 }} />
                          <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.71rem" }}>{label}</span>
                          <span style={{ color: "#f59e0b", fontSize: "0.82rem", fontWeight: 800 }}>₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 260, minHeight: 200, position: "relative", width: '100%', maxWidth: '100%' }}>
                      <Line data={forecastChartData} options={forecastChartOptions} />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4" style={{ color: "rgba(255,255,255,0.25)" }}>
                    <i className="tim-icons icon-chart-bar-32" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }} />
                    <div style={{ fontSize: "1rem" }}>No active payments to forecast</div>
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