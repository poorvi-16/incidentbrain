import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { api } from "../api/client";
import type { DashboardData, IncidentRecord } from "../types/api";

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

function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashboardRes, incidentsRes] = await Promise.all([
          api.get<DashboardData>("/dashboard"),
          api.get<IncidentRecord[]>("/incidents")
        ]);

        setDashboard(dashboardRes.data);
        setIncidents(incidentsRes.data);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const metricCards = useMemo(() => {
    if (!dashboard) return [];

    return [
      {
        label: "Total Incidents Analyzed",
        value: dashboard.total_incidents,
        tone: "text-blue-600"
      },
      {
        label: "Open Debt Items",
        value: dashboard.open_debt_items,
        tone: "text-amber-600"
      },
      {
        label: "Avg Recurrence Risk",
        value: dashboard.avg_recurrence_risk,
        tone: "text-rose-600"
      },
      {
        label: "PRs Generated",
        value: dashboard.prs_generated,
        tone: "text-emerald-600"
      }
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <div key={card.label} className="light-card p-6">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className={`mt-3 text-3xl font-bold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
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
                  data={dashboard?.debt_by_service ?? []}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#64748B" />
                  <YAxis
                    type="category"
                    dataKey="service_name"
                    width={120}
                    stroke="#64748B"
                  />
                  <Tooltip />
                  <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                    {(dashboard?.debt_by_service ?? []).map((entry) => (
                      <Cell key={entry.service_name} fill={getDebtColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="light-card p-6">
            <p className="text-sm font-medium text-blue-600">Debt Trend</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Last seeded activity</h2>

            <div className="mt-6 space-y-4">
              {(dashboard?.trend ?? []).map((point) => (
                <div
                  key={point.date}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-600">{point.date}</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {point.total_debt}
                  </span>
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
                  <th className="px-4 py-2">Blast Radius</th>
                  <th className="px-4 py-2">DNA Trigger</th>
                  <th className="px-4 py-2">PR Status</th>
                  <th className="px-4 py-2">Recurrence</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-200"
                  >
                    <td className="rounded-l-2xl px-4 py-4 font-medium text-slate-900">
                      {incident.dna?.title ?? incident.id}
                    </td>
                    <td className="px-4 py-4 capitalize text-slate-600">
                      {incident.dna?.blast_radius ?? "unknown"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {incident.dna?.trigger ?? "unknown"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        {incident.pr_status}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-4 py-4 text-slate-600">
                      {incident.dna
                        ? `${incident.dna.recurrence_days} days (${getRecurrenceLabel(
                            incident.dna.recurrence_days
                          )})`
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
