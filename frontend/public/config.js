// Runtime configuration for separate frontend/backend deployments.
(function () {
  function normalizeBaseUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.replace(/\/+$/, ''); // trim trailing slashes
  }

  // Determine default API base
  let defaultApiBase = 'https://bombing-aircraft-backend.onrender.com';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    defaultApiBase = 'http://localhost:3000';
  }

  const apiBase = normalizeBaseUrl(
    localStorage.getItem('API_BASE_URL') || defaultApiBase
  );
  // Socket.IO server is usually the same as API base. Allow override if needed.
  const socketUrl = normalizeBaseUrl(localStorage.getItem('SOCKET_URL') || apiBase);

  window.API_BASE_URL = apiBase;
  window.SOCKET_URL = socketUrl;
})();

