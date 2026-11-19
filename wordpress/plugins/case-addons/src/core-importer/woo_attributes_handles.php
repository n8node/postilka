<?php

if (!defined('ABSPATH')) {
    die();
}
if (!class_exists('PXL_Woo_Attributes_Handle')) {
    class PXL_Woo_Attributes_Handle {
        public function __construct() {
            add_action('init', array($this, 'pxl_import_woo_term'), 29);
        }

        function pxl_import_woo_term(){
            $upload_dir = wp_upload_dir();
            $current_id = get_option('pxl_import_demo_id',true);
            //$term_imported = get_option('pxl_woo_term_imported',"null");
            $folder_name = sanitize_title($current_id);
            $folder_dir = $upload_dir['basedir'].DIRECTORY_SEPARATOR.'pxlart_temp'.DIRECTORY_SEPARATOR.$folder_name.DIRECTORY_SEPARATOR; 
            //if($term_imported === "not_imported"){
            $this->pxl_woo_attributes_term_import($folder_dir . 'woo_attributes.json');
            //}
        }

        function pxl_woo_attributes_term_import($file){
            if (file_exists($file) && class_exists('WooCommerce')) {
                update_option("pxl_woo_term_imported","imported");
                $data = file_get_contents($file);
                $atts_data = json_decode($data, true);
                 
                if(isset($atts_data["tax"])){
                    foreach ($atts_data["tax"] as $slug => $att){
                        if(!empty($att['terms'])){
                            foreach ($att['terms'] as $term){
                                if(empty($term['fields']) || empty($term['fields']['taxonomy']))
                                    continue;
                                $tax = get_taxonomy($term['fields']['taxonomy']);

                                if(!$tax instanceof WP_Taxonomy)
                                    return;
                                $result_insert_term = wp_insert_term($term['fields']['name'],$term['fields']['taxonomy'],array(
                                    'description'=>$term['fields']['description'],
                                    'parent'=>$term['fields']['parent'],
                                    'slug'=>$term['fields']['slug'],
                                ));

                                if(is_array($result_insert_term)){
                                    $term_id = $result_insert_term['term_id'];
                                    foreach ($term['meta'] as $key => $value){
                                        update_term_meta($term_id,$key,$value);
                                    }
                                }
                            }
                        }
                    }
                }

                $products_data = $atts_data['products'];
                $log = [
                    'products'=>[],
                    'terms'=>[],
                    'options'=>[]
                ];
                foreach ($products_data as $product_data){
                    $product= wc_get_product($product_data['product_id']);
                    if($log['products'][$product_data['product_id']] = (!$product instanceof WC_Product))
                        continue;
                    $atts =  $product->get_attributes( 'edit' );
                    $log['terms']=[];
                    $log['options'][$product_data['product_id']]=[];
                    foreach ($atts as $att_slug =>$att)
                    {
                        if(empty($product_data['attributes']))
                            continue;
                        if(!$att instanceof WC_Product_Attribute)
                            continue;
                        if(!array_key_exists($att_slug,$product_data['attributes']))
                            continue;
                        $options =  $product_data['attributes'][$att_slug]['options'];
                        foreach ($options as $key => $term_slug)
                        {
                            $term = get_term_by('slug',$term_slug,$att_slug);
                            $log['terms'][$term_slug] =  ($term) ? true : false;
                            if(!$term instanceof WP_Term)
                                continue;
                            $options[$key] = $term->term_id;
                        }
                        $log['options'][$product_data['product_id']][] = $options;
                        $att->set_options($options);
                        $log['options'][$product_data['product_id']][] = $att->get_options();
                    }
                    $classname    = WC_Product_Factory::get_product_classname( $product->get_id(), $product->get_type() );
                    $product      = new $classname( $product->get_id() );
                    $product->set_attributes($atts);
                    $product->save();
                    //fix product variation
                    if(isset($product_data['variation'])){
                        $variations = get_posts(array('post_name__in'=>$product_data['variation'],'limit'=>-1));
                        foreach ($variations as $variation)
                        {
                            wp_update_post([
                                'ID' => $variation->ID,
                                'post_parent' => $product->get_id()
                            ]);
                        }
                    }
                }

            }
        }
    }
    new PXL_Woo_Attributes_Handle(); 
}

 
?>