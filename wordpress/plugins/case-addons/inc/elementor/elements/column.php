<?php
/**
 * This file was cloned from file /plugins/elementor/includes/elements/section.php to custom elementor section.
 */

namespace Elementor;

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

 
class PXL_Element_Column extends Element_Column {
     
    protected function content_template() {
        ?>
        <#
        let custom_classes = elementor.hooks.applyFilters('pxl-custom-column-classes', settings);
        custom_classes = _.isArray(custom_classes)?custom_classes:[];
        var pxl_column_before = elementor.hooks.applyFilters('pxl-custom-column/before-render', '', settings, this);
        #>
        <div class="elementor-widget-wrap {{ custom_classes.join(' ') }}">
            {{{pxl_column_before}}}
            <div class="elementor-background-overlay"></div>
        </div>
        <?php
    }

    protected function register_controls() {

        /*$is_edit_mode = Plugin::$instance->editor->is_edit_mode();
        if ( $is_edit_mode ) {
            $initial_responsive_controls_duplication_mode = Plugin::$instance->breakpoints->get_responsive_control_duplication_mode();
            Plugin::$instance->breakpoints->set_responsive_control_duplication_mode( 'on' );
        }*/

        parent::register_controls();

        //return initial set_responsive_control_duplication_mode: off;
        /*if ( $is_edit_mode ) {
            Plugin::$instance->breakpoints->set_responsive_control_duplication_mode( $initial_responsive_controls_duplication_mode );
        }*/

    }

    public function before_render() {
        $settings = $this->get_settings_for_display();

        $overlay_background = $settings['background_overlay_background'] ?? '';
        $overlay_hover_background = $settings['background_overlay_hover_background'] ?? '';

        $has_background_overlay = in_array( $overlay_background, [ 'classic', 'gradient' ], true ) ||
                                  in_array( $overlay_hover_background, [ 'classic', 'gradient' ], true );

        $column_wrap_classes = [ 'elementor-widget-wrap' ];

        if ( $this->get_children() ) {
            $column_wrap_classes[] = 'elementor-element-populated';
        }

        /*$has_background_overlay = in_array( $settings['background_overlay_background'], [ 'classic', 'gradient' ], true ) ||
                                  in_array( $settings['background_overlay_hover_background'], [ 'classic', 'gradient' ], true );

        $is_dom_optimization_active = Plugin::$instance->experiments->is_feature_active( 'e_dom_optimization' );
        $wrapper_attribute_string = $is_dom_optimization_active ? '_widget_wrapper' : '_inner_wrapper';

        $column_wrap_classes = $is_dom_optimization_active ? [ 'elementor-widget-wrap' ] : [ 'elementor-column-wrap' ];

        if ( $this->get_children() ) {
            $column_wrap_classes[] = 'elementor-element-populated';
        }*/

        $this->add_render_attribute( [
            '_inner_wrapper' => [
                'class' => $column_wrap_classes,
            ],
            '_widget_wrapper' => [
                'class' => $column_wrap_classes,
            ],
            '_background_overlay' => [
                'class' => [ 'elementor-background-overlay' ],
            ],
        ] );

        $custom_classes = apply_filters('pxl-custom-column-classes', [], $settings);
        $custom_classes = is_array($custom_classes) ? $custom_classes : [];
        $this->add_render_attribute('_widget_wrapper', 'class', $custom_classes);

        $pxl_before_column_render = apply_filters('pxl-custom-column/before-render','', $settings, $this);

        ?>
        <<?php echo $this->get_html_tag();?> <?php $this->print_render_attribute_string( '_wrapper' ); ?>>
        <div <?php $this->print_render_attribute_string( '_widget_wrapper' ); ?>>
            <?php if(!empty($pxl_before_column_render)) echo $pxl_before_column_render; ?>
        <?php if ( $has_background_overlay ) : ?>
            <div <?php $this->print_render_attribute_string( '_background_overlay' ); ?>></div>
        <?php endif; ?> 
        <?php
    }

    public function after_render() {
        ?>
            </div>
        </<?php
        // PHPCS - the method get_html_tag is safe.
        echo $this->get_html_tag(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
        <?php
    }

    private function get_html_tag() {
        $html_tag = $this->get_settings( 'html_tag' );

        if ( empty( $html_tag ) ) {
            $html_tag = 'div';
        }

        return Utils::validate_html_tag( $html_tag );
    }
    
}
