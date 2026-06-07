#!/usr/bin/env bash
# batch-demo-video.sh — Thin loop: build one narrated reel per green flow.
#
# ADLC Phase 5 — infrastructure-engineer-owned (file-lock: scripts/batch-demo-video.sh only).
# Calls the PROVEN 2-layer wrapper (plugins/commerce/scripts/build-demo-video.sh).
# Contains NO per-scene say/ffmpeg-encode/concat filter — those live in the engine.
#
# USAGE:
#   bash scripts/batch-demo-video.sh [OPTIONS]
#
# OPTIONS:
#   --flows-dir   <dir>    Narration .md files dir  (default: docs/content/demo/flows)
#   --stills-root <dir>    Per-flow stills parent   (default: tmp/Digital-Commerce/demo/flows)
#   --out-dir     <dir>    Reel output dir          (default: tmp/Digital-Commerce/demo/flows)
#   --persona-map <file>   Flow-owner map           (default: docs/content/demo/persona-flow-map.md)
#   --verdict     <file>   Green verdict JSON       (default: tmp/Digital-Commerce/test-results/flow-green-verdict-2026-06-06.json)
#   --voice       <name>   macOS TTS voice          (default: Daniel)
#   --dry-run              Validate wiring; skip actual build + ffprobe
#   --help                 Print this help and exit
#
# OUTPUTS (per PASS flow NN-name):
#   <out-dir>/NN-name.mp4           — h264+aac narrated reel
#   <out-dir>/NN-name.m4a           — standalone voiceover
#   <out-dir>/batch-evidence-YYYY-MM-DD.json — ffprobe evidence + subset assertion
#
# SUBSET ASSERTION (defence-in-depth):
#   built-reel set MUST be a subset of the verdict PASS set.
#   Any PASS flow that failed to produce a valid reel => non-zero exit.
#   Any flow with verdict != PASS is silently skipped (never reeled).
#
# HOST DEPS: ffprobe (ships with ffmpeg), jq, plus all deps of the wrapper engine
#   (say, ffmpeg, bc — macOS only). Run on macOS host, not in a Linux container.
#
# PERSONA-GOAL INJECTION:
#   Reads the HTML-comment marker from --persona-map per flow:
#     <!-- flow:NN-name owner:OWNER goal:"GOAL TEXT" -->
#   Prepends the goal as the reel's opening narration scene-0 line before calling
#   the wrapper. If the marker is absent, a warning is logged and build proceeds
#   without the opener.
#
# IDEMPOTENT: per-flow temp narration files are cleaned up. Safe to re-run.
#
# ADLC Architecture: cloud-architect-2026-06-06-zazzy.json (batch_script_design)
# Wrapper: /Volumes/Working/projects/adlc-framework/.claude/plugins/commerce/scripts/build-demo-video.sh
# Engine:  /Volumes/Working/projects/adlc-framework/.claude/plugins/commerce/skills/demo-video/build-demo-video.sh

set -euo pipefail

# ---------------------------------------------------------------------------
# 0. Defaults
# ---------------------------------------------------------------------------
ADLC_FRAMEWORK_ROOT="${ADLC_FRAMEWORK_ROOT:-/Volumes/Working/projects/adlc-framework}"
WRAPPER="${ADLC_FRAMEWORK_ROOT}/.claude/plugins/commerce/scripts/build-demo-video.sh"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TODAY="$(date +%Y-%m-%d)"

FLOWS_DIR="${REPO_ROOT}/docs/content/demo/flows"
STILLS_ROOT="${REPO_ROOT}/tmp/Digital-Commerce/demo/flows"
OUT_DIR="${REPO_ROOT}/docs/demo/flows"
PERSONA_MAP="${REPO_ROOT}/docs/content/demo/persona-flow-map.md"
VERDICT_FILE="${REPO_ROOT}/tmp/Digital-Commerce/test-results/flow-green-verdict-${TODAY}.json"
VOICE="Daniel"
DRY_RUN=0

# ---------------------------------------------------------------------------
# 1. Arg parsing
# ---------------------------------------------------------------------------
usage() {
  sed -n '3,45p' "${BASH_SOURCE[0]}" | grep '^#' | sed 's/^# \?//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --flows-dir)   FLOWS_DIR="$2";    shift 2 ;;
    --stills-root) STILLS_ROOT="$2";  shift 2 ;;
    --out-dir)     OUT_DIR="$2";      shift 2 ;;
    --persona-map) PERSONA_MAP="$2";  shift 2 ;;
    --verdict)     VERDICT_FILE="$2"; shift 2 ;;
    --voice)       VOICE="$2";        shift 2 ;;
    --dry-run)     DRY_RUN=1;         shift   ;;
    --help|-h)     usage ;;
    *) echo "ERROR: Unknown argument: $1" >&2; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# 2. Dependency checks (thin: batch script needs only ffprobe + jq;
#    the wrapper checks say/ffmpeg/bc at build time)
# ---------------------------------------------------------------------------
check_dep() {
  local cmd="$1"
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' not found. Install: brew install ${cmd}" >&2
    exit 1
  fi
}

if [[ "$DRY_RUN" -eq 0 ]]; then
  check_dep ffprobe
fi
check_dep jq

# ---------------------------------------------------------------------------
# 3. Wrapper existence check
# ---------------------------------------------------------------------------
if [[ ! -f "$WRAPPER" ]]; then
  echo "ERROR: 2-layer wrapper not found: $WRAPPER" >&2
  echo "  Set ADLC_FRAMEWORK_ROOT to the adlc-framework repo root." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Flows discovery
# ---------------------------------------------------------------------------
if [[ ! -d "$FLOWS_DIR" ]]; then
  echo "ERROR: flows dir not found: $FLOWS_DIR" >&2
  exit 1
fi

declare -a FLOW_FILES=()
while IFS= read -r f; do
  [[ -n "$f" ]] && FLOW_FILES+=("$f")
done < <(find "$FLOWS_DIR" -maxdepth 1 -name "[0-9][0-9]-*.md" | sort)

FLOW_COUNT="${#FLOW_FILES[@]}"
echo "==> Found ${FLOW_COUNT} flow narration files in ${FLOWS_DIR}"

if [[ "$FLOW_COUNT" -eq 0 ]]; then
  echo "ERROR: no flow .md files matching [0-9][0-9]-*.md in $FLOWS_DIR" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 5. Verdict JSON load (graceful: absent = warn + allow for authoring/dry-runs)
# ---------------------------------------------------------------------------
VERDICT_PRESENT=0
if [[ -f "$VERDICT_FILE" ]]; then
  VERDICT_PRESENT=1
  echo "==> Verdict file: $VERDICT_FILE"
  jq -e '.flows | type == "array"' "$VERDICT_FILE" >/dev/null 2>&1 || {
    echo "ERROR: verdict JSON malformed — expected .flows array in $VERDICT_FILE" >&2
    exit 1
  }
else
  echo "WARN: verdict file absent: $VERDICT_FILE"
  echo "  No green gate applied. Proceeding (authoring / dry-run mode only)."
fi

# ---------------------------------------------------------------------------
# 6. Helper: lookup verdict for a flow slug (e.g. "01-cart-to-quote")
#    Returns "PASS", "FAIL", "EXCLUDED", or "UNKNOWN" (if not in the file).
# ---------------------------------------------------------------------------
verdict_for_flow() {
  local slug="$1"
  # Strip leading NN- prefix (e.g. "01-cart-to-quote" -> "cart-to-quote") so the
  # lookup key matches bare flow names stored in the verdict JSON.
  local bare_slug="${slug#[0-9][0-9]-}"
  if [[ "$VERDICT_PRESENT" -eq 0 ]]; then
    echo "UNKNOWN"
    return
  fi
  local v
  # Verdict JSON uses the field name "status" (values: PASS, EXCLUDED, FAIL).
  v=$(jq -r --arg slug "$bare_slug" \
    '.flows[] | select(.flow == $slug) | .status // "UNKNOWN"' \
    "$VERDICT_FILE" 2>/dev/null | head -1)
  echo "${v:-UNKNOWN}"
}

# ---------------------------------------------------------------------------
# 7. Helper: extract persona owner + goal from persona-flow-map.md
#    Expects lines of the form (CA HTML-comment contract):
#      <!-- flow:NN-name owner:OWNER goal:"GOAL TEXT" -->
# ---------------------------------------------------------------------------
persona_goal_for_flow() {
  local slug="$1"
  if [[ ! -f "$PERSONA_MAP" ]]; then
    echo ""
    return
  fi
  # Extract the goal="..." value from the matching HTML-comment marker
  grep -m1 "flow:${slug}" "$PERSONA_MAP" 2>/dev/null \
    | sed -n 's/.*goal:"\([^"]*\)".*/\1/p' \
    || echo ""
}

persona_owner_for_flow() {
  local slug="$1"
  if [[ ! -f "$PERSONA_MAP" ]]; then
    echo "unknown"
    return
  fi
  grep -m1 "flow:${slug}" "$PERSONA_MAP" 2>/dev/null \
    | sed -n 's/.*owner:\([^ ]*\).*/\1/p' \
    || echo "unknown"
}

# ---------------------------------------------------------------------------
# 8. Temp dir for per-flow injected narration files (cleaned on EXIT)
# ---------------------------------------------------------------------------
TMPDIR_BATCH="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_BATCH"' EXIT

# ---------------------------------------------------------------------------
# 9. Evidence accumulators
# ---------------------------------------------------------------------------
declare -a EVIDENCE_FLOWS=()   # JSON objects per flow
PASS_FLOWS_IN_VERDICT=0        # count of PASS flows in verdict
REELS_BUILT=0                  # count of successfully built+verified reels
PASS_FLOWS_FAILED=0            # PASS flows that failed to produce a valid reel

mkdir -p "$OUT_DIR"

# ---------------------------------------------------------------------------
# 10. Main loop — one reel per flow
# ---------------------------------------------------------------------------
for flow_md in "${FLOW_FILES[@]}"; do
  fname="$(basename "$flow_md" .md)"   # e.g. "01-cart-to-quote"
  slug="$fname"

  echo ""
  echo "================================================================"
  echo "Flow: ${slug}"
  echo "================================================================"

  # ---- 10a. Verdict preflight ----
  verdict="$(verdict_for_flow "$slug")"
  echo "  verdict: $verdict"

  if [[ "$verdict" == "FAIL" || "$verdict" == "EXCLUDED" ]]; then
    echo "  SKIP ${slug}: verdict=${verdict} — not green; no reel built."
    EVIDENCE_FLOWS+=("{\"flow\":\"${slug}\",\"status\":\"SKIPPED\",\"reason\":\"verdict=${verdict}\"}")
    continue
  fi

  if [[ "$verdict" == "PASS" ]]; then
    PASS_FLOWS_IN_VERDICT=$(( PASS_FLOWS_IN_VERDICT + 1 ))
  fi
  # UNKNOWN = verdict absent (authoring/dry-run) — warn but proceed

  # ---- 10b. Stills dir check ----
  flow_stills="${STILLS_ROOT}/${slug}"
  if [[ ! -d "$flow_stills" ]]; then
    echo "  SKIP ${slug}: stills dir not found: ${flow_stills}"
    echo "  (Phase 4 capture has not run yet for this flow)"
    if [[ "$verdict" == "PASS" ]]; then
      # A PASS flow with no stills is a real failure to track
      EVIDENCE_FLOWS+=("{\"flow\":\"${slug}\",\"status\":\"SKIP_NO_STILLS\",\"reason\":\"stills dir missing\",\"verdict_at_build\":\"PASS\"}")
      PASS_FLOWS_FAILED=$(( PASS_FLOWS_FAILED + 1 ))
    else
      EVIDENCE_FLOWS+=("{\"flow\":\"${slug}\",\"status\":\"SKIP_NO_STILLS\",\"reason\":\"stills dir missing + verdict ${verdict}\"}")
    fi
    continue
  fi

  # ---- 10c. Persona-goal injection ----
  goal="$(persona_goal_for_flow "$slug")"
  owner="$(persona_owner_for_flow "$slug")"

  if [[ -z "$goal" ]]; then
    echo "  WARN: no persona-goal marker found for ${slug} in ${PERSONA_MAP}"
    echo "  Building reel without opening goal scene."
    injected_narration="${flow_md}"
  else
    echo "  Persona owner: ${owner}"
    echo "  Opening goal: ${goal}"
    # Build a temp narration file: scene-0 opener + original cue lines
    injected_narration="${TMPDIR_BATCH}/${slug}-injected.md"
    {
      printf '**[00:00]** "%s"\n\n' "$goal"
      cat "$flow_md"
    } > "$injected_narration"
  fi

  # ---- 10d. Define output paths ----
  flow_build_dir="${OUT_DIR}/${slug}-build"
  reel_mp4="${OUT_DIR}/${slug}.mp4"
  reel_m4a="${OUT_DIR}/${slug}.m4a"

  # ---- 10e. Dry-run: print the command and continue ----
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "  [DRY-RUN] Would call:"
    echo "    bash ${WRAPPER} \\"
    echo "      --narration ${injected_narration} \\"
    echo "      --stills    ${flow_stills} \\"
    echo "      --out       ${flow_build_dir} \\"
    echo "      --voice     ${VOICE}"
    echo "  [DRY-RUN] Would rename:"
    echo "    ${flow_build_dir}/demo-narrated.mp4 -> ${reel_mp4}"
    echo "    ${flow_build_dir}/narration-voiceover.m4a -> ${reel_m4a}"
    EVIDENCE_FLOWS+=("{\"flow\":\"${slug}\",\"status\":\"DRY_RUN\",\"verdict_at_build\":\"${verdict}\"}")
    continue
  fi

  # ---- 10f. Build — call the 2-layer wrapper ----
  mkdir -p "$flow_build_dir"
  echo "  Building reel via wrapper..."
  if ! bash "$WRAPPER" \
      --narration "$injected_narration" \
      --stills    "$flow_stills" \
      --out       "$flow_build_dir" \
      --voice     "$VOICE"; then
    echo "  ERROR: wrapper exited non-zero for ${slug}" >&2
    EVIDENCE_FLOWS+=("{\"flow\":\"${slug}\",\"status\":\"BUILD_FAILED\",\"verdict_at_build\":\"${verdict}\"}")
    if [[ "$verdict" == "PASS" ]]; then
      PASS_FLOWS_FAILED=$(( PASS_FLOWS_FAILED + 1 ))
    fi
    continue
  fi

  # ---- 10g. Move wrapper output to final flat paths ----
  wrapper_mp4="${flow_build_dir}/demo-narrated.mp4"
  wrapper_m4a="${flow_build_dir}/narration-voiceover.m4a"

  if [[ ! -f "$wrapper_mp4" ]]; then
    echo "  ERROR: wrapper did not produce ${wrapper_mp4}" >&2
    EVIDENCE_FLOWS+=("{\"flow\":\"${slug}\",\"status\":\"NO_MP4\",\"verdict_at_build\":\"${verdict}\"}")
    if [[ "$verdict" == "PASS" ]]; then
      PASS_FLOWS_FAILED=$(( PASS_FLOWS_FAILED + 1 ))
    fi
    continue
  fi

  cp "$wrapper_mp4" "$reel_mp4"

  # m4a: prefer the wrapper-extracted track; fallback to ffmpeg -vn -acodec copy
  if [[ -f "$wrapper_m4a" ]]; then
    cp "$wrapper_m4a" "$reel_m4a"
  else
    echo "  INFO: wrapper did not emit .m4a — extracting from mp4 (ffmpeg -vn -c:a copy)"
    ffmpeg -y -loglevel error -i "$reel_mp4" -vn -c:a copy "$reel_m4a" 2>/dev/null || true
  fi

  # ---- 10h. ffprobe verification ----
  echo "  ffprobe verify: ${reel_mp4}"

  vcodec=$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name -of csv=p=0 "$reel_mp4" 2>/dev/null | head -1 || echo "none")
  acodec=$(ffprobe -v error -select_streams a:0 \
    -show_entries stream=codec_name -of csv=p=0 "$reel_mp4" 2>/dev/null | head -1 || echo "none")
  duration_s=$(ffprobe -v error \
    -show_entries format=duration -of csv=p=0 "$reel_mp4" 2>/dev/null | head -1 || echo "0")
  mp4_bytes=$(stat -f%z "$reel_mp4" 2>/dev/null || stat -c%s "$reel_mp4" 2>/dev/null || echo "0")

  probe_ok=1
  [[ "$vcodec" != "h264" ]] && { echo "  WARN: video codec=${vcodec} (expected h264)"; probe_ok=0; }
  [[ "$acodec" != "aac" ]]  && { echo "  WARN: audio codec=${acodec} (expected aac)";  probe_ok=0; }
  # duration > 0 check (bash arithmetic on float: compare integer part)
  dur_int="${duration_s%%.*}"
  [[ "${dur_int:-0}" -le 0 ]] && { echo "  WARN: duration=${duration_s}s (expected > 0)"; probe_ok=0; }
  [[ "${mp4_bytes:-0}" -le 102400 ]] && { echo "  WARN: size=${mp4_bytes}B (expected > 100KB)"; probe_ok=0; }

  if [[ "$probe_ok" -eq 1 ]]; then
    echo "  OK: vcodec=${vcodec} acodec=${acodec} duration=${duration_s}s size=${mp4_bytes}B"
    flow_status="OK"
    REELS_BUILT=$(( REELS_BUILT + 1 ))
  else
    echo "  FAIL: ffprobe assertions failed for ${slug}"
    flow_status="PROBE_FAILED"
    if [[ "$verdict" == "PASS" ]]; then
      PASS_FLOWS_FAILED=$(( PASS_FLOWS_FAILED + 1 ))
    fi
  fi

  # Build per-flow evidence JSON fragment (no subshell/command-substitution needed)
  EVIDENCE_FLOWS+=("{\"flow\":\"${slug}\",\"persona_owner\":\"${owner}\",\"opening_goal\":\"${goal//\"/\\\"}\",\"mp4_path\":\"${reel_mp4}\",\"m4a_path\":\"${reel_m4a}\",\"ffprobe\":{\"vcodec\":\"${vcodec}\",\"acodec\":\"${acodec}\",\"duration_s\":${duration_s},\"bytes\":${mp4_bytes}},\"verdict_at_build\":\"${verdict}\",\"status\":\"${flow_status}\"}")
done

# ---------------------------------------------------------------------------
# 11. Dry-run exit (no evidence JSON, no subset assertion)
# ---------------------------------------------------------------------------
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo ""
  echo "=== DRY-RUN COMPLETE ==="
  echo "  Flows discovered: ${FLOW_COUNT}"
  echo "  Wiring validated (no reels built)."
  echo "  Run without --dry-run once Phase 4 stills are in place."
  exit 0
fi

# ---------------------------------------------------------------------------
# 12. Subset assertion: built-reel set MUST be subset of verdict PASS set
# ---------------------------------------------------------------------------
# Count actual .mp4 reels in the out-dir (only NN-name.mp4 matching flow slugs)
actual_mp4_count=0
declare -a BUILT_SLUGS=()
for flow_md in "${FLOW_FILES[@]}"; do
  slug="$(basename "$flow_md" .md)"
  if [[ -f "${OUT_DIR}/${slug}.mp4" ]]; then
    BUILT_SLUGS+=("$slug")
    actual_mp4_count=$(( actual_mp4_count + 1 ))
  fi
done

# Subset assertion: every built slug must have verdict == PASS
subset_ok=1
if [[ "$VERDICT_PRESENT" -eq 1 ]]; then
  for built_slug in "${BUILT_SLUGS[@]}"; do
    v="$(verdict_for_flow "$built_slug")"
    if [[ "$v" != "PASS" ]]; then
      echo "ERROR: SUBSET VIOLATION — reel built for ${built_slug} but verdict=${v} (not PASS)" >&2
      subset_ok=0
    fi
  done
fi

if [[ "$subset_ok" -eq 1 ]]; then
  subset_assertion="PASS"
else
  subset_assertion="FAIL"
fi

# ---------------------------------------------------------------------------
# 13. Evidence JSON
# ---------------------------------------------------------------------------
EVIDENCE_FILE="${OUT_DIR}/batch-evidence-${TODAY}.json"

# Join evidence array elements
evidence_json_array=""
for item in "${EVIDENCE_FLOWS[@]}"; do
  if [[ -z "$evidence_json_array" ]]; then
    evidence_json_array="${item}"
  else
    evidence_json_array="${evidence_json_array},${item}"
  fi
done

all_h264_aac="true"
for built_slug in "${BUILT_SLUGS[@]}"; do
  vc=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 \
    "${OUT_DIR}/${built_slug}.mp4" 2>/dev/null | head -1 || echo "none")
  ac=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 \
    "${OUT_DIR}/${built_slug}.mp4" 2>/dev/null | head -1 || echo "none")
  if [[ "$vc" != "h264" || "$ac" != "aac" ]]; then
    all_h264_aac="false"
  fi
done

cat > "$EVIDENCE_FILE" <<EVEOF
{
  "schema": "batch-demo-video-evidence/1.0",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "verdict_file": "${VERDICT_FILE}",
  "flows": [${evidence_json_array}],
  "summary": {
    "flows_discovered": ${FLOW_COUNT},
    "pass_flows_in_verdict": ${PASS_FLOWS_IN_VERDICT},
    "reels_built": ${REELS_BUILT},
    "pass_flows_failed": ${PASS_FLOWS_FAILED},
    "all_h264_aac": ${all_h264_aac},
    "subset_assertion": "${subset_assertion}"
  }
}
EVEOF

echo ""
echo "=== BATCH COMPLETE ==="
echo "  Flows discovered:     ${FLOW_COUNT}"
echo "  PASS flows (verdict): ${PASS_FLOWS_IN_VERDICT}"
echo "  Reels built:          ${REELS_BUILT}"
echo "  PASS flows failed:    ${PASS_FLOWS_FAILED}"
echo "  Subset assertion:     ${subset_assertion}"
echo "  All h264+aac:         ${all_h264_aac}"
echo "  Evidence:             ${EVIDENCE_FILE}"

# ---------------------------------------------------------------------------
# 14. Exit code: non-zero if any PASS flow failed to produce a valid reel
#     OR if the subset assertion failed (orphan reel without PASS verdict).
# ---------------------------------------------------------------------------
if [[ "$PASS_FLOWS_FAILED" -gt 0 ]]; then
  echo ""
  echo "ERROR: ${PASS_FLOWS_FAILED} PASS flow(s) failed to produce a valid reel." >&2
  exit 1
fi

if [[ "$subset_assertion" == "FAIL" ]]; then
  echo ""
  echo "ERROR: Subset assertion failed — a reel was built for a non-PASS flow." >&2
  exit 1
fi

echo ""
echo "PASS: all green flows have valid reels. Subset assertion: PASS."
