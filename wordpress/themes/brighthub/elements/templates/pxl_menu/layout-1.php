<?php
$selected_menu = !empty($settings['menu']) ? $settings['menu'] : '';
$p_menu = brighthub()->get_page_opt('p_menu');
$menu_to_use = '';
if (!empty($p_menu)) {
    $menu_to_use = $p_menu;
} elseif (!empty($selected_menu)) {
    $menu_to_use = $selected_menu;
} else {
    $menu_to_use = '';
}

$divider_style = $settings['divider_style'];

$menu_args = array(
    'menu_class'     => 'pxl-menu__primary clearfix',
    'link_before'    => '<span class="pxl-menu__text">',
    'link_after'     => '</span><i class="caseicon-angle-arrow-down pxl-hide"></i></span>',
    'walker'         => class_exists('PXL_Mega_Menu_Walker') ? new PXL_Mega_Menu_Walker : '',
);

if (!empty($menu_to_use)) {
    $menu_args['menu'] = $menu_to_use;
} else {
    $menu_args['theme_location'] = 'primary';
}

if (!empty($menu_to_use) || has_nav_menu('primary')) {
    ?>
    <div class="pxl-menu <?php echo esc_attr($settings['menu_mega_type'].' '.'pxl-menu__'.$settings['menu_type'].' '.$settings['sub_show_effect'].' '.$settings['hover_active_style'].' '.$settings['pxl_animate']); ?> <?php if($settings['hover_active_style'] == 'divider-move') : ?>divider-move--<?php echo esc_attr($divider_style); ?> <?php endif; ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
        
        <?php if($settings['hover_active_style'] == 'divider-move') : ?>
            <div class="pxl-menu__divider"></div>
        <?php 
        endif; 
        wp_nav_menu($menu_args); ?>
    </div>
<?php } ?>
