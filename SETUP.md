# EP Auto 4.2 — simple Chrome setup

If you have never installed a userscript before, use these steps in order.

## 1. Install a userscript manager

A userscript manager is a Chrome extension that runs small scripts such as EP Auto.

Recommended choices:

- **Tampermonkey** — https://www.tampermonkey.net/
- **Violentmonkey** — https://violentmonkey.github.io/

The instructions below use Tampermonkey.

## 2. Install Tampermonkey in Chrome

1. Open the Chrome Web Store.
2. Search for **Tampermonkey**.
3. Click **Add to Chrome**.
4. Click **Add extension**.

## 3. Enable Chrome's userscript permission

1. Open `chrome://extensions`.
2. Find Tampermonkey and click **Details**.
3. Enable **Allow User Scripts** if you see it.
4. If you do not see that option, enable **Developer mode** on the main `chrome://extensions` page.

## 4. Download EP Auto

1. Open this GitHub repository.
2. Open **Releases**.
3. Open the latest release.
4. Download the ZIP under **Assets**.
5. Extract the ZIP.

## 5. Add EP Auto to Tampermonkey

1. Click the Tampermonkey icon.
2. Open **Dashboard**.
3. Click **+** / **Create a new script**.
4. Delete the example code.
5. Open `EP-Auto-Answer.user.js` from the extracted ZIP.
6. Copy all of its text.
7. Paste it into Tampermonkey.
8. Save with **Ctrl+S** or **Command+S**.
9. Make sure EP Auto is enabled in the dashboard.

## 6. Use it

1. Open Education Perfect.
2. Open a vocabulary activity.
3. Go to the page where the vocabulary pairs are visible.
4. Press **Load & Start** in the EP Auto panel.
5. Wait for the panel to say the pairs are ready.
6. Keep **Automation ON**.

Normal flow:

`Question → Fill → Enter → EP result → Next`

## If it does not appear

- Check Tampermonkey is enabled.
- Check **Allow User Scripts** is enabled.
- Check EP Auto is enabled inside Tampermonkey.
- Reload Education Perfect.
- Disable older EP Auto versions.
