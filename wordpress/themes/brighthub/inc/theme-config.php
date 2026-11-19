<?php if(!function_exists('brighthub_configs')){
    function brighthub_configs($value){
        $primary = brighthub()->get_opt('primary_color', '#181D27');
        $configs = [
            'theme_colors' => [
                'primary'   => [
                    'title' => esc_html__('Primary', 'brighthub'), 
                    'value' => brighthub()->get_opt('primary_color', '#181D27')
                ],
                'secondary'   => [
                    'title' => esc_html__('Secondary', 'brighthub'), 
                    'value' => brighthub()->get_opt('secondary_color', '#7A5AF8')
                ],
                'third'   => [
                    'title' => esc_html__('Third', 'brighthub'), 
                    'value' => brighthub()->get_opt('third_color', '#535862')
                ],
                'body-bg'   => [
                    'title' => esc_html__('Body Background Color', 'brighthub'), 
                    'value' => brighthub()->get_page_opt('body_bg_color', '#fff ')
                ],
            ],
            'link' => [
                'color' => brighthub()->get_opt('link_color', ['regular' => '#181D27'])['regular'],
                'color-hover'   => brighthub()->get_opt('link_color', ['hover' => '#7A5AF8'])['hover'],
                'color-active'  => brighthub()->get_opt('link_color', ['active' => '#7A5AF8'])['active'],
            ],
            'gradient' => [
                'color-from' => brighthub()->get_opt('gradient_color', ['from' => '#181D27'])['from'],
                'color-to' => brighthub()->get_opt('gradient_color', ['to' => '#7A5AF8'])['to'],
            ],
        ];
        return $configs[$value];
    }
}
if(!function_exists('brighthub_inline_styles')) {
    function brighthub_inline_styles() {  
        
        $theme_colors      = brighthub_configs('theme_colors');
        $link_color        = brighthub_configs('link');
        $gradient_color    = brighthub_configs('gradient');
        ob_start();
        echo ':root{';
            
            foreach ($theme_colors as $color => $value) {
                printf('--%1$s-color: %2$s;', str_replace('#', '',$color),  $value['value']);
            }
            foreach ($theme_colors as $color => $value) {
                printf('--%1$s-color-rgb: %2$s;', str_replace('#', '',$color),  brighthub_hex_rgb($value['value']));
            }
            foreach ($link_color as $color => $value) {
                printf('--link-%1$s: %2$s;', $color, $value);
            }
            foreach ($gradient_color as $color => $value) {
                printf('--gradient-%1$s: %2$s;', $color, $value);
            }

        echo '}';

        return ob_get_clean();
         
    }
}
 