(() => {
  const studies = {
    "open/v01-unfolding-form": ["01", "OPEN", "01", "Unfolding Form", "open", "v01"],
    "open/v02-layered-bloom": ["01", "OPEN", "02", "Layered Bloom", "open", "v02"],
    "open/v03-palm-imprint": ["01", "OPEN", "03", "Palm Imprint", "open", "v03"],
    "open/v04-calibrated-imprint": ["01", "OPEN", "04", "Held Imprint", "open", "v04"],
    "open/v05-pressure-bloom": ["01", "OPEN", "05", "Pressure Bloom", "open", "v05"],
    "open/v06-finger-constellation": ["01", "OPEN", "06", "Finger Constellation", "open", "v06"],
    "trail/v01-hand-trail": ["02", "TRAIL", "01", "Hand Trail", "trail", "v01"],
    "trail/v02-ink-ribbon": ["02", "TRAIL", "02", "Soft Ink Wash", "trail", "v02"],
    "trail/v03-path-constellation": ["02", "TRAIL", "03", "Path Constellation", "trail", "v03"],
    "trail/v04-slow-orbit-drawing": ["02", "TRAIL", "04", "Slow Orbit Drawing", "trail", "v04"],
    "both-hands/v01-breathing-garden": ["03", "BOTH HANDS", "01", "Breathing Garden", "both-hands", "v01"],
    "both-hands/v02-breathing-cosmos": ["03", "BOTH HANDS", "02", "Breathing Cosmos", "both-hands", "v02"],
    "both-hands/v03-cosmic-memory": ["03", "BOTH HANDS", "03", "Cosmic Memory", "both-hands", "v03"],
    "both-hands/v04-cosmic-memory-refined": ["03", "BOTH HANDS", "04", "Cosmic Memory Refined", "both-hands", "v04"],
    "both-hands/v05-breath-quality": ["03", "BOTH HANDS", "05", "Breath Quality", "both-hands", "v05"],
    "both-hands/v06-session-archive": ["03", "BOTH HANDS", "06", "Session Archive", "both-hands", "v06"],
    "both-hands/v07-session-archive-refined": ["03", "BOTH HANDS", "07", "Session Archive Refined", "both-hands", "v07"],
    "both-hands/v08-session-archive-spatial": ["03", "BOTH HANDS", "08", "Session Archive Spatial", "both-hands", "v08"],
    "both-hands/v09-trajectory-archive": ["03", "BOTH HANDS", "09", "Trajectory Archive", "both-hands", "v09"]
  };

  const parts = location.pathname.split("/").filter(Boolean);
  const key = parts.slice(-2).join("/");
  const study = studies[key];
  if (!study) return;

  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "../../assets/live.css";
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
      <div class="live-bottom-copy"><h1 class="live-title">${study[3]}</h1><div class="live-input">LIVE FIELD · CAMERA GESTURE INPUT</div></div>
      <a class="live-return" href="../../${study[4]}/?v=${study[5]}">← RETURN TO ARCHIVE</a>
    </footer>`;
  document.body.append(shell);
})();
