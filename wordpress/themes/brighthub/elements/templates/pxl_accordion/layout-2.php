<?php 
$active = intval($settings['active']); 
$accordion = $widget->get_settings('accordion_l2'); 
$wg_id = pxl_get_element_id($settings); 
if(!empty($accordion)) : 
?>
    <div class="pxl-accordion pxl-accordion--layout-2 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
        <?php foreach ($accordion as $key => $value):
            $is_active = ($key + 1) == $active;
            $pxl_id = isset($value['_id']) ? $value['_id'] : '';
            $title = isset($value['tit_l2']) ? $value['tit_l2'] : '';
            $desc = isset($value['desc_l2']) ? $value['desc_l2'] : '';
            $feaure = isset($value['fea_l2']) ? $value['fea_l2'] : '';
            $question = isset($value['ques_l2']) ? $value['ques_l2'] : '';
            $url_text = isset($value['url_txt_l2']) ? $value['url_txt_l2'] : '';
            $link_key = $widget->get_repeater_setting_key( 'url_l2', 'value', $key );
            if ( ! empty( $value['url_l2']['url'] ) ) {
                $widget->add_render_attribute( $link_key, 'href', $value['url_l2']['url'] );
                
                if ( $value['url_l2']['is_external'] ) {
                    $widget->add_render_attribute( $link_key, 'target', '_blank' );
                }
                
                if ( $value['url_l2']['nofollow'] ) {
                    $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                }
            }
            $link_attributes = $widget->get_render_attribute_string( $link_key );
        ?>
            <div class="pxl-accordion__item <?php echo esc_attr($is_active ? 'active' : ''); ?>">
                <<?php pxl_print_html($settings['title_tag']); ?> class="pxl-accordion__item-title" data-target="<?php echo esc_attr('#'.$wg_id.'-'.$pxl_id); ?>">
                    <span class="pxl-accordion__item-text"><?php echo wp_kses_post($title); ?></span>
                    <span class="pxl-accordion__item-action"></span>
                </<?php pxl_print_html($settings['title_tag']); ?>>
                <div id="<?php echo esc_attr($wg_id.'-'.$pxl_id); ?>" class="pxl-accordion__item-content" <?php if($is_active){ ?>style="display: block;"<?php } ?>>
                    <?php echo wp_kses_post(nl2br($desc)); ?>
                    <?php if (!empty($feaure)){ ?>
                        <?php echo wp_kses_post($feaure); ?>
                    <?php } ?>
                    <?php if (!empty($question) && !empty($url_text)){ ?>
                        <div class="pxl-accordion__item-question">
                            <?php if(!empty($question)): ?>
                                <p><img src="<?php echo esc_url(get_template_directory_uri(). '/assets/img/pin.png'); ?>" alt="<?php esc_attr_e('pin', 'brighthub'); ?>" loading="lazy" /><?php echo esc_html($question); ?></p>
                            <?php endif; ?>
                            <?php if(!empty($link_attributes)) : ?>
                                <a <?php echo esc_attr($link_attributes); ?>><?php echo esc_html($url_text); ?> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M9.62109 3.95312L13.6678 7.99979L9.62109 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M2.33203 8L13.552 8" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg></a>
                            <?php endif; ?>
                        </div>
                    <?php } ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>