import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Row, Col, Card, CardHeader, CardBody, CardTitle, Button, Spinner } from "reactstrap";
import { addMonths, format, endOfMonth } from "date-fns";
import api from "../config/axios";

function EMIForecast() {
  const [months, setMonths] = useState(6);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await api.get("/api/payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data || [];
      setPayments(data);
    } catch (err) {
      console.error("Error fetching payments:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    if (typeof window === "undefined") {
      return;
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const now = useMemo(() => new Date(), []);

  const series = useMemo(() => {
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

  const maxTrendTotal = useMemo(() => {
    if (!series.length) return 0;
    return Math.max(...series.map((m) => m.total));
  }, [series]);

  const trendContainerStyle = useMemo(() => {
    if (isMobile) {
      return {
        display: "flex",
        gap: "12px",
        overflowX: "auto",
        padding: "4px 8px 8px",
        margin: "0 -1rem",
        scrollSnapType: "x mandatory",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      };
    }
    return {
      display: "grid",
      gap: "16px",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    };
  }, [isMobile]);

  const forecastCardStyle = useCallback(
    (isCurrentMonth) => {
      const base = {
        background: isCurrentMonth
          ? "linear-gradient(135deg, rgba(0, 191, 255, 0.3) 0%, rgba(30, 144, 255, 0.2) 100%)"
          : "linear-gradient(135deg, rgba(68, 138, 255, 0.18) 0%, rgba(30, 136, 229, 0.12) 100%)",
        border: isCurrentMonth
          ? "1px solid rgba(0, 191, 255, 0.6)"
          : "1px solid rgba(68, 138, 255, 0.4)",
        borderRadius: "12px",
        padding: isMobile ? "12px" : "16px",
        boxShadow: isCurrentMonth
          ? "0 6px 18px rgba(0, 191, 255, 0.25)"
          : "0 4px 14px rgba(68, 138, 255, 0.18)",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "8px" : "10px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        position: "relative",
        overflow: "hidden",
      };

      if (isMobile) {
        return {
          ...base,
          minWidth: 220,
          flex: "0 0 220px",
          scrollSnapAlign: "start",
        };
      }

      return base;
    },
    [isMobile]
  );

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totals = series.map((m) => m.total);
    const totalEMI = totals.reduce((sum, val) => sum + val, 0);
    const avgEMI = totals.length > 0 ? totalEMI / totals.length : 0;
    const highestMonth = series.reduce((max, m) => (m.total > max.total ? m : max), series[0] || {});
    const lowestMonth = series.reduce((min, m) => (m.total < min.total ? m : min), series[0] || {});
    return { totalEMI, avgEMI, highestMonth, lowestMonth };
  }, [series]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const savings = payments.filter((p) => p.category === "savings" && p.status === "active");
    const expenses = payments.filter((p) => p.category !== "savings" && p.status === "active");
    const savingsTotal = savings.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const expensesTotal = expenses.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { savings: savingsTotal, expenses: expensesTotal, savingsCount: savings.length, expensesCount: expenses.length };
  }, [payments]);

  // Insights
  const insights = useMemo(() => {
    const endingSoon = payments.filter((p) => {
      if (p.emiType !== "ending" || !p.endDate) return false;
      const endDate = new Date(p.endDate);
      const monthsUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24 * 30));
      return monthsUntilEnd > 0 && monthsUntilEnd <= 3;
    });
    const recurringCount = payments.filter((p) => p.emiType === "recurring" && p.status === "active").length;
    return { endingSoon, recurringCount };
  }, [payments, now]);

  const handleMonthsChange = (delta) => {
    setMonths((prev) => Math.min(12, Math.max(1, prev + delta)));
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
      {/* Summary Statistics Cards */}
      <Row className="mb-4">
        <Col md="3" sm="6" className="mb-3">
          <Card
            style={{
              background: "linear-gradient(135deg, rgba(255, 82, 82, 0.25) 0%, rgba(255, 107, 107, 0.15) 100%)",
              border: "1px solid rgba(255, 82, 82, 0.5)",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(255, 82, 82, 0.2)",
            }}
          >
            <CardBody style={{ padding: "1rem" }}>
              <div style={{ color: "#FFD166", fontSize: "0.85rem", marginBottom: "6px", fontWeight: 500 }}>
                <i className="tim-icons icon-coins mr-1" style={{ color: "#FFD166" }}></i>
                Total EMI
              </div>
              <div style={{ color: "#FFFFFF", fontSize: "1.5rem", fontWeight: 600 }}>
                ₹{stats.totalEMI.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ color: "#FFD166", fontSize: "0.75rem", marginTop: "4px" }}>
                Over {months} {months === 1 ? "month" : "months"}
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3" sm="6" className="mb-3">
          <Card
            style={{
              background: "linear-gradient(135deg, rgba(255, 152, 0, 0.25) 0%, rgba(255, 193, 7, 0.15) 100%)",
              border: "1px solid rgba(255, 152, 0, 0.5)",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(255, 152, 0, 0.2)",
            }}
          >
            <CardBody style={{ padding: "1rem" }}>
              <div style={{ color: "#FFD166", fontSize: "0.85rem", marginBottom: "6px", fontWeight: 500 }}>
                <i className="tim-icons icon-chart-bar-32 mr-1" style={{ color: "#FFD166" }}></i>
                Average/Month
              </div>
              <div style={{ color: "#FFFFFF", fontSize: "1.5rem", fontWeight: 600 }}>
                ₹{stats.avgEMI.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ color: "#FFD166", fontSize: "0.75rem", marginTop: "4px" }}>
                Monthly average
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3" sm="6" className="mb-3">
          <Card
            style={{
              background: "linear-gradient(135deg, rgba(229, 57, 53, 0.25) 0%, rgba(244, 67, 54, 0.15) 100%)",
              border: "1px solid rgba(229, 57, 53, 0.5)",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(229, 57, 53, 0.2)",
            }}
          >
            <CardBody style={{ padding: "1rem" }}>
              <div style={{ color: "#FF6E6E", fontSize: "0.85rem", marginBottom: "6px", fontWeight: 500 }}>
                <i className="tim-icons icon-trophy mr-1" style={{ color: "#FF6E6E" }}></i>
                Highest Month
              </div>
              <div style={{ color: "#FFFFFF", fontSize: "1.5rem", fontWeight: 600 }}>
                ₹{stats.highestMonth?.total?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) || "0"}
              </div>
              <div style={{ color: "#FF6E6E", fontSize: "0.75rem", marginTop: "4px" }}>
                {stats.highestMonth?.label || "-"}
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3" sm="6" className="mb-3">
          <Card
            style={{
              background: "linear-gradient(135deg, rgba(102, 187, 106, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%)",
              border: "1px solid rgba(102, 187, 106, 0.5)",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(102, 187, 106, 0.2)",
            }}
          >
            <CardBody style={{ padding: "1rem" }}>
              <div style={{ color: "#66BB6A", fontSize: "0.85rem", marginBottom: "6px", fontWeight: 500 }}>
                <i className="tim-icons icon-minimal-down mr-1" style={{ color: "#66BB6A" }}></i>
                Lowest Month
              </div>
              <div style={{ color: "#FFFFFF", fontSize: "1.5rem", fontWeight: 600 }}>
                ₹{stats.lowestMonth?.total?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) || "0"}
              </div>
              <div style={{ color: "#66BB6A", fontSize: "0.75rem", marginTop: "4px" }}>
                {stats.lowestMonth?.label || "-"}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Category Breakdown */}
      <Row className="mb-4">
        <Col md="6" className="mb-3">
          <Card
            style={{
              background: "linear-gradient(135deg, rgba(138, 43, 226, 0.15) 0%, rgba(75, 0, 130, 0.1) 100%)",
              border: "1px solid rgba(138, 43, 226, 0.4)",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(138, 43, 226, 0.15)",
            }}
          >
            <CardHeader
              style={{
                background: "linear-gradient(135deg, rgba(138, 43, 226, 0.2) 0%, rgba(75, 0, 130, 0.1) 100%)",
                borderBottom: "1px solid rgba(138, 43, 226, 0.3)",
                padding: "0.75rem 1rem",
              }}
            >
              <CardTitle tag="h5" style={{ color: "#FFFFFF", margin: 0, fontSize: "1rem" }}>
                <i className="tim-icons icon-chart-pie-36 mr-2" style={{ color: "#BA68C8" }}></i>
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardBody style={{ padding: "1rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(102, 187, 106, 1) 0%, rgba(76, 175, 80, 1) 100%)",
                        boxShadow: "0 2px 6px rgba(102, 187, 106, 0.4)",
                      }}
                    />
                    <span style={{ color: "#66BB6A", fontSize: "0.9rem", fontWeight: 500 }}>Savings</span>
                  </div>
                  <div style={{ color: "#66BB6A", fontWeight: 600, fontSize: "1rem" }}>
                    ₹{categoryBreakdown.savings.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ color: "#BA68C8", fontSize: "0.75rem", marginLeft: "22px" }}>
                  {categoryBreakdown.savingsCount} {categoryBreakdown.savingsCount === 1 ? "payment" : "payments"}
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(255, 82, 82, 1) 0%, rgba(255, 107, 107, 1) 100%)",
                        boxShadow: "0 2px 6px rgba(255, 82, 82, 0.4)",
                      }}
                    />
                    <span style={{ color: "#FF5252", fontSize: "0.9rem", fontWeight: 500 }}>Expenses</span>
                  </div>
                  <div style={{ color: "#FF5252", fontWeight: 600, fontSize: "1rem" }}>
                    ₹{categoryBreakdown.expenses.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ color: "#BA68C8", fontSize: "0.75rem", marginLeft: "22px" }}>
                  {categoryBreakdown.expensesCount} {categoryBreakdown.expensesCount === 1 ? "payment" : "payments"}
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="6" className="mb-3">
          <Card
            style={{
              background: "linear-gradient(135deg, rgba(0, 191, 255, 0.15) 0%, rgba(30, 144, 255, 0.1) 100%)",
              border: "1px solid rgba(0, 191, 255, 0.4)",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(0, 191, 255, 0.15)",
            }}
          >
            <CardHeader
              style={{
                background: "linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(30, 144, 255, 0.1) 100%)",
                borderBottom: "1px solid rgba(0, 191, 255, 0.3)",
                padding: "0.75rem 1rem",
              }}
            >
              <CardTitle tag="h5" style={{ color: "#FFFFFF", margin: 0, fontSize: "1rem" }}>
                <i className="tim-icons icon-light-3 mr-2" style={{ color: "#00BFFF" }}></i>
                Insights
              </CardTitle>
            </CardHeader>
            <CardBody style={{ padding: "1rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ color: "#00BFFF", fontSize: "0.9rem", marginBottom: "4px", fontWeight: 500 }}>
                  <i className="tim-icons icon-refresh-02 mr-1" style={{ color: "#00BFFF" }}></i>
                  Recurring Payments
                </div>
                <div style={{ color: "#00BFFF", fontSize: "1.25rem", fontWeight: 600 }}>
                  {insights.recurringCount} {insights.recurringCount === 1 ? "payment" : "payments"}
                </div>
              </div>
              <div>
                <div style={{ color: "#FFD166", fontSize: "0.9rem", marginBottom: "4px", fontWeight: 500 }}>
                  <i className="tim-icons icon-time-alarm mr-1" style={{ color: "#FFD166" }}></i>
                  Ending in 3 Months
                </div>
                <div style={{ color: "#FFD166", fontSize: "1.25rem", fontWeight: 600 }}>
                  {insights.endingSoon.length} {insights.endingSoon.length === 1 ? "payment" : "payments"}
                </div>
                {insights.endingSoon.length > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#BA68C8" }}>
                    {insights.endingSoon.slice(0, 3).map((p, idx) => (
                      <div key={idx} style={{ marginBottom: "4px" }}>
                        • {p.name} - {format(new Date(p.endDate), "MMM yyyy")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Chart Section */}
      <Row>
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
                    <i className="tim-icons icon-chart-line-32 mr-2" style={{ color: "#00BFFF" }}></i>
                    EMI Forecast Trend
                  </CardTitle>
                  <p className="mb-0" style={{ fontSize: "0.85rem", color: "#FFD166" }}>
                    Monthly EMI totals trend over the forecast period
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
              {isMobile && (
                <style>
                  {`
                    .emi-forecast-trend-scroll::-webkit-scrollbar {
                      display: none;
                    }
                    .emi-forecast-trend-scroll {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                  `}
                </style>
              )}
              {loading ? (
                <div className="text-center py-4">
                  <Spinner color="primary" />
                </div>
              ) : series.length > 0 ? (
                <div
                  className={isMobile ? "emi-forecast-trend-scroll" : undefined}
                  style={trendContainerStyle}
                >
                  {series.map((bucket) => {
                    const total = Number(bucket.total || 0);
                    const formattedTotal = `₹${total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
                    const rawProgress = maxTrendTotal > 0 ? (total / maxTrendTotal) * 100 : 0;
                    const progress = total > 0 ? Math.max(6, rawProgress) : 0;
                    const isCurrentMonth = bucket.key === format(now, "yyyy-MM");
                    const cardStyle = forecastCardStyle(isCurrentMonth);

                    return (
                      <div key={bucket.key} style={cardStyle}>
                        {isCurrentMonth && (
                          <span
                            style={{
                              position: "absolute",
                              top: 10,
                              right: 12,
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              color: "#00BFFF",
                              background: "rgba(0, 191, 255, 0.15)",
                              border: "1px solid rgba(0, 191, 255, 0.5)",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              letterSpacing: "0.02em",
                            }}
                          >
                            Current
                          </span>
                        )}
                        <div style={{ fontSize: "0.85rem", color: "#9FA8DA", fontWeight: 600 }}>
                          {bucket.label}
                        </div>
                        <div
                          style={{
                            color: "#FFFFFF",
                            fontSize: isMobile ? "1.25rem" : "1.5rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "baseline",
                            gap: "8px",
                          }}
                        >
                          <i className="tim-icons icon-coins" style={{ fontSize: isMobile ? "1rem" : "1.1rem", color: "#FFD166" }} />
                          <span>{formattedTotal}</span>
                        </div>
                        <div style={{ fontSize: isMobile ? "0.7rem" : "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                          EMI total for the month
                        </div>
                        <div
                          style={{
                            height: isMobile ? "5px" : "6px",
                            borderRadius: "999px",
                            background: "rgba(255, 255, 255, 0.12)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${progress}%`,
                              maxWidth: "100%",
                              background: "linear-gradient(90deg, #FFD166 0%, #FF9F1C 100%)",
                              height: "100%",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        {isMobile && (
                          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.55)" }}>
                            {progress > 0 ? `${progress.toFixed(0)}% of peak month` : "No EMIs scheduled"}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

export default EMIForecast;


