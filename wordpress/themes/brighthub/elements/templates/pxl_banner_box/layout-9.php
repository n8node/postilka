<?php
    if ( ! empty( $settings['scl9_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl9_link', 'href', $settings['scl9_link']['url'] );
    
        if ( $settings['scl9_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl9_link', 'target', '_blank' );
        }
    
        if ( $settings['scl9_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl9_link', 'rel', 'nofollow' );
        }
    }
    $title_tag = !empty($settings['title_tag9']) && $settings['title_tag9'] !== 'df' ? $settings['title_tag9'] : 'div';
?>
<div class="pxl-banner-box pxl-banner-box__style-9">
    <?php if ( ! empty( $settings['scl9_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl9_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
    <?php if ( ! empty( $settings['scl9_link']['url'] ) ) { ?></a><?php } ?>
    <div class="pxl-banner-box__top">
        <<?php echo esc_attr($title_tag); ?> class="pxl-banner-box__title">
            <?php $title = $widget->parse_text_editor($settings['scl9_title']); echo $widget->parse_text_editor($title); ?>
        </<?php echo esc_attr($title_tag); ?>>
        <p class="pxl-banner-box__desc">
            <?php $desc = $widget->parse_text_editor($settings['scl9_desc']); echo $widget->parse_text_editor($desc); ?>
        </p>
    </div>
    <a class="pxl-banner-box_button">
        <?php echo esc_html($settings['scl9_btn']); ?>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M9.62012 3.95312L13.6668 7.99979L9.62012 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2.33398 8H13.554" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </a>
</div>