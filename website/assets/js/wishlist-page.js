/**
 * Wishlist page: saved products, move to bag, share.
 */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };

  var grid = $('[data-wishlist-grid]');
  if (!grid) return;

  var empty = $('[data-wishlist-empty]');
  var actions = $('[data-wishlist-actions]');
  var countEl = $('[data-wishlist-total]');

  function card(item) {
    var data =
      'data-slug="' + item.slug + '" data-name="' + item.name + '" data-brand="' + item.brand +
      '" data-price="' + item.price + '" data-image="' + item.image + '" data-url="' + item.url + '"';
    return (
      '<article class="product-card" ' + data + '>' +
      '<div class="product-card__media">' +
      '<a class="product-card__link" href="' + item.url + '"><picture class="product-card__image"><img src="' + item.image + '" alt="' + item.brand + ' ' + item.name + '" width="400" height="500" loading="lazy"></picture></a>' +
      '<button class="wishlist-toggle is-active" type="button" data-wishlist ' + data + ' aria-pressed="true" aria-label="Remove ' + item.name + ' from your wishlist">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l1.3 1.3 1.3-1.3a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5z"/></svg></button>' +
      '</div>' +
      '<div class="product-card__body">' +
      '<p class="eyebrow product-card__brand">' + item.brand + '</p>' +
      '<h2 class="product-card__name"><a href="' + item.url + '">' + item.name + '</a></h2>' +
      '<p class="price product-card__price">' + window.BC.money(item.price) + '</p>' +
      '<p style="margin-top:14px"><button class="btn btn--solid btn--sm btn--block" type="button" data-add-to-cart ' + data + '>Move to bag</button></p>' +
      '</div></article>'
    );
  }

  function render() {
    var items = window.BC.wishlist.items();
    grid.innerHTML = items.map(card).join('');
    if (empty) empty.hidden = items.length > 0;
    if (actions) actions.hidden = items.length === 0;
    if (countEl) countEl.textContent = items.length + (items.length === 1 ? ' saved product' : ' saved products');
  }

  document.addEventListener('bc:wishlist', render);
  render();

  var share = $('[data-share-wishlist]');
  if (share) {
    share.addEventListener('click', function () {
      window.BC.copyText(window.location.href, 'Wishlist link copied');
      share.textContent = 'Link copied';
      setTimeout(function () { share.textContent = 'Copy wishlist link'; }, 2400);
    });
  }
})();
