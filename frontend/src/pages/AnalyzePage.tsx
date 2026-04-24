function AnalyzePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-grid opacity-60" />
      <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-blue/20 blur-3xl" />

      <section className="section-shell relative flex min-h-[calc(100vh-80px)] items-center justify-center py-20">
        <div className="glass-panel max-w-4xl p-10 text-center shadow-glow sm:p-14">
          <p className="mb-4 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200">
            Post-Mortem Intelligence Platform
          </p>

          <h1 className="headline-gradient text-4xl font-extrabold sm:text-6xl">
            Stop repeating incidents.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Paste a post-mortem. Get the operational intelligence and prevention
            code your team should have written yesterday.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="dark-card p-5 text-left">
              <p className="text-sm font-semibold text-blue-300">Failure DNA</p>
              <p className="mt-2 text-sm text-slate-300">
                Extract structured failure patterns from incident writeups.
              </p>
            </div>

            <div className="dark-card p-5 text-left">
              <p className="text-sm font-semibold text-emerald-300">
                Prevention Diff
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Generate alerts, runbooks, and Terraform guards automatically.
              </p>
            </div>

            <div className="dark-card p-5 text-left">
              <p className="text-sm font-semibold text-amber-300">
                Incident Debt
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Track risk, recurrence, and unresolved operational gaps.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AnalyzePage;
