  ```
    __    __  _______    ______
   |  \  |  \|       \  /      \
   | $$\ | $$| $$$$$$$\|  $$$$$$\
   | $$$\| $$| $$__/ $$| $$__| $$
   | $$$$\ $$| $$    $$| $$    $$
   | $$\$$ $$| $$$$$$$\| $$$$$$$$
   | $$ \$$$$| $$__/ $$| $$  | $$
   | $$  \$$$| $$    $$| $$  | $$
    \$$   \$$ \$$$$$$$  \$$   \$$
     ________  ___  ___  ___       ________  _______
    |\   __  \|\  \|\  \|\  \     |\   ____\|\  ___ \
    \ \  \|\  \ \  \\\  \ \  \    \ \  \___|\ \   __/|
     \ \   ____\ \  \\\  \ \  \    \ \_____  \ \  \_|/__
      \ \  \___|\ \  \\\  \ \  \____\|____|\  \ \  \_|\ \
       \ \__\    \ \_______\ \_______\____\_\  \ \_______\
        \|__|     \|_______|\|_______|\_________\|_______|
                                     \|_________|
```

# NBA Pulse on Even Hub: start-to-finish guide

This guide is a walkthrough on how I created this Even Hub app package.

---

## 1) Definition of build

NBA Pulse is a pull-based Even app for G2 glasses. When opened, it fetches the NBA live scoreboard and the play-by-play feed for one selected game, then renders a compact timeline on the glasses.

It is designed around current Even constraints:

- apps are web apps running in the phone-hosted Even app WebView
- the glasses render text/image containers and send input events back
- only one container can capture input at a time
- `createStartUpPageContainer` should be called once, then text should be updated in place where possible

This scaffold uses a fixed 4-container layout:

1. header text
2. body timeline text
3. footer text
4. hidden full-screen text capture layer

That means the app can refresh the visible content with `textContainerUpgrade` after startup instead of rebuilding the entire page on every interaction.

---

## 2) Prerequisites

Required:

- Node.js 18+
- the Even Realities app on your phone
- G2 glasses for real testing
- the optional R1 ring if you want ring input

Install the current official tools:

```bash
npm install @evenrealities/even_hub_sdk
npm install -D @evenrealities/evenhub-cli
npm install -g @evenrealities/evenhub-simulator
```

If you prefer local project installs only, keep the simulator global and the CLI local.

---

## 3) Create the app folder

```bash
mkdir even-nba-pulse
cd even-nba-pulse
```

Copy the scaffold files from this package into that folder, or unzip the provided archive there.

Then install dependencies:

```bash
npm install
```

---

## 4) Understand the key files

### `app.json`
This is the Even Hub manifest.

Important fields:

- `package_id`: must be lowercase reverse-domain format
- `edition`: current docs use `202601`
- `name`: 20 chars or fewer
- `entrypoint`: must exist in `dist/` after build
- `permissions`: array of objects, not a key-value map

For this app, the only required permission is:

- `network` for `https://cdn.nba.com`

### `src/lib/nbaApi.js`
Fetches and normalizes:

- today's scoreboard
- one game's play-by-play feed

### `src/evenBridge.js`
Handles:

- connecting to the Even bridge when running in Even / simulator
- falling back to a mock bridge in a regular browser
- creating the startup layout once
- pushing text updates afterward

### `src/app.js`
Owns the state machine:

- selected game
- current play page
- sort direction
- refresh loop
- mapping Even events to actions

### `tests/nba.test.mjs`
Tests the data shaping logic without needing the Even SDK or hardware.

---

## 5) Run the tests first

```bash
npm test
```

This verifies:

- scoreboard normalization
- live-game selection logic
- play normalization
- pagination
- compact line formatting

---

## 6) Run locally in a desktop browser

```bash
npm run dev
```

Open the local URL shown by Vite.

What works in a normal browser:

- the phone-side preview UI
- live NBA fetches
- refresh / next game / toggle sort buttons

What does not work without Even / simulator:

- the real glasses HUD
- ring / glasses touch events

The scaffold uses a mock bridge in that situation so you can still validate the data and formatting.

---

## 7) Run in the Even simulator

Start the dev server:

```bash
npm run dev
```

Then in a second terminal:

```bash
evenhub-simulator http://localhost:5173
```

Use Up, Down, Click, and Double Click in the simulator to verify:

- tap cycles games
- double tap opens exit confirmation
- swipe / scroll pages through the event list

Remember: simulator behavior is helpful for layout and logic, but it is not identical to hardware.

---

## 8) Test on real G2 hardware

Start the dev server on your machine's LAN address:

```bash
npm run dev
```

(Optional) Generate a QR code:

```bash
npm run qr
```

If needed, use the explicit URL form instead:

```bash
npx evenhub qr --url "http://192.168.1.100:5173"
```

Then:

1. open the Even Realities app on your phone
2. go to the Even Hub area
3. scan the QR code
4. launch the app on the glasses

Now verify on hardware:

- startup layout appears once
- taps work from both glasses and ring
- page flips feel correct
- repeated updates do not flicker excessively
- no unexpected text wrapping breaks the timeline
- "Live Feed" badge glows green when game is live
- glasses footer shows full text
- glasses shows `v` arrow when more pages below

---

## 9) Build for packaging

```bash
npm run build
```

This creates `dist/`.

This scaffold uses a Vite config that flattens build output names (`app.js`, `app.css`) to keep the package simple and avoid nested-asset issues.

After build, confirm these exist:

```bash
ls dist
```

You should see at least:

- `index.html`
- `app.js`
- `app.css` (or a CSS file if generated)

---

## 10) Pack into `.ehpk`

```bash
npm run pack
```

Equivalent direct command:

```bash
evenhub pack app.json dist -o even-nba-pulse.ehpk --check
```

What `--check` does:

- validates the manifest
- checks whether the package ID is available

Common failures:

### Invalid package ID
Use lowercase reverse-domain style, for example:

```json
"package_id": "com.openai.nbapulse"
```

### Entrypoint file not found
Make sure `dist/index.html` exists and `app.json` points to `index.html`.

### Permissions shape invalid
Permissions must be:

```json
"permissions": [
  {
    "name": "network",
    "desc": "...",
    "whitelist": ["https://cdn.nba.com"]
  }
]
```

Not:

```json
"permissions": {
  "network": ["https://cdn.nba.com"]
}
```

---

## 11) Upload into Even Hub

After packing, you will have:

```text
even-nba-pulse.ehpk
```

Then:

1. sign into the Even Hub portal / developer flow
2. create a new app entry or private build entry
3. upload the `.ehpk`
4. test on device from the portal

If you do not yet have the required access, use the Even Hub application / onboarding page first.

---

## 12) How the input mapping works

This app is intentionally simple:

- tap / click → next game
- double tap → exit confirmation dialog
- scroll down → next play page
- scroll up → previous play page
- mouse wheel (browser) → scroll timeline

---

## 13) Sample validation checklist

Verify all of these on hardware:

- [ ] first page creates once and does not recreate every refresh
- [ ] tap, double tap, swipe up, swipe down all work from glasses
- [ ] ring input works the same way
- [ ] timeline paging does not drift or skip
- [ ] scheduled games gracefully show "not started" state
- [ ] repeated refreshes do not error under normal network conditions
- [ ] "Live Feed" badge glows green when game is live
- [ ] glasses footer shows full text: `tap next • dbl tap exit • scroll pages`
- [ ] glasses shows `v` arrow when more pages below
- [ ] browser timeline scrolls with mouse wheel