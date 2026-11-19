jQuery(document).ready(function ($) {
  "use strict";

  var isLoading = false,
    currentPage = 1,
    timeout,
    currentXHR = null;

  init();

  function init() {
    bindEvents();
    initFromURL();
    forceAjax();
    addStyles();
  }

  function bindEvents() {
    $(document).on("submit", ".pxl-filter__form", handleSubmit);
    $(document).on("change", ".pxl-filter__form input", handleChange);
    $(document).on("input", '.pxl-filter__form input[type="number"]', handlePriceInput);
    $(document).on("change", ".orderby, .posts-per-page-select", handleDropdownChange);
    $(document).on("submit", ".woocommerce-ordering", handleSubmit);
    $(document).on("click", ".woocommerce-pagination a", handlePagination);
    $(document).on("click", ".pxl-filter__toggle", handleToggle);
    $(document).on("click", ".pxl-filter__close, .pxl-filter .pxl-overlay", handleClose);
    $(document).on("click", ".pxl-clear-filters", clearFilters);
  }

  function clearFilters(e) {
    e && e.preventDefault();

    cancelPendingRequests();

    $('.pxl-filter__form input[type="checkbox"]').prop("checked", false);
    $('.pxl-filter__form input[type="number"]').val("");
    $(".orderby").val("menu_order");
    $(".posts-per-page-select").val("");
    currentPage = 1;
    filter();
  }

  function handleToggle(e) {
    e && e.preventDefault();
    $(".pxl-filter__form").addClass("active");
    $(".pxl-filter .pxl-overlay").addClass("active");
    $("#pxl-main").addClass("active");
    $(".pxl-filter__toggle").addClass("open");
    $("body").addClass("pxl-filter-open");
  }

  function handleClose(e) {
    e && e.preventDefault();
    $(".pxl-filter__form").removeClass("active");
    $(".pxl-filter .pxl-overlay").removeClass("active");
    $("#pxl-main").removeClass("active");
    $(".pxl-filter__toggle").removeClass("open");
    $("body").removeClass("pxl-filter-open");
  }

  function handleSubmit(e) {
    e.preventDefault();
    cancelPendingRequests();
    currentPage = 1;
    filter();
  }

  function handleChange() {
    cancelPendingRequests();
    currentPage = 1;
    clearTimeout(timeout);
    timeout = setTimeout(filter, 300);
  }

  function handlePriceInput() {
    cancelPendingRequests();
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      currentPage = 1;
      filter();
    }, 800);
  }

  function handleDropdownChange(e) {
    e.preventDefault();
    cancelPendingRequests();
    currentPage = 1;
    filter();
  }

  function handlePagination(e) {
    e.preventDefault();
    var $link = $(this),
      href = $link.attr("href");

    if (href === "#") return;

    var page = getPageNumber($link, href);
    if (page < 1) return;

    cancelPendingRequests();
    currentPage = page;
    filter();

    $("html, body").animate(
      {
        scrollTop: $(".pxl-products-container").offset().top - 100
      },
      500
    );
  }

  function cancelPendingRequests() {
    // Clear timeout nếu có
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    if (currentXHR && currentXHR.readyState !== 4) {
      currentXHR.abort();
      currentXHR = null;
    }

    isLoading = false;
    hideLoading();
  }

  function filter() {
    cancelPendingRequests();

    if (isLoading) return;
    isLoading = true;
    showLoading();

    var data = new FormData();
    data.append("action", "filter_products");
    data.append("nonce", filter_ajax.nonce);
    data.append("paged", currentPage);

    // Categories
    var hasCheckedCategories = false;
    $('.pxl-filter__form input[name="product_cat[]"]:checked').each(function () {
      data.append("product_cat[]", $(this).val());
      hasCheckedCategories = true;
    });

    // Nếu không có category nào được check và đang ở category page, lấy từ URL
    if (!hasCheckedCategories) {
      var categorySlug = getCategoryFromURL();
      if (categorySlug) {
        data.append("product_cat[]", categorySlug);
      }
    }

    // Attributes
    $('.pxl-filter__form input[name^="filter_attr"]:checked').each(function () {
      data.append($(this).attr("name"), $(this).val());
    });

    // Price
    var minPrice = $('.pxl-filter__form input[name="min_price"]').val(),
      maxPrice = $('.pxl-filter__form input[name="max_price"]').val();
    if (minPrice) data.append("min_price", minPrice);
    if (maxPrice) data.append("max_price", maxPrice);

    var orderby = $(".orderby").val(),
      ppp = $(".posts-per-page-select").val();
    if (orderby) data.append("orderby", orderby);
    // Always send posts_per_page: use dropdown value if exists, otherwise use default from theme option
    if (ppp) {
      data.append("posts_per_page", ppp);
    } else if (filter_ajax.default_per_page) {
      data.append("posts_per_page", filter_ajax.default_per_page);
    }

    currentXHR = $.ajax({
      url: filter_ajax.ajax_url,
      type: "POST",
      data: data,
      processData: false,
      contentType: false,
      timeout: 30000,
      success: function (response) {
        if (currentXHR.statusText === "abort") {
          return;
        }

        if (response.success) {
          $(".pxl-products-container").html(response.data.products);

          if (response.data.ordering) {
            $(".pxl-filter__ordering").html(response.data.ordering);
            $(".woocommerce-ordering").html($(response.data.ordering).html());
          }

          if (response.data.posts_per_page) {
            $(".pxl-posts-per-page").replaceWith(response.data.posts_per_page);
          }

          updateCount(response.data.found_posts);
          updateURL();
          setTimeout(forceAjax, 100);
        } else {
          showError("Filter error occurred. Please try again.");
        }
      },
      error: function (xhr, status, error) {
        if (status !== "abort") {
          if (status === "timeout") {
            showError("Request timeout. Please try again.");
          } else {
            showError("Network error occurred. Please try again.");
          }
        }
      },
      complete: function (xhr, status) {
        if (currentXHR === xhr) {
          isLoading = false;
          hideLoading();
          currentXHR = null;
        }
      }
    });
  }

  function forceAjax() {
    $(".woocommerce-ordering").off().on("submit", handleSubmit);
    $(".orderby, .posts-per-page-select").off().on("change", handleDropdownChange);

    $(".woocommerce-ordering").each(function () {
      $(this).removeAttr("action").removeAttr("method");
    });
  }

  function showLoading() {
    $(".pxl-products-container").addClass("pxl-loading");
  }

  function hideLoading() {
    $(".pxl-products-container").removeClass("pxl-loading");
  }

  function showError(message) {
    var $container = $(".pxl-products-container"),
      errorHtml =
        '<div class="pxl-error" style="padding:20px;background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;border-radius:4px;margin:20px 0;">' +
        message +
        "</div>";
    $container.prepend(errorHtml);
    setTimeout(function () {
      $(".pxl-error").fadeOut(500, function () {
        $(this).remove();
      });
    }, 5000);
  }

  function updateCount(count) {
    if (typeof count === "undefined") return;
    var text =
      count === 0
        ? "No products found"
        : count === 1
        ? "Showing 1 product"
        : "Showing " + count + " products";
    $(".woocommerce-result-count").text(text);
  }

  function updateURL() {
    if (!window.history.replaceState) return;
    try {
      var url = new URL(window.location);
      clearParams(url);
      addParams(url);
      window.history.replaceState({}, "", url.toString());
    } catch (e) {}
  }

  function clearParams(url) {
    ["product_cat", "min_price", "max_price", "orderby", "paged", "posts_per_page"].forEach(
      function (p) {
        url.searchParams.delete(p);
      }
    );
    url.searchParams.forEach(function (_, key) {
      if (key.indexOf("filter_attr") === 0) url.searchParams.delete(key);
    });
  }

  function getCategoryFromPathname() {
    try {
      if (typeof filter_ajax !== "undefined" && filter_ajax.category_slug) {
        return filter_ajax.category_slug;
      }

      var url = new URL(window.location);
      var pathname = url.pathname;

      var categoryBase = "product-category";
      if (typeof filter_ajax !== "undefined" && filter_ajax.category_base) {
        categoryBase = filter_ajax.category_base;
      }

      var escapedBase = categoryBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var pattern = new RegExp("\\/" + escapedBase + "\\/([^\\/]+)");
      var match = pathname.match(pattern);
      if (match && match[1]) {
        return match[1];
      }

      var segments = pathname.split("/").filter(function (s) {
        return s.length > 0;
      });
      if (segments.length > 0) {
        var lastSegment = segments[segments.length - 1];
        var secondLastSegment = segments.length > 1 ? segments[segments.length - 2] : null;

        if (/^\d+$/.test(lastSegment) && secondLastSegment === "page" && segments.length > 2) {
          return segments[segments.length - 3];
        }
        if (lastSegment !== "page" && !/^\d+$/.test(lastSegment)) {
          var $body = $("body");
          var categoryClass = $body.attr("class");
          if (categoryClass && categoryClass.indexOf("tax-product_cat-" + lastSegment) !== -1) {
            return lastSegment;
          }
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  function addParams(url) {
    var categoryInPath = getCategoryFromPathname();

    $('.pxl-filter__form input[name="product_cat[]"]:checked').each(function () {
      var catSlug = $(this).val();
      if (!categoryInPath || catSlug !== categoryInPath) {
        url.searchParams.append("product_cat", catSlug);
      }
    });

    $('.pxl-filter__form input[name^="filter_attr"]:checked').each(function () {
      url.searchParams.append($(this).attr("name"), $(this).val());
    });
    var mp = $('.pxl-filter__form input[name="min_price"]').val(),
      xp = $('.pxl-filter__form input[name="max_price"]').val();
    if (mp) url.searchParams.set("min_price", mp);
    if (xp) url.searchParams.set("max_price", xp);
    var ob = $(".orderby").val(),
      ppp = $(".posts-per-page-select").val();
    if (ob && ob !== "menu_order") url.searchParams.set("orderby", ob);
    if (ppp) url.searchParams.set("posts_per_page", ppp);
    if (currentPage > 1) url.searchParams.set("paged", currentPage);
  }

  function initFromURL() {
    try {
      var url = new URL(window.location);
      var hasCategoryFromQuery = false;

      url.searchParams.getAll("product_cat").forEach(function (c) {
        $('.pxl-filter__form input[name="product_cat[]"][value="' + c + '"]').prop("checked", true);
        hasCategoryFromQuery = true;
      });

      if (!hasCategoryFromQuery) {
        var categorySlug = getCategoryFromURL();
        if (categorySlug) {
          $('.pxl-filter__form input[name="product_cat[]"][value="' + categorySlug + '"]').prop(
            "checked",
            true
          );
        }
      }

      url.searchParams.forEach(function (v, k) {
        if (k.indexOf("filter_attr") === 0) {
          $('.pxl-filter__form input[name="' + k + '"][value="' + v + '"]').prop("checked", true);
        }
      });
      if (url.searchParams.has("min_price"))
        $('.pxl-filter__form input[name="min_price"]').val(url.searchParams.get("min_price"));
      if (url.searchParams.has("max_price"))
        $('.pxl-filter__form input[name="max_price"]').val(url.searchParams.get("max_price"));
      if (url.searchParams.has("orderby")) $(".orderby").val(url.searchParams.get("orderby"));
      if (url.searchParams.has("posts_per_page"))
        $(".posts-per-page-select").val(url.searchParams.get("posts_per_page"));
      var p = parseInt(url.searchParams.get("paged"), 10);
      if (!isNaN(p) && p > 0) currentPage = p;
    } catch (e) {
      currentPage = 1;
    }
  }

  function getCategoryFromURL() {
    try {
      if (typeof filter_ajax !== "undefined" && filter_ajax.category_slug) {
        return filter_ajax.category_slug;
      }

      var url = new URL(window.location);
      var pathname = url.pathname;

      var catFromQuery = url.searchParams.get("product_cat");
      if (catFromQuery) {
        return catFromQuery;
      }

      var categoryBase = "product-category";
      if (typeof filter_ajax !== "undefined" && filter_ajax.category_base) {
        categoryBase = filter_ajax.category_base;
      }

      var escapedBase = categoryBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var pattern = new RegExp("\\/" + escapedBase + "\\/([^\\/]+)");
      var match = pathname.match(pattern);
      if (match && match[1]) {
        return match[1];
      }

      var segments = pathname.split("/").filter(function (s) {
        return s.length > 0;
      });
      if (segments.length > 0) {
        var lastSegment = segments[segments.length - 1];
        var secondLastSegment = segments.length > 1 ? segments[segments.length - 2] : null;

        if (/^\d+$/.test(lastSegment) && secondLastSegment === "page" && segments.length > 2) {
          return segments[segments.length - 3];
        }
        if (lastSegment !== "page" && !/^\d+$/.test(lastSegment)) {
          var $body = $("body");
          var categoryClass = $body.attr("class");
          if (categoryClass && categoryClass.indexOf("tax-product_cat-" + lastSegment) !== -1) {
            return lastSegment;
          }
        }
      }

      var $body = $("body");
      var categoryClass = $body.attr("class");
      if (categoryClass) {
        var classMatch = categoryClass.match(/tax-product_cat-([^\s]+)/);
        if (classMatch && classMatch[1]) {
          return classMatch[1];
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  function getPageNumber($link, href) {
    var p = new URL(href, window.location.origin).searchParams.get("paged");
    if (p) return parseInt(p, 10);
    var m = href.match(/\/page\/(\d+)\//);
    if (m) return parseInt(m[1], 10);
    var t = $link.text().trim();
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    if ($link.hasClass("prev") || t.toLowerCase().includes("previous")) {
      return Math.max(1, currentPage - 1);
    }
    if ($link.hasClass("next") || t.toLowerCase().includes("next")) {
      return currentPage + 1;
    }
    return 1;
  }

  function addStyles() {
    if ($("#pxl-filter-styles").length) return;
    $("head").append(`
        <style id="pxl-filter-styles">
          .pxl-loading { position: relative; opacity: 0.6; pointer-events: none; }
          .pxl-loading::before { content: ""; position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(255,255,255,0.9); z-index:999; }
          .pxl-loading::after { content: ""; position: absolute; top:50%; left:50%; width:30px; height:30px; margin:-15px 0 0 -15px; border:3px solid #f3f3f3; border-top-color:#007cba; border-radius:50%; animation:spin 1s linear infinite; z-index:1000; }
          @keyframes spin { to { transform:rotate(360deg); } }
          .pxl-products-container { min-height:400px; position:relative; }
          @media(max-width:768px) { .pxl-filter__content { display:none; } .pxl-filter__toggle { display:flex!important; } }
        </style>
      `);
  }

  $(window).on("popstate", function () {
    cancelPendingRequests();
    initFromURL();
    setTimeout(filter, 100);
  });

  // Expose API
  window.PXLFilter = {
    filter: filter,
    clearFilters: function () {
      cancelPendingRequests();
      $(".pxl-clear-filters").click();
    },
    setPage: function (p) {
      cancelPendingRequests();
      currentPage = p;
      filter();
    },
    cancelPendingRequests: cancelPendingRequests
  };
});
