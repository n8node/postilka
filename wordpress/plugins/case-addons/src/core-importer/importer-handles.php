<?php
if (!class_exists('Pxl_Download_Demo')) {
    require_once PXL_PATH . 'src/core-importer/download-demo.php';
}
if (!class_exists('Pxl_Log')) {
    require_once PXL_PATH . 'src/core-importer/import-log.php';
}
class Pxl_Importer
{

    public $selected_demo_folder;
    public $download;
    public $log;
    public $theme_option_name; //set theme options name here

    public $demo_info_file_name = 'demo-info.json';
    public $woo_attributes_file_name = 'woo_attributes.json';
    public $media_file_zip_name = 'attachment.zip';
    public $media_file_name = 'media.xml';
    public $content_file_name  =  'content.xml';
    public $term_meta_file_name  =  'term-meta.json';
    public $theme_options_file_name = 'theme-options.json';
    public $widgets_file_name     =  'widgets.wie';
    public $settings_file_name = 'settings.json';


    public $demo_files_path;
    public $demo_info_files_path;
    public $woo_attributes_files_path;
    public $media_file_zip_path;
    public $media_file_path;
    public $content_file_path;
    public $term_meta_file_path;
    public $theme_options_file_path;
    public $widgets_file_path;
    public $settings_file_path;

    private static $instance;



    public function __construct()
    {
        if (isset($_POST['demo']) && !empty($_POST['demo'])) {
            $demo = esc_attr($_POST['demo']);
        } else {
            $demo = $this->selected_demo_folder;
        }
        $this->download = new Pxl_Download_Demo();
        $this->log = new Pxl_Log();

        //$this->theme_option_name       = 'pxl_theme_options';
        $this->demo_files_path           = $this->download->temp_folder() . DIRECTORY_SEPARATOR . $demo . DIRECTORY_SEPARATOR;

        $this->demo_info_files_path      = $this->demo_files_path . $this->demo_info_file_name;
        $this->woo_attributes_files_path = $this->demo_files_path . $this->woo_attributes_file_name;
        $this->media_file_zip_path       = $this->demo_files_path . $this->media_file_zip_name;
        $this->media_file_path           = $this->demo_files_path . 'content' . DIRECTORY_SEPARATOR . $this->media_file_name;
        $this->content_file_path         = $this->demo_files_path . 'content' . DIRECTORY_SEPARATOR . $this->content_file_name;
        $this->term_meta_file_path       = $this->demo_files_path . $this->term_meta_file_name;
        $this->theme_options_file_path   = $this->demo_files_path . $this->theme_options_file_name;
        $this->widgets_file_path         = $this->demo_files_path . $this->widgets_file_name;
        $this->settings_file_path        = $this->demo_files_path . $this->settings_file_name;

        add_action('wp_ajax_pxlart_import_start', array($this, 'ajax_import_start'), 10, 1);
        add_action('wp_ajax_pxlart_import_media', array($this, 'ajax_import_media'), 10, 1);
        add_action('wp_ajax_pxlart_import_content', array($this, 'ajax_import_content'), 10, 1);
        add_action('wp_ajax_pxlart_import_theme_options', array($this, 'ajax_import_theme_options'), 10, 1);
        add_action('wp_ajax_pxlart_import_widgets', array($this, 'ajax_import_widgets'), 10, 1);
        add_action('wp_ajax_pxlart_import_slider', array($this, 'ajax_import_slider'), 10, 1);
        add_action('wp_ajax_pxlart_import_settings', array($this, 'ajax_import_settings'), 10, 1);
        add_action('wp_ajax_pxlart_import_finish', array($this, 'ajax_import_finish'), 10, 1);

        self::$instance = $this;
    }

    public function ajax_import_start()
    {
        $demo = esc_attr($_POST['demo']);
        $skip_posts = isset($_POST['skip_posts']) ? $_POST['skip_posts'] : 'no';
        $this->selected_demo_folder = $demo;
        $part = $this->demo_files_path;
        $upload_dir = wp_upload_dir();
        do_action('pxl-import-start', $demo);
        $css = get_template_directory() . '/assets/css/style.css';
        if (file_exists($part . 'style.css')) {
            copy($part . 'style.css', $css);
        }
        if (file_exists($part . 'elementor-widget.zip')) {
            unzip_file($part . 'elementor-widget.zip', $upload_dir['basedir']);
        }
        if ($skip_posts == 'no') {
            $this->pxl_import_truncate_tables();
        }
    }
    public function ajax_import_media()
    {
        $demo = esc_attr($_POST['demo']);
        $this->selected_demo_folder = $demo;
        $zip_file = $this->media_file_zip_path; //$this->demo_files_path.$this->media_file_zip_name;
        $file = $this->media_file_path; //$this->demo_files_path.'content'.DIRECTORY_SEPARATOR.$this->media_file_name;
        $attachment = true;

        $this->log->resetFilesLog();

        $upload_dir = wp_upload_dir();

        if (empty($zip_file) || !is_file($zip_file)) {
            $this->log->putContent('Error: Attachment file not found! |');
            wp_die(esc_html__('Error: Attachment file not found!', PXL_TEXT_DOMAIN));
        }

        unzip_file($zip_file, $upload_dir['basedir']);

        if (empty($file) || !is_file($file)) {
            $this->log->putContent('Error: media file not found! |');
            wp_die(
                esc_html__('The XML file containing the dummy content is not available or could not be read .. You might want to try to set the file permission to chmod 755.<br/>If this doesn\'t work please use the Wordpress importer and import the XML file (should be located in your download .zip: Sample Content folder) manually', PXL_TEXT_DOMAIN),
                '',
                array('back_link' => true)
            );
        }


        if (!defined('WP_LOAD_IMPORTERS')) define('WP_LOAD_IMPORTERS', true);

        require_once ABSPATH . 'wp-admin/includes/import.php';

        $importer_error = false;

        if (!class_exists('WP_Importer')) {
            $class_wp_importer = ABSPATH . 'wp-admin/includes/class-wp-importer.php';
            if (file_exists($class_wp_importer))
                require_once($class_wp_importer);
            else
                $importer_error = true;
        }
        if (!class_exists('WP_Import')) {
            $class_wp_import = dirname(__FILE__) . '/content-src/wordpress-importer.php';
            if (file_exists($class_wp_import))
                require_once($class_wp_import);
            else
                $importer_error = true;
        }

        //require_once dirname( __FILE__ ) . '/wordpress-importer.php';
        if ($importer_error) {
            $this->log->putContent('Error on import media |');
            wp_die(esc_html__('Error on import media', PXL_TEXT_DOMAIN));
        } else {
            $wp_import = new PXL_Import();
            $wp_import->fetch_attachments = $attachment;
            $wp_import->import($file, $attachment);
            $this->log->putContent('media imported successfully', true, true);
            $this->log->putContent('Import media successfully! |');
            echo esc_html__('Import media successfully!', PXL_TEXT_DOMAIN);
        }
        wp_die();
    }

    public function ajax_import_content()
    {
        $demo = esc_attr($_POST['demo']);
        $this->selected_demo_folder = $demo;
        $file = $this->content_file_path; //$this->demo_files_path.'content'.DIRECTORY_SEPARATOR.$this->content_file_name;

        if (empty($file) || !is_file($file)) {
            $this->log->putContent('Error: content file not found! |');
            wp_die(
                esc_html__('The XML file containing the dummy content is not available or could not be read .. You might want to try to set the file permission to chmod 755.<br/>If this doesn\'t work please use the Wordpress importer and import the XML file (should be located in your download .zip: Sample Content folder) manually', PXL_TEXT_DOMAIN),
                '',
                array('back_link' => true)
            );
        }

        if (!defined('WP_LOAD_IMPORTERS')) define('WP_LOAD_IMPORTERS', true);

        require_once ABSPATH . 'wp-admin/includes/import.php';

        $importer_error = false;

        if (!class_exists('WP_Importer')) {
            $class_wp_importer = ABSPATH . 'wp-admin/includes/class-wp-importer.php';
            if (file_exists($class_wp_importer))
                require_once($class_wp_importer);
            else
                $importer_error = true;
        }
        if (!class_exists('WP_Import')) {
            $class_wp_import = dirname(__FILE__) . '/content-src/wordpress-importer.php';
            if (file_exists($class_wp_import))
                require_once($class_wp_import);
            else
                $importer_error = true;
        }

        if ($importer_error) {
            $this->log->putContent('Error on import content |');
            wp_die(esc_html__('Error on import content', PXL_TEXT_DOMAIN));
        } else {
            $wp_import = new PXL_Import();
            $zip_file = $this->media_file_zip_path; // $this->demo_files_path.$this->media_file_zip;
            $attachment = !is_file($zip_file) ? $this->pxl_import_add_placeholder_image() : null;
            $wp_import->import($file, $attachment);
            $this->log->putContent('Content imported successfully', true, true);
            $this->log->putContent('Content imported successfully |');
            echo esc_html__('Import Content successfully!', PXL_TEXT_DOMAIN);

            //import woo tax
            $woo_atts_file = $this->woo_attributes_files_path;
            if (file_exists($woo_atts_file) && class_exists('WooCommerce')) {
                $data = file_get_contents($woo_atts_file);
                $atts_data = json_decode($data, true);
                $attributes = wc_get_attribute_taxonomies();
                if (isset($atts_data["tax"]) && count($atts_data["tax"])) {
                    if (is_array($attributes)) {
                        foreach ($attributes as $attribute) {
                            if (array_key_exists($attribute->attribute_name, $atts_data["tax"]))
                                unset($atts_data["tax"][$attribute->attribute_name]);
                        }
                    }
                    do_action('pxl_before_import_product_attribute');
                    foreach ($atts_data["tax"] as $slug => $att) {
                        if (!empty($att['data'])) {
                            $woo_atts = $att['data'];
                            wc_create_attribute(array(
                                'name' => $woo_atts['attribute_label'],
                                'slug' => $woo_atts['attribute_name'],
                                'type' => $woo_atts['attribute_type'],
                                'order_by' => $woo_atts['attribute_orderby'],
                                'has_archives' => $woo_atts['attribute_public']
                            ));
                        }
                    }
                }
                update_option("pxl_woo_term_imported", "not_imported");
            }
            // import term meta
            $term_meta_file = $this->term_meta_file_path;
            if (file_exists($term_meta_file)) {
                // Get file contents and decode
                $data = file_get_contents($term_meta_file);
                $taxonomies_data = json_decode($data, true);
                if (!empty($taxonomies_data)) {
                    foreach ($taxonomies_data as $tax_name => $terms) {
                        foreach ($terms as $term_slug => $term_metas) {
                            $term = get_term_by('slug', $term_slug, $tax_name);
                            foreach ($term_metas as $key => $value) {
                                if (maybe_unserialize($value[0]) !== false && strpos($value[0], 'http') !== false && is_array(maybe_unserialize($value[0]))) {
                                    $str_data = json_encode(maybe_unserialize($value[0]));
                                    $index_start = strpos($str_data, 'http');
                                    $length = strpos($str_data, 'wp-content') - $index_start;
                                    $old_site = substr($str_data, $index_start, $length);
                                    $new_data = str_replace($old_site, site_url() . '/', $str_data);
                                    $new_data = json_decode($new_data, true);
                                } else {
                                    $new_data = maybe_unserialize($value[0]) !== false ? maybe_unserialize($value[0]) : $value[0];
                                }
                                if (!empty($term->term_id)) {
                                    update_term_meta($term->term_id, $key, $new_data);
                                }
                            }
                        }
                    }
                }
            }
        }
        wp_die();
    }

    public function ajax_import_theme_options()
    {
        $demo = esc_attr($_POST['demo']);
        $this->selected_demo_folder = $demo;
        $file = $this->theme_options_file_path; //$this->demo_files_path . $this->theme_options_file_name;

        if (empty($file) || !is_file($file)) {
            $this->log->putContent('Error: theme options file not found! |');
            wp_die(
                esc_html__('The theme options json file containing the dummy content is not available or could not be read .. You might want to try to set the file permission to chmod 755.', PXL_TEXT_DOMAIN),
                '',
                array('back_link' => true)
            );
        }

        $data = file_get_contents($file);

        if (file_exists($this->demo_info_files_path)) {
            $info_demo = json_decode(file_get_contents($this->demo_info_files_path), true);
            if (!empty($info_demo['old_domain'])) {
                $data = str_replace(str_replace("\"", '', json_encode($info_demo['old_domain'])), str_replace("\"", '', json_encode(site_url())), $data);
            }
        }

        $data = json_decode($data, true);

        if (empty($data) || ! is_array($data)) {
            $this->log->putContent('Error: Faild to import theme options |');
            wp_die(esc_html__('Theme options import data could not be read. Please try a different file.', PXL_TEXT_DOMAIN));
        }


        $_replaces = apply_filters('pxl_import_replace_theme_options', array());
        foreach ($_replaces as $pattern => $_replace) {
            if (isset($data[$pattern])) {
                $data[$pattern] = $_replace;
            }
        }

        $setting_file = $this->settings_file_path;
        if (!empty($setting_file) || is_file($setting_file)) {
            $settings = json_decode(file_get_contents($setting_file), true);
            if (!empty($settings['opt-name']))
                $this->theme_option_name = apply_filters('pxl_ie_options_name', $settings['opt-name']);
            else
                $this->theme_option_name = apply_filters('pxl_ie_options_name', 'pxl_theme_options');
        } else {
            $this->theme_option_name = apply_filters('pxl_ie_options_name', 'pxl_theme_options');
        }

        update_option($this->theme_option_name, $data);

        $this->log->putContent('Theme options imported successfully', true, true);
        $this->log->putContent('Theme options imported successfully |');
        echo esc_html__('Import theme options successfully!', PXL_TEXT_DOMAIN);
        wp_die();
    }

    public function ajax_import_widgets()
    {
        $demo = esc_attr($_POST['demo']);
        $this->selected_demo_folder = $demo;
        $file = $this->widgets_file_path; //$this->demo_files_path . $this->theme_options_file_name;

        if (empty($file) || !is_file($file)) {
            $this->log->putContent('Error: widgets file not found! |');
            wp_die(
                esc_html__('The widgets file containing the dummy content is not available or could not be read .. You might want to try to set the file permission to chmod 755.', PXL_TEXT_DOMAIN),
                '',
                array('back_link' => true)
            );
        }



        $data = array('nav_menu' => array());
        // Get file contents and decode
        $data['sidebars'] = json_decode(file_get_contents($file));

        if (file_exists($this->demo_files_path . 'widgets.json')) {
            $data['nav_menu'] = json_decode(file_get_contents($this->demo_files_path . 'widgets.json'));
        }

        // Import the widget data
        // Make results available for display on import/export page
        $this->pxl_import_widgets_import_data($data);

        $this->log->putContent('Widgets imported successfully', true, true);
        $this->log->putContent('Widgets imported successfully |');
        echo esc_html__('Import widgets successfully!', PXL_TEXT_DOMAIN);
        wp_die();
    }

    public function ajax_import_slider()
    {
        $demo = esc_attr($_POST['demo']);
        $this->selected_demo_folder = $demo;
        if (class_exists('RevSliderSlider')) {
            $folder = trailingslashit($this->demo_files_path . 'revslider/');
            if (is_dir($folder)) {
                $slider = new RevSliderSliderImport();

                $files = scandir($folder);

                $files = array_diff($files, array('..', '.'));
                $log = [];
                foreach ($files as $_f) {

                    $_FILES["import_file"]["tmp_name"] = $folder . $_f;
                    $_FILES['import_file']['error'] = '';

                    ob_start();

                    $slider->import_slider();

                    $log[] = ob_get_clean();
                }
                $this->log->putContent('Import slider data successfully', true, true);
                $this->log->putContent('Slider imported successfully |');
                echo esc_html__('Import slider data successfully', PXL_TEXT_DOMAIN);
                return $log;
            }
        } else {
            echo esc_html__('Failed to import slider data, Please make sure to install and activate slider revolution plugin first', PXL_TEXT_DOMAIN);
            $this->log->putContent('Failed to import slider data |');
        }
        wp_die();
    }

    public function ajax_import_settings()
    {
        $demo = esc_attr($_POST['demo']);
        $this->selected_demo_folder = $demo;
        $file = $this->settings_file_path;
        if (empty($file) || !is_file($file)) {
            $this->log->putContent('Error: theme settings file not found! |');
            wp_die(
                esc_html__('The theme setting json file containing the dummy content is not available or could not be read .. You might want to try to set the file permission to chmod 755.', PXL_TEXT_DOMAIN),
                '',
                array('back_link' => true)
            );
        }
        $settings = json_decode(file_get_contents($file), true);

        foreach ($settings as $key => $setting) {
            switch ($key) {
                case 'home':
                    if (!empty($setting)) {
                        $page = new WP_Query(array('post_type' => 'page', 'posts_per_page' => 1, 'name' => $setting));
                        if ($page->post) {
                            update_option('show_on_front', 'page');
                            update_option('page_on_front', $page->post->ID);
                        }
                    }
                    break;
                case 'menus':
                    if (!empty($setting)) {
                        $new_setting = array();
                        foreach ($setting as $key => $menu) {
                            $_menu = get_term_by('slug', $menu, 'nav_menu');
                            if ($_menu !== false) {
                                $new_setting[$key] = $_menu->term_id;
                            }
                        }
                        set_theme_mod('nav_menu_locations', $new_setting);
                    }
                    break;
                case 'me_events_page_id':
                case 'me_tickets_page_id':
                    if (!empty($setting)) {
                        $page = new \WP_Query(array('post_type' => 'page', 'posts_per_page' => 1, 'name' => $setting));
                        if ($page->post) {
                            update_option($key, $page->post->ID);
                        }
                    }
                    break;
                case 'wp-options':
                    if (!empty($setting)) {
                        foreach ($setting as $key => $value) {
                            update_option($key, $value);
                        }
                    }
                    break;
                case 'elementor_active_kit':
                    if (!empty($setting)) {
                        update_option('elementor_active_kit', $setting, 'yes');
                    }
                    break;
            }
        }
        $this->log->putContent('Import settings successfully', true, true);
        $this->log->putContent('Settings settings successfully |');
        echo esc_html__('Import settings successfully', PXL_TEXT_DOMAIN);
        wp_die();
    }

    public function ajax_import_finish()
    {
        global $table_prefix, $wpdb;
        $demo = esc_attr($_POST['demo']);
        $crop_img = esc_attr($_POST['crop_img']);
        $temp_dir = $this->download->temp_folder();

        $this->selected_demo_folder = $demo;

        if (file_exists($this->demo_info_files_path)) {
            $info_demo = json_decode(file_get_contents($this->demo_info_files_path), true);
            if (!empty($info_demo['old_domain'])) {

                //extra table 
                if (file_exists($this->demo_files_path . 'extra-tables.json')) {
                    $extra_tables = apply_filters('pxl_ie_extra_tables', array());
                    $file_extra_ct = str_replace(str_replace("\"", '', json_encode($info_demo['old_domain'])), str_replace("\"", '', json_encode(site_url())), file_get_contents($this->demo_files_path . 'extra-tables.json'));
                    $file_extra_contents = json_decode($file_extra_ct, true);
                    foreach ($file_extra_contents as $table => $datas) {
                        if (!empty($extra_tables[$table])) {
                            $wpdb->query('TRUNCATE TABLE `' . $table_prefix . $table . '`');
                            foreach ($datas as $row) {
                                $wpdb->insert($table_prefix . $table, $row, $extra_tables[$table]);
                            }
                        }
                    }
                }

                // replace elementor meta url
                $from = $info_demo['old_domain'];
                $to = get_site_url();
                $rows_affected = $wpdb->query(
                    "UPDATE {$wpdb->postmeta} " .
                        "SET `meta_value` = REPLACE(`meta_value`, '" . str_replace('/', '\\\/', $from) . "', '" . str_replace('/', '\\\/', $to) . "') " . "WHERE `meta_key` = '_elementor_data' AND `meta_value` LIKE '[%' ;"
                );

                $wpdb->query(
                    "UPDATE {$wpdb->postmeta} " .
                        "SET `meta_value` = REPLACE(`meta_value`, '" . $from . "', '" . $to . "') " .
                        "WHERE `meta_key` = '_menu_item_url' ;"
                );

                $wpdb->query(
                    "UPDATE {$wpdb->posts} " .
                        "SET `post_content` = REPLACE(`post_content`, '" . str_replace('\\', '', $from) . "', '" . $to . "') "
                );

                // replace url in all _me_ meta + SELF-HEALING RECOVERY
                @set_time_limit(0);
                $results = $wpdb->get_results($wpdb->prepare("SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE meta_key LIKE %s", '_me_%'));

                if (!empty($results)) {
                    $xml_content = null; // Lazy load only if needed
                    foreach ($results as $row) {
                        $raw_value = trim($row->meta_value);

                        // SELF-HEALING: If timeline is empty, try to extract from XML
                        if ($row->meta_key === '_me_timeline' && (empty($raw_value) || $raw_value === '...')) {
                            // Lazy load XML content once
                            if ($xml_content === null && file_exists($this->content_file_path)) {
                                $xml_content = file_get_contents($this->content_file_path);
                            }

                            if (!empty($xml_content)) {
                                // Find the item block for this post ID
                                if (preg_match('/<item>.*?<wp:post_id>' . $row->post_id . '<\/wp:post_id>.*?<\/item>/s', $xml_content, $item_match)) {
                                    $item_xml = $item_match[0];
                                    // Extract _me_timeline meta_value inside this item
                                    if (preg_match('/<wp:meta_key><!\[CDATA\[_me_timeline\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(.*?)\]\]><\/wp:meta_value>/s', $item_xml, $value_match)) {
                                        $raw_value = trim($value_match[1]);
                                    }
                                }
                            }
                        }

                        if (empty($raw_value)) continue;

                        $meta_value = maybe_unserialize($raw_value);

                        // Robust Repair Logic (Recalculating lengths if corrupted)
                        if (!$meta_value || (is_string($meta_value) && preg_match('/^[aO]:\d+:{/', $raw_value))) {
                            $unslashed = wp_unslash($raw_value);
                            $attempt1 = maybe_unserialize($unslashed);
                            if (is_array($attempt1) || is_object($attempt1)) {
                                $meta_value = $attempt1;
                            } else {
                                $repaired_str = preg_replace_callback(
                                    '/s:\d+:"(.*?)";(?=s:\d+:|i:\d+;|a:\d+:|b:[01];|d:[\d.]+;|N;|O:\d+:|}|;|$)/s',
                                    function ($matches) {
                                        return "s:" . strlen($matches[1]) . ':"' . $matches[1] . '";';
                                    },
                                    $unslashed
                                );
                                $meta_value = maybe_unserialize($repaired_str);
                            }
                        }

                        if (is_array($meta_value) || is_object($meta_value)) {
                            $meta_value = map_deep($meta_value, function ($value) use ($from, $to) {
                                if (is_string($value)) {
                                    return str_replace($from, $to, $value);
                                }
                                return $value;
                            });
                            update_post_meta($row->post_id, $row->meta_key, $meta_value);
                        } elseif (is_string($meta_value) && strpos($meta_value, $from) !== false) {
                            $meta_value = str_replace($from, $to, $meta_value);
                            update_post_meta($row->post_id, $row->meta_key, $meta_value);
                        }
                    }
                }

                // Fallback mapping for Events special pages (Search by slug if option is still empty)
                if (empty(get_option('me_events_page_id'))) {
                    $event_page = get_page_by_path('events');
                    if ($event_page) update_option('me_events_page_id', $event_page->ID);
                }
                if (empty(get_option('me_tickets_page_id'))) {
                    $ticket_page = get_page_by_path('my-tickets');
                    if ($ticket_page) update_option('me_tickets_page_id', $ticket_page->ID);
                }
            }
        }

        //Clear elementor cache.
        delete_metadata('post', null, '_elementor_css', '', true);
        delete_option('_elementor_global_css');
        delete_option('elementor-custom-breakpoints-files');
        delete_option('_elementor_assets_data');

        do_action('pxl-import-finish', $demo);

        update_option('pxl_import_demo_id', $demo);

        if (!empty($crop_img) && $crop_img === 'yes') {
            //set_time_limit(0);
            $this->pxl_import_crop_images();
        }

        //$this->pxl_import_clear_tmp($temp_dir);

        $this->log->putContent('All done');

        wp_die();
    }



    function pxl_import_add_placeholder_image()
    {

        $attachment_exists = get_page_by_title(esc_html__('Image Placeholder', PXL_TEXT_DOMAIN), OBJECT, 'attachment');

        if ($attachment_exists)
            return $attachment_exists->ID;

        $wp_upload_dir = wp_upload_dir();

        $_default_image = apply_filters('pxl_import-placeholder-image', PXL_URL . '/assets/img/df_import_placeholder.jpg');

        copy($_default_image, $wp_upload_dir['path'] . '/df_import_placeholder.jpg');

        $attachment = array(
            'guid'           => $wp_upload_dir['url'] . '/df_import_placeholder.jpg',
            'post_mime_type' => 'image/jpeg',
            'post_title'     => esc_html__('Image Placeholder', PXL_TEXT_DOMAIN),
            'post_status'    => 'inherit'
        );

        $attachment_id = wp_insert_attachment($attachment, $wp_upload_dir['url'] . '/df_import_placeholder.jpg');
        wp_update_attachment_metadata($attachment_id, wp_generate_attachment_metadata($attachment_id, $wp_upload_dir['path'] . '/df_import_placeholder.jpg'));

        return $attachment_id;
    }

    function pxl_import_widgets_import_data($data)
    {
        global $wp_registered_sidebars;

        // Have valid data?
        // If no data or could not decode
        if (empty($data)) {
            return false;
        }

        // clear all sidebar
        $widgets = get_option('sidebars_widgets');
        foreach ($wp_registered_sidebars as $sidebar => $value) {
            unset($widgets[$sidebar]);
        }
        update_option('sidebars_widgets', $widgets);

        // Hook before import
        //    do_action('pxl_before_widget_import');
        $data = apply_filters('pxl_import_widgets_data', $data);


        // Get all available widgets site supports
        $available_widgets = $this->pxl_import_available_widgets();

        // Get all existing widget instances
        $widget_instances = array();
        foreach ($available_widgets as $widget_data) {
            $widget_instances[$widget_data['id_base']] = get_option('widget_' . $widget_data['id_base']);
        }

        // Begin results
        $results = array();
        // Loop import data's sidebars
        foreach ($data['sidebars'] as $sidebar_id => $widgets) {

            // Skip inactive widgets
            // (should not be in export file)
            if ('wp_inactive_widgets' == $sidebar_id) {
                continue;
            }

            // Check if sidebar is available on this site
            // Otherwise add widgets to inactive, and say so
            if (isset($wp_registered_sidebars[$sidebar_id])) {
                $sidebar_available = true;
                $use_sidebar_id = $sidebar_id;
                $sidebar_message_type = 'success';
                $sidebar_message = '';
            } else {
                $sidebar_available = false;
                $use_sidebar_id = 'wp_inactive_widgets'; // add to inactive if sidebar does not exist in theme
                $sidebar_message_type = 'error';
                $sidebar_message = esc_html__('Sidebar does not exist in theme (using Inactive)', PXL_TEXT_DOMAIN);
            }

            // Result for sidebar
            $results[$sidebar_id]['name'] = !empty($wp_registered_sidebars[$sidebar_id]['name']) ? $wp_registered_sidebars[$sidebar_id]['name'] : $sidebar_id; // sidebar name if theme supports it; otherwise ID
            $results[$sidebar_id]['message_type'] = $sidebar_message_type;
            $results[$sidebar_id]['message'] = $sidebar_message;
            $results[$sidebar_id]['widgets'] = array();

            // Loop widgets
            foreach ($widgets as $widget_instance_id => $widget) {

                $fail = false;

                // Get id_base (remove -# from end) and instance ID number
                $id_base = preg_replace('/-[0-9]+$/', '', $widget_instance_id);
                $instance_id_number = str_replace($id_base . '-', '', $widget_instance_id);

                // Does site support this widget?
                if (!$fail && !isset($available_widgets[$id_base])) {
                    $fail = true;
                    $widget_message_type = 'error';
                    $widget_message = __('Site does not support widget', PXL_TEXT_DOMAIN); // explain why widget not imported
                }

                // Filter to modify settings object before conversion to array and import
                // Leave this filter here for backwards compatibility with manipulating objects (before conversion to array below)
                // Ideally the newer pxl_ie_widget_settings_array below will be used instead of this
                $widget = apply_filters('pxl_ie_widget_settings', $widget); // object

                // Convert multidimensional objects to multidimensional arrays
                // Some plugins like Jetpack Widget Visibility store settings as multidimensional arrays
                // Without this, they are imported as objects and cause fatal error on Widgets page
                // If this creates problems for plugins that do actually intend settings in objects then may need to consider other approach: https://wordpress.org/support/topic/problem-with-array-of-arrays
                // It is probably much more likely that arrays are used than objects, however
                $widget = json_decode(json_encode($widget), true);

                // Filter to modify settings array
                // This is preferred over the older pxl_ie_widget_settings filter above
                // Do before identical check because changes may make it identical to end result (such as URL replacements)
                $widget = apply_filters('pxl_import_widget_settings_array', $widget);

                // Does widget with identical settings already exist in same sidebar?
                if (!$fail && isset($widget_instances[$id_base])) {

                    // Get existing widgets in this sidebar
                    $sidebars_widgets = get_option('sidebars_widgets');
                    $sidebar_widgets = isset($sidebars_widgets[$use_sidebar_id]) ? $sidebars_widgets[$use_sidebar_id] : array(); // check Inactive if that's where will go

                    // Loop widgets with ID base
                    $single_widget_instances = !empty($widget_instances[$id_base]) ? $widget_instances[$id_base] : array();
                    foreach ($single_widget_instances as $check_id => $check_widget) {

                        // Is widget in same sidebar and has identical settings?
                        if (in_array("$id_base-$check_id", $sidebar_widgets) && (array)$widget == $check_widget) {

                            $fail = true;
                            $widget_message_type = 'warning';
                            $widget_message = __('Widget already exists', PXL_TEXT_DOMAIN); // explain why widget not imported

                            break;
                        }
                    }
                }

                // No failure
                if (!$fail) {

                    if (strpos($widget_instance_id, 'nav_menu-') !== false && isset($data['nav_menu']->{$widget_instance_id})) {
                        $menu = wp_get_nav_menu_object($data['nav_menu']->{$widget_instance_id});
                        $widget['nav_menu'] = $menu->term_id;
                    }

                    // Add widget instance
                    $single_widget_instances = get_option('widget_' . $id_base); // all instances for that widget ID base, get fresh every time
                    $single_widget_instances = !empty($single_widget_instances) ? $single_widget_instances : array('_multiwidget' => 1); // start fresh if have to
                    $single_widget_instances[] = $widget; // add it

                    // Get the key it was given
                    end($single_widget_instances);
                    $new_instance_id_number = key($single_widget_instances);

                    // If key is 0, make it 1
                    // When 0, an issue can occur where adding a widget causes data from other widget to load, and the widget doesn't stick (reload wipes it)
                    if ('0' === strval($new_instance_id_number)) {
                        $new_instance_id_number = 1;
                        $single_widget_instances[$new_instance_id_number] = $single_widget_instances[0];
                        unset($single_widget_instances[0]);
                    }

                    // Move _multiwidget to end of array for uniformity
                    if (isset($single_widget_instances['_multiwidget'])) {
                        $multiwidget = $single_widget_instances['_multiwidget'];
                        unset($single_widget_instances['_multiwidget']);
                        $single_widget_instances['_multiwidget'] = $multiwidget;
                    }

                    // Update option with new widget
                    update_option('widget_' . $id_base, $single_widget_instances);

                    // Assign widget instance to sidebar
                    $sidebars_widgets = get_option('sidebars_widgets'); // which sidebars have which widgets, get fresh every time
                    $new_instance_id = $id_base . '-' . $new_instance_id_number; // use ID number from new widget instance
                    $sidebars_widgets[$use_sidebar_id][] = $new_instance_id; // add new instance to sidebar
                    update_option('sidebars_widgets', $sidebars_widgets); // save the amended data

                    // After widget import action
                    $after_widget_import = array(
                        'sidebar'           => $use_sidebar_id,
                        'sidebar_old'       => $sidebar_id,
                        'widget'            => $widget,
                        'widget_type'       => $id_base,
                        'widget_id'         => $new_instance_id,
                        'widget_id_old'     => $widget_instance_id,
                        'widget_id_num'     => $new_instance_id_number,
                        'widget_id_num_old' => $instance_id_number
                    );
                    do_action('pxl_after_widget_import', $after_widget_import);

                    // Success message
                    if ($sidebar_available) {
                        $widget_message_type = 'success';
                        $widget_message = __('Imported', PXL_TEXT_DOMAIN);
                    } else {
                        $widget_message_type = 'warning';
                        $widget_message = __('Imported to Inactive', PXL_TEXT_DOMAIN);
                    }
                }

                // Result for widget instance
                $results[$sidebar_id]['widgets'][$widget_instance_id]['name'] = isset($available_widgets[$id_base]['name']) ? $available_widgets[$id_base]['name'] : $id_base; // widget name or ID if name not available (not supported by site)
                $results[$sidebar_id]['widgets'][$widget_instance_id]['title'] = !empty($widget['title']) ? $widget['title'] : __('No Title', PXL_TEXT_DOMAIN); // show "No Title" if widget instance is untitled
                $results[$sidebar_id]['widgets'][$widget_instance_id]['message_type'] = $widget_message_type;
                $results[$sidebar_id]['widgets'][$widget_instance_id]['message'] = $widget_message;
            }
        }
    }


    function pxl_import_available_widgets()
    {

        global $wp_registered_widget_controls;

        $widget_controls = $wp_registered_widget_controls;

        $available_widgets = array();

        foreach ($widget_controls as $widget) {

            if (!empty($widget['id_base']) && !isset($available_widgets[$widget['id_base']])) { // no dupes

                $available_widgets[$widget['id_base']]['id_base'] = $widget['id_base'];
                $available_widgets[$widget['id_base']]['name'] = $widget['name'];
            }
        }
        return $available_widgets;
    }
    function pxl_import_crop_images()
    {

        $query = array(
            'post_type' => 'attachment',
            'posts_per_page' => -1,
            'post_status' => 'inherit',
        );

        $media = new WP_Query($query);
        if ($media->have_posts()) {
            foreach ($media->posts as $image) {
                if (strpos($image->post_mime_type, 'image/') !== false) {
                    $image_path = get_attached_file($image->ID);
                    $metadata = wp_generate_attachment_metadata($image->ID, $image_path);
                    wp_update_attachment_metadata($image->ID, $metadata);
                }
            }
        }
    }

    function pxl_import_truncate_tables()
    {
        $tables = apply_filters('pxl_import_truncate_tables', [
            'posts',
            'postmeta',
            'terms',
            'termmeta',
            'term_relationships',
            'term_taxonomy',
        ]);

        global $wpdb;

        foreach ($tables as $table) {
            $table_name = $wpdb->prefix . $table;
            $wpdb->query("TRUNCATE TABLE {$table_name}");
        }
    }

    function pxl_import_clear_tmp($dir)
    {

        if (!file_exists($dir)) {
            return true;
        }
        if (!is_dir($dir) || is_link($dir)) {
            return unlink($dir);
        }
        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') {
                continue;
            }
            if (!$this->pxl_import_clear_tmp($dir . "/" . $item, false)) {
                chmod($dir . "/" . $item, 0777);
                if (!$this->pxl_import_clear_tmp($dir . "/" . $item, false)) return false;
            };
        }
        return rmdir($dir);
    }
}

new Pxl_Importer();
