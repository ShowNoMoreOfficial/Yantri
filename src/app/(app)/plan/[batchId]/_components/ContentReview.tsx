"use client";

import TwitterPreview from "./TwitterPreview";
import YouTubePreview from "./YouTubePreview";
import BlogPreview from "./BlogPreview";
import MetaPreview from "./MetaPreview";
import LinkedInPreview from "./LinkedInPreview";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ContentReviewProps {
  deliverable: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function ContentReview({ deliverable }: ContentReviewProps) {
  if (!deliverable?.platform) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Unable to display content preview. Unknown format.
      </div>
    );
  }

  const platform = deliverable.platform.toLowerCase();

  if (platform === "twitter") return <TwitterPreview data={deliverable} />;
  if (platform === "youtube") return <YouTubePreview data={deliverable} />;
  if (platform === "blog") return <BlogPreview data={deliverable} />;
  if (platform === "meta") return <MetaPreview data={deliverable} />;
  if (platform === "linkedin") return <LinkedInPreview data={deliverable} />;

  // Fallback for unknown platforms — show raw JSON
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Platform &quot;{deliverable.platform}&quot; — showing raw deliverable
      </div>
      <pre className="text-xs bg-zinc-900 rounded-lg p-4 whitespace-pre-wrap max-h-96 overflow-auto text-zinc-300">
        {JSON.stringify(deliverable, null, 2)}
      </pre>
    </div>
  );
}
