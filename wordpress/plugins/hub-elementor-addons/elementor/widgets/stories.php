<?php

namespace LiquidElementor\Widgets;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Elementor\Group_Control_Typography;
use Elementor\Plugin;
use Elementor\Repeater;
use Elementor\Widget_Base;
use Elementor\Controls_Manager;

class LD_Stories extends Widget_Base {
	public function get_name() {
		return 'ld_stories';
	}

	public function get_title() {
		return __( 'Liquid Stories', 'hub-elementor-addons' );
	}

	public function get_icon() {
		return 'eicon-instagram-post lqd-element';
	}

	public function get_categories() {
		return [ 'hub' ];
	}

	public function get_keywords() {
		return [ 'stories' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'content_section',
			[
				'label' => __( 'Content', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'highlight_clicks',
			[
				'label'        => esc_html__( 'Highlight Clicks', 'hub-elementor-addons' ),
				'placeholder'  => esc_html__( 'Reduce opacity for clicked stories.', 'hub-elementor-addons' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Show', 'hub-elementor-addons' ),
				'label_off'    => esc_html__( 'Hide', 'hub-elementor-addons' ),
				'return_value' => 'yes',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'stories_section',
			[
				'label' => __( 'Stories', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$stories = new Repeater();

		$stories->add_control(
			'title',
			[
				'label'       => esc_html__( 'Title', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::TEXT,
				'label_block' => true,
			]
		);

		$stories->add_control(
			'link',
			[
				'label'       => esc_html__( 'Link', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::URL,
				'options'     => [ 'url', 'is_external', 'nofollow' ],
				'label_block' => true,
			]
		);

		$stories->add_control(
			'image',
			[
				'label' => esc_html__( 'Image', 'hub-elementor-addons' ),
				'type'  => Controls_Manager::MEDIA,
			]
		);

		$this->add_control(
			'stories',
			[
				'label'       => esc_html__( 'Stories', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::REPEATER,
				'fields'      => $stories->get_controls(),
				'default'     => [
					[
						'title' => esc_html__( 'Title #1', 'hub-elementor-addons' ),
					],
					[
						'title' => esc_html__( 'Title #2', 'hub-elementor-addons' ),
					],
				],
				'title_field' => '{{{ title }}}',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'style_section',
			[
				'label' => __( 'Style', 'hub-elementor-addons' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'content_typography',
				'selector' => '{{WRAPPER}} .lqd-stories-item__title',
			]
		);

		$this->add_control(
			'text_color',
			[
				'label'     => esc_html__( 'Text Color', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::COLOR,
				'default'   => '#000',
				'selectors' => [
					'{{WRAPPER}} .lqd-stories-item__title' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'size',
			[
				'label'      => esc_html__( 'Size', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range'      => [
					'px' => [
						'min'  => 0,
						'max'  => 500,
						'step' => 5,
					],
				],
				'default'    => [
					'unit' => 'px',
					'size' => 90,
				],
				'selectors'  => [
					'{{WRAPPER}} .lqd-stories .carousel-item'           => 'width: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .lqd-stories .lqd-stories-item__image' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'gap',
			[
				'label'      => esc_html__( 'Gap', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range'      => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 5,
					],
				],
				'default'    => [
					'unit' => 'px',
					'size' => 50,
				],
				'selectors'  => [
					'{{WRAPPER}} .carousel-item' => 'margin-right: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .lqd-stories'   => 'gap: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		$settings         = $this->get_settings_for_display();
		$style            = 'circle';
		$stories          = $settings['stories'];
		$highlight_clicks = $settings['highlight_clicks'];

		if ( empty( $stories ) ) {
			return;
		}

		$item_classes   = [ 'lqd-stories-item', 'lqd-stories-item--' . $style ];
		$parent_classes = [ 'lqd-stories' ];
		$carousel_args  = [
			'prevNextButtons' => false,
			'buttonsAppendTo' => 'parent_el',
			'wrapAround'      => false,
			'navArrow'        => 4,
			'fullwidthSide'   => true,
		];

		if ( 'yes' === $highlight_clicks ) {
			$parent_classes[] = 'lqd-stories--highlight-clicks';
		}
		?>
		<div
			class="<?php echo esc_attr( implode( ' ', $parent_classes ) ); ?>"
			data-lqd-flickity="<?php echo esc_attr( wp_json_encode( $carousel_args ) ); ?>"
		>
			<?php
			foreach ( $stories as $story ) :
				if ( empty( $story['link']['url'] ) || empty( $story['image']['id'] ) ) {
					continue;
				}

				$this->add_link_attributes( $story['_id'], $story['link'] );
				?>
				<a
					class="<?php echo esc_attr( implode( ' ', $item_classes ) ); ?>"
					title="<?php echo esc_attr( $story['title'] ); ?>"
					data-id="<?php echo esc_attr( $story['_id'] ); ?>"
					<?php $this->print_render_attribute_string( $story['_id'] ); ?>
				>
					<div class="lqd-stories-item__image">
						<?php echo wp_get_attachment_image( $story['image']['id'], 'medium' ); ?>
					</div>
					<?php if ( ! empty( $story['title'] ) ) : ?>
						<span class="lqd-stories-item__title"><?php echo esc_html( $story['title'] ); ?></span>
					<?php endif; ?>
				</a>
			<?php endforeach; ?>
		</div>
		<?php
	}
}

Plugin::instance()->widgets_manager->register( new LD_Stories() );
