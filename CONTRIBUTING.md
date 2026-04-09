# Contributing to even-nba-pulse

## Overview

This project is an Even Realities G2 app that renders a live NBA timeline on the glasses. Contributions should preserve the constraints of the Even Hub platform (container-based UI, single event capture model, BLE-driven updates) and maintain a predictable, testable render pipeline.

---

## Development Setup

### Prerequisites

* Node.js (LTS recommended)
* npm
* Even Hub CLI (`@evenrealities/evenhub-cli`)
* Optional: Even Hub Simulator

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Generate QR for device testing

```bash
npm run qr
```

### Build and package

```bash
npm run build
npm run pack
```

---

## Contribution Workflow

1. Fork the repository
2. Create a feature branch

   ```bash
   git checkout -b feature/<short-description>
   ```
3. Make changes
4. Run tests and verify behavior
5. Submit a pull request

---

## Pull Request Requirements

All PRs must:

* Be scoped to a single logical change
* Include a clear description of:

  * What changed
  * Why it changed
  * Any trade-offs introduced
* Pass all existing tests
* Include new tests if logic is added or modified
* Avoid unrelated refactors

---

## Even Realities-Specific Constraints

Contributions must respect platform rules:

### UI / Rendering

* Max ~4 containers per page (practical limit)
* Exactly **one** container must have `isEventCapture: 1`
* UI must be derived from state → container config (no ad hoc mutation)
* Prefer `textContainerUpgrade` over full rebuilds when possible

### Events

* Handle inconsistent event shapes (simulator vs hardware)
* Do not assume `CLICK_EVENT` is always present (may be `undefined`)
* Avoid tight loops or unthrottled scroll handling

### Images

* Do not send images during startup
* All image updates must be **sequential (queued)**

### Performance

* Minimize `rebuildPageContainer` usage (causes flicker)
* Keep payload sizes small (BLE constraints)

---

## Testing Expectations

Every PR should indicate:

* [ ] Tested in simulator
* [ ] Tested on real device (if applicable)
* [ ] Event behavior validated (click, scroll, pagination)
* [ ] No regressions in timeline rendering

---

## Code Guidelines

* TypeScript preferred for logic
* Keep rendering logic centralized (single render function or equivalent)
* Separate:

  * state management
  * rendering (container construction)
  * event handling
* Avoid unnecessary dependencies

---

## What to Contribute

Good contributions include:

* Bug fixes (event handling, rendering edge cases)
* Performance improvements
* Better pagination / timeline UX
* Data normalization improvements
* Test coverage expansion

Avoid:

* Large architectural rewrites without discussion
* Adding heavy UI abstractions that conflict with container model

---

## Reporting Issues

When filing an issue, include:

* Description of the problem
* Steps to reproduce
* Expected vs actual behavior
* Environment:

  * Simulator / real device
  * SDK / CLI versions
* Screenshots or logs if relevant

---

## Notes

* The simulator is not a perfect representation of hardware behavior
* Always prioritize correctness on real G2 devices when possible
* Packaging must conform to `app.json` schema and Even Hub validation rules 

---

## License

By contributing, you agree that your contributions will be licensed under the same license as this repository.
