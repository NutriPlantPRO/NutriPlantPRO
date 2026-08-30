(function () {
  var q = location.search || '';
  var root = document.documentElement;
  var embedded = false;

  if (/[?&]embed=dashboard(?:&|$)/.test(q) || /[?&]ctx=dashboard(?:&|$)/.test(q)) {
    root.classList.add('embed-dashboard');
    embedded = true;
  } else if (/[?&]embed=login(?:&|$)/.test(q)) {
    root.classList.add('embed-login');
    embedded = true;
  } else if (window.self !== window.top) {
    root.classList.add('embed-login');
    embedded = true;
  }

  if (!embedded || window.parent === window) return;

  var reportTimer = 0;

  function measureHeight() {
    var doc = document.documentElement;
    var body = document.body;
    var h = Math.max(
      doc ? doc.scrollHeight : 0,
      doc ? doc.offsetHeight : 0,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );
    return Math.ceil(h);
  }

  function reportHeight() {
    try {
      window.parent.postMessage(
        { type: 'np-free-tool-resize', height: measureHeight() },
        '*'
      );
    } catch (err) { /* ignore */ }
  }

  function scheduleReport() {
    clearTimeout(reportTimer);
    reportTimer = setTimeout(reportHeight, 60);
  }

  function start() {
    reportHeight();
    window.addEventListener('load', scheduleReport);
    window.addEventListener('resize', scheduleReport);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(scheduleReport);
      ro.observe(root);
      if (document.body) ro.observe(document.body);
    }
    if (window.MutationObserver && document.body) {
      new MutationObserver(scheduleReport).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
