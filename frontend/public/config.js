// Runtime configuration for separate frontend/backend deployments.
(function () {
  function normalizeBaseUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.replace(/\/+$/, ''); // trim trailing slashes
  }

  // Determine default API base
  // For local development (localhost or local network), use relative path to current origin
  // This allows mobile devices on the same network to connect properly
  let defaultApiBase = 'https://bombing-aircraft-backend.onrender.com';
  const hostname = window.location.hostname;

  // Check if we're on localhost or a local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const isLocalNetwork =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

  if (isLocalNetwork) {
    // Use the current origin's protocol and hostname, but connect to backend via nginx proxy
    // Nginx proxies /api/ and /socket.io/ to the backend
    defaultApiBase = window.location.origin.replace(':8080', ':8080').replace(':8443', ':8443');
  }

  const apiBase = normalizeBaseUrl(
    localStorage.getItem('API_BASE_URL') || defaultApiBase
  );
  // Socket.IO server is usually the same as API base. Allow override if needed.
  const socketUrl = normalizeBaseUrl(localStorage.getItem('SOCKET_URL') || apiBase);

  window.API_BASE_URL = apiBase;
  window.SOCKET_URL = socketUrl;
})();

