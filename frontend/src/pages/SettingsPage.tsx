function SettingsPage() {
  return (
    <main className="section-shell py-10">
      <div className="dark-card p-8">
        <p className="text-sm font-medium text-blue-300">Settings</p>
        <h1 className="mt-3 text-3xl font-bold text-white">
          GitHub and Demo Configuration
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          This page will hold the GitHub token, default repository, connection
          test, and sample post-mortem library.
        </p>
      </div>
    </main>
  );
}

export default SettingsPage;
