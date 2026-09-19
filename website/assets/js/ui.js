/**
 * Beauty Crib interface behaviour.
 *
 * Header, navigation, search, cart drawer, wishlist, accordions, reveals,
 * lightbox, tabs and form validation. Everything here has a native Elementor
 * equivalent, which is why there is no animation library.
 */
(function () {
  'use strict';

  var $ = function (selector, scope) {
    return (scope || document).querySelector(selector);
  };
  var $$ = function (selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- utilities */

  var lastFocused = null;

  function lockScroll(on) {
    document.body.classList.toggle('is-locked', on);
  }

  function trapFocus(container, event) {
    var focusable = $$('a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])', container).filter(function (el) {
      return el.offsetParent !== null;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openLayer(layer, panelSelector) {
    if (!layer) return;
    lastFocused = document.activeElement;
    layer.hidden = false;
    layer.setAttribute('aria-hidden', 'false');
    // Force a style flush so the transition runs from its closed position.
    // A reflow is used rather than requestAnimationFrame, which is throttled
    // in background tabs and would leave the panel stuck off-screen.
    void layer.offsetWidth;
    layer.classList.add('is-open');
    lockScroll(true);
    var panel = $(panelSelector, layer);
    var focusTarget = $('input, button, a[href]', panel);
    if (focusTarget) setTimeout(function () { focusTarget.focus(); }, 60);
  }

  function closeLayer(layer) {
    if (!layer || layer.hidden) return;
    layer.classList.remove('is-open');
    layer.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    var hide = function () {
      layer.hidden = true;
    };
    if (reduceMotion) hide();
    else setTimeout(hide, 420);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  /**
   * Copy to the clipboard with a fallback. The async clipboard API rejects when
   * the document is not focused, so a copy control must never be left doing
   * nothing visible.
   */
  window.BC = window.BC || {};
  window.BC.copyText = function (text, message) {
    var confirmCopy = function () {
      toast(message || 'Copied');
    };
    var fallback = function () {
      var temp = document.createElement('textarea');
      temp.value = text;
      temp.setAttribute('readonly', '');
      temp.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.appendChild(temp);
      temp.select();
      try {
        document.execCommand('copy');
        confirmCopy();
      } catch (e) {
        window.prompt('Copy this link', text);
      }
      temp.remove();
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(confirmCopy).catch(fallback);
    } else {
      fallback();
    }
  };

  function toast(message) {
    var el = $('[data-toast]');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () {
      el.classList.remove('is-visible');
    }, 2600);
  }

  /* ---------------------------------------------------------------- header */

  var header = $('[data-header]');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    document.body.classList.toggle('is-scrolled', y > 24);

    if (header) {
      var band = header.getBoundingClientRect().bottom;
      var overDark = $$('.section--dark, .hero').some(function (section) {
        var rect = section.getBoundingClientRect();
        return rect.top < band - 8 && rect.bottom > band;
      });
      header.classList.toggle('is-inverted', overDark && y > 24);
    }
  }

  var ticking = false;
  window.addEventListener(
    'scroll',
    function () {
      // Runs outside the frame callback: requestAnimationFrame is throttled in
      // background tabs, and content must never be left invisible.
      sweepReveals();
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        onScroll();
        parallax();
        ticking = false;
      });
    },
    { passive: true }
  );
  onScroll();

  /* Mark the current section in the main navigation. */
  $$('.nav__item').forEach(function (item) {
    var link = $('.nav__link', item);
    if (!link) return;
    var href = link.getAttribute('href');
    if (href !== '/' && window.location.pathname.indexOf(href) === 0) item.classList.add('is-current');
  });

  /* ------------------------------------------------------------ mobile nav */

  var mobileNav = $('[data-mobile-nav]');
  var navOpen = $('[data-nav-open]');

  if (navOpen && mobileNav) {
    navOpen.addEventListener('click', function () {
      openLayer(mobileNav, '.mobile-nav__panel');
      navOpen.setAttribute('aria-expanded', 'true');
    });
  }

  $$('[data-nav-close]').forEach(function (button) {
    button.addEventListener('click', function () {
      closeLayer(mobileNav);
      if (navOpen) navOpen.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------------------------------------------------------- search layer */

  var searchOverlay = $('[data-search-overlay]');
  var searchInput = $('[data-search-input]');
  var searchResults = $('[data-search-results]');
  var searchSuggestions = $('[data-search-suggestions]');
  var catalogue = null;

  function loadCatalogue() {
    if (catalogue) return Promise.resolve(catalogue);
    return fetch('/assets/data/products.json')
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        catalogue = data;
        return data;
      })
      .catch(function () {
        return [];
      });
  }

  window.BC = window.BC || {};
  window.BC.loadCatalogue = loadCatalogue;

  window.BC.searchCatalogue = function (items, term) {
    var query = String(term || '').trim().toLowerCase();
    if (query.length < 2) return [];
    var words = query.split(/\s+/);
    return items
      .map(function (item) {
        var haystack = (item.keywords || '') + ' ' + item.name.toLowerCase() + ' ' + item.brand.toLowerCase();
        var score = words.reduce(function (total, word) {
          return total + (haystack.indexOf(word) > -1 ? 1 : 0);
        }, 0);
        return { item: item, score: score };
      })
      .filter(function (result) {
        return result.score === words.length;
      })
      .map(function (result) {
        return result.item;
      });
  };

  function renderSearchResults(items) {
    if (!searchResults) return;
    if (!items.length) {
      searchResults.hidden = false;
      searchResults.innerHTML = '<p class="note">No products match that search yet. Try a brand, a concern such as acne, or a product type such as cleansing oil.</p>';
      return;
    }
    searchResults.hidden = false;
    searchResults.innerHTML =
      '<p class="eyebrow">Products</p><div class="search-result-row">' +
      items
        .slice(0, 8)
        .map(function (item) {
          return (
            '<a class="search-result" href="' + item.url + '">' +
            '<span class="search-result__media"><img src="' + item.image + '" alt="" width="64" height="80" loading="lazy"></span>' +
            '<span><span class="search-result__brand">' + item.brand + '</span>' +
            '<span class="search-result__name">' + item.name + '</span>' +
            '<span class="search-result__price">' + window.BC.money(item.price) + '</span></span></a>'
          );
        })
        .join('') +
      '</div>';
  }

  $$('[data-search-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      openLayer(searchOverlay, '.search-overlay__panel');
      loadCatalogue();
    });
  });

  $$('[data-search-close]').forEach(function (button) {
    button.addEventListener('click', function () {
      closeLayer(searchOverlay);
    });
  });

  if (searchInput) {
    var searchTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var term = searchInput.value;
      searchTimer = setTimeout(function () {
        if (term.trim().length < 2) {
          if (searchResults) searchResults.hidden = true;
          if (searchSuggestions) searchSuggestions.hidden = false;
          return;
        }
        loadCatalogue().then(function (items) {
          if (searchSuggestions) searchSuggestions.hidden = true;
          renderSearchResults(window.BC.searchCatalogue(items, term));
        });
      }, 160);
    });
  }

  if (searchOverlay) {
    searchOverlay.addEventListener('click', function (event) {
      if (event.target === searchOverlay) closeLayer(searchOverlay);
    });
  }

  /* ----------------------------------------------------------- cart drawer */

  var cartDrawer = $('[data-cart-drawer]');

  function cartLineMarkup(item) {
    return (
      '<li class="cart-line" data-line="' + item.slug + '">' +
      '<a class="cart-line__media" href="' + item.url + '"><img src="' + item.image + '" alt="" width="88" height="110" loading="lazy"></a>' +
      '<div class="cart-line__body">' +
      '<p class="cart-line__brand">' + item.brand + '</p>' +
      '<p class="cart-line__name"><a href="' + item.url + '">' + item.name + '</a></p>' +
      '<div class="cart-line__foot">' +
      '<span class="qty" data-qty>' +
      '<button type="button" data-qty-step="-1" aria-label="Decrease quantity for ' + item.name + '">&minus;</button>' +
      '<input type="number" min="1" value="' + item.qty + '" data-qty-input aria-label="Quantity for ' + item.name + '">' +
      '<button type="button" data-qty-step="1" aria-label="Increase quantity for ' + item.name + '">+</button>' +
      '</span>' +
      '<span class="cart-line__price">' + window.BC.money(item.price * item.qty) + '</span>' +
      '</div>' +
      '<button class="cart-line__remove" type="button" data-remove-line>Remove</button>' +
      '</div></li>'
    );
  }

  function renderCart() {
    var items = window.BC.cart.items();
    var count = window.BC.cart.count();

    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = count === 0;
    });
    $$('[data-cart-count-label]').forEach(function (el) {
      el.textContent = '(' + count + ')';
    });
    $$('[data-cart-subtotal]').forEach(function (el) {
      el.textContent = window.BC.money(window.BC.cart.subtotal());
    });

    var list = $('[data-cart-items]');
    var empty = $('[data-cart-empty]');
    var foot = $('[data-cart-foot]');

    if (list) list.innerHTML = items.map(cartLineMarkup).join('');
    if (empty) empty.hidden = items.length > 0;
    if (foot) foot.hidden = items.length === 0;

    document.dispatchEvent(new CustomEvent('bc:cart-rendered'));
  }

  function renderWishlistCount() {
    var count = window.BC.wishlist.count();
    $$('[data-wishlist-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = count === 0;
    });
    $$('[data-wishlist]').forEach(function (button) {
      var slug = button.getAttribute('data-slug');
      var active = window.BC.wishlist.has(slug);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  $$('[data-cart-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      openLayer(cartDrawer, '.drawer__panel');
    });
  });

  document.addEventListener('click', function (event) {
    var close = event.target.closest('[data-drawer-close]');
    if (close) {
      closeLayer(close.closest('.drawer'));
      return;
    }

    var add = event.target.closest('[data-add-to-cart]');
    if (add) {
      var buyWrap = add.closest('.product-buy');
      var qtyInput = buyWrap ? $('[data-qty-input]', buyWrap) : null;
      var quantity = qtyInput ? Math.max(1, Number(qtyInput.value) || 1) : 1;
      window.BC.cart.add(window.BC.readProduct(add), quantity);
      renderCart();
      openLayer(cartDrawer, '.drawer__panel');
      toast('Added to your bag');
      return;
    }

    var wish = event.target.closest('[data-wishlist]');
    if (wish) {
      var added = window.BC.wishlist.toggle(window.BC.readProduct(wish));
      renderWishlistCount();
      toast(added ? 'Saved to your wishlist' : 'Removed from your wishlist');
      return;
    }

    var remove = event.target.closest('[data-remove-line]');
    if (remove) {
      var line = remove.closest('[data-line]');
      window.BC.cart.remove(line.getAttribute('data-line'));
      renderCart();
      toast('Removed from your bag');
      return;
    }

    var copy = event.target.closest('[data-copy-link]');
    if (copy) {
      window.BC.copyText(copy.getAttribute('data-copy-link'), 'Link copied');
      return;
    }

    var step = event.target.closest('[data-qty-step]');
    if (step) {
      var wrap = step.closest('[data-qty]');
      var input = $('[data-qty-input]', wrap);
      var next = Math.max(1, (Number(input.value) || 1) + Number(step.getAttribute('data-qty-step')));
      input.value = next;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  document.addEventListener('change', function (event) {
    var input = event.target.closest('[data-qty-input]');
    if (!input) return;
    var line = input.closest('[data-line]');
    if (!line) return;
    window.BC.cart.setQty(line.getAttribute('data-line'), Math.max(1, Number(input.value) || 1));
    renderCart();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      [cartDrawer, searchOverlay, mobileNav, $('[data-filter-drawer]')].forEach(function (layer) {
        if (layer && !layer.hidden) closeLayer(layer);
      });
      var lightbox = $('.lightbox');
      if (lightbox) {
        lightbox.remove();
        lockScroll(false);
      }
      return;
    }
    if (event.key === 'Tab') {
      var openLayerEl = [cartDrawer, searchOverlay, mobileNav, $('[data-filter-drawer]')].filter(function (layer) {
        return layer && !layer.hidden;
      })[0];
      if (openLayerEl) trapFocus(openLayerEl, event);
    }
  });

  /* ------------------------------------------------------------ accordions */

  $$('[data-accordion]').forEach(function (accordion) {
    $$('.accordion__trigger', accordion).forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var expanded = trigger.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));
        trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (!panel) return;
        if (expanded) {
          panel.style.height = panel.scrollHeight + 'px';
          requestAnimationFrame(function () {
            panel.style.transition = 'height var(--dur) var(--ease)';
            panel.style.height = '0px';
          });
          setTimeout(function () {
            panel.hidden = true;
            panel.style.height = '';
            panel.style.transition = '';
          }, reduceMotion ? 0 : 420);
        } else {
          panel.hidden = false;
          var target = panel.scrollHeight;
          panel.style.height = '0px';
          requestAnimationFrame(function () {
            panel.style.transition = 'height var(--dur) var(--ease)';
            panel.style.height = target + 'px';
          });
          setTimeout(function () {
            panel.style.height = '';
            panel.style.transition = '';
          }, reduceMotion ? 0 : 420);
        }
      });
    });
  });

  /* ------------------------------------------------------------------ tabs */

  $$('[data-tabs]').forEach(function (group) {
    var tabs = $$('[role="tab"]', group);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (other) {
          other.setAttribute('aria-selected', 'false');
          var panel = document.getElementById(other.getAttribute('aria-controls'));
          if (panel) panel.hidden = true;
        });
        tab.setAttribute('aria-selected', 'true');
        var active = document.getElementById(tab.getAttribute('aria-controls'));
        if (active) active.hidden = false;
      });
    });
  });

  /* --------------------------------------------- keyboard-scrollable rails */

  /**
   * A container that scrolls horizontally must be reachable by keyboard.
   * Rails only scroll at some widths, so this is re-evaluated on resize and the
   * attributes are removed again when the row fits.
   */
  function markScrollables() {
    $$('.product-row, .gallery-strip, .categories__grid, .product-gallery__main, .table-wrap, .account-nav ul').forEach(function (el) {
      if (el.scrollWidth > el.clientWidth + 2) {
        el.setAttribute('tabindex', '0');
        if (!el.hasAttribute('aria-label')) {
          var scope = el.closest('section, .container, .doc-body');
          var heading = scope && scope.querySelector('h1, h2');
          el.setAttribute('aria-label', (heading ? heading.textContent.trim() : 'Content') + ', scrolls horizontally');
        }
        if (!el.hasAttribute('role') && el.tagName !== 'UL') el.setAttribute('role', 'group');
      } else {
        el.removeAttribute('tabindex');
        if (el.getAttribute('role') === 'group') el.removeAttribute('role');
      }
    });
  }

  markScrollables();
  window.addEventListener('load', markScrollables);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(markScrollables, 200);
  });

  /* --------------------------------------------------------------- reveals */

  var revealTargets = $$('.reveal, .reveal-media, .line-reveal');

  /**
   * Reveal anything currently in view. Content must never be left hidden, so
   * this runs on a short delay after load and again on scroll, alongside the
   * observer rather than depending on it.
   */
  function sweepReveals() {
    if (!revealTargets || !revealTargets.length) return;
    var viewport = window.innerHeight;
    revealTargets = revealTargets.filter(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < viewport * 0.92 && rect.bottom > 0) {
        el.classList.add('is-visible');
        return false;
      }
      return true;
    });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
    // Short delay so the entrance transition still plays from its start state.
    setTimeout(sweepReveals, 120);
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add('is-visible');
    });
    revealTargets = [];
  }

  /* -------------------------------------------------------------- parallax */

  var parallaxItems = $$('[data-parallax]');

  function parallax() {
    if (reduceMotion || !parallaxItems.length) return;
    var viewport = window.innerHeight;
    parallaxItems.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewport) return;
      var progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
      var strength = Number(el.getAttribute('data-parallax')) || 6;
      el.style.transform = 'translate3d(0,' + (progress * strength * -1).toFixed(2) + '%,0)';
    });
  }
  parallax();

  /* -------------------------------------------------------------- lightbox */

  var lightboxSources = $$('[data-lightbox]');

  function openLightbox(index) {
    var trigger = lightboxSources[index];
    if (!trigger) return;
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML =
      '<img src="' + trigger.getAttribute('data-src') + '" alt="' + (trigger.getAttribute('data-caption') || '') + '">' +
      '<p class="lightbox__caption">' + (trigger.getAttribute('data-caption') || '') + '</p>' +
      '<button class="lightbox__close" type="button" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg></button>' +
      '<button class="lightbox__prev" type="button" aria-label="Previous image"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>' +
      '<button class="lightbox__next" type="button" aria-label="Next image"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>';
    document.body.appendChild(box);
    lockScroll(true);

    var current = index;
    var show = function (next) {
      current = (next + lightboxSources.length) % lightboxSources.length;
      var item = lightboxSources[current];
      $('img', box).src = item.getAttribute('data-src');
      $('.lightbox__caption', box).textContent = item.getAttribute('data-caption') || '';
    };

    box.addEventListener('click', function (event) {
      if (event.target === box || event.target.closest('.lightbox__close')) {
        box.remove();
        lockScroll(false);
      } else if (event.target.closest('.lightbox__prev')) {
        show(current - 1);
      } else if (event.target.closest('.lightbox__next')) {
        show(current + 1);
      }
    });

    box.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') show(current - 1);
      if (event.key === 'ArrowRight') show(current + 1);
    });

    $('.lightbox__close', box).focus();
  }

  lightboxSources.forEach(function (trigger, index) {
    trigger.addEventListener('click', function () {
      openLightbox(index);
    });
  });

  /* ----------------------------------------------------------------- forms */

  var patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    phone: /^(\+?256|0)\d{9}$/
  };

  /**
   * Show or clear a message for one input. Consent checkboxes sit in a .checkbox
   * label rather than a .field, and they must explain themselves too: a form that
   * silently refuses to submit is a dead end.
   */
  function fieldError(input, message) {
    var host = input.closest('.field') || input.closest('.checkbox') || input.parentElement;
    if (!host) return;
    host.classList.toggle('field--error', !!message);
    var error = $(':scope > .field__error', host);
    if (message) {
      if (!error) {
        error = document.createElement('span');
        error.className = 'field__error';
        host.appendChild(error);
      }
      error.textContent = message;
      input.setAttribute('aria-invalid', 'true');
    } else {
      if (error) error.remove();
      input.removeAttribute('aria-invalid');
    }
  }

  function validateField(input) {
    var value = String(input.value || '').trim();
    var label = input.closest('.field') && $('label', input.closest('.field'));
    var name = label ? label.textContent.replace('*', '').trim() : 'This field';

    if (input.hasAttribute('required') && !value) {
      fieldError(input, name + ' is required.');
      return false;
    }
    if (value && input.type === 'email' && !patterns.email.test(value)) {
      fieldError(input, 'Enter a valid email address.');
      return false;
    }
    if (value && input.type === 'tel' && !patterns.phone.test(value.replace(/[\s-]/g, ''))) {
      fieldError(input, 'Enter a Ugandan number, for example 0712 345 678.');
      return false;
    }
    if (value && input.type === 'password' && value.length < 8) {
      fieldError(input, 'Use at least 8 characters.');
      return false;
    }
    if (input.type === 'checkbox' && input.hasAttribute('required') && !input.checked) {
      fieldError(input, 'Please tick this box to continue.');
      return false;
    }
    fieldError(input, '');
    return true;
  }

  window.BC.validateForm = function (form) {
    var fields = $$('input, select, textarea', form).filter(function (input) {
      return input.type !== 'hidden' && !input.disabled;
    });
    var valid = true;
    fields.forEach(function (input) {
      if (!validateField(input) && valid) {
        valid = false;
        input.focus();
      }
    });
    return valid;
  };

  document.addEventListener(
    'blur',
    function (event) {
      var input = event.target;
      if (input.matches && input.matches('.field input, .field select, .field textarea') && input.value) validateField(input);
    },
    true
  );

  /* Newsletter and contact forms confirm in place. A real submission is wired
     to the Elementor form widget once the site is rebuilt in WordPress.       */
  $$('[data-newsletter], [data-contact-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!window.BC.validateForm(form)) return;
      var status = $('.form__status', form);
      var isContact = form.hasAttribute('data-contact-form');
      if (status) {
        status.textContent = isContact
          ? 'Thank you. Your message has been received and we reply within one working day.'
          : 'Thank you. Please check your inbox to confirm your subscription.';
      }
      form.reset();
    });
  });

  /* ------------------------------------------------------------------ init */

  document.addEventListener('bc:cart', renderCart);
  document.addEventListener('bc:wishlist', renderWishlistCount);
  renderCart();
  renderWishlistCount();
})();
