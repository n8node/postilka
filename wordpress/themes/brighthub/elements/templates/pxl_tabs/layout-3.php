<?php $title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'span'; ?>
<div class="pxl-tabs pxl-tabs--layout-3 pxl-tabs--toogle-<?php echo esc_attr($settings['style_toggle_buttons']); ?> <?php if($settings['enable_calculator_number'] === 'true' || $settings['enable_switch_currency'] === 'true') : ?> pxl-tabs--layout-3-form <?php endif; ?> <?php echo esc_attr($settings['tab_effect'].' '.$settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-tabs__inner">
        <?php if($settings['enable_calculator_number'] === 'true' || $settings['enable_switch_currency'] === 'true') : ?>
           <form action="javascript:void(0);">
        <?php endif; ?>
        <div class="pxl-tabs__switch" >
            <div class="pxl-tabs__switch-btn" data-st="<?php echo esc_attr($settings['tab1_text']); ?>" data-nd="<?php echo esc_attr($settings['tab2_text']); ?>">
                <input type="checkbox" class="toggleTab-checkobx">
                <label for="toggleTab" class="toggleTab"></label>
            </div>
            <span class="pxl-tabs__switch-txt"><?php echo esc_html($settings['tab1_text']); ?></span>
            <?php if(!empty($settings['sale_txt'])) : ?>
                <span class="pxl-tabs__switch-sale"><?php echo esc_html($settings['sale_txt']); ?></span>
            <?php endif; ?>
        </div>
        <?php if ($settings['enable_calculator_number'] === 'true') : ?>
            <div class="pxl-tabs__input-number-group">
                <?php foreach ($settings['number_item_select_map'] as $key => $item) : ?>
                    <div class="pxl-tabs__input-number">
                        <input 
                            type="radio" 
                            name="quantity" 
                            id="quantity-<?php echo esc_attr($item['item_select_map']); ?>" 
                            value="<?php echo esc_attr($item['item_select_map']); ?>"
                            <?php if($key === 0) : ?>checked<?php endif; ?>
                        >
                        <label for="quantity-<?php echo esc_attr($item['item_select_map']); ?>">
                            <span class="pxl-tabs__input-number-txt"><?php echo esc_html($item['item_select_map']); ?></span> <span class="pxl-tabs__input-number-txt-after"><?php echo esc_html($item['item_select_text_after']); ?></span>
                        </label>
                    </div>
                <?php endforeach; ?>
                <?php if ($settings['show_custom_select'] === 'true') : ?>
                    <div class="pxl-tabs__input-number">
                        <input type="radio" name="quantity" id="quantity-custom" value="custom">
                        <label for="quantity-custom">Custom</label>
                    </div>
                    <div class="pxl-tabs__input-number pxl-tabs__input-number-custom">
                        <input type="number" value="1" name="quantity_custom" min="1">
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        <?php if (!empty($settings['enable_switch_currency']) && $settings['enable_switch_currency'] === 'true') :
            $listDataCurrency = $settings['list_data_currency'];
            $currencies = [];
            $currenciesSymbol = [];
            $priceForPlan = [];
            $priceForPlanAnnual = [];

            foreach ($listDataCurrency as $item) {
                $currencies[] = $item['currency'];
                $currenciesSymbol[] = $item['currency_symbol'];
                $priceForPlan[] = explode(',', $item['price_for_plan']);
                $priceForPlanAnnual[] = explode(',', $item['price_for_plan_annual']);
            }
            ?>

            <div class="pxl-tabs__switch-currency" data-currencies="<?php echo esc_attr(implode(',', $currencies)); ?>">
                <?php foreach ($currencies as $key => $currency) : ?>
                    <div class="pxl-tabs__switch-currency-item">
                    <input 
                        type="radio" 
                        name="currency" 
                        id="currency-<?php echo esc_attr($currency); ?>" 
                        value="<?php echo esc_attr($currency); ?>" 
                        <?php if ($currency === 'USD') : ?>checked<?php endif; ?>
                        data-symbol="<?php echo esc_attr($currenciesSymbol[$key] ?? ''); ?>"
                        data-price-for-plan="<?php echo esc_attr(implode(',', $priceForPlan[$key] ?? '')); ?>"
                        data-price-for-plan-annual="<?php echo esc_attr(implode(',', $priceForPlanAnnual[$key] ?? '')); ?>"
                    >
                        <label for="currency-<?php echo esc_attr($currency); ?>">
                            <?php echo esc_html($currency); ?>
                        </label>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <?php if($settings['enable_calculator_number'] === 'true' || $settings['enable_switch_currency'] === 'true') : ?>
           </form>
        <?php endif; ?>
        <div class="pxl-tabs__content">
            <div class="pxl-tabs__item active">
                <?php
                    $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$settings['content_template_tab_1']);
                    $tab_bd_ids[] = (int)$settings['content_template_tab_1'];
                    pxl_print_html($tab_content);
                ?>  
            </div>
            <div class="pxl-tabs__item">
                <?php
                    $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$settings['content_template_tab_2']);
                    $tab_bd_ids[] = (int)$settings['content_template_tab_2'];
                    pxl_print_html($tab_content);
                ?>  
            </div>
        </div>
    </div>
</div>