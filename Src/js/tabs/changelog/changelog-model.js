/* Changelog tab model. */
window.PSC = window.PSC || {};
PSC.Models = PSC.Models || {};

PSC.Models.Changelog = (function () {
  function entries() { return (typeof CHANGELOG !== 'undefined' ? CHANGELOG : []); }
  function version() { return (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0'); }
  return { entries, version };
})();
