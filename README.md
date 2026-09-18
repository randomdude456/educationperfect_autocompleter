# EP Auto

A Chrome extension for supported Education Perfect vocabulary activities.

## Install

You do **not** need Tampermonkey.

You do **not** need to paste code anywhere.

You do **not** need to open Developer Tools.

### 1. Download

Open the newest release:

https://github.com/randomdude456/educationperfect_autocompleter/releases

Download the ZIP under **Assets**, then extract it.

### 2. Add it to Chrome

1. Open Chrome.
2. Type `chrome://extensions` in the address bar.
3. Turn on **Developer mode** in the top-right.
4. Click **Load unpacked**.
5. Select the extracted **EP Auto** folder — the folder containing `manifest.json`.

That is the whole install.

### 3. Use it

1. Open Education Perfect.
2. Open the vocabulary activity.
3. Stay on the page that shows the vocabulary pairs.
4. Click **Load vocabulary**.
5. Wait until EP Auto says **Ready — Press Enter to begin**.
6. Press **Enter**.

EP Auto will not start the activity or answer questions before you press Enter.

## Settings

Open **Settings** in the EP Auto panel to change:

- **Speed limit** — minimum time per question.
- **Cooldown** — extra pause between questions.
- **Auto-answer coverage** — 100%, 80%, or 60%.
- **Auto Next** — automatically continue after an accepted answer.

At 80% coverage, EP Auto leaves roughly 1 in 5 questions for you to answer manually. It does not deliberately submit wrong answers.

## If something goes wrong

Do **not** paste anything into the browser console.

If Education Perfect shows its own developer-console warning, close Developer Tools. EP Auto does not need DevTools.

If EP Auto fails:

1. Open **Settings** in the EP Auto panel.
2. Click **Copy diagnostics**.
3. Paste the diagnostics into AI using the prompt below.

```text
I am using EP Auto from:
https://github.com/randomdude456/educationperfect_autocompleter

I use Google Chrome.

Help me fix it one step at a time.

IMPORTANT:
- Give me only ONE step per reply.
- Keep every reply very short.
- Tell me exactly what to click.
- Assume I know nothing technical.
- Do not tell me to paste code into the browser console.
- Ask me for EP Auto's "Copy diagnostics" text or a screenshot if needed.
- Do not give me several different fixes at once.
- Wait for me to finish each step before giving the next step.
```

## Quick fixes

**EP Auto is not visible**

- Open `chrome://extensions`.
- Make sure **EP Auto** is switched on.
- Reload Education Perfect.

**It says it could not load the list**

- Go back to the page that actually shows the vocabulary pairs.
- Click **Load vocabulary** again.

**It says no saved answer**

- Return to the vocabulary list.
- Load it again.

**Education Perfect sends you back to the homepage**

Disable EP Auto, reload Education Perfect, and copy the EP Auto diagnostics or take a screenshot of what happened. This project does not attempt to bypass Education Perfect's platform protections.

## Updating

1. Download the newest release ZIP.
2. Extract it.
3. Open `chrome://extensions`.
4. Remove the old **EP Auto** extension.
5. Click **Load unpacked** and select the new extracted folder.

## Credits

Based on the MIT-licensed `lllons/Education-Perfect-Auto-Answer-2026` project.

Original authors credited in the earlier userscript: **lllons and Otjl12**.

## License

MIT. See [LICENSE](LICENSE).
