# Capital Investment Advisory

An institutional, decision-grade analysis tool for **corporate real estate and
industrial facility investments** (factories, warehouses, offices). Enter a
case and it returns a seven-section advisory memorandum: recommendation,
financial model (NPV / IRR / payback / TCO), Indonesian **K3 / SMK3**
compliance, operations layout, assumptions & data gaps, and risk/sensitivity
analysis — with **every figure computed and auditable**.

Built from a Claude Design handoff. The visual system is institutional Big-4:
Spectral serif headlines, IBM Plex Sans/Mono, parchment + ink-navy with a
teal-green accent and restrained gold hairlines, IDR-primary with USD reference.

## Design principle: the model does the math, not the LLM

The live AI produces the **inputs and qualitative analysis** — CAPEX/OPEX line
items, the K3 register, the operations assessment, risks. All arithmetic
(NPV, IRR by bisection, simple + discounted payback, TCO, profitability index,
and the sensitivity tornado) is computed deterministically in `src/lib/finance.js`
so the numbers shown to a decision-maker are real and reproducible, with their
formulas displayed. LLMs are unreliable at arithmetic; this keeps the report
trustworthy.

## Run it

```bash
npm install
npm run dev      # dev server (Vite)
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## Live AI integration

Calling Claude requires a **server-side proxy** — an API key must never ship in
the browser. The client (`src/lib/analysis.js`) resolves a completion in this
order, and **always falls back gracefully** to the bundled worked example:

1. `window.claude.complete(prompt)` if a host injects it (e.g. a design preview);
2. otherwise `POST` the prompt to `VITE_ANALYZE_ENDPOINT` (default `/api/analyze`);
3. otherwise the **worked-example fallback**, adapted to the entered horizon /
   discount rate / FX — the report still renders fully, with a banner noting it.

To wire up real analysis, stand up an endpoint that accepts
`{ "prompt": "..." }` and returns either the raw model text or a parsed analysis
object, calling the Claude API with your key server-side. Point the client at it
with an `.env` file:

```
VITE_ANALYZE_ENDPOINT=https://your-host/api/analyze
```

The expected JSON schema the model must return is defined in
`buildPrompt()` in `src/lib/analysis.js`.

## Structure

```
index.html              Vite entry
src/
  main.jsx              React root
  App.jsx               state machine: intake → loading → report
  styles.css            the institutional design system (design tokens + layout)
  lib/
    finance.js          auditable capital-investment math (pure functions)
    data.js             worked example + graceful fallback analysis
    analysis.js         prompt builder, JSON extraction/validation, AI orchestration
  components/
    Masthead.jsx        broadsheet header
    Intake.jsx          investment case intake form
    Loading.jsx         generation progress stepper
    Report.jsx          the 7-section decision memorandum
    primitives.jsx      Money, MetricChip, CashFlowChart (SVG), Tornado (SVG)
```

## Worked example

"Load worked example" fills a 120-headcount Cikarang distribution warehouse case
(build-vs-lease, 10-year horizon, 12% WACC) so you can see a complete report
without configuring the backend.
