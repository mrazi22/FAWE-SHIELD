import { useAuth } from "../../context/AuthContext";
import PrimaryButton from "../ui/PrimaryButton";

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-fawe-background/80 px-4 py-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-fawe-green">
            FAWE Shield
          </p>
          <h1 className="text-xl font-black text-fawe-navy md:text-2xl">
            Claims Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-black text-fawe-navy">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>

          <PrimaryButton tone="navy" onClick={logout} className="px-4 py-2">
            Logout
          </PrimaryButton>
        </div>
      </div>
    </header>
  );
}