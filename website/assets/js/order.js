/**
 * Order confirmation: reads the order placed at checkout.
 */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };

  var wrap = $('[data-order]');
  if (!wrap) return;

  var order = window.BC.orders.last();
  var empty = $('[data-order-empty]');

  if (!order) {
    wrap.hidden = true;
    if (empty) empty.hidden = false;
    return;
  }

  var customer = order.customer || {};
  var firstName = (customer.name || 'there').split(' ')[0];

  var set = function (selector, value) {
    var el = $(selector);
    if (el) el.textContent = value;
  };

  set('[data-order-greeting]', 'Thank you, ' + firstName + '.');
  set('[data-order-number]', order.number);
  set('[data-order-date]', new Date(order.placedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
  set('[data-order-email]', customer.email || '');
  set('[data-order-phone]', customer.phone || '');
  set('[data-order-address]', [customer.address, customer.city, customer.district].filter(Boolean).join(', '));
  set('[data-order-delivery]', order.deliveryMethod + ' (' + order.deliveryEta + ')');
  set('[data-order-payment]', order.paymentMethod);
  set('[data-order-payment-note]', order.paymentNote);
  set('[data-order-subtotal]', window.BC.money(order.subtotal));
  set('[data-order-delivery-cost]', order.deliveryCost === null ? 'Confirmed on order' : order.deliveryCost === 0 ? 'Free' : window.BC.money(order.deliveryCost));
  set('[data-order-total]', window.BC.money(order.subtotal + (order.deliveryCost || 0)));
  if (customer.instructions) set('[data-order-instructions]', customer.instructions);

  var items = $('[data-order-items]');
  if (items) {
    items.innerHTML = (order.items || [])
      .map(function (item) {
        return (
          '<li class="order-summary__item">' +
          '<span class="order-summary__media"><img src="' + item.image + '" alt="" width="64" height="80"><span class="order-summary__qty">' + item.qty + '</span></span>' +
          '<span><span class="order-summary__name">' + item.brand + ' ' + item.name + '</span>' +
          '<span class="order-summary__price">' + window.BC.money(item.price * item.qty) + '</span></span></li>'
        );
      })
      .join('');
  }
})();
