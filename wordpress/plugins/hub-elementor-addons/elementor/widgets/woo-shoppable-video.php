<?php

namespace LiquidElementor\Widgets;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Elementor\Group_Control_Border;
use Elementor\Plugin;
use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use WP_Query;

class LD_Woo_Shoppable_Video extends Widget_Base {
	public function get_name() {
		return 'ld_woo_shoppable_video';
	}

	public function get_title() {
		return __( 'Liquid Shoppable Video', 'hub-elementor-addons' );
	}

	public function get_icon() {
		return 'eicon-product-meta lqd-element';
	}

	public function get_categories() {
		return [ 'hub-woo' ];
	}

	public function get_keywords() {
		return [ 'woocommerce', 'video', 'product' ];
	}

	public function get_script_depends() {
		return [ 'jquery-ytplayer' ];
	}

	public function get_style_depends() {
		return [ 'jquery-ytplayer' ];
	}

	private function get_available_product() {
		$posts = get_posts( array(
			'post_type'      => 'product',
			'posts_per_page' => - 1,
		) );

		$options = [];

		foreach ( $posts as $post ) {
			$options[ $post->ID ] = $post->post_title;
		}

		return $options;
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
			'bg_type',
			[
				'label'   => esc_html__( 'Background Type', 'hub-elementor-addons' ),
				'type'    => Controls_Manager::CHOOSE,
				'options' => [
					'image'   => [
						'title' => esc_html__( 'Image', 'hub-elementor-addons' ),
						'icon'  => 'eicon-image',
					],
					'video'   => [
						'title' => esc_html__( 'Video', 'hub-elementor-addons' ),
						'icon'  => 'eicon-video',
					],
					'youtube' => [
						'title' => esc_html__( 'YouTube', 'hub-elementor-addons' ),
						'icon'  => 'eicon-youtube',
					],
				],
				'default' => 'video',
			]
		);

		$this->add_control(
			'video_url',
			[
				'label'     => esc_html__( 'Video URL', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::TEXT,
				'condition' => array( 'bg_type' => 'video' ),
			]
		);

		$this->add_control(
			'youtube_url',
			[
				'label'     => esc_html__( 'YouTube URL', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::TEXT,
				'condition' => array( 'bg_type' => 'youtube' ),
			]
		);

		$this->add_control(
			'image',
			[
				'label'     => esc_html__( 'Image', 'hub-elementor-addons' ),
				'type'      => Controls_Manager::MEDIA,
				'condition' => array( 'bg_type' => 'image' ),
			]
		);

		$this->add_control(
			'woo_product',
			[
				'label'       => esc_html__( 'Select Product', 'hub-elementor-addons' ),
				'type'        => Controls_Manager::SELECT2,
				'multiple'    => false,
				'label_block' => true,
				'options'     => $this->get_available_product(),
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

		$this->add_control(
			'width',
			[
				'label'      => esc_html__( 'Height', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'range'      => [
					'px' => [
						'min'  => 0,
						'max'  => 1000,
						'step' => 5,
					],
					'%'  => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default'    => [
					'unit' => 'px',
					'size' => 600,
				],
				'selectors'  => [
					'{{WRAPPER}} .lqd-woo-shoppable-video' => 'height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name'     => 'border',
				'selector' => '{{WRAPPER}} .lqd-woo-shoppable-video__media',
			]
		);

		$this->add_control(
			'margin',
			[
				'label'      => esc_html__( 'Border Radius', 'hub-elementor-addons' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default'    => [
					'top'      => 0,
					'right'    => 0,
					'bottom'   => 0,
					'left'     => 0,
					'unit'     => 'px',
					'isLinked' => true,
				],
				'selectors'  => [
					'{{WRAPPER}} .lqd-woo-shoppable-video__media' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		if ( ! liquid_helper()->is_woocommerce_active() ) {
			return;
		}

		$settings    = $this->get_settings_for_display();
		$bg_type     = $settings['bg_type'];
		$video_url   = $settings['video_url'];
		$image       = $settings['image'];
		$woo_product = $settings['woo_product'];
		?>
		<div class="lqd-woo-shoppable-video">
			<div class="lqd-woo-shoppable-video__media">
				<?php if ( 'video' === $bg_type ) : ?>
					<video muted loop>
						<source src="<?php echo esc_url( $video_url ); ?>" type="video/mp4">
					</video>
				<?php elseif ( 'youtube' === $bg_type ) : ?>
					<?php
					$ty_args = [
						'videoURL'     => $settings['youtube_url'],
						'showYTLogo'   => false,
						'containment'  => 'self',
						'autoPlay'     => true,
						'showControls' => false,
						'mute'         => true,
						'startAt'      => 0,
						'opacity'      => 1,
						'ratio'        => 'auto',
					];
					?>
					<div
						class="lqd-woo-shoppable-video__yt"
						data-property="<?php echo esc_attr( wp_json_encode( $ty_args ) ); ?>"
					></div>
				<?php else : ?>
					<?php echo wp_get_attachment_image( $image['id'], 'large' ); ?>
				<?php endif; ?>
			</div>
			<div class="lqd-woo-shoppable-video__content woocommerce">
				<?php
				$args = [
					'post_type'      => 'product',
					'post__in'       => [ $woo_product ],
					'posts_per_page' => 1,
				];

				$single_query = new WP_Query( $args );

				if ( $single_query->have_posts() ) {
					while ( $single_query->have_posts() ) {
						$single_query->the_post();
						wc_get_template_part( 'content', 'product-list-minimal' );
					}

					wp_reset_postdata();
				}
				?>
			</div>
		</div>
		<?php
	}
}

Plugin::instance()->widgets_manager->register( new LD_Woo_Shoppable_Video() );
