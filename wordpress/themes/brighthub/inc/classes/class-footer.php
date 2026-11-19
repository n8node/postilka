<?php

if (!class_exists('BrightHub_Footer')) {

    class BrightHub_Footer
    {
        public function getFooter()
        {
            $footer_display = brighthub()->get_page_opt('footer_display');
            if($footer_display == 'hide') return;
            if(is_singular('elementor_library')) return;
            
            $footer_layout = (int)brighthub()->get_opt('footer_layout');
            $footer_layout_single_post = (int)brighthub()->get_theme_opt('footer_layout_single_post');
            $footer_layout_404 = (int)brighthub()->get_theme_opt('footer_layout_404');
            
            if ($footer_layout <= 0 || !class_exists('Pxltheme_Core') || !is_callable( 'Elementor\Plugin::instance' )) {
                get_template_part( 'template-parts/footer/default');
            } else {
                if(is_singular('post') && $footer_layout_single_post){
                    $args = [
                        'footer_layout' => $footer_layout_single_post
                    ];
                }
                elseif(is_404() && $footer_layout_404){
                    $args = [
                        'footer_layout' => $footer_layout_404
                    ];
                }
                else{
                    $args = [
                        'footer_layout' => $footer_layout
                    ];
                }
                get_template_part( 'template-parts/footer/elementor','', $args );
            } 

            $back_totop_on = brighthub()->get_theme_opt('back_totop_on', true);
            if (isset($back_totop_on) && $back_totop_on == true) : ?>
                <a class="pxl-scroll-top" href="#">
                    <svg class="pxl-scroll__arrow" id="fi_3838680" clip-rule="evenodd" fill-rule="evenodd" height="512" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" width="512" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><path id="path2" d="m11 5.414-5.293 5.293c-.39.39-1.024.39-1.414 0s-.39-1.024 0-1.414l7-7c.39-.391 1.024-.391 1.414 0l7 7c.39.39.39 1.024 0 1.414s-1.024.39-1.414 0l-5.293-5.293v15.586c0 .552-.448 1-1 1s-1-.448-1-1z"></path></svg>
                    <svg class="pxl-scroll-progress-circle" width="100%" height="100%" viewBox="-1 -1 102 102">
                        <path d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98"/>
                    </svg>
                </a>
            <?php endif;

            brighthub_mouse_move_animation();
            brighthub_subscribe_popup();
            if(class_exists('WooCommerce')){
                brighthub_hook_anchor_cart();
            }
            // Always load search popup
            brighthub_hook_anchor_search();
            ?>
                <div class="pxl-overlay"></div>
            <?php
        }
    }
}
 