/* Homepage stacking-sections.
   Runtime structure:
   .stacking-container > [s1, s2, s3, s4]

   s1 = original .main-content > .shopify-section:nth-child(2)
   s2 = original .main-content > .shopify-section:nth-child(3)
   s3 = original .main-content > .shopify-section:nth-child(4)
   s4 = original .main-content > .shopify-section:nth-child(5) / pusher

   s1-s3 are sticky cards.
   s4 is NOT sticky. It only pushes the stack away.
*/

(function () {
  var MIN_SCALE = 0.94;

  // Card index inside the `cards` array.
  // cards[2] = .stacking-container > .shopify-section:nth-child(3)
  var THIRD_CARD_INDEX = 2;

  // How much gap to keep below the header.
  var GAP_BELOW_HEADER = 0;

  // Hard cap: nth-child(3) will never move above -167px.
  // var THIRD_CARD_MANUAL_CAP = 167;

  // Ignore tiny scroll noise.
  var SCROLL_EPSILON = 1;

  function init() {
    var main = document.querySelector('.main-content');
    if (!main) return;

    // Prevent double init.
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
    wrapper.appendChild(s4);

    setupStack([s1, s2, s3], s4);
  }

  function setupStack(cards, pusher) {
    var last = cards.length - 1;
    var ticking = false;

    var translate = 0;
    var lastScrollY = window.scrollY || window.pageYOffset || 0;
    var scrollDirection = 'none';

    // Cache elements once.
    var header =
      document.querySelector('header[is="sticky-header"]') ||
      document.querySelector('header.header') ||
      document.querySelector('header');

    var inners = [];
    var rects = [];
    var stickyTops = [];
    var nextTranslates = [];
    var appliedTranslates = [];
    var lastInnerScales = [];

    for (var i = 0; i < cards.length; i++) {
      inners[i] = cards[i].firstElementChild || cards[i];
      rects[i] = null;
      stickyTops[i] = 0;
      nextTranslates[i] = 0;
      appliedTranslates[i] = 0;
      lastInnerScales[i] = null;
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function getScrollY() {
      return window.scrollY || window.pageYOffset || 0;
    }

    function getHeaderBottom() {
      if (!header) return 0;
      return header.getBoundingClientRect().bottom || 0;
    }

    function readMeasurements() {
      for (var i = 0; i < cards.length; i++) {
        rects[i] = cards[i].getBoundingClientRect();

        // Read computed sticky top.
        // This supports CSS calc(), var(--header-height), responsive changes, etc.
        stickyTops[i] = parseFloat(getComputedStyle(cards[i]).top) || 0;
      }

      return pusher.getBoundingClientRect().top;
    }

    function calculateScrollDirection() {
      var currentScrollY = getScrollY();
      var delta = currentScrollY - lastScrollY;

      if (delta > SCROLL_EPSILON) {
        scrollDirection = 'down';
      } else if (delta < -SCROLL_EPSILON) {
        scrollDirection = 'up';
      } else {
        scrollDirection = 'none';
      }

      lastScrollY = currentScrollY;
    }

    function calculateCardTranslates(pusherTop, headerBottom) {
      /*
        rects[last].bottom includes the previous transform.
        Add appliedTranslates[last] back to get the natural stack bottom.
      */
      var naturalStackBottom = rects[last].bottom + appliedTranslates[last];

      var rawTranslate = Math.max(0, naturalStackBottom - pusherTop);

      /*
        Use nth-child(3) only to calculate the MAX movement,
        but apply that same movement to ALL cards.
        This prevents gaps when scrolling fast.
      */
      var thirdNaturalTop =
        rects[THIRD_CARD_INDEX].top + appliedTranslates[THIRD_CARD_INDEX];

      var maxUpToHeader = Math.max(
        0,
        thirdNaturalTop - headerBottom - GAP_BELOW_HEADER
      );

      translate = Math.min(rawTranslate, maxUpToHeader);

      /*
        Important:
        All cards must receive the same translate.
        Do not cap only the third card.
      */
      for (var i = 0; i < cards.length; i++) {
        nextTranslates[i] = translate;
      }
    }

    function applyCardTransformsAndClasses() {
      for (var i = 0; i < cards.length; i++) {
        var previousTranslate = appliedTranslates[i];
        var nextTranslate = nextTranslates[i];

        // Predict where the card will be after the new transform.
        var predictedTop = rects[i].top + previousTranslate - nextTranslate;

        if (Math.abs(previousTranslate - nextTranslate) > 0.1) {
          if (nextTranslate > 0.1) {
            cards[i].style.transform =
              'translate3d(0,' + (-nextTranslate) + 'px,0)';
          } else {
            cards[i].style.transform = '';
          }

          appliedTranslates[i] = nextTranslate;
        }

        var stuck = predictedTop <= stickyTops[i] + 1;
        cards[i].classList.toggle('is-stuck', stuck);

        var isCovered = false;

        if (cards[i + 1]) {
          var nextCardPredictedTop =
            rects[i + 1].top +
            appliedTranslates[i + 1] -
            nextTranslates[i + 1];

          isCovered = nextCardPredictedTop <= stickyTops[i + 1] + 1;
        }

        cards[i].classList.toggle('is-covered', isCovered);
      }

      var thirdCardIsStuck = cards[THIRD_CARD_INDEX].classList.contains('is-stuck');
      pusher.classList.toggle('border-active', thirdCardIsStuck);
    }

    function applyDepthScale() {
      for (var j = 0; j < last; j++) {
        var currentPredictedBottom =
          rects[j].bottom +
          appliedTranslates[j] -
          nextTranslates[j];

        var nextPredictedTop =
          rects[j + 1].top +
          appliedTranslates[j + 1] -
          nextTranslates[j + 1];

        var overlap = currentPredictedBottom - nextPredictedTop;
        var progress = clamp(overlap / (rects[j].height || 1), 0, 1);
        var scale = 1 - (1 - MIN_SCALE) * progress;

        if (lastInnerScales[j] === null || Math.abs(lastInnerScales[j] - scale) > 0.001) {
          inners[j].style.transformOrigin = 'center top';
          inners[j].style.transform = 'scale(' + scale + ')';
          lastInnerScales[j] = scale;
        }
      }
    }

    function update() {
      ticking = false;

      calculateScrollDirection();

      // READ phase
      var pusherTop = readMeasurements();
      var headerBottom = getHeaderBottom();

      // CALCULATE phase
      calculateCardTranslates(pusherTop, headerBottom);

      // WRITE phase
      applyCardTransformsAndClasses();
      applyDepthScale();

      // Debug only. Uncomment if needed.
      /*
      console.log({
        direction: scrollDirection,
        translate: translate,
        card3Translate: appliedTranslates[THIRD_CARD_INDEX],
        headerBottom: headerBottom
      });
      */
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });

    // Recalculate when layout/images/fonts shift.
    if ('ResizeObserver' in window) {
      var resizeObserver = new ResizeObserver(requestUpdate);

      for (var i = 0; i < cards.length; i++) {
        resizeObserver.observe(cards[i]);
      }

      resizeObserver.observe(pusher);

      if (header) {
        resizeObserver.observe(header);
      }
    }

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();