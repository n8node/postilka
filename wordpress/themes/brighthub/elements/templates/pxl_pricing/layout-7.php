<?php
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div';
$wrap_active_class  = (!empty($settings['active_l7']) && $settings['active_l7'] === 'true') ? 'pxl-pricing__active' : '';
$btn_active_class   = $wrap_active_class ? 'btn__pricing-active' : '';

$animate_class      = !empty($settings['pxl_animate']) ? $settings['pxl_animate'] : '';
$animate_delay_attr = isset($settings['pxl_animate_delay']) && $settings['pxl_animate_delay'] !== '' 
                    ? ' data-wow-delay="' . esc_attr($settings['pxl_animate_delay']) . 'ms"' 
                    : '';
?>

<div class="pxl-pricing pxl-pricing--style-7 <?php echo esc_attr($wrap_active_class . ' ' . $animate_class); ?>"<?php echo $animate_delay_attr; ?>>
    <div class="pxl-pricing__top">
        <?php if (!empty($settings['popular_text_l7'])) : ?>
            <div class="pxl-pricing__popular">
                <?php echo pxl_print_html($widget->parse_text_editor($settings['popular_text_l7'])); ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($settings['plan_l7'])) : ?>
            <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__title">
                <?php echo pxl_print_html($widget->parse_text_editor($settings['plan_l7'])); ?>
            </<?php echo esc_attr($title_tag); ?>>
        <?php endif; ?>

        <div class="pxl-pricing__price">
            <span class="pxl-pricing__price-detail">
                <?php 
                    echo esc_html( isset($settings['currency_l7']) ? $settings['currency_l7'] : '' );
                    echo esc_html( isset($settings['price_l7'])    ? $settings['price_l7']    : '' );
                ?>
            </span>
            <span class="pxl-pricing__price-period">
                <?php echo esc_html( isset($settings['period_l7']) ? $settings['period_l7'] : '' ); ?>
            </span>
        </div>

        <?php if (!empty($settings['desc_l7'])) : ?>
            <p class="pxl-pricing__desc"><?php echo esc_html($settings['desc_l7']); ?></p>
        <?php endif; ?>
        <?php if ( isset($settings['feature_l7']) && is_array($settings['feature_l7']) && count($settings['feature_l7']) ) : ?>
            <ul class="pxl-pricing__fea">
                <?php foreach ($settings['feature_l7'] as $key => $item) : 
                    $feature_text = !empty($item['feature_text_l7']) ? $widget->parse_text_editor($item['feature_text_l7']) : '';
                    $feature_desc = !empty($item['feature_desc_l7']) ? $item['feature_desc_l7'] : '';
                    $icon_data    = isset($item['feature_icon_l7']) ? $item['feature_icon_l7'] : null;

                    $has_icon     = is_array($icon_data) ? !empty($icon_data['value']) : !empty($icon_data);

                    $icon_key = $widget->get_repeater_setting_key('feature_icon_l7', 'icons', $key);
                    if ($icon_key) {
                        $widget->add_render_attribute($icon_key, [
                            'aria-hidden' => 'true',
                        ]);
                    }
                ?>
                    <li class="pxl-pricing__fea-item">
                        <?php
                        if ($has_icon) {
                            \Elementor\Icons_Manager::render_icon($icon_data, [ 'aria-hidden' => 'true' ], 'i');
                        } 
                        
                        if ($feature_text) { ?>
                            <span class="pxl-pricing__fea-item-title">
                                <?php echo pxl_print_html($feature_text); ?>
                            </span>
                        <?php }
                        if ($feature_desc): ?>
                            <span class="pxl-pricing__fea-item-content">
                                <?php echo pxl_print_html($widget->parse_text_editor($feature_desc)); ?>
                            </span>
                        <?php endif; ?>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </div>

    <div class="pxl-pricing__button">
        <?php
            if ( !empty($settings['btn_text_l7']) ) {
                $btn_url      = isset($settings['btn_link_l7']['url']) ? $settings['btn_link_l7']['url'] : '';
                $is_external  = !empty($settings['btn_link_l7']['is_external']);
                $nofollow     = !empty($settings['btn_link_l7']['nofollow']);

                $widget->add_render_attribute('btn_link_l7', 'href', esc_url($btn_url));
                if ($is_external) {
                    $widget->add_render_attribute('btn_link_l7', 'target', '_blank');
                    $rel_parts = ['noopener','noreferrer'];
                    if ($nofollow) $rel_parts[] = 'nofollow';
                    $widget->add_render_attribute('btn_link_l7', 'rel', implode(' ', $rel_parts));
                } elseif ($nofollow) {
                    $widget->add_render_attribute('btn_link_l7', 'rel', 'nofollow');
                }
                ?>
                <a <?php pxl_print_html($widget->get_render_attribute_string('btn_link_l7')); ?>
                class=" <?php echo esc_attr($btn_active_class); ?>">
                    <?php echo pxl_print_html($widget->parse_text_editor($settings['btn_text_l7'])); ?>
                </a>
            <?php } 
        ?>
    </div>
</div>
