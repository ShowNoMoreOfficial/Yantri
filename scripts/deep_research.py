#!/usr/bin/env python3
"""
Deep Research via Gemini Interactions API for Yantri.
Takes a research prompt as argument, runs deep research agent, streams progress to stdout.

Uses the deep-research agent with google_search + url_context grounding (enabled by default).
"""

import os
import sys
import json
import time
import traceback

from google import genai

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DEEP_RESEARCH_AGENT = os.environ.get(
    "KHABRI_DEEP_RESEARCH_AGENT", "deep-research-pro-preview-12-2025"
)
POLL_SECONDS = int(os.environ.get("KHABRI_DEEP_RESEARCH_POLL_SECONDS", "10"))
MAX_POLLS = int(os.environ.get("KHABRI_DEEP_RESEARCH_MAX_POLLS", "60"))


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

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        emit("error", {"message": f"Failed to initialize Gemini client: {str(e)}"})
        sys.exit(1)

    emit("status", {"message": "Starting deep research...", "phase": "starting"})

    try:
        research_input = (
            f"Do deep research on: {prompt}\n\n"
            "Return a detailed, cited report with timeline, key numbers, "
            "stakeholder positions, contradictions, and policy/legal framework."
        )

        # Use the dedicated deep research agent with background=True
        # google_search and url_context grounding are enabled by default
        interaction = client.interactions.create(
            input=research_input,
            agent=DEEP_RESEARCH_AGENT,
            background=True,
        )

        interaction_id = interaction.id
        emit("status", {
            "message": f"Deep research started. Interaction ID: {interaction_id}",
            "phase": "researching",
            "interaction_id": interaction_id,
        })

        poll_count = 0
        while poll_count < MAX_POLLS:
            try:
                result = client.interactions.get(interaction_id)
            except Exception as e:
                emit("status", {"message": f"Poll error (retrying): {str(e)}", "phase": "polling"})
                time.sleep(POLL_SECONDS)
                poll_count += 1
                continue

            status = result.status
            poll_count += 1
            emit("status", {
                "message": f"Research in progress... (poll #{poll_count}, status: {status})",
                "phase": "polling",
                "poll_count": poll_count,
                "status": str(status),
            })

            if status == "completed":
                # Extract text from the last output
                text_out = ""
                if result.outputs:
                    for output in result.outputs:
                        if hasattr(output, "text") and output.text:
                            text_out = output.text
                if text_out:
                    emit("complete", {"research": text_out})
                else:
                    emit("error", {"message": "Research completed but no text output found"})
                    sys.exit(1)
                return

            if status in ("failed", "cancelled"):
                err = getattr(result, "error", None) or "Unknown error"
                emit("error", {"message": f"Deep research {status}: {err}"})
                sys.exit(1)

            time.sleep(POLL_SECONDS)

        # Exceeded max polls
        emit("error", {"message": f"Deep research timed out after {MAX_POLLS} polls ({MAX_POLLS * POLL_SECONDS}s)"})
        sys.exit(1)

    except Exception as e:
        tb = traceback.format_exc()
        emit("error", {"message": f"Deep research failed: {str(e)}", "traceback": tb})
        sys.exit(1)


if __name__ == "__main__":
    main()
