<?php if(class_exists('MC4WP_Container')) : ?>
	<div class="pxl-mailchimp pxl-mailchimp__<?php echo esc_attr($settings['style']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
		<?php echo do_shortcode('[mc4wp_form]'); ?>
	</div>
<?php endif; ?>
