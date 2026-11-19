<?php
/**
 * Elementor case icon picker control.
 *
 * @since 1.0.0
 */
use Elementor\Icons_Manager;
class Pxltheme_Core_List_Control extends \Elementor\Base_Data_Control {

    /**
     * Get emoji one area control type.
     *
     * Retrieve the control type, in this case `pxl_lists`.
     *
     * @since 1.0.0
     * @access public
     *
     * @return string Control type.
     */
    public function get_type() {
        return 'pxl_lists';
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
        wp_enqueue_style('jquery.fonticonpicker.min.css', PXL_URL . 'assets/libs/iconpicker/css/jquery.fonticonpicker.min.css', array(), 'all');
        wp_enqueue_style('jquery.fonticonpicker.grey.min.css', PXL_URL . 'assets/libs/iconpicker/themes/grey-theme/jquery.fonticonpicker.grey.min.css', array(), 'all');
        wp_enqueue_script('jquery.fonticonpicker.js', PXL_URL . 'assets/libs/iconpicker/jquery.fonticonpicker.min.js', array('jquery'));
        wp_register_script('pxl_lists-control', PXL_URL . 'assets/libs/iconpicker/pxl-iconpicker.js', array('jquery', 'jquery.fonticonpicker.js'), '1.0.0');
        wp_enqueue_script( 'pxl_lists-control' );
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
            'options' =>  $this->get_fontawesome_icons(),
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
                        var template = '<div class="pxl-group-item" style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; position: relative"><a class="pxl-group-delete" href="#" style="position: absolute; z-index: 9; right: 10px; top: 8px;">&times;</a><div class="elementor-control elementor-label-block"><div class="elementor-control-content"><div class="elementor-control-field"><label class="elementor-control-title"><?php esc_html_e('Icon', PXL_TEXT_DOMAIN)?></label><div class="elementor-control-input-wrapper"><select class="elementor-control-tag-area pxl-iconpicker">';
                        template += '<option value=""><?php esc_html_e('No Icons', PXL_TEXT_DOMAIN) ?></option>';
                        _.each( data.options, function( icons, group ) {
                            template += '<optgroup label="' + group + '">';
                            _.each( icons, function( icon, key ) {
                            var icon_class = _.keys(icon)[0];
                            var icon_name = _.values(icon)[0];
                                template += '<option value="' + icon_class + '">' + icon_name + '</option>';
                            } );
                            template += '</optgroup>';
                        } );
                        template += '</select></div></div></div></div><div class="elementor-control elementor-label-block"><div class="elementor-control-content"><div class="elementor-control-field"><label class="elementor-control-title"><?php esc_html_e('Content', PXL_TEXT_DOMAIN)?></label><div class="elementor-control-input-wrapper"><input type="text" class="elementor-control-tag-area elementor-input pxl-content-input" /></div></div></div></div></div>';
                    #>
                    <textarea class="pxl-template" style="display: none;">{{{ template }}}</textarea>
                    <#
                    if(data.controlValue){
                        var values = JSON.parse(data.controlValue);
                        _.each( values, function( item, index ) {
                            var icon_val = item.icon;
                            var content_val = item.content;
                    #>
                            <div class="pxl-group-item" style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; position: relative;">
                                <a class="pxl-group-delete" href="#" style="position: absolute; z-index: 9; right: 10px; top: 8px;">&times;</a>
                                <div class="elementor-control elementor-label-block">
                                    <div class="elementor-control-content">
                                        <div class="elementor-control-field">
                                            <label class="elementor-control-title"><?php esc_html_e('Icon', PXL_TEXT_DOMAIN)?></label>
                                            <div class="elementor-control-input-wrapper">
                                                <select class="elementor-control-tag-area pxl-iconpicker">
                                                    <#
                                                    var selected = ( '' === icon_val ) ? 'selected' : '';
                                                    #>
                                                    <option value="" {{ selected }}><?php esc_html_e('No Icons', PXL_TEXT_DOMAIN) ?></option>
                                                    <#
                                                    _.each( data.options, function( icons, group ) {
                                                    #>
                                                    <optgroup label="{{ group }}">
                                                        <#
                                                        _.each( icons, function( icon, key ) {
                                                        var icon_class = _.keys(icon)[0];
                                                        var icon_name = _.values(icon)[0];
                                                        selected = ( icon_class === icon_val ) ? 'selected' : '';
                                                        #>
                                                        <option value="{{ icon_class }}" {{ selected }}>{{{ icon_name }}}</option>
                                                        <#
                                                        } );
                                                        #>
                                                    </optgroup>
                                                    <#
                                                    } );
                                                    #>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="elementor-control elementor-label-block">
                                    <div class="elementor-control-content">
                                        <div class="elementor-control-field">
                                            <label class="elementor-control-title"><?php esc_html_e('Content', PXL_TEXT_DOMAIN)?></label>
                                            <div class="elementor-control-input-wrapper">
                                                <input type="text" class="elementor-control-tag-area elementor-input pxl-content-input" value="{{ content_val }}" />
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

    function get_fontawesome_icons(){
        global $wp_filesystem;
        $icons = array();
        $icons_tabs = Icons_Manager::get_icon_manager_tabs();
        $awesome_pro_support = apply_filters( 'pxl_support_awesome_pro', false );
        $theme_url = get_template_directory_uri();
        foreach ($icons_tabs as $key => $value) {
            if(!$awesome_pro_support){
                if(strpos($value['fetchJson'], 'regular.js') !== false )
                    $value['fetchJson'] = ELEMENTOR_ASSETS_PATH . 'lib/font-awesome/js/regular.js';
                if(strpos($value['fetchJson'], 'solid.js') !== false )
                    $value['fetchJson'] = ELEMENTOR_ASSETS_PATH . 'lib/font-awesome/js/solid.js';
                if(strpos($value['fetchJson'], 'brands.js') !== false )
                    $value['fetchJson'] = ELEMENTOR_ASSETS_PATH . 'lib/font-awesome/js/brands.js';
            }else{
                if(strpos($value['fetchJson'], 'solid-pro.js') !== false )
                    $value['fetchJson'] = PXL_PATH . 'assets/libs/font-awesome-pro/solid-pro.js';
                if(strpos($value['fetchJson'], 'regular-pro.js') !== false )
                    $value['fetchJson'] = PXL_PATH . 'assets/libs/font-awesome-pro/regular-pro.js';
                if(strpos($value['fetchJson'], 'brands-pro.js') !== false )
                    $value['fetchJson'] = PXL_PATH . 'assets/libs/font-awesome-pro/brands-pro.js';
                if(strpos($value['fetchJson'], 'light-pro.js') !== false )
                    $value['fetchJson'] = PXL_PATH . 'assets/libs/font-awesome-pro/light-pro.js';
                if(strpos($value['fetchJson'], 'duotone-pro.js') !== false )
                    $value['fetchJson'] = PXL_PATH . 'assets/libs/font-awesome-pro/duotone-pro.js';
                if(strpos($value['fetchJson'], 'thin-pro.js') !== false )
                    $value['fetchJson'] = PXL_PATH . 'assets/libs/font-awesome-pro/thin-pro.js';
            }
            if(strpos($value['fetchJson'], $theme_url) !== false )
                $value['fetchJson'] = str_replace($theme_url,get_template_directory(),$value['fetchJson']);
             
            $fetchJson = $value['fetchJson'] ;
            $file_content = '';   
            /*$opts = array(
                'ssl'=>array(
                    'verify_peer'=>false,
                    'verify_peer_name'=>false,
                )
            );
            $context = stream_context_create($opts);*/
            
            if(!empty($fetchJson) ){
                $file_content = json_decode( $wp_filesystem->get_contents( $fetchJson ), true);  
                //$file_content = json_decode( @file_get_contents($fetchJson, false, $context), true);
            }
             
            if(empty($file_content)) continue;

            $icon_arr = [];  
            foreach ($file_content['icons'] as $ico) {
                if(!empty($ico)){  
                    $icon_arr[] = [ $value['displayPrefix'].' '.$value['prefix'].$ico => str_replace(['-','_'], ' ', $ico)]  ;
                }
                 
            }
            $icons[$value['label']] = $icon_arr;
        }
        return $icons;
    }
      
}