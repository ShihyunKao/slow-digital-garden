# Open V02.00: Palm Imprint

## Question
Can the opening of one hand leave a temporary visual imprint that records a moment of bodily gesture?

## Change from V01.03
V01.03 explored layered blooming forms. V02 records the hand itself: a fully opened palm leaves a temporary constellation-like imprint, made of fine lines, glow and particles.

## Interaction
The initial prototype included a Mouse Mode in which horizontal mouse movement controlled the opening amount.

It also used `M` to activate HandPose Mode. The refined exhibition flow removes that public input switch: the camera starts through **Begin**, a fully opened palm leaves an imprint, and relaxing the hand rearms the system so the next opening can leave another trace.

Pressing `P` cycles through **Points → Skeleton → Hidden**. Pressing `R` clears the memory traces. Pressing `?` opens the field guide.

## Design intention
This sketch treats the palm as a source of a trace rather than a cursor. The imprint records a short-lived state of the body and fades gradually into the surrounding field.

## Technical experiment
- Scale-independent one-hand openness detection
- Early mouse fallback used during development, followed by a camera-first public flow
- Smooth interpolation
- Gesture threshold detection
- Full-screen presentation
- Hand display modes
- Temporary palm-memory traces

## What to observe
- Does opening the palm reliably create an imprint at different camera distances?
- Is the hand trace understandable without constant instruction text?
- Does the full-screen composition make the particle imprint and its fading memory more legible?

## Tutor-feedback refinement
The tutor could see the visual effect but could not create a trail with their hand. The original version used fixed pixel distances to estimate openness, which varied too much with camera distance. It now uses fingertip distance relative to palm width, making the trigger more robust.

The public `M` toggle was later removed as a second exhibition refinement. Starting directly from **Begin** reduces setup decisions and keeps the visitor focused on the palm-opening gesture.
