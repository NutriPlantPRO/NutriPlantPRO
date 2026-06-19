(function () {
  var q = location.search || '';
  var root = document.documentElement;
  if (/[?&]embed=dashboard(?:&|$)/.test(q) || /[?&]ctx=dashboard(?:&|$)/.test(q)) {
    root.classList.add('embed-dashboard');
    return;
  }
  if (/[?&]embed=login(?:&|$)/.test(q)) {
    root.classList.add('embed-login');
    return;
  }
  if (window.self !== window.top) {
    root.classList.add('embed-login');
  }
})();
