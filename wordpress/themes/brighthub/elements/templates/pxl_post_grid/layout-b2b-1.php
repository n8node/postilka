<?php
$html_id = pxl_get_element_id($settings);
$tax = ['b2b-category'];
$select_post_by = $widget->get_setting('select_post_by', '');
$source = $post_ids = [];
if($select_post_by === 'post_selected'){
    $post_ids = $widget->get_setting('source_'.$settings['post_type'].'_post_ids', '');
}else{
    $source  = $widget->get_setting('source_'.$settings['post_type'], '');
}
$orderby = $widget->get_setting('orderby', 'date');
$order = $widget->get_setting('order', 'desc');
$limit = $widget->get_setting('limit', 6);
extract(pxl_get_posts_of_grid(
    'b2b', 
    ['source' => $source, 'orderby' => $orderby, 'order' => $order, 'limit' => $limit, 'post_ids' => $post_ids],
    $tax
));
$filter_default_title = $widget->get_setting('filter_default_title', 'All');
if($settings['col_xl'] == '5') {
    $col_xl = 'pxl5';
} else {
    $col_xl = 12 / intval($widget->get_setting('col_xl', 4));
}

$col_lg = 12 / intval($widget->get_setting('col_lg', 4));
$col_md = 12 / intval($widget->get_setting('col_md', 3));
$col_sm = 12 / intval($widget->get_setting('col_sm', 2));
$col_xs = 12 / intval($widget->get_setting('col_xs', 1));
$grid_sizer = "col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";

$grid_class = '';
$grid_class = 'pxl-grid__inner pxl-grid__masonry row';

$filter = $widget->get_setting('filter', 'false');
$filter_style = $widget->get_setting('filter_style', 'style-1');
$filter_alignment = $widget->get_setting('filter_alignment', 'center');
$pagination_type = $widget->get_setting('pagination_type', 'pagination');

if($pagination_type === 'loadmore'){
    $loadmore_txt = $widget->get_setting('loadmore_txt','Load More');
    $loading_txt = $widget->get_setting('loading_txt','Loading');
}

$post_type = $widget->get_setting('post_type', 'b2b');
$layout = $widget->get_setting('layout_'.$post_type, 'b2b-1');

$show_price = $widget->get_setting('show_price');
$show_badge = $widget->get_setting('show_badge');
$show_button = $widget->get_setting('show_button');
$show_category = $widget->get_setting('show_category');
$img_size = $widget->get_setting('img_size');
$grid_masonry = $widget->get_setting('grid_masonry');
$pxl_animate = $widget->get_setting('pxl_animate');

$title_tag = !empty($settings['title_tag']) && $settings['title_tag'] !== 'df' ? $settings['title_tag'] : 'div';

$load_more = array(
    'tax'             => $tax,
    'post_type'       => $post_type,   
    'layout'          => $layout,
    'startPage'       => $paged,
    'maxPages'        => $max,
    'total'           => $total,
    'filter'          => $filter,
    'perpage'         => $limit,
    'nextLink'        => $next_link,
    'source'          => $source,
    'orderby'         => $orderby,
    'order'           => $order,
    'limit'           => $limit,
    'post_ids'        => $post_ids,
    'col_xl'          => $col_xl,
    'col_lg'          => $col_lg,
    'col_md'          => $col_md,
    'col_sm'          => $col_sm,
    'col_xs'          => $col_xs,
    'pagination_type' => $pagination_type,
    'show_price'      => $show_price,
    'show_badge'      => $show_badge,
    'show_button'     => $show_button,
    'show_category'   => $show_category,
    'img_size'        => $img_size,
    'grid_masonry'    => $grid_masonry,
    'pxl_animate'     => $pxl_animate,
    'html_id'         => $html_id,
    'title_tag5'       => $title_tag,
);

$wrap_attrs = [
    'id'               => $html_id,
    'class'            => trim('pxl-grid pxl-b2b-grid pxl-b2b-grid--layout-1'),
    'data-start-page'  => $paged,
    'data-max-pages'   => $max,
    'data-total'       => $total,
    'data-perpage'     => $limit,
    'data-next-link'   => $next_link
];

if ($pagination_type != 'false'){
    $wrap_attrs['data-loadmore'] = json_encode($load_more);
}

$widget->add_render_attribute( 'wrapper', $wrap_attrs );
 
if( count($posts) <= 0){
    echo '<div class="pxl-no-post-grid">'.esc_html__( 'No Post Found', 'brighthub' ). '</div>';
    return;
} ?>

<div <?php pxl_print_html($widget->get_render_attribute_string( 'wrapper' )) ?>>
    <?php if ($select_post_by == 'term_selected' && $filter == "true"): ?>
        <div class="pxl-grid__filter ajax <?php echo esc_attr($filter_style) ?>">
            <div class="pxl-grid__filter-inner">
                <span class="filter-item active" data-filter="*"><?php echo esc_html($filter_default_title); ?></span>
                <?php foreach ($categories as $category): ?>
                    <?php $category_arr = explode('|', $category); ?>
                    <?php $term = get_term_by('slug',$category_arr[0], $category_arr[1]); ?>
                    <span class="filter-item" data-filter="<?php echo esc_attr('.' . $term->slug); ?>">
                        <?php echo esc_html($term->name); ?>
                    </span>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>

    <div class="<?php echo esc_attr($grid_class); ?>" data-gutter="15">
        <?php brighthub_get_post_grid($posts, $load_more); ?>
        <div class="pxl-grid__sizer <?php echo esc_attr($grid_sizer); ?>"></div>
    </div>
    <?php if ($pagination_type == 'pagination') { ?>
        <div class="pxl-grid__pagination">
            <?php brighthub()->page->get_pagination($query, true); ?>
        </div>
    <?php } ?>
    <?php if (!empty($next_link) && $pagination_type == 'loadmore') { ?>
        <div class="pxl-grid__loadmore pxl-grid__loadmore--<?php echo esc_attr($settings['loadmore_style']); ?>" data-loadmore-text="<?php echo esc_attr($loadmore_txt); ?>" data-loading-text="<?php echo esc_attr($loading_txt); ?>">
            <div class="btn-loadmore btn-glossy">
                <span class="pxl-loadmore__text"><?php echo esc_html($loadmore_txt); ?></span>
                <?php if($settings['loadmore_style'] === 'style-1'): ?>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M9.92737 3.38823C9.34737 3.2149 8.70737 3.10156 8.0007 3.10156C4.80737 3.10156 2.2207 5.68823 2.2207 8.88156C2.2207 12.0816 4.80737 14.6682 8.0007 14.6682C11.194 14.6682 13.7807 12.0816 13.7807 8.88823C13.7807 7.70156 13.4207 6.5949 12.8074 5.6749" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10.7528 3.54536L8.82617 1.33203" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10.7535 3.54688L8.50684 5.18688" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                <?php else: ?>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 16.5C13.125 16.5 16.5 13.125 16.5 9C16.5 4.875 13.125 1.5 9 1.5C4.875 1.5 1.5 4.875 1.5 9C1.5 13.125 4.875 16.5 9 16.5Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 9H12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 12V6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                <?php endif; ?>
            </div>
            <?php if($settings['show_button_2'] === 'true'):
                if ( ! empty( $settings['btn_2_url']['url'] ) ) {
                    $widget->add_render_attribute( 'btn_2_url', 'href', $settings['btn_2_url']['url'] );
                
                    if ( $settings['btn_2_url']['is_external'] ) {
                        $widget->add_render_attribute( 'btn_2_url', 'target', '_blank' );
                    }
                
                    if ( $settings['btn_2_url']['nofollow'] ) {
                        $widget->add_render_attribute( 'btn_2_url', 'rel', 'nofollow' );
                    }
                }
            ?>
            <a <?php pxl_print_html($widget->get_render_attribute_string( 'btn_2_url' )); ?> class="pxl-button__more">
                <?php echo esc_html($settings['btn_2_txt']); ?>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.61987 3.95312L13.6665 7.99979L9.61987 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2.3335 8H13.5535" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </a>
            <?php endif; ?>
        </div>
    <?php } ?>
</div>