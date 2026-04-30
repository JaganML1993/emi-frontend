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
const RolesManagement = lazy(() => import("views/RolesManagement.js"));
const Users = lazy(() => import("views/Users.js"));
const LandSavings = lazy(() => import("views/LandSavings.js"));
const Budget = lazy(() => import("views/Budget.js"));
const GoldSavings = lazy(() => import("views/GoldSavings.js"));
const GoldSavingsForm = lazy(() => import("views/GoldSavingsForm.js"));
const Expenses = lazy(() => import("views/Expenses.js"));
const ExpenseForm = lazy(() => import("views/ExpenseForm.js"));

var routes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "tim-icons icon-chart-pie-36",
    component: Dashboard,
    layout: "/admin",
  },
  {
    path: "/expenses",
    name: "Expenses",
    icon: "tim-icons icon-notes",
    component: Expenses,
    layout: "/admin",
  },
  {
    path: "/land-savings",
    name: "Land Savings",
    icon: "tim-icons icon-world",
    component: LandSavings,
    layout: "/admin",
  },
  {
    path: "/payments",
    name: "EMI",
    icon: "tim-icons icon-credit-card",
    component: Payments,
    layout: "/admin",
  },
  {
    path: "/budget",
    name: "Budget",
    icon: "tim-icons icon-coins",
    component: Budget,
    layout: "/admin",
  },
  {
    path: "/gold-savings",
    name: "Gold Savings",
    icon: "tim-icons icon-trophy",
    component: GoldSavings,
    layout: "/admin",
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
    path: "/roles-management",
    name: "Roles Management",
    icon: "tim-icons icon-lock-circle",
    component: RolesManagement,
    layout: "/admin",
    roles: ["admin", "super_admin"],
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
    path: "/gold-savings/add",
    name: "Add Gold Savings",
    icon: "tim-icons icon-simple-add",
    component: GoldSavingsForm,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/gold-savings/edit/:id",
    name: "Edit Gold Savings",
    icon: "tim-icons icon-pencil",
    component: GoldSavingsForm,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/expenses/add",
    name: "Add Expense",
    icon: "tim-icons icon-simple-add",
    component: ExpenseForm,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/expenses/edit/:id",
    name: "Edit Expense",
    icon: "tim-icons icon-pencil",
    component: ExpenseForm,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/payments/add",
    name: "Add EMI",
    icon: "tim-icons icon-simple-add",
    component: AddPayment,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/payments/edit/:id",
    name: "Edit EMI",
    icon: "tim-icons icon-pencil",
    component: EditPayment,
    layout: "/admin",
    hidden: true,
  },
];

export default routes;
