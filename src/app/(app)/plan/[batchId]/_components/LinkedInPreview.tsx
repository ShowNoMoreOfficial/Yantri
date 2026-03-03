"use client";

import CopyButton from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface LinkedInDeliverable {
  platform: string;
  content: {
    post: string;
    word_count: number;
  };
  postingPlan: {
    hashtags: string[];
    time_ist: string;
    time_reasoning: string;
    engagement_note: string;
  };
}

export default function LinkedInPreview({ data }: { data: LinkedInDeliverable }) {
  const { content, postingPlan } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-foreground text-sm">LinkedIn Post</h3>
          <p className="text-xs text-muted-foreground">{content.word_count} words</p>
        </div>
      </div>

      {/* Post Content */}
      <Card className="rounded-xl border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-none text-xs">
            {content.word_count} words
          </Badge>
          <CopyButton text={content.post} />
        </div>
        {/* Styled like a LinkedIn post */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-loose">
            {content.post}
          </p>
        </div>
      </Card>

      {/* Posting Plan */}
      <Card className="rounded-xl border-border p-5 bg-zinc-900/50">
        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Posting Plan</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Post At</div>
            <div className="text-sm font-bold text-foreground">{postingPlan.time_ist}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{postingPlan.time_reasoning}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Hashtags</div>
            <div className="flex flex-wrap gap-1">
              {postingPlan.hashtags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="bg-blue-500/10 text-blue-400 border-none text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Engagement Strategy</div>
            <div className="text-xs text-zinc-300">{postingPlan.engagement_note}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
