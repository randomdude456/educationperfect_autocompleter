# Changelog

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
