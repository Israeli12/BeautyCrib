/**
 * Shop and category listing: filters, sort and load more.
 * In WordPress this behaviour is provided by the product filter plugin and
 * WooCommerce ordering, so the markup stays a plain product grid.
 */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };
  var $$ = function (s, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(s)); };

  var grid = $('[data-product-grid]');
  if (!grid) return;

  var cards = $$('.product-card', grid);
  var drawer = $('[data-filter-drawer]');
  var countEls = $$('[data-result-count]');
  var activeWrap = $('[data-active-filters]');
  var loadMoreWrap = $('[data-load-more]');
  var loadMoreBtn = $('[data-load-more-button]');
  var loadStatus = $('[data-load-status]');
  var sortSelect = $('[data-sort]');
  var emptyMessage = $('[data-no-results]');
  var PAGE = 12;
  var shown = PAGE;

  /**
   * Pre-select filters from the URL, so links such as /shop/?brand=anua from a
   * product page land on a filtered shop. WooCommerce filter plugins use the
   * same pattern, so these URLs survive the WordPress rebuild.
   */
  function applyUrlFilters() {
    var params = new URLSearchParams(window.location.search);
    var slugify = function (value) {
      return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    };
    ['brand', 'skin', 'concern'].forEach(function (name) {
      var wanted = (params.get(name) || '').split(',').filter(Boolean).map(slugify);
      if (!wanted.length) return;
      $$('input[name="' + name + '"]', drawer || document).forEach(function (input) {
        if (wanted.indexOf(slugify(input.value)) > -1) input.checked = true;
      });
    });
  }

  function checkedValues(name) {
    return $$('input[name="' + name + '"]:checked', drawer || document).map(function (input) {
      return input.value;
    });
  }

  function matches(card) {
    var brands = checkedValues('brand');
    var skins = checkedValues('skin');
    var concerns = checkedValues('concern');
    var prices = checkedValues('price');

    if (brands.length && brands.indexOf(card.getAttribute('data-brand')) === -1) return false;

    if (skins.length) {
      var cardSkins = (card.getAttribute('data-skin') || '').split('|');
      var hasSkin = skins.some(function (value) { return cardSkins.indexOf(value) > -1; });
      if (!hasSkin) return false;
    }

    if (concerns.length) {
      var cardConcerns = (card.getAttribute('data-concern') || '').split('|');
      var hasConcern = concerns.some(function (value) { return cardConcerns.indexOf(value) > -1; });
      if (!hasConcern) return false;
    }

    if (prices.length) {
      var price = Number(card.getAttribute('data-price'));
      var inRange = prices.some(function (range) {
        var bounds = range.split('-');
        return price >= Number(bounds[0]) && price < Number(bounds[1]);
      });
      if (!inRange) return false;
    }

    return true;
  }

  function sortCards() {
    if (!sortSelect) return;
    var mode = sortSelect.value;
    var sorted = cards.slice();

    if (mode === 'price-asc' || mode === 'price-desc') {
      sorted.sort(function (a, b) {
        var diff = Number(a.getAttribute('data-price')) - Number(b.getAttribute('data-price'));
        return mode === 'price-asc' ? diff : -diff;
      });
    } else if (mode === 'name-asc') {
      sorted.sort(function (a, b) {
        return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
      });
    } else if (mode === 'brand-asc') {
      sorted.sort(function (a, b) {
        return a.getAttribute('data-brand').localeCompare(b.getAttribute('data-brand'));
      });
    }

    sorted.forEach(function (card) {
      grid.appendChild(card);
    });
    // Keep the editorial interrupt tile in place after the eighth product.
    var interrupt = $('.shop-interrupt', grid);
    if (interrupt) {
      var visible = sorted.filter(matches);
      var anchor = visible[8];
      if (anchor) grid.insertBefore(interrupt, anchor);
      else grid.appendChild(interrupt);
    }
  }

  function renderActiveFilters() {
    if (!activeWrap) return;
    var chips = $$('input[type="checkbox"]:checked', drawer || document);
    activeWrap.innerHTML = chips
      .map(function (input) {
        var label = input.closest('.checkbox');
        var text = label ? $('.checkbox__label', label).textContent.replace(/\(\d+\)/, '').trim() : input.value;
        return '<span class="active-filter">' + text + '<button type="button" data-clear-filter="' + input.name + '|' + input.value + '" aria-label="Remove filter ' + text + '">&times;</button></span>';
      })
      .join('');
    if (chips.length) {
      activeWrap.innerHTML += '<button class="btn btn--text" type="button" data-clear-all>Clear all</button>';
    }
  }

  function apply() {
    var visible = 0;
    cards.forEach(function (card) {
      var show = matches(card);
      card.hidden = !show;
      if (show) {
        visible++;
        card.hidden = visible > shown;
      }
    });

    var total = cards.filter(matches).length;
    countEls.forEach(function (el) {
      el.textContent = total + (total === 1 ? ' product' : ' products');
    });
    if (emptyMessage) emptyMessage.hidden = total > 0;
    if (loadMoreWrap) loadMoreWrap.hidden = total <= shown;
    if (loadStatus) loadStatus.textContent = 'Showing ' + Math.min(shown, total) + ' of ' + total;

    var interrupt = $('.shop-interrupt', grid);
    if (interrupt) interrupt.hidden = total < 4;

    renderActiveFilters();
  }

  document.addEventListener('change', function (event) {
    if (event.target.closest('[data-filter-drawer]') && event.target.type === 'checkbox') {
      shown = PAGE;
      apply();
    }
    if (sortSelect && event.target === sortSelect) {
      sortCards();
      apply();
    }
  });

  document.addEventListener('click', function (event) {
    var clear = event.target.closest('[data-clear-filter]');
    if (clear) {
      var parts = clear.getAttribute('data-clear-filter').split('|');
      var input = $('input[name="' + parts[0] + '"][value="' + parts[1] + '"]', drawer || document);
      if (input) input.checked = false;
      apply();
      return;
    }

    if (event.target.closest('[data-clear-all]')) {
      $$('input[type="checkbox"]', drawer || document).forEach(function (input) {
        input.checked = false;
      });
      apply();
      return;
    }

    if (event.target.closest('[data-filter-open]')) {
      drawer.hidden = false;
      drawer.setAttribute('aria-hidden', 'false');
      void drawer.offsetWidth;
      drawer.classList.add('is-open');
      document.body.classList.add('is-locked');
      var close = $('[data-drawer-close]', drawer);
      if (close) close.focus();
    }
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      shown += PAGE;
      apply();
    });
  }

  applyUrlFilters();
  apply();
})();
