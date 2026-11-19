(function ($) {
  "use strict";
  function brighthub_section_sticky_scroll() {
    if($('.pxl-section-sticky-top').length > 0 && $('.pxl-section-sticky-bottom').length > 0) {
        ScrollTrigger.matchMedia({
            "(min-width: 991px)": function() {
                const pinnedSections = ['.pxl-section-sticky-top'];
                pinnedSections.forEach(className => {
                    gsap.to(".pxl-section-sticky-bottom", {
                        scrollTrigger: {
                            trigger: ".pxl-section-sticky-bottom",
                            scrub: true,
                            pin: className,
                            pinSpacing: false,
                            start: 'top bottom',
                            end: "bottom top",
                        },
                    });
                });
            }
        });
    }
  }

  function brighthub_split_text($scope) {
    setTimeout(function () {
      var st = $scope.find(".pxl-split-text");
      if (st.length == 0) return;
      gsap.registerPlugin(SplitText);
      st.each(function (index, el) {
        el.split = new SplitText(el, {
          type: "lines,words,chars",
          linesClass: "split-line"
        });
        gsap.set(el, { perspective: 400 });

        if ($(el).hasClass("split-in-fade")) {
          $(el).addClass("active");
          gsap.set(el.split.chars, {
            opacity: 0,
            ease: "Back.easeOut"
          });
        }
        if ($(el).hasClass("split-in-right")) {
          gsap.set(el.split.chars, {
            opacity: 0,
            x: "50",
            ease: "Back.easeOut"
          });
        }
        if ($(el).hasClass("split-in-left")) {
          gsap.set(el.split.chars, {
            opacity: 0,
            x: "-50",
            ease: "circ.out"
          });
        }
        if ($(el).hasClass("split-in-up")) {
          gsap.set(el.split.chars, {
            opacity: 0,
            y: "80",
            ease: "circ.out"
          });
        }
        if ($(el).hasClass("split-in-down")) {
          gsap.set(el.split.chars, {
            opacity: 0,
            y: "-80",
            ease: "circ.out"
          });
        }
        if ($(el).hasClass("split-in-rotate")) {
          gsap.set(el.split.chars, {
            opacity: 0,
            rotateX: "50deg",
            ease: "circ.out"
          });
        }
        if ($(el).hasClass("split-in-scale")) {
          gsap.set(el.split.chars, {
            opacity: 0,
            scale: "0.5",
            ease: "circ.out"
          });
        }
        el.anim = gsap.to(el.split.chars, {
          scrollTrigger: {
            trigger: el,
            toggleActions: "restart pause resume reverse",
            start: "top 90%"
          },
          x: "0",
          y: "0",
          rotateX: "0",
          scale: 1,
          opacity: 1,
          duration: 0.8,
          stagger: 0.02
        });
      });
    }, 200);
  }
  function brighthub_scroll_text($scope) {
    $scope.find(".pxl-heading__title.pxl-heading__style-scroll-bg").each(function () {
      var $container = $(this).find(".pxl-heading__text");

      var text = new SplitText($container[0], { type: "words, chars" });

      $(text.words).children().first().addClass("first-char");

      gsap.fromTo(
        text.chars,
        {
          position: "relative",
          display: "inline-block",
          opacity: 0.2,
          x: -5
        },
        {
          opacity: 1,
          x: 0,
          stagger: 0.1,
          scrollTrigger: {
            trigger: $container[0],
            toggleActions: "play pause reverse pause",
            start: "top 70%",
            end: "top 40%",
            scrub: 0.7
          }
        }
      );
    });
  }
  function brighthub_scroll_line($scope) {
    $scope.find(".pxl-heading__title.pxl-heading__style-scroll-line").each(function () {
      var $container = $(this).find(".pxl-heading__text");
      const lines_list = new SplitText($container[0], {
        type: "lines",
        linesClass: "split-line"
      });
      gsap.fromTo(
        lines_list.lines,
        {
          position: "relative",
          display: "inline-block",
          opacity: 0.2,
          x: -5
        },
        {
          opacity: 1,
          x: 0,
          stagger: 0.1,
          scrollTrigger: {
            trigger: $container[0],
            toggleActions: "play pause reverse pause",
            start: "top 70%",
            end: "top 40%",
            scrub: 0.7
          }
        }
      );
    });
  }
  function brighthub_coin_marquee($scope) {
    const coinData = async () => {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=300&page=1&sparkline=false"
      );
      return await response.json();
    };

    coinData().then(function (data) {
      const totalItems = data.length;

      $scope.find(".pxl-marquee--coin").each(function () {
        const container = $(this);
        const listCount = parseInt(container.data("list-number"));
        const itemsPerList = Math.ceil(totalItems / listCount);

        for (let i = 0; i < listCount; i++) {
          const list = container.find(`.pxl-marquee__list--${i}`);
          const startIndex = i * itemsPerList;
          const endIndex = Math.min(startIndex + itemsPerList, totalItems);
          const selectedItems = data.slice(startIndex, endIndex);

          selectedItems.forEach(function (item) {
            const html = `
              <li class="pxl-marquee__item">
                <img src="${item.image}" alt="${item.name}" />
                <span class="pxl-marquee__item-wrapper">
                  <span class="pxl-marquee__item-name">${item.name}</span>
                  <span class="pxl-marquee__item-price-wrapper">
                    <span class="pxl-marquee__item-price">${item.current_price}$</span>
                    <span class="pxl-marquee__item-percent ${
                      item.price_change_percentage_24h > 0 ? "increase" : "decrease"
                    }">
                      ${item.price_change_percentage_24h.toFixed(2)}%
                    </span>
                  </span>
                </span>
              </li>
            `;
            list.append(html);
          });
        }
      });
    });
  }

  function brighthub_scroll_line_gradient($scope) {
    $scope.find(".pxl-heading__title.pxl-heading__style-scroll-gradient").each(function () {
      var $container = $(this).find(".pxl-heading__text");

      const lines_list = new SplitText($container[0], {
        type: "lines",
        linesClass: "split-line"
      });

      $container.hasClass("pxl-heading__has-quote") &&
        $container.append(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="41" viewBox="0 0 40 41" fill="none" class="quote-svg quote-svg-left">
            <path d="M40 17.7298L31.4286 17.7298L37.1429 6.30127L28.5715 6.30127L22.8572 17.7298L22.8572 34.8726H40L40 17.7298Z" fill="white"/>
            <path d="M17.1428 34.8727L17.1428 17.7298L8.57142 17.7298L14.2857 6.3013L5.71433 6.3013L1.49867e-06 17.7298L0 34.8727L17.1428 34.8727Z" fill="white"/>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="41" viewBox="0 0 40 41" fill="none" class="quote-svg quote-svg-right">
            <path d="M0 23.4441H8.57142L2.8571 34.8727H11.4285L17.1428 23.4441V6.3013H0V23.4441Z" fill="url(#paint0_linear_3714_7182)"/>
            <path d="M22.8572 6.30127V23.4441H31.4286L25.7143 34.8726H34.2857L40 23.4441V6.30127H22.8572Z" fill="url(#paint1_linear_3714_7182)"/>
            <defs>
              <linearGradient id="paint0_linear_3714_7182" x1="40" y1="34.5869" x2="1.34047e-07" y2="6.58692" gradientUnits="userSpaceOnUse">
                <stop stop-color="#A7FFA4"/>
                <stop offset="1" stop-color="white"/>
              </linearGradient>
              <linearGradient id="paint1_linear_3714_7182" x1="40" y1="34.5869" x2="1.34047e-07" y2="6.58692" gradientUnits="userSpaceOnUse">
                <stop stop-color="#A7FFA4"/>
                <stop offset="1" stop-color="white"/>
              </linearGradient>
            </defs>
          </svg>
      `);

      // Scroll animation
      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: $container[0],
          toggleActions: "play pause reverse pause",
          start: "top 70%",
          end: "top 40%",
          scrub: 0.7
        }
      });

      lines_list.lines.forEach((line) => {
        tl.fromTo(
          line,
          { backgroundPosition: "100% 100%" },
          {
            backgroundPosition: "0% 100%",
            duration: 0.5,
            ease: "none"
          },
          ">0"
        );
      });
    });
  }

  var brighthub_physics = function ($scope) {
    const logoArea = $scope[0]?.querySelector(".pxl-physics");
    if (!logoArea) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: logoArea,
      start: "top 80%",
      once: true,
      onEnter: () => {
        runPhysicsEffect(logoArea);
      }
    });
  };

  function runPhysicsEffect(logoArea) {
    const { Engine, Render, Runner, Bodies, Composite, MouseConstraint, Events } = Matter;

    let settings = [];
    try {
      settings = JSON.parse(logoArea.getAttribute("data-settings").replace(/&quot;/g, '"'));
    } catch (err) {
      return;
    }

    const w = logoArea.offsetWidth;
    const h = logoArea.offsetHeight;

    const engine = Engine.create();
    engine.world.gravity.y = 0.7;

    const render = Render.create({
      element: logoArea,
      engine: engine,
      options: {
        width: w,
        height: h,
        background: "rgba(0,0,0,0)",
        wireframes: false,
        pixelRatio: window.devicePixelRatio
      }
    });

    const wallOptions = { isStatic: true, render: { visible: false } };
    const ceiling = Bodies.rectangle(w / 2, -10, w, 10, wallOptions);
    const ground = Bodies.rectangle(w / 2, h + 10, w, 10, wallOptions);
    const leftWall = Bodies.rectangle(-10, h / 2, 10, h, wallOptions);
    const rightWall = Bodies.rectangle(w + 10, h / 2, 10, h, wallOptions);

    const pastelColors = [
      "#fdf49c",
      "#c6f0c0",
      "#f8c7ec",
      "#c1e8f9",
      "#e2dbf7",
      "#ffd1a9",
      "#d3f9d8",
      "#e3f2fd",
      "#fbe3e8",
      "#f5f5dc"
    ];

    const predefinedStates = [
      { x: 80, y: 50, angle: -0.5 },
      { x: 220, y: 55, angle: 0.1 },
      { x: 145, y: 105, angle: -0.7 },
      { x: 215, y: 135, angle: 0.3 },
      { x: 85, y: 145, angle: 0 }
    ];

    const shapes = [];

    settings.forEach((value, index) => {
      const { x, y, angle } = predefinedStates[index] || { x: 100, y: 100, angle: 0 };

      const textElement = document.createElement("p");
      textElement.className = "pxl-throwable-element";
      Object.assign(textElement.style, {
        position: "absolute",
        opacity: "1",
        borderRadius: "9999px",
        fontSize: "14px",
        fontWeight: "600",
        color: "black",
        textAlign: "center",
        padding: "10px 22px",
        lineHeight: "1.2",
        pointerEvents: "none",
        userSelect: "none",
        whiteSpace: "nowrap",
        backgroundColor: pastelColors[index % pastelColors.length],
        margin: "0"
      });
      textElement.innerText = value;
      logoArea.appendChild(textElement);

      // Đo kích thước phần tử vừa gắn vào
      const { width: boxWidth, height: boxHeight } = textElement.getBoundingClientRect();

      const shape = Bodies.rectangle(x, y, boxWidth, boxHeight, {
        angle,
        restitution: 0.3,
        friction: 0.8,
        render: { visible: false }
      });

      shapes.push({ body: shape, element: textElement });
    });

    const mouseControl = MouseConstraint.create(engine, {
      element: logoArea,
      constraint: { render: { visible: false } }
    });

    window.addEventListener("mouseup", () => {
      mouseControl.mouse.button = -1;
    });
    window.addEventListener("blur", () => {
      mouseControl.mouse.button = -1;
    });

    Composite.add(engine.world, [
      ceiling,
      ground,
      leftWall,
      rightWall,
      mouseControl,
      ...shapes.map((s) => s.body)
    ]);

    Render.run(render);
    Runner.run(Runner.create(), engine);

    Events.on(engine, "afterUpdate", () => {
      shapes.forEach(({ body, element }) => {
        element.style.left = `${body.position.x}px`;
        element.style.top = `${body.position.y}px`;
        element.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
      });
    });
  }

  class WebGLContextManager {
    constructor() {
      this.activeContexts = new Map();
      this.maxContexts = 4;
    }

    createContext(canvas, contextType = "2d") {
      const id = canvas.dataset.canvasId || this.generateId();
      canvas.dataset.canvasId = id;

      this.cleanup(id);

      if (this.activeContexts.size >= this.maxContexts) {
        this.cleanupOldest();
      }

      const context = canvas.getContext(contextType, {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "low-power"
      });

      if (context) {
        this.activeContexts.set(id, {
          canvas,
          context,
          type: contextType,
          created: Date.now()
        });
      }

      return context;
    }

    cleanup(id) {
      const contextData = this.activeContexts.get(id);
      if (contextData) {
        const { canvas, context, type } = contextData;

        if (type === "webgl" || type === "webgl2") {
          const ext = context.getExtension("WEBGL_lose_context");
          if (ext) {
            ext.loseContext();
          }
        }

        canvas.width = 1;
        canvas.height = 1;

        this.activeContexts.delete(id);
      }
    }

    cleanupOldest() {
      if (this.activeContexts.size === 0) return;

      let oldestId = null;
      let oldestTime = Date.now();

      for (const [id, data] of this.activeContexts) {
        if (data.created < oldestTime) {
          oldestTime = data.created;
          oldestId = id;
        }
      }

      if (oldestId) {
        this.cleanup(oldestId);
      }
    }

    cleanupAll() {
      for (const id of this.activeContexts.keys()) {
        this.cleanup(id);
      }
    }

    generateId() {
      return "canvas_" + Math.random().toString(36).substr(2, 9);
    }
  }
  const contextManager = new WebGLContextManager();

  function initBlobEffect() {
    contextManager.cleanupAll();

    const isLowPerformanceDevice = () => {
      return navigator.hardwareConcurrency < 4 || !window.requestAnimationFrame;
    };

    if (isLowPerformanceDevice()) {
      return;
    }

    const activeAnimations = new Set();
    let globalAnimationId = null;

    function createSingleEffect($canvas) {
      const canvas = $canvas[0];
      const canvasId = contextManager.generateId();
      canvas.dataset.canvasId = canvasId;
      const ctx = contextManager.createContext(canvas, "2d");
      if (!ctx) {
        return null;
      }

      let width = 0,
        height = 0;
      let dots = [];
      let mouseX = -9999,
        mouseY = -9999;
      let isVisible = true;

      const dotCount = parseInt($canvas.data("star")) || 60;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const wasVisible = isVisible;
            isVisible = entry.isIntersecting;
            if (isVisible && !wasVisible) {
              activeAnimations.add(canvasId);
              if (!globalAnimationId) {
                globalAnimationId = requestAnimationFrame(globalAnimationLoop);
              }
            } else if (!isVisible && wasVisible) {
              activeAnimations.delete(canvasId);
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: "50px"
        }
      );

      observer.observe(canvas);

      let resizeTimeout;
      function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (canvas.parentNode) {
            gsap.set(canvas, { autoAlpha: 0 });
            waitForStableRect(canvas, () => {
              resizeCanvas();
              createInitialDots(dotCount);
              updateDots();
              requestAnimationFrame(() => {
                gsap.to(canvas, {
                  autoAlpha: 1,
                  duration: 2,
                  ease: "power2.out"
                });
              });
            });
          }
        }, 250);
      }

      function waitForStableRect(canvas, callback) {
        let tries = 0;
        const maxTries = 10;
        let lastRect = canvas.getBoundingClientRect();

        function check() {
          const newRect = canvas.getBoundingClientRect();
          const same =
            Math.abs(newRect.width - lastRect.width) < 1 &&
            Math.abs(newRect.height - lastRect.height) < 1;

          if (same || tries >= maxTries) {
            callback();
          } else {
            lastRect = newRect;
            tries++;
            requestAnimationFrame(check);
          }
        }

        requestAnimationFrame(check);
      }

      function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        let safeWidth = Math.min(rect.width, 1920);
        let safeHeight = Math.min(rect.height, 1080);

        if (safeWidth < 10 || safeHeight < 10) {
          safeWidth = 300;
          safeHeight = 150;
        }

        canvas.width = safeWidth * dpr;
        canvas.height = safeHeight * dpr;
        canvas.style.width = safeWidth + "px";
        canvas.style.height = safeHeight + "px";

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        width = safeWidth;
        height = safeHeight;
      }

      function createDot(x, y) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = 0.05 + Math.random() * 0.1;

        return {
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 0.5 + Math.random() * 1,
          phase: Math.random() * Math.PI * 2,
          baseOpacity: 0.3 + Math.random() * 0.4,
          opacitySpeed: 0.5 + Math.random() * 0.8
        };
      }

      function createInitialDots(count) {
        dots = [];
        for (let i = 0; i < count; i++) {
          dots.push(createDot(Math.random() * width, Math.random() * height));
        }
      }

      function updateDots() {
        if (!isVisible || !ctx || width === 0 || height === 0) return;

        ctx.clearRect(0, 0, width, height);

        const t = performance.now() * 0.001;
        const color = $canvas.data("color") || "#ffffff";

        const hex2rgba = (hex, alpha) => {
          if (!hex) return `rgba(255,255,255,${alpha})`;
          if (hex[0] === "#") hex = hex.substring(1);

          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);

          return `rgba(${r},${g},${b},${alpha})`;
        };

        dots = dots.filter(
          (dot) => dot.x >= -10 && dot.x <= width + 10 && dot.y >= -10 && dot.y <= height + 10
        );

        while (dots.length < dotCount) {
          dots.push(createDot(Math.random() * width, Math.random() * height));
        }

        dots.forEach((dot) => {
          const pulse = Math.sin(t * dot.opacitySpeed + dot.phase);
          const currentOpacity = Math.max(0, Math.min(1, dot.baseOpacity + pulse * 0.2));

          dot.x += dot.vx;
          dot.y += dot.vy;

          const dx = mouseX - dot.x;
          const dy = mouseY - dot.y;
          const distSq = dx * dx + dy * dy;
          const maxInfluenceSq = 100 * 100;

          if (distSq < maxInfluenceSq && distSq > 1) {
            const influence = (1 - distSq / maxInfluenceSq) * 0.008;
            dot.vx += dx * influence;
            dot.vy += dy * influence;
            dot.vx *= 0.99;
            dot.vy *= 0.99;
          }

          if (dot.x < -5) dot.x = width + 5;
          if (dot.x > width + 5) dot.x = -5;
          if (dot.y < -5) dot.y = height + 5;
          if (dot.y > height + 5) dot.y = -5;

          const edgeMargin = 80;
          const distToLeft = Math.max(0, edgeMargin - dot.x);
          const distToRight = Math.max(0, dot.x - (width - edgeMargin));
          const distToTop = Math.max(0, edgeMargin - dot.y);
          const distToBottom = Math.max(0, dot.y - (height - edgeMargin));

          const maxEdgeDist = Math.max(distToLeft, distToRight, distToTop, distToBottom);
          const edgeFade =
            maxEdgeDist > 0 ? Math.max(0, Math.pow(1 - maxEdgeDist / edgeMargin, 2)) : 1;

          const finalOpacity = currentOpacity * edgeFade;

          ctx.fillStyle = hex2rgba(color, finalOpacity);
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
          ctx.fill();

          if (finalOpacity > 0.3) {
            const glowOpacity = finalOpacity * 0.2;
            ctx.fillStyle = hex2rgba(color, glowOpacity);
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dot.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      canvas.addEventListener(
        "mouseleave",
        () => {
          mouseX = -9999;
          mouseY = -9999;
        },
        { passive: true }
      );

      window.addEventListener("resize", handleResize, { passive: true });

      waitForStableRect(canvas, () => {
        gsap.set(canvas, { autoAlpha: 0 });
        waitForStableRect(canvas, () => {
          resizeCanvas();
          createInitialDots(dotCount);
          updateDots();
          requestAnimationFrame(() => {
            gsap.to(canvas, {
              autoAlpha: 1,
              duration: 2,
              ease: "power2.out"
            });
          });
        });
        requestAnimationFrame(() => {});
      });

      activeAnimations.add(canvasId);

      function cleanup() {
        observer.disconnect();
        activeAnimations.delete(canvasId);
        contextManager.cleanup(canvasId);

        window.removeEventListener("resize", handleResize);

        clearTimeout(resizeTimeout);
      }

      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node === canvas || (node.contains && node.contains(canvas))) {
              cleanup();
            }
          });
        });
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      return {
        update: updateDots,
        cleanup: cleanup,
        id: canvasId
      };
    }

    function globalAnimationLoop() {
      if (activeAnimations.size === 0) {
        globalAnimationId = null;
        return;
      }

      $(".pxl-star").each(function () {
        const canvasId = this.dataset.canvasId;
        if (activeAnimations.has(canvasId)) {
          const effectInstance = $(this).data("effectInstance");
          if (effectInstance && effectInstance.update) {
            effectInstance.update();
          }
        }
      });

      globalAnimationId = requestAnimationFrame(globalAnimationLoop);
    }

    $(".pxl-star").each(function () {
      const $canvas = $(this);

      const existingEffect = $canvas.data("effectInstance");
      if (existingEffect && existingEffect.cleanup) {
        existingEffect.cleanup();
      }

      const effectInstance = createSingleEffect($canvas);
      if (effectInstance) {
        $canvas.data("effectInstance", effectInstance);
      }
    });

    if (activeAnimations.size > 0 && !globalAnimationId) {
      globalAnimationId = requestAnimationFrame(globalAnimationLoop);
    }
  }
  function brighthub_text_animation($scope) {
    $scope.find(".pxl-heading").each(function () {
      var animationType = $(this).data("animation-type") || "";
      $(this).animatedHeadline({
        animationType: animationType
      });
    });
  }

  function brighthub_highlight_line_bottom($scope) {
    var $random_id = Math.random().toString(36).substring(2, 15);
    $scope.find(".pxl-heading__highlight-line-bottom").each(function () {
      const svgMarkup = `
        <svg xmlns="http://www.w3.org/2000/svg" width="211" height="15" viewBox="0 0 211 15" fill="none">
          <path d="M2.33889 14.9788C55.5174 7.83478 109.179 3.58158 163.16 3.4522C178.528 3.41466 193.858 3.62154 209.224 3.884C210.876 3.92981 210.942 2.02586 209.315 1.90576C181.932 -0.114952 154.17 -0.400643 126.703 0.450308C99.7006 1.27806 72.7749 3.22863 46.0425 6.2936C31.1432 8.01123 16.3198 10.0855 1.63537 12.6785C-0.289549 13.0206 0.426526 15.2394 2.33889 14.9788Z" fill="url(#paint0_linear_3803_8970)"/>
          <defs>
          <linearGradient id="paint0_linear_3803_8970_${$random_id}" x1="0.5" y1="7.5" x2="210.5" y2="7.5" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CF208B"/>
          <stop offset="1" stop-color="#791599"/>
          </linearGradient>
          </defs>
        </svg>`;
      $(this).find(".pxl-heading__highlight").append(svgMarkup);
      $(this)
        .find(".pxl-heading__highlight svg path")
        .attr("fill", `url(#paint0_linear_3803_8970_${$random_id})`);
    });
  }

  $(window).on("beforeunload", () => {
    contextManager.cleanupAll();
  });

  function brighthub_pricing_sticky($scope) {
    const listFeature = $scope.find(".pxl-pricing-sticky__layout-1");
    if (listFeature.length === 0) return;

    const items = listFeature.find(".pxl-pricing");
    if (items.length === 0) return;
    const items_active = items.slice(0, -1);
    const instanceId = "pricing-sticky-" + Math.random().toString(36).substr(2, 9);

    const baseThreshold = parseInt($scope.data("top-offset")) || 100;
    const topNextItem = parseInt($scope.data("top-next-item")) || 100;
    const totalItems = items_active.length;
    const opacityStep = 100 / totalItems;

    items_active.each(function (index) {
      const item = $(this);
      const itemTop = index === 0 ? baseThreshold : baseThreshold + topNextItem * index;
      item.css("top", itemTop + "px");
    });

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Đầu tiên, kiểm tra và cập nhật trạng thái done cho tất cả items
          items_active.each(function (index) {
            const item = $(this);
            const rect = this.getBoundingClientRect();

            const itemThreshold = index === 0 ? baseThreshold : baseThreshold + topNextItem * index;

            if (rect.bottom > 0) {
              const tolerance = 5;
              const isStickyAtThreshold = rect.top <= itemThreshold + tolerance;

              if (isStickyAtThreshold) {
                item.addClass("active");

                if (index < items.length - 1) {
                  const nextItem = items.eq(index + 1);
                  const nextItemRect = nextItem[0].getBoundingClientRect();
                  const currentItemHeight = rect.height;
                  const halfCurrentItemHeight = currentItemHeight / 2;

                  const currentItemThreshold = itemThreshold;
                  const doneThreshold = currentItemThreshold + halfCurrentItemHeight;

                  const hasNextItemScrolledHalf = nextItemRect.top <= doneThreshold;

                  if (hasNextItemScrolledHalf) {
                    item.addClass("done");
                  } else {
                    item.removeClass("done");
                  }

                  const nextItemThreshold =
                    index + 1 === 0 ? baseThreshold : baseThreshold + topNextItem * (index + 1);
                  if (nextItemRect.top > nextItemThreshold && nextItemRect.bottom > 0) {
                    nextItem.addClass("scrolling");
                  } else {
                    nextItem.removeClass("scrolling");
                  }
                }
              } else {
                item.removeClass("active");
                item.removeClass("done");
                item.removeClass("scrolling");
              }
            } else {
              item.removeClass("active");
              item.removeClass("done");
              item.removeClass("scrolling");
            }
          });

          const doneItems = [];
          items_active.each(function (index) {
            if ($(this).hasClass("done")) {
              doneItems.push({ item: $(this), index: index });
            }
          });
          const doneCount = doneItems.length;
          const minOpacity = 0.3;
          const maxOpacity = 0.7;

          if (doneCount > 0) {
            doneItems.forEach(function (doneItem, index) {
              const item = doneItem.item;
              const positionFromLast = doneCount - 1 - index;

              let opacity;
              if (doneCount === 1) {
                opacity = maxOpacity;
              } else {
                const opacityRange = maxOpacity - minOpacity;
                const step = opacityRange / (doneCount - 1);
                opacity = maxOpacity - step * positionFromLast;
              }
              item.css("opacity", opacity);
            });
          }

          items_active.not(".done").css("opacity", 1);

          ticking = false;
        });
        ticking = true;
      }
    };

    const scrollHandler = () => handleScroll();
    const resizeHandler = () => {
      setTimeout(handleScroll, 50);
    };

    $(window).on("scroll." + instanceId, scrollHandler);
    $(window).on("resize." + instanceId, resizeHandler);

    setTimeout(handleScroll, 200);

    $scope.on("remove", function () {
      $(window).off("scroll." + instanceId);
      $(window).off("resize." + instanceId);
    });
  }

  $(window).on("elementor/frontend/init", function () {
    brighthub_section_sticky_scroll();

    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_heading.default",
      function ($scope) {
        brighthub_split_text($scope);
        brighthub_scroll_text($scope);
        brighthub_scroll_line($scope);
        brighthub_scroll_line_gradient($scope);
        brighthub_text_animation($scope);
        brighthub_highlight_line_bottom($scope);
      }
    );
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_physics.default",
      brighthub_physics
    );
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_coin_marquee.default",
      brighthub_coin_marquee
    );
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_pricing_sticky.default",
      brighthub_pricing_sticky
    );
    elementorFrontend.hooks.addAction("frontend/element_ready/global", function () {
      setTimeout(() => {
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          initBlobEffect();
        }
      }, 300);
    });
  });
})(jQuery);
