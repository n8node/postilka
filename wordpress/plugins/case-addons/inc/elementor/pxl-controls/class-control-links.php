<?php
/**
 * Links Control.
 *
 * @since 1.0.0
 */
use Elementor\Icons_Manager;
class Pxltheme_Core_Links_Control extends \Elementor\Base_Data_Control {

    public function __construct() {
        parent::__construct();
     
    }
                
    /**
     * Get emoji one area control type.
     *
     *
     * @since 1.0.0
     * @access public
     *
     * @return string Control type.
     */
    public function get_type() {
        return 'pxl_links';
    }
 
    /**
     * Enqueue emoji one area control scripts and styles.
     *
     * Used to register and enqueue custom scripts and styles used by the emoji one
     * area control.
     *
     * @since 1.0.0
     * @access public
     */
    public function enqueue() {
        wp_register_script('pxl_links-control', PXL_URL . 'assets/libs/iconpicker/pxl-iconpicker.js', array('jquery'));
        wp_enqueue_script( 'pxl_links-control' );
         
    }

    /**
     * Get emoji one area control default settings.
     *
     * Retrieve the default settings of the emoji one area control. Used to return
     * the default settings while initializing the emoji one area control.
     *
     * @since 1.0.0
     * @access protected
     *
     * @return array Control default settings.
     */
    protected function get_default_settings() {
        return [
            'label_block' => true,
        ];
    }

    /**
     * Render emoji one area control output in the editor.
     *
     * Used to generate the control HTML in the editor using Underscore JS
     * template. The variables for the class are available using `data` JS
     * object.
     *
     * @since 1.0.0
     * @access public
     */
     
    public function content_template() { 
        $control_uid = $this->get_control_uid();
        ?>
        <div class="elementor-control-field">
            <# if ( data.label ) { #>
                <label for="<?php echo esc_attr( $control_uid ); ?>" class="elementor-control-title">{{{ data.label }}}</label>
            <# } #>
            <div class="elementor-control-input-wrapper">
                <textarea id="<?php echo esc_attr( $control_uid ); ?>" class="elementor-control-tag-area" data-setting="{{ data.name }}" style="display: none;"></textarea>
                <#
                var value = data.controlValue;
                #>
                <div class="pxl-group">
                    <#
                        var template = '<div class="pxl-group-item" style="border: 1px solid #ebebeb; padding: 10px; margin-bottom: 10px; position: relative"><a class="pxl-group-delete" href="#" style="position: absolute; z-index: 9; right: 10px; top: 8px;font-size: 20px;font-weight: 400;">&times;</a>';
                        template += '<div class="elementor-control elementor-label-block"><div class="elementor-control-content"><div class="elementor-control-field"><label class="elementor-control-title"><?php esc_html_e('Text', PXL_TEXT_DOMAIN)?></label><div class="elementor-control-input-wrapper"><input type="text" class="elementor-control-tag-area elementor-input pxl-content-input" /></div></div></div></div>';
                        template += '<div class="elementor-control elementor-label-block"><div class="elementor-control-content"><div class="elementor-control-field"><label class="elementor-control-title"><?php esc_html_e('Link', PXL_TEXT_DOMAIN)?></label><div class="elementor-control-input-wrapper"><input type="url" class="elementor-control-tag-area elementor-input pxl-url-input" /></div></div></div></div></div>';
                    #>
                    <textarea class="pxl-template" style="display: none;">{{{ template }}}</textarea>
                    <#
                    if(data.controlValue){
                        var values = JSON.parse(data.controlValue);  
                        _.each( values, function( item, index ) {
                            var url_val = item.url;
                            var content_val = item.content;
                    #>
                            <div class="pxl-group-item" style="border: 1px solid #ebebeb; padding: 10px; margin-bottom: 10px; position: relative;">
                                <a class="pxl-group-delete" href="#" style="position: absolute; z-index: 9; right: 10px; top: 8px;font-size: 20px;font-weight: 400;">&times;</a>

                                <div class="elementor-control elementor-label-block">
                                    <div class="elementor-control-content">
                                        <div class="elementor-control-field">
                                            <label class="elementor-control-title"><?php esc_html_e('Text', PXL_TEXT_DOMAIN)?></label>
                                            <div class="elementor-control-input-wrapper">
                                                <input type="text" class="elementor-control-tag-area elementor-input pxl-content-input" value="{{ content_val }}" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="elementor-control elementor-label-block">
                                    <div class="elementor-control-content">
                                        <div class="elementor-control-field">
                                            <label class="elementor-control-title"><?php esc_html_e('Url', PXL_TEXT_DOMAIN)?></label>
                                            <div class="elementor-control-input-wrapper">
                                                <input type="url" class="elementor-control-tag-area elementor-input pxl-url-input"  value="{{ url_val }}" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    <#
                        } );
                    }
                    #>
                </div>
                <div class="pxl-group-actions" style="text-align: center;">
                    <button class="elementor-button elementor-button-default pxl-group-add" type="button">
                        <i class="eicon-plus" aria-hidden="true"></i>
                        <span><?php esc_html_e('Add Item', PXL_TEXT_DOMAIN)?></span>
                    </button>
                </div>
            </div>
        </div>
        <# if ( data.description ) { #>
        <div class="elementor-control-field-description">{{{ data.description }}}</div>
        <# } #>
        <?php
    }

}