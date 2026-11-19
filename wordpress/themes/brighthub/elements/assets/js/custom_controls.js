(function ($) {
  "use strict";

  var brighthubCustomControlsInitialized = false;
  var brighthubHooksRegistered = false;
  var brighthubResizeTimeout = null;

  function brighthub_section_start_render() {
    if (brighthubHooksRegistered) return;

    // Hỗ trợ cả frontend và editor mode
    var _elementor = null;
    if (typeof elementorFrontend !== "undefined" && elementorFrontend.hooks) {
      _elementor = elementorFrontend;
    } else if (typeof elementor !== "undefined" && elementor.hooks) {
      _elementor = elementor;
    }

    if (!_elementor || !_elementor.hooks) {
      // Retry sau một chút nếu chưa sẵn sàng (cho editor)
      setTimeout(function () {
        if (!brighthubHooksRegistered) {
          brighthub_section_start_render();
        }
      }, 500);
      return;
    }

    function hex2rgba(color, opacity) {
      if (!color) return "rgb(0,0,0)";
      if (color[0] === "#") {
        color = color.substring(1);
      }
      var hex;
      if (color.length === 6) {
        hex = [color.substring(0, 2), color.substring(2, 4), color.substring(4, 6)];
      } else if (color.length === 3) {
        hex = [color[0] + color[0], color[1] + color[1], color[2] + color[2]];
      } else {
        return "rgb(0,0,0)";
      }
      var rgb = hex.map(function (h) {
        return parseInt(h, 16);
      });
      if (opacity !== undefined && opacity !== false) {
        if (Math.abs(opacity) > 1) opacity = 1.0;
        return "rgba(" + rgb.join(",") + "," + opacity + ")";
      } else {
        return "rgb(" + rgb.join(",") + ")";
      }
    }

    function getLineResponsiveClasses(settings, position) {
      var responsiveClasses = [];
      var positionKey = position.replace(/-/g, "_");

      if (settings["pxl_container_line_hide_laptop_" + positionKey]) {
        responsiveClasses.push("pxl-hide-laptop");
      }
      if (settings["pxl_container_line_hide_tablet_landscape_" + positionKey]) {
        responsiveClasses.push("pxl-hide-tablet-landscape");
      }
      if (settings["pxl_container_line_hide_tablet_portrait_" + positionKey]) {
        responsiveClasses.push("pxl-hide-tablet-portrait");
      }
      if (settings["pxl_container_line_hide_mobile_landscape_" + positionKey]) {
        responsiveClasses.push("pxl-hide-mobile-landscape");
      }
      if (settings["pxl_container_line_hide_mobile_portrait_" + positionKey]) {
        responsiveClasses.push("pxl-hide-mobile-portrait");
      }

      return responsiveClasses.length > 0 ? " " + responsiveClasses.join(" ") : "";
    }

    function getResponsiveLineStyles(settings, isVertical) {
      var laptopStyle = settings.pxl_container_line_s_laptop || "gr-df";
      var laptopStyleLr = settings.pxl_container_line_srl_laptop || "gr-df";
      var laptopColor = settings.pxl_container_line_c_laptop || "";

      var tabletLandscapeStyle =
        settings.pxl_container_line_s_tablet_landscape &&
        settings.pxl_container_line_s_tablet_landscape !== "inherit"
          ? settings.pxl_container_line_s_tablet_landscape
          : laptopStyle;
      var tabletLandscapeStyleLr =
        settings.pxl_container_line_srl_tablet_landscape &&
        settings.pxl_container_line_srl_tablet_landscape !== "inherit"
          ? settings.pxl_container_line_srl_tablet_landscape
          : laptopStyleLr;
      var tabletLandscapeColor = settings.pxl_container_line_c_tablet_landscape || laptopColor;

      var tabletPortraitStyle =
        settings.pxl_container_line_s_tablet_portrait &&
        settings.pxl_container_line_s_tablet_portrait !== "inherit"
          ? settings.pxl_container_line_s_tablet_portrait
          : tabletLandscapeStyle;
      var tabletPortraitStyleLr =
        settings.pxl_container_line_srl_tablet_portrait &&
        settings.pxl_container_line_srl_tablet_portrait !== "inherit"
          ? settings.pxl_container_line_srl_tablet_portrait
          : tabletLandscapeStyleLr;
      var tabletPortraitColor =
        settings.pxl_container_line_c_tablet_portrait || tabletLandscapeColor;

      var mobileLandscapeStyle =
        settings.pxl_container_line_s_mobile_landscape &&
        settings.pxl_container_line_s_mobile_landscape !== "inherit"
          ? settings.pxl_container_line_s_mobile_landscape
          : tabletPortraitStyle;
      var mobileLandscapeStyleLr =
        settings.pxl_container_line_srl_mobile_landscape &&
        settings.pxl_container_line_srl_mobile_landscape !== "inherit"
          ? settings.pxl_container_line_srl_mobile_landscape
          : tabletPortraitStyleLr;
      var mobileLandscapeColor =
        settings.pxl_container_line_c_mobile_landscape || tabletPortraitColor;

      var mobilePortraitStyle =
        settings.pxl_container_line_s_mobile_portrait &&
        settings.pxl_container_line_s_mobile_portrait !== "inherit"
          ? settings.pxl_container_line_s_mobile_portrait
          : mobileLandscapeStyle;
      var mobilePortraitStyleLr =
        settings.pxl_container_line_srl_mobile_portrait &&
        settings.pxl_container_line_srl_mobile_portrait !== "inherit"
          ? settings.pxl_container_line_srl_mobile_portrait
          : mobileLandscapeStyleLr;
      var mobilePortraitColor =
        settings.pxl_container_line_c_mobile_portrait || mobileLandscapeColor;

      return {
        laptop: { style: isVertical ? laptopStyle : laptopStyleLr, color: laptopColor },
        tablet_landscape: {
          style: isVertical ? tabletLandscapeStyle : tabletLandscapeStyleLr,
          color: tabletLandscapeColor
        },
        tablet_portrait: {
          style: isVertical ? tabletPortraitStyle : tabletPortraitStyleLr,
          color: tabletPortraitColor
        },
        mobile_landscape: {
          style: isVertical ? mobileLandscapeStyle : mobileLandscapeStyleLr,
          color: mobileLandscapeColor
        },
        mobile_portrait: {
          style: isVertical ? mobilePortraitStyle : mobilePortraitStyleLr,
          color: mobilePortraitColor
        }
      };
    }

    function generateLineCss(style, color, isVertical) {
      if (!color) return "";

      if (isVertical) {
        switch (style) {
          case "gr-btt":
            return (
              "background: linear-gradient(180deg, " +
              hex2rgba(color, 0) +
              " 0%, " +
              hex2rgba(color, 0.88) +
              " 50%, " +
              color +
              " 100%);"
            );
          case "gr-ttb":
            return (
              "background: linear-gradient(180deg, " +
              color +
              " 0%, " +
              hex2rgba(color, 0.88) +
              " 50%, " +
              hex2rgba(color, 0) +
              " 100%);"
            );
          case "gr-df":
            return (
              "background: linear-gradient(180deg, " +
              hex2rgba(color, 0) +
              " 0%, " +
              color +
              " 25%, " +
              color +
              " 50%, " +
              color +
              " 75%, " +
              hex2rgba(color, 0) +
              " 100%);"
            );
          case "gr-df-bold":
            return (
              "background: linear-gradient(180deg, " +
              hex2rgba(color, 0) +
              " 0%, " +
              hex2rgba(color, 0.8) +
              " 25%, " +
              color +
              " 50%, " +
              hex2rgba(color, 0.8) +
              " 75%, " +
              hex2rgba(color, 0) +
              " 100%);"
            );
          case "clr":
            return "background: " + color + ";";
          default:
            return "background: " + color + ";";
        }
      } else {
        switch (style) {
          case "gr-rtl":
            return (
              "background: linear-gradient(90deg, " +
              color +
              " 0%, " +
              hex2rgba(color, 0.88) +
              " 50%, " +
              hex2rgba(color, 0) +
              " 100%);"
            );
          case "gr-ltr":
            return (
              "background: linear-gradient(90deg, " +
              hex2rgba(color, 0) +
              " 0%, " +
              hex2rgba(color, 0.88) +
              " 50%, " +
              color +
              " 100%);"
            );
          case "gr-df":
            return (
              "background: linear-gradient(90deg, " +
              hex2rgba(color, 0) +
              " 0%, " +
              hex2rgba(color, 0.13) +
              " 25%, " +
              hex2rgba(color, 0.16) +
              " 50%, " +
              hex2rgba(color, 0.13) +
              " 75%, " +
              hex2rgba(color, 0) +
              " 100%);"
            );
          case "gr-df-bold":
            return (
              "background: linear-gradient(90deg, " +
              hex2rgba(color, 0) +
              " 0%, " +
              hex2rgba(color, 0.8) +
              " 25%, " +
              hex2rgba(color, 1) +
              " 50%, " +
              hex2rgba(color, 0.8) +
              " 75%, " +
              hex2rgba(color, 0) +
              " 100%);"
            );
          case "clr":
            return "background: " + color + ";";
          default:
            return "background: " + color + ";";
        }
      }
    }

    var filterExists = false;
    try {
      var filters = _elementor.hooks.filters || {};
      if (filters["pxl_element_container/before-render"]) {
        filterExists = true;
      }
    } catch (e) {}

    if (!filterExists) {
      _elementor.hooks.addFilter(
        "pxl_element_container/before-render",
        function (html, settings, el) {
          if (
            typeof settings.pxl_container_border_options !== "undefined" &&
            Array.isArray(settings.pxl_container_border_options) &&
            settings.pxl_container_border_options.length > 0
          ) {
            var sides = settings.pxl_container_border_options;
            var style = settings.pxl_container_border_style || "1";
            var styleClass = Array.isArray(style) ? style.join("-") : style;

            html +=
              '<div class="pxl-container-border pxl-container-border__style-' + styleClass + '">';
            sides.forEach(function (side) {
              html +=
                '<span class="pxl-container-border__item pxl-container-border__item-' +
                side +
                '"></span>';
            });
            html += "</div>";
          }

          if (
            typeof settings.pxl_container_line_o !== "undefined" &&
            Array.isArray(settings.pxl_container_line_o) &&
            settings.pxl_container_line_o.length > 0
          ) {
            var linePositions = settings.pxl_container_line_o;

            linePositions.forEach(function (item) {
              var responsiveClassString = getLineResponsiveClasses(settings, item);
              var isVertical =
                item === "left" || item === "right" || item.indexOf("vertical") !== -1;

              var responsiveStyles = getResponsiveLineStyles(settings, isVertical);

              var laptopCss = generateLineCss(
                responsiveStyles.laptop.style,
                responsiveStyles.laptop.color,
                isVertical
              );
              var tabletLandscapeCss = generateLineCss(
                responsiveStyles.tablet_landscape.style,
                responsiveStyles.tablet_landscape.color,
                isVertical
              );
              var tabletPortraitCss = generateLineCss(
                responsiveStyles.tablet_portrait.style,
                responsiveStyles.tablet_portrait.color,
                isVertical
              );
              var mobileLandscapeCss = generateLineCss(
                responsiveStyles.mobile_landscape.style,
                responsiveStyles.mobile_landscape.color,
                isVertical
              );
              var mobilePortraitCss = generateLineCss(
                responsiveStyles.mobile_portrait.style,
                responsiveStyles.mobile_portrait.color,
                isVertical
              );

              html +=
                '<span class="pxl-line pxl-line__' +
                item +
                responsiveClassString +
                '" ' +
                'data-laptop-style="' +
                laptopCss +
                '" ' +
                'data-tablet-landscape-style="' +
                tabletLandscapeCss +
                '" ' +
                'data-tablet-portrait-style="' +
                tabletPortraitCss +
                '" ' +
                'data-mobile-landscape-style="' +
                mobileLandscapeCss +
                '" ' +
                'data-mobile-portrait-style="' +
                mobilePortraitCss +
                '" ' +
                'style="' +
                laptopCss +
                '"></span>';
            });
          }

          if (
            typeof settings.pxl_container_overlay_sides !== "undefined" &&
            Array.isArray(settings.pxl_container_overlay_sides) &&
            settings.pxl_container_overlay_sides.length > 0
          ) {
            var sides = settings.pxl_container_overlay_sides;
            var type = settings.pxl_container_overlay_type || "default";

            sides.forEach(function (side) {
              html +=
                '<span class="pxl-container-overlay__item pxl-container-overlay__item-' +
                side +
                " pxl-container-overlay__item-" +
                type +
                '"></span>';
            });
          }

          if (
            typeof settings.pxl_dot_container_pos !== "undefined" &&
            Array.isArray(settings.pxl_dot_container_pos) &&
            settings.pxl_dot_container_pos.length > 0
          ) {
            var items = settings.pxl_dot_container_pos;
            var type = settings.pxl_dot_container_type || "default";

            items.forEach(function (item) {
              html += '<span class="pxl-dot pxl-dot__' + item + " pxl-dot__" + type + '"></span>';
            });
          }

          if (
            typeof settings.pxl_background_reveal_dot_pos !== "undefined" &&
            settings.pxl_background_reveal_dot_pos &&
            settings.pxl_background_reveal_dot_pos !== "none" &&
            (Array.isArray(settings.pxl_background_reveal_dot_pos) ||
              typeof settings.pxl_background_reveal_dot_pos === "string")
          ) {
            var brdItems = settings.pxl_background_reveal_dot_pos;
            if (!Array.isArray(brdItems)) brdItems = [brdItems];

            brdItems
              .filter(function (item) {
                return item !== "" && item !== "none";
              })
              .forEach(function (item) {
                var uid = "pxl-reveal-" + Math.random().toString(36).substr(2, 9);
                html +=
                  '<div class="pxl-background-reveal-dot-wrap pxl-background-reveal-dot__' +
                  item +
                  '" data-reveal-pos="' +
                  item +
                  '">';
                html +=
                  '<svg class="pxl-background-reveal-dot-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">';
                html += "<defs>";
                html +=
                  '<pattern id="' +
                  uid +
                  '-dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">';
                html += '<circle cx="0" cy="0" r="2.0" fill="white" opacity="0.5" />';
                html += '<circle cx="30" cy="0" r="2.0" fill="white" opacity="0.5" />';
                html += '<circle cx="60" cy="0" r="2.0" fill="white" opacity="0.5" />';
                html += '<circle cx="15" cy="30" r="2.0" fill="white" opacity="0.5" />';
                html += '<circle cx="45" cy="30" r="2.0" fill="white" opacity="0.5" />';
                html += '<circle cx="75" cy="30" r="2.0" fill="white" opacity="0.5" />';
                html += '<circle cx="0" cy="60" r="2.0" fill="white" opacity="0.5" />';
                html += '<circle cx="30" cy="60" r="2.0" fill="white" opacity="0.5" />';
                html += '<circle cx="60" cy="60" r="2.0" fill="white" opacity="0.5" />';
                html += '<circle cx="15" cy="15" r="2.0" fill="white" opacity="0.2" />';
                html += '<circle cx="45" cy="15" r="2.0" fill="white" opacity="0.2" />';
                html += '<circle cx="15" cy="45" r="2.0" fill="white" opacity="0.2" />';
                html += '<circle cx="45" cy="45" r="2.0" fill="white" opacity="0.2" />';
                html += "</pattern>";
                html +=
                  '<radialGradient id="' +
                  uid +
                  '-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">';
                html += '<stop offset="0%" stop-color="white" stop-opacity="1" />';
                html += '<stop offset="40%" stop-color="white" stop-opacity="0.6" />';
                html += '<stop offset="70%" stop-color="white" stop-opacity="0" />';
                html += "</radialGradient>";
                html += '<mask id="' + uid + '-mask">';
                html += '<rect width="100%" height="100%" fill="black" />';
                html +=
                  '<ellipse id="' +
                  uid +
                  '-light" cx="50%" cy="50%" rx="40%" ry="25%" fill="url(#' +
                  uid +
                  '-grad)" />';
                html += "</mask>";
                html += "</defs>";
                html +=
                  '<rect width="100%" height="100%" fill="url(#' +
                  uid +
                  '-dots)" mask="url(#' +
                  uid +
                  '-mask)" />';
                html += "</svg>";
                html +=
                  '<span class="pxl-background-reveal-dot pxl-background-reveal-dot__' +
                  item +
                  '"></span>';
                html += "</div>";
              });
          }

          if (
            settings &&
            settings.pxl_background_reveal_extra_light_pos &&
            settings.pxl_background_reveal_extra_light_pos !== "" &&
            settings.pxl_background_reveal_extra_light_pos !== "none"
          ) {
            var extra_light_pos = settings.pxl_background_reveal_extra_light_pos;
            html +=
              '<div class="pxl-background-reveal-extra-light pxl-background-reveal-extra-light__' +
              extra_light_pos +
              '"></div>';
          }

          if (
            typeof settings.pxl_container_link !== "undefined" &&
            settings.pxl_container_link &&
            settings.pxl_container_link.url
          ) {
            var linkAttributes = [];

            if (settings.pxl_container_link.url) {
              linkAttributes.push('href="' + settings.pxl_container_link.url + '"');
            }
            if (settings.pxl_container_link.is_external) {
              linkAttributes.push('target="_blank"');
            }
            if (settings.pxl_container_link.nofollow) {
              linkAttributes.push('rel="nofollow"');
            }

            var attributesString = linkAttributes.join(" ");
            html += "<a " + attributesString + ' class="pxl-container pxl-container__link"></a>';
          }

          function addStarAndLight() {
            if (
              settings.pxl_container_star_color_option === "yes" &&
              settings.pxl_container_star_color
            ) {
              const w = (settings.pxl_container_star_width || {}).size ?? null;
              const wu = (settings.pxl_container_star_width || {}).unit ?? "px";
              const h = (settings.pxl_container_star_height || {}).size ?? null;
              const hu = (settings.pxl_container_star_height || {}).unit ?? "px";
              const n = settings.pxl_container_star_number ?? 60;

              let starStyle = "";
              if (Number.isFinite(w)) starStyle += `width:${w}${wu};`;
              if (Number.isFinite(h)) starStyle += `height:${h}${hu};`;

              html +=
                `<canvas class="pxl-star"` +
                ` data-color="${settings.pxl_container_star_color}"` +
                ` data-star="${n}"` +
                ` style="${starStyle}"></canvas>`;
            }

            if (
              settings.pxl_container_light_color_option === "yes" &&
              settings.pxl_container_light_color
            ) {
              const w =
                (settings.pxl_container_light_width || {}).size ??
                (settings.pxl_container_star_width || {}).size ??
                null;
              const wu =
                (settings.pxl_container_light_width || {}).unit ??
                (settings.pxl_container_star_width || {}).unit ??
                "px";
              const h =
                (settings.pxl_container_light_height || {}).size ??
                (settings.pxl_container_star_height || {}).size ??
                null;
              const hu =
                (settings.pxl_container_light_height || {}).unit ??
                (settings.pxl_container_star_height || {}).unit ??
                "px";

              const blurVal = (settings.pxl_container_light_blur || {}).size ?? 0;
              const opacityRaw = (settings.pxl_container_light_opacity || {}).size ?? 100;
              const opacity = Math.max(0, Math.min(+opacityRaw / 100, 1));

              let lightStyle = "";
              if (Number.isFinite(w)) lightStyle += `width:${w}${wu};`;
              if (Number.isFinite(h)) lightStyle += `height:${h}${hu};`;
              lightStyle += `background:${settings.pxl_container_light_color};`;
              lightStyle += `opacity:${opacity};`;
              if (blurVal > 0) lightStyle += `filter:blur(${blurVal}px);`;

              clearTimeout(window.pxlRenderStarTimeout);
              window.pxlRenderStarTimeout = setTimeout(() => {
                const canvas = document.createElement("canvas");
                canvas.className = "pxl-star";
                canvas.setAttribute("data-color", settings.pxl_container_star_color);
                const n = settings.pxl_container_star_number ?? 60;
                canvas.setAttribute("data-star", n);
                document.querySelector(".elementor-element-" + settings._id)?.appendChild(canvas);
              }, 2000);
            }
          }
          addStarAndLight();

          return html;
        }
      );
    }

    var actionExists = false;
    try {
      var actions = _elementor.hooks.actions || {};
      if (actions["frontend/element_ready/container"]) {
        actionExists = true;
      }
    } catch (e) {}

    if (!actionExists) {
      _elementor.hooks.addAction("frontend/element_ready/container", function ($scope) {
        applyResponsiveLineStyles();
        addResizeListener();
        initStickyContainer($scope);
        initBackgroundRevealDots($scope);
        initBackgroundRevealExtraLight($scope);
      });
    }

    brighthubHooksRegistered = true;
  }

  function applyResponsiveLineStyles() {
    if (brighthubResizeTimeout) {
      clearTimeout(brighthubResizeTimeout);
    }

    brighthubResizeTimeout = setTimeout(function () {
      const lines = document.querySelectorAll(".pxl-line[data-laptop-style]");
      const windowWidth = window.innerWidth;

      lines.forEach((line) => {
        let targetStyle = "";
        if (windowWidth <= 575) {
          targetStyle =
            line.getAttribute("data-mobile-portrait-style") ||
            line.getAttribute("data-mobile-landscape-style") ||
            line.getAttribute("data-tablet-portrait-style") ||
            line.getAttribute("data-tablet-landscape-style") ||
            line.getAttribute("data-laptop-style");
        } else if (windowWidth <= 767) {
          targetStyle =
            line.getAttribute("data-mobile-landscape-style") ||
            line.getAttribute("data-tablet-portrait-style") ||
            line.getAttribute("data-tablet-landscape-style") ||
            line.getAttribute("data-laptop-style");
        } else if (windowWidth <= 1024) {
          targetStyle =
            line.getAttribute("data-tablet-portrait-style") ||
            line.getAttribute("data-tablet-landscape-style") ||
            line.getAttribute("data-laptop-style");
        } else if (windowWidth <= 1366) {
          targetStyle =
            line.getAttribute("data-tablet-landscape-style") ||
            line.getAttribute("data-laptop-style");
        } else {
          targetStyle = line.getAttribute("data-laptop-style");
        }

        if (targetStyle) {
          const currentStyles = line.style.cssText.replace(/background[^;]*;?/g, "").trim();
          line.style.cssText = targetStyle + (currentStyles ? "; " + currentStyles : "");
        }
      });
    }, 100);
  }

  var resizeListenerAdded = false;
  function addResizeListener() {
    if (resizeListenerAdded) return;
    resizeListenerAdded = true;
    $(window).on("resize.brighthubResponsiveLines", function () {
      applyResponsiveLineStyles();
    });
  }

  function initStickyContainer($container) {
    // Không chạy trong editor mode
    if (
      $("body").hasClass("elementor-editor-active") ||
      (typeof elementor !== "undefined" && elementor.config && elementor.config.is_edit_mode)
    ) {
      return;
    }

    if (!$container.hasClass("pxl-sticky-container") || !$container.data("pxl-sticky")) return;
    if ($container.data("pxl-sticky-initialized")) return;
    $container.data("pxl-sticky-initialized", true);

    var stickyOffset = parseInt($container.data("sticky-offset"));
    var stickyMode = $container.data("sticky-mode");
    var triggerPosition = parseInt($container.data("trigger-position"));
    var hideOnFooter = parseInt($container.data("ft-hide"));

    var originalCss = {
      position: $container.css("position"),
      top: stickyMode === "top" ? $container.css("top") : "unset",
      bottom: stickyMode === "bottom" ? $container.css("bottom") : "unset",
      left: $container.css("left"),
      width: $container.css("width"),
      zIndex: $container.css("z-index")
    };

    var $footer = $(".pxl-footer-show");
    var footerTop = $footer.length ? $footer.offset().top : 0;
    var scrollAnimationFrame = null;

    var $sectionContainer = $container.closest(".elementor-section, section, .elementor-container");
    var sectionBottom = 0;
    var isStickyActive = false;

    function updateSectionBounds() {
      if ($sectionContainer.length) {
        var offset = $sectionContainer.offset();
        sectionBottom = offset.top + $sectionContainer.outerHeight();
      }
    }

    var lastScrollCheck = 0;
    var lastScrollTop = $(window).scrollTop();

    function handleScroll() {
      var now = Date.now();
      if (now - lastScrollCheck < 10) {
        // Throttle để tránh quá nhiều lần check
        return;
      }
      lastScrollCheck = now;

      var currentScrollTop = $(window).scrollTop();
      lastScrollTop = currentScrollTop;

      if (scrollAnimationFrame) {
        cancelAnimationFrame(scrollAnimationFrame);
      }

      scrollAnimationFrame = requestAnimationFrame(function () {
        scrollAnimationFrame = null;
        var scrollTop = $(window).scrollTop();
        var windowHeight = $(window).height();

        if (scrollTop >= triggerPosition) {
          if (footerTop && scrollTop + windowHeight >= footerTop - hideOnFooter) {
            if ($container.hasClass("pxl-sticky-active")) {
              var resetCss = { ...originalCss };
              if (stickyMode === "top") {
                delete resetCss.bottom;
              } else {
                delete resetCss.top;
              }
              $container.removeClass("pxl-sticky-active").css(resetCss);
              isStickyActive = false;
            }
          } else {
            if (!$container.hasClass("pxl-sticky-active")) {
              var containerWidth = $container.outerWidth();
              var containerLeft = $container.offset().left;

              var cssProps = {
                position: "fixed",
                left: containerLeft + "px",
                width: containerWidth + "px",
                zIndex: 1000
              };

              if (stickyMode === "top") {
                cssProps.top = stickyOffset + "px";
                cssProps.bottom = "unset";
              } else {
                cssProps.bottom = stickyOffset + "px";
                cssProps.top = "unset";
              }

              $container.addClass("pxl-sticky-active").css(cssProps);
              isStickyActive = true;
              updateSectionBounds();
            }
          }
        } else {
          if ($container.hasClass("pxl-sticky-active")) {
            $container.removeClass("pxl-sticky-active").css(originalCss);
            isStickyActive = false;
          }
        }
      });
    }

    var containerId = $container.attr("id") || "sticky-" + Math.random().toString(36).substr(2, 9);
    $(window).on("scroll.brighthubSticky" + containerId, handleScroll);

    var resizeTimeout;
    $(window).on("resize.brighthubSticky", function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        if ($container.hasClass("pxl-sticky-active")) {
          var newWidth = $container.parent().width();
          var newLeft = $container.parent().offset().left;
          $container.css({
            width: newWidth + "px",
            left: newLeft + "px"
          });
        }
        if ($footer.length) {
          footerTop = $footer.offset().top;
        }
        updateSectionBounds();
      }, 150);
    });

    updateSectionBounds();
  }

  function initBackgroundRevealDots($scope) {
    $scope.find(".pxl-background-reveal-dot").each(function () {
      var parent = this.parentElement;
      if (!parent) return;
      var style = window.getComputedStyle(parent);
      if (style.position === "static") {
        parent.style.position = "relative";
      }
    });

    $scope.find(".pxl-background-reveal-dot-svg").each(function () {
      var svg = this;
      var container = $(svg).closest(".pxl-background-reveal-dot-wrap")[0];
      if (!container) return;

      var lightCircle = svg.querySelector('circle[id$="-light"]');
      if (!lightCircle) {
        var mask = svg.querySelector("mask");
        if (mask) {
          lightCircle = mask.querySelector("circle");
        }
      }

      if (!lightCircle) return;

      var dotSpan = container.querySelector(".pxl-background-reveal-dot");
      if (!dotSpan) return;

      dotSpan.style.position = "absolute";

      var posClass = container.getAttribute("data-reveal-pos") || "";
      if (!posClass) {
        for (var i = 0; i < container.classList.length; i++) {
          var cls = container.classList[i];
          if (cls.indexOf("pxl-background-reveal-dot__") === 0) {
            posClass = cls.replace("pxl-background-reveal-dot__", "");
            break;
          }
        }
      }

      function updateLightPosition(x, y) {
        var rect = container.getBoundingClientRect();
        var percentX = (x / rect.width) * 100;
        var percentY = (y / rect.height) * 100;
        lightCircle.setAttribute("cx", percentX + "%");
        lightCircle.setAttribute("cy", percentY + "%");

        dotSpan.style.background =
          "radial-gradient(41.11% 49.57% at " +
          percentX +
          "% " +
          percentY +
          "%, rgba(204, 243, 255, 0.32) 0%, rgba(0, 0, 0, 0.00) 100%)";
      }

      function setFixedPosition() {
        var rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        var percentX = 50;
        var percentY = 50;
        var gradientX = 50;
        var gradientY = 50;

        if (posClass.indexOf("top-left") >= 0 || posClass === "top-left") {
          percentX = 5;
          percentY = 5;
          gradientX = 0;
          gradientY = 0;
        } else if (posClass.indexOf("top-right") >= 0 || posClass === "top-right") {
          percentX = 95;
          percentY = 5;
          gradientX = 100;
          gradientY = 0;
        } else if (posClass.indexOf("bottom-left") >= 0 || posClass === "bottom-left") {
          percentX = 5;
          percentY = 95;
          gradientX = 0;
          gradientY = 100;
        } else if (posClass.indexOf("bottom-right") >= 0 || posClass === "bottom-right") {
          percentX = 95;
          percentY = 95;
          gradientX = 100;
          gradientY = 100;
        } else if (posClass.indexOf("center-top") >= 0 || posClass === "center-top") {
          percentX = 50;
          percentY = 0;
          gradientX = 50;
          gradientY = 0;
        } else if (posClass.indexOf("center-bottom") >= 0 || posClass === "center-bottom") {
          percentX = 50;
          percentY = 100;
          gradientX = 50;
          gradientY = 100;
        } else if (posClass.indexOf("center-left") >= 0 || posClass === "center-left") {
          percentX = 0;
          percentY = 50;
          gradientX = 0;
          gradientY = 50;
        } else if (posClass.indexOf("center-right") >= 0 || posClass === "center-right") {
          percentX = 100;
          percentY = 50;
          gradientX = 100;
          gradientY = 50;
        } else if (posClass.indexOf("center-center") >= 0 || posClass === "center-center") {
          percentX = 50;
          percentY = 50;
          gradientX = 50;
          gradientY = 50;
        }

        lightCircle.setAttribute("cx", percentX + "%");
        lightCircle.setAttribute("cy", percentY + "%");

        dotSpan.style.background =
          "radial-gradient(41.11% 49.57% at " +
          gradientX +
          "% " +
          gradientY +
          "%, rgba(204, 243, 255, 0.32) 0%, rgba(0, 0, 0, 0.00) 100%)";
      }

      if (posClass === "auto" || !posClass) {
        $(container).on("mousemove", function (e) {
          var rect = container.getBoundingClientRect();
          var x = e.clientX - rect.left;
          var y = e.clientY - rect.top;
          updateLightPosition(x, y);
        });
      } else {
        requestAnimationFrame(function () {
          setFixedPosition();
          requestAnimationFrame(setFixedPosition);
        });

        if (typeof ResizeObserver !== "undefined") {
          var resizeObserver = new ResizeObserver(function () {
            setFixedPosition();
          });
          resizeObserver.observe(container);
        }

        $(window).on("resize", function () {
          setFixedPosition();
        });
      }
    });
  }

  function initBackgroundRevealExtraLight($scope) {
    var extraLights = $scope.find(".pxl-background-reveal-extra-light");
    if (extraLights.length === 0) return;

    extraLights.each(function () {
      var extraLight = this;
      var parent = extraLight.parentElement;
      if (!parent) return;

      var style = window.getComputedStyle(parent);
      if (style.position === "static") {
        parent.style.position = "relative";
      }

      var posClass = "";
      for (var i = 0; i < extraLight.classList.length; i++) {
        var cls = extraLight.classList[i];
        if (cls.indexOf("pxl-background-reveal-extra-light__") === 0) {
          posClass = cls.replace("pxl-background-reveal-extra-light__", "");
          break;
        }
      }

      function setExtraLightPosition() {
        var rect = parent.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        var gradientX = 50;
        var gradientY = 0;
        var colorExtraLight = getComputedStyle(extraLight).getPropertyValue("--color-extra-light");

        if (!colorExtraLight || colorExtraLight.trim() === "") {
          colorExtraLight = "rgba(204, 243, 255, 0.56)";
        } else {
          colorExtraLight = colorExtraLight.trim();
        }

        if (posClass) {
          if (posClass === "top-left" || posClass.indexOf("top-left") >= 0) {
            gradientX = 0;
            gradientY = 0;
          } else if (posClass === "top-right" || posClass.indexOf("top-right") >= 0) {
            gradientX = 100;
            gradientY = 0;
          } else if (posClass === "bottom-left" || posClass.indexOf("bottom-left") >= 0) {
            gradientX = 0;
            gradientY = 100;
          } else if (posClass === "bottom-right" || posClass.indexOf("bottom-right") >= 0) {
            gradientX = 100;
            gradientY = 100;
          } else if (posClass === "center-top" || posClass.indexOf("center-top") >= 0) {
            gradientX = 50;
            gradientY = 0;
          } else if (posClass === "center-bottom" || posClass.indexOf("center-bottom") >= 0) {
            gradientX = 50;
            gradientY = 100;
          } else if (posClass === "center-left" || posClass.indexOf("center-left") >= 0) {
            gradientX = 0;
            gradientY = 50;
          } else if (posClass === "center-right" || posClass.indexOf("center-right") >= 0) {
            gradientX = 100;
            gradientY = 50;
          } else if (posClass === "center-center" || posClass.indexOf("center-center") >= 0) {
            gradientX = 50;
            gradientY = 50;
          }
        }

        extraLight.style.background =
          "radial-gradient(27.52% 29.03% at " +
          gradientX +
          "% " +
          gradientY +
          "%, " +
          colorExtraLight +
          " 0%, rgba(0, 0, 0, 0.00) 100%)";
      }

      requestAnimationFrame(function () {
        setExtraLightPosition();
        requestAnimationFrame(setExtraLightPosition);
      });

      if (typeof ResizeObserver !== "undefined") {
        var resizeObserverExtra = new ResizeObserver(function () {
          setExtraLightPosition();
        });
        resizeObserverExtra.observe(parent);
      }

      $(window).on("resize", function () {
        setExtraLightPosition();
      });
    });
  }

  // Kiểm tra nếu đang trong editor mode - không chạy code
  function isEditorMode() {
    if ($("body").hasClass("elementor-editor-active")) {
      return true;
    }
    if (typeof elementor !== "undefined" && elementor.config && elementor.config.is_edit_mode) {
      return true;
    }
    if (
      typeof elementorFrontend !== "undefined" &&
      elementorFrontend.isEditMode &&
      elementorFrontend.isEditMode()
    ) {
      return true;
    }
    return false;
  }

  function initCustomFunctions() {
    // Không chạy trong editor mode
    if (isEditorMode()) {
      return;
    }

    if (brighthubCustomControlsInitialized) return;

    try {
      if (typeof brighthub_section_start_render === "function") {
        brighthub_section_start_render();
        brighthubCustomControlsInitialized = true;
      }
    } catch (error) {
      console.error("Error initializing custom functions:", error);
    }
  }

  var elementorInitHandler = function () {
    // Không chạy trong editor mode
    if (isEditorMode()) {
      return;
    }

    initCustomFunctions();
    $(window).off("elementor/frontend/init", elementorInitHandler);
  };

  $(window).on("elementor/frontend/init", elementorInitHandler);

  var docReadyTimeout;
  $(document).ready(function () {
    // Không chạy trong editor mode
    if (isEditorMode()) {
      return;
    }

    clearTimeout(docReadyTimeout);
    docReadyTimeout = setTimeout(function () {
      if (typeof elementor !== "undefined" || typeof elementorFrontend !== "undefined") {
        if (!brighthubCustomControlsInitialized) {
          initCustomFunctions();
        }
      }
    }, 1000);
  });
})(jQuery);
