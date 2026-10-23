(function () {
  var rateButtons = document.querySelectorAll('.rate-button');
  var perTitle = document.getElementById('per-title');
  var companyRetained = document.getElementById('company-retained');
  var operatingRoom = document.getElementById('operating-room');
  var averagePlaysInTenThousands = 69.45049333333333;
  var monthlyTitles = 12;
  var companyShare = 0.51;
  var monthlyCost = 26400;

  function money(value) {
    return '¥' + Math.round(value).toLocaleString('zh-CN');
  }

  function updateEconomics(rate) {
    var titleSettlement = averagePlaysInTenThousands * rate;
    var retained = titleSettlement * monthlyTitles * companyShare;
    perTitle.textContent = money(titleSettlement);
    companyRetained.textContent = money(retained);
    operatingRoom.textContent = money(retained - monthlyCost);
  }

  rateButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      rateButtons.forEach(function (item) {
        item.classList.remove('active');
      });
      button.classList.add('active');
      updateEconomics(Number(button.dataset.rate));
    });
  });

  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.reveal').forEach(function (element) {
    revealObserver.observe(element);
  });

  var navLinks = document.querySelectorAll('.desktop-nav a');
  var elevator = document.querySelector('[data-elevator]');
  var elevatorLinks = document.querySelectorAll('[data-elevator-target]');
  var elevatorToggle = elevator ? elevator.querySelector('.elevator-toggle') : null;
  var elevatorCurrentIndex = elevator ? elevator.querySelector('.elevator-current-index') : null;
  var elevatorCurrentLabel = elevator ? elevator.querySelector('.elevator-current-label') : null;

  function updateElevator(sectionKey) {
    elevatorLinks.forEach(function (link) {
      var isActive = link.dataset.elevatorTarget === sectionKey;
      link.classList.toggle('active', isActive);
      if (isActive) {
        elevatorCurrentIndex.textContent = link.querySelector('span').textContent;
        elevatorCurrentLabel.textContent = link.querySelector('strong').textContent;
      }
    });
  }

  var trackedSections = document.querySelectorAll('[data-section]');
  var sectionObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var sectionKey = entry.target.dataset.section || entry.target.id;
        navLinks.forEach(function (link) {
          var target = link.getAttribute('href').slice(1);
          link.classList.toggle('active', target === sectionKey);
        });
        updateElevator(sectionKey);
      });
    },
    { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
  );

  trackedSections.forEach(function (section) {
    sectionObserver.observe(section);
  });

  if (elevator && elevatorToggle) {
    elevatorToggle.addEventListener('click', function () {
      var isOpen = elevator.classList.toggle('is-open');
      elevatorToggle.setAttribute('aria-expanded', String(isOpen));
    });
    elevatorLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        elevator.classList.remove('is-open');
        elevatorToggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', function (event) {
      if (elevator.contains(event.target)) return;
      elevator.classList.remove('is-open');
      elevatorToggle.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      elevator.classList.remove('is-open');
      elevatorToggle.setAttribute('aria-expanded', 'false');
    });
  }

  var progressBar = document.getElementById('progress-bar');
  function updateProgress() {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = progress + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var parallaxItems = [];
  var parallaxFrame = 0;
  var parallaxPlan = [
    ['.hero-copy', 20],
    ['.hero-visual', 46],
    ['.domestic-validation-copy', 16],
    ['.domestic-proof-grid', 24],
    ['.poster-a', 14],
    ['.poster-b', 28],
    ['.poster-c', 40],
    ['.section-heading h2', 18],
    ['.thesis-grid', 14],
    ['.metric-stage', 20],
    ['.xinshu-proof', 26],
    ['.works-header', 12],
    ['.work-scroller', 22],
    ['.pipeline', 16],
    ['.system-flow', 14],
    ['.product-proof-heading', 12],
    ['.product-deck', 30],
    ['.moat-layout', 16],
    ['.calculator', 22],
    ['.split-model', 15],
    ['.month-line', 18],
    ['.decision-rule', 12],
    ['.founder-layout', 22],
    ['.founder-timeline', 18],
    ['.team-grid', 15],
    ['.funding-summary', 16],
    ['.funding-paths', 22],
    ['.use-of-funds', 15],
    ['.closing-section > h2', 28],
    ['.closing-copy', 15],
    ['.closing-values', 22]
  ];

  parallaxPlan.forEach(function (entry) {
    document.querySelectorAll(entry[0]).forEach(function (element) {
      element.classList.add('parallax-layer');
      parallaxItems.push({ element: element, speed: entry[1] });
    });
  });

  function renderParallax() {
    parallaxFrame = 0;
    if (reduceMotion.matches) {
      parallaxItems.forEach(function (item) {
        item.element.style.setProperty('--parallax-y', '0px');
      });
      return;
    }

    var viewportHeight = window.innerHeight || 1;
    var intensity = window.innerWidth <= 700 ? 0.48 : 1;
    parallaxItems.forEach(function (item) {
      var rect = item.element.getBoundingClientRect();
      if (rect.bottom < -viewportHeight || rect.top > viewportHeight * 2) return;
      var distance = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
      var limited = Math.max(-1.15, Math.min(1.15, distance));
      var shift = -limited * item.speed * intensity;
      item.element.style.setProperty('--parallax-y', shift.toFixed(2) + 'px');
    });
  }

  function requestParallax() {
    if (parallaxFrame) return;
    parallaxFrame = window.requestAnimationFrame(renderParallax);
  }

  window.addEventListener('scroll', requestParallax, { passive: true });
  window.addEventListener('resize', requestParallax, { passive: true });
  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', requestParallax);
  }
  renderParallax();

  function initAutoScroller(selector, speed) {
    var scroller = document.querySelector(selector);
    if (!scroller) return;

    var originalItems = Array.prototype.slice.call(scroller.children);
    if (originalItems.length < 2) return;

    var frame = 0;
    var resumeTimer = 0;
    var lastTime = 0;
    var position = 0;
    var isVisible = false;
    var isHovered = false;
    var hasLoopCopies = false;

    function hasOverflow() {
      return scroller.scrollWidth - scroller.clientWidth > 8;
    }

    function addLoopCopies() {
      if (hasLoopCopies || !hasOverflow()) return;
      originalItems.forEach(function (item) {
        var copy = item.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.querySelectorAll('a, button, input, select, textarea').forEach(function (control) {
          control.tabIndex = -1;
        });
        scroller.appendChild(copy);
      });
      hasLoopCopies = true;
      scroller.classList.add('continuous-carousel');
    }

    function stop() {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(resumeTimer);
      frame = 0;
      resumeTimer = 0;
      lastTime = 0;
    }

    function loopWidth() {
      if (!hasLoopCopies) return 0;
      return scroller.children[originalItems.length].offsetLeft - originalItems[0].offsetLeft;
    }

    function normalizePosition() {
      var width = loopWidth();
      if (!width) return;
      position = scroller.scrollLeft;
      while (position >= width) position -= width;
      while (position < 0) position += width;
      scroller.scrollLeft = position;
    }

    function glide(now) {
      if (!hasOverflow() || reduceMotion.matches || !isVisible || isHovered) {
        stop();
        return;
      }
      if (!lastTime) lastTime = now;
      var elapsed = Math.min(64, now - lastTime);
      lastTime = now;
      position += (speed * elapsed) / 1000;
      var width = loopWidth();
      if (width && position >= width) position -= width;
      scroller.scrollLeft = position;
      frame = window.requestAnimationFrame(glide);
    }

    function start(delay) {
      stop();
      if (!hasOverflow() || reduceMotion.matches || !isVisible || isHovered) return;
      addLoopCopies();
      resumeTimer = window.setTimeout(function () {
        position = scroller.scrollLeft;
        lastTime = 0;
        frame = window.requestAnimationFrame(glide);
      }, delay || 0);
    }

    scroller.addEventListener('pointerdown', stop, { passive: true });
    scroller.addEventListener(
      'pointerup',
      function () {
        normalizePosition();
        start(1600);
      },
      { passive: true }
    );
    scroller.addEventListener(
      'touchend',
      function () {
        normalizePosition();
        start(1600);
      },
      { passive: true }
    );
    scroller.addEventListener(
      'wheel',
      function () {
        stop();
        normalizePosition();
        start(1800);
      },
      { passive: true }
    );
    if (window.innerWidth > 700 && window.matchMedia('(hover: hover)').matches) {
      scroller.addEventListener('mouseenter', function () {
        isHovered = true;
        stop();
      });
      scroller.addEventListener('mouseleave', function () {
        isHovered = false;
        normalizePosition();
        start(900);
      });
    }
    scroller.addEventListener('focusin', stop);
    scroller.addEventListener('focusout', function () {
      start(1600);
    });

    var visibilityObserver = new IntersectionObserver(
      function (entries) {
        isVisible = entries[0].isIntersecting;
        if (isVisible) start(500);
        else stop();
      },
      { threshold: 0.2 }
    );
    visibilityObserver.observe(scroller);

    window.addEventListener(
      'resize',
      function () {
        normalizePosition();
        start(500);
      },
      { passive: true }
    );

    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', function () {
        if (reduceMotion.matches) stop();
        else start(500);
      });
    }
  }

  initAutoScroller('.domestic-proof-grid', 18);
  initAutoScroller('.work-scroller', 22);
  initAutoScroller('.founder-gallery', 20);

  var productDeck = document.querySelector('[data-product-deck]');
  if (productDeck) {
    var productCards = Array.prototype.slice.call(
      productDeck.querySelectorAll('[data-product-card]')
    );
    var productTabs = Array.prototype.slice.call(
      productDeck.querySelectorAll('[data-product-tab]')
    );
    var productCounter = productDeck.querySelector('[data-product-counter]');
    var productIndex = 0;
    var touchStartX = 0;
    var productTimer = 0;
    var productVisible = false;
    var productHovered = false;

    function formatDeckNumber(value) {
      return String(value).padStart(2, '0');
    }

    function showProductCard(nextIndex, focusTab) {
      productIndex = (nextIndex + productCards.length) % productCards.length;
      productCards.forEach(function (card, cardIndex) {
        var depth = (cardIndex - productIndex + productCards.length) % productCards.length;
        var isFront = depth === 0;
        card.dataset.depth = String(depth);
        card.setAttribute('aria-hidden', String(!isFront));
        card.querySelectorAll('a, button').forEach(function (control) {
          control.tabIndex = isFront ? 0 : -1;
        });
      });
      productTabs.forEach(function (tab, tabIndex) {
        var isActive = tabIndex === productIndex;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
      });
      productCounter.textContent =
        formatDeckNumber(productIndex + 1) + ' / ' + formatDeckNumber(productCards.length);
      if (focusTab) productTabs[productIndex].focus({ preventScroll: true });
    }

    function stopProductDeck() {
      window.clearTimeout(productTimer);
      productTimer = 0;
    }

    function startProductDeck(delay) {
      stopProductDeck();
      if (!productVisible || productHovered || reduceMotion.matches) return;
      productTimer = window.setTimeout(function tick() {
        showProductCard(productIndex + 1, false);
        productTimer = window.setTimeout(tick, 4600);
      }, delay || 4600);
    }

    productTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        showProductCard(Number(tab.dataset.productTab), false);
        startProductDeck(6400);
      });
    });

    productDeck.querySelector('[data-product-prev]').addEventListener('click', function () {
      showProductCard(productIndex - 1, false);
      startProductDeck(6400);
    });
    productDeck.querySelector('[data-product-next]').addEventListener('click', function () {
      showProductCard(productIndex + 1, false);
      startProductDeck(6400);
    });

    productDeck.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      showProductCard(productIndex + (event.key === 'ArrowRight' ? 1 : -1), true);
      startProductDeck(6400);
    });

    productDeck.addEventListener(
      'touchstart',
      function (event) {
        stopProductDeck();
        touchStartX = event.changedTouches[0].clientX;
      },
      { passive: true }
    );
    productDeck.addEventListener(
      'touchend',
      function (event) {
        var travel = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(travel) >= 52) {
          showProductCard(productIndex + (travel < 0 ? 1 : -1), false);
        }
        startProductDeck(6400);
      },
      { passive: true }
    );

    if (window.innerWidth > 700 && window.matchMedia('(hover: hover)').matches) {
      productDeck.addEventListener('mouseenter', function () {
        productHovered = true;
        stopProductDeck();
      });
      productDeck.addEventListener('mouseleave', function () {
        productHovered = false;
        startProductDeck(4600);
      });
    }
    productDeck.addEventListener('focusin', stopProductDeck);
    productDeck.addEventListener('focusout', function () {
      startProductDeck(6400);
    });

    var productVisibilityObserver = new IntersectionObserver(
      function (entries) {
        productVisible = entries[0].isIntersecting;
        if (productVisible) startProductDeck(4600);
        else stopProductDeck();
      },
      { threshold: 0.25 }
    );
    productVisibilityObserver.observe(productDeck);

    showProductCard(0, false);
  }

  updateEconomics(100);
})();
