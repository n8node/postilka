<?php
    $main_color = $settings['blob_color'];
    $highlight_color = $settings['blob_color_nd'];
?>
<div class="pxl-blob <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <canvas class="pxl-star" data-star="80"></canvas>
    <div class="pxl-blob__wrap">
        <div class="pxl-blob__shape-1"></div>
        <svg class="svg-1" xmlns="http://www.w3.org/2000/svg" width="1119" height="969" viewBox="0 0 1119 969" fill="none">
            <path d="M559.319 0L635.295 379.946C661.112 509.055 728.681 626.087 827.584 713L1118.64 968.77L559.319 779.537L0 968.77L291.055 713C389.958 626.087 457.527 509.055 483.344 379.946L559.319 0Z" fill="<?php echo esc_attr($main_color); ?>"/>
        </svg>
        <svg class="svg-2" xmlns="http://www.w3.org/2000/svg" width="1119" height="969" viewBox="0 0 1119 969" fill="none">
            <path d="M559.319 0L635.295 379.946C661.112 509.055 728.681 626.087 827.584 713L1118.64 968.77L559.319 779.537L0 968.77L291.055 713C389.958 626.087 457.527 509.055 483.344 379.946L559.319 0Z" fill="<?php echo esc_attr($highlight_color); ?>"/>
        </svg>
        <svg class="pxl-blob__shape-2" width="1399" height="241" viewBox="0 0 1399 241" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g style="mix-blend-mode:plus-lighter" filter="url(#filter0_f_2725_4966)">
            <path d="M699.794 80.9658C975.633 80.9658 1215.03 119.739 1334.57 176.551C1207.87 123.371 971.042 87.5918 699.795 87.5918C428.535 87.5918 191.7 123.375 65.0029 176.559C184.535 119.743 423.943 80.9658 699.794 80.9658Z" fill="<?php echo esc_attr($main_color); ?>"/>
            </g>
            <g style="mix-blend-mode:plus-lighter" filter="url(#filter1_f_2725_4966)">
            <path d="M1334.59 176.558C1207.89 123.374 971.055 87.5919 699.794 87.5919C428.533 87.5919 191.697 123.375 65 176.558C184.531 119.742 423.942 65 699.794 65C975.646 65 1215.06 119.742 1334.59 176.558Z" fill="#013D3D"/>
            </g>
            <defs>
            <filter id="filter0_f_2725_4966" x="56.7029" y="72.6658" width="1286.17" height="112.193" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="4.15" result="effect1_foregroundBlur_2725_4966"/>
            </filter>
            <filter id="filter1_f_2725_4966" x="0.599998" y="0.599998" width="1398.39" height="240.358" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="32.2" result="effect1_foregroundBlur_2725_4966"/>
            </filter>
            </defs>
        </svg>
    </div>
</div>