import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Home", icon: "icon-chart-pie-36" },
  { path: "/expenses", label: "Expenses", icon: "icon-notes" },
  { path: "/land-savings", label: "Land", icon: "icon-world" },
  { path: "/payments", label: "EMI", icon: "icon-credit-card" },
];

/**
 * Android-style fixed bottom nav (visible on smaller screens only).
 * Paths must match `/api/roles/my-permissions` entries (e.g. `/payments`).
 */
export default function MobileBottomNav({ allowedPaths }) {
  const items = useMemo(() => {
    if (allowedPaths === null) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => allowedPaths.includes(item.path));
  }, [allowedPaths]);

  if (items.length === 0) return null;

  return (
    <>
      <style>{`
        .admin-mobile-bottom-nav {
          display: none;
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1030;
          padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
          background: linear-gradient(180deg, rgba(22,22,26,0.96) 0%, rgba(18,18,22,0.99) 100%);
          border-top: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .admin-mobile-bottom-nav-inner {
          display: flex;
          align-items: stretch;
          justify-content: space-around;
          max-width: 520px;
          margin: 0 auto;
          gap: 4px;
        }
        .admin-mobile-bottom-nav a {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 4px 4px;
          border-radius: 12px;
          text-decoration: none !important;
          color: rgba(255,255,255,0.42);
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          min-width: 0;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .admin-mobile-bottom-nav a i {
          font-size: 1.15rem;
          line-height: 1;
        }
        .admin-mobile-bottom-nav a.active {
          color: #fbbf24;
          background: rgba(255,160,46,0.1);
        }
        .admin-mobile-bottom-nav a span:last-child {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        @media (max-width: 991.98px) {
          .admin-mobile-bottom-nav { display: block; }
          .admin-layout-with-bottom-nav .main-panel {
            padding-bottom: calc(58px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>
      <nav className="admin-mobile-bottom-nav" aria-label="Main navigation">
        <div className="admin-mobile-bottom-nav-inner">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={`/admin${item.path}`}
              end={item.path === "/dashboard"}
            >
              <i className={`tim-icons ${item.icon}`} aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
