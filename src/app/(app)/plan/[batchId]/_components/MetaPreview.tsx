"use client";

import CopyButton from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface MetaDeliverable {
  platform: string;
  content: {
    type: string;
    script?: string | null;
    text_overlays?: { time: string; text: string }[] | null;
    slides?: { position: number; visual: string; text: string }[] | null;
    duration?: string;
    music_mood?: string;
  };
  postingPlan: {
    caption: string;
    hashtags: string[];
    time_ist: string;
    time_reasoning: string;
    story_tease?: string;
  };
}

export default function MetaPreview({ data }: { data: MetaDeliverable }) {
  const { content, postingPlan } = data;
  const isReel = content.type === "reel";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-pink-500/10 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">
            Meta {isReel ? "Reel" : "Carousel"}
          </h3>
          {content.duration && (
            <p className="text-xs text-muted-foreground">{content.duration}</p>
          )}
        </div>
      </div>

      {/* Reel Content */}
      {isReel && (
        <div className="space-y-4">
          {/* Script */}
          {content.script && (
            <Card className="rounded-xl border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Reel Script</h4>
                <CopyButton text={content.script} />
              </div>
              <pre className="text-sm text-zinc-300 bg-zinc-900 rounded-lg p-4 whitespace-pre-wrap max-h-64 overflow-auto leading-relaxed">
                {content.script}
              </pre>
            </Card>
          )}

          {/* Text Overlays Timeline */}
          {content.text_overlays && content.text_overlays.length > 0 && (
            <Card className="rounded-xl border-border p-5">
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Text Overlays</h4>
              <div className="space-y-2">
                {content.text_overlays.map((overlay, i) => (
                  <div key={i} className="flex items-center gap-3 bg-zinc-900 rounded-lg p-3">
                    <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[9px] font-black shrink-0">
                      {overlay.time}
                    </Badge>
                    <span className="text-sm text-foreground font-medium">{overlay.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Music Mood */}
          {content.music_mood && (
            <div className="text-xs text-zinc-500">
              Music mood: <span className="text-zinc-400 font-medium">{content.music_mood}</span>
            </div>
          )}
        </div>
      )}

      {/* Carousel Content */}
      {!isReel && content.slides && (
        <Card className="rounded-xl border-border p-5">
          <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">
            Carousel Slides ({content.slides.length})
          </h4>
          <div className="space-y-3">
            {content.slides.map((slide) => (
              <div key={slide.position} className="bg-zinc-900 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-zinc-600">Slide {slide.position}</span>
                  {slide.position === 1 && (
                    <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[9px]">
                      HOOK
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground mb-1">{slide.text}</p>
                <p className="text-xs text-zinc-500 italic">{slide.visual}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Posting Plan */}
      <Card className="rounded-xl border-border p-5 bg-zinc-900/50">
        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Posting Plan</h4>
        <div className="space-y-4">
          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Caption</div>
              <CopyButton text={postingPlan.caption} />
            </div>
            <pre className="text-sm text-zinc-300 bg-zinc-900 rounded-lg p-3 whitespace-pre-wrap max-h-32 overflow-auto">
              {postingPlan.caption}
            </pre>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Hashtags</div>
              <div className="flex flex-wrap gap-1">
                {postingPlan.hashtags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="bg-pink-500/10 text-pink-400 border-none text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Post At</div>
              <div className="text-sm font-bold text-foreground">{postingPlan.time_ist}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{postingPlan.time_reasoning}</div>
            </div>
          </div>

          {postingPlan.story_tease && (
            <div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Story Tease</div>
              <div className="text-xs text-zinc-300">{postingPlan.story_tease}</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
