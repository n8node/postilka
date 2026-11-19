<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit();
}

class Liquid_Video_Thumbnails extends Liquid_Base {
	protected static $instance = null;

	public static function instance() {
		if ( null == self::$instance ) {
			self::$instance = new Liquid_Video_Thumbnails();
		}

		return self::$instance;
	}

	public function __construct() {
		$this->add_action( 'add_meta_boxes', 'add_meta_boxes' );
		$this->add_action( 'admin_enqueue_scripts', 'enqueue_scripts' );
		$this->add_action( 'save_post_product', 'catch_save' );
	}

	public function enqueue_scripts() {
		wp_register_style( 'liquid-video-thumbnails', LD_ADDONS_URL . '/extensions/video-thumbnails/video-thumbnails.css', [], '1.0.0' );
		wp_register_script( 'liquid-video-thumbnails', LD_ADDONS_URL . '/extensions/video-thumbnails/video-thumbnails.js', [ 'jquery' ], '1.0.0', true );
	}

	public function add_meta_boxes() {
		add_meta_box(
			'liquid-video-thumbnails-metabox',
			esc_html__( 'Video Thumbnail', 'landinghub-core' ),
			[ $this, 'render_metabox_content' ],
			'product',
			'side',
		);
	}

	public function render_metabox_content( $post ) {
		wp_enqueue_style( 'liquid-video-thumbnails' );
		wp_enqueue_script( 'liquid-video-thumbnails' );

		$video_type = get_post_meta( $post->ID, '_liquid_video_thumbnails_type', true );
		$video_type = ! empty( $video_type ) ? $video_type : 'upload';
		$video_id   = get_post_meta( $post->ID, '_liquid_video_thumbnails_video_id', true );
		$url        = get_post_meta( $post->ID, '_liquid_video_thumbnails_url', true );
		?>
		<div id="liquid-video-thumbnails" class="categorydiv<?php echo ! empty( $video_id ) ? ' liquid-has-video' : ''; ?>">
			<ul class="category-tabs">
				<li class="<?php echo 'upload' === $video_type ? 'tabs' : ''; ?>" data-tab="upload-tab"><a
						href="#liquid-video-thumbnails-upload-tab"
						data-val="upload"
					><?php _e( 'Upload Video', 'landinghub-core' ); ?></a></li>
				<li class="hide-if-no-js<?php echo 'url' === $video_type ? ' tabs' : ''; ?>" data-tab="url-tab"><a
						href="#liquid-video-thumbnails-url-tab"
						data-val="url"
					><?php _e( 'Direct URL', 'landinghub-core' ); ?></a></li>
			</ul>

			<div id="liquid-video-thumbnails-upload-tab" class="tabs-panel<?php echo 'url' === $video_type ? ' hidden' : ''; ?>">
				<p class="liquid-video-thumbnails-upload">
					<a
						href="#"
						data-choose="<?php esc_attr_e( 'Add video to product', 'landinghub-core' ); ?>"
						data-update="<?php esc_attr_e( 'Add to product', 'landinghub-core' ); ?>"
						data-delete="<?php esc_attr_e( 'Delete video', 'landinghub-core' ); ?>"
						data-text="<?php esc_attr_e( 'Delete', 'landinghub-core' ); ?>"
					><?php esc_html_e( 'Add product featured video', 'landinghub-core' ); ?></a>
					<span
						class="woocommerce-help-tip"
						tabindex="0"
						aria-label="<?php esc_attr_e( 'For best results, use an MP4 file at least 1280x720 pixels in size.', 'landinghub-core' ); ?>"
					></span>
				</p>
				<div class="liquid-video-thumbnails-preview">
					<?php if ( ! empty( $video_id ) ): ?>
						<video src="<?php echo esc_url( wp_get_attachment_url( $video_id ) ); ?>" controls></video>
					<?php endif; ?>
					<a href="#" id="liquid-remove-post-thumbnail"><?php esc_html_e( 'Remove video thumbnail', 'landinghub-core' ); ?></a>
				</div>
			</div>

			<div id="liquid-video-thumbnails-url-tab" class="tabs-panel<?php echo 'upload' === $video_type ? ' hidden' : ''; ?>">
				<input
					type="text"
					name="_liquid_video_thumbnails_url"
					autocomplete="off"
					value="<?php echo esc_url( $url ); ?>"
				>
			</div>
		</div>
		<input type="hidden" name="_liquid_video_thumbnails_video_id" value="<?php echo esc_attr( $video_id ); ?>">
		<input type="hidden" name="_liquid_video_thumbnails_type" value="<?php echo esc_attr( $video_type ); ?>">
		<?php
		wp_nonce_field( 'liquid_video_thumbnails_type_nonce', 'liquid_video_thumbnails_type_nonce' );
	}

	public function catch_save( $post_id ) {
		if ( ! isset( $_POST['liquid_video_thumbnails_type_nonce'] ) || ! wp_verify_nonce( $_POST['liquid_video_thumbnails_type_nonce'], 'liquid_video_thumbnails_type_nonce' ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		$video_type = isset( $_POST['_liquid_video_thumbnails_type'] ) ? sanitize_text_field( $_POST['_liquid_video_thumbnails_type'] ) : '';
		$video_url  = isset( $_POST['_liquid_video_thumbnails_url'] ) ? sanitize_text_field( $_POST['_liquid_video_thumbnails_url'] ) : '';
		$video_id   = isset( $_POST['_liquid_video_thumbnails_video_id'] ) ? sanitize_text_field( $_POST['_liquid_video_thumbnails_video_id'] ) : '';

		update_post_meta( $post_id, '_liquid_video_thumbnails_type', $video_type );
		update_post_meta( $post_id, '_liquid_video_thumbnails_url', $video_url );
		update_post_meta( $post_id, '_liquid_video_thumbnails_video_id', $video_id );
	}
}

Liquid_Video_Thumbnails::instance();
