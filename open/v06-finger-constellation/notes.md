# Open V06: Finger Constellation

## Question

Can the spatial relationship between five fingertips turn an open hand into a temporary constellation?

## Change from V05

V05 translated an opening palm into a soft pressure field. V06 records the geometry of the gesture itself. It uses the distances between the five fingertips to create a small constellation without drawing the palm outline.

## Interaction

Open one hand. Five fingertip positions become five stars connected through a distance-based network. Adjust the open hand until the constellation feels right, then hold it briefly until the stars brighten and the pose is locked. Closing the hand confirms and preserves that locked arrangement; closing movement is not included in the saved shape. Each saved constellation remains in the session archive and older impressions gently separate instead of being covered by the newest one.

Selecting **Begin** starts the camera; this version has no mouse interaction. `P` cycles the technical hand display between hidden, point and skeleton. `R` clears the constellation archive. `?` opens the help screen.

## Design intention

This sketch treats the hand as a temporary spatial arrangement rather than as a drawing tool. Each imprint records a different moment: position, scale, finger spacing and orientation.

## Technical experiment

- Scale-independent palm openness measurement
- Five fingertip tracking
- Distance-based minimum spanning tree
- One-shot gesture threshold with rearming
- Layered translucent constellation memories

## What to observe

- Does each constellation retain a sense of the originating gesture?
- Are the five stars readable without showing the full hand?
- Does the accumulation feel like a bodily archive rather than a decorative star field?

## Next development

Test whether steadiness or the duration of the open gesture should affect the brightness and lifetime of each constellation.
