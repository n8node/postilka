<?php
/**
 * This file was cloned from file /plugins/elementor/includes/elements/section.php to custom elementor section.
 */

namespace Elementor;

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}
 
class PXL_Element_Section extends Element_Section {

    protected function content_template() {
        ?>
        <#
        var custom_classes = elementor.hooks.applyFilters('pxl-custom-section-classes', settings);
        custom_classes = _.isArray(custom_classes)?custom_classes:[];
        var pxl_section_start = elementor.hooks.applyFilters('pxl_section_start_render', '', settings, this);
        var pxl_section_before = elementor.hooks.applyFilters('pxl-custom-section/before-render', '', settings, this);
        #>
        {{{pxl_section_start}}}
        <#
        
        if ( settings.background_video_link ) {
            let videoAttributes = 'autoplay muted playsinline';

            if ( ! settings.background_play_once ) {
                videoAttributes += ' loop';
            }

            view.addRenderAttribute( 'background-video-container', 'class', 'elementor-background-video-container' );

            if ( ! settings.background_play_on_mobile ) {
                view.addRenderAttribute( 'background-video-container', 'class', 'elementor-hidden-mobile' );
            }
        #>
            <div {{{ view.getRenderAttributeString( 'background-video-container' ) }}}>
                <div class="elementor-background-video-embed"></div>
                <video class="elementor-background-video-hosted elementor-html5-video" {{ videoAttributes }}></video>
            </div>
        <# } #>
        <div class="elementor-background-overlay"></div>
        <div class="elementor-shape elementor-shape-top"></div>
        <div class="elementor-shape elementor-shape-bottom"></div>
         
        {{{pxl_section_before}}}
        <div class="elementor-container elementor-column-gap-{{ settings.gap }} {{ custom_classes.join(' ') }}"></div>
        <?php
    }
    
    public function before_render() {
        $settings = $this->get_settings_for_display();
        ?>
        <<?php
            // PHPCS - the method get_html_tag is safe.
            echo $this->get_html_tag(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        ?> <?php $this->print_render_attribute_string( '_wrapper' ); ?>>

        <?php 
            $pxl_section_start_render = apply_filters('pxl_section_start_render','', $settings, $this);
            if(!empty($pxl_section_start_render)) echo $pxl_section_start_render;
        ?>
        <?php
        if ( 'video' === $settings['background_background'] ) :
            if ( $settings['background_video_link'] ) :
                $video_properties = Embed::get_video_properties( $settings['background_video_link'] );

                $this->add_render_attribute( 'background-video-container', 'class', 'elementor-background-video-container' );

                if ( ! $settings['background_play_on_mobile'] ) {
                    $this->add_render_attribute( 'background-video-container', 'class', 'elementor-hidden-phone' );
                }
                ?>
                <div <?php $this->print_render_attribute_string( 'background-video-container' ); ?>>
                    <?php if ( $video_properties ) : ?>
                        <div class="elementor-background-video-embed"></div>
                        <?php
                    else :
                        $video_tag_attributes = 'autoplay muted playsinline';
                        if ( 'yes' !== $settings['background_play_once'] ) :
                            $video_tag_attributes .= ' loop';
                        endif;
                        ?>
                        <video class="elementor-background-video-hosted elementor-html5-video" <?php
                            // PHPCS - the variable $video_tag_attributes is a plain string.
                            echo $video_tag_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                        ?>></video>
                    <?php endif; ?>
                </div>
                <?php
            endif;
        endif;

        $overlay_background = $settings['background_overlay_background'] ?? '';
        $overlay_hover_background = $settings['background_overlay_hover_background'] ?? '';

        $has_background_overlay = in_array( $overlay_background, [ 'classic', 'gradient' ], true ) ||
                                    in_array( $overlay_hover_background, [ 'classic', 'gradient' ], true );

        if ( $has_background_overlay ) :
            ?>
            <div class="elementor-background-overlay"></div>
            <?php
        endif;

        if ( $settings['shape_divider_top'] ) {
            $this->print_shape_divider( 'top' );
        }

        if ( $settings['shape_divider_bottom'] ) {
            $this->print_shape_divider( 'bottom' );
        }

        $custom_classes = apply_filters('pxl-custom-section-classes', [], $settings);
        $custom_classes = is_array($custom_classes) ? $custom_classes : [];

        $pxl_before_section_render = apply_filters('pxl-custom-section/before-render','', $settings, $this);

        ?>

        <?php if(!empty($pxl_before_section_render)) echo $pxl_before_section_render; ?>
        <div class="elementor-container elementor-column-gap-<?php echo esc_attr( $settings['gap'] ); ?> <?php echo esc_attr(implode(' ', $custom_classes)) ?>">
        <?php  
    }

}
