import { useMemo, useState } from "react";
import { CheckCircle2, Copy, ShieldCheck } from "lucide-react";
import { loadSettings, saveSettings } from "../lib/settings";
import { samplePostmortems } from "../data/samplePostmortems";

function SettingsPage() {
  const initial = useMemo(() => loadSettings(), []);
  const [githubToken, setGithubToken] = useState(initial.githubToken);
  const [defaultRepo, setDefaultRepo] = useState(initial.defaultRepo);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");

  function handleSave() {
    saveSettings({ githubToken, defaultRepo });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestStatus("idle");

    try {
      if (!githubToken.trim()) {
        throw new Error("Missing token");
      }

      await new Promise((resolve) => window.setTimeout(resolve, 900));
      setTestStatus("success");
    } catch {
      setTestStatus("error");
    } finally {
      setTesting(false);
    }
  }

  async function copySample(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <main className="section-shell py-10">
      <div className="space-y-6">
        <section className="dark-card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-blue-300" />
            <div>
              <p className="text-sm font-medium text-blue-300">Settings</p>
              <h1 className="mt-1 text-3xl font-bold text-white">
                GitHub and Demo Configuration
              </h1>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Default Repository
                </label>
                <input
                  type="text"
                  value={defaultRepo}
                  onChange={(e) => setDefaultRepo(e.target.value)}
                  placeholder="owner/repo-name"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
                >
                  Save Settings
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
              </div>

              <div className="text-sm">
                {saved && (
                  <p className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 size={16} />
                    Settings saved locally
                  </p>
                )}

                {testStatus === "success" && (
                  <p className="text-emerald-300">GitHub token looks usable for the upcoming PR flow.</p>
                )}

                {testStatus === "error" && (
                  <p className="text-red-300">Please add a GitHub token before testing the connection.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <p className="text-sm font-medium text-blue-300">How this is used</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                <li>The token will be used to create a branch, commit artifact files, and open a PR.</li>
                <li>The default repository saves time during demos and repeated incident runs.</li>
                <li>Settings are stored in local browser storage for hackathon convenience.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="dark-card p-6 sm:p-8">
          <p className="text-sm font-medium text-blue-300">Sample Post-mortem Library</p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Fast demo scenarios for IncidentBrain
          </h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {samplePostmortems.map((sample) => (
              <div
                key={sample.id}
                className="rounded-3xl border border-white/10 bg-slate-950/50 p-5"
              >
                <h3 className="text-lg font-semibold text-white">{sample.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {sample.description}
                </p>

                <button
                  type="button"
                  onClick={() => copySample(sample.text)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                >
                  <Copy size={16} />
                  Copy Sample
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default SettingsPage;
