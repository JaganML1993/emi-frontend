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

      const response = await api.get("/api/reports/emi-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data.success && response.data.data.emiBreakdown) {
        console.log("EMI Summary API Response:", response.data.data);
        const payments = [];
        response.data.data.emiBreakdown.forEach(type => {
          console.log(`Processing EMI type: ${type.type}`, type.emis);
          console.log(`Type: ${type.type}, Count: ${type.emis.length}`);
          type.emis.forEach(emi => {
            // Special debug for Suresh Cheetu
            if (emi.name.includes('Suresh') || emi.name.includes('Cheetu')) {
              console.log('🔍 FOUND SURESH CHEETU EMI:', {
                name: emi.name,
                status: emi.status,
                nextDueDate: emi.nextDueDate,
                nextDueDateType: typeof emi.nextDueDate,
                nextDueDateValue: emi.nextDueDate
              });
            }
            console.log(`Processing EMI: ${emi.name}`, {
              status: emi.status,
              nextDueDate: emi.nextDueDate,
              hasNextDueDate: !!emi.nextDueDate
            });
            
            if (emi.status === 'active' && emi.nextDueDate) {
              const dueDate = new Date(emi.nextDueDate);
              const today = new Date();
              // Reset time to start of day for accurate comparison
              today.setHours(0, 0, 0, 0);
              dueDate.setHours(0, 0, 0, 0);
              const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
              
              console.log(`EMI ${emi.name}: dueDate=${dueDate.toISOString()}, today=${today.toISOString()}, daysUntilDue=${daysUntilDue}, type=${type.type}, isIncome=${type.type === 'income_emi'}`);
              
              if (daysUntilDue >= -30) { // Show overdue payments (up to 30 days) and future payments
                console.log(`Adding EMI ${emi.name} to payments with daysUntilDue=${daysUntilDue}`);
                payments.push({
                  name: emi.name,
                  dueDate: emi.nextDueDate,
                  amount: emi.emiAmount,
                  daysUntilDue: daysUntilDue,
                  type: type.type,
                  isIncome: type.type === 'income_emi' || type.type === 'savings_emi' || type.type.includes('income') || type.type.includes('savings') // Flag for income EMIs
                });
              } else {
                console.log(`EMI ${emi.name} not added: daysUntilDue=${daysUntilDue} < -30`);
              }
            } else {
              console.log(`EMI ${emi.name} not processed: status=${emi.status}, hasNextDueDate=${!!emi.nextDueDate}, nextDueDate=${emi.nextDueDate}, type=${type.type}`);
            }
          });
        });
        
        console.log("Final payments array:", payments);
        console.log("EMI types found:", response.data.data.emiBreakdown.map(t => t.type));
        console.log("Income EMIs found:", payments.filter(p => p.isIncome));
        
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
          borderColor: "#00D4AA", // Rich emerald green
          backgroundColor: "rgba(0, 212, 170, 0.15)",
          borderWidth: 2, // Thinner lines
          tension: 0.4,
          pointBackgroundColor: "#00D4AA",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Monthly Expenses",
          data: expenseData,
          borderColor: "#FF6B9D", // Rich coral pink
          backgroundColor: "rgba(255, 107, 157, 0.15)",
          borderWidth: 2, // Thinner lines
          tension: 0.4,
          pointBackgroundColor: "#FF6B9D",
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
            <i className="tim-icons icon-refresh-02 fa-spin" style={{ fontSize: '2rem', color: '#1d8cf8' }} />
            <h5 className="mt-3">Loading Dashboard...</h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>

      <div className="content">



        {/* Summary Cards */}
        <Row>
          <Col lg="6" md="6" sm="12">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-danger">
                      <i className="tim-icons icon-chart-pie-36" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category" style={{ fontSize: '0.875rem' }}>Monthly EMI Expenses</p>
                      <CardTitle tag="h4" style={{ fontSize: '1.25rem' }}>
                        ₹{dashboardData?.summary?.totalExpenses?.toFixed(2) || "0.00"}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="6" md="6" sm="12">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-success">
                      <i className="tim-icons icon-money-coins"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category" style={{ fontSize: '0.875rem' }}>Total Savings</p>
                      <CardTitle tag="h4" style={{ fontSize: '1.25rem' }}>
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
        <Row>
          <Col xs="12">
            <Card className="bg-dark text-white">
              <CardHeader className="bg-dark border-0 py-2">
                <CardTitle tag="h5" className="text-white mb-0">
                  <i className="tim-icons icon-bell-55 mr-2" />
                  Upcoming Payments
                </CardTitle>
                <small className="text-white-50">Overdue and upcoming EMI payments</small>
              </CardHeader>
              <CardBody className="bg-dark py-2">
                {upcomingPayments.length > 0 ? (
                  <Row>
                    {upcomingPayments.map((payment, index) => (
                      <Col key={index} xs="12" sm="6" className="mb-2">
                        <div className="d-flex align-items-center p-2 rounded" style={{ 
                          backgroundColor: payment.isIncome ? 'rgba(32, 201, 151, 0.6)' : payment.daysUntilDue < 0 ? 'rgba(220, 53, 69, 0.6)' : payment.daysUntilDue <= 7 ? 'rgba(220, 53, 69, 0.6)' : payment.daysUntilDue <= 14 ? 'rgba(255, 193, 7, 0.6)' : 'rgba(23, 162, 184, 0.6)', 
                          color: payment.isIncome ? '#fff' : payment.daysUntilDue <= 14 ? '#000' : '#fff', 
                          minHeight: '50px',
                          backdropFilter: 'blur(15px)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div className="mr-3">
                            <i className={`tim-icons icon-${payment.isIncome ? 'money-coins' : payment.type === 'savings_emi' ? 'money-coins' : 'credit-card'}`} style={{ color: payment.isIncome ? '#fff' : payment.daysUntilDue <= 14 ? '#000' : '#fff', fontSize: '0.8rem' }} />
                          </div>
                          <div className="flex-grow-1 mr-3">
                            <h6 className="mb-0" style={{ fontSize: '0.8rem', color: payment.isIncome ? '#fff' : payment.daysUntilDue <= 14 ? '#000' : '#fff' }}>{payment.name}</h6>
                            <small className="text-capitalize" style={{ fontSize: '0.65rem', color: payment.isIncome ? '#fff' : payment.daysUntilDue <= 14 ? '#000' : '#fff', opacity: 0.8 }}>
                              {payment.isIncome ? 'Income EMI' : payment.type.replace('_', ' ')}
                            </small>
                          </div>
                          <div className="mr-3 text-center">
                            <span className={`badge badge-${payment.isIncome ? 'success' : payment.daysUntilDue < 0 ? 'danger' : payment.daysUntilDue <= 7 ? 'danger' : payment.daysUntilDue <= 14 ? 'warning' : 'info'}`} style={{ fontSize: '0.6rem' }}>
                              {payment.isIncome ? 'Income' : payment.daysUntilDue < 0 ? 'Overdue' : 
                               payment.daysUntilDue === 0 ? 'Today' : 
                               payment.daysUntilDue === 1 ? 'Tomorrow' : 
                               `${payment.daysUntilDue}d`}
                            </span>
                          </div>
                          <div className="mr-3 text-center">
                            <small style={{ color: payment.isIncome ? '#fff' : payment.daysUntilDue <= 14 ? '#000' : '#fff', opacity: 0.8, fontSize: '0.65rem' }}>
                              {format(new Date(payment.dueDate), "MMM dd")}
                            </small>
                          </div>
                          <div className="text-center">
                            <h6 className="mb-0" style={{ fontSize: '0.9rem', color: payment.isIncome ? '#fff' : payment.daysUntilDue <= 14 ? '#000' : '#fff' }}>₹{payment.amount?.toLocaleString() || "0"}</h6>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center py-2">
                    <i className="tim-icons icon-check-2 text-success" style={{ fontSize: '1.5rem' }} />
                    <h6 className="mt-1 text-white mb-1" style={{ fontSize: '0.9rem' }}>No upcoming payments</h6>
                    <small className="text-white-50" style={{ fontSize: '0.75rem' }}>You're all caught up!</small>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Chart */}
        <Row>
          <Col xs="12">
            <Card className="card-chart">
              <CardHeader>
                <Row>
                  <Col className="text-left" sm="12">
                    <h6 className="card-category" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>EMI Overview</h6>
                    <CardTitle tag="h4" style={{ fontSize: '1.25rem', marginBottom: '0' }}>EMI Payments vs Income</CardTitle>
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
            <Card>
              <CardHeader>
                <Row>
                  <Col className="text-left" sm="6">
                    <CardTitle tag="h4">Recent Transactions</CardTitle>
                    <p className="card-category">Your latest financial activities for current month</p>
                  </Col>
                  <Col className="text-right" sm="6">
                    <Button
                      className="btn-round btn-icon btn-icon-mini btn-neutral float-right"
                      color="default"
                      onClick={() => window.location.href = "/admin/transactions"}
                    >
                      <i className="tim-icons icon-money-coins" />
                    </Button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <Table className="tablesorter" style={{ minWidth: '600px' }}>
                    <thead className="text-primary">
                      <tr>
                        <th style={{ minWidth: '120px' }}>Date</th>
                        <th style={{ minWidth: '100px' }}>Type</th>
                        <th style={{ minWidth: '250px' }}>Description</th>
                        <th style={{ minWidth: '120px' }} className="text-center">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData?.recentTransactions?.map((transaction) => (
                        <tr key={transaction._id}>
                          <td style={{ verticalAlign: 'top', wordWrap: 'break-word' }}>{format(new Date(transaction.date), "MMM dd, yyyy")}</td>
                          <td style={{ verticalAlign: 'top', wordWrap: 'break-word' }}>
                            <Badge
                              color={
                                transaction.type === "income" ? "success" : "danger"
                              }
                            >
                              {transaction.type === "income" ? "Income" : "Expense"}
                            </Badge>
                          </td>
                          <td style={{ verticalAlign: 'top', wordWrap: 'break-word' }}>{transaction.description}</td>
                          <td className="text-center" style={{ verticalAlign: 'top', wordWrap: 'break-word' }}>
                            <span
                              className={
                                transaction.type === "income"
                                  ? "text-success"
                                  : "text-danger"
                              }
                              style={{ fontWeight: "bold" }}
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
