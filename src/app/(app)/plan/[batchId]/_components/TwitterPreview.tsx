"use client";

import { useState, useCallback } from "react";
import CopyButton from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Tweet {
  position: number;
  text: string;
  type: string;
  media_notes?: string | null;
  hook_archetype?: string;
  nano_banana_prompt?: string | null;
}

interface TwitterDeliverable {
  platform: string;
  format?: "single_tweet" | "thread";
  content: {
    // Thread format
    tweets?: Tweet[];
    thread_length?: number;
    hook_archetype?: string;
    source_replies?: { reply_to_position: number; text: string }[];
    pinned_reply?: string;
    // Single tweet format
    tweet?: string;
    character_count?: number;
    nano_banana_prompt?: string | null;
  };
  postingPlan: {
    time_ist: string;
    time_reasoning: string;
    hashtags: string[];
    thread_pacing?: string;
    engagement_strategy?: string;
    engagement_playbook?: Record<string, unknown>;
  };
}

const typeColors: Record<string, string> = {
  hook: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  data: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  context: "bg-zinc-800 text-zinc-400 border-zinc-700",
  quote: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cta: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const XIcon = () => (
  <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

function ImagePromptBlock({
  prompt,
  imageKey,
  generatedImages,
  loadingImages,
  onGenerate,
}: {
  prompt: string;
  imageKey: string;
  generatedImages: Record<string, string>;
  loadingImages: Record<string, boolean>;
  onGenerate: (key: string, prompt: string) => void;
}) {
  const isLoading = loadingImages[imageKey];
  const imageData = generatedImages[imageKey];

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/5 rounded-lg px-3 py-1.5 border border-indigo-500/10">
        <ImageIcon />
        <span className="flex-1">{prompt}</span>
        <button
          onClick={() => onGenerate(imageKey, prompt)}
          disabled={isLoading}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <SpinnerIcon />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <ImageIcon />
              <span>Generate Image</span>
            </>
          )}
        </button>
      </div>
      {imageData && (
        <div className="rounded-lg overflow-hidden border border-indigo-500/20">
          <img
            src={`data:image/png;base64,${imageData}`}
            alt="Generated image"
            className="w-full max-h-80 object-contain bg-black/50"
          />
          <div className="flex justify-end p-2 bg-zinc-900/50">
            <a
              href={`data:image/png;base64,${imageData}`}
              download="generated-image.png"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function PostingPlan({ postingPlan, isThread }: { postingPlan: TwitterDeliverable["postingPlan"]; isThread: boolean }) {
  return (
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
        {isThread && postingPlan.thread_pacing && (
          <div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Thread Pacing</div>
            <div className="text-xs text-zinc-300">{postingPlan.thread_pacing}</div>
          </div>
        )}
        {postingPlan.engagement_strategy && (
          <div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Engagement Strategy</div>
            <div className="text-xs text-zinc-300">{postingPlan.engagement_strategy}</div>
          </div>
        )}
      </div>
    </Card>
  );
}

function SingleTweetView({
  data,
  generatedImages,
  loadingImages,
  onGenerate,
}: {
  data: TwitterDeliverable;
  generatedImages: Record<string, string>;
  loadingImages: Record<string, boolean>;
  onGenerate: (key: string, prompt: string) => void;
}) {
  const { content, postingPlan } = data;
  const tweetText = content.tweet ?? "";
  const charCount = content.character_count ?? tweetText.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
            <XIcon />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Single Tweet</h3>
            <p className="text-xs text-muted-foreground">Standalone post</p>
          </div>
        </div>
        <CopyButton text={tweetText} />
      </div>

      {/* Tweet Card */}
      <Card className="rounded-xl p-5 border-border ring-1 ring-indigo-500/30 bg-indigo-500/5">
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="outline"
            className="text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          >
            single
          </Badge>
          <span className={`text-[10px] font-medium ${charCount > 280 ? "text-red-400" : "text-zinc-600"}`}>
            {charCount}/280
          </span>
          {content.hook_archetype && (
            <span className="text-[10px] text-zinc-500 ml-auto">
              {content.hook_archetype}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {tweetText}
        </p>
        {content.nano_banana_prompt && (
          <ImagePromptBlock
            prompt={content.nano_banana_prompt}
            imageKey="single"
            generatedImages={generatedImages}
            loadingImages={loadingImages}
            onGenerate={onGenerate}
          />
        )}
      </Card>

      <PostingPlan postingPlan={postingPlan} isThread={false} />
    </div>
  );
}

function ThreadView({
  data,
  generatedImages,
  loadingImages,
  onGenerate,
}: {
  data: TwitterDeliverable;
  generatedImages: Record<string, string>;
  loadingImages: Record<string, boolean>;
  onGenerate: (key: string, prompt: string) => void;
}) {
  const { content, postingPlan } = data;
  const tweets = content.tweets ?? [];
  const threadLength = content.thread_length ?? tweets.length;
  const allText = tweets.map((t) => t.text).join("\n\n");

  return (
    <div className="space-y-6">
      {/* Thread Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
            <XIcon />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Twitter Thread</h3>
            <p className="text-xs text-muted-foreground">{threadLength} tweets</p>
          </div>
        </div>
        <CopyButton text={allText} />
      </div>

      {/* Tweet Cards */}
      <div className="space-y-3">
        {tweets.map((tweet) => (
          <Card
            key={tweet.position}
            className={`rounded-xl p-4 border-border ${
              tweet.type === "hook" ? "ring-1 ring-rose-500/30 bg-rose-500/5" : "bg-card/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-zinc-600 mt-1 shrink-0 w-8 text-center">
                {tweet.position}/{threadLength}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-black uppercase tracking-wider ${
                      typeColors[tweet.type] || typeColors.context
                    }`}
                  >
                    {tweet.type}
                  </Badge>
                  <span className={`text-[10px] font-medium ${
                    tweet.text.length > 280 ? "text-red-400" : "text-zinc-600"
                  }`}>
                    {tweet.text.length}/280
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {tweet.text}
                </p>
                {tweet.media_notes && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/5 rounded-lg px-3 py-1.5 border border-indigo-500/10">
                    <ImageIcon />
                    <span>{tweet.media_notes}</span>
                  </div>
                )}
                {tweet.nano_banana_prompt && (
                  <ImagePromptBlock
                    prompt={tweet.nano_banana_prompt}
                    imageKey={`thread-${tweet.position}`}
                    generatedImages={generatedImages}
                    loadingImages={loadingImages}
                    onGenerate={onGenerate}
                  />
                )}
              </div>
              <CopyButton text={tweet.text} />
            </div>
          </Card>
        ))}
      </div>

      {/* Hook Archetype */}
      {content.hook_archetype && (
        <div className="text-xs text-zinc-500">
          Hook archetype: <span className="text-zinc-400 font-medium">{content.hook_archetype}</span>
        </div>
      )}

      <PostingPlan postingPlan={postingPlan} isThread={true} />
    </div>
  );
}

export default function TwitterPreview({ data }: { data: TwitterDeliverable }) {
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  const handleGenerateImage = useCallback(async (key: string, prompt: string) => {
    setLoadingImages((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/yantri/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate image");
      setGeneratedImages((prev) => ({ ...prev, [key]: data.image }));
    } catch (err) {
      console.error("Image generation failed:", err);
      alert(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setLoadingImages((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  const isThread = data.format === "thread" || (!data.format && Array.isArray(data.content.tweets));

  if (isThread) {
    return (
      <ThreadView
        data={data}
        generatedImages={generatedImages}
        loadingImages={loadingImages}
        onGenerate={handleGenerateImage}
      />
    );
  }

  return (
    <SingleTweetView
      data={data}
      generatedImages={generatedImages}
      loadingImages={loadingImages}
      onGenerate={handleGenerateImage}
    />
  );
}
