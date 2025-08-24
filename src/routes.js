/*!

=========================================================
* EMI Tracking Application React Dashboard
=========================================================

* Based on Black Dashboard React v1.2.2
* Copyright 2023 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import Dashboard from "views/Dashboard.js";
import Transactions from "views/Transactions.js";
import Reports from "views/Reports.js";
import EMIs from "views/EMIs.js";
import AddEMI from "views/AddEMI.js";
import EditEMI from "views/EditEMI.js";
import RecordEMIPayment from "views/RecordEMIPayment.js";
import UserProfile from "views/UserProfile.js";

var routes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "tim-icons icon-chart-pie-36",
    component: <Dashboard />,
    layout: "/admin",
  },
  {
    path: "/emis",
    name: "EMIs",
    icon: "tim-icons icon-delivery-fast",
    component: <EMIs />,
    layout: "/admin",
  },
  {
    path: "/transactions",
    name: "Transactions",
    icon: "tim-icons icon-money-coins",
    component: <Transactions />,
    layout: "/admin",
  },
  {
    path: "/reports",
    name: "Reports",
    icon: "tim-icons icon-chart-pie-36",
    component: <Reports />,
    layout: "/admin",
  },
  {
    path: "/user-profile",
    name: "User Profile",
    icon: "tim-icons icon-single-02",
    component: <UserProfile />,
    layout: "/admin",
  },
  // Hidden routes (not shown in sidebar)
  {
    path: "/emis/add",
    name: "Add EMI",
    icon: "tim-icons icon-delivery-fast",
    component: <AddEMI />,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/emis/edit/:id",
    name: "Edit EMI",
    icon: "tim-icons icon-delivery-fast",
    component: <EditEMI />,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/emis/:id/pay",
    name: "Record EMI Payment",
    icon: "tim-icons icon-money-coins",
    component: <RecordEMIPayment />,
    layout: "/admin",
    hidden: true,
  },
];

export default routes;
