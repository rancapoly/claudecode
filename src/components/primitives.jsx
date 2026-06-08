/* primitives.jsx — shared report UI atoms. */
import React from "react";
import { fmtIDR, fmtUSD, fmtYears } from "../lib/finance.js";

/* Money: primary IDR with faint USD reference underneath (optional). */
export function Money({ m, usd = false, fx, dp, className = "" }) {
  return (
    <span className={className}>
      <span>{fmtIDR(m, { dp })}</span>
      {usd && fx ? <span className="usd"> · {fmtUSD(m, fx)}</span> : null}
    </span>
  );
}

export function MetricChip({ k, v, sub, tone }) {
  const cls = tone === "pos" ? "chip pos" : tone === "neg" ? "chip neg" : "chip";
  return (
    <div className={cls}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

/* Cumulative cash-flow chart: undiscounted + discounted, with payback crossover. */
export function CashFlowChart({ series, simple, discounted }) {
  const W = 680, H = 280, padL = 64, padR = 18, padT = 18, padB = 36;
  const iw = W - padL - padR, ih = H - padT - padB;

  const years = series.map((s) => s.year);
  const vals = series.flatMap((s) => [s.cum, s.cumD]);
  const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals);
  const xMax = Math.max(...years);

  const x = (yr) => padL + (xMax === 0 ? 0 : (yr / xMax) * iw);
  const y = (v) => padT + ih - ((v - minV) / (maxV - minV || 1)) * ih;

  const path = (key) => series.map((s, i) => (i === 0 ? "M" : "L") + x(s.year).toFixed(1) + "," + y(s[key]).toFixed(1)).join(" ");
  const area = (key) => "M" + x(0) + "," + y(0) + " " + series.map((s) => "L" + x(s.year).toFixed(1) + "," + y(s[key]).toFixed(1)).join(" ") + " L" + x(xMax) + "," + y(0) + " Z";

  // y gridlines (5 ticks)
  const ticks = [];
  const step = niceStep((maxV - minV) / 4);
  for (let v = Math.ceil(minV / step) * step; v <= maxV + 1e-6; v += step) ticks.push(v);

  const zeroY = y(0);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cumulative cash flow">
        {/* gridlines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#E6DFD0" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontFamily="var(--mono)" fontSize="9.5" fill="#97A0A9">
              {fmtIDR(t, { dp: t === 0 ? 0 : 0, noRp: true })}
            </text>
          </g>
        ))}
        {/* zero line */}
        <line x1={padL} x2={W - padR} y1={zeroY} y2={zeroY} stroke="#15202B" strokeWidth="1.2" />
        {/* x labels */}
        {years.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 14} textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5" fill="#97A0A9">{yr}</text>
        ))}
        <text x={padL + iw / 2} y={H - 2} textAnchor="middle" fontSize="9.5" fill="#6B7682" letterSpacing="1.5">YEAR</text>

        {/* areas */}
        <path d={area("cum")} fill="rgba(14,90,72,.07)" />
        {/* discounted line */}
        <path d={path("cumD")} fill="none" stroke="#B68A3E" strokeWidth="2" strokeDasharray="5 4" />
        {/* undiscounted line */}
        <path d={path("cum")} fill="none" stroke="#0E5A48" strokeWidth="2.4" />

        {/* crossover markers */}
        {crossMarker(simple, "cum", series, x, y, zeroY, "#0E5A48")}
        {crossMarker(discounted, "cumD", series, x, y, zeroY, "#B68A3E")}

        {/* end dots */}
        <circle cx={x(xMax)} cy={y(series[series.length - 1].cum)} r="3" fill="#0E5A48" />
      </svg>
      <div className="chart-legend">
        <span className="key"><span className="swatch" style={{ background: "#0E5A48" }}></span> Cumulative net cash flow (nominal)</span>
        <span className="key"><span className="swatch" style={{ background: "#B68A3E", height: "0", borderTop: "2px dashed #B68A3E" }}></span> Discounted (PV)</span>
        <span className="key" style={{ color: "#6B7682" }}>Crossover = payback</span>
      </div>
    </div>
  );
}

function crossMarker(yr, key, series, x, y, zeroY) {
  if (yr == null) return null;
  const cx = x(yr);
  return (
    <g>
      <line x1={cx} x2={cx} y1={zeroY - 7} y2={zeroY + 7} stroke="#15202B" strokeWidth="1" />
      <circle cx={cx} cy={zeroY} r="3.5" fill="#fff" stroke="#15202B" strokeWidth="1.4" />
      <text x={cx} y={zeroY - 12} textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5" fill="#15202B" fontWeight="600">
        {fmtYears(yr)}
      </text>
    </g>
  );
}

function niceStep(raw) {
  if (raw <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let nice;
  if (norm < 1.5) nice = 1; else if (norm < 3) nice = 2; else if (norm < 7) nice = 5; else nice = 10;
  return nice * mag;
}

/* Sensitivity tornado. drivers: [{key, deltaDown, deltaUp, label, base}] */
export function Tornado({ data }) {
  const drivers = data.drivers;
  const maxAbs = Math.max(...drivers.flatMap((d) => [Math.abs(d.deltaDown), Math.abs(d.deltaUp)]), 1);
  const toPct = (v) => Math.min(50, (Math.abs(v) / maxAbs) * 50); // half-width %

  return (
    <div>
      <div className="tornado">
        {drivers.map((d, i) => (
          <div className="row" key={i}>
            <div className="name">{d.key} <span style={{ color: "var(--faint)", fontFamily: "var(--mono)", fontSize: "10.5px" }}>{d.label}</span></div>
            <div className="bar-track">
              <div className="center"></div>
              {/* downside (left, negative delta) */}
              <div className="bar neg" style={{ right: "50%", width: toPct(d.deltaDown) + "%" }} title={fmtIDR(d.deltaDown)}></div>
              {/* upside (right) */}
              <div className="bar pos" style={{ left: "50%", width: toPct(d.deltaUp) + "%" }} title={fmtIDR(d.deltaUp)}></div>
            </div>
          </div>
        ))}
      </div>
      <div className="tornado-scale">
        <div></div>
        <div className="ax">
          <span>−{fmtIDR(maxAbs, { dp: 0 })}</span>
          <span>Δ NPV vs base</span>
          <span>+{fmtIDR(maxAbs, { dp: 0 })}</span>
        </div>
      </div>
    </div>
  );
}
