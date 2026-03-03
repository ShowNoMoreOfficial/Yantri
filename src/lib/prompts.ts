import { Brand, PlatformRule, Trend } from "@prisma/client";

export function buildEditorialScanPrompt(
  brands: Brand[],
  rules: PlatformRule[],
  trends: Trend[]
) {
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
Voice Rules: ${JSON.parse(b.voiceRules).join("; ")}
Editorial Priorities: ${JSON.parse(b.editorialPriorities).join(", ")}`;
    })
    .join("\n---\n");

  const rulesText = rules
    .map(
      (r) =>
        `${r.narrativeType} -> ${r.primaryPlatform} (primary) -> ${r.secondaryPlatform || "none"} (secondary) -> speed: ${r.speedPriority}`
    )
    .join("\n");

  const trendText = trends
    .map((t) => `Rank ${t.rank} | Score ${t.score} | ${t.headline} | ${t.reason}`)
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
      "trend_headline": "...",
      "trend_score": 98,
      "narrative_angle": "The specific story in one sentence",
      "why_this_narrative": "2-3 lines of reasoning",
      "information_gap": "What others are missing",
      "brand": "Brand Name",
      "platform": "twitter_thread",
      "secondary_platform": "youtube_longform",
      "format": "thread_6_9",
      "urgency": "publish within 4 hours"
    }
  ],
  "skipped": [
    {
      "trend_headline": "...",
      "reason": "Outside editorial territory"
    }
  ]
}

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
  const systemPrompt = `Generate a precise deep research prompt for the following narrative angle. The prompt will be pasted into a research AI (Gemini Deep Research) to produce a comprehensive dossier.

NARRATIVE: ${narrativeAngle}
FROM TREND: ${trendHeadline}
FOR BRAND: ${brandName}
TARGET PLATFORM: ${platform}

The research prompt MUST request:
- Timeline of events with dates and sources
- Key numbers (costs, casualties, affected populations, budget figures) with source labels
- Stakeholder positions (who said what, when, where)
- Official claims vs available evidence (contradictions)
- Policy/legal framework (what rules exist, what was violated)
- Ground reality (hidden costs, exclusions, what numbers miss)
- 3-5 expert or institutional quotes with attribution
- What mainstream coverage is missing or underreporting
- Comparable precedents (similar events domestically or internationally)

CRITICAL: Target research at the SPECIFIC NARRATIVE ANGLE, not the broad trend headline.

Also generate 3-5 specific Google search queries for quick manual data gathering.

OUTPUT FORMAT (respond in JSON only, no other text):
{
  "research_prompt": "The full prompt text ready to paste into Gemini Deep Research",
  "manual_queries": [
    {"query": "...", "looking_for": "..."}
  ]
}`;

  return { systemPrompt, userMessage: "Generate the research prompt now." };
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
