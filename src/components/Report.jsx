/* Report.jsx — the 7-section decision report. */
import React, { useState, useEffect, useMemo } from "react";
import * as Fin from "../lib/finance.js";
import { MetricChip, CashFlowChart, Tornado } from "./primitives.jsx";

const SECTIONS = [
  { id: "recommendation", label: "Recommendation" },
  { id: "financial", label: "Financial analysis" },
  { id: "payback", label: "Payback estimation" },
  { id: "k3", label: "K3 considerations" },
  { id: "operations", label: "Business process" },
  { id: "assumptions", label: "Assumptions & gaps" },
  { id: "risks", label: "Risks & sensitivities" },
];

function lineSum(arr) { return (arr || []).reduce((a, x) => a + Fin.num(x.amount), 0); }

export function Report({ analysis, caseMeta, onReset, errors }) {
  const model = analysis.model;
  const fx = model.fxRate;
  const rate = model.discountRate;
  const horizon = model.horizonYears;

  const metrics = useMemo(
    () => model.options.map((o) => Fin.analyzeOption(o, horizon, rate)),
    [analysis]
  );
  const prefIdx = analysis.recommendation.preferredOption ?? 0;
  const pref = model.options[prefIdx];
  const prefM = metrics[prefIdx];
  const sens = useMemo(() => Fin.sensitivity(pref, horizon, rate), [analysis]);

  const [active, setActive] = useState("recommendation");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const ref = "CIA-" + (caseMeta.location || "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() + "-" + new Date().getFullYear();

  const verdictClass = analysis.recommendation.verdict === "GO" ? "go" : analysis.recommendation.verdict === "NO-GO" ? "nogo" : "conditional";

  return (
    <div className="report wrap">
      <div className="report-layout">
        {/* TOC */}
        <nav className="toc">
          <div className="toc-title">Contents</div>
          <ol>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={"#" + s.id} className={active === s.id ? "active" : ""}>{s.label}</a>
              </li>
            ))}
          </ol>
          <div className="toc-actions">
            <button className="btn btn-ghost" onClick={() => window.print()} type="button">Export PDF</button>
            <button className="btn btn-ghost" onClick={onReset} type="button">New scenario</button>
          </div>
        </nav>

        {/* DOCUMENT */}
        <article className="doc fade-up">
          <header className="doc-head">
            <div className="meta-row">
              <div className="eyebrow">Investment Advisory Memorandum</div>
              <div className="doc-ref">{ref} · {today}</div>
            </div>
            <h1>{model.scenarioTitle}</h1>
            <div className="meta-row">
              <div className="scenario-sub">
                {caseMeta.facilityType} · {caseMeta.location} · {model.options.length > 1 ? "Option selection" : "Single scenario"} · {horizon}-yr horizon
              </div>
              <div className="doc-ref">Confidential — Prepared for Top Management</div>
            </div>
          </header>

          {errors && errors.length ? (
            <div style={{ padding: "0 40px", marginTop: "18px" }}>
              <div className="err-note">
                <span>⚠</span>
                <span>Some sections used the worked-example fallback ({errors.join(", ")}). Re-run to retry the live analysis.</span>
              </div>
            </div>
          ) : null}

          {/* 1 — RECOMMENDATION */}
          <section className="section" id="recommendation">
            <SecHead n="01" title="Recommendation" />
            <div className={"verdict " + verdictClass}>
              <div className="verdict-badge">
                <div className="label">Decision</div>
                <div className="value">{analysis.recommendation.verdictLabel || analysis.recommendation.verdict}</div>
              </div>
              <div className="verdict-body">
                {model.options.length > 1 ? (
                  <div className="pref">Preferred option: <b>{pref.name}</b></div>
                ) : null}
                <div className="rationale">{analysis.recommendation.rationale}</div>
              </div>
            </div>

            <div className="chips">
              <MetricChip k="NPV" v={Fin.fmtIDR(prefM.npv)} sub={Fin.fmtUSD(prefM.npv, fx)} tone={prefM.npv >= 0 ? "pos" : "neg"} />
              <MetricChip k="IRR" v={Fin.fmtPct(prefM.irr)} sub={"vs " + Fin.fmtPct(rate, 0) + " hurdle"} tone={prefM.irr != null && prefM.irr >= rate ? "pos" : "neg"} />
              <MetricChip k="Discounted payback" v={Fin.fmtYears(prefM.discountedPayback)} sub={"simple " + Fin.fmtYears(prefM.simplePayback)} />
              <MetricChip k="Total CAPEX" v={Fin.fmtIDR(prefM.capexTotal)} sub={Fin.fmtUSD(prefM.capexTotal, fx)} />
            </div>

            {analysis.recommendation.conditions && analysis.recommendation.conditions.length ? (
              <div style={{ marginTop: "22px" }}>
                <div className="block-label">Conditions to satisfy before capital release</div>
                <ul className="bullets">
                  {analysis.recommendation.conditions.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            ) : null}
          </section>

          {/* 2 — FINANCIAL */}
          <section className="section" id="financial">
            <SecHead n="02" title="Financial analysis" />
            <div className="tbl-wrap">
              <table className="tbl">
                <caption>All figures in IDR (USD reference at Rp {fx.toLocaleString()} / USD). Computed in-browser.</caption>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {model.options.map((o, i) => (
                      <th key={i} className="num">{o.name}{i === prefIdx && model.options.length > 1 ? " ★" : ""}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <MetricRow label="Total CAPEX" m={metrics} pick={(x) => Fin.fmtIDR(x.capexTotal)} prefIdx={prefIdx} n={model.options.length} />
                  <MetricRow label="Annual OPEX (yr 1)" m={metrics} pick={(x) => Fin.fmtIDR(x.opexYear1)} prefIdx={prefIdx} n={model.options.length} />
                  <MetricRow label={"NPV @ " + Fin.fmtPct(rate, 0)} m={metrics} pick={(x) => Fin.fmtIDR(x.npv)} prefIdx={prefIdx} n={model.options.length} strong />
                  <MetricRow label="IRR" m={metrics} pick={(x) => Fin.fmtPct(x.irr)} prefIdx={prefIdx} n={model.options.length} />
                  <MetricRow label="Profitability index" m={metrics} pick={(x) => (x.profitabilityIndex != null ? x.profitabilityIndex.toFixed(2) + "×" : "—")} prefIdx={prefIdx} n={model.options.length} />
                  <MetricRow label="Simple payback" m={metrics} pick={(x) => Fin.fmtYears(x.simplePayback)} prefIdx={prefIdx} n={model.options.length} />
                  <MetricRow label="Discounted payback" m={metrics} pick={(x) => Fin.fmtYears(x.discountedPayback)} prefIdx={prefIdx} n={model.options.length} />
                  <MetricRow label={"TCO (PV, " + horizon + "yr)"} m={metrics} pick={(x) => Fin.fmtIDR(x.tco.discounted)} prefIdx={prefIdx} n={model.options.length} />
                </tbody>
              </table>
            </div>

            <div className="two-col" style={{ marginTop: "28px" }}>
              <div>
                <div className="block-label">CAPEX breakdown — {pref.name}</div>
                <CostTable rows={pref.capex} fx={fx} total="Total CAPEX" />
              </div>
              <div>
                <div className="block-label">Recurring OPEX (year 1) — {pref.name}</div>
                <CostTable rows={pref.opexAnnual} fx={fx} total="Annual OPEX" />
              </div>
            </div>

            <div className="footnotes">
              {(analysis.financialAssumptions || []).map((a, i) => (
                <div key={i}><b>{i + 1}.</b> {a}</div>
              ))}
            </div>
          </section>

          {/* 3 — PAYBACK */}
          <section className="section" id="payback">
            <SecHead n="03" title="Payback estimation" />
            <p className="prose" style={{ marginBottom: "18px" }}>
              Payback shown for the preferred option (<b>{pref.name}</b>) on both an undiscounted (simple) and a
              discounted basis at the {Fin.fmtPct(rate, 0)} discount rate. The crossover is where cumulative cash flow
              turns positive.
            </p>

            <CashFlowChart series={prefM.paybackSeries} simple={prefM.simplePayback} discounted={prefM.discountedPayback} />

            <div className="two-col" style={{ marginTop: "22px" }}>
              <div>
                <div className="block-label">Simple payback</div>
                <div className="formula">
                  <span className="lbl">Cumulative net CF crosses Rp 0</span><br />
                  CAPEX = {Fin.fmtIDR(prefM.capexTotal)}<br />
                  Yr-1 net = {Fin.fmtIDR(prefM.rows[1].net)}<br />
                  → simple payback = <span className="res">{Fin.fmtYears(prefM.simplePayback)}</span>
                </div>
              </div>
              <div>
                <div className="block-label">Discounted payback</div>
                <div className="formula">
                  <span className="lbl">Σ CF<sub>t</sub> / (1+{rate})<sup>t</sup> crosses 0</span><br />
                  r = {Fin.fmtPct(rate, 0)}, horizon = {horizon} yrs<br />
                  NPV = {Fin.fmtIDR(prefM.npv)}<br />
                  → discounted payback = <span className="res">{Fin.fmtYears(prefM.discountedPayback)}</span>
                </div>
              </div>
            </div>

            <div className="tbl-wrap" style={{ marginTop: "22px" }}>
              <table className="tbl">
                <caption>Cash-flow schedule (IDR), preferred option</caption>
                <thead>
                  <tr><th>Year</th><th className="num">Net cash flow</th><th className="num">Cumulative</th><th className="num">Discounted CF</th><th className="num">Cumulative (PV)</th></tr>
                </thead>
                <tbody>
                  {prefM.rows.map((r, i) => {
                    const dcf = r.net / Math.pow(1 + rate, r.year);
                    const s = prefM.paybackSeries[i];
                    return (
                      <tr key={i}>
                        <td>{r.year}</td>
                        <td className="num">{Fin.fmtIDR(r.net)}</td>
                        <td className="num" style={{ color: s.cum >= 0 ? "var(--go)" : "var(--nogo)" }}>{Fin.fmtIDR(s.cum)}</td>
                        <td className="num">{Fin.fmtIDR(dcf)}</td>
                        <td className="num" style={{ color: s.cumD >= 0 ? "var(--go)" : "var(--nogo)" }}>{Fin.fmtIDR(s.cumD)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4 — K3 */}
          <section className="section" id="k3">
            <SecHead n="04" title="K3 (SMK3) considerations" />
            <p className="prose" style={{ marginBottom: "18px" }}>{analysis.k3.summary}</p>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Compliance requirement</th><th>Regulation</th><th>Status</th><th className="num">Cost impact</th><th>Timeline</th></tr>
                </thead>
                <tbody>
                  {analysis.k3.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ minWidth: "220px" }}>{it.requirement}<div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "3px", lineHeight: 1.4 }}>{it.risk}</div></td>
                      <td><span className="reg-code">{it.regulation}</span></td>
                      <td><span className={"pill " + (it.mandatory ? "mandatory" : "recommended")}>{it.mandatory ? "Mandatory" : "Recommended"}</span></td>
                      <td className="num">{Fin.fmtIDR(Fin.num(it.costImpact))}</td>
                      <td style={{ whiteSpace: "nowrap", fontSize: "12px" }}>{it.timeline}</td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td>Total K3 compliance cost</td><td></td><td></td>
                    <td className="num">{Fin.fmtIDR(analysis.k3.items.reduce((a, x) => a + Fin.num(x.costImpact), 0))}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="callout" style={{ marginTop: "18px" }}>
              <div className="ct">Why this is a cost & risk driver, not an afterthought</div>
              <p>Mandatory items gate the Sertifikat Laik Fungsi (SLF) and insurance cover; deferring them risks work-stoppage orders and personal liability for directors under UU 1/1970. These costs belong in the CAPEX/OPEX model above.</p>
            </div>
          </section>

          {/* 5 — OPERATIONS */}
          <section className="section" id="operations">
            <SecHead n="05" title="Business process & operations" />
            <p className="prose" style={{ marginBottom: "16px" }}>{analysis.ops.assessment}</p>

            <div className="block-label">Recommended material / workflow flow</div>
            <div className="flow">
              {analysis.ops.zones.map((z, i) => (
                <React.Fragment key={i}>
                  <div className="zone">
                    <div className="zn">{String(i + 1).padStart(2, "0")}</div>
                    <div className="zt">{z.name}</div>
                    <div className="zd">{z.role}{z.note ? " — " + z.note : ""}</div>
                  </div>
                  {i < analysis.ops.zones.length - 1 ? <div className="arrow">→</div> : null}
                </React.Fragment>
              ))}
            </div>

            <div className="two-col" style={{ marginTop: "20px" }}>
              <div>
                <div className="block-label">Identified bottlenecks</div>
                <ul className="bullets warn">
                  {analysis.ops.bottlenecks.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
              <div>
                <div className="block-label">Operating metrics</div>
                <div className="chips" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 0 }}>
                  {analysis.ops.metrics.map((m, i) => (
                    <MetricChip key={i} k={m.label} v={m.value} sub={m.note} />
                  ))}
                </div>
              </div>
            </div>

            <div className="callout" style={{ marginTop: "20px" }}>
              <div className="ct">Recommended configuration</div>
              <p>{analysis.ops.recommendedConfig}</p>
            </div>
          </section>

          {/* 6 — ASSUMPTIONS & GAPS */}
          <section className="section" id="assumptions">
            <SecHead n="06" title="Assumptions & data gaps" />
            <div className="two-col">
              <div>
                <div className="block-label">Assumptions made</div>
                <ul className="bullets">
                  {analysis.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
              <div>
                <div className="block-label">Data still needed</div>
                <div>
                  {analysis.dataGaps.map((g, i) => (
                    <div className="data-gap" key={i}>
                      <span className="tag">NEED</span>
                      <span className="txt"><b style={{ color: "var(--ink)" }}>{g.need}</b> — {g.why}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 7 — RISKS */}
          <section className="section" id="risks">
            <SecHead n="07" title="Risks & sensitivities" />
            <p className="prose" style={{ marginBottom: "18px" }}>{analysis.risks.narrative}</p>

            <div className="block-label">Sensitivity of NPV to key drivers (tornado)</div>
            <Tornado data={sens} />

            <div className="tbl-wrap" style={{ marginTop: "26px" }}>
              <table className="tbl">
                <caption>Risk register</caption>
                <thead>
                  <tr><th>Risk</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th></tr>
                </thead>
                <tbody>
                  {analysis.risks.register.map((r, i) => (
                    <tr key={i}>
                      <td style={{ minWidth: "200px" }}>{r.risk}</td>
                      <td><LikChip v={r.likelihood} /></td>
                      <td><LikChip v={r.impact} /></td>
                      <td style={{ fontSize: "12.5px", color: "var(--ink-2)" }}>{r.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div style={{ padding: "22px 40px", color: "var(--muted)", fontSize: "11.5px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <span>{ref} · Capital Investment Advisory</span>
            <span>Decision-grade analysis · figures computed &amp; auditable · methods applied selectively to the case</span>
          </div>
        </article>
      </div>
    </div>
  );
}

function SecHead({ n, title }) {
  return (
    <div className="section-head">
      <span className="section-num">{n}</span>
      <h2>{title}</h2>
    </div>
  );
}

function MetricRow({ label, m, pick, prefIdx, n, strong }) {
  return (
    <tr className={strong ? "total" : ""}>
      <td>{label}</td>
      {m.map((x, i) => (
        <td key={i} className="num" style={i === prefIdx && n > 1 ? { color: "var(--accent)", fontWeight: 600 } : null}>{pick(x)}</td>
      ))}
    </tr>
  );
}

function CostTable({ rows, fx, total }) {
  const t = lineSum(rows);
  return (
    <table className="tbl">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{r.item}</td>
            <td className="num">{Fin.fmtIDR(Fin.num(r.amount))} <span className="usd">{Fin.fmtUSD(Fin.num(r.amount), fx)}</span></td>
          </tr>
        ))}
        <tr className="total"><td>{total}</td><td className="num">{Fin.fmtIDR(t)} <span className="usd">{Fin.fmtUSD(t, fx)}</span></td></tr>
      </tbody>
    </table>
  );
}

function LikChip({ v }) {
  const map = { high: "var(--nogo)", medium: "var(--cond)", low: "var(--go)" };
  const c = map[(v || "").toLowerCase()] || "var(--muted)";
  return <span style={{ color: c, fontWeight: 600, fontSize: "12px" }}>{v}</span>;
}
