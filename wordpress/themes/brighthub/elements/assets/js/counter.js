(function ($) {
  // Helper function to init odometer
  var initOdometer = function ($number, isEditorMode) {
    var data = $number.data();
    var el = $number[0];
    var startNumber = data["startnumber"],
      endNumber = data["endnumber"],
      separator = data["delimiter"],
      duration = data["duration"];

    if (typeof Odometer === "undefined") {
      return;
    }
    if (!separator || typeof separator !== "string" || separator.indexOf("ddd") === -1) {
      separator = "(,ddd)";
    }

    var odometerDuration = isEditorMode ? 0 : duration;

    var od = new Odometer({
      el: el,
      value: endNumber,
      format: separator,
      theme: "default",
      duration: odometerDuration
    });

    el._odometer = od;
  };

  var pxl_widget_counter_handler = function ($scope) {
    var delay = Number($scope.find(".pxl-counter__value").attr("data-delay")) + 300 || 300;
    var isEditorMode =
      typeof elementorFrontend !== "undefined" &&
      elementorFrontend.config &&
      elementorFrontend.config.is_edit_mode;

    setTimeout(function () {
      elementorFrontend.waypoint(
        $scope.find(".pxl-counter__value:not(.effect-odometer)"),
        function () {
          var $number = $(this),
            data = $number.data();

          var decimalMatch = String(data.toValue || "").match(/\.(\d+)/);
          if (decimalMatch) data.rounding = decimalMatch[1].length;

          if (typeof $.fn.numerator === "function") {
            $number.numerator(data);
          }
        },
        { offset: "95%", triggerOnce: true }
      );

      var $odometerElements = $scope.find(".pxl-counter__value.effect-odometer");

      if (isEditorMode) {
        $odometerElements.each(function () {
          initOdometer($(this), true);
        });
      } else {
        elementorFrontend.waypoint(
          $odometerElements,
          function () {
            initOdometer($(this), false);
          },
          { offset: "95%", triggerOnce: true }
        );
      }
    }, delay);
  };

  // --- Helpers ---
  function getNumberFromText($el) {
    return Number(($el.text() || "0").replace(/[^\d.]/g, "")) || 0;
  }

  function updateCounterFromSelect($select) {
    var value = Number($select.val());
    var $inner = $select.closest(".e-con-inner");
    var $counter = $inner.find(".pxl-counter__value").first();
    if (!$counter.length) return;

    var duration = Number($counter.attr("data-duration")) || 2000;
    var delimiter = $counter.attr("data-delimiter") || ",";

    $counter.attr("data-endnumber", value).attr("data-to-value", value);

    if ($counter.hasClass("effect-odometer")) {
      var el = $counter[0];
      if (!delimiter || typeof delimiter !== "string" || delimiter.indexOf("ddd") === -1) {
        delimiter = "(,ddd)";
      }
      if (!el._odometer) {
        el._odometer = new Odometer({
          el: el,
          value: getNumberFromText($counter),
          format: delimiter,
          theme: "default",
          duration: duration
        });
      } else {
        el._odometer.options.duration = duration;
        el._odometer.options.format = delimiter;
      }
      el._odometer.update(value);
    } else {
      if (typeof $.fn.numerator === "function") {
        $counter.numerator({
          fromValue: getNumberFromText($counter),
          toValue: value,
          duration: duration,
          delimiter: delimiter
        });
      } else {
        $counter.text(value.toLocaleString());
      }
    }
  }

  function pxl_select_change_counter_handler($scope) {
    $scope.find("select.pxl-select-change-counter__select").each(function () {
      var $select = $(this);
      $select.off(".pxlChange").on("change.pxlChange", function () {
        updateCounterFromSelect($select);
      });
    });
  }

  $(document).on("change", "select.pxl-select-change-counter__select", function () {
    updateCounterFromSelect($(this));
  });

  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_counter.default",
      pxl_widget_counter_handler
    );
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/pxl_select_change_counter_value.default",
      pxl_select_change_counter_handler
    );
  });
})(jQuery);
