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
/*eslint-disable*/
import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
// nodejs library to set properties for components
import { PropTypes } from "prop-types";

// javascript plugin used to create scrollbars on windows
import PerfectScrollbar from "perfect-scrollbar";

// reactstrap components
import { Nav, NavLink as ReactstrapNavLink } from "reactstrap";
import {
  BackgroundColorContext,
  backgroundColors,
} from "contexts/BackgroundColorContext";

var ps;

function Sidebar(props) {
  const location = useLocation();
  const sidebarRef = React.useRef(null);
  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName) => {
    return location.pathname === routeName ? "active" : "";
  };
  
  // Check if current path matches the route
  const isCurrentRoute = (path) => {
    const currentPath = location.pathname;
    const routePath = props.layout + path;
    
    // Check exact match first
    if (currentPath === routePath) {
      return true;
    }
    
    // Check if current path starts with the route path (for nested routes)
    if (currentPath.startsWith(routePath + '/')) {
      return true;
    }
    
    // Special case for dashboard (root path)
    if (path === '/dashboard' && (currentPath === '/admin' || currentPath === '/admin/')) {
      return true;
    }
    
    return false;
  };
  React.useEffect(() => {
    if (navigator.platform.indexOf("Win") > -1) {
      ps = new PerfectScrollbar(sidebarRef.current, {
        suppressScrollX: true,
        suppressScrollY: false,
      });
    }
    // Specify how to clean up after this effect:
    return function cleanup() {
      if (navigator.platform.indexOf("Win") > -1) {
        ps.destroy();
      }
    };
  });
  const linkOnClick = () => {
    document.documentElement.classList.remove("nav-open");
  };
  const { routes, logo } = props;
  let logoImg = null;
  let logoText = null;
  if (logo !== undefined) {
    if (logo.outterLink !== undefined) {
      logoImg = (
        <a
          href={logo.outterLink}
          className="simple-text logo-mini"
          target="_blank"
          onClick={props.toggleSidebar}
        >
          <div className="logo-img">
            <img src={logo.imgSrc} alt="react-logo" />
          </div>
        </a>
      );
      logoText = (
        <a
          href={logo.outterLink}
          className="simple-text logo-normal"
          target="_blank"
          onClick={props.toggleSidebar}
        >
          {logo.text}
        </a>
      );
    } else {
      logoImg = (
        <Link
          to={logo.innerLink}
          className="simple-text logo-mini"
          onClick={props.toggleSidebar}
        >
          <div className="logo-img">
            <img src={logo.imgSrc} alt="react-logo" />
          </div>
        </Link>
      );
      logoText = (
        <Link
          to={logo.innerLink}
          className="simple-text logo-normal"
          onClick={props.toggleSidebar}
        >
          {logo.text}
        </Link>
      );
    }
  }
  return (
    <BackgroundColorContext.Consumer>
      {({ color }) => (
        <div className="sidebar" data={color} style={{
          background: 'linear-gradient(135deg, rgba(0, 191, 255, 0.3) 0%, rgba(30, 144, 255, 0.25) 50%, #1e1e2d 100%)',
          boxShadow: '0 8px 32px rgba(0, 191, 255, 0.3), 0 4px 16px rgba(30, 144, 255, 0.2)',
          border: '1px solid rgba(0, 191, 255, 0.4)',
          backdropFilter: 'blur(20px)'
        }}>
          <div className="sidebar-wrapper" ref={sidebarRef} style={{
            background: 'transparent'
          }}>
            {logoImg !== null || logoText !== null ? (
              <div className="logo" style={{
                padding: '20px 15px',
                borderBottom: '1px solid rgba(0, 191, 255, 0.4)',
                marginBottom: '10px'
              }}>
                {logoImg}
                {logoText}
              </div>
            ) : null}
            <Nav style={{ padding: '0 15px' }}>
              {routes
                .filter(route => !route.hidden) // Filter out hidden routes
                .map((prop, key) => {
                if (prop.redirect) return null;
                const isActive = isCurrentRoute(prop.path);
                return (
                  <li
                    className={
                      activeRoute(prop.path) + (prop.pro ? " active-pro" : "")
                    }
                    key={key}
                    style={{
                      marginBottom: '8px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <NavLink
                      to={prop.layout + prop.path}
                      className="nav-link"
                      onClick={props.toggleSidebar}
                      style={{
                        background: isActive ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.5) 0%, rgba(255, 193, 7, 0.35) 100%)' : 'transparent',
                        border: isActive ? '2px solid rgba(255, 152, 0, 0.8)' : '1px solid transparent',
                        borderRadius: '12px',
                        padding: '12px 15px',
                        color: isActive ? '#FFD166' : '#ffffff',
                        fontWeight: isActive ? '700' : '400',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        boxShadow: isActive ? '0 8px 25px rgba(255, 152, 0, 0.4)' : 'none',
                        position: 'relative'
                      }}

                    >
                      <i className={prop.icon} style={{ 
                        marginRight: '12px',
                        fontSize: '1.1rem',
                        color: isActive ? '#FFD166' : '#ffffff',
                        opacity: isActive ? '1' : '0.8',
                        position: 'relative',
                        zIndex: '2'
                      }} />
                      <p style={{ 
                        margin: '0',
                        fontSize: '0.9rem',
                        color: isActive ? '#FFD166' : '#ffffff',
                        opacity: isActive ? '1' : '0.8',
                        position: 'relative',
                        zIndex: '2'
                      }}>{prop.name}</p>
                    </NavLink>
                  </li>
                );
              })}
            </Nav>
          </div>
        </div>
      )}
    </BackgroundColorContext.Consumer>
  );
}

Sidebar.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.object),
  logo: PropTypes.shape({
    // innerLink is for links that will direct the user within the app
    // it will be rendered as <Link to="...">...</Link> tag
    innerLink: PropTypes.string,
    // outterLink is for links that will direct the user outside the app
    // it will be rendered as simple <a href="...">...</a> tag
    outterLink: PropTypes.string,
    // the text of the logo
    text: PropTypes.node,
    // the image src of the logo
    imgSrc: PropTypes.string,
  }),
};

export default Sidebar;
