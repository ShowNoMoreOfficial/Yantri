#!/usr/bin/env python3
"""
Khabri Fetch & Rank — Extracted for Yantri integration.
Fetches raw signals from RSS/Google News, ranks them via Gemini, outputs JSON.
"""

import os
import re
import json
import sys
import io
import warnings
import requests
from typing import List

# Fix Windows stdout encoding (cp1252 can't handle ₹ and other Unicode chars)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

from bs4 import BeautifulSoup

try:
    from google import genai
    from google.genai import types
except ImportError:
    print(json.dumps({"error": "google-genai not installed. Run: pip install google-genai"}))
    sys.exit(1)

try:
    import feedparser
    HAS_FEEDPARSER = True
except ImportError:
    HAS_FEEDPARSER = False

warnings.filterwarnings("ignore")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
RANKING_MODEL = os.environ.get("KHABRI_RANKING_MODEL", "gemini-2.5-flash")

TREND_ENGINE_PROMPT = """
You are TREND_ENGINE. Your job is to rank these raw signals for a content creator.
SCORING CRITERIA (0-10 scale each):
1. PRESSURE: Does this force people to change behavior/money/safety?
2. TRIGGER: Is there a specific new event today?
3. NARRATIVE: Is there a clear "Villain vs Victim" or "System Failure"?
4. SPREAD: Conflict, Emotion, Novelty.

TASK:
1. Analyze the raw signals below.
2. Deduplicate similar stories.
3. Select the Top 15 highest-impact trends.
4. Return strictly valid JSON.

JSON FORMAT:
[
  {
    "rank": 1,
    "topic": "Concise Headline",
    "score": 95,
    "reason": "Detailed 1-sentence analysis of the pressure/trigger.",
    "original_url": "URL from source (if available, else null)"
  }
]
"""

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


def fetch_rss(url: str, source_label: str, limit: int = 20) -> List[dict]:
    """Fetch signals from an RSS feed."""
    if not HAS_FEEDPARSER:
        return []
    try:
        feed = feedparser.parse(url)
        signals = []
        for entry in feed.entries[:limit]:
            signals.append({
                "title": entry.get("title", ""),
                "url": entry.get("link", ""),
                "source": source_label,
            })
        return signals
    except Exception:
        return []


def fetch_google_news(topic: str, source_label: str, limit: int = 15) -> List[dict]:
    """Fetch signals from Google News RSS."""
    url = f"https://news.google.com/rss/search?q={topic}&hl=en-IN&gl=IN&ceid=IN:en"
    return fetch_rss(url, source_label, limit)


def fetch_early_signals() -> List[dict]:
    """Fetch raw signals from multiple sources."""
    signals = []

    # Reddit feeds
    reddit_sources = [
        ("https://www.reddit.com/r/india/rising/.rss", "r/India"),
        ("https://www.reddit.com/r/worldnews/rising/.rss", "r/World"),
        ("https://www.reddit.com/r/GeopoliticsIndia/rising/.rss", "r/GeoIndia"),
    ]
    for url, label in reddit_sources:
        signals.extend(fetch_rss(url, label, 15))

    # Google News topics
    gn_topics = [
        ("India politics", "GN Politics"),
        ("India economy", "GN Economy"),
        ("India defence", "GN Defence"),
        ("India technology policy", "GN Tech"),
        ("India governance", "GN Governance"),
    ]
    for topic, label in gn_topics:
        signals.extend(fetch_google_news(topic, label, 10))

    return signals


def safe_json_loads(text: str):
    """Parse JSON, stripping markdown fences if present."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


def rank_signals(raw_signals: List[dict]) -> List[dict]:
    """Rank signals using Gemini."""
    if not GEMINI_API_KEY:
        return [{"rank": i+1, "topic": s["title"], "score": 0, "reason": "No API key"}
                for i, s in enumerate(raw_signals[:15])]

    client = genai.Client(api_key=GEMINI_API_KEY)
    signal_text = "\n".join(
        [f"- [{s['source']}] {s['title']} (Link: {s['url']})" for s in raw_signals]
    )

    try:
        response = client.models.generate_content(
            model=RANKING_MODEL,
            contents=f"{TREND_ENGINE_PROMPT}\n\nRAW SIGNALS:\n{signal_text}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        ranked = safe_json_loads(response.text)
        if isinstance(ranked, list):
            return ranked
    except Exception as e:
        print(json.dumps({"error": f"Gemini ranking failed: {str(e)}"}), file=sys.stderr)

    # Fallback: return raw signals unranked
    return [
        {"rank": i+1, "topic": s["title"], "score": 0, "reason": "Ranking failed", "original_url": s.get("url")}
        for i, s in enumerate(raw_signals[:15])
    ]


def main():
    raw_signals = fetch_early_signals()
    if not raw_signals:
        print(json.dumps({"error": "No signals fetched from any source"}))
        sys.exit(1)

    ranked = rank_signals(raw_signals)

    # Output as JSON to stdout for Yantri to consume
    print(json.dumps(ranked, ensure_ascii=False))


if __name__ == "__main__":
    main()
