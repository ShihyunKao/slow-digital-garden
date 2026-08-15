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
            }
          ]
        },
        {
          code: "v02", displayCode: "v02.00", path: "v02-layered-bloom", title: "Layered Bloom",
          statement: "An opening palm unfolds a layered contour field. A small movement becomes a slow, shifting expansion.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Open", "Show one hand and open your palm slowly."], ["Gather", "Open and close to unfold and gather the contour field."]],
          meaning: ["gesture / open palm", "contours / layered field", "motion / expand + gather"]
        },
        {
          code: "v03", displayCode: "v03.00", path: "v03-palm-imprint", title: "Palm Imprint",
          statement: "Each fully opened palm leaves a temporary constellation-like imprint.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Open", "Show one hand and open your palm slowly."], ["Imprint", "Relax, then open again to leave another imprint."]],
          meaning: ["gesture / open palm", "points / constellation", "memory / temporary imprint"]
        },
        {
          code: "v04", displayCode: "v04.00", path: "v04-calibrated-imprint", title: "Held Imprint",
          statement: "A briefly held open palm leaves a deliberate, temporary constellation-like imprint.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Open", "Relax your hand, then open your palm slowly."], ["Hold", "Hold until the small ring closes to leave an imprint."]],
          meaning: ["gesture / held palm", "time / closing ring", "memory / deliberate imprint"]
        },
        {
          code: "v05", displayCode: "v05.00", path: "v05-pressure-bloom", title: "Pressure Bloom",
          statement: "An opening palm becomes a soft pressure field. Each release leaves a circular memory that slowly dissipates.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Press", "Open one palm slowly to create a pressure field."], ["Release", "Close, then open again to leave another memory."]],
          meaning: ["gesture / opening palm", "field / soft pressure", "memory / slow release"]
        },
        {
          code: "v06", displayCode: "v06.00", path: "v06-finger-constellation", title: "Finger Constellation",
          statement: "Five fingertips become five stars. Each open hand adds a persistent map to an accumulating bodily archive.",
          instructions: [["Begin", "Select Begin and allow access to the camera."], ["Arrange", "Arrange the five stars, then hold until they brighten."], ["Preserve", "Close the hand to preserve the locked constellation."]],
          meaning: ["points / five fingertips", "field / open hand", "light / held brightness", "memory / locked constellation"]
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
          meaning: ["trace / one finger", "wash / pale diffusion", "pause / continued expansion"]
        },
        {
          code: "v03", displayCode: "v03.00", path: "v03-path-constellation", title: "Path Constellation",
          statement: "Slow movement deposits a constellation-like record of the path your hand takes through space.",
          instructions: [["Begin", "Select Begin to activate the camera."], ["Move", "Move one index finger slowly through the space."], ["Anchor", "Pause briefly to leave a larger anchor point."]],
          meaning: ["trace / one finger", "points / deposited path", "pause / anchor point"]
        },
        {
          code: "v04", displayCode: "v04.00", path: "v04-slow-orbit-drawing", title: "Slow Orbit Drawing",
          statement: "A movement begins as scattered points. Sustained slowness allows those points to settle into a coherent orbit.",
          instructions: [["Move", "Move one finger slowly through the space."], ["Steady", "Keep a steady pace until the path becomes stable."], ["Preserve", "Pause to preserve the orbit; speed scatters it."]],
          meaning: ["trace / one finger", "pace / sustained slowness", "orbit / coherent path", "pause / preservation"]
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
          archiveReading: "This first study does not save individual traces yet. It establishes the near-closed centre and slow expansion that later versions turn into memory.",
          instructions: [["Begin", "Allow the camera and touch index fingertips."], ["Open", "Open both hands slowly to expand the contour field."], ["Return", "Return to the centre and begin another cycle."]],
          meaning: ["distance / index fingertips", "scale / field expansion", "contours / layered response", "return / near-closed centre"]
        },
        {
          code: "v02", displayCode: "v02.00", path: "v02-breathing-cosmos", title: "Breathing Cosmos",
          statement: "A two-hand gesture creates a live field of expansion, contraction and return.",
          archiveReading: "This early study does not save individual traces yet. It establishes the live breathing system that later versions turn into memory.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Open", "Open both hands slowly to expand the breathing field."], ["Return", "Return to the centre and begin another cycle."]],
          meaning: ["distance / hands apart", "scale / field expansion", "ripples / breathing contours", "particles / slow orbital drift"]
        },
        {
          code: "v03", displayCode: "v03.00", path: "v03-cosmic-memory", title: "Cosmic Memory",
          statement: "A two-hand breathing gesture becomes a memory of expansion and return.",
          archiveReading: "Each completed breath becomes an orbit-like memory. Across eight cycles, the rings move from the outer field towards the centre.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Expand", "Open both hands fully until the field expands."], ["Return", "Return to the centre to leave one memory ring."]],
          meaning: ["cycle / wide stretch + return", "radius / outer-to-inner order", "rings / one breath memory", "stars / surrounding constellation"],
          variants: [
            {
              code: "v03-amber-orbit", displayCode: "v03.01", path: "v03-cosmic-memory/variants/v03.01", title: "Amber Orbit",
              variantStyle: "amber-orbit",
              statement: "Two hands become gravitational sources, gathering tiny gold and dark-red particles into a slowly turning microscopic nebula.",
              archiveReading: "Each completed breath still enters the same eight-step sequence. The memory is held by long-lived orbital particles rather than drawn lines.",
              instructions: [["Begin", "Allow the camera and bring hands together."], ["Emit", "Open both hands to release warm particles at their midpoint."], ["Return", "Return to the centre to preserve one slowly orbiting particle memory."]],
              meaning: ["cycle / wide stretch + return", "source / two-hand gravity", "material / gold + dark-red particles", "memory / long-lived orbital drift"]
            },
            {
              code: "v03-frozen-constellation", displayCode: "v03.02", path: "v03-cosmic-memory/variants/v03.02", title: "Frozen Constellation",
              variantStyle: "frozen-constellation",
              statement: "The same two-hand breath settles into a pale violet field where each completed expansion and return grows a persistent crystalline mesh.",
              archiveReading: "Each completed breath still records one memory in the same eight-step sequence. A new group of straight fingertip connections is added only after the hands fully open and return to the centre.",
              instructions: [["Begin", "Allow the camera and bring hands together."], ["Expand", "Open both hands fully until the violet field expands."], ["Crystallise", "Complete the return to the centre to grow the next geometric connections."]],
              meaning: ["cycle / wide stretch + return", "trigger / completed gesture", "lines / fingertip connections", "memory / persistent crystal mesh"]
            }
          ]
        },
        {
          code: "v04", displayCode: "v04.00", path: "v04-cosmic-memory-refined", title: "Cosmic Memory Refined",
          statement: "A slow two-hand movement leaves a sequence of orbit-like memories.",
          archiveReading: "Each completed stretch becomes one orbit-like memory. Across eight cycles, the archive moves steadily from the outer field towards its centre.",
          instructions: [["Begin", "Move both hands close together."], ["Stretch", "Stretch slowly apart until the field fully opens."], ["Return", "Return to the centre to leave one memory ring."]],
          meaning: ["cycle / wide stretch + return", "radius / outer-to-inner order", "orbits / one memory ring", "stars / surrounding constellation"]
        },
        {
          code: "v05", displayCode: "v05.00", path: "v05-breath-quality", title: "Breath Quality",
          statement: "Each complete two-hand movement leaves a ring shaped by its speed, steadiness, balance and pause.",
          archiveReading: "Each completed stretch becomes a ring whose surface reveals the quality of movement.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Open", "Open slowly and pause in the extended position."], ["Return", "Return slowly to create one quality-based memory ring."]],
          meaning: ["completeness / slow + steady", "texture / movement steadiness", "tilt / vertical hand balance", "stars / open-palm pause"]
        },
        {
          code: "v06", displayCode: "v06.00", path: "v06-session-archive", title: "Session Archive",
          statement: "Eight gentle stretches record nested contours and connect them into one personal bodily star map.",
          archiveReading: "A fixed golden-angle sequence gives the archive its underlying structure; each stretch introduces a subtle bodily variation.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Open", "Open slowly, pause, then return to fix one contour."], ["Complete", "Complete eight stretches to reveal your body map."]],
          meaning: ["sequence / golden-angle placement", "tilt / subtle hand correction", "distance / movement slowness", "stars / open-palm pause"]
        },
        {
          code: "v07", displayCode: "v07.00", path: "v07-session-archive-refined", title: "Session Archive Refined",
          statement: "Eight gentle stretches record nested contours and connect them into one personal bodily star map.",
          archiveReading: "Each anchor turns one completed stretch into a small record of pace, pause, steadiness and duration.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Open", "Open slowly, pause, then return to fix one contour."], ["Complete", "Complete eight stretches to reveal your body map."]],
          meaning: ["distance / movement slowness", "size / open-palm pause", "light / movement steadiness", "stars / stretch duration"]
        },
        {
          code: "v08", displayCode: "v08.00", path: "v08-session-archive-spatial", title: "Session Archive Spatial",
          statement: "Eight gentle stretches record nested contours and connect them into one personal bodily star map.",
          archiveReading: "While both hands are widely open, the system averages the midpoint between the two index fingers. Shift the whole stretch left, right, up or down; the anchor follows the same direction.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Shift", "Open slowly and shift the full stretch through space."], ["Complete", "Return and complete eight stretches to reveal the map."]],
          meaning: ["direction / two-hand midpoint", "distance / movement slowness", "size / open-palm pause", "light / steadiness", "stars / stretch duration"]
        },
        {
          code: "v09", displayCode: "v09.00", path: "v09-trajectory-archive", title: "Trajectory Archive",
          statement: "Eight gentle stretches build a quiet field, while their anchors and chronological path remain visually central.",
          archiveReading: "At the end of each stretch, hold both hands together where you want the anchor to appear. The system samples the midpoint between the two index fingers and places the anchor in the same direction.",
          instructions: [["Begin", "Allow the camera and bring hands together."], ["Open + return", "Open until the contour closes, then return."], ["Complete", "Hold hands together to place each of eight anchors."]],
          meaning: ["direction / final resting midpoint", "distance / movement slowness", "size / open-palm pause", "light / steadiness", "stars / stretch duration"]
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
      <h1 class="display-title project-title${key === "both" ? " long" : ""}">${project.title}</h1>
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
