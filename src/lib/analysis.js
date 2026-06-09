/* analysis.js — live AI orchestration with a graceful worked-example fallback.
 *
 * The model produces the *inputs and qualitative analysis* (CAPEX/OPEX line
 * items, K3 register, ops assessment, risks). All NPV / IRR / payback math is
 * computed downstream in finance.js so every figure is real and auditable —
 * LLMs are unreliable at arithmetic.
 *
 * Calling Claude requires a server-side proxy (an API key must never ship in
 * the browser). This module will, in order:
 *   1. POST the case to VITE_ANALYZE_ENDPOINT (default "/api/analyze") if reachable;
 *   2. fall back to window.claude.complete(...) if a host injects it (design preview);
 *   3. fall back to the worked example, adapted to the user's horizon/rate/fx.
 */
import { SAMPLE } from "./data.js";

const ANALYZE_ENDPOINT = import.meta.env.VITE_ANALYZE_ENDPOINT || "/api/analyze";

// ---- JSON schema prompt ----
export function buildPrompt(c) {
  return `You are a senior capital investment advisor for corporate real estate and industrial facilities in Indonesia, combining financial analysis, Indonesian K3/SMK3 occupational health & safety compliance, and operations/process design.

Analyse the following investment case and return ONLY a single JSON object (no markdown, no prose, no code fences) matching the exact schema below.

INVESTMENT CASE:
- Facility type: ${c.facilityType}
- Location: ${c.location || "(not specified)"}
- Land area: ${c.landArea || "?"} m²; Building area: ${c.buildingArea || "?"} m²
- Purpose: ${c.purpose || "(not specified)"}
- Decision type: ${c.decisionType}
- Analysis horizon: ${c.horizonYears} years
- Discount rate (WACC): ${c.discountRate}%
- FX reference: Rp ${c.fxRate} / USD
- Known costs: ${c.knownCosts || "(none provided — estimate from typical Indonesian market rates and STATE the assumption)"}
- Expected benefit: ${c.expectedBenefit || "(none provided — estimate and STATE the assumption)"}
- Notes: ${c.notes || "(none)"}

RULES:
- ALL monetary amounts MUST be expressed in MILLIONS of IDR as plain numbers (e.g. 42000 means Rp 42 billion). Never use strings, currency symbols, or units inside numeric fields.
- Build a realistic cost structure. If the decision type implies comparison (build-vs-lease, make-vs-buy), provide 2 options; otherwise provide 1.
- Each option needs capex line items, annual opex line items, an annualBenefit, growth rates (decimals like 0.04), and a salvageValue at end of horizon.
- discountRate in the model object must be a DECIMAL (e.g. 0.12). horizonYears an integer.
- K3: assess against real Indonesian OHS regs (UU 1/1970, PP 50/2012 SMK3, relevant Kepmenaker/Permenaker/SNI for THIS facility type). Each item: requirement, regulation (code), mandatory (bool), costImpact (million IDR), timeline, risk (one sentence). Make items SPECIFIC to the facility type.
- Operations: assess layout/flow/capacity for THIS facility type; give ordered process zones, real bottlenecks, a recommended configuration, and 2-3 operating metrics.
- recommendation.verdict must be one of "GO", "NO-GO", "CONDITIONAL". verdictLabel is a short human label. preferredOption is the 0-based index of the best option.
- Do NOT compute NPV/IRR/payback yourself — those are computed downstream from your cash-flow model. Focus on realistic inputs and qualitative analysis.
- Be specific and decision-oriented. No filler.

SCHEMA (return exactly this shape):
{
  "model": {
    "scenarioTitle": string,
    "currency": "IDR",
    "fxRate": ${c.fxRate},
    "discountRate": ${(Number(c.discountRate) / 100).toFixed(4)},
    "horizonYears": ${Number(c.horizonYears)},
    "options": [
      {
        "name": string,
        "type": "build" | "lease" | "make" | "buy",
        "capex": [ { "item": string, "amount": number } ],
        "opexAnnual": [ { "item": string, "amount": number } ],
        "annualBenefit": number,
        "benefitGrowth": number,
        "opexGrowth": number,
        "salvageValue": number,
        "notes": string
      }
    ]
  },
  "recommendation": { "verdict": string, "verdictLabel": string, "preferredOption": number, "rationale": string, "conditions": [string] },
  "financialAssumptions": [string],
  "k3": { "summary": string, "items": [ { "requirement": string, "regulation": string, "mandatory": boolean, "costImpact": number, "timeline": string, "risk": string } ] },
  "ops": { "assessment": string, "zones": [ { "name": string, "role": string, "note": string } ], "bottlenecks": [string], "recommendedConfig": string, "metrics": [ { "label": string, "value": string, "note": string } ] },
  "assumptions": [string],
  "dataGaps": [ { "need": string, "why": string } ],
  "risks": { "narrative": string, "register": [ { "risk": string, "likelihood": string, "impact": string, "mitigation": string } ] }
}`;
}

export function extractJSON(text) {
  if (!text) throw new Error("empty");
  let t = String(text).trim();
  // strip code fences if any
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json object");
  return JSON.parse(t.slice(start, end + 1));
}

export function validate(a) {
  if (!a || !a.model || !Array.isArray(a.model.options) || !a.model.options.length) throw new Error("missing model.options");
  if (!a.recommendation || !a.k3 || !a.ops || !a.risks) throw new Error("missing sections");
  // coerce numerics
  a.model.discountRate = Number(a.model.discountRate) || 0.12;
  a.model.horizonYears = Math.round(Number(a.model.horizonYears) || 10);
  a.model.fxRate = Number(a.model.fxRate) || 16250;
  a.model.options.forEach((o) => {
    o.capex = (o.capex || []).map((x) => ({ item: x.item, amount: Number(x.amount) || 0 }));
    o.opexAnnual = (o.opexAnnual || []).map((x) => ({ item: x.item, amount: Number(x.amount) || 0 }));
    o.annualBenefit = Number(o.annualBenefit) || 0;
    o.benefitGrowth = Number(o.benefitGrowth) || 0;
    o.opexGrowth = Number(o.opexGrowth) || 0;
    o.salvageValue = Number(o.salvageValue) || 0;
  });
  return a;
}

// Adapt the worked example to the user's horizon/rate/fx — the graceful fallback.
function fallbackAnalysis(c) {
  const result = JSON.parse(JSON.stringify(SAMPLE.analysis));
  result.model.discountRate = (Number(c.discountRate) || 12) / 100;
  result.model.horizonYears = Math.round(Number(c.horizonYears) || 10);
  result.model.fxRate = Number(c.fxRate) || 16250;
  return result;
}

// Ask the configured backend proxy for a completion of the given prompt.
async function completeViaEndpoint(prompt, signal) {
  const res = await fetch(ANALYZE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal,
  });
  if (!res.ok) throw new Error("endpoint " + res.status);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const data = await res.json();
    // Accept either {completion}/{text}/{content} or an already-parsed analysis.
    if (data && (data.model || data.recommendation)) return data;
    return data.completion ?? data.text ?? data.content ?? "";
  }
  return res.text();
}

/* Run the analysis for a case. Returns { analysis, usedFallback }.
 * Never throws — always resolves to a renderable analysis. */
export async function generateAnalysis(c, opts = {}) {
  const prompt = buildPrompt(c);
  try {
    let raw;
    if (typeof window !== "undefined" && window.claude && window.claude.complete) {
      raw = await window.claude.complete(prompt);
    } else {
      raw = await completeViaEndpoint(prompt, opts.signal);
    }
    // The endpoint may already return a parsed analysis object.
    const analysis = raw && typeof raw === "object" ? validate(raw) : validate(extractJSON(raw));
    return { analysis, usedFallback: false };
  } catch (e) {
    console.warn("Live analysis unavailable, using worked-example fallback:", e);
    return { analysis: fallbackAnalysis(c), usedFallback: true };
  }
}
