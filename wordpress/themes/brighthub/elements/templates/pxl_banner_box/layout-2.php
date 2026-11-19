<?php
    if ( ! empty( $settings['scl2_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl2_link', 'href', $settings['scl2_link']['url'] );
    
        if ( $settings['scl2_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl2_link', 'target', '_blank' );
        }
    
        if ( $settings['scl2_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl2_link', 'rel', 'nofollow' );
        }
    }
    $title_tag = !empty($settings['title_tag2']) && $settings['title_tag2'] !== 'df' ? $settings['title_tag2'] : 'h6';
?>

<div class="pxl-banner-box pxl-banner-box__style-2">
    <?php if ( ! empty( $settings['scl2_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl2_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
    <?php if ( ! empty( $settings['scl2_link']['url'] ) ) { ?></a><?php } ?>
	<div class="pxl-banner-box__wrap-top">
		<div class="pxl-banner-box__feature">
            <div class="pxl-banner-box__feature-type">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5.81607 3.25329L6.16738 4.22892C6.55763 5.31173 7.41032 6.16442 8.49313 6.55467L9.46875 6.90598C9.55669 6.93792 9.55669 7.06261 9.46875 7.09411L8.49313 7.44542C7.41032 7.83567 6.55763 8.68836 6.16738 9.77117L5.81607 10.7468C5.78413 10.8347 5.65944 10.8347 5.62794 10.7468L5.27663 9.77117C4.88638 8.68836 4.03369 7.83567 2.95088 7.44542L1.97525 7.09411C1.88732 7.06217 1.88732 6.93748 1.97525 6.90598L2.95088 6.55467C4.03369 6.16442 4.88638 5.31173 5.27663 4.22892L5.62794 3.25329C5.65944 3.16492 5.78413 3.16492 5.81607 3.25329Z" fill="white"/>
                    <path d="M10.2076 0.908797L10.3857 1.40273C10.5834 1.95092 11.0152 2.38273 11.5634 2.58048L12.0573 2.75855C12.102 2.77473 12.102 2.83773 12.0573 2.85392L11.5634 3.03198C11.0152 3.22973 10.5834 3.66155 10.3857 4.20973L10.2076 4.70367C10.1914 4.7483 10.1284 4.7483 10.1122 4.70367L9.93416 4.20973C9.73641 3.66155 9.3046 3.22973 8.75641 3.03198L8.26247 2.85392C8.21785 2.83773 8.21785 2.77473 8.26247 2.75855L8.75641 2.58048C9.3046 2.38273 9.73641 1.95092 9.93416 1.40273L10.1122 0.908797C10.1284 0.863734 10.1918 0.863734 10.2076 0.908797Z" fill="white"/>
                    <path d="M10.2076 9.29714L10.3857 9.79108C10.5834 10.3393 11.0152 10.7711 11.5634 10.9688L12.0573 11.1469C12.102 11.1631 12.102 11.2261 12.0573 11.2423L11.5634 11.4203C11.0152 11.6181 10.5834 12.0499 10.3857 12.5981L10.2076 13.092C10.1914 13.1366 10.1284 13.1366 10.1122 13.092L9.93416 12.5981C9.73641 12.0499 9.3046 11.6181 8.75641 11.4203L8.26247 11.2423C8.21785 11.2261 8.21785 11.1631 8.26247 11.1469L8.75641 10.9688C9.3046 10.7711 9.73641 10.3393 9.93416 9.79108L10.1122 9.29714C10.1284 9.25252 10.1918 9.25252 10.2076 9.29714Z" fill="white"/>
                </svg>
                <span>
                    <?php echo esc_html($settings['scl2_type']) ;?>
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="6" height="56" viewBox="0 0 6 56" fill="none" class="pxl-banner-box__connect-text">
                    <path d="M6 1V1C3.23858 1 1 3.23858 1 6V50C1 52.7614 3.23858 55 6 55V55" stroke="#7A5AF8"/>
                </svg>
            </div>
            <div class="pxl-banner-box__feature-text"><?php $fea = $widget->parse_text_editor($settings['scl2_type_desc']); echo pxl_print_html($fea) ;?></div>
            <div class="pxl-banner-box__feature-lazyload">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
        <div class="pxl-banner-box__chart">
            <div class="pxl-banner-box__chart-sub"><?php echo esc_html($settings['scl2_chart_sub']); ?></div>
            <div class="pxl-banner-box__chart-number"><?php echo esc_html($settings['scl2_chart_suffix'].''.$settings['scl2_chart_number'].''.$settings['scl2_chart_prefix']); ?></div>
            <div class="pxl-banner-box__chart-object">
                <?php if (!empty($settings['scl2_chart_svg']['value']) ) : ?>
                    <?php \Elementor\Icons_Manager::render_icon( $settings['scl2_chart_svg'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                <?php endif; ?>
                </div>
        </div>
        <div class="pxl-banner-box__bg">
            <svg width="276" height="224" viewBox="0 0 276 224" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="274" height="222" rx="12" stroke="#E9EAEB" stroke-linecap="round" stroke-dasharray="8 8"/>
            </svg>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
        </div>
	</div>
    <div class="pxl-banner-box__bottom">
        <<?php echo esc_attr($title_tag); ?> class="pxl-banner-box__title">
            <?php echo esc_html($settings['scl2_title']); ?>
        </<?php echo esc_attr($title_tag); ?>>
        <p class="pxl-banner-box__desc">
            <?php echo esc_html($settings['scl2_desc']); ?>
        </p>
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const path = document.getElementById('path-line');
        
        if (!path) {
            return;
        }
        
        const ellipse = document.querySelector('ellipse');
        const ellipseBorder = document.querySelector('ellipse + path');
        
        if (!ellipse || !ellipseBorder) {
            return;
        }
        
        const pathLength = path.getTotalLength();
        let currentPosition = 0;
        const speed = 0.005;
        
        function animateEllipse() {
            currentPosition += speed;
            
            if (currentPosition > 1) {
                currentPosition = 0;
            }
            
            const point = path.getPointAtLength(currentPosition * pathLength);
            
            ellipse.setAttribute('cx', point.x);
            ellipse.setAttribute('cy', point.y);
            
            ellipseBorder.setAttribute('d', `M${point.x + 3.527} ${point.y}C${point.x + 3.527} ${point.y + 1.932} ${point.x + 1.952} ${point.y + 3.506} ${point.x} ${point.y + 3.506}C${point.x - 1.952} ${point.y + 3.506} ${point.x - 3.527} ${point.y + 1.932} ${point.x - 3.527} ${point.y}C${point.x - 3.527} ${point.y - 1.932} ${point.x - 1.952} ${point.y - 3.506} ${point.x} ${point.y - 3.506}C${point.x + 1.952} ${point.y - 3.506} ${point.x + 3.527} ${point.y - 1.932} ${point.x + 3.527} ${point.y}Z`);
            
            requestAnimationFrame(animateEllipse);
        }
        
        animateEllipse();
    });
</script>