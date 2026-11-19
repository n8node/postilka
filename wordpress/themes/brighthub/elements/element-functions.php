<?php 

/**
 * Swipper Lib
*/
if(!function_exists('brighthub_elements_scripts')){
    add_action( 'wp_enqueue_scripts', 'brighthub_elements_scripts');
    function brighthub_elements_scripts() {  
        $theme = wp_get_theme( get_template() );
        wp_register_script('gsap', get_template_directory_uri() . '/assets/js/libs/gsap.min.js', array( 'jquery' ), '3.5.0', true );
        wp_register_script('brighthub-physics', get_template_directory_uri() . '/assets/js/libs/matter.min.js', array( 'jquery' ), $theme->get( 'Version' ), true );
        wp_register_script('pxl-scroll-trigger', get_template_directory_uri() . '/assets/js/libs/scroll-trigger.js', array( 'jquery' ), '3.10.5', true );
        wp_register_script('pxl-scroll-smoother', get_template_directory_uri() . '/assets/js/libs/scroll-smoother.min.js', array( 'jquery', 'gsap', 'pxl-scroll-trigger'), '3.12.5');
        wp_register_script('pxl-splitText', get_template_directory_uri() . '/assets/js/libs/split-text.js', array( 'jquery' ), '3.6.1', true );
        wp_register_script('pxl-bundled-lenis', get_template_directory_uri() . '/assets/js/libs/bundled-lenis.min.js', array( 'jquery' ), '1.0.0', true );
        wp_register_script('pxl-modernizr', get_template_directory_uri() . '/assets/js/libs/modernizr.min.js', array( 'jquery' ), '1.0.0', true );
        wp_register_script('pxl-nice-scroll', get_template_directory_uri() . '/assets/js/libs/nice-scroll.min.js', array( 'jquery' ), '3.7.6', true );
        wp_register_script('brighthub-particle', get_template_directory_uri() . '/elements/assets/js/particle.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_register_script('brighthub-parallax', get_template_directory_uri() . '/elements/assets/js/parallax.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_register_style('odometer', get_template_directory_uri() . '/assets/css/libs/odometer.css', array(), '1.0.0');
        wp_register_style('odometer_min', get_template_directory_uri() . '/assets/css/libs/odometer.min.css', array(), '1.0.0');
        wp_register_script('odometer', get_template_directory_uri() . '/elements/assets/js/odometer.min.js', array( 'jquery' ), '1.0.0', true );
        wp_register_script('pxl-post-grid', get_template_directory_uri() . '/elements/assets/js/grid.js', [ 'isotope', 'jquery' ], $theme->get( 'Version' ), true);
        wp_localize_script('pxl-post-grid', 'main_data', array( 'ajax_url' => admin_url( 'admin-ajax.php' ), 'wpnonce' => wp_create_nonce( '_ajax_nonce' ) ) );
        wp_register_script('pxl-swiper', get_template_directory_uri() . '/elements/assets/js/carousel.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_register_script('brighthub-counter', get_template_directory_uri() . '/elements/assets/js/counter.js', [ 'jquery', 'odometer' ], $theme->get( 'Version' ), true);
        wp_register_script('brighthub-accordion', get_template_directory_uri() . '/elements/assets/js/accordion.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_register_script('brighthub-tabs', get_template_directory_uri() . '/elements/assets/js/tabs.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_register_script('brighthub-table', get_template_directory_uri() . '/elements/assets/js/table.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_register_script('brighthub-progressbar', get_template_directory_uri() . '/elements/assets/js/progressbar.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_register_script('brighthub-countdown', get_template_directory_uri() . '/elements/assets/js/countdown.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_register_script('pxl-pie-chart', get_template_directory_uri() . '/assets/js/libs/pie-chart.min.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_enqueue_script('brighthub-elementor', get_template_directory_uri() . '/elements/assets/js/elementor.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_enqueue_script('brighthub-svg', get_template_directory_uri() . '/elements/assets/js/svg.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_enqueue_script('brighthub-custom-controls', get_template_directory_uri() . '/elements/assets/js/custom_controls.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_enqueue_script('text-animation', get_template_directory_uri() . '/elements/assets/js/text-animation.js', [ 'jquery' ], $theme->get( 'Version' ), true);
        wp_enqueue_script('scroll-effect', get_template_directory_uri() . '/elements/assets/js/scroll_effect.js', [ 'jquery' ], $theme->get( 'Version' ), true);
    }
}

/**
 * Enqueue odometer when counter widget with odometer effect is used
 */
add_action('elementor/frontend/widget/before_render', 'brighthub_enqueue_odometer_for_counter');
function brighthub_enqueue_odometer_for_counter($widget) {
    if ($widget->get_name() === 'pxl_counter') {
        $settings = $widget->get_settings();
        if (isset($settings['effect']) && $settings['effect'] === 'effect-odometer') {
            wp_enqueue_style('odometer');
            wp_enqueue_script('odometer');
        }
    }
}

/**
 * Enqueue magnific-popup when video player widget is used
 */
add_action('elementor/frontend/widget/before_render', 'brighthub_enqueue_magnific_for_video');
function brighthub_enqueue_magnific_for_video($widget) {
    if ($widget->get_name() === 'pxl_video_player') {
        $settings = $widget->get_settings();
        if (!empty($settings['video_link'])) {
            wp_enqueue_style('magnific-popup', get_template_directory_uri() . '/assets/css/libs/magnific-popup.css', array(), '1.1.0');
            wp_enqueue_script('magnific-popup', get_template_directory_uri() . '/assets/js/libs/magnific-popup.min.js', array('jquery'), '1.1.0', true);
        }
    }
    if ($widget->get_name() === 'pxl_video') {
        $settings = $widget->get_settings();
        if (isset($settings['video_display_type']) && $settings['video_display_type'] === 'popup') {
            wp_enqueue_style('magnific-popup', get_template_directory_uri() . '/assets/css/libs/magnific-popup.css', array(), '1.1.0');
            wp_enqueue_script('magnific-popup', get_template_directory_uri() . '/assets/js/libs/magnific-popup.min.js', array('jquery'), '1.1.0', true);
        }
    }
}

/**
 * Get class widget path
*/
if(!function_exists('brighthub_get_class_widget_path')){
    function brighthub_get_class_widget_path(){
        $upload_dir = wp_upload_dir();
        $cls_path = $upload_dir['basedir'].'/elementor-widget/';
        if(!is_dir($cls_path)) {
            wp_mkdir_p( $cls_path );
        }
        return $cls_path;
    }
}

/**
 * Get post type options
*/
function brighthub_get_post_type_options($pt_supports=[]){
    $post_types = get_post_types([
        'public'   => true,
    ], 'objects');
    $excluded_post_type = [
        'page',
        'attachment',
        'revision',
        'nav_menu_item',
        'custom_css',
        'customize_changeset',
        'oembed_cache',
        'custom_css',
        'e-landing-page',
        'header',
        'footer',
        'mega-menu',
        'elementor_library'
    ];

    $result_some = [];
    $result_any = [];
    if (!is_array($post_types))
        return $result;
    foreach ($post_types as $post_type) {
        if (!$post_type instanceof WP_Post_Type)
            continue;
        if (in_array($post_type->name, $excluded_post_type))
            continue;

        if(!empty($pt_supports) && in_array($post_type->name, $pt_supports)){
            $result_some[$post_type->name] = $post_type->labels->singular_name;
        }else{
            $result_any[$post_type->name] = $post_type->labels->singular_name;
        }
    }

    if(!empty($pt_supports))
        return $result_some;
    else   
        return $result_any;
}


/**
 * Start Post Grid Functions
*/
function brighthub_get_post_grid_layout($pt_supports = []){
    $post_types  = brighthub_get_post_type_options($pt_supports); 
    $result = [];
    if (!is_array($post_types))
        return $result;
    foreach ($post_types as $name => $label) {
        $result[] = array(
            'name'     => 'layout_'.$name,
            'label'    => sprintf(esc_html__( 'Select Template of %s', 'brighthub' ), $label),
            'type'     => 'layoutcontrol',
            'default' => 'post-1',
            'options'  => brighthub_get_grid_layout_options($name),
            'prefix_class' => 'pxl-post-layout-',
            'condition' => [
                'post_type' => [$name]
            ]
        );
    }
    return $result;   
}

function brighthub_get_grid_layout_options($post_type_name){
    $option_layouts = [];
    switch ($post_type_name) {
        case 'post':  
            $option_layouts = [
                'post-1' => [
                    'label' => esc_html__( 'Layout 1', 'brighthub' ),
                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_post_grid/post-1.webp'
                ],
                'post-2' => [
                    'label' => esc_html__( 'Layout 2', 'brighthub' ),
                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_post_grid/post-2.webp'
                ],
                'post-3' => [
                    'label' => esc_html__( 'Layout 3', 'brighthub' ),
                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_post_grid/post-3.webp'
                ],
            ];
            break;

        case 'career':  
            $option_layouts = [
                'career-1' => [
                    'label' => esc_html__( 'Layout 1', 'brighthub' ),
                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_post_grid/career-1.jpg'
                ],
            ];
            break;

        case 'b2b':  
            $option_layouts = [
                'b2b-1' => [
                    'label' => esc_html__( 'Layout 1', 'brighthub' ),
                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_post_grid/b2b-1.webp'
                ],
            ];
            break;

        case 'template':  
            $option_layouts = [
                'template-1' => [
                    'label' => esc_html__( 'Layout 1', 'brighthub' ),
                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_post_grid/template-1.webp'
                ],
            ];
            break;

    }
    return $option_layouts;
}

function brighthub_get_grid_term_by_post_type($pt_supports = [], $args=[]){
    $args = wp_parse_args($args, ['condition' => 'post_type', 'custom_condition' => []]); 
    $post_types  = brighthub_get_post_type_options($pt_supports); 
    $result = [];
    if (!is_array($post_types))
        return $result;
    foreach ($post_types as $name => $label) {
         
        $taxonomy = get_object_taxonomies($name, 'names');
        
        if($name == 'post') $taxonomy = ['category'];

        $result[] = array(
            'name'     => 'source_'.$name,
            'label'    => sprintf(esc_html__( 'Select Term of %s', 'brighthub' ), $label),
            'type'     => \Elementor\Controls_Manager::SELECT2,
            'multiple' => true,
            'options'  => pxl_get_grid_term_options($name,$taxonomy),
            'condition' => array_merge(
                [
                    $args['condition'] => [$name]
                ],
                $args['custom_condition']
            )
        );
    }

    return $result;
}

function brighthub_get_grid_ids_by_post_type($pt_supports = [], $args = []){
    $args = wp_parse_args($args, ['condition' => 'post_type', 'custom_condition' => []]);
    $post_types = brighthub_get_post_type_options($pt_supports);
    $result = [];
    if (!is_array($post_types))
        return $result;
    foreach ($post_types as $name => $label) {

        $posts = brighthub_list_post($name, false);
 
        $result[] = array(
            'name' => 'source_' . $name . '_post_ids',
            'label' => sprintf(esc_html__('Select posts', 'brighthub'), $label),
            'type'     => \Elementor\Controls_Manager::SELECT2,
            'multiple' => true,
            'options' => $posts,
            'condition' => array_merge(
                [
                    $args['condition'] => [$name]
                ],
                $args['custom_condition']
            )
        );
    }

    return $result;
}

/**
 * End Post Grid Functions
*/


/**
 * Start Post Carousel Functions
*/
function brighthub_get_post_carousel_layout($pt_supports = []){
    $post_types  = brighthub_get_post_type_options($pt_supports); 
    $result = [];
    if (!is_array($post_types))
        return $result;
    foreach ($post_types as $name => $label) {
        $result[] = array(
            'name'     => 'layout_'.$name,
            'label'    => sprintf(esc_html__( 'Select Template of %s', 'brighthub' ), $label),
            'type'     => 'layoutcontrol',
            'default' => 'post-1',
            'options'  => brighthub_get_carousel_layout_options($name),
            'prefix_class' => 'post-layout-',
            'condition' => [
                'post_type' => [$name]
            ]
        );
    }
    return $result;   
}

function brighthub_get_carousel_layout_options($post_type_name){
    $option_layouts = [];
    switch ($post_type_name) {
        case 'post':  
            $option_layouts = [
                'post-1' => [
                    'label' => esc_html__( 'Layout 1', 'brighthub' ),
                    'image' => get_template_directory_uri() . '/elements/assets/img/pxl_post_carousel/post-1.webp'
                ],
            ];
            break;
    }
    return $option_layouts;
}

function brighthub_get_carousel_term_by_post_type($pt_supports = [], $args=[]){
    $args = wp_parse_args($args, ['condition' => 'post_type', 'custom_condition' => []]);
    $post_types  = brighthub_get_post_type_options($pt_supports); 
    $result = [];
    if (!is_array($post_types))
        return $result;
    foreach ($post_types as $name => $label) {
         
        $taxonomy = get_object_taxonomies($name, 'names');
        
        if($name == 'post') $taxonomy = ['category'];

        $result[] = array(
            'name'     => 'source_'.$name,
            'label'    => sprintf(esc_html__( 'Select Term of %s', 'brighthub' ), $label),
            'type'     => \Elementor\Controls_Manager::SELECT2,
            'multiple' => true,
            'options'  => pxl_get_grid_term_options($name,$taxonomy),
            'condition' => array_merge(
                [
                    $args['condition'] => [$name]
                ],
                $args['custom_condition']
            )
        );
    }

    return $result;
}
/**
 * End Post Carousel Functions
*/

/* Icon render */ 
function brighthub_elementor_icon_render( $settings, $args = []){
    $args = wp_parse_args($args, [
        'prefix'     => '',   
        'id'         => 'selected_icon',
        'loop'       => false,
        'tag'        => 'div',   
        'wrap_class' => '',
        'class'      => '',
        'style'      => '',
        'before'     => '',
        'after'      => '',
        'atts'       => [],
        'animate_data' => '',
        'default_icon'    => [
            'value'   => '',
            'library' => ''
        ],
        'echo' => true
    ]);
    if($args['loop']) {
        $icon = $args['id'];
    } else {
        $icon = $settings[$args['id']];
    }
    if(empty($icon['value'])) $icon = $args['default_icon'];
    if (empty($icon['value'])) return;

    if ( 'svg' === $icon['library'] ){
        $args['before'] = '<span class="'.$args['wrap_class'].' '.$args['class'].'" data-settings="'. esc_attr($args['animate_data']).'">';
        $args['after']  = '</span>';
    }
    ob_start();
    printf('%s', $args['before']);
    ?>
    <?php \Elementor\Icons_Manager::render_icon( $icon, array_merge(
            [ 
                'aria-hidden' => 'true', 
                'class'       => trim(implode(' ', ['pxl-icon', $args['class'], $args['wrap_class']])),
                'style'       => $args['style']  
            ],
            $args['atts']
        ), $args['tag']); ?>
    <?php
    printf('%s', $args['after']);

    if($args['echo']){
        echo ob_get_clean();
    } else {
        return ob_get_clean();
    }
}

/**
 * Animation List
*/

function brighthub_widget_animate() {
    $brighthub_animate = array(
        '' => 'None',
        'wow bounce' => 'bounce',
        'wow flash' => 'flash',
        'wow pulse' => 'pulse',
        'wow rubberBand' => 'rubberBand',
        'wow shake' => 'shake',
        'wow swing' => 'swing',
        'wow tada' => 'tada',
        'wow wobble' => 'wobble',
        'wow bounceIn' => 'bounceIn',
        'wow bounceInDown' => 'bounceInDown',
        'wow bounceInLeft' => 'bounceInLeft',
        'wow bounceInRight' => 'bounceInRight',
        'wow bounceInUp' => 'bounceInUp',
        'wow bounceOut' => 'bounceOut',
        'wow bounceOutDown' => 'bounceOutDown',
        'wow bounceOutLeft' => 'bounceOutLeft',
        'wow bounceOutRight' => 'bounceOutRight',
        'wow bounceOutUp' => 'bounceOutUp',
        'wow fadeIn' => 'fadeIn',
        'wow fadeInDown' => 'fadeInDown',
        'wow fadeInDownBig' => 'fadeInDownBig',
        'wow fadeInLeft' => 'fadeInLeft',
        'wow fadeInLeftBig' => 'fadeInLeftBig',
        'wow fadeInRight' => 'fadeInRight',
        'wow fadeInRightBig' => 'fadeInRightBig',
        'wow fadeInUp' => 'fadeInUp',
        'wow fadeInUpBig' => 'fadeInUpBig',
        'wow fadeOut' => 'fadeOut',
        'wow fadeOutDown' => 'fadeOutDown',
        'wow fadeOutDownBig' => 'fadeOutDownBig',
        'wow fadeOutLeft' => 'fadeOutLeft',
        'wow fadeOutLeftBig' => 'fadeOutLeftBig',
        'wow fadeOutRight' => 'fadeOutRight',
        'wow fadeOutRightBig' => 'fadeOutRightBig',
        'wow fadeOutUp' => 'fadeOutUp',
        'wow fadeOutUpBig' => 'fadeOutUpBig',
        'wow flip' => 'flip',
        'wow flipCase' => 'flipCase',
        'wow flipInX' => 'flipInX',
        'wow flipInY' => 'flipInY',
        'wow flipOutX' => 'flipOutX',
        'wow flipOutY' => 'flipOutY',
        'wow lightSpeedIn' => 'lightSpeedIn',
        'wow lightSpeedOut' => 'lightSpeedOut',
        'wow rotateIn' => 'rotateIn',
        'wow rotateInDownLeft' => 'rotateInDownLeft',
        'wow rotateInDownRight' => 'rotateInDownRight',
        'wow rotateInUpLeft' => 'rotateInUpLeft',
        'wow rotateInUpRight' => 'rotateInUpRight',
        'wow rotateOut' => 'rotateOut',
        'wow rotateOutDownLeft' => 'rotateOutDownLeft',
        'wow rotateOutDownRight' => 'rotateOutDownRight',
        'wow rotateOutUpLeft' => 'rotateOutUpLeft',
        'wow rotateOutUpRight' => 'rotateOutUpRight',
        'fadeInTopLeft wow' => 'fadeInTopLeft',
        'fadeInTopRight wow' => 'fadeInTopRight',
        'fadeInBottomLeft wow' => 'fadeInBottomLeft',
        'fadeInBottomRight wow' => 'fadeInBottomRight',
        'wow hinge' => 'hinge',
        'wow rollIn' => 'rollIn',
        'wow rollOut' => 'rollOut',
        'wow zoomInSmall' => 'zoomInSmall',
        'wow zoomIn' => 'zoomInBig',
        'wow zoomOut' => 'zoomOut',
        'wow skewIn' => 'skewInLeft',
        'wow skewInRight' => 'skewInRight',
        'wow skewInBottom' => 'skewInBottom',
        'wow RotatingY' => 'RotatingY',
        'wow PXLfadeInUp' => 'PXLfadeInUp',
        'fadeInPopup' => 'fadeInPopup',
    );
    return $brighthub_animate;
}

function brighthub_widget_animate_v2() {
    $brighthub_animate_v2 = array(
        '' => 'None',
        'wow bounce' => 'bounce',
        'wow flash' => 'flash',
        'wow pulse' => 'pulse',
        'wow rubberBand' => 'rubberBand',
        'wow shake' => 'shake',
        'wow swing' => 'swing',
        'wow tada' => 'tada',
        'wow wobble' => 'wobble',
        'wow bounceIn' => 'bounceIn',
        'wow bounceInDown' => 'bounceInDown',
        'wow bounceInLeft' => 'bounceInLeft',
        'wow bounceInRight' => 'bounceInRight',
        'wow bounceInUp' => 'bounceInUp',
        'wow bounceOut' => 'bounceOut',
        'wow bounceOutDown' => 'bounceOutDown',
        'wow bounceOutLeft' => 'bounceOutLeft',
        'wow bounceOutRight' => 'bounceOutRight',
        'wow bounceOutUp' => 'bounceOutUp',
        'wow fadeIn' => 'fadeIn',
        'wow fadeInDown' => 'fadeInDown',
        'wow fadeInDownBig' => 'fadeInDownBig',
        'wow fadeInLeft' => 'fadeInLeft',
        'wow fadeInLeftBig' => 'fadeInLeftBig',
        'wow fadeInRight' => 'fadeInRight',
        'wow fadeInRightBig' => 'fadeInRightBig',
        'wow fadeInUp' => 'fadeInUp',
        'wow fadeInUpBig' => 'fadeInUpBig',
        'wow fadeOut' => 'fadeOut',
        'wow fadeOutDown' => 'fadeOutDown',
        'wow fadeOutDownBig' => 'fadeOutDownBig',
        'wow fadeOutLeft' => 'fadeOutLeft',
        'wow fadeOutLeftBig' => 'fadeOutLeftBig',
        'wow fadeOutRight' => 'fadeOutRight',
        'wow fadeOutRightBig' => 'fadeOutRightBig',
        'wow fadeOutUp' => 'fadeOutUp',
        'wow fadeOutUpBig' => 'fadeOutUpBig',
        'wow flip' => 'flip',
        'wow flipCase' => 'flipCase',
        'wow flipInX' => 'flipInX',
        'wow flipInY' => 'flipInY',
        'wow flipOutX' => 'flipOutX',
        'wow flipOutY' => 'flipOutY',
        'wow lightSpeedIn' => 'lightSpeedIn',
        'wow lightSpeedOut' => 'lightSpeedOut',
        'wow rotateIn' => 'rotateIn',
        'wow rotateInDownLeft' => 'rotateInDownLeft',
        'wow rotateInDownRight' => 'rotateInDownRight',
        'wow rotateInUpLeft' => 'rotateInUpLeft',
        'wow rotateInUpRight' => 'rotateInUpRight',
        'wow rotateOut' => 'rotateOut',
        'wow rotateOutDownLeft' => 'rotateOutDownLeft',
        'wow rotateOutDownRight' => 'rotateOutDownRight',
        'wow rotateOutUpLeft' => 'rotateOutUpLeft',
        'wow rotateOutUpRight' => 'rotateOutUpRight',
        'wow hinge' => 'hinge',
        'wow rollIn' => 'rollIn',
        'wow rollOut' => 'rollOut',
        'wow zoomInSmall' => 'zoomInSmall',
        'wow zoomIn' => 'zoomInBig',
        'wow zoomOut' => 'zoomOut',
        'wow skewIn' => 'skewInLeft',
        'wow skewInRight' => 'skewInRight',
        'wow RotatingY' => 'RotatingY',
        'wow PXLfadeInUp' => 'PXLfadeInUp',
        'wow fadeInTopLeft' => 'fadeInTopLeft',
        'wow fadeInTopRight' => 'fadeInTopRight',
        'wow fadeInBottomLeft' => 'fadeInBottomLeft',
        'wow fadeInBottomRight' => 'fadeInBottomRight',
        'wow TextOutlineAnimation' => 'Text Outline Animation',
        'pxl-split-text split-in-fade' => 'Slip Text In Fade',
        'pxl-split-text split-in-right' => 'Slip Text In Right',
        'pxl-split-text split-in-left'  => 'Slip Text In Left',
        'pxl-split-text split-in-up'    => 'Slip Text In Up',
        'pxl-split-text split-in-down'  => 'Slip Text In Down',
        'pxl-split-text split-in-rotate'  => 'Slip Text In Rotate',
        'pxl-split-text split-in-scale'  => 'Slip Text In Scale',
    );
    return $brighthub_animate_v2;
}

/**
 * Pagram Animation
*/
if(!function_exists('brighthub_widget_animation_settings')){
    function brighthub_widget_animation_settings($args = []){
        $args = wp_parse_args($args, [
            'tab'       => \Elementor\Controls_Manager::TAB_STYLE,
            'condition' => []
        ]);
        return array(
            'name'      => 'section_animation',
            'label'     => esc_html__('Animation', 'brighthub'),
            'tab'       => $args['tab'],
            'condition' => $args['condition'],
            'controls'  => array_merge(
                array(
                    array(
                        'name' => 'pxl_animate',
                        'label' => esc_html__('Case Animate', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => brighthub_widget_animate(),
                        'default' => '',
                    ),
                    array(
                        'name' => 'pxl_animate_delay',
                        'label' => esc_html__('Animate Delay', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::TEXT,
                        'default' => '0',
                        'description' => 'Enter number. Default 0ms',
                    ),
                )
            )
        );
    }
}

if(!function_exists('brighthub_widget_animation_v2_settings')){
    function brighthub_widget_animation_v2_settings($args = []){
        $args = wp_parse_args($args, [
            'tab'       => \Elementor\Controls_Manager::TAB_STYLE,
            'condition' => []
        ]);
        return array(
            'name'      => 'section_animation',
            'label'     => esc_html__('Animation', 'brighthub'),
            'tab'       => $args['tab'],
            'condition' => $args['condition'],
            'controls'  => array_merge(
                array(
                    array(
                        'name' => 'pxl_animate',
                        'label' => esc_html__('Case Animate', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::SELECT,
                        'options' => brighthub_widget_animate_v2(),
                        'default' => '',
                    ),
                    array(
                        'name' => 'pxl_animate_delay',
                        'label' => esc_html__('Animate Delay', 'brighthub' ),
                        'type' => \Elementor\Controls_Manager::TEXT,
                        'default' => '0',
                        'description' => 'Enter number. Default 0ms',
                    ),
                )
            )
        );
    }
}

if (!function_exists('renderTable')) {
    function renderTable($data, $columnTitle = false, $rowTitle = false, $res_col = false, $res_screen = '767', $convertV = false, $convertX = false) {
        if (empty($data) || !is_array($data)) return;
        $allowed_tags = array(
            'a' => array(
                'href' => array(),
                'title' => array()
            ),
            'br' => array(),
            'em' => array(),
            'strong' => array(),
            'ul' => array(),
            'li' => array(),
            'span' => array(
                'class' => array()
            ),
            'svg' => array(
                'style' => array()
            ),
            'path' => array(
                'd' => array()
            ),
            'g' => array(
                'fill' => array()
            ),
            'rect' => array(
                'width' => array(),
                'height' => array(),
                'x' => array(),
                'y' => array(),
            ),
            'polygon' => array(
                'points' => array()
            ),
            'line' => array(
                'x1' => array(),
                'y1' => array(),    
                'x2' => array(),
                'y2' => array(),
            ),
            'circle' => array(
                'cx' => array(),
                'cy' => array(),
                'r' => array(),
            ),
            'ellipse' => array(
                'cx' => array(),
                'cy' => array(),
                'rx' => array(),
                'ry' => array(),    
            ),
            'defs' => array(),
            'clipPath' => array(),
            'linearGradient' => array(),
            'radialGradient' => array(),
            'stop' => array(),  
            'img' => array(
                'src' => array(),
                'alt' => array(),
                'width' => array(),
                'height' => array(),
                'class' => array(),
                'style' => array(),
            ),  
        );
        ?>
        <table class="pxl-table__wrap <?php 
            if($columnTitle === true){echo esc_attr("pxl-table__title-col");}  
            if($rowTitle === true){echo esc_attr("pxl-table__title-row");} 
            if($res_col === true){echo esc_attr("pxl-table__desktop");} 
            ?>" data-responsive="<?php if($res_screen){echo esc_attr($res_screen);}  ?>">
            <?php if ($columnTitle): ?>
                <thead>
                    <tr>
                        <?php
                        $startCol = 0;
                        foreach ($data[0] as $colIndex => $value):
                            if ($colIndex < $startCol) continue;
                        ?>
                            <th><?php echo wp_kses($value, $allowed_tags); ?></th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
            <?php endif; ?>
            
            <tbody>
                <?php
                $startRow = $columnTitle ? 1 : 0;
                for ($rowIndex = $startRow; $rowIndex < count($data); $rowIndex++):
                    $row = $data[$rowIndex];
                ?>
                    <tr
                        <?php if ($columnTitle): ?>
                            data-column-title="<?php echo htmlspecialchars($row[0]); ?>"
                        <?php endif; ?>
                    >
                        <?php if ($rowTitle): ?>
                            <th><?php echo wp_kses($row[0], $allowed_tags); ?></th>
                            <?php
                            for ($colIndex = 1; $colIndex < count($row); $colIndex++):
                                $columnTitleText = $data[0][$colIndex];
                            ?>
                                <td data-row-title="<?php echo htmlspecialchars($columnTitleText); ?>">
                                    <?php if($convertV && $row[$colIndex] === 'v') :?>
                                        <svg style="margin-top: 3px;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M14.7639 1.75631C11.9685 2.67386 8.40507 5.12775 5.11898 9.33138L3.17721 7.17622C2.87847 6.83481 2.32368 6.83481 2.02494 7.17622L0.59528 8.77659C0.317883 9.09666 0.339221 9.5661 0.637957 9.8435L5.03363 14.0685C5.39638 14.4099 5.99385 14.3245 6.24991 13.8764C8.59711 9.63012 11.115 6.47206 15.3827 2.84456C15.8948 2.39646 15.4253 1.54293 14.7639 1.75631Z" fill="#2E90FA"/>
                                        </svg>
                                    <?php elseif($convertX && $row[$colIndex] === ' - ') :?>
                                        <span class="pxl-table__feature-x" style="background:#717680; width: 8px; height: 2px; display: block;"></span>
                                    <?php else :?>
                                        <?php echo wp_kses($row[$colIndex], $allowed_tags); ?>
                                    <?php endif; ?>
                                </td>
                            <?php endfor; ?>
                        <?php else: ?>
                            <?php 
                            foreach ($row as $colIndex => $cell): 
                                $dataLabelAttr = ($columnTitle && $colIndex > 0) 
                                    ? 'data-label="' . htmlspecialchars($data[0][$colIndex]) . '"' 
                                    : '';
                            ?>
                                <td <?php echo esc_attr($dataLabelAttr); ?>>
                                    <?php 
                                    if ($columnTitle && $colIndex === 0) {
                                        echo wp_kses($row[0], $allowed_tags);
                                    } else {
                                        echo wp_kses($cell, $allowed_tags);
                                    }
                                    ?>
                                </td>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tr>
                <?php endfor; ?>
            </tbody>
        </table>
        <?php
    }
}

// Convert color to HSL and shift hue
if(!function_exists('shift_hue')){
    function shift_hue($hex, $degree = 34) {
        $hex = str_replace('#', '', $hex);

        $r = hexdec(substr($hex, 0, 2)) / 255;
        $g = hexdec(substr($hex, 2, 2)) / 255;
        $b = hexdec(substr($hex, 4, 2)) / 255;

        $max = max($r, $g, $b);
        $min = min($r, $g, $b);
        $h = $s = $l = ($max + $min) / 2;

        if ($max == $min) {
            $h = $s = 0;
        } else {
            $d = $max - $min;
            $s = $l > 0.5 ? $d / (2 - $max - $min) : $d / ($max + $min);
            switch ($max) {
                case $r: $h = ($g - $b) / $d + ($g < $b ? 6 : 0); break;
                case $g: $h = ($b - $r) / $d + 2; break;
                case $b: $h = ($r - $g) / $d + 4; break;
            }
            $h = $h / 6;
        }

        $h = fmod((($h * 360) + $degree + 360), 360) / 360;

        if ($s == 0) {
            $r = $g = $b = $l;
        } else {
            $q = $l < 0.5 ? $l * (1 + $s) : $l + $s - $l * $s;
            $p = 2 * $l - $q;
            $hue2rgb = function ($p, $q, $t) {
                if ($t < 0) $t += 1;
                if ($t > 1) $t -= 1;
                if ($t < 1/6) return $p + ($q - $p) * 6 * $t;
                if ($t < 1/2) return $q;
                if ($t < 2/3) return $p + ($q - $p) * (2/3 - $t) * 6;
                return $p;
            };
            $r = $hue2rgb($p, $q, $h + 1/3);
            $g = $hue2rgb($p, $q, $h);
            $b = $hue2rgb($p, $q, $h - 1/3);
        }

        return sprintf("#%02X%02X%02X", round($r * 255), round($g * 255), round($b * 255));
    }
}
