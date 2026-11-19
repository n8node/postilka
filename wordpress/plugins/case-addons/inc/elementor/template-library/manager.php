<?php

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Pxl_El_Template_Library
{
    private static $_instance = null;
    public function __construct(){
       
        add_action( 'elementor/init', [ $this, 'pxl_egister_template_library_source' ], 15 );

        add_filter( 'elementor/library/full-data', function( $full_library_data ) {
            $theme_slug = get_option( 'template' );
            $json_url = 'https://api.casethemes.net/demos/' . $theme_slug . '/library-templates/info.json';
            $response = wp_remote_get( $json_url, [ 'timeout' => 15 ] );

            if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
                return $full_library_data;
            }
            
            $data = json_decode( wp_remote_retrieve_body( $response ), true );
            if ( ! empty($data['types_data']['block']['categories']) ) {
                $full_library_data['config']['block']['categories'] = array_merge(
                    $data['types_data']['block']['categories'],
                    $full_library_data['config']['block']['categories']
                );
                
            }

            return $full_library_data;
        });
    }


    public static function instance(){
        if (is_null(self::$_instance)) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }
 
    function pxl_egister_template_library_source(){

        $unregister_source = function($id) {
            unset( $this->_registered_sources[ $id ] );
        };
        $unregister_source->call( \Elementor\Plugin::instance()->templates_manager, 'remote');

        include 'source-custom.php';
        \Elementor\Plugin::instance()->templates_manager->register_source( 'Elementor\TemplateLibrary\Source_Custom' );
    }
 
}

Pxl_El_Template_Library::instance();