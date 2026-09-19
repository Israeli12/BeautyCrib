/**
 * Journal index: topic filtering.
 * Rebuilt in WordPress as category links on the posts archive.
 */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };
  var $$ = function (s, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(s)); };

  var filters = $('[data-journal-filters]');
  var grid = $('[data-journal-grid]');
  if (!filters || !grid) return;

  var cards = $$('.article-card', grid);
  var empty = $('[data-journal-empty]');

  function apply(topic) {
    var visible = 0;
    cards.forEach(function (card) {
      var category = ($('.article-card__category', card) || {}).textContent || '';
      var show = topic === 'all' || category.trim() === topic;
      card.hidden = !show;
      if (show) visible++;
    });
    if (empty) empty.hidden = visible > 0;
  }

  filters.addEventListener('click', function (event) {
    var button = event.target.closest('[data-topic]');
    if (!button) return;
    $$('[data-topic]', filters).forEach(function (other) {
      other.classList.toggle('is-active', other === button);
    });
    apply(button.getAttribute('data-topic'));
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('[data-topic-reset]')) return;
    var all = $('[data-topic="all"]', filters);
    if (all) all.click();
  });
})();
