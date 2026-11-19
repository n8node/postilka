(function ($) {
  "use strict";

  var TableControl = elementor.modules.controls.BaseData.extend({
    events: function () {
      return {
        "click .pxl-table-add-row": "onAddRowClick",
        "click .pxl-table-row-delete": "onDeleteRowClick",
        "click .pxl-table-add-col": "onAddColumnClick",
        "click .pxl-table-col-delete": "onDeleteColumnClick",
        "input .pxl-table-cell-input": "onCellInputChange",
        "keydown .pxl-table-cell-input": "onCellKeyDown",
        "focus .pxl-table-cell-input": "onCellFocus",
        "blur .pxl-table-cell-input": "onCellBlur"
      };
    },

    onReady: function () {
      this.initControl();
      this.updateControlValue();
    },

    initControl: function () {
      this.setupTextareaAutoResize();
    },

    setupTextareaAutoResize: function () {
      var self = this;

      this.$el.find(".pxl-table-cell-input").each(function () {
        self.resizeTextarea($(this));
      });

      this.$el.on("input", ".pxl-table-cell-input", function () {
        self.resizeTextarea($(this));
      });
    },

    resizeTextarea: function ($textarea) {
      $textarea.css("height", "auto");
      $textarea.css("height", $textarea.prop("scrollHeight") + "px");
    },

    onAddRowClick: function (e) {
      e.preventDefault();

      var $table = this.$el.find(".pxl-table-control");
      var colCount = this.getColumnCount();
      var rowCount = this.getRowCount();
      var newRowIndex = rowCount;

      var $newRow = $("<tr>").attr("data-row", newRowIndex);

      for (var col = 0; col < colCount; col++) {
        var $cell = $("<td>").attr("data-col", col);
        var $container = $("<div>").addClass("pxl-table-cell-container");
        var $input = $("<textarea>").addClass("pxl-table-cell-input").attr({
          "data-row": newRowIndex,
          "data-col": col,
          rows: 1
        });

        $container.append($input);
        $cell.append($container);
        $newRow.append($cell);
      }

      var $actionsCell = $("<td>").addClass("pxl-table-row-actions");
      var $deleteButton = $("<button>")
        .attr({
          type: "button",
          class: "pxl-table-row-delete",
          "data-row": newRowIndex
        })
        .html('<i class="eicon-close"></i>');
      $actionsCell.append($deleteButton);
      $newRow.append($actionsCell);
      $table.find("tbody").append($newRow);
      this.setupTextareaAutoResize();
      $newRow.find(".pxl-table-cell-input").first().focus();
      this.updateControlValue();
    },

    onDeleteRowClick: function (e) {
      e.preventDefault();

      var $button = $(e.currentTarget);
      var rowIndex = $button.data("row");
      var $row = this.$el.find('tr[data-row="' + rowIndex + '"]');

      if (this.getRowCount() <= 1) {
        return;
      }

      $row.remove();
      this.updateRowIndices();
      this.updateControlValue();
    },

    onAddColumnClick: function (e) {
      e.preventDefault();

      var $table = this.$el.find(".pxl-table-control");
      var colCount = this.getColumnCount();
      var newColIndex = colCount;

      var $headerRow = $table.find("thead tr");
      var $newHeaderCell = $("<th>")
        .attr("data-col", newColIndex)
        .html(
          "<span>" +
            (elementor.translate ? elementor.translate("Column") : "Column") +
            " " +
            (newColIndex + 1) +
            "</span>"
        )
        .append(
          '<button type="button" class="pxl-table-col-delete" data-col="' +
            newColIndex +
            '"><i class="eicon-close"></i></button>'
        );

      $newHeaderCell.insertBefore($headerRow.find(".pxl-table-col-actions"));

      $table.find("tbody tr").each(function (rowIndex) {
        var $row = $(this);
        var $cell = $("<td>").attr("data-col", newColIndex);
        var $container = $("<div>").addClass("pxl-table-cell-container");
        var $input = $("<textarea>").addClass("pxl-table-cell-input").attr({
          "data-row": rowIndex,
          "data-col": newColIndex,
          rows: 1
        });

        $container.append($input);
        $cell.append($container);
        $cell.insertBefore($row.find(".pxl-table-row-actions"));
      });

      this.setupTextareaAutoResize();

      $table
        .find('tbody tr:first-child td[data-col="' + newColIndex + '"] .pxl-table-cell-input')
        .focus();

      this.updateControlValue();
    },

    onDeleteColumnClick: function (e) {
      e.preventDefault();

      var $button = $(e.currentTarget);
      var colIndex = $button.data("col");

      if (this.getColumnCount() <= 1) {
        return;
      }

      this.$el.find('th[data-col="' + colIndex + '"], td[data-col="' + colIndex + '"]').remove();
      this.updateColumnIndices();
      this.updateControlValue();
    },

    onCellInputChange: function (e) {
      this.resizeTextarea($(e.currentTarget));

      this.updateControlValue();
    },

    onCellFocus: function (e) {
      $(e.currentTarget).closest("td, th").addClass("pxl-cell-focused");
    },

    onCellBlur: function (e) {
      $(e.currentTarget).closest("td, th").removeClass("pxl-cell-focused");
    },

    onCellKeyDown: function (e) {
      var $input = $(e.currentTarget);
      var row = parseInt($input.data("row"));
      var col = parseInt($input.data("col"));
      var rowCount = this.getRowCount();
      var colCount = this.getColumnCount();

      if (e.keyCode === 9) {
        e.preventDefault();

        if (e.shiftKey) {
          if (col > 0) {
            this.focusCell(row, col - 1);
          } else if (row > 0) {
            this.focusCell(row - 1, colCount - 1);
          }
        } else {
          if (col < colCount - 1) {
            this.focusCell(row, col + 1);
          } else if (row < rowCount - 1) {
            this.focusCell(row + 1, 0);
          }
        }
      }

      if (e.ctrlKey) {
        if (e.keyCode === 38) {
          e.preventDefault();
          if (row > 0) {
            this.focusCell(row - 1, col);
          }
        } else if (e.keyCode === 40) {
          e.preventDefault();
          if (row < rowCount - 1) {
            this.focusCell(row + 1, col);
          }
        } else if (e.keyCode === 37) {
          e.preventDefault();
          if (col > 0) {
            this.focusCell(row, col - 1);
          }
        } else if (e.keyCode === 39) {
          e.preventDefault();
          if (col < colCount - 1) {
            this.focusCell(row, col + 1);
          }
        }
      }

      if (e.keyCode === 13 && e.ctrlKey) {
        e.preventDefault();
        this.onAddRowClick(e);
      }
    },

    focusCell: function (row, col) {
      var $input = this.$el.find(
        '.pxl-table-cell-input[data-row="' + row + '"][data-col="' + col + '"]'
      );
      if ($input.length) {
        $input.focus();
      }
    },

    updateRowIndices: function () {
      this.$el.find("tbody tr").each(function (index) {
        var $row = $(this);
        $row.attr("data-row", index);

        $row.find(".pxl-table-cell-input").attr("data-row", index);
        $row.find(".pxl-table-row-delete").attr("data-row", index);
      });
    },

    updateColumnIndices: function () {
      var self = this;
      var $table = this.$el.find(".pxl-table-control");

      $table.find("thead th").each(function (index) {
        var $th = $(this);
        if (!$th.hasClass("pxl-table-col-actions")) {
          $th.attr("data-col", index);
          $th.find(".pxl-table-col-delete").attr("data-col", index);
          $th
            .find("span")
            .text(
              (elementor.translate ? elementor.translate("Column") : "Column") + " " + (index + 1)
            );
        }
      });

      $table.find("tbody tr").each(function () {
        var $row = $(this);
        $row.find("td").each(function (index) {
          var $td = $(this);
          if (!$td.hasClass("pxl-table-row-actions")) {
            $td.attr("data-col", index);
            $td.find(".pxl-table-cell-input").attr("data-col", index);
          }
        });
      });
    },

    getColumnCount: function () {
      var $headerCells = this.$el.find("thead th");
      return $headerCells.length - 1;
    },

    getRowCount: function () {
      return this.$el.find("tbody tr").length;
    },

    updateControlValue: function () {
      var tableData = [];
      var rowCount = this.getRowCount();
      var colCount = this.getColumnCount();
      for (var rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        var rowData = [];

        for (var colIndex = 0; colIndex < colCount; colIndex++) {
          var $input = this.$el.find(
            '.pxl-table-cell-input[data-row="' + rowIndex + '"][data-col="' + colIndex + '"]'
          );
          if ($input.length) {
            rowData.push($input.val() || "");
          } else {
            rowData.push("");
          }
        }

        tableData.push(rowData);
      }

      this.$el.find(".elementor-control-tag-area").val(JSON.stringify(tableData)).trigger("input");
      this.setValue(tableData);
      this.triggerMethod("change:external");
    },

    getValue: function () {
      var value = this.model.get("value");

      if (typeof value === "string" && value !== "") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return [];
        }
      }

      return value || [];
    },

    setValue: function (value) {
      var valueToStore;

      if (typeof value === "object") {
        valueToStore = value;
      } else if (typeof value === "string" && value !== "") {
        try {
          valueToStore = JSON.parse(value);
        } catch (e) {
          valueToStore = [];
        }
      } else {
        valueToStore = [];
      }

      elementor.modules.controls.BaseData.prototype.setValue.apply(this, [valueToStore]);
    }
  });

  elementor.addControlView("pxl_table", TableControl);
})(jQuery);
