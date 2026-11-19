<?php
if (!defined('ABSPATH')) {
    exit;
}

use Elementor\Icons_Manager;

if (!class_exists('ReduxFramework_pxl_iconpicker')) {
    class ReduxFramework_pxl_iconpicker {
        public $parent;
        public $field;
        public $value;
        public $extension_url   = '';
        function __construct($field, $value, $parent) {
            $this->parent = $parent;
            $this->field = $field;
            $this->value = $value;

            $this->extension_url = pxl_redux_fields()->extensions_url . 'pxl_iconpicker/';
        }

        /**
         * Field Render Function.
         * Takes the vars and outputs the HTML for the field in the settings
         *
         * @since ReduxFramework 1.0.0
         */
        function render() {
            $optgroups = $this->get_icons();
            ?>
                <select name="<?php echo $this->field['name'] . $this->field['name_suffix']; ?>" class="pxl-iconpicker">
                    <option value=""><?php esc_html_e('No Icons', PXL_TEXT_DOMAIN) ?></option>
                    <?php
                        foreach ($optgroups as $optgroup_label => $optgroup):
                    ?>
                        <optgroup label="<?php echo esc_attr($optgroup_label); ?>">
                            <?php 
                                foreach ($optgroup as $opt):
                                    $icon_class = array_keys($opt)[0];
                                    $icon_label = $opt[$icon_class];
                                    $selected = $this->value == $icon_class?'selected':'';
                            ?>
                                <option value="<?php echo esc_attr($icon_class); ?>" <?php echo esc_attr($selected); ?>><?php echo esc_html($icon_label); ?></option>
                            <?php 
                                endforeach;
                            ?>
                        </optgroup>
                    <?php 
                        endforeach;
                     ?>
                </select>
            <?php
        }

        public function enqueue() {
            $awesome_pro_support = apply_filters( 'pxl_support_awesome_pro', true );
            if(!wp_style_is('jquery.fonticonpicker.min.css')){
                wp_enqueue_style('jquery.fonticonpicker.min.css', PXL_URL . 'assets/libs/iconpicker/css/jquery.fonticonpicker.min.css', array(), 'all');
            }
            if(!wp_style_is('jquery.fonticonpicker.grey.min.css')){
                wp_enqueue_style('jquery.fonticonpicker.grey.min.css', PXL_URL . 'assets/libs/iconpicker/themes/grey-theme/jquery.fonticonpicker.grey.min.css', array(), 'all');
            }
            if (!wp_script_is('jquery.fonticonpicker.js')) {
                wp_enqueue_script('jquery.fonticonpicker.js', PXL_URL . 'assets/libs/iconpicker/jquery.fonticonpicker.min.js', array('jquery'), 'all', true);
            }
            if (!wp_script_is('pxl-iconpicker-js')) {
                wp_enqueue_script(
                    'pxl-iconpicker-js',
                    $this->extension_url . 'inc/field_pxl_iconpicker.js',
                    array('jquery', 'jquery.fonticonpicker.js'),
                    time(),
                    true
                );
            }
             
            if($awesome_pro_support)
                wp_enqueue_style( 'font-awesome-pro', PXL_URL . 'assets/libs/font-awesome-pro/css/all.min.css', [], '5.15.4-pro' );
            else
                if ( defined( 'ELEMENTOR_VERSION' ) && is_callable( 'Elementor\Plugin::instance' ) )
                    wp_enqueue_style('font-awesome', ELEMENTOR_ASSETS_URL . 'lib/font-awesome/css/all.min.css', [], '5.15.3' );
                else 
                    wp_enqueue_style( 'font-awesome-pro', PXL_URL . 'assets/libs/font-awesome-pro/css/all.min.css', [], '5.15.4-pro' );
             
        }

        public function get_icons(){  
            global $wp_filesystem;
            $icons = array();
            if ( defined( 'ELEMENTOR_VERSION' ) && is_callable( 'Elementor\Plugin::instance' ) ) {
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
                        //$file_content = json_decode( @file_get_contents($fetchJson, false, $context), true);
                        $file_content = json_decode( $wp_filesystem->get_contents( $fetchJson ), true);
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
            }
            $icons = apply_filters("redux_pxl_iconpicker_field/get_icons", $icons);

            return $icons;
        }
         
    }
}