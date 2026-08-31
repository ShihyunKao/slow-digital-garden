# Trail V02.00: Soft Ink Wash

## Question
Can slow hand movement produce a soft diffusion trace that continues to expand after the gesture?

## Change from V01
V01 released small flow-field streams from the fingertip. V02 keeps the idea of movement as trace, but translates each movement into a pale ink-like bloom that diffuses and fades on a light paper field.

## Interaction
Select **Begin** to activate the camera. The index finger becomes the source of the diffusion trace. Slow movement releases larger, softer blooms; the wash continues to expand after the hand has passed.

`P` cycles hand visibility between points, skeleton and hidden. `R` clears the drawing. `?` opens the help screen.

## Design intention
This sketch explores the hand not as a cursor, but as a slow drawing instrument. The trace is intentionally unstable and semi-transparent, closer to ink, silk, smoke or soft plant fibre.

## Technical experiment
- Camera-only index-finger tracking
- Soft diffusion layers on a light paper field
- Alpha fading and irregular edges
- Speed-sensitive bloom scale
- Help screen and hand-display modes

## What to observe
- Does slower movement create a more refined trace?
- Does the ribbon feel like a record of bodily movement?
- Is the fading too fast or too slow?
- Does this visual language feel more mature than V01?

## Next development
Test a version where multiple previous movements remain as a permanent garden archive rather than fading away.

## Reflection
This version tested a different visual direction for the trail movement. I tried moving away from direct line drawing toward ink diffusion, silk-like traces and ripple-field disturbance.

The experiments showed that simulating ink or atmospheric traces in p5.js can easily become visually messy, too graphic, or too similar to drawing with a pen. The most useful insight is that the trail movement may need a clearer visual system, rather than only changing surface texture.

For the next version, I want to explore a more designed and structured visual language, such as:
- slow-growing contour gardens
- layered botanical paths
- soft architectural lines
- traces that accumulate into a composed field
