import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";
import type { IncidentDetail } from "../types/api";

type ArtifactTab = "alert_yaml" | "runbook_md" | "terraform_tf";

const tabLabels: Record<ArtifactTab, string> = {
  alert_yaml: "Alert YAML",
  runbook_md: "Runbook Patch",
  terraform_tf: "Terraform Guard"
};

function getUrgencyColor(days: number) {
  if (days < 15) return "text-red-400";
  if (days <= 30) return "text-amber-400";
  return "text-emerald-400";
}

function getBadgeTone(value: string) {
  if (value === "critical" || value === "architecture") return "bg-red-500/15 text-red-200 border-red-400/20";
  if (value === "high" || value === "alert_rule") return "bg-amber-500/15 text-amber-200 border-amber-400/20";
  if (value === "medium" || value === "runbook") return "bg-blue-500/15 text-blue-200 border-blue-400/20";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-400/20";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}

function IncidentPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ArtifactTab>("alert_yaml");
  const [copied, setCopied] = useState<ArtifactTab | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get<IncidentDetail>(`/incidents/${id}`);
        setIncident(response.data);
      } catch (error) {
        console.error("Failed to load incident", error);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  const totalDebt = useMemo(() => {
    return incident?.debt_scores.reduce((sum, row) => sum + row.score, 0) ?? 0;
  }, [incident]);

  const debtReduction = useMemo(() => Number((totalDebt * 0.8).toFixed(2)), [totalDebt]);

  async function copyTabContent() {
    if (!incident?.artifacts) return;

    await navigator.clipboard.writeText(incident.artifacts[activeTab]);
    setCopied(activeTab);
    window.setTimeout(() => setCopied(null), 1500);
  }

  if (loading) {
    return (
      <main className="section-shell py-10">
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="dark-card h-48 animate-pulse bg-slate-800/70" />
          ))}
        </div>
      </main>
    );
  }

  if (!incident || !incident.dna) {
    return (
      <main className="section-shell py-10">
        <div className="dark-card p-8">
          <h1 className="text-2xl font-bold text-white">Incident not found</h1>
          <p className="mt-4 text-slate-300">
            We couldn’t load this incident. Head back to the dashboard and try again.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="section-shell py-8 sm:py-10">
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="dark-card p-6 sm:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-300">Failure DNA</p>
              <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                {incident.dna.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                {incident.dna.summary}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className={`rounded-full border px-3 py-1 text-sm ${getBadgeTone(incident.dna.trigger)}`}>
                  {incident.dna.trigger}
                </span>
                <span className={`rounded-full border px-3 py-1 text-sm ${getBadgeTone(incident.dna.blast_radius)}`}>
                  {incident.dna.blast_radius}
                </span>
                <span className={`rounded-full border px-3 py-1 text-sm ${getBadgeTone(incident.dna.fix_category)}`}>
                  {incident.dna.fix_category}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 lg:min-w-[260px]">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Recurrence Prediction
              </p>
              <p className={`mt-3 text-3xl font-bold ${getUrgencyColor(incident.dna.recurrence_days)}`}>
                {incident.dna.recurrence_days} days
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Without this fix, next recurrence predicted in {incident.dna.recurrence_days} days.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="dark-card p-6 sm:p-8"
        >
          <div className="mb-5">
            <p className="text-sm font-medium text-blue-300">You’ve seen this before</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Pattern Matches</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {incident.matches.map((match) => (
              <div key={match.incident_id} className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{match.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(match.created_at)}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    {match.fix_status}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">{match.summary}</p>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Similarity</span>
                    <span>{match.similarity}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300"
                      style={{ width: `${match.similarity}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.16 }}
          className="dark-card p-6 sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-300">Prevention Diff</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Generated prevention artifacts</h2>
            </div>

            <button
              type="button"
              onClick={copyTabContent}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            >
              {copied === activeTab ? "Copied" : "Copy Current Artifact"}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {(Object.keys(tabLabels) as ArtifactTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  activeTab === tab
                    ? "bg-blue-500 text-white"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                ].join(" ")}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto rounded-[28px] border border-white/10 bg-slate-950/80 p-5">
            <pre className="font-mono text-[13px] leading-6 text-slate-200 whitespace-pre-wrap">
              {incident.artifacts?.[activeTab] ?? "No artifact available yet."}
            </pre>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="dark-card p-6 sm:p-8"
        >
          <p className="text-sm font-medium text-blue-300">Incident Debt Impact</p>
          <h2 className="mt-2 text-2xl font-bold text-white">What shipping this fix changes</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <p className="text-sm text-slate-400">Current debt contribution</p>
              <p className="mt-3 text-4xl font-bold text-amber-300">{totalDebt.toFixed(2)}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <p className="text-sm text-slate-400">Estimated reduction after merge</p>
              <p className="mt-3 text-4xl font-bold text-emerald-300">{debtReduction.toFixed(2)}</p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-slate-300">
            Merging these fixes will reduce your debt by approximately {debtReduction.toFixed(2)} points across the affected services.
          </p>
        </motion.section>
      </div>
    </main>
  );
}

export default IncidentPage;
