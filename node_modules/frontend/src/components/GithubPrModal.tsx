import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../api/client";
import { loadSettings } from "../lib/settings";

type Props = {
  incidentId: string;
  open: boolean;
  onClose: () => void;
};

function GithubPrModal({ incidentId, open, onClose }: Props) {
  const settings = loadSettings();

  const [repoUrl, setRepoUrl] = useState(settings.defaultRepo);
  const [token, setToken] = useState(settings.githubToken);
  const [loading, setLoading] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const latest = loadSettings();
      setRepoUrl(latest.defaultRepo);
      setToken(latest.githubToken);
      setPrUrl("");
      setError("");
    }
  }, [open]);

  async function handleCreatePr() {
    setLoading(true);
    setError("");
    setPrUrl("");

    try {
      const response = await api.post<{ pr_url: string }>("/github/pr", {
        incidentId,
        repoUrl,
        token
      });

      setPrUrl(response.data.pr_url);
    } catch (err) {
      setError("Failed to create GitHub PR. Check repo, token, and backend logs.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-300">Open GitHub PR</p>
            <h3 className="mt-1 text-2xl font-bold text-white">
              Ship prevention artifacts
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Repository
            </label>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="owner/repo-name"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              GitHub Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxx"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreatePr}
            disabled={loading}
            className="rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-60"
          >
            {loading ? "Creating PR..." : "Create Pull Request"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Cancel
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        {prUrl && (
          <p className="mt-4 text-sm text-emerald-300">
            PR created:{" "}
            <a
              href={prUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {prUrl}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

export default GithubPrModal;
