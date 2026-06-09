/* data.js — worked example + fallback analysis.
 * Monetary values in MILLIONS of IDR. Consumed by the finance lib + the report renderer.
 * Used for (a) the "Load worked example" demo and (b) graceful fallback if a live
 * AI call fails for a given section.
 */
export const SAMPLE = {
  case: {
    facilityType: "Distribution warehouse",
    purpose: "In-house regional distribution hub to replace third-party (3PL) logistics and leased overflow space",
    location: "Cikarang, Bekasi (Greater Jakarta industrial corridor)",
    landArea: 12000,
    buildingArea: 8000,
    decisionType: "build-vs-lease",
    horizonYears: 10,
    discountRate: 12,
    currency: "IDR",
    fxRate: 16250,
    knownCosts: "Land offer ~Rp 3.5M/m²; warehouse construction ~Rp 4.5M/m²; racking + MHE quote ~Rp 14bn; comparable lease ~Rp 95k/m²/month.",
    expectedBenefit: "Annual logistics cost savings + throughput value ~Rp 30bn vs current outsourced model.",
    notes: "Headcount ~120 at full ramp. Operates two shifts. Cold-chain not required. Targeting SLF + SMK3 certification before go-live.",
  },

  analysis: {
    model: {
      scenarioTitle: "Regional Distribution Hub — Cikarang",
      currency: "IDR",
      fxRate: 16250,
      discountRate: 0.12,
      horizonYears: 10,
      options: [
        {
          name: "Build & Own",
          type: "build",
          capex: [
            { item: "Land acquisition (12,000 m²)", amount: 42000 },
            { item: "Warehouse construction (8,000 m²)", amount: 36000 },
            { item: "Racking, MHE & dock equipment", amount: 14000 },
            { item: "Fit-out, utilities & fire system", amount: 8000 },
          ],
          opexAnnual: [
            { item: "Preventive maintenance & repairs", amount: 2200 },
            { item: "Utilities (power, water)", amount: 3400 },
            { item: "Facility staffing", amount: 4800 },
            { item: "Insurance & property tax (PBB)", amount: 1900 },
            { item: "Security & compliance", amount: 1200 },
          ],
          annualBenefit: 30000,
          benefitGrowth: 0.04,
          opexGrowth: 0.04,
          salvageValue: 95000,
          notes: "Owns an appreciating land asset; full operational control. Highest capital intensity.",
        },
        {
          name: "Lease (Build-to-Suit)",
          type: "lease",
          capex: [
            { item: "Racking, MHE & dock equipment", amount: 14000 },
            { item: "Fit-out & tenant improvements", amount: 6000 },
          ],
          opexAnnual: [
            { item: "Lease payments (8,000 m² @ Rp 95k/m²/mo)", amount: 9120 },
            { item: "Maintenance (tenant scope)", amount: 900 },
            { item: "Utilities (power, water)", amount: 3400 },
            { item: "Facility staffing", amount: 4800 },
            { item: "Insurance & security", amount: 1800 },
          ],
          annualBenefit: 30000,
          benefitGrowth: 0.04,
          opexGrowth: 0.06,
          salvageValue: 3000,
          notes: "Low capital outlay and flexibility, but lease escalation erodes returns and builds no asset.",
        },
      ],
    },

    recommendation: {
      verdict: "CONDITIONAL",
      verdictLabel: "Conditional Go",
      preferredOption: 0,
      rationale:
        "Proceed with the Build & Own option: it delivers the higher NPV and secures an appreciating land asset in a constrained industrial corridor — conditional on locking benefit realisation (3PL exit, volume commitments) and the SMK3/SLF compliance path before capital release.",
      conditions: [
        "Binding internal volume commitment underwriting ≥85% of the modelled annual benefit",
        "Fixed-price construction contract with ≤8% contingency",
        "SLF (Sertifikat Laik Fungsi) and SMK3 certification milestones in the build schedule",
      ],
    },

    financialAssumptions: [
      "All figures in million IDR, real-terms, FY-start cash flows. FX reference Rp 16,250 / USD.",
      "Discount rate 12% reflects blended WACC for an industrial-property-backed investment.",
      "Annual benefit = logistics cost avoided + throughput value vs. current outsourced model; grows 4% p.a.",
      "Build salvage (yr 10) = depreciated structure + appreciated land at conservative 3% p.a. land growth.",
      "Lease escalation 6% p.a. per prevailing build-to-suit terms in the corridor.",
    ],

    k3: {
      summary:
        "A two-shift, ~120-worker warehouse with MHE traffic is a medium-risk workplace under Indonesian OHS law. SMK3 certification, fire protection and MHE operator licensing are mandatory and must be funded in CAPEX/OPEX, not treated as post-occupancy items — non-compliance blocks the SLF and exposes directors to UU 1/1970 sanctions.",
      items: [
        { requirement: "SMK3 management system + certification", regulation: "PP 50/2012", mandatory: true, costImpact: 650, timeline: "4–6 months", risk: "Mandatory for ≥100 workers / high-risk; absence blocks operating legitimacy and tender eligibility." },
        { requirement: "P2K3 safety committee + certified secretary (Ahli K3)", regulation: "UU 1/1970; Permenaker 04/1987", mandatory: true, costImpact: 180, timeline: "1–2 months", risk: "Legal precondition for SMK3 audit; director liability if unformed." },
        { requirement: "Active fire protection (hydrant, sprinkler, APAR, alarm)", regulation: "Kepmenaker 186/1999; SNI 03-3989", mandatory: true, costImpact: 2400, timeline: "with construction", risk: "Total-loss exposure; SLF and insurance both withheld without certified system." },
        { requirement: "MHE / forklift operator licences (SIO) + permits (SILO)", regulation: "Permenaker 08/2020", mandatory: true, costImpact: 220, timeline: "before go-live", risk: "Uninsured incidents and work-stoppage orders from Disnaker inspection." },
        { requirement: "Emergency response, evacuation routes & assembly", regulation: "Kepmenaker 186/1999", mandatory: true, costImpact: 160, timeline: "1 month", risk: "Casualty risk and criminal exposure in an evacuation event." },
        { requirement: "Ergonomics & manual-handling program", regulation: "Permenaker 05/2018 (work environment)", mandatory: false, costImpact: 120, timeline: "ongoing", risk: "Cumulative injury claims and productivity loss; raises insurance loading." },
      ],
    },

    ops: {
      assessment:
        "The proposed throughput implies a directional flow warehouse. A straight-through U-flow with segregated inbound/outbound docks minimises cross-traffic and travel distance. The binding constraint is dock-door capacity at peak; storage cube is comfortable at the modelled volume.",
      zones: [
        { name: "Receiving", role: "Inbound & QC", note: "4 dock doors, staging + quality hold" },
        { name: "Putaway / Storage", role: "Selective + VNA racking", note: "~9,600 pallet positions, ABC slotting" },
        { name: "Picking", role: "Zone + batch pick", note: "Fast-movers in forward pick face" },
        { name: "Pack & Stage", role: "Consolidation", note: "Order marshalling by route" },
        { name: "Dispatch", role: "Outbound docks", note: "3 dock doors, cross-dock lane" },
      ],
      bottlenecks: [
        "Peak-hour dock-door contention — inbound and outbound competing for the same apron in early design.",
        "Single QC hold area risks back-pressure into receiving during supplier surges.",
      ],
      recommendedConfig:
        "Adopt a U-flow layout with physically separated inbound (4 doors) and outbound (3 doors) apron zones, ABC velocity slotting to compress pick travel, and a forward-pick / reserve split. This configuration lifts modelled dock utilisation headroom to ~25% at peak and shortens average pick path materially versus a single shared apron.",
      metrics: [
        { label: "Storage utilisation (target)", value: "82%", note: "leaves surge capacity" },
        { label: "Dock headroom at peak", value: "~25%", note: "post-reconfiguration" },
        { label: "Pallet positions", value: "9,600", note: "selective + VNA mix" },
      ],
    },

    risks: {
      narrative:
        "The decision is most exposed to benefit realisation and capital cost. Because the build case is capital-intensive, a shortfall in achieved logistics savings or a construction overrun compresses NPV faster than rate movements. The sensitivity analysis below quantifies the swing in NPV for ±15% moves in each driver (±2.0pp on discount rate).",
      register: [
        { risk: "Benefit under-realisation (3PL exit slips, volumes soft)", likelihood: "Medium", impact: "High", mitigation: "Stage capital to volume milestones; underwrite ≥85% of benefit before release." },
        { risk: "Construction cost overrun / schedule slip", likelihood: "Medium", impact: "Medium", mitigation: "Fixed-price contract, ≤8% contingency, milestone-linked drawdown." },
        { risk: "Land title / permitting (PBG, SLF) delay", likelihood: "Low", impact: "High", mitigation: "Legal due diligence pre-close; SLF path in master schedule." },
        { risk: "K3/SMK3 non-conformance at audit", likelihood: "Low", impact: "High", mitigation: "Fund compliance in CAPEX; appoint Ahli K3 at project start." },
      ],
    },

    assumptions: [
      "120 headcount at full ramp; two-shift operation; no cold-chain requirement.",
      "Annual operational benefit of Rp 30bn is attributable and incremental to this facility.",
      "Land appreciates ~3% p.a.; structure depreciated to a conservative year-10 salvage.",
      "Discount rate of 12% applied uniformly to both options.",
      "Lease terms assume 6% annual escalation typical of corridor build-to-suit leases.",
    ],

    dataGaps: [
      { need: "Audited current 3PL / logistics spend (last 24 months)", why: "Anchors the annual benefit; currently an estimate." },
      { need: "Firm construction tender and land valuation", why: "CAPEX is indicative; ±15% materially moves NPV." },
      { need: "Forecast inbound/outbound volume profile by hour", why: "Confirms dock-door count and the binding bottleneck." },
      { need: "Tax/depreciation treatment & financing structure", why: "Affects after-tax NPV and the lease-vs-buy crossover." },
    ],
  },
};
