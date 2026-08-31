# Open V01.03: Layered Bloom

## Question
How can the same hand-opening gesture produce a more spatial and layered generative form?

## Change from V01
V01.00 uses individual radial lines. V01.03 translates the same open-palm study into overlapping organic contours inspired by topographic forms, petals, growth rings and garden landscapes.

## Interaction
The initial prototype included a Mouse Mode in which horizontal mouse movement controlled the unfolding process.

It also used `M` to switch between Mouse and HandPose input. This was useful while developing the layered form, but it added an unnecessary choice to the finished experience. In the current refinement, selecting **Begin** starts the camera directly and the openness of one palm controls the expansion. `P` changes the hand display and `?` opens the field guide. This version has no public reset key because the live contour field does not store an archive.

## Design intention
This version explores depth through repetition, transparency and subtle irregularity. The form does not represent a literal flower but suggests an unfolding biological structure.

## Technical experiment
- Early lazy loading of the HandPose model
- Early mouse and camera input switching
- Refined camera-first exhibition flow with no public input-mode toggle
- Layered contour generation
- Perlin noise distortion
- Smoothed input using interpolation

## What to observe
- Does the layered form feel more spatial than V01?
- Is the transition between closed and open states smooth?
- Did removing Mouse Mode make the public interaction clearer while retaining its usefulness as an early development tool?
- Does the hand gesture remain understandable without literal flower imagery?

## Next development
Test a version where the contour layers do not share one centre, creating a less symmetrical and more landscape-like composition.
