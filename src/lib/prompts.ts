import { Brand, PlatformRule, Trend } from "@prisma/client";

export function buildEditorialScanPrompt(
  brands: Brand[],
  rules: PlatformRule[],
  trends: Trend[]
) {
  // Collect all allowed platform names across all active brands
  const allowedPlatformPrefixes: string[] = [];
  brands.forEach((b) => {
    const platforms = JSON.parse(b.activePlatforms) as { name: string; role: string }[];
    platforms.forEach((p) => {
      const name = p.name.toLowerCase();
      if (!allowedPlatformPrefixes.includes(name)) allowedPlatformPrefixes.push(name);
    });
  });

  const brandText = brands
    .map((b) => {
      const platforms = JSON.parse(b.activePlatforms) as { name: string; role: string }[];
      const platformList = platforms.map((p) => `${p.name} (${p.role})`).join(", ");
      return `
BRAND: ${b.name}
Language: ${b.language}
Tone: ${b.tone}
Covers: ${JSON.parse(b.editorialCovers).join(", ")}
Never Covers: ${JSON.parse(b.editorialNever).join(", ")}
ALLOWED PLATFORMS (ONLY use these): ${platformList}
Voice Rules: ${(Array.isArray(b.voiceRules) ? (b.voiceRules as string[]) : []).join("; ")}
Editorial Priorities: ${JSON.parse(b.editorialPriorities).join(", ")}`;
    })
    .join("\n---\n");

  // Filter routing rules: only show rules whose platforms are available to at least one brand
  const platformMatches = (platformStr: string) => {
    const p = platformStr.toLowerCase();
    return allowedPlatformPrefixes.some((prefix) => p.startsWith(prefix));
  };

  const filteredRules = rules.filter(
    (r) => platformMatches(r.primaryPlatform)
  );

  const rulesText = filteredRules
    .map((r) => {
      const secondary =
        r.secondaryPlatform && platformMatches(r.secondaryPlatform)
          ? r.secondaryPlatform
          : "none";
      return `${r.narrativeType} -> ${r.primaryPlatform} (primary) -> ${secondary} (secondary) -> speed: ${r.speedPriority}`;
    })
    .join("\n");

  const trendText = trends
    .map((t) => `ID: ${t.id} | Rank ${t.rank} | Score ${t.score} | ${t.headline} | ${t.reason}`)
    .join("\n");

  const systemPrompt = `You are the editorial brain of a media newsroom. You have been given a set of ranked news trends and the editorial identity files for the brands you serve.

Your job: scan all trends, filter them against brand editorial territory, select the ONE best narrative angle per viable trend, route each to the correct platform, and produce a production plan.

BRAND IDENTITIES:
${brandText}

PLATFORM ROUTING RULES:
${rulesText}

EVALUATION LENSES (apply in order):
1. IMPACT RADIUS - How many people affected, how severely
2. INFORMATION GAP - What does the public not know that they should
3. BRAND FIT - Does this match editorial territory (absolute filter)
4. NARRATIVE DEPTH - Is there a specific human story, not just a headline
5. TIMING - Is this time-sensitive or can it wait for better research

SELECTION CRITERIA for choosing ONE narrative per trend:
- Highest information gap
- Most provable with data
- Best brand fit
- Longest shelf life
- Creates understanding, not just outrage

OUTPUT FORMAT (respond in JSON only, no other text):
{
  "plan_date": "YYYY-MM-DD",
  "priorities": [
    {
      "priority": 1,
      "trend_id": "the exact ID string from the trend list",
      "trend_headline": "...",
      "trend_score": 98,
      "narrative_angle": "The specific story in one sentence",
      "why_this_narrative": "2-3 lines of reasoning",
      "information_gap": "What others are missing",
      "brand": "Brand Name",
      "platform": "from brand's ALLOWED PLATFORMS only",
      "secondary_platform": "from brand's ALLOWED PLATFORMS only, or null",
      "format": "thread_6_9",
      "urgency": "publish within 4 hours"
    }
  ],
  "skipped": [
    {
      "trend_id": "the exact ID string from the trend list",
      "trend_headline": "...",
      "reason": "Outside editorial territory"
    }
  ]
}

CRITICAL: You MUST copy the exact trend ID from the input list into trend_id. Do not generate or modify IDs.

Select maximum 3 priorities. Skip everything else with reasoning.
Do not present multiple narrative options per trend. Pick one. You are the editor.

CRITICAL PLATFORM CONSTRAINT: You MUST ONLY route content to platforms listed in a brand's ALLOWED PLATFORMS. If a brand does not have "youtube" in its allowed platforms, you MUST NOT assign youtube_longform or any youtube format to that brand. This is an absolute rule — no exceptions.`;

  return { systemPrompt, userMessage: `Here are today's trends:\n\n${trendText}` };
}

export function buildResearchPrompt(
  narrativeAngle: string,
  trendHeadline: string,
  brandName: string,
  platform: string
) {
  const systemPrompt = `You are an investigative research analyst for ${brandName}. Using web search, produce a focused research dossier on the narrative angle below.

NARRATIVE ANGLE: ${narrativeAngle}
SOURCE TREND: ${trendHeadline}
TARGET PLATFORM: ${platform}

Structure your research as:

## Key Facts & Timeline
What happened, when, in what sequence. Include dates. Cite sources.

## Critical Numbers
Statistics, costs, figures, affected populations — the data that tells the story. Cite every number.

## Stakeholder Positions
Who said what, when, where. Include direct quotes with attribution.

## Contradictions & Gaps
Where official claims conflict with evidence. What mainstream coverage is missing or underreporting.

## Context & Precedents
Similar cases, relevant policy/legal background, and comparable events that add depth.

RULES:
- Focus TIGHTLY on the narrative angle, not the broad trend headline
- Every claim must cite its source
- Prioritize recent, verified information
- Be concise and data-dense — aim for 800-1500 words
- No filler, no generalizations, no unsourced speculation`;

  return { systemPrompt, userMessage: `Research this narrative angle now: ${narrativeAngle}` };
}

export function buildEnginePrompt(
  narrativeAngle: string,
  platform: string,
  format: string,
  brandName: string,
  voiceRules: string,
  researchResults: string
) {
  const systemPrompt = `You are generating a prompt to paste into a specialized content engine. Based on the platform and format, generate the appropriate prompt.

NARRATIVE: ${narrativeAngle}
PLATFORM: ${platform}
FORMAT: ${format}
BRAND: ${brandName}
BRAND VOICE: ${voiceRules}
RESEARCH DOSSIER: ${researchResults}

IF PLATFORM contains "twitter":
Generate a complete prompt for the Squirrels X Engine. Include: narrative, format decision with justification, the research structured as priority data points (5-8 most tweetable numbers), stakeholder quotes under 25 words, key contradictions, and a suggested hook angle using one of these archetypes: The Number That Should Not Exist, The Contradiction, The Question Nobody Is Asking, The System Reveal, The Timeline Compression, The Scale Translation, The Uncomfortable Comparison, The Source Authority.

IF PLATFORM contains "youtube":
Generate a complete prompt for the Bhupen Script Engine. Include:
PROJECT BRIEF with topic_title, platform (YouTube long), target_runtime (10-15 or 15-20 min), language, audience description, tone_dial (1-10), political_sensitivity_level.
MODE: FROM SCRATCH
RESEARCH_PACK structured as: timeline_facts, key_numbers, quotes_and_attribution, stakeholder_positions, policy_or_legal, contradictions, ground_reality, sensitivity_flags, proof_assets_available.
NARRATIVE DIRECTION explaining the angle and escalation structure.

IF PLATFORM = "blog":
Generate a complete prompt for the Blog Engine. Include: topic, format (Explainer/Timeline/Data analysis/Policy breakdown), structured research pack, SEO direction with focus keyphrase, 5-8 secondary keyphrases, 8-12 long-tail search queries.

IF PLATFORM = "meta":
Generate the final content directly: reel script (under 60 seconds, works without sound), or carousel outline, or image + caption. Include text overlay sequence for reels.

IF PLATFORM = "linkedin":
Generate the final post directly: 400-1200 words, hook in first 2 lines, generous line breaks, 3-5 hashtags at end, no external links in body.

OUTPUT FORMAT (respond in JSON only, no other text):
{
  "target_engine": "squirrels_x_engine | bhupen_script | blog_engine | direct_meta | direct_linkedin",
  "prompt": "The complete prompt text ready to copy-paste",
  "is_direct_content": true/false
}`;

  return { systemPrompt, userMessage: "Generate the engine prompt now." };
}

export function buildPackagingPrompt(
  narrativeAngle: string,
  platform: string,
  brandName: string,
  keyDataPoints: string
) {
  const systemPrompt = `Generate a complete content package for the following piece.

NARRATIVE: ${narrativeAngle}
PLATFORM: ${platform}
BRAND: ${brandName}
KEY DATA POINTS: ${keyDataPoints}

Generate:
1. THREE title variants:
   - Variant A: Data-first (leads with number or fact)
   - Variant B: Question/curiosity (opens a loop)
   - Variant C: Consequence/impact (what this means for you)
   Apply platform-specific title rules:
   - YouTube Breaking Tube: Hinglish, number in first 5 words, 50-70 chars
   - YouTube Squirrels: English, data-first authority framing, 50-70 chars
   - Twitter: Hook in first 7 words, standalone sentence
   - Blog: SEO-first, focus keyphrase in first 60 chars

2. THUMBNAIL BRIEF:
   - What the image should show
   - Text overlay (max 3-4 words)
   - Primary emotion: shock, curiosity, anger, or disbelief
   - Color mood
   - Brand-specific rules (BT: Bhupen face + data point, Squirrels: clean data-card aesthetic)

3. DESCRIPTION: Platform-appropriate with SEO keywords embedded naturally

4. TAGS/HASHTAGS: Platform-appropriate count (Twitter 0-2, META 5-10, YouTube 8-15)

5. POSTING TIME: Specific IST time with reasoning based on platform and audience geography

6. CROSS-PLATFORM REPURPOSE: What to extract from this piece for other platforms

OUTPUT FORMAT (respond in JSON only, no other text):
{
  "titles": {"data_first": "...", "question": "...", "consequence": "..."},
  "thumbnail": {"visual": "...", "text_overlay": "...", "emotion": "...", "color_mood": "..."},
  "description": "...",
  "tags": ["..."],
  "posting_time": {"time_ist": "...", "reasoning": "..."},
  "repurpose": [{"target_platform": "...", "what_to_extract": "...", "format": "..."}]
}`;

  return { systemPrompt, userMessage: "Generate the content package now." };
}

// ---------------------------------------------------------------------------
// Platform Content Generation — replaces buildEnginePrompt + buildPackagingPrompt
// ---------------------------------------------------------------------------

function normalizePlatform(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes("twitter") || p.includes("x_thread") || p === "x") return "twitter";
  if (p.includes("youtube") || p.includes("yt")) return "youtube";
  if (p.includes("blog") || p.includes("article") || p.includes("website")) return "blog";
  if (p.includes("meta") || p.includes("instagram") || p.includes("reel") || p.includes("carousel")) return "meta";
  if (p.includes("linkedin")) return "linkedin";
  return "twitter";
}

function sharedContext(params: {
  narrativeAngle: string;
  trendHeadline: string;
  brandName: string;
  brandTone: string;
  voiceRules: string;
  language: string;
  researchResults: string;
  format: string;
}): string {
  return `
NARRATIVE ANGLE: ${params.narrativeAngle}
SOURCE TREND: ${params.trendHeadline}
BRAND: ${params.brandName}
BRAND TONE: ${params.brandTone}
BRAND VOICE RULES: ${params.voiceRules}
LANGUAGE: ${params.language}
FORMAT: ${params.format}

RESEARCH DOSSIER:
${params.researchResults}`;
}

function buildTwitterPrompt(ctx: string): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are the Squirrels X Engine — a Twitter/X thread writer for a data-driven news brand. You produce complete, publish-ready threads. Not prompts, not outlines — ACTUAL TWEETS.

${ctx}

INSTRUCTIONS:
1. Write a complete Twitter thread. Each tweet must be ≤ 280 characters.
2. The HOOK tweet (position 1) must use one of these archetypes:
   - The Number That Should Not Exist
   - The Contradiction
   - The Question Nobody Is Asking
   - The System Reveal
   - The Timeline Compression
   - The Scale Translation
   - The Uncomfortable Comparison
   - The Source Authority
3. Follow the hook with DATA tweets (hard numbers with sources), CONTEXT tweets (connecting dots), QUOTE tweets (stakeholder words, under 25 words), and end with a CTA tweet.
4. Thread length: 6-9 tweets based on how much the research supports.
5. Use brand voice rules strictly. Match the language specified.
6. Do NOT add hashtags inside tweet text. Hashtags go only in the posting plan.
7. Include media_notes only for tweets where an image/chart would genuinely add value (not every tweet).

OUTPUT FORMAT (respond in JSON only):
{
  "platform": "twitter",
  "content": {
    "tweets": [
      {
        "position": 1,
        "text": "Full tweet text here",
        "type": "hook",
        "media_notes": "Chart showing X vs Y comparison"
      },
      {
        "position": 2,
        "text": "Full tweet text here",
        "type": "data",
        "media_notes": null
      }
    ],
    "thread_length": 7,
    "hook_archetype": "The Number That Should Not Exist"
  },
  "postingPlan": {
    "time_ist": "10:30 AM",
    "time_reasoning": "Peak engagement window for policy/news content on Indian Twitter",
    "hashtags": ["#tag1", "#tag2"],
    "thread_pacing": "Post tweets 30-60 seconds apart for algorithmic favor",
    "engagement_strategy": "Pin the hook tweet. Quote-tweet it from brand account 2 hours later with a follow-up data point."
  }
}`;

  return { systemPrompt, userMessage: "Generate the complete Twitter thread and posting plan now." };
}

function buildYouTubePrompt(ctx: string): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are the Bhupen Script Engine — a YouTube longform script writer for a news/explainer brand. You produce complete, shoot-ready video scripts. Not outlines, not prompts — THE ACTUAL SCRIPT with production cues.

${ctx}

INSTRUCTIONS:
1. Write a complete video script for a 10-15 minute video (or 15-20 if the research depth warrants it).
2. Structure the script in clear SECTIONS with timestamps. Each section must have:
   - Title (what this section covers)
   - Timestamp range (e.g., "0:00-0:30")
   - The actual script text (what the host reads/says)
   - Production cues in brackets: [B-ROLL: description], [GRAPHIC: description], [MUSIC: mood], [CUT TO: description]
3. The HOOK section (first 30 seconds) must grab attention with a shocking number, question, or contradiction.
4. Build escalation: each section should raise the stakes or reveal something new.
5. End with a strong conclusion that ties back to the hook and includes a call-to-action.
6. Use brand voice rules. Match the language and tone dial.
7. For the posting plan, generate three distinct title options following brand-specific title rules.

OUTPUT FORMAT (respond in JSON only):
{
  "platform": "youtube",
  "content": {
    "script": "Full script text with [PRODUCTION CUES] inline...",
    "sections": [
      {
        "title": "Hook",
        "timestamp": "0:00-0:30",
        "notes": "Open with the contradiction between govt claims and ground reality",
        "cues": "[GRAPHIC: Split screen - official statement vs actual footage]"
      }
    ],
    "runtime_estimate": "12-14 minutes"
  },
  "postingPlan": {
    "titles": {
      "data_first": "Title variant leading with a number or fact (50-70 chars)",
      "question": "Title variant as a curiosity-opening question (50-70 chars)",
      "consequence": "Title variant about impact/consequence (50-70 chars)"
    },
    "thumbnail": {
      "visual": "What the thumbnail image should show",
      "text_overlay": "Max 3-4 words for thumbnail text",
      "emotion": "shock|curiosity|anger|disbelief"
    },
    "description": "Full YouTube description with SEO keywords, timestamps, and links section",
    "tags": ["tag1", "tag2", "tag3"],
    "time_ist": "6:00 PM",
    "time_reasoning": "Peak YouTube India viewing hours for news content"
  }
}`;

  return { systemPrompt, userMessage: "Generate the complete YouTube script and posting plan now." };
}

function buildBlogPrompt(ctx: string): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are the Blog Engine — a long-form editorial writer for a data-driven news brand. You produce complete, publish-ready articles. Not outlines — THE FULL ARTICLE with SEO optimization.

${ctx}

INSTRUCTIONS:
1. Write a complete article (1200-2500 words) with proper heading hierarchy (H1, H2, H3).
2. Format: Choose the best format for this narrative — Explainer, Timeline, Data Analysis, or Policy Breakdown.
3. Lead with the most compelling finding from the research. Don't bury the lede.
4. Every claim must be backed by data from the research dossier with source attribution.
5. Use subheadings every 200-300 words for scannability.
6. Include a strong conclusion with forward-looking implications.
7. Write in the brand's voice and language.
8. The article text should be in markdown format.

OUTPUT FORMAT (respond in JSON only):
{
  "platform": "blog",
  "content": {
    "article": "# Headline\\n\\nFull markdown article text...",
    "word_count": 1800,
    "format_type": "explainer|timeline|data_analysis|policy_breakdown"
  },
  "postingPlan": {
    "seo_title": "SEO-optimized title with focus keyphrase in first 60 chars",
    "meta_description": "155-character meta description with primary keyword",
    "focus_keyphrase": "main keyword phrase",
    "secondary_keyphrases": ["keyphrase1", "keyphrase2"],
    "tags": ["tag1", "tag2", "tag3"],
    "time_ist": "9:00 AM",
    "time_reasoning": "Morning publishing captures search traffic for the day"
  }
}`;

  return { systemPrompt, userMessage: "Generate the complete blog article and posting plan now." };
}

function buildMetaPrompt(ctx: string): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are the Meta Content Engine — a short-form content creator for Instagram/Meta. You produce complete, publish-ready reel scripts or carousel content. Not prompts — THE ACTUAL CONTENT.

${ctx}

INSTRUCTIONS:
1. Decide the best format based on the narrative: REEL (under 60 seconds, works without sound) or CAROUSEL (5-10 slides).
2. For REELS:
   - Write a complete script with precise timing for each segment
   - Include text overlay sequence (what text appears on screen at what time)
   - Specify music mood (not specific tracks)
   - The reel MUST work without sound (text overlays carry the story)
   - Hook in first 2 seconds
3. For CAROUSELS:
   - Write complete text for each slide
   - Describe the visual for each slide
   - First slide is the hook, last slide is the CTA
   - 5-10 slides total
4. Use brand voice rules. Content must be punchy, visual-first, and shareable.

OUTPUT FORMAT (respond in JSON only):
{
  "platform": "meta",
  "content": {
    "type": "reel",
    "script": "Full reel script with timing...",
    "text_overlays": [
      { "time": "0-2s", "text": "Hook text on screen" },
      { "time": "2-5s", "text": "Key stat or fact" }
    ],
    "duration": "45 seconds",
    "music_mood": "tense, building, news-dramatic",
    "slides": null
  },
  "postingPlan": {
    "caption": "Full Instagram caption with line breaks and CTA...",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
    "time_ist": "12:30 PM",
    "time_reasoning": "Peak Instagram engagement during lunch break scrolling",
    "story_tease": "Short text for Instagram story preview linking to the reel/post"
  }
}

For CAROUSEL, use "type": "carousel", set "script" and "text_overlays" to null, and populate "slides":
{
  "slides": [
    { "position": 1, "visual": "Description of slide visual", "text": "Slide headline and body text" }
  ]
}`;

  return { systemPrompt, userMessage: "Generate the complete Meta content and posting plan now." };
}

function buildLinkedInPrompt(ctx: string): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are the LinkedIn Content Engine — a professional thought-leadership writer. You produce complete, publish-ready LinkedIn posts. Not drafts — THE ACTUAL POST ready to paste and publish.

${ctx}

INSTRUCTIONS:
1. Write a complete LinkedIn post (400-1200 words).
2. HOOK in the first 2 lines — this is what shows before "see more". Make it count.
3. Use generous line breaks (single line per thought for mobile readability).
4. Structure: Hook → Context → Data/Insight → Implication → CTA
5. Include 3-5 hashtags at the END only, not scattered through the post.
6. NO external links in the body (LinkedIn penalizes posts with links).
7. Write in a professional but accessible tone that matches brand voice.
8. Use data points from the research to build credibility.

OUTPUT FORMAT (respond in JSON only):
{
  "platform": "linkedin",
  "content": {
    "post": "Full LinkedIn post text with line breaks...",
    "word_count": 650
  },
  "postingPlan": {
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
    "time_ist": "8:30 AM",
    "time_reasoning": "LinkedIn peak: professionals checking feed before work starts",
    "engagement_note": "Reply to first 5 comments within 1 hour to boost algorithmic reach. Add link in first comment."
  }
}`;

  return { systemPrompt, userMessage: "Generate the complete LinkedIn post and posting plan now." };
}

export function buildContentGenerationPrompt(
  platform: string,
  narrativeAngle: string,
  format: string,
  brandName: string,
  brandTone: string,
  voiceRules: string,
  language: string,
  researchResults: string,
  trendHeadline: string
): { systemPrompt: string; userMessage: string } {
  const ctx = sharedContext({
    narrativeAngle,
    trendHeadline,
    brandName,
    brandTone,
    voiceRules,
    language,
    researchResults,
    format,
  });

  const normalized = normalizePlatform(platform);

  switch (normalized) {
    case "youtube":
      return buildYouTubePrompt(ctx);
    case "blog":
      return buildBlogPrompt(ctx);
    case "meta":
      return buildMetaPrompt(ctx);
    case "linkedin":
      return buildLinkedInPrompt(ctx);
    case "twitter":
    default:
      return buildTwitterPrompt(ctx);
  }
}

export function getPlatformAgentName(platform: string): string {
  const normalized = normalizePlatform(platform);
  switch (normalized) {
    case "twitter": return "Twitter Agent";
    case "youtube": return "YouTube Agent";
    case "blog": return "Blog Agent";
    case "meta": return "Meta Agent";
    case "linkedin": return "LinkedIn Agent";
    default: return "Content Agent";
  }
}

export function getPlatformDeliverableDescription(platform: string): string[] {
  const normalized = normalizePlatform(platform);
  switch (normalized) {
    case "twitter":
      return ["Complete thread with hook, data tweets, and CTA", "Optimal posting time and strategy", "Hashtag recommendations"];
    case "youtube":
      return ["Full video script with production cues", "Three title options with thumbnail brief", "SEO description, tags, and posting time"];
    case "blog":
      return ["Complete article with headings and SEO", "Meta description and keyphrases", "Publishing schedule"];
    case "meta":
      return ["Reel script with text overlays or carousel slides", "Caption and hashtag strategy", "Story tease and posting time"];
    case "linkedin":
      return ["Complete professional post", "Hashtag strategy and posting time", "Engagement playbook"];
    default:
      return ["Platform-specific content", "Posting plan"];
  }
}
