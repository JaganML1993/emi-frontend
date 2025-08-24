import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
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
  const [period, setPeriod] = useState("month");

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get(`/api/reports/dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

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
              
              console.log(`EMI ${emi.name}: dueDate=${dueDate.toISOString()}, today=${today.toISOString()}, daysUntilDue=${daysUntilDue}`);
              
              if (daysUntilDue >= -30) { // Show overdue payments (up to 30 days) and future payments
                console.log(`Adding EMI ${emi.name} to payments with daysUntilDue=${daysUntilDue}`);
                payments.push({
                  name: emi.name,
                  dueDate: emi.nextDueDate,
                  amount: emi.emiAmount,
                  daysUntilDue: daysUntilDue,
                  type: type.type
                });
              } else {
                console.log(`EMI ${emi.name} not added: daysUntilDue=${daysUntilDue} < -30`);
              }
            } else {
              console.log(`EMI ${emi.name} not processed: status=${emi.status}, hasNextDueDate=${!!emi.nextDueDate}, nextDueDate=${emi.nextDueDate}`);
            }
          });
        });
        
        console.log("Final payments array:", payments);
        
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

  const getChartData = () => {
    if (!dashboardData?.monthlyTrend) return null;

    const labels = dashboardData.monthlyTrend.map((item) => item.month);
    const incomeData = dashboardData.monthlyTrend.map((item) => item.income);
    const expenseData = dashboardData.monthlyTrend.map((item) => item.expenses);

    return {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          borderColor: "#00d25b",
          backgroundColor: "rgba(0, 210, 91, 0.1)",
          tension: 0.4,
        },
        {
          label: "EMI Payments",
          data: expenseData,
          borderColor: "#fd5d93",
          backgroundColor: "rgba(253, 93, 147, 0.1)",
          tension: 0.4,
        },
      ],
    };
  };



  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="content">
        {/* Summary Cards */}
        <Row>
          <Col lg="3" md="6" sm="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-success">
                      <i className="tim-icons icon-money-coins" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Total Income</p>
                      <CardTitle tag="h3">
                        ${dashboardData?.summary?.totalIncome?.toFixed(2) || "0.00"}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6" sm="6">
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
                      <p className="card-category">Total Expenses</p>
                      <CardTitle tag="h3">
                        ${dashboardData?.summary?.totalExpenses?.toFixed(2) || "0.00"}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6" sm="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-info">
                      <i className="tim-icons icon-wallet-43" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Net Amount</p>
                      <CardTitle tag="h3">
                        ${dashboardData?.summary?.netAmount?.toFixed(2) || "0.00"}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6" sm="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="tim-icons icon-chart-bar-32" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Period</p>
                      <CardTitle tag="h3">
                        {period.charAt(0).toUpperCase() + period.slice(1)}
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
                        <div className="d-flex align-items-center p-2 border border-secondary rounded" style={{ backgroundColor: payment.daysUntilDue < 0 ? '#dc3545' : payment.daysUntilDue <= 7 ? '#dc3545' : payment.daysUntilDue <= 14 ? '#ffc107' : '#17a2b8', color: payment.daysUntilDue <= 14 ? '#000' : '#fff', minHeight: '50px' }}>
                          <div className="mr-3">
                            <i className={`tim-icons icon-${payment.type === 'savings_emi' ? 'money-coins' : 'credit-card'}`} style={{ color: payment.daysUntilDue <= 14 ? '#000' : '#fff', fontSize: '0.8rem' }} />
                          </div>
                          <div className="flex-grow-1 mr-3">
                            <h6 className="mb-0" style={{ fontSize: '0.8rem', color: payment.daysUntilDue <= 14 ? '#000' : '#fff' }}>{payment.name}</h6>
                            <small className="text-capitalize" style={{ fontSize: '0.65rem', color: payment.daysUntilDue <= 14 ? '#000' : '#fff', opacity: 0.8 }}>
                              {payment.type.replace('_', ' ')}
                            </small>
                          </div>
                          <div className="mr-3 text-center">
                            <span className={`badge badge-${payment.daysUntilDue < 0 ? 'danger' : payment.daysUntilDue <= 7 ? 'danger' : payment.daysUntilDue <= 14 ? 'warning' : 'info'}`} style={{ fontSize: '0.6rem' }}>
                              {payment.daysUntilDue < 0 ? 'Overdue' : 
                               payment.daysUntilDue === 0 ? 'Today' : 
                               payment.daysUntilDue === 1 ? 'Tomorrow' : 
                               `${payment.daysUntilDue}d`}
                            </span>
                          </div>
                          <div className="mr-3 text-center">
                            <small style={{ color: payment.daysUntilDue <= 14 ? '#000' : '#fff', opacity: 0.8, fontSize: '0.65rem' }}>
                              {format(new Date(payment.dueDate), "MMM dd")}
                            </small>
                          </div>
                          <div className="text-center">
                            <h6 className="mb-0" style={{ fontSize: '0.9rem', color: payment.daysUntilDue <= 14 ? '#000' : '#fff' }}>₹{payment.amount?.toLocaleString() || "0"}</h6>
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

        {/* Period Selector and Chart */}
        <Row>
          <Col xs="12">
            <Card className="card-chart">
              <CardHeader>
                <Row>
                  <Col className="text-left" sm="6">
                    <h5 className="card-category">EMI Overview</h5>
                    <CardTitle tag="h2">EMI Payments vs Income</CardTitle>
                  </Col>
                  <Col sm="6">
                    <Form className="d-flex justify-content-end">
                      <FormGroup className="mb-0">
                        <Label className="mr-2">Period:</Label>
                        <Input
                          type="select"
                          value={period}
                          onChange={(e) => setPeriod(e.target.value)}
                        >
                          <option value="week">Week</option>
                          <option value="month">Month</option>
                          <option value="year">Year</option>
                        </Input>
                      </FormGroup>
                    </Form>
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
                            ticks: {
                              callback: function (value) {
                                return "$" + value.toFixed(2);
                              },
                            },
                          },
                        },
                        plugins: {
                          legend: {
                            position: "top",
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
                    <p className="card-category">Your latest financial activities</p>
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
                <Table className="tablesorter" style={{ width: '100%', tableLayout: 'fixed' }}>
                  <thead className="text-primary">
                    <tr>
                      <th style={{ width: '20%' }}>Date</th>
                      <th style={{ width: '15%' }}>Type</th>
                      <th style={{ width: '50%' }}>Description</th>
                      <th style={{ width: '15%' }} className="text-center">Amount</th>
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
                            ${transaction.amount.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default Dashboard;
