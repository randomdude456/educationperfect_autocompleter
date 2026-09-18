# EP Auto v5.0.3

Safety-focused bugfix for the first-question redirect issue.

## Fixed

- Removed fake Enter-key submission.
- Removed form submission fallback.
- Uses Education Perfect's real Submit button only.
- Uses explicit Continue/Next controls only.
- Runs automation only while the URL is actually on `/game`.
- Stops immediately if Education Perfect leaves the game page.
- Keeps lightweight polling and no console debugging.

This build is intentionally more conservative: if a safe control is not found, it pauses instead of guessing.
