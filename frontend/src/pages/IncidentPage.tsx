import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";
import type { ArtifactBundle, IncidentDetail } from "../types/api";
import GithubPrModal from "../components/GithubPrModal";
import CodeBlock from "../components/CodeBlock";

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
  if (value === "critical" || value === "architecture") {
    return "bg-red-500/15 text-red-200 border-red-400/20";
  }

  if (value === "high" || value === "alert_rule") {
    return "bg-amber-500/15 text-amber-200 border-amber-400/20";
  }

  if (value === "medium" || value === "runbook") {
    return "bg-blue-500/15 text-blue-200 border-blue-400/20";
  }

  return "bg-emerald-500/15 text-emerald-200 border-emerald-400/20";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}

function IncidentPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ArtifactTab>("alert_yaml");
  const [copied, setCopied] = useState<ArtifactTab | null>(null);
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [showManualPopup, setShowManualPopup] = useState(false);

  async function fetchIncident() {
    const response = await api.get<IncidentDetail>(`/incidents/${id}`);
    return response.data;
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchIncident();
        setIncident(data);

        if (!data.artifacts && id && !data.warnings?.manualReviewRequired) {
          setArtifactLoading(true);

          try {
            const artifactRes = await api.post<ArtifactBundle>(`/artifacts/${id}`);
            setIncident((current) =>
              current
                ? {
                    ...current,
                    artifacts: artifactRes.data
                  }
                : current
            );
          } catch {
            setIncident((current) =>
              current
                ? {
                    ...current,
                    artifacts: null
                  }
                : current
            );
          }
        }
      } catch (error) {
        console.error("Failed to load incident", error);
      } finally {
        setLoading(false);
        setArtifactLoading(false);
      }
    }

    void load();
  }, [id]);

  useEffect(() => {
    if (incident?.warnings?.manualReviewRequired) {
      setShowManualPopup(true);
    }
  }, [incident]);

    useEffect(() => {
    if (incident?.warnings?.manualReviewRequired) {
      setShowManualPopup(true);
    }
  }, [incident]);

  useEffect(() => {
    if (incident?.id) {
      window.localStorage.setItem("lastIncidentId", incident.id);
    }
  }, [incident?.id]);


  const totalDebt = useMemo(() => {
    return incident?.debt_scores.reduce((sum, row) => sum + row.score, 0) ?? 0;
  }, [incident]);

  const debtReduction = useMemo(
    () => Number((totalDebt * 0.8).toFixed(2)),
    [totalDebt]
  );

  async function copyTabContent() {
    if (!incident?.artifacts) return;

    await navigator.clipboard.writeText(incident.artifacts[activeTab]);
    setCopied(activeTab);
    window.setTimeout(() => setCopied(null), 1500);
  }

  async function handleResolveIncident() {
    if (!incident || incident.status === "resolved") return;

    setResolveLoading(true);

    try {
      const response = await api.patch<IncidentDetail>(
        `/incidents/${incident.id}/resolve`
      );
      setIncident(response.data);
    } catch (error) {
      console.error("Failed to resolve incident", error);
      alert("Failed to mark incident as resolved.");
    } finally {
      setResolveLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="section-shell py-10">
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="dark-card h-48 animate-pulse bg-slate-800/70"
            />
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
            We couldn’t load this incident. Head back to the dashboard and try
            again.
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
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-blue-300">Failure DNA</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    incident.status === "resolved"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {incident.status}
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                {incident.dna.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                {incident.dna.summary}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-sm ${getBadgeTone(
                    incident.dna.trigger
                  )}`}
                >
                  {incident.dna.trigger}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-sm ${getBadgeTone(
                    incident.dna.blast_radius
                  )}`}
                >
                  {incident.dna.blast_radius}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-sm ${getBadgeTone(
                    incident.dna.fix_category
                  )}`}
                >
                  {incident.dna.fix_category}
                </span>
              </div>
            </div>

            <div className="space-y-4 lg:min-w-[280px]">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Recurrence Prediction
                </p>
                <p
                  className={`mt-3 text-3xl font-bold ${getUrgencyColor(
                    incident.dna.recurrence_days
                  )}`}
                >
                  {incident.dna.recurrence_days} days
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Without this fix, next recurrence predicted in{" "}
                  {incident.dna.recurrence_days} days.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResolveIncident}
                disabled={resolveLoading || incident.status === "resolved"}
                className="w-full rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {incident.status === "resolved"
                  ? "Incident Resolved"
                  : resolveLoading
                  ? "Resolving..."
                  : "Mark Resolved"}
              </button>
            </div>
          </div>
        </motion.section>

        {incident.warnings.manualReviewRequired && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6 text-amber-100"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
              Manual Intervention Needed
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              No strong historical or AI-generated solution available
            </h2>
            <p className="mt-3 text-sm leading-7 text-amber-50/90">
              {incident.warnings.manualReviewMessage}
            </p>
          </motion.section>
        )}

        {incident.ai_recommendation && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="dark-card p-6 sm:p-8"
          >
            <p className="text-sm font-medium text-blue-300">AI Recommendation</p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Novel incident prevention guidance
            </h2>

            <div className="mt-5 space-y-5">
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <p className="text-sm font-semibold text-white">Solution Summary</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {incident.ai_recommendation.solution_summary}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <p className="text-sm font-semibold text-white">Why this looks novel</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {incident.ai_recommendation.novelty_reason}
                </p>
              </div>
            </div>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="dark-card p-6 sm:p-8"
        >
          <div className="mb-5">
            <p className="text-sm font-medium text-blue-300">
              You’ve seen this before
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Pattern Matches
            </h2>
          </div>

          {incident.matches.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <p className="text-lg font-semibold text-white">No pattern found</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                IncidentBrain could not find a confident historical incident pattern
                for this case.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {incident.matches.map((match) => (
                <div
                  key={match.incident_id}
                  className="rounded-3xl border border-white/10 bg-slate-950/50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {match.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(match.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {match.fix_status}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    {match.summary}
                  </p>

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
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.16 }}
          className="dark-card p-6 sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-300">
                Prevention Diff
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Generated prevention artifacts
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyTabContent}
                disabled={!incident.artifacts}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:opacity-50"
              >
                {copied === activeTab ? "Copied" : "Copy Current Artifact"}
              </button>

              <button
                type="button"
                onClick={() => setPrModalOpen(true)}
                disabled={!incident.artifacts}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:opacity-50"
              >
                Open GitHub PR
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {(Object.keys(tabLabels) as ArtifactTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                disabled={!incident.artifacts}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  activeTab === tab
                    ? "bg-blue-500 text-white"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-50"
                ].join(" ")}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto rounded-[28px] border border-white/10 bg-slate-950/80 p-5">
            {artifactLoading ? (
              <div className="space-y-3">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-700" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
              </div>
            ) : incident.artifacts ? (
              <CodeBlock
                code={incident.artifacts[activeTab]}
                language={
                  activeTab === "alert_yaml"
                    ? "yaml"
                    : activeTab === "runbook_md"
                    ? "markdown"
                    : "hcl"
                }
              />
            ) : (
              <p className="text-sm text-slate-400">
                No artifact available yet. Please review and create the fix manually.
              </p>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="dark-card p-6 sm:p-8"
        >
          <p className="text-sm font-medium text-blue-300">
            Incident Debt Impact
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            What shipping this fix changes
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <p className="text-sm text-slate-400">Current debt contribution</p>
              <p className="mt-3 text-4xl font-bold text-amber-300">
                {totalDebt.toFixed(2)}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <p className="text-sm text-slate-400">
                Estimated reduction after merge
              </p>
              <p className="mt-3 text-4xl font-bold text-emerald-300">
                {debtReduction.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-slate-300">
            Merging these fixes will reduce your debt by approximately{" "}
            {debtReduction.toFixed(2)} points across the affected services.
          </p>
        </motion.section>
      </div>

      <GithubPrModal
        incidentId={incident.id}
        open={prModalOpen}
        onClose={() => setPrModalOpen(false)}
      />

      {showManualPopup && incident?.warnings?.manualReviewMessage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-amber-400/20 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
              Manual Review Required
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              Automatic fix could not be completed
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {incident.warnings.manualReviewMessage}
            </p>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManualPopup(false)}
                className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-400"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default IncidentPage;
