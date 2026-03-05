"use client";

import { useRouter, useSearchParams } from "next/navigation";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export default function NarrativeTreeFilters({
  currentFilter,
}: {
  currentFilter: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`/narrative-trees?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-xl border border-white/5 w-fit mb-6">
      {FILTERS.map((filter) => {
        const isActive = currentFilter === filter.value;
        return (
          <button
            key={filter.value}
            onClick={() => handleFilter(filter.value)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              isActive
                ? "bg-white/10 text-white shadow-lg shadow-black/20"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
