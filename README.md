# Big Wheel

A React and TypeScript picker wheel for quick decisions, elimination rounds, and repeated tally-style spins.

## Features

- Weighted wheel slices that visually match each item's chance to win
- Normal, elimination, and accumulation modes
- Local saved state for items, mode, theme, and mute preference
- Light and dark themes
- Sound effects with a mute toggle
- Winner modal with keyboard support

## Local Development

Install dependencies:

```powershell
npm.cmd install
```

Start the dev server:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Open the local URL Vite prints. By default it is:

```text
http://127.0.0.1:5173/
```

## Scripts

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run test
npm.cmd run preview
```

## Wheel Modes

`Normal` keeps all visible items available after each spin.

`Elimination` hides the winning item after each spin until only one item remains.

`Accumulation` keeps all items available and increments the winner's count after each spin.

## Weights

Each item has a non-negative whole-number weight. Items with a weight of `0` stay in the list but are not selectable on the wheel. At least two visible items must have a weight greater than `0` before the wheel can spin.

## Verification

Run the full local check before pushing changes:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Assets

Sound effects are credited in the app footer. Custom fonts live in `src/assets/fonts`, and public images/icons live in `public`.
