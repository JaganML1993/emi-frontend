/*!

=========================================================
* Black Dashboard React v1.2.2
=========================================================

* Product Page: https://www.creative-tim.com/product/black-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/black-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React, { Suspense, useState, useEffect } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
// javascript plugin used to create scrollbars on windows
import PerfectScrollbar from "perfect-scrollbar";

// core components
import AdminNavbar from "components/Navbars/AdminNavbar.js";
import Footer from "components/Footer/Footer.js";
import Sidebar from "components/Sidebar/Sidebar.js";
import { Spinner } from "reactstrap";
// import FixedPlugin from "components/FixedPlugin/FixedPlugin.js";

import routes from "routes.js";
import api from "config/axios";

import logo from "assets/img/react-logo.png";
import { BackgroundColorContext } from "contexts/BackgroundColorContext";

var ps;

function Admin(props) {
  const location = useLocation();
  const [allowedPaths, setAllowedPaths] = useState(null);
  const mainPanelRef = React.useRef(null);
  const [sidebarOpened, setsidebarOpened] = React.useState(
    document.documentElement.className.indexOf("nav-open") !== -1
  );
  // Fetch role-based menu permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await api.get("/api/roles/my-permissions");
        if (res.data.success && res.data.paths) {
          setAllowedPaths(res.data.paths);
        } else {
          setAllowedPaths([]);
        }
      } catch {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setAllowedPaths((user.role === "admin" || user.role === "super_admin") ? ["/dashboard", "/payments", "/house-savings", "/users", "/user-profile", "/emi-forecast", "/roles-management"] : ["/dashboard", "/payments", "/house-savings", "/user-profile", "/emi-forecast"]);
      }
    };
    fetchPermissions();
  }, []);

  const filteredRoutes = React.useMemo(() => {
    if (allowedPaths === null) return routes;
    return routes.filter((r) => {
      if (r.hidden) return true;
      return allowedPaths.includes(r.path);
    });
  }, [allowedPaths]);

  React.useEffect(() => {
    if (navigator.platform.indexOf("Win") > -1) {
      document.documentElement.className += " perfect-scrollbar-on";
      document.documentElement.classList.remove("perfect-scrollbar-off");
      ps = new PerfectScrollbar(mainPanelRef.current, {
        suppressScrollX: true,
      });
      // Tables now use CSS-based responsive scrolling instead of PerfectScrollbar
      // This provides better mobile support and native scrolling behavior
    }
    // Specify how to clean up after this effect:
    return function cleanup() {
      if (navigator.platform.indexOf("Win") > -1) {
        ps.destroy();
        document.documentElement.classList.add("perfect-scrollbar-off");
        document.documentElement.classList.remove("perfect-scrollbar-on");
      }
    };
  });
  React.useEffect(() => {
    if (navigator.platform.indexOf("Win") > -1) {
      // Tables now use CSS-based responsive scrolling instead of PerfectScrollbar
      // This provides better mobile support and native scrolling behavior
    }
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
    if (mainPanelRef.current) {
      mainPanelRef.current.scrollTop = 0;
    }
  }, [location]);
  // this function opens and closes the sidebar on small devices
  const toggleSidebar = () => {
    document.documentElement.classList.toggle("nav-open");
    setsidebarOpened(!sidebarOpened);
  };
  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/admin") {
        const Component = prop.component;
        return (
          <Route 
            path={prop.path} 
            element={
              <Suspense fallback={
                <div className="content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                  <Spinner color="primary" />
                </div>
              }>
                <Component />
              </Suspense>
            } 
            key={key} 
            exact 
          />
        );
      } else {
        return null;
      }
    });
  };
  const getBrandText = (path) => {
    for (let i = 0; i < routes.length; i++) {
      if (location.pathname.indexOf(routes[i].layout + routes[i].path) !== -1) {
        return routes[i].name;
      }
    }
    return "Brand";
  };
  return (
    <BackgroundColorContext.Consumer>
      {({ color, changeColor }) => (
        <React.Fragment>
          <div className="wrapper">
            <Sidebar
              routes={filteredRoutes}
              logo={{
                outterLink: "#",
                text: <span>J❤️V</span>,
                imgSrc: logo,
              }}
              toggleSidebar={toggleSidebar}
            />
            <div className="main-panel" ref={mainPanelRef} data={color}>
              <AdminNavbar
                brandText={getBrandText(location.pathname)}
                toggleSidebar={toggleSidebar}
                sidebarOpened={sidebarOpened}
              />
              <Routes>
                {getRoutes(routes)}
                <Route
                  path="/"
                  element={<Navigate to="/admin/dashboard" replace />}
                />
              </Routes>
            </div>
            {
              // we don't want the Footer to be rendered on map page
              location.pathname === "/admin/maps" ? null : <Footer fluid />
            }
          </div>
          {/* <FixedPlugin bgColor={color} handleBgClick={changeColor} /> */}
        </React.Fragment>
      )}
    </BackgroundColorContext.Consumer>
  );
}

export default Admin;
