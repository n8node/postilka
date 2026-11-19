(function ($) {
  "use strict";

  function fixAccordions() {
    $(".pxl-accordion").each(function () {
      var $accordion = $(this);
      $accordion.find(".pxl-accordion__item").removeClass("active");
      $accordion.find(".pxl-accordion__item-content").hide();
      var $firstItem = $accordion.find(".pxl-accordion__item:first-child");
      $firstItem.addClass("active");
      $firstItem.find(".pxl-accordion__item-content").show();
    });
  }

  function setupAccordionClicks() {
    $(".pxl-accordion__item-title").off("click");
    $(".pxl-accordion__item-title").on("click", function (e) {
      e.preventDefault();
      var $this = $(this);
      var $parent = $this.parent(".pxl-accordion__item");
      var $content = $parent.find(".pxl-accordion__item-content");
      var $accordion = $parent.parent(".pxl-accordion");

      if ($parent.hasClass("active")) {
        $parent.removeClass("active");
        $content.slideUp(400);
        if ($(this).parent().index() > 0) {
          $parent.prev().removeClass("active-prev");
          $parent.next().removeClass("active-next");
        }
      } else {
        $accordion.find(".pxl-accordion__item").removeClass("active active-prev active-next");
        $accordion.find(".pxl-accordion__item-content").slideUp(400);
        $parent.addClass("active");
        $content.slideDown(400);
        if ($(this).parent().index() > 0) {
          $parent.prev().addClass("active-prev");
          $parent.next().addClass("active-next");
        }
      }
    });
  }

  var pxl_widget_tabs_handler = function ($scope, $) {
    // Kiểm tra nếu đang trong editor mode - không chạy code scroll active tab
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

    $scope.find(".pxl-tabs.tab-effect-slide .pxl-tabs__list-item").on("click", function (e) {
      e.preventDefault();
      var target = $(this).data("target");
      var parent = $(this).parents(".pxl-tabs");
      parent.find(".pxl-tabs__content>.pxl-tabs__item").slideUp(400);
      parent.find(".pxl-tabs__list .pxl-tabs__list-item").removeClass("active");
      $(this).addClass("active");
      $(target).slideDown(400);
    });

    $scope.find(".pxl-tabs.tab-effect-fade .pxl-tabs__list-item").on("click", function (e) {
      e.preventDefault();
      var target = $(this).data("target");
      var parent = $(this).parents(".pxl-tabs");
      parent.find(".pxl-tabs__content>.pxl-tabs__item").hide();
      parent.find(".pxl-tabs__list .pxl-tabs__list-item").removeClass("active");
      $(this).addClass("active");
      $(target).show();
    });

    $scope.find(".pxl-tabs").each(function () {
      var $tabs = $(this);

      var allTab = $tabs.find(".pxl-tabs__item-all");
      var tab_btn = $tabs.find(".pxl-tabs__list");

      if (allTab.length > 0) {
        var allTabStructure = allTab.html();
        allTab.empty();

        var secondTab = $tabs.find(".pxl-tabs__item:not(.pxl-tabs__item-all)").eq(0);
        if (secondTab.length > 0) {
          secondTab.children().clone(true).appendTo(allTab);
        }

        var allTab_child = allTab.find(".elementor-widget-container > div");

        if (allTab_child.length > 0) {
          $tabs
            .find(".pxl-tabs__item:not(.pxl-tabs__item-all)")
            .slice(1)
            .each(function () {
              $(this)
                .find(".elementor-widget-container > div > div")
                .each(function () {
                  $(this).clone(true).appendTo(allTab_child);
                });
            });
        }

        var loadmore = $tabs.find(".pxl-tabs__faqs-loadmore");
        if (loadmore.length > 0) {
          var accordion = allTab.find(".pxl-accordion");
          accordion.append(loadmore);
          var itemsToShow = parseInt(allTab.data("show")) || 6;
          var accordionItems = accordion.find(".pxl-accordion__item");
          if (accordionItems.length > itemsToShow) {
            accordionItems.slice(itemsToShow).hide();
            loadmore.show();

            loadmore
              .find(".pxl-tabs__loadmore")
              .off("click")
              .on("click", function (e) {
                e.preventDefault();

                var $btn = $(this).find(".pxl-tabs__loadmore");
                var $loadingText = $btn.data("loading-text") || "Loading";
                var $originalText = $btn.text();
                $btn.find("span").text($loadingText);
                $btn.addClass("loading");

                var $hiddenItems = accordion.find(".pxl-accordion__item:hidden");

                setTimeout(function () {
                  $hiddenItems.slice(0, itemsToShow).fadeIn(0);
                  $btn.removeClass("loading");
                  if ($hiddenItems.length <= itemsToShow) {
                    $btn.parent().remove();
                    setTimeout(function () {
                      loadmore.fadeOut();
                    }, 3000);
                  } else {
                    $btn.find("span").text($originalText);
                  }
                }, 0);
              });
          } else {
            loadmore.hide();
          }
        }

        function resetAccordionStates() {
          var $accordions = allTab.find(".pxl-accordion");
          $accordions.each(function () {
            var $accordion = $(this);

            $accordion
              .find(".pxl-accordion__item")
              .removeClass("active")
              .find(".pxl-accordion__item-content")
              .hide();

            $accordion
              .find(".pxl-accordion__item:first-child")
              .addClass("active")
              .find(".pxl-accordion__item-content")
              .show();
          });
        }

        resetAccordionStates();
      }

      if (tab_btn.data("count") === "yes") {
        $tabs.find(".pxl-tabs__list-item").each(function () {
          const item_idx = $(this).index();
          const item_count = $tabs
            .find(".pxl-tabs__content .pxl-tabs__item")
            .eq(item_idx)
            .find(".pxl-accordion__item").length;
          $(this).append(`<span class="item-count">(${item_count})</span>`);
        });
      }

      var scrollActiveTabEnabled = $tabs.data("scroll-active-tab");
      var scrollActiveTabAttr = $tabs.attr("data-scroll-active-tab");
      var hasLayout4 = $tabs.hasClass("pxl-tabs--layout-4");

      var condition1 = scrollActiveTabEnabled === "true";
      var condition2 = scrollActiveTabEnabled === true;
      var condition3 = scrollActiveTabAttr === "true";
      var finalCondition = hasLayout4 && (condition1 || condition2 || condition3);

      if (finalCondition && !isEditorMode()) {
        var scrollActiveOffset = parseInt($tabs.data("scroll-active-offset")) || 100;
        var isUserClicking = false;
        var clickTimeout = null;
        var scrollTimeout = null;
        var wheelTimeout = null;
        var isScrollingToTab = false;
        var scrollLocked = false;
        var sectionLocked = false;
        var lockedScrollTop = 0;
        var lastTabWheelCount = 0;

        // Get scroll container
        var $scrollContainer = $tabs.closest(
          ".pxl-screen-scroll-container[data-pxl-screen-scroll='true']"
        );
        var isContainerScroll = $scrollContainer.length > 0;
        var $scrollElement = isContainerScroll ? $scrollContainer : $(window);
        var $window = $(window);

        // Find section containing tabs
        var $section = $tabs.closest("section, .elementor-section, .e-con");
        if ($section.length === 0) {
          $section = $tabs.parent().closest("section, .elementor-section, .e-con");
        }
        if ($section.length === 0) {
          $section = $tabs.parent().parent();
        }

        // Get all tab items
        var $tabItems = $tabs.find(".pxl-tabs__content .pxl-tabs__item");
        var totalTabs = $tabItems.length;
        var currentActiveIndex = -1;
        var sectionStartScroll = 0;

        // Get section boundaries
        function getSectionBounds() {
          var sectionOffset = isContainerScroll
            ? $section.position().top + ($scrollContainer.scrollTop() || 0)
            : $section.offset().top;
          var sectionHeight = $section.outerHeight();

          if ($section.length === 0 || sectionHeight === 0) {
            var tabsTop = isContainerScroll
              ? $tabs.position().top + ($scrollContainer.scrollTop() || 0)
              : $tabs.offset().top;
            var tabsBottom = tabsTop + $tabs.outerHeight();
            return {
              top: tabsTop - 100,
              bottom: tabsBottom + 100
            };
          }

          return {
            top: sectionOffset,
            bottom: sectionOffset + sectionHeight,
            element: $section[0]
          };
        }

        // Check if we're entering the tabs section
        function isInTabsSection() {
          var bounds = getSectionBounds();
          var scrollTop = isContainerScroll ? $scrollContainer.scrollTop() : $window.scrollTop();
          var windowHeight = isContainerScroll ? $scrollContainer.height() : $window.height();
          var viewportTop = scrollTop;
          var viewportCenter = scrollTop + windowHeight / 2;

          // Check if viewport center is in section
          return viewportCenter >= bounds.top && viewportCenter <= bounds.bottom;
        }

        // Get current active tab index
        function getCurrentActiveTabIndex() {
          var activeTab = $tabs.find(".pxl-tabs__list-item.active");
          if (activeTab.length > 0) {
            return $tabs.find(".pxl-tabs__list-item").index(activeTab);
          }
          return 0;
        }

        // Update active tab based on scroll progress within section
        function updateActiveTabOnScroll() {
          if (isUserClicking || isScrollingToTab) return;

          var bounds, scrollTop, windowHeight, viewportCenter, inSection;

          try {
            bounds = getSectionBounds();
            scrollTop = isContainerScroll ? $scrollContainer.scrollTop() : $window.scrollTop();
            windowHeight = isContainerScroll ? $scrollContainer.height() : $window.height();
            viewportCenter = scrollTop + windowHeight / 2;
            inSection = isInTabsSection();
          } catch (error) {
            return;
          }

          if (!inSection) {
            sectionLocked = false;
            return;
          }

          // Lock section when entering
          if (!sectionLocked) {
            sectionLocked = true;
            sectionStartScroll = scrollTop;
            lockedScrollTop = scrollTop;

            // Immediately lock scroll position
            if (isContainerScroll) {
              $scrollContainer[0].scrollTop = lockedScrollTop;
            } else {
              window.scrollTo(0, lockedScrollTop);
            }
          }

          // Calculate scroll progress within section (use viewport center)
          var sectionHeight = Math.max(1, bounds.bottom - bounds.top);
          var relativeScrollTop = viewportCenter - bounds.top;
          var scrollProgress = Math.max(0, Math.min(1, relativeScrollTop / sectionHeight));

          // Determine which tab should be active based on scroll progress
          // Divide section into segments for each tab
          var targetIndex = Math.floor(scrollProgress * totalTabs);
          targetIndex = Math.max(0, Math.min(totalTabs - 1, targetIndex));

          // Only update if different from current
          var currentIndex = getCurrentActiveTabIndex();
          if (targetIndex !== currentIndex) {
            activateTabByIndex(targetIndex);
          }

          // Check if last tab is active - allow scroll past
          if (targetIndex === totalTabs - 1) {
            // If user continues scrolling down past last tab, unlock
            if (scrollTop > sectionStartScroll + sectionHeight * 0.8) {
              sectionLocked = false;
            }
          }
        }

        // Get current active index
        function getCurrentActiveIndex() {
          var activeTab = $tabs.find(".pxl-tabs__list-item.active");
          if (activeTab.length > 0) {
            return $tabs.find(".pxl-tabs__list-item").index(activeTab);
          }
          return 0;
        }

        // Handle wheel event to control tab switching
        function handleWheel(e) {
          if (isScrollingToTab) return;

          // Check if we're in the tabs section
          if (!isInTabsSection()) {
            sectionLocked = false;
            return true; // Allow normal scroll
          }

          // Lock section when entering
          if (!sectionLocked) {
            sectionLocked = true;
            var scrollTop = isContainerScroll ? $scrollContainer.scrollTop() : $window.scrollTop();
            sectionStartScroll = scrollTop;
            lockedScrollTop = scrollTop;

            // Immediately lock scroll position
            if (isContainerScroll) {
              $scrollContainer[0].scrollTop = lockedScrollTop;
            } else {
              window.scrollTo(0, lockedScrollTop);
            }
          }

          var deltaY = e.originalEvent ? e.originalEvent.deltaY : e.deltaY || 0;
          if (e.originalEvent && e.originalEvent.wheelDelta) {
            deltaY = -e.originalEvent.wheelDelta / 120; // Normalize for older browsers
          }

          var currentIndex = getCurrentActiveIndex();
          var isLastTab = currentIndex === totalTabs - 1;
          var isFirstTab = currentIndex === 0;

          // If scrolling down and not on last tab, switch to next tab
          if (deltaY > 0 && !isLastTab) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // Lock scroll position immediately
            if (isContainerScroll) {
              $scrollContainer[0].scrollTop = lockedScrollTop;
            } else {
              window.scrollTo({ top: lockedScrollTop, behavior: "instant" });
            }

            // Activate next tab
            var nextIndex = currentIndex + 1;
            activateTabByIndex(nextIndex);
            lastTabWheelCount = 0; // Reset counter
            return false;
          }
          // If scrolling up and not on first tab, switch to previous tab
          else if (deltaY < 0 && !isFirstTab) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // Lock scroll position immediately
            if (isContainerScroll) {
              $scrollContainer[0].scrollTop = lockedScrollTop;
            } else {
              window.scrollTo({ top: lockedScrollTop, behavior: "instant" });
            }

            // Activate previous tab
            var prevIndex = currentIndex - 1;
            activateTabByIndex(prevIndex);
            lastTabWheelCount = 0; // Reset counter
            return false;
          }
          // If on last tab and scrolling down, allow scroll past after a threshold
          else if (deltaY > 0 && isLastTab) {
            // Count wheel events on last tab to allow unlock
            var scrollTop = isContainerScroll ? $scrollContainer.scrollTop() : $window.scrollTop();
            var bounds = getSectionBounds();
            var sectionHeight = bounds.bottom - bounds.top;
            var scrollProgress = (scrollTop - sectionStartScroll) / Math.max(1, sectionHeight);

            // Need multiple wheel events on last tab before unlocking
            lastTabWheelCount++;

            // After 3 wheel events on last tab, unlock
            if (lastTabWheelCount >= 3) {
              sectionLocked = false;
              lastTabWheelCount = 0;
              return true; // Allow scroll past
            }

            // Still locked, prevent scroll
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // Lock scroll position
            if (isContainerScroll) {
              $scrollContainer[0].scrollTop = lockedScrollTop;
            } else {
              window.scrollTo({ top: lockedScrollTop, behavior: "instant" });
            }

            return false;
          }
          // If on first tab and scrolling up, unlock to allow scroll back
          else if (deltaY < 0 && isFirstTab) {
            sectionLocked = false;
            lastTabWheelCount = 0; // Reset counter
            return true; // Allow scroll back
          }

          return false;
        }

        // Lock scroll position when section is locked
        function lockScrollPosition() {
          if (!sectionLocked || isScrollingToTab) return;

          var currentScrollTop = isContainerScroll
            ? $scrollContainer.scrollTop()
            : $window.scrollTop();
          var scrollDiff = Math.abs(currentScrollTop - lockedScrollTop);

          // If scroll position changed (more than 5px), reset it immediately
          if (scrollDiff > 5) {
            if (isContainerScroll) {
              $scrollContainer[0].scrollTop = lockedScrollTop;
            } else {
              window.scrollTo(0, lockedScrollTop);
            }
          }
        }

        // Activate tab by index
        function activateTabByIndex(index) {
          if (index < 0 || index >= totalTabs || isScrollingToTab) return;

          isScrollingToTab = true;
          currentActiveIndex = index;

          var $targetTab = $tabItems.eq(index);
          var $listItems = $tabs.find(".pxl-tabs__list-item");
          var $targetListItem = $listItems.eq(index);

          if ($targetListItem.length > 0 && !$targetListItem.hasClass("active")) {
            // Update tab content visibility
            $tabs.find(".pxl-tabs__content>.pxl-tabs__item").removeClass("active").hide();
            $targetTab.addClass("active").show();

            // Update active state in list
            $tabs.find(".pxl-tabs__list .pxl-tabs__list-item").removeClass("active");
            $targetListItem.addClass("active");
          }

          setTimeout(function () {
            isScrollingToTab = false;
          }, 300);
        }

        // Handle scroll event with throttling
        var scrollHandler = function (e) {
          // Lock scroll position if section is locked - prevent any scroll changes
          if (sectionLocked && !isScrollingToTab) {
            lockScrollPosition();
            // Don't update active tab based on scroll when locked
            // Active tab only changes via wheel events
            return;
          }

          if (isScrollingToTab) return;

          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
          }
          scrollTimeout = setTimeout(function () {
            updateActiveTabOnScroll();
            scrollTimeout = null;
          }, 100);
        };

        // Handle wheel event with immediate execution
        var wheelHandler = function (e) {
          var result = handleWheel(e);

          // If preventDefault was called, ensure scroll position is locked immediately
          if (sectionLocked && result === false) {
            // Use requestAnimationFrame to lock scroll position immediately after preventDefault
            requestAnimationFrame(function () {
              lockScrollPosition();
            });
          }

          return result;
        };

        // Handle click to prevent scroll update during click
        $tabs.find(".pxl-tabs__list-item").on("click.scrollActive", function () {
          isUserClicking = true;
          if (clickTimeout) {
            clearTimeout(clickTimeout);
          }
          clickTimeout = setTimeout(function () {
            isUserClicking = false;
            clickTimeout = null;
          }, 1000);
        });

        // Attach handlers with namespace
        var eventNamespace = ".pxlTabsScrollActive" + Date.now();
        $scrollElement.on("scroll" + eventNamespace, scrollHandler);

        // Attach wheel event with passive: false to allow preventDefault
        var wheelElement = document;
        if (wheelElement.addEventListener) {
          wheelElement.addEventListener("wheel", wheelHandler, { passive: false, capture: true });
        } else {
          $(document).on("wheel" + eventNamespace, wheelHandler);
        }

        // Also attach mousewheel for older browsers
        $(document).on("mousewheel" + eventNamespace, function (e) {
          if (!e.originalEvent) return;
          e.originalEvent.deltaY = -e.originalEvent.wheelDelta / 120;
          return wheelHandler(e);
        });

        // Initial check after a delay to ensure DOM is ready
        setTimeout(function () {
          updateActiveTabOnScroll();
        }, 500);

        // Cleanup on widget destroy or elementor refresh
        $tabs.on("remove", function () {
          $scrollElement.off("scroll" + eventNamespace);
          if (document.removeEventListener) {
            document.removeEventListener("wheel", wheelHandler, { capture: true });
          }
          $(document).off("wheel" + eventNamespace);
          $(document).off("mousewheel" + eventNamespace);
          $tabs.find(".pxl-tabs__list-item").off("click.scrollActive");
          if (clickTimeout) clearTimeout(clickTimeout);
          if (scrollTimeout) clearTimeout(scrollTimeout);
          if (wheelTimeout) clearTimeout(wheelTimeout);
        });
      }
    });
  };

  var pxl_widget_accordion_handler = function ($scope, $) {
    $scope.find(".pxl-accordion").each(function () {
      var $accordion = $(this);

      $accordion.find(".pxl-accordion__item").removeClass("active");
      $accordion.find(".pxl-accordion__item-content").hide();

      $accordion
        .find(".pxl-accordion__item:first-child")
        .addClass("active")
        .find(".pxl-accordion__item-content")
        .show();
    });

    $scope
      .find(".pxl-accordion__item-title")
      .off("click")
      .on("click", function (e) {
        e.preventDefault();

        var $this = $(this);
        var $parent = $this.parent(".pxl-accordion__item");
        var $content = $parent.find(".pxl-accordion__item-content");
        var $accordion = $parent.parent(".pxl-accordion");

        if ($parent.hasClass("active")) {
          $parent.removeClass("active");
          $content.slideUp(400);
        } else {
          $accordion.find(".pxl-accordion__item").removeClass("active");
          $accordion.find(".pxl-accordion__item-content").slideUp(400);

          $parent.addClass("active");
          $content.slideDown(400);
        }
      });
  };

  $(function () {
    fixAccordions();
    setupAccordionClicks();
  });

  $(document).ready(function () {
    fixAccordions();
    setupAccordionClicks();

    $(".pxl-tabs").each(function () {
      var $tabs = $(this);

      $tabs.find(".toggleTab-checkobx").on("change", function () {
        let $switchBtn = $(this).closest(".pxl-tabs__switch-btn");
        let $tabsContent = $tabs.find(".pxl-tabs__content");
        let $tabItems = $tabsContent.find(".pxl-tabs__item");

        let $dataTab1 = $switchBtn.data("st");
        let $dataTab2 = $switchBtn.data("nd");

        $tabItems.toggleClass("active");
        $tabItems.filter(".active").prependTo($tabsContent);
        if ($(this).is(":checked")) {
          $tabs.find(".pxl-tabs__switch-txt").text($dataTab2);
        } else {
          $tabs.find(".pxl-tabs__switch-txt").text($dataTab1);
        }
      });

      pxl_widget_tabs_handler(
        {
          find: function (selector) {
            return $tabs.find(selector);
          }
        },
        $
      );
    });
  });

  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_tabs.default",
      pxl_widget_tabs_handler
    );
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_banner_tabs.default",
      pxl_widget_tabs_handler
    );

    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_accordion.default",
      pxl_widget_accordion_handler
    );

    elementorFrontend.hooks.addAction("frontend/element_ready/global", function () {
      fixAccordions();
      setupAccordionClicks();
    });
  });

  $(document).ajaxComplete(function () {
    setTimeout(function () {
      fixAccordions();
      setupAccordionClicks();
    }, 100);
  });
})(jQuery);
