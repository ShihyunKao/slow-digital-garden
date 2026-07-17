# Both Hands V08: Session Archive Spatial

## Question

Can repeated two-hand stretches accumulate into a personal visual archive of one movement session?

## Change from V07

V07 derives anchor direction from a combination of temporal and qualitative movement data. V08 separates direction from those qualities: anchor direction now records where the two-hand stretch takes place in camera space, while slowness remains responsible only for distance from the centre. This makes the left and right halves of the archive directly accessible through bodily position.

## Interaction

Begin with both hands close together. Open slowly, pause, then return to the centre. During movement, a scanning arc shows which archive layer is being sampled. Repeat eight times. Each cycle fixes one contour closer to the centre and extends the chronological body path. After the eighth movement, the complete data-driven signature is revealed.

Selecting **Begin** starts the camera. `P` cycles hand visibility between hidden, points and skeleton. `R` clears the archive and begins a new session. `?` opens the help screen.

## Session structure

- Stretch 1 records the outer contour and its quality anchor.
- Each following stretch records a smaller inner contour.
- Movement quality affects contour continuity, brightness, tilt and the local cluster of stars.
- Anchor direction records the average midpoint between both index fingers while the stretch is widely open. This is the position of the whole two-hand gesture, not either hand individually. Shifting both hands together towards the left, right, top or bottom places the anchor in the corresponding direction around its contour.
- Anchor distance records slowness, anchor size records the pause, anchor brightness records steadiness, and the number of surrounding stars records the full stretch duration.
- These four mappings are stated in the help screen's Visual Key so the artwork can retain its restrained visual language without adding permanent labels to the main canvas.
- The anchor points connect only in chronological order from movement 1 to movement 8.
- Stretch 8 transforms the accumulated contours into one completed body-map signature.

## Design intention

The final image is not a stack of eight independent results. It is one topographic and constellation-like record of repetition, pace, pauses and bodily variation across a short session. The live scanning arc, fixed contours and cross-layer signature distinguish the archive from V05's individual quality rings.

## Technical experiment

- Camera-only two-hand tracking
- Reliable open-pause-return cycle detection
- Eight-stage session state
- Cached contour geometry for smooth performance
- A live scanning arc for the current archive layer
- Data-driven anchor placement and local star clusters
- A help-screen Visual Key explaining the four principal data mappings
- Chronological constellation path and final body-map signature

## What to observe

- Is it clear which stretch number the participant is completing?
- Does each ring feel like an addition to one accumulating archive?
- Does the completed star map feel personally shaped by the session?

## Next development

Test whether eight movements is an appropriate session length and whether the completed archive should be saved as an image for documentation or participation.
