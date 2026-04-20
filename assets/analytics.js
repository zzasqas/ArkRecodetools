// Replace G-PLACEHOLDER with your GA4 Measurement ID when ready.
(function(){
  var id = 'G-PLACEHOLDER';
  if (!id || id === 'G-PLACEHOLDER') return; // no-op until real ID provided
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id);
})();
