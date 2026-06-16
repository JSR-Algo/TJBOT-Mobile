# Teo LCD Face

`preview.html` is a dependency-free animated face renderer for the RK3566 4.3"
LCD target. It recreates the selected `v2/glow-vector` direction as reusable
vector shapes instead of a static generated JPG.

## Preview

Serve `TJBOT-Mobile/src/assets/robot-faces` and open:

```text
http://localhost:8765/teo-lcd/preview.html
```

Kiosk mode for the LCD:

```text
http://localhost:8765/teo-lcd/preview.html?state=idle&theme=teo&kiosk=1
```

## Runtime Control

The renderer exposes a small browser API:

```js
window.TeoFace.setState("listening");
window.TeoFace.setTheme("pink");
```

It also listens for `postMessage` events:

```js
window.postMessage({ type: "teobot-face:set-state", state: "speaking" }, "*");
window.postMessage({ type: "teobot-face:set-theme", theme: "pink" }, "*");
```

Supported states and themes are listed in `manifest.json`.
