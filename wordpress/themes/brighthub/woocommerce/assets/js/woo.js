(function ($) {
  "use strict";
  $(window).on("load", function () {
    $(".flex-control-nav li:first-child").addClass("flex-active");
  });
  $(document).ready(function () {
    brighthub_shop_quantity();
  });
  function brighthub_shop_quantity() {
    $(document).on("click", ".quantity-action--up", function () {
      $(this).parent().find('.quantity input[type="number"]').get(0).stepUp();
      $(this).parents(".woocommerce-cart-form").find(".actions .button").removeAttr("disabled");
    });
    $(document).on("click", ".quantity-action--down", function () {
      $(this).parent().find('.quantity input[type="number"]').get(0).stepDown();
      $(this).parents(".woocommerce-cart-form").find(".actions .button").removeAttr("disabled");
    });
    $(document).on("click", ".quantity-action", function () {
      var quantity_number = $(this).parent().find('input[type="number"]').val();
      var add_to_cart_button = $(this)
        .parents(".product, .woocommerce-product-inner")
        .find(".add_to_cart_button");
      add_to_cart_button.attr("data-quantity", quantity_number);
      add_to_cart_button.attr(
        "href",
        "?add-to-cart=" +
          add_to_cart_button.attr("data-product_id") +
          "&quantity=" +
          quantity_number
      );
    });
    $(".woocommerce-cart-form .actions .button").removeAttr("disabled");
  }
  $(document).on("click touchstart", ".flex-control-nav li", function () {
    $(this).addClass("flex-active").siblings().removeClass("flex-active");
  });

  $(document).ajaxComplete(function (event, xhr, settings) {
    brighthub_shop_quantity();
  });

  $(document).on("updated_wc_div", function () {
    brighthub_shop_quantity();
  });
})(jQuery);
