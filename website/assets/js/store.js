/**
 * Beauty Crib state layer.
 *
 * Holds the bag, the wishlist and the last order in localStorage so the
 * prototype behaves like a real shop across pages. In WordPress this role is
 * played by the WooCommerce cart session, a wishlist plugin and the order
 * record, so nothing here needs to survive the rebuild.
 */
(function () {
  'use strict';

  var KEYS = {
    cart: 'bc.cart.v1',
    wishlist: 'bc.wishlist.v1',
    order: 'bc.lastOrder.v1',
    account: 'bc.account.v1'
  };

  function readJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* Storage can be unavailable in private windows. The page still works. */
    }
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  var BC = window.BC || {};

  BC.money = function (value) {
    // A product the business has not priced yet says so, rather than UGX 0.
    if (value === null || value === undefined || value === '') return 'Price on request';
    var n = Math.round(Number(value) || 0);
    return 'UGX ' + n.toLocaleString('en-US');
  };

  /** Read the shared data-* attributes every add-to-cart control carries. */
  BC.readProduct = function (el) {
    return {
      slug: el.getAttribute('data-slug'),
      name: el.getAttribute('data-name'),
      brand: el.getAttribute('data-brand'),
      price: Number(el.getAttribute('data-price')) || 0,
      image: el.getAttribute('data-image'),
      url: el.getAttribute('data-url')
    };
  };

  /* ------------------------------------------------------------------ cart */

  BC.cart = {
    items: function () {
      return readJson(KEYS.cart, []);
    },
    save: function (items) {
      writeJson(KEYS.cart, items);
      emit('bc:cart', { items: items });
      return items;
    },
    count: function () {
      return this.items().reduce(function (total, item) {
        return total + item.qty;
      }, 0);
    },
    subtotal: function () {
      return this.items().reduce(function (total, item) {
        return total + item.price * item.qty;
      }, 0);
    },
    add: function (product, qty) {
      var items = this.items();
      var quantity = Math.max(1, Number(qty) || 1);
      var existing = items.filter(function (item) {
        return item.slug === product.slug;
      })[0];

      if (existing) {
        existing.qty += quantity;
      } else {
        items.push({
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          price: product.price,
          image: product.image,
          url: product.url,
          qty: quantity
        });
      }
      return this.save(items);
    },
    setQty: function (slug, qty) {
      var quantity = Number(qty);
      if (quantity < 1) return this.remove(slug);
      var items = this.items().map(function (item) {
        if (item.slug === slug) item.qty = quantity;
        return item;
      });
      return this.save(items);
    },
    remove: function (slug) {
      return this.save(
        this.items().filter(function (item) {
          return item.slug !== slug;
        })
      );
    },
    clear: function () {
      return this.save([]);
    }
  };

  /* -------------------------------------------------------------- wishlist */

  BC.wishlist = {
    items: function () {
      return readJson(KEYS.wishlist, []);
    },
    save: function (items) {
      writeJson(KEYS.wishlist, items);
      emit('bc:wishlist', { items: items });
      return items;
    },
    has: function (slug) {
      return this.items().some(function (item) {
        return item.slug === slug;
      });
    },
    toggle: function (product) {
      if (this.has(product.slug)) {
        this.remove(product.slug);
        return false;
      }
      var items = this.items();
      items.push(product);
      this.save(items);
      return true;
    },
    remove: function (slug) {
      return this.save(
        this.items().filter(function (item) {
          return item.slug !== slug;
        })
      );
    },
    count: function () {
      return this.items().length;
    }
  };

  /* --------------------------------------------------------------- orders */

  BC.orders = {
    last: function () {
      return readJson(KEYS.order, null);
    },
    place: function (order) {
      order.number = 'BC-' + String(Date.now()).slice(-6);
      order.placedAt = new Date().toISOString();
      writeJson(KEYS.order, order);
      return order;
    }
  };

  BC.account = {
    get: function () {
      return readJson(KEYS.account, null);
    },
    signIn: function (details) {
      writeJson(KEYS.account, details);
      return details;
    },
    signOut: function () {
      try {
        window.localStorage.removeItem(KEYS.account);
      } catch (e) {}
    }
  };

  /** Delivery pricing. Rates live in config.js, generated from src/data/site.json. */
  BC.deliveryCost = function (methodId) {
    var config = window.BC_CONFIG || { delivery: { methods: [] } };
    var method = config.delivery.methods.filter(function (m) {
      return m.id === methodId;
    })[0];
    return method && method.cost !== null && method.cost !== undefined ? Number(method.cost) : null;
  };

  window.BC = BC;
})();
