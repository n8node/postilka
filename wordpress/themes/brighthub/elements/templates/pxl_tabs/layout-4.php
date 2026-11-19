<?php $html_id = pxl_get_element_id($settings);
$is_new = \Elementor\Icons_Manager::is_migration_allowed();
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'span';
if(isset($settings['tabs']) && !empty($settings['tabs']) && count($settings['tabs'])): 
    $tab_bd_ids = [];
    ?>
    <div class="pxl-tabs pxl-tabs--layout-4 pxl-tabs--<?php echo esc_attr($settings['tabs_left_style']); ?> <?php echo esc_attr($settings['tab_effect'].' '.$settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
        <div class="pxl-tabs__inner">
            <div class="pxl-tabs__list">
                <?php foreach ($settings['tabs'] as $key => $title) :  ?>
                    <<?php echo esc_attr($title_tag); ?> class="pxl-tabs__list-item <?php if($settings['tab_active'] == $key + 1) { echo 'active'; } ?>" data-target=".<?php echo esc_attr($html_id.'-'.$title['_id']); ?>">
                        <?php $widget->add_render_attribute( $title['_id'], [
                            'class' => $title['pxl_icon'],
                            'aria-hidden' => 'true',
                        ] ); ?>
                        <?php \Elementor\Icons_Manager::render_icon( $title['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                        <?php echo pxl_print_html($title['title']); ?>
                    </<?php echo esc_attr($title_tag); ?>>
                <?php endforeach; ?>
            </div>

            <div class="pxl-tabs__content">
                <?php foreach ($settings['tabs'] as $key => $content) : 
                    $icon_key = $widget->get_repeater_setting_key( 'pxl_icon', 'icons', $key );
                   ?>
                    <div class="pxl-tabs__item <?php echo esc_attr($html_id.'-'.$content['_id']); ?> <?php if($settings['tab_active'] == $key + 1) { echo 'active'; } ?> <?php if($content['content_type'] == 'template') { echo 'pxl-tabs--elementor'; } ?>" <?php if($settings['tab_active'] == $key + 1) { ?>style="display: block;"<?php } ?>>
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
            
        </div>
    </div>
<?php endif; ?>