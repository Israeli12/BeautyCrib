/**
 * Search results page.
 */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };

  var productsWrap = $('[data-search-products]');
  if (!productsWrap) return;

  var articlesWrap = $('[data-search-articles]');
  var termEl = $('[data-search-term]');
  var input = $('[data-search-page-input]');
  var productCount = $('[data-search-product-count]');
  var articleCount = $('[data-search-article-count]');
  var emptyState = $('[data-search-empty]');

  var params = new URLSearchParams(window.location.search);
  var query = params.get('q') || '';

  if (termEl) termEl.textContent = query ? '“' + query + '”' : 'everything';
  if (input) input.value = query;

  function productCard(item) {
    var data =
      'data-slug="' + item.slug + '" data-name="' + item.name + '" data-brand="' + item.brand +
      '" data-price="' + item.price + '" data-image="' + item.image + '" data-url="' + item.url + '"';
    return (
      '<article class="product-card" ' + data + '>' +
      '<div class="product-card__media"><a class="product-card__link" href="' + item.url + '">' +
      '<picture class="product-card__image"><img src="' + item.image + '" alt="' + item.brand + ' ' + item.name + '" width="400" height="500" loading="lazy"></picture></a>' +
      '<button class="wishlist-toggle" type="button" data-wishlist ' + data + ' aria-pressed="false" aria-label="Save ' + item.name + ' to your wishlist">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l1.3 1.3 1.3-1.3a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5z"/></svg></button>' +
      '<div class="product-card__quick"><button class="btn btn--solid btn--block btn--sm" type="button" data-add-to-cart ' + data + '>Quick add</button></div>' +
      '</div>' +
      '<div class="product-card__body">' +
      '<p class="eyebrow product-card__brand">' + item.brand + '</p>' +
      '<h2 class="product-card__name"><a href="' + item.url + '">' + item.name + '</a></h2>' +
      '<p class="price product-card__price">' + window.BC.money(item.price) + '</p>' +
      '</div></article>'
    );
  }

  function articleCard(item) {
    return (
      '<article class="article-card"><a class="article-card__link" href="' + item.url + '">' +
      '<div class="article-card__media"><picture class="article-card__image"><img src="' + item.image + '" alt="" width="600" height="400" loading="lazy"></picture></div>' +
      '<p class="eyebrow article-card__category">' + item.category + '</p>' +
      '<h2 class="article-card__title">' + item.title + '</h2>' +
      '<p class="article-card__excerpt">' + item.excerpt + '</p></a></article>'
    );
  }

  Promise.all([
    window.BC.loadCatalogue(),
    fetch('/assets/data/articles.json').then(function (r) { return r.json(); }).catch(function () { return []; })
  ]).then(function (results) {
    var products = results[0];
    var articles = results[1];

    var matchedProducts = query ? window.BC.searchCatalogue(products, query) : products;
    var lower = query.toLowerCase();
    var matchedArticles = query
      ? articles.filter(function (article) {
          return (article.title + ' ' + article.excerpt + ' ' + article.category).toLowerCase().indexOf(lower) > -1;
        })
      : articles;

    productsWrap.innerHTML = matchedProducts.map(productCard).join('');
    if (articlesWrap) articlesWrap.innerHTML = matchedArticles.map(articleCard).join('');
    if (productCount) productCount.textContent = '(' + matchedProducts.length + ')';
    if (articleCount) articleCount.textContent = '(' + matchedArticles.length + ')';
    if (emptyState) emptyState.hidden = matchedProducts.length + matchedArticles.length > 0;

    document.dispatchEvent(new CustomEvent('bc:wishlist', { detail: {} }));
  });
})();
