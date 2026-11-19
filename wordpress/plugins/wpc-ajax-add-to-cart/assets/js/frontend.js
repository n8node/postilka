(function($) {
  $.fn.serializeArrayAll = function() {
    var rCRLF = /\r?\n/g;

    return this.map(function() {
      return this.elements ? $.makeArray(this.elements) : this;
    }).map(function(i, elem) {
      var val = $(this).val();

      if (val == null) {
        return val == null;
      } else if (this.type === 'checkbox') {
        if (this.checked) {
          return {name: this.name, value: this.checked ? this.value : ''};
        }
      } else if (this.type === 'radio') {
        if (this.checked) {
          return {name: this.name, value: this.checked ? this.value : ''};
        }
      } else {
        return $.isArray(val) ? $.map(val, function(val, i) {
          return {name: elem.name, value: val.replace(rCRLF, '\r\n')};
        }) : {name: elem.name, value: val.replace(rCRLF, '\r\n')};
      }
    }).get();
  };

  $(document).on('wooaa_adding_to_cart', function(e, $btn) {
    $btn.removeClass('added').addClass('loading');
  });

  $(document).
      on('wooaa_added_to_cart', function(e, fragments, cart_hash, $btn) {
        $btn.removeClass('loading').addClass('added');
      });

  $(document).
      on('click',
          '.single_add_to_cart_button:not(' + wooaa_vars.ignore_btn_class + ')',
          function(e) {
            var wooaa = false;
            var $btn = $(this);
            var $form = $btn.closest('.wpc_cart').length ? $btn.closest(
                '.wpc_cart') : $btn.closest('form.cart');

            if (wooaa_vars.product_types !== undefined) {
              var product_types = wooaa_vars.product_types.split(',');

              if (product_types.includes('all')) {
                wooaa = true;
              } else {
                product_types.forEach(function(item) {
                  if ($btn.is('.product-type-' + item +
                      ' .single_add_to_cart_button')) {
                    wooaa = true;
                  }
                });
              }
            }

            if (wooaa) {
              e.preventDefault();

              var data = {};
              var form_data = $form.find(
                  'input:not([name="product_id"]), select, button, textarea').
                  serializeArrayAll() || 0;

              $.each(form_data, function(i, item) {
                if (item.name === 'add-to-cart') {
                  item.name = 'product_id';
                  item.value = $form.find('input[name=variation_id]').val() ||
                      $form.find('[name=variation_id]').val() ||
                      $form.find('input.variation_id').val() ||
                      $form.find('.variation_id').val() ||
                      $form.find('input[name=add-to-cart]').val() ||
                      $form.find('[name=add-to-cart]').val() || $btn.val();
                }
              });

              $(document.body).
                  trigger('wooaa_adding_to_cart', [$btn, form_data]);
              $(document.body).trigger('adding_to_cart', [$btn, form_data]);

              $.each(form_data, function(i, item) {
                if (item.name !== '') {
                  data[item.name] = item.value;
                }
              });

              if ($btn.is(
                  '.product-type-variable .single_add_to_cart_button')) {
                // variable product
                var attrs = {};

                $form.find('[name^="attribute_"]').each(function() {
                  var attribute = $(this).attr('name');

                  attrs[attribute] = $(this).val();
                });

                data.variation = attrs;
              }

              if ((wooaa_vars.ignore_form_data != undefined) &&
                  (wooaa_vars.ignore_form_data != '')) {
                var ignore_form_data = wooaa_vars.ignore_form_data.split(',');

                ignore_form_data.forEach(function(item) {
                  delete data[item];
                });
              }

              data.action = 'wooaa_add_to_cart';
              data.nonce = wooaa_vars.nonce;

              $.post(wooaa_vars.wc_ajax_url.toString().
                      replace('%%endpoint%%', 'wooaa_add_to_cart'), data,
                  function(response) {
                    if (!response) {
                      return;
                    }

                    if (response.error && response.product_url) {
                      window.location = response.product_url;
                      return;
                    }

                    // Redirect to cart option
                    if (wooaa_vars.cart_redirect_after_add === 'yes') {
                      window.location = wooaa_vars.cart_url;
                      return;
                    }

                    // Trigger event so themes can refresh other areas.
                    $(document.body).
                        trigger('added_to_cart', [
                          response.fragments, response.cart_hash, $btn]);
                    $(document.body).
                        trigger('wooaa_added_to_cart', [
                          response.fragments, response.cart_hash, $btn]);
                  });

              return false;
            }
          });
})(jQuery);