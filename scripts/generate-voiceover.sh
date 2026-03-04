#!/bin/bash
# Generate voiceover segments using macOS TTS, then merge with demo video.

set -e
cd "$(dirname "$0")/.."

VOICE="Samantha"
RATE=180
OUTDIR="/tmp/complr-voiceover"
mkdir -p "$OUTDIR"

echo "Generating voiceover segments..."

# Segment 1: Opening (0:00 - plays over initial landing page view)
say -v "$VOICE" -r $RATE -o "$OUTDIR/01-intro.aiff" \
  "Crypto firms operating across Asia face a compliance nightmare. Three regulators, three languages, three frameworks. Complr is an AI native compliance engine that covers M.A.S., S.F.C., and F.S.A. in a single platform. Let me show you how it works."

# Segment 2: Demo 1 - Regulatory Query (plays when MAS query starts)
say -v "$VOICE" -r $RATE -o "$OUTDIR/02-query.aiff" \
  "First, regulatory intelligence. Ask any compliance question in natural language. Here we're asking about Travel Rule requirements. Complr retrieves the relevant M.A.S. regulation and gives a structured answer. S dollar 1500 threshold, specific originator and beneficiary fields required, penalties up to S dollar 1 million."

# Segment 3: FSA query
say -v "$VOICE" -r $RATE -o "$OUTDIR/03-fsa.aiff" \
  "The same query against Japan's F.S.A. shows a zero threshold, the strictest in the world. Every transaction, regardless of amount, must comply."

# Segment 4: Demo 2 - Transaction Check
say -v "$VOICE" -r $RATE -o "$OUTDIR/04-check.aiff" \
  "Second, multi-jurisdiction compliance checks. A single 25,000 U.S.D.C. transaction is checked against all three regulators simultaneously. Every jurisdiction flags this as requiring action. Travel Rule data must be transmitted, the recipient's basic K.Y.C. is insufficient, and Japan requires the exchange to hold the transaction until data is exchanged. This would take a compliance team hours manually. Complr does it in seconds."

# Segment 5: Demo 3 - SAR/STR
say -v "$VOICE" -r $RATE -o "$OUTDIR/05-report.aiff" \
  "Third, automatic report generation. This 98,500 U.S.D.C. transaction has five red flags including possible structuring and mixer wallet connections. Complr drafts a complete F.S.A. Suspicious Transaction Report in seconds, not hours. The narrative references specific transaction I.D.s, amounts, and risk factors. Ready for a compliance officer to review and submit."

# Segment 6: Demo 4 - Obligations
say -v "$VOICE" -r $RATE -o "$OUTDIR/06-obligations.aiff" \
  "Finally, when new regulations are published, Complr extracts every compliance obligation automatically. From Hong Kong's Stablecoins Ordinance, it identifies 14 obligations. Capital requirements, reserve backing, redemption rights, governance. Each with specific thresholds, penalties, and suggested internal controls."

# Segment 7: Closing
say -v "$VOICE" -r $RATE -o "$OUTDIR/07-closing.aiff" \
  "Complr. AI native compliance for Asia's crypto markets. M.A.S., S.F.C., F.S.A. One platform, real time."

echo "Converting to wav..."
for f in "$OUTDIR"/*.aiff; do
  ffmpeg -y -i "$f" -ar 44100 -ac 1 "${f%.aiff}.wav" 2>/dev/null
done

# Get durations of each segment
echo ""
echo "Segment durations:"
for f in "$OUTDIR"/*.wav; do
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  echo "  $(basename "$f"): ${dur}s"
done

# Build the combined audio track with silence padding to align with video
# Video timeline (approx from recording script sleep timings):
#   0:00 - 2s   : Landing page shown
#   ~2s          : Click Ask (MAS query)
#   ~15s         : MAS result appears, 3s pause, scroll, 2s pause
#   ~30s         : FSA query starts
#   ~45s         : FSA result, scroll
#   ~55s         : Switch to Transaction Check tab
#   ~58s         : Click Check
#   ~75s         : Results appear, scroll
#   ~90s         : Switch to SAR/STR tab
#   ~93s         : Click Generate
#   ~108s        : Report appears, scroll
#   ~118s        : Switch to Obligations tab
#   ~121s        : Click Extract
#   ~135s        : Results appear, scroll, end

echo ""
echo "Building combined audio track..."

# Use ffmpeg to concatenate with silence gaps
# Create silence segments
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 1.0 "$OUTDIR/silence_1s.wav" 2>/dev/null
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 2.0 "$OUTDIR/silence_2s.wav" 2>/dev/null
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 3.0 "$OUTDIR/silence_3s.wav" 2>/dev/null
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 5.0 "$OUTDIR/silence_5s.wav" 2>/dev/null

# Build concat list
cat > "$OUTDIR/concat.txt" << 'CONCAT'
file 'silence_1s.wav'
file '01-intro.wav'
file 'silence_3s.wav'
file '02-query.wav'
file 'silence_5s.wav'
file '03-fsa.wav'
file 'silence_5s.wav'
file '04-check.wav'
file 'silence_5s.wav'
file '05-report.wav'
file 'silence_5s.wav'
file '06-obligations.wav'
file 'silence_3s.wav'
file '07-closing.wav'
file 'silence_2s.wav'
CONCAT

ffmpeg -y -f concat -safe 0 -i "$OUTDIR/concat.txt" -c:a pcm_s16le "$OUTDIR/voiceover.wav" 2>/dev/null

VO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTDIR/voiceover.wav")
echo "Voiceover total duration: ${VO_DUR}s"

# Merge voiceover with video
echo ""
echo "Merging voiceover with video..."

VIDEO="demo-recording.webm"
OUTPUT="demo-with-voiceover.mp4"

# Pad or trim audio to match video length, then merge
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
