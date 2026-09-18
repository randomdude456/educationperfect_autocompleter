// ==UserScript==
// @name         🎓 Education Perfect - Auto Answer (2026) - Compatibility Patch
// @namespace    https://educationperfect.com
// @version      4.3.0
// @description  Beginner-friendly EP automation with safe list loading, press-Enter start, pace controls, cooldowns, and manual coverage.
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

  const CFG = {
    pollInterval: 250,
    actionCooldown: 120,
    submitFallbackDelay: 260,
    advanceDelay: 450,
    verdictTimeout: 8000,
    listLoadTimeout: 9000,
    listStablePasses: 4,
    toastDuration: 2200,
    fuzzyThreshold: 0.82,
  };

  const DEFAULT_SETTINGS = {
    minQuestionMs: 2000,
    cooldownMs: 1000,
    coveragePercent: 100,
    autoSubmit: true,
    autoAdvance: true,
  };

  const STORAGE_KEY = 'ep-auto-answer-4.3-answer-map';
  const SETTINGS_KEY = 'ep-auto-answer-4.3-settings';

  const SEL = {
    listRoot: ['#list-starter', '[id="list-starter"]'],
    pairRows: ['.preview-grid .stats-item', '#preview-grid-container .stats-item', '.preview-grid > li'],
    target: ['.targetLanguage.question-label', '.targetLanguage', '[class*="targetLanguage"]'],
    base: ['.baseLanguage.question-label', '.baseLanguage', '[class*="baseLanguage"]'],
    question: ['#question-text', '#question-block #question-text', '[data-testid="question-text"]', '[id$="question-text"]'],
    answer: ['#answer-text', '#answer-block input[type="text"]', '#answer-block textarea', 'input[autofocus][type="text"]'],
    submit: ['#submit-button', 'button[id*="submit"]'],
    continue: ['#continue-button', '.next-question-button', '.information-controls button'],
    verdictCorrect: [
      '#correct-popup.shown',
      '#correct-popup:not(.ng-hide):not(.sf-hidden)',
      '.history-item.current.correct',
      '.history-item.correct.current',
      '.cheer-button:not(.ng-hide):not(.sf-hidden)',
    ],
    verdictWrong: [
      '.history-item.current.incorrect',
      '.history-item.incorrect.current',
      '.action-bar-button.try-again',
      '.modeless-answer-dialog tr.incorrect',
    ],
    start: ['#start-button-main', '#preview-header-start-button', '#start-button-school'],
    fullList: ['#full-list-switcher'],
    listScroller: ['#slim-scroll-content', '#preview-grid-container', '.preview-grid-container'],
  };

  let answerMap = loadStoredMap();
  let settings = loadSettings();

  let enabled = true;
  let armed = false;
  let readyToStart = false;
  let startedOnce = false;
  let loadInProgress = false;
  let observer = null;
  let pollTimer = null;
  let tickBusy = false;
  let lastActionAt = 0;
  let lastQuestion = '';
  let lastFilledKey = '';
  let questionSeenAt = 0;
  let questionOrdinal = 0;
  let manualQuestion = '';
  let cooldownUntil = 0;
  let submittedAt = 0;
  let submittedQuestion = '';
  let verdictSeenAt = 0;
  let flowPhase = 'IDLE';
  let diagnostics = [];

  let panel = null;
  let stateEl = null;
  let stateSubEl = null;
  let countEl = null;
  let mainBtn = null;
  let diagEl = null;
  let toastEl = null;
  let toastTimer = null;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function addDiagnostic(message) {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    diagnostics.push(`[${stamp}] ${message}`);
    if (diagnostics.length > 30) diagnostics.shift();
    if (diagEl) diagEl.textContent = message;
  }

  function setState(title, detail = '') {
    if (stateEl) stateEl.textContent = title;
    if (stateSubEl) stateSubEl.textContent = detail;
  }

  function updateMainButton() {
    if (!mainBtn) return;

    if (loadInProgress) {
      mainBtn.textContent = 'Loading vocabulary…';
      mainBtn.disabled = true;
      return;
    }

    mainBtn.disabled = false;

    if (armed) {
      mainBtn.textContent = 'Pause';
      return;
    }

    if (readyToStart) {
      mainBtn.textContent = '✓ Vocabulary loaded';
      mainBtn.disabled = true;
      return;
    }

    if (startedOnce && getQuestion()) {
      mainBtn.textContent = 'Resume';
      return;
    }

    mainBtn.textContent = 'Load vocabulary';
  }

  function resetFlow(question = '') {
    flowPhase = 'READY';
    submittedAt = 0;
    submittedQuestion = question;
    verdictSeenAt = 0;
  }

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return { ...DEFAULT_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      addDiagnostic('Could not save settings');
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
    if (el.disabled || el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    return true;
  }

  function safeClick(el) {
    if (!el || !isVisible(el) || !isEnabled(el)) return false;
    try {
      el.click();
      lastActionAt = Date.now();
      return true;
    } catch {
      addDiagnostic('A page button could not be clicked');
      return false;
    }
  }

  function text(el) {
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function stripAlts(value) {
    if (!value) return value;
    const match = value.match(/[;；]/);
    return (match ? value.slice(0, match.index) : value).trim();
  }

  function norm(value) {
    let out = String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase()
      .replace(/[’‘`]/g, "'");

    try {
      out = out.replace(/[^\p{L}\p{M}\p{N}\s'＋+\-−–—*×/÷=.,!?！？%％()（）]/gu, '');
    } catch {
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
    } catch {
      addDiagnostic('Could not save vocabulary cache');
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
      const target = stripAlts(text(queryFirst(SEL.target, row)));
      const base = stripAlts(text(queryFirst(SEL.base, row)));
      if (target && base) pairs.push([target, base]);
    }

    if (pairs.length) return pairs;

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

  function mapFromPairs(pairs) {
    const map = {};
    for (const [target, base] of pairs) {
      const targetKey = norm(target);
      const baseKey = norm(base);
      if (targetKey) map[targetKey] = base;
      if (baseKey) map[baseKey] = target;
    }
    return map;
  }

  function getVisibleScroller() {
    for (const selector of SEL.listScroller) {
      for (const el of document.querySelectorAll(selector)) {
        if (isVisible(el) && el.scrollHeight > el.clientHeight + 5) return el;
      }
    }
    return null;
  }

  async function expandAndLoadList() {
    const root = queryFirst(SEL.listRoot);
    if (!root || !isVisible(root)) return 0;

    const fullButton = queryFirst(SEL.fullList);
    if (fullButton && isVisible(fullButton) && isEnabled(fullButton)) {
      safeClick(fullButton);
      await sleep(250);
    }

    const collected = new Map();
    const deadline = Date.now() + CFG.listLoadTimeout;
    const scroller = getVisibleScroller();

    if (scroller) scroller.scrollTop = 0;

    let stablePasses = 0;
    let previousSize = -1;
    let atBottomPasses = 0;

    while (Date.now() < deadline) {
      for (const [target, base] of getPairsFromRows()) {
        const key = `${norm(target)}\u0000${norm(base)}`;
        if (key !== '\u0000') collected.set(key, [target, base]);
      }

      if (collected.size === previousSize) stablePasses++;
      else stablePasses = 0;
      previousSize = collected.size;

      if (scroller) {
        const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        const current = scroller.scrollTop;
        const step = Math.max(120, Math.floor(scroller.clientHeight * 0.75));
        const next = Math.min(maxScroll, current + step);
        scroller.scrollTop = next;

        if (maxScroll - next < 4) atBottomPasses++;
        else atBottomPasses = 0;
      } else {
        const rows = queryAll(SEL.pairRows);
        rows.at(-1)?.scrollIntoView?.({ block: 'end' });
        atBottomPasses++;
      }

      if (collected.size > 0 && stablePasses >= CFG.listStablePasses && atBottomPasses >= 2) break;
      await sleep(220);
    }

    if (!collected.size) return 0;

    answerMap = mapFromPairs(Array.from(collected.values()));
    saveMap();
    lastFilledKey = '';
    updateCount();
    addDiagnostic(`Loaded ${collected.size} vocabulary pairs`);
    return collected.size;
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
      for (const el of document.querySelectorAll(selector)) {
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

  function fillInput(el, value) {
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

    nativeSetValue(el, value);
    el.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: value,
    }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
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

  function shouldAutomateQuestion(ordinal) {
    const pct = Math.max(0, Math.min(100, Number(settings.coveragePercent) || 100));
    if (pct >= 100) return true;
    if (pct <= 0) return false;

    // Spread manual questions through the session rather than putting them all
    // at the end. At 80%, roughly one question in five is left to the user.
    const slot = (ordinal * 37) % 100;
    return slot < pct;
  }

  function pauseForProblem(title, detail) {
    armed = false;
    flowPhase = 'PAUSED';
    setState(title, detail);
    addDiagnostic(`${title}: ${detail}`);
    updateMainButton();
  }

  async function submitCurrent(questionAtSubmit) {
    if (!settings.autoSubmit) {
      setState('Answer filled', 'Auto submit is off');
      return false;
    }

    const input = getAnswerInput();
    flowPhase = 'SUBMITTING';
    setState('Submitting…', '');

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

      if (verdict || (submittedQuestion && currentQuestion && currentQuestion !== submittedQuestion) ||
          !inputNow || inputNow.disabled || inputNow.readOnly) {
        addDiagnostic('Answer submitted with Enter');
        return true;
      }
    }

    const button = visibleEnabledButton(SEL.submit);
    if (button && safeClick(button)) {
      submittedAt = Date.now();
      submittedQuestion = questionAtSubmit || getQuestion() || '';
      flowPhase = 'SUBMITTED';
      addDiagnostic('Answer submitted with button fallback');
      return true;
    }

    const fallbackInput = getAnswerInput();
    if (fallbackInput?.form?.requestSubmit) {
      try {
        fallbackInput.form.requestSubmit();
        submittedAt = Date.now();
        submittedQuestion = questionAtSubmit || getQuestion() || '';
        lastActionAt = submittedAt;
        flowPhase = 'SUBMITTED';
        addDiagnostic('Answer submitted with form fallback');
        return true;
      } catch {
        // UI handles the failure below.
      }
    }

    pauseForProblem('Couldn’t submit', 'Press Resume after checking the question');
    return false;
  }

  async function tryAdvance() {
    if (!settings.autoAdvance || !submittedAt) return false;
    if (Date.now() - submittedAt < CFG.advanceDelay) return false;

    const verdict = verdictState();
    if (verdict && !verdictSeenAt) verdictSeenAt = Date.now();

    if (verdict === 'wrong') {
      pauseForProblem('Answer needs attention', 'Automation paused so it does not loop');
      return false;
    }

    const button = visibleEnabledButton(
      SEL.continue,
      /continue|next|next question|got it|okay|ok|^$/i
    );

    if (!button) {
      if (Date.now() - submittedAt > CFG.verdictTimeout) {
        pauseForProblem('Waiting too long', 'No Next button appeared');
      }
      return false;
    }

    flowPhase = 'ADVANCING';
    setState('Next question…', '');
    const didClick = safeClick(button);

    if (didClick) {
      lastFilledKey = '';
      submittedAt = 0;
      submittedQuestion = '';
      verdictSeenAt = 0;
      manualQuestion = '';
      cooldownUntil = Date.now() + Number(settings.cooldownMs || 0);
      await sleep(100);
      flowPhase = 'READY';
      addDiagnostic('Moved to next question');
    }

    return didClick;
  }

  async function tryFill() {
    if (!enabled || !armed) return false;
    if (Date.now() - lastActionAt < CFG.actionCooldown) return false;
    if (submittedAt) return false;

    const question = getQuestion();
    if (!question) return false;

    if (question !== lastQuestion) {
      lastQuestion = question;
      lastFilledKey = '';
      manualQuestion = '';
      questionSeenAt = Date.now();
      questionOrdinal++;
      resetFlow(question);

      if (!shouldAutomateQuestion(questionOrdinal)) {
        manualQuestion = question;
        setState('Your turn', `${settings.coveragePercent}% coverage left this question manual`);
        addDiagnostic(`Question ${questionOrdinal} left manual by coverage setting`);
        return false;
      }

      setState('Question ready', 'Waiting for your speed limit');
    }

    if (manualQuestion === question) return false;

    if (Date.now() < cooldownUntil) {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setState('Cooldown…', left ? `${left}s` : 'Almost ready');
      return false;
    }

    const elapsed = Date.now() - questionSeenAt;
    const minMs = Math.max(0, Number(settings.minQuestionMs || 0));
    if (elapsed < minMs) {
      const left = Math.max(0, Math.ceil((minMs - elapsed) / 1000));
      setState('Waiting…', left ? `${left}s speed limit` : 'Almost ready');
      return false;
    }

    const input = getAnswerInput();
    if (!input) return false;

    const existing = input.isContentEditable ? text(input) : (input.value || '').trim();
    if (existing) return false;

    const found = findAnswer(question);
    const answer = found ? stripAlts(found) : null;

    if (!answer) {
      manualQuestion = question;
      setState('Your turn', 'This answer was not found in the loaded list');
      addDiagnostic(`No saved answer for “${question}”`);
      return false;
    }

    const key = `${norm(question)}→${norm(answer)}`;
    if (key === lastFilledKey) return false;
    lastFilledKey = key;

    flowPhase = 'FILLING';
    setState('Filling answer…', '');
    fillInput(input, answer);
    lastActionAt = Date.now();
    addDiagnostic(`Filled answer for “${question}”`);

    await sleep(180);
    await submitCurrent(question);
    return true;
  }

  async function tick() {
    if (tickBusy || !enabled || !armed) return;
    tickBusy = true;

    try {
      if (submittedAt && submittedQuestion) {
        const qNow = getQuestion();
        if (qNow && qNow !== submittedQuestion && !verdictState()) {
          submittedAt = 0;
          submittedQuestion = '';
          lastFilledKey = '';
          manualQuestion = '';
          flowPhase = 'READY';
          cooldownUntil = Date.now() + Number(settings.cooldownMs || 0);
        }
      }

      if (submittedAt) {
        await tryAdvance();
        return;
      }

      await tryFill();
    } catch (err) {
      const message = err?.message || String(err);
      pauseForProblem('Something went wrong', message.slice(0, 90));
    } finally {
      tickBusy = false;
    }
  }

  function updateCount() {
    if (!countEl) return;
    const pairCount = Math.floor(Object.keys(answerMap).length / 2);
    countEl.textContent = pairCount ? `${pairCount} vocabulary pairs loaded` : 'No vocabulary loaded';
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

  async function runSetup() {
    if (loadInProgress) return;

    loadInProgress = true;
    armed = false;
    readyToStart = false;
    updateMainButton();
    setState('Loading vocabulary…', 'Stay on the page that shows the word pairs');

    let count = await expandAndLoadList();

    if (!count) {
      await sleep(450);
      count = await expandAndLoadList();
    }

    loadInProgress = false;

    if (!count) {
      setState('Couldn’t load the list', 'Open the page showing the vocabulary pairs, then try again');
      addDiagnostic('Vocabulary list was not found after two attempts');
      updateMainButton();
      return;
    }

    readyToStart = true;
    questionOrdinal = 0;
    setState('Ready', 'Press Enter to begin');
    showToast(`✓ ${count} pairs loaded`);
    updateMainButton();
  }

  function startFromEnter() {
    if (!readyToStart || armed || loadInProgress) return false;

    const start = visibleEnabledButton(SEL.start);
    if (!start) {
      setState('Stay on the list page', 'Press Enter when the Start button is visible');
      addDiagnostic('Enter was pressed but the EP Start button was not visible');
      return false;
    }

    if (!safeClick(start)) {
      setState('Couldn’t start', 'Try pressing Enter again');
      return false;
    }

    readyToStart = false;
    armed = true;
    startedOnce = true;
    questionOrdinal = 0;
    lastQuestion = '';
    questionSeenAt = 0;
    cooldownUntil = 0;
    resetFlow();
    setState('Starting…', 'Automation is now on');
    addDiagnostic('User pressed Enter; automation started');
    updateMainButton();
    setTimeout(tick, 350);
    return true;
  }

  function pauseAutomation() {
    armed = false;
    setState('Paused', 'Press Resume when you are ready');
    addDiagnostic('Automation paused by user');
    updateMainButton();
  }

  function resumeAutomation() {
    if (!Object.keys(answerMap).length) {
      setState('Load vocabulary first', 'Go back to the list page');
      return;
    }

    armed = true;
    startedOnce = true;
    manualQuestion = '';
    submittedAt = 0;
    submittedQuestion = '';
    lastFilledKey = '';
    lastQuestion = '';
    questionSeenAt = Date.now();
    cooldownUntil = Date.now() + Number(settings.cooldownMs || 0);
    setState('Resumed', 'Automation is on');
    addDiagnostic('Automation resumed by user');
    updateMainButton();
    tick();
  }

  function handleMainButton() {
    if (armed) {
      pauseAutomation();
      return;
    }

    if (startedOnce && getQuestion()) {
      resumeAutomation();
      return;
    }

    runSetup();
  }

  function copyDiagnostics() {
    const data = [
      'EP Auto 4.3.0 diagnostics',
      `URL: ${location.href}`,
      `State: ${stateEl?.textContent || 'unknown'}`,
      `Vocabulary entries: ${Object.keys(answerMap).length}`,
      `Armed: ${armed}`,
      `Ready to start: ${readyToStart}`,
      `Speed limit: ${settings.minQuestionMs}ms`,
      `Cooldown: ${settings.cooldownMs}ms`,
      `Coverage: ${settings.coveragePercent}%`,
      '',
      ...diagnostics,
    ].join('\n');

    const copyPromise = navigator.clipboard?.writeText?.(data);
    if (copyPromise?.then) {
      copyPromise.then(
        () => showToast('Diagnostics copied'),
        () => showToast('Could not copy diagnostics')
      );
    } else {
      showToast('Clipboard access is unavailable');
    }
  }

  function openHelp() {
    let modal = document.getElementById('ep-help-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ep-help-modal';
      modal.innerHTML = `
        <div class="ep-help-card">
          <button class="ep-help-close" aria-label="Close">✕</button>
          <h2>How to use EP Auto</h2>
          <ol>
            <li>Open the EP page that shows the vocabulary pairs.</li>
            <li>Click <b>Load vocabulary</b>.</li>
            <li>Wait until it says <b>Ready — Press Enter to begin</b>.</li>
            <li>Press <b>Enter</b>. Only then will EP Auto start the activity.</li>
          </ol>
          <div class="ep-help-tip"><b>80% coverage</b> does not make answers wrong. It leaves roughly one question in five for you to answer manually.</div>
          <div class="ep-help-tip">If something fails, open <b>Settings</b>, press <b>Copy diagnostics</b>, and paste that into AI support.</div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('.ep-help-close').addEventListener('click', () => modal.classList.remove('show'));
      modal.addEventListener('click', event => {
        if (event.target === modal) modal.classList.remove('show');
      });
    }

    modal.classList.add('show');
  }

  function bindSelect(id, key, parser = Number) {
    const el = panel.querySelector(id);
    if (!el) return;
    el.value = String(settings[key]);
    el.addEventListener('change', () => {
      settings[key] = parser(el.value);
      saveSettings();
      addDiagnostic(`${key} changed to ${settings[key]}`);
    });
  }

  function buildPanel() {
    if (document.getElementById('ep-panel')) return;

    const style = document.createElement('style');
    style.textContent = `
      #ep-panel{position:fixed;top:72px;right:16px;z-index:2147483647;width:290px;background:#11151f;border:1px solid rgba(255,255,255,.10);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.34);font:13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f4f7ff;overflow:hidden;user-select:none}
      #ep-handle{display:flex;align-items:center;gap:8px;padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.08);cursor:grab}
      #ep-logo{font-weight:800;flex:1}.ep-version{font-size:10px;opacity:.45}
      .ep-icon-btn{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#aab4c9;cursor:pointer;font-size:15px}.ep-icon-btn:hover{background:rgba(255,255,255,.07);color:#fff}
      #ep-body{padding:12px}
      #ep-status-card{padding:12px;border-radius:12px;background:#191f2c;margin-bottom:9px}
      #ep-state{font-size:14px;font-weight:800;color:#fff}#ep-state-sub{font-size:11px;color:#aeb9ce;margin-top:3px;user-select:text}
      #ep-count{font-size:11px;color:#8f9bb3;margin:0 1px 9px}
      #ep-main{width:100%;padding:10px 12px;border:0;border-radius:10px;background:#4d7cff;color:#fff;font-weight:800;cursor:pointer}#ep-main:disabled{cursor:default;opacity:.72}
      #ep-start-hint{font-size:11px;text-align:center;color:#b9c6da;margin-top:8px;min-height:15px}
      #ep-settings{margin-top:10px;border-top:1px solid rgba(255,255,255,.07);padding-top:9px}#ep-settings summary{cursor:pointer;color:#a8b3c8;font-size:11px;list-style:none}#ep-settings summary::-webkit-details-marker{display:none}
      .ep-row{display:grid;grid-template-columns:1fr 118px;gap:8px;align-items:center;margin-top:9px}.ep-row label{font-size:11px;color:#c0c9da}.ep-row select{width:100%;border:1px solid rgba(255,255,255,.10);border-radius:8px;background:#202838;color:#eef3ff;padding:6px 7px;font:11px system-ui}
      #ep-diag{font-size:10px;color:#77849c;margin-top:9px;user-select:text;word-break:break-word}.ep-small-btn{width:100%;margin-top:7px;padding:7px;border:1px solid rgba(255,255,255,.10);border-radius:8px;background:#202838;color:#dce5f6;cursor:pointer;font-size:11px}
      #ep-toast{position:fixed;bottom:22px;right:18px;z-index:2147483647;background:#10131d;border:1px solid rgba(255,255,255,.10);border-radius:10px;padding:9px 13px;color:#eef2ff;box-shadow:0 8px 32px rgba(0,0,0,.35);opacity:0;transform:translateY(6px);transition:.16s;pointer-events:none;max-width:320px}#ep-toast.show{opacity:1;transform:translateY(0)}
      #ep-help-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.54);display:none;align-items:center;justify-content:center;padding:18px}#ep-help-modal.show{display:flex}.ep-help-card{position:relative;width:min(440px,100%);background:#111622;color:#eef2ff;border:1px solid rgba(255,255,255,.12);border-radius:17px;padding:19px 21px;box-shadow:0 22px 70px rgba(0,0,0,.5);user-select:text}.ep-help-card h2{margin:0 34px 11px 0;font-size:18px}.ep-help-card ol{padding-left:22px;margin:0}.ep-help-card li{margin:9px 0;color:#cbd5e8}.ep-help-tip{margin-top:11px;padding:9px 10px;border-radius:9px;background:#1a2232;color:#b9c6dc;font-size:12px}.ep-help-close{position:absolute;right:12px;top:12px;border:0;background:transparent;color:#9aa5bd;font-size:16px;cursor:pointer}
    `;
    document.head.appendChild(style);

    panel = document.createElement('div');
    panel.id = 'ep-panel';
    panel.innerHTML = `
      <div id="ep-handle">
        <span id="ep-logo">EP Auto <span class="ep-version">4.3</span></span>
        <button class="ep-icon-btn" id="ep-help" title="Help">?</button>
        <button class="ep-icon-btn" id="ep-close" title="Hide">✕</button>
      </div>
      <div id="ep-body">
        <div id="ep-status-card">
          <div id="ep-state">Open the vocabulary list</div>
          <div id="ep-state-sub">Then click Load vocabulary</div>
        </div>
        <div id="ep-count">No vocabulary loaded</div>
        <button id="ep-main">Load vocabulary</button>
        <div id="ep-start-hint"></div>

        <details id="ep-settings">
          <summary>Settings</summary>
          <div class="ep-row">
            <label for="ep-speed">Speed limit</label>
            <select id="ep-speed">
              <option value="1000">1 sec</option>
              <option value="2000">2 sec</option>
              <option value="3000">3 sec</option>
              <option value="5000">5 sec</option>
            </select>
          </div>
          <div class="ep-row">
            <label for="ep-cooldown">Cooldown</label>
            <select id="ep-cooldown">
              <option value="0">None</option>
              <option value="500">0.5 sec</option>
              <option value="1000">1 sec</option>
              <option value="2000">2 sec</option>
              <option value="5000">5 sec</option>
            </select>
          </div>
          <div class="ep-row">
            <label for="ep-coverage">Auto-answer coverage</label>
            <select id="ep-coverage">
              <option value="100">100% — all</option>
              <option value="80">80% — 1 in 5 manual</option>
              <option value="60">60% — more manual</option>
            </select>
          </div>
          <div class="ep-row">
            <label for="ep-next">Auto Next</label>
            <select id="ep-next">
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </div>
          <div id="ep-diag">Ready</div>
          <button class="ep-small-btn" id="ep-copy-diag">Copy diagnostics</button>
          <button class="ep-small-btn" id="ep-clear-list">Clear saved vocabulary</button>
        </details>
      </div>`;

    document.body.appendChild(panel);

    stateEl = panel.querySelector('#ep-state');
    stateSubEl = panel.querySelector('#ep-state-sub');
    countEl = panel.querySelector('#ep-count');
    mainBtn = panel.querySelector('#ep-main');
    diagEl = panel.querySelector('#ep-diag');

    mainBtn.addEventListener('click', handleMainButton);
    panel.querySelector('#ep-help').addEventListener('click', openHelp);
    panel.querySelector('#ep-close').addEventListener('click', () => {
      panel.style.display = 'none';
    });
    panel.querySelector('#ep-copy-diag').addEventListener('click', copyDiagnostics);
    panel.querySelector('#ep-clear-list').addEventListener('click', () => {
      answerMap = {};
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
      readyToStart = false;
      armed = false;
      updateCount();
      updateMainButton();
      setState('Vocabulary cleared', 'Open the list page and load it again');
      addDiagnostic('Vocabulary cache cleared by user');
    });

    bindSelect('#ep-speed', 'minQuestionMs');
    bindSelect('#ep-cooldown', 'cooldownMs');
    bindSelect('#ep-coverage', 'coveragePercent');
    bindSelect('#ep-next', 'autoAdvance', value => value === 'true');

    makeDraggable(panel, panel.querySelector('#ep-handle'));
    updateCount();
    updateMainButton();
  }

  function onPageChanged() {
    lastQuestion = '';
    lastFilledKey = '';
    manualQuestion = '';
    questionSeenAt = 0;
    resetFlow();

    if (!armed && queryFirst(SEL.listRoot) && isVisible(queryFirst(SEL.listRoot))) {
      setState('Vocabulary list detected', 'Click Load vocabulary');
    }

    setTimeout(tick, 250);
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
      if (armed) tick();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (armed) tick();
    }, CFG.pollInterval);
  }

  function bindEnterStart() {
    document.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.repeat) return;
      if (!readyToStart || armed) return;

      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;

      event.preventDefault();
      startFromEnter();
    }, true);
  }

  function init() {
    if (document.getElementById('ep-panel')) return;

    buildPanel();
    patchHistory();
    startObserver();
    startPolling();
    bindEnterStart();

    const cachedPairs = Math.floor(Object.keys(answerMap).length / 2);
    if (cachedPairs) {
      setState('Vocabulary cache found', 'Open the list and reload it before starting');
      addDiagnostic(`Found ${cachedPairs} cached vocabulary pairs`);
    } else if (queryFirst(SEL.listRoot) && isVisible(queryFirst(SEL.listRoot))) {
      setState('Vocabulary list detected', 'Click Load vocabulary');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    setTimeout(init, 200);
  }
})();
