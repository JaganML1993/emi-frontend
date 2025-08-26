import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  FormGroup,
  Label,
  Input,
  Table,
  Badge,
  Progress,
} from "reactstrap";
import { Line, Doughnut } from "react-chartjs-2";
import { format } from "date-fns";
import api from "../config/axios";

function Reports() {
  const [dashboardData, setDashboardData] = useState(null);
  const [spendingData, setSpendingData] = useState(null);
  const [incomeData, setIncomeData] = useState(null);
  const [emiSummaryData, setEmiSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
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

  const fetchSpendingData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const params = { ...filters };
      const response = await api.get("/api/reports/spending", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setSpendingData(response.data.data);
    } catch (error) {
      console.error("Error fetching spending data:", error);
    }
  }, [filters]);

  const fetchIncomeData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const params = { ...filters };
      const response = await api.get("/api/reports/income", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setIncomeData(response.data.data);
    } catch (error) {
      console.error("Error fetching income data:", error);
    }
  }, [filters]);

  const fetchEmiSummaryData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/reports/emi-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmiSummaryData(response.data.data);
    } catch (error) {
      console.error("Error fetching EMI summary data:", error);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchSpendingData();
    fetchIncomeData();
    fetchEmiSummaryData();
  }, [fetchDashboardData, fetchSpendingData, fetchIncomeData, fetchEmiSummaryData]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const getChartData = (data, type) => {
    if (!data) return null;

    const labels = data.map((item) => item.month);
    const incomeData = data.map((item) => item.income);
    const expenseData = data.map((item) => item.expenses);
    const netData = data.map((item) => item.net);

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
          label: "Expenses",
          data: expenseData,
          borderColor: "#fd5d93",
          backgroundColor: "rgba(253, 93, 147, 0.1)",
          tension: 0.4,
        },
        {
          label: "Net",
          data: netData,
          borderColor: "#1d8cf8",
          backgroundColor: "rgba(29, 140, 248, 0.1)",
          tension: 0.4,
        },
      ],
    };
  };

  const getSpendingChartData = () => {
    if (!spendingData?.categoryBreakdown) return null;

    const labels = spendingData.categoryBreakdown.map((item) => item.name);
    const data = spendingData.categoryBreakdown.map((item) => item.total);
    const colors = spendingData.categoryBreakdown.map((item) => item.color);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    };
  };

  const getIncomeChartData = () => {
    if (!incomeData?.categoryBreakdown) return null;

    const labels = incomeData.categoryBreakdown.map((item) => item.name);
    const data = incomeData.categoryBreakdown.map((item) => item.total);
    const colors = incomeData.categoryBreakdown.map((item) => item.color);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#fff",
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
        {/* Filters */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Report Filters</CardTitle>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col md="3">
                    <FormGroup>
                      <Label>Period</Label>
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
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange("startDate", e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                      />
                    </FormGroup>
                  </Col>

                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* EMI Payment Summary */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">EMI Payment Summary</CardTitle>
                <p className="card-category">
                  Track your EMI payments, total amount, and remaining balance
                </p>
              </CardHeader>
              <CardBody>
                {emiSummaryData ? (
                  <>
                    <Row>
                      <Col lg="3" md="6" sm="6" className="mb-3">
                        <div className="text-center">
                          <h3 className="text-primary">
                            ₹{emiSummaryData.summary.totalEMIAmount?.toLocaleString() || "0"}
                          </h3>
                          <p className="text-muted mb-0">Total EMI Amount</p>
                        </div>
                      </Col>
                      <Col lg="3" md="6" sm="6" className="mb-3">
                        <div className="text-center">
                          <h3 className="text-success">
                            ₹{emiSummaryData.summary.totalPaidAmount?.toLocaleString() || "0"}
                          </h3>
                          <p className="text-muted mb-0">Total Paid</p>
                        </div>
                      </Col>
                      <Col lg="3" md="6" sm="6" className="mb-3">
                        <div className="text-center">
                          <h3 className="text-warning">
                            ₹{emiSummaryData.summary.totalRemainingAmount?.toLocaleString() || "0"}
                          </h3>
                          <p className="text-muted mb-0">Remaining Amount</p>
                        </div>
                      </Col>
                      <Col lg="3" md="6" sm="6" className="mb-3">
                        <div className="text-center">
                          <h3 className="text-info">
                            {emiSummaryData.summary.activeEMICount || "0"}
                          </h3>
                          <p className="text-muted mb-0">Active EMIs</p>
                        </div>
                      </Col>
                    </Row>
                    
                    {/* Overall EMI Progress */}
                    <Row className="mt-4">
                      <Col xs="12">
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">Overall EMI Progress</h6>
                            <span className="text-muted">
                              {emiSummaryData.summary.totalEMIAmount > 0 ? ((emiSummaryData.summary.totalPaidAmount / emiSummaryData.summary.totalEMIAmount) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                          <Progress
                            value={emiSummaryData.summary.totalEMIAmount > 0 ? (emiSummaryData.summary.totalPaidAmount / emiSummaryData.summary.totalEMIAmount) * 100 : 0}
                            color="success"
                            className="mb-2"
                          />
                          <div className="d-flex justify-content-between small text-muted">
                            <span>₹{emiSummaryData.summary.totalPaidAmount?.toLocaleString() || "0"} paid</span>
                            <span>₹{emiSummaryData.summary.totalEMIAmount?.toLocaleString() || "0"} total</span>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p>Loading EMI summary...</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* EMI Quick Stats */}
        <Row>
          <Col lg="4" md="6" sm="6" className="mb-3">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="tim-icons icon-chart-pie-36"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">EMI Progress</p>
                      <h4 className="card-title">
                        {emiSummaryData?.summary.totalEMIAmount > 0 
                          ? ((emiSummaryData.summary.totalPaidAmount / emiSummaryData.summary.totalEMIAmount) * 100).toFixed(1) 
                          : 0}%
                      </h4>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4" md="6" sm="6" className="mb-3">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-success">
                      <i className="tim-icons icon-single-02"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Total EMIs</p>
                      <h4 className="card-title">{emiSummaryData?.summary.totalEMICount || 0}</h4>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4" md="6" sm="6" className="mb-3">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-info">
                      <i className="tim-icons icon-money-coins"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Monthly EMI Burden</p>
                      <h4 className="card-title">
                        ₹{emiSummaryData?.emiBreakdown?.reduce((sum, type) => 
                          sum + type.emis.reduce((typeSum, emi) => {
                            // Only include active EMIs with regular payment type (not full payment)
                            if (emi.status === 'active' && emi.paymentType === 'emi') {
                              return typeSum + (emi.emiAmount || 0);
                            }
                            return typeSum;
                          }, 0), 0
                        )?.toLocaleString() || "0"}
                      </h4>
                      <small className="text-muted">Active monthly EMIs only</small>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

                         {/* EMI Breakdown */}
        <Row>
          <Col lg="6" md="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">EMI Breakdown by Type</CardTitle>
                <p className="card-category">
                  Breakdown of your EMIs by category
                </p>
              </CardHeader>
              <CardBody>
                {emiSummaryData?.emiBreakdown ? (
                  <div>
                    {emiSummaryData.emiBreakdown.map((type, index) => (
                      <div key={index} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0 text-capitalize">{type.type.replace('_', ' ')}</h6>
                          <div>
                            <span className="badge badge-primary mr-2">{type.count}</span>
                            {type.emis.some(emi => emi.paymentType === 'full_payment') && (
                              <span className="badge badge-info">Full Payment</span>
                            )}
                          </div>
                        </div>
                        <Progress
                          value={type.totalAmount > 0 ? (type.paidAmount / type.totalAmount) * 100 : 0}
                          color="success"
                          className="mb-2"
                        />
                        <div className="d-flex justify-content-between small text-muted">
                          <span>₹{type.paidAmount?.toLocaleString() || "0"}</span>
                          <span>₹{type.totalAmount?.toLocaleString() || "0"}</span>
                        </div>
                        {/* Show EMI details */}
                        {type.emis.map((emi, emiIndex) => (
                          <div key={emiIndex} className="mt-2 p-2 bg-light rounded small">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="font-weight-bold">{emi.name}</span>
                              <span className={`badge badge-${emi.status === 'active' ? 'success' : emi.status === 'completed' ? 'info' : 'warning'}`}>
                                {emi.status}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between text-muted">
                              <span>₹{emi.emiAmount?.toLocaleString() || "0"}</span>
                              <span>{emi.paymentType === 'full_payment' ? 'Full Payment' : `${emi.paidInstallments}/${emi.totalInstallments} installments`}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p>No EMI data available</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
          <Col lg="6" md="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Recent EMI Payments</CardTitle>
                <p className="card-category">
                  Your latest EMI payment transactions
                </p>
              </CardHeader>
              <CardBody>
                {emiSummaryData?.recentEMIPayments ? (
                  <div>
                    {emiSummaryData.recentEMIPayments.map((payment, index) => (
                      <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                        <div>
                          <h6 className="mb-0">{payment.description}</h6>
                          <small className="text-muted">
                            {format(new Date(payment.date), "MMM dd, yyyy")}
                          </small>
                        </div>
                        <div className="text-right">
                          <span className={`badge badge-${payment.type === 'income' ? 'success' : 'danger'}`}>
                            ₹{payment.amount?.toLocaleString() || "0"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p>No recent EMI payments</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

         

        {/* Monthly Trend Chart */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Monthly Trend</CardTitle>
                <p className="card-category">
                  Track your income, expenses, and net amount over time
                </p>
              </CardHeader>
              <CardBody>
                {dashboardData?.monthlyTrend && (
                  <Line
                    data={getChartData(dashboardData.monthlyTrend)}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function (value) {
                              return "₹" + value.toFixed(2);
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
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Spending Analysis */}
        <Row>
          <Col lg="6" md="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Spending by EMI Type</CardTitle>
                <p className="card-category">
                  Total: ₹{spendingData?.totalSpending?.toFixed(2) || "0.00"}
                </p>
              </CardHeader>
              <CardBody>
                {spendingData?.categoryBreakdown && (
                  <Doughnut
                    data={getSpendingChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "bottom",
                        },
                      },
                    }}
                    height={250}
                  />
                )}
              </CardBody>
            </Card>
          </Col>
          <Col lg="6" md="12">
            <Card>
                             <CardHeader>
                 <CardTitle tag="h4">Income by Source</CardTitle>
                 <p className="card-category">
                   Total: ₹{incomeData?.totalIncome?.toFixed(2) || "0.00"}
                 </p>
               </CardHeader>
              <CardBody>
                {incomeData?.categoryBreakdown && (
                  <Doughnut
                    data={getIncomeChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "bottom",
                        },
                      },
                    }}
                    height={250}
                  />
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Spending Breakdown Table */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Spending Breakdown</CardTitle>
                <p className="card-category">
                  Detailed view of your spending by EMI type
                </p>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <Table style={{ minWidth: '700px' }}>
                    <thead>
                      <tr>
                        <th>EMI Type</th>
                        <th>Total Spent</th>
                        <th>Transaction Count</th>
                        <th>Average per Transaction</th>
                        <th>Percentage of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spendingData?.categoryBreakdown?.map((item) => (
                        <tr key={item.name}>
                          <td>
                            <span
                              style={{
                                color: item.color,
                                fontWeight: "bold",
                              }}
                            >
                              {item.name}
                            </span>
                          </td>
                          <td>₹{item.total.toFixed(2)}</td>
                          <td>{item.count}</td>
                          <td>
                            ₹{(item.total / item.count).toFixed(2)}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="mr-2" style={{ width: "100px" }}>
                                <Progress
                                  value={
                                    (item.total / spendingData.totalSpending) * 100
                                  }
                                  color="info"
                                  style={{ height: "8px" }}
                                />
                              </div>
                              <span>
                                {((item.total / spendingData.totalSpending) * 100).toFixed(1)}%
                              </span>
                            </div>
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

        {/* Income Breakdown Table */}
        <Row>
          <Col xs="12">
            <Card>
                             <CardHeader>
                 <CardTitle tag="h4">Income Breakdown</CardTitle>
                 <p className="card-category">
                   Detailed view of your income by source
                 </p>
               </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <Table style={{ minWidth: '700px' }}>
                                         <thead>
                       <tr>
                         <th>Income Source</th>
                         <th>Total Income</th>
                         <th>Transaction Count</th>
                         <th>Average per Transaction</th>
                         <th>Percentage of Total</th>
                       </tr>
                     </thead>
                    <tbody>
                      {incomeData?.categoryBreakdown?.map((item) => (
                        <tr key={item.name}>
                          <td>
                            <span
                              style={{
                                color: item.color,
                                fontWeight: "bold",
                              }}
                            >
                              {item.name}
                            </span>
                          </td>
                          <td>₹{item.total.toFixed(2)}</td>
                          <td>{item.count}</td>
                          <td>
                            ₹{(item.total / item.count).toFixed(2)}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="mr-2" style={{ width: "100px" }}>
                                <Progress
                                  value={
                                    (item.total / incomeData.totalIncome) * 100
                                  }
                                  color="success"
                                  style={{ height: "8px" }}
                                />
                              </div>
                              <span>
                                {((item.total / incomeData.totalIncome) * 100).toFixed(1)}%
                              </span>
                            </div>
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

        {/* Recent Transactions */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Recent Transactions</CardTitle>
                <p className="card-category">
                  Your latest financial activities
                </p>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <Table style={{ minWidth: '600px' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>EMI Type</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData?.recentTransactions?.map((transaction) => (
                        <tr key={transaction._id}>
                          <td>
                            {format(new Date(transaction.date), "MMM dd, yyyy")}
                          </td>
                          <td>
                            <Badge
                              color={
                                transaction.type === "income" ? "success" : "danger"
                              }
                            >
                              {transaction.type === "income" ? "Income" : "Expense"}
                            </Badge>
                          </td>
                          <td>{transaction.description}</td>
                          <td>
                            <span
                              style={{
                                color: transaction.category?.color || '#6c757d',
                                fontWeight: "bold",
                              }}
                            >
                              {transaction.category?.name || 'Uncategorized'}
                            </span>
                          </td>
                          <td>
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

export default Reports;
