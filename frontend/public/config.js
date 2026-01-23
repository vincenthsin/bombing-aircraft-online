// Runtime configuration for separate frontend/backend deployments.
(function () {
  function normalizeBaseUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.replace(/\/+$/, ''); // trim trailing slashes
  }

  // Use localStorage override for testing, else localhost:3000 for dev
  const apiBase = normalizeBaseUrl(localStorage.getItem('API_BASE_URL') || window.location.origin.replace('8080', '3000'));
  // Socket.IO server is usually the same as API base. Allow override if needed.
  const socketUrl = normalizeBaseUrl(localStorage.getItem('SOCKET_URL') || apiBase);

  window.API_BASE_URL = apiBase;
  window.SOCKET_URL = socketUrl;
})();

