/* App.jsx — state machine + analysis orchestration. */
import React, { useState, useEffect, useRef } from "react";
import { Masthead } from "./components/Masthead.jsx";
import { Intake } from "./components/Intake.jsx";
import { Loading, GEN_STEPS } from "./components/Loading.jsx";
import { Report } from "./components/Report.jsx";
import { generateAnalysis } from "./lib/analysis.js";
import { SAMPLE } from "./lib/data.js";

const DEFAULT_CASE = {
  facilityType: "Distribution warehouse",
  location: "",
  landArea: "",
  buildingArea: "",
  purpose: "",
  decisionType: "build-vs-lease",
  horizonYears: 10,
  discountRate: 12,
  fxRate: 16250,
  knownCosts: "",
  expectedBenefit: "",
  notes: "",
};

export function App() {
  const [phase, setPhase] = useState("intake"); // intake | loading | report
  const [caseData, setCaseData] = useState(DEFAULT_CASE);
  const [analysis, setAnalysis] = useState(null);
  const [reportCase, setReportCase] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [errors, setErrors] = useState([]);
  const stepTimer = useRef(null);

  function loadSample() {
    setCaseData({ ...DEFAULT_CASE, ...SAMPLE.case });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function advanceSteps() {
    // animate the stepper while waiting on the live call
    setStepIdx(0);
    let i = 0;
    stepTimer.current = setInterval(() => {
      i = Math.min(i + 1, GEN_STEPS.length - 1);
      setStepIdx(i);
    }, 4200);
  }
  function stopSteps() { if (stepTimer.current) clearInterval(stepTimer.current); }

  async function generate() {
    setErrors([]);
    setPhase("loading");
    advanceSteps();
    const c = { ...caseData };
    const { analysis: result, usedFallback } = await generateAnalysis(c);
    stopSteps();
    setStepIdx(GEN_STEPS.length - 1);
    setAnalysis(result);
    setReportCase(c);
    setErrors(usedFallback ? ["all sections"] : []);
    // brief settle so the final step reads as complete
    setTimeout(() => { setPhase("report"); window.scrollTo({ top: 0 }); }, 500);
  }

  function reset() {
    stopSteps();
    setAnalysis(null);
    setPhase("intake");
    window.scrollTo({ top: 0 });
  }

  useEffect(() => () => stopSteps(), []);

  return (
    <div className="app-bg">
      <Masthead phase={phase} />
      {phase === "intake" && (
        <Intake value={caseData} onChange={setCaseData} onGenerate={generate} onLoadSample={loadSample} />
      )}
      {phase === "loading" && <Loading stepIdx={stepIdx} caseData={caseData} />}
      {phase === "report" && analysis && (
        <Report analysis={analysis} caseMeta={reportCase} onReset={reset} errors={errors} />
      )}
    </div>
  );
}
