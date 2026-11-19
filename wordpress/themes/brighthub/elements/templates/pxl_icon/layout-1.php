<?php
$is_new = \Elementor\Icons_Manager::is_migration_allowed();
$default_settings = [
	'icon_align' => 'left',
];
$settings = array_merge($default_settings, $settings);
if(isset($settings['icons']) && !empty($settings['icons']) && count($settings['icons'])): ?>
    <div class="pxl-icons pxl-icons__<?php echo esc_attr($settings['style'].' pxl-icons__'.$settings['icon_arrange'].' pxl-icons__'.$settings['icon_align']. ' '.$settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
        <?php if($settings['style'] == 'style-3'): ?>
            <div class="half-circle-wrap">
                <div class="half-circle half-circle--1"></div>
                <div class="half-circle half-circle--2"></div>
                <div class="half-circle half-circle--3"></div>
            </div>
        <?php endif; ?>
        <?php foreach ($settings['icons'] as $key => $value):
            $label = isset($value['label']) ? $value['label'] : '';
            $label_position = isset($value['label_position']) ? $value['label_position'] : '';
            $icon_key = $widget->get_repeater_setting_key( 'pxl_icon', 'icons', $key );
            $widget->add_render_attribute( $icon_key, [
                'class' => $value['pxl_icon'],
                'aria-hidden' => 'true',
            ] );
            $link_key = $widget->get_repeater_setting_key( 'icon_link', 'value', $key );
            if ( ! empty( $value['icon_link']['url'] ) ) {
                $widget->add_render_attribute( $link_key, 'href', $value['icon_link']['url'] );

                if ( $value['icon_link']['is_external'] ) {
                    $widget->add_render_attribute( $link_key, 'target', '_blank' );
                }

                if ( $value['icon_link']['nofollow'] ) {
                    $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                }
            }
            $link_attributes = $widget->get_render_attribute_string( $link_key ); ?>
            <?php if ( ! empty( $value['pxl_icon'] ) ) : ?>
                <<?php echo esc_attr($link_attributes ? 'a' : 'span'); ?> 
                    class="pxl-icons__item elementor-repeater-item-<?php echo esc_attr($value['_id']); ?> <?php echo esc_attr($label_position); ?>" 
                    <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                    
                    <?php if ( $is_new ):
                        \Elementor\Icons_Manager::render_icon( $value['pxl_icon'], [ 'aria-hidden' => 'true' ] );
                    elseif ( ! empty( $value['pxl_icon'] ) ): ?>
                        <i class="<?php echo esc_html( $value['pxl_icon'] ); ?>" aria-hidden="true"></i>
                    <?php endif; ?>

                    <?php if ( ! empty( $label ) ) : ?>
                        <span class="pxl-icons__item-label"><?php echo esc_html( $label ); ?></span>
                    <?php endif; ?>
                    
                </<?php echo esc_attr($link_attributes ? 'a' : 'span'); ?>>
            <?php endif; ?>
        <?php endforeach; ?>
    </div>
<?php endif; ?>