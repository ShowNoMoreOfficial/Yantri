"use client";

import CopyButton from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface YouTubeDeliverable {
  platform: string;
  content: {
    script: string;
    sections: { title: string; timestamp: string; notes: string; cues?: string }[];
    runtime_estimate: string;
  };
  postingPlan: {
    titles: { data_first: string; question: string; consequence: string };
    thumbnail: { visual: string; text_overlay: string; emotion: string };
    description: string;
    tags: string[];
    time_ist: string;
    time_reasoning: string;
  };
}

export default function YouTubePreview({ data }: { data: YouTubeDeliverable }) {
  const { content, postingPlan } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">YouTube Longform</h3>
          <p className="text-xs text-muted-foreground">Est. {content.runtime_estimate}</p>
        </div>
      </div>

      <Tabs defaultValue="script" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="packaging">Packaging</TabsTrigger>
        </TabsList>

        <TabsContent value="script">
          <div className="space-y-4">
            {/* Section Timeline */}
            {content.sections.length > 0 && (
              <div className="space-y-3">
                {content.sections.map((section, i) => (
                  <Card key={i} className="rounded-xl border-border p-4 bg-card/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] font-black">
                        {section.timestamp}
                      </Badge>
                      <span className="font-bold text-sm text-foreground">{section.title}</span>
                    </div>
                    {section.notes && (
                      <p className="text-xs text-muted-foreground mb-1">{section.notes}</p>
                    )}
                    {section.cues && (
                      <p className="text-xs text-indigo-400 font-mono">{section.cues}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Full Script */}
            <Card className="rounded-xl border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Full Script</h4>
                <CopyButton text={content.script} />
              </div>
              <pre className="text-xs text-zinc-300 bg-zinc-900 rounded-lg p-4 whitespace-pre-wrap max-h-96 overflow-auto leading-relaxed">
                {content.script}
              </pre>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="packaging">
          <div className="space-y-4">
            {/* Titles */}
            <Card className="rounded-xl border-border p-5">
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Title Options</h4>
              {Object.entries(postingPlan.titles).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between bg-zinc-900 rounded-lg p-3 mb-2 last:mb-0">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">{key.replace(/_/g, " ")}: </span>
                    <span className="text-sm font-medium text-foreground">{val}</span>
                  </div>
                  <CopyButton text={val} />
                </div>
              ))}
            </Card>

            {/* Thumbnail */}
            <Card className="rounded-xl border-border p-5">
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Thumbnail Brief</h4>
              <div className="bg-zinc-900 rounded-lg p-4 text-sm text-zinc-300 space-y-2">
                <div><span className="font-bold text-zinc-400">Visual:</span> {postingPlan.thumbnail.visual}</div>
                <div><span className="font-bold text-zinc-400">Text Overlay:</span> {postingPlan.thumbnail.text_overlay}</div>
                <div><span className="font-bold text-zinc-400">Emotion:</span> {postingPlan.thumbnail.emotion}</div>
              </div>
            </Card>

            {/* Description */}
            <Card className="rounded-xl border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Description</h4>
                <CopyButton text={postingPlan.description} />
              </div>
              <pre className="text-xs text-zinc-300 bg-zinc-900 rounded-lg p-4 whitespace-pre-wrap max-h-48 overflow-auto">
                {postingPlan.description}
              </pre>
            </Card>

            {/* Tags */}
            <Card className="rounded-xl border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Tags</h4>
                <CopyButton text={postingPlan.tags.join(", ")} />
              </div>
              <div className="flex flex-wrap gap-1">
                {postingPlan.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="bg-red-500/10 text-red-400 border-none text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Posting Time */}
            <Card className="rounded-xl border-border p-5">
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Posting Time</h4>
              <div className="text-sm font-bold text-foreground">{postingPlan.time_ist}</div>
              <div className="text-xs text-muted-foreground mt-1">{postingPlan.time_reasoning}</div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
