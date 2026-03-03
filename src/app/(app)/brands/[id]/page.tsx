"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import BrandForm from "@/components/BrandForm";

interface BrandData {
  id: string;
  name: string;
  tagline: string | null;
  language: string;
  tone: string;
  editorialCovers: string;
  editorialNever: string;
  audienceDescription: string | null;
  activePlatforms: string;
  voiceRules: string;
  editorialPriorities: string;
  isActive: boolean;
}

export default function EditBrandPage() {
  const params = useParams();
  const id = params.id as string;
  const [brand, setBrand] = useState<BrandData | null>(null);

  useEffect(() => {
    fetch(`/api/brands/${id}`)
      .then((r) => r.json())
      .then(setBrand);
  }, [id]);

  if (!brand) return <div className="text-gray-400">Loading brand...</div>;

  const initial = {
    id: brand.id,
    name: brand.name,
    tagline: brand.tagline || "",
    language: brand.language,
    tone: brand.tone,
    editorialCovers: JSON.parse(brand.editorialCovers),
    editorialNever: JSON.parse(brand.editorialNever),
    audienceDescription: brand.audienceDescription || "",
    activePlatforms: JSON.parse(brand.activePlatforms),
    voiceRules: JSON.parse(brand.voiceRules),
    editorialPriorities: JSON.parse(brand.editorialPriorities),
    isActive: brand.isActive,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Brand: {brand.name}</h1>
      <BrandForm initial={initial} />
    </div>
  );
}
