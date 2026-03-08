#!/bin/bash
# Generate voiceover segments for the vault demo using macOS TTS, then merge with video.

set -e
cd "$(dirname "$0")/.."

VOICE="Samantha"
RATE=175
OUTDIR="/tmp/complr-vault-voiceover"
mkdir -p "$OUTDIR"

echo "Generating voiceover segments..."

# Segment 1: Opening (0:00 - Strategies tab visible)
say -v "$VOICE" -r $RATE -o "$OUTDIR/01-intro.aiff" \
  "This is Complr Vault, a regulated yield platform with compliance built into every transaction. Three vault strategies offer tokenized treasury yield across BlackRock BUIDL, Ondo U.S.D.Y., Hashnote U.S.Y.C., and Maker s.DAI. Each vault shows live A.P.Y., risk rating, and asset composition. The Growth vault is restricted to accredited investors only."

# Segment 2: Portfolio tab (~6s in)
say -v "$VOICE" -r $RATE -o "$OUTDIR/02-portfolio.aiff" \
  "The portfolio view shows an investor's total value, cost basis, and yield earned across all vaults. The allocation pie chart breaks down holdings by vault. Below, a detailed table shows per-vault shares, unrealized gains, and yield. We can generate a monthly investor report with one click, complete with compliance certification and jurisdiction specific tax summary."

# Segment 3: Performance tab (~30s in)
say -v "$VOICE" -r $RATE -o "$OUTDIR/03-performance.aiff" \
  "The performance tab shows 90-day N.A.V. charts for each vault. We can switch between strategies and time periods. The annualized A.P.Y. is calculated from actual N.A.V. history, not projections."

# Segment 4: Deposit / Withdraw (~45s in)
say -v "$VOICE" -r $RATE -o "$OUTDIR/04-deposit.aiff" \
  "Before any deposit, the platform checks investor eligibility. K.Y.C. must be approved, sanctions must be cleared, and accredited status is verified for the Growth vault. Here we deposit 15,000 U.S.D.C. into the Balanced vault. Shares are issued at the current N.A.V."

# Segment 5: Investor Onboarding (~55s in)
say -v "$VOICE" -r $RATE -o "$OUTDIR/05-onboarding.aiff" \
  "The onboarding flow handles investor registration and compliance screening. We register a new investor, select their jurisdiction, and indicate accredited status. Then we run K.Y.C. and sanctions screening through the same Complr compliance engine that powers the S.D.K. The screening checks the investor against F.S.A. regulations in real time using A.I. The investor table updates with screening results, risk ratings, and compliance status."

# Segment 6: Closing
say -v "$VOICE" -r $RATE -o "$OUTDIR/06-closing.aiff" \
  "Complr Vault. Compliance embedded yield, built for Asia's regulated crypto economy. Every deposit screened, every investor verified, every jurisdiction covered."

echo "Converting to wav..."
for f in "$OUTDIR"/*.aiff; do
  ffmpeg -y -i "$f" -ar 44100 -ac 1 "${f%.aiff}.wav" 2>/dev/null
done

echo ""
echo "Segment durations:"
for f in "$OUTDIR"/*.wav; do
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  echo "  $(basename "$f"): ${dur}s"
done

# Video timeline (approx from recording script):
#   0:00 - 6s   : Strategies tab (3s pause + scroll + scroll back)
#   ~6s  - 30s  : Portfolio tab (select investor, view, scroll, generate report, scroll)
#   ~30s - 45s  : Performance tab (conservative, balanced 30d, growth)
#   ~45s - 55s  : Deposit/Withdraw tab (deposit $15k, scroll)
#   ~55s - 81s  : Onboarding tab (register, scroll, screen via LLM, scroll)

echo ""
echo "Building combined audio track..."

# Create silence segments
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 0.5 "$OUTDIR/silence_05s.wav" 2>/dev/null
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 1.0 "$OUTDIR/silence_1s.wav" 2>/dev/null
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 2.0 "$OUTDIR/silence_2s.wav" 2>/dev/null
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 3.0 "$OUTDIR/silence_3s.wav" 2>/dev/null

# Build concat list
cat > "$OUTDIR/concat.txt" << 'CONCAT'
file 'silence_05s.wav'
file '01-intro.wav'
file 'silence_2s.wav'
file '02-portfolio.wav'
file 'silence_2s.wav'
file '03-performance.wav'
file 'silence_2s.wav'
file '04-deposit.wav'
file 'silence_2s.wav'
file '05-onboarding.wav'
file 'silence_1s.wav'
file '06-closing.wav'
file 'silence_2s.wav'
CONCAT

ffmpeg -y -f concat -safe 0 -i "$OUTDIR/concat.txt" -c:a pcm_s16le "$OUTDIR/voiceover.wav" 2>/dev/null

VO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTDIR/voiceover.wav")
echo "Voiceover total duration: ${VO_DUR}s"

# Merge voiceover with video
echo ""
echo "Merging voiceover with video..."

VIDEO="vault-demo-recording.webm"
OUTPUT="vault-demo-with-voiceover.mp4"

ffmpeg -y \
  -i "$VIDEO" \
  -i "$OUTDIR/voiceover.wav" \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 128k \
  -shortest \
  -movflags +faststart \
  "$OUTPUT" 2>/dev/null

echo ""
echo "Done! Output: $(pwd)/$OUTPUT"
ls -lh "$OUTPUT"
