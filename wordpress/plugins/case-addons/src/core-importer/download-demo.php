<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit( 'Direct script access denied.' );
}

/**
* Request a download package from the api server and insert it to the created temp folder if the given token are correct
*
*/
class Pxl_Download_Demo
{
	/**
	 * temp folder name
	 *
	 * @access private
	 * @var string
	 */
	private $temp_folder_name = 'pxlart_temp';

	/**
	 * LiquidThemes Api url
	 *
	 * @access private
	 * @var string
	 */
	private $api_url;

	/**
	 * Compressed data format
	 *
	 * @access private
	 * @var string
	 */
	private $data_format = 'zip';


	public function __construct()
	{
		$pxl_server_info = apply_filters( 'pxl_server_info', ['api_url' => 'https://api.casethemes.net/'] ) ;
		$this->api_url = $pxl_server_info['api_url'] ; 
		add_action( 'wp_ajax_pxlart_prepare_demo_package', array($this, 'ajax_prepare_demo'), 10, 1 );
		add_action( 'wp_ajax_pxlart_upload_demo_manual', array($this, 'ajax_upload_demo_manual'), 10, 1 );
	}
 
	public static function init_filesystem() {

		if ( ! defined( 'FS_METHOD' ) ) {
			define( 'FS_METHOD', 'direct' );
		}

		// The Wordpress filesystem.
		global $wp_filesystem;

		if ( empty( $wp_filesystem ) ) {
			require_once( ABSPATH . '/wp-admin/includes/file.php' );
			WP_Filesystem();
		}

		return $wp_filesystem;
	}

	public function temp_folder($url = false) {
		$this->init_filesystem();

		$upload_dir = wp_upload_dir();
		$temp_folder = $this->temp_folder_name;
		$theme_temp_folder = $upload_dir['basedir'].'/'.$temp_folder;
		if(!file_exists($theme_temp_folder)) {
			wp_mkdir_p( $theme_temp_folder );
		}
		if($url) {
			return $upload_dir['baseurl'].'/'.$temp_folder;
		} else {
			return $theme_temp_folder;
		}
	}

	public function download($demo){
		$item = apply_filters( 'pxl_demo_item_download', get_option( 'template' ) );
		$download_to = $this->temp_folder().'/'.$demo.'.'.$this->data_format;
		$demo_file = $this->api_url.'demos'.'/'.$item.'/'.$demo.'.'.$this->data_format;
		$download_file = wp_safe_remote_get($demo_file, array('timeout' => 3000, 'stream' => true, 'filename' => $download_to));
		
		if (is_wp_error($download_file)) {
			return false;
		}
		
		if ( $download_file['response']['code'] === 200 && file_exists($download_to)) {
			//update_option('pxl_import_demo_id',$demo);
			return true;
		}else{
			unlink($download_to);
			return false;
		}
 
	}

	public function extract($demo) {
		$this->init_filesystem();
		$temp = $this->temp_folder();
		$file = $temp.DIRECTORY_SEPARATOR.$demo.'.'.$this->data_format;

		if(file_exists($file)) {
			unzip_file( $file, $temp );
			unlink($file);
		} else {
			return 'No file to extract or the provided file is not in '.$this->data_format;
		}
	}

	public function ajax_prepare_demo() { //$ret = '{"stat":0}'; echo $ret;  wp_die();
		$demo = esc_attr($_GET['demo']);
		$download_to = $this->temp_folder().'/'.$demo.'.'.$this->data_format;
		$demo_file = get_template_directory() . '/inc/demo-data/' .$demo.'.'.$this->data_format; 
		$ret = '';
  
		if( $demo == '' || !isset($demo) ) {
			$ret = '{"stat":0, "message":"Error: No id provided for the requested demo"}';
		}

		if(file_exists($demo_file)) {
			copy($demo_file, $download_to);
			$download = true;
		}else{
			$download_to = $this->temp_folder().'/'.$demo.'/attachment.zip';
			if(file_exists($download_to) ){
				$ret = '{"stat":1}'; echo $ret;  wp_die();
			}
			$download = $this->download($demo);
		}
  
		// The server wasn't able to download the file
		if( !$download ) {
			$ret = '{"stat":0, "message":"Your server was unable to connect to theme API server. Please check with your hosting company if the connection to '.$this->api_url.' is blocked in the firewall or network setup."}';
			echo $ret;
			//echo '<style type="text/css">.pxl-form-upload-demo{display:block !important;}</style>';
			wp_die();
		}else{
			$this->extract($demo);
			$ret = '{"stat":1}';
		}
 
		echo $ret;
		wp_die();
	}

	public function ajax_upload_demo_manual(){ 
		if ( ! current_user_can( 'manage_options' ) ) {
	        echo "0"; wp_die(); //Permission denied
	    }

	    /*if ( ! isset( $_POST['pxlart_upload_demo_manual_nonce'] ) 
		     || ! wp_verify_nonce( $_POST['pxlart_upload_demo_manual_nonce'], 'pxlart_upload_demo_manual' ) ) {
	    	echo "0"; wp_die(); //Invalid nonce
		}*/

	    if ( empty( $_FILES['file'] ) || ! isset( $_POST['demo_id'] ) ) {
	        echo "2"; wp_die(); //No file or demo_id
	    }

	    $file    = $_FILES['file'];
    	$demo_id = sanitize_text_field( $_POST['demo_id'] );

    	$upload_max_filesize = wp_convert_hr_to_bytes( ini_get( 'upload_max_filesize' ) );
	    if ( $file['size'] > $upload_max_filesize ) {
	        echo "3"; wp_die(); //File too large
	    }

	    $upload_overrides = [
	        'test_form' => false,
	        'mimes'     => [ 'zip' => 'application/zip' ],
	    ];
	    $movefile = wp_handle_upload( $file, $upload_overrides );

	    if ( ! $movefile || isset( $movefile['error'] ) ) {
	        echo "0"; wp_die(); // upload failed
	    }

	    $zip_file = $movefile['file'];

	    $temp_dir = WP_CONTENT_DIR . '/tmp_uploads';
	    if ( ! file_exists( $temp_dir ) ) {
	        wp_mkdir_p( $temp_dir );
	        file_put_contents( $temp_dir . '/.htaccess', "Deny from all" );
	    }

	    $unzip_to = $temp_dir . '/' . $demo_id;
	    if ( file_exists( $unzip_to ) ) {
	        $this->pxl_rrmdir( $unzip_to ); // remove old folder if exist
	    }
	    wp_mkdir_p( $unzip_to );
 
	    $this->init_filesystem();

	    $unzip_result = unzip_file( $zip_file, $unzip_to );

	    unlink( $zip_file ); // remove old zip file

	    if ( is_wp_error( $unzip_result ) ) {
	        $this->pxl_rrmdir( $unzip_to );
	        echo "0"; wp_die(); // Unzip failed
	    }
 		
 		/**
		* If the zip has a single root directory (e.g. 'demo/'),
		* we remove that root to avoid creating a nested folder: uploads/.../demo/demo/...
		*/
	    $root_items = array_values( array_diff( scandir( $unzip_to ), array( '.', '..' ) ) );
	    $base_path = $unzip_to;
	    if ( count( $root_items ) === 1 && is_dir( $unzip_to . '/' . $root_items[0] ) ) {
	        // remove single root directory
	        $base_path = $unzip_to . '/' . $root_items[0];
	    }

	    // Disallow PHP-like extensions only
	    $disallowed_exts = [ 'php', 'phtml', 'php3', 'php4', 'php5', 'phps' ];
    	
    	// Public folder where we want final files 
    	$public_dir = rtrim( $this->temp_folder(), '/\\' ) . '/' . $demo_id;

    	if ( file_exists( $public_dir ) ) {
	        $this->pxl_rrmdir( $public_dir );
	    }
	    wp_mkdir_p( $public_dir );

	    // Iterate from base_path so we avoid duplicating root folder
	    $iterator = new RecursiveIteratorIterator(
	        new RecursiveDirectoryIterator( $base_path, RecursiveDirectoryIterator::SKIP_DOTS ),
	        RecursiveIteratorIterator::SELF_FIRST
	    );
 		
 		foreach ( $iterator as $fileinfo ) {
	        if ( $fileinfo->isDir() ) {
	            continue;
	        }

	        $ext = strtolower( pathinfo( $fileinfo->getFilename(), PATHINFO_EXTENSION ) );
	        if ( in_array( $ext, $disallowed_exts, true ) ) {
	            // skip dangerous file
	            continue;
	        }

	        // relative path inside base_path
	        $relativePath = ltrim( substr( $fileinfo->getPathname(), strlen( $base_path ) ), '/\\' );
	        if ( $relativePath === '' ) {
	            continue;
	        }

	        // extra safety: prevent path traversal
	        if ( strpos( $relativePath, '..' ) !== false ) {
	            continue;
	        }

	        $destPath = $public_dir . '/' . $relativePath;

	        // create parent dir if needed, won't create duplicate nested root
	        wp_mkdir_p( dirname( $destPath ) );

	        // copy file
	        @copy( $fileinfo->getRealPath(), $destPath );
	    }
 		  
	    // remove temp folder
	    $this->pxl_rrmdir( $unzip_to );

	    echo "1";

	    wp_die();
	}
	private function pxl_rrmdir( $dir ) {
	    if ( is_dir( $dir ) ) {
	        $objects = scandir( $dir );
	        foreach ( $objects as $object ) {
	            if ( $object !== "." && $object !== ".." ) {
	                $path = $dir . "/" . $object;
	                if ( is_dir( $path ) ) {
	                    $this->pxl_rrmdir( $path );
	                } else {
	                    unlink( $path );
	                }
	            }
	        }
	        rmdir( $dir );
	    }
	}
	 
}
new Pxl_Download_Demo();
?>
