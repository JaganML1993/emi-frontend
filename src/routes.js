/*!
 *
 *=========================================================
 * EMI Tracking Application React Dashboard
 *=========================================================
 *
 * Based on Black Dashboard React v1.2.2
 * Copyright 2023 Creative Tim (https://www.creative-tim.com)
 * Licensed under MIT
 *
 *=========================================================
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 */
import React, { lazy } from "react";

// Lazy load components for code splitting and faster page loads
const Dashboard = lazy(() => import("views/Dashboard.js"));
const Payments = lazy(() => import("views/Payments.js"));
const AddPayment = lazy(() => import("views/AddPayment.js"));
const EditPayment = lazy(() => import("views/EditPayment.js"));
const UserProfile = lazy(() => import("views/UserProfile.js"));
const EMIForecast = lazy(() => import("views/EMIForecast.js"));
const RolesManagement = lazy(() => import("views/RolesManagement.js"));
const Users = lazy(() => import("views/Users.js"));
const HouseSavings = lazy(() => import("views/HouseSavings.js"));

var routes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "tim-icons icon-chart-pie-36",
    component: Dashboard,
    layout: "/admin",
  },
  {
    path: "/payments",
    name: "Payments",
    icon: "tim-icons icon-credit-card",
    component: Payments,
    layout: "/admin",
  },
  {
    path: "/user-profile",
    name: "User Profile",
    icon: "tim-icons icon-single-02",
    component: UserProfile,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/users",
    name: "Users",
    icon: "tim-icons icon-single-02",
    component: Users,
    layout: "/admin",
    roles: ["admin", "super_admin"],
  },
  {
    path: "/house-savings",
    name: "House Savings",
    icon: "tim-icons icon-bank",
    component: HouseSavings,
    layout: "/admin",
  },
  {
    path: "/emi-forecast",
    name: "EMI Forecast",
    icon: "tim-icons icon-chart-bar-32",
    component: EMIForecast,
    layout: "/admin",
  },
  {
    path: "/roles-management",
    name: "Roles Management",
    icon: "tim-icons icon-lock-circle",
    component: RolesManagement,
    layout: "/admin",
    roles: ["admin", "super_admin"],
  },
  // Hidden routes (not shown in sidebar)
  {
    path: "/payments/add",
    name: "Add Payment",
    icon: "tim-icons icon-simple-add",
    component: AddPayment,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/payments/edit/:id",
    name: "Edit Payment",
    icon: "tim-icons icon-pencil",
    component: EditPayment,
    layout: "/admin",
    hidden: true,
  },
];

export default routes;
