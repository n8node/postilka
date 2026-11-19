(function ($) {
  'use strict';

  const wrapper = $('#liquid-video-thumbnails');
  const parent = wrapper.parent()

  const tooltipData = {
    attribute: 'data-tip',
    content: woocommerce_admin_meta_boxes.i18n_product_image_tip,
    fadeIn: 50,
    fadeOut: 50,
    delay: 200,
    keepAlive: true,
  };

  $('#liquid-video-thumbnails .category-tabs a').on('click', function (e) {
    e.preventDefault();
    const tab = $(this).attr('href');
    const val = $(this).data('val');
    $('#liquid-video-thumbnails .tabs-panel').addClass('hidden');
    $(tab).removeClass('hidden');
    $('#liquid-video-thumbnails li').removeClass('tabs');
    $(this).parent().addClass('tabs');

    parent.find('input[name="_liquid_video_thumbnails_type"]').val(val);
  });

  $('.liquid-video-thumbnails-upload').find('.woocommerce-help-tip').tipTip(tooltipData);

  $('#liquid-remove-post-thumbnail').on('click', function (e) {
    e.preventDefault();
    parent.find('input[name="_liquid_video_thumbnails_video_id"]').val('');
    parent.find('.liquid-video-thumbnails-preview').hide();
    wrapper.removeClass('liquid-has-video');
  })

  let imageLibInstance;
  $('.liquid-video-thumbnails-upload').find('a').on('click', function (e) {
    e.preventDefault();
    const $el = $(this);

    if (imageLibInstance) {
      imageLibInstance.open();
      return;
    }

    imageLibInstance = wp.media.frames.product_gallery = wp.media({
      title: $el.data('choose'),
      button: {
        text: $el.data('update'),
      },
      library: {type: 'video'},
    });

    imageLibInstance.on('select', function () {
      const selection = imageLibInstance.state().get('selection').first().toJSON();
      parent.find('input[name="_liquid_video_thumbnails_video_id"]').val(selection.id);
      const preview = parent.find('.liquid-video-thumbnails-preview');
      preview.show();
      preview.find('video').remove();
      preview.prepend('<video src="' + selection.url + '" controls></video>');
      wrapper.addClass('liquid-has-video')
    });

    imageLibInstance.open();
  });
})(jQuery);
