"use client";

import { useRef, useState } from "react";
import TwitterPreview from "./TwitterPreview";
import YouTubePreview from "./YouTubePreview";
import BlogPreview from "./BlogPreview";
import MetaPreview from "./MetaPreview";
import LinkedInPreview from "./LinkedInPreview";
import InlineEditToolbar from "@/components/InlineEditToolbar";
import { toast } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ContentReviewProps {
  deliverable: any;
  onUpdate?: (updated: any) => void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function ContentReview({ deliverable, onUpdate }: ContentReviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState(deliverable);

  if (!data?.platform) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Unable to display content preview. Unknown format.
      </div>
    );
  }

  function handleRewrite(original: string, rewritten: string) {
    // Deep replace the original text in the deliverable JSON
    const json = JSON.stringify(data);
    const updated = JSON.parse(json.replace(original, rewritten));
    setData(updated);
    onUpdate?.(updated);
    toast.success("Text updated");
  }

  const platform = data.platform.toLowerCase();
  const contextStr = JSON.stringify(data.content).slice(0, 2000);

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
      {platform === "meta" && <MetaPreview data={data} />}
      {platform === "linkedin" && <LinkedInPreview data={data} />}
      {!["twitter", "youtube", "blog", "meta", "linkedin"].includes(platform) && (
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
