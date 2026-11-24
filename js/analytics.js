/* Google Analytics 4 on every page. Property "jeromebaker.com" (sales@jeromebakerny.com).
   Skips visitors who send Global Privacy Control or Do Not Track. Loaded by every page via
   <script defer src="/js/analytics.js">; tools/build_analytics.py keeps that tag on every page. */
(function () {
  var ID = 'G-0XBD57ESG6';
  if (!ID || navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', ID);
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
})();
