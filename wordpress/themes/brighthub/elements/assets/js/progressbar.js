(function ($) {
  "use strict";

  var pxl_widget_progressbar_handler = function ($scope, $) {
    elementorFrontend.waypoint(
      $scope.find(".pxl-progressbar__item-fill"),
      function () {
        $(this).progressbar();
      },
      {
        offset: "100%"
      }
    );
  };

  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_progressbar.default",
      pxl_widget_progressbar_handler
    );
  });
})(jQuery);
