# Slow Digital Garden

## Offline exhibition mode

The site stores every archive page, live sketch, font, p5/ml5 runtime and HandPose model in a Service Worker cache.

### Prepare the school Mac mini

1. Connect to any working network and open the GitHub Pages URL in Safari or Chrome.
2. Keep the page open until the small status at the lower-right says `OFFLINE READY`.
3. Open one live sketch, press `P`, and allow camera access when the browser asks.
4. For a final check, turn Wi-Fi off and reload the home page and a few live sketches.

Closing the browser does not remove the offline cache. Private browsing, clearing website data, or a system storage cleanup can remove it, so repeat the preparation check before an exhibition.

### After changing the site

Run these commands before publishing so new or edited files are included in the offline package:

```sh
node scripts/localize-live-dependencies.mjs
node scripts/generate-offline-manifest.mjs
```

When an updated Service Worker has finished downloading, the site shows `UPDATE READY · CLICK TO RELOAD`.
