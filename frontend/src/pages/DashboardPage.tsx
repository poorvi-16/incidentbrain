import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { DashboardData, IncidentRecord } from "../types/api";
import { loadSettings } from "../lib/settings";

function getDebtColor(score: number) {
  if (score <= 30) return "#10B981";
  if (score <= 60) return "#F59E0B";
  return "#EF4444";
}

function getRecurrenceLabel(days: number) {
  if (days < 15) return "High";
  if (days <= 30) return "Medium";
  return "Low";
}

function getStatusTone(status: string) {
  return status === "resolved"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";
}

function getPrTone(status: string) {
  if (status === "merged") return "bg-emerald-600 text-white";
  if (status === "open") return "bg-blue-600 text-white";
  return "bg-slate-900 text-white";
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setApiError(false);
    try {
      const [dashboardRes, incidentsRes] = await Promise.all([
        api.get<DashboardData>("/dashboard"),
        api.get<IncidentRecord[]>("/incidents")
      ]);

      // --- GitHub PR sync block ---
      const settings = loadSettings();
      if (settings.githubToken && settings.defaultRepo) {
        const openPrIncidents = incidentsRes.data.filter(
          (incident) => incident.pr_url && incident.pr_status === "open"
        );

        if (openPrIncidents.length > 0) {
          await Promise.all(
            openPrIncidents.map((incident) =>
              api
                .post("/github/sync", {
                  incidentId: incident.id,
                  repoUrl: settings.defaultRepo,
                  token: settings.githubToken
                })
                .catch(() => null)
            )
          );

          const [dashboardResAfterSync, incidentsResAfterSync] = await Promise.all([
            api.get<DashboardData>("/dashboard"),
            api.get<IncidentRecord[]>("/incidents")
          ]);

          setDashboard(dashboardResAfterSync.data);
          setIncidents(incidentsResAfterSync.data);
          return;
        }
      }
      // --- end sync block ---

      setDashboard(dashboardRes.data);
      setIncidents(incidentsRes.data);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    function onFocus() { void load(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  async function handleResolve(incidentId: string) {
    setResolvingId(incidentId);
    try {
      await api.patch(`/incidents/${incidentId}/resolve`);
      await load();
    } catch (error) {
      console.error("Failed to resolve from dashboard", error);
      alert("Failed to mark incident as resolved.");
    } finally {
      setResolvingId(null);
    }
  }

  async function handleDelete(incidentId: string) {
    const confirmed = window.confirm("Delete this incident history permanently?");
    if (!confirmed) return;
    setDeletingId(incidentId);
    try {
      await api.delete(`/incidents/${incidentId}`);
      await load();
    } catch (error) {
      console.error("Failed to delete incident", error);
      alert("Failed to delete incident.");
    } finally {
      setDeletingId(null);
    }
  }

  const metricCards = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: "Total Incidents Analyzed", value: dashboard.total_incidents, tone: "text-blue-600" },
      { label: "Open Debt Items", value: dashboard.open_debt_items, tone: "text-amber-600" },
      { label: "Avg Recurrence Risk", value: dashboard.avg_recurrence_risk, tone: "text-rose-600" },
      { label: "PRs Generated", value: dashboard.prs_generated, tone: "text-emerald-600" }
    ];
  }, [dashboard]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 py-10 text-slate-900">
        <section className="section-shell space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="light-card h-28 animate-pulse bg-slate-100" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div className="light-card h-96 animate-pulse bg-slate-100" />
            <div className="light-card h-96 animate-pulse bg-slate-100" />
          </div>
          <div className="light-card h-96 animate-pulse bg-slate-100" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 text-slate-900">
      <section className="section-shell space-y-6">

        {/* ── API error banner ── */}
        {apiError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-700">
                Dashboard data could not be loaded
              </p>
              <p className="mt-1 text-sm text-red-600">
                The backend API is unreachable or returned an error. Incident analysis
                may be unavailable. Please check your server connection and try refreshing.
                If the issue persists, resolve incidents manually via your cloud console.
              </p>
              <button
                type="button"
                onClick={() => { setLoading(true); void load(); }}
                className="mt-3 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div key={card.label} className="light-card p-6">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className={`mt-3 text-3xl font-bold ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { setLoading(true); void load(); }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="light-card p-6">
            <div className="mb-6">
              <p className="text-sm font-medium text-blue-600">Incident Debt by Service</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Services carrying unresolved risk
              </h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(dashboard?.debt_by_service ?? []).filter((item) => item.score > 0)}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#64748B" />
                  <YAxis type="category" dataKey="service_name" width={140} stroke="#64748B" />
                  <Tooltip />
                  <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                    {(dashboard?.debt_by_service ?? [])
                      .filter((item) => item.score > 0)
                      .map((entry) => (
                        <Cell key={entry.service_name} fill={getDebtColor(entry.score)} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="light-card p-6">
            <p className="text-sm font-medium text-blue-600">Debt Trend</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Historical debt activity</h2>
            <div className="mt-6 space-y-4">
              {(dashboard?.trend ?? []).map((point) => (
                <div
                  key={point.date}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-600">{point.date}</span>
                  <span className="text-sm font-semibold text-slate-900">{point.total_debt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="light-card p-6">
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-600">Incident History</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Recent incidents across the platform
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Blast Radius</th>
                  <th className="px-4 py-2">DNA Trigger</th>
                  <th className="px-4 py-2">PR Status</th>
                  <th className="px-4 py-2">Recurrence</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 && !apiError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      No incidents recorded yet. Analyze your first post-mortem to get started.
                    </td>
                  </tr>
                ) : (
                  incidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-200"
                    >
                      <td className="rounded-l-2xl px-4 py-4 font-medium text-slate-900">
                        <Link to={`/incident/${incident.id}`} className="hover:text-blue-600">
                          {incident.dna?.title ?? incident.id}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(incident.status)}`}>
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 capitalize text-slate-600">
                        {incident.dna?.blast_radius ?? "unknown"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {incident.dna?.trigger ?? "unknown"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPrTone(incident.pr_status)}`}>
                          {incident.pr_status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {incident.dna
                          ? `${incident.dna.recurrence_days} days (${getRecurrenceLabel(incident.dna.recurrence_days)})`
                          : "N/A"}
                      </td>
                      <td className="rounded-r-2xl px-4 py-4">
                        <div className="flex gap-2">
                          {incident.status === "resolved" ? (
                            <span className="text-sm font-medium text-emerald-600">Completed</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleResolve(incident.id)}
                              disabled={resolvingId === incident.id}
                              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                            >
                              {resolvingId === incident.id ? "Resolving..." : "Mark Resolved"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(incident.id)}
                            disabled={deletingId === incident.id}
                            className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
                          >
                            {deletingId === incident.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;