import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth.types";

type NavItem = {
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "📊",
    roles: ["system_admin", "insurer_admin", "claims_officer", "fraud_investigator"],
  },
{
  label: "Claims Queue",
  path: "/claims/review",
  icon: "🧾",
  roles: ["insurer_admin", "claims_officer"],
},
  {
    label: "Investigations",
    path: "/investigations/queue",
    icon: "🕵️",
    roles: ["insurer_admin", "fraud_investigator"],
  },
   {
  label: "Provider Risk",
  path: "/providers/risk",
  icon: "🏥",
  roles: ["system_admin", "insurer_admin", "fraud_investigator"],
},
{
  label: "FAWE Breakdown",
  path: "/fawe/breakdown",
  icon: "🧠",
  roles: [
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ],
},
{
  label: "Smart/LCT Demo",
  path: "/integrations/smart-simulator",
  icon: "🔌",
  roles: [
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ],
},
{
  label: "Reports",
  path: "/reports/loss-ratio",
  icon: "📈",
  roles: [
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ],
},
  {
    label: "Users",
    path: "/users",
    icon: "👥",
    roles: ["system_admin", "insurer_admin"],
  },
];

export default function Sidebar() {
  const { user } = useAuth();

  const visibleItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-slate-200 bg-white px-4 py-5 lg:block">
      <div className="mb-8 rounded-3xl bg-fawe-navy p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fawe-green text-lg font-black">
            F
          </div>

          <div>
            <p className="text-base font-black">FAWE Shield</p>
            <p className="text-xs text-slate-300">Claims protection</p>
          </div>
        </div>
      </div>

      <nav className="space-y-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                isActive
                  ? "bg-fawe-greenSoft text-fawe-greenDark"
                  : "text-slate-500 hover:bg-slate-50 hover:text-fawe-navy"
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-5 left-4 right-4 rounded-3xl bg-slate-50 p-4">
        <p className="text-sm font-black text-fawe-navy">{user?.name}</p>
        <p className="mt-1 text-xs text-slate-500">{user?.role}</p>
      </div>
    </aside>
  );
}