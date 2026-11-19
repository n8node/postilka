<?php
/**
* Insert the import log inside text file so they can be used as for live log
*
*/
class Pxl_Log
{
	public $log_folder;
	public $log_file_name;
	public $log_progress_name;
	public $totalposts;
	public $imported;


	function __construct()
	{  
		$this->log_file_name = 'import_log.txt';
		$this->log_progress_name = 'import_progress.txt';
		$this->log_folder = 'pxlart_log';
		$this->imported = 0;
		add_action( 'wp_ajax_pxlart_progress_imported', array($this, 'getProgress'), 10, 1 );
		add_action( 'wp_ajax_pxlart_total_imported', array($this, 'getImported'), 10, 1 );
		add_action( 'wp_ajax_pxlart_reset_logs', array($this, 'resetFiles'), 10, 1 );
		add_action( 'admin_footer', array( $this, 'loadingTpl'), 10, 1 );
	}
	public function loadingTpl(){
		echo '<style>'; ?>
			.upload-demo-fields{
			    display: flex;
			    align-items: center;
			    justify-content: space-between;
			}
			.pxl-demo-error-confirm .err {
			    color: #f26522;
			}
			.pxl-demo-error-confirm .btn-upload{
			    display:inline-flex;
			    height:45px;
			    padding:5px 25px;
			    min-width: 122px;
			    border:none;
			    border-radius:3px;
			    position:relative;
			    font-size:14px;
			    font-weight:500;
			    color:#fff;
			    background: #1f1f1f;
			    align-items:center;
			    justify-content:center;
			    cursor:pointer;
			    transition:transform .3s,box-shadow .3s
			}
			.pxl-demo-error-confirm .btn-upload svg{
			    width: 22px;
			    height: 22px;
			    fill: #fff;
			    opacity: 0;
			    visibility: hidden;
			    position: absolute;
			    top: 50%;
			    left: 50%;
			    margin-top: -11px;
			    margin-left: -11px;
			    -webkit-animation: spin 1s infinite linear;
			    -khtml-animation: spin 1s infinite linear;
			    -moz-animation: spin 1s infinite linear;
			    -ms-animation: spin 1s infinite linear;
			    -o-animation: spin 1s infinite linear;
			    animation: spin 1s infinite linear;
			}
			.pxl-demo-error-confirm .btn-upload:hover{
			    background-color: #072010;
			}
			.pxl-demo-error-confirm  .btn-upload.loading .btn-text{
			    opacity: 0;
			    visibility: hidden;
			}
			.pxl-demo-error-confirm  .btn-upload.loading svg{
			    opacity: 1;
			    visibility: visible;
			}
			.pxl-demo-error-confirm .confirm-footer button.btn-default{
			    font-size: 0;
			    position: absolute;
			    top: 15px;
			    right: 15px;
			    cursor: pointer;
			    padding: 0; 
			    border-radius: 50%;
			    background: rgba(22, 37, 66, 0.07);
			    border: 9px solid transparent;
			    color: #162542;
			    width: 36px;
			    height: 36px;
			    display: inline-flex;
			    justify-content: center;
			    align-items: center;
			}
			.pxl-demo-error-confirm .confirm-footer button.btn-default:before,
			.pxl-demo-error-confirm .confirm-footer button.btn-default:after{
			    content: '';
			    position: absolute;
			    height: 2px;
			    width: 100%;
			    top: 50%;
			    left: 0;
			    margin-top: -1px;
			    background-color: #162542;
			    transform-origin: 50% 50%;
			    opacity: 1;
			    transition: transform ease 0.25s;
			    -webkit-transition: transform ease 0.25s;
			    -khtml-transition: transform ease 0.25s;
			    -moz-transition: transform ease 0.25s;
			    -ms-transition: transform ease 0.25s;
			    -o-transition: transform ease 0.25s;
			}
			.pxl-demo-error-confirm .confirm-footer button.btn-default:before{
			    transform: rotate(45deg);
			    -webkit-transform: rotate(45deg);
			    -khtml-transform: rotate(45deg);
			    -moz-transform: rotate(45deg);
			    -ms-transform: rotate(45deg);
			    -o-transform: rotate(45deg);
			}
			.pxl-demo-error-confirm .confirm-footer button.btn-default:after{
			    transform: rotate(-45deg);
			    -webkit-transform: rotate(-45deg);
			    -khtml-transform: rotate(-45deg);
			    -moz-transform: rotate(-45deg);
			    -ms-transform: rotate(-45deg);
			    -o-transform: rotate(-45deg);
			}
			.pxl-demo-error-confirm .confirm-footer button.btn-default:hover:before,
			.pxl-demo-error-confirm .confirm-footer button.btn-default:hover:after{
			    transform: rotate(0deg);
			    -webkit-transform: rotate(0deg);
			    -khtml-transform: rotate(0deg);
			    -moz-transform: rotate(0deg);
			    -ms-transform: rotate(0deg);
			    -o-transform: rotate(0deg);
			}
			.pxl-imp-popup-wrap{
			    display:flex;
			    width:100%;
			    height:100%;
			    position:fixed;
			    top:0;
			    left:0;
			    visibility:hidden;
			    align-items:center;
			    justify-content:center;
			    background-color:rgba(255,255,255,.7);
			    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif;
			    font-size:15px;
			    line-height:1.8em;
			    color: #797979;
			    text-align: left;
			}
			.pxl-imp-popup-wrap.active{
			    opacity: 1;
			    visibility: visible;
			    z-index: 2;
			}
			.pxl-demo-loader{
			    display:flex;
			    width:100%;
			    height:100%;
			    position:fixed;
			    top:0;
			    left:0;

			    opacity: 0;
			    visibility:hidden;
			    align-items:center;
			    justify-content:center;
			    background-color:rgba(255,255,255,.7);
			    font-family:Roboto,"Helvetica Neue",sans-serif;
			    font-size:15px;
			    line-height:1.8em;
			    color:#797979
			}
			.pxl-demo-loader.active{
			    opacity: 1;
			    visibility: visible;
			}
		<?php echo '</style>';
		echo '
		  	<div class="pxl-demo-loader pxl-imp-popup-wrap">
				<div class="pxl-imp-loader">	
					<div class="loader"></div>
					<h4>'.esc_html__( 'Downloading...', PXL_TEXT_DOMAIN ).'</h4>
				</div> 
	    	</div>';
	    echo '<div class="pxl-demo-error-confirm">';
		    echo '<div class="confirm-inner">';
		    echo '<h4>'.esc_html__( 'Error', PXL_TEXT_DOMAIN ).'</h4>';
		    echo '<div class="message"></div>';
		    ?>
		    <div class="pxl-form-upload-demo text-center">
				<form enctype='multipart/form-data' action='' method='post'>
					<h4><?php esc_html_e( 'Upload demo data zip file', PXL_TEXT_DOMAIN )?></h4>
					<p><?php esc_html_e( 'Please find the demo file available in the full package downloaded from ThemeForest.', PXL_TEXT_DOMAIN )?> <span>If you can't find it, please download the demo file from the server.</span> <span class="link-download-demo-manual"></span></p>
					<div class="upload-demo-fields">
						<input size="50" type="file" name="demo_filename">
						<button type="button" class="btn btn-upload btn-default">
							<span class="btn-text"><?php echo esc_html__( 'Upload File', PXL_TEXT_DOMAIN ); ?></span>
							<svg id="Flat" height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg"><g id="Arrow-51"><path d="m237.67945 121.44431-11.92163 35.00735s-4.31348 10.62671 4.665 13.87158c0 0 5.5332 3.0979 11.09326-2.06225 13.69385-12.69751 47.93164-50.3274 63.38818-67.45093a11.21918 11.21918 0 0 0 -1.41748-16.1604c-18.20068-14.175-58.46533-45.2688-74.16064-55.39429-6.37305-4.11084-11.28223-.09473-11.28223-.09473-8.27685 4.75806-2.17969 14.47193-2.17969 14.47193l16.48975 29.928c-90.1545 11.71433-160.01803 88.98167-160.01803 182.27143 0 64.5166 34.307 123.12988 86.88245 156.04981a16.15829 16.15829 0 0 0 22.41394-5.21973l8.32251-13.72656a15.88124 15.88124 0 0 0 -5.20484-21.73728c-38.95337-24.28857-64.41407-67.60937-64.41407-115.36621.00001-68.60429 51.1789-125.33392 117.34352-134.38772z"/><path d="m208.51318 427.35034c18.20068 14.17505 58.46533 45.2688 74.16064 55.39429 6.37305 4.11084 11.28223.09473 11.28223.09473 8.27685-4.75806 2.17969-14.47193 2.17969-14.47193l-16.48975-29.928c90.15454-11.71433 160.01807-88.98167 160.01807-182.27143 0-64.5166-34.307-123.12988-86.88245-156.04981a16.15829 16.15829 0 0 0 -22.41394 5.21973l-8.32251 13.72656a15.88124 15.88124 0 0 0 5.20484 21.73728c38.95337 24.28857 64.41407 67.60937 64.41407 115.36621 0 68.49658-51.01831 125.15576-117.032 134.34473l-.06567-.679 11.67578-34.2854s4.31348-10.62671-4.665-13.87158c0 0-5.5332-3.0979-11.09326 2.06225-13.69385 12.69751-47.93164 50.3274-63.38818 67.45093a11.21918 11.21918 0 0 0 1.41744 16.16044z"/></g></svg>
						</button>
				 	</div> 
				 	<?php wp_nonce_field( 'pxlart_upload_demo_manual', 'pxlart_upload_demo_manual_nonce' ); ?>
				</form> 
			</div>
		    <?php 
		    echo '<div class="confirm-footer text-right"><button type="button" class="btn btn-default">'.esc_html__( 'Cancel', PXL_TEXT_DOMAIN ).'</button></div>';
		    echo '</div>';
	    echo '</div>';
	}  
	  
	public function getImported() {
		echo $this->getContent();
		die();
	}
	public function getProgress() {
		echo $this->getContent(true);
		die();
	}
	public function resetFiles() {
		$this->putContent('', true, true);
		die();
	}
	public function uploadDir($url = false) {
		$upload_dir = wp_upload_dir();
		$log_folder = $this->log_folder;
		$theme_import_log_folder = $upload_dir['basedir'].'/'.$log_folder;
		if(!file_exists($theme_import_log_folder)) {
			wp_mkdir_p( $theme_import_log_folder );
		}
		if($url) {
			return $upload_dir['baseurl'].'/'.$log_folder;
		} else {
			return $theme_import_log_folder;
		}
	}
	public function importedTotal($num = false) {
		if($num) {
			return $this->totalposts = $num;
		} else {
			return $this->totalposts;
		}
		
	}

	public function increace($num = false) {
		if($num) {
			return $this->imported += $num;
		} else {
			return $this->imported;
		}
	}
	public function importFile($filename = false) {
		if($filename) {
			return $this->uploadDir().'/'.$this->log_progress_name;
		} else {
			return $this->uploadDir().'/'.$this->log_file_name;
		}
		
	}
	public function getContent($file = false) {
		global $wp_filesystem;
		
		if (empty($wp_filesystem)) {
			require_once (ABSPATH . '/wp-admin/includes/file.php');
			WP_Filesystem();
		}
		return $wp_filesystem->get_contents($this->importFile($file));
	}

	public function putContent($content = '', $rest = false, $filename = false) {
		global $wp_filesystem;
		$import_file = $this->importFile($filename);
		if (empty($wp_filesystem)) {
			require_once (ABSPATH . '/wp-admin/includes/file.php');WP_Filesystem();
		}
		if($rest) {
			$wp_filesystem->put_contents($import_file, "", 0644);
		}
		$old_content = $wp_filesystem->get_contents($import_file);
		if(!empty($content)) {
			$wp_filesystem->put_contents($import_file, $old_content."  ".$content, 0644);
		}
	}
	public function resetFilesLog() {
		global $wp_filesystem;
		if (empty($wp_filesystem)) {
			require_once (ABSPATH . '/wp-admin/includes/file.php');WP_Filesystem();
		}
		$file = $this->uploadDir().'/'.$this->log_file_name;
		$wp_filesystem->put_contents($file, "", 0644);
	}
}
//new Pxl_Log();
?>