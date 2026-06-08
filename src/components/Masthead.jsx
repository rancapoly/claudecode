/* Masthead.jsx — institutional broadsheet header. */
import React from "react";

export function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <div className="brand">
          <div className="monogram">C</div>
          <div className="brand-text">
            <div className="name">Capital Investment Advisory</div>
            <div className="sub">Real Estate · Industrial Facilities</div>
          </div>
        </div>
        <div className="masthead-meta">
          <div className="tag">CONFIDENTIAL</div>
          <div style={{ marginTop: "6px" }}>Decision support for Top Management</div>
        </div>
      </div>
    </header>
  );
}
