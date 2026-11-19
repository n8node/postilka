<?php
$html_id = pxl_get_element_id($settings);
$is_link = !empty($settings['link']['url']);
$tag     = $is_link ? 'a' : 'span';
if ( $is_link ) {
    $widget->add_render_attribute( 'button', 'href', $settings['link']['url'] );

    if ( $settings['link']['is_external'] ) {
        $widget->add_render_attribute( 'button', 'target', '_blank' );
    }

    if ( $settings['link']['nofollow'] ) {
        $widget->add_render_attribute( 'button', 'rel', 'nofollow' );
    }
}

$template = (int)$widget->get_setting('popup_template','0');
if($template > 0 ){
    if ( !has_action( 'pxl_anchor_target_page_popup_'.$template) ){
        add_action( 'pxl_anchor_target_page_popup_'.$template, 'brighthub_hook_anchor_page_popup' );
    } 
}
?>

<div id="pxl-<?php echo esc_attr($html_id ?? ''); ?>"
     class="pxl-button pxl-button--<?php echo esc_attr($settings['btn_style'] ?? ''); ?> pxl-button--rotate-<?php echo esc_attr($settings['style_rotate_button'] ?? ''); ?> pxl-button--rotate-<?php echo esc_attr($settings['style_rotate_button_type'] ?? ''); ?> <?php echo esc_attr(($settings['btn_action'] ?? '') . ' ' . ($settings['pxl_animate'] ?? '')); ?>"
     data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay'] ?? 0); ?>ms"
     data-onepage-offset="<?php echo esc_attr($settings['btn_offset']['size'] ?? 0); ?>">
     <?php if($settings['btn_arrow_target'] == 'true' && $settings['btn_arrow_target_type'] == 'arrow'):?>
        <svg width="121" height="65" viewBox="0 0 121 65" fill="none" xmlns="http://www.w3.org/2000/svg" class="pxl-button__arrow-target pxl-button__arrow-target--arrow">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M59.9122 18.0186C58.2515 17.7192 56.5737 17.5236 54.8887 17.433C47.8831 17.0824 40.8868 18.2886 34.4029 20.9648C27.919 23.641 22.1087 27.7206 17.3898 32.9104C13.9375 36.5444 10.9708 40.6106 8.5641 45.0075C6.21569 49.4129 4.40432 54.0842 3.16884 58.9212C3.11222 59.1175 3.13522 59.3282 3.23285 59.5077C3.33048 59.6872 3.49489 59.8211 3.69047 59.8802C3.78741 59.9082 3.88895 59.9168 3.9892 59.9053C4.08946 59.8938 4.18645 59.8626 4.27457 59.8135C4.36269 59.7643 4.44019 59.6981 4.5026 59.6188C4.565 59.5395 4.61106 59.4487 4.63813 59.3515C6.13634 54.7471 8.12637 50.3176 10.5737 46.1397C12.9681 41.9592 15.8427 38.0727 19.1391 34.5593C23.6341 29.6729 29.1545 25.8415 35.3045 23.3397C41.4545 20.8378 48.0819 19.7275 54.7115 20.0882C55.944 20.1647 57.148 20.2865 58.3392 20.4794C57.1997 22.4186 56.2158 24.4451 55.3968 26.54C50.4071 39.5538 52.5091 53.8639 64.9411 61.3977C72.5337 66.0584 79.4794 64.1807 83.8292 59.381C86.0194 56.7654 87.516 53.6405 88.1808 50.2944C88.8456 46.9483 88.6574 43.4887 87.6335 40.2344C84.3071 29.1409 74.3477 21.2432 62.1624 18.4638C67.3261 11.0665 74.9033 5.69687 83.5937 3.27618C90.0858 1.56966 96.9435 1.87889 103.256 4.16277C107.661 5.79423 111.763 8.14987 115.393 11.1325C117.02 12.3618 118.567 13.6947 120.023 15.123C120.071 15.1837 120.14 15.2231 120.217 15.2328C120.294 15.2424 120.371 15.2215 120.433 15.1745C120.463 15.1488 120.488 15.1171 120.505 15.0812C120.522 15.0454 120.531 15.0064 120.532 14.9667C120.533 14.927 120.526 14.8875 120.511 14.8509C120.495 14.8142 120.472 14.7813 120.443 14.7542C119.323 12.979 118.025 11.3233 116.567 9.81306C112.967 6.38983 108.681 3.77009 103.993 2.12719C97.2847 -0.332219 89.9785 -0.650342 83.0816 1.21667C73.5923 3.85506 65.3685 9.81873 59.9122 18.0186ZM60.5882 20.8763C59.3435 22.9037 58.2858 25.04 57.4282 27.259C52.847 39.2168 54.7286 52.4403 66.2184 59.2575C72.5495 62.9542 78.1671 61.4303 81.7181 57.4265C83.5775 55.1843 84.8505 52.5151 85.4226 49.659C85.9947 46.8029 85.848 43.8494 84.9957 41.064C81.8492 30.5415 72.2086 23.2703 60.5768 20.8692L60.5882 20.8763Z" fill="url(#paint0_linear_3790_8692)"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M3.5093 59.2609C3.57574 56.6311 3.63354 52.6523 3.651 52.2206L3.70373 44.6662L3.04398 32.3186C3.04441 32.2534 3.03197 32.1888 3.00737 32.1284C2.98278 32.068 2.94651 32.0131 2.90066 31.9667C2.8548 31.9204 2.80024 31.8835 2.74012 31.8583C2.68 31.8331 2.6155 31.82 2.5503 31.8197C2.41651 31.8205 2.28842 31.8739 2.19372 31.9684C2.09903 32.063 2.04534 32.191 2.04429 32.3247L1.27417 44.5829L0.772683 52.1724C0.753731 52.6822 0.550871 58.3564 0.50888 60.6695C0.459503 61.444 0.683946 62.2113 1.14296 62.8371C1.447 63.0238 1.79744 63.1213 2.15425 63.1184C2.51107 63.1155 2.85987 63.0123 3.16081 62.8205C4.5179 61.8537 5.77993 60.7598 6.92982 59.5539L19.3458 48.362C23.577 44.4838 25.2563 43.5439 24.3699 42.4355C24.1997 42.2024 23.893 42.1368 23.1346 42.2624C22.8657 42.3493 22.6169 42.489 22.4029 42.6735C20.807 43.8842 19.2863 45.1911 17.8494 46.587L5.03618 57.4036C4.92391 57.5071 4.23002 58.4636 3.5093 59.2609Z" fill="url(#paint1_linear_3790_8692)"/>
            <defs>
            <linearGradient id="paint0_linear_3790_8692" x1="6.67386" y1="63.0577" x2="121.405" y2="8.48555" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.578125" stop-color="white" stop-opacity="0.44"/>
            <stop offset="1" stop-color="white" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="paint1_linear_3790_8692" x1="6.67386" y1="63.0577" x2="121.405" y2="8.48555" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.578125" stop-color="white" stop-opacity="0.44"/>
            <stop offset="1" stop-color="white" stop-opacity="0"/>
            </linearGradient>
            </defs>
        </svg>
    <?php endif; ?>
    <?php if($settings['btn_arrow_target'] == 'true' && $settings['btn_arrow_target_type'] == 'cursor'):?>
        <svg xmlns="http://www.w3.org/2000/svg" width="45" height="46" viewBox="0 0 45 46" fill="none" class="pxl-button__arrow-target pxl-button__arrow-target--cursor">
            <g filter="url(#filter0_d_4005_7550)">
                <path d="M20.5322 24.656C20.7379 24.6797 20.9114 24.82 20.9776 25.0162L24.8811 33.2578L34.1007 7.27677L8.55897 17.6543L17.5744 21.4248C17.7032 21.4673 17.8087 21.5609 17.8663 21.6836L17.9486 21.8261C18.0037 22.0268 17.9461 22.2416 17.7981 22.3879L9.96344 30.6154L12.366 32.885L19.9719 24.837C20.1229 24.6971 20.3278 24.6309 20.5322 24.656Z" fill="black"/>
                <path d="M34.8073 7.52794L25.588 33.509L24.9802 35.2198L24.2031 33.579L20.3773 25.4993L12.9114 33.4001L12.3964 33.9455L11.851 33.4305L9.4488 31.1604L8.90105 30.6434L9.42044 30.0977L17.0959 22.0364L8.26924 18.3459L6.59126 17.6446L8.27614 16.9594L33.8182 6.58233L35.3664 5.95344L34.8073 7.52794Z" stroke="white" stroke-width="1.5"/>
            </g>
            <defs>
                <filter id="filter0_d_4005_7550" x="0.623413" y="0.628906" width="44.0084" height="44.5537" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="2" dy="2"/>
                <feGaussianBlur stdDeviation="3"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0.0941176 0 0 0 0 0.113725 0 0 0 0 0.152941 0 0 0 0.24 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_4005_7550"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_4005_7550" result="shape"/>
                </filter>
            </defs>
        </svg>
    <?php endif; ?>
    <?php if($settings['btn_arrow_target'] == 'true' && $settings['btn_arrow_target_type'] == 'custom'):?>
        <span class="pxl-button__arrow-target pxl-button__arrow-target--custom">
            <?php \Elementor\Icons_Manager::render_icon( $settings['btn_arrow_target_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
        </span>
    <?php endif; ?>
    <?php if($settings['btn_style'] === 'btn__linear-blur'):?>
        <div class="pxl-button__linear-blur"></div>
    <?php endif; ?>
    <<?php echo esc_attr($tag); ?> <?php pxl_print_html($widget->get_render_attribute_string( 'button' )); ?>  class="btn <?php echo esc_attr($settings['btn_space_between'] == 'true' ? 'btn-space-between' : ''); ?> <?php echo esc_attr($settings['btn_glossy'] == 'true' ? 'btn-glossy' : ''); ?> <?php if(!empty($settings['btn_icon'])) { echo 'btn__icon-active'; } ?> <?php echo esc_attr($settings['btn_text_effect'].' '.$settings['btn_style'].' btn__icon-'.$settings['icon_align']); ?> <?php echo esc_attr($settings['btn_action'] == 'btn__popup-video' ? 'pxl-video__popup' : ''); ?> <?php echo esc_attr($settings['btn_hover_animation']); ?>">
        <?php if(!empty($settings['btn_icon']['value'])) { ?>
            <span class="btn-icon">
                <?php \Elementor\Icons_Manager::render_icon( $settings['btn_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
            </span>
        <?php } ?>
        <?php if(!empty($settings['btn_icon_image']['id']) && (empty($settings['btn_icon']['value']) || !isset($settings['btn_icon']['value']))) { ?>
            <span class="btn-icon">
                <?php 
                $img_icon = pxl_get_image_by_size(array(
                    'attach_id'  => $settings['btn_icon_image']['id'],
                    'thumb_size' => 'full',
                ));
                if (!empty($img_icon['thumbnail'])) {
                    echo pxl_print_html($img_icon['thumbnail']); 
                }
                ?>
            </span>
        <?php } ?>
        <?php if(!empty($settings['text'])) { ?>
            <span class="btn-text" data-text="<?php echo esc_attr($settings['text']); ?>">
                <?php if($settings['btn_text_effect'] == 'btn-text-nina' || $settings['btn_text_effect'] == 'btn-text-nanuk') {
                        $chars = preg_split('//u', $settings['text'], -1, PREG_SPLIT_NO_EMPTY);

                        foreach ($chars as $value) {
                            if($value == ' ') {
                                echo '<span class="spacer">&nbsp;</span>';
                            } else {
                                echo '<span>' . htmlspecialchars($value) . '</span>';
                            }
                        }
                    } else {
                        echo pxl_print_html($settings['text']);
                    }
                ?>
            </span>
        <?php } ?>
    </<?php echo esc_attr($tag); ?>>
</div>