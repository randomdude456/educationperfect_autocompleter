# Changelog

## 5.0.0

- Replaced the normal Tampermonkey install with a Chrome Manifest V3 extension.
- No code pasting, browser console, or userscript manager is required.
- Runs as an isolated Chrome content script.
- Removed the browser-history monkeypatch used by the old userscript build.
- Kept the safer flow: load vocabulary first, then press Enter before automation starts.
- Kept speed limit, cooldown, manual coverage, and safe error pauses.
- Simplified beginner install and troubleshooting instructions.
- The extension does not attempt to bypass Education Perfect platform protections.

## 4.3.0

- Added a minimum speed limit setting.
- Added a configurable cooldown between questions.
- Added 100%, 80%, and 60% auto-answer coverage; manual coverage never intentionally answers incorrectly.
- Separated vocabulary loading from starting the activity. EP Auto now waits for the user to press Enter before starting.
- Reworked vocabulary loading to collect pairs while scrolling and retry once on failure.
- Simplified the panel UI.
- Added safe pauses for missing answers, wrong verdicts, submit failures, and timeouts.
- Removed all browser-console debug output. Diagnostics are shown and copied from the panel instead.

## 4.2.1

- Rewrote the README and setup guide for complete beginners.
- Added a one-step-at-a-time AI help prompt for people who get stuck.
- Simplified the GitHub push helper to use SSH only.
- Updated repository links for the `randomdude456` username.
- No automation behaviour changes.

## 4.2.0

- Redesigned the control panel around a simple status display.
- Added an in-page setup/help guide.
- Fixed the auto-submit race from 4.1.1.
- Changed automation to an explicit Fill → Enter/Submit → verdict → Next flow.
- Enter is the primary submit method, with visible Submit and form submission fallbacks.
- Auto Next is blocked until the current answer has been submitted.
- Added safer handling for rejected answers.
- Kept Unicode-safe matching and versioned cache handling from 4.1.1.

## 4.1.1

- Fixed Japanese and other Unicode text being erased by answer normalization.
- Versioned the answer cache to prevent reuse of broken cached entries.

## 4.1.0

- Initial compatibility patch for the 2026 hybrid Education Perfect UI.
