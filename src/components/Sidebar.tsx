"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Inbox, TrendingUp, Building2, ShieldCheck, Clock, BarChart3, GitBranch, FileText, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspace", label: "Workspace", icon: Inbox },
  { href: "/narrative-trees", label: "Narrative Trees", icon: GitBranch },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/brands", label: "Brands", icon: Building2 },
  { href: "/platform-rules", label: "Platform Rules", icon: ShieldCheck },
  { href: "/history", label: "History", icon: Clock },
  { href: "/performance", label: "Performance", icon: BarChart3 },
  { href: "/prompt-library", label: "Prompt Library", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const sidebarContent = (
    <>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-500/20">
              Y
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">YANTRI</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-1">
                Narrative Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        <div className="px-4 mb-4">
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Engineering</span>
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-all duration-300 group ${isActive
                ? "bg-white/10 text-white font-bold shadow-lg shadow-black/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5 mt-auto">
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full justify-start gap-3 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 font-bold"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 text-white flex flex-col border-r border-white/5 transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 bg-zinc-950 text-white min-h-screen flex-col border-r border-white/5 shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
