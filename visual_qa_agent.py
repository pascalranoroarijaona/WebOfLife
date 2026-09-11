#!/usr/bin/env python3
"""
WebOfLife Visual QA Agent
Captures live browser rendering of index.html via Playwright and uses Gemini 2.5 Vision
to detect layout overlap bugs, illegible text, or broken canvas elements.
"""

import os
import sys
import time
from pathlib import Path
from google import genai
from google.genai import types

REPO_ROOT = Path(__file__).parent.resolve()
SCREENSHOT_PATH = REPO_ROOT / ".agent_logs" / "ui_layout_snapshot.png"

GEMINI_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not GEMINI_KEY:
    print("❌ Missing GEMINI_API_KEY")
    sys.exit(1)

client = genai.Client(api_key=GEMINI_KEY)

def capture_ui_screenshot(url: str = "http://localhost:3000") -> bool:
    """Takes a headless browser screenshot using Playwright."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            page.goto(url, wait_until="networkidle")
            time.sleep(2)  # Allow canvas animations to settle
            page.screenshot(path=str(SCREENSHOT_PATH))
            browser.close()
            print(f"   📸 UI Screenshot saved to {SCREENSHOT_PATH}")
            return True
    except ImportError:
        print("❌ Playwright not installed. Run: pip install playwright && playwright install chromium")
        return False
    except Exception as e:
        print(f"❌ Failed to capture screenshot: {e}")
        return False

def analyze_ui_with_vision() -> tuple[bool, str]:
    """Sends screenshot to Gemini Vision for automated visual QA."""
    if not SCREENSHOT_PATH.exists():
        return False, "Screenshot missing."

    image_bytes = SCREENSHOT_PATH.read_bytes()
    prompt = """
    Analyze this WebOfLife simulation UI screenshot:
    1. Are there any overlapping text boxes or HUD elements?
    2. Is the topbar text readable without clipping?
    3. Is the canvas background rendering correctly?

    Respond in JSON format:
    {"has_visual_bugs": true/false, "bugs_description": "details..."}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
            prompt
        ]
    )
    
    return True, response.text

if __name__ == "__main__":
    if capture_ui_screenshot():
        _, report = analyze_ui_with_vision()
        print("\n🔍 Visual QA Audit Report:")
        print(report)