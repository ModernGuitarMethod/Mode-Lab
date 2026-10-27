#!/usr/bin/env bash
# HARD RULE guard (Dale): on every displayed 60 fps frame the thumb/palm never go through the neck and no finger goes through the fretboard.
# Serves this folder on a free local port and runs tools/check_frames.py over whole files (default: LW, techniques, full-song.gp5).
# Exit 1 on any penetrating frame or page error. FILES env overrides the file list (comma separated, 'LW' = default song).
set -euo pipefail
D="$(cd "$(dirname "$0")/.." && pwd)"; PORT=$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')
( cd "$D" && exec python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 ) & SP=$!; trap 'kill $SP 2>/dev/null' EXIT; sleep 1
FILES="${FILES:-LW,tests/techniques.gp,tests/fmt/full-song.gp5}"
OUT="${OUT:-/tmp/check-frames-$$.json}"
python3 "$D/tools/check_frames.py" "http://127.0.0.1:$PORT/index.html?rh=0&q=low" "$OUT" "$FILES" || { echo "FRAME GUARD FAIL: see $OUT" >&2; exit 1; }
echo "frame guard OK ($FILES)"
