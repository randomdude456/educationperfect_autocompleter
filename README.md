# EP Auto Answer 4.2

A userscript for Education Perfect vocabulary activities.

Version 4.2 focuses on a simpler interface and a more reliable automation flow:

**Fill answer → Enter/Submit → wait for EP → Continue/Next → repeat**

## Quick setup

1. Install a userscript manager such as Tampermonkey.
2. Download the release ZIP and extract it.
3. Open `EP-Auto-Answer.user.js` in your userscript manager and install it.
4. Disable older versions of the script.
5. Open the Education Perfect vocabulary page where the word pairs are visible.
6. Press **Load & Start** in the EP Auto panel.
7. Leave **Automation ON**.

## Main controls

- **Load & Start** — loads the visible vocabulary list and starts the activity.
- **Pause automation** — stops automatic filling and clicking.
- **?** — opens the simple setup guide inside Education Perfect.
- **Settings & debug** — contains Auto Enter/Submit, Auto Next, and debug information.

## What 4.2 changes

- Unicode-safe matching for Japanese, kanji, accented text, and other non-ASCII languages.
- Versioned answer cache so older broken caches are not reused.
- Simpler status-focused UI.
- Reliable Enter-first submission with button/form fallbacks.
- Auto Next only runs after the current answer has been submitted.
- Stops on a rejected answer instead of endlessly retrying it.
- Safer handling of Education Perfect's hybrid React/Angular interface.
- Removed the old Greasy Fork auto-update metadata so this build is not silently replaced.

## Troubleshooting

### “No saved answer”
Return to the vocabulary list, make sure the pairs are visible, and press **Load & Start** again.

### “No vocab loaded yet”
The script cannot currently see the vocabulary pair list. Open the list page rather than the quiz page, then press **Load & Start**.

### “EP rejected that answer”
Automation intentionally pauses on that question to prevent a retry loop.

### Nothing happens
Make sure only the newest version is enabled, reload Education Perfect, and check **Settings & debug**.

## Credits

This project is derived from the MIT-licensed
`lllons/Education-Perfect-Auto-Answer-2026` project and retains its license
and attribution.

Original authors credited in the userscript: **lllons and Otjl12**.

## License

MIT. See [LICENSE](LICENSE).
