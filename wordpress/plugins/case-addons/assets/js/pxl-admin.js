(function($) {
    "use strict";
     
    $('.pxl-form-auto-update').on('submit', function(e) {
        $(this).find('.button').addClass('loading').html('Uploading...');
        $('body').addClass('loading');
    });

}(jQuery));