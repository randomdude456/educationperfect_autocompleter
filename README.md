# EP Auto

EP Auto helps with Education Perfect vocabulary activities.

## Install on Chrome

### 1. Download it

Go to:

https://github.com/randomdude456/educationperfect_autocompleter/releases

Open the newest release and download the ZIP under **Assets**.

Extract the ZIP.

### 2. Install Tampermonkey

Open the Chrome Web Store, search **Tampermonkey**, then click **Add to Chrome**.

### 3. Allow scripts

1. Open `chrome://extensions`
2. Find **Tampermonkey**
3. Click **Details**
4. Turn on **Allow User Scripts**

If you do not see that option, turn on **Developer mode** on the extensions page.

### 4. Add EP Auto

1. Click the **Tampermonkey** icon
2. Click **Dashboard**
3. Click **+**
4. Delete the example code
5. Open `EP-Auto-Answer.user.js` from the ZIP
6. Copy everything in the file
7. Paste it into Tampermonkey
8. Press **Ctrl+S** on Windows or **Command+S** on Mac

Make sure EP Auto is switched **ON** in Tampermonkey.

## Use it

1. Open the Education Perfect vocabulary page that shows the word pairs.
2. Click **Load vocabulary**.
3. Wait until EP Auto says **Ready — Press Enter to begin**.
4. Press **Enter**.

EP Auto will not start the activity or answer questions before you press Enter.

## Settings

Open **Settings** in the EP Auto panel if you want to change anything.

- **Speed limit** — minimum time before it answers each question.
- **Cooldown** — extra wait after moving to the next question.
- **Auto-answer coverage** — choose how many questions EP Auto handles.
  - **100%** — automates every supported question.
  - **80%** — roughly 1 in 5 questions is left for you to answer manually.
  - **60%** — leaves more questions for you.
- **Auto Next** — automatically moves to the next question after a submitted answer.

The coverage setting does **not** intentionally enter wrong answers.

## If something goes wrong

EP Auto will normally pause instead of repeatedly clicking or submitting.

Open **Settings → Copy diagnostics**, then paste the result into ChatGPT or another AI with this prompt:

```text
I am using EP Auto from:
https://github.com/randomdude456/educationperfect_autocompleter

I am using Google Chrome.

Here are the diagnostics from EP Auto:
PASTE DIAGNOSTICS HERE

Help me fix it one step at a time.

IMPORTANT:
- Give me only ONE step per reply.
- Tell me exactly what to click or type.
- Keep it very short and simple.
- Do not ask me to run JavaScript in the browser console.
- Do not ask me to use developer tools unless there is no simpler option.
- If you need more information, ask me for a screenshot.
- Wait for me to finish each step before giving me the next one.
```

## Quick fixes

**It says it could not load the list**

Go back to the page that visibly shows the vocabulary pairs, then click **Load vocabulary** again.

**It says “Your turn”**

Either the answer was not found, or your coverage setting intentionally left that question for you. Answer that question normally and EP Auto will continue on a later question.

**It paused**

Check the message in the panel. Fix the question if needed, then click **Resume**.

**EP Auto does not appear**

- Make sure Tampermonkey is ON.
- Make sure EP Auto is ON in Tampermonkey.
- Make sure **Allow User Scripts** is enabled.
- Reload Education Perfect.

## Updating EP Auto

1. Download the newest ZIP from **Releases**.
2. Extract it.
3. Open your EP Auto script in Tampermonkey.
4. Replace the old code with the new `EP-Auto-Answer.user.js`.
5. Save.

## Alternative to Tampermonkey

**Violentmonkey** also works and is open source:

https://violentmonkey.github.io/

For the simplest setup, use Tampermonkey and follow the steps above.

## Credits

Based on the MIT-licensed `lllons/Education-Perfect-Auto-Answer-2026` project.

Original authors credited in the script: **lllons and Otjl12**.

## License

MIT. See [LICENSE](LICENSE).
