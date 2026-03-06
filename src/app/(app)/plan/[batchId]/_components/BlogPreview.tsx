"use client";

import { useState, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CopyButton from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InlineImagePrompt {
  index: number;
  prompt: string;
  alt: string;
}

interface BlogDeliverable {
  platform: string;
  content: {
    article: string;
    word_count: number;
    format_type?: string;
    featured_image_prompt?: string;
    inline_image_prompts?: InlineImagePrompt[];
  };
  postingPlan: {
    title?: string;
    english_title_slug?: string;
    summary?: string;
    seo_title: string;
    meta_description: string;
    og_title?: string;
    og_description?: string;
    twitter_title?: string;
    twitter_description?: string;
    meta_keywords?: string;
    meta_news_keywords?: string;
    primary_category?: string;
    additional_category?: string;
    focus_keyphrase: string;
    secondary_keyphrases?: string[];
    tags: string[];
    banner_description?: string;
    time_ist: string;
    time_reasoning: string;
  };
}

function SeoField({ label, value, maxChars }: { label: string; value: string; maxChars?: number }) {
  if (!value) return null;
  return (
    <Card className="rounded-xl border-border p-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">{label}</h4>
        <CopyButton text={value} />
      </div>
      <p className="text-sm text-zinc-300">{value}</p>
      {maxChars && (
        <p className="text-[10px] text-zinc-600 mt-1">{value.length}/{maxChars} characters</p>
      )}
    </Card>
  );
}

const SpinnerIcon = () => (
  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

async function generateImage(prompt: string): Promise<string> {
  const res = await fetch("/api/yantri/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate image");
  return `data:image/png;base64,${data.image}`;
}

function InlineImageCard({
  imagePrompt,
  generatedImage,
  loading,
  onGenerate,
}: {
  imagePrompt: InlineImagePrompt;
  generatedImage: string | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <Card className="rounded-xl border-border border-dashed p-4 my-4">
      {generatedImage ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-600 uppercase">Inline Image {imagePrompt.index + 1}</span>
            <div className="flex gap-2">
              <a
                href={generatedImage}
                download={`inline-image-${imagePrompt.index + 1}.png`}
                className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md hover:bg-emerald-500/20 transition-colors"
              >
                Download
              </a>
              <button
                onClick={onGenerate}
                disabled={loading}
                className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md hover:bg-zinc-700 transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={generatedImage}
            alt={imagePrompt.alt}
            className="w-full rounded-lg aspect-video object-cover"
          />
          <p className="text-[10px] text-zinc-600 italic">{imagePrompt.alt}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
            <ImageIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 truncate">{imagePrompt.prompt}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Alt: {imagePrompt.alt}</p>
          </div>
          <button
            onClick={onGenerate}
            disabled={loading}
            className="shrink-0 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <><SpinnerIcon /> Generating...</> : <>Generate</>}
          </button>
        </div>
      )}
    </Card>
  );
}

export default function BlogPreview({ data }: { data: BlogDeliverable }) {
  const { content, postingPlan } = data;
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [inlineImages, setInlineImages] = useState<Record<number, string>>({});
  const [inlineLoading, setInlineLoading] = useState<Record<number, boolean>>({});

  const handleGenerateFeatured = useCallback(async () => {
    if (!content.featured_image_prompt) return;
    setFeaturedLoading(true);
    try {
      const img = await generateImage(content.featured_image_prompt);
      setFeaturedImage(img);
    } catch (err) {
      console.error("Image generation failed:", err);
      alert(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setFeaturedLoading(false);
    }
  }, [content.featured_image_prompt]);

  const handleGenerateInline = useCallback(async (index: number, prompt: string) => {
    setInlineLoading((prev) => ({ ...prev, [index]: true }));
    try {
      const img = await generateImage(prompt);
      setInlineImages((prev) => ({ ...prev, [index]: img }));
    } catch (err) {
      console.error("Inline image generation failed:", err);
      alert(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setInlineLoading((prev) => ({ ...prev, [index]: false }));
    }
  }, []);

  const handleGenerateAllInline = useCallback(async () => {
    if (!content.inline_image_prompts?.length) return;
    for (const ip of content.inline_image_prompts) {
      if (!inlineImages[ip.index]) {
        await handleGenerateInline(ip.index, ip.prompt);
      }
    }
  }, [content.inline_image_prompts, inlineImages, handleGenerateInline]);

  // Split article HTML at <!-- INLINE_IMAGE_N --> markers to interleave image slots
  const articleSections = useMemo(() => {
    const sections: { html: string; imageIndex?: number }[] = [];
    let remaining = content.article;
    const pattern = /<!--\s*INLINE_IMAGE_(\d+)\s*-->/g;
    let match;
    let lastIndex = 0;

    while ((match = pattern.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        sections.push({ html: remaining.slice(lastIndex, match.index) });
      }
      sections.push({ html: "", imageIndex: parseInt(match[1]) });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      sections.push({ html: remaining.slice(lastIndex) });
    }
    return sections;
  }, [content.article]);

  const inlinePromptMap = useMemo(() => {
    const map: Record<number, InlineImagePrompt> = {};
    content.inline_image_prompts?.forEach((ip) => { map[ip.index] = ip; });
    return map;
  }, [content.inline_image_prompts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-foreground text-sm">Blog Article</h3>
          <p className="text-xs text-muted-foreground">
            {content.word_count} words
            {content.format_type && <> &middot; {content.format_type.replace(/_/g, " ")}</>}
          </p>
        </div>
      </div>

      <Tabs defaultValue="article" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="article">Article</TabsTrigger>
          <TabsTrigger value="images">Images ({1 + (content.inline_image_prompts?.length || 0)})</TabsTrigger>
          <TabsTrigger value="seo">SEO & Metadata</TabsTrigger>
          <TabsTrigger value="social">Social Meta</TabsTrigger>
        </TabsList>

        {/* ── Article Tab ── */}
        <TabsContent value="article">
          <Card className="rounded-xl border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-none text-xs">
                {content.word_count} words &middot; Markdown
              </Badge>
              <CopyButton text={content.article} />
            </div>
            {postingPlan.title && (
              <h1 className="text-xl font-bold text-foreground mb-4">{postingPlan.title}</h1>
            )}
            <article className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-200 prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-p:text-zinc-300 prose-p:leading-relaxed prose-strong:text-zinc-200 prose-blockquote:border-emerald-500 prose-blockquote:text-zinc-400 prose-li:text-zinc-300 prose-a:text-emerald-400 max-h-[600px] overflow-auto p-4 bg-zinc-900 rounded-lg">
              {articleSections.map((section, i) => {
                if (section.imageIndex !== undefined) {
                  const ip = inlinePromptMap[section.imageIndex];
                  if (!ip) return null;
                  return (
                    <InlineImageCard
                      key={`img-${section.imageIndex}`}
                      imagePrompt={ip}
                      generatedImage={inlineImages[section.imageIndex] || null}
                      loading={inlineLoading[section.imageIndex] || false}
                      onGenerate={() => handleGenerateInline(ip.index, ip.prompt)}
                    />
                  );
                }
                return (
                  <div key={`section-${i}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.html}</ReactMarkdown>
                  </div>
                );
              })}
            </article>
          </Card>
        </TabsContent>

        {/* ── Images Tab ── */}
        <TabsContent value="images">
          <div className="space-y-4">
            {/* Featured Image */}
            <Card className="rounded-xl border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Featured Image (1280x720)</h4>
                {featuredImage && (
                  <div className="flex gap-2">
                    <a
                      href={featuredImage}
                      download="featured-image.png"
                      className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
                    >
                      Download
                    </a>
                    <button
                      onClick={handleGenerateFeatured}
                      disabled={featuredLoading}
                      className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                      Regenerate
                    </button>
                  </div>
                )}
              </div>
              {featuredImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featuredImage}
                    alt={postingPlan.banner_description || "Featured image"}
                    className="w-full rounded-lg aspect-video object-cover"
                  />
                  {postingPlan.banner_description && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-zinc-500 italic">{postingPlan.banner_description}</p>
                      <CopyButton text={postingPlan.banner_description} />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6 space-y-3">
                  <div className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-600">1280 x 720</p>
                  {content.featured_image_prompt ? (
                    <button
                      onClick={handleGenerateFeatured}
                      disabled={featuredLoading}
                      className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {featuredLoading ? <><SpinnerIcon /> Generating...</> : "Generate Featured Image"}
                    </button>
                  ) : (
                    <p className="text-xs text-zinc-600">No image prompt available</p>
                  )}
                </div>
              )}
              {content.featured_image_prompt && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">Prompt</span>
                    <CopyButton text={content.featured_image_prompt} />
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{content.featured_image_prompt}</p>
                </div>
              )}
            </Card>

            {/* Inline Images */}
            {content.inline_image_prompts && content.inline_image_prompts.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                    Inline Images ({content.inline_image_prompts.length})
                  </h4>
                  <button
                    onClick={handleGenerateAllInline}
                    className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors font-medium"
                  >
                    Generate All
                  </button>
                </div>
                {content.inline_image_prompts.map((ip) => (
                  <Card key={ip.index} className="rounded-xl border-border p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">Image {ip.index + 1}</span>
                      {inlineImages[ip.index] && (
                        <div className="flex gap-2">
                          <a
                            href={inlineImages[ip.index]}
                            download={`inline-image-${ip.index + 1}.png`}
                            className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md hover:bg-emerald-500/20 transition-colors"
                          >
                            Download
                          </a>
                          <button
                            onClick={() => handleGenerateInline(ip.index, ip.prompt)}
                            disabled={inlineLoading[ip.index]}
                            className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md hover:bg-zinc-700 transition-colors"
                          >
                            Regenerate
                          </button>
                        </div>
                      )}
                    </div>
                    {inlineImages[ip.index] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={inlineImages[ip.index]}
                          alt={ip.alt}
                          className="w-full rounded-lg aspect-video object-cover"
                        />
                        <p className="text-[10px] text-zinc-600 italic mt-2">{ip.alt}</p>
                      </>
                    ) : (
                      <button
                        onClick={() => handleGenerateInline(ip.index, ip.prompt)}
                        disabled={inlineLoading[ip.index]}
                        className="w-full py-4 bg-zinc-800/50 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {inlineLoading[ip.index] ? <><SpinnerIcon /> Generating...</> : <>Generate Image {ip.index + 1}</>}
                      </button>
                    )}
                    <div className="mt-2 pt-2 border-t border-zinc-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase">Prompt</span>
                        <CopyButton text={ip.prompt} />
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">{ip.prompt}</p>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </TabsContent>

        {/* ── SEO & Metadata Tab ── */}
        <TabsContent value="seo">
          <div className="space-y-4">
            {postingPlan.title && <SeoField label="Title" value={postingPlan.title} maxChars={70} />}
            {postingPlan.english_title_slug && <SeoField label="English Title (Permalink)" value={postingPlan.english_title_slug} />}
            {postingPlan.summary && <SeoField label="Summary" value={postingPlan.summary} maxChars={250} />}
            <SeoField label="SEO Title" value={postingPlan.seo_title} maxChars={60} />
            <SeoField label="Meta Description" value={postingPlan.meta_description} maxChars={155} />

            {/* Keyphrases */}
            <Card className="rounded-xl border-border p-5">
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Keyphrases</h4>
              <div className="mb-3">
                <div className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Focus</div>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-none">
                  {postingPlan.focus_keyphrase}
                </Badge>
              </div>
              {postingPlan.secondary_keyphrases && postingPlan.secondary_keyphrases.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Secondary</div>
                  <div className="flex flex-wrap gap-1">
                    {postingPlan.secondary_keyphrases.map((kp, i) => (
                      <Badge key={i} variant="secondary" className="bg-zinc-800 text-zinc-400 border-none text-xs">
                        {kp}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Meta Keywords */}
            {postingPlan.meta_keywords && <SeoField label="Meta Keywords" value={postingPlan.meta_keywords} />}
            {postingPlan.meta_news_keywords && <SeoField label="Meta News Keywords" value={postingPlan.meta_news_keywords} />}

            {/* Categories & Tags */}
            <Card className="rounded-xl border-border p-5">
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Post Properties</h4>
              <div className="space-y-4">
                {postingPlan.primary_category && (
                  <div>
                    <div className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Primary Category</div>
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-none">
                      {postingPlan.primary_category}
                    </Badge>
                  </div>
                )}
                {postingPlan.additional_category && (
                  <div>
                    <div className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Additional Category</div>
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-none">
                      {postingPlan.additional_category}
                    </Badge>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {postingPlan.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-none text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Banner Description */}
            {postingPlan.banner_description && <SeoField label="Banner Description / Alt Text" value={postingPlan.banner_description} />}

            {/* Posting Time */}
            <Card className="rounded-xl border-border p-5">
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Posting Time</h4>
              <div className="text-sm font-bold text-foreground">{postingPlan.time_ist}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{postingPlan.time_reasoning}</div>
            </Card>
          </div>
        </TabsContent>

        {/* ── Social Meta Tab ── */}
        <TabsContent value="social">
          <div className="space-y-4">
            <div className="text-xs text-zinc-500 mb-2">Open Graph and Twitter Card metadata for social sharing previews.</div>

            {postingPlan.og_title && <SeoField label="OG Title" value={postingPlan.og_title} maxChars={60} />}
            {postingPlan.og_description && <SeoField label="OG Description" value={postingPlan.og_description} maxChars={200} />}
            {postingPlan.twitter_title && <SeoField label="Twitter Title" value={postingPlan.twitter_title} maxChars={70} />}
            {postingPlan.twitter_description && <SeoField label="Twitter Description" value={postingPlan.twitter_description} maxChars={200} />}

            {/* Preview Card Mockup */}
            {(postingPlan.og_title || postingPlan.seo_title) && (
              <Card className="rounded-xl border-border p-5">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Social Preview</h4>
                <div className="border border-zinc-700 rounded-lg overflow-hidden max-w-md">
                  {featuredImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={featuredImage} alt="" className="w-full aspect-video object-cover" />
                  )}
                  <div className="p-3 bg-zinc-800">
                    <p className="text-sm font-semibold text-zinc-200 line-clamp-2">
                      {postingPlan.og_title || postingPlan.seo_title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                      {postingPlan.og_description || postingPlan.meta_description}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
