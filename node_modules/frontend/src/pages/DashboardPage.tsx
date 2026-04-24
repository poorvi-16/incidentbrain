function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 text-slate-900">
      <section className="section-shell">
        <div className="light-card p-8">
          <p className="text-sm font-medium text-blue-600">Dashboard</p>
          <h1 className="mt-3 text-3xl font-bold">Operational Risk Overview</h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            This page will show incident metrics, debt by service, trend charts,
            and incident history.
          </p>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
