import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileBottomNav from "./MobileBottomNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-fawe-background">
      <Sidebar />

      <div className="lg:pl-72">
        <Topbar />

        <main className="px-4 pb-28 pt-5 md:px-6 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}