# Simple setup

## Install

1. Extract the downloaded ZIP.
2. Install Tampermonkey or another userscript manager.
3. Open `EP-Auto-Answer.user.js`.
4. Choose **Install** in your userscript manager.
5. Disable/delete older EP Auto versions.
6. Reload Education Perfect.

## Use

1. Open the EP vocabulary task.
2. Go to the page that visibly shows the word pairs.
3. Press **Load & Start**.
4. Wait until the panel says the vocab pairs are ready.
5. Keep **Automation ON**.

The normal flow is:

`Question → Fill → Enter → EP verdict → Next question`

## Problems

- **No saved answer:** reload the word list with **Load & Start**.
- **No vocab loaded yet:** you are probably on the quiz rather than the list page.
- **Rejected answer:** the script pauses instead of looping.
- **Nothing happens:** disable older script versions and reload the tab.
