# Open V03: Palm Imprint

## Question
Can the opening of one hand leave a temporary visual imprint that records a moment of bodily gesture?

## Change from V02
V02 explored layered blooming forms. V03 records the hand itself: a fully opened palm leaves a temporary constellation-like imprint, made of fine lines, glow and particles.

## Interaction
In Mouse Mode, horizontal mouse movement controls the opening amount.

Pressing M activates HandPose Mode. A fully opened palm leaves an imprint. Relaxing the hand rearms the system, so the next opening can leave another trace.

Pressing P cycles through hidden, point and skeleton hand displays. Pressing R clears the memory traces. Pressing ? opens the help screen.

## Design intention
This sketch treats the palm as a source of a trace rather than a cursor. The imprint records a short-lived state of the body and fades gradually into the surrounding field.

## Technical experiment
- Scale-independent one-hand openness detection
- Mouse fallback mode
- Smooth interpolation
- Gesture threshold detection
- Full-screen presentation
- Hand display modes
- Temporary palm-memory traces

## What to observe
- Does opening the palm reliably create an imprint at different camera distances?
- Is the hand trace understandable without constant instruction text?
- Does the full-screen composition make the particle trail more legible?

## Tutor-feedback refinement
The tutor could see the visual effect but could not create a trail with their hand. The original version used fixed pixel distances to estimate openness, which varied too much with camera distance. It now uses fingertip distance relative to palm width, making the trigger more robust.
