<?php
$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'span';
if (isset($settings['lists']) && !empty($settings['lists']) && count($settings['lists'])): ?>
    <div class="pxl-list-feature pxl-list-feature--layout-1">
        <ul class="pxl-list-feature__inner">
            <?php foreach ($settings['lists'] as $key => $value): ?>
                <li class="pxl-list-feature__item">
                    <span class="pxl-list-feature__item-dot"></span>
                    <span class="pxl-list-feature__item-icon">
                        <?php 
                            if (isset($value['icon_type']) && $value['icon_type'] == 'icon' && !empty($value['content_icon'])) {
                                \Elementor\Icons_Manager::render_icon($value['content_icon'], ['aria-hidden' => 'true', 'class' => ''], 'i');
                            } elseif (isset($value['icon_type']) && $value['icon_type'] == 'image' && !empty($value['content_icon_image']['url'])) {
                                echo '<img src="' . esc_url($value['content_icon_image']['url']) . '" alt="icon" />';
                            }
                        ?>
                    </span>
                    <span class="pxl-list-feature__item-content">
                        <<?php echo esc_attr($title_tag); ?> class="pxl-list-feature__item-title">
                            <?php 
                                if (isset($value['title'])) {
                                    echo esc_html($value['title']); 
                                }
                            ?>
                        </<?php echo esc_attr($title_tag); ?>>
                        <span class="pxl-list-feature__item-description">
                            <?php 
                                if (isset($value['description'])) {
                                    echo esc_html($value['description']); 
                                }
                            ?>
                        </span>
                    </span>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>