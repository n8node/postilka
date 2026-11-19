<div class="pxl-office" <?php echo esc_attr($settings['pxl_animate']); ?> data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-office__image">
        <?php $image_size = 'full';
            if(!empty($settings['image']['id'])) : 
                $img_id = $settings['image']['id']; 
            endif;
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => $img_id,
                'thumb_size' => $image_size,
                'class' => ''
            ) );
            $thumbnail    = $img['thumbnail'];
            $thumbnail_url    = $img['url']; ?>
        <?php if ( ! empty( $img_id ) ) { echo wp_kses_post($thumbnail); } ?>
        <ul class="pxl-office__pos">
            <?php foreach ($settings['office'] as $key => $item):
                $flag = isset($item['image_flag']) ? $item['image_flag'] : '';
                $img_flag = pxl_get_image_by_size([
                    'attach_id'  => $flag['id'],
                    'thumb_size' => 'full',
                    'class' => ''
                ]);
                $thumbnail_flag = $img_flag['thumbnail'];?>
                <li class="pxl-office__pos-item elementor-repeater-item-<?php echo esc_attr($item['_id']); ?> <?php if($key === 0) echo 'active'; ?>">
                    <?php if ( ! empty( $thumbnail_flag ) ) { echo wp_kses_post($thumbnail_flag); } ?>
                    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="81" viewBox="0 0 52 81" fill="none">
                        <g filter="url(#filter0_i_9_10)">
                        <ellipse cx="26" cy="75.5" rx="12" ry="5.5" fill="#F04438"/>
                        </g>
                        <path d="M25.9805 0C40.2425 0.000153503 52 11.5257 52 25.7852C52 32.9706 49.4217 39.6417 45.1777 45.2959C40.4957 51.5329 34.7242 56.9669 28.2285 61.2324C26.7419 62.2181 25.4002 62.2926 23.7686 61.2324C17.2359 56.967 11.4652 51.5328 6.82324 45.2959C2.57608 39.6417 3.11286e-05 32.9707 0 25.7852C0 11.5256 11.7584 0 25.9805 0ZM25.9805 17.9111C21.2646 17.9113 17.419 21.8512 17.4189 26.5908C17.4189 31.3677 21.2646 35.1249 25.9805 35.125C30.6996 35.125 34.583 31.3678 34.583 26.5908C34.583 21.8511 30.6995 17.9111 25.9805 17.9111Z" fill="#F04438"/>
                        <defs>
                        <filter id="filter0_i_9_10" x="14" y="70" width="24" height="14.3061" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                        <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" result="hardAlpha"/>
                        <feOffset dy="3.30612"/>
                        <feGaussianBlur stdDeviation="2.56224"/>
                        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                        <feColorMatrix type="matrix" values="0 0 0 0 0.418025 0 0 0 0 0 0 0 0 0 0.00696708 0 0 0 0.48 0"/>
                        <feBlend mode="normal" in2="shape" result="effect1_innerShadow_9_10"/>
                        </filter>
                        </defs>
                    </svg>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
    <div class="pxl-office__content">
        <?php foreach ($settings['office'] as $key => $content) : ?>
            <div class="pxl-office__content-item <?php if($key === 0) echo 'active'; ?>">
                <?php if(!empty($content['content_template'])) {
                    $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$content['content_template']);
                    $tab_bd_ids[] = (int)$content['content_template'];
                    pxl_print_html($tab_content);
                } ?>
            </div>
        <?php endforeach; ?>
    </div>
</div>
