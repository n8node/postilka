<?php
    if ( ! empty( $settings['scl3_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl3_link', 'href', $settings['scl3_link']['url'] );
    
        if ( $settings['scl3_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl3_link', 'target', '_blank' );
        }
    
        if ( $settings['scl3_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl3_link', 'rel', 'nofollow' );
        }
    }
    $title_tag = !empty($settings['title_tag3']) && $settings['title_tag3'] !== 'df' ? $settings['title_tag3'] : 'h6';
?>
<div class="pxl-banner-box pxl-banner-box__style-3">
	<?php if ( ! empty( $settings['scl3_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl3_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
	<?php if ( ! empty( $settings['scl3_link']['url'] ) ) { ?></a><?php } ?>
	<div class="pxl-banner-box__top">
		<div class="pxl-banner-box__top-wrap">
			<div class="pxl-banner-box__top-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="none">
					<path d="M12.5211 7.15587L13.2567 9.19858C14.0737 11.4657 15.8591 13.251 18.1262 14.0681L20.1689 14.8037C20.353 14.8705 20.353 15.1316 20.1689 15.1976L18.1262 15.9331C15.8591 16.7502 14.0737 18.5355 13.2567 20.8027L12.5211 22.8454C12.4542 23.0295 12.1932 23.0295 12.1272 22.8454L11.3916 20.8027C10.5746 18.5355 8.78925 16.7502 6.52211 15.9331L4.4794 15.1976C4.29528 15.1307 4.29528 14.8696 4.4794 14.8037L6.52211 14.0681C8.78925 13.251 10.5746 11.4657 11.3916 9.19858L12.1272 7.15587C12.1932 6.97083 12.4542 6.97083 12.5211 7.15587Z" fill="white"/>
					<path d="M21.7159 2.24654L22.0887 3.28072C22.5028 4.42849 23.4069 5.3326 24.5547 5.74664L25.5888 6.11946C25.6823 6.15335 25.6823 6.28525 25.5888 6.31915L24.5547 6.69197C23.4069 7.106 22.5028 8.01011 22.0887 9.15788L21.7159 10.1921C21.682 10.2855 21.5501 10.2855 21.5162 10.1921L21.1434 9.15788C20.7294 8.01011 19.8253 7.106 18.6775 6.69197L17.6433 6.31915C17.5499 6.28525 17.5499 6.15335 17.6433 6.11946L18.6775 5.74664C19.8253 5.3326 20.7294 4.42849 21.1434 3.28072L21.5162 2.24654C21.5501 2.15219 21.6829 2.15219 21.7159 2.24654Z" fill="white"/>
					<path d="M21.7159 19.8093L22.0887 20.8435C22.5028 21.9913 23.4069 22.8954 24.5547 23.3094L25.5888 23.6822C25.6823 23.7161 25.6823 23.848 25.5888 23.8819L24.5547 24.2548C23.4069 24.6688 22.5028 25.5729 22.0887 26.7207L21.7159 27.7548C21.682 27.8483 21.5501 27.8483 21.5162 27.7548L21.1434 26.7207C20.7294 25.5729 19.8253 24.6688 18.6775 24.2548L17.6433 23.8819C17.5499 23.848 17.5499 23.7161 17.6433 23.6822L18.6775 23.3094C19.8253 22.8954 20.7294 21.9913 21.1434 20.8435L21.5162 19.8093C21.5501 19.7159 21.6829 19.7159 21.7159 19.8093Z" fill="white"/>
				</svg>
			</div>
			<ul class="pxl-banner-box__top-feature">
				<?php
					foreach ($settings['scl3_fea'] as $key => $item):
						$icon_key = $widget->get_repeater_setting_key( 'scl3_icon', 'icons', $key );
						$widget->add_render_attribute( $icon_key, [
							'class' => $item['scl3_icon'],
							'aria-hidden' => 'true',
						] );
						$text = $widget->parse_text_editor( $item['scl3_text'] ); ?>
						<li class="pxl-banner-box__feature-item">
							<span class="pxl-banner-box__feature-item__icon">
								<?php \Elementor\Icons_Manager::render_icon( $item['scl3_icon'], [ 'aria-hidden' => 'true' ], 'i' ); ?>
							</span>
							<span class="pxl-banner-box__feature-item__text"><?php echo pxl_print_html($text); ?></span>
							<svg class="pxl-banner-box__feature-item__mouse" xmlns="http://www.w3.org/2000/svg" width="40" height="39" viewBox="0 0 40 39" fill="none">
								<path d="M0.914118 35.9178C0.324269 37.5188 1.8812 39.0757 3.48222 38.4859L37.8966 25.8069C39.4758 25.2251 39.6741 23.0717 38.2276 22.2113L25.4722 14.6242C25.1857 14.4538 24.9462 14.2144 24.7758 13.9278L17.1887 1.17243C16.3283 -0.274056 14.1749 -0.0758116 13.5931 1.50345L0.914118 35.9178Z" fill="url(#paint0_linear_2040_2993)"/>
								<defs>
								<linearGradient id="paint0_linear_2040_2993" x1="1" y1="38.9998" x2="24.9382" y2="0.818384" gradientUnits="userSpaceOnUse">
								<stop stop-color="#8053FC"/>
								<stop offset="1" stop-color="#D6C7FF"/>
								</linearGradient>
								</defs>
							</svg>
						</li>
				<?php endforeach; ?>
			</ul>
			<svg xmlns="http://www.w3.org/2000/svg" width="84" height="40" viewBox="0 0 84 40" fill="none" class="svg-right-custom">
				<path d="M0 10.05C0 4.49954 4.49954 0 10.05 0H29.95C35.5005 0 40 4.49954 40 10.05V29.95C40 35.5005 35.5005 40 29.95 40H10.05C4.49954 40 0 35.5005 0 29.95V10.05Z" fill="url(#paint0_linear_2040_2962)"/>
				<path d="M52 10.05C52 4.49954 56.4995 0 62.05 0H81.95C87.5005 0 92 4.49954 92 10.05V29.95C92 35.5005 87.5005 40 81.95 40H62.05C56.4995 40 52 35.5005 52 29.95V10.05Z" fill="url(#paint1_linear_2040_2962)"/>
				<path d="M104 10.05C104 4.49954 108.5 0 114.05 0H133.95C139.5 0 144 4.49954 144 10.05V29.95C144 35.5005 139.5 40 133.95 40H114.05C108.5 40 104 35.5005 104 29.95V10.05Z" fill="url(#paint2_linear_2040_2962)"/>
				<defs>
				<linearGradient id="paint0_linear_2040_2962" x1="0" y1="20" x2="99" y2="20" gradientUnits="userSpaceOnUse">
				<stop stop-color="#E9EAEB"/>
				<stop offset="1" stop-color="white"/>
				</linearGradient>
				<linearGradient id="paint1_linear_2040_2962" x1="0" y1="20" x2="99" y2="20" gradientUnits="userSpaceOnUse">
				<stop stop-color="#E9EAEB"/>
				<stop offset="1" stop-color="white"/>
				</linearGradient>
				<linearGradient id="paint2_linear_2040_2962" x1="0" y1="20" x2="99" y2="20" gradientUnits="userSpaceOnUse">
				<stop stop-color="#E9EAEB"/>
				<stop offset="1" stop-color="white"/>
				</linearGradient>
				</defs>
			</svg>
		</div>
		<div class="pxl-banner-box__top-lazyload">
			<span></span>
			<span class="group-laziload">
				<span></span>
				<span></span>
				<span></span>
			</span>
			
		</div>
	</div>
	<div class="pxl-banner-box__bottom">
		<<?php echo esc_attr($title_tag); ?> class="pxl-banner-box__title">
			<?php echo esc_attr($settings['scl3_title']); ?>
		</<?php echo esc_attr($title_tag); ?>>
		<p class="pxl-banner-box__desc">
			<?php echo esc_attr($settings['scl3_desc']); ?>
		</p>
	</div>
</div>