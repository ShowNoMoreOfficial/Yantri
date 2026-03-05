"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, Building2 } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  tagline: string | null;
  language: string;
  activePlatforms: string;
  isActive: boolean;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => {
        setBrands(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Brands</h1>
          <p className="text-muted-foreground mt-1 font-medium text-sm">Manage editorial identities and voice rules.</p>
        </div>
        <Button asChild className="px-6 py-3 h-auto rounded-2xl font-bold shadow-lg shadow-black/20">
          <Link href="/brands/new">
            <Plus className="w-4 h-4" strokeWidth={3} />
            Add Brand
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <LoadingSpinner size="lg" label="Loading brands..." />
          </div>
        ) : brands.map((brand) => {
          const platforms = JSON.parse(brand.activePlatforms) as { name: string; role: string }[];
          return (
            <Link
              key={brand.id}
              href={`/brands/${brand.id}`}
              className="block"
            >
              <Card className="rounded-3xl card-hover relative overflow-hidden group border-border">
                <CardContent className="p-5 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-black text-foreground tracking-tight">{brand.name}</h2>
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20">
                          {brand.language}
                        </Badge>
                      </div>
                      {brand.tagline && (
                        <p className="text-sm text-muted-foreground font-medium italic">{brand.tagline}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800/30 rounded-full border border-border">
                      <span
                        className={`w-2 h-2 rounded-full ${brand.isActive ? "bg-emerald-500 animate-pulse-dot" : "bg-zinc-600"
                          }`}
                      />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {brand.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {platforms.map((p) => (
                        <Badge
                          key={p.name}
                          variant="outline"
                          className={`text-[10px] font-black uppercase tracking-tighter ${p.role === "PRIMARY"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-800/30 text-muted-foreground border-border"
                            }`}
                        >
                          {p.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Modified Today</span>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {!loading && brands.length === 0 && (
          <div className="col-span-full">
            <Card className="rounded-3xl border-border">
              <CardContent className="p-20 text-center">
                <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                  <Building2 className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No brand profiles found</h3>
                <p className="text-sm text-zinc-500 mt-1 mb-8">Establish a brand identity to begin generating narratives.</p>
                <Button asChild className="px-6 py-3 h-auto rounded-xl font-bold shadow-lg shadow-black/20">
                  <Link href="/brands/new">
                    Initialize Brand
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
