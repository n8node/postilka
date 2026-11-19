<footer id="pxl-footer-elementor">
    <?php if(isset($args['footer_layout']) && $args['footer_layout'] > 0) : ?>
        <div class="pxl-footer-elementor__inner">
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <?php $post = get_post($args['footer_layout']);
                        if (!is_wp_error($post) && function_exists('pxl_print_html')){
                            $content = \Elementor\Plugin::$instance->frontend->get_builder_content( $args['footer_layout'] );
                            pxl_print_html($content);
                        } ?>
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>
</footer>