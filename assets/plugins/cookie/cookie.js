/**
 * EU Compliant Cookie Consent Manager
 * Handles cookie consent with Accept All, Reject All, and granular preferences
 */

(function() {
  'use strict';

  const COOKIE_CONSENT_KEY = 'cookieConsent';
  const COOKIE_EXPIRY_DAYS = 365; // Default expiry, can be configured

  // Cookie Consent Manager
  const CookieConsent = {
    initialized: false,
    
    // Initialize the cookie consent system
    init: function() {
      // Always try to load consented scripts first (in case consent was already given)
      this.loadConsentedScripts();
      
      if (!this.shouldShowBanner()) {
        console.log('Cookie banner not shown: user has already given consent');
        this.initialized = true;
        return;
      }

      this.showBanner();
      this.attachEventListeners();
      this.initialized = true;
      
      // Double-check after a moment
      setTimeout(() => {
        const banner = document.getElementById('cookieConsentBanner');
        if (banner) {
          const rect = banner.getBoundingClientRect();
          const isVisible = rect.height > 0 && rect.width > 0 && 
                           window.getComputedStyle(banner).display !== 'none' &&
                           window.getComputedStyle(banner).visibility !== 'hidden';
          console.log('Banner visibility check:', {
            exists: !!banner,
            isVisible: isVisible,
            rect: rect,
            display: window.getComputedStyle(banner).display,
            visibility: window.getComputedStyle(banner).visibility,
            opacity: window.getComputedStyle(banner).opacity,
            transform: window.getComputedStyle(banner).transform,
            hasVisibleClass: banner.classList.contains('cookie-consent-visible')
          });
          
          if (!isVisible && this.shouldShowBanner()) {
            // Force visibility as fallback
            banner.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; transform: translateY(0) !important; z-index: 999999 !important; position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important;';
            banner.classList.add('cookie-consent-visible');
          }
        }
      }, 200);
    },

    // Check if banner should be shown
    shouldShowBanner: function() {
      const consent = this.getConsent();
      // Show banner if no consent exists or consent is invalid
      const shouldShow = !consent || !consent.timestamp;
      
      // Debug logging (can be removed in production)
      // Uncomment to debug: console.log('Cookie consent check:', { hasConsent: !!consent, timestamp: consent?.timestamp, shouldShow });
      
      return shouldShow;
    },

    // Get current consent from localStorage
    getConsent: function() {
      try {
        const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (stored) {
          const consent = JSON.parse(stored);
          // Check if consent has expired (optional - you can remove this if you want consent to persist)
          const expiryDate = new Date(consent.timestamp);
          expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);
          if (new Date() > expiryDate) {
            localStorage.removeItem(COOKIE_CONSENT_KEY);
            return null;
          }
          return consent;
        }
      } catch (e) {
        console.error('Error reading cookie consent:', e);
      }
      return null;
    },

    // Save consent to localStorage
    saveConsent: function(consent) {
      try {
        consent.timestamp = new Date().toISOString();
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
        this.dispatchConsentEvent(consent);
      } catch (e) {
        console.error('Error saving cookie consent:', e);
      }
    },

    // Dispatch custom event for consent changes
    dispatchConsentEvent: function(consent) {
      const event = new CustomEvent('cookieConsentChanged', {
        detail: consent
      });
      window.dispatchEvent(event);
    },

    // Show the cookie banner
    showBanner: function() {
      const banner = document.getElementById('cookieConsentBanner');
      
      if (!banner) {
        console.error('Cookie consent banner element not found in DOM. Make sure cookie-consent.html partial is included.');
        return;
      }
      
      // Remove inline display:none style completely
      banner.removeAttribute('style');
      
      // Set display to block with !important via style
      banner.style.setProperty('display', 'block', 'important');
      banner.style.setProperty('visibility', 'visible', 'important');
      banner.style.setProperty('opacity', '1', 'important');
      banner.style.setProperty('position', 'fixed', 'important');
      banner.style.setProperty('z-index', '999999', 'important');
      banner.style.setProperty('bottom', '0', 'important');
      banner.style.setProperty('left', '0', 'important');
      banner.style.setProperty('right', '0', 'important');
      
      // Force a reflow
      void banner.offsetHeight;
      
      // Add visible class after a short delay to trigger animation
      requestAnimationFrame(() => {
        banner.classList.add('cookie-consent-visible');
        banner.style.setProperty('transform', 'translateY(0)', 'important');
        
        // Force all critical styles inline to ensure visibility
        const criticalStyles = {
          'display': 'block',
          'position': 'fixed',
          'bottom': '0px',
          'left': '0px',
          'right': '0px',
          'width': '100%',
          'max-width': '100%',
          'z-index': '999999',
          'visibility': 'visible',
          'opacity': '1',
          'background': 'rgba(0, 0, 0, 0.95)',
          'background-color': 'rgba(0, 0, 0, 0.95)',
          'color': '#ffffff',
          'padding': '24px 0',
          'margin': '0',
          'box-shadow': '0 -4px 24px rgba(0, 0, 0, 0.4)',
          'transform': 'translateY(0px)',
          'box-sizing': 'border-box',
          'border-top': '1px solid rgba(255, 255, 255, 0.1)'
        };
        
        Object.keys(criticalStyles).forEach(prop => {
          const value = criticalStyles[prop];
          banner.style.setProperty(prop, value, 'important');
        });
      });
    },

    // Hide the cookie banner
    hideBanner: function() {
      const banner = document.getElementById('cookieConsentBanner');
      if (banner) {
        banner.classList.remove('cookie-consent-visible');
        setTimeout(() => {
          banner.style.display = 'none';
        }, 300);
      }
    },

    // Attach event listeners
    attachEventListeners: function() {
      // Accept All button
      const acceptAllBtn = document.getElementById('cookieAcceptAll');
      if (acceptAllBtn) {
        acceptAllBtn.addEventListener('click', () => this.acceptAll());
      }

      // Reject All button
      const rejectAllBtn = document.getElementById('cookieRejectAll');
      if (rejectAllBtn) {
        rejectAllBtn.addEventListener('click', () => this.rejectAll());
      }

      // Show Settings button
      const showSettingsBtn = document.getElementById('cookieShowSettings');
      if (showSettingsBtn) {
        showSettingsBtn.addEventListener('click', () => this.showSettings());
      }

      // Save Preferences button
      const savePrefsBtn = document.getElementById('cookieSavePreferences');
      if (savePrefsBtn) {
        savePrefsBtn.addEventListener('click', () => this.savePreferences());
      }
    },

    // Accept all cookies
    acceptAll: function() {
      const consent = {
        essential: true,
        analytics: true,
        marketing: true,
        functional: true
      };
      this.saveConsent(consent);
      this.hideBanner();
      this.loadConsentedScripts();
    },

    // Reject all non-essential cookies
    rejectAll: function() {
      const consent = {
        essential: true,
        analytics: false,
        marketing: false,
        functional: false
      };
      this.saveConsent(consent);
      this.hideBanner();
      this.loadConsentedScripts();
    },

    // Show settings modal
    showSettings: function() {
      const consent = this.getConsent();
      const modalElement = document.getElementById('cookieSettingsModal');
      
      if (!modalElement) return;
      
      // Set current preferences
      const analyticsCheckbox = document.getElementById('cookieAnalytics');
      const marketingCheckbox = document.getElementById('cookieMarketing');
      const functionalCheckbox = document.getElementById('cookieFunctional');
      
      if (consent) {
        if (analyticsCheckbox) analyticsCheckbox.checked = consent.analytics || false;
        if (marketingCheckbox) marketingCheckbox.checked = consent.marketing || false;
        if (functionalCheckbox) functionalCheckbox.checked = consent.functional || false;
      } else {
        // Default: only essential
        if (analyticsCheckbox) analyticsCheckbox.checked = false;
        if (marketingCheckbox) marketingCheckbox.checked = false;
        if (functionalCheckbox) functionalCheckbox.checked = false;
      }
      
      // Initialize and show modal (wait for Bootstrap if needed)
      if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      } else {
        // Fallback: show modal by adding class if Bootstrap not available
        modalElement.style.display = 'block';
        modalElement.classList.add('show');
        document.body.classList.add('modal-open');
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'cookieModalBackdrop';
        document.body.appendChild(backdrop);
      }
    },

    // Save preferences from settings modal
    savePreferences: function() {
      const consent = {
        essential: true, // Always true
        analytics: document.getElementById('cookieAnalytics').checked,
        marketing: document.getElementById('cookieMarketing').checked,
        functional: document.getElementById('cookieFunctional').checked
      };
      
      this.saveConsent(consent);
      this.hideBanner();
      
      // Close modal
      const modalElement = document.getElementById('cookieSettingsModal');
      if (modalElement) {
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          if (modal) {
            modal.hide();
          }
        } else {
          // Fallback: hide modal manually
          modalElement.style.display = 'none';
          modalElement.classList.remove('show');
          document.body.classList.remove('modal-open');
          const backdrop = document.getElementById('cookieModalBackdrop');
          if (backdrop) backdrop.remove();
        }
      }
      
      this.loadConsentedScripts();
    },

    // Check if a specific category is allowed
    isAllowed: function(category) {
      const consent = this.getConsent();
      if (!consent) return false;
      
      if (category === 'essential') return true; // Always allowed
      return consent[category] === true;
    },

    // Load scripts based on consent
    loadConsentedScripts: function() {
      const consent = this.getConsent();
      
      // If no consent, only load essential
      if (!consent) {
        return;
      }

      // Load analytics scripts if consented
      if (consent.analytics) {
        this.loadAnalyticsScripts();
      }

      // Load marketing scripts if consented
      if (consent.marketing) {
        this.loadMarketingScripts();
      }

      // Load functional scripts if consented
      if (consent.functional) {
        this.loadFunctionalScripts();
      }
    },

    // Load analytics scripts
    loadAnalyticsScripts: function() {
      // Trigger analytics loading event
      window.dispatchEvent(new CustomEvent('cookieConsentAnalyticsAllowed'));
      
      // Check for analytics container
      const analyticsContainer = document.getElementById('analytics-scripts-container');
      if (analyticsContainer && !analyticsContainer.dataset.loaded) {
        // Extract all script tags from the container
        const scripts = analyticsContainer.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          // Copy all attributes
          Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          // Copy text content or src
          if (script.src) {
            newScript.src = script.src;
          } else {
            newScript.textContent = script.textContent;
          }
          // Insert into head
          document.head.appendChild(newScript);
        });
        
        // Handle noscript tags (move to body)
        const noscripts = analyticsContainer.querySelectorAll('noscript');
        noscripts.forEach(noscript => {
          const newNoscript = document.createElement('noscript');
          newNoscript.innerHTML = noscript.innerHTML;
          document.body.insertBefore(newNoscript, document.body.firstChild);
        });
        
        // Handle any other elements (like iframes, etc.)
        const otherElements = Array.from(analyticsContainer.children).filter(
          el => el.tagName !== 'SCRIPT' && el.tagName !== 'NOSCRIPT'
        );
        otherElements.forEach(el => {
          document.head.appendChild(el.cloneNode(true));
        });
        
        // Mark as loaded
        analyticsContainer.dataset.loaded = 'true';
      }
    },

    // Load marketing scripts
    loadMarketingScripts: function() {
      window.dispatchEvent(new CustomEvent('cookieConsentMarketingAllowed'));
      
      const marketingScripts = document.querySelectorAll('script[data-cookie-consent="marketing"]');
      marketingScripts.forEach(script => {
        if (!script.dataset.loaded) {
          const scriptContent = script.innerHTML;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = scriptContent;
          
          const innerScripts = tempDiv.querySelectorAll('script');
          innerScripts.forEach(innerScript => {
            const newScript = document.createElement('script');
            Array.from(innerScript.attributes).forEach(attr => {
              if (attr.name !== 'data-cookie-consent' && attr.name !== 'data-loaded') {
                newScript.setAttribute(attr.name, attr.value);
              }
            });
            if (innerScript.src) {
              newScript.src = innerScript.src;
            } else {
              newScript.textContent = innerScript.textContent;
            }
            script.parentNode.insertBefore(newScript, script);
          });
          
          const otherElements = Array.from(tempDiv.children).filter(el => el.tagName !== 'SCRIPT');
          otherElements.forEach(el => {
            script.parentNode.insertBefore(el.cloneNode(true), script);
          });
          
          script.dataset.loaded = 'true';
          script.remove();
        }
      });
    },

    // Load functional scripts
    loadFunctionalScripts: function() {
      window.dispatchEvent(new CustomEvent('cookieConsentFunctionalAllowed'));
      
      const functionalScripts = document.querySelectorAll('script[data-cookie-consent="functional"]');
      functionalScripts.forEach(script => {
        if (!script.dataset.loaded) {
          const scriptContent = script.innerHTML;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = scriptContent;
          
          const innerScripts = tempDiv.querySelectorAll('script');
          innerScripts.forEach(innerScript => {
            const newScript = document.createElement('script');
            Array.from(innerScript.attributes).forEach(attr => {
              if (attr.name !== 'data-cookie-consent' && attr.name !== 'data-loaded') {
                newScript.setAttribute(attr.name, attr.value);
              }
            });
            if (innerScript.src) {
              newScript.src = innerScript.src;
            } else {
              newScript.textContent = innerScript.textContent;
            }
            script.parentNode.insertBefore(newScript, script);
          });
          
          const otherElements = Array.from(tempDiv.children).filter(el => el.tagName !== 'SCRIPT');
          otherElements.forEach(el => {
            script.parentNode.insertBefore(el.cloneNode(true), script);
          });
          
          script.dataset.loaded = 'true';
          script.remove();
        }
      });
    }
  };

  // Check for test mode (show banner even if consent exists)
  const urlParams = new URLSearchParams(window.location.search);
  const testMode = urlParams.get('cookieTest') === 'true';
  if (testMode) {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    console.log('Cookie consent test mode: cleared existing consent');
  }

  // Initialize when DOM is ready
  function initializeCookieConsent() {
    // Wait for banner to be in DOM
    const banner = document.getElementById('cookieConsentBanner');
    if (!banner) {
      // Banner not found yet, wait a bit and try again (max 3 attempts = 300ms)
      if (typeof initializeCookieConsent.attempts === 'undefined') {
        initializeCookieConsent.attempts = 0;
      }
      initializeCookieConsent.attempts++;
      if (initializeCookieConsent.attempts < 3) {
        setTimeout(initializeCookieConsent, 100);
      } else {
        console.error('Cookie consent banner not found after multiple attempts. Make sure the cookie-consent.html partial is included in your template.');
      }
      return;
    }
    
    // Reset attempts counter
    initializeCookieConsent.attempts = 0;
    
      try {
        CookieConsent.init();
      } catch (e) {
        console.error('Error initializing cookie consent:', e);
      }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCookieConsent);
  } else {
    // DOM already loaded, but banner might not be rendered yet
    initializeCookieConsent();
  }

  // Fallback: try again after scripts load (in case banner is added dynamically)
  window.addEventListener('load', () => {
    // Use requestIdleCallback if available for better performance
    if (window.requestIdleCallback) {
      requestIdleCallback(() => {
        const banner = document.getElementById('cookieConsentBanner');
        if (banner && !banner.classList.contains('cookie-consent-visible') && CookieConsent.shouldShowBanner()) {
          CookieConsent.showBanner();
          if (!CookieConsent.initialized) {
            CookieConsent.attachEventListeners();
            CookieConsent.initialized = true;
          }
        }
      }, { timeout: 1000 });
    } else {
      setTimeout(() => {
        const banner = document.getElementById('cookieConsentBanner');
        if (banner && !banner.classList.contains('cookie-consent-visible') && CookieConsent.shouldShowBanner()) {
          CookieConsent.showBanner();
          if (!CookieConsent.initialized) {
            CookieConsent.attachEventListeners();
            CookieConsent.initialized = true;
          }
        }
      }, 500);
    }
  });

  // Expose API globally
  window.CookieConsent = CookieConsent;
})();
