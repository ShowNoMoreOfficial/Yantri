"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Inbox, TrendingUp, Building2, ShieldCheck, Clock, BarChart3, GitBranch, FileText, LogOut } from "lucide-react";
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
  { href: "/prompts", label: "Prompt Library", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-zinc-950 text-white min-h-screen flex flex-col border-r border-white/5">
      <div className="p-8">
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
      </div>

      <nav className="flex-1 px-4 space-y-1.5">
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
    </aside>
  );
}
