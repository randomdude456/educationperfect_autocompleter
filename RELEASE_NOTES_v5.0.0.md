# EP Auto v5.0.0

This release changes the normal installation method from Tampermonkey to a Chrome extension.

## Main changes

- No Tampermonkey.
- No copy/paste installation.
- No browser console or Developer Tools required.
- Chrome Manifest V3 extension.
- Runs in Chrome's isolated content-script environment.
- Removed the old history monkeypatch.
- Still requires **Load vocabulary → Press Enter → Start**.
- Includes speed limit, cooldown, 100/80/60% coverage, Auto Next, safe pauses, and in-panel diagnostics.

## Install

Extract the release ZIP, open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select the extracted folder containing `manifest.json`.
