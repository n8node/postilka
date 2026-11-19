(function ($) {
  function pxl_parallax_move(e, target, movement, section) {
    var relX = e.pageX - section.offset().left;
    var relY = e.pageY - section.offset().top;

    TweenMax.to(target, 1, {
      x: ((relX - section.width() / 2) / section.width()) * movement,
      y: ((relY - section.height() / 2) / section.height()) * movement
    });
  }
})(jQuery);
