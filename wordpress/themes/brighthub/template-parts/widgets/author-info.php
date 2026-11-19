<?php
defined( 'ABSPATH' ) or exit( -1 );

/**
 * Author Information widgets
 *
 */

if(!function_exists('pxl_register_wp_widget')) return;
add_action( 'widgets_init', function(){
    pxl_register_wp_widget( 'PXL_Author_Info_Widget' );
});
class PXL_Author_Info_Widget extends WP_Widget
{

    function __construct()
    {
        parent::__construct(
            'pxl_user_info_widget',
            esc_html__('* Pxl Author Information', 'brighthub'),
            array('description' => esc_html__('Show Author Information, It will get data of author in single post', 'brighthub'),)
        );
    }

    function widget($args, $instance)
    {
        if (!is_singular('post')) return;
        extract($args);

        $user_image_id  = !empty($instance['user_image']) ? $instance['user_image'] : '';
        $user_image_url = wp_get_attachment_image_url($user_image_id, '');
        $user_name      = !empty($instance['user_name']) ? $instance['user_name'] : '';
        $user_position  = !empty($instance['user_position']) ? $instance['user_position'] : '';
        $user_location  = !empty($instance['user_location']) ? $instance['user_location'] : '';
        $user_hobbie    = !empty($instance['user_hobbie']) ? $instance['user_hobbie'] : '';
        $user_bio    = !empty($instance['user_bio']) ? $instance['user_bio'] : '';

        $user_facebook  = !empty($instance['user_facebook']) ? $instance['user_facebook'] : '';
        $user_x         = !empty($instance['user_x']) ? $instance['user_x'] : '';
        $user_instagram = !empty($instance['user_instagram']) ? $instance['user_instagram'] : '';
        $user_linkedin  = !empty($instance['user_linkedin']) ? $instance['user_linkedin'] : '';
        $user_youtube   = !empty($instance['user_youtube']) ? $instance['user_youtube'] : '';
        $user_pinterest = !empty($instance['user_pinterest']) ? $instance['user_pinterest'] : '';
        $user_vimeo     = !empty($instance['user_vimeo']) ? $instance['user_vimeo'] : '';
        $user_skype     = !empty($instance['user_skype']) ? $instance['user_skype'] : '';
        $user_google    = !empty($instance['user_google']) ? $instance['user_google'] : '';
        $user_tumblr    = !empty($instance['user_tumblr']) ? $instance['user_tumblr'] : '';
        $user_rss       = !empty($instance['user_rss']) ? $instance['user_rss'] : '';
        
        if( is_single()){
            $post_id = get_the_ID();
            $user_id = get_post_field('post_author', $post_id);
            $user_name  = get_the_author_meta('display_name', $user_id);
            $user_bio = get_the_author_meta('description', $user_id);

            $user_position = get_user_meta($user_id, 'user_position', true);
            $user_hobbie = get_user_meta($user_id, 'user_hobbie', true);
            $user_hobbie_icon = get_user_meta($user_id, 'user_hobbie_icon', true);
            $user_location = get_user_meta($user_id, 'user_location', true);
            $user_facebook = get_user_meta($user_id, 'user_facebook', true);
            $user_x = get_user_meta($user_id, 'user_x', true);
            $user_instagram = get_user_meta($user_id, 'user_instagram', true);
            $user_linkedin = get_user_meta($user_id, 'user_linkedin', true);
            $user_youtube = get_user_meta($user_id, 'user_youtube', true);
            $user_vimeo = get_user_meta($user_id, 'user_vimeo', true);
            $user_pinterest = get_user_meta($user_id, 'user_pinterest', true);
            $user_skype = get_user_meta($user_id, 'user_skype', true);
            $user_google = get_user_meta($user_id, 'user_google', true);
            $user_tumblr = get_user_meta($user_id, 'user_tumblr', true);
            $user_rss = get_user_meta($user_id, 'user_rss', true);
        } 

        ?>
        <div class="widget pxl-widget__author">
            <div class="pxl-widget__author-image">
                <?php if( is_single()): ?>
                    <?php echo get_avatar($user_id, 250); ?>
                <?php else: ?>
                    <img src="<?php echo esc_url($user_image_url)?>" alt="<?php echo esc_attr__('Author Image', 'brighthub');?>">
                <?php endif; ?>
            </div>
            <?php if (!empty($user_name)): ?>
                <div class="pxl-widget__author-name"><?php echo esc_html($user_name);?></div>
            <?php endif; ?>
            <div class="pxl-widget__author-row">
                <?php if (!empty($user_position)): ?>
                    <span class="pxl-widget__author-location">
                            <?php echo esc_html($user_position);?>
                    </span>
                <?php endif; ?><?php if(!empty($user_position) && !empty($user_hobbie)): ?>|<?php endif; ?><?php if (!empty($user_hobbie)): ?>
                    <span class="pxl-widget__author-hobbie">
                        <?php echo esc_html($user_hobbie);?>
                        <?php if (!empty($user_hobbie_icon)): ?>
                            <div class="pxl-widget__author-hobbie--icon">
                                <img src="<?php echo esc_url($user_hobbie_icon); ?>" alt="<?php esc_attr_e('Hobby Icon', 'brighthub'); ?>" />
                            </div>
                        <?php endif; ?>
                    </span>
                <?php endif; ?>
            </div>
            <?php if (!empty($user_bio)): ?>
                <div class="pxl-widget__author-bio"><?php echo brighthub_html(nl2br($user_bio)); ?></div>
            <?php endif; ?>
            <?php if (!empty($user_location)): ?>
                <span class="pxl-widget__author-pos"><img width="16" src="<?php echo esc_url(get_template_directory_uri() . '/assets/img/location.png' ) ?>" alt="<?php esc_attr_e('Location', 'brighthub'); ?>" loading="lazy" /><?php echo esc_html($user_location);?></span>
            <?php endif; ?>
            <div class="pxl-widget__author-social social">
                <?php if(!empty($user_facebook)): ?>
                    <div class="social-item social-item__facebook">
                        <a href="<?php echo esc_url($user_facebook); ?>">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16" id="fi_106897">
                            <path d="M7.2 16v-7.5h-2v-2.7h2c0 0 0-1.1 0-2.3 0-1.8 1.2-3.5 3.9-3.5 1.1 0 1.9 0.1 1.9 0.1l-0.1 2.5c0 0-0.8 0-1.7 0-1 0-1.1 0.4-1.1 1.2 0 0.6 0-1.3 0 2h2.9l-0.1 2.7h-2.8v7.5h-2.9z"></path>
                        </svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_x)): ?>
                    <div class="social-item social-item__x">
                        <a href="<?php echo esc_url($user_x); ?>">
                            <svg id="fi_11823292" enable-background="new 0 0 1226.37 1226.37" viewBox="0 0 1226.37 1226.37" xmlns="http://www.w3.org/2000/svg"><path d="m727.348 519.284 446.727-519.284h-105.86l-387.893 450.887-309.809-450.887h-357.328l468.492 681.821-468.492 544.549h105.866l409.625-476.152 327.181 476.152h357.328l-485.863-707.086zm-144.998 168.544-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721h-162.604l-323.311-462.446z"></path><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_linkedin)): ?>
                    <div class="social-item social-item__linkedin">
                        <a href="<?php echo esc_url($user_linkedin); ?>">
                            <svg height="512" viewBox="0 0 176 176" width="512" xmlns="http://www.w3.org/2000/svg" id="fi_3536569"><g id="Layer_2" data-name="Layer 2"><g id="linkedin"><path id="icon" d="m152 0h-128a24 24 0 0 0 -24 24v128a24 24 0 0 0 24 24h128a24 24 0 0 0 24-24v-128a24 24 0 0 0 -24-24zm-92 139.28a3.71 3.71 0 0 1 -3.71 3.72h-15.81a3.71 3.71 0 0 1 -3.72-3.72v-66.28a3.72 3.72 0 0 1 3.72-3.72h15.81a3.72 3.72 0 0 1 3.71 3.72zm-11.62-76.28a15 15 0 1 1 15-15 15 15 0 0 1 -15 15zm94.26 76.54a3.41 3.41 0 0 1 -3.42 3.42h-17a3.41 3.41 0 0 1 -3.42-3.42v-31.05c0-4.64 1.36-20.32-12.13-20.32-10.45 0-12.58 10.73-13 15.55v35.86a3.42 3.42 0 0 1 -3.37 3.42h-16.42a3.41 3.41 0 0 1 -3.41-3.42v-66.87a3.41 3.41 0 0 1 3.41-3.42h16.42a3.42 3.42 0 0 1 3.42 3.42v5.78c3.88-5.83 9.63-10.31 21.9-10.31 27.18 0 27 25.38 27 39.32z"></path></g></g></svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_pinterest)): ?>
                    <div class="social-item social-item__pinterest">
                        <a href="<?php echo esc_url($user_pinterest); ?>">
                        <svg version="1.1" id="fi_733622" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 511.977 511.977" style="enable-background:new 0 0 511.977 511.977;" xml:space="preserve">
                            <g>
                                <g>
                                    <path d="M262.948,0C122.628,0,48.004,89.92,48.004,187.968c0,45.472,25.408,102.176,66.08,120.16
                                        c6.176,2.784,9.536,1.6,10.912-4.128c1.216-4.352,6.56-25.312,9.152-35.2c0.8-3.168,0.384-5.92-2.176-8.896
                                        c-13.504-15.616-24.224-44.064-24.224-70.752c0-68.384,54.368-134.784,146.88-134.784c80,0,135.968,51.968,135.968,126.304
                                        c0,84-44.448,142.112-102.208,142.112c-31.968,0-55.776-25.088-48.224-56.128c9.12-36.96,27.008-76.704,27.008-103.36
                                        c0-23.904-13.504-43.68-41.088-43.68c-32.544,0-58.944,32.224-58.944,75.488c0,27.488,9.728,46.048,9.728,46.048
                                        S144.676,371.2,138.692,395.488c-10.112,41.12,1.376,107.712,2.368,113.44c0.608,3.168,4.16,4.16,6.144,1.568
                                        c3.168-4.16,42.08-59.68,52.992-99.808c3.968-14.624,20.256-73.92,20.256-73.92c10.72,19.36,41.664,35.584,74.624,35.584
                                        c98.048,0,168.896-86.176,168.896-193.12C463.62,76.704,375.876,0,262.948,0z"></path>
                                </g>
                                </g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g>
                            </svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_instagram)): ?>
                    <div class="social-item social-item__instagram">
                        <a href="<?php echo esc_url($user_instagram); ?>">
                            <svg height="511pt" viewBox="0 0 511 511.9" width="511pt" xmlns="http://www.w3.org/2000/svg" id="fi_1384031"><path d="m510.949219 150.5c-1.199219-27.199219-5.597657-45.898438-11.898438-62.101562-6.5-17.199219-16.5-32.597657-29.601562-45.398438-12.800781-13-28.300781-23.101562-45.300781-29.5-16.296876-6.300781-34.898438-10.699219-62.097657-11.898438-27.402343-1.300781-36.101562-1.601562-105.601562-1.601562s-78.199219.300781-105.5 1.5c-27.199219 1.199219-45.898438 5.601562-62.097657 11.898438-17.203124 6.5-32.601562 16.5-45.402343 29.601562-13 12.800781-23.097657 28.300781-29.5 45.300781-6.300781 16.300781-10.699219 34.898438-11.898438 62.097657-1.300781 27.402343-1.601562 36.101562-1.601562 105.601562s.300781 78.199219 1.5 105.5c1.199219 27.199219 5.601562 45.898438 11.902343 62.101562 6.5 17.199219 16.597657 32.597657 29.597657 45.398438 12.800781 13 28.300781 23.101562 45.300781 29.5 16.300781 6.300781 34.898438 10.699219 62.101562 11.898438 27.296876 1.203124 36 1.5 105.5 1.5s78.199219-.296876 105.5-1.5c27.199219-1.199219 45.898438-5.597657 62.097657-11.898438 34.402343-13.300781 61.601562-40.5 74.902343-74.898438 6.296876-16.300781 10.699219-34.902343 11.898438-62.101562 1.199219-27.300781 1.5-36 1.5-105.5s-.101562-78.199219-1.300781-105.5zm-46.097657 209c-1.101562 25-5.300781 38.5-8.800781 47.5-8.601562 22.300781-26.300781 40-48.601562 48.601562-9 3.5-22.597657 7.699219-47.5 8.796876-27 1.203124-35.097657 1.5-103.398438 1.5s-76.5-.296876-103.402343-1.5c-25-1.097657-38.5-5.296876-47.5-8.796876-11.097657-4.101562-21.199219-10.601562-29.398438-19.101562-8.5-8.300781-15-18.300781-19.101562-29.398438-3.5-9-7.699219-22.601562-8.796876-47.5-1.203124-27-1.5-35.101562-1.5-103.402343s.296876-76.5 1.5-103.398438c1.097657-25 5.296876-38.5 8.796876-47.5 4.101562-11.101562 10.601562-21.199219 19.203124-29.402343 8.296876-8.5 18.296876-15 29.398438-19.097657 9-3.5 22.601562-7.699219 47.5-8.800781 27-1.199219 35.101562-1.5 103.398438-1.5 68.402343 0 76.5.300781 103.402343 1.5 25 1.101562 38.5 5.300781 47.5 8.800781 11.097657 4.097657 21.199219 10.597657 29.398438 19.097657 8.5 8.300781 15 18.300781 19.101562 29.402343 3.5 9 7.699219 22.597657 8.800781 47.5 1.199219 27 1.5 35.097657 1.5 103.398438s-.300781 76.300781-1.5 103.300781zm0 0"></path><path d="m256.449219 124.5c-72.597657 0-131.5 58.898438-131.5 131.5s58.902343 131.5 131.5 131.5c72.601562 0 131.5-58.898438 131.5-131.5s-58.898438-131.5-131.5-131.5zm0 216.800781c-47.097657 0-85.300781-38.199219-85.300781-85.300781s38.203124-85.300781 85.300781-85.300781c47.101562 0 85.300781 38.199219 85.300781 85.300781s-38.199219 85.300781-85.300781 85.300781zm0 0"></path><path d="m423.851562 119.300781c0 16.953125-13.746093 30.699219-30.703124 30.699219-16.953126 0-30.699219-13.746094-30.699219-30.699219 0-16.957031 13.746093-30.699219 30.699219-30.699219 16.957031 0 30.703124 13.742188 30.703124 30.699219zm0 0"></path></svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_youtube)): ?>
                    <div class="social-item social-item__youtube">
                        <a href="<?php echo esc_url($user_youtube); ?>">
                            <svg height="682pt" viewBox="-21 -117 682.66672 682" width="682pt" xmlns="http://www.w3.org/2000/svg" id="fi_1384028"><path d="m626.8125 64.035156c-7.375-27.417968-28.992188-49.03125-56.40625-56.414062-50.082031-13.703125-250.414062-13.703125-250.414062-13.703125s-200.324219 0-250.40625 13.183593c-26.886719 7.375-49.03125 29.519532-56.40625 56.933594-13.179688 50.078125-13.179688 153.933594-13.179688 153.933594s0 104.378906 13.179688 153.933594c7.382812 27.414062 28.992187 49.027344 56.410156 56.410156 50.605468 13.707031 250.410156 13.707031 250.410156 13.707031s200.324219 0 250.40625-13.183593c27.417969-7.378907 49.03125-28.992188 56.414062-56.40625 13.175782-50.082032 13.175782-153.933594 13.175782-153.933594s.527344-104.382813-13.183594-154.460938zm-370.601562 249.878906v-191.890624l166.585937 95.945312zm0 0"></path></svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_vimeo)): ?>
                    <div class="social-item social-item__vimeo">
                        <a href="<?php echo esc_url($user_vimeo); ?>">
                            <svg version="1.1" id="fi_733637" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512.011 512.011" style="enable-background:new 0 0 512.011 512.011;" xml:space="preserve">
                                <g><g>
                                <path d="M293.792,152.808c58.304-35.008,89.728,14.336,59.84,70.112c-29.952,56-57.44,92.512-71.68,92.512
                                    c-13.984,0-25.056-37.568-41.44-102.784c-16.8-67.552-16.8-189.344-87.072-175.52C87.008,50.248,0,154.248,0,154.248
                                    l20.672,27.232c0,0,42.88-33.824,57.152-16.992c14.464,16.992,69.216,221.024,87.328,258.752
                                    c15.808,33.056,59.68,76.672,107.616,45.568c48.384-31.296,208.096-167.68,236.704-329.056
                                    C538.016-21.336,316.96,12.392,293.792,152.808z"></path>
                                </g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g>
                            </svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_skype)): ?>
                    <div class="social-item social-item__skype">
                        <a href="<?php echo esc_url($user_skype); ?>">
                            <svg height="512pt" viewBox="0 0 512 512" width="512pt" xmlns="http://www.w3.org/2000/svg" id="fi_1384098"><path d="m361.472656 512c-22.453125 0-44.695312-4.976562-64.761718-14.441406-14.269532 2.339844-26.542969 3.441406-38.191407 3.441406-135.378906 0-245.519531-108.808594-245.519531-242.550781 0-13.023438 1.292969-26.574219 3.9375-41.214844-11.101562-21.082031-16.9375-44.613281-16.9375-68.535156 0-81.992188 67.539062-148.699219 150.558594-148.699219 25.835937 0 51.078125 6.523438 73.46875 18.929688 10.199218-1.3125 21.359375-1.929688 34.492187-1.929688 65.417969 0 126.828125 25.050781 172.917969 70.53125 46.148438 45.542969 71.5625 106.246094 71.5625 170.925781 0 17.136719-1.167969 31.671875-3.648438 45.113281 8.398438 18.761719 12.648438 38.820313 12.648438 59.730469 0 81.992188-67.527344 148.699219-150.527344 148.699219zm-58.445312-56.195312 6.144531 3.265624c15.898437 8.457032 33.984375 12.929688 52.300781 12.929688 60.945313 0 110.527344-48.761719 110.527344-108.699219 0-16.996093-3.839844-33.1875-11.417969-48.125l-3.25-6.414062 1.574219-7.015625c2.792969-12.4375 4.09375-26.191406 4.09375-43.289063 0-111.082031-91.730469-201.457031-204.480469-201.457031-14.078125 0-25.257812.78125-35.191406 2.464844l-7.464844 1.261718-6.429687-3.996093c-17.609375-10.945313-37.96875-16.730469-58.875-16.730469-60.960938 0-110.558594 48.761719-110.558594 108.699219 0 19.335937 5.234375 38.316406 15.136719 54.890625l3.988281 6.679687-1.570312 7.621094c-3.066407 14.839844-4.554688 28.105469-4.554688 40.558594 0 111.6875 92.195312 202.550781 205.519531 202.550781 10.949219 0 22.917969-1.253906 37.667969-3.945312zm81.972656-144.941407c0-14.382812-2.839844-26.75-8.503906-36.757812-5.664063-9.964844-13.628906-18.308594-23.648438-24.820313-9.851562-6.375-21.941406-11.835937-35.90625-16.304687-13.804687-4.378907-29.414062-8.410157-46.394531-12.039063-13.4375-3.085937-23.214844-5.488281-29.042969-7.085937-5.695312-1.558594-11.359375-3.769531-16.882812-6.511719-5.324219-2.644531-9.515625-5.828125-12.53125-9.421875-2.8125-3.429687-5.089844-7.390625-5.089844-12.140625 0-7.761719 5.164062-14.300781 13.933594-20 9.074218-5.929688 21.300781-8.382812 36.339844-8.382812 16.175781 0 28 2.183593 35.039062 7.503906 7.269531 5.460937 13.601562 13.257812 18.824219 23.160156 4.527343 7.734375 8.605469 13.128906 12.53125 16.582031 4.222656 3.695313 10.320312 5.355469 18.089843 5.355469 8.542969 0 15.8125-2.777344 21.539063-8.710938 5.726563-5.902343 9.703125-12.683593 9.703125-20.136718 0-7.730469-3.304688-15.730469-7.660156-23.769532-4.324219-7.972656-11.152344-15.628906-20.398438-22.816406-9.148437-7.125-20.832031-12.886718-34.636718-17.15625-13.765626-4.277344-30.253907-6.410156-49.003907-6.410156-23.417969 0-44.148437 3.214844-61.535156 9.625-17.652344 6.476562-31.382813 15.972656-40.730469 28.109375-9.476562 12.234375-15.035156 26.441406-15.035156 42.210937 0 16.546876 5.320312 30.578126 14.328125 41.800782 8.882813 11.023437 20.996094 19.835937 36.074219 26.210937 14.703125 6.207031 33.1875 11.695313 54.964844 16.339844 16.011718 3.363281 28.96875 6.550781 38.519531 9.5 9.109375 2.816406 16.679687 6.953125 22.410156 12.273437 5.425781 5.054688 8.398437 11.53125 8.398437 19.769532 0 10.414062-5.421874 18.957031-15.871093 26.042968-10.683594 7.253907-24.890625 10.117188-42.238281 10.117188-12.632813 0-22.878907-.996094-30.484376-4.59375-7.570312-3.527344-13.5-8.109375-17.589843-13.496094-4.316407-5.664062-8.367188-12.773437-12.085938-21.257812-3.320312-7.757813-7.433593-13.800782-12.292969-17.863282-5.058593-4.242187-11.28125-6.789062-18.484374-6.789062-8.769532 0-16.140626 3.121094-21.90625 8.480469-5.792969 5.421875-8.742188 12.0625-8.742188 19.695312 0 12.238281 4.519531 24.921875 13.464844 37.671875 8.777344 12.644532 20.429687 22.917969 34.53125 30.484375 19.695312 10.410157 44.984375 15.667969 75.128906 15.667969 25.085938 0 47.164062-3.863281 65.546875-11.453125 18.589844-7.660156 32.921875-18.476563 42.636719-32.140625 9.75-13.699219 14.671875-29.359375 14.691406-46.542969zm0 0"></path></svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_google)): ?>
                    <div class="social-item social-item__google">
                        <a href="<?php echo esc_url($user_google); ?>">
                        <svg version="1.1" id="fi_104093" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 210 210" style="enable-background:new 0 0 210 210;" xml:space="preserve">
                            <path d="M0,105C0,47.103,47.103,0,105,0c23.383,0,45.515,7.523,64.004,21.756l-24.4,31.696C133.172,44.652,119.477,40,105,40
                                c-35.841,0-65,29.159-65,65s29.159,65,65,65c28.867,0,53.398-18.913,61.852-45H105V85h105v20c0,57.897-47.103,105-105,105
                                S0,162.897,0,105z"></path><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g>
                            </svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_tumblr)): ?>
                    <div class="social-item social-item__tumblr">
                        <a href="<?php echo esc_url($user_tumblr); ?>">
                            <svg id="fi_4926528" enable-background="new 0 0 152 152" height="512" viewBox="0 0 152 152" width="512" xmlns="http://www.w3.org/2000/svg"><path id="Icon" d="m50.5 64.2h-14.5c0-.7 0-11.7 0-16.9-.2-1 .5-1.8 1.3-2 16.7-4.9 24.9-29.8 24.9-32.8 0-1.1.7-1.6 1.8-1.6h15.5c1.3 0 1.5.5 1.5 1.6v31.3h30.8v20.4h-30.6c0 .3-.3 44 0 45.9.5 3.1 2.4 5.7 5.2 7.2 4.9 2.9 10.1 3.1 15.5 2.1 4.6-.8 13.5-5.4 14-5.7v18.9c.2 1-.5 1.8-1.3 2-10.1 4.9-21.2 7-32.4 6.2-9.6-.7-18.4-3.4-25.6-10.6-3.6-3.7-6.4-7.8-6.4-13.4z"></path></svg>
                        </a>
                    </div>
                <?php endif; ?>
                <?php if(!empty($user_rss)): ?>
                    <div class="social-item social-item__rss">
                        <a href="<?php echo esc_url($user_rss); ?>">
                            <svg id="fi_4945844" enable-background="new 0 0 152 152" height="512" viewBox="0 0 152 152" width="512" xmlns="http://www.w3.org/2000/svg"><g id="Icon"><path d="m30.6 141c10.6-.3 19-9.2 18.7-19.9-.3-10.2-8.5-18.4-18.7-18.7-10.6-.3-19.5 8.1-19.8 18.7-.3 10.7 8 19.5 18.7 19.9z"></path><path d="m72.6 137.2c0 1.3-.1 2.5-.2 3.8h22.8c0-1.3.2-2.5.2-3.8-.3-44.3-36-80.2-80.2-80.5-1.3 0-2.5.1-3.8.2v22.9c1.3-.1 2.5-.2 3.8-.2 31.6.2 57.1 25.9 57.4 57.6z"></path><path d="m15.2 11c-1.3 0-2.5.2-3.8.2v22.8c1.3 0 2.5-.2 3.8-.2 56.7.3 102.6 46.4 102.9 103.3 0 1.3-.1 2.5-.2 3.8h22.7c0-1.3.2-2.5.2-3.8-.2-69.5-56.3-125.9-125.6-126.1z"></path></g></svg>
                        </a>
                    </div>
                <?php endif; ?>
                    
            </div>
        </div>
        <?php
    }

    function update($new_instance, $old_instance){
        $instance = $old_instance;
        $instance['user_image'] = strip_tags($new_instance['user_image']);
        $instance['user_name'] = strip_tags($new_instance['user_name']);
        $instance['user_position'] = strip_tags($new_instance['user_position']);
        
        $instance['user_hobbie'] = wp_kses_post($new_instance['user_hobbie']);
        $instance['user_location'] = wp_kses_post($new_instance['user_location']);
        $instance['description'] = wp_kses_post($new_instance['description']);

        $instance['user_facebook']  = strip_tags($new_instance['user_facebook']);
        $instance['user_x']   = strip_tags($new_instance['user_x']);
        $instance['user_linkedin']  = strip_tags($new_instance['user_linkedin']);
        $instance['user_pinterest'] = strip_tags($new_instance['user_pinterest']);
        $instance['user_instagram'] = strip_tags($new_instance['user_instagram']);
        $instance['user_youtube']   = strip_tags($new_instance['user_youtube']);
        $instance['user_vimeo']     = strip_tags($new_instance['user_vimeo']);
        $instance['user_skype']     = strip_tags($new_instance['user_skype']);
        $instance['user_google']    = strip_tags($new_instance['user_google']);
        $instance['user_tumblr']    = strip_tags($new_instance['user_tumblr']);
        $instance['user_rss']       = strip_tags($new_instance['user_rss']);

        return $instance;
    }

    function form($instance)
    {
        $user_image = isset($instance['user_image']) ? esc_attr($instance['user_image']) : '';
        $user_name  = isset($instance['user_name']) ? $instance['user_name'] : '';
        $user_position  = isset($instance['user_position']) ? $instance['user_position'] : '';
        $user_hobbie  = isset($instance['user_hobbie']) ? $instance['user_hobbie'] : '';
        $user_location  = isset($instance['user_location']) ? $instance['user_location'] : '';
        $user_bio  = isset($instance['user_bio']) ? $instance['user_bio'] : '';
 
        $user_facebook  = isset($instance['user_facebook']) ? $instance['user_facebook'] : '';
        $user_x   = isset($instance['user_x']) ? $instance['user_x'] : '';
        $user_linkedin  = isset($instance['user_linkedin']) ? $instance['user_linkedin'] : '';
        $user_pinterest = isset($instance['user_pinterest']) ? $instance['user_pinterest'] : '';
        $user_instagram = isset($instance['user_instagram']) ? $instance['user_instagram'] : '';
        $user_youtube   = isset($instance['user_youtube']) ? $instance['user_youtube'] : '';
        $user_vimeo     = isset($instance['user_vimeo']) ? $instance['user_vimeo'] : '';
        $user_skype     = isset($instance['user_skype']) ? $instance['user_skype'] : '';
        $user_google    = isset($instance['user_google']) ? $instance['user_google'] : '';
        $user_tumblr    = isset($instance['user_tumblr']) ? $instance['user_tumblr'] : '';
        $user_rss       = isset($instance['user_rss']) ? $instance['user_rss'] : '';
        
        ?>
        <div class="brighthub-image-wrap">
            <label for="<?php echo esc_url($this->get_field_id('user_image')); ?>"><?php esc_html_e('Author Image', 'brighthub'); ?></label>
            <input type="hidden" class="widefat hide-image-url"
                   id="<?php echo esc_attr($this->get_field_id('user_image')); ?>"
                   name="<?php echo esc_attr($this->get_field_name('user_image')); ?>"
                   value="<?php echo esc_attr($user_image) ?>"/>
            <div class="pxl-show-image">
                <?php
                if ($user_image != "") {
                    ?>
                    <img src="<?php echo wp_get_attachment_image_url($user_image) ?>">
                    <?php
                }
                ?>
            </div>
            <?php
            if ($user_image != "") {
                ?>
                <a href="#" class="pxl-select-image" style="display: none;"><?php esc_html_e('Select Image', 'brighthub'); ?></a>
                <a href="#" class="pxl-remove-image"><?php esc_html_e('Remove Image', 'brighthub'); ?></a>
                <?php
            } else {
                ?>
                <a href="#" class="pxl-select-image"><?php esc_html_e('Select Image', 'brighthub'); ?></a>
                <a href="#" class="pxl-remove-image" style="display: none;"><?php esc_html_e('Remove Image', 'brighthub'); ?></a>
                <?php
            }
            ?>
        </div>
        
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_name')); ?>"><?php esc_html_e( 'Author Name', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_name') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_name') ); ?>" type="text" value="<?php echo esc_attr( $user_name ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_position')); ?>"><?php esc_html_e( 'Author Position', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_position') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_position') ); ?>" type="text" value="<?php echo esc_attr( $user_position ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_location')); ?>"><?php esc_html_e( 'Author Position', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_location') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_location') ); ?>" type="text" value="<?php echo esc_attr( $user_position ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_hobbie')); ?>"><?php esc_html_e( 'Author Hobbie', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_hobbie') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_hobbie') ); ?>" type="text" value="<?php echo esc_attr( $user_hobbie ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_bio')); ?>"><?php esc_html_e('Description', 'brighthub'); ?></label>
            <textarea class="widefat" rows="4" cols="20" id="<?php echo esc_attr($this->get_field_id('user_bio')); ?>" name="<?php echo esc_attr($this->get_field_name('user_bio')); ?>"><?php echo wp_kses_post($user_bio); ?></textarea>
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_facebook')); ?>"><?php esc_html_e( 'Facebook Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_facebook') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_facebook') ); ?>" type="text" value="<?php echo esc_attr( $user_facebook ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_x')); ?>"><?php esc_html_e( 'Twitter Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_x') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_x') ); ?>" type="text" value="<?php echo esc_attr( $user_x ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_linkedin')); ?>"><?php esc_html_e( 'Linkedin Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_linkedin') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_linkedin') ); ?>" type="text" value="<?php echo esc_attr( $user_linkedin ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_pinterest')); ?>"><?php esc_html_e( 'Pinterest Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_pinterest') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_pinterest') ); ?>" type="text" value="<?php echo esc_attr( $user_pinterest ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_instagram')); ?>"><?php esc_html_e( 'Instagram Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_instagram') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_instagram') ); ?>" type="text" value="<?php echo esc_attr( $user_instagram ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_youtube')); ?>"><?php esc_html_e( 'Youtube Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_youtube') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_youtube') ); ?>" type="text" value="<?php echo esc_attr( $user_youtube ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_vimeo')); ?>"><?php esc_html_e( 'Vimeo Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_vimeo') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_vimeo') ); ?>" type="text" value="<?php echo esc_attr( $user_vimeo ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_skype')); ?>"><?php esc_html_e( 'Skype Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_skype') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_skype') ); ?>" type="text" value="<?php echo esc_attr( $user_skype ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_google')); ?>"><?php esc_html_e( 'Google Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_google') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_google') ); ?>" type="text" value="<?php echo esc_attr( $user_google ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_tumblr')); ?>"><?php esc_html_e( 'Tumblr Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_tumblr') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_tumblr') ); ?>" type="text" value="<?php echo esc_attr( $user_tumblr ); ?>" />
        </p>
        <p>
            <label for="<?php echo esc_url($this->get_field_id('user_rss')); ?>"><?php esc_html_e( 'Rss Link', 'brighthub' ); ?></label>
            <input class="widefat" id="<?php echo esc_attr( $this->get_field_id('user_rss') ); ?>" name="<?php echo esc_attr( $this->get_field_name('user_rss') ); ?>" type="text" value="<?php echo esc_attr( $user_rss ); ?>" />
        </p>
        <?php
    }
}