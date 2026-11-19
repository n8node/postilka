<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'h6'; ?>
<div class="pxl-pricing pxl-pricing__style-3 <?php echo esc_attr($settings['active_l3'] === 'yes' ? 'pxl-pricing__active' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-pricing__top">
        <?php if (!empty($settings['plan_l3'])) : ?>
            <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__title">
                <?php echo esc_html($settings['plan_l3']); ?>
            </<?php echo esc_attr($title_tag); ?>>
            <p class="pxl-pricing__desc">
                <?php echo esc_html($settings['desc_l3']); ?>
            </p>
        <?php endif; ?>
        <div class="pxl-pricing__price">
            <span class="pxl-pricing__price-detail"><?php echo esc_html($settings['currency_l3']); ?><?php echo esc_html($settings['price_l3']); ?></span><?php if($settings['period_l3']): ?><span class="pxl-pricing__price-period"><?php echo esc_html($settings['period_l3']); ?></span><?php endif; ?>
        </div>
        <div class="pxl-pricing__icon">
            <?php \Elementor\Icons_Manager::render_icon( $settings['icon_l3'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
        </div>
    </div>
    <?php if ( ! empty( $settings['btn_text_l3'] ) ) {
        $widget->add_render_attribute( 'btn_link_l3', 'href', $settings['btn_link_l3']['url'] );

        if ( $settings['btn_link_l3']['is_external'] ) {
            $widget->add_render_attribute( 'btn_link_l3', 'target', '_blank' );
        }

        if ( $settings['btn_link_l3']['nofollow'] ) {
            $widget->add_render_attribute( 'btn_link_l3', 'rel', 'nofollow' );
        } ?>
        <a <?php pxl_print_html($widget->get_render_attribute_string( 'btn_link_l3' )); ?> class="pxl-pricing__button <?php echo esc_attr($settings['active'] === 'yes' ? 'btn__pricing-active' : ''); ?>">
            <span class="pxl-pricing__button-text">
                <?php echo esc_html($settings['btn_text_l3']); ?>
            </span>    
            <span class="pxl-pricing__button-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M10.8223 4.44727L15.3748 8.99977L10.8223 13.5523" stroke="#132436" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2.625 9H15.2475" stroke="#132436" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </span>
        </a>
    <?php } ?>
    <?php if(isset($settings['feature_l3']) && !empty($settings['feature_l3']) && count($settings['feature_l3'])): ?>
        <ul class="pxl-pricing__featured">
            <?php
                foreach ($settings['feature_l3'] as $key => $item):
                    $feature_text = $widget->parse_text_editor( $item['feature_text_l3'] ); 
                    $icon_key = $widget->get_repeater_setting_key( 'feature_icon_l3', 'icons', $key );
                    $widget->add_render_attribute( $icon_key, [
                        'class' => $item['feature_icon_l3'],
                        'aria-hidden' => 'true',
                    ] );
                    ?>
                    <li class="pxl-pricing__featured-item">
                        <?php 
                        if($icon_key) :
                            \Elementor\Icons_Manager::render_icon( $item['feature_icon_l3'], [ 'aria-hidden' => 'true' ], 'i' );
                        else :
                            echo '<span pxl-pricing__featured-item--dot></span>';
                        endif; 

                        if($feature_text) :
                            echo pxl_print_html($feature_text);
                        endif; ?>
                    </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
</div>