import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1. Default user
  const hashedPassword = await bcrypt.hash("yantri2026", 10);
  await prisma.user.upsert({
    where: { email: "admin@shownomore.com" },
    update: {},
    create: {
      email: "admin@shownomore.com",
      password: hashedPassword,
      name: "Admin",
    },
  });
  console.log("Seeded user: admin@shownomore.com / yantri2026");

  // 2. The Squirrels brand
  await prisma.brand.upsert({
    where: { name: "The Squirrels" },
    update: {},
    create: {
      name: "The Squirrels",
      tagline: "The Opinion Data Center - Where News Meets Clarity",
      language: "English",
      tone: "Premium editorial. Investigative. Data-first. System decode.",
      editorialCovers: JSON.stringify([
        "Indian governance and policy",
        "International geopolitics with India angle",
        "Economic policy and fiscal data",
        "Defence and national security",
        "Constitutional and legal developments",
        "Government accountability",
        "Technology policy and AI regulation",
        "India global positioning",
      ]),
      editorialNever: JSON.stringify([
        "Celebrity or entertainment",
        "Sports",
        "Religious content or communal framing",
        "Lifestyle health food",
        "Motivation or self-help",
        "Party politics without governance angle",
        "Unverified conspiracy theories",
      ]),
      activePlatforms: JSON.stringify([
        { name: "twitter", role: "PRIMARY" },
        { name: "youtube", role: "secondary" },
        { name: "blog", role: "secondary" },
        { name: "meta", role: "tertiary" },
      ]),
      voiceRules: JSON.stringify([
        "Leads with data not opinion",
        "Attributes every claim to a source",
        "Critiques systems not communities",
        "Controlled analytical tone",
        "Neutral on parties ruthless on institutions",
      ]),
      editorialPriorities: JSON.stringify([
        "India geopolitical positioning",
        "Economic data and policy impact",
        "Governance accountability",
        "Technology and AI policy",
        "Constitutional developments",
      ]),
    },
  });
  console.log("Seeded brand: The Squirrels");

  // 3. Breaking Tube brand
  await prisma.brand.upsert({
    where: { name: "Breaking Tube" },
    update: {},
    create: {
      name: "Breaking Tube",
      language: "Hinglish",
      tone: "Data-first but warm. Controlled satire. Direct address. Bhupen voice.",
      editorialCovers: JSON.stringify([
        "Indian domestic politics and policy",
        "Government decisions impacting ordinary Indians",
        "India-specific economic issues",
        "Major international events with India impact",
        "Defence with India angle",
        "Infrastructure and safety failures",
      ]),
      editorialNever: JSON.stringify([
        "International affairs without India connection",
        "Entertainment or Bollywood",
        "Sports",
        "Religious or communal content",
        "Technology without policy angle",
      ]),
      activePlatforms: JSON.stringify([
        { name: "youtube", role: "PRIMARY" },
        { name: "meta", role: "secondary" },
      ]),
      voiceRules: JSON.stringify([
        "High-stakes hook with shocking number or question",
        "Repeat key numbers for emphasis",
        "System/villain framing not community targeting",
        "Controlled satire stay factual",
        "Escalation structure context contradiction consequence who-benefits",
      ]),
      editorialPriorities: JSON.stringify([
        "Domestic governance failures and successes",
        "Economic impact stories",
        "Major political events with accountability",
        "India angle on international crises",
        "Infrastructure and safety failures",
      ]),
    },
  });
  console.log("Seeded brand: Breaking Tube");

  // 4. Platform routing rules
  const rules = [
    { narrativeType: "system_failure", primaryPlatform: "twitter_thread", secondaryPlatform: "youtube_longform", speedPriority: "2_4_hours" },
    { narrativeType: "single_number", primaryPlatform: "twitter_single", secondaryPlatform: "meta_reel", speedPriority: "30_minutes" },
    { narrativeType: "human_impact", primaryPlatform: "youtube_longform", secondaryPlatform: "meta_reel", speedPriority: "24_48_hours" },
    { narrativeType: "policy_explainer", primaryPlatform: "youtube_longform", secondaryPlatform: "blog", speedPriority: "24_48_hours" },
    { narrativeType: "data_contradiction", primaryPlatform: "twitter_thread", secondaryPlatform: "blog", speedPriority: "2_4_hours" },
    { narrativeType: "timeline_chronology", primaryPlatform: "twitter_thread", secondaryPlatform: "youtube_longform", speedPriority: "2_4_hours" },
    { narrativeType: "breaking_news", primaryPlatform: "twitter_single", secondaryPlatform: "youtube_longform", speedPriority: "30_minutes" },
    { narrativeType: "economic_impact", primaryPlatform: "youtube_longform", secondaryPlatform: "meta_reel", speedPriority: "24_48_hours" },
    { narrativeType: "international_india", primaryPlatform: "youtube_longform", secondaryPlatform: "twitter_thread", speedPriority: "24_48_hours" },
    { narrativeType: "business_angle", primaryPlatform: "linkedin", secondaryPlatform: "blog", speedPriority: "1_week" },
    { narrativeType: "governance_data", primaryPlatform: "blog", secondaryPlatform: "twitter_thread", speedPriority: "48_72_hours" },
  ];

  for (const rule of rules) {
    const existing = await prisma.platformRule.findFirst({
      where: { narrativeType: rule.narrativeType },
    });
    if (!existing) {
      await prisma.platformRule.create({
        data: {
          ...rule,
          sendWhen: JSON.stringify([]),
          neverSend: JSON.stringify([]),
        },
      });
    }
  }
  console.log("Seeded 11 platform routing rules");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
