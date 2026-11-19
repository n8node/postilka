<?php

defined( 'ABSPATH' ) || exit;

// Load widget assets on wp_init
add_action( 'init', function(){
    if( function_exists('liquid_helper') && liquid_helper()->get_theme_option( 'enable_optimized_files' ) == 'on' ) {
        if ( function_exists('liquid_helper') && ! liquid_helper()->get_assets_cache(liquid_helper()->get_page_id_by_url()) ) {
            include LD_ELEMENTOR_PATH . 'elementor/optimization/widget-assets/widget-assets.php';
        }
    }
} );

// Register widgets
add_action( 'elementor/widgets/register', [ $this, 'register_widgets' ] );

// Load elementor styles in the editor
add_action( 'wp_enqueue_scripts', function(){

    // Load elementor-fronend css on archive pages
    if ( is_archive() || is_search() || is_home() || is_404() || !liquid_helper()->is_page_elementor() ) {
        wp_enqueue_style('elementor-frontend');
    }

    if ( \Elementor\Plugin::$instance->preview->is_preview_mode() ) {
        wp_dequeue_style( 'liquid-theme' );
        wp_enqueue_style(
            'theme-elementor',
            LD_ELEMENTOR_URL . 'assets/css/theme-elementor.min.css',
            ['elementor-frontend'],
            LD_ELEMENTOR_VERSION
        );

        wp_enqueue_style(
            'liquid-elementor-iframe',
            LD_ELEMENTOR_URL . 'assets/css/liquid-elementor-iframe.css',
            ['theme-elementor'],
            LD_ELEMENTOR_VERSION
        );
    }
});

// Elementor After Enqueue
add_action( 'elementor/editor/after_enqueue_scripts', function() {
    wp_enqueue_style(
        'liquid-elementor-editor-style',
        LD_ELEMENTOR_URL . 'assets/css/liquid-elementor-fe.css',
        ['elementor-editor'],
        LD_ELEMENTOR_VERSION
    );

    wp_enqueue_style(
        'liquid-elementor-editor-style-dark',
        LD_ELEMENTOR_URL . 'assets/css/liquid-elementor-fe-dark.css',
        ['elementor-editor'],
        LD_ELEMENTOR_VERSION,
        '(prefers-color-scheme: dark)'
    );

    wp_enqueue_script(
        'liquid-elementor-editor',
        LD_ELEMENTOR_URL . 'assets/js/liquid-elementor-fe.min.js',
        [],
        LD_ELEMENTOR_VERSION,
        true
    );

    // Load Font-Awesome for Elementor widget icon
    wp_enqueue_style(
        'font-awesome-all',
        plugins_url() . '/elementor/assets/lib/font-awesome/css/all.min.css',
        ['elementor-editor'],
        LD_ELEMENTOR_VERSION
    );

    // Liquid Template Editor JS
	wp_add_inline_script( 'elementor-editor', '

		let tmpl_id = 0,
		new_tmpl_id = 0,
		tmpl_control = "",
		tmpl_action = "";

		function lqd_edit_tmpl(event){

			tmpl_action = "edit";
			document.querySelector("#lqd-tmpl-edit").style.display = "block";

			// get current template id
			var parent = (event.target).parentElement.parentElement.parentElement;
			var children = parent.children;
			tmpl_control = children[0].children[0].control;
			tmpl_id = tmpl_control.value ? tmpl_control.value : "";

			if ( tmpl_id ) {
				document.getElementById("lqd-tmpl-edit-iframe").setAttribute("src", "'. admin_url() .'post.php?post=" + tmpl_id + "&action=elementor");
				console.log("LIQUID - Editing Template: " + tmpl_id);
			} else {
				console.log("LIQUID - Template ID not found!");
			}

		}

		function lqd_add_tmpl(event){

			tmpl_action = "add";
			document.querySelector("#lqd-tmpl-edit").style.display = "block";

			// get current template id
			var parent = (event.target).parentElement.parentElement.parentElement;
			var children = parent.children;
			tmpl_control = children[0].children[0].control;
			tmpl_id = tmpl_control.value ? tmpl_control.value : "";


			jQuery.post(ajaxurl, { "action": "lqd_add_tmpl" }, function (response) {
				new_tmpl_id = response.data;
				jQuery(tmpl_control).append("<option value="+ new_tmpl_id +">Template #" + new_tmpl_id + "</option>");
				document.getElementById("lqd-tmpl-edit-iframe").setAttribute("src", "'. admin_url() .'post.php?post=" + new_tmpl_id + "&action=elementor");
				console.log("LIQUID - New Template Added: Template #" + new_tmpl_id );
			});


			if ( tmpl_id ) {
				console.log("LIQUID - Editing Template: " + tmpl_id);
			} else {
				console.log("LIQUID - Template ID not found!");
			}

		}

		// Edit Custom CPT
		elementor.on( "document:loaded", () => {

			console.log("LIQUID - Elementor iframe loaded!");

			const elementorPreviewIframe = document.querySelector("#elementor-preview-iframe");

			// Get the button element from the iframe

			const editButtons = elementorPreviewIframe.contentWindow.document.querySelectorAll(".lqd-tmpl-edit-cpt--btn");

			editButtons.forEach(function(button) {
				button.addEventListener("click", function(event) {

					tmpl_id = button.getAttribute("data-post-id");
					document.querySelector("#lqd-tmpl-edit").style.display = "block";
					document.getElementById("lqd-tmpl-edit-iframe").setAttribute("src", "'. admin_url() .'post.php?post=" + tmpl_id + "&action=elementor");
					console.log("LIQUID - Editing Template: " + tmpl_id);
				});
			});

			// Close iFrame
			document.querySelector(".lqd-tmpl-edit--close").addEventListener("click", function(){
				document.getElementById("lqd-tmpl-edit-iframe").setAttribute("src", "about:blank");
				document.querySelector("#lqd-tmpl-edit").style.display = "none";
				if ( tmpl_action === "add" ) {
					jQuery(tmpl_control).val( new_tmpl_id );
					jQuery(tmpl_control).trigger( "change" );
				} else if ( tmpl_action === "edit" ) {
					jQuery(tmpl_control).val( tmpl_id );
					jQuery(tmpl_control).trigger( "change" );
				} else if ( tmpl_action === "cpt" ) {
					// do something
				}

			});

		} );

		'
	);
} );

// Elementor Preview CSS / JS
add_action( 'elementor/preview/enqueue_styles', function() {
    wp_enqueue_script(
        'liquid-elementor-iframe',
        LD_ELEMENTOR_URL . 'assets/js/liquid-elementor-iframe.min.js',
        ['elementor-frontend'],
        LD_ELEMENTOR_VERSION,
        true
    );
} );

// Elementor Template Editor - Add new template / ajax
add_action( 'wp_ajax_lqd_add_tmpl', function(){

	$post_id = wp_insert_post(
		[
			'post_type' => 'elementor_library',
			'meta_input' => [ '_elementor_template_type' => 'section' ]
		]
	);

	if( ! is_wp_error( $post_id ) ) {
		wp_update_post(
			[
				'ID' => $post_id,
				'post_title'=> sprintf( 'Template #%s', $post_id )
			]
		);
		wp_send_json_success( $post_id );
	}

} );

// Elementor Template Editor - Template & Style
add_action( 'elementor/editor/footer', function() {
	?>
		<style>
			.lqd-tmpl-edit-editor-buttons{
				display: flex;
				gap: 1em;
				width: 100%;
			}
			.lqd-tmpl-edit-editor-buttons button {
				width: 100%;
				padding: .7em;
				text-transform: capitalize;
				font-size: 10px;
			}
			#lqd-tmpl-edit {
				position: fixed;
				z-index: 99999;
				width: 90%;
				height: 90%;
				left:5%;
				top: calc(5% - 20px);
				background: #fff;
				box-shadow: 0 0 120px #000;
			}
			.lqd-tmpl-edit--header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				background-color: #26292C;
				height: 39px;
				border-bottom: solid 1px #404349;
				padding: 1em;
			}
			.lqd-tmpl-edit--logo {
				display: inline-flex;
				align-items: center;
				gap: 10px;
				font-weight: 500;
			}
			.lqd-tmpl-edit--close {
				font-size: 20px;
				cursor: pointer;
				padding: 20px;
				margin-inline-end: -20px;
			}
		</style>
		<div id="lqd-tmpl-edit" class="lqd-tmpl-edit" style="display:none;">
			<div class="lqd-tmpl-edit--header">
				<div class="lqd-tmpl-edit--logo"><img src="<?php echo esc_url(  LD_ELEMENTOR_URL . 'assets/img/logo/liquid-logo.svg' );?>" height="20"><?php esc_html_e( 'Edit Template' ); ?></div>
				<div class="lqd-tmpl-edit--close">&times;</div>
			</div>
			<iframe src="about:blank" width="100%" height="100%" frameborder="0" id="lqd-tmpl-edit-iframe"></iframe>
		</div>
		<script>
			(() => {
				const closeModal = document.querySelector('.lqd-tmpl-edit--close');
				if ( !closeModal ) return;
				closeModal.addEventListener('click', async () => {
					if ( typeof $e === 'undefined' ) return;
					await $e.run('document/save/update', { force: true });
					elementor.reloadPreview();
				})
			})();
		</script>
	<?php
} );

// Add custom fonts to elementor from redux
if ( function_exists('liquid_helper') ){

    if ( !empty( liquid_helper()->get_option( 'custom_font_title' )[0]) ){
        // Add Fonts Group
        add_filter( 'elementor/fonts/groups', function( $font_groups ) {
            $font_groups['liquid_custom_fonts'] = __( 'Liquid Custom Fonts' );
            return $font_groups;
        } );

        // Add Group Fonts
        add_filter( 'elementor/fonts/additional_fonts', function( $additional_fonts ) {
            $font_list = array_unique( liquid_helper()->get_option( 'custom_font_title' ) );
            foreach( $font_list as $font_name){
                // Font name/font group
                $additional_fonts[$font_name] = 'liquid_custom_fonts';
            }
            return $additional_fonts;
        } );

    }

    // Google Fonts display
    if ( get_option( 'elementor_font_display' ) !== liquid_helper()->get_theme_option( 'google_font_display' ) ) {
        update_option( 'elementor_font_display', liquid_helper()->get_theme_option( 'google_font_display' ) );
    }

}

// Add missing Google Fonts
add_filter( 'elementor/fonts/additional_fonts', function( $additional_fonts ){
    if ( !is_array($additional_fonts) ) {
        $additional_fonts = [];
    }
    $fonts = array(
        // font name => font file (system / googlefonts / earlyaccess / local)
        'Outfit' => 'googlefonts',
        'Golos Text' => 'googlefonts'
    );
    $fonts = array_merge( $fonts, $additional_fonts );
    return $fonts;
} );

// Custom Shapes
add_action( 'elementor/shapes/additional_shapes', function( $additional_shapes ) {

    for ($i=1; $i<=15; $i++){
        $additional_shapes[ 'lqd-custom-shape-'.$i ] = [
            'title' => __('Liquid Shape - '.$i, 'hub-elementor-addons'),
            'path' => LD_ELEMENTOR_PATH . 'elementor/params/shape-divider/'.$i.'.svg',
            'url' => LD_ELEMENTOR_URL . 'elementor/params/shape-divider/'.$i.'.svg',
            'has_flip' => false,
            'has_negative' => false,
        ];
    }
    return $additional_shapes;
});

// Woocommerce Session Handler
if ( class_exists( 'WooCommerce' ) && (! empty( $_REQUEST['action'] ) && 'elementor' === $_REQUEST['action'] && is_admin()) ) {
    add_action( 'admin_action_elementor', function(){
        \WC()->frontend_includes();
        if ( is_null( \WC()->cart ) ) {
            global $woocommerce;
            $session_class = apply_filters( 'woocommerce_session_handler', 'WC_Session_Handler' );
            $woocommerce->session = new $session_class();
            $woocommerce->session->init();

            $woocommerce->cart     = new \WC_Cart();
            $woocommerce->customer = new \WC_Customer( get_current_user_id(), true );
        }
    }, 5 );
}

// Regenerate assets css after save posts
add_action( 'elementor/editor/after_save', function( $post_id ) {

	\Elementor\Plugin::instance()->files_manager->clear_cache();
	update_option( 'shape_cutout_the_content', array() );
	update_option( 'liquid_templates_callback_css', array() );

    if (
        get_post_type( $post_id ) === 'liquid-header' ||
        get_post_type( $post_id ) === 'liquid-footer' ||
        get_post_type( $post_id ) === 'liquid-mega-menu'
    ){
        liquid_helper()->purge_assets_cache( true );
    } else {
        liquid_helper()->purge_assets_cache( $post_id );
    }

});

// Purge assets cache after save for theme options
add_action( 'redux/options/liquid_one_opt/saved', function() {
    \Elementor\Plugin::instance()->files_manager->clear_cache(); // regenerate elementor css
    liquid_helper()->purge_assets_cache( true ); // purge cache for all assets
});


/**
 *
 * FIX Offset bug
 *
 */
add_action( 'pre_get_posts', function ( &$query ) {

    if ( ! empty( $query->query_vars['lqd_offset'] ) ) {
        if ( $query->is_paged ) {
            $query->query_vars['offset'] = $query->query_vars['lqd_offset'] + ( ( $query->query_vars['paged'] - 1 ) * $query->query_vars['posts_per_page'] );
        } else {
            $query->query_vars['offset'] = $query->query_vars['lqd_offset'];
        }
    }
}, 1 );

add_filter( 'found_posts', function ( $found_posts, $query ) {

    $lqd_offset = $query->get( 'lqd_offset' );

    if ( $lqd_offset ) {
        $found_posts -= $lqd_offset;
    }

    return $found_posts;
}, 1, 2 );

add_filter( 'hub/elementor/widget/ai_button', function( $source ) {
	return sprintf( '<div class="hub-ai-text-modal" data-source="%s"></div>', $source );
}, 10 );
