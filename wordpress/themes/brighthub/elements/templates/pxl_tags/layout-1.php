<?php
$settings = $widget->get_settings_for_display();
$args = array(
    'taxonomy'   => 'post_tag',
    'orderby'    => 'name',
    'order'      => 'ASC',
    'hide_empty' => true,
);

$tags = get_terms($args);

if (!empty($tags)) :
    echo '<div class="pxl-tags pxl-tags--widget">';
    echo '<ul class="pxl-tag__list">';
    foreach ($tags as $tag) {
        echo '<li class="pxl-tag__item">';
            echo '<a href="' . esc_url(get_tag_link($tag->term_id)) . '" class="pxl-tag__link">';
                if($settings['show_tags'] === 'true'){
                    echo '#';
                }
                echo esc_html($tag->name);
            echo '</a>';
        echo '</li>';
    }
    echo '</ul>';
    echo '</div>';
endif;
?>
