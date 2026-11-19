<?php
/**
 * WPC Core — HPOS Compatibility.
 *
 * Declares WooCommerce HPOS (custom_order_tables) compatibility
 * for ALL registered WPC plugins.
 *
 * @package WPC_Core
 */

use Automattic\WooCommerce\Utilities\FeaturesUtil;

defined( 'ABSPATH' ) || exit;

add_action( 'before_woocommerce_init', function () {
	if ( ! class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
		return;
	}

	// Loop through ALL registered plugins
	$plugins = WPC_Core_Registry::instance()->get_plugins();

	foreach ( $plugins as $plugin ) {
		FeaturesUtil::declare_compatibility(
			'custom_order_tables', $plugin['file']
		);
	}
} );
