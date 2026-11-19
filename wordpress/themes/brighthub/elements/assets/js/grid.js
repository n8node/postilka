(function ($) {
  "use strict";

  $(window).on("elementor/frontend/init", function () {
    setTimeout(function () {
      $(".pxl-grid").each(function (index, element) {
        var $grid_scope = $(this);
        var $grid_masonry = $grid_scope.find(".pxl-grid__masonry");
        var isoOptions = {
          itemSelector: ".pxl-grid__item",
          layoutMode: "masonry",
          fitRows: {
            gutter: 0
          },
          percentPosition: true,
          masonry: {
            columnWidth: ".pxl-grid__sizer"
          },
          containerStyle: null,
          stagger: 30,
          sortBy: "name"
        };
        var $grid_isotope = $grid_masonry.isotope(isoOptions);

        $grid_scope.on("click", ".pxl-grid__filter .filter-item", function (e) {
          var $this = $(this);
          var term_slug = $this.attr("data-filter");

          $this.siblings(".filter-item.active").removeClass("active");
          $this.addClass("active");
          $grid_scope.addClass("filtering");
          $grid_scope.find(".pxl-grid__item-inner").removeClass("animated");

          if ($this.closest(".pxl-grid__filter").hasClass("ajax")) {
            var loadmore = $grid_scope.data("loadmore");
            loadmore.term_slug = term_slug;
            brighthub_grid_ajax_handler($this, $grid_scope, $grid_isotope, {
              action: "brighthub_load_more_post_grid",
              loadmore: loadmore,
              iso_options: isoOptions,
              handler_click: "filter",
              scrolltop: 0,
              wpnonce: main_data.wpnonce,
              success: function () {
                $grid_scope.removeClass("filtering");
              }
            });
          } else {
            $grid_isotope.isotope({ filter: term_slug });
            if ($grid_scope.find(".pxl-grid__filter").hasClass("pxl-animate")) {
              var $animate_el = $grid_scope.find(".pxl-grid__filter"),
                data = $animate_el.data("settings");
              if (typeof data != "undefined" && typeof data["animation"] != "undefined") {
                setTimeout(function () {
                  $animate_el
                    .removeClass("pxl-invisible")
                    .addClass("animated " + data["animation"]);
                }, data["animation_delay"]);
              } else {
                setTimeout(function () {
                  $animate_el.removeClass("pxl-invisible").addClass("animated fadeInUp");
                }, 300);
              }
            }
          }
        });

        $grid_scope.on("click", ".pxl-grid__pagination .ajax a.page-numbers", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var $this = $(this);
          var loadmore = $grid_scope.data("loadmore");
          var paged = $this.attr("href");
          paged = paged.replace("#", "");
          loadmore.paged = parseInt(paged);
          brighthub_grid_ajax_handler($this, $grid_scope, $grid_isotope, {
            action: "brighthub_load_more_post_grid",
            loadmore: loadmore,
            iso_options: isoOptions,
            handler_click: "pagination",
            scrolltop: 0,
            wpnonce: main_data.wpnonce
          });
          $("html,body").animate({ scrollTop: $grid_scope.offset().top - 130 }, 500);
        });

        $grid_scope.on("click", ".pxl-grid__loadmore", function (e) {
          e.preventDefault();
          var $this = $(this);
          var loadmore = $grid_scope.data("loadmore");
          loadmore.paged = parseInt($grid_scope.data("start-page")) + 1;

          brighthub_grid_ajax_handler($this, $grid_scope, $grid_isotope, {
            action: "brighthub_load_more_post_grid",
            loadmore: loadmore,
            iso_options: isoOptions,
            handler_click: "loadmore",
            scrolltop: 0,
            wpnonce: main_data.wpnonce
          });
        });
      });
    }, 300);

    function brighthub_grid_ajax_handler($this, $grid_scope, $grid_isotope, args = {}) {
      var settings = $.extend(
        true,
        {},
        {
          action: "",
          loadmore: "",
          iso_options: {},
          handler_click: "",
          scrolltop: 0,
          wpnonce: ""
        },
        args
      );

      var offset_top = $grid_scope.offset().top;
      if (settings.handler_click == "loadmore") {
        var loadmore_text = $this.closest(".pxl-grid__loadmore").data("loadmore-text");
        var loading_text = $this.closest(".pxl-grid__loadmore").data("loading-text");
      }

      $.ajax({
        url: main_data.ajax_url,
        type: "POST",
        data: {
          action: settings.action,
          settings: settings.loadmore,
          handler_click: settings.handler_click,
          wpnonce: settings.wpnonce
        },
        success: function (res) {
          if (typeof settings.success == "function") {
            settings.success(res);
          }
          if (res.status == true) {
            if (settings.handler_click == "loadmore") {
              $grid_scope.find(".pxl-grid__inner").append(res.data.html);
            } else {
              $grid_scope.find(".pxl-grid__inner .pxl-grid__item").remove();
              $grid_scope.find(".pxl-grid__inner").append(res.data.html);
            }

            if (settings.iso_options) {
              $grid_isotope.isotope("destroy");
              $grid_isotope.isotope(settings.iso_options);
            }

            if ($grid_scope.find(".pxl-grid__filter").hasClass("pxl-animate")) {
              var $animate_el = $grid_scope.find(".pxl-grid__filter"),
                data = $animate_el.data("settings");
              if (typeof data != "undefined" && typeof data["animation"] != "undefined") {
                setTimeout(function () {
                  $animate_el
                    .removeClass("pxl-invisible")
                    .addClass("animated " + data["animation"]);
                }, data["animation_delay"]);
              } else {
                setTimeout(function () {
                  $animate_el.removeClass("pxl-invisible").addClass("animated fadeInUp");
                }, 300);
              }
            }

            $grid_scope.data("start-page", res.data.paged);

            if (settings.loadmore["pagination_type"] == "loadmore") {
              if (res.data.paged >= res.data.max) {
                $grid_scope.find(".pxl-grid__loadmore").hide();
              } else {
                $grid_scope.find(".pxl-grid__loadmore").show();
              }
            }
            if (settings.loadmore["pagination_type"] == "pagination") {
              $grid_scope.find(".pxl-grid__pagination").html(res.data.pagin_html);
            }
          }
        },
        beforeSend: function () {
          $grid_scope.find(".pxl-grid-overlay-loading").removeClass("loaded").addClass("loader");
          if (settings.handler_click == "loadmore") {
            $this.find(".pxl-loadmore__text").text(loading_text);
            $this.find(".btn-loadmore").addClass("loading");
            $this.parent().addClass("loading");
            $this.find(".btn-loadmore svg").hide();
            $this.find(".btn-loadmore")
              .append(`<svg class="loading-svg" width="24" height="7" viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg" fill="white" style="margin: 0 0 -3px -4px;">
                  <circle cx="10" cy="10" r="4">
                      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="1.8s"
                          repeatCount="indefinite" />
                  </circle>
                  <circle cx="30" cy="10" r="4">
                      <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.2;0.4;0.8;1" dur="1.8s"
                          repeatCount="indefinite" />
                  </circle>
                  <circle cx="50" cy="10" r="4">
                      <animate attributeName="opacity" values="0;0;0;1;1;0" keyTimes="0;0.2;0.4;0.6;0.8;1" dur="1.8s"
                          repeatCount="indefinite" />
                  </circle>
              </svg>
              `);
          }
        },
        complete: function () {
          $grid_scope.find(".pxl-grid-overlay-loading").removeClass("loader").addClass("loaded");
          if (settings.handler_click == "loadmore") {
            $this.find(".pxl-loadmore__text").text(loadmore_text);
            $this.find(".btn-loadmore").removeClass("loading");
            $this.parent().removeClass("loading");
            $this.find(".loading-svg").remove();
            $this.find(".btn-loadmore svg").show();
          }
          if (settings.scrolltop) {
            $("html, body").animate({ scrollTop: offset_top - 100 }, 0);
          }
        }
      });
    }
  });
})(jQuery);
