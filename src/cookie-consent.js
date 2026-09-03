(function () {
  'use strict';

  var STORAGE_KEY = 'lgt-cookie-consent';
  var MAX_AGE = 180 * 24 * 60 * 60 * 1000;

  function readChoice() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || !saved.choice || !saved.savedAt) return null;
      if (Date.now() - saved.savedAt > MAX_AGE) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return saved.choice;
    } catch (error) {
      return null;
    }
  }

  function saveChoice(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        choice: choice,
        savedAt: Date.now()
      }));
    } catch (error) {}
  }

  function updateGoogleConsent(choice) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: choice === 'accepted' ? 'granted' : 'denied'
    });
  }

  function deleteAnalyticsCookies() {
    var host = location.hostname;
    var root = host.split('.').slice(-2).join('.');
    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (name !== '_ga' && name.indexOf('_ga_') !== 0) return;
      document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
      document.cookie = name + '=; Max-Age=0; path=/; domain=' + host + '; SameSite=Lax';
      document.cookie = name + '=; Max-Age=0; path=/; domain=.' + root + '; SameSite=Lax';
    });
  }

  function buildInterface() {
    var banner = document.createElement('aside');
    banner.className = 'lgt-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'lgt-consent-title');
    banner.setAttribute('aria-describedby', 'lgt-consent-description');
    banner.innerHTML =
      '<p class="lgt-consent__eyebrow">Confidentialité à bord</p>' +
      '<h2 id="lgt-consent-title">À vous de choisir la trajectoire.</h2>' +
      '<p id="lgt-consent-description">Nous utilisons Google Analytics pour mesurer la fréquentation et améliorer le site. Vous pouvez accepter ou refuser : votre choix ne change pas votre accès au site.</p>' +
      '<div class="lgt-consent__actions">' +
        '<button type="button" data-consent="rejected">Tout refuser</button>' +
        '<button type="button" data-consent="accepted">Tout accepter</button>' +
      '</div>';

    var settings = document.createElement('button');
    settings.type = 'button';
    settings.className = 'lgt-cookie-settings';
    settings.textContent = 'Gérer mes cookies';
    settings.setAttribute('aria-controls', 'lgt-cookie-banner');
    banner.id = 'lgt-cookie-banner';

    function showBanner() {
      banner.hidden = false;
      settings.hidden = true;
      var rejectButton = banner.querySelector('[data-consent="rejected"]');
      if (rejectButton) rejectButton.focus();
    }

    function hideBanner() {
      banner.hidden = true;
      settings.hidden = false;
      settings.focus();
    }

    banner.addEventListener('click', function (event) {
      var button = event.target.closest('[data-consent]');
      if (!button) return;
      var choice = button.getAttribute('data-consent');
      saveChoice(choice);
      updateGoogleConsent(choice);
      if (choice === 'rejected') deleteAnalyticsCookies();
      hideBanner();
    });

    settings.addEventListener('click', showBanner);
    document.body.appendChild(banner);
    document.body.appendChild(settings);

    if (readChoice()) {
      banner.hidden = true;
      settings.hidden = false;
    } else {
      settings.hidden = true;
      banner.hidden = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildInterface);
  } else {
    buildInterface();
  }
})();
