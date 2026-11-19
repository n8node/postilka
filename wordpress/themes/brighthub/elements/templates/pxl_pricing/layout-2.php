<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div'; ?>
<div class="pxl-pricing pxl-pricing__style-2 <?php echo esc_attr($settings['active_l2'] === 'yes' ? 'pxl-pricing__active' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-pricing__top">
        <div class="pxl-pricing__top-price">
            <?php if (!empty($settings['plan_l2'])) : ?>
                <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__plan">
                    <?php echo esc_html($settings['plan_l2']); ?>
                </<?php echo esc_attr($title_tag); ?>>
            <?php endif; ?>
            <div class="pxl-pricing__price">
                <span class="pxl-pricing__price-detail">
                    <?php echo esc_html($settings['currency_l2']); ?><?php echo esc_html($settings['price_l2']); ?>
                </span>
                <?php if($settings['period_l2']): ?>
                    <span class="pxl-pricing__price-period"><?php echo esc_html($settings['period_l2']); ?></span>
                <?php endif; ?>
            </div>
        </div>
        <?php if ( ! empty( $settings['btn_text_l2'] ) ) {
            $widget->add_render_attribute( 'btn_link_l2', 'href', $settings['btn_link_l2']['url'] );

            if ( $settings['btn_link_l2']['is_external'] ) {
                $widget->add_render_attribute( 'btn_link_l2', 'target', '_blank' );
            }

            if ( $settings['btn_link_l2']['nofollow'] ) {
                $widget->add_render_attribute( 'btn_link_l2', 'rel', 'nofollow' );
            } ?>
            <a <?php pxl_print_html($widget->get_render_attribute_string( 'btn_link_l2' )); ?> class="pxl-pricing__button <?php echo esc_attr($settings['active'] === 'yes' ? 'btn__pricing-active' : ''); ?>">
                <?php echo esc_html($settings['btn_text_l2']); ?>
            </a>
        <?php } ?>
    </div>
    <?php if(isset($settings['feature_l2']) && !empty($settings['feature_l2']) && count($settings['feature_l2'])): ?>
        <ul class="pxl-pricing__featured">
            <?php
                $show_label = $settings['show_label'] || 0;
                foreach ($settings['feature_l2'] as $key => $item):
                    $feature_label = $widget->parse_text_editor( $item['feature_label_l2'] ); 
                    $feature_text = $widget->parse_text_editor( $item['feature_text_l2'] ); 
                    $icon_key = $widget->get_repeater_setting_key( 'feature_icon_l2', 'icons', $key );
                    $widget->add_render_attribute( $icon_key, [
                        'class' => $item['feature_icon_l2'],
                        'aria-hidden' => 'true',
                    ] );
                    ?>
                    <li class="pxl-pricing__featured-item">
                        <?php 
                        if($show_label === 'true'):
                            echo '<span class="pxl-pricing__featured-label">' . esc_html($feature_label) . '</span>';
                        endif;

                        if($feature_text) :
                            echo pxl_print_html($feature_text);
                        elseif($icon_key) :
                            \Elementor\Icons_Manager::render_icon( $item['feature_icon_l2'], [ 'aria-hidden' => 'true' ], 'i' );
                        else :
                            echo '-';
                        endif; ?>
                    </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
</div>