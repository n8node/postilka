<?php
    if ( ! empty( $settings['scl5_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl5_link', 'href', $settings['scl5_link']['url'] );
    
        if ( $settings['scl5_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl5_link', 'target', '_blank' );
        }
    
        if ( $settings['scl5_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl5_link', 'rel', 'nofollow' );
        }
    }
    $title_tag = !empty($settings['title_tag5']) && $settings['title_tag5'] !== 'df' ? $settings['title_tag5'] : 'h6';
?>
<div class="pxl-banner-box pxl-banner-box__style-5">
	<?php if ( ! empty( $settings['scl5_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl5_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
	<?php if ( ! empty( $settings['scl5_link']['url'] ) ) { ?></a><?php } ?>
	<div class="pxl-banner-box__top">
		<ul class="pxl-banner-box__top-feature">
			<?php
				foreach ($settings['scl5_fea'] as $key => $item):
					$text = $widget->parse_text_editor( $item['scl5_text'] ); ?>
					<li class="pxl-banner-box__feature-item">
						<div class="pxl-banner-box__feature-item__wrap">
							<?php if($key === 0) echo '<span class="pxl-banner-box__feature-item--line-first"></span>' ?>
							<div class="pxl-banner-box__feature-item__text">
								<span>
									<?php echo pxl_print_html($text); ?>
								</span>
							</div>
							<span class="pxl-banner-box__feature-item__number"><?php echo esc_html($key+1); ?></span>
							<?php if ($key === array_key_last($settings['scl5_fea'])): ?>
							<?php if (!empty($settings['scl5_content_icon']['value'])): ?>
								<div class="pxl-banner-box__top-icon">
									<?php \Elementor\Icons_Manager::render_icon($settings['scl5_content_icon'], ['aria-hidden' => 'true', 'class' => ''], 'i'); ?>
								</div>
							<?php endif; ?>
							<?php else: ?>
								<span class="pxl-banner-box__feature-item--line"></span>
							<?php endif; ?>
						</div>
					</li>
			<?php endforeach; ?>
		</ul>
	</div>
	<div class="pxl-banner-box__bottom">
		<<?php echo esc_attr($title_tag); ?> class="pxl-banner-box__title">
			<?php echo esc_html($settings['scl5_title']); ?>
		</<?php echo esc_attr($title_tag); ?>>
		<p class="pxl-banner-box__desc">
			<?php echo esc_html($settings['scl5_desc']); ?>
		</p>
	</div>
</div>