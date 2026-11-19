<?php
if ( ! class_exists( 'ReduxFrameworkInstances' ) ) {
	return;
}

class BrightHub_CSS_Generator {
	/**
     * @access protected
     * @var scssc
     */
    protected $scssc = null;

    /**
     * ReduxFramework class instance
     *
     * @access protected
     * @var ReduxFramework
     */
    protected $redux = null;

    /**
     * Debug mode is turn on or not
     *
     * @access protected
     * @var boolean
     */
    protected $dev_mode = true;

    /**
     * opt_name of ReduxFramework
     *
     * @access protected
     * @var string
     */
    protected $opt_name = '';

	function __construct() {
		$this->opt_name = brighthub()->get_option_name();  
		if ( empty( $this->opt_name ) ) {
			return;
		}
		$this->dev_mode = (defined('THEME_DEV_MODE_SCSS') && THEME_DEV_MODE_SCSS);  
 
		add_filter( 'pxl_scssc_on', '__return_true' );
		add_action( 'init', array( $this, 'init' ) );
        add_action( 'wp_enqueue_scripts', array( $this, 'brighthub_enqueue' ), 20 );
	}

	function init() {

		if ( ! class_exists( 'scssc' ) ) {
			return;
		}

		$this->redux = ReduxFrameworkInstances::get_instance( $this->opt_name );

		if ( empty( $this->redux ) || ! $this->redux instanceof ReduxFramework ) {
			return;
		}
		add_action( 'wp', array( $this, 'brighthub_generate_with_dev_mode' ) );
		add_action( "redux/options/{$this->opt_name}/saved", function () {
			$this->brighthub_generate_file_options();
		} );
	}

	function brighthub_generate_with_dev_mode() {
		if ( $this->dev_mode === true ) {
            $this->brighthub_generate_file_options();
			$this->brighthub_generate_file();
		}
	}

    function brighthub_generate_file_options() {
        $scss_dir = get_template_directory() . '/assets/scss/';
        $this->scssc = new scssc();
        $this->scssc->setImportPaths( $scss_dir );
        $_options = $scss_dir . '_options.scss';
        $this->scssc->setFormatter( 'scss_formatter' );
        $this->redux->filesystem->execute( 'put_contents', $_options, array(
            'content' => preg_replace( "/(?<=[^\r]|^)\n/", "\r\n", $this->brighthub_options_output() )
        ) );
    }

	function brighthub_generate_file() {
		$scss_dir = get_template_directory() . '/assets/scss/';
		$css_dir  = get_template_directory() . '/assets/css/';
        $css_iframe_dir  = get_template_directory() . '/assets/css/iframe/';

		$this->scssc = new scssc();
		$this->scssc->setImportPaths( $scss_dir );

		$css_file = $css_dir . 'style.css';

		$this->scssc->setFormatter( 'scss_formatter' );
		$this->redux->filesystem->execute( 'put_contents', $css_file, array(
			'content' => preg_replace( "/(?<=[^\r]|^)\n/", "\r\n", $this->scssc->compile( '@import "style.scss"' ) )
		) );
	}

	protected function print_scss_opt_colors($variable,$param){
        if(is_array($variable)){
            $k = [];
            $v = [];
            foreach ($variable as $key => $value) {
                $k[] = str_replace('-', '_', $key);
                $v[] = 'var(--'.str_replace(['#',' '], [''],$key).'-color)';
            }
            if($param === 'key'){
                return implode(',', $k);
            }else{
                return implode(',', $v);
            }
            
        } else {
            return $variable;
        }
    }

	protected function brighthub_options_output() {
		$theme_colors                    = brighthub_configs('theme_colors');
        $links                           = brighthub_configs('link');
        $gradients                       = brighthub_configs('gradient');
		ob_start();

		printf('$brighthub_theme_colors_key:(%s);',$this->print_scss_opt_colors($theme_colors,'key'));
        printf('$brighthub_theme_colors_val:(%s);',$this->print_scss_opt_colors($theme_colors,'val'));
        // color rgb only
        foreach ($theme_colors as $key => $value) {
            printf('$%1$s_color_hex: %2$s;', str_replace('-', '_', $key), $value['value']); 
        }
        // color
        foreach ($theme_colors as $key => $value) {
            printf('$%1$s_color: %2$s;', str_replace('-', '_', $key), 'var(--'.str_replace(['#',' '], [''],$key).'-color)' );
        }

        // color rgb only
        foreach ($theme_colors as $key => $value) {
            printf('$%1$s_color_hex: %2$s;', str_replace('-', '_', $key), $value['value']); 
        }
        // color
        foreach ($theme_colors as $key => $value) {
            printf('$%1$s_color: %2$s;', str_replace('-', '_', $key), 'var(--'.str_replace(['#',' '], [''],$key).'-color)' );
        }
         
        // link color
        foreach ($links as $key => $value) {
            printf('$link_%1$s: %2$s;', str_replace('-', '_', $key), 'var(--link-'.$key.')');
        }

        // gradient color
        foreach ($gradients as $key => $value) {
            printf('$gradient_%1$s: %2$s;', str_replace('-', '_', $key), 'var(--gradient-'.$key.')');
        }

        /* Font */
        $font_secondary = brighthub()->get_theme_opt('f_secondary');
        if(isset($font_secondary['font-family'])) {
            if($font_secondary['font-family'] == false) {
                echo '
                    $f_secondary: "Inter";
                ';
            } else {
                echo '
                    $ft_theme_google: '.$font_secondary["font-family"].';
                ';
            }
        }
  
		return ob_get_clean();
	}

    /* Inline CSS */
    function brighthub_enqueue() {
        $css = $this->brighthub_inline_css();
        if ( !empty( $css ) ) {
            wp_add_inline_style( 'pxl-style', $css );
        }
    }
    protected function brighthub_inline_css() {
        ob_start();

        /* Header */ ?>
        @media screen and (min-width: 1201px) {
        <?php  
            $header_layout = brighthub()->get_opt('header_layout');
            if(isset($header_layout) && $header_layout) {
                $post_header = get_post($header_layout);
                $header_type = get_post_meta( $post_header->ID, 'header_type', 'px-header--default' );
                $header_sidebar_width = get_post_meta( $post_header->ID, 'header_sidebar_width', true );
                if ( isset($header_sidebar_width) && !empty($header_sidebar_width) && $header_type == 'px-header--left_sidebar' ) {
                    $pd_left = $header_sidebar_width + 30;
                    printf( '.bd-px-header--left_sidebar:not(.elementor-editor-active) #pxl-header-elementor .px-header--left_sidebar { width: %s; }', esc_attr( $header_sidebar_width ).'px' );
                    printf( '.bd-px-header--left_sidebar:not(.elementor-editor-active) #pxl-main, .bd-px-header--left_sidebar:not(.elementor-editor-active) #pxl-footer-elementor, 
                            .bd-px-header--left_sidebar:not(.elementor-editor-active) #pxl-ptit-elementor { padding-left: %s; }', esc_attr( $header_sidebar_width ).'px' );
                }
            }
            ?>
        }
        <?php /* End Header */
        
        return ob_get_clean();
    }

}

new BrightHub_CSS_Generator();