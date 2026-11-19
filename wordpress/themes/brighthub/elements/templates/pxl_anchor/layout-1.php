<?php 
$template = (int)$widget->get_setting('content_template','0');
if($template > 0 ){
	if ( !has_action( 'pxl_anchor_target_hidden_panel_'.$template) ){
		add_action( 'pxl_anchor_target_hidden_panel_'.$template, 'brighthub_hook_anchor_hidden_panel' );
	} 
}
?>
<div class="pxl-anchor-button type-<?php echo esc_attr($settings['icon_type']); ?> <?php echo esc_attr($settings['style'].' '.$settings['pxl_animate']); ?> <?php if($template == '1') { echo 'pxl-anchor-mobile-menu'; } ?>" data-target=".pxl-hidden-template-<?php echo esc_attr($template); ?>" data-delay-hover="<?php echo esc_attr($settings['pxl_close_animate_delay']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
	<?php if($settings['icon_type'] == 'default') { ?>
		<div class="pxl-anchor-divider">
			<span class="pxl-icon-line pxl-icon-line1"></span>
			<span class="pxl-icon-line pxl-icon-line2"></span>
			<span class="pxl-icon-line pxl-icon-line3"></span>
		</div>
	<?php } elseif($settings['icon_type'] == 'icon' && !empty($settings['pxl_icon']['value'])) { ?>
		<?php \Elementor\Icons_Manager::render_icon( $settings['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
		<label class=" pxl-pl-8"><?php echo esc_html($settings['label']); ?></label>
	<?php } elseif($settings['icon_type'] == 'icon-theme') { ?>
		<div class="pxl-anchor-theme-style1">
			<span></span>
			<span></span>
			<span></span>
			<span></span>
		</div>
	<?php } ?>
</div>