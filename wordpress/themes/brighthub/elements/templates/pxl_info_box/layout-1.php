<div class="pxl-info-box1 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
	<?php if ( !empty($settings['img_box']['id']) ) : 
		$img  = pxl_get_image_by_size( array(
            'attach_id'  => $settings['img_box']['id'],
            'thumb_size' => 'full',
        ) );
        $thumbnail_url = $img['url']; ?>
        <div class="pxl-item--bg bg-image" style="background-image: url(<?php echo esc_url($thumbnail_url); ?>);"></div>
    <?php endif; ?>
	<div class="pxl-item--icon"><i class="caseicon-viber-1 el-effect-zigzag"></i></div>
	<div class="pxl-phone--number"><?php echo esc_html($settings['phone_number']); ?></div>
	<div class="pxl-item--desc"><?php echo esc_html($settings['desc']); ?></div>
	<a class="pxl-phone--link" href="<?php echo esc_url($settings['phone_link']); ?>"></a>
</div>