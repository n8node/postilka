<?php
$menus = wp_get_nav_menus();
$pxl_menus = array(
    '' => esc_html__('Default', 'brighthub')
);
if ( is_array( $menus ) && ! empty( $menus ) ) {
    foreach ( $menus as $menu ) {
        if ( is_object( $menu ) && isset( $menu->name ) ) {
            $pxl_menus[ $menu->term_id ] = $menu->name;
        }
    }
}
pxl_add_custom_widget(
    array(
        'name' => 'pxl_menu',
        'title' => esc_html__('Case Nav Menu', 'brighthub'),
        'icon' => 'eicon-nav-menu',
        'categories' => array('pxltheme-core'),
        'scripts' => array('pxl-modernizr'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'menu',
                            'label' => esc_html__('Select Menu', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => $pxl_menus,
                        ),
                        array(
                            'name' => 'menu_type',
                            'label' => esc_html__('Menu Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'horizontal' => 'Horizontal',
                                'vertical' => 'Vertical',
                            ],
                            'default' => 'horizontal',
                        ),
                        array(
                            'name' => 'align',
                            'label' => esc_html__('Alignment', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'options' => [
                                'left' => [
                                    'title' => esc_html__('Left', 'brighthub' ),
                                    'icon' => 'fa fa-align-left',
                                ],
                                'center' => [
                                    'title' => esc_html__('Center', 'brighthub' ),
                                    'icon' => 'fa fa-align-center',
                                ],
                                'right' => [
                                    'title' => esc_html__('Right', 'brighthub' ),
                                    'icon' => 'fa fa-align-right',
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary' => 'text-align: {{VALUE}};',
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary > li' => 'float: none;',
                            ],
                            'condition' => [
                                'menu_type' => 'horizontal',
                            ],
                        ),
                        array(
                            'name' => 'text_align',
                            'label' => esc_html__('Text Alignment', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'options' => [
                                'left' => [
                                    'title' => esc_html__('Left', 'brighthub' ),
                                    'icon' => 'fa fa-align-left',
                                ],
                                'center' => [
                                    'title' => esc_html__('Center', 'brighthub' ),
                                    'icon' => 'fa fa-align-center',
                                ],
                                'right' => [
                                    'title' => esc_html__('Right', 'brighthub' ),
                                    'icon' => 'fa fa-align-right',
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu.pxl-nav-vertical' => 'text-align: {{VALUE}};',
                            ],
                            'condition' => [
                                'menu_type' => 'vertical',
                            ],
                        ),
                        array(
                            'name' => 'max_height',
                            'label' => esc_html__('Max Height', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px','%', 'vh' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 1000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu.pxl-nav-vertical' => 'max-height: {{SIZE}}{{UNIT}};overflow-y: auto; scrollbar-width: none;',
                            ],
                            'condition' => [
                                'menu_type' => 'vertical',
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_first_level',
                    'label' => esc_html__('First Level', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'hover_active_style',
                            'label' => esc_html__('Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'default' => 'Default',
                                'hover-highlight' => 'Hover High Light',
                                'divider-move' => 'Divider Move',
                            ],
                            'default' => 'default',
                            'condition' => [
                                'menu_type' => 'horizontal',
                            ],
                        ),
                        array(
                            'name' => 'divider_style',
                            'label' => esc_html__('Divider Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-1' => 'Style 1',
                                'style-2' => 'Style 2',
                                'style-3' => 'Style 3',
                                'style-4' => 'Style 4',
                            ],
                            'default' => 'style-1',
                            'condition' => [
                                'hover_active_style' => 'divider-move',
                            ],
                        ),
                        array(
                            'name' => 'color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary > li > a' => 'color: {{VALUE}};',
                            ],
                            'condition' => ['hover_active_style!' => ['hover-highlight', 'divider-move']]
                        ),
                        array(
                            'name' => 'color_hover',
                            'label' => esc_html__('Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary > li:hover > a' => 'color: {{VALUE}};',
                            ],
                            'condition' => ['hover_active_style!' => ['hover-highlight', 'divider-move']]
                        ),
                        
                        array(
                            'name' => 'arrow_color',
                            'label' => esc_html__('Arrow Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary > li > a .caseicon-angle-arrow-down' => 'color: {{VALUE}};',
                            ],
                            'condition' => [
                                'menu_type' => 'horizontal',
                            ],
                            'condition' => ['hover_active_style!' => ['hover-highlight', 'divider-move']]
                        ),
                        array(
                            'name' => 'color_hl_nor',
                            'label' => esc_html__('Color Normal', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary>li>a' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary>li>a>i' => 'color: {{VALUE}};',
                            ],
                            'condition' => ['hover_active_style' => ['hover-highlight', 'divider-move']],
                        ),
                        array(
                            'name' => 'color_hover_hl_item',
                            'label' => esc_html__('Color Hover', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary:hover>li>a' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary:hover>li>a>i' => 'color: {{VALUE}};',
                            ],
                            'condition' => ['hover_active_style' => ['hover-highlight', 'divider-move']]
                        ),
                        array(
                            'name' => 'color_hl_active',
                            'label' => esc_html__('Color Hover item', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary>li:hover>a' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary>li:hover>a>i' => 'color: {{VALUE}};',
                            ],
                            'condition' => ['hover_active_style' => ['hover-highlight', 'divider-move']],
                        ),
                        array(
                            'name' => 'arrow_color_hl',
                            'label' => esc_html__('Arrow Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary>li>a>i' => 'color: {{VALUE}};',
                            ],
                            'condition' => ['hover_active_style' => ['hover-highlight', 'divider-move']],
                        ),
                        array(
                            'name' => 'color_active',
                            'label' => esc_html__('Color Active', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-onepage-active' => 'color: {{VALUE}} !important;',
                            ],
                        ),
                        array(
                            'name' => 'typography',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-menu .pxl-menu__primary > li > a',
                        ),
                        array(
                            'name' => 'arrow_children_font_size',
                            'label' => esc_html__('Arrow Has Children - Font Size', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary > li.menu-item-has-children > a .caseicon-angle-arrow-down' => 'font-size: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'menu_type' => 'horizontal',
                            ],
                        ),
                        array(
                            'name' => 'item_space',
                            'label' => esc_html__('Item Spacer', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px', 'em', '%', 'rem' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary > li' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}; margin: 0;',
                            ],
                            'condition' => [
                                'menu_type' => 'horizontal',
                            ],
                            'control_type' => 'responsive',
                        ),
                        array(
                            'name' => 'item_space_vertical',
                            'label' => esc_html__('Item Spacer', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary > li + li' => 'margin-top: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'menu_type' => 'vertical',
                            ],
                            'control_type' => 'responsive',
                        ),
                        array(
                            'name' => 'flex_grow',
                            'label' => esc_html__('Flex Grow', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'options' => [
                                'inherit' => [
                                    'title' => esc_html__( 'Inherit', 'brighthub' ),
                                    'icon' => 'fas fa-arrows-alt-v',
                                ],
                                '1' => [
                                    'title' => esc_html__( 'Full', 'brighthub' ),
                                    'icon' => 'fas fa-arrows-alt-h',
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}}' => 'flex-grow: {{VALUE}};',
                            ],
                            'condition' => [
                                'menu_type' => 'horizontal',
                            ],
                        ),
                        array(
                            'name' => 'menu_mega_type',
                            'label' => esc_html__('Menu Mega Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'pxl-menu__mega-full' => 'Full Width',
                                'pxl-menu__mega-boxed' => 'Boxed',
                            ],
                            'default' => 'pxl-menu__mega-full',
                        ),
                        array(
                            'name' => 'menu_mega_max_width',
                            'label' => esc_html__('Menu Mega Max Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu.pxl-menu__mega-boxed .pxl-megamenu > .sub-menu' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'menu_mega_type' => 'pxl-menu__mega-boxed',
                            ],
                        ),
                        array(
                            'name' => 'mg_border_radius',
                            'label' => esc_html__('Menu Mega Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu__primary .pxl-mega-menu' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'mega_space_left',
                            'label' => esc_html__('Mega Menu Spacer Left', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu.pxl-mega-full-width .sub-menu.pxl-mega-menu' => 'margin-left: {{SIZE}}{{UNIT}};max-width: inherit;',
                            ],
                            'condition' => [
                                'menu_mega_type' => 'pxl-mega-full-width',
                            ],
                            'control_type' => 'responsive',
                        ),
                        array(
                            'name' => 'mega_space_right',
                            'label' => esc_html__('Mega Menu Spacer Right', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu.pxl-mega-full-width .sub-menu.pxl-mega-menu' => 'margin-right: {{SIZE}}{{UNIT}};max-width: inherit;',
                            ],
                            'condition' => [
                                'menu_mega_type' => 'pxl-mega-full-width',
                            ],
                            'control_type' => 'responsive',
                        ),
                        array(
                            'name' => 'container_max_width',
                            'label' => esc_html__('Mega Menu Container Max Width', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu.pxl-mega-boxed .pxl-megamenu > .sub-menu' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                            'condition' => [
                                'menu_mega_type' => 'pxl-mega-boxed',
                            ],
                            'control_type' => 'responsive',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_sub_level',
                    'label' => esc_html__('Sub Level', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'sub_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu li.pxl-megamenu, {{WRAPPER}} .pxl-menu .pxl-menu__primary li .sub-menu li > a' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'sub_color_hover',
                            'label' => esc_html__('Color Hover/Actvie', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary li .sub-menu li:hover > a, {{WRAPPER}} .pxl-menu .pxl-menu__primary li .sub-menu li.current_page_item > a, {{WRAPPER}} .pxl-menu .pxl-menu__primary li .sub-menu li.current-menu-item > a, {{WRAPPER}} .pxl-menu .pxl-menu__primary li .sub-menu li.current_page_ancestor > a, {{WRAPPER}} .pxl-menu .pxl-menu__primary li .sub-menu li.current-menu-ancestor > a' => 'color: {{VALUE}};',
                                '{{WRAPPER}} .pxl-menu.pxl-menu__sub-default .sub-menu > li .pxl-menu-item-text::before' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'sub_bg_color',
                            'label' => esc_html__('Box Background Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu__primary .sub-menu, {{WRAPPER}} .pxl-menu__primary .children' => 'background-color: {{VALUE}};',
                            ],
                            'condition' => [
                                'menu_type' => 'horizontal',
                            ],
                        ),
                        array(
                            'name' => 'sub_typography',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-menu .pxl-menu__primary li .sub-menu a, {{WRAPPER}} .pxl-heading .pxl-item--title',
                        ),
                        array(
                            'name' => 'sub_item_space',
                            'label' => esc_html__('Item Spacer', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu__primary .sub-menu li + li' => 'margin-top: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'sub_show_effect',
                            'label' => esc_html__('Show Effect', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'pxl-menu__effect-fade' => 'Fade',
                                'pxl-menu__effect-slideup' => 'Slide Up',
                                'pxl-menu__effect-dropdown' => 'Dropdown',
                                'pxl-menu__effect-slidedown' => 'Slide Down 3D',
                            ],
                            'default' => 'pxl-menu__effect-slideup',
                            'condition' => [
                                'menu_type' => 'horizontal',
                            ],
                        ),
                        array(
                            'name' => 'sub_hover_space_top',
                            'label' => esc_html__('Box Spacer Top', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary .sub-menu' => 'margin-top: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'sub_hover_space_top_mega',
                            'label' => esc_html__('Box Spacer Top - Mega', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu .pxl-menu__primary .sub-menu.pxl-mega-menu' => 'margin-top: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'sub_border_radius',
                            'label' => esc_html__('Border Radius', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-menu__primary .sub-menu, {{WRAPPER}} .pxl-menu__primary .children' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                    ),
                ),
                brighthub_widget_animation_settings(),
            ),
        ),
    ),
    brighthub_get_class_widget_path()
);