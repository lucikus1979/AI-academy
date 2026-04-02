// Lector Authentication Guard
// Runs on lector.html to verify user is authenticated and is a lector

(function() {
  const SUPABASE_URL = 'https://hiofwpndkuzrsfvnuyet.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_pGXJ2OfBXz5HJqzISmQdBg_23Hx64PI';

  // Get token from localStorage
  const getStoredToken = () => {
    try {
      const session = localStorage.getItem('sb-lector-session');
      if (!session) return null;
      const parsed = JSON.parse(session);
      return parsed.access_token;
    } catch {
      return null;
    }
  };

  // Validate token with Supabase
  const validateToken = async (token) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) return null;

      const user = await response.json();
      const role = user.user_metadata?.role;

      // Only allow lectors
      if (role !== 'lector') {
        return null;
      }

      return user;
    } catch {
      return null;
    }
  };

  // Check authentication on page load
  const checkAuth = async () => {
    const token = getStoredToken();

    if (!token) {
      // Redirect to login
      window.location.href = '/lector-login.html';
      return;
    }

    const user = await validateToken(token);

    if (!user) {
      // Token invalid or not a lector
      localStorage.removeItem('sb-lector-session');
      window.location.href = '/lector-login.html';
      return;
    }

    // Store user info in window for app to use
    window.lectorUser = user;
    window.lectorToken = token;
    window.__academyUserRoles = user.user_metadata?.roles || [user.user_metadata?.role || 'lector'];

    // Allow page to load and inject role switcher
    setTimeout(function() {
      injectRoleSwitcher();
    }, 100);
  };

  // Inject role switcher for users with multiple roles
  function injectRoleSwitcher() {
    if (window.__academyUserRoles && window.__academyUserRoles.length > 1) {
      var style = document.createElement('style');
      style.textContent = `
        #lector-role-switcher {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 99999;
          display: flex;
          gap: 8px;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .lector-menu-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #2d3748;
          background: #1a1f26;
          color: #94a3b8;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
        }
        .lector-menu-btn:hover {
          color: #f1f5f9;
          border-color: #3b82f6;
        }
        #lector-role-select {
          appearance: none;
          padding: 8px 12px;
          min-width: 100px;
          border-radius: 8px;
          border: 1px solid #2d3748;
          background: #1a1f26;
          color: #94a3b8;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
        }
        #lector-role-select:hover {
          color: #f1f5f9;
          border-color: #3b82f6;
        }
      `;
      document.head.appendChild(style);

      var container = document.createElement('div');
      container.id = 'lector-role-switcher';

      // Role selector
      var roleSelect = document.createElement('select');
      roleSelect.id = 'lector-role-select';
      roleSelect.className = 'lector-menu-btn';

      window.__academyUserRoles.forEach(function(role) {
        var option = document.createElement('option');
        option.value = role;
        option.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        roleSelect.appendChild(option);
      });
      roleSelect.value = 'lector';

      roleSelect.addEventListener('change', function() {
        if (this.value === 'student') {
          localStorage.removeItem('sb-lector-session');
          window.location.replace('/');
        }
      });
      container.appendChild(roleSelect);

      // Logout button
      var logoutBtn = document.createElement('button');
      logoutBtn.className = 'lector-menu-btn';
      logoutBtn.textContent = 'Logout';
      logoutBtn.addEventListener('click', function() {
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Logging out...';
        localStorage.removeItem('sb-lector-session');
        window.location.replace('/lector-login.html');
      });
      container.appendChild(logoutBtn);

      document.body.appendChild(container);
    }
  }

  // Run auth check exactly once
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth, { once: true });
  } else {
    checkAuth();
  }
})();
