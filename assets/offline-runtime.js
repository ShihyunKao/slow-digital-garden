(() => {
  const sourceUrl = document.currentScript?.src;
  if (!sourceUrl) return;

  const offlineClient = document.createElement("script");
  offlineClient.src = new URL("offline-client.js", sourceUrl).href;
  offlineClient.defer = true;
  document.head.append(offlineClient);

  const originalHandPose = window.ml5?.handPose;
  if (typeof originalHandPose !== "function" || originalHandPose.__sdgOfflineWrapped) return;

  const solutionPath = new URL("vendor/mediapipe/hands/", sourceUrl).href;
  const localModelConfig = {
    runtime: "mediapipe",
    modelType: "full",
    solutionPath
  };

  function offlineHandPose(...args) {
    document.documentElement.dataset.sdgHandpose = "loading";
    const first = args[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      args[0] = { ...first, ...localModelConfig };
    } else {
      args.unshift({ ...localModelConfig });
    }
    const callbackIndex = args.findIndex(argument => typeof argument === "function");
    if (callbackIndex !== -1) {
      const callback = args[callbackIndex];
      args[callbackIndex] = function (...callbackArgs) {
        document.documentElement.dataset.sdgHandpose = "ready";
        return callback.apply(this, callbackArgs);
      };
    }
    return originalHandPose.apply(this, args);
  }

  offlineHandPose.__sdgOfflineWrapped = true;
  window.ml5.handPose = offlineHandPose;
})();
