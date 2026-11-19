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

class LD_Stacked_Sections extends Widget_Base {

	public function get_name() {
		return 'ld_stacked_sections';
	}

	public function get_title() {
		return __( 'Liquid Stacked Sections', 'hub-elementor-addons' );
	}

	public function get_icon() {
		return 'eicon-slider-vertical lqd-element';
	}

	public function get_categories() {
		return [ 'hub-core' ];
	}

	public function get_keywords() {
		return [ 'gallery', 'stacked' ];
	}

	public function get_script_depends() {
		if ( liquid_helper()->liquid_elementor_script_depends() ){
			return [ 'gsap', 'scrollTrigger' ];
		} else {
			return [''];
		}
	}

	protected function register_controls() {

		// General Section
		$this->start_controls_section(
			'general_section',
			[
				'label' => __( 'General', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

        $repeater = new Repeater();

		$repeater->add_control(
			'content_template',
			[
				'label' => __( 'Select Content', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '0',
				'options' => liquid_helper()->get_elementor_templates(),
				'description' => liquid_helper()->get_elementor_templates_edit(),
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

        $this->add_control(
			'items',
			[
				'label' => __( 'Items', 'hub-elementor-addons' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					// [
					// 	'item_title' => __( 'Title #1', 'hub-elementor-addons' ),
					// 	'item_content' => __( 'Item 1 content. Click the edit button to change this text.', 'hub-elementor-addons' ),
					// ],
				]
			]
		);

        $this->end_controls_section();

        $this->start_controls_section(
			'contents_style_section',
			[
				'label' => __( 'Contents', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

        $this->add_responsive_control(
			'contents_width',
			[
				'label' => esc_html__( 'Contents Width', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%', 'px', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-stacked-sections-content' => 'width: {{SIZE}}{{UNIT}};',
				],
			]
		);

        $this->add_responsive_control(
            'contents_padding',
            [
                'label' => esc_html__( 'Contents Padding', 'hub-elementor-addons' ),
                'type' => Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
                'selectors' => [
                    '{{WRAPPER}} .lqd-stacked-sections-content' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

		$this->end_controls_section();

        $this->start_controls_section(
			'images_style_section',
			[
				'label' => __( 'Images', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

        $this->add_responsive_control(
			'images_width',
			[
				'label' => esc_html__( 'Images Width', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%', 'px', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-stacked-sections-image' => 'width: {{SIZE}}{{UNIT}};',
				],
                'separator' => 'before'
			]
		);

        $this->add_responsive_control(
            'images_margin',
            [
                'label' => esc_html__( 'Images Margin', 'hub-elementor-addons' ),
                'type' => Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
                'selectors' => [
                    '{{WRAPPER}} .lqd-stacked-sections-image-wrap' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'image_border_radius',
            [
                'label' => esc_html__( 'Image Border Radius', 'hub-elementor-addons' ),
                'type' => Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
                'selectors' => [
                    '{{WRAPPER}} .lqd-stacked-sections-image' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

		$this->end_controls_section();

        $this->start_controls_section(
			'nav_style_section',
			[
				'label' => __( 'Nav', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

        $this->add_responsive_control(
            'nav_margin',
            [
                'label' => esc_html__( 'Nav Margin', 'hub-elementor-addons' ),
                'type' => Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
                'selectors' => [
                    '{{WRAPPER}} .lqd-stacked-sections' => '--nav-mt: {{TOP}}{{UNIT}}; --nav-me: {{RIGHT}}{{UNIT}}; --nav-mb: {{BOTTOM}}{{UNIT}}; --nav-ms: {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_group_control(
            Group_Control_Background::get_type(),
            [
                'name' => 'nav_button_background',
                'label' => __( 'Button Background', 'hub-elementor-addons' ),
                'types' => [ 'classic', 'gradient' ],
                'selector' => '{{WRAPPER}} .lqd-stacked-sections-nav-button',
                'fields_options' => [
                    'background' => [
                        'label' => __( 'Button Background', 'hub-elementor-addons' ),
                    ]
                ]
            ]
        );

        $this->add_group_control(
            Group_Control_Background::get_type(),
            [
                'name' => 'nav_button_progress_background',
                'label' => __( 'Progress Background', 'hub-elementor-addons' ),
                'types' => [ 'classic', 'gradient' ],
                'selector' => '{{WRAPPER}} .lqd-stacked-sections-nav-button-progress',
                'fields_options' => [
                    'background' => [
                        'label' => __( 'Progress Background', 'hub-elementor-addons' ),
                    ]
                ]
            ]
        );

		$this->end_controls_section();

	}

	protected function render() {
		$settings = $this->get_settings_for_display();
        $items = $settings['items'];
        $items_count = count($items);

		?>

        <div
            class="lqd-stacked-sections"
            data-lqd-stacked-sections="true"
            data-items-count="<?php echo esc_attr($items_count); ?>"
            style="--items-count: <?php echo esc_attr($items_count); ?>;"
        >
            <div
                class="lqd-stacked-sections-inner"
            >
                <div class="lqd-stacked-sections-nav">
                    <?php for ( $i = 0; $i < $items_count; $i++ ) : ?>
                        <button class="lqd-stacked-sections-nav-button" data-index="<?php echo esc_attr($i) ?>">
                            <span class="lqd-stacked-sections-nav-button-progress"></span>
                        </button>
                    <?php endfor; ?>
                </div>
                <?php foreach ( $items as $index => $item ) : ?>
                    <div class="lqd-stacked-sections-item" data-stacked-sections-item-index="<?php echo esc_attr($index) ?>" style="--index: <?php echo esc_attr($index); ?>;">
                        <div class="lqd-stacked-sections-content">
                            <?php
                            if ( ! empty( $item['content_template'] ) && $item['content_template'] !== '0' ) {
                                echo \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $item['content_template'] );
                            }
                            ?>
                        </div>

                        <div class="lqd-stacked-sections-image-wrap">
                            <div class="lqd-stacked-sections-image">
                                <figure class="lqd-stacked-sections-fig">
                                    <?php echo wp_get_attachment_image( $item['image']['id'], 'full' ); ?>
                                </figure>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
                <div class="lqd-stacked-sections-last-item-placeholder"></div>
            </div>
        </div>

		<?php
	}
}
\Elementor\Plugin::instance()->widgets_manager->register( new LD_Stacked_Sections() );