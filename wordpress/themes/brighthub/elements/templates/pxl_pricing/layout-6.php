<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div'; ?>
<div class="pxl-pricing pxl-pricing--style-6 <?php echo esc_attr($settings['active_l4'] === 'true' ? 'pxl-pricing__active' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-pricing__top">
        
        <?php if (!empty($settings['plan_l4'])) : ?>
            <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__title">
                <span class="pxl-pricing__plan"><?php echo pxl_print_html($widget->parse_text_editor($settings['plan_l4'])); ?></span>
                <?php if (!empty($settings['popular_text_l4'])) : ?>
                    <span class="pxl-pricing__popular">
                        <?php echo pxl_print_html($widget->parse_text_editor($settings['popular_text_l4'])); ?>
                    </span>
                <?php endif; ?>
            </<?php echo esc_attr($title_tag); ?>>
        <?php endif; ?>
        <div class="pxl-pricing__price">
            <span class="pxl-pricing__price-detail"><?php echo esc_html($settings['currency_l4']); ?><span data-price-st="<?php echo esc_attr($settings['price_l41']) ?>" data-price-nd="<?php echo esc_attr($settings['price_l42']) ?>"><?php echo esc_html($settings['price_l41']); ?></span></span><?php if($settings['period_l41']): ?>
            <div class="pxl-pricing__price-right">
                <span class="pxl-pricing__price-period" <?php if($settings['period_l41']): echo esc_attr('data-period-st='. $settings['period_l41'] .''); endif; ?> <?php if($settings['period_l42']): echo esc_attr('data-period-nd='. $settings['period_l42'] .''); endif; ?>><?php echo esc_html($settings['period_l41']); ?></span><?php endif; ?>
                <span class="pxl-pricing__option-text"><?php echo esc_html($settings['other_opt1_l4']); ?></span>
            </div>
        </div>
        <p class="pxl-pricing__desc">
            <?php echo esc_html($settings['desc_l4']); ?>
        </p>
        <?php if ( ! empty( $settings['btn_text_l4'] ) ) {
            $widget->add_render_attribute( 'btn_link_l4', 'href', $settings['btn_link_l4']['url'] );

            if ( $settings['btn_link_l4']['is_external'] ) {
                $widget->add_render_attribute( 'btn_link_l4', 'target', '_blank' );
            }

            if ( $settings['btn_link_l4']['nofollow'] ) {
                $widget->add_render_attribute( 'btn_link_l4', 'rel', 'nofollow' );
            } ?>
            <a <?php pxl_print_html($widget->get_render_attribute_string( 'btn_link_l4' )); ?> class="pxl-pricing__button btn btn-glossy <?php echo esc_attr($settings['active'] === 'yes' ? 'btn__pricing-active' : ''); ?>">
                <?php echo pxl_print_html($widget->parse_text_editor($settings['btn_text_l4'])); ?>
            </a>
        <?php } ?>
    </div>
   
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
</div>