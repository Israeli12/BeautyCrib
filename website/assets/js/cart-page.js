/**
 * Cart page: line items, totals and the coupon field.
 */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };

  var rows = $('[data-cart-rows]');
  if (!rows) return;

  var emptyState = $('[data-cart-page-empty]');
  var summary = $('[data-cart-summary]');

  function rowMarkup(item) {
    return (
      '<div class="cart-row" data-line="' + item.slug + '">' +
      '<a class="cart-row__media" href="' + item.url + '"><img src="' + item.image + '" alt="" width="120" height="150" loading="lazy"></a>' +
      '<div class="cart-row__body">' +
      '<div class="cart-row__info">' +
      '<p class="eyebrow">' + item.brand + '</p>' +
      '<h2 class="heading-3"><a href="' + item.url + '">' + item.name + '</a></h2>' +
      '<p class="price">' + window.BC.money(item.price) + ' each</p>' +
      '</div>' +
      '<div class="cart-row__controls">' +
      '<span class="qty" data-qty>' +
      '<button type="button" data-qty-step="-1" aria-label="Decrease quantity for ' + item.name + '">&minus;</button>' +
      '<input type="number" min="1" value="' + item.qty + '" data-qty-input aria-label="Quantity for ' + item.name + '">' +
      '<button type="button" data-qty-step="1" aria-label="Increase quantity for ' + item.name + '">+</button>' +
      '</span>' +
      '<p class="price">' + window.BC.money(item.price * item.qty) + '</p>' +
      '<button class="cart-line__remove" type="button" data-remove-line>Remove</button>' +
      '</div></div></div>'
    );
  }

  function render() {
    var items = window.BC.cart.items();
    rows.innerHTML = items.map(rowMarkup).join('');
    if (emptyState) emptyState.hidden = items.length > 0;
    if (summary) summary.hidden = items.length === 0;
  }

  document.addEventListener('bc:cart', render);
  render();

  var coupon = $('[data-coupon-form]');
  if (coupon) {
    coupon.addEventListener('submit', function (event) {
      event.preventDefault();
      var status = $('.form__status', coupon);
      if (status) status.textContent = 'Coupon codes are checked at checkout. WooCommerce validates and applies them on the live store.';
    });
  }
})();
