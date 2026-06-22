/* Homepage stacking-sections animation.
   The sticky positioning is handled in homepage-stack.css; this script only
   adds depth: as the next card slides up over a card, that card scales down
   slightly, so the pile reads as layered rather than flat. */
(function () {
  var main = document.getElementById('MainContent');
  if (!main) return;

  // The cards are the sticky direct sections (set in homepage-stack.css).
  var cards = Array.prototype.slice
    .call(main.querySelectorAll(':scope > .shopify-section'))
    .filter(function (el) {
      return getComputedStyle(el).position === 'sticky';
    });
  if (cards.length < 2) return;

  var MIN_SCALE = 0.94; // how small a fully-covered card shrinks to
  var ticking = false;

  function update() {
    ticking = false;

    for (var i = 0; i < cards.length - 1; i++) {
      var current = cards[i];
      var next = cards[i + 1];
      var inner = current.firstElementChild || current;

      var currentRect = current.getBoundingClientRect();
      var nextRect = next.getBoundingClientRect();

      // 0 = next card not overlapping yet, 1 = next card fully covers current.
      var overlap = currentRect.bottom - nextRect.top;
      var progress = Math.min(Math.max(overlap / (currentRect.height || 1), 0), 1);

      var scale = 1 - (1 - MIN_SCALE) * progress;
      inner.style.transformOrigin = 'center top';
      inner.style.transform = 'scale(' + scale + ')';
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
