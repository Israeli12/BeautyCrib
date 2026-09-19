/**
 * Product detail page: gallery navigation and the mobile sticky buy bar.
 */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };
  var $$ = function (s, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(s)); };

  var gallery = $('[data-gallery]');
  if (gallery) {
    var items = $$('.product-gallery__item', gallery);
    var thumbs = $$('[data-thumb]');

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var index = Number(thumb.getAttribute('data-thumb'));
        var target = items[index];
        if (!target) return;
        if (window.matchMedia('(max-width: 767px)').matches) {
          target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } else {
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
        }
      });
    });

    if ('IntersectionObserver' in window && thumbs.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var index = Number(entry.target.getAttribute('data-index'));
            thumbs.forEach(function (thumb) {
              thumb.classList.toggle('is-active', Number(thumb.getAttribute('data-thumb')) === index);
            });
          });
        },
        { threshold: 0.5 }
      );
      items.forEach(function (item) { observer.observe(item); });
    }
  }

  var stickyBar = $('[data-sticky-buy]');
  var mainButton = $('.product-buy__add');

  if (stickyBar && mainButton && 'IntersectionObserver' in window) {
    var barObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          stickyBar.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
        });
      },
      { threshold: 0 }
    );
    barObserver.observe(mainButton);
  }
})();
