(function ($) {
  "use strict";
  var pxl_widget_accordion_handler = function ($scope, $) {
    // Initialize: Remove inline display styles and set proper initial state
    $scope.find(".pxl-accordion .pxl-accordion__item-content").each(function () {
      var $content = $(this);
      var $item = $content.parent(".pxl-accordion__item");
      if ($item.hasClass("active")) {
        $content.css("display", "block");
      } else {
        $content.css("display", "none");
      }
    });

    function updateBeforeActiveClass($accordion) {
      $accordion.find(".pxl-accordion__item").removeClass("before-active");

      var $activeItem = $accordion.find(".pxl-accordion__item.active");

      if ($activeItem.length) {
        $activeItem.prev(".pxl-accordion__item").addClass("before-active");
      }
    }

    $scope.find(".pxl-accordion--layout-4 .pxl-accordion__item").on("click", function (e) {
      e.preventDefault();

      var $item = $(this);
      var $title = $item.find(".pxl-accordion__item-title");
      var targetSelector = $title.data("target");
      var $target = $(targetSelector);
      var $accordion = $item.closest(".pxl-accordion");
      var isActive = $item.hasClass("active");

      var $previousActiveItem = $accordion.find(".pxl-accordion__item.active").not($item);

      if (!isActive) {
        if ($previousActiveItem.length) {
          var $previousActiveTitle = $previousActiveItem.find(".pxl-accordion__item-title");
          var $previousActiveContent = $previousActiveItem.find(".pxl-accordion__item-content");

          $previousActiveItem.removeClass("active");

          $previousActiveContent.stop(true, true).slideUp(400, function () {
            $(this).css("display", "none");
          });
          $previousActiveTitle.css("display", "block").hide().stop(true, true).slideDown(400);
        }

        $item.addClass("active");

        $title.stop(true, true).slideUp(400, function () {
          $(this).css("display", "none");
        });
        $target.css("display", "block").hide().stop(true, true).slideDown(400);
      } else {
        $item.removeClass("active");

        $target.stop(true, true).slideUp(400, function () {
          $(this).css("display", "none");
        });
        $title.css("display", "block").hide().stop(true, true).slideDown(400);
      }

      updateBeforeActiveClass($accordion);
    });

    $scope
      .find(".pxl-accordion:not(.pxl-accordion--layout-4) .pxl-accordion__item-title")
      .on("click", function (e) {
        e.preventDefault();

        var $this = $(this);
        var targetSelector = $this.data("target");
        var $target = $(targetSelector);
        var $item = $this.parent(".pxl-accordion__item");
        var $accordion = $this.closest(".pxl-accordion");
        var isActive = $item.hasClass("active");

        var $previousActiveItem = $accordion.find(".pxl-accordion__item.active").not($item);

        if (!isActive) {
          if ($previousActiveItem.length) {
            var $previousActiveContent = $previousActiveItem.find(".pxl-accordion__item-content");
            $previousActiveItem.removeClass("active");
            $previousActiveContent.stop(true, true).slideUp(400);
          }

          $item.addClass("active");
          $target.stop(true, true).slideDown(400, function () {
            $target.css("height", "");
          });
        } else {
          $item.removeClass("active");
          $target.stop(true, true).slideUp(400);
        }

        updateBeforeActiveClass($accordion);
      });

    $scope.find(".pxl-accordion").each(function () {
      updateBeforeActiveClass($(this));
    });
  };

  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_accordion.default",
      pxl_widget_accordion_handler
    );
  });
})(jQuery);
