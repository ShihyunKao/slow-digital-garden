(() => {
  const projects = {
    open: {
      number: "01",
      breadcrumb: "OPEN",
      title: "OPEN",
      subtitle: "a hand unfolds into a field",
      field: "open",
      versions: [
        {
          code: "v01", displayCode: "v01.00", path: "v01-unfolding-form", title: "Unfolding Form",
          statement: "An open palm turns a compact centre into fine, radiating traces. This first study follows unfolding as a slow bodily gesture.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Unfold", "Show one hand and open your palm slowly."], ["Allow", "Let the radiating form unfold with your hand."]],
          meaning: ["gesture / open palm", "field / radiating traces", "pace / slow unfolding"],
          variants: [
            {
              code: "v01-carbon", displayCode: "v01.01", path: "v01-unfolding-form/variants/v01.01", title: "Carbon Veil",
              variantStyle: "carbon-veil",
              statement: "The original radiating field gathers through repeated open-palm gestures, slowly imprinting rough warm graphite into a softly fibrous paper surface.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Unfold", "Show one hand and open your palm slowly."], ["Imprint", "Hold and repeat the opening gesture to deepen the radiating trace."]],
              meaning: ["gesture / repeated open palm", "material / rough graphite", "rhythm / slow accumulation"]
            },
            {
              code: "v01-luminous", displayCode: "v01.02", path: "v01-unfolding-form/variants/v01.02", title: "Luminous Aperture",
              variantStyle: "luminous-aperture",
              statement: "The open-palm field becomes a cold luminous aperture, carrying high-contrast radial lines through a deep blue atmosphere.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Unfold", "Show one hand and open your palm slowly."], ["Illuminate", "Let the cold radiating aperture expand with your hand."]],
              meaning: ["gesture / open palm", "light / edge glow", "contrast / cold radiance"]
            },
            {
              code: "v01-layered", displayCode: "v01.03", path: "v01-unfolding-form/variants/v01.03", title: "Layered Bloom",
              variantStyle: "red-strata",
              statement: "An opening palm unfolds a layered contour field. A small movement becomes a slow, shifting expansion.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Open", "Show one hand and open your palm slowly."], ["Gather", "Open and close to unfold and gather the contour field."]],
              meaning: ["gesture / open palm", "contours / layered field", "motion / expand + gather"]
            },
            {
              code: "v01-topographic", displayCode: "v01.04", path: "v01-unfolding-form/variants/v01.04", title: "Topographic Tissue",
              variantStyle: "topographic-tissue",
              statement: "The original layered palm field becomes an off-centre vertical tissue section, unfolding as fibrous paper contours with delayed depth.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Unfold", "Open one hand slowly to separate the paper-like contour layers."], ["Settle", "Close the hand and let the delayed layers gather into one compact section."]],
              meaning: ["gesture / open palm", "material / fibrous paper", "rhythm / staggered settling", "composition / vertical section"]
            },
            {
              code: "v01-phase", displayCode: "v01.05", path: "v01-unfolding-form/variants/v01.05", title: "Phase Bloom",
              variantStyle: "phase-bloom",
              statement: "The layered palm field becomes a fan of refractive membranes whose delayed expansion produces interference, moiré and chromatic phase echoes.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Phase", "Open one hand slowly to release the transparent membrane layers."], ["Echo", "Close the hand and watch each delayed phase gather into the dark centre."]],
              meaning: ["gesture / open palm", "material / refractive film", "rhythm / delayed phase echoes", "composition / diagonal fan"]
            }
          ]
        },
        {
          code: "v02", displayCode: "v02.00", path: "v02-palm-imprint", title: "Palm Imprint",
          statement: "Each fully opened palm leaves a temporary constellation-like imprint.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Open", "Show one hand and open your palm slowly."], ["Imprint", "Relax, then open again to leave another imprint."]],
          meaning: ["gesture / open palm", "points / constellation", "memory / temporary imprint"],
          variants: [
            {
              code: "v02-dust-negative", displayCode: "v02.01", path: "v02-palm-imprint/variants/v02.01", title: "Dust Negative",
              variantStyle: "dust-negative",
              statement: "A fully opened palm displaces a field of charcoal dust, leaving a temporary memory made from absent space rather than illuminated points.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Displace", "Open one hand fully to push the dust away from its silhouette."], ["Refill", "Relax, then watch the dust settle and slowly return before making another imprint."]],
              meaning: ["gesture / open palm", "material / charcoal dust", "memory / negative space", "light / low side illumination"]
            },
            {
              code: "v02-cyanotype", displayCode: "v02.02", path: "v02-palm-imprint/variants/v02.02", title: "Cyanotype Exposure",
              variantStyle: "cyanotype-exposure",
              statement: "Each fully opened palm becomes a cyanotype specimen. Camera distance sets the handprint scale—nearer hands expose larger samples, while farther hands remain compact—and pale particles slowly develop inside each frame before washing back into Prussian blue.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Expose", "Open one hand fully. Move nearer for a larger specimen or farther away for a more compact exposure."], ["Develop", "Watch the particle handprint emerge inside the frame, hold, then wash away."]],
              meaning: ["gesture / open palm", "distance / photographic scale", "material / photosensitive paper", "rhythm / expose + develop + wash", "memory / overlapping specimens"]
            }
          ]
        },
        {
          code: "v03", displayCode: "v03.00", path: "v03-calibrated-imprint", title: "Held Imprint",
          statement: "A briefly held open palm leaves a deliberate, temporary constellation-like imprint.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Open", "Relax your hand, then open your palm slowly."], ["Hold", "Hold until the small ring closes to leave an imprint."]],
          meaning: ["gesture / held palm", "time / closing ring", "memory / deliberate imprint"],
          variants: [
            {
              code: "v03-embossed-seal", displayCode: "v03.01", path: "v03-calibrated-imprint/variants/v03.01", title: "Embossed Seal",
              variantStyle: "embossed-seal",
              statement: "A held open palm slowly presses into warm archival paper. The depression deepens as the timer closes, then fixes at once as an embossed seal in a regular specimen grid.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Press", "Hold one palm open while the paper depression grows deeper."], ["Seal", "Complete the hold to lock the relief into the next archive grid cell."]],
              meaning: ["gesture / held palm", "material / embossed paper", "depth / timed pressure", "composition / archive grid"]
            },
            {
              code: "v03-thermal-plate", displayCode: "v03.02", path: "v03-calibrated-imprint/variants/v03.02", title: "Thermal Plate",
              variantStyle: "thermal-plate",
              statement: "A held open palm accumulates heat from dark red through amber to a brief white-hot centre. The completed thermal trace remains where the hand appeared and cools slowly in place.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Heat", "Hold one palm open and watch its internal temperature rise."], ["Cool", "Complete the hold to preserve the trace at its real position as it slowly cools."]],
              meaning: ["gesture / held palm", "time / accumulated heat", "material / thermal plate", "memory / cooling in place"]
            }
          ]
        },
        {
          code: "v04", displayCode: "v04.00", path: "v04-pressure-bloom", title: "Pressure Bloom",
          statement: "An opening palm becomes a soft pressure field. Each release leaves a circular memory that slowly dissipates.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Press", "Open one palm slowly to create a pressure field."], ["Release", "Close, then open again to leave another memory."]],
          meaning: ["gesture / opening palm", "field / soft pressure", "memory / slow release"],
          variants: [
            {
              code: "v04-liquid-lens", displayCode: "v04.01", path: "v04-pressure-bloom/variants/v04.01", title: "Liquid Lens",
              variantStyle: "liquid-lens",
              statement: "An opening palm stretches a transparent oil-water membrane with refractive depth. Each released lens rebounds slowly, while overlapping pressure memories squeeze and reshape one another.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Stretch", "Open one palm to expand the liquid lens beyond its resting edge."], ["Rebound", "Close, then open again and let the released membranes press, refract and settle together."]],
              meaning: ["gesture / opening palm", "material / liquid membrane", "motion / elastic rebound", "light / local caustics"]
            },
            {
              code: "v04-acoustic-compression", displayCode: "v04.02", path: "v04-pressure-bloom/variants/v04.02", title: "Acoustic Compression",
              variantStyle: "acoustic-compression",
              statement: "An opening palm compresses a monochrome acoustic field. Release sends a directional elliptical wavefront outward; its bright edge darkens, fractures and persists as a granular aftershock.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Compress", "Open one palm to condense the directional pressure slice."], ["Release", "Close, then open again to send a wavefront through flash, fracture and aftershock."]],
              meaning: ["gesture / opening palm", "material / acoustic scan", "rhythm / compression + release", "memory / granular aftershock"]
            }
          ]
        },
        {
          code: "v05", displayCode: "v05.00", path: "v05-finger-constellation", title: "Finger Constellation",
          statement: "Five fingertips become five stars. Each open hand adds a persistent map to an accumulating bodily archive.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Arrange", "Arrange the five stars, then hold until they brighten."], ["Preserve", "Close the hand to preserve the locked constellation."]],
          meaning: ["points / five fingertips", "field / open hand", "light / held brightness", "memory / locked constellation"],
          variants: [
            {
              code: "v05-thread-cartography", displayCode: "v05.01", path: "v05-finger-constellation/variants/v05.01", title: "Thread Cartography",
              variantStyle: "thread-cartography",
              statement: "Five fingertip nodes become a weighted body map of fibre, stitch and tension. Holding the palm draws its threads taut; closing lets them sag slightly before the map fixes at a new archive coordinate.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Tension", "Arrange the five nodes and hold the palm open until the fibres draw taut."], ["Archive", "Close the hand to let the threads settle and preserve the map at its next coordinate."]],
              meaning: ["points / fingertip nodes", "material / fibre + stitch", "tension / held palm", "archive / coordinate map"]
            },
            {
              code: "v05-mineral-archive", displayCode: "v05.02", path: "v05-finger-constellation/variants/v05.02", title: "Mineral Archive",
              variantStyle: "mineral-archive",
              statement: "Five fingertips become mineral growth points. Holding the palm extends crystalline facets and hairline fractures; closing freezes the formation into a vertically ordered geological archive.",
              instructions: [["Begin", "Select Begin and allow access to the camera."], ["Grow", "Arrange the five crystal seeds and hold the palm open as their facets extend."], ["Freeze", "Close the hand to arrest the growth and preserve it in the next vertical stratum."]],
              meaning: ["points / crystal seeds", "material / mineral facets", "time / outward growth", "archive / vertical strata"]
            }
          ]
        }
      ],
      materials: [
        ["gesture", "[MG–01]", "open-gesture", "hand openness", "closed", "open"],
        ["particle bloom", "[PB–01]", "open-bloom", "bloom diffusion", "0", "1"],
        ["aperture memory", "[AM–01]", "open-aperture", "layer depth", "0", "1"]
      ]
    },
    trail: {
      number: "02",
      breadcrumb: "TRAIL",
      title: "TRAIL",
      subtitle: "movement becomes a quiet path",
      field: "trail",
      versions: [
        {
          code: "v01", displayCode: "v01.00", path: "v01-hand-trail", title: "Hand Trail",
          statement: "A moving fingertip releases fine streams that follow an invisible flow field and gradually form a layered drawing.",
          instructions: [["Begin", "Select Begin to activate the camera."], ["Move", "Move one index finger slowly through the space."], ["Follow", "Let the flow field carry each trace onwards."]],
          meaning: ["trace / one finger", "flow / invisible field", "drawing / layered stream"],
          variants: [
            {
              code: "v01-ink-sediment", displayCode: "v01.01", path: "v01-hand-trail/variants/v01.01", title: "Ink Sediment",
              variantStyle: "ink-sediment",
              statement: "The same fingertip path becomes a wet ink deposit, opening into diluted centres, feathered edges and slowly sinking sediment.",
              instructions: [["Begin", "Select Begin to activate the camera."], ["Move", "Move one index finger slowly through the space."], ["Bloom", "Let diluted centres and feathered ink edges open across the paths already drawn."]],
              meaning: ["trace / one finger", "material / wet ink", "memory / sediment layer"]
            },
            {
              code: "v01-electric-drift", displayCode: "v01.02", path: "v01-hand-trail/variants/v01.02", title: "Electric Drift",
              variantStyle: "electric-drift",
              statement: "The fingertip path becomes a cold electric filament, leaving luminous afterimages and small local flickers across the flow field.",
              instructions: [["Begin", "Select Begin to activate the camera."], ["Move", "Move one index finger slowly through the space."], ["Drift", "Let each blue filament trail and flicker along the path."]],
              meaning: ["trace / one finger", "light / cold filament", "motion / luminous afterimage"]
            }
          ]
        },
        {
          code: "v02", displayCode: "v02.00", path: "v02-ink-ribbon", title: "Soft Ink Wash",
          statement: "A slow movement releases a pale wash that continues to diffuse after the hand has passed.",
          instructions: [["Begin", "Select Begin to activate the camera."], ["Move", "Move one index finger slowly through the space."], ["Pause", "Pause and let the soft wash expand."]],
          meaning: ["trace / one finger", "wash / pale diffusion", "pause / continued expansion"],
          variants: [
            {
              code: "v02-fibrous-bleed", displayCode: "v02.01", path: "v02-ink-ribbon/variants/v02.01", title: "Fibrous Bleed",
              variantStyle: "fibrous-bleed",
              statement: "The same soft fingertip trace enters a rough paper field, branching laterally through fibres while its centre slowly loses density.",
              instructions: [["Begin", "Select Begin to activate the camera."], ["Move", "Move one index finger slowly to leave a fine ink line."], ["Bleed", "Pause and let the ink continue spreading across the paper fibres."]],
              meaning: ["trace / one finger", "material / paper fibre", "diffusion / lateral bleed"]
            },
            {
              code: "v02-suspended-vapor", displayCode: "v02.02", path: "v02-ink-ribbon/variants/v02.02", title: "Suspended Vapor",
              variantStyle: "suspended-vapor",
              statement: "The same fingertip trace waits in darkness before swelling into backlit vapour that continues to rise and gather after movement stops.",
              instructions: [["Begin", "Select Begin to activate the camera."], ["Move", "Move one index finger slowly to suspend a fine trace in space."], ["Rise", "Pause and let the delayed vapour swell, overlap and drift upward."]],
              meaning: ["trace / one finger", "material / volumetric vapour", "motion / delayed ascent"]
            }
          ]
        },
        {
          code: "v03", displayCode: "v03.00", path: "v03-path-constellation", title: "Path Constellation",
          statement: "Slow movement deposits a constellation-like record of the path your hand takes through space.",
          instructions: [["Begin", "Select Begin to activate the camera."], ["Move", "Move one index finger slowly through the space."], ["Anchor", "Pause briefly to leave a larger anchor point."]],
          meaning: ["trace / one finger", "points / deposited path", "pause / anchor point"],
          variants: [
            {
              code: "v03-surveyors-map", displayCode: "v03.01", path: "v03-path-constellation/variants/v03.01", title: "Surveyor’s Map",
              variantStyle: "surveyors-map",
              statement: "The same bodily path becomes a printed survey record: measured points connect into an off-centre map while each pause registers a numbered local terrain reading.",
              instructions: [["Begin", "Select Begin to activate the camera."], ["Survey", "Move one index finger to deposit measured points before fine links appear."], ["Record", "Pause to register a numbered marker and its local contour field."]],
              meaning: ["trace / measured point", "connection / survey line", "pause / position record"]
            },
            {
              code: "v03-pulse-relics", displayCode: "v03.02", path: "v03-path-constellation/variants/v03.02", title: "Pulse Relics",
              variantStyle: "pulse-relics",
              statement: "The same dotted bodily path becomes a sparse field of fading signals, while each pause leaves a periodic pulse that grows with continued stillness.",
              instructions: [["Begin", "Select Begin to activate the camera."], ["Signal", "Move one index finger to release brief points and short afterimages."], ["Pulse", "Pause to create a blinking anchor; remain still to enlarge only its visual pulse."]],
              meaning: ["trace / fading signal", "memory / short afterimage", "pause / pulsing relic"]
            }
          ]
        },
        {
          code: "v04", displayCode: "v04.00", path: "v04-slow-orbit-drawing", title: "Slow Orbit Drawing",
          statement: "A movement begins as scattered points. Sustained slowness allows those points to settle into a coherent orbit.",
          instructions: [["Move", "Move one finger slowly through the space."], ["Steady", "Keep a steady pace until the path becomes stable."], ["Preserve", "Pause to preserve the orbit; speed scatters it."]],
          meaning: ["trace / one finger", "pace / sustained slowness", "orbit / coherent path", "pause / preservation"],
          variants: [
            {
              code: "v04-mineral-orbit", displayCode: "v04.01", path: "v04-slow-orbit-drawing/variants/v04.01", title: "Mineral Orbit",
              variantStyle: "mineral-orbit",
              statement: "The same speed-sensitive path gathers graphite fragments into an off-centre crystalline orbit, then preserves the stable ellipse as a mineral specimen.",
              instructions: [["Move", "Move one finger; speed keeps the mineral fragments irregular and dispersed."], ["Crystallise", "Sustain a slow pace while fragments align along a tilted orbit."], ["Preserve", "Pause to freeze the stable mineral specimen; move quickly to fracture it again."]],
              meaning: ["trace / mineral fragment", "pace / crystallisation", "orbit / tilted specimen", "speed / renewed fracture"]
            },
            {
              code: "v04-magnetic-debris", displayCode: "v04.02", path: "v04-slow-orbit-drawing/variants/v04.02", title: "Magnetic Debris",
              variantStyle: "magnetic-debris",
              statement: "The same speed-sensitive path agitates directional metal fragments, then draws them through a slight overshoot into several broken magnetic bands.",
              instructions: [["Agitate", "Move quickly to keep the debris scattered and unstable."], ["Align", "Sustain a slow pace while fragments rotate and settle along the magnetic field."], ["Lock", "Pause to preserve the aligned bands while fine particles continue to orbit outside them."]],
              meaning: ["trace / metal debris", "pace / magnetic alignment", "orbit / broken field bands", "pause / partial lock"]
            }
          ]
        }
      ],
      materials: [
        ["gesture", "[MG–02]", "trail-gesture", "gesture path", "still", "moving"],
        ["trace field", "[TF–02]", "trail-response", "trail persistence", "0", "1"],
        ["path sediment", "[PS–02]", "trail-sediment", "line density", "0", "1"]
      ]
    },
    both: {
      number: "03",
      breadcrumb: "BOTH HANDS",
      title: "BREATHING<br>COSMOS",
      subtitle: "two hands gather a quiet field",
      field: "both",
      versions: [
        {
          code: "v01", displayCode: "v01.00", path: "v01-breathing-garden", title: "Breathing Garden",
          statement: "A two-hand opening gesture grows a live contour field through slow expansion and return.",
          archiveReading: "This first live study saves no traces; its near-closed centre and slow expansion become the basis for later memories.",
          instructions: [["Begin", "Allow the camera and touch index fingertips."], ["Open", "Open both hands slowly to expand the contour field."], ["Return", "Return to the centre and begin another cycle."]],
          meaning: ["distance / index fingertips", "scale / field expansion", "contours / layered response", "return / near-closed centre"],
          variants: [
            {
              code: "v01-woven-canopy", displayCode: "v01.01", path: "v01-breathing-garden/variants/v01.01", title: "Woven Canopy",
              variantStyle: "woven-canopy",
              statement: "The same two-hand distance opens a woven canopy of linen fibres, settling into a soft suspended arch between the hands.",
              archiveReading: "This live variation saves no traces. Expansion passes through delayed fibre layers; the outer weave softens first on return.",
              instructions: [["Begin", "Allow the camera and touch index fingertips."], ["Open", "Open both hands slowly to unfold the woven canopy."], ["Return", "Bring the hands together to let the outer fibres relax first."]],
              meaning: ["distance / index fingertips", "material / linen + fibre", "rhythm / centre-out delay", "light / soft backlit weave"]
            },
            {
              code: "v01-parted-veil", displayCode: "v01.02", path: "v01-breathing-garden/variants/v01.02", title: "Parted Veil",
              variantStyle: "parted-veil",
              statement: "The same two-hand distance parts two translucent veils, turning the dark central interval into the field's primary form.",
              archiveReading: "This live variation saves no traces. Hand distance opens two dim membranes; returning gathers the veils with a soft rebound.",
              instructions: [["Begin", "Allow the camera and touch index fingertips."], ["Part", "Open both hands slowly to draw the two veils apart."], ["Return", "Bring the hands together and let the membrane edges settle softly."]],
              meaning: ["distance / index fingertips", "material / translucent veil", "space / central interval", "light / restrained edge glow"]
            }
          ]
        },
        {
          code: "v02", displayCode: "v02.00", path: "v02-breathing-cosmos", title: "Breathing Cosmos",
          statement: "A two-hand gesture creates a live field of expansion, contraction and return.",
          archiveReading: "This early study does not save individual traces yet. It establishes the live breathing system that later versions turn into memory.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Open", "Open both hands slowly to expand the breathing field."], ["Return", "Return to the centre and begin another cycle."]],
          meaning: ["distance / hands apart", "scale / field expansion", "ripples / breathing contours", "particles / slow orbital drift"],
          variants: [
            {
              code: "v02-mercury-basin", displayCode: "v02.01", path: "v02-breathing-cosmos/variants/v02.01", title: "Mercury Basin",
              variantStyle: "mercury-basin",
              statement: "The live breathing field becomes a low basin of viscous liquid metal, expanding through restrained ripples and moving reflections.",
              archiveReading: "This live variation saves no traces. Hand distance sets the field radius; its metallic surface follows with delayed inertia.",
              instructions: [["Begin", "Allow the camera and bring both hands together."], ["Expand", "Open both hands slowly to widen the metallic basin."], ["Settle", "Pause or return inward and watch the surface continue to echo softly."]],
              meaning: ["distance / hands apart", "material / liquid mercury", "inertia / viscous delay", "light / moving specular arcs"]
            },
            {
              code: "v02-cloud-chamber", displayCode: "v02.02", path: "v02-breathing-cosmos/variants/v02.02", title: "Cloud Chamber",
              variantStyle: "cloud-chamber",
              statement: "The live breathing field becomes an oblique chamber of suspended mist, dust and translucent air drifting through a partial amber beam.",
              archiveReading: "This live variation saves no traces. Hand distance sets the diffusion range; the cloud leaves a brief current on return.",
              instructions: [["Begin", "Allow the camera and bring both hands together."], ["Disperse", "Open both hands slowly to let the cloud drift outward."], ["Linger", "Return inward and watch the remaining air current dissolve."]],
              meaning: ["distance / hands apart", "material / mist + suspended dust", "rhythm / drift + residual current", "light / oblique amber beam"]
            }
          ]
        },
        {
          code: "v03", displayCode: "v03.00", path: "v03-cosmic-memory-refined", title: "Cosmic Memory Refined",
          statement: "A slow two-hand movement leaves a sequence of orbit-like memories.",
          archiveReading: "Each completed stretch becomes one orbit-like memory. Across eight cycles, the archive moves steadily from the outer field towards its centre.",
          instructions: [["Begin", "Move both hands close together."], ["Stretch", "Stretch slowly apart until the field fully opens."], ["Return", "Return to the centre to leave one memory ring."]],
          meaning: ["cycle / wide stretch + return", "radius / outer-to-inner order", "orbits / one memory ring", "stars / surrounding constellation"],
          variants: [
            {
              code: "v03-amber-orbit", displayCode: "v03.01", path: "v03-cosmic-memory-refined/variants/v03.01", title: "Amber Orbit",
              variantStyle: "amber-orbit",
              statement: "Two hands become gravitational sources, gathering tiny gold and dark-red particles into a slowly turning microscopic nebula.",
              archiveReading: "Each completed breath still enters the same eight-step sequence. The memory is held by long-lived orbital particles rather than drawn lines.",
              instructions: [["Begin", "Allow the camera and bring hands together."], ["Emit", "Open both hands to release warm particles at their midpoint."], ["Return", "Return to the centre to preserve one slowly orbiting particle memory."]],
              meaning: ["cycle / wide stretch + return", "source / two-hand gravity", "material / gold + dark-red particles", "memory / long-lived orbital drift"]
            },
            {
              code: "v03-frozen-constellation", displayCode: "v03.02", path: "v03-cosmic-memory-refined/variants/v03.02", title: "Frozen Constellation",
              variantStyle: "frozen-constellation",
              statement: "The same two-hand breath settles into a pale violet field where each completed expansion and return grows a persistent crystalline mesh.",
              archiveReading: "One complete opening fixes a crystal layer; camera distance sets its span.",
              instructions: [["Begin", "Allow the camera and bring hands together."], ["Expand", "Open both hands fully until the violet field expands."], ["Crystallise", "Complete the return to the centre to grow the next geometric connections."]],
              meaning: ["cycle / wide stretch + return", "trigger / completed gesture", "scale / camera proximity", "memory / persistent crystal mesh"]
            },
            {
              code: "v03-lacquer-echo", displayCode: "v03.03", path: "v03-cosmic-memory-refined/variants/v03.03", title: "Lacquer Echo",
              variantStyle: "lacquer-echo",
              statement: "A complete two-hand breath cures one wet contour into a slow archive of offset black-lacquer slices and travelling reflections.",
              archiveReading: "Each full opening and return cures one displaced lacquer layer in the original eight-memory sequence.",
              instructions: [["Begin", "Allow the camera and bring hands together."], ["Flow", "Open both hands fully to widen the slow, wet lacquer field."], ["Cure", "Return to the centre to harden one offset memory slice."]],
              meaning: ["cycle / wide stretch + return", "material / black lacquer + resin", "memory / eight offset cured layers", "light / slow specular sweep"]
            },
            {
              code: "v03-paper-eclipse", displayCode: "v03.04", path: "v03-cosmic-memory-refined/variants/v03.04", title: "Paper Eclipse",
              variantStyle: "paper-eclipse",
              statement: "Eight cut-paper memories reveal, press and settle along a diagonal archive.",
              archiveReading: "Each completed opening and return preserves the original eight-step sequence while one layered paper field compresses into a shallow emboss.",
              instructions: [["Begin", "Allow the camera and bring hands together."], ["Reveal", "Open slowly to uncover the paper sheets one by one."], ["Press", "Return to the centre to emboss and retain one sheet."]],
              meaning: ["cycle / wide stretch + return", "material / embossed paper + cut fibre", "memory / eight diagonal paper discs", "light / low-angle side shadow"]
            }
          ]
        },
        {
          code: "v04", displayCode: "v04.00", path: "v04-breath-quality", title: "Breath Quality",
          statement: "Each complete two-hand movement leaves a ring shaped by its speed, steadiness, balance and pause.",
          archiveReading: "Each completed stretch becomes a ring whose surface reveals the quality of movement.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Open", "Open slowly and pause in the extended position."], ["Return", "Return slowly to create one quality-based memory ring."]],
          meaning: ["completeness / slow + steady", "texture / movement steadiness", "tilt / vertical hand balance", "stars / open-palm pause"],
          variants: [
            {
              code: "v04-seismograph-skin", displayCode: "v04.01", path: "v04-breath-quality/variants/v04.01", title: "Seismograph Skin",
              variantStyle: "seismograph-skin",
              statement: "Twelve horizontal graphite records translate each complete opening-and-return gesture into density, tremor, slope and terminal sediment.",
              archiveReading: "Opening writes left to centre; returning writes centre to right. Only the completed return stores one of twelve bands.",
              instructions: [["Begin", "Allow the camera and bring both hands together at the left edge of the record."], ["Open", "Open slowly as the trace travels from left to centre. Fully open is halfway through the record."], ["Return", "Pause if desired, then bring the hands together. The trace continues from centre to right and is stored only when the full return is complete."]],
              meaning: ["speed / line density", "stability / jitter amplitude", "tilt / record-band slope", "pause / terminal deposit"]
            },
            {
              code: "v04-glass-strain", displayCode: "v04.02", path: "v04-breath-quality/variants/v04.02", title: "Glass Strain",
              variantStyle: "glass-strain",
              statement: "Each complete opening and return fixes one transparent pane whose stress reveals steadiness, tilt and pause.",
              archiveReading: "Fully open is the midpoint; only the return stores a pane. Steadiness, tilt and pause shape its stress pattern.",
              instructions: [["Begin", "Allow the camera and bring both hands together."], ["Stress", "Open slowly. Fully open completes only the first half of the gesture."], ["Fix", "Return the hands together to store the displaced glass pane."]],
              meaning: ["stability / crack branching", "tilt / stress direction", "pause / centre highlight", "cycle / open + return"]
            }
          ]
        },
        {
          code: "v05", displayCode: "v05.00", path: "v05-session-archive-spatial", title: "Session Archive Spatial",
          statement: "Eight gentle stretches record nested contours and connect them into one personal bodily star map.",
          archiveReading: "The midpoint between both index fingers places each anchor; shift the full stretch and the anchor follows.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Shift", "Open slowly and shift the full stretch through space."], ["Complete", "Return and complete eight stretches to reveal the map."]],
          meaning: ["direction / two-hand midpoint", "distance / movement slowness", "size / open-palm pause", "light / steadiness", "stars / stretch duration"],
          variants: [
            {
              code: "v05-session-archive", displayCode: "v05.01", path: "v05-session-archive-spatial/variants/v05.01", title: "Session Archive",
              variantStyle: "session-archive-warm",
              statement: "Eight gentle stretches record nested contours and connect them into one personal bodily star map.",
              archiveReading: "A fixed golden-angle sequence gives the archive its underlying structure; each stretch introduces a subtle bodily variation.",
              instructions: [["Begin", "Allow the camera and bring hands together."], ["Open", "Open slowly, pause, then return to fix one contour."], ["Complete", "Complete eight stretches to reveal your body map."]],
              meaning: ["sequence / golden-angle placement", "tilt / subtle hand correction", "distance / movement slowness", "stars / open-palm pause"]
            },
            {
              code: "v05-session-archive-refined", displayCode: "v05.02", path: "v05-session-archive-spatial/variants/v05.02", title: "Session Archive Refined",
              variantStyle: "session-archive-refined-cool",
              statement: "Eight gentle stretches record nested contours and connect them into one personal bodily star map.",
              archiveReading: "Each anchor turns one completed stretch into a small record of pace, pause, steadiness and duration.",
              instructions: [["Begin", "Allow the camera and bring hands together."], ["Open", "Open slowly, pause, then return to fix one contour."], ["Complete", "Complete eight stretches to reveal your body map."]],
              meaning: ["distance / movement slowness", "size / open-palm pause", "light / movement steadiness", "stars / stretch duration"]
            },
            {
              code: "v05-pressed-herbarium", displayCode: "v05.03", path: "v05-session-archive-spatial/variants/v05.03", title: "Pressed Herbarium",
              variantStyle: "pressed-herbarium",
              statement: "Up to fifteen two-hand gestures become pressed botanical specimens that begin wet and restless, then slowly dry, fade and fix across one archival page.",
              archiveReading: "The final midpoint places one specimen; the held pause sets its leaf count.",
              instructions: [["Begin", "Allow the camera and bring both hands together."], ["Press", "Open slowly, pause, then bring both hands together where the specimen should land."], ["Archive", "Continue until the page reaches fifteen specimens while each new one dries in place."]],
              meaning: ["position / final two-hand midpoint", "leaves / open-palm pause", "veins / movement steadiness", "rotation / signed hand tilt", "fibres / stretch duration"]
            },
            {
              code: "v05-kinetic-mobile", displayCode: "v05.04", path: "v05-session-archive-spatial/variants/v05.04", title: "Kinetic Mobile",
              variantStyle: "kinetic-mobile",
              statement: "Twelve two-hand gestures assemble an irregular suspended archive that responds to each new record and slowly returns to balance.",
              archiveReading: "The final midpoint suspends one plate; pause sets size, steadiness sets swing.",
              instructions: [["Begin", "Allow the camera and bring both hands together."], ["Suspend", "Open, shift the full stretch through space, pause, then return."], ["Balance", "Each new record moves the whole structure. Complete twelve to leave one mobile."]],
              meaning: ["position / two-hand midpoint", "plate angle / signed hand tilt", "swing / movement stability", "plate size / five hold-time levels"]
            }
          ]
        },
        {
          code: "v06", displayCode: "v06.00", path: "v06-trajectory-archive", title: "Trajectory Archive",
          statement: "Eight gentle stretches build a quiet field, while their anchors and chronological path remain visually central.",
          archiveReading: "After each stretch, hold both hands together to place the next anchor at their final midpoint.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Open + return", "Open until the contour closes, then return."], ["Complete", "Hold hands together to place each of eight anchors."]],
          meaning: ["direction / final resting midpoint", "distance / movement slowness", "size / open-palm pause", "light / steadiness", "stars / stretch duration"],
          variants: [
            {
              code: "v06-ceramic-faultline", displayCode: "v06.01", path: "v06-trajectory-archive/variants/v06.01", title: "Ceramic Faultline",
              variantStyle: "ceramic-faultline",
              statement: "Eight chronological anchors fracture one matte ceramic surface, leaving a dark faultline filled with deep peacock-green glaze.",
              archiveReading: "Each returned midpoint extends the faultline; steadiness shapes its edge and pause pools the glaze.",
              instructions: [["Begin", "Allow the camera and bring both hands together."], ["Fire", "Open until the contour completes, return, then hold at the next anchor."], ["Fracture", "Repeat eight times as the faultline grows across the ceramic surface."]],
              meaning: ["sequence / fracture growth order", "edge / movement steadiness", "glaze pool / open-palm pause", "position / direct plate coordinate"]
            },
            {
              code: "v06-afterimage-corridor", displayCode: "v06.02", path: "v06-trajectory-archive/variants/v06.02", title: "Afterimage Corridor",
              variantStyle: "afterimage-corridor",
              statement: "Ten chronological anchors become smoked-glass layers whose original trajectory recedes through a backlit spatial corridor.",
              archiveReading: "Each returned midpoint adds a front glass pane, pushing earlier records deeper into the corridor.",
              instructions: [["Begin", "Allow the camera and bring both hands together."], ["Place", "Open until the front pane completes, return, then hold at the anchor."], ["Recede", "Repeat ten times as older glass layers retreat into depth."]],
              meaning: ["depth / chronological order", "position / full-pane joined-hand coordinate", "glass light / open-palm pause", "afterimage / movement steadiness"]
            }
          ]
        }
      ],
      materials: [
        ["gesture", "[MG–03]", "both-gesture", "hand distance", "together", "apart"],
        ["shared particle field", "[SF–03]", "both-field", "field contraction", "0", "1"],
        ["anchor constellation", "[AC–03]", "both-anchor", "anchor count", "0", "1"]
      ]
    }
  };

  const key = document.body.dataset.project;
  const project = projects[key];
  const mount = document.querySelector("[data-archive]");
  if (!project || !mount) return;

  mount.innerHTML = `
    <aside class="archive-sidebar">
      <div class="archive-nav technical-label">
        <span class="breadcrumb">SLOW DIGITAL GARDEN / ${project.number} / ${project.breadcrumb}</span>
      </div>
      <h1 class="display-title project-title${key === "both" ? " long" : ""}"><a class="project-title-link" href="../" aria-label="Return to archive index">${project.title}</a></h1>
      <p class="project-subtitle">${project.subtitle}</p>
      <div class="version-list" role="listbox" aria-label="${project.breadcrumb} versions">
        ${project.versions.map(version => `
          <div class="version-family${version.variants?.length ? " has-variants" : ""}">
            <button class="version-row version-row--base" type="button" role="option" aria-selected="false" data-version="${version.code}"><span class="version-code">${version.displayCode}</span><span class="version-title">${version.title}</span><span class="version-arrow" aria-hidden="true">→</span></button>
            ${version.variants?.length ? `<div class="version-variants">${version.variants.map(variant => `<button class="version-row version-row--variant" type="button" role="option" aria-selected="false" data-version="${variant.code}"><span class="version-code">${variant.displayCode}</span><span class="version-title">${variant.title}</span><span class="version-arrow" aria-hidden="true">→</span></button>`).join("")}</div>` : ""}
          </div>`).join("")}
      </div>
      <a class="archive-return technical-label" href="../" aria-label="Return to archive index">← ARCHIVE INDEX</a>
    </aside>
    <main class="archive-stage">
      <section class="stage-upper" aria-live="polite">
        <canvas class="stage-canvas" data-field="${project.field}" aria-hidden="true"></canvas>
        <div class="coordinate-layer technical-label" aria-hidden="true">
          <span class="coordinate-title">FIELD COORDINATES</span><span class="coordinate-y">Y ↑</span><span class="coordinate-x">X →</span>
        </div>
        <div class="reading-panel"></div>
      </section>
      <section class="material-strip" aria-label="Project material records">
        ${project.materials.map((material, index) => `
          <article class="material-record">
            <div class="material-head"><span>${material[0]}</span><span class="material-code">${material[1]}</span></div>
            <canvas class="material-canvas" data-field="${material[2]}" data-seed="${index + Number(project.number) * 17}" aria-hidden="true"></canvas>
            <div class="material-scale"><span>${material[4] ?? "0"}</span><span>${material[5] ?? "1"}</span></div>
            <div class="material-metric">${material[3]}</div>
          </article>`).join("")}
      </section>
    </main>`;

  const stage = mount.querySelector(".stage-upper");
  const stageCanvas = mount.querySelector(".stage-canvas");
  const panel = mount.querySelector(".reading-panel");
  const rows = [...mount.querySelectorAll(".version-row")];
  const allVersions = project.versions.flatMap(version => [version, ...(version.variants || [])]);

  function formatMeaning(item) {
    const separator = item.indexOf(" / ");
    if (separator === -1) return `<span class="meaning-value">${item}</span>`;
    const key = item.slice(0, separator);
    const value = item.slice(separator + 3);
    return `<span class="meaning-key">${key} /</span><span class="meaning-value">${value}</span>`;
  }

  function renderSelection(code, updateHistory = true) {
    const version = allVersions.find(item => item.code === code);
    rows.forEach(row => {
      const active = !!version && row.dataset.version === version.code;
      row.classList.toggle("is-selected", active);
      row.setAttribute("aria-selected", String(active));
    });
    stage.classList.toggle("is-selected", !!version);
    stageCanvas.dataset.variant = version?.variantStyle || "";
    if (!version) {
      panel.innerHTML = "";
      if (updateHistory) history.replaceState({}, "", location.pathname);
      return;
    }
    const studyNumber = version.displayCode.slice(1);
    const showMeaning = key === "both";
    panel.innerHTML = `
      <header class="reading-header${version.archiveReading ? " has-archive-reading" : ""}">
        <div class="reading-intro">
          <div class="study-label technical-label">GESTURE STUDY ${studyNumber}</div>
          <h2 class="reading-title">${version.title}</h2>
        </div>
        <p class="reading-statement">${version.statement}</p>
        ${version.archiveReading ? `<aside class="archive-reading"><h3>READING THE ARCHIVE</h3><p>${version.archiveReading}</p></aside>` : ""}
      </header>
      <div class="reading-grid ${showMeaning ? "has-meaning" : "without-meaning"}">
        ${version.instructions.map((instruction, index) => `<section class="instruction"><span class="instruction-number">0${index + 1}</span><h3 class="instruction-title">${instruction[0]}</h3><p>${instruction[1]}</p></section>`).join("")}
        ${showMeaning ? `<aside class="meaning">${version.meaning.map(item => `<p>${formatMeaning(item)}</p>`).join("")}</aside>` : ""}
      </div>
      <a class="begin-link" href="./${version.path}/" aria-label="Begin ${version.title}">BEGIN <span>→</span></a>`;
    if (updateHistory) history.replaceState({ version: version.code }, "", `?v=${version.code}`);
  }

  rows.forEach(row => row.addEventListener("click", () => renderSelection(row.dataset.version)));
  addEventListener("popstate", () => renderSelection(new URLSearchParams(location.search).get("v"), false));
  const initial = new URLSearchParams(location.search).get("v");
  renderSelection(initial, false);
})();
