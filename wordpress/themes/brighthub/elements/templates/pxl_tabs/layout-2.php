<?php $html_id = pxl_get_element_id($settings);
$is_new = \Elementor\Icons_Manager::is_migration_allowed();
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'span';
if(isset($settings['tabs']) && !empty($settings['tabs']) && count($settings['tabs'])): 
    $tab_bd_ids = [];
    ?>
    <div class="pxl-tabs pxl-tabs--layout-2 <?php echo esc_attr($settings['tab_effect'].' '.$settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
        <div class="pxl-tabs__inner">
            <div class="pxl-tabs__list" data-count="<?php echo esc_attr($settings['show_count']); ?>">
                <?php if($settings['show_all_option']) : ?>
                    <span class="pxl-tabs__list-item pxl-tabs__list-item--viewall active" data-target=".<?php echo esc_attr($html_id.'-all'); ?>">
                        <?php echo esc_html($settings['view_all_txt']); ?>
                    </span>
                <?php endif;?>
                <?php foreach ($settings['tabs'] as $key => $title) :  ?>
                    <?php if ( !empty($title['pxl_icon']) || !empty($title['pxl_image']['id']) ) : ?>
                        
                    <?php endif; ?>
                    <<?php echo esc_attr($title_tag); ?> class="pxl-tabs__list-item <?php if($settings['tab_active'] == $key + 1 && !$settings['show_all_option']) { echo 'active'; } ?>" data-target=".<?php echo esc_attr($html_id.'-'.$title['_id']); ?>">
                        <div class="pxl-tabs__item-icon">
                            <?php \Elementor\Icons_Manager::render_icon( $title['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                            <?php if ( $title['icon_type'] == 'image' && !empty($title['pxl_image']['id']) ) : ?>
                            <?php $img_icon  = pxl_get_image_by_size( array(
                                    'attach_id'  => $title['pxl_image']['id'],
                                    'thumb_size' => 'full',
                                ) );
                                $thumbnail_icon    = $img_icon['thumbnail'];
                            echo pxl_print_html($thumbnail_icon); ?>
                            <?php endif; ?>
                        </div>
                        <?php echo pxl_print_html($title['title']); ?>
                    </<?php echo esc_attr($title_tag); ?>>
                <?php endforeach; ?>
            </div>

            <div class="pxl-tabs__content">
                <?php foreach ($settings['tabs'] as $key => $content) : 
                    $icon_key = $widget->get_repeater_setting_key( 'pxl_icon', 'icons', $key );
                    $widget->add_render_attribute( $icon_key, [
                        'class' => $content['pxl_icon'],
                        'aria-hidden' => 'true',
                    ] ); ?>
                    
                    <?php if($key === 0 && $settings['show_all_option']) : ?>
                        <div class="pxl-tabs__item active pxl-tabs__item-all <?php echo esc_attr($html_id.'-all'); ?>" data-show="<?php echo esc_attr($settings['df_number']); ?>"></div>
                    <?php endif; ?>
                    <div class="pxl-tabs__item <?php echo esc_attr($html_id.'-'.$content['_id']); ?> <?php if($settings['tab_active'] == $key + 1 && !$settings['show_all_option']) { echo 'active'; } ?> <?php if($content['content_type'] == 'template') { echo 'pxl-tabs--elementor'; } ?>" <?php if($settings['tab_active'] == $key + 1 && !$settings['show_all_option']) { ?>style="display: block;"<?php } ?>>
                        <div class="pxl-tabs__item-inner">
                            <?php if($content['content_type'] == 'df' && !empty($content['desc'])) {
                                echo pxl_print_html($content['desc']); 
                            } elseif($content['content_type'] == 'template' && !empty($content['content_template'])) {
                                $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$content['content_template']);
                                $tab_bd_ids[] = (int)$content['content_template'];
                                pxl_print_html($tab_content);
                            } ?>        
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            <?php if($settings['show_load_more']): ?>
                <div class="pxl-tabs__faqs-loadmore" loading-data="<?php echo esc_html($settings['load_more_text']); ?>">
                    <div class="pxl-tabs__loadmore btn btn-primary" >
                        <span><?php echo esc_html($settings['load_more_text']); ?></span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M9.92737 3.38823C9.34737 3.2149 8.70737 3.10156 8.0007 3.10156C4.80737 3.10156 2.2207 5.68823 2.2207 8.88156C2.2207 12.0816 4.80737 14.6682 8.0007 14.6682C11.194 14.6682 13.7807 12.0816 13.7807 8.88823C13.7807 7.70156 13.4207 6.5949 12.8074 5.6749" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10.7528 3.54536L8.82617 1.33203" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10.7535 3.54688L8.50684 5.18688" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
<?php endif; ?>