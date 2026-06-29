# Open V02: Layered Bloom

## Question
How can the same hand-opening gesture produce a more spatial and layered generative form?

## Change from V01
V01 used individual radial lines. V02 replaces these lines with overlapping organic contours inspired by topographic forms, petals, growth rings and garden landscapes.

## Interaction
In Mouse Mode, horizontal mouse movement controls the unfolding process.

Pressing M activates HandPose Mode. The openness of one palm then controls the expansion of the layered form. Pressing M again closes the camera and returns to Mouse Mode.

## Design intention
This version explores depth through repetition, transparency and subtle irregularity. The form does not represent a literal flower but suggests an unfolding biological structure.

## Technical experiment
- Lazy loading of the HandPose model
- Mouse and camera input switching
- Layered contour generation
- Perlin noise distortion
- Smoothed input using interpolation

## What to observe
- Does the layered form feel more spatial than V01?
- Is the transition between closed and open states smooth?
- Does Mouse Mode make visual experimentation easier?
- Does the hand gesture remain understandable without literal flower imagery?

## Next development
Test a version where the contour layers do not share one centre, creating a less symmetrical and more landscape-like composition.