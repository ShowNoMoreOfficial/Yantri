"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then(setBrands);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Brands</h1>
        <Link
          href="/brands/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          + New Brand
        </Link>
      </div>

      <div className="grid gap-4">
        {brands.map((brand) => {
          const platforms = JSON.parse(brand.activePlatforms) as { name: string; role: string }[];
          return (
            <Link
              key={brand.id}
              href={`/brands/${brand.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{brand.name}</h2>
                  {brand.tagline && (
                    <p className="text-sm text-gray-500 mt-1">{brand.tagline}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {brand.language}
                    </span>
                    {platforms.map((p) => (
                      <span
                        key={p.name}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.role === "PRIMARY"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      brand.isActive ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm text-gray-500">
                    {brand.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
        {brands.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No brands yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
