# Both Hands V05.03: Pressed Herbarium

## Question

Can up to fifteen complete two-hand stretches become a spatial herbarium page whose material qualities preserve the pace of each gesture?

## Change from V05.02

V05.03 replaces the contour-and-star archive with up to fifteen independent pressed botanical specimens. It keeps V05.00's gesture-quality data, but replaces its circular anchor layout with the final two-hand midpoint mapped directly onto the full rectangular page.

## Interaction

Begin with both hands close together. Open slowly, pause if desired, then return both hands together at the page position where the specimen should be pressed. Continue until the page reaches fifteen specimens.

`P` cycles the hand display through **Points → Skeleton → Hidden**. `R` clears the specimen page. `?` opens the field guide.

## Data mapping

- Final midpoint between the two index fingertips → specimen position across the page
- Open-palm pause → leaf count
- Movement steadiness → leaf-vein clarity
- Signed hand tilt → specimen rotation
- Full gesture duration → number of dry fibres

## Material behaviour

Each new specimen begins darker, slightly translucent and subtly restless. Over roughly fifteen seconds it loses motion, shifts from olive green toward faded sage, develops ochre-brown edges and becomes visually fixed. A narrow flat scanner band passes over only the newest specimen; there are no spatial glows or halos.

## Palette

- Herbarium paper — `#D2C9B3`
- Dried olive — `#586348`
- Deep veins — `#2F3B2E`
- Withered edge — `#84674A`
- Faded sage — `#8C9780`
- Number stamp — `#88483D`

## Session structure

- A page can hold up to fifteen complete open-pause-return gesture records.
- Specimen numbers preserve chronology without connecting the specimens into a path.
- The target exhibition viewport is a fullscreen `1920×1080` display.
- During the final return, the last twelve valid two-hand midpoint samples are retained and their median provides a stable landing point.
- If one hand disappears from tracking at the instant of overlap, the last valid midpoint is preserved instead of falling back to the screen centre.
- The normalized final midpoint is converted directly back to the matching screen coordinate and only clamped at the visible specimen boundary.
- Polar angle, radius, elliptical aspect, positional tilt and record sequence do not affect placement.
- Movement slowness and record number therefore do not constrain where a specimen can land.
- On the target `1920×1080` display, specimen anchors can occupy the full safe rectangle from approximately `(116, 160)` to `(1804, 912)` while otherwise matching the final hand midpoint one-to-one.
- Specimen scale remains fixed so the pause-to-leaf-count relationship stays visually legible.
- Overlap remains possible only when the participant repeats approximately the same spatial midpoint.
