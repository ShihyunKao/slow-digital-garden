# Slow Digital Garden

*A study in slowness, bodily movement, and generative visual memory.*

![Slow Digital Garden home page](docs/images/home-page.png)

## Short Description

Slow Digital Garden is an interactive generative installation that invites audiences to create an evolving digital environment through gentle bodily movement. Using ml5.js HandPose and p5.js, the system senses the audience's hand gestures and arm movements, translating their openness, speed, smoothness, continuity, and distance into evolving visual traces on screen.

## Concept / Intent

In this work, the term “garden” does not refer to a botanical garden or a simulation of plants. Instead, it describes a slowly cultivated digital environment in which gestures can emerge, develop, fade, accumulate, and coexist over time.

The work responds to the way contemporary digital interfaces often demand speed, accuracy, and constant attention. Instead of rewarding fast reactions or competitive performance, it encourages slow, low-pressure movement: opening the hand, stretching the arms, pausing, or moving with care. These gestures become visual traces that grow, fade, and gather on screen, forming a personal and temporary digital ecosystem.

By turning movement into a living garden, the project explores how computational interaction can become a gentle mirror for bodily awareness, presence, and calm. The archive also records this iterative exploration: each main study is accompanied by visual and behavioural variants that test the same gesture through different textures, colours, metaphors, and forms of persistence.

The collection is organised into three pathways:

| Pathway | Gesture | Visual response | Studies |
| --- | --- | --- | ---: |
| **01 / Palm Imprint** | Open, close, or hold one hand | A compact seed unfolds into imprints, blooms, and fingertip constellations | 5 main studies + 13 variants |
| **02 / Trace Field** | Move one fingertip through space | Motion accumulates into trails, ribbons, maps, and slow orbit drawings | 4 main studies + 8 variants |
| **03 / Breathing Cosmos** | Bring two hands together and apart | Hand distance opens, contracts, and preserves a shared field | 6 main studies + 16 variants |

## How to Experience It

1. Enter one of the three pathways from the home page.
2. Choose a numbered study or one of its visual variants.
3. Select **Begin** and allow camera access when prompted.
4. Follow the gesture guide for that study. A clear, well-lit view of the hand or hands gives the best tracking result.
5. Move slowly and observe how the field changes or retains the gesture.

Common keyboard controls:

- `P` - cycle the hand display through points, skeleton, and hidden modes.
- `R` - reset the current field or archive, where available.
- `?` - open or close the field guide.

## Technology Used

- HTML5 and CSS3 for the archive, interface, layout, and visual system.
- JavaScript for navigation, interaction states, and generative behaviours.
- [p5.js 1.11.3](https://p5js.org/) for canvas rendering and animation.
- [ml5.js 1.0.1](https://ml5js.org/) HandPose for browser-based hand landmark detection.
- HTML Canvas for the non-camera particle fields on the home and pathway pages.
- Google Fonts: Cormorant Garamond and IBM Plex Mono.

All study pages load their libraries directly from a CDN, so there is no package installation or build step.

## How to Run / Install

Clone the repository and serve it from a local web server:

```bash
git clone https://github.com/ShihyunKao/slow-digital-garden.git
cd slow-digital-garden
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a browser.

Opening `index.html` directly may prevent camera access. Use `localhost` during development, or HTTPS when deploying the project online.

## Requirements

- A desktop or laptop with a working webcam.
- A modern browser with camera and WebGL/canvas support; current Chrome or Edge is recommended.
- Permission for the browser to access the camera.
- An internet connection to load p5.js, ml5.js, the HandPose model, and web fonts.
- Enough space to keep one or both hands visible in the camera frame.

Camera frames are processed in the browser for hand tracking. The project code does not record, save, or upload the camera feed.

## Project Structure

```text
slow-digital-garden/
├── index.html          # Main archive entrance
├── assets/             # Shared styles, navigation, UI, and particle fields
├── open/               # Palm Imprint studies and variants
├── trail/              # Trace Field studies and variants
├── both-hands/         # Breathing Cosmos studies and variants
└── docs/images/        # README screenshots
```

Each study folder contains an `index.html`, a generative sketch, and `notes.md` documenting its question, interaction, testing, and refinements. Variant folders preserve alternate visual treatments without removing the primary study.

## Screenshots / Media

The complete visual archive contains 56 screenshots: 4 website views, 18 Palm Imprint studies, 12 Trace Field studies, and 22 Breathing Cosmos studies. Open each section below to view the full set.

<details open>
<summary><strong>Website / Archive Pages (4)</strong></summary>

<table>
  <tr>
    <td width="50%"><img src="docs/images/gallery/website/home-page.jpg" alt="Slow Digital Garden home page"></td>
    <td width="50%"><img src="docs/images/gallery/website/01.jpg" alt="Palm Imprint archive page"></td>
  </tr>
  <tr>
    <td align="center"><em>Home Page</em></td>
    <td align="center"><em>01 / Palm Imprint</em></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/images/gallery/website/02.jpg" alt="Trace Field archive page"></td>
    <td width="50%"><img src="docs/images/gallery/website/03.jpg" alt="Breathing Cosmos archive page"></td>
  </tr>
  <tr>
    <td align="center"><em>02 / Trace Field</em></td>
    <td align="center"><em>03 / Breathing Cosmos</em></td>
  </tr>
</table>

</details>

<details>
<summary><strong>01 / Palm Imprint - Open (18)</strong></summary>

<table>
  <tr>
    <td width="33.33%"><img src="docs/images/gallery/open/v01/v01.00.jpg" alt="Open study v01.00"></td>
    <td width="33.33%"><img src="docs/images/gallery/open/v01/v01.01.jpg" alt="Open study v01.01"></td>
    <td width="33.33%"><img src="docs/images/gallery/open/v01/v01.02.jpg" alt="Open study v01.02"></td>
  </tr>
  <tr><td align="center">v01.00</td><td align="center">v01.01</td><td align="center">v01.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/open/v01/v01.03.jpg" alt="Open study v01.03"></td>
    <td><img src="docs/images/gallery/open/v01/v01.04.jpg" alt="Open study v01.04"></td>
    <td><img src="docs/images/gallery/open/v01/v01.05.jpg" alt="Open study v01.05"></td>
  </tr>
  <tr><td align="center">v01.03</td><td align="center">v01.04</td><td align="center">v01.05</td></tr>
  <tr>
    <td><img src="docs/images/gallery/open/v02/v02.00.jpg" alt="Open study v02.00"></td>
    <td><img src="docs/images/gallery/open/v02/v02.01.jpg" alt="Open study v02.01"></td>
    <td><img src="docs/images/gallery/open/v02/v02.02.jpg" alt="Open study v02.02"></td>
  </tr>
  <tr><td align="center">v02.00</td><td align="center">v02.01</td><td align="center">v02.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/open/v03/v03.00.jpg" alt="Open study v03.00"></td>
    <td><img src="docs/images/gallery/open/v03/v03.01.jpg" alt="Open study v03.01"></td>
    <td><img src="docs/images/gallery/open/v03/v03.02.jpg" alt="Open study v03.02"></td>
  </tr>
  <tr><td align="center">v03.00</td><td align="center">v03.01</td><td align="center">v03.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/open/v04/v04.00.jpg" alt="Open study v04.00"></td>
    <td><img src="docs/images/gallery/open/v04/v04.01.jpg" alt="Open study v04.01"></td>
    <td><img src="docs/images/gallery/open/v04/v04.02.jpg" alt="Open study v04.02"></td>
  </tr>
  <tr><td align="center">v04.00</td><td align="center">v04.01</td><td align="center">v04.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/open/v05/v05.00.jpg" alt="Open study v05.00"></td>
    <td><img src="docs/images/gallery/open/v05/v05.01.jpg" alt="Open study v05.01"></td>
    <td><img src="docs/images/gallery/open/v05/v05.02.jpg" alt="Open study v05.02"></td>
  </tr>
  <tr><td align="center">v05.00</td><td align="center">v05.01</td><td align="center">v05.02</td></tr>
</table>

</details>

<details>
<summary><strong>02 / Trace Field - Trail (12)</strong></summary>

<table>
  <tr>
    <td width="33.33%"><img src="docs/images/gallery/trail/v01/v01.00.jpg" alt="Trail study v01.00"></td>
    <td width="33.33%"><img src="docs/images/gallery/trail/v01/v01.01.jpg" alt="Trail study v01.01"></td>
    <td width="33.33%"><img src="docs/images/gallery/trail/v01/v01.02.jpg" alt="Trail study v01.02"></td>
  </tr>
  <tr><td align="center">v01.00</td><td align="center">v01.01</td><td align="center">v01.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/trail/v02/v02.00.jpg" alt="Trail study v02.00"></td>
    <td><img src="docs/images/gallery/trail/v02/v02.01.jpg" alt="Trail study v02.01"></td>
    <td><img src="docs/images/gallery/trail/v02/v02.02.jpg" alt="Trail study v02.02"></td>
  </tr>
  <tr><td align="center">v02.00</td><td align="center">v02.01</td><td align="center">v02.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/trail/v03/v03.00.jpg" alt="Trail study v03.00"></td>
    <td><img src="docs/images/gallery/trail/v03/v03.01.jpg" alt="Trail study v03.01"></td>
    <td><img src="docs/images/gallery/trail/v03/v03.02.jpg" alt="Trail study v03.02"></td>
  </tr>
  <tr><td align="center">v03.00</td><td align="center">v03.01</td><td align="center">v03.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/trail/v04/v04.00.jpg" alt="Trail study v04.00"></td>
    <td><img src="docs/images/gallery/trail/v04/v04.01.jpg" alt="Trail study v04.01"></td>
    <td><img src="docs/images/gallery/trail/v04/v04.02.jpg" alt="Trail study v04.02"></td>
  </tr>
  <tr><td align="center">v04.00</td><td align="center">v04.01</td><td align="center">v04.02</td></tr>
</table>

</details>

<details>
<summary><strong>03 / Breathing Cosmos - Both Hands (22)</strong></summary>

<table>
  <tr>
    <td width="33.33%"><img src="docs/images/gallery/both-hands/v01/v01.00.jpg" alt="Both Hands study v01.00"></td>
    <td width="33.33%"><img src="docs/images/gallery/both-hands/v01/v01.01.jpg" alt="Both Hands study v01.01"></td>
    <td width="33.33%"><img src="docs/images/gallery/both-hands/v01/v01.02.jpg" alt="Both Hands study v01.02"></td>
  </tr>
  <tr><td align="center">v01.00</td><td align="center">v01.01</td><td align="center">v01.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/both-hands/v02/v02.00.jpg" alt="Both Hands study v02.00"></td>
    <td><img src="docs/images/gallery/both-hands/v02/v02.01.jpg" alt="Both Hands study v02.01"></td>
    <td><img src="docs/images/gallery/both-hands/v02/v02.02.jpg" alt="Both Hands study v02.02"></td>
  </tr>
  <tr><td align="center">v02.00</td><td align="center">v02.01</td><td align="center">v02.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/both-hands/v03/v03.00.jpg" alt="Both Hands study v03.00"></td>
    <td><img src="docs/images/gallery/both-hands/v03/v03.01.jpg" alt="Both Hands study v03.01"></td>
    <td><img src="docs/images/gallery/both-hands/v03/v03.02.jpg" alt="Both Hands study v03.02"></td>
  </tr>
  <tr><td align="center">v03.00</td><td align="center">v03.01</td><td align="center">v03.02</td></tr>
  <tr>
    <td><img src="docs/images/gallery/both-hands/v03/v03.03.jpg" alt="Both Hands study v03.03"></td>
    <td><img src="docs/images/gallery/both-hands/v03/v03.04.jpg" alt="Both Hands study v03.04"></td>
    <td><img src="docs/images/gallery/both-hands/v04/v04.00.jpg" alt="Both Hands study v04.00"></td>
  </tr>
  <tr><td align="center">v03.03</td><td align="center">v03.04</td><td align="center">v04.00</td></tr>
  <tr>
    <td><img src="docs/images/gallery/both-hands/v04/v04.01.jpg" alt="Both Hands study v04.01"></td>
    <td><img src="docs/images/gallery/both-hands/v04/v04.02.jpg" alt="Both Hands study v04.02"></td>
    <td><img src="docs/images/gallery/both-hands/v05/v05.00.jpg" alt="Both Hands study v05.00"></td>
  </tr>
  <tr><td align="center">v04.01</td><td align="center">v04.02</td><td align="center">v05.00</td></tr>
  <tr>
    <td><img src="docs/images/gallery/both-hands/v05/v05.01.jpg" alt="Both Hands study v05.01"></td>
    <td><img src="docs/images/gallery/both-hands/v05/v05.02.jpg" alt="Both Hands study v05.02"></td>
    <td><img src="docs/images/gallery/both-hands/v05/v05.03.jpg" alt="Both Hands study v05.03"></td>
  </tr>
  <tr><td align="center">v05.01</td><td align="center">v05.02</td><td align="center">v05.03</td></tr>
  <tr>
    <td><img src="docs/images/gallery/both-hands/v05/v05.04.jpg" alt="Both Hands study v05.04"></td>
    <td><img src="docs/images/gallery/both-hands/v06/v06.00.jpg" alt="Both Hands study v06.00"></td>
    <td><img src="docs/images/gallery/both-hands/v06/v06.01.jpg" alt="Both Hands study v06.01"></td>
  </tr>
  <tr><td align="center">v05.04</td><td align="center">v06.00</td><td align="center">v06.01</td></tr>
  <tr>
    <td><img src="docs/images/gallery/both-hands/v06/v06.02.jpg" alt="Both Hands study v06.02"></td>
    <td></td>
    <td></td>
  </tr>
  <tr><td align="center">v06.02</td><td></td><td></td></tr>
</table>

</details>

## Credits / Acknowledgements

Created by [Shihyun Kao](https://github.com/ShihyunKao) for Computational Arts Practice.

Built with the open-source creative coding communities around [p5.js](https://p5js.org/) and [ml5.js](https://ml5js.org/).

## License

No open-source licence is currently included. Unless a licence is added, the project and its original visual assets remain under the author's copyright.

## Contact / Links

- [GitHub repository](https://github.com/ShihyunKao/slow-digital-garden)
- [Shihyun Kao on GitHub](https://github.com/ShihyunKao)
