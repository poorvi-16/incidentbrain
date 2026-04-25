import { NavLink, Outlet, useLocation } from "react-router-dom";
import DemoModeBanner from "../components/DemoModeBanner";
import { useHealth } from "../hooks/useHealth";

const navItems = [
  { to: "/", label: "Analyze" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/settings", label: "Settings" }
];

function AppLayout() {
  const health = useHealth();
  const location = useLocation();

  const incidentMatch = location.pathname.match(/^\/incident\/([^/]+)$/);
  const lastIncidentId = window.localStorage.getItem("lastIncidentId");
  const incidentNavTarget =
    incidentMatch?.[0] ?? (lastIncidentId ? `/incident/${lastIncidentId}` : "/dashboard");

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <DemoModeBanner visible={health?.demoMode === true} />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="section-shell flex items-center justify-between py-4">
          <NavLink to="/" className="text-lg font-semibold tracking-tight text-white">
            IncidentBrain Advanced
          </NavLink>

          <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-blue-500 text-white shadow-glow"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}

            <NavLink
              to={incidentNavTarget}
              className={({ isActive }) =>
                [
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-blue-500 text-white shadow-glow"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                ].join(" ")
              }
            >
              Incident
            </NavLink>
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  );
}

export default AppLayout;
