import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth.types";

type MobileNavItem = {
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
};

const mobileNavItems: MobileNavItem[] = [
  {
    label: "Home",
    path: "/dashboard",
    icon: "📊",
    roles: ["system_admin", "insurer_admin", "claims_officer", "fraud_investigator"],
  },
  {
    label: "Claims",
    path: "/claims/review",
    icon: "🧾",
    roles: ["insurer_admin", "claims_officer"],
  },
  {
    label: "Providers",
    path: "/providers/risk",
    icon: "🏥",
    roles: ["system_admin", "insurer_admin", "fraud_investigator"],
  },
  {
    label: "FAWE",
    path: "/fawe/breakdown",
    icon: "🧠",
    roles: ["system_admin", "insurer_admin", "claims_officer", "fraud_investigator"],
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
];

export default function MobileBottomNav() {
  const { user } = useAuth();

  const visibleItems = mobileNavItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/40 bg-white/85 px-3 py-2 shadow-2xl backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-4 gap-2">
        {visibleItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-bold transition ${
                isActive
                  ? "bg-fawe-greenSoft text-fawe-greenDark"
                  : "text-slate-500"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span className="mt-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}