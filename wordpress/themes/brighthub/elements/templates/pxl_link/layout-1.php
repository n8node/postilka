<?php
global $wp;
$html_id = pxl_get_element_id($settings); ?>
<?php if(isset($settings['link']) && !empty($settings['link']) && count($settings['link'])): ?>
<div class="pxl-link pxl-link__<?php echo esc_attr($settings['style'].' pxl-link__'.$settings['type']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
    <?php if(!empty($settings['title'])): ?>
        <div class="pxl-link__title"><?php echo esc_html($settings['title']); ?></div>
    <?php endif; ?>
    <?php $current_url_path = home_url( add_query_arg( array(), $wp->request ) ); ?>
        <ul id="pxl-link-<?php echo esc_attr($html_id) ?>" class="pxl-link__wrap">
            <?php
                foreach ($settings['link'] as $key => $link):
                    $icon_key = $widget->get_repeater_setting_key( 'pxl_icon', 'icons', $key );
                    $widget->add_render_attribute( $icon_key, [
                        'class' => $link['pxl_icon'],
                        'aria-hidden' => 'true',
                    ] );
                    $link_key = $widget->get_repeater_setting_key( 'link', 'value', $key );
                    if ( ! empty( $link['link']['url'] ) ) {
                        $widget->add_render_attribute( $link_key, 'href', $link['link']['url'] );

                        if ( $link['link']['is_external'] ) {
                            $widget->add_render_attribute( $link_key, 'target', '_blank' );
                        }

                        if ( $link['link']['nofollow'] ) {
                            $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                        }
                    }
                    $link_attributes = $widget->get_render_attribute_string( $link_key );
                    $active_cls = '' ;
                    $current_id = get_the_ID();
                    if( $current_id > 0 ){
                        $current_url = get_the_permalink( $current_id, false );
                        if( $link['link']['url'] == $current_url || $link['link']['url'].'/' == $current_url || $link['link']['url'] == $current_url.'/')
                            $active_cls = 'active';
                    }
                    if( $link['link']['url'] == $current_url_path || $link['link']['url'].'/' == $current_url_path || $link['link']['url'] == $current_url_path.'/')
                        $active_cls = 'active';
                    $text = $widget->parse_text_editor( $link['text'] ); ?>
                    <li class="pxl-link__item <?php echo esc_attr($active_cls.' '.$settings['pxl_animate'])?> <?php echo esc_attr(($key + 1 === (int) $settings['active_item']) ? 'active' : ''); ?>" <?php if(!empty($link['link_offset'])): ?> data-onepage-offset="<?php echo esc_attr($link['link_offset']); ?>" <?php endif; ?>>
                        <a <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                            <?php if(!empty($link['pxl_icon']['value'])){ ?>
                                <span class="pxl-link__icon">
                                    <?php \Elementor\Icons_Manager::render_icon( $link['pxl_icon'], [ 'aria-hidden' => 'true' ], 'i' ); ?>
                                </span>
                            <?php } ?>
                            <span class="pxl-link--text"><?php echo pxl_print_html($text); ?></span>
                        </a>
                    </li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>