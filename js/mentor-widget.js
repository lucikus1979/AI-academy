/**
 * AI Academy Mentor Widget — Self-contained chat widget
 * Embed: <script src="/js/mentor-widget.js" data-role="FDE" data-lesson="Day 13 - Architecture" data-day="13"></script>
 * No dependencies. No build step. Dark theme.
 */
(function () {
  'use strict';

  // ── Prevent double-init ────────────────────────────────────
  if (window.__mentorWidgetInit) return;
  window.__mentorWidgetInit = true;

  // ── Read data attributes from the script tag ───────────────
  const scriptTag = document.currentScript;
  const ATTR_ROLE = (scriptTag?.getAttribute('data-role') || 'FDE').toUpperCase().replace(/\s+/g, '-');
  const LESSON = scriptTag?.getAttribute('data-lesson') || '';
  const DAY = parseInt(scriptTag?.getAttribute('data-day') || '11', 10);
  const PAGE_MODE = (scriptTag?.getAttribute('data-page-mode') || '').toLowerCase().trim();
  // API_URL is hardcoded — never accept from data attributes to prevent exfiltration attacks
  const API_URL = '/api/chat';
  const ACTIVITY_API_URL = '/api/mentor/activity';
  const FALLBACK_API_URL = '/api/mentor/fallback';
  const FALLBACK_ACTION_LABEL = 'Request human mentor support';

  // ── Role config ────────────────────────────────────────────
  const ROLES = {
    FDE:      { color: '#3b82f6', emoji: '\u{1F680}', name: 'FDE Mentor',     full: 'Forward Deployed Engineer' },
    'AI-SE':  { color: '#8b5cf6', emoji: '\u{1F6E0}',  name: 'AI-SE Mentor',   full: 'AI Software Engineer' },
    'AI-DS':  { color: '#06b6d4', emoji: '\u{1F52C}', name: 'AI-DS Mentor',   full: 'AI Data Scientist' },
    'AI-DA':  { color: '#10b981', emoji: '\u{1F4CA}', name: 'AI-DA Mentor',   full: 'AI Data Analyst' },
    'AI-PM':  { color: '#f59e0b', emoji: '\u{1F4CB}', name: 'AI-PM Mentor',   full: 'AI Product Manager' },
    'AI-FE':  { color: '#ec4899', emoji: '\u{1F3A8}', name: 'AI-FE Mentor',   full: 'AI Front-End Developer' },
    'AI-SEC': { color: '#ef4444', emoji: '\u{1F6E1}',  name: 'AI-SEC Mentor',  full: 'AI Security Consultant' },
    'AI-DX':  { color: '#a855f7', emoji: '\u2728', name: 'AI-DX Mentor',   full: 'AI Design & UX' },
  };

  const QUICK_ACTIONS = {
    FDE:      ['Start my day', 'Review my code', 'Simulate client meeting', 'Help with RAG'],
    'AI-SE':  ['Start my day', 'Review my CI/CD', 'Deployment help', 'Docker issue'],
    'AI-DS':  ['Start my day', 'Review my eval', 'Create golden dataset', 'Bias check'],
    'AI-DA':  ['Start my day', 'Dashboard review', 'Define KPIs', 'ROI calculation'],
    'AI-PM':  ['Start my day', 'Scope my use case', 'Stakeholder prep', 'Risk assessment'],
    'AI-FE':  ['Start my day', 'UI review', 'Streaming implementation', 'Accessibility check'],
    'AI-SEC': ['Start my day', 'Threat model', 'Red team my agent', 'EU AI Act check'],
    'AI-DX':  ['Start my day', 'User journey review', 'Design critique', 'Accessibility check'],
  };

  function getActionsForRole(roleKey) {
    var base = (QUICK_ACTIONS[roleKey] || QUICK_ACTIONS.FDE).slice();
    if (!base.includes(FALLBACK_ACTION_LABEL)) {
      base.push(FALLBACK_ACTION_LABEL);
    }
    return base;
  }

  // ── Mutable role state (supports role switching) ──────────
  const LS_ROLE_KEY = 'mentor-widget-selected-role';

  function resolveInitialRole() {
    try {
      var stored = localStorage.getItem(LS_ROLE_KEY);
      if (stored && ROLES[stored]) return stored;
    } catch (e) { /* localStorage unavailable */ }
    return ROLES[ATTR_ROLE] ? ATTR_ROLE : 'FDE';
  }

  let currentRoleKey = resolveInitialRole();
  let currentRole = ROLES[currentRoleKey];
  let currentActions = getActionsForRole(currentRoleKey);

  // ── Theme detection ──────────────────────────────────────────
  function getPageTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    return t === 'light' ? 'light' : 'dark';
  }
  let currentTheme = getPageTheme();

  // ── State ──────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  let messages = []; // { role: 'user'|'assistant', content: string }
  var CHAT_API_MAX_MESSAGES = 50;
  var CHAT_API_MAX_MESSAGE_CHARS = 4000;

  // ── Session storage key (unique per role+day) ─────────────
  function getStorageKey() { return 'mentor-chat-' + currentRoleKey + '-day' + DAY; }
  const ESCALATION_THRESHOLD = 10; // message pairs before escalation prompt
  const BUILD_CHECK_THRESHOLD = 5; // user messages before build-week check (Days 16-20)
  let escalationAsked = false;
  let buildCheckAsked = false;
  let autoFallbackRaised = false;
  let isTransparencyOpen = false;

  // ── Analytics: sessionId + pageUrl ────────────────────────
  const PAGE_URL = window.location.pathname;

  function generateSessionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Load or create sessionId — persisted per role+day alongside messages
  let sessionId = '';

  // ── Unique IDs (namespace all DOM) ─────────────────────────
  const ID = 'mw-' + Math.random().toString(36).slice(2, 8);

  // ── Inject styles ──────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = /* css */ `
    /* ── Theme variables ───────────────────────────────── */
    #${ID}-root {
      --mw-bg-deep: #0f0f17;
      --mw-bg-panel: #0f0f17;
      --mw-bg-header: #14141f;
      --mw-bg-bubble: #1a1a26;
      --mw-bg-input: #0f0f17;
      --mw-border: #2a2a3d;
      --mw-text: #e8e8f0;
      --mw-text-muted: #7a7a8e;
      --mw-text-code: #c8c8d8;
      --mw-text-list: #d0d0e0;
      --mw-text-quote: #a0a0b8;
      --mw-text-placeholder: #5a5a6e;
      --mw-action-bg: #14141f;
      --mw-action-text: #c0c0d0;
      --mw-shadow: 0 8px 40px rgba(0,0,0,0.6);
      --mw-fab-shadow: 0 4px 20px rgba(0,0,0,0.4);
      --mw-fab-shadow-hover: 0 6px 28px rgba(0,0,0,0.5);
      --mw-badge-border: #0f0f17;
      --mw-btn-hover: #1a1a26;
      --mw-strong: #fff;
      --mw-heading: #fff;
    }
    #${ID}-root.${ID}-light {
      --mw-bg-deep: #f1f5f9;
      --mw-bg-panel: #ffffff;
      --mw-bg-header: #f8fafc;
      --mw-bg-bubble: #f1f5f9;
      --mw-bg-input: #ffffff;
      --mw-border: #e2e8f0;
      --mw-text: #1e293b;
      --mw-text-muted: #64748b;
      --mw-text-code: #334155;
      --mw-text-list: #334155;
      --mw-text-quote: #64748b;
      --mw-text-placeholder: #94a3b8;
      --mw-action-bg: #f8fafc;
      --mw-action-text: #475569;
      --mw-shadow: 0 8px 40px rgba(0,0,0,0.12);
      --mw-fab-shadow: 0 4px 20px rgba(0,0,0,0.15);
      --mw-fab-shadow-hover: 0 6px 28px rgba(0,0,0,0.2);
      --mw-badge-border: #ffffff;
      --mw-btn-hover: #e2e8f0;
      --mw-strong: #0f172a;
      --mw-heading: #0f172a;
    }

    /* ── Reset scope ──────────────────────────────────── */
    #${ID}-root,
    #${ID}-root * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* ── FAB ──────────────────────────────────────────── */
    #${ID}-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--mw-accent);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      box-shadow: var(--mw-fab-shadow);
      z-index: 99998;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      line-height: 1;
    }
    #${ID}-fab:hover {
      transform: scale(1.08);
      box-shadow: var(--mw-fab-shadow-hover);
    }
    #${ID}-fab.${ID}-hidden { display: none; }

    /* ── Notification badge ───────────────────────────── */
    #${ID}-fab::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #22c55e;
      border: 2px solid var(--mw-badge-border);
      display: none;
    }
    #${ID}-fab.${ID}-unread::after { display: block; }

    /* ── Panel ────────────────────────────────────────── */
    #${ID}-panel {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 420px;
      height: 580px;
      background: var(--mw-bg-panel);
      border: 1px solid var(--mw-border);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 99999;
      box-shadow: var(--mw-shadow);
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #${ID}-panel.${ID}-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    /* ── Header ───────────────────────────────────────── */
    #${ID}-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: var(--mw-bg-header);
      border-bottom: 1px solid var(--mw-border);
      flex-shrink: 0;
      position: relative;
    }
    #${ID}-header-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--mw-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
      line-height: 1;
      cursor: pointer;
      transition: transform 0.15s;
    }
    #${ID}-header-avatar:hover { transform: scale(1.1); }

    /* ── Role picker dropdown ────────────────────────── */
    #${ID}-role-picker {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--mw-bg-panel);
      border: 1px solid var(--mw-border);
      border-top: none;
      z-index: 10;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.25s ease;
    }
    #${ID}-role-picker.${ID}-picker-open {
      max-height: 400px;
    }
    .${ID}-role-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      cursor: pointer;
      transition: background 0.12s;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: inherit;
      font-size: 15px;
      color: var(--mw-text);
    }
    .${ID}-role-option:hover {
      background: var(--mw-bg-bubble);
    }
    .${ID}-role-option.${ID}-role-active {
      background: var(--mw-bg-bubble);
    }
    .${ID}-role-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .${ID}-role-emoji {
      font-size: 20px;
      width: 28px;
      text-align: center;
      flex-shrink: 0;
      line-height: 1;
    }
    .${ID}-role-name {
      flex: 1;
      min-width: 0;
    }
    .${ID}-role-name-short {
      font-weight: 600;
      color: var(--mw-text);
    }
    .${ID}-role-name-full {
      font-size: 12px;
      color: var(--mw-text-muted);
      margin-left: 6px;
    }
    #${ID}-header-info {
      flex: 1;
      min-width: 0;
    }
    #${ID}-header-name {
      color: var(--mw-text);
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${ID}-header-status {
      color: var(--mw-text-muted);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    #${ID}-header-status::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
    }
    .${ID}-header-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--mw-text-muted);
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
      line-height: 1;
    }
    .${ID}-header-btn:hover {
      background: var(--mw-btn-hover);
      color: var(--mw-text);
    }
    #${ID}-transparency {
      font-size: 14px;
      font-weight: 700;
    }
    #${ID}-new-chat {
      font-size: 16px;
    }
    #${ID}-transparency-panel {
      display: none;
      margin: 8px 16px 0;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--mw-border);
      background: var(--mw-bg-bubble);
      color: var(--mw-text-muted);
      font-size: 12px;
      line-height: 1.45;
      max-height: 180px;
      overflow-y: auto;
    }
    #${ID}-transparency-panel.${ID}-open {
      display: block;
    }
    .${ID}-transparency-title {
      color: var(--mw-text);
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .${ID}-transparency-subtitle {
      color: var(--mw-text-muted);
      font-size: 11px;
      margin-bottom: 6px;
    }
    .${ID}-transparency-list {
      margin-left: 16px;
      color: var(--mw-text-list);
    }
    .${ID}-transparency-list li {
      margin-bottom: 4px;
    }
    .${ID}-transparency-list code {
      background: var(--mw-bg-deep);
      padding: 1px 4px;
      border-radius: 4px;
      color: var(--mw-accent);
      font-size: 11px;
    }

    /* ── Messages area ────────────────────────────────── */
    #${ID}-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: var(--mw-border) transparent;
    }
    #${ID}-messages::-webkit-scrollbar { width: 6px; }
    #${ID}-messages::-webkit-scrollbar-track { background: transparent; }
    #${ID}-messages::-webkit-scrollbar-thumb { background: var(--mw-border); border-radius: 3px; }

    /* ── Message bubbles ──────────────────────────────── */
    .${ID}-msg {
      max-width: 88%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.55;
      color: var(--mw-text);
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .${ID}-msg-user {
      align-self: flex-end;
      background: var(--mw-accent);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .${ID}-msg-assistant {
      align-self: flex-start;
      background: var(--mw-bg-bubble);
      border: 1px solid var(--mw-border);
      border-bottom-left-radius: 4px;
    }
    .${ID}-msg-error {
      align-self: center;
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.3);
      color: #fca5a5;
      font-size: 13px;
      text-align: center;
      border-radius: 8px;
      white-space: pre-wrap;
    }

    /* ── Markdown-lite inside assistant bubbles ────────── */
    .${ID}-msg-assistant strong { color: var(--mw-strong); font-weight: 600; }
    .${ID}-msg-assistant code {
      background: var(--mw-bg-deep);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 13px;
      color: var(--mw-accent);
    }
    .${ID}-msg-assistant pre {
      background: var(--mw-bg-deep);
      border: 1px solid var(--mw-border);
      border-radius: 8px;
      padding: 10px 12px;
      margin: 8px 0;
      overflow-x: auto;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
      color: var(--mw-text-code);
    }
    .${ID}-msg-assistant pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      color: inherit;
    }
    .${ID}-msg-assistant ul,
    .${ID}-msg-assistant ol {
      padding-left: 20px;
      margin: 6px 0;
    }
    .${ID}-msg-assistant li {
      margin: 3px 0;
      color: var(--mw-text-list);
    }
    .${ID}-msg-assistant li::marker {
      color: var(--mw-accent);
    }
    .${ID}-msg-assistant h1,
    .${ID}-msg-assistant h2,
    .${ID}-msg-assistant h3 {
      color: var(--mw-heading);
      font-weight: 600;
      margin: 10px 0 4px;
    }
    .${ID}-msg-assistant h1 { font-size: 16px; }
    .${ID}-msg-assistant h2 { font-size: 15px; }
    .${ID}-msg-assistant h3 { font-size: 14px; }
    .${ID}-msg-assistant p { margin: 4px 0; }
    .${ID}-msg-assistant blockquote {
      border-left: 3px solid var(--mw-accent);
      padding-left: 10px;
      margin: 6px 0;
      color: var(--mw-text-quote);
    }

    /* ── Typing indicator ─────────────────────────────── */
    .${ID}-typing {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 12px 16px;
      background: var(--mw-bg-bubble);
      border: 1px solid var(--mw-border);
      border-radius: 12px;
      border-bottom-left-radius: 4px;
    }
    .${ID}-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--mw-text-muted);
      animation: ${ID}-bounce 1.2s ease-in-out infinite;
    }
    .${ID}-dot:nth-child(2) { animation-delay: 0.15s; }
    .${ID}-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes ${ID}-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    /* ── Quick actions ────────────────────────────────── */
    #${ID}-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 16px 12px;
    }
    .${ID}-action {
      padding: 7px 14px;
      border-radius: 20px;
      border: 1px solid var(--mw-border);
      background: var(--mw-action-bg);
      color: var(--mw-action-text);
      font-size: 13px;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
      white-space: nowrap;
    }
    .${ID}-action:hover {
      border-color: var(--mw-accent);
      color: var(--mw-accent);
      background: rgba(255,255,255,0.04);
    }

    /* ── Input area ───────────────────────────────────── */
    #${ID}-input-area {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--mw-border);
      background: var(--mw-bg-header);
      flex-shrink: 0;
    }
    #${ID}-textarea {
      flex: 1;
      min-height: 40px;
      max-height: 120px;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1px solid var(--mw-border);
      background: var(--mw-bg-input);
      color: var(--mw-text);
      font-size: 14px;
      font-family: inherit;
      resize: none;
      outline: none;
      line-height: 1.45;
      transition: border-color 0.15s;
      overflow-y: auto;
    }
    #${ID}-textarea::placeholder { color: var(--mw-text-placeholder); }
    #${ID}-textarea:focus { border-color: var(--mw-accent); }
    #${ID}-textarea:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #${ID}-send {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: none;
      background: var(--mw-accent);
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.15s, transform 0.1s;
      line-height: 1;
    }
    #${ID}-send:hover { opacity: 0.9; }
    #${ID}-send:active { transform: scale(0.94); }
    #${ID}-send:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }

    /* ── Mobile responsive ────────────────────────────── */
    @media (max-width: 500px) {
      #${ID}-panel {
        width: 100%;
        height: 100%;
        bottom: 0;
        right: 0;
        border-radius: 0;
        border: none;
      }
      #${ID}-fab {
        bottom: 16px;
        right: 16px;
        width: 54px;
        height: 54px;
        font-size: 24px;
      }
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM ──────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = ID + '-root';
  root.style.setProperty('--mw-accent', currentRole.color);

  // FAB
  const fab = document.createElement('button');
  fab.id = ID + '-fab';
  fab.classList.add('mw-fab');
  fab.setAttribute('aria-label', 'Open ' + currentRole.name);
  fab.textContent = currentRole.emoji;
  fab.classList.add(ID + '-unread');
  root.appendChild(fab);

  // Panel
  const panel = document.createElement('div');
  panel.id = ID + '-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', currentRole.name + ' chat');

  // Header
  panel.innerHTML = `
    <div id="${ID}-header">
      <div id="${ID}-header-avatar" title="Click to switch role">${currentRole.emoji}</div>
      <div id="${ID}-header-info">
        <div id="${ID}-header-name">${currentRole.name}</div>
        <div id="${ID}-header-status">Online &middot; Day ${DAY}</div>
      </div>
      <button id="${ID}-transparency" class="${ID}-header-btn" aria-label="What is shared" title="What is shared">i</button>
      <button id="${ID}-new-chat" class="${ID}-header-btn" aria-label="New conversation" title="New conversation">&#x21BB;</button>
      <button id="${ID}-close" class="${ID}-header-btn" aria-label="Close chat">&times;</button>
      <div id="${ID}-role-picker"></div>
    </div>
    <div id="${ID}-messages"></div>
    <div id="${ID}-transparency-panel"></div>
    <div id="${ID}-actions"></div>
    <div id="${ID}-input-area">
      <textarea id="${ID}-textarea" placeholder="Ask your mentor..." rows="1"></textarea>
      <button id="${ID}-send" aria-label="Send message">&#10148;</button>
    </div>
  `;
  root.appendChild(panel);
  document.body.appendChild(root);

  // ── Theme sync ──────────────────────────────────────────────
  function applyWidgetTheme() {
    var theme = getPageTheme();
    if (theme === 'light') {
      root.classList.add(ID + '-light');
    } else {
      root.classList.remove(ID + '-light');
    }
    currentTheme = theme;
  }
  applyWidgetTheme();

  // Watch for data-theme changes on <html>
  var themeObserver = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === 'data-theme') {
        applyWidgetTheme();
        break;
      }
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Also listen for postMessage theme changes (from dashboard iframe parent)
  window.addEventListener('message', function(e) {
    if (e.origin !== window.location.origin) return;
    if (e.data && e.data.type === 'theme-change') {
      applyWidgetTheme();
    }
  });

  // ── Grab DOM refs ──────────────────────────────────────────
  const msgArea = document.getElementById(ID + '-messages');
  const actionsArea = document.getElementById(ID + '-actions');
  const textarea = document.getElementById(ID + '-textarea');
  const sendBtn = document.getElementById(ID + '-send');
  const closeBtn = document.getElementById(ID + '-close');
  const newChatBtn = document.getElementById(ID + '-new-chat');
  const transparencyBtn = document.getElementById(ID + '-transparency');
  const transparencyPanel = document.getElementById(ID + '-transparency-panel');

  // ── Welcome message ────────────────────────────────────────
  function getWelcomeText() {
    return `Hi! I'm your **${currentRole.full} Mentor** for AI Academy. ${LESSON ? `Today we're working on: **${LESSON}**.` : ''}\n\nAsk me anything about your role, or use one of the buttons below to get started.`;
  }

  function renderWelcome() {
    appendMessage('assistant', getWelcomeText());
  }

  function renderTransparencyPanel() {
    transparencyPanel.innerHTML = ''
      + '<div class="' + ID + '-transparency-title">What is shared with your instructor</div>'
      + '<div class="' + ID + '-transparency-subtitle">This data supports fallback handling and live coaching.</div>'
      + '<ul class="' + ID + '-transparency-list">'
      + '<li><code>role</code>, <code>day_number</code>, and <code>page_url</code></li>'
      + '<li><code>session_id</code> and <code>message_count</code></li>'
      + '<li>Your first question in a new chat session</li>'
      + '<li>Technical metrics (response time, error category, token usage)</li>'
      + '<li>Fallback requests that you explicitly submit</li>'
      + '</ul>';
  }

  function openTransparencyPanel() {
    isTransparencyOpen = true;
    transparencyPanel.classList.add(ID + '-open');
  }

  function closeTransparencyPanel() {
    isTransparencyOpen = false;
    transparencyPanel.classList.remove(ID + '-open');
  }

  function toggleTransparencyPanel() {
    if (isTransparencyOpen) closeTransparencyPanel();
    else openTransparencyPanel();
  }

  // ── Quick actions ──────────────────────────────────────────
  function renderActions() {
    actionsArea.innerHTML = '';
    currentActions.forEach(function (label) {
      const btn = document.createElement('button');
      btn.className = ID + '-action';
      btn.textContent = label;
      btn.addEventListener('click', function () {
        if (label === FALLBACK_ACTION_LABEL) {
          requestFallback('manual_help_request', 'Student requested human mentor support from quick actions.', 'medium');
          return;
        }
        sendMessage(label);
      });
      actionsArea.appendChild(btn);
    });
  }

  function hideActions() {
    actionsArea.style.display = 'none';
  }

  function getPodId() {
    try {
      var pod = localStorage.getItem('academy_pod_id');
      return typeof pod === 'string' ? pod : '';
    } catch (e) {
      return '';
    }
  }

  async function sendActivityUpdate(lastEvent) {
    if (!window.__academyAuthToken) return;
    try {
      await fetch(ACTIVITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + window.__academyAuthToken
        },
        body: JSON.stringify({
          role: currentRoleKey,
          day_number: DAY,
          page_url: PAGE_URL,
          session_id: sessionId,
          message_count: getUserMessageCount(),
          pod_id: getPodId(),
          last_event: lastEvent || 'chat'
        })
      });
    } catch (e) {
      // Non-blocking telemetry; ignore failures.
    }
  }

  async function requestFallback(reason, context, severity) {
    if (!window.__academyAuthToken) {
      appendMessage('error', 'Please sign in before requesting human mentor support.');
      return;
    }

    try {
      const response = await fetch(FALLBACK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + window.__academyAuthToken
        },
        body: JSON.stringify({
          role: currentRoleKey,
          day_number: DAY,
          page_url: PAGE_URL,
          session_id: sessionId,
          message_count: getUserMessageCount(),
          pod_id: getPodId(),
          reason: reason || 'manual_help_request',
          context: context || '',
          severity: severity || 'medium'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to open fallback ticket');
      }

      autoFallbackRaised = true;
      appendMessage('assistant', 'Fallback ticket created. Your instructor can now see and prioritize your request.');
      await sendActivityUpdate('fallback_opened');
    } catch (err) {
      appendMessage('error', 'Could not create a fallback ticket. Please post in your Teams mentor channel now.');
    }
  }

  // ── Markdown-lite renderer ─────────────────────────────────
  function renderMarkdown(text) {
    // Escape HTML — this MUST happen first to prevent XSS
    var html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Code blocks (triple backtick) — must come before inline code
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return '<pre><code>' + code.trim() + '</code></pre>';
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered lists — collect consecutive lines
    html = html.replace(/((?:^- .+\n?)+)/gm, function (block) {
      var items = block.trim().split('\n').map(function (line) {
        return '<li>' + line.replace(/^- /, '') + '</li>';
      }).join('');
      return '<ul>' + items + '</ul>';
    });

    // Ordered lists
    html = html.replace(/((?:^\d+\. .+\n?)+)/gm, function (block) {
      var items = block.trim().split('\n').map(function (line) {
        return '<li>' + line.replace(/^\d+\.\s*/, '') + '</li>';
      }).join('');
      return '<ol>' + items + '</ol>';
    });

    // Paragraphs — wrap remaining loose lines
    html = html.replace(/^(?!<[houbl])((?!<).+)$/gm, '<p>$1</p>');

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
  }

  // ── Append a message to the chat ───────────────────────────
  function appendMessage(msgRole, content) {
    var div = document.createElement('div');
    div.className = ID + '-msg ' + ID + '-msg-' + msgRole;

    if (msgRole === 'assistant') {
      div.innerHTML = renderMarkdown(content);
    } else if (msgRole === 'error') {
      div.textContent = content;
    } else {
      div.textContent = content;
    }

    msgArea.appendChild(div);
    scrollToBottom();
  }

  // ── Typing indicator ───────────────────────────────────────
  var typingEl = null;

  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = ID + '-typing';
    typingEl.innerHTML = '<div class="' + ID + '-dot"></div><div class="' + ID + '-dot"></div><div class="' + ID + '-dot"></div>';
    msgArea.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTyping() {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  // ── Scroll ─────────────────────────────────────────────────
  function scrollToBottom() {
    requestAnimationFrame(function () {
      msgArea.scrollTop = msgArea.scrollHeight;
    });
  }

  // ── Textarea auto-resize ───────────────────────────────────
  function autoResize() {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  // ── Gather lesson context from the page ────────────────────
  function getLessonContext() {
    // Optional host-page context provider (e.g. team dashboards).
    try {
      if (typeof window.__mentorWidgetContextProvider === 'function') {
        var providedContext = window.__mentorWidgetContextProvider({
          role: currentRoleKey,
          dayNumber: DAY,
          pageUrl: PAGE_URL,
          lesson: LESSON
        });
        if (typeof providedContext === 'string' && providedContext.trim()) {
          return providedContext.slice(0, 2500);
        }
      }
    } catch (e) {
      // Fallback to default extraction below.
    }

    // Try to grab meaningful content from the host page
    var el = document.querySelector('main') ||
      document.querySelector('.main') ||
      document.querySelector('.main-content') ||
      document.querySelector('article') ||
      document.querySelector('.content');
    if (el) {
      var text = el.innerText || '';
      return text.slice(0, 1500);
    }
    // Fallback to title + h1
    var title = document.title || '';
    var h1 = document.querySelector('h1');
    return title + (h1 ? '\n' + h1.innerText : '');
  }

  // ── Session storage helpers ────────────────────────────────
  var MAX_STORED_MESSAGES = 100; // keep last 100 messages max

  function sanitizeMessageHistory(list, maxItems) {
    if (!Array.isArray(list)) return [];

    var cleaned = [];
    for (var i = 0; i < list.length; i++) {
      var msg = list[i];
      if (!msg || typeof msg !== 'object') continue;
      if (msg.role !== 'user' && msg.role !== 'assistant') continue;
      if (typeof msg.content !== 'string') continue;
      if (!msg.content) continue;

      cleaned.push({
        role: msg.role,
        content: msg.content.slice(0, CHAT_API_MAX_MESSAGE_CHARS)
      });
    }

    if (typeof maxItems === 'number' && maxItems > 0 && cleaned.length > maxItems) {
      return cleaned.slice(-maxItems);
    }
    return cleaned;
  }

  function saveSession() {
    try {
      // Limit stored messages to prevent sessionStorage exhaustion
      var storedMessages = sanitizeMessageHistory(messages, MAX_STORED_MESSAGES);
      sessionStorage.setItem(getStorageKey(), JSON.stringify({
        messages: storedMessages,
        escalationAsked: escalationAsked,
        buildCheckAsked: buildCheckAsked,
        sessionId: sessionId
      }));
    } catch (e) {
      // sessionStorage full or unavailable — fail silently
    }
  }

  function loadSession() {
    try {
      var raw = sessionStorage.getItem(getStorageKey());
      if (!raw) return false;
      var data = JSON.parse(raw);
      var loadedMessages = sanitizeMessageHistory(data.messages, MAX_STORED_MESSAGES);
      if (loadedMessages.length > 0) {
        messages = loadedMessages;
        escalationAsked = !!data.escalationAsked;
        buildCheckAsked = !!data.buildCheckAsked;
        sessionId = data.sessionId || generateSessionId();
        return true;
      }
    } catch (e) {
      // corrupt data — start fresh
    }
    return false;
  }

  function clearSession() {
    messages = [];
    escalationAsked = false;
    buildCheckAsked = false;
    sessionId = generateSessionId(); // Fresh session ID for new conversation
    try {
      sessionStorage.removeItem(getStorageKey());
    } catch (e) { /* ignore */ }
  }

  // ── Count user messages (for escalation check) ────────────
  function getUserMessageCount() {
    return messages.filter(function (m) { return m.role === 'user'; }).length;
  }

  // ── Send message ───────────────────────────────────────────
  async function sendMessage(text) {
    var trimmed = (text || '').trim();
    if (!trimmed || isLoading) return;

    // Hide quick actions on first user message
    if (messages.length === 0) {
      hideActions();
    }

    // Add user message
    messages.push({ role: 'user', content: trimmed });
    appendMessage('user', trimmed);
    saveSession();

    // Clear input
    textarea.value = '';
    autoResize();
    setLoading(true);

    try {
      var fetchHeaders = { 'Content-Type': 'application/json' };
      if (window.__academyAuthToken) {
        fetchHeaders['Authorization'] = 'Bearer ' + window.__academyAuthToken;
      }

      var response = await fetch(API_URL, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          messages: sanitizeMessageHistory(messages, CHAT_API_MAX_MESSAGES),
          role: currentRoleKey,
          dayNumber: DAY,
          pageMode: PAGE_MODE,
          lessonContext: getLessonContext(),
          messageCount: getUserMessageCount(),
          isNewConversation: getUserMessageCount() <= 1,
          sessionId: sessionId,
          pageUrl: PAGE_URL
        })
      });

      var data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Do not force-redirect from the widget — keep the page state and let the user re-authenticate intentionally.
          window.__academyAuthToken = null;
          var authError = new Error(
            (data && (data.message || data.error)) || 'Your session expired. Please sign in again at /login.'
          );
          authError.code = 'AUTH_REQUIRED';
          throw authError;
        }
        throw new Error(data.fallback || data.message || data.error || 'Unexpected error');
      }

      var assistantContent = data.message;
      messages.push({ role: 'assistant', content: assistantContent });
      hideTyping();
      appendMessage('assistant', assistantContent);
      saveSession();
      await sendActivityUpdate('chat_success');

      // Build-week check (Days 16-20): after 5+ user messages, ask if building manually
      if (!buildCheckAsked && DAY >= 16 && DAY <= 20 && getUserMessageCount() >= BUILD_CHECK_THRESHOLD) {
        buildCheckAsked = true;
        saveSession();
        setTimeout(function () {
          var buildMsg = 'Are you building this manually? Try asking an AI agent first, then review and improve the output.';
          messages.push({ role: 'assistant', content: buildMsg });
          appendMessage('assistant', buildMsg);
          saveSession();
        }, 1500);
      }

      // Escalation check: after 10+ user messages, proactively ask
      if (!escalationAsked && getUserMessageCount() >= ESCALATION_THRESHOLD) {
        escalationAsked = true;
        saveSession();
        // Small delay so the response appears first
        setTimeout(function () {
          var escalationMsg = 'It looks like you are blocked for longer than expected. Would you like to escalate to your human mentor in **#role-' + currentRoleKey.toLowerCase() + '**?';
          messages.push({ role: 'assistant', content: escalationMsg });
          appendMessage('assistant', escalationMsg);
          saveSession();
        }, 1500);
      }

    } catch (err) {
      hideTyping();
      // Remove the user message from history so they can retry
      messages.pop();
      saveSession();

      var errorMsg = err.message || 'Unexpected error';
      var isAuthError = !!(err && err.code === 'AUTH_REQUIRED');
      if (isAuthError) {
        // Preserve the draft so the user can re-send after logging in again.
        textarea.value = trimmed;
        autoResize();
      }
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        errorMsg = 'Could not connect to the server.';
      }
      if (isAuthError) {
        appendMessage('error', errorMsg + '\n\nYour message was restored to the input box. Sign in again at /login and resend it.');
      } else {
        appendMessage('error', errorMsg + '\n\nPlease try again, or reach out to a mentor in the #role-' + currentRoleKey.toLowerCase() + ' channel on Teams.');
      }
      await sendActivityUpdate('chat_error');
      if (!isAuthError && !autoFallbackRaised) {
        requestFallback('chat_error', errorMsg, 'high');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────
  function setLoading(loading) {
    isLoading = loading;
    textarea.disabled = loading;
    sendBtn.disabled = loading;
    if (loading) {
      showTyping();
    } else {
      hideTyping();
      textarea.focus();
    }
  }

  // ── Restore session messages into DOM ──────────────────────
  function restoreSessionUI() {
    msgArea.innerHTML = '';
    // Render welcome first
    appendMessage('assistant', getWelcomeText());

    // Render restored messages
    for (var i = 0; i < messages.length; i++) {
      appendMessage(messages[i].role, messages[i].content);
    }

    // Hide quick actions if there are messages
    if (messages.length > 0) {
      hideActions();
    }
  }

  // ── Start new conversation ────────────────────────────────
  function startNewConversation() {
    clearSession();
    msgArea.innerHTML = '';
    renderWelcome();
    actionsArea.style.display = '';
    renderActions();
    renderTransparencyPanel();
    closeTransparencyPanel();
    autoFallbackRaised = false;
    textarea.focus();
  }

  // ── Role picker ──────────────────────────────────────────
  const rolePicker = document.getElementById(ID + '-role-picker');
  const headerAvatar = document.getElementById(ID + '-header-avatar');
  let pickerOpen = false;

  function renderRolePicker() {
    var html = '';
    var keys = Object.keys(ROLES);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var r = ROLES[k];
      var active = k === currentRoleKey ? ' ' + ID + '-role-active' : '';
      html += '<button class="' + ID + '-role-option' + active + '" data-role-key="' + k + '">'
        + '<span class="' + ID + '-role-dot" style="background:' + r.color + '"></span>'
        + '<span class="' + ID + '-role-emoji">' + r.emoji + '</span>'
        + '<span class="' + ID + '-role-name">'
          + '<span class="' + ID + '-role-name-short">' + k + '</span>'
          + '<span class="' + ID + '-role-name-full">' + r.full + '</span>'
        + '</span>'
        + '</button>';
    }
    rolePicker.innerHTML = html;
  }

  function togglePicker() {
    pickerOpen = !pickerOpen;
    if (pickerOpen) {
      renderRolePicker();
      rolePicker.classList.add(ID + '-picker-open');
    } else {
      rolePicker.classList.remove(ID + '-picker-open');
    }
  }

  function closePicker() {
    if (!pickerOpen) return;
    pickerOpen = false;
    rolePicker.classList.remove(ID + '-picker-open');
  }

  function switchRole(newRoleKey) {
    if (newRoleKey === currentRoleKey || !ROLES[newRoleKey]) return;

    // Save selection
    try { localStorage.setItem(LS_ROLE_KEY, newRoleKey); } catch (e) { /* ignore */ }

    // Update state
    currentRoleKey = newRoleKey;
    currentRole = ROLES[currentRoleKey];
    currentActions = getActionsForRole(currentRoleKey);

    // Update CSS custom property
    root.style.setProperty('--mw-accent', currentRole.color);

    // Update FAB
    fab.textContent = currentRole.emoji;
    fab.setAttribute('aria-label', 'Open ' + currentRole.name);

    // Update header
    headerAvatar.textContent = currentRole.emoji;
    document.getElementById(ID + '-header-name').textContent = currentRole.name;

    // Update panel aria
    panel.setAttribute('aria-label', currentRole.name + ' chat');

    // Reset conversation for new role
    clearSession();
    msgArea.innerHTML = '';
    renderWelcome();
    actionsArea.style.display = '';
    renderActions();
    renderTransparencyPanel();
    closeTransparencyPanel();
    autoFallbackRaised = false;

    // Close picker
    closePicker();
    textarea.focus();
  }

  // Avatar click toggles picker
  headerAvatar.addEventListener('click', function (e) {
    e.stopPropagation();
    togglePicker();
  });

  // Picker option click
  rolePicker.addEventListener('click', function (e) {
    var btn = e.target.closest('.' + ID + '-role-option');
    if (btn) {
      switchRole(btn.getAttribute('data-role-key'));
    }
  });

  // Close picker on click outside
  panel.addEventListener('click', function (e) {
    if (pickerOpen && !e.target.closest('#' + ID + '-role-picker') && !e.target.closest('#' + ID + '-header-avatar')) {
      closePicker();
    }
    if (isTransparencyOpen && !e.target.closest('#' + ID + '-transparency-panel') && !e.target.closest('#' + ID + '-transparency')) {
      closeTransparencyPanel();
    }
  });

  // ── Open / Close panel ─────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.add(ID + '-open');
    fab.classList.add(ID + '-hidden');
    fab.classList.remove(ID + '-unread');
    textarea.focus();

    // Initialize on first open
    if (msgArea.children.length === 0) {
      // Try to restore previous session
      if (loadSession() && messages.length > 0) {
        restoreSessionUI();
      } else {
        // Generate a fresh session ID for this new conversation
        if (!sessionId) sessionId = generateSessionId();
        renderWelcome();
        renderActions();
      }
    }
    renderTransparencyPanel();
    sendActivityUpdate('panel_opened');
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove(ID + '-open');
    fab.classList.remove(ID + '-hidden');
    closeTransparencyPanel();
  }

  // ── Event listeners ────────────────────────────────────────

  fab.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  newChatBtn.addEventListener('click', startNewConversation);
  transparencyBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleTransparencyPanel();
  });

  sendBtn.addEventListener('click', function () {
    sendMessage(textarea.value);
  });

  textarea.addEventListener('input', autoResize);

  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textarea.value);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (pickerOpen) { closePicker(); return; }
      if (isTransparencyOpen) { closeTransparencyPanel(); return; }
      if (isOpen) { closePanel(); }
    }
  });

  // Optional host-page hook for syncing role filters with the widget.
  window.addEventListener('mentor-widget:set-role', function (e) {
    var nextRole = e && e.detail && typeof e.detail.role === 'string'
      ? e.detail.role.toUpperCase().trim()
      : '';
    if (nextRole) {
      switchRole(nextRole);
    }
  });

})();
