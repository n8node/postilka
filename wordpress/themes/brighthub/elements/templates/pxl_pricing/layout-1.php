<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div'; ?>
<div class="pxl-pricing pxl-pricing__style-1 <?php echo esc_attr($settings['active'] === 'yes' ? 'pxl-pricing__active' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <?php if (!empty($settings['plan'])) : ?>
        <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__plan">
            <?php echo esc_html($settings['plan']); ?>
        </<?php echo esc_attr($title_tag); ?>>
    <?php endif; ?>
    <div class="pxl-pricing__price">
        <span class="pxl-pricing__price-detail"><?php echo esc_html($settings['currency']); ?><?php echo esc_html($settings['price']); ?></span><?php if($settings['period']): ?><span class="pxl-pricing__price-period">/<?php echo esc_html($settings['period']); ?></span><?php endif; ?>
    </div>
    <p class="pxl-pricing__desc"><?php echo esc_html($settings['desc']); ?></p>
    <?php if(isset($settings['feature']) && !empty($settings['feature']) && count($settings['feature'])): ?>
        <ul class="pxl-pricing__featured">
            <?php
                foreach ($settings['feature'] as $key => $link):
                    $feature_text = $widget->parse_text_editor( $link['feature_text'] ); ?>
                    <li>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M14.764 1.75631C11.9687 2.67386 8.40519 5.12775 5.1191 9.33138L3.17733 7.17622C2.87859 6.83481 2.3238 6.83481 2.02506 7.17622L0.595402 8.77659C0.318005 9.09666 0.339343 9.5661 0.638079 9.8435L5.03375 14.0685C5.3965 14.4099 5.99397 14.3245 6.25003 13.8764C8.59723 9.63012 11.1151 6.47206 15.3828 2.84456C15.8949 2.39646 15.4255 1.54293 14.764 1.75631Z" fill="#181D27"/>
                        </svg>
                        <?php echo pxl_print_html($feature_text); ?>
                    </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
    <?php if ( ! empty( $settings['btn_text'] ) ) {
        $widget->add_render_attribute( 'btn_link', 'href', $settings['btn_link']['url'] );

        if ( $settings['btn_link']['is_external'] ) {
            $widget->add_render_attribute( 'btn_link', 'target', '_blank' );
        }

        if ( $settings['btn_link']['nofollow'] ) {
            $widget->add_render_attribute( 'btn_link', 'rel', 'nofollow' );
        } ?>
        <a class="pxl-pricing__button btn <?php echo esc_attr($settings['active'] === 'yes' ? 'btn-secondary' : 'btn__transparent'); ?> btn-glossy" <?php pxl_print_html($widget->get_render_attribute_string( 'btn_link' )); ?>>
            <?php echo esc_html($settings['btn_text']); ?>
        </a>
    <?php } ?>
</div>