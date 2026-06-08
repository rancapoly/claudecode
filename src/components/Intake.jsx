/* Intake.jsx — investment case intake form. */
import React from "react";

export function Intake({ value, onChange, onGenerate, onLoadSample }) {
  const c = value;
  const set = (k) => (e) => onChange({ ...c, [k]: e.target.value });
  const setVal = (k, v) => onChange({ ...c, [k]: v });

  const decisionOpts = [
    { k: "build", label: "Build & Own" },
    { k: "lease", label: "Lease" },
    { k: "build-vs-lease", label: "Build vs Lease" },
    { k: "make-vs-buy", label: "Make vs Buy" },
  ];

  const facilityOpts = [
    "Distribution warehouse", "Manufacturing plant / factory", "Cold storage facility",
    "Office building", "Mixed industrial / light assembly", "Logistics cross-dock", "Other",
  ];

  return (
    <div className="intake wrap">
      <div className="intake-hero">
        <div className="eyebrow">Investment Case Intake</div>
        <h1>Structure a capital investment decision for a building or facility.</h1>
        <p>
          Provide the requirement details below. The advisor returns a decision-grade analysis — recommendation,
          financial model with NPV / IRR / payback, K3 (SMK3) compliance, operational layout, and sensitivities —
          with every figure computed and auditable.
        </p>
      </div>

      <div className="intake-grid">
        <div className="form-card">
          <div className="form-section">
            <h3><span className="idx">01</span> Facility</h3>
            <div className="field-row">
              <div className="field">
                <label>Facility type</label>
                <select value={c.facilityType} onChange={set("facilityType")}>
                  {facilityOpts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Location</label>
                <input value={c.location} onChange={set("location")} placeholder="e.g. Cikarang, Bekasi" />
              </div>
            </div>
            <div className="field-row" style={{ marginTop: "14px" }}>
              <div className="field">
                <label>Land area <span className="hint">m²</span></label>
                <div className="with-affix suffix">
                  <input className="num" type="number" value={c.landArea} onChange={set("landArea")} />
                  <span className="affix">m²</span>
                </div>
              </div>
              <div className="field">
                <label>Building area <span className="hint">m²</span></label>
                <div className="with-affix suffix">
                  <input className="num" type="number" value={c.buildingArea} onChange={set("buildingArea")} />
                  <span className="affix">m²</span>
                </div>
              </div>
            </div>
            <div className="field span2" style={{ marginTop: "14px" }}>
              <label>Purpose / intended use</label>
              <textarea value={c.purpose} onChange={set("purpose")} placeholder="What the facility is for, throughput, headcount, shift pattern…" />
            </div>
          </div>

          <div className="form-section">
            <h3><span className="idx">02</span> Decision & horizon</h3>
            <div className="field span2">
              <label>Decision type</label>
              <div className="seg">
                {decisionOpts.map((o) => (
                  <button key={o.k} className={c.decisionType === o.k ? "active" : ""} onClick={() => setVal("decisionType", o.k)} type="button">{o.label}</button>
                ))}
              </div>
            </div>
            <div className="field-row three" style={{ marginTop: "16px" }}>
              <div className="field">
                <label>Analysis horizon</label>
                <div className="with-affix suffix">
                  <input className="num" type="number" value={c.horizonYears} onChange={set("horizonYears")} />
                  <span className="affix">yrs</span>
                </div>
              </div>
              <div className="field">
                <label>Discount rate <span className="hint">WACC</span></label>
                <div className="with-affix suffix">
                  <input className="num" type="number" step="0.5" value={c.discountRate} onChange={set("discountRate")} />
                  <span className="affix">%</span>
                </div>
              </div>
              <div className="field">
                <label>FX reference <span className="hint">IDR/USD</span></label>
                <div className="with-affix"><span className="affix">Rp</span>
                  <input className="num" type="number" value={c.fxRate} onChange={set("fxRate")} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3><span className="idx">03</span> Costs & expected benefit</h3>
            <div className="field span2">
              <label>Known costs <span className="hint">land, construction, equipment, fit-out, lease rates…</span></label>
              <textarea value={c.knownCosts} onChange={set("knownCosts")} placeholder="Whatever you know — unit rates, quotes, comparable lease. Gaps are fine; the advisor will flag them." />
            </div>
            <div className="field span2" style={{ marginTop: "14px" }}>
              <label>Expected benefit / revenue <span className="hint">savings, throughput value, revenue</span></label>
              <textarea value={c.expectedBenefit} onChange={set("expectedBenefit")} placeholder="Annual cost savings, revenue, or throughput value the facility unlocks." />
            </div>
          </div>

          <div className="form-section">
            <h3><span className="idx">04</span> Context & constraints</h3>
            <div className="field span2">
              <label>Additional notes <span className="hint">optional</span></label>
              <textarea value={c.notes} onChange={set("notes")} placeholder="Headcount, shifts, special hazards (cold-chain, chemicals), timeline pressures, financing…" />
            </div>
          </div>
        </div>

        <div>
          <div className="aside-card">
            <h4>Methodology applied</h4>
            <ul className="method-list">
              <li><span className="k">NPV</span><span>Net present value at WACC</span></li>
              <li><span className="k">IRR</span><span>Internal rate of return</span></li>
              <li><span className="k">PB</span><span>Simple &amp; discounted payback</span></li>
              <li><span className="k">TCO</span><span>Lifecycle cost of ownership</span></li>
              <li><span className="k">CBA</span><span>Cost–benefit &amp; option selection</span></li>
              <li><span className="k">K3</span><span>SMK3 / UU 1/1970 compliance</span></li>
              <li><span className="k">OPS</span><span>Layout, flow &amp; capacity</span></li>
            </ul>
            <p className="aside-note">
              Methods are applied selectively to the case. Financial figures are computed in-browser and shown with
              their formulas so the analysis is fully auditable.
            </p>
          </div>

          <div className="intake-actions" style={{ flexDirection: "column", alignItems: "stretch", marginTop: "18px" }}>
            <button className="btn btn-primary" style={{ justifyContent: "center" }} onClick={onGenerate} type="button">
              Generate analysis <span className="arr">→</span>
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: "center" }} onClick={onLoadSample} type="button">
              Load worked example
            </button>
            <div className="note" style={{ textAlign: "center" }}>~20–30s · 120 headcount warehouse demo available</div>
          </div>
        </div>
      </div>
    </div>
  );
}
