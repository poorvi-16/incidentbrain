import { useParams } from "react-router-dom";

function IncidentPage() {
  const { id } = useParams();

  return (
    <main className="section-shell py-10">
      <div className="dark-card p-8">
        <p className="text-sm font-medium text-blue-300">Incident Detail</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Incident #{id}</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          This page will show Failure DNA, pattern matches, prevention artifacts,
          recurrence prediction, and debt impact.
        </p>
      </div>
    </main>
  );
}

export default IncidentPage;
