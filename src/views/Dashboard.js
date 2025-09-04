import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Table,
  Badge,
} from "reactstrap";
import { Line } from "react-chartjs-2";
import { format } from "date-fns";
import api from "../config/axios";

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [loading, setLoading] = useState(true);


  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get(`/api/reports/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUpcomingPayments = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Get current month date range
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

      // Fetch both EMI data and current month transactions
      const [emisResponse, transactionsResponse] = await Promise.all([
        api.get("/api/emis", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get(`/api/transactions?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      if (emisResponse.data.success && emisResponse.data.data) {
        const payments = [];
        const currentMonthTransactions = transactionsResponse.data.success ? transactionsResponse.data.data : [];
        
        // Create a set of EMI names that have transactions in current month
        const paidEMIsThisMonth = new Set();
        
        currentMonthTransactions.forEach(transaction => {
          if (transaction.type === 'expense' && transaction.description) {
            // Check for various EMI payment patterns
            if (transaction.description.includes('EMI Payment:') || 
                transaction.description.includes('installment') ||
                transaction.description.includes('Cheetu') ||
                transaction.description.includes('Cashe') ||
                transaction.description.includes('True Balance') ||
                transaction.description.includes('Sangam') ||
                transaction.description.includes('Suresh')) {
              
              // Extract EMI name from description
              let emiName = null;
              if (transaction.description.includes('EMI Payment:')) {
                const match = transaction.description.match(/EMI Payment: (.+)/);
                if (match) {
                  emiName = match[1].trim();
                }
              } else {
                // For other patterns, try to extract the EMI name
                emiName = transaction.description.replace(/installment|EMI|Payment/gi, '').trim();
              }
              
              if (emiName) {
                paidEMIsThisMonth.add(emiName.toLowerCase());
              }
            }
          }
        });
        
        emisResponse.data.data.forEach(emi => {
          // Skip completed EMIs
          if (emi.status === 'completed') return;
          
          // Skip full payment EMIs
          if (emi.paymentType === 'full_payment') return;
          
          // Skip EMIs that have been paid this month
          if (paidEMIsThisMonth.has(emi.name.toLowerCase())) return;
          
          const dateToUse = emi.nextDueDate || emi.endDate;
          if (!dateToUse) return; // Skip if no valid date
          
          const dueDate = new Date(dateToUse);
          const today = new Date();
          // Reset time to start of day for accurate comparison
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          payments.push({
            name: emi.name,
            dueDate: dateToUse,
            amount: emi.emiAmount,
            daysUntilDue: daysUntilDue,
            type: emi.type,
            status: emi.status,
            paymentType: emi.paymentType,
            isIncome: emi.type === 'income_emi' || emi.type === 'savings_emi' || emi.type.includes('income') || emi.type.includes('savings'),
            progress: emi.paidInstallments && emi.totalInstallments ? (emi.paidInstallments / emi.totalInstallments) * 100 : 0,
            paidInstallments: emi.paidInstallments || 0,
            totalInstallments: emi.totalInstallments || 0,
            remainingAmount: emi.remainingAmount || 0
          });
        });
        
        // Sort by due date (earliest first), then by status (overdue first)
        payments.sort((a, b) => {
          if (a.daysUntilDue < 0 && b.daysUntilDue >= 0) return -1;
          if (a.daysUntilDue >= 0 && b.daysUntilDue < 0) return 1;
          return a.daysUntilDue - b.daysUntilDue;
        });
        
        setUpcomingPayments(payments);
      }
    } catch (error) {
      console.error("Error fetching EMI payments:", error);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchUpcomingPayments();
  }, [fetchDashboardData, fetchUpcomingPayments]);



  // Calculate total savings (sum of all-time income only)
  const getTotalSavings = useCallback(() => {
    if (!dashboardData?.summary?.totalSavings) return 0;
    
    return dashboardData.summary.totalSavings;
  }, [dashboardData]);



  const getChartData = () => {
    if (!dashboardData?.monthlyTrend) return null;

    const labels = dashboardData.monthlyTrend.map((item) => item.month);
    const incomeData = dashboardData.monthlyTrend.map((item) => item.income);
    const expenseData = dashboardData.monthlyTrend.map((item) => item.expenses);

    return {
      labels,
              datasets: [
          {
            label: "Monthly Income",
            data: incomeData,
            borderColor: "#22C55E", // Green for income
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            borderWidth: 2, // Thinner lines
            tension: 0.4,
            pointBackgroundColor: "#22C55E",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: "Monthly Expenses",
            data: expenseData,
            borderColor: "#EC4899", // Pink
            backgroundColor: "rgba(236, 72, 153, 0.15)",
            borderWidth: 2, // Thinner lines
            tension: 0.4,
            pointBackgroundColor: "#EC4899",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
    };
  };





  if (loading) {
    return (
      <div className="content">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <i className="tim-icons icon-refresh-02 fa-spin" style={{ fontSize: '2rem', color: '#8B5CF6' }} />
            <h5 className="mt-3">Loading Dashboard...</h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>

      <div className="content">



        {/* Financial Overview Cards */}
        <Row className="mb-4">
          <Col lg="4" md="6" sm="12" className="mb-3">
            <Card className="card-stats" style={{ 
              background: 'linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(236, 72, 153, 0.2)',
              transition: 'all 0.3s ease'
            }}>
              <CardBody className="p-4">
                <Row className="align-items-center">
                  <Col xs="4">
                    <div className="icon-big text-center" style={{ 
                      background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
                      borderRadius: '50%',
                      width: '60px',
                      height: '60px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
                    }}>
                      <i className="tim-icons icon-chart-pie-36" style={{ color: '#fff', fontSize: '1.5rem' }} />
                    </div>
                  </Col>
                  <Col xs="8">
                    <div className="numbers">
                      <p className="card-category mb-1" style={{ 
                        fontSize: '0.875rem', 
                        color: '#EC4899',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Monthly EMI Expenses
                      </p>
                      <CardTitle tag="h4" style={{ 
                        fontSize: '1.5rem', 
                        color: '#EC4899',
                        fontWeight: '700',
                        marginBottom: '0'
                      }}>
                        ₹{dashboardData?.summary?.totalExpenses?.toFixed(2) || "0.00"}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          
          <Col lg="4" md="6" sm="12" className="mb-3">
            <Card className="card-stats" style={{ 
              background: 'linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(34, 197, 94, 0.2)',
              transition: 'all 0.3s ease'
            }}>
              <CardBody className="p-4">
                <Row className="align-items-center">
                  <Col xs="4">
                    <div className="icon-big text-center" style={{ 
                      background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                      borderRadius: '50%',
                      width: '60px',
                      height: '60px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
                    }}>
                      <i className="tim-icons icon-money-coins" style={{ color: '#fff', fontSize: '1.5rem' }} />
                    </div>
                  </Col>
                  <Col xs="8">
                    <div className="numbers">
                      <p className="card-category mb-1" style={{ 
                        fontSize: '0.875rem', 
                        color: '#22C55E',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Monthly EMI Savings
                      </p>
                      <CardTitle tag="h4" style={{ 
                        fontSize: '1.5rem', 
                        color: '#22C55E',
                        fontWeight: '700',
                        marginBottom: '0'
                      }}>
                        ₹{dashboardData?.summary?.monthlySavings?.toFixed(2) || "0.00"}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          
          <Col lg="4" md="12" sm="12" className="mb-3">
            <Card className="card-stats" style={{ 
              background: 'linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.2)',
              transition: 'all 0.3s ease'
            }}>
              <CardBody className="p-4">
                <Row className="align-items-center">
                  <Col xs="4">
                    <div className="icon-big text-center" style={{ 
                      background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                      borderRadius: '50%',
                      width: '60px',
                      height: '60px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
                    }}>
                      <i className="tim-icons icon-bank" style={{ color: '#fff', fontSize: '1.5rem' }} />
                    </div>
                  </Col>
                  <Col xs="8">
                    <div className="numbers">
                      <p className="card-category mb-1" style={{ 
                        fontSize: '0.875rem', 
                        color: '#3B82F6',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Total Savings
                      </p>
                      <CardTitle tag="h4" style={{ 
                        fontSize: '1.5rem', 
                        color: '#3B82F6',
                        fontWeight: '700',
                        marginBottom: '0'
                      }}>
                        ₹{getTotalSavings().toFixed(2)}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>



        {/* Upcoming Payments */}
        <Row className="mb-4">
          <Col xs="12">
            <Card className="card-stats" style={{ 
              background: 'linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease'
            }}>
              <CardHeader className="border-0 py-4" style={{ background: 'transparent' }}>
                <CardTitle tag="h5" className="mb-2" style={{ 
                  fontWeight: '700',
                  color: '#ffffff',
                  fontSize: '1.4rem',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  <i className="tim-icons icon-bell-55 mr-3" style={{ 
                    color: '#8B5CF6',
                    fontSize: '1.2rem',
                    filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.4))'
                  }} />
                  Upcoming Payments
                </CardTitle>
                <small className="text-white-50" style={{ 
                  fontSize: '0.9rem',
                  opacity: 0.8,
                  fontWeight: '500'
                }}>All EMI payments with progress and due dates</small>
              </CardHeader>
              <CardBody className="py-3">
                {upcomingPayments.length > 0 ? (
                  <Row>
                    {upcomingPayments.map((payment, index) => (
                      <Col key={index} xs="12" sm="6" className="mb-3">
                        <div className="d-flex align-items-center p-3 rounded" style={{ 
                          background: payment.isIncome ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(22, 163, 74, 0.15) 100%)' : 
                                   payment.daysUntilDue < 0 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.15) 100%)' : 
                                   payment.daysUntilDue <= 7 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.15) 100%)' : 
                                   payment.daysUntilDue <= 14 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.15) 100%)' : 
                                   'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(124, 58, 237, 0.15) 100%)',
                          color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#8B5CF6', 
                          height: '55px',
                          border: `2px solid ${payment.isIncome ? 'rgba(34, 197, 94, 0.5)' : payment.daysUntilDue < 0 ? 'rgba(239, 68, 68, 0.5)' : payment.daysUntilDue <= 7 ? 'rgba(239, 68, 68, 0.5)' : payment.daysUntilDue <= 14 ? 'rgba(245, 158, 11, 0.5)' : 'rgba(139, 92, 246, 0.5)'}`,
                          borderRadius: '12px',
                          boxShadow: `0 4px 16px ${payment.isIncome ? 'rgba(34, 197, 94, 0.3)' : payment.daysUntilDue < 0 ? 'rgba(239, 68, 68, 0.3)' : payment.daysUntilDue <= 7 ? 'rgba(239, 68, 68, 0.3)' : payment.daysUntilDue <= 14 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(139, 92, 246, 0.3)'}, 0 2px 8px rgba(0, 0, 0, 0.2)`,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          backdropFilter: 'blur(8px)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = `0 8px 24px ${payment.isIncome ? 'rgba(34, 197, 94, 0.4)' : payment.daysUntilDue < 0 ? 'rgba(239, 68, 68, 0.4)' : payment.daysUntilDue <= 7 ? 'rgba(239, 68, 68, 0.4)' : payment.daysUntilDue <= 14 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(139, 92, 246, 0.4)'}, 0 4px 16px rgba(0, 0, 0, 0.3)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = `0 4px 16px ${payment.isIncome ? 'rgba(34, 197, 94, 0.3)' : payment.daysUntilDue < 0 ? 'rgba(239, 68, 68, 0.3)' : payment.daysUntilDue <= 7 ? 'rgba(239, 68, 68, 0.3)' : payment.daysUntilDue <= 14 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(139, 92, 246, 0.3)'}, 0 2px 8px rgba(0, 0, 0, 0.2)`;
                        }}>
                          <div className="mr-3">
                            <div style={{
                              background: payment.isIncome ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' : 
                                         payment.daysUntilDue < 0 ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 
                                         payment.daysUntilDue <= 7 ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 
                                         payment.daysUntilDue <= 14 ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 
                                         'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 2px 8px ${payment.isIncome ? 'rgba(34, 197, 94, 0.4)' : payment.daysUntilDue < 0 ? 'rgba(239, 68, 68, 0.4)' : payment.daysUntilDue <= 7 ? 'rgba(239, 68, 68, 0.4)' : payment.daysUntilDue <= 14 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(139, 92, 246, 0.4)'}`
                            }}>
                              <i className={`tim-icons icon-${payment.isIncome ? 'money-coins' : payment.type === 'savings_emi' ? 'money-coins' : 'credit-card'}`} style={{ 
                                color: '#ffffff', 
                                fontSize: '0.9rem',
                                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
                              }} />
                            </div>
                          </div>
                          <div className="flex-grow-1 mr-3" style={{ minWidth: '0' }}>
                            <div className="d-flex flex-column">
                              <span style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: '600',
                                color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#8B5CF6',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                lineHeight: '1.2'
                              }}>
                                {payment.name}
                              </span>
                              <span style={{ 
                                fontSize: '0.65rem', 
                                color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#8B5CF6', 
                                opacity: 0.9,
                                fontWeight: '500'
                              }}>
                                {(payment.daysUntilDue < 0 ? 'Overdue' : 
                                  payment.daysUntilDue === 0 ? 'Today' : 
                                  payment.daysUntilDue === 1 ? 'Tomorrow' : 
                                  `${payment.daysUntilDue}d`) + ' • ' + format(new Date(payment.dueDate), "MMM dd")}
                              </span>
                            </div>
                          </div>
                          
                          <div className="ml-auto text-right">
                            <div style={{ background: 'transparent', padding: 0, border: 'none', boxShadow: 'none' }}>
                              <span style={{ 
                                fontSize: '1rem', 
                                fontWeight: 700,
                                color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#8B5CF6',
                                letterSpacing: '0.2px',
                                fontFeatureSettings: '"tnum" 1, "lnum" 1'
                              }}>
                                ₹{payment.amount?.toLocaleString() || '0'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>  
                ) : (
                  <div className="text-center py-5">
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%)',
                      borderRadius: '50%',
                      width: '80px',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                      boxShadow: '0 8px 24px rgba(34, 197, 94, 0.3)'
                    }}>
                      <i className="tim-icons icon-check-2" style={{ 
                        fontSize: '2rem', 
                        color: '#22C55E',
                        filter: 'drop-shadow(0 2px 4px rgba(34, 197, 94, 0.4))'
                      }} />
                    </div>
                    <h6 className="mt-2 mb-2" style={{ 
                      fontSize: '1.1rem', 
                      color: '#22C55E',
                      fontWeight: '700',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                    }}>No upcoming payments</h6>
                    <small style={{ 
                      fontSize: '0.85rem', 
                      color: '#ffffff',
                      opacity: 0.8,
                      fontWeight: '500'
                    }}>You're all caught up! 🎉</small>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Chart */}
        <Row className="mb-4">
          <Col xs="12">
            <Card className="card-chart" style={{ 
              background: 'linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease'
            }}>
              <CardHeader className="border-0 py-3" style={{ background: 'transparent' }}>
                <Row>
                  <Col className="text-left" sm="12">
                    <h6 className="card-category mb-1" style={{ 
                      fontSize: '0.875rem', 
                      color: '#ffffff',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      EMI Overview
                    </h6>
                    <CardTitle tag="h4" style={{ 
                      fontSize: '1.5rem', 
                      marginBottom: '0',
                      fontWeight: '700',
                      color: '#ffffff'
                    }}>
                      EMI Payments vs Income
                    </CardTitle>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  {getChartData() && (
                    <Line
                      data={getChartData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: "rgba(255, 255, 255, 0.1)",
                              drawBorder: false,
                            },
                            ticks: {
                              callback: function (value) {
                                return "₹" + value.toFixed(2);
                              },
                              color: "#ffffff",
                              font: {
                                size: 11,
                                weight: "500",
                              },
                            },
                          },
                          x: {
                            grid: {
                              color: "rgba(255, 255, 255, 0.1)",
                              drawBorder: false,
                            },
                            ticks: {
                              color: "#ffffff",
                              font: {
                                size: 11,
                                weight: "500",
                              },
                            },
                          },
                        },
                        plugins: {
                          legend: {
                            position: "top",
                            labels: {
                              usePointStyle: true,
                              padding: 20,
                              color: "#ffffff",
                              font: {
                                size: 12,
                                weight: "600",
                              },
                            },
                          },
                        },
                        elements: {
                          point: {
                            hoverBorderWidth: 3,
                          },
                        },
                      }}
                      height={300}
                    />
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>



        {/* Recent Transactions */}
        <Row>
          <Col xs="12">
            <Card style={{ 
              background: 'linear-gradient(135deg, #1e1e2d 0%, #2d2b42 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease'
            }}>
              <CardHeader className="border-0 py-3" style={{ background: 'transparent' }}>
                <Row>
                  <Col className="text-left" sm="6">
                    <CardTitle tag="h4" style={{ 
                      fontWeight: '700',
                      color: '#ffffff',
                      fontSize: '1.25rem'
                    }}>
                      <i className="tim-icons icon-money-coins mr-2" style={{ color: '#6366F1' }} />
                      Recent Transactions
                    </CardTitle>
                    <small className="text-white-50" style={{ fontSize: '0.875rem' }}>Your latest financial activities for current month</small>
                  </Col>
                  <Col className="text-right" sm="6">
                    <Button
                      className="btn-round btn-icon btn-icon-mini btn-neutral float-right"
                      color="default"
                      onClick={() => window.location.href = "/admin/transactions"}
                      style={{
                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                      }}
                    >
                      <i className="tim-icons icon-money-coins" />
                    </Button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody className="py-3" style={{ background: 'transparent' }}>
                <div className="table-responsive">
                  <Table className="tablesorter" style={{ 
                    minWidth: '600px',
                    color: '#ffffff'
                  }}>
                    <thead>
                      <tr style={{ 
                        background: 'linear-gradient(135deg, rgba(29, 140, 248, 0.1) 0%, rgba(52, 70, 117, 0.1) 100%)',
                        borderBottom: '2px solid rgba(29, 140, 248, 0.3)'
                      }}>
                        <th style={{ 
                          minWidth: '120px', 
                          color: '#6366F1',
                          fontWeight: '600',
                          borderBottom: 'none'
                        }}>Date</th>
                        <th style={{ 
                          minWidth: '100px', 
                          color: '#6366F1',
                          fontWeight: '600',
                          borderBottom: 'none'
                        }}>Type</th>
                        <th style={{ 
                          minWidth: '250px', 
                          color: '#6366F1',
                          fontWeight: '600',
                          borderBottom: 'none'
                        }}>Description</th>
                        <th style={{ 
                          minWidth: '120px', 
                          color: '#6366F1',
                          fontWeight: '600',
                          borderBottom: 'none'
                        }} className="text-center">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData?.recentTransactions?.map((transaction, index) => (
                        <tr key={transaction._id} style={{ 
                          background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          transition: 'all 0.3s ease'
                        }}>
                          <td style={{ 
                            verticalAlign: 'top', 
                            wordWrap: 'break-word',
                            color: '#ffffff',
                            padding: '12px 8px'
                          }}>{format(new Date(transaction.date), "MMM dd, yyyy")}</td>
                          <td style={{ 
                            verticalAlign: 'top', 
                            wordWrap: 'break-word',
                            padding: '12px 8px'
                          }}>
                            <Badge
                              color={
                                transaction.type === "income" ? "success" : "danger"
                              }
                              style={{
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                borderRadius: '12px'
                              }}
                            >
                              {transaction.type === "income" ? "Income" : "Expense"}
                            </Badge>
                          </td>
                          <td style={{ 
                            verticalAlign: 'top', 
                            wordWrap: 'break-word',
                            color: '#ffffff',
                            padding: '12px 8px'
                          }}>{transaction.description}</td>
                          <td className="text-center" style={{ 
                            verticalAlign: 'top', 
                            wordWrap: 'break-word',
                            padding: '12px 8px'
                          }}>
                            <span
                              className={
                                transaction.type === "income"
                                  ? "text-success"
                                  : "text-danger"
                              }
                              style={{ 
                                fontWeight: "bold",
                                fontSize: '0.9rem'
                              }}
                            >
                              ₹{transaction.amount.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default Dashboard;
