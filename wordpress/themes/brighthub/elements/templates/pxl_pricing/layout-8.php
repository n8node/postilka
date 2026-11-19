<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div'; ?>
<div class="pxl-pricing pxl-pricing--layout-8 <?php echo esc_attr($settings['active'] === 'yes' ? 'pxl-pricing__active' : ''); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-pricing__top">
        <?php if (!empty($settings['plan'])) : ?>
            <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__plan">
                <?php echo esc_html($settings['plan']); ?>
            </<?php echo esc_attr($title_tag); ?>>
        <?php endif; ?>
        <p class="pxl-pricing__desc"><?php echo esc_html($settings['desc']); ?></p>
        <div class="pxl-pricing__price">
            <span class="pxl-pricing__price-detail"><?php echo esc_html($settings['currency']); ?><?php echo esc_html($settings['price']); ?></span><?php if($settings['period']): ?><span class="pxl-pricing__price-period">/<?php echo esc_html($settings['period']); ?></span><?php endif; ?>
        </div>
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
    <?php if(isset($settings['feature']) && !empty($settings['feature']) && count($settings['feature'])): ?>
        <ul class="pxl-pricing__featured">
            <?php
                foreach ($settings['feature'] as $key => $link):
                    $feature_text = $widget->parse_text_editor( $link['feature_text'] ); ?>
                    <li>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="16" height="16" rx="8" fill="#FB6514" fill-opacity="0.12"/>
                            <path d="M11.9062 5.56931L6.78645 10.9022C6.75674 10.9332 6.72145 10.9578 6.6826 10.9746C6.64375 10.9914 6.60211 11 6.56006 11C6.51801 11 6.47637 10.9914 6.43753 10.9746C6.39868 10.9578 6.36339 10.9332 6.33367 10.9022L4.09377 8.56909C4.03373 8.50654 4 8.42172 4 8.33327C4 8.24482 4.03373 8.16 4.09377 8.09745C4.15382 8.03491 4.23525 7.99978 4.32016 7.99978C4.40508 7.99978 4.48651 8.03491 4.54655 8.09745L6.56006 10.1952L11.4534 5.09768C11.5135 5.03514 11.5949 5 11.6798 5C11.7647 5 11.8462 5.03514 11.9062 5.09768C11.9663 5.16022 12 5.24505 12 5.33349C12 5.42194 11.9663 5.50677 11.9062 5.56931Z" fill="#FB6514"/>
                        </svg>

                        <?php echo pxl_print_html($feature_text); ?>
                    </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
    
</div>