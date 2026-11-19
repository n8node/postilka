<?php
namespace Elementor\TemplateLibrary;

use Elementor\Api;
use Elementor\Core\Common\Modules\Connect\Module as ConnectModule;
use Elementor\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Source_Custom extends Source_Base {

	const API_TEMPLATES_URL = 'https://my.elementor.com/api/connect/v1/library/templates';
	const PXL_API_TEMPLATES_URL = 'https://api.casethemes.net/demos';

	const TEMPLATES_DATA_TRANSIENT_KEY_PREFIX = 'elementor_remote_templates_data_';
 
	public function get_id() {
		return 'remote';
	}

	public function get_title() {
		return esc_html__( 'Remote', 'elementor' );
	}

	public function register_data() {}

	public function get_items( $args = [] ) {
		$force_update = ! empty( $args['force_update'] ) && is_bool( $args['force_update'] );

		//$pxl_library_data = self::pxl_get_templates_data($force_update);
		$pxl_library_data = self::pxl_get_library_data($force_update);
		$templates_data = $this->get_templates_data( $force_update );

		$templates = [];

		if ( ! empty( $pxl_library_data['templates'] ) ) {
			foreach ( $pxl_library_data['templates'] as $template_data ) {
				$templates[] = $this->prepare_template( $template_data );
			}
		}

		foreach ( $templates_data as $template_data ) {
			$templates[] = $this->prepare_template( $template_data );
		}

		return $templates;
	}

	public function get_item( $template_id ) {
		$templates = $this->get_items();

		return $templates[ $template_id ];
	}

	public function save_item( $template_data ) {
		return new \WP_Error( 'invalid_request', 'Cannot save template to a remote source' );
	}

	public function update_item( $new_data ) {
		return new \WP_Error( 'invalid_request', 'Cannot update template to a remote source' );
	}

	public function delete_template( $template_id ) {
		return new \WP_Error( 'invalid_request', 'Cannot delete template from a remote source' );
	}

	public function export_template( $template_id ) {
		return new \WP_Error( 'invalid_request', 'Cannot export template from a remote source' );
	}

	public function get_data( array $args, $context = 'display' ) {

		if( strpos($args['template_id'], 'pxl_') !== false){
			$data = self::pxl_get_template_content( $args['template_id'] );
		}else{
			$data = Api::get_template_content( $args['template_id'] );
		}

		//$data = Api::get_template_content( $args['template_id'] );

		if ( is_wp_error( $data ) ) {
			return $data;
		}

		// Set the Request's state as an Elementor upload request, in order to support unfiltered file uploads.
		Plugin::$instance->uploads_manager->set_elementor_upload_state( true );

		// BC.
		$data = (array) $data;

		$data['content'] = $this->replace_elements_ids( $data['content'] );
		$data['content'] = $this->process_export_import_content( $data['content'], 'on_import' );

		$post_id = $args['editor_post_id'];
		$document = Plugin::$instance->documents->get( $post_id );
		if ( $document ) {
			$data['content'] = $document->get_elements_raw_data( $data['content'], true );
		}

		// After the upload complete, set the elementor upload state back to false
		Plugin::$instance->uploads_manager->set_elementor_upload_state( false );

		return $data;
	}

	public static function pxl_get_template_content( $template_id ) {
		$theme_slug = get_option( 'template' );
		$api_url = static::PXL_API_TEMPLATES_URL.'/'.$theme_slug.'/library-templates';
		$json_url = $api_url.'/'.$template_id.'.json';
		  
		$response = wp_remote_get( $json_url, [ 'timeout' => 15, 'sslverify' => true ] );

        if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
            return [];
        }
 
        $template_content = json_decode( wp_remote_retrieve_body( $response ), true );
 
		if ( empty( $template_content ) ) {
			return [];
		}

		return $template_content;
	}


	protected function get_templates_data( bool $force_update ): array {
		$experiments_manager = Plugin::$instance->experiments;
		$editor_layout_type = $experiments_manager->is_feature_active( 'container' ) ? 'container_flexbox' : '';

		return $this->get_templates( $editor_layout_type );
	}
	protected function get_templates( string $editor_layout_type ): array {
		$templates_data = $this->get_templates_remotely( $editor_layout_type );

		return empty( $templates_data ) ? [] : $templates_data;
	}
	protected function get_templates_remotely( string $editor_layout_type ) {
		$response = wp_remote_get( static::API_TEMPLATES_URL, [
			'body' => $this->get_templates_body_args( $editor_layout_type ),
		] );

		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return false;
		}

		$templates_data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( empty( $templates_data ) || ! is_array( $templates_data ) ) {
			return [];
		}

		return $templates_data;
	}
	protected function get_templates_body_args( string $editor_layout_type ): array {
		return [
			'plugin_version' => ELEMENTOR_VERSION,
			'editor_layout_type' => $editor_layout_type,
		];
	}
 
	public static function pxl_get_library_data( bool $force_update ) {
		$theme_slug = get_option( 'template' );
		$api_url = static::PXL_API_TEMPLATES_URL.'/'.$theme_slug.'/library-templates';
		$json_url = $api_url.'/info.json';

		$templates_data = [];  
		$response = wp_remote_get( $json_url, [ 'timeout' => 15, 'sslverify' => true ] );
		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return $templates_data;
		}

		$templates_data = json_decode( wp_remote_retrieve_body( $response ), true ); 
			if( !empty($templates_data['templates'])){
			$update_templates = []; 
			foreach ($templates_data['templates'] as $templates) {
				$templates['thumbnail'] = $api_url.'/images/'.$templates['id'].'.jpg';
				$templates['url'] = $api_url . '/images/'.$templates['id'].'.jpg';
 
				$update_templates[] = $templates;
			}
			$templates_data['templates'] = $update_templates;
  
		}

		return $templates_data;
	}

	  
	protected function prepare_template( array $template_data ) {
		$favorite_templates = $this->get_user_meta( 'favorites' );
 
		if ( isset( $template_data['access_tier'] ) ) {
			$access_tier = $template_data['access_tier'];
		} else {
			$access_tier = 0 === $template_data['access_level']
				? ConnectModule::ACCESS_TIER_FREE
				: ConnectModule::ACCESS_TIER_ESSENTIAL;
		}

		return [
			'template_id' => $template_data['id'],
			'source' => $this->get_id(),
			'type' => $template_data['type'],
			'subtype' => $template_data['subtype'],
			'title' => $template_data['title'],
			'thumbnail' => $template_data['thumbnail'],
			'date' => $template_data['tmpl_created'],
			'author' => $template_data['author'],
			'tags' => json_decode( $template_data['tags'] ),
			'isPro' => ( '1' === $template_data['is_pro'] ),
			'accessLevel' => $template_data['access_level'],
			'accessTier' => $access_tier,
			'popularityIndex' => (int) $template_data['popularity_index'],
			'trendIndex' => (int) $template_data['trend_index'],
			'hasPageSettings' => ( '1' === $template_data['has_page_settings'] ),
			'url' => $template_data['url'],
			'favorite' => ! empty( $favorite_templates[ $template_data['id'] ] ),
		];
	}

	public function clear_cache() {
		 
		delete_transient( static::TEMPLATES_DATA_TRANSIENT_KEY_PREFIX . ELEMENTOR_VERSION );
	}

	 
}
