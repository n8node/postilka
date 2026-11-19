<?php
    if ( ! empty( $settings['scl4_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl4_link', 'href', $settings['scl4_link']['url'] );
    
        if ( $settings['scl4_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl4_link', 'target', '_blank' );
        }
    
        if ( $settings['scl4_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl4_link', 'rel', 'nofollow' );
        }
    }
    $title_tag = !empty($settings['title_tag4']) && $settings['title_tag4'] !== 'df' ? $settings['title_tag4'] : 'h6';
?>
<div class="pxl-banner-box pxl-banner-box__style-4">
	<?php if ( ! empty( $settings['scl4_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl4_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
	<?php if ( ! empty( $settings['scl4_link']['url'] ) ) { ?></a><?php } ?>
	<div class="pxl-banner-box__top">
		<ul class="pxl-banner-box__top-feature">
			<?php
				foreach ($settings['scl4_fea'] as $key => $item):
					$icon_key = $widget->get_repeater_setting_key( 'scl4_icon', 'icons', $key );
					$widget->add_render_attribute( $icon_key, [
						'class' => $item['scl4_icon'],
						'aria-hidden' => 'true',
					] );
					$text = $widget->parse_text_editor( $item['scl4_text'] ); ?>
					<li class="pxl-banner-box__feature-item">
						<span class="pxl-banner-box__feature-item__icon">
							<?php \Elementor\Icons_Manager::render_icon( $item['scl4_icon'], [ 'aria-hidden' => 'true' ], 'i' ); ?>
						</span>
						<span class="pxl-banner-box__feature-item__text"><?php echo pxl_print_html($text); ?></span>
					</li>
			<?php endforeach; ?>
		</ul>
		<svg width="474" height="282" viewBox="0 0 474 282" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M49.458 281C18.4309 243.87 1.00001 193.51 1 141C0.999993 88.4898 18.4308 38.1303 49.458 1" stroke="url(#paint0_linear_0_10)" stroke-linecap="round"/>
			<path d="M102.13 232.682C81.8947 208.366 70.5267 175.387 70.5267 141C70.5267 106.613 81.8946 73.6342 102.13 49.3188" stroke="url(#paint1_linear_0_10)" stroke-linecap="round"/>
			<path d="M139 186.841C128.882 174.683 123.198 158.194 123.198 141C123.198 123.807 128.882 107.317 139 95.1595" stroke="url(#paint2_linear_0_10)" stroke-linecap="round"/>
			<path d="M424.542 281C455.569 243.87 473 193.51 473 141C473 88.4898 455.569 38.1303 424.542 1" stroke="url(#paint3_linear_0_10)" stroke-linecap="round"/>
			<path d="M371.87 232.682C392.105 208.366 403.473 175.387 403.473 141C403.473 106.613 392.105 73.6342 371.87 49.3188" stroke="url(#paint4_linear_0_10)" stroke-linecap="round"/>
			<path d="M335 186.841C345.118 174.683 350.802 158.194 350.802 141C350.802 123.807 345.118 107.317 335 95.1595" stroke="url(#paint5_linear_0_10)" stroke-linecap="round"/>
			<defs>
			<linearGradient id="paint0_linear_0_10" x1="25.229" y1="1" x2="25.229" y2="281" gradientUnits="userSpaceOnUse">
			<stop stop-color="white"/>
			<stop offset="0.5" stop-color="#9B8AFB"/>
			<stop offset="1" stop-color="white"/>
			</linearGradient>
			<linearGradient id="paint1_linear_0_10" x1="86.3282" y1="49.3188" x2="86.3282" y2="232.682" gradientUnits="userSpaceOnUse">
			<stop stop-color="white"/>
			<stop offset="0.5" stop-color="#BDB4FE"/>
			<stop offset="1" stop-color="white"/>
			</linearGradient>
			<linearGradient id="paint2_linear_0_10" x1="131.099" y1="95.1595" x2="131.099" y2="186.841" gradientUnits="userSpaceOnUse">
			<stop stop-color="white"/>
			<stop offset="0.5" stop-color="#D9D6FE"/>
			<stop offset="1" stop-color="white"/>
			</linearGradient>
			<linearGradient id="paint3_linear_0_10" x1="448.771" y1="1" x2="448.771" y2="281" gradientUnits="userSpaceOnUse">
			<stop stop-color="white"/>
			<stop offset="0.5" stop-color="#9B8AFB"/>
			<stop offset="1" stop-color="white"/>
			</linearGradient>
			<linearGradient id="paint4_linear_0_10" x1="387.672" y1="49.3188" x2="387.672" y2="232.682" gradientUnits="userSpaceOnUse">
			<stop stop-color="white"/>
			<stop offset="0.5" stop-color="#BDB4FE"/>
			<stop offset="1" stop-color="white"/>
			</linearGradient>
			<linearGradient id="paint5_linear_0_10" x1="342.901" y1="95.1595" x2="342.901" y2="186.841" gradientUnits="userSpaceOnUse">
			<stop stop-color="white"/>
			<stop offset="0.5" stop-color="#D9D6FE"/>
			<stop offset="1" stop-color="white"/>
			</linearGradient>
			</defs>
		</svg>
		<?php if (!empty($settings['scl4_content_icon']['value']) ) : ?>
        <div class="pxl-banner-box__top-icon">
            <?php \Elementor\Icons_Manager::render_icon( $settings['scl4_content_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
        </div>
    <?php endif; ?>

	</div>
	<div class="pxl-banner-box__bottom">
		<<?php echo esc_attr($title_tag); ?> class="pxl-banner-box__title">
			<?php echo esc_attr($settings['scl4_title']); ?>
		</<?php echo esc_attr($title_tag); ?>>
		<p class="pxl-banner-box__desc">
			<?php echo esc_attr($settings['scl4_desc']); ?>
		</p>
	</div>
</div>