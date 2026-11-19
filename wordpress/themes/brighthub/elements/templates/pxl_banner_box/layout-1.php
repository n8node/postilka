<?php
    if ( ! empty( $settings['scl1_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl1_link', 'href', $settings['scl1_link']['url'] );
    
        if ( $settings['scl1_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl1_link', 'target', '_blank' );
        }
    
        if ( $settings['scl1_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl1_link', 'rel', 'nofollow' );
        }
    }
    $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'h6';
?>
<div class="pxl-banner-box pxl-banner-box__style-1">
	<?php if ( ! empty( $settings['scl1_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl1_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
	<?php if ( ! empty( $settings['scl1_link']['url'] ) ) { ?></a><?php } ?>
	<div class="pxl-banner-box__top">
		<div class="pxl-banner-box__wrap-icon">
			<svg width="142" height="147" viewBox="0 0 142 147" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle cx="71" cy="75.9703" r="50" stroke="url(#paint0_linear_2_43)" stroke-linecap="round" stroke-dasharray="8 8"/>
				<circle cx="71" cy="75.9703" r="70" stroke="url(#paint1_linear_2_43)" stroke-linecap="round" stroke-dasharray="8 8"/>
				<path id="path-1" d="M117.528 33.665L117.616 35.1644C117.714 36.8287 118.549 38.363 119.893 39.3492L121.104 40.2375C121.213 40.3179 121.162 40.4911 121.027 40.4988L119.527 40.5866C117.863 40.6845 116.329 41.5192 115.343 42.8633L114.454 44.0745C114.374 44.1835 114.201 44.1324 114.193 43.9973L114.105 42.4979C114.007 40.8337 113.172 39.2994 111.828 38.3131L110.617 37.4248C110.508 37.3444 110.559 37.1712 110.694 37.1635L112.194 37.0757C113.858 36.9778 115.392 36.1431 116.379 34.799L117.267 33.5879C117.347 33.478 117.52 33.5292 117.528 33.665Z" fill="url(#paint2_linear_2_43)"/>
				<path id="path-2" d="M55.0199 0.113967L55.8811 1.96293C56.8377 4.01496 58.6594 5.53417 60.8499 6.10664L62.8236 6.62184C63.0015 6.66881 63.0236 6.91308 62.8569 6.99038L61.0079 7.85163C58.9558 8.80817 57.4365 10.6298 56.864 12.8203L56.3487 14.7938C56.3018 14.9718 56.0575 14.9939 55.9802 14.8272L55.1189 12.9782C54.1623 10.9262 52.3406 9.407 50.1501 8.83452L48.1764 8.31932C47.9985 8.27235 47.9764 8.02809 48.1431 7.95078L49.9921 7.08953C52.0443 6.133 53.5635 4.31135 54.1361 2.1209L54.6513 0.14733C54.6973 -0.0313845 54.9416 -0.0534973 55.0199 0.113967Z" fill="url(#paint3_linear_2_43)"/>
				<path id="path-3" d="M23.9285 49.7353L25.071 50.7007C26.3395 51.7719 28.0197 52.2221 29.6539 51.9286L31.1262 51.6637C31.2591 51.6402 31.349 51.796 31.2618 51.8988L30.2964 53.0413C29.2251 54.3098 28.7749 55.9901 29.0683 57.6242L29.3331 59.0964C29.3566 59.2293 29.2008 59.3192 29.0981 59.2321L27.9555 58.2667C26.687 57.1955 25.0068 56.7453 23.3726 57.0388L21.9004 57.3036C21.7675 57.3271 21.6775 57.1714 21.7647 57.0686L22.7301 55.926C23.8014 54.6575 24.2516 52.9773 23.9582 51.3432L23.6934 49.871C23.669 49.7379 23.8248 49.6479 23.9285 49.7353Z" fill="url(#paint4_linear_2_43)"/>
				<defs>
				<linearGradient id="paint0_linear_2_43" x1="71" y1="25.9703" x2="71" y2="125.97" gradientUnits="userSpaceOnUse">
				<stop stop-color="#D5D7DA"/>
				<stop offset="1" stop-color="white" stop-opacity="0"/>
				</linearGradient>
				<linearGradient id="paint1_linear_2_43" x1="71" y1="5.97034" x2="71" y2="145.97" gradientUnits="userSpaceOnUse">
				<stop stop-color="#D5D7DA"/>
				<stop offset="1" stop-color="white" stop-opacity="0"/>
				</linearGradient>
				<linearGradient id="paint2_linear_2_43" x1="117.425" y1="33.5344" x2="114.297" y2="44.1275" gradientUnits="userSpaceOnUse">
				<stop stop-color="#8053FC"/>
				<stop offset="1" stop-color="#D6C7FF"/>
				</linearGradient>
				<linearGradient id="paint3_linear_2_43" x1="54.8238" y1="0.000835804" x2="56.1762" y2="14.9398" gradientUnits="userSpaceOnUse">
				<stop stop-color="#8053FC"/>
				<stop offset="1" stop-color="#D6C7FF"/>
				</linearGradient>
				<linearGradient id="paint4_linear_2_43" x1="23.7631" y1="49.7203" x2="29.2631" y2="59.2466" gradientUnits="userSpaceOnUse">
				<stop stop-color="#8053FC"/>
				<stop offset="1" stop-color="#D6C7FF"/>
				</linearGradient>
				</defs>
			</svg>
		</div>
		<div class="pxl-banner-box__wrap-feature">
			<div class="pxl-banner-box__icon">
				<?php $image_size = '56x56';
					if(!empty($settings['scl1_fav']['id'])) : $img_id = $settings['scl1_fav']['id'];
						$img  = pxl_get_image_by_size( array(
							'attach_id'  => $img_id,
							'thumb_size' => $image_size,
						) );
						$thumbnail    = $img['thumbnail'];
						$thumbnail_url    = $img['url']; ?>
					<?php if ( ! empty( $img_id ) ) { echo wp_kses_post($thumbnail); } 
				endif; ?>
			</div>
			<ul class="pxl-banner-box__feature">
				<?php
					foreach ($settings['scl1_fea'] as $key => $item):
						$icon_key = $widget->get_repeater_setting_key( 'scl1_icon', 'icons', $key );
						$widget->add_render_attribute( $icon_key, [
							'class' => $item['scl1_icon'],
							'aria-hidden' => 'true',
						] );
						$text = $widget->parse_text_editor( $item['scl1_text'] ); ?>
						<li class="pxl-banner-box__feature-item">
							<span class="pxl-banner-box__feature-icon">
								<?php \Elementor\Icons_Manager::render_icon( $item['scl1_icon'], [ 'aria-hidden' => 'true' ], 'i' ); ?>
							</span>
							<span class="pxl-banner-box__feature-text"><?php echo pxl_print_html($text); ?></span>
						</li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
	<div class="pxl-banner-box__bottom">
		<<?php echo esc_attr($title_tag); ?> class="pxl-banner-box__title">
			<?php echo esc_html($settings['scl1_title']); ?>
		</<?php echo esc_attr($title_tag); ?>>
		<p class="pxl-banner-box__desc">
			<?php echo esc_html($settings['scl1_desc']); ?>
		</p>
	</div>
</div>