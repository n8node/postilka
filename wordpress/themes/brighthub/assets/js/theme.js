(function ($) {
  "use strict";

  // Performance optimizations
  var pxl_scroll_top;
  var pxl_window_height;
  var pxl_window_width;
  var pxl_scroll_status = "";
  var pxl_last_scroll_top = 0;

  // Cache frequently used selectors
  var $window = $(window);
  var $document = $(document);
  var $body = $("body");
  var $html = $("html");

  window.__pxlZoomSTs = window.__pxlZoomSTs || [];
  var __pxlZoomResizeTimeout = null;

  // Throttle function for performance
  function throttle(func, wait) {
    var timeout;
    return function () {
      var context = this,
        args = arguments;
      if (!timeout) {
        timeout = setTimeout(function () {
          timeout = null;
          func.apply(context, args);
        }, wait);
      }
    };
  }

  // Debounce function for performance
  function debounce(func, wait, immediate) {
    var timeout;
    return function () {
      var context = this,
        args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  function pxlHasScrollTrigger() {
    return typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  }

  function pxlKillZoomTriggers() {
    if (!window.__pxlZoomSTs.length) return;
    window.__pxlZoomSTs.forEach(function (st) {
      if (st && typeof st.kill === "function") {
        try {
          st.kill(true);
        } catch (e) {}
      }
    });
    window.__pxlZoomSTs = [];
  }

  function pxlToNumber(v, def) {
    if (v == null || v === "") return def;
    var n = parseFloat(String(v).replace(/[^\-\d.]/g, ""));
    return Number.isFinite(n) ? n : def;
  }

  function pxlParseScale(section) {
    var ds = section.dataset.zoomScale;
    if (ds != null && ds !== "") return pxlToNumber(ds, 0.15);
    var legacy = section.dataset.zoomStart;
    if (legacy != null && legacy !== "") return pxlToNumber(legacy, 15) / 100;
    return 0.15;
  }

  function pxlScreenPos(section, key, fb) {
    var v = section.dataset[key];
    var pct = v != null && v !== "" ? pxlToNumber(v, fb) : fb;
    return "top " + pct + "%";
  }

  function pxlSafeAnimFromData(el) {
    var attr = el.getAttribute("data-settings");
    if (!attr) return null;
    try {
      var st = JSON.parse(attr);
      return st && (st._animation || st.animation) ? st._animation || st.animation : null;
    } catch (e) {
      return null;
    }
  }

  function pxlGetElAnimName(el) {
    var fromData = pxlSafeAnimFromData(el);
    if (fromData) return fromData;
    var classes = Array.prototype.slice.call(el.classList || []);
    var match = classes.find(function (cl) {
      return cl.indexOf("e-animations-") === 0;
    });
    return match ? match.replace("e-animations-", "") : null;
  }

  function pxlPlayElementorEntrance(el, name) {
    el.classList.remove("elementor-invisible");
    if (!name) return;
    if (!el.classList.contains("e-animated")) el.classList.add("e-animated");
    var cls = "e-animations-" + name;
    if (!el.classList.contains(cls)) el.classList.add(cls);
  }

  function pxlInitZoomScroll() {
    if (!pxlHasScrollTrigger()) return;
    gsap.registerPlugin(ScrollTrigger);

    pxlKillZoomTriggers();

    var prefersReduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.querySelectorAll(".scroll-item-zoom").forEach(function (section) {
      var minW = pxlToNumber(section.dataset.zoomMin, 0);
      var maxW = pxlToNumber(section.dataset.zoomMax, Infinity);
      var w = window.innerWidth;
      if (w < minW && w > maxW) return;

      if (prefersReduce && section.dataset.zoomIgnorePrm !== "1") return;

      var scaleStart = pxlParseScale(section);
      var yStart = pxlToNumber(section.dataset.zoomTop, 20);
      var startPos = pxlScreenPos(section, "zoomStartScreen", 80);
      var endPos = pxlScreenPos(section, "zoomEndScreen", 0);
      var showMarkers = !!section.dataset.zoomDebug;

      var origin =
        section.dataset.zoomOrigin && section.dataset.zoomOrigin.trim()
          ? section.dataset.zoomOrigin.trim()
          : "top center";

      var trigger = section;
      if (section.dataset.zoomTrigger) {
        var t =
          section.closest(section.dataset.zoomTrigger) ||
          section.querySelector(section.dataset.zoomTrigger);
        if (t) trigger = t;
      }

      section.style.transformOrigin = origin;
      section.style.willChange = "transform";

      var tween = gsap.fromTo(
        section,
        { scale: scaleStart, y: yStart },
        {
          scale: 1,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: trigger,
            start: startPos,
            end: endPos,
            scrub: 0,
            invalidateOnRefresh: true,
            markers: showMarkers,

            // 👉 Thêm toggle class "zoomed" khi kích hoạt / rời vùng trigger
            onToggle: function (self) {
              section.classList.toggle("zoomed", self.isActive);
            }
          }
        }
      );

      if (tween && tween.scrollTrigger) window.__pxlZoomSTs.push(tween.scrollTrigger);

      // Tự kích hoạt entrance animations của Elementor khi progress ~100%
      var targets = Array.from(section.querySelectorAll(":scope .elementor-element")).filter(
        function (el) {
          if (el === section) return false;
          return !!(
            pxlSafeAnimFromData(el) ||
            Array.from(el.classList).some(function (cl) {
              return cl.startsWith("e-animations-");
            }) ||
            el.classList.contains("elementor-invisible")
          );
        }
      );

      var played = false;
      var stPlay = ScrollTrigger.create({
        trigger: trigger,
        start: startPos,
        end: endPos,
        onUpdate: function (self) {
          if (!played && self.progress >= 0.99) {
            played = true;
            targets.forEach(function (el) {
              if (el.dataset.pxlPlayed === "1") return;
              el.dataset.pxlPlayed = "1";
              pxlPlayElementorEntrance(el, pxlGetElAnimName(el));
            });
          }
        }
      });
      window.__pxlZoomSTs.push(stPlay);
    });

    ScrollTrigger.refresh();
  }

  function pxlScheduleZoomScrollInit() {
    if (!pxlHasScrollTrigger()) return;
    clearTimeout(__pxlZoomResizeTimeout);
    __pxlZoomResizeTimeout = setTimeout(pxlInitZoomScroll, 200);
  }

  $window.on("load", function () {
    let preloader = $(".preloader");
    if (preloader.length) {
      if (preloader.hasClass("loader-style3")) {
        setTimeout(function () {
          $(".preloader").addClass("loaded").removeClass("loading");
        }, 3000);
      } else {
        $(".preloader").addClass("loaded").removeClass("loading");
      }
    }
    $(".pxl-loader").addClass("is-loaded");
    $(".pxl-swiper-slider, .pxl-header-mobile-elementor").css("opacity", "1");
    $(".pxl-gallery-scroll").parents("body").addClass("body-overflow").addClass("body-visible-sm");
    pxl_window_width = $(window).width();
    pxl_window_height = $(window).height();
    brighthub_header_sticky();
    brighthub_header_mobile();
    brighthub_scroll_to_top();
    brighthub_footer_fixed();
    brighthub_submenu_responsive();
    brighthub_panel_anchor_toggle();
    brighthub_post_grid();
    brighthub_header_left_scroll();
    brighthub_menu_divider_move();
  });

  var scrollHandler = throttle(function () {
    pxl_scroll_top = $window.scrollTop();
    pxl_window_height = $window.height();
    pxl_window_width = $window.width();
    if (pxl_scroll_top < pxl_last_scroll_top) {
      pxl_scroll_status = "up";
    } else {
      pxl_scroll_status = "down";
    }
    pxl_last_scroll_top = pxl_scroll_top;
    brighthub_header_sticky();
    brighthub_scroll_to_top();
    brighthub_footer_fixed();
    brighthub_ptitle_scroll_opacity();
    brighthub_header_left_scroll();
    if (pxl_scroll_top < 100) {
      $(".elementor > .pin-spacer").removeClass("scroll-top-active");
    }
  }, 16);

  $window.on("scroll", scrollHandler);

  var resizeHandler = debounce(function () {
    pxl_window_height = $window.height();
    pxl_window_width = $window.width();
    brighthub_submenu_responsive();
    brighthub_header_mobile();
    brighthub_post_grid();
    setTimeout(function () {
      brighthub_menu_divider_move();
    }, 500);
    pxlScheduleZoomScrollInit();
  }, 250);

  $window.on("resize", resizeHandler);

  if (document.readyState === "complete") {
    pxlInitZoomScroll();
  } else {
    $window.on("load.pxlZoomScroll", pxlInitZoomScroll);
  }

  $document.ready(function () {
    $(".preloader").addClass("loading");
    brighthub_el_parallax();
    brighthub_backtotop_progess_bar();
    brighthub_zoom_point();
    brighthub_smother_scroll();

    // Click remove active
    $(document).on("click", function () {
      $(".pxl-selects__options").removeClass("active");
    });

    $(document).on("click", function () {
      $(".pxl-selects__options").removeClass("active");
    });

    // Case select
    $(".pxl-selects").each(function () {
      var $select = $(this);
      $select.on("click", function (e) {
        e.stopPropagation();
        $(".pxl-selects__options").not($select.find("ul")).removeClass("active");
        $select.find("ul.pxl-selects__options").toggleClass("active");
      });

      $select.find("li.pxl-selects__option").on("click", function (e) {
        e.stopPropagation();

        $select.find("li.pxl-selects__option").removeClass("active");
        $(this).addClass("active");

        var newImg = $(this).find("img").attr("src");
        var newAlt = $(this).find("img").attr("alt") || "";
        var newText = $(this).find("span").text();

        var $current = $select.find(".pxl-selects__current");
        $current.find("img").attr("src", newImg).attr("alt", newAlt);
        $current.find("span").text(newText);

        $select.find("ul.pxl-selects__options").removeClass("active");
      });
    });

    var marqueeUpdateRequest = null;
    function updateMarqueesLoop() {
      updateAllMarquees();
      marqueeUpdateRequest = requestAnimationFrame(updateMarqueesLoop);
    }
    if ($(".pxl-marquee__style-2").length > 0) {
      marqueeUpdateRequest = requestAnimationFrame(updateMarqueesLoop);
    }

    $(".pxl-image__zoom-on-scroll").each(function () {
      var $target = $(this);
      var triggered = false;

      gsap
        .timeline({
          scrollTrigger: {
            trigger: $target,
            start: "top 20%",
            end: "bottom -30%",
            scrub: true,
            markers: false
          }
        })
        .to($target, {
          scale: 50,
          ease: "power2.out"
        })
        .set($target, {
          opacity: 0
        });
    });

    $(".pxl-marquee").each(function () {
      var $marquee = $(this);
      var $list = $marquee.find("ul");
      var $items = $marquee.find("li.pxl-marquee__item");

      if ($items.length === 0) return;

      for (var i = 0; i < $items.length; i++) {
        $items.eq(i).clone(true).appendTo($list);
      }

      if ($marquee.hasClass("pxl-marquee__pause-on-hover")) {
        $list
          .on("mouseenter", function () {
            $(this).css("animation-play-state", "paused");
          })
          .on("mouseleave", function () {
            $(this).css("animation-play-state", "running");
          });
      }

      var totalItems = $marquee.find("li.pxl-marquee__item").length;
      var currentDuration =
        parseFloat($list.css("animation-duration")) ||
        (function () {
          var inlineStyle = $list.attr("style");
          if (inlineStyle && inlineStyle.indexOf("animation-duration") !== -1) {
            var match = inlineStyle.match(/animation-duration:\s*([0-9.]+)s/);
            return match ? parseFloat(match[1]) : 10;
          }
          return 10;
        })();

      var adjustedDuration = (currentDuration * totalItems) / $items.length;
      $list.css("animation-duration", adjustedDuration + "s");
    });

    // Optimized copy button with modern Clipboard API
    $document.on("click", ".pxl-copy__button", function (e) {
      e.preventDefault();
      var $container = $(this).closest(".pxl-copy");
      var textToCopy = $container.find(".pxl-copy__text").text().trim();
      var successMsg = $container.data("success") || "Copied!";
      var $thisButton = $(this);

      // Use modern Clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(textToCopy)
          .then(function () {
            showCopyNotification($container, $thisButton, successMsg);
          })
          .catch(function () {
            fallbackCopyText(textToCopy, $container, $thisButton, successMsg);
          });
      } else {
        fallbackCopyText(textToCopy, $container, $thisButton, successMsg);
      }
    });

    function fallbackCopyText(text, $container, $button, msg) {
      var $temp = $("<textarea>");
      $body.append($temp);
      $temp.val(text).select();
      try {
        document.execCommand("copy");
        showCopyNotification($container, $button, msg);
      } catch (err) {
        console.error("Copy failed:", err);
      }
      $temp.remove();
    }

    function showCopyNotification($container, $button, msg) {
      $button.css("pointer-events", "none");
      $container.find(".pxl-copy__notify").remove();
      $button.parent().append('<span class="pxl-copy__notify">' + msg + "</span>");
      setTimeout(function () {
        $container.find(".pxl-copy__notify").remove();
        $button.css("pointer-events", "auto");
      }, 2000);
    }

    let $step_2 = $(".pxl-step__style-2");

    if ($step_2.length) {
      $step_2.each(function (_i, item) {
        const $step = $(item);
        const $line = $step.find(".pxl-step__feature-line");
        const $items = $step.find(".pxl-step__feature-item");

        const enableAuto = $step.hasClass("auto-play");
        const enableAuto1Time = $step.hasClass("auto-play-1-time");

        let autoRotateInterval = null;
        let hasPlayed1Time = false;

        function handleItemClick($clickedItem) {
          let idx = $clickedItem.index();

          const $listItems = $clickedItem.closest(".e-con-inner").find(".pxl-step-image__list li");
          $listItems.removeClass("active");
          if (idx >= 0 && idx < $listItems.length) {
            $listItems.eq(idx).addClass("active");
          }

          const maxIdx = $items.length - 1;
          if (idx > maxIdx) idx = maxIdx;

          $items.removeClass("active");
          $items.each(function (i) {
            if (i <= idx) $(this).addClass("active");
          });

          const $lastActive = $items.eq(idx);
          const offsetTop = $lastActive.position().top || 0;
          const itemHeight = $lastActive.outerHeight() || 0;
          const totalHeight = $step.outerHeight() || 1;

          const newHeightPx = offsetTop + itemHeight / 2;
          const newHeightPercent = (0.3 + newHeightPx / totalHeight) * 100;

          if (newHeightPercent >= 95) {
            $line.css({ height: "100%", background: "#2E90FA" });
          } else {
            $line.css({
              height: newHeightPercent + "%",
              background: "linear-gradient(180deg, #2E90FA 0%, #252B37 100%)"
            });
          }
        }

        function autoRotate() {
          const $activeItems = $items.filter(".active");
          const lastActiveIdx = $activeItems.length ? $activeItems.last().index() : -1;

          let nextIndex = lastActiveIdx + 1;

          if (nextIndex >= $items.length) {
            if (enableAuto1Time) {
              stopAutoRotate();
              hasPlayed1Time = true;
              return;
            } else {
              $items.removeClass("active");
              nextIndex = 0;
            }
          }

          handleItemClick($items.eq(nextIndex));
        }

        function startAutoRotate() {
          if (autoRotateInterval || (enableAuto1Time && hasPlayed1Time)) return;
          autoRotateInterval = setInterval(autoRotate, 3000);
        }

        function stopAutoRotate() {
          if (autoRotateInterval) {
            clearInterval(autoRotateInterval);
            autoRotateInterval = null;
          }
        }

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                if (enableAuto || enableAuto1Time) startAutoRotate();
              } else {
                if (enableAuto) stopAutoRotate();
              }
            });
          },
          { threshold: 0.3 }
        );
        observer.observe($step[0]);

        $items.off("click.pxlStep").on("click.pxlStep", function () {
          handleItemClick($(this));
          if (enableAuto && !enableAuto1Time) {
            stopAutoRotate();
            setTimeout(startAutoRotate, 3000);
          }
        });
      });
    }

    // Pricing swap price
    $(document).on("click", ".pxl-pricing__style-4 .pxl-pricing__option", function () {
      const $this = $(this);
      const $card = $this.prev();
      const isActive = $this.hasClass("active");

      const dataText = isActive ? $this.data("st") : $this.data("nd");
      const price = isActive
        ? $card.find(".pxl-pricing__price-detail span").data("price-st")
        : $card.find(".pxl-pricing__price-detail span").data("price-nd");
      const period = isActive
        ? $card.find(".pxl-pricing__price-period").data("period-st")
        : $card.find(".pxl-pricing__price-period").data("period-nd");

      $this.toggleClass("active").find(".pxl-pricing__option-text").text(dataText);
      $card.find(".pxl-pricing__price-detail span").text(price);
      $card.find(".pxl-pricing__price-period").text(period);
    });

    // Style 5 pricing toggle
    $(document).on("click", ".pxl-pricing__style-5 .pxl-pricing__option", function () {
      const $this = $(this);
      const $pricing = $this.closest(".pxl-pricing");
      const isActive = $this.hasClass("active");

      const dataText = isActive
        ? $this.find(".pxl-pricing__option-text").data("tb-st")
        : $this.find(".pxl-pricing__option-text").data("tb-nd");
      const price = isActive
        ? $pricing.find(".pxl-pricing__price-currency").data("price-st")
        : $pricing.find(".pxl-pricing__price-currency").data("price-nd");
      const salePrice = isActive
        ? $pricing.find(".pxl-pricing__price-sale").data("price-sale-st")
        : $pricing.find(".pxl-pricing__price-sale").data("price-sale-nd");
      const period = isActive
        ? $pricing.find(".pxl-pricing__price-period").data("period-st")
        : $pricing.find(".pxl-pricing__price-period").data("period-nd");

      $this.toggleClass("active").find(".pxl-pricing__option-text").text(dataText);
      $pricing.find(".pxl-pricing__price-currency").text(`$${price}`);
      $pricing.find(".pxl-pricing__price-sale").text(`$${salePrice}`);
      $pricing.find(".pxl-pricing__price-period").text(period);
    });

    // Select Tel
    let $select_national_tel = document.querySelector("#your-phone");

    if ($select_national_tel) {
      if (typeof window.intlTelInput === "undefined") {
        return;
      }

      let iti = window.intlTelInput($select_national_tel, {
        initialCountry: "us",
        preferredCountries: ["us"],
        utilsScript: "./libs/intlTelInput-utils.min.js"
      });

      const countryPlaceholders = {
        us: "+1 (201) 555-0123",
        ca: "+1 (416) 555-0123",
        mx: "+52 55 5123 4567",
        gt: "+502 2123 4567",
        bz: "+501 612 3456",
        sv: "+503 2123 4567",
        hn: "+504 9123 4567",
        ni: "+505 8123 4567",
        cr: "+506 8123 4567",
        pa: "+507 6123 4567",
        cu: "+53 5123 4567",
        jm: "+1 876 123 4567",
        ht: "+509 3123 4567",
        do: "+1 809 123 4567",
        pr: "+1 787 123 4567",
        bs: "+1 242 123 4567",
        bb: "+1 246 123 4567",
        tt: "+1 868 123 4567",
        dm: "+1 767 123 4567",
        lc: "+1 758 123 4567",
        vc: "+1 784 123 4567",
        gd: "+1 473 123 4567",
        kn: "+1 869 123 4567",
        ag: "+1 268 123 4567",
        ai: "+1 264 123 4567",
        ms: "+1 664 123 4567",
        vg: "+1 284 123 4567",
        vi: "+1 340 123 4567",
        ky: "+1 345 123 4567",
        tc: "+1 649 123 4567",
        bm: "+1 441 123 4567",
        sx: "+1 721 123 4567",
        br: "+55 11 91234-5678",
        ar: "+54 9 11 1234-5678",
        co: "+57 300 123 4567",
        pe: "+51 987 654 321",
        cl: "+56 9 1234 5678",
        ve: "+58 414 123 4567",
        ec: "+593 99 123 4567",
        bo: "+591 71234567",
        py: "+595 971 234567",
        uy: "+598 94 123 456",
        gy: "+592 623 4567",
        sr: "+597 812 3456",
        gf: "+594 694 12 34 56",
        fk: "+500 12345",
        gb: "+44 7700 900123",
        fr: "+33 6 12 34 56 78",
        de: "+49 170 1234567",
        it: "+39 320 123 4567",
        es: "+34 612 345 678",
        pt: "+351 912 345 678",
        ie: "+353 85 123 4567",
        be: "+32 470 12 34 56",
        nl: "+31 6 12345678",
        lu: "+352 621 123 456",
        ch: "+41 78 123 45 67",
        at: "+43 664 123456",
        mc: "+377 6 12 34 56 78",
        li: "+423 661 12 34",
        sm: "+378 66 12 34 56",
        va: "+39 06 698 12345",
        se: "+46 70-123 45 67",
        no: "+47 400 12 345",
        fi: "+358 40 1234567",
        ax: "+358 18 12345",
        dk: "+45 20 12 34 56",
        is: "+354 661 2345",
        fo: "+298 212 345",
        sj: "+47 79 12 34 56",
        pl: "+48 512 345 678",
        cz: "+420 601 123 456",
        sk: "+421 905 123 456",
        hu: "+36 20 123 4567",
        ro: "+40 712 345 678",
        bg: "+359 87 123 4567",
        ua: "+380 50 123 4567",
        by: "+375 29 123 45 67",
        ru: "+7 912 345-67-89",
        md: "+373 62 123456",
        ee: "+372 5123 456",
        lv: "+371 21 234 567",
        lt: "+370 6 123 4567",
        hr: "+385 91 234 5678",
        si: "+386 30 123 456",
        ba: "+387 61 123 456",
        rs: "+381 60 1234567",
        me: "+382 67 123 456",
        mk: "+389 70 123 456",
        al: "+355 69 123 4567",
        xk: "+383 44 123 456",
        gr: "+30 690 123 4567",
        cy: "+357 96 123 456",
        mt: "+356 9612 3456",
        gi: "+350 57123456",
        tr: "+90 530 123 45 67",
        il: "+972 50-123-4567",
        sa: "+966 50 123 4567",
        ae: "+971 50 123 4567",
        qa: "+974 3312 3456",
        bh: "+973 3312 3456",
        kw: "+965 500 12345",
        om: "+968 9123 4567",
        jo: "+962 7 9012 3456",
        lb: "+961 71 123 456",
        sy: "+963 944 123 456",
        iq: "+964 750 123 4567",
        ir: "+98 912 345 6789",
        ye: "+967 71 123 4567",
        ps: "+970 59 123 4567",
        kz: "+7 701 123 4567",
        uz: "+998 90 123 45 67",
        tm: "+993 65 123456",
        tj: "+992 917 123 456",
        kg: "+996 700 123 456",
        in: "+91 98765 43210",
        pk: "+92 301 2345678",
        bd: "+880 1712 345678",
        np: "+977 984 1234567",
        lk: "+94 71 234 5678",
        mv: "+960 771 2345",
        bt: "+975 17 123 456",
        af: "+93 70 123 4567",
        cn: "+86 131 2345 6789",
        jp: "+81 90-1234-5678",
        kr: "+82 10-1234-5678",
        kp: "+850 192 123 4567",
        tw: "+886 912 345 678",
        hk: "+852 9123 4567",
        mo: "+853 6123 4567",
        mn: "+976 8812 3456",
        th: "+66 8 1234 5678",
        vn: "+84 91 234 56 78",
        id: "+62 812 345 6789",
        my: "+60 12 345 6789",
        sg: "+65 8123 4567",
        ph: "+63 917 123 4567",
        mm: "+95 9 123 456 789",
        kh: "+855 12 345 678",
        la: "+856 20 2345 6789",
        bn: "+673 712 3456",
        tl: "+670 7723 4567",
        au: "+61 412 345 678",
        nz: "+64 21 123 4567",
        pg: "+675 7012 3456",
        fj: "+679 701 2345",
        sb: "+677 74 12345",
        vu: "+678 5912 345",
        ws: "+685 72 12345",
        to: "+676 7712 345",
        nr: "+674 555 1234",
        ki: "+686 72 12345",
        fm: "+691 350 1234",
        mh: "+692 235 1234",
        pw: "+680 779 1234",
        ck: "+682 55 123",
        nu: "+683 4123",
        tk: "+690 7012",
        nf: "+672 3 12345",
        nc: "+687 75 12 34",
        pf: "+689 87 12 34 56",
        wf: "+681 50 12 34",
        as: "+1 684 733 1234",
        gu: "+1 671 300 1234",
        mp: "+1 670 234 5678",
        cx: "+61 8 9164 1234",
        cc: "+61 8 9162 1234",
        eg: "+20 100 123 4567",
        ly: "+218 91 2345678",
        tn: "+216 20 123 456",
        dz: "+213 551 23 45 67",
        ma: "+212 612 345678",
        eh: "+212 5288 12345",
        ng: "+234 701 234 5678",
        gh: "+233 24 123 4567",
        ci: "+225 01 23 45 67 89",
        sn: "+221 70 123 45 67",
        gm: "+220 301 2345",
        gn: "+224 601 12 34 56",
        ml: "+223 65 01 23 45",
        bf: "+226 70 12 34 56",
        ne: "+227 90 12 34 56",
        tg: "+228 90 12 34 56",
        bj: "+229 90 12 34 56",
        lr: "+231 77 012 3456",
        sl: "+232 76 123456",
        gw: "+245 955 012 345",
        cv: "+238 991 2345",
        cm: "+237 6 71 23 45 67",
        ga: "+241 6 12 34 56",
        cg: "+242 06 123 4567",
        cd: "+243 991 234 567",
        cf: "+236 70 01 23 45",
        td: "+235 60 12 34 56",
        gq: "+240 222 123 456",
        st: "+239 990 1234",
        ke: "+254 712 345678",
        et: "+251 91 234 5678",
        tz: "+255 712 345678",
        ug: "+256 712 345678",
        rw: "+250 722 123 456",
        bi: "+257 79 123 456",
        so: "+252 612 345678",
        dj: "+253 77 83 12 34",
        er: "+291 7 123 456",
        ss: "+211 977 123 456",
        sd: "+249 91 123 4567",
        za: "+27 71 123 4567",
        na: "+264 81 123 4567",
        bw: "+267 71 123 456",
        zw: "+263 71 234 5678",
        mz: "+258 82 123 4567",
        mg: "+261 32 12 345 67",
        mu: "+230 5 123 4567",
        zm: "+260 955 123456",
        ls: "+266 5012 3456",
        sz: "+268 7612 3456",
        km: "+269 321 23 45",
        sc: "+248 2 510 123",
        io: "+246 379 1234",
        sh: "+290 12345",
        ac: "+247 12345",
        pm: "+508 55 12 34",
        bl: "+590 690 12 34 56",
        mf: "+590 690 12 34 56",
        re: "+262 692 12 34 56",
        yt: "+262 639 12 34 56",
        mq: "+596 696 12 34 56",
        gp: "+590 690 12 34 56",
        gg: "+44 7781 123456",
        je: "+44 7797 123456",
        im: "+44 7624 123456"
      };

      iti.setCountry("us");

      $select_national_tel.addEventListener("countrychange", function () {
        const countryCode = iti.getSelectedCountryData().iso2;
        setCountryPlaceholder(countryCode);
      });

      function setCountryPlaceholder(countryCode) {
        const phoneInput = document.querySelector("#your-phone");
        if (phoneInput && countryPlaceholders[countryCode]) {
          phoneInput.setAttribute("placeholder", countryPlaceholders[countryCode]);
        }
      }

      // Validation require khi submit form
      const phoneForm = $select_national_tel.closest("form");
      if (phoneForm) {
        phoneForm.addEventListener("submit", function (e) {
          const phoneValue = $select_national_tel.value.trim();
          const isRequired =
            $select_national_tel.hasAttribute("required") ||
            $select_national_tel.getAttribute("aria-required") === "true";

          // Kiểm tra required
          if (isRequired && !phoneValue) {
            e.preventDefault();
            $select_national_tel.setCustomValidity("Vui lòng nhập số điện thoại");
            $select_national_tel.reportValidity();
            return false;
          }

          if (phoneValue) {
            try {
              if (!iti.isValidNumber()) {
                e.preventDefault();
                const errorCode = iti.getValidationError();
                let errorMsg = "Số điện thoại không hợp lệ";

                if (errorCode === 1) {
                  errorMsg = "Số điện thoại quá ngắn";
                } else if (errorCode === 2) {
                  errorMsg = "Số điện thoại quá dài";
                } else if (errorCode === 3) {
                  errorMsg = "Mã quốc gia không hợp lệ";
                }

                $select_national_tel.setCustomValidity(errorMsg);
                $select_national_tel.reportValidity();
                return false;
              }
            } catch (err) {
              return false;
            }
          }

          $select_national_tel.setCustomValidity("");
        });

        $select_national_tel.addEventListener("input", function () {
          if ($select_national_tel.validity.customError) {
            $select_national_tel.setCustomValidity("");
          }
        });
      }
    }

    // Map
    let $office_info = document.querySelectorAll(".pxl-office");
    if ($office_info.length > 0) {
      $office_info.forEach(function (item) {
        $(item)
          .find(".pxl-office__pos-item")
          .on("click", function () {
            let $item_idx = $(this).index();
            $(item).find(".pxl-office__pos-item").removeClass("active");
            $(item).find(".pxl-office__content-item").removeClass("active");
            $(this).addClass("active");
            $(item).find(".pxl-office__content-item").eq($item_idx).addClass("active");
          });
      });
    }

    // Load More Button For Standard Blog - Optimized
    let page = parseInt(loadmore_params.startPage) + 1;
    let loading = false;
    var $contentMain = $("#pxl-content-main");

    $document.on("click", ".pxl-posts__loadmore", function (e) {
      e.preventDefault();
      if (loading) return;

      loading = true;
      var button = $(this);
      button.addClass("loading");

      $.ajax({
        type: "POST",
        url: loadmore_params.ajax_url,
        data: {
          action: "load_more_posts",
          page: page,
          nonce: loadmore_params.nonce || ""
        },
        success: function (res) {
          if (res.success && res.data && res.data.trim() !== "") {
            page++;
            checkIfMorePosts(page, button, function () {
              if ($contentMain.length) {
                $contentMain.append(res.data);
              }
              loading = false;
              button.removeClass("loading");
            });
          } else {
            loading = false;
            button.removeClass("loading");
          }
        },
        error: function () {
          loading = false;
          button.removeClass("loading");
        }
      });
    });

    // Optimize banner box rotation - use single interval for all boxes
    var bannerBoxes = $(
      ".pxl-banner-box__style-3, .pxl-banner-box__style-4, .pxl-banner-box__style-5"
    );
    if (bannerBoxes.length > 0) {
      var bannerBoxData = [];
      bannerBoxes.each(function () {
        let $box = $(this);
        let $items = $box.find(".pxl-banner-box__feature-item");
        if ($items.length === 0) return;

        $items.removeClass("active").first().addClass("active");

        let limit = $items.length;
        if ($box.hasClass("pxl-banner-box__style-5")) {
          limit = $items.length + 1;
        }

        bannerBoxData.push({
          $items: $items,
          index: 0,
          limit: limit
        });
      });

      if (bannerBoxData.length > 0) {
        setInterval(function () {
          bannerBoxData.forEach(function (data) {
            data.$items.removeClass("active");
            if (data.index < data.$items.length) {
              data.$items.eq(data.index).addClass("active");
            }
            data.index = (data.index + 1) % data.limit;
          });
        }, 2000);
      }
    }

    /* Login */
    $(".pxl-modal-close").on("click", function () {
      $(this).parent().removeClass("open").addClass("remove");
      $(this).parents("body").removeClass("ov-hidden");
    });
    $(".btn-sign-up").on("click", function () {
      $(".pxl-user-register").addClass("u-open").removeClass("u-close");
      $(".pxl-user-login").addClass("u-close").removeClass("u-open");
    });
    $(".btn-sign-in").on("click", function () {
      $(".pxl-user-register").addClass("u-close").removeClass("u-open");
      $(".pxl-user-login").addClass("u-open").removeClass("u-close");
    });
    $(".pxl-user-have-an-account").on("click", function () {
      $(this)
        .parents(".pxl-modal-content")
        .find(".pxl-user-register")
        .addClass("u-close")
        .removeClass("u-open");
      $(this)
        .parents(".pxl-modal-content")
        .find(".pxl-user-login")
        .addClass("u-open")
        .removeClass("u-close");
    });
    $(".btn-user").on("click", function (e) {
      const href = $(this).attr("href");

      if (!href || href !== "#") {
        $(".pxl-user-popup").addClass("open").removeClass("remove");
        $(this).find(".pxl-user-account").toggleClass("active");
      }
    });

    // End typewriter

    /* Start Menu Mobile */
    $(".pxl-header-menu li.menu-item-has-children").append('<span class="pxl-menu-toggle"></span>');
    $(".pxl-menu-toggle").on("click", function () {
      if ($(this).hasClass("active")) {
        $(this).closest("ul").find(".pxl-menu-toggle.active").toggleClass("active");
        $(this).closest("ul").find(".sub-menu.active").toggleClass("active").slideToggle();
      } else {
        $(this).closest("ul").find(".pxl-menu-toggle.active").toggleClass("active");
        $(this).closest("ul").find(".sub-menu.active").toggleClass("active").slideToggle();
        $(this).toggleClass("active");
        $(this).parent().find("> .sub-menu").toggleClass("active");
        $(this).parent().find("> .sub-menu").slideToggle();
      }
    });

    $(".pxl-nav").each(function () {
      $(this).closest(".e-con-inner").find(".pxl-swiper__nav").hide();
      $(this)
        .closest(".e-con-inner")
        .find(".pxl-nav__item")
        .on("click", function () {
          if ($(this).hasClass("pxl-nav__prev")) {
            $(this).closest(".e-con-inner").find(".pxl-swiper__nav-prev").trigger("click");
          }
          if ($(this).hasClass("pxl-nav__next")) {
            $(this).closest(".e-con-inner").find(".pxl-swiper__nav-next").trigger("click");
          }
        });
    });

    $("#pxl-nav-mobile, .pxl-anchor-mobile-menu").on("click", function (e) {
      // Logic mặc định cho mobile menu
      $(this).toggleClass("active");
      $("body").toggleClass("body-overflow");
      $(".pxl-header-menu").toggleClass("active");
    });

    $(
      ".pxl-menu-close, .pxl-header-menu-backdrop, #pxl-header-mobile .pxl-menu__primary a.is-one-page"
    ).on("click", function () {
      $(this).parents(".pxl-header-main").find(".pxl-header-menu").removeClass("active");
      $("#pxl-nav-mobile").removeClass("active");
      $("body").toggleClass("body-overflow");
    });

    /* End Menu Mobile */

    /* Menu Vertical */
    $(".pxl-nav-vertical li.menu-item-has-children > a").append(
      '<span class="pxl-arrow-toggle"><i class="caseicon-right-arrow"></i></span>'
    );
    $(".pxl-nav-vertical li.menu-item-has-children > a").on("click", function () {
      if ($(this).hasClass("active")) {
        $(this).next().toggleClass("active").slideToggle();
      } else {
        $(this).closest("ul").find(".sub-menu.active").toggleClass("active").slideToggle();
        $(this).closest("ul").find("a.active").toggleClass("active");
        $(this).find(".pxl-menu-toggle.active").toggleClass("active");
        $(this).toggleClass("active");
        $(this).next().toggleClass("active").slideToggle();
      }
    });

    /* Menu Hidden Sidebar Popup */
    $(".pxl-menu-hidden-sidebar li.menu-item-has-children > a").append(
      '<span class="pxl-arrow-toggle"><i class="caseicon-right-arrow"></i></span>'
    );
    $(".pxl-menu-hidden-sidebar li.menu-item-has-children > a").on("click", function () {
      if ($(this).hasClass("active")) {
        $(this).next().toggleClass("active").slideToggle();
      } else {
        $(this).closest("ul").find(".sub-menu.active").toggleClass("active").slideToggle();
        $(this).closest("ul").find("a.active").toggleClass("active");
        $(this).find(".pxl-menu-toggle.active").toggleClass("active");
        $(this).toggleClass("active");
        $(this).next().toggleClass("active").slideToggle();
      }
    });

    $(".pxl-menu-hidden-sidebar .pxl-menu-button").on("click", function () {
      $(this).parents(".pxl-menu-hidden-sidebar").toggleClass("active");
      $(this).parents(".pxl-menu-hidden-sidebar").removeClass("boxOut");
      $(this).parents("body").toggleClass("body-overflow");
    });
    $(".pxl-menu-popup-overlay").on("click", function () {
      $(this).parent().removeClass("active");
      $(this).parent().addClass("boxOut");
      $(this).parents("body").removeClass("body-overflow");
    });
    $(".pxl-menu-popup-close, .pxl-menu-hidden-sidebar .pxl-menu-hidden a.is-one-page").on(
      "click",
      function () {
        $(this).parents(".pxl-menu-hidden-sidebar").removeClass("active");
        $(this).parents(".pxl-menu-hidden-sidebar").addClass("boxOut");
        $(this).parents("body").removeClass("body-overflow");
      }
    );

    // Safari
    if (
      navigator.userAgent.includes("Safari") &&
      !navigator.userAgent.includes("Chrome") &&
      !navigator.userAgent.includes("Edg")
    ) {
      $(".pxl-marquee--coin").addClass("safari");
      setTimeout(() => {
        $(".pxl-marquee--coin").addClass("safari");
      }, 1000);
    }

    /* Mega Menu Max Height */
    var m_h_mega = $("li.pxl-megamenu > .sub-menu > .pxl-mega-menu-elementor").outerHeight();
    var w_h_mega = $(window).height();

    var w_w_mega = $("li.pxl-megamenu > .sub-menu > .pxl-mega-menu-elementor")
      .closest(".elementor-element.e-child")
      .width();
    var w_w_mega_css = w_w_mega + 30;
    var w_h_mega_css = w_h_mega - 120;
    if (m_h_mega > w_h_mega) {
      $("li.pxl-megamenu > .sub-menu > .pxl-mega-menu-elementor").css({
        "max-height": w_h_mega_css + "px",
        "max-width": w_w_mega_css + "px",
        "overflow-x": "hidden",
        "overflow-y": "auto"
      });

      $("li.pxl-megamenu > .sub-menu > .pxl-mega-menu-elementor").css("overflow-x", "hidden");
    }
    /* End Mega Menu Max Height */
    $(".pxl-chart-week").each(function () {
      let sec = this;

      ScrollTrigger.create({
        trigger: sec,
        start: "top bottom",
        end: "bottom top",
        toggleClass: { targets: sec, className: "active" },
        onEnter: () => sec.classList.add("active"),
        onEnterBack: () => sec.classList.add("active")
      });
    });

    // Back to top - Optimized
    let isScrollingToTop = false;

    $document.on("click", ".pxl-scroll-top", function (e) {
      e.preventDefault();
      if ($html.hasClass("html-smooth-scroll")) {
        setTimeout(() => {
          $html.css("scroll-behavior", "smooth");
          isScrollingToTop = true;
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 1000);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return false;
    });

    var scrollTopCheckHandler = throttle(function () {
      if (isScrollingToTop && window.scrollY === 0) {
        $html.css("scroll-behavior", "auto");
        isScrollingToTop = false;
      }
    }, 100);

    $window.on("scroll", scrollTopCheckHandler);

    /* Animate Time Delay */
    $(".pxl-grid__masonry").each(function () {
      var eltime = 80;
      var elt_inner = $(this).children().length;
      var _elt = elt_inner - 1;
      $(this)
        .find("> .pxl-grid__item > .wow")
        .each(function (index, obj) {
          $(this).css("animation-delay", eltime + "ms");
          if (_elt === index) {
            eltime = 80;
            _elt = _elt + elt_inner;
          } else {
            eltime = eltime + 80;
          }
        });
    });

    $(".btn-text-nina").each(function () {
      var eltime = 0.045;
      var elt_inner = $(this).children().length;
      var _elt = elt_inner - 1;
      $(this)
        .find("> .pxl--btn-text > span")
        .each(function (index, obj) {
          $(this).css("transition-delay", eltime + "s");
          eltime = eltime + 0.045;
        });
    });

    $(".btn-text-nanuk").each(function () {
      var eltime = 0.05;
      var elt_inner = $(this).children().length;
      var _elt = elt_inner - 1;
      $(this)
        .find("> .pxl--btn-text > span")
        .each(function (index, obj) {
          $(this).css("animation-delay", eltime + "s");
          eltime = eltime + 0.05;
        });
    });

    $(".btn-text-smoke").each(function () {
      var eltime = 0.05;
      var elt_inner = $(this).children().length;
      var _elt = elt_inner - 1;
      $(this)
        .find("> .pxl--btn-text > span > span > span")
        .each(function (index, obj) {
          $(this).css("--d", eltime + "s");
          eltime = eltime + 0.05;
        });
    });

    $(".btn-text-reverse .pxl-text--front, .btn-text-reverse .pxl-text--back").each(function () {
      var eltime = 0.05;
      var elt_inner = $(this).children().length;
      var _elt = elt_inner - 1;
      $(this)
        .find(".pxl-text--inner > span")
        .each(function (index, obj) {
          $(this).css("transition-delay", eltime + "s");
          eltime = eltime + 0.05;
        });
    });

    /* End Animate Time Delay */

    /* Lightbox Popup - Optimized initialization */
    var $videoPopups = $(".pxl-video__popup");
    var $galleryLightboxes = $(".pxl-gallery-lightbox");

    if ($videoPopups.length > 0 || $galleryLightboxes.length > 0) {
      setTimeout(function () {
        if ($videoPopups.length > 0 && typeof $.fn.magnificPopup !== "undefined") {
          $videoPopups.magnificPopup({
            type: "iframe",
            mainClass: "mfp-fade",
            removalDelay: 160,
            preloader: false,
            fixedContentPos: false
          });
        }

        if ($galleryLightboxes.length > 0 && typeof $.fn.magnificPopup !== "undefined") {
          $galleryLightboxes.each(function () {
            $(this).magnificPopup({
              delegate: "a.lightbox",
              type: "image",
              gallery: {
                enabled: true
              },
              mainClass: "mfp-fade"
            });
          });
        }
      }, 300);
    }

    /* Start Icon Bounce */
    var boxEls = $(".el-bounce, .pxl-image-effect1, .el-effect-zigzag");
    $.each(boxEls, function (boxIndex, boxEl) {
      loopToggleClass(boxEl, "active");
    });

    function loopToggleClass(el, toggleClass) {
      el = $(el);
      let counter = 0;
      if (el.hasClass(toggleClass)) {
        waitFor(
          function () {
            counter++;
            return counter == 2;
          },
          function () {
            counter = 0;
            el.removeClass(toggleClass);
            loopToggleClass(el, toggleClass);
          },
          "Deactivate",
          1000
        );
      } else {
        waitFor(
          function () {
            counter++;
            return counter == 3;
          },
          function () {
            counter = 0;
            el.addClass(toggleClass);
            loopToggleClass(el, toggleClass);
          },
          "Activate",
          1000
        );
      }
    }

    function waitFor(condition, callback, message, time) {
      if (message == null || message == "" || typeof message == "undefined") {
        message = "Timeout";
      }
      if (time == null || time == "" || typeof time == "undefined") {
        time = 100;
      }
      var cond = condition();
      if (cond) {
        callback();
      } else {
        setTimeout(function () {
          waitFor(condition, callback, message, time);
        }, time);
      }
    }
    /* End Icon Bounce */

    /* Image Effect */
    if ($(".pxl-image__tilt").length) {
      $(".pxl-image__tilt").parents(".e-con-inner").addClass("pxl-image__tilt-active");
      $(".pxl-image__tilt").each(function () {
        var pxl_maxtilt = $(this).data("maxtilt"),
          pxl_speedtilt = $(this).data("speedtilt"),
          pxl_perspectivetilt = $(this).data("perspectivetilt");
        VanillaTilt.init(this, {
          max: pxl_maxtilt,
          speed: pxl_speedtilt,
          perspective: pxl_perspectivetilt
        });
      });
    }

    $(".pxl-image__3d-ui").each(function () {
      const img = $(this).find("img")[0];
      const $item = $(this).find(".pxl-image__item");

      const rotateX_from = $item.data("rotatex_from") || 0;
      const rotateY_from = $item.data("rotatey_from") || 0;
      const rotateX_to = $item.data("rotatex_to") || 0;
      const rotateY_to = $item.data("rotatey_to") || 0;

      gsap.set(img, {
        rotateX: rotateX_from,
        rotateY: rotateY_from,
        transformStyle: "preserve-3d",
        willChange: "transform",
        transition: "transform 0.3s ease"
      });
      gsap.to(img, {
        scrollTrigger: {
          trigger: this,
          start: "top 90%",
          end: "top 40%",
          scrub: 0.3
        }
      });
      gsap.to(img, {
        rotateX: rotateX_to,
        rotateY: rotateY_to,
        scrollTrigger: {
          trigger: this,
          start: "top bottom",
          end: "center center",
          scrub: 0
        }
      });
    });

    $(".pxl-variant").each(function () {
      const $item = $(this).find(".pxl-variant__item");

      gsap.to($item, {
        scrollTrigger: {
          trigger: this,
          start: "top bottom",
          end: "center center",
          scrub: 0,
          onEnter: () => {
            $(this).addClass("active");
          },
          onEnterBack: () => {
            $(this).addClass("active");
          },
          onLeave: () => {},
          onLeaveBack: () => {
            $(this).removeClass("active");
          }
        }
      });
    });

    $(".add-active").each(function () {
      const $item = $(this);
      gsap.to($item, {
        scrollTrigger: {
          trigger: this,
          start: "top bottom",
          end: "center center",
          scrub: 0,
          onEnter: () => {
            $item.addClass("active");
          },
          onEnterBack: () => {
            $item.addClass("active");
          },
          onLeave: () => {},
          onLeaveBack: () => {
            $item.removeClass("active");
          }
        }
      });
    });
    // Menu Sticky - Optimized with throttle
    $(".pxl-link__menu-sticky").each(function () {
      const $this = $(this);
      const $navLinks = $this.find(".pxl-link__item a");
      var linkData = [];

      // Pre-calculate link data
      $navLinks.each(function () {
        const $link = $(this);
        const targetId = $link.attr("href");
        if (targetId && targetId.startsWith("#")) {
          const $target = $(targetId);
          if ($target.length) {
            linkData.push({
              $link: $link,
              $parent: $link.parent(),
              targetId: targetId,
              $target: $target,
              offset: parseInt($link.parent().data("onepage-offset")) || 0
            });
          }
        }
      });

      var menuStickyHandler = throttle(function () {
        const scrollTop = $window.scrollTop();
        let currentSection = null;

        linkData.forEach(function (data) {
          const sectionTop = data.$target.offset().top;
          if (scrollTop + data.offset >= sectionTop) {
            currentSection = data.$parent;
          }
        });

        if (currentSection) {
          $navLinks.parent().removeClass("active");
          currentSection.addClass("active");
        }
      }, 100);

      $window.on("scroll.menuSticky", menuStickyHandler);
      $window.trigger("scroll.menuSticky");
    });

    // Container Sticky
    $(".pxl-sticky-inner-container").each(function (_, el) {
      const $container = $(this);
      const $siblings = $container.parent().children(".pxl-sticky-inner-container");

      if ($siblings.length === 1 || $container.is($siblings.last()) || window.innerWidth < 1024) {
        return;
      }

      const $el = $(el);
      const minScale = Math.max(
        0.8,
        Math.min(0.99, (+$el.data("pxl-sticky-inner-scale-size") || 0) / 100)
      );
      const maxBlur = +$el.data("pxl-sticky-inner-blur-width") || 0;

      gsap.set(el, { scale: 1, filter: "blur(0px)" });

      ScrollTrigger.create({
        trigger: el,
        start: "top 0%",
        end: "top 90%",
        scrub: true,
        onUpdate: (st) => {
          const p = st.progress;
          const s = 1 - (1 - minScale) * p;
          const b = maxBlur * p;
          gsap.set(el, { scale: s, filter: `blur(${b}px)` });
        }
      });
    });

    // Optimize link click handler
    $document.on("click", "a:not(.tabs a, .is-one-page)", function () {
      if ($html.hasClass("html-smooth-scroll")) {
        setTimeout(() => {
          $html.css("scroll-behavior", "auto");
        }, 800);
        $html.css("scroll-behavior", "smooth");
      }
    });

    /* Select*/
    $(".wpcf7-form .wpcf7-select").each(function () {
      var $this = $(this),
        numberOfOptions = $this.children("option").length;

      if ($this.hasClass("pxl-select-hidden")) {
        return;
      }

      $this.addClass("pxl-select-hidden");
      $this.wrap('<div class="pxl-select"></div>');
      $this.after('<div class="pxl-select-higthlight"></div>');

      var $styledSelect = $this.next("div.pxl-select-higthlight");
      $styledSelect.text($this.children("option").eq(0).text());

      var $list = $("<ul />", {
        class: "pxl-select-options"
      }).insertAfter($styledSelect);

      for (var i = 0; i < numberOfOptions; i++) {
        $("<li />", {
          text: $this.children("option").eq(i).text(),
          rel: $this.children("option").eq(i).val()
        }).appendTo($list);
      }

      var $listItems = $list.children("li");

      $styledSelect.on("click", function (e) {
        e.stopPropagation();
        $("div.pxl-select-higthlight.active")
          .not(this)
          .each(function () {
            $(this)
              .removeClass("active")
              .next("ul.pxl-select-options")
              .addClass("pxl-select-lists-hide");
          });
        $(this).toggleClass("active");
      });

      $listItems.on("click", function (e) {
        e.stopPropagation();
        $styledSelect.text($(this).text()).removeClass("active");
        $this.val($(this).attr("rel"));
      });

      $(document).on("click", function () {
        $styledSelect.removeClass("active");
      });
    });

    /* Nice Select */
    $(
      ".woocommerce-ordering .orderby, #pxl-sidebar-area select, .variations_form.cart .variations select, .pxl-open-table select, .pxl-nice-select, .pxl-select-change-counter__select"
    ).each(function () {
      $(this).niceSelect();
    });

    $(".nice-select").each(function () {
      var $select = $(this);

      var $current = $select.find("span.current");
      if ($current.length && /\(\d+$/.test($current.text())) {
        $current.text($current.text() + ")");
      }

      $select.find("li.option").each(function () {
        var $option = $(this);
        if (/\(\d+$/.test($option.text())) {
          $option.text($option.text() + ")");
        }
      });
    });
    // Overlay
    $(".pxl-overlay").on("click", function () {
      $(this).removeClass("active");
      $(".pxl-filter__form").removeClass("active");
      $("#pxl-main").removeClass("active");
    });
    /* Scroll to content */
    $(".pxl-link-to-section .btn").on("click", function (e) {
      var id_scroll = $(this).attr("href");
      var offsetScroll = $(".pxl-header-elementor-sticky").outerHeight();
      e.preventDefault();
      $("html, body").animate({ scrollTop: $(id_scroll).offset().top - offsetScroll }, 600);
    });

    // Hover Overlay Effect - Optimized with throttle
    var overlayShakeHandler = throttle(function (event) {
      var $this = $(event.currentTarget);
      var offset = $this.offset();
      var x = event.pageX - offset.left;
      var y = event.pageY - offset.top;

      $this.find(".pxl-overlay--color").css({
        transform: `translate(${x}px, ${y}px)`
      });
    }, 16);

    $document.on("mousemove", ".pxl-overlay-shake", overlayShakeHandler);

    /* Item Hover Active */
    $(".pxl-hover-item").on("mouseenter", function () {
      $(this).closest(".pxl-hover-wrap").find(".pxl-hover-item").removeClass("pxl-active");
      $(this).addClass("pxl-active");
    });

    // Active Mega Menu Hover - only force full width for layouts that opt in
    $("li.pxl-megamenu").on("mouseenter", function () {
      $(this).closest(".elementor-container").addClass("section-mega-active");

      var $megaMenu = $(this).find("> .sub-menu");
      if (!$megaMenu.length) return;

      var $menuRoot = $(this).closest(".pxl-menu");

      // Skip overriding position/width when the menu is not marked as full width
      if (!$menuRoot.hasClass("pxl-mega-full-width")) {
        $megaMenu.css({
          width: "",
          "max-width": "",
          left: "",
          right: "",
          "margin-left": "",
          "margin-right": ""
        });
        return;
      }

      // Fix mega menu width to full viewport - always calculate left position
      var menuItemOffset = $(this).offset();
      var menuItemLeft = menuItemOffset.left;
      var viewportWidth = $(window).width();

      // left = -menuItemLeft makes the menu start from viewport left
      var leftPosition = -menuItemLeft;

      $megaMenu.css({
        width: viewportWidth + "px",
        "max-width": viewportWidth + "px",
        left: leftPosition + "px",
        right: "auto",
        "margin-left": "0",
        "margin-right": "0"
      });
    });

    $("li.pxl-megamenu").on("mouseleave", function () {
      $(this).closest(".elementor-container").removeClass("section-mega-active");
    });

    // Recalculate on window resize
    $(window).on("resize", function () {
      $("li.pxl-megamenu:hover").each(function () {
        var $megaMenu = $(this).find("> .sub-menu");
        if (!$megaMenu.length) return;

        var $menuRoot = $(this).closest(".pxl-menu");
        if (!$menuRoot.hasClass("pxl-mega-full-width")) {
          $megaMenu.css({
            width: "",
            "max-width": "",
            left: "",
            right: "",
            "margin-left": "",
            "margin-right": ""
          });
          return;
        }

        var menuItemOffset = $(this).offset();
        var menuItemLeft = menuItemOffset.left;
        var viewportWidth = $(window).width();
        var leftPosition = -menuItemLeft;

        $megaMenu.css({
          width: viewportWidth + "px",
          "max-width": viewportWidth + "px",
          left: leftPosition + "px",
          right: "auto",
          "margin-left": "0",
          "margin-right": "0"
        });
      });
    });
  });

  /* Header Sticky */
  function brighthub_header_sticky() {
    if ($("#pxl-header-elementor").hasClass("is-sticky")) {
      var $headerStickyStb = $(".pxl-header-elementor-sticky.pxl-sticky-stb");
      var $headerStickyStt = $(".pxl-header-elementor-sticky.pxl-sticky-stt");

      // Scroll To Bottom: hiện khi scroll > 100
      if ($headerStickyStb.length > 0) {
        if (pxl_scroll_top > 100) {
          $headerStickyStb.addClass("pxl-header-fixed");
          $("#pxl-header-mobile").addClass("pxl-header-mobile-fixed");
          $headerStickyStb.removeClass("pxl-sticky-hidden");
        } else {
          $headerStickyStb.removeClass("pxl-header-fixed");
          $("#pxl-header-mobile").removeClass("pxl-header-mobile-fixed");
          $headerStickyStb.removeClass("pxl-sticky-hidden");
        }
      }

      // Scroll To Top: chỉ hiện khi scroll up và scroll > 100
      if ($headerStickyStt.length > 0) {
        if (pxl_scroll_status == "up" && pxl_scroll_top > 100) {
          $headerStickyStt.addClass("pxl-header-fixed");
          $headerStickyStt.removeClass("pxl-sticky-hidden");
          $("#pxl-header-mobile").addClass("pxl-header-mobile-fixed");
        } else if (pxl_scroll_top <= 100) {
          $headerStickyStt.removeClass("pxl-header-fixed");
          $headerStickyStt.removeClass("pxl-sticky-hidden");
          if ($headerStickyStb.length === 0) {
            $("#pxl-header-mobile").removeClass("pxl-header-mobile-fixed");
          }
        } else if (pxl_scroll_status == "down") {
          $headerStickyStt.removeClass("pxl-header-fixed");
          $headerStickyStt.removeClass("pxl-sticky-hidden");
        }
      }
    }

    $(".pxl-header-elementor-sticky").parents("body").addClass("pxl-header-sticky");
  }

  /* Header Left Scroll */
  var $leftSidebar = $(".px-header--left_sidebar");
  var $h5SectionTop = $(".h5-section-top");
  function brighthub_header_left_scroll() {
    if ($leftSidebar.length && $leftSidebar.hasClass("px-header-sidebar-style2")) {
      var h_section_top = ($h5SectionTop.length ? $h5SectionTop.outerHeight() : 0) + 50;
      if (pxl_scroll_top > h_section_top) {
        $leftSidebar.addClass("px-header--left_shadow");
      } else {
        $leftSidebar.removeClass("px-header--left_shadow");
      }
    }
  }

  /* Header Mobile */
  function brighthub_header_mobile() {
    var h_header_mobile = $("#pxl-header-elementor").outerHeight();
    if (pxl_window_width < 1199) {
      $("#pxl-header-elementor").css("min-height", h_header_mobile + "px");
    }
  }

  /* Scroll To Top */
  function brighthub_scroll_to_top() {
    if (pxl_scroll_top < pxl_window_height) {
      $(".pxl-scroll-top").addClass("pxl-off").removeClass("pxl-on");
    }
    if (pxl_scroll_top > pxl_window_height) {
      $(".pxl-scroll-top").addClass("pxl-on").removeClass("pxl-off");
    }
  }

  /* Footer Fixed */
  function brighthub_footer_fixed() {
    setTimeout(function () {
      var h_footer = $(".pxl-footer-fixed #pxl-footer-elementor").outerHeight() - 1;
      $(".pxl-footer-fixed #pxl-main").css("margin-bottom", h_footer + "px");
    }, 600);
  }

  /* Menu Responsive Dropdown */
  function brighthub_submenu_responsive() {
    var $brighthub_menu = $(".pxl-header-elementor-main, .pxl-header-elementor-sticky");
    $brighthub_menu.find(".pxl-menu__primary li").each(function () {
      var $brighthub_submenu = $(this).find("> ul.sub-menu");
      if ($brighthub_submenu.length == 1) {
        if ($brighthub_submenu.offset().left + $brighthub_submenu.width() + 0 > $(window).width()) {
          $brighthub_submenu.addClass("pxl-sub-reverse");
        }
      }
    });
  }

  // Menu Divider Move
  function brighthub_menu_divider_move() {
    $(".pxl-menu.divider-move").each(function () {
      var current = $(this).find(
        ".pxl-menu__primary > .current-menu-item, .pxl-menu__primary > .current-menu-parent, .pxl-menu__primary > .current-menu-ancestor"
      );
      if (current.length > 0) {
        var marker = $(this).find(".pxl-menu__divider");
        marker.css({
          left: current.position().left,
          width: current.outerWidth(),
          display: "block"
        });
        marker.addClass("active");
        current.addClass("pxl-shape-active");
        if (Modernizr.csstransitions) {
          $(this)
            .find(".pxl-menu__primary > li")
            .mouseover(function () {
              var self = $(this),
                offsetLeft = self.position().left,
                width = self.outerWidth() || current.outerWidth(),
                left = offsetLeft == 0 ? 0 : offsetLeft || current.position().left;
              marker.css({
                left: left,
                width: width
              });
              marker.addClass("active");
              current.removeClass("pxl-shape-active");
            });
          $(this)
            .find(".pxl-menu__primary")
            .mouseleave(function () {
              marker.css({
                left: current.position().left,
                width: current.outerWidth()
              });
              current.addClass("pxl-shape-active");
            });
        }
      } else {
        var marker = $(this).find(".pxl-menu__divider");
        var current = $(this).find(".pxl-menu__primary > li:nth-child(1)");
        marker.css({
          left: current.position().left,
          width: current.outerWidth(),
          display: "block"
        });
        if (Modernizr.csstransitions) {
          $(this)
            .find(".pxl-menu__primary > li")
            .mouseover(function () {
              var self = $(this),
                offsetLeft = self.position().left,
                width = self.outerWidth() || current.outerWidth(),
                left = offsetLeft == 0 ? 0 : offsetLeft || current.position().left;
              marker.css({
                left: left,
                width: width
              });
              marker.addClass("active");
            });
          $(this)
            .find(".pxl-menu__primary")
            .mouseleave(function () {
              marker.css({
                left: current.position().left,
                width: current.outerWidth()
              });
              marker.removeClass("active");
            });
        }
      }
    });
  }

  // Panel Anchor Toggle
  function brighthub_panel_anchor_toggle() {
    "use strict";
    $(document).on("click", ".pxl-anchor-button", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var target = $(this).attr("data-target");
      var $target = $(target);

      // Toggle popup
      if ($target.hasClass("active")) {
        $target.removeClass("active");
        $("body").removeClass("body-overflow");
      } else {
        // Close other popups first
        $(".pxl-popup.active, #pxl-search-popup.active").removeClass("active");
        $target.addClass("active");
        $("body").addClass("body-overflow");

        // Focus search field if it's search popup
        if ($target.is("#pxl-search-popup") || $target.find(".pxl-search-form").length > 0) {
          setTimeout(function () {
            var $searchField = $target.find(".search-field");
            if ($searchField.length > 0) {
              $searchField.focus();
            } else if ($target.find(".pxl-search-form .pxl-search-field").length > 0) {
              $target.find(".pxl-search-form .pxl-search-field").focus();
            }
          }, 500);
        }
      }
    });

    $(".pxl-anchor-button").each(function () {
      var t_target = $(this).attr("data-target");
      var t_delay = $(this).attr("data-delay-hover");
      $(t_target)
        .find(".pxl-popup__content")
        .css("transition-delay", t_delay + "ms");
      $(t_target)
        .find(".pxl-popup__overlay")
        .css("transition-delay", t_delay + "ms");
    });

    $(document).on(
      "click",
      ".pxl-popup__overlay, .pxl-popup__close, .pxl-item--overlay, .pxl-item--close",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        $("body").removeClass("body-overflow");
        var $popup = $(this).closest(".pxl-popup, #pxl-search-popup");
        if ($popup.length > 0) {
          $popup.removeClass("active");
        } else {
          // Fallback - close all popups
          $(".pxl-popup.active, #pxl-search-popup.active").removeClass("active");
        }
      }
    );

    $(".pxl-button.btn__popup").on("click", function () {
      $("body").addClass("body-overflow");
      $(this).closest(".pxl-wapper").find(".pxl-popup--page").addClass("active");
    });

    $(document).on(
      "click",
      ".pxl-popup--close, .pxl-popup__overlay, .pxl-popup__close",
      function () {
        $("body").removeClass("body-overflow");
        $(this).closest(".pxl-popup--page").removeClass("active");
      }
    );
  }

  /* Post Grid */
  function brighthub_post_grid() {
    setTimeout(function () {
      $(".pxl-swiper-slider__item-inner").each(function () {
        var item_w = $(this).outerWidth();
        var item_h = $(this).outerHeight();
        $(this)
          .find(".pxl-item--imgfilter")
          .css("width", item_w + "px");
        $(this)
          .find(".pxl-item--imgfilter")
          .css("height", item_h + "px");
      });
    }, 300);
  }

  /* Page Title Scroll Opacity */
  function brighthub_ptitle_scroll_opacity() {
    var divs = $("#pxl-ptit-elementor.pxl-scroll-opacity .elementor-widget"),
      limit = $("#pxl-ptit-elementor.pxl-scroll-opacity").outerHeight();
    if (pxl_scroll_top <= limit) {
      divs.css({ opacity: 1 - pxl_scroll_top / limit });
    }
  }

  /* Preloader Default */
  $.fn.extend({
    jQueryImagesLoaded: function () {
      var $imgs = this.find('img[src!=""]');

      if (!$imgs.length) {
        return $.Deferred().resolve().promise();
      }

      var dfds = [];

      $imgs.each(function () {
        var dfd = $.Deferred();
        dfds.push(dfd);
        var img = new Image();
        img.onload = function () {
          dfd.resolve();
        };
        img.onerror = function () {
          dfd.resolve();
        };
        img.src = this.src;
      });

      return $.when.apply($, dfds);
    }
  });

  /* Button Parallax - Optimized with event delegation and throttle */
  function brighthub_el_parallax() {
    // Use event delegation for better performance
    var btnParallaxHandler = throttle(function (e) {
      const $this = $(e.currentTarget);
      const bounds = e.currentTarget.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height;
      const deltaX = Math.floor(centerX - e.clientX) * 0.172;
      const deltaY = Math.floor(centerY - e.clientY) * 0.273;
      $this.find(".pxl--btn-text").css({
        transform: "translate3d(" + deltaX * 0.32 + "px, " + deltaY * 0.32 + "px, 0px)"
      });
      $this.css({
        transform: "translate3d(" + deltaX * 0.25 + "px, " + deltaY * 0.25 + "px, 0px)"
      });
    }, 16);

    $document.on("mouseenter", ".btn-text-parallax", function () {
      $(this).addClass("hovered");
    });
    $document.on("mouseleave", ".btn-text-parallax", function () {
      $(this).removeClass("hovered");
    });
    $document.on("mousemove", ".btn-text-parallax", btnParallaxHandler);

    var elParallaxHandler = throttle(function (e) {
      const $this = $(e.currentTarget);
      const bounds = e.currentTarget.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height;
      const deltaX = Math.floor(centerX - e.clientX) * 0.222;
      const deltaY = Math.floor(centerY - e.clientY) * 0.333;
      $this.find(".el-parallax-item").css({
        transform: "translate3d(" + deltaX * 0.32 + "px, " + deltaY * 0.32 + "px, 0px)"
      });
    }, 16);

    $document.on("mouseenter", ".el-parallax-wrap", function () {
      $(this).addClass("hovered");
    });
    $document.on("mouseleave", ".el-parallax-wrap", function () {
      $(this).removeClass("hovered");
    });
    $document.on("mousemove", ".el-parallax-wrap", elParallaxHandler);

    var hoverParallaxHandler = throttle(function (e) {
      const $this = $(e.currentTarget);
      const bounds = e.currentTarget.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height;
      const deltaX = Math.floor(centerX - e.clientX) * 0.222;
      const deltaY = Math.floor(centerY - e.clientY) * 0.333;
      $this.find(".pxl-item-parallax").css({
        transform: "translate3d(" + deltaX * 0.32 + "px, " + deltaY * 0.32 + "px, 0px)"
      });
    }, 16);

    $document.on("mousemove", ".pxl-hover-parallax", hoverParallaxHandler);
  }

  /* Back To Top Progress Bar */
  function brighthub_backtotop_progess_bar() {
    const $scrollTop = $(".pxl-scroll-top");

    if ($scrollTop.length > 0) {
      const progressPath = document.querySelector(".pxl-scroll-progress-circle path");
      const pathLength = progressPath.getTotalLength();

      progressPath.style.transition = "none";
      progressPath.style.strokeDasharray = `${pathLength} ${pathLength}`;
      progressPath.style.strokeDashoffset = pathLength;
      progressPath.getBoundingClientRect();
      progressPath.style.transition = "stroke-dashoffset 10ms linear";

      const updateProgress = () => {
        const scroll = window.scrollY;
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const progress = pathLength - (scroll * pathLength) / height;
        progressPath.style.strokeDashoffset = progress;
      };

      const toggleVisibility = () => {
        const offset = 50;
        if (window.scrollY > offset) {
          $scrollTop.addClass("active-progress");
        } else {
          $scrollTop.removeClass("active-progress");
        }
      };

      // Optimize scroll handler for progress bar
      var progressScrollHandler = throttle(function () {
        updateProgress();
        toggleVisibility();
      }, 16);

      $window.on("scroll", progressScrollHandler);

      updateProgress();
      toggleVisibility();
    }
  }

  // Zoom Point
  function brighthub_zoom_point() {
    $(".pxl-zoom-point").each(function () {
      let scaleOffset = $(this).data("offset");
      let scaleAmount = $(this).data("scale-mount");

      function scrollZoom() {
        const images = document.querySelectorAll("[data-scroll-zoom]");
        let scrollPosY = 0;
        scaleAmount = scaleAmount / 100;

        const observerConfig = {
          rootMargin: "0% 0% 0% 0%",
          threshold: 0
        };

        images.forEach((image) => {
          let isVisible = false;
          const observer = new IntersectionObserver((elements, self) => {
            elements.forEach((element) => {
              isVisible = element.isIntersecting;
            });
          }, observerConfig);

          observer.observe(image);

          image.style.transform = `scale(${1 + scaleAmount * percentageSeen(image)})`;

          // Optimize scroll handler with throttle - use unique namespace
          var imageScrollHandler = throttle(function () {
            if (isVisible) {
              scrollPosY = window.pageYOffset;
              image.style.transform = `scale(${1 + scaleAmount * percentageSeen(image)})`;
            }
          }, 16);

          // Use unique namespace for each image
          var uniqueNamespace =
            "zoomPoint_" + (image.dataset.scrollZoom || Math.random().toString(36).substr(2, 9));
          $window.on("scroll." + uniqueNamespace, imageScrollHandler);
        });

        function percentageSeen(element) {
          const parent = element.parentNode;
          const viewportHeight = window.innerHeight;
          const scrollY = window.scrollY;
          const elPosY = parent.getBoundingClientRect().top + scrollY + scaleOffset;
          const borderHeight =
            parseFloat(getComputedStyle(parent).getPropertyValue("border-bottom-width")) +
            parseFloat(getComputedStyle(element).getPropertyValue("border-top-width"));
          const elHeight = parent.offsetHeight + borderHeight;

          if (elPosY > scrollY + viewportHeight) {
            return 0;
          } else if (elPosY + elHeight < scrollY) {
            return 100;
          } else {
            const distance = scrollY + viewportHeight - elPosY;
            let percentage = distance / ((viewportHeight + elHeight) / 100);
            percentage = Math.round(percentage);

            return percentage;
          }
        }
      }

      scrollZoom();
    });
  }

  // Zoom Point
  function brighthub_smother_scroll() {
    if ($("body").hasClass("body-smooth-scroll")) {
      gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

      const smoother = ScrollSmoother.create({
        smooth: 1,
        effects: true,
        smoothTouch: 0.1
      });
    }
  }

  function checkVisibleItemsForMarquee($scope) {
    const $track = $scope.is("[data-show]") ? $scope : $scope.find("[data-show]").first();
    if (!$track.length) return;

    const visibleCount = parseInt($track.attr("data-show"), 10) || 3;
    const $items = $track.find("> .pxl-marquee__item");
    if (!$items.length) return;

    let $viewport = $track.closest(".pxl-marquee__viewport, [data-marquee-viewport]").first();
    if (!$viewport.length) {
      $viewport = $track
        .parents()
        .filter(function () {
          const s = getComputedStyle(this);
          return /(hidden|clip|auto|scroll)/.test(s.overflowX);
        })
        .first();
    }
    if (!$viewport.length) $viewport = $track.parent();

    const vRect = $viewport[0].getBoundingClientRect();
    const centerX = (vRect.left + vRect.right) / 2;

    const visibles = [];
    $items.each(function () {
      const r = this.getBoundingClientRect();
      const intersects = !(r.right <= vRect.left || r.left >= vRect.right);
      if (!intersects) return;

      const itemCenter = (r.left + r.right) / 2;
      const distance = Math.abs(itemCenter - centerX);
      visibles.push({ el: this, distance });
    });

    $items.removeClass("active active-center");
    if (!visibles.length) return;

    visibles
      .sort((a, b) => a.distance - b.distance)
      .slice(0, Math.max(1, visibleCount))
      .forEach((v, i) => {
        const $el = $(v.el).addClass("active");
        if (i === 0) $el.addClass("active-center");
      });
  }

  function updateAllMarquees() {
    $(".pxl-marquee__style-2").each(function () {
      $(this)
        .find(".pxl-marquee__list[data-show]")
        .each(function () {
          checkVisibleItemsForMarquee($(this));
        });
    });
  }

  function checkIfMorePosts(nextPage, button, callback) {
    $.ajax({
      type: "POST",
      url: loadmore_params.ajax_url,
      data: {
        action: "check_more_posts",
        page: nextPage
      },
      success: function (res) {
        if (!res.success) {
          $(".pxl-posts").css("padding-bottom", "0");
          button.remove();
        }
        if (callback) callback();
      },
      error: function (error) {
        if (typeof console !== "undefined" && console.error) {
          console.error("Load more posts error:", error);
        }
      }
    });
  }
})(jQuery);

jQuery(document).ready(function ($) {
  $(".pxl-tabs--layout-3-form").each(function () {
    var $currentForm = $(this);

    var $currencyItems = $currentForm.find('.pxl-tabs__switch-currency-item input[type="radio"]');
    if ($currencyItems.length <= 1) {
      $currentForm.find(".pxl-tabs__switch-currency").hide();
      if ($currencyItems.length === 1) {
        $currencyItems.prop("checked", true);
      }
    }

    $currentForm
      .find('.pxl-tabs__input-number-group input[type="radio"]')
      .on("change", function () {
        calculatePrice(this, $currentForm);
        $currentForm
          .find(".pxl-tabs__input-number-group .pxl-tabs__input-number")
          .removeClass("active");
        $(this).parent().addClass("active");
      });

    $currentForm
      .find('.pxl-tabs__switch-currency-item input[type="radio"]')
      .on("change", function () {
        calculatePrice(this, $currentForm);
      });

    $currentForm
      .find('.pxl-tabs__input-number-custom input[type="number"]')
      .on("input", function () {
        calculatePrice(this, $currentForm);
      });

    $currentForm.find("#toggleTab").on("change", function () {
      calculatePrice(this, $currentForm);
    });
  });

  function calculatePrice(triggerElement, $currentForm) {
    var $form = $(triggerElement).closest("form");

    var $currencyChecked = $form.find(
      '.pxl-tabs__switch-currency-item input[type="radio"]:checked'
    );

    var price_each_symbol = $currencyChecked.length ? $currencyChecked.data("symbol") : "$";
    var price_each_plan = $currencyChecked.length ? $currencyChecked.data("price-for-plan") : "";
    var price_each_plan_annual = $currencyChecked.length
      ? $currencyChecked.data("price-for-plan-annual")
      : "";
    var quantity_radio =
      $form.find('.pxl-tabs__input-number-group input[type="radio"]:checked').val() || 1;
    var custom_quantity =
      $form.find('.pxl-tabs__input-number-custom input[type="number"]').val() || 1;

    $currentForm.find(".pxl-tabs__item.active .pxl-pricing__option").each(function () {
      const $option = $(this);
      const st = $option.data("st");

      $option.find(".pxl-pricing__option-text").text(st);
    });

    var isAnnual = $form.find("#toggleTab").is(":checked");
    var quantity =
      quantity_radio === "custom" ? parseInt(custom_quantity) || 1 : parseInt(quantity_radio);

    var prices = price_each_plan ? price_each_plan.split(",").map((p) => parseFloat(p.trim())) : [];
    var prices_annual = price_each_plan_annual
      ? price_each_plan_annual.split(",").map((p) => parseFloat(p.trim()))
      : [];

    $currentForm.find(".pxl-tabs__item.active .pxl-pricing").each(function (index) {
      var base_price = prices[index] || 0;
      var base_price_annual = prices_annual[index] || 0;

      var total_price = base_price * quantity;
      var total_price_annual = base_price_annual * quantity;

      var $priceWrapper = $(this).find(".pxl-pricing__price");
      var $priceValue = $priceWrapper.find("[data-price-st][data-price-nd]");

      $priceValue.attr("data-price-st", total_price).attr("data-price-nd", total_price_annual);

      $priceValue.text(isAnnual ? total_price_annual : total_price);
      if (isAnnual) {
        $priceWrapper
          .find(".pxl-pricing__price-detail")
          .html(
            `${price_each_symbol}<span data-price-nd="${total_price}" data-price-st="${total_price_annual}">${
              isAnnual ? total_price_annual : total_price
            }</span>`
          );
      } else {
        $priceWrapper
          .find(".pxl-pricing__price-detail")
          .html(
            `${price_each_symbol}<span data-price-st="${total_price}" data-price-nd="${total_price_annual}">${
              isAnnual ? total_price_annual : total_price
            }</span>`
          );
      }
    });
  }
});
(function ($) {
  function syncImageByIndex($stepRoot, idx) {
    let $imgList = $stepRoot
      .closest(".e-con")
      .siblings(".e-con")
      .find(".pxl-step-image__list")
      .first();
    if (!$imgList.length) {
      $imgList = $stepRoot
        .closest(".elementor-element")
        .parent()
        .find(".pxl-step-image__list")
        .first();
    }
    const $items = $imgList.children("li");
    if (!$items.length) return;
    const i = Math.max(0, Math.min(idx, $items.length - 1));
    $items.removeClass("active").eq(i).addClass("active");
  }

  function initPxlStepStyle3($root) {
    const $wrap = $root.find(".pxl-step__feature");
    const $items = $wrap.find(".pxl-step__feature-item");

    $items.each(function () {
      const $it = $(this);
      const $desc = $it.find(".pxl-step__feature-desc");
      const $tit = $it.find(".pxl-step__feature-title");
      $tit.attr({ role: "button", tabindex: 0, "aria-expanded": $it.hasClass("active") });
      $desc.css("display", $it.hasClass("active") ? "block" : "none");
    });

    function openItem($item) {
      const idx = $item.index();
      const $desc = $item.find(".pxl-step__feature-desc");
      $items
        .not($item)
        .removeClass("active")
        .find(".pxl-step__feature-desc")
        .stop(true, true)
        .slideUp(220);
      $items.not($item).find(".pxl-step__feature-title").attr("aria-expanded", "false");

      $item.addClass("active");
      $item.find(".pxl-step__feature-title").attr("aria-expanded", "true");
      $desc.stop(true, true).slideDown(220);

      syncImageByIndex($root, idx);
    }

    function toggleItem($item) {
      if ($item.hasClass("active")) return;
      openItem($item);
    }

    const prefersAuto = $root.hasClass("auto-play");
    let isInView = false;
    let isPausedByHover = false;
    const AUTO_DELAY = 3000;

    let currentIndex = Math.max(0, $items.filter(".active").index());
    let autoTimer = null;

    function clearAuto() {
      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
      }
    }

    function canAutoRun() {
      return prefersAuto && isInView && !isPausedByHover;
    }

    function queueNext(fromIdx) {
      if (typeof fromIdx === "number" && !Number.isNaN(fromIdx)) {
        currentIndex = fromIdx;
      } else {
        const act = $items.filter(".active").index();
        if (act >= 0) currentIndex = act;
      }
      clearAuto();
      if (!canAutoRun()) return;

      autoTimer = setTimeout(function () {
        currentIndex = (currentIndex + 1) % $items.length;
        openItem($items.eq(currentIndex));
        queueNext();
      }, AUTO_DELAY);
    }

    $wrap.off("click.pxlStepSync").on("click.pxlStepSync", ".pxl-step__feature-item", function (e) {
      if ($(e.target).closest("a, button").length) return;
      const $it = $(this);
      const idx = $it.index();
      toggleItem($it);
      if (prefersAuto) queueNext(idx);
    });

    const $initial = $items.filter(".active").first();
    if ($initial.length) {
      syncImageByIndex($root, $initial.index());
    } else if ($items.length) {
      openItem($items.eq(0));
    }

    $root
      .on("mouseenter", function () {
        isPausedByHover = true;
        clearAuto();
      })
      .on("mouseleave", function () {
        isPausedByHover = false;
        if (canAutoRun()) queueNext();
      });

    function handleVisibilityChange(inView) {
      isInView = inView;
      if (isInView) {
        if (canAutoRun()) queueNext();
      } else {
        clearAuto();
      }
    }

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target === $root[0]) {
              handleVisibilityChange(entry.isIntersecting && entry.intersectionRatio >= 0.2);
            }
          });
        },
        {
          root: null,
          threshold: [0, 0.2, 0.5, 1],
          rootMargin: "0px 0px -100px 0px"
        }
      );
      io.observe($root[0]);

      setTimeout(() => {
        const rect = $root[0].getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const inViewNow = rect.top < vh - 100 && rect.bottom > 0;
        handleVisibilityChange(inViewNow);
      }, 0);
    } else {
      function checkInView() {
        const rect = $root[0].getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const inViewNow = rect.top < vh - 100 && rect.bottom > 0;
        handleVisibilityChange(inViewNow);
      }
      var checkInViewThrottled = throttle(checkInView, 100);
      $window.on("scroll.pxlStepSync resize.pxlStepSync", checkInViewThrottled);
      checkInView();
    }
  }

  $(function () {
    $(".pxl-step__style-3").each(function () {
      initPxlStepStyle3($(this));
    });
  });

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    // GSAP not available, skip
  } else {
    gsap.registerPlugin(ScrollTrigger);

    function killZoomTriggers() {
      if (!window.__pxlZoomSTs.length) return;
      window.__pxlZoomSTs.forEach((st) => {
        try {
          st.kill(true);
        } catch (e) {}
      });
      window.__pxlZoomSTs = [];
    }

    function toNumber(v, def = 0) {
      if (v == null || v === "") return def;
      const n = parseFloat(String(v).replace(/[^\-\d.]/g, ""));
      return Number.isFinite(n) ? n : def;
    }
    function parsePx(v, def = 0) {
      return toNumber(v, def);
    }

    function parseScale(section) {
      const ds = section.dataset.zoomScale;
      if (ds != null && ds !== "") return toNumber(ds, 0.15);
      const legacy = section.dataset.zoomStart;
      if (legacy != null && legacy !== "") return toNumber(legacy, 15) / 100;
      return 0.15;
    }

    function screenPos(section, key, fb) {
      const v = section.dataset[key];
      const pct = v != null && v !== "" ? toNumber(v, fb) : fb;
      return `top ${pct}%`;
    }

    function safeAnimFromData(el) {
      const attr = el.getAttribute("data-settings");
      if (!attr) return null;
      try {
        const st = JSON.parse(attr);
        return st && (st._animation || st.animation) ? st._animation || st.animation : null;
      } catch (e) {
        return null;
      }
    }
    function getElAnimName(el) {
      const fromData = safeAnimFromData(el);
      if (fromData) return fromData;
      const c = Array.from(el.classList).find((cl) => cl.startsWith("e-animations-"));
      return c ? c.replace("e-animations-", "") : null;
    }
    function playElementorEntrance(el, name) {
      el.classList.remove("elementor-invisible");
      if (!name) return;
      if (!el.classList.contains("e-animated")) el.classList.add("e-animated");
      const cls = `e-animations-${name}`;
      if (!el.classList.contains(cls)) el.classList.add(cls);
    }

    function initZoomScroll() {
      killZoomTriggers();

      const prefersReduce =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      document.querySelectorAll(".scroll-item-zoom").forEach((section) => {
        const minW = toNumber(section.dataset.zoomMin, 0);
        const maxW = toNumber(section.dataset.zoomMax, Infinity);
        const w = window.innerWidth;
        if (w < minW && w > maxW) return;

        if (prefersReduce && section.dataset.zoomIgnorePrm !== "1") return;

        const scaleStart = parseScale(section);
        const yStart = parsePx(section.dataset.zoomTop, 20);
        const startPos = screenPos(section, "zoomStartScreen", 80);
        const endPos = screenPos(section, "zoomEndScreen", 0);
        const showMarkers = !!section.dataset.zoomDebug;

        const origin =
          section.dataset.zoomOrigin && section.dataset.zoomOrigin.trim()
            ? section.dataset.zoomOrigin.trim()
            : "top center";

        let trigger = section;
        if (section.dataset.zoomTrigger) {
          const t =
            section.closest(section.dataset.zoomTrigger) ||
            section.querySelector(section.dataset.zoomTrigger);
          if (t) trigger = t;
        }

        section.style.transformOrigin = origin;
        section.style.willChange = "transform";

        const tween = gsap.fromTo(
          section,
          { scale: scaleStart, y: yStart },
          {
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: trigger,
              start: startPos,
              end: endPos,
              scrub: 0,
              invalidateOnRefresh: true,
              markers: showMarkers,

              // 👉 Thêm toggle class "zoomed" khi kích hoạt / rời vùng trigger
              onToggle(self) {
                section.classList.toggle("zoomed", self.isActive);
              }
            }
          }
        );

        if (tween && tween.scrollTrigger) window.__pxlZoomSTs.push(tween.scrollTrigger);

        // Tự kích hoạt entrance animations của Elementor khi progress ~100%
        const targets = Array.from(section.querySelectorAll(":scope .elementor-element")).filter(
          (el) => {
            if (el === section) return false;
            return !!(
              safeAnimFromData(el) ||
              Array.from(el.classList).some((cl) => cl.startsWith("e-animations-")) ||
              el.classList.contains("elementor-invisible")
            );
          }
        );

        let played = false;
        const stPlay = ScrollTrigger.create({
          trigger: trigger,
          start: startPos,
          end: endPos,
          onUpdate(self) {
            if (!played && self.progress >= 0.99) {
              played = true;
              targets.forEach((el) => {
                if (el.dataset.pxlPlayed === "1") return;
                el.dataset.pxlPlayed = "1";
                playElementorEntrance(el, getElAnimName(el));
              });
            }
          }
        });
        window.__pxlZoomSTs.push(stPlay);
      });

      ScrollTrigger.refresh();
    }

    if (document.readyState === "complete") {
      initZoomScroll();
    } else {
      $(window).on("load", initZoomScroll);
    }

    $(window).on("resize", function () {
      clearTimeout(window.__pxlZoomResizeTimeout);
      window.__pxlZoomResizeTimeout = setTimeout(initZoomScroll, 200);
    });
  }
  $(document).on("click", ".pxl-pricing__style-9 .pxl-pricing__option-text", function (e) {
    e.preventDefault();

    const $pricing = $(this).closest(".pxl-pricing__style-9");

    if ($pricing.hasClass("active")) {
      $pricing.removeClass("active");
    } else {
      $pricing.addClass("active");
    }
  });
})(jQuery);
(function () {
  const blobs = document.querySelectorAll(".pxl-light-blob");

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  blobs.forEach((blob, i) => {
    const radiusX = random(10, 22);
    const radiusY = random(8, 18);

    const durationMin = random(3300, 5300);
    const durationMax = random(5300, 8000);

    function move() {
      const x = random(-radiusX, radiusX);
      const y = random(-radiusY, radiusY);

      const duration = random(durationMin, durationMax);
      blob.style.transitionDuration = `${duration}ms`;

      blob.style.transform = `translate3d(${x}vw, ${y}vh, 0)`;
    }

    setTimeout(() => {
      move();
      setInterval(move, random(durationMin, durationMax));
    }, i * 400);
  });
})();

// Ensure video background loops reliably across browsers
(function () {
  function initVideoBackgroundLoop() {
    const videos = document.querySelectorAll(".pxl-video-background video");
    if (!videos.length) return;

    videos.forEach((video) => {
      try {
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
      } catch (e) {}

      video.addEventListener("ended", function () {
        try {
          video.currentTime = 0;
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(function () {});
        } catch (e) {}
      });

      try {
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      } catch (e) {}
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVideoBackgroundLoop);
  } else {
    initVideoBackgroundLoop();
  }
})();
