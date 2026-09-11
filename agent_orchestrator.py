#!/usr/bin/env python3
"""
WebOfLife Start-Up Sprint Orchestrator (Agile Release Engine V5)
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
# =============================================================================

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
        # Automatically fallback to a 7B-class model optimized for a 6GB VRAM budget
        SELECTED_MODEL = custom_model or "Qwen/Qwen2.5-Coder-7B-Instruct"
        print(f"🤖 Loading Local Model: {SELECTED_MODEL} optimized for 6GB VRAM CUDA Execution...")
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
            
            # Configure strict 4-bit quantization to fit comfortably inside 6GB VRAM
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16
            )
            
            local_qwen_tokenizer = AutoTokenizer.from_pretrained(SELECTED_MODEL)
            
            # Load the model directly using CUDA acceleration hooks
            local_qwen_model = AutoModelForCausalLM.from_pretrained(
                SELECTED_MODEL,
                quantization_config=bnb_config,
                device_map="cuda:0", # Directly locks the process to your dedicated RTX 3050
                torch_dtype=torch.float16,
                attn_implementation="sdpa" # Native PyTorch scaled dot-product attention optimized for CUDA
            )
            print(f"✅ Local {SELECTED_MODEL} successfully loaded on CUDA device: {local_qwen_model.device}")
        except Exception as e:
            print(f"❌ Failed to load local model `{SELECTED_MODEL}`: {e}")
            print("   Ensure you installed requirements: pip install transformers torch accelerate bitsandbytes")
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
    if 'id="topbar"' not in new_html or 'id="controls"' not in new_html:
        return False, "UI REGRESSION BLOCKED: Critical `#topbar` or `#controls` container was removed or renamed."

    # Check for malformed attribute syntax (e.g., id(simCanvas)
    if re.search(r'id\([^)]+\)', new_html):
        return False, "UI SYNTAX ERROR: Detected malformed HTML attribute syntax like `id(...)` instead of `id=\"...\"`."

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

    if new_lines < int(old_lines * 0.90):
        msg = (f"UI REGRESSION BLOCKED: Baseline HTML had {old_lines} lines, "
               f"but generated Sprint HTML only has {new_lines} lines. "
               f"Features must be ADDED, never stripped or simplified.")
        return False, msg

    return True, "UI non-regression verified."

# ─────────────────────────────────────────────────────────────────────────────
# State, Quota, Cleanup & Reset Functions
# ─────────────────────────────────────────────────────────────────────────────

def ensure_tsconfig() -> None:
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
        for fname in ["05_ACADEMIC_PREPRINT.md", "06_VIRAL_STORYTELLING.md", "07_COMMUNITY_GUIDE.md"]:
            fpath = s_dir / fname
            if fpath.exists():
                fpath.unlink()
                deleted_count += 1
    print(f"🧹 Cleanup complete: Purged {deleted_count} outreach artifact files across {len(sprint_dirs)} sprint folders.")

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
    dist_parent = REPO_ROOT / "dist"
    if dist_parent.exists():
        shutil.rmtree(dist_parent, ignore_errors=True)

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
        invalid_05 = is_artifact_invalid(f05, min_length=400)
        invalid_06 = is_artifact_invalid(f06, min_length=300)
        invalid_07 = is_artifact_invalid(f07, min_length=300)

        if not any([invalid_01, invalid_02, invalid_03, invalid_04, invalid_05, invalid_06, invalid_07]):
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
            Synthesize this sprint into a complete academic preprint summary with abstract and equations.
            Output strictly using `### FILE: {sprint_folder_rel}/05_ACADEMIC_PREPRINT.md` syntax.
            """
            res = call_agent("RESEARCH_OUTREACH", prompt)
            apply_multifile_response(res, fallback_filename=f"{sprint_folder_rel}/05_ACADEMIC_PREPRINT.md")

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

def is_ui_html_broken(html_content: str) -> bool:
    """Detects if a sprint index.html is blank, non-rendering, or missing simulation/drawing scripts."""
    if not html_content or len(html_content.strip()) < 300:
        return True
    if re.search(r'id\([^)]+\)', html_content):
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

    sprint_dirs = sorted([d for d in sprints_parent.iterdir() if d.is_dir() and d.name.startswith("sprint_")])
    
    for s_dir in sprint_dirs:
        sprint_html_file = s_dir / "index.html"
        html_content = sprint_html_file.read_text(encoding="utf-8") if sprint_html_file.exists() else ""

        if not is_ui_html_broken(html_content):
            continue

        sprint_folder_rel = f"docs/sprints/{s_dir.name}"
        print(f"🎨 [Retroactive UI Repair] Regenerating broken/non-rendering UI for {s_dir.name}...")

        rfc_path = s_dir / "01_RFC.md"
        methods_path = s_dir / "02_METHODS.md"
        rfc_text = rfc_path.read_text(encoding="utf-8") if rfc_path.exists() else "Sprint architecture spec."
        methods_text = methods_path.read_text(encoding="utf-8") if methods_path.exists() else "Sprint methods spec."

        sprint_src_code = ""
        src_dir = REPO_ROOT / "src"
        if src_dir.exists():
            for f in src_dir.glob("**/*.ts"):
                sprint_src_code += f"\n// File: src/{f.relative_to(src_dir)}\n" + f.read_text(encoding="utf-8")[:1000] + "\n..."

        prev_num_match = re.search(r"sprint_(\d+)", s_dir.name)
        prev_num = int(prev_num_match.group(1)) - 1 if prev_num_match else 0
        if prev_num >= 1:
            prev_html_path = REPO_ROOT / f"docs/sprints/sprint_{prev_num:03d}/index.html"
        else:
            prev_html_path = REPO_ROOT / "index.original.html"

        old_html = prev_html_path.read_text(encoding="utf-8") if prev_html_path.exists() else ""

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
        3. Import monads/functions using relative paths (e.g., `import {{ EarthPOD, bootstrapMegaPod }} from '../../../dist/src/earth_pod.js';`).
        4. Implement an active 60FPS `requestAnimationFrame` or `setInterval` draw loop rendering nodes, spatial grids/H3 hexagons, and animated energy/mass flux particles.
        5. Dynamically update `#sprint-telemetry` / `#telemetry-content` with real live stock metrics every tick.
        6. Wire up interactive controls (`#btn-pause`, `#btn-step`, `#btn-reset`, search bar).

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

# ─────────────────────────────────────────────────────────────────────────────
# Startup Agile Team Personas
# ─────────────────────────────────────────────────────────────────────────────

PERSONAS = {
    "BRAINSTORMER_ECO": """
You are the Ecological Systems & Biosphere Brainstormer for WebOfLife.
Your mission: Audit the repository code in src/, README.md, and docs/BACKLOG.md to identify missing ecological fidelity.
Focus on: Food web matrices, taxonomic completeness, biodiversity data streams, mycorrhizal networks, and biome succession.
Provide a concise bulleted list of high-priority missing biosphere features to add to the backlog.
""",

    "BRAINSTORMER_IND": """
You are the Technosphere & Industrial Metabolic Brainstormer for WebOfLife.
Your mission: Audit the repository code in src/, README.md, and docs/BACKLOG.md to identify missing human industrial fidelity.
Focus on: Direct air capture, semiconductor manufacturing, renewable energy grids, resource extraction, and pollution vectors.
Provide a concise bulleted list of high-priority missing technosphere features to add to the backlog.
""",

    "BRAINSTORMER_PHYS": """
You are the Planetary Physics & Geospatial Thermodynamics Brainstormer for WebOfLife.
Your mission: Audit the repository code in src/, README.md, and docs/BACKLOG.md to identify missing physical & spatial mechanics.
Focus on: Uber H3 spatial resolution, climate feedback loops, exergy dissipation gradients, and ocean/atmosphere transport.
Provide a concise bulleted list of high-priority missing planetary physics features to add to the backlog.
""",

    "PRODUCT_MANAGER": """
You are the Chief Product Officer (CPO) & Agile Project Manager for WebOfLife.
Your responsibility:
1. STRICT BACKLOG RETROSPECTIVE AUDIT:
   - Carefully examine the `ACTUAL REPOSITORY FILE TREE` and `ACTUAL IMPLEMENTED SOURCE CODE`.
   - If a backlog item claims a file exists (e.g. `src/biosphere/stoichiometric_cycling.ts` or `src/spatial/h3_resolution_hierarchy.ts`) BUT that file or directory DOES NOT EXIST in the file tree, YOU MUST REVERT IT BACK TO `[ ]`.
   - ONLY items with actual implemented code in `src/` can remain `[x]`.
2. NON-SHRINKING & ADDITIVE BACKLOG CONSTRAINT:
   - NEVER delete, remove, summarize, or truncate any existing feature lines or headings from `BACKLOG.md`. The backlog MUST remain an ever-growing master record.
   - You may ONLY modify item status checkboxes (`[ ]` <-> `[x]`) or APPEND new `[ ]` brainstormed feature items under their respective Phase headings.
3. RE-CALCULATE Roadmap Completion % based ONLY on genuinely implemented `[x]` items.
4. SPRINT GOAL SELECTION: Choose the single most critical `[ ]` item from the audited backlog as the `SPRINT_GOAL`.

Format output strictly using:
### FILE: docs/BACKLOG.md
```md
<!-- Verified Backlog content with retrospective [x] and [ ] checks -->
Roadmap Completion: <0-100>%
SPRINT_GOAL: <One clear sentence summarizing the sprint objective>
""",

    "LEAD_ARCHITECT": """
You are the Chief Systems Architect for WebOfLife.
Your responsibility:
1. Translate the Sprint Goal into a formal technical RFC specification in docs/sprints/sprint_N/01_RFC.md.
2. Define class hierarchy additions, monad stock transitions, and interface contracts.
3. Ensure absolute compliance with First/Second Law thermodynamics (matter conservation, solar input only).
Format output as:
### FILE: docs/sprints/sprint_N/01_RFC.md
```md
<!-- RFC Content -->
```
""",

    "METHOD_MINER": """
You are the Process Mining & Research Scientist for WebOfLife.
Your responsibility:
1. Research physical, biological, and industrial processes required by the RFC.
2. Formalize exact mass/energy deltas (carbon, water, minerals, oxygen, energy).
3. Express processes as executable monad methods with concrete stock transfer equations.
Format output as:
### FILE: docs/sprints/sprint_N/02_METHODS.md
```md
<!-- Method Specifications -->
```
""",
    "DEBUGGER_ENGINEER": """
You are the Lead Systems Debugger & Root Cause Analyst for WebOfLife.
Your responsibility:
1. Analyze failing TypeScript compilation errors, runtime exceptions, and unit test stack traces.
2. Identify the exact root cause (e.g., missing type export, broken interface contract, circular import, runtime type mismatch).
3. Formulate precise code patches to fix the issue.

Format output using:
DIAGNOSIS: <Brief explanation of root cause>
### FILE: path/to/file.ts
```ts
// Fixed code patch
```
""",
    "BROWSER_CONSOLE_DEBUGGER": """
You are the Senior Browser & Client-Side Console Debugger for WebOfLife.
Your responsibility:
1. Analyze red Chrome browser console errors, uncaught exceptions, 404 network fetch failures, and ES module import mismatches.
2. Identify the root cause (e.g., importing unexported symbols, invalid relative import paths, missing DOM element references).
3. Provide precise file patches for src/ TypeScript source files or docs/sprints/sprint_N/index.html. You can ignore errors related to CORS.

Format output using:
DIAGNOSIS: <Brief explanation of root cause>
### FILE: path/to/file.ts
```ts
// Fixed code patch
```
    """,
    "BACKEND_ENGINEER": """
You are the Senior Backend Systems Engineer for WebOfLife.
Your responsibility:
1. Implement the RFC and Method specs into production TypeScript source files in `src/`.
2. NPM PACKAGES PERMITTED: You may freely import external npm packages (e.g., `h3-js`, `d3`, `three`, `mathjs`). The orchestrator auto-installs missing dependencies during build verification.
3. STRICT EXPORT & TYPE CONSISTENCY:
   - Every primary class, catalog object, interface, and type MUST be explicitly exported (e.g., `export class IndustrialCatalog`, `export const IndustrialCatalog`). Never leave top-level domain structures unexported.
   - Explicitly annotate ALL function/callback parameters (e.g., `(idx: number) => ...`) to prevent implicit `any` errors (`TS7006`).
4. MANDATORY NATIVE UNIT TESTS: Create or update `tests/sprint_N.test.ts`.
   - MUST explicitly import Node.js native test modules:
     `import { describe, it } from 'node:test';`
     `import assert from 'node:assert';`
   - NEVER use unimported global test functions (`describe`, `it`, `expect`).
   - Import source files using relative `.js` specifiers (e.g., `import { H3Grid } from '../src/h3_spatial.js';`).
Format output using:
### FILE: src/filename.ts
```ts
// TypeScript code
```
### FILE: tests/sprint_N.test.ts
```ts
// Test assertions
```
""",

    "UI_ENGINEER": """
You are the Lead Frontend UI/UX Architect for WebOfLife.
Your responsibility:
1. Output sprint-specific HTML strictly to `docs/sprints/sprint_N/index.html`. NEVER modify or output root `index.html`.
2. MANDATORY COMPLETE VISUAL ANIMATION ENGINE:
   - Every sprint `index.html` MUST contain a complete, standalone JavaScript simulation engine inside `<script type="module">`.
   - Acquire 2D/WebGL context from `<canvas id="simCanvas">`.
   - Import monads/classes from relative transpiled paths (e.g., `import { EarthPOD, bootstrapMegaPod } from '../../../dist/src/earth_pod.js';` or `import { ... } from '../../../dist/src/...';`).
   - Run a 60FPS `requestAnimationFrame` or `setInterval` render loop drawing:
     a) Planetary orbits, H3 hexagonal grid cells, or biome spatial nodes.
     b) Particle streams representing directional carbon/water/energy fluxes.
     c) Status color overlays for thermodynamic states (steady, perturbed, degrading).
   - Periodically update `#sprint-telemetry` / `#telemetry-content` with live stock values, exergy destruction rate, and simulation tick numbers.
   - Bind event listeners for `#btn-pause`, `#btn-step`, `#btn-reset`, search input, and interactive control toggles.
3. CONTAINER & LAYOUT IMMUTABILITY:
   - `#topbar`, `#controls`, `#sprint-telemetry`, and `<canvas id="simCanvas">` MUST exist and be fully styled.
4. STRICT RELATIVE IMPORTS:
   - Always use `../../dist/...` relative imports. ONLY import exported symbols from `src/`.
Format output using:
### FILE: docs/sprints/sprint_N/index.html
```html
<!-- Complete Interactive HTML/CSS/JS Code -->
```
""",

    "DOCUMENTALIST": """
You are the Technical Writer & Open-Source Community Lead.
Your responsibility:
1. Write comprehensive Sprint Release Notes strictly in `docs/sprints/sprint_N/03_RELEASE_NOTES.md`.
2. NEVER output or modify root `README.md` under any circumstances.
3. Summarize all backend, UI, test, and architectural modifications into structured release notes adhering to GitHub Docs best practices.
Format output using:
### FILE: docs/sprints/sprint_N/03_RELEASE_NOTES.md
```md
<!-- Release Notes -->
```
""",
    "THERMODYNAMIC_AUDITOR": """
You are the Lead QA Thermodynamic Auditor.
Your responsibility:
1. Perform thermodynamic static audit on updated TypeScript source code.
2. Verify mass balance equations (delta Stock = 0) and exergy bounds.
3. Save audit report to docs/sprints/sprint_N/04_AUDIT.md.
Format output using:
### FILE: docs/sprints/sprint_N/04_AUDIT.md
```md
<!-- Audit Report -->
```
""",
"LEDGER_ARCHITECT": """
You are the Database, UML & Thermodynamic Blockchain Architect for WebOfLife.
Your responsibility:
1. Maintain relational/time-series SQL schemas (db/schema.sql) and UML diagram definitions (db/uml/).
2. Model thermodynamic stock transactions ($\Delta \text\{Stock\} = \text\{In\} - \text\{Out\}$) as sequential cryptographic blocks ("Vortex Blocks") chaining Earth, POD, and Monad state snapshots.
3. Ensure exact alignment between TypeScript monads in src/ and database schemas.
Format output using:
### FILE: db/schema.sql
```sql
-- Updated Schema & Ledger Definitions
```
""",
"RESEARCH_OUTREACH": """
You are the Lead Scientific Communications & Academic Outreach Agent for WebOfLife.
Your responsibility:

Review the sprint RFC, methods spec, and code changes.

Draft an academic-grade research summary and LaTeX abstract formatted for submission to complexity science and climate modeling preprints (e.g., arXiv / Nature Climate Change commentary).

Frame the sprint accomplishments in terms of thermodynamics, exergy dissipation, and systems ecology.
Format output using:

### FILE: docs/sprints/sprint_N/05_ACADEMIC_PREPRINT.md
<!-- LaTeX Abstract & Research Summary That can be displayed in Markdown Github-->
""",

"SCIENTIFIC_STORYTELLER": """
You are the Chief Storyteller & Media Strategist for WebOfLife.
Your responsibility:

Translate complex mathematical and software engineering breakthroughs into viral, compelling technical narratives.

Write an engaging X/Twitter thread (10-12 tweets with emojis and code snippets) and a LinkedIn research spotlight post.

Focus on why this sprint brings humanity closer to a computable, real-time planetary simulation.
Format output using:

### FILE: docs/sprints/sprint_N/06_VIRAL_STORYTELLING.md
```md
<!-- Social Media & Viral Research Thread -->
```
""",

"DEVREL_COMMUNITY": """
You are the Head of Developer Relations & Open-Source Community Growth.
Your responsibility:

Write a developer-focused onboarding guide for the new sprint features.

Identify "Good First Issues" and extension points for external contributors wanting to build new monads or WebGL shaders.

Draft a GitHub Discussions announcement inviting developers to test the live WebGL/H3 simulation.
Format output using:

### FILE: docs/sprints/sprint_N/07_COMMUNITY_GUIDE.md
```md
<!-- DevRel Onboarding & Contributor Guide -->
```
"""
}

# ─────────────────────────────────────────────────────────────────────────────
# Resilient API Call Handler
# ─────────────────────────────────────────────────────────────────────────────

def call_agent(persona_key: str, prompt: str, max_retries: int = 5, initial_delay: float = 6.0) -> str:
    """Unified AI Agent invocation routing across Gemini, Hugging Face API, and Local Qwen."""
    current_calls = check_and_increment_quota()
    print(f"   📊 [Quota Tracker] Call {current_calls}/{MAX_DAILY_CALLS} today")
    delay = initial_delay
    system_instruction = PERSONAS.get(persona_key, PERSONAS["LEAD_ARCHITECT"])
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
    """Launches headless Playwright Chrome to capture red console errors and uncaught page exceptions."""
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
                    errors.append(f"Console Error: {msg.text}")
                elif msg.type == "warning":
                    warnings.append(f"Console Warning: {msg.text}")

            def handle_pageerror(err):
                errors.append(f"Page Uncaught Exception: {err.message}\n{err.stack}")

            page.on("console", handle_console)
            page.on("pageerror", handle_pageerror)

            page.goto(f"file://{html_file.resolve()}", wait_until="networkidle", timeout=12000)
            page.wait_for_timeout(2000)
            browser.close()
    except Exception as e:
        print(f"   ⚠️ Playwright browser inspection notice: {e}")

    return errors, warnings

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

        Analyze what is missing to make this a realistic, production-grade Planetary Monad Engine.
        Output bulleted feature proposals.
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
                src_context += f"\n// File: {rel_p}\n" + f.read_text(encoding="utf-8")[:1000] + "\n..."

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

        CRITICAL AUDIT INSTRUCTION:
        Compare every `[x]` checked item in `BACKLOG.md` against `ACTUAL REPOSITORY FILE TREE` and `ACTUAL IMPLEMENTED SOURCE CODE`.
        - If `BACKLOG.md` claims an item like `(src/biosphere/...)` or `(src/technosphere/...)` is completed `[x]`, BUT that folder or file DOES NOT EXIST in `ACTUAL REPOSITORY FILE TREE`, YOU MUST UNCHECK IT TO `[ ]`.
        - Do NOT hallucinate that files exist if they are not listed in `ACTUAL REPOSITORY FILE TREE`.
        - Select the highest-priority unchecked `[ ]` item as the new `SPRINT_GOAL`.
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
                ts_code_summary += f"\n// File: src/{f.name}\n" + f.read_text(encoding="utf-8")[:1500] + "\n..."
        eng_prompt = f"""
        SPRINT GOAL: {sprint_goal}
        RFC SPEC:
        {rfc_text}
        METHODS SPEC:
        {methods_text}

        EXISTING CODE HEADERS:
        {ts_code_summary}

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

            # 1. Invoke Debugger Agent for Root Cause Analysis
            print("   🔍 Invoking Debugger Agent to diagnose root cause...")
            debug_prompt = f"""
            VERIFICATION FAILURE (Exit Code {code}):

            ERROR LOGS & STACK TRACE:
            {output}

            REPOSITORY MAP:
            {get_repository_summary()}

            Diagnose the exact root cause and provide direct file patches using `### FILE: path` syntax.
            """
            debug_res = call_agent("DEBUGGER_ENGINEER", debug_prompt)
            apply_multifile_response(debug_res, fallback_filename="src/earth_pod.ts")

            # 2. Test if Debugger patch solved the problem immediately
            code, output = run_typecheck_and_tests()
            if code == 0:
                print("   ✨ Debugger Agent successfully resolved the issue!")
                break

            # 3. If still failing, feed Debugger diagnosis + error log to Backend Engineer
            print("   💻 Re-prompting Backend Engineer with Debugger analysis...")
            fix_prompt = f"""
            Verification failed with error code {code}:

            DEBUGGER DIAGNOSIS & PATCH ATTEMPT:
            {debug_res}

            CURRENT ERRORS:
            {output}

            Fix all remaining type errors and failing assertions. Output complete updated files using `### FILE: path` syntax.
            """
            fix_res = call_agent("BACKEND_ENGINEER", fix_prompt)
            apply_multifile_response(fix_res, fallback_filename="src/earth_pod.ts")
            code, output = run_typecheck_and_tests()

        if code != 0:
            print("   ❌ Verification failed after retries. Rolling back sprint changes...")
            restore_sprint_backups()
            return False

        print("   ✅ TypeScript compilation clean & all unit tests passed!")

        # Step 6: UI Engineering Target -> docs/sprints/sprint_00N/index.html
        print("🎨 [6/7] UI Engineer: Updating Frontend Visualizations...")
        
        # Determine previous baseline HTML to enforce non-regression
        prev_sprint_num = sprint_num - 1
        if prev_sprint_num >= 1:
            prev_html_path = REPO_ROOT / f"docs/sprints/sprint_{prev_sprint_num:03d}/index.html"
        else:
            prev_html_path = REPO_ROOT / "index.original.html"
            
        old_html = prev_html_path.read_text(encoding="utf-8") if prev_html_path.exists() else ""
        sprint_html_path = f"{sprint_folder_rel}/index.html"

        # Collect current sprint source code for UI context
        sprint_src_code = ""
        src_dir = REPO_ROOT / "src"
        if src_dir.exists():
            for f in src_dir.glob("*.ts"):
                sprint_src_code += f"\n// File: src/{f.name}\n" + f.read_text(encoding="utf-8")[:1200] + "\n..."

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

        VISUAL ENHANCEMENT GUIDELINES:
        1. Render Visual Canvas Layers:
           - Draw H3 Hexagonal Grid Meshes using `canvas.getContext('2d')` or Canvas path loops if spatial monads exist.
           - Draw directional energy/matter flux vectors or particle animations between nodes.
        2. Telemetry HUD Cards:
           - Add fixed overlay panels (e.g. `#sprint-telemetry`) rendering real-time First/Second Law metrics, exergy destruction rate, or ingestion throughput.
        3. Interactive Control Buttons:
           - Append new button/toggle elements into `#controls` (e.g. `<button id="toggleH3Grid">H3 Grid: OFF</button>`).
        4. DOM Inspector Fields:
           - Update `showInspector()` to format newly introduced monad attributes and methods.

        CRITICAL CONSTRAINTS:
        - Relative Imports: Always import transpiled JS via `../../dist/...` (e.g., `import { ... } from '../../dist/earth_pod.js';`) so pages load properly under GitHub Pages subfolders.
        - Strict Additive Non-Regression: Retain ALL existing `#topbar`, `#controls`, `#inspector`, styles, and buttons.
        Output complete file strictly using `### FILE: {sprint_html_path}` syntax.
        """
        ui_res = call_agent("UI_ENGINEER", ui_prompt)
        apply_multifile_response(ui_res, fallback_filename=sprint_html_path)

        target_file = REPO_ROOT / sprint_html_path
        new_html = target_file.read_text(encoding="utf-8") if target_file.exists() else ""
        is_valid_ui, ui_msg = verify_ui_non_regression(old_html, new_html)

        if not is_valid_ui:
            print(f"   ⚠️ {ui_msg}")
            print("   🔧 Forcing UI Engineer retry with strict non-regression prompt...")
            retry_ui_prompt = f"{ui_prompt}\n\nREJECTION ERROR: {ui_msg}. You must re-include ALL previous HTML/CSS/JS lines and append new features."
            ui_res_retry = call_agent("UI_ENGINEER", retry_ui_prompt)
            apply_multifile_response(ui_res_retry, fallback_filename=sprint_html_path)

        print(f"   ✓ Generated Sprint UI Visualization: {sprint_html_path}")

        # Step 6.1: Chrome Headless Red Error Inspection & Self-Healing Loop
        print("   🌐 Inspecting Sprint UI in Headless Chrome for Red Console Errors...")
        console_errors, _ = run_browser_console_check(sprint_html_path)

        if console_errors:
            print(f"   🚨 Detected {len(console_errors)} red browser console error(s)!")
            for err in console_errors[:3]:
                print(f"      - {err[:150]}")

            print("   🔍 Invoking Browser Console Debugger Agent...")
            console_debug_prompt = f"""
            BROWSER CONSOLE VERIFICATION FAILURE:
            The generated Sprint UI (`{sprint_html_path}`) produced the following red console errors in Chrome:

            {chr(10).join(console_errors)}

            CURRENT SPRINT HTML:
            {new_html[:3000]}

            REPOSITORY SUMMARY:
            {get_repository_summary()}

            Diagnose the root cause (e.g., bad relative imports, missing export names) and provide direct file patches for `src/` or `{sprint_html_path}`.
            """
            console_debug_res = call_agent("BROWSER_CONSOLE_DEBUGGER", console_debug_prompt)
            apply_multifile_response(console_debug_res, fallback_filename=sprint_html_path)

            # Re-compile TypeScript if backend source files were patched
            run_typecheck_and_tests()
        else:
            print("   ✅ Browser console clean: Zero red errors detected.")

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

        Update SQL schemas in `db/schema.sql` to capture new monad stocks, flows, and blockchain block transaction signatures.
        Output strictly using `### FILE: db/schema.sql` syntax.
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

        Synthesize this sprint into public research outreach artifacts.
        """
        
        academic_res = call_agent("RESEARCH_OUTREACH", marketing_prompt)
        apply_multifile_response(academic_res, fallback_filename=f"{sprint_folder_rel}/05_ACADEMIC_PREPRINT.md")

        story_res = call_agent("SCIENTIFIC_STORYTELLER", marketing_prompt)
        apply_multifile_response(story_res, fallback_filename=f"{sprint_folder_rel}/06_VIRAL_STORYTELLING.md")

        devrel_res = call_agent("DEVREL_COMMUNITY", marketing_prompt)
        apply_multifile_response(devrel_res, fallback_filename=f"{sprint_folder_rel}/07_COMMUNITY_GUIDE.md")

        # Mark Sprint as Successfully Released
        increment_sprint_num(sprint_goal)
        clear_backups()
        print(f"🎉 SPRINT {sprint_num:03d} SUCCESSFULLY RELEASED & AUDITED!")
        return True

    except Exception as e:
        print(f"⛔ Unexpected error during Sprint {sprint_num:03d}: {e}")
        restore_sprint_backups()
        return False

# ─────────────────────────────────────────────────────────────────────────────
# Execution Main Loop
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="WebOfLife Start-Up Sprint Orchestrator")
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
    args = parser.parse_args()

    if args.wipe:
        wipe_all_sprint_data()
        sys.exit(0)

    init_provider(args.provider, custom_model=args.model)

    ensure_tsconfig()
    ensure_main_ts_imports()
    ensure_baseline_html()

    if args.cleanup:
        cleanup_outreach_artifacts()

    validate_and_backfill_sprint_artifacts()
    validate_and_repair_sprint_uis()

    print("================================────────────────────────")
    print(f"🌍 WebOfLife Agile Start-Up Orchestrator [{SELECTED_MODEL}] ({SELECTED_PROVIDER.upper()})")
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
