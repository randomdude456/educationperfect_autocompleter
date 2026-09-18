// ==UserScript==
// @name         🎓 Education Perfect - Auto Answer (2026) - Compatibility Patch
// @namespace    https://educationperfect.com
// @version      4.2.1
// @description  Friendly EP automation UI with reliable Fill → Enter/Submit → verdict → Next flow.
// @author       lllons and Otjl12; compatibility patch
// @match        https://app.educationperfect.com/*
// @match        https://*.educationperfect.com/*
// @icon         https://raw.githubusercontent.com/lllons/Education-Perfect-Auto-Answer-2026/main/R.png
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /*
   * IMPORTANT:
   * The old @updateURL/@downloadURL entries are intentionally removed.
   * Leaving them in would let the older Greasy Fork build overwrite this patch.
   */

  const CFG = {
    debug: true,
    autoLoadList: true,
    autoStart: true,
    autoFill: true,
    autoSubmit: true,
    autoAdvance: true,
    typeDelay: 0,
    pollInterval: 200,
    actionCooldown: 120,
    submitDelay: 240,
    submitFallbackDelay: 220,
    advanceDelay: 420,
    verdictTimeout: 7000,
    listLoadTimeout: 5000,
    toastDuration: 2200,
    fuzzyThreshold: 0.82,
  };

  const STORAGE_KEY = 'ep-auto-answer-4.2-answer-map';

  const SEL = {
    listRoot: ['#list-starter', '[id="list-starter"]'],
    pairRows: ['.preview-grid .stats-item', '#preview-grid-container .stats-item', '.preview-grid > li'],
    target: ['.targetLanguage.question-label', '.targetLanguage', '[class*="targetLanguage"]'],
    base: ['.baseLanguage.question-label', '.baseLanguage', '[class*="baseLanguage"]'],
    question: ['#question-text', '#question-block #question-text', '[data-testid="question-text"]', '[id$="question-text"]'],
    answer: ['#answer-text', '#answer-block input[type="text"]', '#answer-block textarea', 'input[autofocus][type="text"]'],
    submit: ['#submit-button', 'button[id*="submit"]'],
    continue: ['#continue-button', '.next-question-button', '.information-controls button'],
    verdictCorrect: ['#correct-popup.shown', '#correct-popup:not(.ng-hide):not(.sf-hidden)', '.history-item.current.correct', '.history-item.correct.current', '.cheer-button:not(.ng-hide):not(.sf-hidden)'],
    verdictWrong: ['.history-item.current.incorrect', '.history-item.incorrect.current', '.action-bar-button.try-again', '.modeless-answer-dialog tr.incorrect'],
    start: ['#start-button-main', '#preview-header-start-button', '#start-button-school'],
    fullList: ['#full-list-switcher'],
  };

  let answerMap = loadStoredMap();
  let enabled = true;
  let autoSubmit = CFG.autoSubmit;
  let autoAdvance = CFG.autoAdvance;
  let observer = null;
  let pollTimer = null;
  let tickBusy = false;
  let lastActionAt = 0;
  let lastQuestion = '';
  let lastFilledKey = '';
  let lastAutoLoadUrl = '';
  let panel = null;
  let countEl = null;
  let debugEl = null;
  let pauseBtn = null;
  let submitBtn = null;
  let advanceBtn = null;
  let toastEl = null;
  let toastTimer = null;
  let stateEl = null;
  let stateSubEl = null;
  let masterBtn = null;
  let flowPhase = 'READY';
  let submittedAt = 0;
  let submittedQuestion = '';
  let verdictSeenAt = 0;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function log(...args) {
    if (CFG.debug) console.log('[EP 4.2.1]', ...args);
  }

  function setDebug(message) {
    if (debugEl) debugEl.textContent = message || '';
    if (CFG.debug && message) console.log('[EP 4.2.1]', message);
  }

  function setState(title, detail = '') {
    if (stateEl) stateEl.textContent = title;
    if (stateSubEl) stateSubEl.textContent = detail;
  }

  function resetFlow(question = '') {
    flowPhase = 'READY';
    submittedAt = 0;
    submittedQuestion = question;
    verdictSeenAt = 0;
  }

  function hasVisibleSelector(selectors) {
    return selectors.some(selector =>
      Array.from(document.querySelectorAll(selector)).some(isVisible)
    );
  }

  function verdictState() {
    if (hasVisibleSelector(SEL.verdictCorrect)) return 'correct';
    if (hasVisibleSelector(SEL.verdictWrong)) return 'wrong';
    return null;
  }

  function dispatchEnter(el) {
    if (!el) return;
    for (const type of ['keydown', 'keypress', 'keyup']) {
      el.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      }));
    }
  }

  function queryFirst(selectors, root = document) {
    for (const selector of selectors) {
      const el = root.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function queryAll(selectors, root = document) {
    const seen = new Set();
    const out = [];
    for (const selector of selectors) {
      for (const el of root.querySelectorAll(selector)) {
        if (!seen.has(el)) {
          seen.add(el);
          out.push(el);
        }
      }
    }
    return out;
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 &&
      style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' &&
      !el.closest('.ng-hide, .sf-hidden, [hidden]');
  }

  function isEnabled(el) {
    if (!el) return false;
    if (el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    if (el.hasAttribute('disabled')) return false;
    return true;
  }

  function safeClick(el) {
    if (!el || !isVisible(el) || !isEnabled(el)) return false;
    try {
      el.click();
      lastActionAt = Date.now();
      return true;
    } catch (err) {
      log('click failed', err);
      return false;
    }
  }

  function text(el) {
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function stripAlts(value) {
    if (!value) return value;
    // EP lists can use either ASCII or full-width semicolons.
    const match = value.match(/[;；]/);
    return (match ? value.slice(0, match.index) : value).trim();
  }

  function norm(value) {
    // Unicode-safe normalisation. The old 4.1.0 regex only allowed a-z,
    // which turned Japanese such as "おもしろい" into an empty string.
    // NFKC also folds common full-width forms into their canonical versions.
    let out = String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase()
      .replace(/[’‘`]/g, "'");

    try {
      // Keep letters, combining marks and numbers from *all* scripts.
      out = out.replace(/[^\p{L}\p{M}\p{N}\s'＋+\-−–—*×/÷=.,!?！？%％()（）]/gu, '');
    } catch {
      // Fallback for engines without Unicode property escapes: remove only
      // control characters, leaving non-Latin scripts intact.
      out = out.replace(/[\u0000-\u001f\u007f]/g, '');
    }

    return out.replace(/\s+/g, ' ').trim();
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const la = a.length;
    const lb = b.length;
    if (Math.abs(la - lb) / Math.max(la, lb) > 0.55) return 0;

    const prev = Array.from({ length: lb + 1 }, (_, j) => j);
    const cur = new Array(lb + 1);
    for (let i = 1; i <= la; i++) {
      cur[0] = i;
      for (let j = 1; j <= lb; j++) {
        cur[j] = a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
      }
      for (let j = 0; j <= lb; j++) prev[j] = cur[j];
    }
    return 1 - prev[lb] / Math.max(la, lb);
  }

  function findAnswer(rawQuestion) {
    const q = norm(rawQuestion);
    if (!q) return null;

    if (Object.prototype.hasOwnProperty.call(answerMap, q)) {
      return answerMap[q];
    }

    // Substring matching is useful for prompts such as "Translate: bonjour",
    // but only for reasonably long keys so short words do not collide.
    let contained = null;
    let containedLen = -1;
    for (const [key, value] of Object.entries(answerMap)) {
      if (key.length >= 4 && (q.includes(key) || key.includes(q))) {
        if (key.length > containedLen) {
          contained = value;
          containedLen = key.length;
        }
      }
    }
    if (contained) return contained;

    let bestScore = 0;
    let bestValue = null;
    for (const [key, value] of Object.entries(answerMap)) {
      const score = similarity(q, key);
      if (score > bestScore) {
        bestScore = score;
        bestValue = value;
      }
    }

    return bestScore >= CFG.fuzzyThreshold ? bestValue : null;
  }

  function saveMap() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answerMap));
    } catch (err) {
      log('Could not persist map', err);
    }
  }

  function loadStoredMap() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function getPairsFromRows() {
    const rows = queryAll(SEL.pairRows);
    const pairs = [];

    for (const row of rows) {
      const targetEl = queryFirst(SEL.target, row);
      const baseEl = queryFirst(SEL.base, row);
      const target = stripAlts(text(targetEl));
      const base = stripAlts(text(baseEl));
      if (target && base) pairs.push([target, base]);
    }

    if (pairs.length) return pairs;

    // Fallback for layouts where target/base nodes are not wrapped in rows.
    const targets = queryAll(SEL.target);
    const bases = queryAll(SEL.base);
    const len = Math.min(targets.length, bases.length);
    for (let i = 0; i < len; i++) {
      const target = stripAlts(text(targets[i]));
      const base = stripAlts(text(bases[i]));
      if (target && base) pairs.push([target, base]);
    }
    return pairs;
  }

  function loadAnswers() {
    const pairs = getPairsFromRows();
    const map = {};

    for (const [target, base] of pairs) {
      const targetKey = norm(target);
      const baseKey = norm(base);
      if (targetKey) map[targetKey] = base;
      if (baseKey) map[baseKey] = target;
    }

    if (pairs.length) {
      answerMap = map;
      saveMap();
      lastFilledKey = '';
      updateCount();
      showToast(`✅ ${pairs.length} pairs loaded`);
      setDebug(`Loaded ${pairs.length} vocab pairs`);
    } else {
      showToast('⚠️ No vocab pairs found');
      setDebug('No vocab pairs found on this page');
    }
    return pairs.length;
  }

  async function expandAndLoadList() {
    const fullButton = queryFirst(SEL.fullList);
    if (fullButton && isVisible(fullButton)) safeClick(fullButton);

    const deadline = Date.now() + CFG.listLoadTimeout;
    let lastCount = -1;
    let stablePasses = 0;

    while (Date.now() < deadline) {
      const grid = document.querySelector('.preview-grid');
      grid?.lastElementChild?.scrollIntoView({ block: 'end' });

      const count = getPairsFromRows().length;
      if (count > 0 && count === lastCount) stablePasses++;
      else stablePasses = 0;

      lastCount = count;
      if (stablePasses >= 3) break;
      await sleep(180);
    }

    return loadAnswers();
  }

  function getQuestion() {
    const el = queryFirst(SEL.question);
    if (!el || !isVisible(el)) return null;

    const value = text(el);
    const junk = /^(replay|hint|submit|continue|next question|electronic|voice|translate|from|to|writing|reading|listening|dictation|speaking|practise|pronunciation|master|advanced|unit|vocab|list|\d+%?)$/i;
    if (value.length < 1 || value.length > 500 || junk.test(value)) return null;
    return value;
  }

  function getAnswerInput() {
    for (const selector of SEL.answer) {
      const nodes = document.querySelectorAll(selector);
      for (const el of nodes) {
        if (isVisible(el) && !el.disabled && !el.readOnly) return el;
      }
    }
    return null;
  }

  function nativeSetValue(el, value) {
    let proto = el;
    let descriptor = null;
    while (proto && !descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      proto = Object.getPrototypeOf(proto);
    }

    if (descriptor?.set) descriptor.set.call(el, value);
    else el.value = value;
  }

  async function fillInput(el, value) {
    el.focus();

    if (el.isContentEditable) {
      el.textContent = value;
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: value,
      }));
      return;
    }

    if (CFG.typeDelay <= 0) {
      nativeSetValue(el, value);
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: value,
      }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    nativeSetValue(el, '');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    for (const ch of value) {
      nativeSetValue(el, (el.value || '') + ch);
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: ch,
      }));
      await sleep(CFG.typeDelay);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function visibleEnabledButton(selectors, textPattern = null) {
    for (const selector of selectors) {
      for (const button of document.querySelectorAll(selector)) {
        if (!isVisible(button) || !isEnabled(button)) continue;
        if (textPattern && !textPattern.test(text(button))) continue;
        return button;
      }
    }
    return null;
  }

  async function submitCurrent(questionAtSubmit) {
    if (!autoSubmit) {
      setState('Answer filled', 'Auto Enter is off');
      return false;
    }

    const input = getAnswerInput();
    flowPhase = 'SUBMITTING';
    setState('Pressing Enter…', 'Submitting the filled answer');

    // Prefer a real Enter key sequence because that matches normal EP usage
    // and works even when the visible submit button changes between modes.
    if (input) {
      input.focus();
      dispatchEnter(input);
      submittedAt = Date.now();
      submittedQuestion = questionAtSubmit || getQuestion() || '';
      lastActionAt = submittedAt;
      flowPhase = 'SUBMITTED';

      await sleep(CFG.submitFallbackDelay);

      const currentQuestion = getQuestion();
      const verdict = verdictState();
      const inputNow = getAnswerInput();

      // If EP reacted to Enter, do NOT click Submit as well.
      if (verdict || (submittedQuestion && currentQuestion && currentQuestion !== submittedQuestion) ||
          !inputNow || inputNow.disabled || inputNow.readOnly) {
        setDebug('Submitted with Enter');
        setState('Submitted', verdict ? `EP marked it ${verdict}` : 'Waiting for the next screen');
        return true;
      }
    }

    // Fallback for modes that ignore keyboard submission.
    const button = visibleEnabledButton(SEL.submit);
    if (button && safeClick(button)) {
      submittedAt = Date.now();
      submittedQuestion = questionAtSubmit || getQuestion() || '';
      flowPhase = 'SUBMITTED';
      setDebug('Submitted with button fallback');
      setState('Submitted', 'Waiting for EP to mark the answer');
      return true;
    }

    // Last fallback: requestSubmit on the surrounding form if EP exposes one.
    const fallbackInput = getAnswerInput();
    if (fallbackInput?.form?.requestSubmit) {
      try {
        fallbackInput.form.requestSubmit();
        submittedAt = Date.now();
        submittedQuestion = questionAtSubmit || getQuestion() || '';
        lastActionAt = submittedAt;
        flowPhase = 'SUBMITTED';
        setDebug('Submitted with form fallback');
        setState('Submitted', 'Waiting for EP to mark the answer');
        return true;
      } catch {}
    }

    flowPhase = 'FILLED';
    setState('Answer filled', 'Could not trigger Enter/Submit');
    return false;
  }

  async function tryAdvance() {
    if (!autoAdvance || !submittedAt) return false;
    if (Date.now() - submittedAt < CFG.advanceDelay) return false;

    const verdict = verdictState();
    if (verdict && !verdictSeenAt) verdictSeenAt = Date.now();

    if (verdict === 'wrong') {
      flowPhase = 'ATTENTION';
      setState('EP rejected that answer', 'Paused on this question so it does not loop');
      return false;
    }

    // The Continue/Next control is the most reliable signal across EP modes.
    // We only allow it AFTER this script has submitted the current answer, so
    // it cannot race ahead and skip an unanswered question.
    const button = visibleEnabledButton(
      SEL.continue,
      /continue|next|next question|got it|okay|ok|^$/i
    );

    if (!button) {
      if (Date.now() - submittedAt > CFG.verdictTimeout) {
        setState('Waiting for EP…', 'No Next button yet');
      }
      return false;
    }

    flowPhase = 'ADVANCING';
    setState('Next question…', 'Auto Advance');
    const didClick = safeClick(button);

    if (didClick) {
      setDebug('Advanced to next question');
      lastFilledKey = '';
      submittedAt = 0;
      submittedQuestion = '';
      verdictSeenAt = 0;
      await sleep(120);
      flowPhase = 'READY';
      setState('Ready', 'Waiting for the next question');
    }
    return didClick;
  }

  async function tryFill() {
    if (!enabled || !CFG.autoFill) return false;
    if (Date.now() - lastActionAt < CFG.actionCooldown) return false;
    if (submittedAt) return false;

    const question = getQuestion();
    if (!question) return false;

    if (question !== lastQuestion) {
      lastQuestion = question;
      lastFilledKey = '';
      resetFlow(question);
      setState('Question detected', question.length > 42 ? `${question.slice(0, 42)}…` : question);
    }

    const input = getAnswerInput();
    if (!input) return false;

    const existing = input.isContentEditable ? text(input) : (input.value || '').trim();
    if (existing) return false;

    const found = findAnswer(question);
    const answer = found ? stripAlts(found) : null;
    if (!answer) {
      flowPhase = 'NO_MATCH';
      setState('No saved answer', `Open the vocab list and press Load & Start`);
      setDebug(`No match: “${question}” (key: “${norm(question)}”, cache: ${Object.keys(answerMap).length})`);
      return false;
    }

    const key = `${norm(question)}→${norm(answer)}`;
    if (key === lastFilledKey) return false;
    lastFilledKey = key;

    flowPhase = 'FILLING';
    setState('Filling answer…', answer.length > 42 ? `${answer.slice(0, 42)}…` : answer);
    await fillInput(input, answer);
    lastActionAt = Date.now();
    flowPhase = 'FILLED';
    setDebug(`Filled: “${question}” → “${answer}”`);
    showToast(`💡 ${answer.length > 55 ? answer.slice(0, 55) + '…' : answer}`);

    // Wait long enough for EP/Angular/React to process the input event, then
    // press Enter automatically. This fixes the 4.1.1 self-cooldown bug.
    await sleep(CFG.submitDelay);
    await submitCurrent(question);
    return true;
  }

  async function tick() {
    if (tickBusy || !enabled) return;
    tickBusy = true;

    try {
      if (submittedAt && submittedQuestion) {
        const qNow = getQuestion();
        if (qNow && qNow !== submittedQuestion && !verdictState()) {
          submittedAt = 0;
          submittedQuestion = '';
          lastFilledKey = '';
          flowPhase = 'READY';
        }
      }
      // Strict order: finish the submitted question first, then fill a new one.
      if (submittedAt) {
        await tryAdvance();
        return;
      }
      await tryFill();
    } catch (err) {
      console.warn('[EP 4.2.1] tick error', err);
      setDebug(`Error: ${err?.message || err}`);
    } finally {
      tickBusy = false;
    }
  }

  async function autoLoadCurrentList() {
    if (!CFG.autoLoadList) return;
    const listRoot = queryFirst(SEL.listRoot);
    if (!listRoot || !isVisible(listRoot)) return;
    if (lastAutoLoadUrl === location.href) return;

    lastAutoLoadUrl = location.href;
    await sleep(600);
    const count = await expandAndLoadList();

    if (count > 0) setState('Vocabulary ready', `${count} pairs loaded`);
    if (count > 0 && CFG.autoStart) {
      await sleep(200);
      const start = visibleEnabledButton(SEL.start);
      if (start) {
        safeClick(start);
        setDebug(`Loaded ${count} pairs and started`);
      }
    }
  }

  function updateCount() {
    if (!countEl) return;
    const pairCount = Math.floor(Object.keys(answerMap).length / 2);
    countEl.textContent = pairCount ? `${pairCount} vocab pairs ready` : 'No vocab loaded yet';
    countEl.className = pairCount ? 'ok' : 'warn';
  }

  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'ep-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl?.classList.remove('show'), CFG.toastDuration);
  }

  function makeDraggable(el, handle) {
    if (!el || !handle) return;
    handle.addEventListener('mousedown', event => {
      if (event.target.closest('button')) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const ox = event.clientX - rect.left;
      const oy = event.clientY - rect.top;

      const move = e => {
        el.style.right = 'auto';
        el.style.left = `${Math.max(0, e.clientX - ox)}px`;
        el.style.top = `${Math.max(0, e.clientY - oy)}px`;
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

  function openHelp() {
    let modal = document.getElementById('ep-help-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ep-help-modal';
      modal.innerHTML = `
        <div class="ep-help-card">
          <button class="ep-help-close" aria-label="Close">✕</button>
          <h2>EP Auto — simple setup</h2>
          <ol>
            <li><b>Open your EP vocabulary task.</b> Go to the page that shows the word pairs.</li>
            <li><b>Press “Load & Start”.</b> Wait until the panel says the vocab pairs are ready.</li>
            <li><b>Leave Automation ON.</b> The script will fill the answer, press Enter, wait for EP, then go to the next question.</li>
          </ol>
          <div class="ep-help-tip"><b>If it says “No saved answer”:</b> return to the vocabulary list and press <b>Load & Start</b> again.</div>
          <div class="ep-help-tip"><b>If EP rejects an answer:</b> automation stops on that question instead of endlessly retrying it.</div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('.ep-help-close').addEventListener('click', () => modal.classList.remove('show'));
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('show');
      });
    }
    modal.classList.add('show');
  }

  async function runSetup() {
    setState('Loading vocabulary…', 'Reading the word-pair list');
    const count = await expandAndLoadList();
    if (!count) {
      setState('Open the vocab list first', 'Then press Load & Start again');
      return;
    }

    setState('Vocabulary ready', `${count} pairs loaded`);
    await sleep(220);
    const start = visibleEnabledButton(SEL.start);
    if (start) {
      safeClick(start);
      setState('Starting…', 'Automation will take over in the quiz');
    } else {
      setState('Ready', 'Start the quiz normally; automation is already on');
    }
  }

  function buildPanel() {
    if (document.getElementById('ep-panel')) return;

    const style = document.createElement('style');
    style.textContent = `
      #ep-panel{position:fixed;top:72px;right:16px;z-index:2147483647;width:310px;
        background:#10131d;border:1px solid rgba(255,255,255,.10);border-radius:18px;
        box-shadow:0 18px 55px rgba(0,0,0,.38);font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        color:#eef2ff;user-select:none;overflow:hidden}
      #ep-handle{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);cursor:grab}
      #ep-logo{font-weight:800;letter-spacing:.1px;flex:1}.ep-version{font-size:10px;opacity:.45;font-weight:650}
      .ep-icon-btn{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#9aa5bd;cursor:pointer;font-size:15px}
      .ep-icon-btn:hover{background:rgba(255,255,255,.07);color:white}
      #ep-body{padding:13px}
      #ep-status-card{display:flex;gap:10px;align-items:flex-start;padding:11px;border-radius:12px;background:#171c2a;margin-bottom:10px}
      .ep-status-dot{width:9px;height:9px;border-radius:50%;background:#6ee7a8;margin-top:5px;box-shadow:0 0 0 4px rgba(110,231,168,.10)}
      #ep-state{font-size:13px;font-weight:800;color:#fff}#ep-state-sub{font-size:11px;color:#9eabc4;margin-top:2px;user-select:text}
      #ep-count{font-size:11px;color:#9eabc4;margin:0 1px 10px}
      #ep-setup{width:100%;padding:10px 12px;border:0;border-radius:10px;cursor:pointer;background:#4d7cff;color:#fff;font-weight:800;margin-bottom:8px}
      #ep-setup:hover{filter:brightness(1.08)}
      #ep-master{width:100%;padding:9px 12px;border:1px solid rgba(255,255,255,.10);border-radius:10px;cursor:pointer;background:#202737;color:#eaf0ff;font-weight:750}
      #ep-master.ep-off{background:#4a2027;color:#ffdfe4}
      #ep-options{margin-top:9px;border-top:1px solid rgba(255,255,255,.07);padding-top:8px}
      #ep-options summary{cursor:pointer;color:#98a5bf;font-size:11px;list-style:none}
      #ep-options summary::-webkit-details-marker{display:none}
      .ep-switch-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}
      .ep-switch-row span{font-size:11px;color:#bdc6da}
      .ep-mini{padding:5px 8px;border:0;border-radius:7px;background:#263149;color:#dce5ff;cursor:pointer;font-size:10px;font-weight:700}
      .ep-mini.ep-off{background:#5d2930}
      #ep-debug{font-size:10px;color:#707b92;word-break:break-word;margin-top:8px;user-select:text}
      #ep-toast{position:fixed;bottom:22px;right:18px;z-index:2147483647;background:#10131d;border:1px solid rgba(255,255,255,.10);
        border-radius:11px;padding:9px 14px;color:#eef2ff;box-shadow:0 8px 32px rgba(0,0,0,.35);opacity:0;
        transform:translateY(6px);transition:.16s;pointer-events:none;max-width:320px}
      #ep-toast.show{opacity:1;transform:translateY(0)}
      #ep-help-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.52);display:none;align-items:center;justify-content:center;padding:18px}
      #ep-help-modal.show{display:flex}
      .ep-help-card{position:relative;width:min(460px,100%);background:#111622;color:#eef2ff;border:1px solid rgba(255,255,255,.12);
        border-radius:18px;padding:20px 22px;box-shadow:0 22px 70px rgba(0,0,0,.5);user-select:text}
      .ep-help-card h2{margin:0 35px 12px 0;font-size:19px}.ep-help-card ol{padding-left:22px;margin:0}
      .ep-help-card li{margin:10px 0;color:#cbd5e8}.ep-help-tip{margin-top:12px;padding:10px 11px;border-radius:10px;background:#1a2232;color:#b9c6dc;font-size:12px}
      .ep-help-close{position:absolute;right:12px;top:12px;border:0;background:transparent;color:#9aa5bd;font-size:16px;cursor:pointer}
    `;
    document.head.appendChild(style);

    panel = document.createElement('div');
    panel.id = 'ep-panel';
    panel.innerHTML = `
      <div id="ep-handle">
        <span id="ep-logo">EP Auto <span class="ep-version">4.2.1</span></span>
        <button class="ep-icon-btn" id="ep-help" title="Setup guide">?</button>
        <button class="ep-icon-btn" id="ep-x" title="Hide">✕</button>
      </div>
      <div id="ep-body">
        <div id="ep-status-card">
          <span class="ep-status-dot"></span>
          <div>
            <div id="ep-state">Ready</div>
            <div id="ep-state-sub">Open a vocab task or start a quiz</div>
          </div>
        </div>
        <div id="ep-count">Checking saved vocabulary…</div>
        <button id="ep-setup">⚡ Load & Start</button>
        <button id="ep-master">⏸ Pause automation</button>
        <details id="ep-options">
          <summary>Settings & debug</summary>
          <div class="ep-switch-row"><span>Auto Enter / Submit</span><button class="ep-mini" id="ep-submit">ON</button></div>
          <div class="ep-switch-row"><span>Auto Next</span><button class="ep-mini" id="ep-advance">ON</button></div>
          <div id="ep-debug">Ready</div>
        </details>
      </div>`;
    document.body.appendChild(panel);

    countEl = panel.querySelector('#ep-count');
    debugEl = panel.querySelector('#ep-debug');
    stateEl = panel.querySelector('#ep-state');
    stateSubEl = panel.querySelector('#ep-state-sub');
    masterBtn = panel.querySelector('#ep-master');
    submitBtn = panel.querySelector('#ep-submit');
    advanceBtn = panel.querySelector('#ep-advance');

    panel.querySelector('#ep-setup').addEventListener('click', runSetup);
    panel.querySelector('#ep-help').addEventListener('click', openHelp);

    masterBtn.addEventListener('click', () => {
      enabled = !enabled;
      masterBtn.textContent = enabled ? '⏸ Pause automation' : '▶ Resume automation';
      masterBtn.classList.toggle('ep-off', !enabled);
      setState(enabled ? 'Automation ON' : 'Paused', enabled ? 'Waiting for a question' : 'Nothing will be filled or clicked');
      showToast(enabled ? '▶ Automation resumed' : '⏸ Automation paused');
      if (enabled) tick();
    });

    submitBtn.addEventListener('click', () => {
      autoSubmit = !autoSubmit;
      submitBtn.textContent = autoSubmit ? 'ON' : 'OFF';
      submitBtn.classList.toggle('ep-off', !autoSubmit);
    });

    advanceBtn.addEventListener('click', () => {
      autoAdvance = !autoAdvance;
      advanceBtn.textContent = autoAdvance ? 'ON' : 'OFF';
      advanceBtn.classList.toggle('ep-off', !autoAdvance);
    });

    panel.querySelector('#ep-x').addEventListener('click', () => {
      panel.style.display = 'none';
    });

    makeDraggable(panel, panel.querySelector('#ep-handle'));
    updateCount();
  }

  function onPageChanged() {
    lastQuestion = '';
    lastFilledKey = '';
    resetFlow();
    setTimeout(() => {
      autoLoadCurrentList();
      tick();
    }, 250);
  }

  function patchHistory() {
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        queueMicrotask(onPageChanged);
        return result;
      };
    }
    window.addEventListener('popstate', onPageChanged);
  }

  function startObserver() {
    observer?.disconnect();
    observer = new MutationObserver(() => {
      // MutationObserver catches SPA-rendered questions quickly; tickBusy keeps
      // bursts from re-entering the answer routine.
      tick();
      if (queryFirst(SEL.listRoot)) autoLoadCurrentList();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(tick, CFG.pollInterval);
  }

  function init() {
    if (document.getElementById('ep-panel')) return;
    buildPanel();
    patchHistory();
    startObserver();
    startPolling();
    autoLoadCurrentList();
    tick();
    setState('Automation ON', Object.keys(answerMap).length ? 'Vocabulary cache found' : 'Open a vocab list and press Load & Start');
    log('Ready. Cached entries:', Object.keys(answerMap).length);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    setTimeout(init, 200);
  }
})();
