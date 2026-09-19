/**
 * Account, login and register.
 * The prototype keeps a name and email in the browser so the account pages can
 * be reviewed. WooCommerce handles real authentication on the live site, and no
 * password is ever stored here.
 */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };
  var $$ = function (s, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(s)); };

  /* Login and registration ------------------------------------------------ */

  var loginForm = $('[data-login-form]');
  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!window.BC.validateForm(loginForm)) return;
      var email = $('input[type="email"]', loginForm).value;
      window.BC.account.signIn({ name: email.split('@')[0], email: email });
      window.location.href = '/my-account/';
    });
  }

  var lostToggle = $('[data-lost-password-toggle]');
  var lostPanel = $('[data-lost-password]');
  var loginPanel = $('[data-login-panel]');
  if (lostToggle && lostPanel && loginPanel) {
    lostToggle.addEventListener('click', function (event) {
      event.preventDefault();
      var showing = lostPanel.hidden;
      lostPanel.hidden = !showing;
      loginPanel.hidden = showing;
      if (showing) $('input', lostPanel).focus();
    });
  }

  var lostForm = $('[data-lost-password-form]');
  if (lostForm) {
    lostForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!window.BC.validateForm(lostForm)) return;
      var status = $('.form__status', lostForm);
      if (status) status.textContent = 'If that email is registered, a reset link is on its way.';
      lostForm.reset();
    });
  }

  var registerForm = $('[data-register-form]');
  if (registerForm) {
    registerForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!window.BC.validateForm(registerForm)) return;
      window.BC.account.signIn({
        name: $('input[name="name"]', registerForm).value,
        email: $('input[name="email"]', registerForm).value,
        phone: ($('input[name="phone"]', registerForm) || {}).value
      });
      window.location.href = '/my-account/';
    });
  }

  /* Account dashboard ----------------------------------------------------- */

  var account = $('[data-account]');
  if (!account) return;

  var details = window.BC.account.get();
  var greeting = $('[data-account-greeting]');
  var signedOutNotice = $('[data-signed-out]');

  if (greeting) {
    var hour = new Date().getHours();
    var partOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    greeting.textContent = details ? partOfDay + ', ' + details.name.split(' ')[0] + '.' : partOfDay + '.';
  }
  if (signedOutNotice) signedOutNotice.hidden = !!details;

  $$('[data-account-email]').forEach(function (el) { el.textContent = details ? details.email : 'Not signed in'; });
  $$('[data-account-name]').forEach(function (el) { el.textContent = details ? details.name : 'Guest'; });

  var order = window.BC.orders.last();

  /* The dashboard and the dedicated panels both show these blocks. */
  $$('[data-account-orders]').forEach(function (ordersWrap) {
    if (order) {
      ordersWrap.innerHTML =
        '<div class="order-row">' +
        '<div class="order-row__meta">' +
        '<p class="heading-3">Order ' + order.number + '</p>' +
        '<p class="note">' + new Date(order.placedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
        ' &middot; ' + (order.items || []).length + ' item' + ((order.items || []).length === 1 ? '' : 's') +
        ' &middot; ' + window.BC.money(order.subtotal + (order.deliveryCost || 0)) + '</p>' +
        '</div>' +
        '<span class="order-status">Processing</span>' +
        '<a class="btn btn--outline btn--sm" href="/checkout/order-received/">View order</a>' +
        '</div>';
    }
  });

  $$('[data-orders-empty]').forEach(function (el) {
    el.hidden = !!order;
  });

  $$('[data-account-address]').forEach(function (addressWrap) {
    if (order && order.customer) {
      var c = order.customer;
      addressWrap.innerHTML =
        '<p>' + [c.name, c.address, c.city, c.district, c.phone].filter(Boolean).join('<br>') + '</p>';
    } else {
      addressWrap.innerHTML = '<p class="note">No delivery address saved yet. Your address is saved with your first order.</p>';
    }
  });

  var saved = window.BC.wishlist.items();
  $$('[data-account-wishlist]').forEach(function (wishlistWrap) {
    wishlistWrap.innerHTML = saved.length
      ? '<ul class="stack">' + saved.map(function (item) {
          return '<li><a href="' + item.url + '">' + item.brand + ' ' + item.name + '</a> &middot; ' + window.BC.money(item.price) + '</li>';
        }).join('') + '</ul>'
      : '<p class="note">Nothing saved yet. Tap the heart on any product to save it here.</p>';
  });

  /* Account details: prefill from the stored account, and save back to it. */
  var detailsForm = $('[data-account-form]');
  if (detailsForm) {
    if (details) {
      detailsForm.querySelector('input[name="name"]').value = details.name || '';
      detailsForm.querySelector('input[name="email"]').value = details.email || '';
      var phoneField = detailsForm.querySelector('input[name="phone"]');
      if (phoneField) phoneField.value = details.phone || (order && order.customer ? order.customer.phone : '') || '';
    }
    detailsForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!window.BC.validateForm(detailsForm)) return;
      window.BC.account.signIn({
        name: detailsForm.querySelector('input[name="name"]').value,
        email: detailsForm.querySelector('input[name="email"]').value,
        phone: (detailsForm.querySelector('input[name="phone"]') || {}).value
      });
      var status = $('.form__status', detailsForm);
      if (status) status.textContent = 'Your account details have been saved.';
      $$('[data-account-email]').forEach(function (el) {
        el.textContent = detailsForm.querySelector('input[name="email"]').value;
      });
    });
  }

  var signOut = $('[data-sign-out]');
  if (signOut) {
    signOut.addEventListener('click', function () {
      window.BC.account.signOut();
      window.location.href = '/login/';
    });
  }
})();
