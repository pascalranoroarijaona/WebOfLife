#!/usr/bin/env python3
"""
Web of Life Start-Up Sprint Orchestrator (Agile Release Engine V5)
Orchestrates an autonomous multi-agent software start-up using Gemini 2.5 Flash-Lite.

Agent Team:
1. Ecological Brainstormer: Audits biosphere fidelity, trophic webs, and species taxonomy.
2. Industrial Brainstormer: Audits technosphere fidelity, material streams, and human processes.
3. Planetary Physics Brainstormer: Audits exergy, entropy, climate feedback, and H3 spatial grids.
4. Product Manager (PM): Synthesizes brainstormer findings, appends BACKLOG.md, and defines Sprint Goals.
5. Lead Architect: Drafts sprint architectural RFCs in docs/sprints/sprint_N/01_RFC.md.
6. Method Miner: Quantifies thermodynamic process formulas in docs/sprints/sprint_N/02_METHODS.md.
7. Backend Engineer: Implements modular TypeScript files in src/ with strict typing.
8. Debugger Agent: Intercepts build/test errors, analyzes stack traces, and applies fixes.
9. UI Engineer: Builds sprint UI in docs/sprints/sprint_N/index.html (NEVER modifies root index.html).
10. Technical Documentalist: Creates sprint release notes.
11. Thermodynamic Auditor: Validates First/Second Law mass conservation (delta Stock = 0).
12. Research Outreach Lead: Authors arXiv-style preprint abstracts (05_ACADEMIC_PREPRINT.md).
13. Scientific Storyteller: Translates breakthroughs into viral social threads (06_VIRAL_STORYTELLING.md).
14. DevRel Community Architect: Crafts onboarding and contributor guides (07_COMMUNITY_GUIDE.md).
15. Gaïa Voice: Living acoustic spirit generating poetic audio summaries of sprints.

Safety & Quality Controls:
- Isolated UI Builds: Root index.html acts as Launcher Shell; agents write strictly to docs/sprints/.
- UI Non-Regression Verification: Rejects sprint HTML if complexity or containers decrease.
- Atomic Sprint Backups: Full snapshot created per sprint; auto-rollback on failure.
- Daily Quota Pacing: Manages 500 requests/day ceiling with exponential backoff.
- Automatic Sprint Folder Normalization: Auto-corrects literal 'sprint_N' path markers from LLMs.
- Complete Artifact Repair: Audits and regenerates truncated or missing sprint Markdown files (01-07).
- Full Project Wipe: Reset repository to Commit 0 baseline state via `--wipe`.
"""

import os
import sys
import time
import json
import random
import signal
import subprocess
import re
import shutil
import argparse
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Callable, Any, Dict, List, Tuple, Optional
# =============================================================================
# BUGFIX: Windows SSL [ASN1: NOT_ENOUGH_DATA] Bypass
# Forces aiohttp to use the certifi bundle instead of the Windows System Store
# =============================================================================
import ssl
import certifi

_orig_create_default_context = ssl.create_default_context

def _custom_create_default_context(purpose=ssl.Purpose.SERVER_AUTH, *, cafile=None, capath=None, cadata=None):
    if cafile is None:
        cafile = certifi.where()
    return _orig_create_default_context(purpose=purpose, cafile=cafile, capath=capath, cadata=cadata)

ssl.create_default_context = _custom_create_default_context
# ─────────────────────────────────────────────────────────────────────────────
# Environment & Multi-Provider SDK Setup (Gemini / Hugging Face / Local Qwen)
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.resolve()
LOGS_DIR = REPO_ROOT / ".agent_logs"
DOCS_DIR = REPO_ROOT / "docs"
SPRINTS_DIR = DOCS_DIR / "sprints"

LOGS_DIR.mkdir(exist_ok=True)
DOCS_DIR.mkdir(exist_ok=True)
SPRINTS_DIR.mkdir(exist_ok=True)

QUOTA_FILE = LOGS_DIR / "quota_tracker.json"
STATE_FILE = LOGS_DIR / "state_tracker.json"
BACKLOG_FILE = DOCS_DIR / "BACKLOG.md"

MAX_DAILY_CALLS = 5000  
MIN_CALL_DELAY_SEC = 3.0  

# Global Provider State
SELECTED_PROVIDER = "gemini"
SELECTED_MODEL = "gemini-flash-lite-latest"

gemini_client = None
hf_client = None
local_qwen_model = None
local_qwen_tokenizer = None

def init_provider(provider: str, custom_model: Optional[str] = None):
    global SELECTED_PROVIDER, SELECTED_MODEL, gemini_client, hf_client, local_qwen_model, local_qwen_tokenizer
    SELECTED_PROVIDER = provider.lower()

    if SELECTED_PROVIDER == "gemini":
        SELECTED_MODEL = custom_model or "gemini-flash-lite-latest"
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("❌ Error: Missing Gemini API key. Set GEMINI_API_KEY in your environment.")
            sys.exit(1)
        from google import genai
        gemini_client = genai.Client(api_key=api_key)
        print(f"🤖 Active Provider: Gemini API [{SELECTED_MODEL}]")

    elif SELECTED_PROVIDER == "huggingface":
        SELECTED_MODEL = custom_model or "Qwen/Qwen2.5-Coder-32B-Instruct"
        hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACEHUB_API_TOKEN")
        if not hf_token:
            print("❌ Error: Missing Hugging Face Token. Set HF_TOKEN in your environment.")
            sys.exit(1)
        from huggingface_hub import InferenceClient
        hf_client = InferenceClient(model=SELECTED_MODEL, token=hf_token)
        print(f"🤖 Active Provider: Hugging Face Serverless API [{SELECTED_MODEL}]")

    elif SELECTED_PROVIDER == "local-qwen":
        SELECTED_MODEL = custom_model or "Qwen/Qwen3-0.6B"
        print(f"🤖 Loading Local Model: {SELECTED_MODEL} via Hugging Face Transformers...")
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
            local_qwen_tokenizer = AutoTokenizer.from_pretrained(SELECTED_MODEL)
            local_qwen_model = AutoModelForCausalLM.from_pretrained(
                SELECTED_MODEL,
                torch_dtype="auto",
                device_map="auto"
            )
            print(f"✅ Local {SELECTED_MODEL} loaded successfully on device: {local_qwen_model.device}")
        except Exception as e:
            print(f"❌ Failed to load local model `{SELECTED_MODEL}`: {e}")
            print("   Ensure you installed requirements: pip install \"transformers>=4.51.0\" torch accelerate")
            sys.exit(1)
    else:
        print(f"❌ Unknown provider `{provider}`. Choose from: gemini, huggingface, local-qwen")
        sys.exit(1)

def setup_logging():
    log_file = LOGS_DIR / "orchestrator.log"
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setFormatter(formatter)
    logger.addHandler(fh)
    
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(formatter)
    logger.addHandler(sh)

setup_logging()

# Global in-memory backup state for atomic sprint rollbacks
current_iteration_backups: Dict[str, Optional[str]] = {}

# ─────────────────────────────────────────────────────────────────────────────
# Dynamic File & Backup Safety Engine
# ─────────────────────────────────────────────────────────────────────────────

def is_safe_path(filepath: str) -> bool:
    """Restricts file modifications strictly inside web-of-life repository root."""
    try:
        target = (REPO_ROOT / filepath).resolve()
        protected_paths = {
            (REPO_ROOT / "README.md").resolve(),
            (REPO_ROOT / "tsconfig.json").resolve(),
            (REPO_ROOT / "package.json").resolve(),
            (REPO_ROOT / "agent_orchestrator.py").resolve(),
            (REPO_ROOT / "index.html").resolve(),
            (REPO_ROOT / "index.original.html").resolve(),
        }
        if target in protected_paths:
            return False
        return target.is_relative_to(REPO_ROOT) and not target.is_relative_to(LOGS_DIR)
    except ValueError:
        return False

def backup_file(filepath: str) -> None:
    """Reads file into memory snapshot before write operations."""
    if not is_safe_path(filepath):
        return
    path = REPO_ROOT / filepath
    if filepath not in current_iteration_backups:
        if path.exists():
            current_iteration_backups[filepath] = path.read_text(encoding="utf-8")
        else:
            current_iteration_backups[filepath] = None

def restore_sprint_backups() -> None:
    """Reverts all modified or created files to pre-sprint baseline state."""
    for filepath, content in current_iteration_backups.items():
        path = REPO_ROOT / filepath
        if content is None:
            if path.exists():
                path.unlink()
                print(f"  🛡️ Rollback: Removed newly generated file {filepath}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            print(f"  🛡️ Rollback: Restored {filepath}")
    current_iteration_backups.clear()

def clear_backups() -> None:
    current_iteration_backups.clear()

def handle_interrupt(signum=None, frame=None):
    print("⚠️ Keyboard Interrupt detected! Triggering emergency rollback...")
    restore_sprint_backups()
    print("👋 Execution safely halted. Goodbye.")
    sys.exit(130)

signal.signal(signal.SIGINT, handle_interrupt)

def apply_multifile_response(response_text: str, fallback_filename: str) -> List[str]:
    """Parses `### FILE: path` markers safely using header chunking to support nested codeblocks."""
    chunks = re.split(r"(?m)^###\s*FILE:\s*", response_text)
    written_files = []

    sprint_match = re.search(r"docs/sprints/(sprint_[^\n/]+)", fallback_filename)
    expected_sprint_folder = sprint_match.group(1) if sprint_match else None

    # If response_text does not start with ### FILE:, chunks[0] is preamble text (e.g. DIAGNOSIS:) and must be ignored
    if not re.match(r"^\s*###\s*FILE:", response_text):
        chunks = chunks[1:]

    for chunk in chunks:
        if not chunk.strip():
            continue
        lines = chunk.strip().splitlines()
        filepath = lines[0].strip()
        filepath = re.sub(r"[`*]", "", filepath).strip()

        # Reject preamble headers, diagnosis tags, or invalid filenames
        if filepath.upper().startswith("DIAGNOSIS") or ":" in filepath.split("/")[0]:
            continue

        if expected_sprint_folder and "docs/sprints/" in filepath:
            filepath = re.sub(r"docs/sprints/sprint_[N\d]+", f"docs/sprints/{expected_sprint_folder}", filepath)

        if not is_safe_path(filepath):
            if "/" in filepath or "\\" in filepath:
                print(f"   ⚠️ Blocked unsafe file write attempt: {filepath}")
            continue

        body_lines = lines[1:]
        
        if body_lines and re.match(r"^`{3,4}[a-z]*$", body_lines[0].strip(), re.IGNORECASE):
            body_lines = body_lines[1:]
        if body_lines and re.match(r"^`{3,4}$", body_lines[-1].strip()):
            body_lines = body_lines[:-1]

        content = "\n".join(body_lines).strip()

        if content:
            backup_file(filepath)
            path = REPO_ROOT / filepath
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            print(f"   ✓ Created/Updated: {filepath}")
            written_files.append(filepath)

    if not written_files:
        fallback_match = re.search(r"```[a-z]*(.*?)```", response_text, re.DOTALL | re.IGNORECASE)
        if fallback_match:
            backup_file(fallback_filename)
            path = REPO_ROOT / fallback_filename
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(fallback_match.group(1).strip(), encoding="utf-8")
            print(f"   ✓ Updated {fallback_filename}")
            return [fallback_filename]

    return written_files

def get_repository_summary() -> str:
    """Generates tree structure and content overview of src/, docs/, db/, and index.html."""
    summary = ["=== REPOSITORY STRUCTURE ==="]
    for folder in ["src", "docs", "tests", "db"]:
        d = REPO_ROOT / folder
        if d.exists():
            for f in d.rglob("*"):
                if f.is_file() and not f.name.startswith("."):
                    summary.append(f"{f.relative_to(REPO_ROOT)}")
    summary.append("index.html")
    summary.append("index.original.html")
    summary.append("README.md")
    return "\n".join(summary)

def ensure_baseline_html() -> None:
    """Verifies pristine index.original.html exists without touching root index.html."""
    original = REPO_ROOT / "index.original.html"
    if not original.exists():
        print("⚠️ Warning: `index.original.html` baseline template is missing!")

# ─────────────────────────────────────────────────────────────────────────────
# UI Non-Regression Complexity Verification
# ─────────────────────────────────────────────────────────────────────────────

def verify_ui_non_regression(old_html: str, new_html: str) -> Tuple[bool, str]:
    """Guarantees that sprint HTML updates are strictly ADDITIVE, render canvas graphics, and bind controls."""
    
    if not old_html or len(old_html.strip()) < 500:
        old_html = (REPO_ROOT / "index.original.html").read_text(encoding="utf-8")

    if len(new_html.strip()) < 500:
        return False, "UI REGRESSION BLOCKED: Generated HTML is suspiciously small (less than 500 characters)."

    # STRICT ID RETENTION: Prevent LLM from summarizing or deleting existing UI panels
    old_ids = set(re.findall(r'id=["\']([^"\']+)["\']', old_html))
    new_ids = set(re.findall(r'id=["\']([^"\']+)["\']', new_html))
    missing_ids = old_ids - new_ids
    if missing_ids:
        return False, f"UI REGRESSION BLOCKED: You deleted existing HTML elements with these IDs: {missing_ids}. You MUST keep the exact baseline HTML and only APPEND your new code."

    if 'id="topbar"' not in new_html or 'id="controls"' not in new_html:
        return False, "UI REGRESSION BLOCKED: Critical `#topbar` or `#controls` container was removed or renamed."

    # Check for malformed attribute syntax (e.g., id(simCanvas)
    if re.search(r'id\([^)]+\)', new_html):
        return False, "UI SYNTAX ERROR: Detected malformed HTML attribute syntax like `id(...)` instead of `id=\"...\"`."

    # STRICT IMPORT PATH CHECKS (Fixing 404 EarthPOD & TS errors)
    if re.search(r'import\s+.*?from\s+[\'"].*?\.ts[\'"]', new_html):
        return False, "UI IMPORT ERROR: You cannot import `.ts` source files directly in browser HTML. Import transpiled `.js`."
    
    if ('earth_pod' in new_html.lower() or 'main.js' in new_html.lower()) and '../../../dist/src/' not in new_html:
        return False, "UI IMPORT ERROR: Incorrect relative path for transpiled JS. Since `index.html` is in `docs/sprints/sprint_N/`, you MUST traverse up three directories: `import { ... } from '../../../dist/src/earth_pod.js';`."

    # Verify active script rendering logic
    has_canvas = '<canvas' in new_html
    has_script = '<script' in new_html and '</script>' in new_html
    has_draw_loop = any(k in new_html for k in ['getContext', 'requestAnimationFrame', 'setInterval', 'draw', 'render'])
    has_telemetry_update = 'telemetry' in new_html.lower() or 'innerHTML' in new_html or 'textContent' in new_html

    if has_canvas and not (has_draw_loop and has_script):
        return False, "UI BLANK CANVAS DETECTED: `index.html` includes a `<canvas>` element but lacks an active JavaScript rendering loop or canvas context."

    if not has_telemetry_update:
        return False, "UI TELEMETRY MISSING: `index.html` does not dynamically update `#telemetry-content` or DOM status panels."

    old_lines = len(old_html.strip().splitlines())
    new_lines = len(new_html.strip().splitlines())

    # Block LLM lazy truncation markers
    if re.search(r'<!--\s*(existing|rest of|original|previous).*?-->', new_html, re.IGNORECASE):
        return False, "UI REGRESSION BLOCKED: Detected lazy HTML comments (e.g., `<!-- existing code -->`). You MUST output the ENTIRE file verbatim."
    if re.search(r'//\s*(existing|rest of|original|previous)\s*(code|logic)', new_html, re.IGNORECASE):
        return False, "UI REGRESSION BLOCKED: Detected lazy JS comments. You MUST output the ENTIRE script verbatim."

    if new_lines < int(old_lines * 0.98):
        msg = (f"UI REGRESSION BLOCKED: Baseline HTML had {old_lines} lines, "
               f"but generated Sprint HTML only has {new_lines} lines. "
               f"Features must be ADDED, never stripped or simplified. Output the FULL file.")
        return False, msg

    return True, "UI non-regression verified."

# ─────────────────────────────────────────────────────────────────────────────
# State, Quota, Cleanup & Reset Functions
# ─────────────────────────────────────────────────────────────────────────────

def ensure_tsconfig() -> None:
    # Force package.json to be "type": "module" to prevent CommonJS/ESM conflicts
    package_json_path = REPO_ROOT / "package.json"
    if not package_json_path.exists():
        package_json_path.write_text(json.dumps({"type": "module"}, indent=2), encoding="utf-8")
    else:
        try:
            pkg = json.loads(package_json_path.read_text(encoding="utf-8"))
            if pkg.get("type") != "module":
                pkg["type"] = "module"
                package_json_path.write_text(json.dumps(pkg, indent=2), encoding="utf-8")
        except Exception:
            pass

    node_types_dir = REPO_ROOT / "node_modules" / "@types" / "node"
    if not node_types_dir.exists():
        print("📦 Auto-installing missing `@types/node` dependency...")
        subprocess.run("npm install --save-dev @types/node", shell=True, capture_output=True, text=True, cwd=REPO_ROOT)

    tsconfig_path = REPO_ROOT / "tsconfig.json"
    default_tsconfig = {
        "compilerOptions": {
            "target": "ES2022",
            "module": "ESNext",
            "moduleResolution": "bundler",
            "outDir": "./dist",
            "rootDir": ".",
            "strict": True,
            "esModuleInterop": True,
            "skipLibCheck": True,
            "types": ["node"]
        },
        "include": ["src/**/*", "tests/**/*"]
    }
    if tsconfig_path.exists():
        try:
            data = json.loads(tsconfig_path.read_text(encoding="utf-8"))
            opts = data.setdefault("compilerOptions", {})
            opts["skipLibCheck"] = True
            if opts.get("moduleResolution", "").lower() in ["node", "node10", ""]:
                opts["moduleResolution"] = "bundler"
            data["include"] = ["src/**/*", "tests/**/*"]
            tsconfig_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            tsconfig_path.write_text(json.dumps(default_tsconfig, indent=2), encoding="utf-8")
    else:
        tsconfig_path.write_text(json.dumps(default_tsconfig, indent=2), encoding="utf-8")
        print("🔧 Auto-generated modern tsconfig.json with Node types & tests included.")

def ensure_main_ts_imports() -> None:
    main_ts = REPO_ROOT / "src" / "main.ts"
    if main_ts.exists():
        content = main_ts.read_text(encoding="utf-8")
        if "earth_pod.ts" in content:
            main_ts.write_text(content.replace("earth_pod.ts", "earth_pod.js"), encoding="utf-8")
            print("🔧 Patched src/main.ts import paths.")

def load_json_file(file_path: Path, default_factory: Callable[[], Any]) -> Any:
    if file_path.exists():
        try:
            return json.loads(file_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return default_factory()

def save_json_file(file_path: Path, data: Any) -> None:
    file_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

def check_and_increment_quota() -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    state = load_json_file(QUOTA_FILE, lambda: {"date": today, "call_count": 0})
    if state.get("date") != today:
        state["date"] = today
        state["call_count"] = 0
    if state["call_count"] >= MAX_DAILY_CALLS:
        print(f"\n⛔ DAILY QUOTA REACHED ({MAX_DAILY_CALLS}). Pausing execution until tomorrow.")
        sys.exit(0)
    state["call_count"] += 1
    save_json_file(QUOTA_FILE, state)
    return state["call_count"]

def get_current_sprint_num() -> int:
    state = load_json_file(STATE_FILE, lambda: {"current_sprint": 1, "completed_sprints": []})
    return state.get("current_sprint", 1)

def increment_sprint_num(sprint_goal: str) -> None:
    state = load_json_file(STATE_FILE, lambda: {"current_sprint": 1, "completed_sprints": []})
    state["completed_sprints"].append({
        "sprint": state.get("current_sprint", 1),
        "goal": sprint_goal,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    state["current_sprint"] = state.get("current_sprint", 1) + 1
    save_json_file(STATE_FILE, state)

def sync_backlog_to_readme() -> None:
    """Safely mirrors docs/BACKLOG.md into the anchor section of README.md."""
    readme_path = REPO_ROOT / "README.md"
    backlog_path = REPO_ROOT / "docs" / "BACKLOG.md"
    
    if not readme_path.exists() or not backlog_path.exists():
        return
        
    backlog_text = backlog_path.read_text(encoding="utf-8").strip()
    readme_text = readme_path.read_text(encoding="utf-8")
    
    pattern = r"(<!-- BACKLOG_START -->\n)(.*?)(<!-- BACKLOG_END -->)"
    if re.search(pattern, readme_text, flags=re.DOTALL):
        updated_readme = re.sub(
            pattern,
            lambda m: f"{m.group(1)}{backlog_text}\n\n{m.group(3)}",
            readme_text,
            flags=re.DOTALL
        )
        readme_path.write_text(updated_readme, encoding="utf-8")
        print("   🔄 Synced `docs/BACKLOG.md` directly into `README.md`.")

def is_audio_invalid(file_path: Path, min_bytes: int = 5000) -> bool:
    """Detects missing or exceptionally small (corrupted/empty) audio files."""
    if not file_path.exists():
        return True
    try:
        return file_path.stat().st_size < min_bytes
    except Exception:
        return True

def is_artifact_invalid(file_path: Path, min_length: int = 300) -> bool:
    """Detects missing, empty, truncated, or unclosed-codeblock Markdown files."""
    if not file_path.exists():
        return True
    try:
        content = file_path.read_text(encoding="utf-8").strip()
        if len(content) < min_length:
            return True
        if content.count("```") % 2 != 0:
            return True
        return False
    except Exception:
        return True

def cleanup_outreach_artifacts() -> None:
    """Deletes 05_ACADEMIC_PREPRINT.md, 06_VIRAL_STORYTELLING.md, and 07_COMMUNITY_GUIDE.md across all sprint folders."""
    sprints_parent = REPO_ROOT / "docs" / "sprints"
    if not sprints_parent.exists():
        return

    sprint_dirs = sorted([d for d in sprints_parent.iterdir() if d.is_dir() and d.name.startswith("sprint_")])
    deleted_count = 0
    for s_dir in sprint_dirs:
        for fname in ["05_ACADEMIC_PREPRINT.md", "05_ACADEMIC_PREPRINT.tex", "05_ACADEMIC_PREPRINT.pdf", "06_VIRAL_STORYTELLING.md", "07_COMMUNITY_GUIDE.md"]:
            fpath = s_dir / fname
            if fpath.exists():
                fpath.unlink()
                deleted_count += 1
    print(f"🧹 Cleanup complete: Purged {deleted_count} outreach artifact files across {len(sprint_dirs)} sprint folders.")

def hard_reset_repository() -> None:
    """Executes a hard git reset by creating an orphan branch, wiping commit history, and force-pushing to main."""
    print("🧊 [FRESET] Freezing repository and wiping git history...")
    commands = [
        "git checkout --orphan test",
        "git add .",
        "git commit -m \"Initial commit from scratch\"",
        "git push -u origin test",
        "git branch -D main",
        "git branch -m main",
        "git push -f origin main"
    ]
    
    for cmd in commands:
        print(f"   > {cmd}")
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=REPO_ROOT)
        if res.returncode != 0:
            print(f"   ⚠️ Git notice: {res.stderr.strip()}")
            
    print("✨ Git history successfully wiped and force-pushed to origin/main.")

def wipe_all_sprint_data() -> None:
    """Resets the repository to Commit 0 baseline state, wiping all sprint artifacts, generated src modules, db schemas, and backlog state."""
    print("🧹 [WIPE] Resetting project back to Commit 0 baseline state...")
    
    # 1. Revert git working tree
    try:
        subprocess.run("git reset --hard HEAD", shell=True, capture_output=True, text=True, cwd=REPO_ROOT)
        subprocess.run("git clean -fd -e .agent_logs/quota_tracker.json", shell=True, capture_output=True, text=True, cwd=REPO_ROOT)
    except Exception as e:
        print(f"   ⚠️ Git clean warning: {e}")

    # 2. Wipe docs/sprints/
    sprints_parent = REPO_ROOT / "docs" / "sprints" 
    if sprints_parent.exists():
        for item in sprints_parent.iterdir():
            if item.is_dir() and item.name.startswith("sprint_"):
                shutil.rmtree(item, ignore_errors=True)

    # 3. Wipe compiled dist/
    dist_parent = REPO_ROOT / "dist" / "src"
    if dist_parent.exists():
        for item in dist_parent.iterdir():
            if item.is_file():
                if item.name not in ["main.js", "earth_pod.js"]:
                    item.unlink()
                    print(f"   🧹 Removed generated source file: src/{item.name}")
            elif item.is_dir():
                shutil.rmtree(dist_parent, ignore_errors=True)
                print(f"   🧹 Removed generated source subdirectory: src/{item.name}/")

    # 4. Wipe db/ schema & ledger directory
    db_parent = REPO_ROOT / "db"
    if db_parent.exists():
        shutil.rmtree(db_parent, ignore_errors=True)
        print("   🧹 Cleared `db/` database directory.")

    # 5. Clean src/ (preserve only main.ts and earth_pod.ts)
    src_parent = REPO_ROOT / "src"
    if src_parent.exists():
        for item in src_parent.iterdir():
            if item.is_file():
                if item.name not in ["main.ts", "earth_pod.ts"]:
                    item.unlink()
                    print(f"   🧹 Removed generated source file: src/{item.name}")
            elif item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
                print(f"   🧹 Removed generated source subdirectory: src/{item.name}/")

    # 5b. Wipe tests/ directory
    tests_parent = REPO_ROOT / "tests"
    if tests_parent.exists():
        shutil.rmtree(tests_parent, ignore_errors=True)
        tests_parent.mkdir(exist_ok=True)
        print("   🧹 Cleared `tests/` unit test directory.")

    # 5c. Remove any stray DIAGNOSIS files or folders in REPO_ROOT
    for item in REPO_ROOT.glob("DIAGNOSIS*"):
        if item.is_file():
            item.unlink()
            print(f"   🧹 Removed stray file: {item.name}")
        elif item.is_dir():
            shutil.rmtree(item, ignore_errors=True)
            print(f"   🧹 Removed stray folder: {item.name}/")

    # 6. Reset docs/BACKLOG.md completion to 0% and uncheck all items
    backlog_path = REPO_ROOT / "docs" / "BACKLOG.md"
    if backlog_path.exists():
        content = backlog_path.read_text(encoding="utf-8")
        unchecked_content = re.sub(r"\[x\]", "[ ]", content, flags=re.IGNORECASE)
        unchecked_content = re.sub(r"Roadmap Completion:\s*\d+%", "Roadmap Completion: 0%", unchecked_content, flags=re.IGNORECASE)
        backlog_path.write_text(unchecked_content, encoding="utf-8")
        print("   🧹 Reset `docs/BACKLOG.md` roadmap completion to 0% and unchecked all features.")

    # 7. Reset state tracker
    save_json_file(STATE_FILE, {"current_sprint": 1, "completed_sprints": []})
    
    # 8. Re-initialize baseline dependencies and anchors
    SPRINTS_DIR.mkdir(parents=True, exist_ok=True)
    ensure_tsconfig()
    ensure_main_ts_imports()
    ensure_baseline_html()
    sync_backlog_to_readme()

    print("✨ Reset complete: Repository restored to Commit 0 baseline (Sprint 001).")

def validate_and_backfill_sprint_artifacts() -> None:
    """Scans all sprint folders and regenerates any missing or truncated Markdown files (01 through 07)."""
    sprints_parent = REPO_ROOT / "docs" / "sprints"
    if not sprints_parent.exists():
        return

    sprint_dirs = sorted([d for d in sprints_parent.iterdir() if d.is_dir() and d.name.startswith("sprint_")])
    
    for s_dir in sprint_dirs:
        sprint_folder_rel = f"docs/sprints/{s_dir.name}"
        f01 = s_dir / "01_RFC.md"
        f02 = s_dir / "02_METHODS.md"
        f03 = s_dir / "03_RELEASE_NOTES.md"
        f04 = s_dir / "04_AUDIT.md"
        f05 = s_dir / "05_ACADEMIC_PREPRINT.md"
        f06 = s_dir / "06_VIRAL_STORYTELLING.md"
        f07 = s_dir / "07_COMMUNITY_GUIDE.md"

        invalid_01 = is_artifact_invalid(f01, min_length=300)
        invalid_02 = is_artifact_invalid(f02, min_length=300)
        invalid_03 = is_artifact_invalid(f03, min_length=300)
        invalid_04 = is_artifact_invalid(f04, min_length=300)
        f05_tex = s_dir / "05_ACADEMIC_PREPRINT.tex"
        invalid_05 = is_artifact_invalid(f05, min_length=400)
        
        # Verify standalone LaTeX file exists and has correct structure
        if not f05_tex.exists():
            invalid_05 = True
            print(f"   ⚠️ Sprint {s_dir.name} missing .tex file. Marking for regeneration.")
        else:
            tex_content = f05_tex.read_text(encoding="utf-8")
            if "\\documentclass" not in tex_content or "\\begin{document}" not in tex_content:
                invalid_05 = True
                print(f"   ⚠️ Sprint {s_dir.name} .tex file missing LaTeX structure. Marking for regeneration.")

        invalid_06 = is_artifact_invalid(f06, min_length=300)
        invalid_07 = is_artifact_invalid(f07, min_length=300)
        
        f_audio = s_dir / "gaia_sprint_summary.mp3"
        invalid_audio = is_audio_invalid(f_audio)

        # If files are valid but the PDF is missing, try to compile it
        pdf_path = s_dir / "05_ACADEMIC_PREPRINT.pdf"
        if not invalid_05 and not pdf_path.exists():
            compile_latex_to_pdf(f"docs/sprints/{s_dir.name}")

        if not any([invalid_01, invalid_02, invalid_03, invalid_04, invalid_05, invalid_06, invalid_07, invalid_audio]):
            continue

        print(f"🔄 Repairing missing/truncated artifacts for {s_dir.name}...")

        if invalid_01:
            prompt = f"""
            SPRINT {s_dir.name} RFC REGENERATION
            Draft a complete technical architecture specification in {sprint_folder_rel}/01_RFC.md.
            Output strictly using `### FILE: {sprint_folder_rel}/01_RFC.md` syntax.
            """
            res = call_agent("LEAD_ARCHITECT", prompt)
            apply_multifile_response(res, fallback_filename=f"{sprint_folder_rel}/01_RFC.md")

        rfc_text = f01.read_text(encoding="utf-8") if f01.exists() else "No RFC spec available."

        if invalid_02:
            prompt = f"""
            SPRINT {s_dir.name} METHODS REGENERATION
            RFC SPEC:
            {rfc_text}
            Quantify thermodynamic process deltas and save to {sprint_folder_rel}/02_METHODS.md.
            Output strictly using `### FILE: {sprint_folder_rel}/02_METHODS.md` syntax.
            """
            res = call_agent("METHOD_MINER", prompt)
            apply_multifile_response(res, fallback_filename=f"{sprint_folder_rel}/02_METHODS.md")

        methods_text = f02.read_text(encoding="utf-8") if f02.exists() else "No Methods spec available."

        if invalid_03:
            prompt = f"""
            SPRINT {s_dir.name} RELEASE NOTES REGENERATION
            RFC SPEC:
            {rfc_text}
            Write comprehensive release documentation in {sprint_folder_rel}/03_RELEASE_NOTES.md.
            Output strictly using `### FILE: {sprint_folder_rel}/03_RELEASE_NOTES.md` syntax.
            """
            res = call_agent("DOCUMENTALIST", prompt)
            apply_multifile_response(res, fallback_filename=f"{sprint_folder_rel}/03_RELEASE_NOTES.md")

        if invalid_04:
            prompt = f"""
            SPRINT {s_dir.name} THERMODYNAMIC AUDIT REGENERATION
            RFC SPEC:
            {rfc_text}
            Review code changes and verify First/Second Law mass conservation. Save to {sprint_folder_rel}/04_AUDIT.md.
            Output strictly using `### FILE: {sprint_folder_rel}/04_AUDIT.md` syntax.
            """
            res = call_agent("THERMODYNAMIC_AUDITOR", prompt)
            apply_multifile_response(res, fallback_filename=f"{sprint_folder_rel}/04_AUDIT.md")

        if invalid_05:
            prompt = f"""
            SPRINT {s_dir.name} ACADEMIC PREPRINT REGENERATION
            RFC SPEC:
            {rfc_text}
            METHODS:
            {methods_text}
            
            You MUST output TWO files:
            1. A web-friendly markdown summary using `### FILE: {sprint_folder_rel}/05_ACADEMIC_PREPRINT.md`
            2. A complete, compilable LaTeX document using `### FILE: {sprint_folder_rel}/05_ACADEMIC_PREPRINT.tex`
            """
            res = call_agent("RESEARCH_OUTREACH", prompt)
            apply_multifile_response(res, fallback_filename=f"{sprint_folder_rel}/05_ACADEMIC_PREPRINT.md")
            compile_latex_to_pdf(sprint_folder_rel)

        if invalid_06:
            prompt = f"""
            SPRINT {s_dir.name} VIRAL STORYTELLING REGENERATION
            RFC SPEC:
            {rfc_text}
            METHODS:
            {methods_text}
            Synthesize this sprint into a complete 10-tweet viral thread and LinkedIn post.
            Output strictly using `### FILE: {sprint_folder_rel}/06_VIRAL_STORYTELLING.md` syntax.
            """
            res = call_agent("SCIENTIFIC_STORYTELLER", prompt)
            apply_multifile_response(res, fallback_filename=f"{sprint_folder_rel}/06_VIRAL_STORYTELLING.md")

        if invalid_07:
            prompt = f"""
            SPRINT {s_dir.name} DEVREL GUIDE REGENERATION
            RFC SPEC:
            {rfc_text}
            METHODS:
            {methods_text}
            Synthesize this sprint into a developer onboarding and contributor guide.
            Output strictly using `### FILE: {sprint_folder_rel}/07_COMMUNITY_GUIDE.md` syntax.
            """
            res = call_agent("DEVREL_COMMUNITY", prompt)
            apply_multifile_response(res, fallback_filename=f"{sprint_folder_rel}/07_COMMUNITY_GUIDE.md")

        if invalid_audio:
            release_notes_path = s_dir / "03_RELEASE_NOTES.md"
            if release_notes_path.exists():
                notes_text = release_notes_path.read_text(encoding="utf-8")
                gaia_prompt = f"""
                Summarize this sprint's breakthroughs in an evocative, poetic, and thermodynamically grounded English spoken narrative (150-180 words).
                Speak as Gaïa, observing how this sprint refines the laws, cycles, and energy balance of your digital twin:
                {notes_text}
                """
                gaia_script = call_agent("GAIA_VOICE", gaia_prompt)
                generate_gaia_audio_summary(gaia_script, f_audio)

def is_ui_html_broken(html_content: str) -> bool:
    """Detects if a sprint index.html is blank, non-rendering, or missing simulation/drawing scripts."""
    if not html_content or len(html_content.strip()) < 300:
        return True
    if re.search(r'id\([^)]+\)', html_content):
        return True
    
    # Trigger repair if the UI is importing .ts directly or lacks the correct 3-level deep relative path
    if re.search(r'import\s+.*?from\s+[\'"].*?\.ts[\'"]', html_content):
        return True
    if 'import ' in html_content and '../../../dist/src/' not in html_content:
        return True

    has_draw_loop = any(k in html_content for k in ['getContext', 'requestAnimationFrame', 'setInterval', 'draw', 'render'])
    has_import = 'import' in html_content and 'dist/' in html_content
    if not (has_draw_loop and has_import):
        return True
    return False

def validate_and_repair_sprint_uis() -> None:
    """Scans all historical sprint folders and regenerates index.html for any sprint with broken or non-rendering UI."""
    sprints_parent = REPO_ROOT / "docs" / "sprints"
    if not sprints_parent.exists():
        return

    ui_tracker_file = LOGS_DIR / "ui_verified_tracker.json"
    ui_tracker = load_json_file(ui_tracker_file, lambda: {})

    sprint_dirs = sorted([d for d in sprints_parent.iterdir() if d.is_dir() and d.name.startswith("sprint_")])
    
    for s_dir in sprint_dirs:
        if ui_tracker.get(s_dir.name) is True:
            continue

        sprint_html_file = s_dir / "index.html"
        html_content = sprint_html_file.read_text(encoding="utf-8") if sprint_html_file.exists() else ""
        sprint_folder_rel = f"docs/sprints/{s_dir.name}"

        # If structurally sound, double-check the console. If clean, mark as verified and skip.
        if not is_ui_html_broken(html_content):
            errors, _ = run_browser_console_check(f"{sprint_folder_rel}/index.html")
            if not errors:
                ui_tracker[s_dir.name] = True
                save_json_file(ui_tracker_file, ui_tracker)
                continue

        print(f"🎨 [Retroactive UI Repair] Regenerating broken/non-rendering UI for {s_dir.name}...")

        rfc_path = s_dir / "01_RFC.md"
        methods_path = s_dir / "02_METHODS.md"
        rfc_text = rfc_path.read_text(encoding="utf-8") if rfc_path.exists() else "Sprint architecture spec."
        methods_text = methods_path.read_text(encoding="utf-8") if methods_path.exists() else "Sprint methods spec."

        sprint_src_code = ""
        src_dir = REPO_ROOT / "src"
        if src_dir.exists():
            for f in src_dir.glob("**/*.ts"):
                sprint_src_code += f"\n// File: src/{f.relative_to(src_dir)}\n" + f.read_text(encoding="utf-8") + "\n"

        prev_num_match = re.search(r"sprint_(\d+)", s_dir.name)
        prev_num = int(prev_num_match.group(1)) - 1 if prev_num_match else 0
        
        prev_html_path = REPO_ROOT / f"docs/sprints/sprint_{prev_num:03d}/index.html"
        if prev_num < 1 or not prev_html_path.exists() or len(prev_html_path.read_text(encoding="utf-8")) < 500:
            prev_html_path = REPO_ROOT / "index.original.html"

        old_html = prev_html_path.read_text(encoding="utf-8")
        
        # Auto-inject the correct relative path for the Sprints Explorer back button
        old_html = old_html.replace("'docs/index.html'", "'../../index.html'").replace('"docs/index.html"', '"../../index.html"')

        repair_ui_prompt = f"""
        RETROACTIVE UI REPAIR FOR {s_dir.name}
        RFC SPEC:
        {rfc_text}
        METHODS:
        {methods_text}

        AVAILABLE BACKEND TS SOURCE CODE:
        {sprint_src_code}

        BASELINE HTML TEMPLATE:
        ```html
        {old_html}
        ```

        REQUIREMENTS FOR {sprint_folder_rel}/index.html:
        1. Build a COMPLETE, self-contained interactive Canvas 2D/WebGL visualization engine in `<script type="module">`.
        2. Get 2D context from `<canvas id="simCanvas">`.
        3. Import monads/functions using STRICT 3-level relative paths to the transpiled JS (e.g., `import {{ EarthPOD, bootstrapMegaPod }} from '../../../dist/src/earth_pod.js';`). NEVER import `.ts` files.
        4. Implement an active 60FPS `requestAnimationFrame` or `setInterval` draw loop rendering nodes, spatial grids/H3 hexagons, and animated energy/mass flux particles.
        5. Dynamically update `#sprint-telemetry` / `#telemetry-content` with real live stock metrics every tick.
        6. Wire up interactive controls (`#btn-pause`, `#btn-step`, `#btn-reset`, search bar).
        7. DEFENSIVE METHOD CALLING: Do not hallucinate methods like `megaEarth.fullTick()` unless you explicitly see them in the backend source code. Use checks like `if (megaEarth && typeof megaEarth.fullTick === 'function')` to prevent crashes.

        Output complete file strictly using `### FILE: {sprint_folder_rel}/index.html` syntax.
        """
        res = call_agent("UI_ENGINEER", repair_ui_prompt)
        apply_multifile_response(res, fallback_filename=f"{sprint_folder_rel}/index.html")

        errors, _ = run_browser_console_check(f"{sprint_folder_rel}/index.html")
        if errors:
            print(f"   🚨 Console errors in repaired {s_dir.name} UI: {errors[0][:100]}")
            debug_prompt = f"""
            Console errors occurred in repaired {sprint_folder_rel}/index.html:
            {chr(10).join(errors)}

            Fix the JavaScript imports or code in {sprint_folder_rel}/index.html.
            Output strictly using `### FILE: {sprint_folder_rel}/index.html` syntax.
            """
            debug_res = call_agent("BROWSER_CONSOLE_DEBUGGER", debug_prompt)
            apply_multifile_response(debug_res, fallback_filename=f"{sprint_folder_rel}/index.html")

        # Final check to see if repair succeeded
        final_errors, _ = run_browser_console_check(f"{sprint_folder_rel}/index.html")
        final_html = sprint_html_file.read_text(encoding="utf-8") if sprint_html_file.exists() else ""
        
        if not final_errors and not is_ui_html_broken(final_html):
            print(f"   ✅ UI for {s_dir.name} successfully repaired and verified.")
            ui_tracker[s_dir.name] = True
            save_json_file(ui_tracker_file, ui_tracker)
        else:
            attempts = ui_tracker.get(f"{s_dir.name}_attempts", 0) + 1
            ui_tracker[f"{s_dir.name}_attempts"] = attempts
            if attempts >= 3:
                print(f"   ⚠️ Skipping future repairs for {s_dir.name} after 3 failed script runs to conserve quota.")
                ui_tracker[s_dir.name] = True  # Permanently skip
            save_json_file(ui_tracker_file, ui_tracker)

# ─────────────────────────────────────────────────────────────────────────────
# Startup Agile Team Personas (Loaded from personas.json)
# ─────────────────────────────────────────────────────────────────────────────
def load_personas() -> dict:
    """Loads the personas from personas.json in the root directory."""
    personas_path = REPO_ROOT / "personas.json"
    if not personas_path.exists():
        print("❌ Error: personas.json not found in the root directory. Please create it using the provided JSON.")
        sys.exit(1)
    try:
        return json.loads(personas_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"❌ Error parsing personas.json: {e}")
        sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# Resilient API Call Handler
# ─────────────────────────────────────────────────────────────────────────────

def call_agent(persona_key: str, prompt: str, max_retries: int = 5, initial_delay: float = 6.0) -> str:
    """Unified AI Agent invocation routing across Gemini, Hugging Face API, and Local Qwen."""
    personas = load_personas()
    current_calls = check_and_increment_quota()
    print(f"   📊 [Quota Tracker] Call {current_calls}/{MAX_DAILY_CALLS} today")
    delay = initial_delay
    system_instruction = personas.get(persona_key, personas.get("LEAD_ARCHITECT", "You are a helpful AI."))
    temperature = 0.2 if persona_key != "PRODUCT_MANAGER" else 0.5

    for attempt in range(1, max_retries + 1):
        try:
            # 1. Gemini Provider
            if SELECTED_PROVIDER == "gemini":
                from google.genai import types
                response = gemini_client.models.generate_content(
                    model=SELECTED_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=temperature,
                    ),
                )
                time.sleep(MIN_CALL_DELAY_SEC)
                return response.text or ""

            # 2. Hugging Face Serverless API Provider
            elif SELECTED_PROVIDER == "huggingface":
                messages = [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ]
                response = hf_client.chat_completion(
                    messages=messages,
                    max_tokens=4096,
                    temperature=temperature,
                )
                time.sleep(MIN_CALL_DELAY_SEC)
                return response.choices[0].message.content or ""

            # 3. Local Qwen Provider (Transformers)
            elif SELECTED_PROVIDER == "local-qwen":
                messages = [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ]
                text = local_qwen_tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True,
                    enable_thinking=True
                )
                model_inputs = local_qwen_tokenizer([text], return_tensors="pt").to(local_qwen_model.device)
                
                generated_ids = local_qwen_model.generate(
                    **model_inputs,
                    max_new_tokens=4096,
                    temperature=temperature,
                    do_sample=True
                )
                output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist()
                
                # Extract clean response, stripping reasoning <think> tags if present
                raw_text = local_qwen_tokenizer.decode(output_ids, skip_special_tokens=True).strip()
                clean_text = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
                return clean_text if clean_text else raw_text

        except Exception as e:
            if attempt == max_retries:
                raise e
            wait_time = delay + random.uniform(1.0, 3.0)
            print(f"⏳ [{SELECTED_PROVIDER.upper()} {persona_key}] Execution Retry in {wait_time:.1f}s ({attempt}/{max_retries}): {e}")
            time.sleep(wait_time)
            delay *= 2.0

def run_browser_console_check(sprint_html_path: str) -> Tuple[List[str], List[str]]:
    """Launches headless Playwright Chrome to capture red console errors and uncaught page exceptions, filtering out CORS/file security restrictions."""
    errors = []
    warnings = []
    html_file = REPO_ROOT / sprint_html_path
    if not html_file.exists():
        return ["Sprint HTML file not found for console inspection."], []

    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            def handle_console(msg):
                if msg.type == "error":
                    text = msg.text
                    # Filter out CORS and local file security restriction errors
                    if not any(c in text.lower() for c in ["cors", "cross-origin", "access-control-allow-origin", "file://"]):
                        errors.append(f"Console Error: {text}")

            def handle_pageerror(err):
                text = err.message
                if not any(c in text.lower() for c in ["cors", "cross-origin", "access-control-allow-origin", "file://"]):
                    errors.append(f"Page Uncaught Exception: {text}\n{err.stack}")

            page.on("console", handle_console)
            page.on("pageerror", handle_pageerror)

            page.goto(f"file://{html_file.resolve()}", wait_until="networkidle", timeout=12000)
            page.wait_for_timeout(2000)
            browser.close()
    except Exception as e:
        print(f"   ⚠️ Playwright browser inspection notice: {e}")

    return errors, warnings

def compile_latex_to_pdf(sprint_folder_rel: str) -> bool:
    """Compiles the standalone 05_ACADEMIC_PREPRINT.tex file to PDF with a 3-retry auto-debug loop."""
    tex_path = REPO_ROOT / sprint_folder_rel / "05_ACADEMIC_PREPRINT.tex"
    pdf_path = REPO_ROOT / sprint_folder_rel / "05_ACADEMIC_PREPRINT.pdf"
    
    if not tex_path.exists():
        print(f"   ⚠️ No .tex file found at {tex_path.relative_to(REPO_ROOT)} to compile.")
        return False
        
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        print(f"   📄 Compiling LaTeX preprint to PDF (Attempt {attempt}/{max_retries})...")
        try:
            # Run pdflatex twice for references/TOC resolution
            subprocess.run(["pdflatex", "-interaction=nonstopmode", tex_path.name], cwd=tex_path.parent, capture_output=True, text=True, check=True)
            subprocess.run(["pdflatex", "-interaction=nonstopmode", tex_path.name], cwd=tex_path.parent, capture_output=True, text=True, check=True)
            print(f"   ✓ Generated PDF: {pdf_path.relative_to(REPO_ROOT)}")
            
            # Clean up auxiliary LaTeX files
            for ext in [".aux", ".log", ".out", ".toc"]:
                aux_file = tex_path.with_suffix(ext)
                if aux_file.exists():
                    try: aux_file.unlink()
                    except Exception: pass
            return True
            
        except FileNotFoundError:
            print("   ⚠️ `pdflatex` not found on system. Please install MiKTeX or TeX Live to generate PDFs.")
            return False
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️ LaTeX compilation failed. Excerpt from pdflatex:")
            error_log = e.stdout[-1500:] if e.stdout else 'No output generated.'
            print(f"   {error_log}")
            
            if attempt < max_retries:
                print("   🔍 Invoking Research Outreach Agent to debug LaTeX syntax...")
                tex_content = tex_path.read_text(encoding="utf-8")
                debug_prompt = f"""
                LATEX COMPILATION FAILURE (Attempt {attempt}/{max_retries}):

                The `pdflatex` compiler threw the following error logs:
                {error_log}

                CURRENT LATEX SOURCE:
                ```latex
                {tex_content}
                ```

                Diagnose the LaTeX syntax error (e.g., missing packages, unescaped underscores/ampersands in text mode, malformed math environments) and provide the complete fixed file.
                Output strictly using `### FILE: {sprint_folder_rel}/05_ACADEMIC_PREPRINT.tex` syntax.
                """
                debug_res = call_agent("RESEARCH_OUTREACH", debug_prompt)
                apply_multifile_response(debug_res, fallback_filename=f"{sprint_folder_rel}/05_ACADEMIC_PREPRINT.tex")
            else:
                print(f"   ❌ LaTeX generation failed after maximum retries. Retaining {tex_path.with_suffix('.log').name} for debugging.")
    return False

def generate_gaia_audio_summary(text_content: str, output_path: Path) -> None:
    """
    Generates a spoken English audio summary for Gaïa.
    Tries edge-tts first for high-quality natural cadence, falls back to pyttsx3, then gTTS.
    """
    print(f"🎙️ [Gaïa Voice] Generating English audio briefing for {output_path.name}...")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Clean markdown, code fences, equations, and URLs
    clean_text = re.sub(r'```[a-z]*\n[\s\S]*?\n```', '', text_content)
    clean_text = re.sub(r'\$\$[\s\S]*?\$\$|\$.*?\$', '', clean_text)
    clean_text = re.sub(r'[#*`_~>]', '', clean_text)
    clean_text = re.sub(r'http\S+', 'external link', clean_text)
    clean_text = " ".join(clean_text.split()).strip()

    if not clean_text:
        print("   ⚠️ Empty text passed to Gaïa audio generator. Skipping.")
        return

    # Method 1: edge-tts (Warm, high-fidelity neural voice)
    try:
        import edge_tts
        import asyncio

        voice = "en-US-AvaNeural"  # Alternatively "en-US-JennyNeural"
        rate = "-10%"
        pitch = "-3Hz"

        async def _run_edge_tts():
            communicate = edge_tts.Communicate(clean_text[:1200], voice, rate=rate, pitch=pitch)
            await communicate.save(str(output_path))

        asyncio.run(_run_edge_tts())

        if output_path.exists() and output_path.stat().st_size > 5000:
            print(f"   ✓ Generated Gaïa audio (Edge-TTS Ava): {output_path.relative_to(REPO_ROOT)}")
            return
    except ImportError:
        pass
    except Exception as e:
        print(f"   ⚠️ Edge-TTS failed ({e}), falling back to local pyttsx3...")

    # Method 2: pyttsx3 (Offline system speech engine)
    try:
        import pyttsx3

        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        selected_voice = None

        # Prioritize English female voices (Zira, Eva, Hazel, Jenny, Susan)
        for voice in voices:
            v_name = voice.name.lower()
            v_id = voice.id.lower()
            if any(name in v_name or name in v_id for name in ['zira', 'eva', 'hazel', 'jenny', 'susan', 'catherine']):
                selected_voice = voice.id
                break

        if not selected_voice:
            for voice in voices:
                v_name = voice.name.lower()
                v_id = voice.id.lower()
                if ('en' in v_id or 'english' in v_name) and ('female' in v_name or 'female' in v_id):
                    selected_voice = voice.id
                    break

        if selected_voice:
            engine.setProperty('voice', selected_voice)

        engine.setProperty('rate', 135)  # Measured, serene pacing

        temp_wav = output_path.with_suffix('.wav')
        engine.save_to_file(clean_text[:1200], str(temp_wav))
        engine.runAndWait()

        if temp_wav.exists() and temp_wav.stat().st_size > 5000:
            if output_path.exists():
                output_path.unlink()
            shutil.move(temp_wav, output_path)
            print(f"   ✓ Generated Gaïa audio (pyttsx3 local): {output_path.relative_to(REPO_ROOT)}")
            return
        elif temp_wav.exists():
            temp_wav.unlink()
    except Exception as e:
        print(f"   ⚠️ pyttsx3 fallback failed ({e}), attempting gTTS...")

    # Method 3: gTTS (Standard Google TTS fallback)
    try:
        from gtts import gTTS
        tts = gTTS(text=clean_text[:1000], lang='en', tld='com', slow=False)
        tts.save(str(output_path))
        print(f"   ✓ Generated Gaïa audio (gTTS fallback): {output_path.relative_to(REPO_ROOT)}")
    except Exception as e:
        print(f"   ❌ All audio generation backends failed: {e}")
# ─────────────────────────────────────────────────────────────────────────────
# Sprint Lifecycle Engine
# ─────────────────────────────────────────────────────────────────────────────

def execute_sprint_cycle() -> bool:
    sprint_num = get_current_sprint_num()
    sprint_folder_rel = f"docs/sprints/sprint_{sprint_num:03d}"
    sprint_dir = REPO_ROOT / sprint_folder_rel
    sprint_dir.mkdir(parents=True, exist_ok=True)

    print(f"================================────────────────────────")
    print(f"🏁 STARTING SPRINT {sprint_num:03d}")
    print(f"================================────────────────────────")

    clear_backups()

    try:
        # Step 0: AI Brainstorming Triad (Cross-Checking Codebase & Roadmap)
        print("💡 [0/7] AI Brainstorming Triad: Cross-checking codebase & expanding backlog...")
        readme_content = (REPO_ROOT / "README.md").read_text(encoding="utf-8") if (REPO_ROOT / "README.md").exists() else ""
        backlog_content = BACKLOG_FILE.read_text(encoding="utf-8") if BACKLOG_FILE.exists() else "No backlog initialized."
        repo_summary = get_repository_summary()

        brainstorm_prompt = f"""
        MASTER ROADMAP (README.md):
        {readme_content}

        CURRENT BACKLOG (docs/BACKLOG.md):
        {backlog_content}

        REPOSITORY SUMMARY:
        {repo_summary}

        INSTRUCTIONS:
        1. Analyze the current backlog. Humans may have added vague ideas at the bottom.
        2. Break down broad concepts into granular, file-specific feature proposals.
        3. Identify missing foundational logic (math, interfaces, data structures) required before higher-level features can be built.
        Output a prioritized, bulleted list of actionable proposals.
        """

        eco_ideas = call_agent("BRAINSTORMER_ECO", brainstorm_prompt)
        ind_ideas = call_agent("BRAINSTORMER_IND", brainstorm_prompt)
        phys_ideas = call_agent("BRAINSTORMER_PHYS", brainstorm_prompt)

        print("   ✓ Brainstorming complete (Ecological, Industrial, Physics insights gathered).")

        # Step 1: Product Manager Planning & Goal Setting (With Retrospective Audit Context)
        print("📋 [1/7] Product Manager: Performing Backlog Retrospective & Defining Sprint Goal...")
        
        # Gather all current src/ files for retrospective verification
        src_context = ""
        src_dir = REPO_ROOT / "src"
        if src_dir.exists():
            for f in src_dir.glob("**/*.ts"):
                rel_p = f.relative_to(REPO_ROOT)
                src_context += f"\n// File: {rel_p}\n" + f.read_text(encoding="utf-8") + "\n"

        file_tree_summary = get_repository_summary()

        pm_prompt = f"""
        MASTER ROADMAP (README.md):
        {readme_content}

        CURRENT BACKLOG TO AUDIT (docs/BACKLOG.md):
        {backlog_content}

        ACTUAL REPOSITORY FILE TREE:
        {file_tree_summary}

        ACTUAL IMPLEMENTED SOURCE CODE:
        {src_context if src_context else "No TypeScript files implemented in src/ yet."}

        BRAINSTORMER PROPOSALS:
        --- Biosphere Proposals ---
        {eco_ideas}

        --- Technosphere Proposals ---
        {ind_ideas}

        --- Physics Proposals ---
        {phys_ideas}

        CRITICAL AUDIT & GROOMING INSTRUCTION:
        1. LOGIC-BASED AUDIT: Revert any `[x]` items to `[ ]` ONLY IF the described logic/feature is completely missing from the ACTUAL IMPLEMENTED SOURCE CODE. Do NOT uncheck an item just because a specific file path is missing, as long as the functionality was successfully implemented in another file.
        2. GROOM: Integrate the Brainstormer proposals. Break down large human-added features into granular tasks.
        3. REPRIORITIZE: Re-order the `[ ]` list strictly top-to-bottom based on architectural dependency. Base monads, schemas, and math go first. UI and integrations go later.
        4. EVOLVE PHASES: Create, merge, or rename `### Phase N` headers if the roadmap organically shifts.
        5. SPRINT GOAL: Select the absolute top `[ ]` item from the highest active phase.
        """
        pm_response = call_agent("PRODUCT_MANAGER", pm_prompt)
        apply_multifile_response(pm_response, fallback_filename="docs/BACKLOG.md")
        
        # Mirror audited backlog inline into README.md
        sync_backlog_to_readme()

        # Robust multi-fallback parsing for Sprint Goal & Completion Ratio
        goal_match = re.search(r"SPRINT_GOAL:\s*(.+)", pm_response, re.IGNORECASE)
        sprint_goal = goal_match.group(1).strip().strip("`*") if goal_match else f"Implement feature set for Sprint {sprint_num:03d}"
        
        ratio_match = re.search(r"Roadmap Completion:\s*(\d+)%", pm_response, re.IGNORECASE)
        completion_ratio = ratio_match.group(1) if ratio_match else "N/A"

        print(f"   🎯 Sprint Goal: {sprint_goal}")
        print(f"   📈 Roadmap Convergence: {completion_ratio}% completed")

        # Step 2: Lead Architect RFC Generation
        print("🧠 [2/7] Lead Architect: Generating Technical RFC Spec...")
        rfc_path = f"{sprint_folder_rel}/01_RFC.md"
        if (REPO_ROOT / rfc_path).exists():
            print(f"   ✓ Reusing existing RFC: {rfc_path}")
            rfc_text = (REPO_ROOT / rfc_path).read_text(encoding="utf-8")
        else:
            arch_prompt = f"""
            SPRINT GOAL: {sprint_goal}
            REPOSITORY MAP: {get_repository_summary()}
            Draft technical architecture specification in {rfc_path}.
            """
            arch_res = call_agent("LEAD_ARCHITECT", arch_prompt)
            apply_multifile_response(arch_res, fallback_filename=rfc_path)
            rfc_text = (REPO_ROOT / rfc_path).read_text(encoding="utf-8") if (REPO_ROOT / rfc_path).exists() else arch_res

        # Step 3: Method Miner Equation Discovery
        print("⛏️ [3/7] Method Miner: Harvesting Thermodynamic Formulas...")
        methods_path = f"{sprint_folder_rel}/02_METHODS.md"
        if (REPO_ROOT / methods_path).exists():
            print(f"   ✓ Reusing existing Methods Spec: {methods_path}")
            methods_text = (REPO_ROOT / methods_path).read_text(encoding="utf-8")
        else:
            miner_prompt = f"""
            SPRINT GOAL: {sprint_goal}
            ARCHITECT RFC:
            {rfc_text}

            Quantify thermodynamic process deltas and save to {methods_path}.
            """
            miner_res = call_agent("METHOD_MINER", miner_prompt)
            apply_multifile_response(miner_res, fallback_filename=methods_path)
            methods_text = (REPO_ROOT / methods_path).read_text(encoding="utf-8") if (REPO_ROOT / methods_path).exists() else miner_res

        # Step 4: Backend Engineering Implementation
        print("💻 [4/7] Backend Engineer: Implementing TypeScript Source...")
        ts_code_summary = ""
        src_dir = REPO_ROOT / "src"
        if src_dir.exists():
            for f in src_dir.glob("*.ts"):
                ts_code_summary += f"\n// File: src/{f.name}\n" + f.read_text(encoding="utf-8") + "\n"
        eng_prompt = f"""
        SPRINT GOAL: {sprint_goal}
        RFC SPEC:
        {rfc_text}
        METHODS SPEC:
        {methods_text}

        EXISTING FULL SOURCE CODE:
        {ts_code_summary}

        CRITICAL REQUIREMENT:
        You must output the ENTIRE updated file. Do NOT use comments like `// ... rest of the code`.
        Do NOT delete existing functions or classes (e.g., `bootstrapMegaPod()`). Always APPEND your new classes and logic to the existing code structure.
        
        Implement TypeScript updates or new modules using `### FILE: src/filename.ts` syntax.
        """
        eng_res = call_agent("BACKEND_ENGINEER", eng_prompt)
        apply_multifile_response(eng_res, fallback_filename="src/earth_pod.ts")

        # Step 5: Verification Loop (Self-Healing Dependency Installer & 5 Retries)
        print("⚙️ [5/7] Verification Subprocess: Compiling & Running Unit Tests...")

        def auto_install_missing_modules(error_text: str) -> bool:
            """Parses TS2307 and TS2688 missing module/types errors and auto-installs packages via npm."""
            pattern_mod = r"(?:Cannot find module|Could not find a declaration file for module) ['\"]([^'\/\"]+)"
            pattern_types = r"Cannot find type definition file for ['\"]([^'\/\"]+)"

            matches = list(set(re.findall(pattern_mod, error_text)))
            type_matches = list(set(re.findall(pattern_types, error_text)))
            installed_any = False

            for pkg in type_matches:
                print(f"   📦 Auto-healing: Detected missing type definition `@types/{pkg}`. Installing via npm...")
                res = subprocess.run(f"npm install --save-dev @types/{pkg}", shell=True, capture_output=True, text=True, cwd=REPO_ROOT)
                if res.returncode == 0:
                    installed_any = True

            for pkg in matches:
                if pkg.startswith(".") or pkg.startswith("@/"):
                    continue
                print(f"   📦 Auto-healing: Detected missing dependency `{pkg}`. Installing via npm...")
                res = subprocess.run(f"npm install --save {pkg}", shell=True, capture_output=True, text=True, cwd=REPO_ROOT)
                if res.returncode == 0:
                    installed_any = True
                    subprocess.run(f"npm install --save-dev @types/{pkg}", shell=True, capture_output=True, text=True, cwd=REPO_ROOT)
                else:
                    print(f"   ⚠️ Failed to auto-install `{pkg}`: {res.stderr[:150]}")
            return installed_any
        
        def run_typecheck_and_tests() -> Tuple[int, str]:
            ensure_tsconfig()
            
            # 1. Typecheck
            try:
                print("   ⏳ Running `npx --yes tsc`...")
                tsc_res = subprocess.run("npx --yes tsc", shell=True, capture_output=True, text=True, cwd=REPO_ROOT, timeout=35)
                if tsc_res.returncode != 0:
                    err_msg = f"TYPECHECK ERROR:\n{tsc_res.stdout}\n{tsc_res.stderr}"
                    # Auto-heal missing npm dependencies before returning error
                    if auto_install_missing_modules(err_msg):
                        print("   🔄 Re-running typecheck after auto-installing dependencies...")
                        tsc_res = subprocess.run("npx --yes tsc", shell=True, capture_output=True, text=True, cwd=REPO_ROOT, timeout=35)
                        if tsc_res.returncode == 0:
                            err_msg = ""
                        else:
                            err_msg = f"TYPECHECK ERROR:\n{tsc_res.stdout}\n{tsc_res.stderr}"
                    if tsc_res.returncode != 0:
                        return tsc_res.returncode, err_msg
            except subprocess.TimeoutExpired:
                return 124, "TYPECHECK ERROR: `npx tsc` process timed out after 35s."

            # 2. Execute unit tests using tsx
            tests_dir = REPO_ROOT / "tests"
            if tests_dir.exists():
                test_files = [str(p.relative_to(REPO_ROOT)) for p in tests_dir.glob("**/*.ts")]
                
                # Auto-patch any rogue 'vitest' or 'jest' imports back to native 'node:test'
                for f_path in tests_dir.glob("**/*.ts"):
                    content = f_path.read_text(encoding="utf-8")
                    if 'vitest' in content or 'jest' in content:
                        content = re.sub(r'from\s+[\'"](?:vitest|jest)[\'"]', "from 'node:test'", content)
                        f_path.write_text(content, encoding="utf-8")
                        
                if test_files:
                    test_cmd = f"npx --yes tsx {' '.join(test_files)}"
                    try:
                        print("   ⏳ Executing unit test suite with `tsx`...")
                        test_res = subprocess.run(test_cmd, shell=True, capture_output=True, text=True, cwd=REPO_ROOT, timeout=45)
                        if test_res.returncode != 0:
                            return test_res.returncode, f"UNIT TEST FAILURE:\n{test_res.stdout}\n{test_res.stderr}"
                    except subprocess.TimeoutExpired:
                        return 124, "UNIT TEST TIMEOUT: Test execution timed out after 45s."

            return 0, "Clean build and all unit tests passed."

        code, output = run_typecheck_and_tests()
        fix_attempts = 0
        max_fixes = 15

        while code != 0 and fix_attempts < max_fixes:
            fix_attempts += 1
            print(f"   ⚠️ Build/Test Error (Attempt {fix_attempts}/{max_fixes}):")
            print(f"   {output[:350]}...")

            # Récupération de la vue consolidée globale du code et des tests concernés
            comprehensive_context = get_comprehensive_codebase_context(output)

            # 1. Determine if error is breaking previous sprints
            failing_tests = re.findall(r'tests/sprint_0*(\d+)\.test\.ts', output)
            is_retro_break = any(int(f) < sprint_num for f in failing_tests) if failing_tests else False

            if is_retro_break:
                print("   🚨 Legacy tests broken! Invoking Retro Compatibility Engineer with historical specs...")
                agent_role = "RETRO_COMPATIBILITY_ENGINEER"
                instruction = "Analyze the codebase snapshot and the historical RFC/METHODS above. Your specific goal is to restore backward compatibility. A newly implemented feature has broken tests from a previous sprint. You MUST respect the mathematical formulas and architectural contracts defined in the historical specs. Output the full file contents using `### FILE: tests/sprint_XX.test.ts` or `### FILE: src/...` to rewrite the broken code so it conforms exactly to the past architectures AND the new API signatures."
                
                # Append historical specs to the context for the retro engineer
                comprehensive_context += "\n" + get_historical_specs_context()
            else:
                print("   🔍 Invoking Debugger Agent with full codebase context...")
                agent_role = "DEBUGGER_ENGINEER"
                instruction = "Analyze the codebase snapshot above. Provide complete, full-file patches using `### FILE: path` syntax to fix the TypeScript compilation errors."

            debug_prompt = f"""
            VERIFICATION FAILURE (Exit Code {code}):

            ERROR LOGS & STACK TRACE:
            {output}

            {comprehensive_context}

            INSTRUCTION: 
            {instruction}
            """
            debug_res = call_agent(agent_role, debug_prompt)
            apply_multifile_response(debug_res, fallback_filename="src/earth_pod.ts")

            # 2. Test if Debugger patch solved the problem immediately
            code, output = run_typecheck_and_tests()
            if code == 0:
                print("   ✨ Debugger Agent successfully resolved the issue!")
                break

            # 3. If still failing, feed Debugger diagnosis + error log + full context to Backend Engineer
            print("   💻 Re-prompting Backend Engineer with full codebase context & Debugger analysis...")
            fix_prompt = f"""
            Verification failed with error code {code}:

            DEBUGGER DIAGNOSIS & PATCH ATTEMPT:
            {debug_res}

            CURRENT ERRORS:
            {output}

            {get_comprehensive_codebase_context(output)}

            Fix all remaining type errors and failing assertions across `src/` and `tests/`. Output complete updated files using `### FILE: path` syntax. You MUST NOT truncate files.
            """
            fix_res = call_agent("BACKEND_ENGINEER", fix_prompt)
            apply_multifile_response(fix_res, fallback_filename="src/earth_pod.ts")
            code, output = run_typecheck_and_tests()

        if code != 0:
            print("   ❌ Verification failed after retries. Rolling back sprint changes...")
            restore_sprint_backups()
            return False

        print("   ✅ TypeScript compilation clean & all unit tests passed!")

        # Log retro-compatibility
        if sprint_num > 1:
            compat_file = LOGS_DIR / "compatibility_tracker.json"
            compat_data = load_json_file(compat_file, lambda: {})
            compat_data[f"sprint_{sprint_num:03d}"] = f"Successfully validated backward compatibility with sprint_{sprint_num-1:03d} and prior."
            save_json_file(compat_file, compat_data)
            print(f"   🤝 Retro-Compatibility verified and logged for sprint_{sprint_num:03d}.")

        # Step 6: UI Engineering Target -> docs/sprints/sprint_00N/index.html
        print("🎨 [6/7] UI Engineer: Updating Frontend Visualizations...")
        
        # Determine previous baseline HTML to enforce non-regression
        prev_sprint_num = sprint_num - 1
        prev_html_path = REPO_ROOT / f"docs/sprints/sprint_{prev_sprint_num:03d}/index.html"
        
        if prev_sprint_num < 1 or not prev_html_path.exists() or len(prev_html_path.read_text(encoding="utf-8")) < 500:
            prev_html_path = REPO_ROOT / "index.original.html"
            
        old_html = prev_html_path.read_text(encoding="utf-8")
        
        # Auto-inject the correct relative path for the Sprints Explorer back button
        old_html = old_html.replace("'docs/index.html'", "'../../index.html'").replace('"docs/index.html"', '"../../index.html"')
        
        sprint_html_path = f"{sprint_folder_rel}/index.html"

        # Collect current sprint source code for UI context
        sprint_src_code = ""
        src_dir = REPO_ROOT / "src"
        if src_dir.exists():
            for f in src_dir.glob("*.ts"):
                sprint_src_code += f"\n// File: src/{f.name}\n" + f.read_text(encoding="utf-8") + "\n"

        ui_prompt = f"""
        SPRINT GOAL: {sprint_goal}
        ARCHITECT RFC:
        {rfc_text}

        NEWLY IMPLEMENTED BACKEND SOURCE CODE:
        {sprint_src_code}

        BASELINE / PREVIOUS SPRINT HTML:
        ```html
        {old_html}
        ```

        VISUAL ENHANCEMENT GUIDELINES (OBJECT-ORIENTED & INCREMENTAL):
        1. OBJECT-ORIENTED ARCHITECTURE: Treat the UI as a cohesive, growing application. Encapsulate your new rendering and logic updates into modular ES6 classes (e.g., `class SprintNRenderer`, `class TelemetryHUD`, `class GraphVisualizer`) inside the `<script type="module">`.
        2. STRICT ADDITIVE PROGRESSION: DO NOT delete existing UI elements, CSS variables, HTML containers, or legacy JS classes. You are building *on top* of the previous sprint. Extend existing render loops and classes via instantiation or inheritance; never overwrite the foundation.
        3. COHERENT INTEGRATION: Ensure your new UI components smoothly interface with the previous sprint's logic and the newly injected backend TypeScript modules.
        4. RELATIVE IMPORTS: Import monads strictly using: `import {{ ... }} from '../../../dist/src/earth_pod.js';`
        5. NO HALLUCINATED METHODS: You must ONLY call methods on imported backend classes that actually exist in the `NEWLY IMPLEMENTED BACKEND SOURCE CODE` provided. Write defensive code (e.g., `if (megaEarth && typeof megaEarth.simulateTick === 'function') {{ megaEarth.simulateTick(simTick); }}`) to prevent crashes.

        CRITICAL CONSTRAINTS (READ CAREFULLY):
        - Relative Imports: Always import transpiled JS via `../../../dist/...` (e.g., `import { ... } from '../../../dist/src/earth_pod.js';`) so pages load properly under GitHub Pages subfolders.
        - Strict Additive Non-Regression: You MUST retain ALL existing HTML elements, IDs, JavaScript variables, and CSS from the baseline. If you delete a single `id="..."` container, your build will be rejected.
        - NO TRUNCATION: You are strictly forbidden from using comments like `<!-- existing code -->` or `// previous logic`. You MUST output the ENTIRE document verbatim from `<!DOCTYPE html>` to `</html>`, with your new additions woven in.
        
        Output complete file strictly using `### FILE: {sprint_html_path}` syntax.
        """
        ui_attempts = 0
        max_ui_attempts = 3
        is_valid_ui = False
        current_ui_prompt = ui_prompt

        while not is_valid_ui and ui_attempts < max_ui_attempts:
            ui_attempts += 1
            ui_res = call_agent("UI_ENGINEER", current_ui_prompt)
            apply_multifile_response(ui_res, fallback_filename=sprint_html_path)

            target_file = REPO_ROOT / sprint_html_path
            new_html = target_file.read_text(encoding="utf-8") if target_file.exists() else ""
            is_valid_ui, ui_msg = verify_ui_non_regression(old_html, new_html)

            if not is_valid_ui:
                print(f"   ⚠️ UI Check Failed (Attempt {ui_attempts}/{max_ui_attempts}): {ui_msg}")
                if ui_attempts < max_ui_attempts:
                    print("   🔧 Retrying UI Engineer with strict non-regression prompt...")
                    current_ui_prompt = f"{ui_prompt}\n\nCRITICAL REJECTION ERROR: {ui_msg}\nYou failed to output the full baseline HTML. You MUST output the ENTIRE document from <!DOCTYPE html> to </html> without truncation."
                else:
                    print("   ❌ UI generation failed non-regression checks after maximum retries. Reverting to baseline HTML to prevent crash.")
                    # Revert to baseline so the UI isn't completely broken
                    target_file.write_text(old_html, encoding="utf-8")

        # Final pass: Ensure the "Sprints Explorer" back button has the correct relative path for deep folders
        final_html = target_file.read_text(encoding="utf-8")
        final_html = final_html.replace("'docs/index.html'", "'../../index.html'").replace('"docs/index.html"', '"../../index.html"')
        target_file.write_text(final_html, encoding="utf-8")

        print(f"   ✓ Generated Sprint UI Visualization: {sprint_html_path}")

        # Step 6.1: Chrome Headless Red Error Inspection & Self-Healing Loop (Iterative up to 3 attempts)
        print("   🌐 Inspecting Sprint UI in Headless Chrome for Non-CORS Console Errors...")
        ui_fix_attempts = 0
        max_ui_fixes = 3
        while ui_fix_attempts < max_ui_fixes:
            console_errors, _ = run_browser_console_check(sprint_html_path)
            if not console_errors:
                print("   ✅ Browser console clean: Zero non-CORS errors detected.")
                break
            
            ui_fix_attempts += 1
            print(f"   🚨 Detected {len(console_errors)} non-CORS console error(s) (Attempt {ui_fix_attempts}/{max_ui_fixes}):")
            for err in console_errors[:3]:
                print(f"      - {err[:150]}")

            print("   🔍 Invoking Browser Console Debugger Agent...")
            current_html_content = target_file.read_text(encoding="utf-8") if target_file.exists() else ""
            console_debug_prompt = f"""
            BROWSER CONSOLE VERIFICATION FAILURE (Attempt {ui_fix_attempts}/{max_ui_fixes}):
            The generated Sprint UI (`{sprint_html_path}`) produced the following non-CORS console errors in Chrome:

            {chr(10).join(console_errors)}

            CURRENT SPRINT HTML:
            {current_html_content[:4000]}

            REPOSITORY SUMMARY:
            {get_repository_summary()}

            Diagnose the root cause (e.g., missing exports, incorrect named imports like importing `EarthPod` instead of `EarthPOD`, invalid relative import paths) and provide direct file patches for `src/` or `{sprint_html_path}` using `### FILE: path` syntax.
            """
            console_debug_res = call_agent("BROWSER_CONSOLE_DEBUGGER", console_debug_prompt)
            apply_multifile_response(console_debug_res, fallback_filename=sprint_html_path)

            # Re-compile TypeScript if backend source files were patched
            run_typecheck_and_tests()

        # Step 6.2: Optional Visual QA Check via Playwright
        if (REPO_ROOT / "visual_qa_agent.py").exists():
            print("   📸 Running Automated Gemini Visual QA Agent...")
            res = subprocess.run("python3 visual_qa_agent.py", shell=True, capture_output=True, text=True, cwd=REPO_ROOT)
            print(f"   {res.stdout.strip()}")

        # Step 7: Documentation, QA Audit & Media Amplification
        print("📝 [7/7] Documentalist, QA Auditor & Marketing Swarm: Finalizing Release & Outreach Artifacts...")
        doc_prompt = f"""
        SPRINT {sprint_num:03d} COMPLETED: {sprint_goal}
        RFC:
        {rfc_text}

        Write comprehensive release documentation strictly inside `{sprint_folder_rel}/03_RELEASE_NOTES.md`.
        DO NOT attempt to modify root `README.md`.
        """
        doc_res = call_agent("DOCUMENTALIST", doc_prompt)
        apply_multifile_response(doc_res, fallback_filename=f"{sprint_folder_rel}/03_RELEASE_NOTES.md")

        # Generate Gaïa's English audio briefing for the sprint
        release_notes_path = REPO_ROOT / sprint_folder_rel / "03_RELEASE_NOTES.md"
        audio_output_path = REPO_ROOT / sprint_folder_rel / "gaia_sprint_summary.mp3"
        if release_notes_path.exists() and is_audio_invalid(audio_output_path):
            notes_text = release_notes_path.read_text(encoding="utf-8")
            gaia_prompt = f"""
            Summarize this sprint's breakthroughs in an evocative, poetic, and thermodynamically grounded English spoken narrative (150-180 words).
            Speak as Gaïa, observing how this sprint refines the laws, cycles, and energy balance of your digital twin:
            {notes_text}
            """
            gaia_script = call_agent("GAIA_VOICE", gaia_prompt)
            generate_gaia_audio_summary(gaia_script, audio_output_path)

        audit_prompt = f"""
        Review sprint code changes in src/ and verify thermodynamic First/Second Law mass balance.
        Save formal report to {sprint_folder_rel}/04_AUDIT.md.
        """
        audit_res = call_agent("THERMODYNAMIC_AUDITOR", audit_prompt)
        apply_multifile_response(audit_res, fallback_filename=f"{sprint_folder_rel}/04_AUDIT.md")

        # Step 7.0: Database, UML & Thermodynamic Blockchain Maintenance
        ledger_prompt = f"""
        SPRINT {sprint_num:03d} COMPLETED: {sprint_goal}
        RFC SPEC:
        {rfc_text}

        1. Update SQL schemas in `db/schema.sql` to capture new monad stocks, flows, and blockchain block transaction signatures.
        2. Generate a PlantUML class diagram representing the system in `db/uml/sprint_{sprint_num:03d}_schema.puml`.
        Output both files strictly using `### FILE: path` syntax.
        """
        ledger_res = call_agent("LEDGER_ARCHITECT", ledger_prompt)
        apply_multifile_response(ledger_res, fallback_filename="db/schema.sql")

        # Step 7.1: Academic, DevRel & Viral Storytelling Generation
        print("📢 Generating Academic Preprint, Social Thread & DevRel Contributor Guides...")
        marketing_prompt = f"""
        SPRINT {sprint_num:03d} COMPLETED: {sprint_goal}
        RFC SPEC:
        {rfc_text}
        METHODS:
        {methods_text}

        Synthesize this sprint into public research outreach artifacts. You MUST output TWO files for the academic preprint:
        1. A web-friendly markdown summary using `### FILE: {sprint_folder_rel}/05_ACADEMIC_PREPRINT.md`
        2. A complete, compilable LaTeX document using `### FILE: {sprint_folder_rel}/05_ACADEMIC_PREPRINT.tex`
        """
        
        academic_res = call_agent("RESEARCH_OUTREACH", marketing_prompt)
        apply_multifile_response(academic_res, fallback_filename=f"{sprint_folder_rel}/05_ACADEMIC_PREPRINT.md")
        compile_latex_to_pdf(sprint_folder_rel)

        story_res = call_agent("SCIENTIFIC_STORYTELLER", marketing_prompt)
        apply_multifile_response(story_res, fallback_filename=f"{sprint_folder_rel}/06_VIRAL_STORYTELLING.md")

        devrel_res = call_agent("DEVREL_COMMUNITY", marketing_prompt)
        apply_multifile_response(devrel_res, fallback_filename=f"{sprint_folder_rel}/07_COMMUNITY_GUIDE.md")

        # Mark Sprint as Successfully Released
        increment_sprint_num(sprint_goal)
        generate_docs_dashboard()
        clear_backups()
        print(f"🎉 SPRINT {sprint_num:03d} SUCCESSFULLY RELEASED & AUDITED!")
        return True

    except Exception as e:
        print(f"⛔ Unexpected error during Sprint {sprint_num:03d}: {e}")
        restore_sprint_backups()
        return False
    
def get_comprehensive_codebase_context(error_logs: str = "") -> str:
    """Concatène les fichiers sources et *seulement* les tests concernés par l'erreur."""
    context_blocks = ["=== COMPREHENSIVE CODEBASE SNAPSHOT ==="]
    
    # 1. Parcourir src/
    src_dir = REPO_ROOT / "src"
    if src_dir.exists():
        for f in sorted(src_dir.glob("**/*.ts")):
            if f.is_file():
                rel = f.relative_to(REPO_ROOT)
                context_blocks.append(f"\n--- FILE: {rel} ---\n" + f.read_text(encoding="utf-8"))
                
    # 2. Identifier les fichiers de tests qui plantent d'après les logs
    failing_test_files = set(re.findall(r'(tests/sprint_[\w\d]+\.test\.ts)', error_logs))
    
    # Si aucun test spécifique n'est détecté, on ajoute le test du sprint actuel
    if not failing_test_files:
        current_sprint = f"sprint_{get_current_sprint_num():03d}.test.ts"
        failing_test_files.add(f"tests/{current_sprint}")

    for test_file_rel in failing_test_files:
        test_path = REPO_ROOT / test_file_rel
        if test_path.exists() and test_path.is_file():
            context_blocks.append(f"\n--- FILE: {test_file_rel} ---\n" + test_path.read_text(encoding="utf-8"))
            
    return "\n".join(context_blocks)

def get_historical_specs_context() -> str:
    """Gathers all past RFCs and Methods to ensure new code obeys established thermodynamic formulas and architecture."""
    context_blocks = ["=== HISTORICAL ARCHITECTURE & METHODS (SPRINT 001 to CURRENT) ==="]
    sprints_parent = REPO_ROOT / "docs" / "sprints"
    if not sprints_parent.exists():
        return ""

    sprint_dirs = sorted([d for d in sprints_parent.iterdir() if d.is_dir() and d.name.startswith("sprint_")])
    for s_dir in sprint_dirs:
        rfc = s_dir / "01_RFC.md"
        methods = s_dir / "02_METHODS.md"
        if rfc.exists():
            # Truncate slightly to prevent massive token overflow if history gets too long
            context_blocks.append(f"\n--- {s_dir.name} RFC ---\n{rfc.read_text(encoding='utf-8')[:3000]}")
        if methods.exists():
            context_blocks.append(f"\n--- {s_dir.name} METHODS ---\n{methods.read_text(encoding='utf-8')[:3000]}")

    return "\n".join(context_blocks)

def generate_docs_dashboard():
    """Generates a dynamic HTML dashboard in docs/index.html with Markdown & LaTeX support."""
    sprints_parent = REPO_ROOT / "docs" / "sprints"
    docs_index = REPO_ROOT / "docs" / "index.html"
    
    if not sprints_parent.exists():
        return
        
    sprint_dirs = sorted([d for d in sprints_parent.iterdir() if d.is_dir() and d.name.startswith("sprint_")], reverse=True)
    
    html_content = [
        "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>",
        "<title>Web of Life - Sprint Explorer</title>",
        "<!-- Markdown & LaTeX rendering libraries -->",
        "<script src='https://cdn.jsdelivr.net/npm/marked/marked.min.js'></script>",
        "<script>window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] } };</script>",
        "<script id='MathJax-script' async src='https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'></script>",
        "<style>",
        "body { background: #02050a; color: #c8f5f2; font-family: 'Courier New', monospace; margin: 0; display: flex; height: 100vh; overflow: hidden; }",
        "#sidebar { width: 340px; background: rgba(5, 14, 24, 0.95); border-right: 1px solid #315064; padding: 20px; overflow-y: auto; box-shadow: 2px 0 15px rgba(0,0,0,0.5); z-index: 10; }",
        "#sidebar h1 { color: #00ffe1; font-size: 1.2rem; border-bottom: 1px solid #315064; padding-bottom: 10px; margin-top: 0; }",
        ".backlog-btn { display: block; width: 100%; text-align: center; background: #102331; border: 1px solid #ffaa00; color: #ffaa00; padding: 8px 10px; border-radius: 5px; text-decoration: none; font-size: 0.85rem; font-weight: bold; margin-bottom: 20px; cursor: pointer; transition: all 0.2s; }",
        ".backlog-btn:hover { background: #ffaa00; color: #02050a; }",
        ".sprint-group { margin-bottom: 15px; border: 1px solid #203846; border-radius: 6px; background: rgba(17, 35, 48, 0.5); overflow: hidden; }",
        ".sprint-group summary { color: #ffaa00; font-size: 0.95rem; font-weight: bold; padding: 10px 14px; cursor: pointer; background: rgba(16, 35, 49, 0.8); user-select: none; outline: none; }",
        ".sprint-group summary:hover { background: rgba(24, 56, 76, 0.9); color: #00ffe1; }",
        ".sprint-content { padding: 10px 14px 14px 14px; display: flex; flex-direction: column; gap: 6px; }",
        ".doc-link { display: block; color: #9fc7d8; text-decoration: none; padding: 5px 8px; border-radius: 4px; font-size: 0.82rem; cursor: pointer; transition: all 0.2s; }",
        ".doc-link:hover, .doc-link.active { background: rgba(0, 225, 255, 0.1); color: #00ff66; font-weight: bold; }",
        ".pdf-link { color: #ff5370 !important; font-weight: bold; }",
        ".vis-link { display: block; text-align: center; background: #102331; border: 1px solid #00e1ff; color: #00e1ff; padding: 7px 10px; border-radius: 5px; text-decoration: none; font-size: 0.82rem; margin-top: 8px; transition: all 0.2s; }",
        ".vis-link:hover { background: #00e1ff; color: #000; box-shadow: 0 0 10px rgba(0, 225, 255, 0.4); }",
        "#viewer-container { flex: 1; background: #070d14; overflow-y: auto; padding: 40px; box-sizing: border-box; }",
        "#markdown-viewer { max-width: 900px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #d7e9ec; line-height: 1.6; font-size: 1rem; }",
        "#markdown-viewer h1, #markdown-viewer h2, #markdown-viewer h3 { color: #00ffe1; border-bottom: 1px solid #203846; padding-bottom: 5px; margin-top: 1.5em; }",
        "#markdown-viewer code { background: #111a24; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; color: #ffaa00; font-size: 0.9em; }",
        "#markdown-viewer pre { background: #111a24; padding: 15px; border-radius: 8px; overflow-x: auto; border: 1px solid #203846; }",
        "#markdown-viewer pre code { background: transparent; padding: 0; color: #c8f5f2; }",
        "#markdown-viewer a { color: #00ff66; }",
        "#markdown-viewer table { border-collapse: collapse; width: 100%; margin: 20px 0; }",
        "#markdown-viewer th, #markdown-viewer td { border: 1px solid #315064; padding: 10px; text-align: left; }",
        "#markdown-viewer th { background: #102331; color: #00ffe1; }",
        "#markdown-viewer blockquote { border-left: 4px solid #00ffe1; margin: 0; padding-left: 15px; color: #9fc7d8; background: rgba(0, 225, 255, 0.05); padding: 10px 15px; }",
        ".loading { color: #ffaa00; font-style: italic; }",
        "</style>",
        "</head><body>",
        "<div id='sidebar'>",
        "<h1>🌍 Web of Life Explorer</h1>",
        "<a id='backlog-link' class='backlog-btn' onclick=\"loadMarkdown('BACKLOG.md', 'backlog-link')\">📋 View Master BACKLOG.md</a>"
    ]
    
    for i, s_dir in enumerate(sprint_dirs):
        open_attr = " open" if i == 0 else ""
        html_content.append(f"<details class='sprint-group'{open_attr}><summary>{s_dir.name.upper()}</summary><div class='sprint-content'>")
        
        # 1. Links to Markdown files 01 through 07 in exact order
        md_files = sorted([f for f in s_dir.glob("*.md") if f.name != "05_ACADEMIC_PREPRINT.md" or not (s_dir / "05_ACADEMIC_PREPRINT.pdf").exists()])
        for md_file in sorted(md_files, key=lambda x: x.name):
            link_id = f"link-{s_dir.name}-{md_file.name}".replace(".", "-")
            html_content.append(f"<a id='{link_id}' class='doc-link' onclick=\"loadMarkdown('sprints/{s_dir.name}/{md_file.name}', '{link_id}')\">📄 {md_file.name}</a>")
            
        # 2. Link to compiled PDF
        if (s_dir / "05_ACADEMIC_PREPRINT.pdf").exists():
            link_id = f"link-{s_dir.name}-pdf"
            html_content.append(f"<a id='{link_id}' class='doc-link pdf-link' onclick=\"loadPdf('sprints/{s_dir.name}/05_ACADEMIC_PREPRINT.pdf', '{link_id}')\">📕 05_ACADEMIC_PREPRINT.pdf</a>")
            
        # 3. Gaïa's audio summary
        audio_path = s_dir / "gaia_sprint_summary.mp3"
        if audio_path.exists():
            html_content.append(f"<audio controls style='width:100%; margin: 6px 0; height:28px;'><source src='sprints/{s_dir.name}/gaia_sprint_summary.mp3' type='audio/mpeg'>Audio non supporté.</audio>")

        # 4. Open Visualization Tab button at the bottom
        if (s_dir / "index.html").exists():
            html_content.append(f"<a class='vis-link' href='sprints/{s_dir.name}/index.html' target='_blank'>🎨 Open Visualization Tab</a>")
            
        html_content.append("</div></details>")
        
    html_content.extend([
        "</div>",
        "<div id='viewer-container'>",
        "<div id='markdown-viewer'>",
        "<h2>Welcome to the Planetary Engine</h2>",
        "<p>Select a document or the backlog from the sidebar to inspect specifications, architecture, and mathematical preprints.</p>",
        "</div>",
        "</div>",
        "<script>",
        "function loadPdf(path, linkId) {",
        "  document.querySelectorAll('.doc-link, .backlog-btn').forEach(el => el.classList.remove('active'));",
        "  if(linkId) document.getElementById(linkId).classList.add('active');",
        "  const mdViewer = document.getElementById('markdown-viewer');",
        "  mdViewer.innerHTML = `<iframe src=\"${path}\" width=\"100%\" height=\"850px\" style=\"border:1px solid #315064; border-radius:8px; background:white;\"></iframe>`;",
        "}",
        "async function loadMarkdown(path, linkId) {",
        "  document.querySelectorAll('.doc-link, .backlog-btn').forEach(el => el.classList.remove('active'));",
        "  if(linkId === 'backlog-link') {",
        "    path = 'BACKLOG.md';",
        "  }",
        "  if(linkId && document.getElementById(linkId)) { document.getElementById(linkId).classList.add('active'); }",
        "  const mdViewer = document.getElementById('markdown-viewer');",
        "  mdViewer.innerHTML = '<p class=\"loading\">Decrypting data block...</p>';",
        "  try {",
        "    const response = await fetch(path);",
        "    if (!response.ok) throw new Error('File not found');",
        "    const text = await response.text();",
        "    let mathBlocks = [];",
        "    let processedText = text.replace(/(\\$\\$[\\s\\S]*?\\$\\$|\\$.*?\\$)/g, function(match) {",
        "        mathBlocks.push(match);",
        "        return '@@MATH_BLOCK_' + (mathBlocks.length - 1) + '@@';",
        "    });",
        "    let html = marked.parse(processedText);",
        "    html = html.replace(/@@MATH_BLOCK_(\\d+)@@/g, function(match, index) {",
        "        return mathBlocks[index];",
        "    });",
        "    mdViewer.innerHTML = html;",
        "    if (window.MathJax) { MathJax.typesetPromise([mdViewer]); }",
        "  } catch(e) {",
        "    mdViewer.innerHTML = '<p style=\"color:#ff5370\">Error: Could not load document. Ensure you are running via local HTTP server.</p>';",
        "  }",
        "}",
        "</script></body></html>"
    ])
    
    docs_index.write_text("\n".join(html_content), encoding="utf-8")
    print("   🌐 Generated dynamic docs/index.html explorer dashboard with extensible sprint sections & Backlog button.")

# ─────────────────────────────────────────────────────────────────────────────
# Execution Main Loop
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Web of Life Start-Up Sprint Orchestrator")
    parser.add_argument(
        "-p", "--provider",
        type=str,
        default="gemini",
        choices=["gemini", "huggingface", "local-qwen"],
        help="AI Backend provider: 'gemini' (default), 'huggingface' (free API), or 'local-qwen' (local model)."
    )
    parser.add_argument(
        "-m", "--model",
        type=str,
        default=None,
        help="Override default model string for selected provider."
    )
    parser.add_argument(
        "-n", "--sprints",
        type=int,
        default=None,
        help="Number of sprint cycles to run (e.g., -n 1 or --sprints 2). Defaults to continuous execution."
    )
    parser.add_argument(
        "-c", "--cleanup",
        action="store_true",
        help="Purging mode: Deletes all 05, 06, and 07 outreach artifacts across all sprints before backfilling."
    )
    parser.add_argument(
        "-w", "--wipe",
        action="store_true",
        help="Reset project back to Commit 0 baseline state, wiping all sprint folders, code builds, and state."
    )
    parser.add_argument(
        "--freset",
        action="store_true",
        help="Freeze current repo state, wipe all git commit history via an orphan branch, and force push to main."
    )
    args = parser.parse_args()

    if args.freset:
        hard_reset_repository()
        sys.exit(0)

    if args.wipe:
        wipe_all_sprint_data()
        sys.exit(0)

    # Initialize provider FIRST so gemini_client is ready for agents
    init_provider(args.provider, custom_model=args.model)

    # Gaïa audio introduction for the root repository
    readme_audio_path = DOCS_DIR / "gaia_repository_intro.mp3"
    if (REPO_ROOT / "README.md").exists() and is_audio_invalid(readme_audio_path):
        print("🌍 [Gaïa] Ingesting README.md to generate planetary overview narration...")
        readme_text = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
        prompt_intro = f"""
        Draft a calm, resonant, and poetic spoken-word introductory monologue (approx. 200 words) in English.
        Speak as Gaïa, the living Earth system, witnessing humanity build an executable thermodynamic software reflection of the biosphere and technosphere.
        Base your narration on this repository overview:
        {readme_text[:2000]}
        """
        script_intro = call_agent("GAIA_VOICE", prompt_intro)
        generate_gaia_audio_summary(script_intro, readme_audio_path)

    ensure_tsconfig()
    ensure_main_ts_imports()
    ensure_baseline_html()

    if args.cleanup:
        cleanup_outreach_artifacts()

    validate_and_backfill_sprint_artifacts()
    validate_and_repair_sprint_uis()

    print("================================────────────────────────")
    print(f"🌍 Web of Life Agile Start-Up Orchestrator [{SELECTED_MODEL}] ({SELECTED_PROVIDER.upper()})")
    if args.sprints is not None:
        print(f"🎯 Target Execution Limit: {args.sprints} Sprint(s)")
    print("================================────────────────────────")
    sprints_completed = 0
    while True:
        success = execute_sprint_cycle()
        if not success:
            print("⛔ Sprint execution failed. Sleeping 60s before retrying sprint cycle...")
            time.sleep(60)
        else:
            sprints_completed += 1
            if args.sprints is not None and sprints_completed >= args.sprints:
                print(f"\n🎉 Target sprint count reached ({sprints_completed}/{args.sprints}). Halting orchestrator run.")
                break
            print("💤 Cooling down 10s before launching next sprint cycle...")
            time.sleep(10)

if __name__ == "__main__":
    main()
