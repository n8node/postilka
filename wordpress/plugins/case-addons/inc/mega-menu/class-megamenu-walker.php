<?php
/**
 * @Template: class-megamenu-walker.php
 * @since: 1.0.0
 * @author: PixelArt Team
 */
if (!defined('ABSPATH')) {
    die();
}

use Elementor\Plugin;
use Elementor\Icons_Manager;

class PXL_Mega_Menu_Walker extends Walker_Nav_Menu
{
    private $item;

    /**
     * Starts the list before the elements are added.
     *
     * @param string $output Passed by reference. Used to append additional content.
     * @param int $depth Depth of menu item. Used for padding.
     * @param array $args An array of wp_nav_menu() arguments.
     * @see Walker::start_lvl()
     *
     * @since 3.0.0
     *
     */
    public function start_lvl(&$output, $depth = 0, $args = array())
    {
        $indent = str_repeat("\t", $depth);
        $output .= "\n$indent<ul class=\"sub-menu\">\n";
    }

    /**
     * @see Walker::start_el()
     */
    public function start_el(&$output, $item, $depth = 0, $args = array(), $id = 0)
    {
        
        $item_html = '';
        $megamenu = apply_filters('pxl_enable_megamenu', false);
        $pagepopup = apply_filters('pxl_enable_pagepopup', false);

        if ('[divider]' === $item->title) {
            $output .= '<li class="menu-item-divider"></li>';
            return;
        }

        $extra_menu_custom = apply_filters("pxl_menu_edit", array());
        if ($item->pxl_onepage === 'is-one-page' && !wp_script_is('pxl-one-page')) {
            wp_register_script('pxl-one-page', PXL_URL . 'assets/js/onepage.js', array('jquery', 'waypoints'), 'all', true);
            wp_localize_script('pxl-one-page', 'one_page_options', array('filter' => '.is-one-page', 'speed' => '1000'));
            wp_enqueue_script('pxl-one-page');
        }
        foreach ($extra_menu_custom as $key => $f) {
            $val = get_post_meta($item->ID, '_menu_item_' . $key, true);
            if (!empty($val)) {
                $item->classes[] = $val;
            }
        }

        add_filter('nav_menu_link_attributes', function ($atts, $item) {
            if (isset($item->pxl_onepage) && $item->pxl_onepage === 'is-one-page') {
                if (!isset($atts['class']) || empty($atts['class'])) {
                    $atts['class'] = 'is-one-page';
                } elseif (strpos($atts['class'], 'is-one-page') === false) {
                    $atts['class'] = trim($atts['class'] . ' is-one-page');
                }
            }

            if (isset($item->pxl_onepage_offset)) {
                $atts['data-onepage-offset'] = $item->pxl_onepage_offset;
            }

            if (isset($item->pxl_page_popup) && !empty($item->pxl_page_popup )) {
                $atts['data-page-target'] = '#pxl-page-popup-'.$item->pxl_page_popup;
            }

            return $atts;
        }, 10, 2);

        if (!empty($item->pxl_megaprofile) && $megamenu) {
            $item->classes[] = 'pxl-megamenu';
            $item->classes[] = 'menu-item-has-children';
        }

        if (!empty($item->pxl_page_popup) && $pagepopup) {
            $item->classes[] = 'pxl-page-popup';
        }

        if (!empty($args->local_scroll) && $depth === 0) {
            $item->classes[] = 'local-scroll';
        }
        $item->pxl_icon_position = 'left';
        if (!empty($item->pxl_icon)) {
            if ('left' === $item->pxl_icon_position) {
                $args->old_link_before = $args->link_before;
                $args->link_before = '<span class="link-icon left-icon"><i class="' . esc_attr($item->pxl_icon) . '"></i></span>' . $args->link_before;
            } else {
                $args->old_link_after = $args->link_after;
                $args->link_after = $args->link_after . '<span class="link-icon right-icon"><i class="' . esc_attr($item->pxl_icon) . '"></i></span>';
            }
        }

        parent::start_el($item_html, $item, $depth, $args, $id);

        if (isset($args->old_link_before)) {

            $args->link_before = $args->old_link_before;
            $args->old_link_before = '';
        }

        if (isset($args->old_link_after)) {
            $args->link_after = $args->old_link_after;
            $args->old_link_after = '';
        }
 
        if (!empty($item->pxl_megaprofile)) {
            $item_html .= $this->get_megamenu($item->pxl_megaprofile);
        }

        $output .= $item_html;
    }


    public function get_megamenu($id)
    {

        $post = get_post($id);
        if (defined('ELEMENTOR_VERSION') && is_callable('Elementor\Plugin::instance')) { 
            $content = \Elementor\Plugin::$instance->frontend->get_builder_content_for_display( $id );
        } else {
            $content = do_shortcode($post->post_content);
        }
        $megamenu = apply_filters('pxl_enable_megamenu', false);
        if ($megamenu)
            return '<div class="sub-menu pxl-mega-menu"><div class="pxl-mega-menu-elementor">' . $content . '</div></div>';
        else
            return false;
    }

    
    public function display_element($element, &$children_elements, $max_depth, $depth, $args, &$output)
    {

        $element->hasChildren = isset($children_elements[$element->ID]) && !empty($children_elements[$element->ID]);

        return parent::display_element($element, $children_elements, $max_depth, $depth, $args, $output);
    }
}