# Open V03.00: Held Imprint

## Question
Can a sustained open-palm gesture make a hand-based trace more reliable and intentional without adding unnecessary steps?

## Change from V02
V02 triggered an imprint as soon as a fixed hand-open threshold was crossed. An early V03 experiment introduced manual calibration, but testing showed that the extra step did not create a meaningful experience for the visitor. The current **Held Imprint** refinement removes that calibration while keeping the scale-independent hand measurement and instead asks for a sustained open palm. An initial held-palm test used about 0.3 seconds; the current refinement requires 48 consecutive frames—approximately 0.8 seconds at 60 fps—before an imprint is created. The longer hold makes the action more deliberate and gives the progress ring enough time to communicate what is happening.

## Interaction

1. Select **Begin** to enter the camera-based live field. The earlier `M` camera/mouse toggle was removed to simplify the exhibition flow.
2. Relax the hand, then open the palm slowly.
3. Hold the palm until the small ring around the wrist closes.
4. Relax again before making the next imprint.

## Keys

- `P`: cycle **Points → Skeleton → Hidden**
- `R`: clear imprints
- `?`: open or close the field guide

## Testing focus

- Does the visual progress ring make the required short pause understandable?
- Does the gesture feel deliberate rather than delayed?
- Does it still fail when the palm is strongly side-on or leaves the camera frame?
