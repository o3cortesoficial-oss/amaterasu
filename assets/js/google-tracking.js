// This file is deprecated. Please use assets/js/tracking.js instead.
(function() {
  if (window.__amzTrackingLoaded) return;
  const script = document.createElement('script');
  script.src = 'assets/js/tracking.js?v=dep-proxy';
  script.async = true;
  document.head.appendChild(script);
})();
