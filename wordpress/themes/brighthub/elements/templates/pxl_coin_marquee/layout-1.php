<div class="pxl-marquee  <?php echo esc_attr($settings['fading'] ) == 'true' ? 'pxl-marquee--fading horizontal mb-horizontal' : ''; ?> pxl-marquee--coin <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms"  data-list-number="<?php echo esc_attr($settings['list_number']); ?>">
    <?php for ($i = 0; $i < $settings['list_number']; $i++) : ?>
        <ul class="pxl-marquee__list pxl-marquee__list--<?php echo esc_attr($i); ?> <?php if($i%2==0) { echo esc_attr('pxl-marquee__left');} else {echo esc_attr('pxl-marquee__right');} ?>" style="animation-duration: 50s; animation-play-state: running;">

        </ul>
    <?php endfor; ?>
</div>
