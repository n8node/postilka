<?php
use Elementor\Core\Files\CSS\Post;
use Elementor\Plugin;
use Elementor\Post_CSS_File;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

abstract class Pxltheme_Core_Widget_Base extends \Elementor\Widget_Base {

    protected $name;
    protected $title;
    protected $icon;
    protected $categories;
    protected $params;
    protected $styles;
    protected $scripts;

    public function get_name() {
        return $this->name;
    }

    public function get_title() {
        return $this->title;
    }

    public function get_icon() {
        return $this->icon;
    }

    public function get_categories() {
        return $this->categories;
    }
    public function __construct( $data = [], $args = null ) {
        parent::__construct( $data, $args );
 
    }
 
    public function get_params() {
        return $this->params;
    }

    public function get_style_depends() {
        return $this->styles;
    }

    public function get_script_depends() {
        return $this->scripts;
    }

    protected function register_controls() {
        if(!is_array($this->params)){
            $this->params = json_decode($this->params, true);
        }
         
        if(!empty($this->params)){
            $params = $this->params;
            if(isset($params['sections']) && !empty($params['sections'])){
                $sections = $params['sections'];
                foreach($sections as $section){
                    if(isset($section['controls']) && !empty($section['controls'])){
                        $controls = isset($section['controls'])?$section['controls']:[];
                        $this->start_controls_section(
                            $section['name'],
                            [
                                'label' => $section['label'],
                                'tab' => $section['tab'],
                                'condition' => isset($section['condition'])?$section['condition']:'',
                                'conditions' => isset($section['conditions'])?$section['conditions']:'',
                            ]
                        );
                        foreach ($controls as $control){
                            $control_type = isset($control['control_type']) ? $control['control_type']:'';
                            if($control_type == 'responsive'){
                                $args = $this->convert_args($control);
                                $this->add_responsive_control($control['name'], $args);
                            }
                            elseif($control_type == 'group'){
                                $args = $this->convert_args($control);
                                $args['name'] = $control['name'];
                                if(isset($control['fields_options'])) {
                                    $args['fields_options'] = $control['fields_options'];
                                }
                                
                                $this->add_group_control(
                                    $control['type'],
                                    $args
                                );
                            }
                            elseif($control_type == 'tab'){
                                if(isset($control['tabs']) && !empty($control['tabs'])){
                                    $this->start_controls_tabs( $control['name'] );
                                    foreach ($control['tabs'] as $tab){
                                        if(isset($tab['controls']) && !empty($tab['controls'])){
                                            $this->start_controls_tab(
                                                $tab['name'],
                                                [
                                                    'label' => $tab['label'],
                                                ]
                                            );
                                            foreach ($tab['controls'] as $tab_control){
                                                $tab_control_type = isset($tab_control['control_type'])?$tab_control['control_type']:'';
                                                if($tab_control_type == 'responsive'){
                                                    $args = $this->convert_args($tab_control);
                                                    $this->add_responsive_control($tab_control['name'], $args);
                                                }
                                                elseif($tab_control_type == 'group'){
                                                    $args = $this->convert_args($tab_control);
                                                    $args['name'] = $tab_control['name'];
                                                    if(isset($tab_control['fields_options'])) {
                                                        $args['fields_options'] = $tab_control['fields_options'];
                                                    }
                                                    $this->add_group_control(
                                                        $tab_control['type'],
                                                        $args
                                                    );
                                                }

                                                // Start - CeaTran - 15/07/2025
                                                elseif($tab_control['type'] == \Elementor\Controls_Manager::REPEATER){
                                                    $repeater = new \Elementor\Repeater();
                                                    if(isset($tab_control['controls']) && !empty($tab_control['controls'])){
                                                        foreach ($tab_control['controls'] as $tab_rp_control){
                                                            $args = $this->convert_args($tab_rp_control);
                                                            if(isset($tab_rp_control['control_type']) && $tab_rp_control['control_type'] == 'responsive'){
                                                                $repeater->add_responsive_control($tab_rp_control['name'], $args);
                                                            }elseif(isset($tab_rp_control['control_type']) && $tab_rp_control['control_type'] == 'group'){
                                                                $args['name'] = $tab_rp_control['name'];
                                                                if(isset($tab_rp_control['fields_options'])) {
                                                                    $args['fields_options'] = $tab_rp_control['fields_options'];
                                                                }
                                                                $repeater->add_group_control($tab_rp_control['type'],$args);
                                                            }else{
                                                                if(isset($tab_rp_control['groups'])) {
                                                                    $args['groups'] = $tab_rp_control['groups'];
                                                                }
                                                                $repeater->add_control($tab_rp_control['name'], $args);
                                                            }
                                                        }
                                                    }
                                                    $this->add_control($tab_control['name'], [
                                                        'label' => isset($tab_control['label'])?$tab_control['label']:'',
                                                        'type' => isset($tab_control['type'])?$tab_control['type']:'',
                                                        'fields' => $repeater->get_controls(),
                                                        'default' => isset($tab_control['default'])?$tab_control['default']:[],
                                                        'description' => isset($tab_control['description'])?$tab_control['description']:'',
                                                        'condition' => isset($tab_control['condition'])?$tab_control['condition']:'',
                                                        'conditions' => isset($tab_control['conditions'])?$tab_control['conditions']:'',
                                                        'title_field' => isset($tab_control['title_field'])?$tab_control['title_field']:'',
                                                    ]);
                                                }
                                                // End - CeaTran - 15/07/2025
                                                
                                                elseif($tab_control['type'] == 'pxl_start_popover'){
                                                    $this->start_popover();
                                                }
                                                elseif($tab_control['type'] == 'pxl_end_popover'){
                                                    $this->end_popover();
                                                }
                                                else{
                                                    $args = $this->convert_args($tab_control);
                                                    // Update control groups to select type
                                                    if(isset($tab_control['groups'])) {
                                                        $args['groups'] = $tab_control['groups'];
                                                    }
                                                    $this->add_control($tab_control['name'], $args);
                                                }
                                            }
                                            $this->end_controls_tab();
                                        }
                                    }
                                    $this->end_controls_tabs();
                                }
                            }
                            else{
                                if($control['type'] == \Elementor\Controls_Manager::REPEATER){
                                    $repeater = new \Elementor\Repeater();
                                    if(isset($control['controls']) && !empty($control['controls'])){
                                        foreach ($control['controls'] as $rp_control){
                                            $args = $this->convert_args($rp_control);
                                            if(isset($rp_control['control_type']) && $rp_control['control_type'] == 'responsive'){
                                                $repeater->add_responsive_control($rp_control['name'], $args);
                                            }elseif(isset($rp_control['control_type']) && $rp_control['control_type'] == 'group'){
                                                $args['name'] = $rp_control['name'];
                                                if(isset($rp_control['fields_options'])) {
                                                    $args['fields_options'] = $rp_control['fields_options'];
                                                }
                                                $repeater->add_group_control($rp_control['type'],$args);
                                            }else{
                                                if(isset($rp_control['groups'])) {
                                                    $args['groups'] = $rp_control['groups'];
                                                }
                                                $repeater->add_control($rp_control['name'], $args);
                                            }
                                        }
                                    }
                                    $this->add_control($control['name'], [
                                        'label' => isset($control['label'])?$control['label']:'',
                                        'type' => isset($control['type'])?$control['type']:'',
                                        'fields' => $repeater->get_controls(),
                                        'default' => isset($control['default'])?$control['default']:[],
                                        'description' => isset($control['description'])?$control['description']:'',
                                        'condition' => isset($control['condition'])?$control['condition']:'',
                                        'conditions' => isset($control['conditions'])?$control['conditions']:'',
                                        'title_field' => isset($control['title_field'])?$control['title_field']:'',
                                    ]);
                                }
                                elseif($control['type'] == 'pxl_start_popover'){
                                    $this->start_popover();
                                }
                                elseif($control['type'] == 'pxl_end_popover'){
                                    $this->end_popover();
                                }
                                else{
                                    $args = $this->convert_args($control);
                                    if(isset($control['groups'])) {
                                        $args['groups'] = $control['groups'];
                                    }
                                    $this->add_control($control['name'], $args);
                                }
                            }
                        }
                        $this->end_controls_section();
                    }
                }
            }
        }
        
    }

    public function convert_args( $control = [] ){
        $args = [];
        $args_index = [
            'label',
            'type',
            'input_type',
            'options',
            'default',
            'description',
            'placeholder',
            'multiple',
            'rows',
            'min',
            'max',
            'step',
            'label_on',
            'label_off',
            'return_value',
//            'scheme',
            'show_external',
            'size_units',
            'range',
            'toggle',
            'raw',
            'content_classes',
            'language',
            'label_block',
            'show_label',
            'selectors',
            'selector',
            'separator',
            'condition',
            'conditions',
            'prefix_class',
            'types',
            'allowed_dimensions',
            'fa4compatibility',
            'recommended',
        ];
        foreach ($args_index as $index){
            if(isset($control[$index]) && !empty($control[$index])){
                $args[$index] = $control[$index];
            }
        }
        switch ($control['type']){
            case \Elementor\Controls_Manager::MEDIA :
                if(!isset($control['default']) ){
                    $args['default'] = [
                        'url' => \Elementor\Utils::get_placeholder_image_src(),
                    ];
                }
                break;
            case \Elementor\Controls_Manager::SWITCHER :
                $args['return_value'] = isset($control['return_value'])?$control['return_value']:'true';
                $args['default'] = isset($control['default'])?$control['default']:'';
                break;
        }

        return $args;
    }

    public function add_inline_editing_attributes( $key, $toolbar = 'basic' ) {
        parent::add_inline_editing_attributes( $key, $toolbar );
    }

    public function get_repeater_setting_key( $setting_key, $repeater_key, $repeater_item_index ) {
        return parent::get_repeater_setting_key( $setting_key, $repeater_key, $repeater_item_index );
    }

    public function parse_text_editor( $content ) {
        return parent::parse_text_editor($content);
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $settings['element_id'] = $this->get_id();
        $settings['element_name'] = $this->get_name();
        pxl_get_template($this);
    }

    public function get_setting($setting, $default = ''){
        $setting_value = parent::get_settings($setting);
        $setting_value = !empty($setting_value)?$setting_value:$default;
        return $setting_value;
    }
}