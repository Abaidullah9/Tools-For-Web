// ==UserScript==
// @name         YouTube Ultimate Enhancer (Ad Skipper + Age Bypass + Downloader)
// @namespace    https://github.com/openai/youtube-enhancer
// @version      3.1
// @description  Skips ads, bypasses age restrictions, and adds a stylish download button
// @author       OpenAI
// @match        https://www.youtube.com/*
// @match        https://music.youtube.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const DOWNLOAD_SITE = "https://www.yt1s.com/encltw?q=";
  const DOWNLOAD_BTN_ID = "yt-enhancer-download-btn";

  // Enable debug mode to see console logs
  const debug = true;
  const log = (msg, data = {}) => debug && console.log(`[YT Enhancer]: ${msg}`, data);

  // -------------------------------------
  // Ad Skipper
  // -------------------------------------
  function skipAds() {
    const video = document.querySelector('video');
    const player = document.getElementById('movie_player');
    if (!player || !video) return;

    // Skip ad buttons
    document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern').forEach(btn => btn.click());

    // Skip to end of ad
    if (player.classList.contains('ad-showing')) {
      video.muted = true;
      video.currentTime = video.duration;
      log('Skipping ad...');
    }
  }

  function removeAdElements() {
    const adSelectors = [
      '#player-ads', '#masthead-ad', '.ytp-ad-overlay-container',
      '.ytp-featured-product', '.yt-mealbar-promo-renderer',
      'ytd-merch-shelf-renderer', 'ytmusic-mealbar-promo-renderer',
      'ytmusic-statement-banner-renderer'
    ];
    adSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
  }

  const adStyle = `
    #player-ads, #masthead-ad, .ytp-ad-overlay-container,
    .ytp-featured-product, .yt-mealbar-promo-renderer,
    ytd-merch-shelf-renderer, ytmusic-mealbar-promo-renderer,
    ytmusic-statement-banner-renderer {
      display: none !important;
    }
  `;
  GM_addStyle(adStyle);

  // -------------------------------------
  // Age Restriction Bypass
  // -------------------------------------
  function overridePlayability(data) {
    if (!data?.playabilityStatus) return data;
    const status = data.playabilityStatus.status;
    if (['AGE_VERIFICATION_REQUIRED', 'LOGIN_REQUIRED', 'UNPLAYABLE', 'RESTRICTED'].includes(status)) {
      data.playabilityStatus.status = 'OK';
      delete data.playabilityStatus.errorScreen;
      delete data.playabilityStatus.messages;
      log('Playability patched');
    }
    return data;
  }

  const nativeFetch = window.fetch;
  window.fetch = new Proxy(nativeFetch, {
    apply(target, thisArg, args) {
      return Reflect.apply(target, thisArg, args).then(async res => {
        const cloned = res.clone();
        const url = (typeof args[0] === 'string') ? args[0] : args[0].url || '';

        if (url.includes('/youtubei/v1/player')) {
          try {
            const json = await cloned.json();
            const modified = overridePlayability(JSON.parse(JSON.stringify(json)));
            const blob = new Blob([JSON.stringify(modified)], { type: 'application/json' });
            return new Response(blob, {
              status: res.status,
              statusText: res.statusText,
              headers: res.headers
            });
          } catch {
            return res;
          }
        }
        return res;
      });
    }
  });

  const NativeXHR = XMLHttpRequest;
  window.XMLHttpRequest = new Proxy(NativeXHR, {
    construct(target, args) {
      const xhr = new target(...args);
      let isBypassURL = false;

      const openOrig = xhr.open;
      xhr.open = function (method, url) {
        isBypassURL = url.includes('/youtubei/v1/player');
        return openOrig.apply(this, arguments);
      };

      const sendOrig = xhr.send;
      xhr.send = function () {
        if (isBypassURL) {
          xhr.addEventListener('readystatechange', () => {
            if (xhr.readyState === 4 && xhr.responseType === '' && xhr.responseText) {
              try {
                const json = JSON.parse(xhr.responseText);
                overridePlayability(json);
              } catch {}
            }
          });
        }
        return sendOrig.apply(this, arguments);
      };

      return xhr;
    }
  });

  // -------------------------------------
  // Enhanced Download Button
  // -------------------------------------
  const downloadButtonCSS = `
    #${DOWNLOAD_BTN_ID} {
      background: linear-gradient(to right, #FF0000, #FF5252);
      color: white !important;
      border: none;
      margin-left: 12px;
      padding: 0 16px 0 40px;
      border-radius: 24px;
      font-size: 14px;
      font-family: Roboto, Noto, sans-serif;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      height: 36px;
      line-height: 36px;
      position: relative;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: all 0.2s ease;
    }

    #${DOWNLOAD_BTN_ID}:hover {
      background: linear-gradient(to right, #E60000, #FF3D3D);
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      transform: translateY(-1px);
    }

    #${DOWNLOAD_BTN_ID}:active {
      transform: translateY(1px);
    }

    #${DOWNLOAD_BTN_ID}::before {
      content: '';
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
    }

    /* For YouTube Music */
    ytmusic-player-page #${DOWNLOAD_BTN_ID} {
      margin-left: 8px;
      padding: 0 12px 0 36px;
      height: 32px;
      line-height: 32px;
    }

    ytmusic-player-page #${DOWNLOAD_BTN_ID}::before {
      left: 10px;
      width: 16px;
      height: 16px;
    }

    /* New YouTube layout adjustments */
    #actions-inner #${DOWNLOAD_BTN_ID} {
      margin-top: 0;
    }

    #top-level-buttons-computed #${DOWNLOAD_BTN_ID} {
      margin-left: 8px;
    }

    #menu-container #${DOWNLOAD_BTN_ID} {
      margin: 8px 0;
      width: calc(100% - 16px);
      justify-content: center;
    }

    /* Fallback container styles */
    #yt-download-container {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      align-items: center;
    }
  `;
  GM_addStyle(downloadButtonCSS);

  // Improved element waiting function
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let timer;

      const checkElement = () => {
        const el = document.querySelector(selector);
        if (el) {
          resolve(el);
          clearTimeout(timer);
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element not found: ${selector}`));
          return;
        }

        requestAnimationFrame(checkElement);
      };

      timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for element: ${selector}`));
      }, timeout);

      checkElement();
    });
  }

  // Improved button creation
  function createDownloadButton() {
    const btn = document.createElement('a');
    btn.href = `${DOWNLOAD_SITE}${encodeURIComponent(location.href)}`;
    btn.target = '_blank';
    btn.id = DOWNLOAD_BTN_ID;
    btn.textContent = 'Download';
    btn.title = 'Download this video';
    btn.style.order = '100'; // Ensure it appears last
    return btn;
  }

  // Enhanced button placement logic with current YouTube selectors
  async function addDownloadButton() {
  try {
    log('Attempting to add single download button...');

    // Use only the most modern top action bar
    const selector = '#top-level-buttons-computed';
    const container = await waitForElement(selector, 5000);

    if (!container) {
      log(`Container not found: ${selector}`);
      return;
    }

    // Remove existing button if already present
    const oldBtn = container.querySelector(`#${DOWNLOAD_BTN_ID}`);
    if (oldBtn) oldBtn.remove();

    // Add new button
    const btn = createDownloadButton();
    container.appendChild(btn);
    log('Single download button added successfully');
  } catch (e) {
    log('Failed to add single download button:', e);
  }
}


  function refreshDownloadLink() {
    const btn = document.getElementById(DOWNLOAD_BTN_ID);
    if (btn) {
      btn.href = `${DOWNLOAD_SITE}${encodeURIComponent(location.href)}`;
      log('Download link refreshed');
    }
  }

  // -------------------------------------
  // Init + SPA Support
  // -------------------------------------
  function initEnhancer() {
    log('Initializing enhancer...');
    skipAds();
    removeAdElements();
    addDownloadButton();
    setTimeout(refreshDownloadLink, 2000);
  }

  // Improved mutation observer
  const observer = new MutationObserver((mutations) => {
    skipAds();
    removeAdElements();

    // Check if the download button exists
    if (!document.getElementById(DOWNLOAD_BTN_ID)) {
      addDownloadButton();
    } else {
      refreshDownloadLink();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id']
  });

  // Handle YouTube navigation events
  document.addEventListener('yt-navigate-finish', () => {
    log('Navigation finished');
    setTimeout(initEnhancer, 1000);
  });

  // Handle initial page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancer);
  } else {
    setTimeout(initEnhancer, 2000);
  }

  // Initial call
  initEnhancer();
})();
