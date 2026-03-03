#!/usr/bin/env python3
"""
Deep Research via Gemini Interactions API for Yantri.
Takes a research prompt as argument, runs deep research agent, streams progress to stdout.
"""

import os
import sys
import json
import time
import traceback

from google import genai

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DEEP_RESEARCH_AGENT = os.environ.get("KHABRI_DEEP_RESEARCH_AGENT", "deep-research-pro-preview-12-2025")
POLL_SECONDS = int(os.environ.get("KHABRI_DEEP_RESEARCH_POLL_SECONDS", "10"))


def emit(event_type: str, data: dict):
    """Print a JSON event line to stdout for the Node.js API to read."""
    print(json.dumps({"event": event_type, **data}), flush=True)


def main():
    if len(sys.argv) < 2:
        emit("error", {"message": "No research prompt provided"})
        sys.exit(1)

    prompt = sys.argv[1]

    if not GEMINI_API_KEY:
        emit("error", {"message": "GEMINI_API_KEY not set"})
        sys.exit(1)

    client = genai.Client(api_key=GEMINI_API_KEY)

    emit("status", {"message": "Starting deep research agent...", "phase": "starting"})

    try:
        interaction = client.interactions.create(
            input=f"Do deep research on: {prompt}\n\nReturn a detailed, cited report with timeline, key numbers, stakeholder positions, contradictions, and policy/legal framework.",
            agent=DEEP_RESEARCH_AGENT,
            background=True,
        )

        interaction_id = interaction.id
        emit("status", {"message": f"Deep research started. Interaction ID: {interaction_id}", "phase": "researching", "interaction_id": interaction_id})

        poll_count = 0
        while True:
            result = client.interactions.get(id=interaction_id)
            status = getattr(result, "status", None)

            poll_count += 1
            emit("status", {
                "message": f"Research in progress... (poll #{poll_count}, status: {status})",
                "phase": "polling",
                "poll_count": poll_count,
                "status": str(status),
            })

            if status == "completed":
                # Find the last text output (outputs can be mixed types)
                text_out = ""
                for item in (result.outputs or []):
                    if hasattr(item, "text") and item.text:
                        text_out = item.text
                emit("complete", {"research": text_out.strip()})
                return

            if status in ("failed", "cancelled"):
                err = getattr(result, "error", "Unknown error")
                emit("error", {"message": f"Deep research {status}: {err}"})
                sys.exit(1)

            time.sleep(POLL_SECONDS)

    except Exception as e:
        tb = traceback.format_exc()
        emit("error", {"message": f"Deep research failed: {str(e)}", "traceback": tb})
        sys.exit(1)


if __name__ == "__main__":
    main()
