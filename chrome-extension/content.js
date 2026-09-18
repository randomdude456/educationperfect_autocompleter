(function () {
  'use strict';

  const VERSION = '5.1.0';
  const POLL_MS = 650;
  const FUZZY_THRESHOLD = 0.82;
  const STORAGE_KEY = 'ep-helper-5.1-answer-map';
  const SETTINGS_KEY = 'ep-helper-5.1-settings';

  const DEFAULT_SETTINGS = {
    revealDelayMs: 1000,
    cooldownMs: 500,
    coveragePercent: 100,
  };

  const SEL = {
    listRoot: ['#list-starter', '[id="list-starter"]'],
    pairRows: ['.preview-grid .stats-item', '#preview-grid-container .stats-item', '.preview-grid > li'],
    target: ['.targetLanguage.question-label', '.targetLanguage', '[class*="targetLanguage"]'],
    base: ['.baseLanguage.question-label', '.baseLanguage', '[class*="baseLanguage"]'],
    fullList: ['#full-list-switcher'],
    listScroller: ['#slim-scroll-content', '#preview-grid-container', '.preview-grid-container'],
    question: ['#question-text', '#question-block #question-text', '[data-testid="question-text"]', '[id$="question-text"]'],
    answer: ['#answer-text', '#answer-block input[type="text"]', '#answer-block textarea', 'input[autofocus][type="text"]'],
  };

  let answerMap = {};
  let settings = { ...DEFAULT_SETTINGS };
  let panel;
  let stateEl;
  let detailEl;
  let countEl;
  let answerCard;
  let answerTextEl;
  let copyBtn;
  let fillBtn;
  let loadBtn;
  let diagEl;
  let toastEl;
  let toastTimer;
  let pollTimer;
  let currentQuestion = '';
  let currentAnswer = '';
  let questionSeenAt = 0;
  let questionOrdinal = 0;
  let lastQuestionEndedAt = 0;
  let diagnostics = [];
  let loadBusy = false;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function addDiagnostic(message) {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    diagnostics.push(`[${stamp}] ${message}`);
    if (diagnostics.length > 30) diagnostics.shift();
    if (diagEl) diagEl.textContent = message;
  }

  function setState(title, detail = '') {
    if (stateEl) stateEl.textContent = title;
    if (detailEl) detailEl.textContent = detail;
  }

  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'ep-helper-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl?.classList.remove('show'), 1800);
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
    if (!el || !el.isConnected || el.hidden || el.closest('.ng-hide, .sf-hidden, [hidden]')) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
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
    if (Object.prototype.hasOwnProperty.call(answerMap, q)) return answerMap[q];

    let contained = null;
    let containedLen = -1;
    for (const [key, value] of Object.entries(answerMap)) {
      if (key.length >= 4 && (q.includes(key) || key.includes(q)) && key.length > containedLen) {
        contained = value;
        containedLen = key.length;
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
    return bestScore >= FUZZY_THRESHOLD ? bestValue : null;
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
    for (let i = 0; i < Math.min(targets.length, bases.length); i++) {
      const target = stripAlts(text(targets[i]));
      const base = stripAlts(text(bases[i]));
      if (target && base) pairs.push([target, base]);
    }
    return pairs;
  }

  function getVisibleScroller() {
    for (const selector of SEL.listScroller) {
      for (const el of document.querySelectorAll(selector)) {
        if (isVisible(el) && el.scrollHeight > el.clientHeight + 5) return el;
      }
    }
    return null;
  }

  async function loadVocabulary() {
    if (loadBusy) return;
    loadBusy = true;
    loadBtn.disabled = true;
    loadBtn.textContent = 'Loading…';
    setState('Loading vocabulary…', 'Stay on the page that shows all word pairs');

    const root = queryFirst(SEL.listRoot);
    if (!root || !isVisible(root)) {
      setState('Open the vocabulary list', 'Then press Load vocabulary again');
      addDiagnostic('Vocabulary list page was not detected');
      loadBusy = false;
      loadBtn.disabled = false;
      loadBtn.textContent = 'Load vocabulary';
      return;
    }

    const fullButton = queryFirst(SEL.fullList);
    if (fullButton && isVisible(fullButton)) fullButton.click();

    let bestPairs = [];
    let stable = 0;
    let lastCount = -1;
    const deadline = Date.now() + 9000;

    while (Date.now() < deadline) {
      const scroller = getVisibleScroller();
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
      document.querySelector('.preview-grid')?.lastElementChild?.scrollIntoView({ block: 'end' });

      const pairs = getPairsFromRows();
      if (pairs.length > bestPairs.length) bestPairs = pairs;
      if (pairs.length > 0 && pairs.length === lastCount) stable++;
      else stable = 0;
      lastCount = pairs.length;
      if (stable >= 4) break;
      await sleep(180);
    }

    if (!bestPairs.length) {
      setState('Couldn’t read the list', 'Make sure the vocabulary pairs are visible');
      addDiagnostic('No vocabulary pairs were found');
    } else {
      const map = {};
      for (const [target, base] of bestPairs) {
        const targetKey = norm(target);
        const baseKey = norm(base);
        if (targetKey) map[targetKey] = base;
        if (baseKey) map[baseKey] = target;
      }
      answerMap = map;
      await chrome.storage.local.set({ [STORAGE_KEY]: answerMap });
      updateCount();
      setState('Vocabulary ready', 'Start the activity normally');
      addDiagnostic(`Loaded ${bestPairs.length} vocabulary pairs`);
      showToast(`✓ ${bestPairs.length} pairs loaded`);
    }

    loadBusy = false;
    loadBtn.disabled = false;
    loadBtn.textContent = 'Load vocabulary';
  }

  function isGamePage() {
    return location.pathname.includes('/game');
  }

  function getQuestion() {
    if (!isGamePage()) return null;
    const el = queryFirst(SEL.question);
    if (!el || !isVisible(el)) return null;
    const value = text(el);
    if (!value || value.length > 500) return null;
    return value;
  }

  function getAnswerInput() {
    if (!isGamePage()) return null;
    for (const selector of SEL.answer) {
      for (const el of document.querySelectorAll(selector)) {
        if (isVisible(el) && !el.disabled && !el.readOnly) return el;
      }
    }
    return null;
  }

  function shouldShowForOrdinal(ordinal) {
    const pct = Number(settings.coveragePercent || 100);
    if (pct >= 100) return true;
    if (pct <= 0) return false;
    const bucket = ((ordinal * 37) % 100) + 1;
    return bucket <= pct;
  }

  function hideAnswer(message = 'Waiting for a question') {
    currentAnswer = '';
    if (answerCard) answerCard.classList.remove('show');
    if (answerTextEl) answerTextEl.textContent = '—';
    if (copyBtn) copyBtn.disabled = true;
    if (fillBtn) fillBtn.disabled = true;
    if (message) setState(message, '');
  }

  function revealAnswer(answer) {
    currentAnswer = answer;
    answerTextEl.textContent = answer;
    answerCard.classList.add('show');
    copyBtn.disabled = false;
    fillBtn.disabled = false;
    setState('Answer ready', 'Copy it or fill the box, then submit it yourself');
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

  function fillAnswerBox() {
    if (!currentAnswer || !isGamePage()) return;
    const input = getAnswerInput();
    if (!input) {
      showToast('Answer box not found');
      addDiagnostic('Fill requested but answer box was not found');
      return;
    }

    input.focus();
    if (input.isContentEditable) {
      input.textContent = currentAnswer;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: currentAnswer }));
    } else {
      nativeSetValue(input, currentAnswer);
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: currentAnswer }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    showToast('Answer filled — you submit it');
    addDiagnostic(`User filled answer box for “${currentQuestion}”`);
    setState('Filled', 'Press Enter or Submit yourself');
  }

  async function copyAnswer() {
    if (!currentAnswer) return;
    try {
      await navigator.clipboard.writeText(currentAnswer);
      showToast('Answer copied');
      addDiagnostic(`User copied answer for “${currentQuestion}”`);
    } catch {
      showToast('Clipboard unavailable — select the shown answer');
    }
  }

  function updateQuestion() {
    if (!panel) return;

    if (!isGamePage()) {
      if (currentQuestion) {
        currentQuestion = '';
        currentAnswer = '';
        lastQuestionEndedAt = Date.now();
      }
      answerCard.classList.remove('show');
      copyBtn.disabled = true;
      fillBtn.disabled = true;
      if (Object.keys(answerMap).length) setState('Vocabulary ready', 'Start the activity normally');
      else setState('Load vocabulary', 'Open the page showing the word pairs');
      return;
    }

    const question = getQuestion();
    if (!question) {
      setState('Waiting for question…', '');
      return;
    }

    if (question !== currentQuestion) {
      currentQuestion = question;
      currentAnswer = '';
      questionSeenAt = Date.now();
      questionOrdinal++;
      answerCard.classList.remove('show');
      copyBtn.disabled = true;
      fillBtn.disabled = true;
      addDiagnostic(`Question detected: “${question}”`);
    }

    if (currentAnswer) return;

    const cooldownLeft = Number(settings.cooldownMs || 0) - (Date.now() - lastQuestionEndedAt);
    if (lastQuestionEndedAt && cooldownLeft > 0) {
      setState('Cooldown…', `${Math.ceil(cooldownLeft / 1000)}s`);
      return;
    }

    const revealLeft = Number(settings.revealDelayMs || 0) - (Date.now() - questionSeenAt);
    if (revealLeft > 0) {
      setState('Waiting…', `${Math.ceil(revealLeft / 1000)}s before showing answer`);
      return;
    }

    if (!shouldShowForOrdinal(questionOrdinal)) {
      currentAnswer = '__MANUAL__';
      answerTextEl.textContent = 'Your turn';
      answerCard.classList.add('show');
      copyBtn.disabled = true;
      fillBtn.disabled = true;
      setState('Your turn', `${settings.coveragePercent}% coverage left this question manual`);
      addDiagnostic(`Question ${questionOrdinal} left manual by coverage setting`);
      return;
    }

    const found = findAnswer(question);
    const answer = found ? stripAlts(found) : '';
    if (!answer) {
      currentAnswer = '__MISSING__';
      answerTextEl.textContent = 'Not found';
      answerCard.classList.add('show');
      copyBtn.disabled = true;
      fillBtn.disabled = true;
      setState('Answer not found', 'Reload the vocabulary list if needed');
      addDiagnostic(`No saved answer for “${question}”`);
      return;
    }

    revealAnswer(answer);
  }

  function updateCount() {
    if (!countEl) return;
    countEl.textContent = `${Math.floor(Object.keys(answerMap).length / 2)} pairs loaded`;
  }

  async function saveSettings() {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  }

  function copyDiagnostics() {
    const data = [
      `EP Helper ${VERSION} diagnostics`,
      `URL: ${location.href}`,
      `Vocabulary entries: ${Object.keys(answerMap).length}`,
      `Reveal delay: ${settings.revealDelayMs}ms`,
      `Cooldown: ${settings.cooldownMs}ms`,
      `Coverage: ${settings.coveragePercent}%`,
      '',
      ...diagnostics,
    ].join('\n');
    navigator.clipboard.writeText(data).then(
      () => showToast('Diagnostics copied'),
      () => showToast('Could not copy diagnostics')
    );
  }

  function buildPanel() {
    const style = document.createElement('style');
    style.textContent = `
      #ep-helper{position:fixed;top:72px;right:16px;z-index:2147483647;width:300px;background:#111722;color:#f3f6ff;border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.35);font:13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
      #ep-helper *{box-sizing:border-box}#eph-head{display:flex;align-items:center;padding:11px 13px;border-bottom:1px solid rgba(255,255,255,.08)}#eph-title{font-weight:800;flex:1}.eph-ver{font-size:10px;opacity:.5}
      #eph-body{padding:12px}.eph-status{padding:10px 11px;background:#192131;border-radius:11px;margin-bottom:9px}#eph-state{font-weight:800}#eph-detail{font-size:11px;color:#aeb9cf;margin-top:2px}
      #eph-count{font-size:11px;color:#9ca9c2;margin:0 2px 8px}.eph-btn{width:100%;border:0;border-radius:10px;padding:9px 11px;font-weight:800;cursor:pointer;background:#4c78ff;color:#fff}.eph-btn:disabled{opacity:.45;cursor:default}
      #eph-answer{display:none;margin-top:9px;padding:12px;border-radius:12px;background:#eef3ff;color:#111827}.eph-answer-label{font-size:10px;font-weight:800;opacity:.55;text-transform:uppercase}.eph-answer-text{font-size:24px;font-weight:850;line-height:1.2;margin-top:4px;word-break:break-word}.eph-answer.show{display:block}
      .eph-actions{display:flex;gap:7px;margin-top:9px}.eph-actions button{flex:1;border:0;border-radius:9px;padding:8px;font-weight:750;cursor:pointer}.eph-copy{background:#263149;color:#eef4ff}.eph-fill{background:#4c78ff;color:#fff}.eph-actions button:disabled{opacity:.4;cursor:default}
      #eph-settings{margin-top:10px;border-top:1px solid rgba(255,255,255,.08);padding-top:9px}#eph-settings summary{cursor:pointer;color:#9eabc2;font-size:11px}.eph-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}.eph-row label{font-size:11px;color:#c4cde0}.eph-row select{background:#20293a;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:5px}
      #eph-diag{margin-top:8px;font-size:10px;color:#77839a;word-break:break-word}.eph-small{margin-top:8px;width:100%;border:0;border-radius:8px;padding:6px;background:#20293a;color:#cad4e8;cursor:pointer;font-size:10px}
      #ep-helper-toast{position:fixed;right:18px;bottom:20px;z-index:2147483647;background:#111722;color:#fff;padding:9px 13px;border-radius:10px;opacity:0;transform:translateY(6px);transition:.15s;pointer-events:none}#ep-helper-toast.show{opacity:1;transform:translateY(0)}
    `;
    document.head.appendChild(style);

    panel = document.createElement('div');
    panel.id = 'ep-helper';
    panel.innerHTML = `
      <div id="eph-head"><div id="eph-title">EP Helper <span class="eph-ver">${VERSION}</span></div></div>
      <div id="eph-body">
        <div class="eph-status"><div id="eph-state">Starting…</div><div id="eph-detail"></div></div>
        <div id="eph-count">0 pairs loaded</div>
        <button class="eph-btn" id="eph-load">Load vocabulary</button>
        <div id="eph-answer" class="eph-answer"><div class="eph-answer-label">Answer</div><div id="eph-answer-text" class="eph-answer-text">—</div></div>
        <div class="eph-actions"><button id="eph-copy" class="eph-copy" disabled>Copy</button><button id="eph-fill" class="eph-fill" disabled>Fill answer box</button></div>
        <details id="eph-settings"><summary>Settings</summary>
          <div class="eph-row"><label>Show answer after</label><select id="eph-delay"><option value="0">Immediately</option><option value="1000">1 sec</option><option value="2000">2 sec</option><option value="3000">3 sec</option><option value="5000">5 sec</option></select></div>
          <div class="eph-row"><label>Cooldown</label><select id="eph-cool"><option value="0">Off</option><option value="500">0.5 sec</option><option value="1000">1 sec</option><option value="2000">2 sec</option></select></div>
          <div class="eph-row"><label>Answer coverage</label><select id="eph-cover"><option value="100">100%</option><option value="80">80%</option><option value="60">60%</option></select></div>
          <button class="eph-small" id="eph-copydiag">Copy diagnostics</button><div id="eph-diag">Ready</div>
        </details>
      </div>`;
    document.body.appendChild(panel);

    stateEl = panel.querySelector('#eph-state');
    detailEl = panel.querySelector('#eph-detail');
    countEl = panel.querySelector('#eph-count');
    answerCard = panel.querySelector('#eph-answer');
    answerTextEl = panel.querySelector('#eph-answer-text');
    copyBtn = panel.querySelector('#eph-copy');
    fillBtn = panel.querySelector('#eph-fill');
    loadBtn = panel.querySelector('#eph-load');
    diagEl = panel.querySelector('#eph-diag');

    const delay = panel.querySelector('#eph-delay');
    const cool = panel.querySelector('#eph-cool');
    const cover = panel.querySelector('#eph-cover');
    delay.value = String(settings.revealDelayMs);
    cool.value = String(settings.cooldownMs);
    cover.value = String(settings.coveragePercent);

    loadBtn.addEventListener('click', loadVocabulary);
    copyBtn.addEventListener('click', copyAnswer);
    fillBtn.addEventListener('click', fillAnswerBox);
    panel.querySelector('#eph-copydiag').addEventListener('click', copyDiagnostics);

    delay.addEventListener('change', () => { settings.revealDelayMs = Number(delay.value); saveSettings(); });
    cool.addEventListener('change', () => { settings.cooldownMs = Number(cool.value); saveSettings(); });
    cover.addEventListener('change', () => { settings.coveragePercent = Number(cover.value); saveSettings(); currentQuestion = ''; currentAnswer = ''; saveSettings(); });

    updateCount();
    if (Object.keys(answerMap).length) setState('Vocabulary ready', 'Start the activity normally');
    else setState('Load vocabulary', 'Open the page showing the word pairs');
  }

  async function init() {
    if (document.getElementById('ep-helper')) return;
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY]);
      answerMap = stored?.[STORAGE_KEY] && typeof stored[STORAGE_KEY] === 'object' ? stored[STORAGE_KEY] : {};
      settings = { ...DEFAULT_SETTINGS, ...(stored?.[SETTINGS_KEY] || {}) };
    } catch {
      answerMap = {};
      settings = { ...DEFAULT_SETTINGS };
    }

    buildPanel();
    pollTimer = setInterval(updateQuestion, POLL_MS);
    updateQuestion();
    addDiagnostic('EP Helper ready — manual submit mode');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else setTimeout(init, 150);
})();
