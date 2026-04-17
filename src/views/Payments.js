import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
} from "reactstrap";
import { format } from "date-fns";
import api from "../config/axios";

function Payments() {
  const navigate = useNavigate();
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payments = response.data.data || [];
      const sorted = [...payments].sort((a, b) => {
        const aEmiDay = a.emiDay || 0;
        const bEmiDay = b.emiDay || 0;
        return aEmiDay - bEmiDay;
      });
      setEmis(sorted);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setEmis([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    const handleFocus = () => {
      fetchPayments();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchPayments]);

  const handleAddEMI = () => {
    navigate("/admin/payments/add");
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      try {
        const token = localStorage.getItem("token");
        await api.delete(`/api/payments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchPayments();
      } catch (error) {
        console.error("Error deleting payment:", error);
      }
    }
  };

  const calculatePendingEMIs = (payment) => {
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

    return Math.max(0, totalEmis - paidCount);
  };

  if (loading) {
    return (
      <div className="content">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <i
            className="tim-icons icon-refresh-02"
            style={{
              fontSize: "2.5rem",
              color: "#f59e0b",
              animation: "spin 0.9s linear infinite",
              display: "inline-block",
            }}
          />
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `,
          }}
        />
      </div>
    );
  }

  const accentAmber = "#FFA02E";
  const expenseScheduleCount = emis.filter((p) => p.category !== "savings").length;
  const savingsScheduleCount = emis.filter((p) => p.category === "savings").length;

  return (
    <div className="content payments-page-root" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .payments-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
        .payments-table-wrap table { min-width: 720px; }
      `,
        }}
      />

      <Row>
        <Col xs="12">
          <Card
            style={{
              background: "linear-gradient(165deg, #18181c 0%, #141416 50%, #121214 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              boxShadow: "0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,160,46,0.06) inset",
              overflow: "hidden",
            }}
          >
            <CardHeader
              style={{
                background: "linear-gradient(90deg, rgba(255,160,46,0.08) 0%, transparent 55%)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                padding: "1.1rem clamp(0.85rem, 3vw, 1.35rem)",
              }}
            >
              <Row className="align-items-start align-items-md-center" style={{ marginLeft: 0, marginRight: 0 }}>
                <Col xs="12" md="7" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "linear-gradient(145deg, rgba(255,160,46,0.2) 0%, rgba(255,160,46,0.06) 100%)",
                        border: "1px solid rgba(255,160,46,0.28)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 4px 16px rgba(255,160,46,0.12)",
                      }}
                    >
                      <i className="tim-icons icon-credit-card" style={{ fontSize: "1rem", color: "#fbbf24" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <CardTitle
                          tag="h4"
                          style={{
                            color: "#fff",
                            fontWeight: 800,
                            margin: 0,
                            fontSize: "1.05rem",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          Payments
                        </CardTitle>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "rgba(255,160,46,0.12)",
                            color: "#fbbf24",
                            border: "1px solid rgba(255,160,46,0.25)",
                          }}
                        >
                          All schedules
                        </span>
                      </div>
                      <p className="mb-0" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
                        Manage EMI schedules, amounts, and due days
                      </p>
                    </div>
                  </div>
                </Col>
                <Col
                  xs="12"
                  md="5"
                  className="d-flex justify-content-md-end mt-3 mt-md-0"
                  style={{ paddingLeft: 0, paddingRight: 0 }}
                >
                  <button type="button" onClick={handleAddEMI} className="btn-amber-outline">
                    <i className="tim-icons icon-simple-add mr-1" />
                    Add EMI
                  </button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody style={{ padding: "1.1rem clamp(0.85rem, 3vw, 1.35rem)", background: "rgba(0,0,0,0.14)" }}>
              {emis.length === 0 ? (
                <div className="text-center py-5">
                  <i
                    className="tim-icons icon-credit-card"
                    style={{ fontSize: "3rem", color: accentAmber, marginBottom: "1rem", opacity: 0.45 }}
                  />
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem", marginBottom: "0.5rem", fontWeight: 600 }}>
                    No payments yet
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                    Add an EMI to start tracking your monthly schedule
                  </div>
                  <button type="button" onClick={handleAddEMI} className="btn-amber-outline">
                    <i className="tim-icons icon-simple-add mr-1" />
                    Add your first payment
                  </button>
                </div>
              ) : (
                <div className="payments-table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                    <thead>
                      <tr>
                        {["#", "Name", "Type", "Amount", "EMI Day", "End Date", "Pending", "Status", ""].map((h, i) => (
                          <th
                            key={i}
                            style={{
                              padding: "11px 14px",
                              color: "rgba(255,255,255,0.4)",
                              fontWeight: 700,
                              textAlign: i === 3 ? "right" : i === 6 ? "center" : "left",
                              whiteSpace: "nowrap",
                              fontSize: "0.68rem",
                              letterSpacing: "0.07em",
                              textTransform: "uppercase",
                              borderBottom: "1px solid rgba(255,255,255,0.08)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {emis.map((payment, idx) => {
                        const pending = calculatePendingEMIs(payment);
                        const isSavings = payment.category === "savings";
                        const typeAccent = isSavings ? "#3cd278" : "#ff5a5a";
                        return (
                          <tr
                            key={payment._id}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.28)", fontWeight: 600, width: 40 }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: "11px 14px", color: "#fff", fontWeight: 700, fontSize: "0.88rem" }}>
                              {payment.name}
                            </td>
                            <td style={{ padding: "11px 14px" }}>
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  fontWeight: 800,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  background: `${typeAccent}18`,
                                  color: typeAccent,
                                  border: `1px solid ${typeAccent}35`,
                                }}
                              >
                                {isSavings ? "Savings" : "Expense"}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "11px 14px",
                                textAlign: "right",
                                color: "#fbbf24",
                                fontWeight: 800,
                                whiteSpace: "nowrap",
                                fontSize: "0.9rem",
                              }}
                            >
                              ₹{payment.amount?.toLocaleString("en-IN") || "0"}
                            </td>
                            <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.5)" }}>{payment.emiDay || "—"}</td>
                            <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                              {payment.endDate
                                ? format(new Date(payment.endDate), "dd MMM yyyy")
                                : payment.emiType === "recurring"
                                  ? "Ongoing"
                                  : "—"}
                            </td>
                            <td style={{ padding: "11px 14px", textAlign: "center" }}>
                              {pending === "Ongoing" ? (
                                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.95rem" }}>∞</span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minWidth: 28,
                                    height: 28,
                                    padding: "0 8px",
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    fontSize: "0.78rem",
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "rgba(255,255,255,0.65)",
                                  }}
                                >
                                  {pending}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "11px 14px" }}>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  background:
                                    (payment.status || "active") === "active"
                                      ? "rgba(16,185,129,0.12)"
                                      : "rgba(255,255,255,0.06)",
                                  border:
                                    (payment.status || "active") === "active"
                                      ? "1px solid rgba(16,185,129,0.25)"
                                      : "1px solid rgba(255,255,255,0.1)",
                                  color:
                                    (payment.status || "active") === "active" ? "#6ee7b7" : "rgba(255,255,255,0.45)",
                                }}
                              >
                                {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1) || "Active"}
                              </span>
                            </td>
                            <td style={{ padding: "11px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/payments/edit/${payment._id}`)}
                                title="Edit"
                                style={{
                                  background: "rgba(255,160,46,0.12)",
                                  border: "1px solid rgba(255,160,46,0.3)",
                                  borderRadius: 8,
                                  width: 32,
                                  height: 32,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "#fbbf24",
                                  marginRight: 6,
                                }}
                              >
                                <i className="tim-icons icon-pencil" style={{ fontSize: "0.7rem" }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(payment._id)}
                                title="Delete"
                                style={{
                                  background: "rgba(239,68,68,0.08)",
                                  border: "1px solid rgba(239,68,68,0.22)",
                                  borderRadius: 8,
                                  width: 32,
                                  height: 32,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "#f87171",
                                }}
                              >
                                <i className="tim-icons icon-trash-simple" style={{ fontSize: "0.7rem" }} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
                        <td colSpan={3} style={{ padding: "12px 14px", color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>
                          {emis.length} payment{emis.length !== 1 ? "s" : ""} · {expenseScheduleCount} expenses ·{" "}
                          {savingsScheduleCount} savings
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            textAlign: "right",
                            color: "#fbbf24",
                            fontWeight: 800,
                            fontSize: "0.92rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{emis.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString("en-IN")}
                          <span
                            style={{
                              color: "rgba(255,255,255,0.35)",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              marginLeft: 6,
                            }}
                          >
                            /mo combined
                          </span>
                        </td>
                        <td colSpan={5} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Payments;
