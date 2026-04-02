/**
 * AI Academy Auth Guard — Client-side authentication check
 * Add to <head> of every protected page: <script src="/auth-guard.js"></script>
 * Requires Supabase project. Anon key is public by design (RLS protects data).
 */
(function() {
  'use strict';

  // ── Supabase config (must match login.html) ────────────────
  var SUPABASE_URL = 'https://hiofwpndkuzrsfvnuyet.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_pGXJ2OfBXz5HJqzISmQdBg_23Hx64PI';

  // ── Auth cookie helpers (read by Vercel Edge Middleware) ────
  function setAuthCookie(token) {
    document.cookie = 'academy_session=' + encodeURIComponent(token) +
      '; path=/; max-age=604800; secure; samesite=lax';
  }
  function clearAuthCookie() {
    document.cookie = 'academy_session=; path=/; max-age=0; secure; samesite=lax';
  }

  // ── Skip on login page (prevent infinite redirect) ─────────
  var path = window.location.pathname;
  if (path === '/login' || path === '/login.html') {
    return;
  }

  // ── Immediately hide page to prevent flash of content ──────
  document.documentElement.style.visibility = 'hidden';

  // ── Initialize auth check (load CDN if needed) ─────────────
  function initAuth() {
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    sb.auth.getSession().then(function(result) {
      var session = result.data && result.data.session;

      if (!session) {
        clearAuthCookie();
        window.location.replace('/login');
        return;
      }

      // Session valid — reveal page, store token, set cookie for middleware
      window.__academyAuthToken = session.access_token;
      window.__academyUserRoles = session.user?.user_metadata?.roles || [session.user?.user_metadata?.role || 'student'];
      setAuthCookie(session.access_token);
      document.documentElement.style.visibility = '';

      // Only show Change Password / Sign Out on dashboard pages
      var isDashboard = path === '/' || path === '/index.html';
      if (isDashboard) {
        injectUserMenu(sb);
      }

      // Listen for auth state changes (token refresh, sign-out)
      sb.auth.onAuthStateChange(function(event, newSession) {
        if (event === 'SIGNED_OUT' || !newSession) {
          window.__academyAuthToken = null;
          clearAuthCookie();
          window.location.replace('/login');
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          window.__academyAuthToken = newSession.access_token;
          setAuthCookie(newSession.access_token);
        }
      });
    }).catch(function() {
      // Auth check failed — fail closed (redirect to login)
      clearAuthCookie();
      window.location.replace('/login');
    });
  }

  // ── Load Supabase CDN if not already present ───────────────
  if (window.supabase && window.supabase.createClient) {
    initAuth();
  } else {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.97.0';
    script.integrity = 'sha384-1+ItoWbWcmVSm+Y+dJaUt4SEWNA21/jxef+Z0TSHHVy/dEUxEUEnZ1bHn6GT5hj+';
    script.crossOrigin = 'anonymous';
    script.onload = initAuth;
    script.onerror = function() {
      // CDN failed to load — fail closed (redirect to login)
      console.error('Auth guard: Failed to load Supabase CDN');
      window.location.replace('/login');
    };
    document.head.appendChild(script);
  }

  // ── User menu (Sign Out + Change Password) ─────────────────
  function injectUserMenu(sb) {
    function inject() {
      if (document.getElementById('academy-user-menu')) return;

      // Inject styles
      var menuStyle = document.createElement('style');
      menuStyle.textContent =
        '#academy-user-menu{position:fixed;top:16px;right:370px;z-index:99999;display:flex;gap:8px;align-items:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;}' +
        '.academy-menu-btn{padding:8px 16px;border-radius:8px;border:1px solid #2d3748;background:#1a1f26;color:#94a3b8;font-size:13px;font-family:inherit;cursor:pointer;transition:color 0.2s,border-color 0.2s,background 0.2s;}' +
        '.academy-menu-btn:hover{color:#f1f5f9;border-color:#3b82f6;}' +
        '.academy-menu-btn:disabled{opacity:0.5;cursor:not-allowed;}' +
        '#academy-pwd-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100000;align-items:center;justify-content:center;}' +
        '#academy-pwd-overlay.visible{display:flex;}' +
        '#academy-pwd-modal{background:#1a1f26;border:1px solid #2d3748;border-radius:16px;padding:32px;width:100%;max-width:380px;margin:20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;}' +
        '#academy-pwd-modal h3{color:#f1f5f9;font-size:18px;font-weight:700;margin-bottom:4px;}' +
        '#academy-pwd-modal .pwd-subtitle{color:#64748b;font-size:13px;margin-bottom:24px;}' +
        '#academy-pwd-modal label{display:block;font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:6px;}' +
        '#academy-pwd-modal input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2d3748;background:#0f1419;color:#f1f5f9;font-size:14px;font-family:inherit;outline:none;margin-bottom:16px;transition:border-color 0.2s;}' +
        '#academy-pwd-modal input:focus{border-color:#3b82f6;}' +
        '.pwd-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:8px;}' +
        '.pwd-cancel{padding:9px 18px;border-radius:8px;border:1px solid #2d3748;background:transparent;color:#94a3b8;font-size:13px;font-family:inherit;cursor:pointer;transition:color 0.2s,border-color 0.2s;}' +
        '.pwd-cancel:hover{color:#f1f5f9;border-color:#64748b;}' +
        '.pwd-save{padding:9px 18px;border-radius:8px;border:none;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:opacity 0.2s;}' +
        '.pwd-save:hover{opacity:0.9;}' +
        '.pwd-save:disabled{opacity:0.5;cursor:not-allowed;}' +
        '.pwd-msg{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;}' +
        '.pwd-msg-error{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;}' +
        '.pwd-msg-success{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#6ee7b7;}' +
        '[data-theme="light"] .academy-menu-btn{background:#f1f5f9;border-color:#cbd5e1;color:#475569;}' +
        '[data-theme="light"] .academy-menu-btn:hover{color:#1e293b;border-color:#3b82f6;background:#e2e8f0;}' +
        '[data-theme="light"] #academy-pwd-modal{background:#ffffff;border-color:#cbd5e1;}' +
        '[data-theme="light"] #academy-pwd-modal h3{color:#1e293b;}' +
        '[data-theme="light"] #academy-pwd-modal .pwd-subtitle{color:#64748b;}' +
        '[data-theme="light"] #academy-pwd-modal label{color:#475569;}' +
        '[data-theme="light"] #academy-pwd-modal input{background:#f8fafc;border-color:#cbd5e1;color:#1e293b;}' +
        '[data-theme="light"] #academy-pwd-overlay{background:rgba(0,0,0,0.3);}' +
        '[data-theme="light"] .pwd-cancel{border-color:#cbd5e1;color:#475569;}' +
        '[data-theme="light"] .pwd-cancel:hover{color:#1e293b;border-color:#94a3b8;}';
      document.head.appendChild(menuStyle);

      // Container
      var menu = document.createElement('div');
      menu.id = 'academy-user-menu';

      // Check if user has multiple roles
      var userRoles = window.__academyUserRoles || [];

      // Role switcher (if user has multiple roles)
      if (userRoles.length > 1) {
        var roleSelect = document.createElement('select');
        roleSelect.className = 'academy-menu-btn';
        roleSelect.style.appearance = 'none';
        roleSelect.style.padding = '8px 12px';
        roleSelect.style.minWidth = '100px';

        var currentRole = localStorage.getItem('academy_selected_role') || userRoles[0];
        userRoles.forEach(function(role) {
          var option = document.createElement('option');
          option.value = role;
          option.textContent = role.charAt(0).toUpperCase() + role.slice(1);
          option.selected = (role === currentRole);
          roleSelect.appendChild(option);
        });

        roleSelect.addEventListener('change', function() {
          localStorage.setItem('academy_selected_role', this.value);
          if (this.value === 'lector') {
            window.location.replace('/lector.html');
          } else {
            window.location.replace('/');
          }
        });
        menu.appendChild(roleSelect);
      }

      // Change Password button
      var pwdBtn = document.createElement('button');
      pwdBtn.className = 'academy-menu-btn';
      pwdBtn.textContent = 'Change Password';
      pwdBtn.addEventListener('click', function() { openPasswordModal(); });
      menu.appendChild(pwdBtn);

      // Sign Out button
      var signOutBtn = document.createElement('button');
      signOutBtn.className = 'academy-menu-btn';
      signOutBtn.textContent = 'Sign Out';
      signOutBtn.addEventListener('click', function() {
        signOutBtn.disabled = true;
        signOutBtn.textContent = 'Signing out...';
        clearAuthCookie();
        localStorage.removeItem('academy_selected_role');
        sb.auth.signOut().then(function() {
          window.location.replace('/login');
        });
      });
      menu.appendChild(signOutBtn);

      document.body.appendChild(menu);

      // Password modal overlay
      var overlay = document.createElement('div');
      overlay.id = 'academy-pwd-overlay';
      overlay.innerHTML =
        '<div id="academy-pwd-modal">' +
          '<h3>Change Password</h3>' +
          '<p class="pwd-subtitle">Enter a new password for your account</p>' +
          '<div id="pwd-msg-area"></div>' +
          '<label for="pwd-new">New Password</label>' +
          '<input type="password" id="pwd-new" placeholder="Min. 8 characters, at least 1 number" autocomplete="new-password">' +
          '<label for="pwd-confirm">Confirm New Password</label>' +
          '<input type="password" id="pwd-confirm" placeholder="Repeat new password" autocomplete="new-password">' +
          '<div class="pwd-actions">' +
            '<button class="pwd-cancel" id="pwd-cancel">Cancel</button>' +
            '<button class="pwd-save" id="pwd-save">Update Password</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      // Close on overlay click
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closePasswordModal();
      });
      document.getElementById('pwd-cancel').addEventListener('click', closePasswordModal);
      document.getElementById('pwd-save').addEventListener('click', function() { savePassword(sb); });

      // Enter key submits
      document.getElementById('pwd-confirm').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') savePassword(sb);
      });
    }

    if (document.body) { inject(); } else { document.addEventListener('DOMContentLoaded', inject); }
  }

  function openPasswordModal() {
    var overlay = document.getElementById('academy-pwd-overlay');
    if (!overlay) return;
    document.getElementById('pwd-new').value = '';
    document.getElementById('pwd-confirm').value = '';
    document.getElementById('pwd-msg-area').textContent = '';
    overlay.classList.add('visible');
    document.getElementById('pwd-new').focus();
  }

  function closePasswordModal() {
    var overlay = document.getElementById('academy-pwd-overlay');
    if (overlay) overlay.classList.remove('visible');
  }

  function showPwdMsg(msgArea, text, type) {
    msgArea.textContent = '';
    var div = document.createElement('div');
    div.className = 'pwd-msg pwd-msg-' + type;
    div.textContent = text;
    msgArea.appendChild(div);
  }

  function savePassword(sb) {
    var msgArea = document.getElementById('pwd-msg-area');
    var newPwd = document.getElementById('pwd-new').value;
    var confirmPwd = document.getElementById('pwd-confirm').value;
    var saveBtn = document.getElementById('pwd-save');

    msgArea.textContent = '';

    if (!newPwd || newPwd.length < 8 || !/\d/.test(newPwd)) {
      showPwdMsg(msgArea, 'Password must be at least 8 characters and contain at least 1 number.', 'error');
      return;
    }
    if (newPwd !== confirmPwd) {
      showPwdMsg(msgArea, 'Passwords do not match.', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Updating...';

    sb.auth.updateUser({ password: newPwd }).then(function(result) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Update Password';

      if (result.error) {
        showPwdMsg(msgArea, result.error.message || 'Failed to update password.', 'error');
        return;
      }

      showPwdMsg(msgArea, 'Password updated successfully!', 'success');
      document.getElementById('pwd-new').value = '';
      document.getElementById('pwd-confirm').value = '';
      setTimeout(closePasswordModal, 1500);
    }).catch(function() {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Update Password';
      showPwdMsg(msgArea, 'An error occurred. Please try again.', 'error');
    });
  }
})();
