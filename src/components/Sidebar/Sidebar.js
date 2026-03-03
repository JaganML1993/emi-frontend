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
  // Check if current path matches the route (uses the route's own layout prefix)
  const isCurrentRoute = (layout, path) => {
    const fullPath = layout + path;
    if (location.pathname === fullPath) return true;
    if (location.pathname.startsWith(fullPath + '/')) return true;
    if (path === '/dashboard' && (location.pathname === '/admin' || location.pathname === '/admin/')) return true;
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
            <Nav style={{ padding: '0 10px' }}>
              {routes
                .filter(route => !route.hidden)
                .map((prop, key) => {
                  if (prop.redirect) return null;
                  const isActive = isCurrentRoute(prop.layout, prop.path);
                  return (
                    <li
                      key={key}
                      style={{ marginBottom: '4px', listStyle: 'none' }}
                    >
                      <NavLink
                        to={prop.layout + prop.path}
                        onClick={props.toggleSidebar}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(255,152,0,0.45) 0%, rgba(255,193,7,0.3) 100%)'
                            : 'transparent',
                          border: isActive
                            ? '1px solid rgba(255,152,0,0.7)'
                            : '1px solid transparent',
                          boxShadow: isActive ? '0 4px 16px rgba(255,152,0,0.3)' : 'none',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        <i
                          className={prop.icon}
                          style={{
                            fontSize: '1rem',
                            width: '20px',
                            textAlign: 'center',
                            flexShrink: 0,
                            color: isActive ? '#FFD166' : 'rgba(255,255,255,0.75)',
                          }}
                        />
                        <p style={{
                          margin: 0,
                          fontSize: '0.88rem',
                          fontWeight: isActive ? '600' : '400',
                          color: isActive ? '#FFD166' : 'rgba(255,255,255,0.85)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {prop.name}
                        </p>
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
