# EP Auto

EP Auto helps automate supported Education Perfect vocabulary activities.

## Install on Chrome

### 1. Download EP Auto

Open:

https://github.com/randomdude456/educationperfect_autocompleter

Then:

1. Click **Releases**.
2. Open the newest release.
3. Download the ZIP under **Assets**.
4. Extract the ZIP.

### 2. Install Tampermonkey

1. Open the **Chrome Web Store**.
2. Search for **Tampermonkey**.
3. Click **Add to Chrome**.

### 3. Allow scripts in Chrome

1. Open `chrome://extensions`
2. Find **Tampermonkey**.
3. Click **Details**.
4. Turn on **Allow User Scripts**.

If you do not see **Allow User Scripts**, turn on **Developer mode** on the main extensions page instead.

### 4. Add EP Auto to Tampermonkey

1. Click the **Tampermonkey** icon in Chrome.
2. Click **Dashboard**.
3. Click the **+** button.
4. Delete the example code.
5. Open `EP-Auto-Answer.user.js` from the ZIP you extracted.
6. Copy everything in that file.
7. Paste it into Tampermonkey.
8. Press **Ctrl+S** on Windows or **Command+S** on Mac.

Make sure EP Auto is switched **ON** in Tampermonkey.

## Use it

1. Open Education Perfect.
2. Open the vocabulary activity.
3. Go to the page that shows the vocabulary pairs.
4. Click **Load & Start** in the EP Auto panel.
5. Leave **Automation ON**.

That is it.

## If you get stuck

Copy this prompt into ChatGPT or another AI:

```text
I am trying to install EP Auto from:
https://github.com/randomdude456/educationperfect_autocompleter

I am using Google Chrome.

Help me one step at a time.

IMPORTANT:
- Give me only ONE step per reply.
- Tell me exactly what to click or type.
- Keep every reply very short and simple.
- Assume I know nothing about GitHub, Tampermonkey, extensions, ZIP files, or Terminal.
- If something goes wrong, ask me to paste the exact error or send a screenshot.
- Do not give me multiple solutions unless the first one fails.
- Wait for me to say I finished each step before giving me the next one.
```

## Quick fixes

**EP Auto does not appear**

- Make sure Tampermonkey is ON.
- Make sure EP Auto is ON inside Tampermonkey.
- Make sure **Allow User Scripts** is enabled.
- Reload Education Perfect.

**It says “No saved answer”**

Go back to the page showing the vocabulary pairs and press **Load & Start** again.

**You installed a newer version**

Disable or delete the older EP Auto version in Tampermonkey.

## Updating EP Auto

1. Download the newest ZIP from **Releases**.
2. Extract it.
3. Replace the code in your Tampermonkey EP Auto script with the new `EP-Auto-Answer.user.js`.
4. Save.

## Alternative to Tampermonkey

You can also use **Violentmonkey**.

It is open source and works on Chrome.

https://violentmonkey.github.io/

For the easiest setup, just use **Tampermonkey** and follow the steps above.

## Credits

Based on the MIT-licensed `lllons/Education-Perfect-Auto-Answer-2026` project.

Original authors credited in the script: **lllons and Otjl12**.

## License

MIT. See [LICENSE](LICENSE).
