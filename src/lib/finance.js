/* finance.js — auditable capital-investment math.
 * All monetary inputs are expressed in MILLIONS of IDR.
 * Pure functions. No rounding until display.
 */

// Build a year-by-year cash-flow schedule for a single option.
// option: { capex:[{item,amount}], opexAnnual:[{item,amount}], annualBenefit,
//           benefitGrowth, opexGrowth, salvageValue }
export function buildCashFlows(option, horizonYears) {
  const capexTotal = sum((option.capex || []).map((c) => num(c.amount)));
  const opexBase = sum((option.opexAnnual || []).map((c) => num(c.amount)));
  const g = num(option.benefitGrowth);
  const infl = num(option.opexGrowth);
  const benefit0 = num(option.annualBenefit);
  const salvage = num(option.salvageValue);
  const rows = [];
  // Year 0 — capital outlay only.
  rows.push({ year: 0, capex: capexTotal, benefit: 0, opex: 0, net: -capexTotal });
  for (let t = 1; t <= horizonYears; t++) {
    const benefit = benefit0 * Math.pow(1 + g, t - 1);
    const opex = opexBase * Math.pow(1 + infl, t - 1);
    let net = benefit - opex;
    if (t === horizonYears) net += salvage;
    rows.push({ year: t, capex: 0, benefit: benefit, opex: opex, salvage: t === horizonYears ? salvage : 0, net: net });
  }
  return rows;
}

export function npv(rows, rate) {
  return rows.reduce((acc, r) => acc + r.net / Math.pow(1 + rate, r.year), 0);
}

// IRR by bisection. Returns null when no sign change (no real IRR).
export function irr(rows) {
  const f = (r) => npv(rows, r);
  let lo = -0.9, hi = 5.0;
  let flo = f(lo), fhi = f(hi);
  if (isNaN(flo) || isNaN(fhi)) return null;
  if (flo * fhi > 0) {
    // try a wider high bound
    hi = 20;
    fhi = f(hi);
    if (flo * fhi > 0) return null;
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (Math.abs(fmid) < 1e-7) return mid;
    if (flo * fmid < 0) { hi = mid; fhi = fmid; }
    else { lo = mid; flo = fmid; }
  }
  return (lo + hi) / 2;
}

// Cumulative series (undiscounted + discounted) and payback crossover years.
export function paybackSeries(rows, rate) {
  let cum = 0, cumD = 0;
  const series = rows.map((r) => {
    cum += r.net;
    cumD += r.net / Math.pow(1 + rate, r.year);
    return { year: r.year, cum: cum, cumD: cumD };
  });
  return {
    series: series,
    simple: crossing(series, "cum"),
    discounted: crossing(series, "cumD"),
  };
}

// Linear-interpolated year where a cumulative series first turns non-negative.
export function crossing(series, key) {
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1][key];
    const cur = series[i][key];
    if (prev < 0 && cur >= 0) {
      const frac = prev === cur ? 0 : -prev / (cur - prev);
      return series[i - 1].year + frac;
    }
  }
  return null; // never pays back within horizon
}

// Total cost of ownership: capex + lifecycle opex (nominal & discounted).
export function tco(option, horizonYears, rate) {
  const rows = buildCashFlows(option, horizonYears);
  const capexTotal = rows[0].capex;
  let opexNom = 0, opexDisc = 0;
  rows.forEach((r) => {
    if (r.year > 0) {
      opexNom += r.opex;
      opexDisc += r.opex / Math.pow(1 + rate, r.year);
    }
  });
  return { nominal: capexTotal + opexNom, discounted: capexTotal + opexDisc, capex: capexTotal, opexNominal: opexNom };
}

// Full metric pack for one option.
export function analyzeOption(option, horizonYears, rate) {
  const rows = buildCashFlows(option, horizonYears);
  const pv = npv(rows, rate);
  const r = irr(rows);
  const pb = paybackSeries(rows, rate);
  const t = tco(option, horizonYears, rate);
  const capexTotal = rows[0].capex;
  const profitabilityIndex = capexTotal > 0 ? (pv + capexTotal) / capexTotal : null;
  return {
    rows: rows,
    capexTotal: capexTotal,
    opexYear1: rows[1] ? rows[1].opex : 0,
    npv: pv,
    irr: r,
    simplePayback: pb.simple,
    discountedPayback: pb.discounted,
    paybackSeries: pb.series,
    tco: t,
    profitabilityIndex: profitabilityIndex,
  };
}

// One-at-a-time sensitivity (tornado): % change in each driver -> Δ NPV.
// drivers vary by ±swing. Returns sorted by absolute swing magnitude.
export function sensitivity(option, horizonYears, rate, swing) {
  swing = swing || 0.15;
  const base = npv(buildCashFlows(option, horizonYears), rate);
  const clone = () => JSON.parse(JSON.stringify(option));

  function withCapex(mult) {
    const o = clone();
    o.capex = (o.capex || []).map((c) => ({ ...c, amount: num(c.amount) * mult }));
    return npv(buildCashFlows(o, horizonYears), rate);
  }
  function withBenefit(mult) {
    const o = clone();
    o.annualBenefit = num(o.annualBenefit) * mult;
    return npv(buildCashFlows(o, horizonYears), rate);
  }
  function withOpex(mult) {
    const o = clone();
    o.opexAnnual = (o.opexAnnual || []).map((c) => ({ ...c, amount: num(c.amount) * mult }));
    return npv(buildCashFlows(o, horizonYears), rate);
  }
  function withRate(delta) {
    return npv(buildCashFlows(option, horizonYears), rate + delta);
  }

  const drivers = [
    { key: "Annual benefit / revenue", down: withBenefit(1 - swing), up: withBenefit(1 + swing), label: "±" + pct(swing) },
    { key: "CAPEX", down: withCapex(1 + swing), up: withCapex(1 - swing), label: "±" + pct(swing) },
    { key: "Annual OPEX", down: withOpex(1 + swing), up: withOpex(1 - swing), label: "±" + pct(swing) },
    { key: "Discount rate", down: withRate(0.02), up: withRate(-0.02), label: "±2.0 pp" },
  ];
  drivers.forEach((d) => {
    d.base = base;
    d.deltaDown = d.down - base;
    d.deltaUp = d.up - base;
    d.range = Math.abs(d.up - d.down);
  });
  drivers.sort((a, b) => b.range - a.range);
  return { base: base, drivers: drivers };
}

// ---- helpers ----
function sum(a) { return a.reduce((x, y) => x + (isFinite(y) ? y : 0), 0); }
export function num(v) { const n = typeof v === "string" ? parseFloat(v.replace(/[, ]/g, "")) : v; return isFinite(n) ? n : 0; }
function pct(x) { return (x * 100).toFixed(0) + "%"; }

// ---- formatting (millions IDR in; pretty strings out) ----
// value is in MILLIONS of IDR.
export function fmtIDR(valM, opts) {
  opts = opts || {};
  const sign = valM < 0 ? "−" : "";
  const a = Math.abs(valM);
  let body;
  if (a >= 1e6) body = (a / 1e6).toFixed(opts.dp ?? 2) + " tn"; // trillion
  else if (a >= 1e3) body = (a / 1e3).toFixed(opts.dp ?? 2) + " bn";
  else body = a.toFixed(opts.dp ?? (a < 10 ? 1 : 0)) + " mn";
  return (opts.noRp ? "" : "Rp ") + sign + body;
}
export function fmtUSD(valM, fxRate) {
  // valM in million IDR; fxRate = IDR per USD
  if (!fxRate) return "";
  const usd = (valM * 1e6) / fxRate; // in USD
  const sign = usd < 0 ? "−" : "";
  const a = Math.abs(usd);
  let body;
  if (a >= 1e6) body = "$" + (a / 1e6).toFixed(2) + "M";
  else if (a >= 1e3) body = "$" + (a / 1e3).toFixed(1) + "K";
  else body = "$" + a.toFixed(0);
  return sign + body;
}
export function fmtPct(x, dp) { if (x == null || !isFinite(x)) return "—"; return (x * 100).toFixed(dp ?? 1) + "%"; }
export function fmtYears(y) {
  if (y == null) return "Beyond horizon";
  const yr = Math.floor(y);
  const mo = Math.round((y - yr) * 12);
  if (mo === 0) return yr + (yr === 1 ? " yr" : " yrs");
  if (mo === 12) return (yr + 1) + " yrs";
  return yr + "y " + mo + "m";
}
