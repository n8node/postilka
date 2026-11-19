<?php 
if(!function_exists('pxl_add_custom_widget')){
    function pxl_add_custom_widget($widget, $dir = PXL_PATH . 'inc/elementor/'){ 
        $name = isset($widget['name'])?$widget['name']:'';
        $title = isset($widget['title'])?$widget['title']:'';
        $icon = isset($widget['icon'])?$widget['icon']:'';
        $categories = isset($widget['categories'])?$widget['categories']:array();
        $params = isset($widget['params'])?$widget['params']:array();
        $styles = isset($widget['styles'])?$widget['styles']:array();
        $scripts = isset($widget['scripts'])?$widget['scripts']:array();
        $class_name = pxl_generate_class_name($widget['name']);
        $file_name = pxl_generate_file_class_name($widget['name']);
        $file_path = $dir . $file_name . '.php';
        $result = true;
         
        if(defined('THEME_DEV_MODE_ELEMENTS') && THEME_DEV_MODE_ELEMENTS){
            $result = pxl_create_class_widget($file_path, $class_name, $name, $title, $icon, $categories, $params, $styles, $scripts);
        }
        require_once( $file_path );
        if($result && class_exists($class_name)){
            \Elementor\Plugin::instance()->widgets_manager->register( new $class_name() );
        }
    }
}


if(!function_exists('pxl_generate_class_name')){
    function pxl_generate_class_name($name){
        $name = strtolower($name);
        $name = replace_all_special_character($name);
        $class_name = ucfirst($name);
        $class_name = preg_replace_callback('/_([a-z]?)/', function($match) {
            return strtoupper($match[1]);
        }, $class_name);
        $class_name = $class_name . "_Widget";
        return $class_name;
    }
}

if(!function_exists('pxl_generate_file_class_name')){
    function pxl_generate_file_class_name($name){
        $name = strtolower($name);
        $name = replace_all_special_character($name, '-');
        return $file_name = 'class-'.$name;
    }
}

if(!function_exists('pxl_create_class_widget')){
    function pxl_create_class_widget($file_path, $class_name, $name, $title, $icon, $categories, $params, $styles = [], $scripts = []){
        $file_content_template_path = PXL_PATH . 'inc/elementor/widgets/class-widget-template.txt';

        $file_content = file_get_contents($file_content_template_path);
        if($file_content === false){
            return false;
        }
        $file_content = "<?php

" . $file_content;
        $search = array(
            '[[class_name]]',
            '[[name]]',
            '[[title]]',
            '[[icon]]',
            '[[categories]]',
            '[[params]]',
            '[[styles]]',
            '[[scripts]]',
        );
        $str_categories = implode("','", $categories);
        if(!empty($str_categories)){
            $str_categories = "'" . $str_categories . "'";
        }
        $params = json_encode($params);
        $params = str_replace("'", "\'", $params);
        $str_styles = implode("','", $styles);
        if(!empty($str_styles)){
            $str_styles = "'" . $str_styles . "'";
        }
        $str_scripts = implode("','", $scripts);
        if(!empty($str_scripts)){
            $str_scripts = "'" . $str_scripts . "'";
        }
        $replace = array(
            $class_name,
            $name,
            $title,
            $icon,
            $str_categories,
            $params,
            $str_styles,
            $str_scripts,
        );
        $file_content = str_replace(
            $search,
            $replace,
            $file_content
        );
        if (file_put_contents($file_path, $file_content) === false) {
            return false;
        }
        return true;
    }
}

if(!function_exists('replace_all_special_character')){
    function replace_all_special_character($subject = '', $replace = '_'){
        return preg_replace('/[^A-Za-z0-9]/', $replace, $subject);
    }
}

if(!function_exists('pxl_get_template')){
    function pxl_get_template($widget, $template_path = '', $default_path = ''){ 
        $settings = $widget->get_settings_for_display();
        $settings['element_id'] = $widget->get_id();
        $settings['element_name'] = $widget->get_name();
        $template_name = $widget->get_name();  
        $layout = (isset($settings['layout']) && !empty($settings['layout'])) ? $settings['layout'] : '1'; 
  
        if(!empty($settings['post_type']))
            $layout = $settings['layout_'.$settings['post_type']]; 
 
        $located = pxl_get_locate_template($template_name, $layout, $template_path, $default_path);

        if (!file_exists($located)) {
            _doing_it_wrong(__FUNCTION__, sprintf('<code>%s</code> does not exist.', $located), '1.0');

            return false;
        }

        $located = apply_filters('pxl_template_part', $located, $template_name, $settings, $template_path, $default_path);

        include($located);

    }
}

if(!function_exists('pxl_get_locate_template')){
    function pxl_get_locate_template($template_name, $layout = '1', $template_path = '', $default_path = '')
    {
        $layout_name = 'layout-' . $layout . '.php';
        if (!$template_path) {
            $template_path = apply_filters('pxl_template_path', 'elements/templates/' . $template_name . '/');
        }

        if (!$default_path) {
            $default_path = PXL_PATH . 'inc/elementor/templates/' . $template_name . '/';
        }

        // Look within passed path within the theme - this is priority.
        $template = locate_template(
            array(
                trailingslashit($template_path) . $layout_name,
                $layout_name
            )
        );

        // Get default template/
        if (!$template) {
            $template = $default_path . $layout_name;
        }

        // Return what we found.
        return apply_filters('pxl_locate_template', $template, $template_name, $template_path);
    }
}

if(!function_exists('pxl_get_element_id')){
    function pxl_get_element_id($settings){
        return $settings['element_name'] . '-' . $settings['element_id'] . '-' . rand(1000,10000);
    }
}

add_filter('elementor/icons_manager/native', 'pxl_register_custom_icon_library');
function pxl_register_custom_icon_library($settings){
    $awesome_pro_support = apply_filters( 'pxl_support_awesome_pro', true );
    if(!$awesome_pro_support) return $settings;
    $icons = [
        'fa-regular' => [
            'name' => 'fa-regular',
            'label' => esc_html__( 'Font Awesome - Regular', PXL_TEXT_DOMAIN ),
            'url' => false, 
            'enqueue' => false,
            'prefix' => 'fa-',
            'displayPrefix' => 'far',
            'labelIcon' => 'fab fa-font-awesome-alt',
            'ver' => '5.15.4-pro',
            'fetchJson' => PXL_URL . 'assets/libs/font-awesome-pro/regular.js',
            'native' => true,
        ],
        'fa-solid' => [
            'name' => 'fa-solid',
            'label' => esc_html__( 'Font Awesome - Solid', PXL_TEXT_DOMAIN ),
            'url' => false, 
            'enqueue' => false,
            'prefix' => 'fa-',
            'displayPrefix' => 'fas',
            'labelIcon' => 'fab fa-font-awesome',
            'ver' => '5.15.4-pro',
            'fetchJson' => PXL_URL . 'assets/libs/font-awesome-pro/solid.js',
            'native' => true,
        ],
        'fa-brands' => [
            'name' => 'fa-brands',
            'label' => esc_html__( 'Font Awesome - Brands', PXL_TEXT_DOMAIN ),
            'url' => false, 
            'enqueue' => false,
            'prefix' => 'fa-',
            'displayPrefix' => 'fab',
            'labelIcon' => 'fab fa-font-awesome-flag',
            'ver' => '5.15.4-pro',
            'fetchJson' => PXL_URL . 'assets/libs/font-awesome-pro/brands.js',
            'native' => true,
        ],
        'fa-light' => [
            'name' => 'fa-light',
            'label' => esc_html__( 'Font Awesome - Light', PXL_TEXT_DOMAIN ),
            'url' => false, 
            'enqueue' => false,
            'prefix' => 'fa-',
            'displayPrefix' => 'fal',
            'labelIcon' => 'fal fa-flag',
            'ver' => '5.15.4-pro',
            'fetchJson' => PXL_URL . 'assets/libs/font-awesome-pro/light.js',
            'native' => true,
        ]
         
    ];
    unset(
        $settings['fa-solid'],
        $settings['fa-regular'],
        $settings['fa-brands']
    );
    return array_merge( $icons, $settings );
     
}

 