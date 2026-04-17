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
import React from "react";
import { useNavigate } from "react-router-dom";
// nodejs library that concatenates classes
import classNames from "classnames";

// reactstrap components
import {
  Collapse,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  NavbarBrand,
  Navbar,
  NavItem,
  NavLink,
  Nav,
  Container,
  NavbarToggler,
} from "reactstrap";

function AdminNavbar(props) {
  const navigate = useNavigate();
  const [collapseOpen, setcollapseOpen] = React.useState(false);
  const [color, setcolor] = React.useState("navbar-transparent");
  const navbarShellRef = React.useRef(null);

  React.useEffect(() => {
    if (!collapseOpen) return;
    const closeIfOutside = (event) => {
      const shell = navbarShellRef.current;
      if (shell && !shell.contains(event.target)) {
        setcollapseOpen(false);
      }
    };
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("touchstart", closeIfOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("touchstart", closeIfOutside);
    };
  }, [collapseOpen]);

  React.useEffect(() => {
    window.addEventListener("resize", updateColor);
    // Specify how to clean up after this effect:
    return function cleanup() {
      window.removeEventListener("resize", updateColor);
    };
  });
  // function that adds color white/transparent to the navbar on resize (this is for the collapse)
  const updateColor = () => {
    setcolor("navbar-transparent");
  };
  const toggleCollapse = () => {
    setcollapseOpen(!collapseOpen);
  };

  // logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth/login");
  };

  const handleProfileClick = () => {
    navigate("/admin/user-profile");
  };

  const handleSettingsClick = () => {
    navigate("/admin/user-profile");
  };

  const closeMobileNav = () => setcollapseOpen(false);

  return (
    <>
      <div ref={navbarShellRef} className="w-100">
      <Navbar className={classNames("navbar-absolute", color)} expand="lg">
        <Container fluid>
          <div className="navbar-wrapper">
            <div
              className={classNames("navbar-toggle d-inline", {
                toggled: props.sidebarOpened,
              })}
            >
              <NavbarToggler onClick={props.toggleSidebar}>
                <span className="navbar-toggler-bar bar1" />
                <span className="navbar-toggler-bar bar2" />
                <span className="navbar-toggler-bar bar3" />
              </NavbarToggler>
            </div>
            <NavbarBrand href="#pablo" onClick={(e) => e.preventDefault()}>
              {props.brandText}
            </NavbarBrand>
          </div>
          <NavbarToggler onClick={toggleCollapse}>
            <span className="navbar-toggler-bar navbar-kebab" />
            <span className="navbar-toggler-bar navbar-kebab" />
            <span className="navbar-toggler-bar navbar-kebab" />
          </NavbarToggler>
          <Collapse navbar isOpen={collapseOpen}>
            <Nav className="ml-auto" navbar>
              <NavItem className="d-lg-none">
                <NavLink
                  href="#profile"
                  onClick={(e) => {
                    e.preventDefault();
                    handleProfileClick();
                    closeMobileNav();
                  }}
                >
                  Profile
                </NavLink>
              </NavItem>
              <NavItem className="d-lg-none">
                <NavLink
                  href="#settings"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSettingsClick();
                    closeMobileNav();
                  }}
                >
                  Settings
                </NavLink>
              </NavItem>
              <NavItem className="d-lg-none">
                <NavLink
                  href="#logout"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLogout();
                    closeMobileNav();
                  }}
                >
                  Log out
                </NavLink>
              </NavItem>
              <UncontrolledDropdown nav className="d-none d-lg-block">
                <DropdownToggle
                  caret
                  color="default"
                  nav
                  onClick={(e) => e.preventDefault()}
                >
                  <div className="photo">
                    <img alt="..." src={require("assets/img/anime3.png")} />
                  </div>
                  <b className="caret d-none d-lg-block d-xl-block" />
                </DropdownToggle>
                <DropdownMenu className="dropdown-navbar" right tag="ul">
                  <NavLink tag="li">
                    <DropdownItem className="nav-item" onClick={handleProfileClick}>Profile</DropdownItem>
                  </NavLink>
                  <NavLink tag="li">
                    <DropdownItem className="nav-item" onClick={handleSettingsClick}>
                      Settings
                    </DropdownItem>
                  </NavLink>
                  <DropdownItem divider tag="li" />
                  <NavLink tag="li">
                    <DropdownItem className="nav-item" onClick={handleLogout}>Log out</DropdownItem>
                  </NavLink>
                </DropdownMenu>
              </UncontrolledDropdown>
              <li className="separator d-lg-none" />
            </Nav>
          </Collapse>
        </Container>
      </Navbar>
      </div>
    </>
  );
}

export default AdminNavbar;
