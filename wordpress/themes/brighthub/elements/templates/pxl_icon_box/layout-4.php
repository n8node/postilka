<div class="pxl-icon-box pxl-icon-box--layout-4">
    <div class="pxl-icon-box__inner">
        <svg width="419" height="155" viewBox="0 0 419 155" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="-7.5" y="0.5" width="444" height="444" rx="222" stroke="url(#paint0_linear_4809_31424)" stroke-opacity="0.8"/>
            <defs>
            <linearGradient id="paint0_linear_4809_31424" x1="214.5" y1="0" x2="214.5" y2="182.045" gradientUnits="userSpaceOnUse">
            <stop stop-color="#CCF3FF"/>
            <stop offset="1" stop-color="#CCF3FF" stop-opacity="0"/>
            </linearGradient>
            </defs>
        </svg>
        <ul class="pxl-icon-box__list">
            <?php
                foreach ($settings['list_f4'] as $key => $item):
                    $icon_key = $widget->get_repeater_setting_key( 'pxl_icon4', 'icons', $key );
                    $widget->add_render_attribute( $icon_key, [
                        'class' => $item['pxl_icon4'],
                        'aria-hidden' => 'true',
                    ] );?>
                    <li class="pxl-icon-box__item">
                        <?php if($key == 0){ ?>
                          <span class="pxl-icon-box__item-overlay"></span>
                        <?php } ?>
                        <?php \Elementor\Icons_Manager::render_icon( $item['pxl_icon4'], [ 'aria-hidden' => 'true' ], 'i' ); ?>
                    </li>
            <?php endforeach; ?>
        </ul>
    </div>
</div>