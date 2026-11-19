<?php
/**
 * Include the TGM_Plugin_Activation class.
 */
get_template_part( 'inc/admin/libs/tgmpa/class-tgm-plugin-activation' );

add_action( 'tgmpa_register', 'brighthub_register_required_plugins' );
function brighthub_register_required_plugins() {
    include( locate_template( 'inc/admin/demo-data/demo-config.php' ) );
    $pxl_server_info = apply_filters( 'pxl_server_info', ['plugin_url' => 'https://api.casethemes.net/plugins/'] ) ; 
    $default_path = $pxl_server_info['plugin_url'];  
    $images = get_template_directory_uri() . '/inc/admin/assets/img/plugins';
    $plugins = array(
        array(
            'name'               => esc_html__('Redux Framework', 'brighthub'),
            'slug'               => 'redux-framework',
            'required'           => true,
            'logo'        => $images . '/redux.png',
            'description' => esc_html__( 'Build theme options and post, page options for WordPress Theme.', 'brighthub' ),
        ),

        array(
            'name'               => esc_html__('Elementor', 'brighthub'),
            'slug'               => 'elementor',
            'required'           => true,
            'logo'        => $images . '/elementor.png',
            'description' => esc_html__( 'Introducing a WordPress website builder, with no limits of design. A website builder that delivers high-end page designs and advanced capabilities', 'brighthub' ),
        ),

        array(
            'name'               => esc_html__('Case Addons', 'brighthub'),
            'slug'               => 'case-addons',
            'source'             => 'case-addons.zip',
            'required'           => true,
            'logo'        => $images . '/case-addons.png',
            'description' => esc_html__( 'Main process and Powerful Elements Plugin, exclusively for BrightHub WordPress Theme.', 'brighthub' ),
        ),

        array(
            'name'               => esc_html__('Case User', 'brighthub'),
            'slug'               => 'case-user',
            'source'             => 'case-user.zip',
            'required'           => true,
            'logo'        => $images . '/case-user.png',
            'description' => esc_html__( 'Add login and register shortcode to site.', 'brighthub' ),
        ),

        array(
            'name'               => esc_html__('Contact Form 7', 'brighthub'),
            'slug'               => 'contact-form-7',
            'required'           => true,
            'logo'        => $images . '/contact-f7.png',
            'description' => esc_html__( 'Contact Form 7 can manage multiple contact forms, you can customize the form and the mail contents flexibly with simple markup', 'brighthub' ),
        ), 

        array(
            'name'               => esc_html__('Mailchimp', 'brighthub'),
            'slug'               => "mailchimp-for-wp",
            'required'           => true,
            'logo'        => $images . '/mailchimp.png',
            'description' => esc_html__( 'Allowing your visitors to subscribe to your newsletter should be easy. With this plugin, it finally is.', 'brighthub' ),
        ),

        array(
            'name'               => esc_html__('WooCommerce', 'brighthub'),
            'slug'               => "woocommerce",
            'required'           => true,
            'logo'        => $images . '/woo.png',
            'description' => esc_html__( 'WooCommerce is the world’s most popular open-source eCommerce solution.', 'brighthub' ),
        ),

        array(
            'name'               => esc_html__('WooCommerce Smart Compare', 'brighthub'),
            'slug'               => "woo-smart-compare",
            'required'           => false,
            'logo'        => $images . '/woo-smart-compare.png',
            'description' => esc_html__( 'WooCommerce Smart Compare is a plugin that allows you to compare products in your WooCommerce store.', 'brighthub' ),
        ),

        array(
            'name'               => esc_html__('WooCommerce Smart Wishlist', 'brighthub'),
            'slug'               => "woo-smart-wishlist",
            'required'           => false,
            'logo'        => $images . '/woo-smart-wishlist.png',
            'description' => esc_html__( 'WooCommerce Smart Wishlist is a plugin that allows you to add products to your wishlist in your WooCommerce store.', 'brighthub' ),
        ),
        array(
            'name'               => esc_html__('WooCommerce Smart Ajax Add to Cart', 'brighthub'),
            'slug'               => "wpc-ajax-add-to-cart",
            'required'           => false,
            'logo'        => $images . '/woo-smart-ajax-add-to-cart.png',
            'description' => esc_html__( 'WooCommerce Smart Ajax Add to Cart is a plugin that allows you to add products to your cart in your WooCommerce store.', 'brighthub' ),
        ),
    );
 

    $config = array(
        'default_path' => $default_path,           // Default absolute path to pre-packaged plugins.
        'menu'         => 'tgmpa-install-plugins', // Menu slug.
        'is_automatic' => true,
    );

    tgmpa( $plugins, $config );

}