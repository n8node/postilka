<?php

if (!class_exists('BrightHub_Header')) {

    class BrightHub_Header
    {
        public function getHeader()
        {
            $header_layout_single_post = (int)brighthub()->get_theme_opt('header_layout_single_post'); 
            $header_layout_sticky_single_post = (int)brighthub()->get_theme_opt('header_layout_sticky_single_post');             
            $header_layout_404 = (int)brighthub()->get_theme_opt('header_layout_404'); 
            $header_layout_sticky_404 = (int)brighthub()->get_theme_opt('header_layout_sticky_404'); 
            $header_layout = (int)brighthub()->get_opt('header_layout'); 
            $header_layout_sticky = (int)brighthub()->get_opt('header_layout_sticky'); 
             
            if ($header_layout <= 0 || !class_exists('Pxltheme_Core') || !is_callable( 'Elementor\Plugin::instance' )) {
                get_template_part( 'template-parts/header/default');
            } else {
                if (is_singular('post') && ($header_layout_single_post || $header_layout_sticky_single_post)) {
                    $args = [
                        'header_layout' => $header_layout_single_post,
                        'header_layout_sticky' => $header_layout_sticky_single_post
                    ];
                } elseif (is_404() && ($header_layout_404 || $header_layout_sticky_404)) {
                    $args = [
                        'header_layout' => $header_layout_404,
                        'header_layout_sticky' => $header_layout_sticky_404
                    ];
                } else {
                    $args = [
                        'header_layout' => $header_layout,
                        'header_layout_sticky' => $header_layout_sticky
                    ];
                }
                
                get_template_part( 'template-parts/header/elementor','', $args );
            } 
             
        }
 
    }
}
