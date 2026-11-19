<?php
if (!woocommerce_product_loop()) {
    return;
}

$shop_filter_title = brighthub()->get_theme_opt('shop_filter_title', 'Filter');
?>
<?php if (brighthub()->get_theme_opt('shop_filter')) : ?>
<div class="pxl-filter">
    <div class="pxl-overlay"></div>
    <div class="pxl-filter__header">
        <button type="button" class="pxl-filter__toggle">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12.75 8.5C12.75 8.69891 12.671 8.88968 12.5303 9.03033C12.3897 9.17098 12.1989 9.25 12 9.25H4C3.80109 9.25 3.61032 9.17098 3.46967 9.03033C3.32902 8.88968 3.25 8.69891 3.25 8.5C3.25 8.30109 3.32902 8.11032 3.46967 7.96967C3.61032 7.82902 3.80109 7.75 4 7.75H12C12.1989 7.75 12.3897 7.82902 12.5303 7.96967C12.671 8.11032 12.75 8.30109 12.75 8.5ZM14.5 4.75H1.5C1.30109 4.75 1.11032 4.82902 0.96967 4.96967C0.829018 5.11032 0.75 5.30109 0.75 5.5C0.75 5.69891 0.829018 5.88968 0.96967 6.03033C1.11032 6.17098 1.30109 6.25 1.5 6.25H14.5C14.6989 6.25 14.8897 6.17098 15.0303 6.03033C15.171 5.88968 15.25 5.69891 15.25 5.5C15.25 5.30109 15.171 5.11032 15.0303 4.96967C14.8897 4.82902 14.6989 4.75 14.5 4.75ZM9.5 10.75H6.5C6.30109 10.75 6.11032 10.829 5.96967 10.9697C5.82902 11.1103 5.75 11.3011 5.75 11.5C5.75 11.6989 5.82902 11.8897 5.96967 12.0303C6.11032 12.171 6.30109 12.25 6.5 12.25H9.5C9.69891 12.25 9.88968 12.171 10.0303 12.0303C10.171 11.8897 10.25 11.6989 10.25 11.5C10.25 11.3011 10.171 11.1103 10.0303 10.9697C9.88968 10.829 9.69891 10.75 9.5 10.75Z" fill="#181D27"/>
            </svg>
            <span><?php echo esc_html($shop_filter_title); ?></span>
        </button>

        <div class="pxl-filter__ordering">
            <?php woocommerce_catalog_ordering(); ?>
        </div>
    </div>

    <form method="get" class="pxl-filter__form">
        <button type="button" class="pxl-filter__close" aria-label="<?php esc_attr_e('Close filters', 'brighthub'); ?>">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12.5303 3.46967C12.8232 3.76256 12.8232 4.23744 12.5303 4.53033L9.06066 8L12.5303 11.4697C12.8232 11.7626 12.8232 12.2374 12.5303 12.5303C12.2374 12.8232 11.7626 12.8232 11.4697 12.5303L8 9.06066L4.53033 12.5303C4.23744 12.8232 3.76256 12.8232 3.46967 12.5303C3.17678 12.2374 3.17678 11.7626 3.46967 11.4697L6.93934 8L3.46967 4.53033C3.17678 4.23744 3.17678 3.76256 3.46967 3.46967C3.76256 3.17678 4.23744 3.17678 4.53033 3.46967L8 6.93934L11.4697 3.46967C11.7626 3.17678 12.2374 3.17678 12.5303 3.46967Z" fill="#181D27"/>
            </svg>
        </button>
        <div class="pxl-filter__content">

            <?php
            $cats = get_terms([
                'taxonomy'   => 'product_cat',
                'hide_empty' => true,
                'parent'     => 0,
            ]);
            if (!empty($cats) && !is_wp_error($cats)) : ?>
                <div class="pxl-filter__block pxl-filter__categories">
                    <h6><?php esc_html_e('Categories', 'brighthub'); ?></h6>
                    <ul class="pxl-checkbox-list pxl-categories-list">
                        <?php foreach ($cats as $cat) : 
                            $checked = false;
                            if (isset($_GET['product_cat'])) {
                                $selected_cats = is_array($_GET['product_cat']) ? $_GET['product_cat'] : array($_GET['product_cat']);
                                $checked = in_array($cat->slug, $selected_cats, true);
                            }
                        ?>
                            <li>
                                <label>
                                    <input type="checkbox" name="product_cat[]" value="<?php echo esc_attr($cat->slug); ?>" <?php checked($checked); ?>>
                                    <span class="checkbox-custom"></span>
                                    <?php echo esc_html($cat->name); ?> 
                                    <span class="count">(<?php echo absint($cat->count); ?>)</span>
                                </label>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <?php
            $product_attributes = wc_get_attribute_taxonomies();
            $attributes_with_terms = [];

            if (!empty($product_attributes)) {
                foreach ($product_attributes as $attr) {
                    $tax = wc_attribute_taxonomy_name($attr->attribute_name);
                    if (!taxonomy_exists($tax)) {
                        continue;
                    }
                    $terms = get_terms([
                        'taxonomy'   => $tax,
                        'hide_empty' => true,
                    ]);
                    if (empty($terms) || is_wp_error($terms)) {
                        continue;
                    }
                    $attributes_with_terms[] = [
                        'label' => $attr->attribute_label,
                        'tax'   => $tax,
                        'terms' => $terms,
                    ];
                }
            }

            if (!empty($attributes_with_terms)) : ?>
                <div class="pxl-filter__block pxl-filter__attributes">
                    <h6><?php esc_html_e('Attributes', 'brighthub'); ?></h6>
                    <?php foreach ($attributes_with_terms as $attr) : ?>
                        <div class="pxl-filter__item">
                            <strong><?php echo esc_html($attr['label']); ?>:</strong>
                            <ul class="pxl-checkbox-list pxl-attribute-list">
                                <?php foreach ($attr['terms'] as $term) :
                                    $checked = isset($_GET['filter_attr'][$attr['tax']]) && in_array($term->slug, $_GET['filter_attr'][$attr['tax']], true);
                                ?>
                                    <li>
                                        <label>
                                            <input type="checkbox" name="filter_attr[<?php echo esc_attr($attr['tax']); ?>][]" value="<?php echo esc_attr($term->slug); ?>" <?php checked($checked); ?>>
                                            <span class="checkbox-custom"></span>
                                            <?php echo esc_html($term->name); ?> 
                                            <span class="count">(<?php echo absint($term->count); ?>)</span>
                                        </label>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <?php
            global $wpdb;
            $prices = $wpdb->get_row(
                "SELECT
                    MIN(CAST(pm.meta_value AS DECIMAL(10,2))) AS min_price,
                    MAX(CAST(pm.meta_value AS DECIMAL(10,2))) AS max_price
                FROM {$wpdb->postmeta} pm
                JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                WHERE pm.meta_key = '_price' AND p.post_type = 'product' AND p.post_status = 'publish'"
            );
            $min_price = isset($prices->min_price) ? floatval($prices->min_price) : 0;
            $max_price = isset($prices->max_price) ? floatval($prices->max_price) : 0;
            $current_min = isset($_GET['min_price']) ? floatval($_GET['min_price']) : '';
            $current_max = isset($_GET['max_price']) ? floatval($_GET['max_price']) : '';
            ?>
            <div class="pxl-filter__block pxl-filter__price">
                <h6><?php esc_html_e('Price Range', 'brighthub'); ?></h6>
                <div class="pxl-price-inputs">
                    <div class="pxl-price-input">
                        <label><?php esc_html_e('Min', 'brighthub'); ?></label>
                        <input type="number" name="min_price" placeholder="<?php echo esc_attr($min_price); ?>" value="<?php echo esc_attr($current_min); ?>" min="<?php echo esc_attr($min_price); ?>" max="<?php echo esc_attr($max_price); ?>" step="1">
                    </div>
                    <span class="separator">–</span>
                    <div class="pxl-price-input">
                        <label><?php esc_html_e('Max', 'brighthub'); ?></label>
                        <input type="number" name="max_price" placeholder="<?php echo esc_attr($max_price); ?>" value="<?php echo esc_attr($current_max); ?>" min="<?php echo esc_attr($min_price); ?>" max="<?php echo esc_attr($max_price); ?>" step="1">
                    </div>
                </div>
            </div>
        </div>
    </form>
</div>
<?php endif; ?>