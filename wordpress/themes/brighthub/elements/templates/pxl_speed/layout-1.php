<div class="pxl-speed pxl-speed--layout-1">
    <?php
    if (empty($settings['lists']) || !is_array($settings['lists'])) {
        return;
    } else {
        foreach($settings['lists'] as $key => $list) : ?>
            <div class="pxl-speed__item <?php if($key == 0) echo esc_attr('active'); ?> elementor-repeater-item-<?php echo esc_attr($list['_id'] ?? ''); ?>" data-wow-delay="<?php echo esc_attr(isset($list['pxl_animate_delay']) ? $list['pxl_animate_delay'] : 0); ?>ms">
                <div class="pxl-speed__item-title"><?php echo esc_html($list['title'] ?? ''); ?></div>
                <div class="pxl-speed__item-speed"><?php echo esc_html($list['speed'] ?? ''); ?> <?php echo esc_html($list['unit'] ?? ''); ?></div>
                <?php if($key == 0) : ?>
                    <svg width="13" height="18" viewBox="0 0 13 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.8432 8.8114L4.56953 17.8103C4.48185 17.9053 4.36612 17.9687 4.23979 17.9911C4.11347 18.0134 3.98341 17.9935 3.86924 17.9342C3.75507 17.875 3.66298 17.7796 3.60688 17.6626C3.55077 17.5455 3.53369 17.4131 3.55822 17.2853L4.64118 11.7863L0.383929 10.1635C0.292498 10.1288 0.210964 10.0716 0.146609 9.99708C0.0822545 9.92257 0.0370844 9.83304 0.0151342 9.73648C-0.006816 9.63992 -0.00486248 9.53934 0.0208201 9.44374C0.0465026 9.34814 0.0951142 9.26048 0.162312 9.1886L8.436 0.189721C8.52368 0.0947344 8.63941 0.0312741 8.76573 0.00891613C8.89206 -0.0134418 9.02212 0.00651583 9.13629 0.0657774C9.25046 0.125039 9.34254 0.220389 9.39865 0.337439C9.45475 0.454489 9.47183 0.586887 9.44731 0.714656L8.36139 6.21972L12.6186 7.84027C12.7094 7.87522 12.7903 7.93233 12.8541 8.00654C12.918 8.08076 12.9628 8.1698 12.9848 8.26579C13.0067 8.36179 13.0049 8.46178 12.9797 8.55694C12.9545 8.6521 12.9066 8.7395 12.8403 8.8114H12.8432Z" fill="#E5CCFF"/>
                    </svg>
                <?php endif; ?>
            </div>  
        <?php endforeach;
    }
    ?>
</div>