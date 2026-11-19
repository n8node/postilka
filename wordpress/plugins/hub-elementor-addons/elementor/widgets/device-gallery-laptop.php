<?php

namespace LiquidElementor\Widgets;

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Control_Media;
use Elementor\Utils;
use Elementor\Group_Control_Background;
use Elementor\Repeater;
use Elementor\Modules\DynamicTags\Module as TagsModule;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

/**
 * Elementor heading widget.
 *
 * Elementor widget that displays an eye-catching headlines.
 *
 * @since 1.0.0
 */
class LD_Device_Gallery_Laptop extends Widget_Base
{

    /**
     * Get widget name.
     *
     * Retrieve heading widget name.
     *
     * @since 1.0.0
     * @access public
     *
     * @return string Widget name.
     */
    public function get_name()
    {
        return 'ld_device_gallery_laptop';
    }

    /**
     * Get widget title.
     *
     * Retrieve heading widget title.
     *
     * @since 1.0.0
     * @access public
     *
     * @return string Widget title.
     */
    public function get_title()
    {
        return __('Liquid Gallery Laptop', 'hub-elementor-addons');
    }

    /**
     * Get widget icon.
     *
     * Retrieve heading widget icon.
     *
     * @since 1.0.0
     * @access public
     *
     * @return string Widget icon.
     */
    public function get_icon()
    {
        return 'eicon-device-laptop lqd-element';
    }

    /**
     * Get widget categories.
     *
     * Retrieve the list of categories the heading widget belongs to.
     *
     * Used to determine where to display the widget in the editor.
     *
     * @since 1.0.0
     * @access public
     *
     * @return array Widget categories.
     */
    public function get_categories()
    {
        return ['hub-core'];
    }

    /**
     * Get widget keywords.
     *
     * Retrieve the list of keywords the widget belongs to.
     *
     * @since 1.0.0
     * @access public
     *
     * @return array Widget keywords.
     */
    public function get_keywords()
    {
        return ['gallery', 'laptop', 'device'];
    }

    /**
     * Retrieve the list of scripts the counter widget depended on.
     *
     * Used to set scripts dependencies required to run the widget.
     *
     * @since 1.0.0
     * @access public
     *
     * @return array Widget scripts dependencies.
     */
    public function get_script_depends()
    {

        if (liquid_helper()->liquid_elementor_script_depends()) {
            return ['flickity'];
        } else {
            return [''];
        }
    }

    /**
     * Register heading widget controls.
     *
     * Adds different input fields to allow the user to change and customize the widget settings.
     *
     * @since 1.0.0
     * @access protected
     */
    protected function register_controls()
    {

        // General Section
        $this->start_controls_section(
            'general_section',
            [
                'label' => __('General', 'hub-elementor-addons'),
                'tab' => Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'gellery_type',
            [
                'label'   => esc_html__('Type', 'hub-elementor-addons'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'image'  => esc_html__('Image', 'hub-elementor-addons'),
                    'mix'  => esc_html__('Image & Video', 'hub-elementor-addons'),
                ],
                'default' => 'image',
            ]
        );

        $this->add_control(
            'gallery_images',
            [
                'label' => __('Add Images', 'hub-elementor-addons'),
                'type' => Controls_Manager::GALLERY,
                'default' => [],
                'condition' => [
                    'gellery_type' => 'image',
                ],
            ]
        );

        $media_repeater = new Repeater();

        $media_repeater->add_control(
            'media_type',
            [
                'label'   => esc_html__('Media Type', 'hub-elementor-addons'),
                'type'    => \Elementor\Controls_Manager::CHOOSE,
                'options' => [
                    'image'   => [
                        'title' => esc_html__('Image', 'Text-domain'),
                        'icon'  => 'eicon-image-bold',
                    ],
                    'video'   => [
                        'title' => esc_html__('Video', 'Text-domain'),
                        'icon'  => 'eicon-video-camera',
                    ],
                ],
                'default' => 'image',
            ]
        );

        $media_repeater->add_control(
            'item_video',
            [
                'label' => esc_html__('Video', 'hub-elementor-addons'),
                'type' => Controls_Manager::MEDIA,
                'dynamic' => [
                    'active' => true,
                    'categories' => [
                        TagsModule::MEDIA_CATEGORY,
                    ],
                ],
                'media_type' => 'video',
                'condition' => [
                    'media_type' => 'video',
                ],
                'ai' => [
                    'active' => false,
                ],
            ]
        );

        $media_repeater->add_control(
            'item_image',
            [
                'label' => __('Image', 'hub-elementor-addons'),
                'type' => Controls_Manager::MEDIA,
                'default' => [
                    'url' => Utils::get_placeholder_image_src(),
                ],
                'condition' => [
                    'media_type' => 'image',
                ],
            ]
        );

        $this->add_control(
            'gallery_mix_items',
            [
                'label' => __('Add Items', 'hub-elementor-addons'),
                'type' => Controls_Manager::REPEATER,
                'fields' => $media_repeater->get_controls(),
                'default' => [
                    [
                        'media_type' => 'image',
                    ],
                    [
                        'media_type' => 'image',
                    ],
                    [
                        'media_type' => 'image',
                    ],
                ],
                'condition' => [
                    'gellery_type' => 'mix',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Section
        $this->start_controls_section(
            'style_section',
            [
                'label' => esc_html__('Style', 'hub-elementor-addons'),
                'tab' => Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'nav_bg_heading',
            [
                'label' => esc_html__('Navigation background', 'hub-elementor-addons'),
                'type' => Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );

        $this->add_group_control(
            Group_Control_Background::get_type(),
            [
                'name' => 'nav_bg',
                'label' => esc_html__('Navigation background', 'hub-elementor-addons'),
                'types' => ['classic', 'gradient'],
                'selector' => '{{WRAPPER}} .carousel-nav.carousel-nav-solid .flickity-button',
            ]
        );

        $this->add_control(
            'nav_color',
            [
                'label' => esc_html__('Navigation Arrow color', 'hub-elementor-addons'),
                'type' => Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .flickity-button' => 'color: {{VALUE}}',
                ],
            ]
        );

        $this->add_control(
            'nav_bg_hover_heading',
            [
                'label' => esc_html__('Navigation hover background', 'hub-elementor-addons'),
                'type' => Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );

        $this->add_group_control(
            Group_Control_Background::get_type(),
            [
                'name' => 'nav_bg_hover',
                'label' => esc_html__('Navigation background', 'hub-elementor-addons'),
                'types' => ['classic', 'gradient'],
                'selector' => '{{WRAPPER}} .carousel-nav.carousel-nav-solid .flickity-button:hover',
            ]
        );

        $this->add_control(
            'nav_color_hover',
            [
                'label' => esc_html__('Navigation Arrow color', 'hub-elementor-addons'),
                'type' => Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .flickity-button:hover' => 'color: {{VALUE}}',
                ],
            ]
        );

        $this->end_controls_section();
    }

    protected function render_items() {
        $settings = $this->get_settings_for_display();

        if ($settings['gellery_type'] === 'mix' ) {
            $this->render_mix_items($settings['gallery_mix_items']);
        } else {
            $this->render_image_items($settings['gallery_images']);
        }
    }

    protected function render_mix_items( $items ) {
        foreach ($items as $item) {
            if ($item['media_type'] === 'image') { ?>
                <figure class="carousel-item lqd-overlay">
                    <?php echo wp_get_attachment_image($item['item_image']['id'], 'full', false, ['class' => 'w-100 h-100 lqd-overlay objfit-cover objfit-center']); ?>
                </figure>
            <?php } else { ?>
                <figure class="carousel-item lqd-overlay">
                    <video class="w-100 h-100 lqd-overlay objfit-cover objfit-center" controls autoplay loop muted playsinline>
                        <source src="<?php echo esc_url($item['item_video']['url']); ?>" type="video/mp4">
                    </video>
                </figure>
            <?php }
        }
    }

    protected function render_image_items( $images ) {
        foreach ($images as $image) { ?>
            <figure class="carousel-item lqd-overlay">
                <?php echo wp_get_attachment_image($image['id'], 'full', false, ['class' => 'w-100 h-100 lqd-overlay objfit-cover objfit-center']); ?>
            </figure>
        <?php }
    }

    /**
     * Render heading widget output on the frontend.
     *
     * Written in PHP and used to generate the final HTML.
     *
     * @since 1.0.0
     * @access protected
     */
    protected function render() {

        $lazyload_enabled = 'on' === liquid_helper()->get_option('enable-lazy-load');
        $is_elementor_edit_mode = \Elementor\Plugin::$instance->editor->is_edit_mode();

        $img_attrs = [
            'class' => [
                'w-100'
            ],
            'alt' => 'Laptop image'
        ];

        $base_img_width = 1920;
        $base_img_height = 1020;

        if ($lazyload_enabled && !$is_elementor_edit_mode) {
            $img_attrs['class'][] = 'ld-lazyload';
            $img_attrs['src'] = 'data:image/svg+xml,%3Csvg%20xmlns=&#039;http://www.w3.org/2000/svg&#039;%20viewBox=&#039;0%200%20' . $base_img_width . '%20' . $base_img_height . '&#039;%3E%3C/svg%3E';
            $img_attrs['data-src'] = get_template_directory_uri() . '/assets/img/mockups/laptop/laptop-mockup-1.png';
        } else {
            $img_attrs['src'] = get_template_directory_uri() . '/assets/img/mockups/laptop/laptop-mockup-1.png';
        }

        $this->add_render_attribute('img_attrs', $img_attrs);

    ?>

        <div class="lqd-gallery-device lqd-gallery-laptop lqd-gallery-laptop-1 pos-rel">

            <div class="lqd-gallery-laptop-base-img-wrap">
                <figure class="lqd-gallery-laptop-base-fig">
                    <img <?php echo $this->get_render_attribute_string('img_attrs') ?> width="<?php echo esc_attr($base_img_width); ?>" height="<?php echo esc_attr($base_img_height); ?>" />
                </figure>
            </div>

            <div class="lqd-gallery-laptop-gallery-images pos-abs overflow-hidden">
                <div class="carousel-container carousel-nav-solid carousel-nav-circle carousel-nav-lg carousel-nav-floated carousel-nav-middle carousel-nav-center lqd-overlay">
                    <div class="carousel-items lqd-overlay" data-lqd-flickity='{ "wrapAround": true, "skipWrapItems": true, "pageDots": false, "prevNextButtons": true, "navArrow": 6, "navOffsets": { "prev": "2%", "next": "2%" } }'>

                        <div class="flickity-viewport lqd-overlay overflow-hidden">
                            <div class="flickity-slider lqd-overlay">

                                <?php $this->render_items() ?>

                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </div>

<?php

    }
}
\Elementor\Plugin::instance()->widgets_manager->register(new LD_Device_Gallery_Laptop());
