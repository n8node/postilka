<?php
$settings = $widget->get_settings_for_display();
$number_of_categories = !empty($settings['number_of_categories']) ? (int) $settings['number_of_categories'] : 5;
$show_dot = $settings['show_dot'] === 'true';
$show_icon = $settings['show_icon'] === 'true';
$show_count = $settings['show_count'] === 'true';

$args = array(
    'taxonomy'   => 'category',
    'orderby'    => 'name',
    'order'      => 'ASC',
    'hide_empty' => true,
    'number'     => $number_of_categories,
);

$categories = get_categories($args);

if (!empty($categories)) :
    echo '<div class="pxl-categories">';
    echo '<ul class="pxl-category__list">';
    foreach ($categories as $category) {
        echo '<li class="pxl-category__item' . ($show_dot ? ' pxl-category__item--dot' : '') . '">';
            echo '<a href="' . esc_url(get_category_link($category->term_id)) . '" class="pxl-category__link">';
            echo '<span class="pxl-category__item-inner">';
                if ($show_icon) {
                    $image = get_category_image($category->term_id);    
                    if (!empty($image)) {
                        echo '<span class="pxl-category__item-icon"><img src="' . esc_url($image) . '" alt="' . esc_attr($category->name) . '" loading="lazy" /></span>';
                    }
                }
                    
                echo esc_html($category->name);
            echo '</span>';
            if ($show_count) {
                echo '<span class="pxl-category__item-count">' . esc_html($category->count) . '</span>';
            }
            echo '</a>';
        echo '</li>';
    }
    echo '</ul>';
    echo '</div>';
endif;
?>
