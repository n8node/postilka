<?php

if(!function_exists('pxl_print_html')){
    function pxl_print_html($content){
        echo $content;
    }
}

if(!function_exists('pxl_print_shortcode')) {
    function pxl_print_shortcode($content)
    {
        echo do_shortcode($content);
    }
}

if(!function_exists('pxl_register_shortcode')) {
    function pxl_register_shortcode($tag, $callback)
    {
        add_shortcode($tag, $callback);
    }
}

if(!function_exists('pxl_register_wp_widget')) {
    function pxl_register_wp_widget($class)
    {
        register_widget($class);
    }
}
 
 
if(!function_exists('pxl_get_post_categories')){
    function pxl_get_post_categories(){
        return get_terms('category', array(
            'hide_empty' => false,
            'order' => 'desc',
        ));
    }
    
}

if(!function_exists('pxl_get_post_categories_options') ){
    function pxl_get_post_categories_options(){
        $categories = pxl_get_post_categories();
        $options = array();
        if(!is_wp_error($categories)){
            foreach ($categories as $cat){
                $options[$cat->slug . "|" . "category"] = $cat->name;
            }
        }
        return $options;
    }
} 

if(!function_exists('pxl_get_grid_term_list')){
    function pxl_get_grid_term_list($post_type, $taxonomy = array())
    {
        if (empty($taxonomy)) {
            $taxonomy = get_object_taxonomies($post_type, 'names');
        }
         
        $term_list = array();
        $term_list['terms'] = array();
        $term_list['auto_complete'] = array();
        
        foreach ($taxonomy as $tax) {
            $terms = get_terms(
                array(
                    'taxonomy' => $tax,
                    'hide_empty' => true,
                )
            );
            foreach ($terms as $term) {
                $term_list['terms'][] = $term->slug . '|' . $tax;
                $term_list['auto_complete'][] = array(
                    'value' => $term->slug . '|' . $tax,
                    'label' => $term->name,
                );
            }
        }

        return $term_list;
    }
}

if(!function_exists('pxl_get_grid_term_options')){
    function pxl_get_grid_term_options($post_type, $taxonomy = array())
    {
        if (empty($taxonomy)) {
            $taxonomy = get_object_taxonomies($post_type, 'names');
        }
         
        $term_list = array();
        foreach ($taxonomy as $tax) {
            $terms = get_terms(
                array(
                    'taxonomy' => $tax,
                    'hide_empty' => true,
                )
            );
            foreach ($terms as $term) {
                $term_list[$term->slug . '|' . $tax] = $term->name;
            }
        }

        return $term_list;
    }
}

if(!function_exists('pxl_get_posts_of_grid')) {
    function pxl_get_posts_of_grid($post_type = 'post', $atts = array(), $taxonomy = array(), $args_extra = array())
    {
        extract($atts);
        if (!empty($post_ids)) {
            $args = array(
                'post_type' => $post_type,
                'post_status' => 'publish',
                'posts_per_page' => !empty($limit) ? intval($limit) : 6,
                'order' => !empty($order) ? $order : 'DESC',
                'orderby' => !empty($orderby) ? $orderby : 'date',
            );
            if(is_array($post_ids)) 
                $args['post__in'] = array_map('intval', $post_ids);
            else 
                $args['post__in'] = array_map('intval', explode(',', $post_ids));
 
            if (get_query_var('paged')) {
                $pxl_paged = get_query_var('paged');
            } elseif (get_query_var('page')) {
                $pxl_paged = get_query_var('page');
            } else {
                $pxl_paged = 1;
            }

            $pxl_query = new WP_Query($args);
            $pxl_query->set('paged', intval($pxl_paged));
            $pxl_query->set('posts_per_page', !empty($limit) ? intval($limit) : 6);
            $query = $pxl_query->query($pxl_query->query_vars);
            $posts = $query;
 
            $categories = [];

        } else {
            $args = array(
                'post_status' => 'publish',
                'post_type' => $post_type,
                'posts_per_page' => !empty($limit) ? intval($limit) : 6,
                'order' => !empty($order) ? $order : 'DESC',
                'orderby' => !empty($orderby) ? $orderby : 'date',
                'tax_query' => array(
                    'relation' => 'OR',
                )
            );
            $args = array_merge($args, $args_extra);
            if($currentPostId = get_the_ID()){
                $args['post__not_in'] = [ $currentPostId ];
            }

            if( isset($atts['post_not_in']) && !empty($atts['post_not_in']) )
                $args['post__not_in'] = $atts['post_not_in'];

            // if select term on custom post type, move term item to cat.
            if (!empty($source)) {
                foreach ($source as $terms) {
                    $tmp = explode('|', $terms);
                    if (isset($tmp[0]) && isset($tmp[1])) {
                        $args['tax_query'][] = array(
                            'taxonomy' => $tmp[1],
                            'field' => 'slug',
                            'operator' => 'IN',
                            'terms' => array($tmp[0]),
                        );
                    }
                }
            }
            if (get_query_var('paged')) {
                $pxl_paged = get_query_var('paged');
            } elseif (get_query_var('page')) {
                $pxl_paged = get_query_var('page');
            } else {
                $pxl_paged = 1;
            }

            $pxl_query = new WP_Query($args);
            $pxl_query->set('paged', intval($pxl_paged));
            $pxl_query->set('posts_per_page', !empty($limit) ? intval($limit) : 6);
            $query = $pxl_query->query($pxl_query->query_vars);
            $posts = $query;

            if (empty($source)) {
                $source_new = pxl_get_grid_term_list($post_type, $taxonomy);
                $categories = $source_new['terms'];
            }
            else{
                $categories = $source;
            }

        }

        
        global $wp_query;
        $wp_query = $pxl_query;
        $pagination = get_the_posts_pagination(array(
            'screen_reader_text' => '',
            'mid_size' => 2,
            'prev_text' => esc_html__('Back', PXL_TEXT_DOMAIN),
            'next_text' => esc_html__('Next', PXL_TEXT_DOMAIN),
        ));
        global $paged;
        $paged = $pxl_paged;
        $categories = is_array($categories) ? $categories : array();

        wp_reset_query();

        return array(
            'posts' => $posts,
            'categories' => $categories,
            'query' => $pxl_query,
            'args' => $args,
            'paged' => $paged,
            'max' => $pxl_query->max_num_pages,
            'next_link' => next_posts($pxl_query->max_num_pages, false),
            'total' => $pxl_query->found_posts,
            'pagination' => $pagination
        );
    }
}

if(!function_exists('pxl_get_term_of_post_to_class')){
    function pxl_get_term_of_post_to_class($post_id, $tax = array())
    {
        $term_list = array();
        foreach ($tax as $taxo) {
            $term_of_post = wp_get_post_terms($post_id, $taxo);
            foreach ($term_of_post as $term) {
                $term_list[] = $term->slug;
            }
        }

        return implode(' ', $term_list);
    }
}

if(!function_exists('pxl_get_all_page')){
    function pxl_get_all_page(){
        $all_posts = get_posts( array(
                'posts_per_page'    => -1,
                'post_type'         => 'page',
            )
        );
        if( !empty( $all_posts ) && !is_wp_error( $all_posts ) ) {
            foreach ( $all_posts as $post ) {
                $options[ $post->ID ] = strlen( $post->post_title ) > 20 ? substr( $post->post_title, 0, 20 ).'...' : $post->post_title;
            }
        }
        return $options;
    }
}

if(!function_exists('pxl_stringify_attributes')){
    function pxl_stringify_attributes( $attributes ) {
        $atts = array();
        foreach ( $attributes as $name => $value ) {
            $atts[] = $name . '="' . esc_attr( $value ) . '"';
        }

        return implode( ' ', $atts );
    }
}

if ( ! function_exists( 'pxl_resize' ) ) {
    function pxl_resize( $attach_id = null, $img_url = null, $width = '', $height = '', $crop = false ) {
        // this is an attachment, so we have the ID
        $image_src = array();
        if ( $attach_id ) {
            $image_src = wp_get_attachment_image_src( $attach_id, 'full' );
            $actual_file_path = get_attached_file( $attach_id );
            // this is not an attachment, let's use the image url
        } elseif ( $img_url ) {
            $file_path = wp_parse_url( $img_url );
            $actual_file_path = rtrim( ABSPATH, '/' ) . $file_path['path'];
            $orig_size = getimagesize( $actual_file_path );
            $image_src[0] = $img_url;
            $image_src[1] = $orig_size[0];
            $image_src[2] = $orig_size[1];
        }
        if ( ! empty( $actual_file_path ) ) {
            $file_info = pathinfo( $actual_file_path );
            $extension = '.' . $file_info['extension'];

            // the image path without the extension
            $no_ext_path = $file_info['dirname'] . '/' . $file_info['filename'];

            $cropped_img_path = $no_ext_path . '-' . $width . 'x' . $height . $extension;

            // checking if the file size is larger than the target size
            // if it is smaller or the same size, stop right here and return
            if ( $image_src[1] > $width || $image_src[2] > $height ) {

                // the file is larger, check if the resized version already exists (for $crop = true but will also work for $crop = false if the sizes match)
                if ( file_exists( $cropped_img_path ) ) {
                    $cropped_img_url = str_replace( basename( $image_src[0] ), basename( $cropped_img_path ), $image_src[0] );
                    $vt_image = array(
                        'url' => $cropped_img_url,
                        'width' => $width,
                        'height' => $height,
                    );

                    return $vt_image;
                }

                if ( ! $crop ) {
                    // calculate the size proportionaly
                    $proportional_size = wp_constrain_dimensions( $image_src[1], $image_src[2], $width, $height );
                    $resized_img_path = $no_ext_path . '-' . $proportional_size[0] . 'x' . $proportional_size[1] . $extension;

                    // checking if the file already exists
                    if ( file_exists( $resized_img_path ) ) {
                        $resized_img_url = str_replace( basename( $image_src[0] ), basename( $resized_img_path ), $image_src[0] );

                        $vt_image = array(
                            'url' => $resized_img_url,
                            'width' => $proportional_size[0],
                            'height' => $proportional_size[1],
                        );

                        return $vt_image;
                    }
                }

                // no cache files - let's finally resize it
                $img_editor = wp_get_image_editor( $actual_file_path );

                if ( is_wp_error( $img_editor ) || is_wp_error( $img_editor->resize( $width, $height, $crop ) ) ) {
                    return array(
                        'url' => '',
                        'width' => '',
                        'height' => '',
                    );
                }

                $new_img_path = $img_editor->generate_filename();

                if ( is_wp_error( $img_editor->save( $new_img_path ) ) ) {
                    return array(
                        'url' => '',
                        'width' => '',
                        'height' => '',
                    );
                }
                if ( ! is_string( $new_img_path ) ) {
                    return array(
                        'url' => '',
                        'width' => '',
                        'height' => '',
                    );
                }

                $new_img_size = getimagesize( $new_img_path );
                $new_img = str_replace( basename( $image_src[0] ), basename( $new_img_path ), $image_src[0] );

                // resized output
                $vt_image = array(
                    'url' => $new_img,
                    'width' => $new_img_size[0],
                    'height' => $new_img_size[1],
                );

                return $vt_image;
            }

            // default output - without resizing
            $vt_image = array(
                'url' => $image_src[0],
                'width' => $image_src[1],
                'height' => $image_src[2],
            );

            return $vt_image;
        }

        return false;
    }
}

if(!function_exists('pxl_get_image_by_size')){
    function pxl_get_image_by_size( $params = array() ) {
        $params = array_merge( array(
            'post_id' => null,
            'attach_id' => null,
            'thumb_size' => 'thumbnail',
            'class' => '',
        ), $params );

        if ( ! $params['thumb_size'] ) {
            $params['thumb_size'] = 'thumbnail';
        }

        if ( ! $params['attach_id'] && ! $params['post_id'] ) {
            return false;
        }

        $post_id = $params['post_id'];

        $attach_id = $post_id ? get_post_thumbnail_id( $post_id ) : $params['attach_id'];
        $attach_id = apply_filters( 'pxl_object_id', $attach_id );
        $thumb_size = $params['thumb_size'];
        $thumb_class = ( isset( $params['class'] ) && '' !== $params['class'] ) ? $params['class'] . ' ' : '';

        global $_wp_additional_image_sizes;
        $thumbnail = '';

        $sizes = array(
            'thumbnail',
            'thumb',
            'medium',
            'medium_large',
            'large',
            'full',
        );
        if ( is_string( $thumb_size ) && ( ( ! empty( $_wp_additional_image_sizes[ $thumb_size ] ) && is_array( $_wp_additional_image_sizes[ $thumb_size ] ) ) || in_array( $thumb_size, $sizes, true ) ) ) {
            $attributes = array( 'class' => $thumb_class . 'attachment-' . $thumb_size );
            $thumbnail = wp_get_attachment_image( $attach_id, $thumb_size, false, $attributes );
            $thumbnail_url = wp_get_attachment_image_url($attach_id, $thumb_size, false);
        } elseif ( $attach_id ) {
            if ( is_string( $thumb_size ) ) {
                preg_match_all( '/\d+/', $thumb_size, $thumb_matches );
                if ( isset( $thumb_matches[0] ) ) {
                    $thumb_size = array();
                    $count = count( $thumb_matches[0] );
                    if ( $count > 1 ) {
                        $thumb_size[] = $thumb_matches[0][0]; // width
                        $thumb_size[] = $thumb_matches[0][1]; // height
                    } elseif ( 1 === $count ) {
                        $thumb_size[] = $thumb_matches[0][0]; // width
                        $thumb_size[] = $thumb_matches[0][0]; // height
                    } else {
                        $thumb_size = false;
                    }
                }
            }

            if ( is_array( $thumb_size ) ) {
                // Resize image to custom size
                $p_img = pxl_resize( $attach_id, null, $thumb_size[0], $thumb_size[1], true );
                $alt = trim( wp_strip_all_tags( get_post_meta( $attach_id, '_wp_attachment_image_alt', true ) ) );
                $attachment = get_post( $attach_id );
                if ( ! empty( $attachment ) ) {
                    $title = trim( wp_strip_all_tags( $attachment->post_title ) );

                    if ( empty( $alt ) ) {
                        $alt = trim( wp_strip_all_tags( $attachment->post_excerpt ) ); // If not, Use the Caption
                    }
                    if ( empty( $alt ) ) {
                        $alt = $title;
                    }
                    if ( $p_img ) {

                        $attributes = pxl_stringify_attributes( array(
                            'class' => $thumb_class,
                            'src' => $p_img['url'],
                            'width' => $p_img['width'],
                            'height' => $p_img['height'],
                            'alt' => $alt,
                            'title' => $title,
                        ) );

                        $thumbnail = '<img ' . $attributes . ' />';
                    }
                }
            }
            $thumbnail_url = !empty( $p_img['url'] ) ? $p_img['url'] : '';
        }

        $p_img_large = wp_get_attachment_image_src( $attach_id, 'large' );

        return apply_filters( 'pxl_el_getimagesize', array(
            'thumbnail' => $thumbnail,
            'url' => $thumbnail_url,
            'p_img_large' => $p_img_large,
        ), $attach_id, $params );
    }
}
if(!function_exists('pxl_attachment_image_src')){
    function pxl_attachment_image_src( $attachment_id, $images_size, $images_custom_size ) {
        
        if ( empty( $attachment_id ) ) {
            return false;
        }

        if(!defined('ELEMENTOR_PATH')) return false;
 
        if ( 'custom' !== $images_size ) {
            $attachment_size = $images_size;
        } else {
            // Use BFI_Thumb script
            // TODO: Please rewrite this code.
            require_once ELEMENTOR_PATH . 'includes/libraries/bfi-thumb/bfi-thumb.php';

            $custom_dimension = explode('x', strtolower($images_custom_size));
             
            $attachment_size = [
                // Defaults sizes
                0 => null, // Width.
                1 => null, // Height.

                'bfi_thumb' => true,
                'crop' => true,
            ];

            $has_custom_size = false;
            if ( ! empty( $custom_dimension[0] ) ) {
                $has_custom_size = true;
                $attachment_size[0] = $custom_dimension[0];
            }

            if ( ! empty( $custom_dimension[1] ) ) {
                $has_custom_size = true;
                $attachment_size[1] = $custom_dimension[1];
            }

            if ( ! $has_custom_size ) {
                $attachment_size = 'full';
            }
        }

        $image_src = wp_get_attachment_image_src( $attachment_id, $attachment_size );

        if ( empty( $image_src[0] ) && 'thumbnail' !== $attachment_size ) {
            $image_src = wp_get_attachment_image_src( $attachment_id );
        }

        return ! empty( $image_src[0] ) ? $image_src[0] : '';
    }
}
 

if(!function_exists('pxl_share_this_all')){
    function pxl_share_this_all($args=[]){
        $args = wp_parse_args($args,[
            'post_id'     => get_the_ID(),
            'show_share' => false,
            'class'       => '',
            'text'        => '',
            'show_icon'   => true,
            'icon'        => 'fa fa-user',
            'author_avatar' => false,
            'icon_class'  => 'text-primary',
            'echo'        => true
        ]);

        if(!$args['show_share']) return;
        wp_enqueue_script( 'sharethis' );
        $url   = get_the_permalink();
        $image = get_the_post_thumbnail_url( $args['post_id']);
        $title = get_the_title($args['post_id']);
        ob_start();
        ?>
        <span class="pxl-post-share col-auto">
            <span class="meta-inner">
                <a data-hint="<?php esc_attr_e( 'Share this post to', PXL_TEXT_DOMAIN ); ?>"
                    data-toggle="tooltip" href="javascript:void(0);" data-network="sharethis"
                    data-url="<?php echo esc_url( $url ); ?>"
                    data-short-url="<?php echo esc_url( $url ); ?>"
                    data-title="<?php echo esc_attr( $title ); ?>"
                    data-image="<?php echo esc_url( $image ); ?>"
                    data-description="" data-username=""
                    data-message=""
                    class="sharethis st-custom-button"><span class="fa fa-share-alt"></span> 
                    <span><?php echo esc_html__( 'Share', PXL_TEXT_DOMAIN ) ?></span> </a>
            </span>
        </span>
        <?php  
        $html = ob_get_clean();
        $html = apply_filters( 'pxl_share_this_all_html', $html );
        if($args['echo']){
            echo $html;
        } else {
            return $html;
        }
    }
}

add_action( 'add_meta_boxes_comment', 'pxl_comment_add_meta_box' );
function pxl_comment_add_meta_box() {
    add_meta_box( 'comment', __( 'Comment Metadata - Extend Comment' ), 'pxl_comment_meta_box', 'comment', 'normal', 'high' );
}

function pxl_comment_meta_box($comment){
    apply_filters( 'pxl_comment_extra_control', $comment );
}

/*add_action( 'restrict_manage_posts', 'pxl_admin_posts_filter_restrict_manage_posts',10,2 );
function pxl_admin_posts_filter_restrict_manage_posts($post_type,$which){
    if ($post_type == 'pxl-template'){
        $template_types = array(
            'header'       => esc_html__('Header', PXL_TEXT_DOMAIN), 
            'footer'       => esc_html__('Footer', PXL_TEXT_DOMAIN), 
            'mega-menu'    => esc_html__('Mega Menu', PXL_TEXT_DOMAIN) 
        );
        $template_types = apply_filters('pxl_template_type_support',$template_types);
        ?>
        <select name="pxl_filter_template_type">
            <option value=""><?php esc_html_e('Select Type', PXL_TEXT_DOMAIN); ?></option>
            <?php
            $current_v = isset($_GET['pxl_filter_template_type'])? $_GET['pxl_filter_template_type']:'';

            foreach ($template_types as $value => $label) {
                printf
                    (
                        '<option value="%s"%s>%s</option>',
                        $value,
                        $value == $current_v? ' selected="selected"':'',
                        $label
                    );
                }
            ?>
        </select>
        <?php
    }
}*/

/*add_filter( 'parse_query', 'pxl_posts_filter' );
function pxl_posts_filter( $query ){
    global $pagenow;
    $type = 'pxl-template';
    if (isset($_GET['post_type'])) {
        $type = $_GET['post_type'];
    }
    if ( $type == 'pxl-template' && is_admin() && $pagenow=='edit.php' && isset($_GET['pxl_filter_template_type']) && $_GET['pxl_filter_template_type'] != '') {
        $query->query_vars['meta_key'] = 'template_type';
        $query->query_vars['meta_value'] = $_GET['pxl_filter_template_type'];
    }
} */ 

/*
    Plugin auto update filter
    update_plugins_api.casethemes.net
    update_plugins_ + UpdateURI host name
*/
