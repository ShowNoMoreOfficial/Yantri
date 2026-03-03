"use client";

import CopyButton from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BlogDeliverable {
  platform: string;
  content: {
    article: string;
    word_count: number;
    format_type?: string;
  };
  postingPlan: {
    seo_title: string;
    meta_description: string;
    focus_keyphrase: string;
    secondary_keyphrases?: string[];
    tags: string[];
    time_ist: string;
    time_reasoning: string;
  };
}

export default function BlogPreview({ data }: { data: BlogDeliverable }) {
  const { content, postingPlan } = data;

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
          <TabsTrigger value="seo">SEO & Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="article">
          <Card className="rounded-xl border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-none text-xs">
                {content.word_count} words
              </Badge>
              <CopyButton text={content.article} />
            </div>
            <article className="prose prose-invert prose-sm max-w-none">
              <pre className="text-sm text-zinc-300 bg-zinc-900 rounded-lg p-6 whitespace-pre-wrap max-h-[600px] overflow-auto leading-relaxed font-sans">
                {content.article}
              </pre>
            </article>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <div className="space-y-4">
            {/* SEO Title */}
            <Card className="rounded-xl border-border p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">SEO Title</h4>
                <CopyButton text={postingPlan.seo_title} />
              </div>
              <p className="text-sm font-medium text-foreground">{postingPlan.seo_title}</p>
              <p className="text-[10px] text-zinc-600 mt-1">{postingPlan.seo_title.length} characters</p>
            </Card>

            {/* Meta Description */}
            <Card className="rounded-xl border-border p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Meta Description</h4>
                <CopyButton text={postingPlan.meta_description} />
              </div>
              <p className="text-sm text-zinc-300">{postingPlan.meta_description}</p>
              <p className="text-[10px] text-zinc-600 mt-1">{postingPlan.meta_description.length}/155 characters</p>
            </Card>

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

            {/* Tags & Posting Time */}
            <Card className="rounded-xl border-border p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {postingPlan.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-none text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Posting Time</h4>
                  <div className="text-sm font-bold text-foreground">{postingPlan.time_ist}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{postingPlan.time_reasoning}</div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
