# Education Perfect Autocompleter — EP Auto 4.2

EP Auto is a small browser add-on script for Education Perfect vocabulary activities.

If you have never used a **userscript** before, that is completely fine. This guide starts from the beginning.

> **Short version:** install a userscript manager in Chrome, download the latest EP Auto ZIP from GitHub Releases, open the `.user.js` file, and press **Install**.

---

## What is a userscript?

A **userscript** is a small JavaScript file that changes how a website behaves **in your own browser**.

For example, a userscript can:

- add buttons to a website;
- change the layout;
- fill repetitive fields;
- add keyboard shortcuts;
- automate browser actions.

EP Auto is a userscript. It only runs on Education Perfect pages matched by the script.

A userscript does **not** run by itself. Chrome needs a browser extension called a **userscript manager** to install and run it.

## What is a userscript manager?

A **userscript manager** is a Chrome extension that stores userscripts and runs them on the websites they are meant for.

Think of it like this:

> **Chrome → userscript manager → EP Auto → Education Perfect**

You install the userscript manager once. Then you install EP Auto inside it.

---

# Recommended setup for Chrome

## Option A — Tampermonkey

Tampermonkey is the easiest option to follow with this guide and is widely used on Chrome.

Official site: https://www.tampermonkey.net/

### Step 1 — Install Tampermonkey

1. Open **Google Chrome**.
2. Open the **Chrome Web Store**.
3. Search for **Tampermonkey**.
4. Make sure the extension is the real Tampermonkey extension.
5. Click **Add to Chrome**.
6. Click **Add extension** when Chrome asks for confirmation.

You should now see Tampermonkey on your Chrome extensions page.

### Step 2 — Allow Chrome to run userscripts

This step is important on modern versions of Chrome.

1. Type this into Chrome's address bar:

   `chrome://extensions`

2. Find **Tampermonkey**.
3. Click **Details**.
4. Turn on **Allow User Scripts** if that option appears.

If your Chrome version does not show **Allow User Scripts**, turn on **Developer mode** at the top-right of `chrome://extensions` instead.

This does **not** mean you need to write code. It simply gives the extension permission to run userscripts.

### Step 3 — Download EP Auto

1. Open this repository on GitHub.
2. Click **Releases** on the right side of the repository page.
3. Open the newest release.
4. Under **Assets**, download:

   `EP-Auto-Answer-v4.2.0.zip`

5. Open the downloaded ZIP.
6. Inside it, find:

   `EP-Auto-Answer.user.js`

### Step 4 — Install EP Auto into Tampermonkey

The most reliable method is to use Tampermonkey's editor:

1. Click the **Tampermonkey** extension icon in Chrome.
2. Click **Dashboard**.
3. Click the **+** tab / **Create a new script**.
4. Delete the example code already in the editor.
5. Open `EP-Auto-Answer.user.js` from the downloaded ZIP folder in a normal text editor.
6. Copy all of the code.
7. Paste it into Tampermonkey's editor.
8. Press **Ctrl+S** on Windows/Linux or **Command+S** on macOS.
9. Go back to the Tampermonkey Dashboard.
10. Make sure **EP Auto** is switched **ON**.

You only need to do this once for each version you install.

### Step 5 — Use EP Auto

1. Open Education Perfect.
2. Open the vocabulary activity you want to use.
3. Go to the page that visibly shows the vocabulary word pairs.
4. The **EP Auto** panel should appear in the top-right.
5. Click **Load & Start**.
6. Wait until the panel says that the vocabulary pairs are ready.
7. Leave **Automation ON**.

The intended flow is:

`Question → Fill → Enter/Submit → EP result → Next question`

---

# Other userscript managers

You do **not** have to use Tampermonkey.

## Violentmonkey — recommended open-source alternative

Official site: https://violentmonkey.github.io/

Violentmonkey is open source and supports Chrome/Chromium browsers. Its Chrome Web Store listing says it does not collect or use user data, and its official site says it contains no ads and does not modify pages unless one of your installed scripts tells it to.

If you care most about transparency and open-source software, **Violentmonkey is a very good choice**.

The basic install process is similar:

1. Install **Violentmonkey** from the Chrome Web Store.
2. Open its dashboard.
3. Create a new userscript or open the `.user.js` file with Violentmonkey.
4. Paste/import `EP-Auto-Answer.user.js`.
5. Save it and make sure it is enabled.
6. Reload Education Perfect.

## Which one should I use?

| Manager | Good choice if you want... |
|---|---|
| **Tampermonkey** | the most familiar option and the instructions in this README exactly as written |
| **Violentmonkey** | an open-source manager with a simple interface and strong browser support |

There are other userscript managers, but for a beginner on Chrome I would stick to one of these two rather than installing an unknown extension.

> **Important safety note:** a userscript manager can run code inside websites, so the biggest safety rule is simple: only install userscripts whose source you trust. A reputable manager cannot make an unsafe script safe.

---

# What EP Auto does

EP Auto 4.2 is focused on Education Perfect vocabulary activities.

It can:

- read vocabulary pairs from the list page;
- match questions to cached vocabulary answers;
- support Japanese, kanji, accented characters and other Unicode text;
- fill the answer field;
- automatically trigger Enter/Submit;
- wait for Education Perfect to respond;
- automatically continue to the next question;
- stop if an answer is rejected instead of repeatedly looping;
- show a simple status panel so you can see what it is doing.

## Main controls

### Load & Start

Reads the visible vocabulary list and starts the activity.

### Pause automation

Stops automatic filling and clicking.

### ?

Opens the simple setup help inside Education Perfect.

### Settings & debug

Shows the optional **Auto Enter / Submit**, **Auto Next**, and debug controls.

---

# Troubleshooting

## The EP Auto panel does not appear

1. Open `chrome://extensions`.
2. Check that your userscript manager is enabled.
3. If using Tampermonkey, check **Allow User Scripts** is enabled in Tampermonkey's extension details.
4. Open the userscript manager dashboard and check that **EP Auto** is enabled.
5. Reload the Education Perfect tab.

## It says “No saved answer”

Go back to the vocabulary list where the pairs are visible and press **Load & Start** again.

## It says “No vocab loaded yet”

You are probably already inside the quiz. Return to the page where Education Perfect shows the vocabulary pairs first.

## It says “EP rejected that answer”

The automation intentionally stops on that question instead of repeatedly submitting a bad answer.

## I installed a new version but the old one still runs

Open your userscript manager dashboard and disable or delete older EP Auto versions. Keep only the newest version enabled.

---

# Updating

The easiest way to update is:

1. Open **Releases** on this GitHub repository.
2. Download the newest ZIP.
3. Extract it.
4. Open the new `EP-Auto-Answer.user.js`.
5. Replace/update your installed EP Auto script in your userscript manager.
6. Disable any older version.

---

# Releases

GitHub Releases are the recommended way to download EP Auto.

Each tagged version such as `v4.2.0` automatically creates a release containing a ZIP file.

The ZIP contains:

- `EP-Auto-Answer.user.js`
- `README.md`
- `SETUP.md`
- `CHANGELOG.md`
- `LICENSE`

---

# Credits

This project is derived from the MIT-licensed `lllons/Education-Perfect-Auto-Answer-2026` project and retains its license and attribution.

Original authors credited in the userscript: **lllons and Otjl12**.

# License

MIT. See [LICENSE](LICENSE).
