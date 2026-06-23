/* Homepage stacking-sections.
   Structure built at runtime:  .stacking-container > [ s1  s2  s3  s4 ]
     - s1,s2,s3 peek-stack via position:sticky (see homepage-stack.css).
     - s4 is the "pusher": the section right after the stack.

   ENTRANCE: as you scroll down, s1/s2/s3 pin one-by-one into the peek-stack.
   EXIT (leave-together): once s4 rises up into the bottom of the stack, this
   script translates ALL THREE cards up by exactly how far s4 has intruded, so
   s4 stays glued to the stack's bottom and the whole pile slides off the top as
   a single block. Reverses cleanly on scroll-up.
   Plus a touch of depth: each covered card's inner content scales down. */
(function () {
  var MIN_SCALE = 0.94;

  function init() {
    var main = document.querySelector('.main-content');
    if (!main) return;
    if (main.querySelector(':scope > .stacking-container')) return;

    var s1 = main.querySelector(':scope > .shopify-section:nth-child(2)');
    var s2 = main.querySelector(':scope > .shopify-section:nth-child(3)');
    var s3 = main.querySelector(':scope > .shopify-section:nth-child(4)');
    var s4 = main.querySelector(':scope > .shopify-section:nth-child(5)');
    if (!s1 || !s2 || !s3 || !s4) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'stacking-container';
    main.insertBefore(wrapper, s1);
    wrapper.appendChild(s1);
    wrapper.appendChild(s2);
    wrapper.appendChild(s3);
    wrapper.appendChild(s4); // pusher — non-sticky, also gives s3 its runway

    // s1–s3 are the pinned cards; s4 drives them off-screen together.
    setupStack([s1, s2, s3], s4);
  }

  function setupStack(cards, pusher) {
    var last = cards.length - 1; // front card (paints on top, pinned lowest)
    var translate = 0;
    var ticking = false;

    function update() {
      ticking = false;

      // Measure first (rects reflect the PREVIOUS frame's transform).
      var rects = [];
      var stickyTops = [];
      for (var k = 0; k < cards.length; k++) {
        rects.push(cards[k].getBoundingClientRect());
        // Resolved sticky `top` in px (calc → px). Re-read each frame so it
        // stays correct after --header-height / font-size changes.
        stickyTops.push(parseFloat(getComputedStyle(cards[k]).top) || 0);
      }
      var pusherTop = pusher.getBoundingClientRect().top;

      // --- Leave-together exit ---------------------------------------------
      // Front card's un-translated bottom is stable while it's pinned:
      //   rect.bottom = (stickyTop + height) - translate  =>  add translate back.
      var stackBottom = rects[last].bottom + translate;
      // Push begins when the pusher's top rises above the stack's bottom.
      translate = Math.max(0, stackBottom - pusherTop);
      for (var i = 0; i < cards.length; i++) {
        cards[i].style.transform = translate
          ? 'translateY(' + (-translate) + 'px)'
          : '';

        // Stuck once the card has reached (or passed) its sticky top. The
        // translate above only shifts it further up, so this stays true on exit.
        var stuck = rects[i].top <= stickyTops[i] + 1;
        cards[i].classList.toggle('is-stuck', stuck);

        var isCovered = false;
        if (cards[i + 1]) {
          isCovered = rects[i + 1].top <= stickyTops[i + 1] + 1;
        }
        cards[i].classList.toggle('is-covered', isCovered);

      }

      // --- Depth: scale each covered card's inner content down a touch ------
      for (var j = 0; j < last; j++) {
        var inner = cards[j].firstElementChild || cards[j];
        var overlap = rects[j].bottom - rects[j + 1].top;
        var progress = Math.min(Math.max(overlap / (rects[j].height || 1), 0), 1);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
