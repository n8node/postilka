(function($){
    "user strict";

    $( window ).on( 'elementor:init', function() {
        var PxlIconsItemView = elementor.modules.controls.BaseData.extend({
            wrapper: null,
            items: null,
            iconpicker_els: null,
            url_els: null,
            add_btn: null,
            delete_btn: null,
            template: null,
            onReady: function () {
                var self = this;
                this.wrapper = $(this.el);
                this.items = this.wrapper.find(".pxl-group-item");
                this.add_btn = this.wrapper.find(".pxl-group-add");
                this.template = this.wrapper.find(".pxl-template").val();

                self.setupIconPicker();
                self.setupUrlInput();
                self.setupDeleteBtn();
                this.add_btn.on("click", function(){
                    var new_item = $(self.template);
                    self.wrapper.find(".pxl-group").append(new_item);
                    setTimeout(function(){
                        self.setupIconPicker();
                        self.setupUrlInput();
                        self.setupDeleteBtn();
                        self.items = self.wrapper.find(".pxl-group-item");
                    }, 300);
                });
            },

            setupIconPicker: function () {
                var self = this;
                self.iconpicker_els = self.wrapper.find(".pxl-iconpicker");
                self.iconpicker_els.fontIconPicker();
                self.iconpicker_els.on("change", function(e){
                    e.preventDefault();
                    self.saveValue();
                });
            },

            setupUrlInput: function () {
                var self = this;
                self.wrapper.find(".pxl-url-input").on("keyup", function(e){
                    e.preventDefault();
                    self.saveValue();
                });

                self.wrapper.find(".pxl-content-input").on("keyup", function(e){
                    e.preventDefault();
                    self.saveValue();
                });

                self.wrapper.find(".pxl-content-pricing").on("keyup", function(e){
                    e.preventDefault();
                    self.saveValue();
                });

                self.wrapper.find(".pxl-class-pricing").on("keyup", function(e){
                    e.preventDefault();
                    self.saveValue();
                });

                self.wrapper.find(".pxl-title-input").on("keyup", function(e){
                    e.preventDefault();
                    self.saveValue();
                });

                self.wrapper.find(".pxl-number-input").on("keyup", function(e){
                    e.preventDefault();
                    self.saveValue();
                });
 
            },

            setupDeleteBtn: function () {
                var self = this;
                self.delete_btn = self.wrapper.find(".pxl-group-delete");
                self.delete_btn.on("click", function(e){
                    e.preventDefault();
                    $(this).parent().remove();
                    self.items = self.wrapper.find(".pxl-group-item");
                    self.saveValue();
                });
            },

            saveValue: function () {
                var values = [];
                $.each(this.items, function(index, item){
                    var item_val = {};
                    item_val.icon = $(item).find(".pxl-iconpicker").val();
                    item_val.url = $(item).find(".pxl-url-input").val();
                    item_val.content = $(item).find(".pxl-content-input").val();
                    item_val.content_pricing = $(item).find(".pxl-content-pricing").val();
                    item_val.class_pricing = $(item).find(".pxl-class-pricing").val();
                    item_val.title = $(item).find(".pxl-title-input").val();
                    item_val.number = $(item).find(".pxl-number-input").val();
                    values.push(item_val);
                });
                this.setValue(JSON.stringify(values));
            },

            onBeforeDestroy: function () {
                this.saveValue();
            }
        });

        elementor.addControlView('pxl_icons', PxlIconsItemView);
        elementor.addControlView('pxl_lists', PxlIconsItemView);
        elementor.addControlView('pxl_lists_pricing', PxlIconsItemView);
        elementor.addControlView('pxl_progressbar', PxlIconsItemView);
        elementor.addControlView('pxl_links', PxlIconsItemView);
    } );
}(jQuery));