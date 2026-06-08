/* Loading.jsx — progress stepper shown while the analysis is generated. */
import React from "react";

export const GEN_STEPS = [
  { id: "frame", label: "Framing the scenario & cost structure" },
  { id: "finance", label: "Building CAPEX / OPEX & cash-flow model" },
  { id: "k3", label: "Assessing K3 / SMK3 compliance" },
  { id: "ops", label: "Evaluating layout, flow & capacity" },
  { id: "synth", label: "Synthesising recommendation & risks" },
];

export function Loading({ stepIdx, caseData }) {
  return (
    <div className="loading-screen wrap">
      <div className="loader">
        <div className="eyebrow" style={{ justifyContent: "center" }}>Analysis in progress</div>
        <h2>Structuring the investment decision</h2>
        <div className="sub">{caseData.facilityType}{caseData.location ? " · " + caseData.location : ""} · {caseData.horizonYears}-yr horizon</div>
        <div className="steps">
          {GEN_STEPS.map((s, i) => (
            <div key={s.id} className={"step " + (i < stepIdx ? "done" : i === stepIdx ? "active" : "")}>
              <span className="dot">
                {i < stepIdx ? "✓" : i === stepIdx ? <span className="spin"></span> : i + 1}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
