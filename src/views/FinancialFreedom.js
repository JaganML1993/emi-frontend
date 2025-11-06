import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Badge,
  Progress,
  Table,
} from "reactstrap";
import { format, addMonths, differenceInMonths } from "date-fns";
import api from "../config/axios";

function FinancialFreedom() {
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Fetch payments
      const paymentsResponse = await api.get("/api/payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const paymentsData = paymentsResponse.data.data || [];
      setPayments(paymentsData.filter(p => p.status === "active"));

      // Fetch user profile for monthly income
      try {
        const userResponse = await api.get("/api/auth/me");
        if (userResponse.data.success) {
          setUser(userResponse.data.user);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }

      // Fetch upcoming transactions
      const transactionsResponse = await api.get("/api/payments/transactions/upcoming", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(transactionsResponse.data.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    const totalMonthlyEMI = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const monthlyIncome = user?.monthlyIncome || 0;
    const debtToIncomeRatio = monthlyIncome > 0 ? (totalMonthlyEMI / monthlyIncome) * 100 : 0;
    
    // Calculate total remaining debt
    const totalRemainingDebt = payments.reduce((sum, payment) => {
      if (payment.emiType === "recurring") {
        // For recurring, estimate 12 months worth
        return sum + (payment.amount * 12);
      } else if (payment.endDate) {
        // For ending, calculate remaining months
        const today = new Date();
        const endDate = new Date(payment.endDate);
        const remainingMonths = Math.max(0, differenceInMonths(endDate, today) + 1);
        return sum + (payment.amount * remainingMonths);
      }
      return sum;
    }, 0);

    // Calculate financial health score (0-100)
    let healthScore = 100;
    if (debtToIncomeRatio > 50) healthScore -= 40;
    else if (debtToIncomeRatio > 40) healthScore -= 30;
    else if (debtToIncomeRatio > 30) healthScore -= 20;
    else if (debtToIncomeRatio > 20) healthScore -= 10;

    // Penalize for too many active payments
    if (payments.length > 10) healthScore -= 15;
    else if (payments.length > 7) healthScore -= 10;
    else if (payments.length > 5) healthScore -= 5;

    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      totalMonthlyEMI,
      monthlyIncome,
      debtToIncomeRatio,
      totalRemainingDebt,
      healthScore,
      activePayments: payments.length,
    };
  }, [payments, user]);

  // Prioritize payments (debt avalanche method - highest interest/amount first)
  const prioritizedPayments = useMemo(() => {
    return [...payments].sort((a, b) => {
      // Sort by amount (highest first) - paying off high amounts first saves more
      return (b.amount || 0) - (a.amount || 0);
    });
  }, [payments]);

  // Calculate time to freedom (months until all EMIs are paid)
  const timeToFreedom = useMemo(() => {
    if (payments.length === 0) return 0;
    
    const endingPayments = payments.filter(p => p.endDate && p.emiType === "ending");
    if (endingPayments.length === 0) return null; // All recurring
    
    const maxEndDate = endingPayments.reduce((max, p) => {
      const endDate = new Date(p.endDate);
      return endDate > max ? endDate : max;
    }, new Date(0));
    
    const today = new Date();
    return Math.max(0, differenceInMonths(maxEndDate, today) + 1);
  }, [payments]);

  // Get recommendations
  const recommendations = useMemo(() => {
    const recs = [];
    
    if (financialMetrics.debtToIncomeRatio > 40) {
      recs.push({
        type: "critical",
        title: "High Debt-to-Income Ratio",
        message: `Your EMI burden is ${financialMetrics.debtToIncomeRatio.toFixed(1)}% of your income. Aim to reduce it below 30%.`,
        action: "Consider consolidating debts or increasing income.",
      });
    }

    if (financialMetrics.activePayments > 7) {
      recs.push({
        type: "warning",
        title: "Too Many Active Payments",
        message: `You have ${financialMetrics.activePayments} active payments. Focus on paying off smaller ones first.`,
        action: "Use debt snowball method - pay off smallest debts first.",
      });
    }

    if (financialMetrics.totalMonthlyEMI > 0 && financialMetrics.monthlyIncome > 0) {
      const savingsRate = ((financialMetrics.monthlyIncome - financialMetrics.totalMonthlyEMI) / financialMetrics.monthlyIncome) * 100;
      if (savingsRate < 20) {
        recs.push({
          type: "info",
          title: "Low Savings Rate",
          message: `After EMIs, you're saving only ${savingsRate.toFixed(1)}% of income.`,
          action: "Try to maintain at least 20% savings rate for financial security.",
        });
      }
    }

    if (prioritizedPayments.length > 0) {
      const highestPayment = prioritizedPayments[0];
      recs.push({
        type: "success",
        title: "Priority Payment",
        message: `Focus on "${highestPayment.name}" (₹${highestPayment.amount?.toLocaleString("en-IN")}/month).`,
        action: `Paying this off will free up ₹${highestPayment.amount?.toLocaleString("en-IN")} monthly.`,
      });
    }

    return recs;
  }, [financialMetrics, prioritizedPayments]);

  if (loading) {
    return null;
  }

  const getHealthColor = (score) => {
    if (score >= 70) return "success";
    if (score >= 50) return "warning";
    return "danger";
  };

  const getHealthLabel = (score) => {
    if (score >= 70) return "Excellent";
    if (score >= 50) return "Good";
    if (score >= 30) return "Fair";
    return "Critical";
  };

  return (
    <div className="content">
      <Row className="mb-4">
        <Col xs="12">
          <Card
            style={{
              background: "#1E1E1E",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "15px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            <CardHeader
              style={{
                background: "#282040",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "15px 15px 0 0",
              }}
            >
              <CardTitle
                tag="h4"
                style={{ color: "#FFFFFF", fontWeight: 400, margin: 0, fontSize: "1.5rem" }}
              >
                <i className="tim-icons icon-coins mr-2" style={{ color: "#66BB6A" }}></i>
                Financial Freedom Plan
              </CardTitle>
              <p className="mb-0" style={{ fontSize: "0.9rem", color: "#CCCCCC" }}>
                Track your journey to becoming debt-free and financially stable
              </p>
            </CardHeader>
            <CardBody style={{ padding: "1.5rem", background: "#1E1E1E" }}>
              {/* Financial Health Score */}
              <Row className="mb-4">
                <Col xs="12" md="6" lg="3">
                  <Card
                    style={{
                      background: `rgba(${financialMetrics.healthScore >= 70 ? "102, 187, 106" : financialMetrics.healthScore >= 50 ? "255, 152, 0" : "229, 57, 53"}, 0.2)`,
                      border: `1px solid rgba(${financialMetrics.healthScore >= 70 ? "102, 187, 106" : financialMetrics.healthScore >= 50 ? "255, 152, 0" : "229, 57, 53"}, 0.3)`,
                      borderRadius: "12px",
                    }}
                  >
                    <CardBody style={{ padding: "1rem" }}>
                      <div style={{ color: "#FFFFFF", fontSize: "0.9rem", fontWeight: 400, marginBottom: "8px" }}>
                        Financial Health Score
                      </div>
                      <div style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 600, marginBottom: "8px" }}>
                        {financialMetrics.healthScore.toFixed(0)}/100
                      </div>
                      <Badge color={getHealthColor(financialMetrics.healthScore)}>
                        {getHealthLabel(financialMetrics.healthScore)}
                      </Badge>
                      <Progress
                        value={financialMetrics.healthScore}
                        color={getHealthColor(financialMetrics.healthScore)}
                        style={{ marginTop: "10px", height: "8px" }}
                      />
                    </CardBody>
                  </Card>
                </Col>
                <Col xs="12" md="6" lg="3">
                  <Card
                    style={{
                      background: "rgba(229, 57, 53, 0.2)",
                      border: "1px solid rgba(229, 57, 53, 0.3)",
                      borderRadius: "12px",
                    }}
                  >
                    <CardBody style={{ padding: "1rem" }}>
                      <div style={{ color: "#FFFFFF", fontSize: "0.9rem", fontWeight: 400, marginBottom: "8px" }}>
                        Monthly EMI Burden
                      </div>
                      <div style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 600 }}>
                        ₹{financialMetrics.totalMonthlyEMI.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </div>
                      {financialMetrics.monthlyIncome > 0 && (
                        <div style={{ color: "#CCCCCC", fontSize: "0.8rem", marginTop: "5px" }}>
                          {financialMetrics.debtToIncomeRatio.toFixed(1)}% of income
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>
                <Col xs="12" md="6" lg="3">
                  <Card
                    style={{
                      background: "rgba(66, 133, 244, 0.2)",
                      border: "1px solid rgba(66, 133, 244, 0.3)",
                      borderRadius: "12px",
                    }}
                  >
                    <CardBody style={{ padding: "1rem" }}>
                      <div style={{ color: "#FFFFFF", fontSize: "0.9rem", fontWeight: 400, marginBottom: "8px" }}>
                        Total Remaining Debt
                      </div>
                      <div style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 600 }}>
                        ₹{financialMetrics.totalRemainingDebt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ color: "#CCCCCC", fontSize: "0.8rem", marginTop: "5px" }}>
                        {financialMetrics.activePayments} active payments
                      </div>
                    </CardBody>
                  </Card>
                </Col>
                <Col xs="12" md="6" lg="3">
                  <Card
                    style={{
                      background: "rgba(102, 187, 106, 0.2)",
                      border: "1px solid rgba(102, 187, 106, 0.3)",
                      borderRadius: "12px",
                    }}
                  >
                    <CardBody style={{ padding: "1rem" }}>
                      <div style={{ color: "#FFFFFF", fontSize: "0.9rem", fontWeight: 400, marginBottom: "8px" }}>
                        Time to Freedom
                      </div>
                      <div style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 600 }}>
                        {timeToFreedom !== null ? `${timeToFreedom} months` : "Ongoing"}
                      </div>
                      {timeToFreedom !== null && timeToFreedom > 0 && (
                        <div style={{ color: "#CCCCCC", fontSize: "0.8rem", marginTop: "5px" }}>
                          ~{Math.floor(timeToFreedom / 12)} years {timeToFreedom % 12} months
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <Row className="mb-4">
                  <Col xs="12">
                    <Card
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "12px",
                      }}
                    >
                      <CardHeader style={{ background: "transparent", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                        <CardTitle tag="h5" style={{ color: "#FFFFFF", margin: 0 }}>
                          <i className="tim-icons icon-light-3 mr-2" style={{ color: "#4285F4" }}></i>
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        {recommendations.map((rec, index) => (
                          <div
                            key={index}
                            style={{
                              padding: "15px",
                              marginBottom: index < recommendations.length - 1 ? "15px" : 0,
                              background: `rgba(${rec.type === "critical" ? "229, 57, 53" : rec.type === "warning" ? "255, 152, 0" : rec.type === "success" ? "102, 187, 106" : "66, 133, 244"}, 0.1)`,
                              border: `1px solid rgba(${rec.type === "critical" ? "229, 57, 53" : rec.type === "warning" ? "255, 152, 0" : rec.type === "success" ? "102, 187, 106" : "66, 133, 244"}, 0.3)`,
                              borderRadius: "8px",
                            }}
                          >
                            <div style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: "5px" }}>
                              {rec.title}
                            </div>
                            <div style={{ color: "#CCCCCC", fontSize: "0.9rem", marginBottom: "5px" }}>
                              {rec.message}
                            </div>
                            <div style={{ color: "#FFFFFF", fontSize: "0.85rem", fontStyle: "italic" }}>
                              💡 {rec.action}
                            </div>
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Payment Priority List */}
              <Row>
                <Col xs="12">
                  <Card
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                    }}
                  >
                    <CardHeader style={{ background: "transparent", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                      <CardTitle tag="h5" style={{ color: "#FFFFFF", margin: 0 }}>
                        <i className="tim-icons icon-bullet-list-67 mr-2" style={{ color: "#4285F4" }}></i>
                        Payment Priority (Debt Avalanche Method)
                      </CardTitle>
                      <p className="mb-0" style={{ fontSize: "0.85rem", color: "#CCCCCC", marginTop: "5px" }}>
                        Pay off highest amounts first to maximize savings
                      </p>
                    </CardHeader>
                    <CardBody>
                      {prioritizedPayments.length === 0 ? (
                        <div className="text-center py-4" style={{ color: "#CCCCCC" }}>
                          No active payments found. Great job! 🎉
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <Table dark style={{ background: "transparent" }}>
                            <thead>
                              <tr>
                                <th style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)", width: "5%" }}>
                                  #
                                </th>
                                <th style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                  Payment Name
                                </th>
                                <th style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                  Category
                                </th>
                                <th style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                  Monthly Amount
                                </th>
                                <th style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                  End Date
                                </th>
                                <th style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                  Priority
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {prioritizedPayments.map((payment, index) => {
                                const isHighPriority = index < 3;
                                return (
                                  <tr key={payment._id}>
                                    <td style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                      {index + 1}
                                    </td>
                                    <td style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                      {payment.name}
                                    </td>
                                    <td style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                      <Badge
                                        color={payment.category === "savings" ? "success" : "danger"}
                                        style={{
                                          backgroundColor: payment.category === "savings" ? "rgba(102, 187, 106, 0.8)" : "rgba(229, 57, 53, 0.8)",
                                        }}
                                      >
                                        {payment.category === "savings" ? "Savings" : "Expense"}
                                      </Badge>
                                    </td>
                                    <td style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)", fontWeight: 600 }}>
                                      ₹{payment.amount?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                      {payment.endDate
                                        ? format(new Date(payment.endDate), "MMM dd, yyyy")
                                        : payment.emiType === "recurring"
                                        ? "Ongoing"
                                        : "-"}
                                    </td>
                                    <td style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.1)" }}>
                                      {isHighPriority ? (
                                        <Badge color="warning">High Priority</Badge>
                                      ) : (
                                        <Badge color="secondary">Normal</Badge>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default FinancialFreedom;

