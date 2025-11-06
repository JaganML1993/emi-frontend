import React from "react";
import { Spinner } from "reactstrap";

function ProgressLoader({ loading, message = "Loading..." }) {
  if (!loading) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
      {message && (
        <div
          style={{
            color: "#FFFFFF",
            fontSize: "1rem",
            fontWeight: 500,
            marginTop: "20px",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

export default ProgressLoader;

