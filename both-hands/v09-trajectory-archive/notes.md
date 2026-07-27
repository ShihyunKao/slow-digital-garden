# Both Hands V09: Trajectory Archive

## Question

Can reducing the visual presence of the circular scaffold make the participant's anchors, stars and chronological movement path more legible?

## Change from V08

V09 preserves V08's camera-space mapping and its eight-stretch session logic. Empty guide circles and completed contours become quieter, while anchor stars, duration clusters, new-memory feedback and the chronological trajectory become brighter and more distinct. The fixed scanning arc is replaced by a progressively revealed preview of the final stability contour.

## Interaction

Begin with both hands close together. Open slowly towards the sides of the camera frame. During movement, the current contour gradually reveals itself using the same seed and visual rules as the saved result. Its reveal speed is limited, so a quick stretch cannot instantly complete the circle. The bottom status changes between **Open wider** and **Hold to complete**, with a percentage and progress line showing how close the current contour is to completion. Once the contour closes, return the hands to the centre. Repeat eight times to complete the archive.

Selecting **Begin** starts the camera. Hand display begins in **Points** mode. `P` then cycles through **Points → Skeleton → Hidden**. `R` clears the archive and begins a new session. `?` opens the help screen.

## Session structure

- Stretch 1 records the outer contour and its quality anchor.
- Each following stretch records a smaller inner contour.
- Movement quality affects contour continuity, brightness, tilt and the local cluster of stars.
- Anchor direction records the final resting midpoint between both index fingers after the hands return and briefly remain together. The system samples several frames and uses their median position, reducing the influence of single-frame tracking jumps. Holding the joined hands towards the left, right, top or bottom places the anchor in the corresponding direction around its contour.
- When the hands remain stable near full extension, anchor direction uses the median midpoint from the final hold. Opening and returning positions are excluded. If no clear hold is detected, the system falls back to the existing wide-movement average.
- Anchor distance records slowness, anchor size records the pause, anchor brightness records steadiness, and the number of surrounding stars records the full stretch duration.
- These four mappings are stated in the help screen's Visual Key so the artwork can retain its restrained visual language without adding permanent labels to the main canvas.
- The anchor points connect only in chronological order from movement 1 to movement 8.
- Stretch 8 transforms the accumulated contours into one completed body-map signature.
- Guide circles remain as a very faint spatial reference, but no longer compete with the recorded movement data.
- The live contour uses the same noise field, break pattern and stability mapping as the saved contour.
- Its appearance evolves as the running measurements of movement speed and steadiness become more complete.
- Full contour completion requires both sufficient hand separation and enough time for the path to reveal.
- A live percentage and progress line communicate the required opening range and hold time.
- A second hold percentage confirms when the final resting midpoint has been captured.

## Design intention

The final image is not a stack of eight independent rings. The circular scaffold acts only as a quiet support; the participant's anchor positions, local star clusters and chronological path form the primary image. This hierarchy makes the archive feel more like a movement drawing and less like a diagram of predetermined circles.

## Technical experiment

- Camera-only two-hand tracking
- Reliable open-pause-return cycle detection
- Eight-stage session state
- Cached contour geometry for smooth performance
- A progressively revealed live preview of the final stability contour
- Shared noise seed and stability mapping between live and saved paths
- Data-driven anchor placement and local star clusters
- Subdued guide circles and stored contours
- Two-pass luminous chronological trajectory
- Stronger anchor hierarchy and new-memory confirmation
- A help-screen Visual Key explaining the four principal data mappings
- Chronological constellation path and final body-map signature

## What to observe

- Is it clear which stretch number the participant is completing?
- Do the guide circles recede behind the recorded data?
- Are new anchors and the chronological path immediately visible?
- Does the completed star map feel personally shaped by the session?

## Next development

Compare V08 and V09 with participants to see whether the quieter scaffold improves legibility without losing the sense of an eight-stage session.
