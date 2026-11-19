(function ($) {
  /* Start Widget Free Resource */
  $(document).on("click", ".pxl-wg-select-image", function (e) {
    e.preventDefault();
    var $this = $(this);
    var image = wp
      .media({
        title: "Upload image",
        multiple: false
      })
      .open()
      .on("select", function (e) {
        var uploaded_image = image.state().get("selection").first();
        console.log(uploaded_image.toJSON());
        var image_url = uploaded_image.toJSON().id;
        $this.parent().find(".hide-image-url").val(image_url);
        $this.parent().find(".pxl-wg-show-image").empty();
        $this
          .parent()
          .find(".pxl-wg-show-image")
          .append('<img src = "' + uploaded_image.toJSON().url + '">');
        $this.hide();
        $this.parent().find(".pxl-wg-remove-image").show();
        $this.parents("form").find('input[name="savewidget"]').removeAttr("disabled");
      });
  });

  $(document).on("click", ".pxl-wg-remove-image", function (e) {
    e.preventDefault();
    var $this = $(this);
    $this.parent().find(".hide-image-url").val("");
    $this.parent().find(".pxl-wg-show-image").empty();
    $this.hide();
    $this.parent().find(".pxl-wg-select-image").show();
    $this.parents("form").find('input[name="savewidget"]').removeAttr("disabled");
  });
  /* End Widget Free Resource */
})(jQuery);
