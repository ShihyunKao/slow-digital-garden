(() => {
  const studies = {
    "open/v01-unfolding-form": ["01", "OPEN", "01.00", "Unfolding Form", "open", "v01", "P HAND DISPLAY · ? HELP"],
    "open/v01-unfolding-form/variants/v01.01": ["01", "OPEN", "01.01", "Carbon Veil", "open", "v01-carbon", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "open/v01-unfolding-form/variants/v01.02": ["01", "OPEN", "01.02", "Luminous Aperture", "open", "v01-luminous", "P HAND DISPLAY · ? HELP", "../../../../"],
    "open/v01-unfolding-form/variants/v01.03": ["01", "OPEN", "01.03", "Layered Bloom", "open", "v01-layered", "P HAND DISPLAY · ? HELP", "../../../../"],
    "open/v01-unfolding-form/variants/v01.04": ["01", "OPEN", "01.04", "Topographic Tissue", "open", "v01-topographic", "P HAND DISPLAY · ? HELP", "../../../../"],
    "open/v01-unfolding-form/variants/v01.05": ["01", "OPEN", "01.05", "Phase Bloom", "open", "v01-phase", "P HAND DISPLAY · ? HELP", "../../../../"],
    "open/v02-palm-imprint": ["01", "OPEN", "02.00", "Palm Imprint", "open", "v02", "P HAND DISPLAY · R RESET · ? HELP"],
    "open/v02-palm-imprint/variants/v02.01": ["01", "OPEN", "02.01", "Dust Negative", "open", "v02-dust-negative", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "open/v02-palm-imprint/variants/v02.02": ["01", "OPEN", "02.02", "Cyanotype Exposure", "open", "v02-cyanotype", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "open/v03-calibrated-imprint": ["01", "OPEN", "03.00", "Held Imprint", "open", "v03", "P HAND DISPLAY · R RESET · ? HELP"],
    "open/v03-calibrated-imprint/variants/v03.01": ["01", "OPEN", "03.01", "Embossed Seal", "open", "v03-embossed-seal", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "open/v03-calibrated-imprint/variants/v03.02": ["01", "OPEN", "03.02", "Thermal Plate", "open", "v03-thermal-plate", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "open/v04-pressure-bloom": ["01", "OPEN", "04.00", "Pressure Bloom", "open", "v04", "P HAND DISPLAY · R RESET · ? HELP"],
    "open/v04-pressure-bloom/variants/v04.01": ["01", "OPEN", "04.01", "Liquid Lens", "open", "v04-liquid-lens", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "open/v04-pressure-bloom/variants/v04.02": ["01", "OPEN", "04.02", "Acoustic Compression", "open", "v04-acoustic-compression", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "open/v05-finger-constellation": ["01", "OPEN", "05.00", "Finger Constellation", "open", "v05", "P HAND DISPLAY · R RESET · ? HELP"],
    "open/v05-finger-constellation/variants/v05.01": ["01", "OPEN", "05.01", "Thread Cartography", "open", "v05-thread-cartography", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "open/v05-finger-constellation/variants/v05.02": ["01", "OPEN", "05.02", "Mineral Archive", "open", "v05-mineral-archive", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "trail/v01-hand-trail": ["02", "TRAIL", "01.00", "Hand Trail", "trail", "v01", "P HAND DISPLAY · R RESET · ? HELP"],
    "trail/v01-hand-trail/variants/v01.01": ["02", "TRAIL", "01.01", "Ink Sediment", "trail", "v01-ink-sediment", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "trail/v01-hand-trail/variants/v01.02": ["02", "TRAIL", "01.02", "Electric Drift", "trail", "v01-electric-drift", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "trail/v02-ink-ribbon": ["02", "TRAIL", "02.00", "Soft Ink Wash", "trail", "v02", "P HAND DISPLAY · R RESET · ? HELP"],
    "trail/v02-ink-ribbon/variants/v02.01": ["02", "TRAIL", "02.01", "Fibrous Bleed", "trail", "v02-fibrous-bleed", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "trail/v02-ink-ribbon/variants/v02.02": ["02", "TRAIL", "02.02", "Suspended Vapor", "trail", "v02-suspended-vapor", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "trail/v03-path-constellation": ["02", "TRAIL", "03.00", "Path Constellation", "trail", "v03", "P HAND DISPLAY · R RESET · ? HELP"],
    "trail/v03-path-constellation/variants/v03.01": ["02", "TRAIL", "03.01", "Surveyor’s Map", "trail", "v03-surveyors-map", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "trail/v03-path-constellation/variants/v03.02": ["02", "TRAIL", "03.02", "Pulse Relics", "trail", "v03-pulse-relics", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "trail/v04-slow-orbit-drawing": ["02", "TRAIL", "04.00", "Slow Orbit Drawing", "trail", "v04", "P HAND DISPLAY · R RESET · ? HELP"],
    "trail/v04-slow-orbit-drawing/variants/v04.01": ["02", "TRAIL", "04.01", "Mineral Orbit", "trail", "v04-mineral-orbit", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "trail/v04-slow-orbit-drawing/variants/v04.02": ["02", "TRAIL", "04.02", "Magnetic Debris", "trail", "v04-magnetic-debris", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v01-breathing-garden": ["03", "BOTH HANDS", "01.00", "Breathing Garden", "both-hands", "v01", "P HAND DISPLAY · R RESET · ? HELP"],
    "both-hands/v01-breathing-garden/variants/v01.01": ["03", "BOTH HANDS", "01.01", "Woven Canopy", "both-hands", "v01-woven-canopy", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v01-breathing-garden/variants/v01.02": ["03", "BOTH HANDS", "01.02", "Parted Veil", "both-hands", "v01-parted-veil", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v02-breathing-cosmos": ["03", "BOTH HANDS", "02.00", "Breathing Cosmos", "both-hands", "v02", "P HAND DISPLAY · R RESET · ? HELP"],
    "both-hands/v02-breathing-cosmos/variants/v02.01": ["03", "BOTH HANDS", "02.01", "Mercury Basin", "both-hands", "v02-mercury-basin", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v02-breathing-cosmos/variants/v02.02": ["03", "BOTH HANDS", "02.02", "Cloud Chamber", "both-hands", "v02-cloud-chamber", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v03-cosmic-memory-refined": ["03", "BOTH HANDS", "03.00", "Cosmic Memory Refined", "both-hands", "v03", "P HAND DISPLAY · R RESET · ? HELP"],
    "both-hands/v03-cosmic-memory-refined/variants/v03.01": ["03", "BOTH HANDS", "03.01", "Amber Orbit", "both-hands", "v03-amber-orbit", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v03-cosmic-memory-refined/variants/v03.02": ["03", "BOTH HANDS", "03.02", "Frozen Constellation", "both-hands", "v03-frozen-constellation", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v03-cosmic-memory-refined/variants/v03.03": ["03", "BOTH HANDS", "03.03", "Lacquer Echo", "both-hands", "v03-lacquer-echo", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v03-cosmic-memory-refined/variants/v03.04": ["03", "BOTH HANDS", "03.04", "Paper Eclipse", "both-hands", "v03-paper-eclipse", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v04-breath-quality": ["03", "BOTH HANDS", "04.00", "Breath Quality", "both-hands", "v04", "P HAND DISPLAY · R RESET · ? HELP"],
    "both-hands/v04-breath-quality/variants/v04.01": ["03", "BOTH HANDS", "04.01", "Seismograph Skin", "both-hands", "v04-seismograph-skin", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v04-breath-quality/variants/v04.02": ["03", "BOTH HANDS", "04.02", "Glass Strain", "both-hands", "v04-glass-strain", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v05-session-archive-spatial": ["03", "BOTH HANDS", "05.00", "Session Archive Spatial", "both-hands", "v05", "P HAND DISPLAY · R RESET · ? HELP"],
    "both-hands/v05-session-archive-spatial/variants/v05.01": ["03", "BOTH HANDS", "05.01", "Session Archive", "both-hands", "v05-session-archive", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v05-session-archive-spatial/variants/v05.02": ["03", "BOTH HANDS", "05.02", "Session Archive Refined", "both-hands", "v05-session-archive-refined", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v05-session-archive-spatial/variants/v05.03": ["03", "BOTH HANDS", "05.03", "Pressed Herbarium", "both-hands", "v05-pressed-herbarium", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v05-session-archive-spatial/variants/v05.04": ["03", "BOTH HANDS", "05.04", "Kinetic Mobile", "both-hands", "v05-kinetic-mobile", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v06-trajectory-archive": ["03", "BOTH HANDS", "06.00", "Trajectory Archive", "both-hands", "v06", "P HAND DISPLAY · R RESET · ? HELP"],
    "both-hands/v06-trajectory-archive/variants/v06.01": ["03", "BOTH HANDS", "06.01", "Ceramic Faultline", "both-hands", "v06-ceramic-faultline", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"],
    "both-hands/v06-trajectory-archive/variants/v06.02": ["03", "BOTH HANDS", "06.02", "Afterimage Corridor", "both-hands", "v06-afterimage-corridor", "P HAND DISPLAY · R RESET · ? HELP", "../../../../"]
  };

  const parts = location.pathname.split("/").filter(Boolean);
  const variantKey = parts.slice(-4).join("/");
  const key = parts.slice(-2).join("/");
  const study = studies[variantKey] || studies[key];
  if (!study) return;

  const style = document.createElement("link");
  style.rel = "stylesheet";
  const root = study[7] || "../../";
  style.href = `${root}assets/live.css`;
  document.head.append(style);

  const originalSetup = window.setup;
  if (typeof originalSetup === "function") {
    const applyCanvasFont = () => {
      if (typeof window.textFont === "function") window.textFont("IBM Plex Mono");
    };
    window.setup = function (...args) {
      const result = originalSetup.apply(this, args);
      applyCanvasFont();
      if (document.fonts?.load) {
        document.fonts.load('400 16px "IBM Plex Mono"').then(applyCanvasFont).catch(() => {});
      }
      return result;
    };
  }

  const shell = document.createElement("div");
  shell.className = "live-shell";
  shell.innerHTML = `
    <header class="live-top"><span>SLOW DIGITAL GARDEN / ${study[0]} / ${study[1]}</span><span>GESTURE STUDY ${study[2]}</span></header>
    <footer class="live-bottom">
      <div class="live-bottom-copy"><h1 class="live-title">${study[3]}</h1><div class="live-input">LIVE FIELD · ${study[6] || "CAMERA GESTURE INPUT"}</div></div>
      <a class="live-return" href="${root}${study[4]}/?v=${study[5]}">← RETURN TO ARCHIVE</a>
    </footer>`;
  document.body.append(shell);
})();
