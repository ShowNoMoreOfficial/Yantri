"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import InlineEditToolbar from "@/components/InlineEditToolbar";
import { toast } from "sonner";

function PreviewSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-4 bg-zinc-800 rounded w-3/4" />
      <div className="h-4 bg-zinc-800 rounded w-1/2" />
      <div className="h-32 bg-zinc-800 rounded" />
      <div className="h-4 bg-zinc-800 rounded w-2/3" />
    </div>
  );
}

const TwitterPreview = dynamic(() => import("./TwitterPreview"), {
  loading: () => <PreviewSkeleton />,
});
const YouTubePreview = dynamic(() => import("./YouTubePreview"), {
  loading: () => <PreviewSkeleton />,
});
const BlogPreview = dynamic(() => import("./BlogPreview"), {
  loading: () => <PreviewSkeleton />,
});
const MetaPreview = dynamic(() => import("./MetaPreview"), {
  loading: () => <PreviewSkeleton />,
});
const LinkedInPreview = dynamic(() => import("./LinkedInPreview"), {
  loading: () => <PreviewSkeleton />,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ContentReviewProps {
  deliverable: any;
  onUpdate?: (updated: any) => void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function ContentReview({ deliverable, onUpdate }: ContentReviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState(deliverable);

  const handleRewrite = useCallback((original: string, rewritten: string) => {
    setData((prev: typeof deliverable) => {
      const json = JSON.stringify(prev);
      const updated = JSON.parse(json.replace(original, rewritten));
      onUpdate?.(updated);
      toast.success("Text updated");
      return updated;
    });
  }, [onUpdate]);

  const contextStr = useMemo(
    () => data?.content ? JSON.stringify(data.content).slice(0, 2000) : "",
    [data?.content]
  );

  if (!data?.platform) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Unable to display content preview. Unknown format.
      </div>
    );
  }

  const platform = data.platform.toLowerCase();

  return (
    <div ref={containerRef} className="relative">
      <InlineEditToolbar
        containerRef={containerRef}
        context={contextStr}
        onRewrite={handleRewrite}
      />
      {platform === "twitter" && <TwitterPreview data={data} />}
      {platform === "youtube" && <YouTubePreview data={data} />}
      {platform === "blog" && <BlogPreview data={data} />}
      {(platform === "meta" || platform.startsWith("meta_")) && <MetaPreview data={data} />}
      {platform === "linkedin" && <LinkedInPreview data={data} />}
      {!["twitter", "youtube", "blog", "meta", "meta_reel", "meta_carousel", "meta_post", "linkedin"].includes(platform) && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Platform &quot;{data.platform}&quot; — showing raw deliverable
          </div>
          <pre className="text-xs bg-zinc-900 rounded-lg p-4 whitespace-pre-wrap max-h-96 overflow-auto text-zinc-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
