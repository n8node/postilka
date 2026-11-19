(function ($) {
  $(document).ready(function () {
    initPricingTables();
    appendFeatureColumn();

    $(window).on("resize", function () {
      initPricingTables();
    });
  });

  function initPricingTables() {
    $(".pxl-pricing-table").each(function () {
      const $tableWrapper = $(this);
      const $desktopTable = $tableWrapper.find(".pxl-table__desktop");
      const $mobileContainer = $tableWrapper.find(".pxl-table__mobile");

      if ($desktopTable.length === 0 || $mobileContainer.length === 0) return;
      const resScreen = $desktopTable.data("responsive") || 991;

      handleResponsiveTable($tableWrapper, $desktopTable, $mobileContainer, resScreen);
    });
  }

  function handleResponsiveTable($tableWrapper, $desktopTable, $mobileContainer, resScreen) {
    if ($(window).width() <= resScreen) {
      createMobileTable($desktopTable, $mobileContainer);
      $desktopTable.hide();
      $mobileContainer.show();
    } else {
      $mobileContainer.empty().hide();
      $desktopTable.show();
    }
  }

  function createMobileTable($desktopTable, $mobileContainer) {
    const $headers = $desktopTable.find("thead th");
    const $rows = $desktopTable.find("tbody tr");

    $mobileContainer.empty();

    for (let i = 1; i < $headers.length; i++) {
      const $columnDiv = $("<div>").addClass("pxl-table__mobile-column");

      const headerText = $headers.eq(i).html() || "";
      const $headerDiv = $("<div>").addClass("pxl-table__mobile-header").html(headerText);
      $columnDiv.append($headerDiv);

      const $bodyDiv = $("<div>").addClass("pxl-table__mobile-body");

      $rows.each(function () {
        const $row = $(this);
        const $cell = createMobileCell($row, i);
        $bodyDiv.append($cell);
      });

      $columnDiv.append($bodyDiv);
      $mobileContainer.append($columnDiv);
    }
  }

  function createMobileCell($row, columnIndex) {
    const $firstCell = $row.find("th").first();
    const $valueCell = $row.find("td").eq(columnIndex - 1);

    const $cellDiv = $("<div>").addClass("pxl-table__mobile-cell");

    if ($row.closest(".pxl-table__title-row.pxl-table__title-column").length) {
      $cellDiv.attr("data-label", $firstCell.text().trim());
    }

    const $labelCell = $("<div>")
      .addClass("pxl-table__mobile-cell--label")
      .text($firstCell.text().trim());

    const $valueCellDiv = $("<div>")
      .addClass("pxl-table__mobile-cell--value")
      .html($valueCell.html() || "");

    $cellDiv.append($labelCell).append($valueCellDiv);
    return $cellDiv;
  }

  function appendFeatureColumn() {
    $(".pxl-pricing-table__layout-2").each(function () {
      const $tableWrapper = $(this);
      const $featureColumn = $tableWrapper.find(".pxl-table__feature");

      $featureColumn.each(function (index) {
        const feature = $(this);
        const $targetItem = $tableWrapper.find(".item-" + (index + 1));
        $targetItem.append(feature);
        $targetItem.contents().unwrap();
      });
    });
  }

  if (typeof elementorFrontend !== "undefined") {
    $(window).on("elementor/frontend/init", function () {
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/pxl_table.default",
        function ($scope) {
          initPricingTables();
          appendFeatureColumn();
        }
      );
    });
  }
})(jQuery);
