import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Progress,
  Badge,
  Table,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";

import { format } from "date-fns";
import classnames from "classnames";

import api from "../config/axios";



// Helper functions
const getStatusColor = (status) => {
  switch (status) {
    case "active":
      return "success";
    case "completed":
      return "info";
    case "defaulted":
      return "danger";
    default:
      return "secondary";
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case "car_loan":
      return "tim-icons icon-delivery-fast";
    case "bike_emi":
      return "tim-icons icon-delivery-fast";
    case "home_loan":
      return "tim-icons icon-bank";
    case "personal_loan":
      return "tim-icons icon-money-coins";
    case "business_loan":
      return "tim-icons icon-chart-bar-32";
    case "education_loan":
      return "tim-icons icon-bulb-63";
    case "cheetu":
      return "tim-icons icon-chart-pie-36";
    default:
      return "tim-icons icon-chart-pie-36";
  }
};

const getTypeDisplayName = (type) => {
  switch (type) {
    case "personal_loan":
      return "Personal Loan";
    case "mobile_emi":
      return "Mobile EMI";
    case "laptop_emi":
      return "Laptop EMI";
    case "savings_emi":
      return "Savings EMI";
    case "car_loan":
      return "Car Loan";
    case "home_loan":
      return "Home Loan";
    case "business_loan":
      return "Business Loan";
    case "education_loan":
      return "Education Loan";
    case "credit_card":
      return "Credit Card";
    case "appliance_emi":
      return "Appliance EMI";
    case "furniture_emi":
      return "Furniture EMI";
    case "bike_emi":
      return "Bike EMI";
    case "cheetu":
      return "Cheetu";
    default:
      return type.replace('_', ' ');
  }
};

const calculateProgress = (emi) => {
  return (emi.paidInstallments / emi.totalInstallments) * 100;
};

const getDaysUntilDue = (emi) => {
  if (emi.paymentType === 'full_payment' || !emi.nextDueDate) {
    return null;
  }
  const today = new Date();
  const dueDate = new Date(emi.nextDueDate);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getDueStatus = (emi) => {
  if (emi.paymentType === 'full_payment' || !emi.nextDueDate) {
    return null;
  }
  const daysUntilDue = getDaysUntilDue(emi);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 7) return "due-soon";
  return "upcoming";
};

const getDueStatusColor = (status) => {
  if (!status) return "secondary";
  switch (status) {
    case "overdue":
      return "danger";
    case "due-soon":
      return "warning";
    default:
      return "success";
  }
};

function EMIs() {
  const [loading, setLoading] = useState(true);
  const [emis, setEmis] = useState([]);

  const [activeTab, setActiveTab] = useState("1");



  const navigate = useNavigate();

  const fetchEMIs = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/emis", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmis(response.data.data);
    } catch (error) {
      console.error("Error fetching EMIs:", error);
    } finally {
      setLoading(false);
    }
  }, []);





  useEffect(() => {
    fetchEMIs();
  }, [fetchEMIs]);

  const openPaymentModal = (emi) => {
    navigate(`/admin/emis/${emi._id}/pay`);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this EMI?")) {
      try {
        const token = localStorage.getItem("token");
        await api.delete(`/api/emis/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchEMIs();
      } catch (error) {
        console.error("Error deleting EMI:", error);
      }
    }
  };







  const handleAddEMI = () => {
    navigate("/admin/emis/add");
  };

  const handleEditEMI = (emi) => {
    navigate(`/admin/emis/edit/${emi._id}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
             <div className="content">
         {/* EMI Management */}
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">EMI Management</CardTitle>
                <Button
                  color="primary"
                  size="sm"
                  onClick={handleAddEMI}
                >
                  Add New EMI
                </Button>
              </CardHeader>
              <CardBody>
                <Nav tabs>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === "1" })}
                      onClick={() => setActiveTab("1")}
                    >
                      Active EMIs
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === "2" })}
                      onClick={() => setActiveTab("2")}
                    >
                      Completed EMIs
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === "3" })}
                      onClick={() => setActiveTab("3")}
                    >
                      All EMIs
                    </NavLink>
                  </NavItem>
                </Nav>
                <TabContent activeTab={activeTab}>
                  <TabPane tabId="1">
                    <EMITable
                      emis={emis.filter((emi) => emi.status === "active")}
                      onEdit={handleEditEMI}
                      onDelete={handleDelete}
                      onPayment={openPaymentModal}
                      showActions={true}
                    />
                  </TabPane>
                  <TabPane tabId="2">
                    <EMITable
                      emis={emis.filter((emi) => emi.status === "completed")}
                      onEdit={handleEditEMI}
                      onDelete={handleDelete}
                      onPayment={openPaymentModal}
                      showActions={false}
                    />
                  </TabPane>
                  <TabPane tabId="3">
                    <EMITable
                      emis={emis}
                      onEdit={handleEditEMI}
                      onDelete={handleDelete}
                      onPayment={openPaymentModal}
                      showActions={true}
                    />
                  </TabPane>
                </TabContent>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>




    </>
  );
}

// EMI Table Component
function EMITable({ emis, onEdit, onDelete, onPayment, showActions }) {
  if (emis.length === 0) {
    return (
      <div className="text-center py-4">
        <p>No EMIs found.</p>
      </div>
    );
  }

        return (
     <Table style={{ width: '100%', tableLayout: 'fixed' }}>
       <thead>
         <tr>
           <th style={{ width: '20%' }}>EMI Details</th>
           <th style={{ width: '15%' }}>Progress</th>
           <th style={{ width: '15%' }}>Next Due</th>
           <th style={{ width: '20%' }}>Amount</th>
           <th style={{ width: '10%' }}>Status</th>
           {showActions && <th style={{ width: '20%' }}>Actions</th>}
         </tr>
       </thead>
       <tbody>
                 {emis.map((emi) => (
           <tr key={emi._id}>
             <td style={{ verticalAlign: 'top', wordWrap: 'break-word' }}>
               <div>
                 <strong>{emi.name}</strong>
                 <br />
                 <small className="text-muted">
                   <i className={getTypeIcon(emi.type)}></i> {getTypeDisplayName(emi.type)}
                 </small>
               </div>
             </td>
             <td style={{ verticalAlign: 'top' }}>
               <div>
                 <Progress
                   value={calculateProgress(emi)}
                   color={emi.status === "completed" ? "success" : "info"}
                 />
                 <small>
                   {emi.paidInstallments} / {emi.totalInstallments}
                 </small>
               </div>
             </td>
             {emi.paymentType === 'emi' ? (
               <td style={{ verticalAlign: 'top' }}>
                 <div>
                   <strong>{emi.nextDueDate ? format(new Date(emi.nextDueDate), "MMM dd, yyyy") : "-"}</strong>
                   <br />
                   <Badge color={getDueStatusColor(getDueStatus(emi))}>
                     {getDueStatus(emi) === "overdue" && "Overdue"}
                     {getDueStatus(emi) === "due-soon" && "Due Soon"}
                     {getDueStatus(emi) === "upcoming" && "Upcoming"}
                   </Badge>
                 </div>
               </td>
             ) : (
               <td style={{ verticalAlign: 'top' }}>
                 <div>
                   <strong>-</strong>
                   <br />
                   <small className="text-muted">Full Payment</small>
                 </div>
               </td>
             )}
             <td style={{ verticalAlign: 'top', wordWrap: 'break-word' }}>
               <div>
                 <strong>₹{emi.emiAmount.toLocaleString()}</strong>
                 <br />
                 <small className="text-muted">
                   Total: ₹{(emi.emiAmount * emi.totalInstallments).toLocaleString()}
                 </small>
                 <br />
                 <small className="text-muted">
                   Remaining: ₹{emi.remainingAmount.toLocaleString()}
                 </small>
               </div>
             </td>
             <td style={{ verticalAlign: 'top' }}>
               <Badge color={getStatusColor(emi.status)}>
                 {emi.status.charAt(0).toUpperCase() + emi.status.slice(1)}
               </Badge>
             </td>
             {showActions && (
               <td style={{ verticalAlign: 'top' }}>
                 <Button
                   color="info"
                   size="sm"
                   onClick={() => onEdit(emi)}
                   className="mr-2"
                 >
                   Edit
                 </Button>
                 {emi.status === "active" && (
                   <Button
                     color="success"
                     size="sm"
                     onClick={() => onPayment(emi)}
                     className="mr-2"
                   >
                     Pay
                   </Button>
                 )}
                 <Button
                   color="danger"
                   size="sm"
                   onClick={() => onDelete(emi._id)}
                 >
                   Delete
                 </Button>
               </td>
             )}
           </tr>
         ))}
      </tbody>
    </Table>
  );
}

export default EMIs;
