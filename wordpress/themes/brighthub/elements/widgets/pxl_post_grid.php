<?php
$pt_supports = ['post', 'career', 'template', 'b2b'];
pxl_add_custom_widget(
    array(
        'name' => 'pxl_post_grid',
        'title' => esc_html__('Case Post Grid', 'brighthub' ),
        'icon' => 'eicon-posts-grid case-widget',
        'categories' => array('pxltheme-core'),
        'scripts' => [
            'imagesloaded',
            'isotope',
            'pxl-post-grid',
        ],
        'params' => array(
            'sections' => array(
                array(
                    'name'     => 'tab_layout',
                    'label'    => esc_html__( 'Layout', 'brighthub' ),
                    'tab'      => 'layout',
                    'controls' => array_merge(
                        array(
                            array(
                                'name'     => 'post_type',
                                'label'    => esc_html__( 'Select Post Type', 'brighthub' ),
                                'type'     => 'select',
                                'multiple' => true,
                                'options'  => brighthub_get_post_type_options($pt_supports),
                                'default'  => 'post'
                            ) 
                        ),
                        brighthub_get_post_grid_layout($pt_supports)
                    ),
                ),
                 
                array(
                    'name' => 'tab_source',
                    'label' => esc_html__('Source', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_SETTINGS,
                    'controls' => array_merge(
                        array(
                            array(
                                'name'     => 'select_post_by',
                                'label'    => esc_html__( 'Select posts by', 'brighthub' ),
                                'type'     => 'select',
                                'multiple' => true,
                                'options'  => [
                                    'term_selected' => esc_html__( 'Terms selected', 'brighthub' ),
                                    'post_selected' => esc_html__( 'Posts selected ', 'brighthub' ),
                                ],
                                'default'  => 'term_selected'
                            ) 
                        ),
                        brighthub_get_grid_term_by_post_type($pt_supports, ['custom_condition' => ['select_post_by' => 'term_selected']]),
                        brighthub_get_grid_ids_by_post_type($pt_supports, ['custom_condition' => ['select_post_by' => 'post_selected']]),
                        array(
                            array(
                                'name' => 'orderby',
                                'label' => esc_html__('Order By', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'default' => 'date',
                                'options' => [
                                    'date' => esc_html__('Date', 'brighthub' ),
                                    'ID' => esc_html__('ID', 'brighthub' ),
                                    'author' => esc_html__('Author', 'brighthub' ),
                                    'title' => esc_html__('Title', 'brighthub' ),
                                    'rand' => esc_html__('Random', 'brighthub' ),
                                ],
                            ),
                            array(
                                'name' => 'order',
                                'label' => esc_html__('Sort Order', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'default' => 'desc',
                                'options' => [
                                    'desc' => esc_html__('Descending', 'brighthub' ),
                                    'asc' => esc_html__('Ascending', 'brighthub' ),
                                ],
                            ),
                            array(
                                'name' => 'limit',
                                'label' => esc_html__('Total items', 'brighthub' ),
                                'type' => \Elementor\Controls_Manager::NUMBER,
                                'default' => '6',
                            ),
                        )
                    ),
                ),
                array(
                    'name' => 'tab_grid',
                    'label' => esc_html__('Grid', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_SETTINGS,
                    'controls' => array(
                        array(
                            'name' => 'img_size',
                            'label' => esc_html__('Image Size', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'description' => 'Enter image size (Example: "thumbnail", "medium", "large", "full" or other sizes defined by theme). Alternatively enter size in pixels (Default: 370x300 (Width x Height)).',
                            
                        ),
                        array(
                            'name' => 'pxl_animate',
                            'label' => esc_html__('Case Animate', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => brighthub_widget_animate(),
                            'default' => '',
                        ),
                        array(
                            'name' => 'filter',
                            'label' => esc_html__('Filter on Masonry', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'false',
                            'options' => [
                                'true' => esc_html__('Enable', 'brighthub' ),
                                'false' => esc_html__('Disable', 'brighthub' ),
                            ],
                            'condition' => [
                                'select_post_by' => 'term_selected',
                            ],
                        ),
                       
                        array(
                            'name'    => 'filter_style',
                            'label'   => esc_html__('Filter Style', 'brighthub' ),
                            'type'    => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-1'  => esc_html__('Style 1', 'brighthub' ),
                                'style-2' => esc_html__('Style 2', 'brighthub' ),
                                'style-3' => esc_html__('Style 3', 'brighthub' ),
                            ],
                            'default' => 'style-1',
                            'condition' => [
                                'select_post_by' => 'term_selected',
                                'filter' => 'true',
                            ],
                        ),
                        array(
                            'name' => 'filter_default_title',
                            'label' => esc_html__('Filter Default Title', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => esc_html__('View All', 'brighthub' ),
                            'condition' => [
                                'filter' => 'true',
                                'select_post_by' => 'term_selected',
                            ],
                        ),
                        array(
                            'name' => 'pagination_type',
                            'label' => esc_html__('Pagination Type', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'false',
                            'separator' => 'before',
                            'options' => [
                                'pagination' => esc_html__('Pagination', 'brighthub' ),
                                'loadmore' => esc_html__('Loadmore', 'brighthub' ),
                                'false' => esc_html__('Disable', 'brighthub' ),
                            ],
                        ),
                        array(
                            'name' => 'loadmore_style',
                            'label' => esc_html__('Loadmore Style', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'style-1',
                            'options' => [
                                'style-1' => esc_html__('Style 1', 'brighthub' ),
                                'style-2' => esc_html__('Style 2', 'brighthub' ),
                            ],
                            'condition' => ['pagination_type' => 'loadmore']
                        ),
                        array(
                            'name' => 'loadmore_txt',
                            'label' => esc_html__('Loadmore Text', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Load More',
                            'condition' => ['pagination_type' => 'loadmore']
                        ),
                        array(
                            'name' => 'loading_txt',
                            'label' => esc_html__('Loading Text', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Loading',
                            'condition' => ['pagination_type' => 'loadmore']
                        ),

                        array(
                            'name' => 'show_button_2',
                            'label' => esc_html__('Button 2', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                            'condition' => ['pagination_type' => 'loadmore']
                        ),

                        array(
                            'name' => 'btn_2_txt',
                            'label' => esc_html__('Button 2 Text', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Load More',
                            'condition' => ['show_button_2' => 'true']
                        ),
                        array(
                            'name' => 'btn_2_url',
                            'label' => esc_html__('Button 2 Link', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::URL,
                            'condition' => ['show_button_2' => 'true']
                        ),
                        
                        array(
                            'name' => 'col_xs',
                            'label' => esc_html__('Columns: Screen <= 575', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '1',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_sm',
                            'label' => esc_html__('Columns: Screen <= 767', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '2',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_md',
                            'label' => esc_html__('Columns: Screen <= 991', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '2',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_lg',
                            'label' => esc_html__('Columns: Screen <= 1199', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_xl',
                            'label' => esc_html__('Columns: Screen => 1200', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'item_spacer',
                            'label' => esc_html__('Item Spacer', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'description' => 'Default: 15',
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 1000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-grid .pxl-grid__item' => 'padding:{{SIZE}}px;',
                                '{{WRAPPER}} .pxl-grid .pxl-post--inner' => 'margin-bottom:0px;',
                                '{{WRAPPER}} .pxl-grid .pxl-grid__masonry' => 'margin-left: -{{SIZE}}px;margin-right: -{{SIZE}}px;',
                            ],
                        ),
                        array(
                            'name' => 'grid_masonry',
                            'label' => esc_html__('Grid Masonry', 'brighthub'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'col_xs_m',
                                    'label' => esc_html__('Columns: Screen <= 575', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'default' => '1',
                                    'options' => [
                                        '1' => '1',
                                        '2' => '2',
                                        '3' => '3',
                                        '4' => '4',
                                        '6' => '6',
                                    ],
                                ),
                                array(
                                    'name' => 'col_sm_m',
                                    'label' => esc_html__('Columns: Screen <= 767', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'default' => '2',
                                    'options' => [
                                        '1' => '1',
                                        '2' => '2',
                                        '3' => '3',
                                        '4' => '4',
                                        '6' => '6',
                                    ],
                                ),
                                array(
                                    'name' => 'col_md_m',
                                    'label' => esc_html__('Columns: Screen <= 991', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'default' => '2',
                                    'options' => [
                                        '1' => '1',
                                        '2' => '2',
                                        '3' => '3',
                                        '4' => '4',
                                        '6' => '6',
                                    ],
                                ),
                                array(
                                    'name' => 'col_lg_m',
                                    'label' => esc_html__('Columns: Screen <= 1199', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'default' => '3',
                                    'options' => [
                                        '1' => '1',
                                        '2' => '2',
                                        '3' => '3',
                                        '4' => '4',
                                        '6' => '6',
                                        'col-66' => 'Column 66%',
                                    ],
                                ),
                                array(
                                    'name' => 'col_xl_m',
                                    'label' => esc_html__('Columns: Screen => 1200', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'default' => '3',
                                    'options' => [
                                        '1' => '1',
                                        '2' => '2',
                                        '3' => '3',
                                        '4' => '4',
                                        '6' => '6',
                                        'col-66' => 'Column 66%',
                                    ],
                                ),
                                array(
                                    'name' => 'img_size_m',
                                    'label' => esc_html__('Image Size', 'brighthub' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'description' => 'Enter image size (Example: "thumbnail", "medium", "large", "full" or other sizes defined by theme). Alternatively enter size in pixels (Default: 370x300 (Width x Height)).',
                                ),
                            ),
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_display',
                    'label' => esc_html__('Display', 'brighthub' ),
                    'tab' => \Elementor\Controls_Manager::TAB_SETTINGS,
                    'controls' => array(
                        array(
                            'name' => 'title_tag',
                            'label' => esc_html__('Title HTML Tag', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'df' => 'Default',
                                'h1' => 'H1',
                                'h2' => 'H2',
                                'h3' => 'H3',
                                'h4' => 'H4',
                                'h5' => 'H5',
                                'h6' => 'H6',
                                'div' => 'div',
                                'span' => 'span',
                                'p' => 'p',
                            ],
                            'default' => 'df',
                        ),
                        array(
                            'name' => 'show_date',
                            'label' => esc_html__('Show Date', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'post'],
                                            ['name' => 'layout_post', 'operator' => 'in', 'value' => ['post-1' ,'post-3']]
                                        ]
                                    ]
                                ],
                            ]
                        ),  
                        array(
                            'name' => 'show_author',
                            'label' => esc_html__('Show Author', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'post'],
                                            ['name' => 'layout_post', 'operator' => 'in', 'value' => ['post-2']]
                                        ]
                                    ]
                                ],
                            ]
                        ),  
                        array(
                            'name' => 'show_category',
                            'label' => esc_html__('Show Category', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'post'],
                                            ['name' => 'layout_post', 'operator' => 'in', 'value' => ['post-2']]
                                        ],
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'b2b'],
                                            ['name' => 'layout_b2b', 'operator' => 'in', 'value' => ['b2b-1']]
                                        ]
                                    ]
                                ],
                            ]
                        ),
                        array(
                            'name' => 'show_location',
                            'label' => esc_html__('Show Location', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'career'],
                                            ['name' => 'layout_career', 'operator' => 'in', 'value' => ['career-1']]
                                        ]
                                    ]
                                ],
                            ]
                        ),
                        array(
                            'name' => 'show_type',
                            'label' => esc_html__('Show Type Work', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'career'],
                                            ['name' => 'layout_career', 'operator' => 'in', 'value' => ['career-1']]
                                        ]
                                    ]
                                ],
                            ]
                        ),
                        array(
                            'name' => 'show_slot',
                            'label' => esc_html__('Show Slot Work', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'career'],
                                            ['name' => 'layout_career', 'operator' => 'in', 'value' => ['career-1']]
                                        ]
                                    ]
                                ],
                            ]
                        ), 
                        array(
                            'name' => 'show_price',
                            'label' => esc_html__('Show Price', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'b2b'],
                                            ['name' => 'layout_b2b', 'operator' => 'in', 'value' => ['b2b-1']]
                                        ]
                                    ]
                                ],
                            ]
                        ),
                        array(
                            'name' => 'show_badge',
                            'label' => esc_html__('Show Badge', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'b2b'],
                                            ['name' => 'layout_b2b', 'operator' => 'in', 'value' => ['b2b-1']]
                                        ]
                                    ]
                                ],
                            ]
                        ),
                        array(
                            'name' => 'show_button',
                            'label' => esc_html__('Show Button Readmore', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'career'],
                                            ['name' => 'layout_career', 'operator' => 'in', 'value' => ['career-1']],
                                        ],
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'template'],
                                            ['name' => 'layout_template', 'operator' => 'in', 'value' => ['template-1']],
                                        ],
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'post'],
                                            ['name' => 'layout_post', 'operator' => 'in', 'value' => ['post-2' ,'post-3']],
                                        ],
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'b2b'],
                                            ['name' => 'layout_b2b', 'operator' => 'in', 'value' => ['b2b-1']],
                                        ]
                                    ],
                                ],
                            ]
                        ),
                        array(
                            'name' => 'button_text',
                            'label' => esc_html__('Button Text', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'career'],
                                            ['name' => 'layout_career', 'operator' => 'in', 'value' => ['career-1']],
                                            ['name' => 'show_button', 'operator' => '==', 'value' => 'true']
                                        ],
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'template'],
                                            ['name' => 'layout_template', 'operator' => 'in', 'value' => ['template-1']],
                                            ['name' => 'show_button', 'operator' => '==', 'value' => 'true']
                                        ],
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'post'],
                                            ['name' => 'layout_post', 'operator' => 'in', 'value' => ['post-2' ,'post-3']],
                                            ['name' => 'show_button', 'operator' => '==', 'value' => 'true']
                                        ]
                                    ],
                                ],
                            ]
                        ),
                        
                        array(
                            'name' => 'show_excerpt',
                            'label' => esc_html__('Show Excerpt', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'career'],
                                            ['name' => 'layout_career', 'operator' => 'in', 'value' => ['career-1']],
                                        ],
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'post'],
                                            ['name' => 'layout_post', 'operator' => 'in', 'value' => ['post-2' ,'post-3']],
                                        ],
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'b2b'],
                                            ['name' => 'layout_b2b', 'operator' => 'in', 'value' => ['b2b-1']],
                                        ]
                                    ],
                                ],
                            ]
                        ),
                        array(
                            'name' => 'num_words',
                            'label' => esc_html__('Number of Words', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => 25,
                            'separator' => 'after',
                            'conditions' => [
                                'relation' => 'or',
                                'terms' => [
                                    [
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'career'],
                                            ['name' => 'layout_career', 'operator' => 'in', 'value' => ['career-1']],
                                            ['name' => 'show_excerpt', 'operator' => '==', 'value' => 'true']
                                        ],
                                        'terms' => [
                                            ['name' => 'post_type', 'operator' => '==', 'value' => 'post'],
                                            ['name' => 'layout_post', 'operator' => 'in', 'value' => ['post-2' ,'post-3']],
                                            ['name' => 'show_excerpt', 'operator' => '==', 'value' => 'true']
                                        ]
                                    ],
                                ],
                            ]
                        ),
                    ),
                ),
                
                array(
                    'name' => 'section_style_title',
                    'label' => esc_html__('Title', 'brighthub'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Color', 'brighthub' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-grid .pxl-post--title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Typography', 'brighthub' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-grid .pxl-post--title',
                        ),
                    ),
                ),

            ),
        ),
    ),
    brighthub_get_class_widget_path()
);