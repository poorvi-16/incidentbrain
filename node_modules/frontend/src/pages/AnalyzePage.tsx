import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, FileText, Sparkles } from "lucide-react";
import { api } from "../api/client";

const samplePostmortem = `Title: Payments Service Outage — 2024-11-14

Duration: 2h 14m
Severity: P1
Affected: checkout flow, 34% of users

Timeline:
14:03 — Spike in checkout errors detected by customer reports
14:11 — On-call engineer paged via PagerDuty
14:19 — RDS CPU identified at 99%, connection pool exhausted
14:34 — Read replica promoted, traffic shifted
15:47 — Root cause identified: missing index on orders table after migration
16:17 — Full recovery confirmed

Root Cause:
A database migration deployed at 13:45 removed a composite index on the orders table. Query times for checkout increased 40x under normal load. No alert existed for RDS query latency p99. The runbook had no step for database performance degradation.

What went well:
- Fast escalation once paged
- Read replica failover worked correctly

What went wrong:
- No alert on RDS query latency p99 > 500ms
- No pre-deployment query plan validation
- Runbook missing DB performance section
- Migration reviewed but not load-tested

Action items:
- Add RDS latency alert (owner: @sre-team, due: 2024-11-21)
- Add query plan check to CI pipeline
- Update runbook with DB degradation steps`;

const steps = [
  "Extracting failure DNA...",
  "Matching patterns...",
  "Generating fixes..."
];

function AnalyzePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const progress = useMemo(() => ((activeStep + 1) / steps.length) * 100, [activeStep]);

  async function runAnalyze(content: string) {
    setAnalyzing(true);
    setActiveStep(0);

    const timers = [0, 900, 1800].map((delay, index) =>
      window.setTimeout(() => setActiveStep(index), delay)
    );

    try {
      const response = await api.post<{ incident_id: string }>("/analyze", {
        text: content
      });

      navigate(`/incident/${response.data.incident_id}`);
    } catch (error) {
      console.error("Analyze failed", error);
      alert("Analysis failed. Check the backend server and try again.");
    } finally {
      timers.forEach(window.clearTimeout);
      setAnalyzing(false);
      setActiveStep(0);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!text.trim()) {
      alert("Please paste a post-mortem before analyzing.");
      return;
    }

    void runAnalyze(text);
  }

  async function handleFile(file: File) {
    const valid = file.name.endsWith(".txt") || file.name.endsWith(".md");

    if (!valid) {
      alert("Please upload a .txt or .md file.");
      return;
    }

    const content = await file.text();
    setText(content);
  }

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-grid opacity-60" />
      <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-blue/20 blur-3xl" />

      <section className="section-shell relative flex min-h-[calc(100vh-80px)] items-center justify-center py-12 sm:py-20">
        <div className="w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-panel p-6 shadow-glow sm:p-10"
          >
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200">
                Post-Mortem Intelligence Platform
              </p>

              <h1 className="headline-gradient text-4xl font-extrabold sm:text-6xl">
                Stop repeating incidents.
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Paste a post-mortem. Get the code that prevents the next outage.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);

                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    void handleFile(file);
                  }
                }}
                className={[
                  "rounded-[28px] border p-4 transition-all duration-300",
                  dragging
                    ? "border-blue-400 bg-blue-500/10 shadow-glow"
                    : "border-white/10 bg-slate-950/40"
                ].join(" ")}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste an outage report, incident review, or post-mortem here..."
                  className="min-h-[320px] w-full rounded-[22px] border border-white/10 bg-slate-950/70 px-5 py-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setText(samplePostmortem)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      <Sparkles size={16} />
                      Sample Post-mortem
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                    >
                      <Upload size={16} />
                      Upload .txt / .md
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,text/plain,text/markdown"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleFile(file);
                        }
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={analyzing}
                    className="inline-flex items-center justify-center rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {analyzing ? "Analyzing..." : "Analyze Incident"}
                  </button>
                </div>
              </div>

              <motion.div
                initial={false}
                animate={{ opacity: analyzing ? 1 : 0.65 }}
                className="dark-card p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-300">Analysis Pipeline</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Watch IncidentBrain turn static post-mortems into prevention work.
                    </p>
                  </div>
                  <FileText className="text-slate-400" />
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-700">
                  <motion.div
                    animate={{ width: analyzing ? `${progress}%` : "6%" }}
                    transition={{ duration: 0.45 }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300"
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {steps.map((step, index) => (
                    <motion.div
                      key={step}
                      initial={false}
                      animate={{
                        opacity: analyzing ? (index <= activeStep ? 1 : 0.45) : 0.55,
                        y: analyzing && index === activeStep ? -2 : 0
                      }}
                      className={[
                        "rounded-2xl border px-4 py-3 text-sm transition",
                        index <= activeStep && analyzing
                          ? "border-blue-400/30 bg-blue-500/10 text-blue-100"
                          : "border-white/10 bg-white/5 text-slate-400"
                      ].join(" ")}
                    >
                      {step}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

export default AnalyzePage;
