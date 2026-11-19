<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div'; ?>
<div class="pxl-pricing pxl-pricing__style-4 <?php echo esc_attr($settings['active_l4'] === 'true' ? 'pxl-pricing__active' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-pricing__top">
        <?php if (!empty($settings['popular_text_l4'])) : ?>
            <div class="pxl-pricing__popular">
                <svg width="14" height="14" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                    <rect width="72" height="72" fill="url(#pattern0_2317_7111)"/>
                    <defs>
                    <pattern id="pattern0_2317_7111" patternContentUnits="objectBoundingBox" width="1" height="1">
                    <use xlink:href="#image0_2317_7111" transform="scale(0.0138889)"/>
                    </pattern>
                    <image id="image0_2317_7111" width="72" height="72" preserveAspectRatio="none" xlink:href="data:image/png;base64,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"/>
                    </defs>
                </svg>
                <?php echo pxl_print_html($widget->parse_text_editor($settings['popular_text_l4'])); ?>
            </div>
        <?php endif; ?>
        <?php if (!empty($settings['plan_l4'])) : ?>
            <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__title">
                <?php echo pxl_print_html($widget->parse_text_editor($settings['plan_l4'])); ?>
            </<?php echo esc_attr($title_tag); ?>>
        <?php endif; ?>
        <div class="pxl-pricing__price">
            <span class="pxl-pricing__price-detail"><?php echo esc_html($settings['currency_l4']); ?><span data-price-st="<?php echo esc_attr($settings['price_l41']) ?>" data-price-nd="<?php echo esc_attr($settings['price_l42']) ?>"><?php echo esc_html($settings['price_l41']); ?></span></span><?php if($settings['period_l41']): ?>
            <span class="pxl-pricing__price-period" <?php if($settings['period_l41']): echo esc_attr('data-period-st='. $settings['period_l41'] .''); endif; ?> <?php if($settings['period_l42']): echo esc_attr('data-period-nd='. $settings['period_l42'] .''); endif; ?>><?php echo esc_html($settings['period_l41']); ?></span><?php endif; ?>
        </div>
        <div class="pxl-pricing__option" data-st="<?php echo esc_attr($settings['other_opt1_l4']); ?>" data-nd="<?php echo esc_attr($settings['other_opt2_l4']); ?>">
            <span class="pxl-pricing__option-text"><?php echo esc_html($settings['other_opt1_l4']); ?></span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path fill="#000" d="M9.71201 2.93164C8.20264 2.93164 6.69326 2.93164 5.16201 2.93164C4.94326 2.93164 4.72451 2.93164 4.52764 2.93164C3.89326 2.93164 3.89326 3.93789 4.52764 3.93789H8.44326C6.86826 5.44727 5.31514 6.97852 3.74014 8.48789C3.52139 8.70664 3.28076 8.92539 3.06201 9.14414C2.58076 9.60352 3.32451 10.3473 3.80576 9.86602C5.40264 8.31289 7.02139 6.75977 8.61826 5.18477C8.81514 4.98789 9.01201 4.81289 9.20889 4.61602V7.98477V8.61914C9.20889 9.25352 10.2151 9.25352 10.2151 8.61914C10.2151 7.10977 10.2151 5.57852 10.2151 4.06914C10.2151 3.85039 10.2151 3.63164 10.2151 3.43477C10.2151 3.17227 9.99639 2.93164 9.71201 2.93164Z" fill="#E9EAEB"/>
            </svg>
        </div>
        <p class="pxl-pricing__desc">
            <?php echo esc_html($settings['desc_l4']); ?>
        </p>
    </div>
    <div class="pxl-pricing__bottom">
        <?php if(!empty($settings['tit_fea_l4'])): ?>
            <div class="pxl-pricing__bottom-tit">
                <?php echo esc_html($settings['tit_fea_l4']); ?>
            </div>
        <?php endif; ?>
        <?php if(!empty($settings['desc_fea_l4'])): ?>
            <div class="pxl-pricing__bottom-desc">
                <?php echo esc_html($settings['desc_fea_l4']); ?>
            </div>
        <?php endif; ?>
        <?php if(isset($settings['feature_l4']) && !empty($settings['feature_l4']) && count($settings['feature_l4'])): ?>
            <ul class="pxl-pricing__fea">
                <?php
                    foreach ($settings['feature_l4'] as $key => $item):
                        $feature_text = $widget->parse_text_editor( $item['feature_text_l4'] ); 
                        $icon_key = $widget->get_repeater_setting_key( 'feature_icon_l4', 'icons', $key );
                        $widget->add_render_attribute( $icon_key, [
                            'class' => $item['feature_icon_l4'],
                            'aria-hidden' => 'true',
                        ] );
                        ?>
                        <li class="pxl-pricing__fea-item">
                            <?php 
                            if($icon_key) :
                                \Elementor\Icons_Manager::render_icon( $item['feature_icon_l4'], [ 'aria-hidden' => 'true' ], 'i' );
                            else :
                                echo '<span pxl-pricing__fea-item--dot></span>';
                            endif; 

                            if($feature_text) :
                                echo pxl_print_html($feature_text);
                            endif; ?>
                        </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
        <?php if ( ! empty( $settings['btn_text_l4'] ) ) {
            $widget->add_render_attribute( 'btn_link_l4', 'href', $settings['btn_link_l4']['url'] );

            if ( $settings['btn_link_l4']['is_external'] ) {
                $widget->add_render_attribute( 'btn_link_l4', 'target', '_blank' );
            }

            if ( $settings['btn_link_l4']['nofollow'] ) {
                $widget->add_render_attribute( 'btn_link_l4', 'rel', 'nofollow' );
            } ?>
            <a <?php pxl_print_html($widget->get_render_attribute_string( 'btn_link_l4' )); ?> class="pxl-pricing__button btn btn-glossy <?php echo esc_attr($settings['active'] === 'yes' ? 'btn__pricing-active' : ''); ?>">
                <?php echo esc_html($settings['btn_text_l4']); ?>
            </a>
        <?php } ?>
        <?php if(!empty($settings['text_under_button'])): ?>
            <div class="pxl-pricing__bottom-use">
                <?php echo esc_html($settings['text_under_button']); ?>
            </div>
        <?php endif; ?>
    </div>
</div>