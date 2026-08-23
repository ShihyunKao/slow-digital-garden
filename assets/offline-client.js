(() => {
  if (window.__sdgOfflineClientLoaded) return;
  window.__sdgOfflineClientLoaded = true;

  const sourceUrl = document.currentScript?.src;
  if (!sourceUrl || !("serviceWorker" in navigator)) return;

  const siteRoot = new URL("../", sourceUrl);
  const workerUrl = new URL("service-worker.js", siteRoot);
  const scope = siteRoot.pathname;
  let registration;
  let reloadForUpdate = false;
  let ready = false;
  let state = { label: "PREPARING OFFLINE", tone: "working", detail: "" };
  let indicator;

  const style = document.createElement("style");
  style.textContent = `
    .sdg-offline-status {
      position: fixed;
      z-index: 2147483647;
      right: 14px;
      bottom: 12px;
      display: flex;
      align-items: center;
      gap: 7px;
      min-height: 24px;
      padding: 5px 9px;
      border: 1px solid rgba(101, 215, 196, .24);
      border-radius: 999px;
      color: rgba(232, 225, 216, .72);
      background: rgba(7, 16, 13, .82);
      box-shadow: 0 4px 18px rgba(0, 0, 0, .18);
      font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
      font-size: 9px;
      font-weight: 400;
      line-height: 1;
      letter-spacing: .1em;
      text-transform: uppercase;
      pointer-events: none;
      transition: opacity .4s ease, border-color .4s ease;
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
    }
    .sdg-offline-status::before {
      width: 5px;
      height: 5px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: #65d7c4;
      box-shadow: 0 0 8px rgba(101, 215, 196, .7);
      content: "";
    }
    .sdg-offline-status[data-tone="working"]::before { animation: sdg-offline-pulse 1.3s ease-in-out infinite; }
    .sdg-offline-status[data-tone="error"] { border-color: rgba(210, 126, 104, .42); color: rgba(232, 225, 216, .9); }
    .sdg-offline-status[data-tone="error"]::before { background: #d27e68; box-shadow: 0 0 8px rgba(210, 126, 104, .65); }
    .sdg-offline-status[data-tone="update"] { cursor: pointer; pointer-events: auto; border-color: rgba(101, 215, 196, .58); color: #e8e1d8; }
    .sdg-offline-status.is-settled { opacity: .34; }
    .sdg-offline-status.is-settled:hover,
    .sdg-offline-status:focus-visible { opacity: 1; }
    @keyframes sdg-offline-pulse { 50% { opacity: .28; transform: scale(.72); } }
    @media (prefers-reduced-motion: reduce) { .sdg-offline-status { transition: none; } .sdg-offline-status::before { animation: none !important; } }
  `;
  document.head.append(style);

  function ensureIndicator() {
    if (indicator || !document.body) return indicator;
    indicator = document.createElement("button");
    indicator.type = "button";
    indicator.className = "sdg-offline-status";
    indicator.setAttribute("aria-live", "polite");
    indicator.addEventListener("click", () => {
      if (!registration?.waiting) return;
      reloadForUpdate = true;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    });
    document.body.append(indicator);
    render();
    return indicator;
  }

  function render() {
    if (!ensureIndicator()) return;
    indicator.dataset.tone = state.tone;
    indicator.textContent = state.detail ? `${state.label} · ${state.detail}` : state.label;
    indicator.disabled = state.tone !== "update";
    indicator.classList.toggle("is-settled", state.tone === "ready");
  }

  function setState(label, tone, detail = "") {
    state = { label, tone, detail };
    render();
  }

  function requestStatus(worker = navigator.serviceWorker.controller || registration?.active) {
    worker?.postMessage({ type: "GET_OFFLINE_STATUS" });
  }

  function showConnectionState() {
    if (!ready) return;
    setState(navigator.onLine ? "OFFLINE READY" : "OFFLINE MODE", "ready");
  }

  navigator.serviceWorker.addEventListener("message", event => {
    const message = event.data || {};
    if (message.type === "CACHE_PROGRESS") {
      const percent = Math.round((message.completed / Math.max(1, message.total)) * 100);
      setState("PREPARING OFFLINE", "working", `${percent}%`);
    } else if (message.type === "OFFLINE_READY") {
      ready = true;
      showConnectionState();
    } else if (message.type === "OFFLINE_ERROR") {
      setState("OFFLINE CACHE ERROR", "error");
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadForUpdate) location.reload();
    else requestStatus();
  });
  addEventListener("online", showConnectionState);
  addEventListener("offline", showConnectionState);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureIndicator, { once: true });
  } else {
    ensureIndicator();
  }

  navigator.serviceWorker.register(workerUrl.href, { scope }).then(reg => {
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) {
      setState("UPDATE READY", "update", "CLICK TO RELOAD");
    }
    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          setState("UPDATE READY", "update", "CLICK TO RELOAD");
        }
      });
    });
    return navigator.serviceWorker.ready;
  }).then(reg => {
    registration = reg;
    requestStatus(reg.active);
  }).catch(error => {
    console.warn("Slow Digital Garden offline cache could not start.", error);
    setState("OFFLINE UNAVAILABLE", "error");
  });
})();
