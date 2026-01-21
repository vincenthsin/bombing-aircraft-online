// Runtime configuration for separate frontend/backend deployments.
// You can set these at deploy-time by defining window.__ENV__ before loading this script.
// Example:
//   <script>window.__ENV__ = { API_BASE_URL: "https://api.example.com" };</script>
(function () {
  const env = (window.__ENV__ && typeof window.__ENV__ === 'object') ? window.__ENV__ : {};

  function normalizeBaseUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.replace(/\/+$/, ''); // trim trailing slashes
  }

  // Prefer explicit env, then localStorage override (useful for testing), else localhost:3000 for dev
  const apiBase = normalizeBaseUrl(env.API_BASE_URL || localStorage.getItem('API_BASE_URL') || window.location.origin.replace('8080', '3000'));
  // Socket.IO server is usually the same as API base. Allow override if needed.
  const socketUrl = normalizeBaseUrl(env.SOCKET_URL || localStorage.getItem('SOCKET_URL') || apiBase);

  window.API_BASE_URL = apiBase;
  window.SOCKET_URL = socketUrl;
})();

