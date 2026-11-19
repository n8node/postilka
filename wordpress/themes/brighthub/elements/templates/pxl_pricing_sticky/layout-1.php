<?php
    $pricing_items = $settings['pricing_items'];
    $widget_instance = null;
    if (isset($this) && is_object($this)) {
        $widget_instance = $this;
    } elseif (isset($widget) && is_object($widget)) {
        $widget_instance = $widget;
    }
    $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div';
?>
<?php if(isset($pricing_items) && !empty($pricing_items) && is_array($pricing_items) && count($pricing_items)): ?>
    <div class="pxl-pricing-sticky pxl-pricing-sticky__layout-1" data-top-offset="<?php echo esc_attr($settings['top_offset']); ?>" data-top-next-item="<?php echo esc_attr($settings['data_top_next_item']); ?>">
        <?php foreach($pricing_items as $pricing_item): 
            $item_active = isset($pricing_item['active']) ? $pricing_item['active'] : 'no';
            $item_animate = isset($settings['pxl_animate']) ? $settings['pxl_animate'] : '';
            $item_animate_delay = isset($settings['pxl_animate_delay']) ? $settings['pxl_animate_delay'] : '';
            $item_plan = isset($pricing_item['plan']) ? $pricing_item['plan'] : '';
            $item_desc = isset($pricing_item['desc']) ? $pricing_item['desc'] : '';
            $item_currency = isset($pricing_item['currency']) ? $pricing_item['currency'] : '$';
            $item_price = isset($pricing_item['price']) ? $pricing_item['price'] : '';
            $item_period = isset($pricing_item['period']) ? $pricing_item['period'] : '';
            $item_btn_text = isset($pricing_item['btn_text']) ? $pricing_item['btn_text'] : '';
            $item_btn_link = isset($pricing_item['btn_link']) ? $pricing_item['btn_link'] : array('url' => '#');
            $feature = isset($pricing_item['feature']) ? $pricing_item['feature'] : '';
        ?>
            <div class="pxl-pricing pxl-pricing--layout-8 <?php echo esc_attr($item_active === 'yes' ? 'pxl-pricing__active' : ''); ?> <?php echo esc_attr($item_animate); ?>" data-wow-delay="<?php echo esc_attr($item_animate_delay); ?>ms">
                <div class="pxl-pricing__top">
                    <?php if (!empty($item_plan)) : ?>
                        <<?php echo esc_attr($title_tag); ?> class="pxl-pricing__plan">
                            <?php echo esc_html($item_plan); ?>
                        </<?php echo esc_attr($title_tag); ?>>
                    <?php endif; ?>
                    <p class="pxl-pricing__desc"><?php echo esc_html($item_desc); ?></p>
                    <div class="pxl-pricing__price">
                        <span class="pxl-pricing__price-detail"><?php echo esc_html($item_currency); ?><?php echo esc_html($item_price); ?></span><?php if($item_period): ?><span class="pxl-pricing__price-period">/<?php echo esc_html($item_period); ?></span><?php endif; ?>
                    </div>
                    <?php if (!empty($item_btn_text)) {
                        $btn_attrs = '';
                        $btn_href = isset($item_btn_link['url']) ? esc_url($item_btn_link['url']) : '#';
                        $btn_attrs .= ' href="' . $btn_href . '"';
                        
                        if (isset($item_btn_link['is_external']) && $item_btn_link['is_external']) {
                            $btn_attrs .= ' target="_blank"';
                        }
                        
                        if (isset($item_btn_link['nofollow']) && $item_btn_link['nofollow']) {
                            $btn_attrs .= ' rel="nofollow"';
                        }
                        ?>
                        <a class="pxl-pricing__button btn <?php echo esc_attr($item_active === 'yes' ? 'btn-secondary' : 'btn__transparent'); ?> btn-glossy"<?php echo $btn_attrs; ?>>
                            <?php echo esc_html($item_btn_text); ?>
                        </a>
                    <?php } ?>
                </div>
                <?php if(!empty($feature)): 
                    $feature_list = json_decode($feature, true); ?>
                    <ul class="pxl-pricing__featured">
                        <?php foreach ($feature_list as $value): ?>
                            <li>
                                <?php if(!empty($value['icon'])): ?>
                                    <i class="<?php echo esc_attr($value['icon']); ?>"></i>
                                <?php else: ?>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="16" height="16" rx="8" fill="#FB6514" fill-opacity="0.12"/>
                                        <path d="M11.9062 5.56931L6.78645 10.9022C6.75674 10.9332 6.72145 10.9578 6.6826 10.9746C6.64375 10.9914 6.60211 11 6.56006 11C6.51801 11 6.47637 10.9914 6.43753 10.9746C6.39868 10.9578 6.36339 10.9332 6.33367 10.9022L4.09377 8.56909C4.03373 8.50654 4 8.42172 4 8.33327C4 8.24482 4.03373 8.16 4.09377 8.09745C4.15382 8.03491 4.23525 7.99978 4.32016 7.99978C4.40508 7.99978 4.48651 8.03491 4.54655 8.09745L6.56006 10.1952L11.4534 5.09768C11.5135 5.03514 11.5949 5 11.6798 5C11.7647 5 11.8462 5.03514 11.9062 5.09768C11.9663 5.16022 12 5.24505 12 5.33349C12 5.42194 11.9663 5.50677 11.9062 5.56931Z" fill="#FB6514"/>
                                    </svg>
                                <?php endif; ?>
                                <?php echo pxl_print_html($value['url']); ?>
                            </li>
                          
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>