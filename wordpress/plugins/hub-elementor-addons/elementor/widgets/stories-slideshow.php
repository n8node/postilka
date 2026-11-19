<?php
namespace LiquidElementor\Widgets;

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Image_Size;
use Elementor\Group_Control_Typography;
use Elementor\Scheme_Color;
use Elementor\Scheme_Typography;
use Elementor\Utils;
use Elementor\Control_Media;
use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Group_Control_Text_Shadow;
use Elementor\Group_Control_Background;
use Elementor\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class LD_Stories_Slideshow extends Widget_Base {

	public function get_name() {
		return 'ld_stories_slideshow';
	}

	public function get_title() {
		return __( 'Liquid Stories Slideshow', 'hub-elementor-addons' );
	}

	public function get_icon() {
		return 'eicon-slideshow lqd-element';
	}

	public function get_categories() {
		return [ 'hub-core' ];
	}

	public function get_keywords() {
		return [ 'stories', 'slide', 'slider', 'slideshow', ];
	}

	protected function register_controls() {

		$this->start_controls_section(
			'general_section',
			[
				'label' => __( 'General', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$repeater = new Repeater();

		$repeater->add_control(
			'title', [
				'label' => __( 'Title', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'label_block' => true,
			]
		);

		$repeater->add_control(
			'description', [
				'label' => __( 'Description', 'hub-elementor-addons' ) . apply_filters( 'hub/elementor/widget/ai_button', 'elementor-tinymce' ),
				'type' => Controls_Manager::WYSIWYG,
				'label_block' => true,
			]
		);

        $repeater->add_control(
			'category', [
				'label' => __( 'Category', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'label_block' => true,
			]
		);

		$repeater->add_control(
			'image',
			[
				'label' => __( 'Image', 'hub-elementor-addons' ),
				'type' => Controls_Manager::MEDIA,
				'default' => [
					'url' => Utils::get_placeholder_image_src(),
				],
			]
		);

		$repeater->add_control(
			'url',
			[
				'label' => __( 'URL (Link)', 'hub-elementor-addons' ),
				'type' => Controls_Manager::URL,
				'placeholder' => __( 'https://your-link.com', 'hub-elementor-addons' ),
				'show_external' => true,
			]
		);

		$repeater->add_control(
			'btn_label', [
				'label' => __( 'Button Label', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'default' => __( 'Button' , 'hub-elementor-addons' ),
				'label_block' => true,
			]
		);

		$this->add_control(
			'items',
			[
				'label' => __( 'Slides', 'hub-elementor-addons' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'title_field' => '{{{ title }}}',
                'default' => [
                    [
                        'title' => 'Comprehensive World Insurance Solutions',
                        'category' => 'Global Coverage',
                        'description' => 'Explore our extensive range of insurance products designed to provide global protection. Ensure your assets and investments are safeguarded no matter where you are in the world.',
                        'btn_label' => 'Learn More',
                        'url' => [
                            'url' => '#'
                        ]
                    ],
                    [
                        'title' => 'Insights with SONAR 2024',
                        'category' => 'Innovative Research',
                        'description' => 'Stay ahead with our latest research report, SONAR 2024. Gain valuable insights into emerging risks and opportunities in the insurance industry to make informed decisions.',
                        'btn_label' => 'Learn More',
                        'url' => [
                            'url' => '#'
                        ]
                    ],
                    [
                        'title' => 'Adapting to New Interest Rates',
                        'category' => 'Life Insurance',
                        'description' => 'Understand the impact of the changing interest rate environment on life insurance. Discover tailored solutions that offer stability and growth for your future financial planning.',
                        'btn_label' => 'Learn More',
                        'url' => [
                            'url' => '#'
                        ]
                    ],
                ],
				'separator' => 'before'
			]
		);

        $this->add_control(
            'timeout',
            [
                'label' => __( 'Timeout', 'hub-elementor-addons' ),
                'type' => Controls_Manager::NUMBER,
                'default' => 10000,
                'min' => 0,
                'step' => 100,
            ]
        );

        $this->add_control(
            'title_html_tag',
            [
                'label' => __( 'Title HTML Tag', 'hub-elementor-addons' ),
                'type' => Controls_Manager::SELECT,
                'options' => [
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
                'default' => 'h2',
            ]
        );

		$this->end_controls_section();

		$this->start_controls_section(
			'style_section',
			[
				'label' => __( 'General', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

        $this->add_responsive_control(
            'height',
            [
                'label' => __( 'Height', 'hub-elementor-addons' ),
                'type' => Controls_Manager::SLIDER,
                'size_units' => [ 'px', 'vh', 'custom' ],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 1000,
                        'step' => 1,
                    ],
                    'vh' => [
                        'min' => 1,
                        'max' => 100,
                        'step' => 1,
                    ],
                ],
                'default' => [
                    'size' => '100',
                    'unit' => 'vh',
                ],
                'selectors' => [
                    '{{WRAPPER}} .lqd-stories-slsh' => 'min-height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'title_typography',
				'label' => __( 'Title Typography', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} .lqd-stories-slsh-title',
			]
		);

		$this->add_control(
			'title_color',
			[
				'label' => __( 'Title Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-stories-slsh-title' => 'color: {{VALUE}}',
				],
				'separator' => 'after',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'desc_typography',
				'label' => __( 'Description Typography', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} .lqd-stories-slsh-desc',
			]
		);

		$this->add_control(
			'desc_color',
			[
				'label' => __( 'Description Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-stories-slsh-desc' => 'color: {{VALUE}}',
				],
				'separator' => 'after',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'cat_typography',
				'label' => __( 'Category Typography', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} .lqd-stories-slsh-cat',
			]
		);

		$this->add_control(
			'cat_color',
			[
				'label' => __( 'Category Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-stories-slsh-cat' => 'color: {{VALUE}}',
				],
				'separator' => 'after',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'button_typography',
				'label' => __( 'Button Typography', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} .lqd-stories-slsh .btn',
			]
		);

		$this->add_control(
			'button_color',
			[
				'label' => __( 'Button Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-stories-slsh .btn' => 'color: {{VALUE}}',
				],
				'separator' => 'after',
			]
		);

		$this->add_control(
			'overlay_bg',
			[
				'label' => __( 'Overlay Background', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-stories-slsh-overlay-bg' => 'background: {{VALUE}}',
				],
			]
		);


		$this->add_responsive_control(
			'item_inner_padding',
			[
				'label' => __( 'Items padding', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-stories-slsh-content-item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'separator' => 'before',
			]
		);

        $this->add_responsive_control(
			'nav_items_heading',
			[
				'label' => __( 'Navigation', 'hub-elementor-addons' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

        $this->add_group_control(
            Group_Control_Border::get_type(),
            [
                'name' => 'nav_border',
                'label' => __( 'Navigation Container Border', 'hub-elementor-addons' ),
                'selector' => '{{WRAPPER}} .lqd-stories-slsh-nav',
            ]
        );

		$this->add_responsive_control(
			'nav_padding',
			[
				'label' => __( 'Navigation Container Padding', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-stories-slsh-nav' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
                'separator' => 'after'
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'nav_item_typography',
				'label' => __( 'Nav Items Typography', 'hub-elementor-addons' ),
				'selector' => '{{WRAPPER}} .lqd-stories-slsh-nav-item',
			]
		);

        $this->add_control(
            'nav_item_color',
            [
                'label' => __( 'Nav Item Color', 'hub-elementor-addons' ),
                'type' => Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .lqd-stories-slsh-nav-item' => 'color: {{VALUE}}',
                ],
            ]
        );

		$this->add_responsive_control(
			'nav_items_padding',
			[
				'label' => __( 'Navigation Items Padding', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-stories-slsh-nav-item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

	}

	protected function render() {

		$settings = $this->get_settings_for_display();
        $items = $settings['items'];
        $timeout = $settings['timeout'];

		?>

        <div class="lqd-stories-slsh pos-rel d-flex flex-column justify-content-end" style="--items-count: <?php echo count($items) ?>; --time: <?php echo $timeout ?>ms;" data-active-onhover="true" data-active-onhover-options='{ "triggerHandlers": [ "click" ], "triggers": ".lqd-stories-slsh-nav-item", "targets": ".lqd-stories-slsh-fig" }' data-lqd-timer="true" data-timer-options='{ "time": <?php echo $timeout ?>, "cancelIfClickedOn": ".lqd-stories-slsh-nav-item", "targets": [[".lqd-stories-slsh-content-item"],[".lqd-stories-slsh-fig"],[".lqd-stories-slsh-nav-item"]] }'>
            <div class="lqd-stories-slsh-inner" data-active-onhover="true" data-active-onhover-options='{ "triggerHandlers": [ "click" ], "triggers": ".lqd-stories-slsh-nav-item", "targets": ".lqd-stories-slsh-content-item" }'>
                <div class="lqd-stories-slsh-imgs lqd-overlay z-index-0 overflow-hidden">
                    <?php $index = 0; foreach ( $items as $item ) : ?>
                        <figure class="lqd-stories-slsh-fig lqd-overlay w-100 h-100 <?php echo($index === 0 ? 'lqd-is-active' : '') ?>">
                            <?php
                                $alt    = get_post_meta( $item['image']['id'], '_wp_attachment_image_alt', true );
                                $image  = wp_get_attachment_image( $item['image']['id'], 'full', false, array( 'class' => 'lqd-stories-slsh-img lqd-overlay objfit-cover objpos-center', 'alt' => esc_attr( $alt ) ) );

                                echo $image;
                            ?>
                        </figure>
                    <?php $index++; endforeach; ?>
                    <div class="lqd-stories-slsh-overlay-bg lqd-overlay"></div>
                </div>
                <div class="lqd-stories-slsh-content-wrap">
                    <div class="container p-0">
                        <div class="row m-0">
                            <div class="lqd-stories-slsh-content-col col-lg-5 col-md-6 col-xs-12">
                                <div class="lqd-stories-slsh-content">
                                    <?php $index = 0; foreach ( $items as $item ) : ?>
                                        <div class="lqd-stories-slsh-content-item pos-rel <?php echo($index === 0 ? 'lqd-is-active' : '') ?>">
                                            <p class="lqd-stories-slsh-cat">
                                                <?php echo $item['category']; ?>
                                            </p>
                                            <<?php echo $settings['title_html_tag'] ?> class="lqd-stories-slsh-title m-0">
                                                <?php echo $item['title']; ?>
                                            </<?php echo $settings['title_html_tag'] ?>>
                                            <p class="lqd-stories-slsh-desc m-0">
                                                <?php echo $item['description']; ?>
                                            </p>
                                            <div class="lqd-stories-slsh-btn">
                                                <a <?php echo ld_helper()->elementor_link_attr($item['url']); ?> class="btn btn-naked btn-hover-appear">
                                                    <span class="btn-txt"><?php echo $item['btn_label'] ?></span>
                                                    <span class="btn-icon">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="height: 1em;"><path fill="currentColor" d="M17.806 25.788l8.631-8.375c.375-.363.563-.857.563-1.4v-.025c0-.544-.188-1.038-.563-1.4l-8.63-8.375c-.75-.782-1.957-.782-2.7 0s-.745 2.043 0 2.825L20.293 14H6.919C5.856 14 5 14.894 5 16c0 1.125.856 2 1.912 2h13.375L15.1 22.963a2.067 2.067 0 0 0 0 2.824c.75.782 1.956.782 2.706 0z"></path></svg>
                                                    </span>
                                                </a>
                                            </div>
                                            <a <?php echo ld_helper()->elementor_link_attr($item['url']); ?> class="lqd-overlay"></a>
                                        </div>
                                    <?php $index++; endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="lqd-stories-slsh-nav pos-rel z-index-1">
                    <div class="container">
                        <div class="lqd-stories-slsh-nav-items d-flex flex-wrap">
                            <?php $index = 0; foreach ($settings['items'] as $item) : ?>
                                <button type="button" class="lqd-stories-slsh-nav-item pos-rel">
                                    <span class="lqd-stories-slsh-nav-item-progress pos-abs pos-tl w-100"></span>
                                    <span class="lqd-stories-slsh-nav-cat d-block">
                                        <?php echo $item['category']; ?>
                                    </span>
                                    <span class="lqd-stories-slsh-nav-title d-block font-weight-bold w-100 overflow-hidden ws-nowrap">
                                        <?php echo $item['title']; ?>
                                    </span>
                                </button>
                            <?php $index ++; endforeach; ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>

		<?php

	}

}
\Elementor\Plugin::instance()->widgets_manager->register( new LD_Stories_Slideshow() );