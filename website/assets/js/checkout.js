/**
 * Checkout: order summary, delivery pricing, validation and order placement.
 * No card details are collected here. Card payments are handled by the payment
 * provider on the live site, so nothing sensitive is ever held by the page.
 */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };
  var $$ = function (s, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(s)); };

  var form = $('[data-checkout-form]');
  if (!form) return;

  var itemsWrap = $('[data-summary-items]');
  var subtotalEl = $('[data-summary-subtotal]');
  var deliveryEl = $('[data-summary-delivery]');
  var totalEl = $('[data-summary-total]');
  var noteEl = $('[data-summary-note]');
  var emptyNotice = $('[data-checkout-empty]');
  var submitBtn = $('[data-place-order]');
  var toggle = $('[data-summary-toggle]');
  var summaryBody = $('[data-summary-body]');
  var toggleTotal = $('[data-toggle-total]');

  function selectedDelivery() {
    var input = $('input[name="delivery"]:checked', form);
    return input ? input.value : null;
  }

  function render() {
    var items = window.BC.cart.items();
    var subtotal = window.BC.cart.subtotal();
    var deliveryCost = window.BC.deliveryCost(selectedDelivery());

    if (itemsWrap) {
      itemsWrap.innerHTML = items
        .map(function (item) {
          return (
            '<li class="order-summary__item">' +
            '<span class="order-summary__media"><img src="' + item.image + '" alt="" width="64" height="80" loading="lazy"><span class="order-summary__qty">' + item.qty + '</span></span>' +
            '<span><span class="order-summary__name">' + item.brand + ' ' + item.name + '</span>' +
            '<span class="order-summary__price">' + window.BC.money(item.price * item.qty) + '</span></span></li>'
          );
        })
        .join('');
    }

    if (subtotalEl) subtotalEl.textContent = window.BC.money(subtotal);
    if (deliveryEl) deliveryEl.textContent = deliveryCost === null ? 'Confirmed on order' : deliveryCost === 0 ? 'Free' : window.BC.money(deliveryCost);
    if (totalEl) totalEl.textContent = window.BC.money(subtotal + (deliveryCost || 0));
    if (toggleTotal) toggleTotal.textContent = window.BC.money(subtotal + (deliveryCost || 0));
    if (noteEl) noteEl.hidden = deliveryCost !== null;

    var empty = items.length === 0;
    if (emptyNotice) emptyNotice.hidden = !empty;
    if (submitBtn) submitBtn.disabled = empty;
  }

  if (toggle && summaryBody) {
    toggle.addEventListener('click', function () {
      var open = summaryBody.hidden === false;
      summaryBody.hidden = open;
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    if (window.matchMedia('(max-width: 1024px)').matches) summaryBody.hidden = true;
  }

  form.addEventListener('change', function (event) {
    if (event.target.name === 'delivery') render();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!window.BC.validateForm(form)) return;

    var data = {};
    $$('input, select, textarea', form).forEach(function (field) {
      if (field.type === 'radio' && !field.checked) return;
      if (field.type === 'checkbox') {
        data[field.name] = field.checked;
        return;
      }
      data[field.name] = field.value;
    });

    var deliveryInput = $('input[name="delivery"]:checked', form);
    var paymentInput = $('input[name="payment"]:checked', form);

    var order = window.BC.orders.place({
      items: window.BC.cart.items(),
      subtotal: window.BC.cart.subtotal(),
      deliveryCost: window.BC.deliveryCost(deliveryInput ? deliveryInput.value : null),
      deliveryMethod: deliveryInput ? $('.option-card__title', deliveryInput.closest('.option-card')).textContent : '',
      deliveryEta: deliveryInput ? $('.option-card__note', deliveryInput.closest('.option-card')).textContent : '',
      paymentMethod: paymentInput ? $('.option-card__title', paymentInput.closest('.option-card')).textContent : '',
      paymentNote: paymentInput ? $('.option-card__note', paymentInput.closest('.option-card')).textContent : '',
      customer: data
    });

    window.BC.cart.clear();
    window.location.href = '/checkout/order-received/?order=' + encodeURIComponent(order.number);
  });

  document.addEventListener('bc:cart', render);
  render();
})();
