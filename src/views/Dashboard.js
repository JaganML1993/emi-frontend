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

      const response = await api.get("/api/reports/upcoming-payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data.success && response.data.data.emiBreakdown) {
        const payments = [];
        response.data.data.emiBreakdown.forEach(type => {
          type.emis.forEach(emi => {
            // Include all EMIs except full payment type, including savings_emi
            // For savings_emi, also check if they have a nextDueDate or use endDate as fallback
            const hasValidDate = emi.nextDueDate || (type.type === 'savings_emi' && emi.endDate);
            if (emi.status === 'active' && hasValidDate && emi.paymentType !== 'full_payment') {
              // Use nextDueDate if available, otherwise use endDate for savings_emi
              const dateToUse = emi.nextDueDate || (type.type === 'savings_emi' ? emi.endDate : null);
              if (!dateToUse) return; // Skip if no valid date
              
              const dueDate = new Date(dateToUse);
              const today = new Date();
              // Reset time to start of day for accurate comparison
              today.setHours(0, 0, 0, 0);
              dueDate.setHours(0, 0, 0, 0);
              const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
              
              // Get current month end date
              const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              const daysUntilMonthEnd = Math.ceil((currentMonthEnd - today) / (1000 * 60 * 60 * 24));
              
              if (daysUntilDue <= 0 || (daysUntilDue > 0 && daysUntilDue <= daysUntilMonthEnd)) { // Show overdue payments and current month payments only
                payments.push({
                  name: emi.name,
                  dueDate: dateToUse,
                  amount: emi.emiAmount,
                  daysUntilDue: daysUntilDue,
                  type: type.type,
                  isIncome: type.type === 'income_emi' || type.type === 'savings_emi' || type.type.includes('income') || type.type.includes('savings') // Flag for income EMIs
                });
              }
            }
          });
        });
        
        // Sort by due date (earliest first)
        payments.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
        setUpcomingPayments(payments);
      }
    } catch (error) {
      console.error("Error fetching upcoming payments:", error);
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
              <CardHeader className="border-0 py-3" style={{ background: 'transparent' }}>
                <CardTitle tag="h5" className="mb-1" style={{ 
                  fontWeight: '700',
                  color: '#ffffff',
                  fontSize: '1.25rem'
                }}>
                  <i className="tim-icons icon-bell-55 mr-2" style={{ color: '#8B5CF6' }} />
                  Upcoming Payments
                </CardTitle>
                <small className="text-white-50" style={{ fontSize: '0.875rem' }}>Overdue and upcoming EMI payments</small>
              </CardHeader>
              <CardBody className="py-3">
                {upcomingPayments.length > 0 ? (
                  <Row>
                    {upcomingPayments.map((payment, index) => (
                      <Col key={index} xs="12" sm="6" className="mb-1">
                        <div className="d-flex align-items-center p-2 rounded" style={{ 
                          background: payment.isIncome ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%)' : 
                                   payment.daysUntilDue < 0 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)' : 
                                   payment.daysUntilDue <= 7 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)' : 
                                   payment.daysUntilDue <= 14 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)' : 
                                   'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
                          color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#8B5CF6', 
                          height: '45px',
                                                      border: `1px solid ${payment.isIncome ? 'rgba(34, 197, 94, 0.4)' : payment.daysUntilDue < 0 ? 'rgba(239, 68, 68, 0.4)' : payment.daysUntilDue <= 7 ? 'rgba(239, 68, 68, 0.4)' : payment.daysUntilDue <= 14 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(139, 92, 246, 0.4)'}`,
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}>
                          <div className="mr-2">
                            <i className={`tim-icons icon-${payment.isIncome ? 'money-coins' : payment.type === 'savings_emi' ? 'money-coins' : 'credit-card'}`} style={{ color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#8B5CF6', fontSize: '0.7rem' }} />
                          </div>
                          <div className="flex-grow-1 mr-2" style={{ minWidth: '0' }}>
                            <div className="d-flex align-items-center">
                              <span style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: '600',
                                color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#8B5CF6',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {payment.name}
                              </span>
                              <span className="ml-1" style={{ 
                                fontSize: '0.6rem', 
                                color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#8B5CF6', 
                                opacity: 0.7 
                              }}>
                                ({payment.isIncome ? 'Income' : payment.type.replace('_', ' ')})
                              </span>
                            </div>
                          </div>
                          <div className="mr-2 text-center">
                            <span className={`badge badge-${payment.daysUntilDue < 0 ? 'danger' : payment.daysUntilDue <= 7 ? 'danger' : payment.daysUntilDue <= 14 ? 'warning' : 'info'}`} style={{ 
                              fontSize: '0.55rem',
                              padding: '2px 6px',
                              borderRadius: '10px'
                            }}>
                              {payment.daysUntilDue < 0 ? 'Overdue' : 
                               payment.daysUntilDue === 0 ? 'Today' : 
                               payment.daysUntilDue === 1 ? 'Tomorrow' : 
                               `${payment.daysUntilDue}d`}
                            </span>
                          </div>
                          <div className="mr-2 text-center">
                            <small style={{ 
                              color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#6366F1', 
                              opacity: 0.8, 
                              fontSize: '0.6rem',
                              fontWeight: '500'
                            }}>
                              {format(new Date(payment.dueDate), "MMM dd")}
                            </small>
                          </div>
                          <div className="text-center">
                            <span style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: '700',
                              color: payment.isIncome ? '#22C55E' : payment.daysUntilDue < 0 ? '#EF4444' : payment.daysUntilDue <= 7 ? '#EF4444' : payment.daysUntilDue <= 14 ? '#F59E0B' : '#6366F1'
                            }}>
                              ₹{payment.amount?.toLocaleString() || "0"}
                            </span>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>  
                ) : (
                  <div className="text-center py-2">
                    <i className="tim-icons icon-check-2 text-success" style={{ fontSize: '1.5rem' }} />
                    <h6 className="mt-1 mb-1" style={{ fontSize: '0.9rem', color: '#22C55E' }}>No upcoming payments</h6>
                    <small className="text-white-50" style={{ fontSize: '0.75rem' }}>You're all caught up!</small>
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
