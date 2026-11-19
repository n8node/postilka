<?php
namespace LiquidElementor\Widgets;

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Image_Size;
use Elementor\Group_Control_Typography;
use Elementor\Scheme_Color;
use Elementor\Scheme_Typography;
use Elementor\Utils;
use Elementor\Control_Media;
use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Group_Control_Text_Shadow;
use Elementor\Group_Control_Background;
use Elementor\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Elementor heading widget.
 *
 * Elementor widget that displays an eye-catching headlines.
 *
 * @since 1.0.0
 */
class LD_Portfolio extends Widget_Base {

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
	public function get_name() {
		return 'ld_portfolio';
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
	public function get_title() {
		return __( 'Liquid Portfolio List', 'hub-elementor-addons' );
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
	public function get_icon() {
		return 'eicon-posts-masonry lqd-element';
	}

	/**
	 * Get widget categories.
	 *
	 * Retrieve the list of categories the heading widget belongs to.
	 *
	 * Used to determine where to display the widget in the editor.
	 *
	 * @since 2.0.0
	 * @access public
	 *
	 * @return array Widget categories.
	 */
	public function get_categories() {
		return [ 'hub-core', 'hub-portfolio' ];
	}

	/**
	 * Get widget keywords.
	 *
	 * Retrieve the list of keywords the widget belongs to.
	 *
	 * @since 2.1.0
	 * @access public
	 *
	 * @return array Widget keywords.
	 */
	public function get_keywords() {
		return [ 'portfolio', 'gallery' ];
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
	public function get_script_depends() {

		if ( liquid_helper()->liquid_elementor_script_depends() ){
			return [ 'packery-mode', 'flickity', 'jquery-fresco' ];
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
	protected function register_controls() {

		// General Section
		$this->start_controls_section(
			'general_section',
			[
				'label' => __( 'general', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'style',
			[
				'label' => __( 'Style', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'style01',
				'options' => [
					'style01' => __( 'Style 01', 'hub-elementor-addons' ),
					'style02' => __( 'Style 02', 'hub-elementor-addons' ),
					'style03' => __( 'Style 03', 'hub-elementor-addons' ),
					'style04' => __( 'Style 04', 'hub-elementor-addons' ),
					'style05' => __( 'Style 05', 'hub-elementor-addons' ),
					'style06' => __( 'Style 06', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'layout_mode',
			[
				'label' => __( 'Layout Mode', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'packery',
				'options' => [
					'packery' => __( 'Masonry', 'hub-elementor-addons' ),
					'fitRows' => __( 'Grid', 'hub-elementor-addons' ),
				],
				'condition' => [
					'style' => [ 'style01', 'style02', 'style06' ]
				]
			]
		);

		$this->add_control(
			'title_tag',
			array(
				'label' => esc_html__( 'Title Element Tag', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'h1' => 'H1',
					'h2' => 'H2',
					'h3' => 'H3',
					'h4' => 'H4',
					'h5' => 'H5',
					'h6' => 'H6',
					'div' => 'div',
					'span' => 'span',
					'p' => 'p',
				],
				'default' => 'h2',
			)
		);

		$this->add_control(
			'use_inheritance',
			[
				'label' => __( 'Inherit font styles?', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __( 'On', 'hub-elementor-addons' ),
				'label_off' => __( 'Off', 'hub-elementor-addons' ),
				'return_value' => 'true',
			]
		);

		$this->add_control(
			'title_tag_to_inherite',
			array(
				'label' => esc_html__( 'Element Tag', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'h1' => 'H1',
					'h2' => 'H2',
					'h3' => 'H3',
					'h4' => 'H4',
					'h5' => 'H5',
					'h6' => 'H6',
					'p' => 'p',
				],
				'default' => 'h1',
				'condition' => array(
					'use_inheritance' => 'true',
				),

			)
		);

		$this->add_control(
			'horizontal_alignment',
			[
				'label' => __( 'Horizontal alignment', 'hub-elementor-addons' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'' => [
						'title' => __( 'Default', 'hub-elementor-addons' ),
						'icon' => 'fa fa-minus',
					],
					'pf-details-h-str' => [
						'title' => __( 'Left', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-left',
					],
					'pf-details-h-mid' => [
						'title' => __( 'Center', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-center',
					],
					'pf-details-h-end' => [
						'title' => __( 'Right', 'hub-elementor-addons' ),
						'icon' => 'eicon-h-align-right',
					],
				],
				'default' => '',
				'toggle' => false,
				'condition' => [
					'style!' => [ 'style04', 'style05', 'style06' ],
				],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'vertical_alignment',
			[
				'label' => __( 'Vertical alignment', 'hub-elementor-addons' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'' => [
						'title' => __( 'Default', 'hub-elementor-addons' ),
						'icon' => 'fa fa-minus',
					],
					'pf-details-v-str' => [
						'title' => __( 'Top', 'hub-elementor-addons' ),
						'icon' => 'eicon-v-align-top',
					],
					'pf-details-v-mid' => [
						'title' => __( 'Middle', 'hub-elementor-addons' ),
						'icon' => 'eicon-v-align-middle',
					],
					'pf-details-v-end' => [
						'title' => __( 'Bottom', 'hub-elementor-addons' ),
						'icon' => 'eicon-v-align-bottom',
					],
				],
				'default' => '',
				'toggle' => false,
				'condition' => [
					'style!' => [ 'style02', 'style04', 'style05', 'style06' ]
				]
			]
		);

		$this->add_control(
			'grid_columns',
			[
				'label' => __( 'Columns', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '3',
				'options' => [
					'1' => __( '1 Column', 'hub-elementor-addons' ),
					'2' => __( '2 Columns', 'hub-elementor-addons' ),
					'3' => __( '3 Columns', 'hub-elementor-addons' ),
					'4' => __( '4 Columns', 'hub-elementor-addons' ),
					'6' => __( '6 Columns', 'hub-elementor-addons' ),
				],
				'condition' => [
					'style' => [ 'style02', 'style06' ]
				]
			]
		);

		$this->add_responsive_control(
			'columns_gap',
			[
				'label' => __( 'Columns gap', 'hub-elementor-addons' ),
				'description' => __( 'Select gap between columns in row.', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 35,
						'step' => 1,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 15,
				],
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-row' => 'margin-inline-start: -{{SIZE}}{{UNIT}}; margin-inline-end: -{{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .carousel-items' => 'margin-inline-start: -{{SIZE}}{{UNIT}}; margin-inline-end: -{{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .lqd-pf-column' => 'padding-inline-start: {{SIZE}}{{UNIT}}; padding-inline-end: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .carousel-item' => 'padding-inline-start: {{SIZE}}{{UNIT}}; padding-inline-end: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'bottom_gap',
			[
				'label' => __( 'Bottom gap', 'hub-elementor-addons' ),
				'description' => __( 'Bottom gap for portfolio items', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 1,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 30,
				],
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-item' => 'margin-bottom: {{SIZE}}{{UNIT}};',
				],
				'condition' => [
					'style!' => [ 'style04', 'style05' ]
				]
			]
		);

		$this->add_control(
			'post_type',
			[
				'label' => __( 'Data source', 'hub-elementor-addons' ),
				'description' => __( 'Select content type for your grid.', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'liquid-portfolio',
				'options' => self::get_post_type_list(),
			]
		);

		$this->add_control(
			'posts_per_page',
			[
				'label' => __( 'Total items', 'hub-elementor-addons' ),
				'description' => __( 'Set max limit or enter -1 to display all (limited to 1000).', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'default' => '10',
				'placeholder' => __( 'enter -1 to display all ', 'hub-elementor-addons' ),
				'condition' => [
					'post_type!' => [ 'ids', 'custom' ]
				],
			]
		);

		$this->add_control(
			'include',
			[
				'label' => __( 'Include only', 'hub-elementor-addons' ),
				'description' => __( 'Add posts, pages, etc. by title.', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXTAREA,
				'placeholder' => __( 'Add posts, pages, etc. by title.', 'hub-elementor-addons' ),
				'condition' => [
					'post_type' => [ 'ids' ]
				],
			]
		);

		$this->end_controls_section();

		// Custom Query
		$this->start_controls_section(
			'categories_section',
			[
				'label' => __( 'Categories', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
				'condition' => [
					'post_type' => 'custom'
				]
			]
		);
		$this->end_controls_section();

		// Category
		$this->start_controls_section(
			'custom_query_section',
			[
				'label' => __( 'Custom query', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
				'condition' => [
					'post_type' => 'custom'
				]
			]
		);
		$this->end_controls_section();


		// Data Settings
		$this->start_controls_section(
			'data_settings_section',
			[
				'label' => __( 'Data settings', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'orderby',
			[
				'label' => __( 'Order by', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'date',
				'options' => [
					'date' => __( 'Date', 'hub-elementor-addons' ),
					'ID' => __( 'Order by post ID', 'hub-elementor-addons' ),
					'author' => __( 'Author', 'hub-elementor-addons' ),
					'title' => __( 'Title', 'hub-elementor-addons' ),
					'modified' => __( 'Last modified date', 'hub-elementor-addons' ),
					'parent' => __( 'Post/page parent ID', 'hub-elementor-addons' ),
					'comment_count' => __( 'Number of comments', 'hub-elementor-addons' ),
					'menu_order' => __( 'Menu order/Page Order', 'hub-elementor-addons' ),
					'meta_value' => __( 'Meta value', 'hub-elementor-addons' ),
					'meta_value_num' => __( 'Meta value number', 'hub-elementor-addons' ),
					'rand' => __( 'Random order', 'hub-elementor-addons' ),
				],
				'condition' => [
					'post_type!' => [ 'ids', 'custom' ]
				]
			]
		);

		$this->add_control(
			'order',
			[
				'label' => __( 'Sort order', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'DESC',
				'options' => [
					'DESC' => __( 'Descending', 'hub-elementor-addons' ),
					'ASC' => __( 'Ascending', 'hub-elementor-addons' ),
				],
				'condition' => [
					'post_type!' => [ 'ids', 'custom' ]
				]
			]
		);

		$this->add_control(
			'meta_key',
			[
				'label' => __( 'Meta key', 'hub-elementor-addons' ),
				'description' => __( 'Input meta key for grid ordering.', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'condition' => [
					'orderby' => [ 'meta_value', 'meta_value_num' ]
				]
			]
		);

		$this->add_control(
			'taxonomies',
			[
				'label' => __( 'Narrow data source', 'hub-elementor-addons' ),
				'description' => __( 'Enter categories', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'options' => $this->get_narrow_taxonomies(),
				'condition' => [
					'post_type!' => [ 'ids', 'custom' ]
				]
			]
		);

		$this->add_control(
			'exclude',
			[
				'label' => __( 'Exclude', 'hub-elementor-addons' ),
				'description' => __( 'Exclude posts by title.', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT2,
				'options' => $this->get_exlude_taxonomies(),
				'multiple' => true,
				'condition' => [
					'post_type!' => [ 'ids', 'custom' ]
				]
			]
		);
		$this->end_controls_section();

		// Extra Options Section
		$this->start_controls_section(
			'extra_options_section',
			[
				'label' => __( 'Extra options', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'one_category',
			[
				'label' => __( 'Show Only One Post Meta', 'hub-elementor-addons' ),
				'description' => __( 'Enable to show one category/tag', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __( 'On', 'hub-elementor-addons' ),
				'label_off' => __( 'Off', 'hub-elementor-addons' ),
				'return_value' => 'yes',
				'default' => 'yes',
			]
		);

		$this->add_control(
			'disable_postformat',
			[
				'label' => __( 'Disable post formats?', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __( 'On', 'hub-elementor-addons' ),
				'label_off' => __( 'Off', 'hub-elementor-addons' ),
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$this->add_control(
			'enable_ext',
			[
				'label' => __( 'Enable external links', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __( 'On', 'hub-elementor-addons' ),
				'label_off' => __( 'Off', 'hub-elementor-addons' ),
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$this->add_control(
			'show_filter',
			[
				'label' => __( 'Enable filter?', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __( 'On', 'hub-elementor-addons' ),
				'label_off' => __( 'Off', 'hub-elementor-addons' ),
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$this->add_control(
			'enable_gallery',
			[
				'label' => __( 'Enable gallery?', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __( 'On', 'hub-elementor-addons' ),
				'label_off' => __( 'Off', 'hub-elementor-addons' ),
				'return_value' => 'listing-lightbox-gallery',
				'default' => '',
			]
		);

		$this->add_control(
			'enable_gallery_category',
			[
				'label' => __( 'Show by categorized?', 'hub-elementor-addons' ),
				'description' => __( 'Each category is displayed in a different lightbox.', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __( 'On', 'hub-elementor-addons' ),
				'label_off' => __( 'Off', 'hub-elementor-addons' ),
				'return_value' => 'yes',
				'default' => '',
				'condition' => [
					'enable_gallery' => 'listing-lightbox-gallery',
				]
			]
		);

		$this->add_control(
			'custom_cursor_style',
			[
				'label' => __( 'Custom cursor style', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'lqd-cc-label-trigger',
				'options' => [
					'lqd-cc-label-trigger' => __( 'Images Label from Theme Options', 'hub-elementor-addons' ),
					'lqd-cc-icon-trigger' => __( 'Icon from Theme Options', 'hub-elementor-addons' ),
				],
			]
		);


		$this->add_control(
			'pagination',
			[
				'label' => __( 'Pagination', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'none',
				'options' => [
					'none' => __( 'None', 'hub-elementor-addons' ),
					'ajax' => __( 'Ajax', 'hub-elementor-addons' ),
					'pagination' => __( 'Pagination', 'hub-elementor-addons' ),
				],
				'condition' => [
					'style!' => [ 'carousel' ]
				]
			]
		);

		$this->add_control(
			'ajax_trigger',
			[
				'label' => __( 'Ajax trigger', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'click',
				'options' => [
					'click' => __( 'Click', 'hub-elementor-addons' ),
					'inview' => __( 'Inview', 'hub-elementor-addons' ),
				],
				'condition' => [
					'pagination' => [ 'ajax' ]
				]
			]
		);

		$this->add_control(
			'ajax_text',
			[
				'label' => esc_html__( 'Button text', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Load more', 'hub-elementor-addons' ),
				'placeholder' => esc_html__( 'Type your title here', 'hub-elementor-addons' ),
				'condition' => [
					'pagination' => 'ajax'
				]
			]
		);

		$this->add_control(
			'ajax_text_loading',
			[
				'label' => __( 'Loading Text', 'hub-elementor-addons' ),
				'placeholder' => __( 'Loading', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'condition' => [
					'pagination' => 'ajax',
				],
			]
		);

		$this->add_control(
			'ajax_text_loaded',
			[
				'label' => __( 'Loaded Text', 'hub-elementor-addons' ),
				'placeholder' => __( 'All items loaded', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'condition' => [
					'pagination' => 'ajax',
				],
			]
		);

		$this->end_controls_section();

		// Style Tab
		$this->start_controls_section(
			'style_section',
			[
				'label' => __( 'Style', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'color_overlay',
				'label' => __( 'Background/overlay color', 'hub-elementor-addons' ),
				'types' => [ 'classic', 'gradient' ],
				'selector' => '{{WRAPPER}} .lqd-pf-overlay-bg'
			]
		);

		$this->add_control(
			'bg_opacity',
			[
				'label' => __( 'Background opacity on hover', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 1,
						'step' => 0.05,
					],
				],
				'default' => [
					'size' => 1,
				],
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-item:hover .lqd-pf-overlay-bg' => 'opacity: {{SIZE}};',
				],
			]
		);

		$this->add_group_control(
			\Elementor\Group_Control_Typography::get_type(),
			[
				'label' => __( 'Title Typography', 'hub-elementor-addons' ),
				'name' => 'title_typography',
				'selector' => '{{WRAPPER}} .lqd-pf-title',
			]
		);

		$this->add_control(
			'custom_arrow_icon',
			[
				'label' => esc_html__( 'Custom Icon', 'hub-elementor-addons' ),
				'description' => esc_html__( 'Default is arrow', 'hub-elementor-addons' ),
				'type' => Controls_Manager::ICONS,
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-overlay-bg svg' => 'width: 1em'
				],
				'render_type' => 'template',
				'condition' => [
					'style' => [
						'style02', 'style03'
					]
				]
			]
		);

		$this->add_control(
			'custom_arrow_icon_size',
			[
				'label' => esc_html__( 'Icon Size', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem', 'custom' ],
				'range' => [
					'em' => [
						'min' => 0.1,
						'max' => 5,
						'step' => 0.1,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-overlay-bg' => 'font-size: {{SIZE}}{{UNIT}}',
				],
				'condition' => [
					'style' => [
						'style02', 'style03'
					]
				]
			]
		);

		$this->add_control(
			'color_type',
			[
				'label' => __( 'Text / icon color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'Default', 'hub-elementor-addons' ),
					'lqd-pf-light' => __( 'Light', 'hub-elementor-addons' ),
					'lqd-pf-dark' => __( 'Dark', 'hub-elementor-addons' ),
					'lqd-pf-color-custom' => __( 'Custom', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'title_color',
			[
				'label' => __( 'Title color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-details .lqd-pf-title' => 'color: {{VALUE}}',
				],
				'condition' => [
					'color_type' => [ 'lqd-pf-color-custom' ]
				]
			]
		);

		$this->add_control(
			'content_color',
			[
				'label' => __( 'Excerpt/category color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-details p,{{WRAPPER}} .lqd-pf-details a' => 'color: {{VALUE}}',
				],
				'condition' => [
					'color_type' => [ 'lqd-pf-color-custom' ]
				]
			]
		);

		$this->add_control(
			'overlay_arrow_color',
			[
				'label' => __( 'Overlay arrow/icon color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-overlay-bg' => 'color: {{VALUE}}',
					'{{WRAPPER}} .lqd-pf-overlay-bg svg' => 'fill: currentColor',
				],
				'condition' => [
					'color_type' => [ 'lqd-pf-color-custom' ]
				]
			]
		);

		$this->add_control(
			'carousel_nav_color',
			[
				'label' => __( 'Nav color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .flickity-button' => 'color: {{VALUE}}',
				],
				'condition' => [
					'style' => [ 'style03' ]
				],
				'separator' => 'before'
			]
		);

		$this->add_control(
			'carousel_nav_hcolor',
			[
				'label' => __( 'Nav hover color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .flickity-button:hover' => 'color: {{VALUE}}',
				],
				'condition' => [
					'style' => [ 'style03' ]
				],
			]
		);

		$this->add_control(
			'carousel_mobile_nav_color',
			[
				'label' => __( 'Mobile nav color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .carousel-dots-mobile .dot' => 'background-color: {{VALUE}}',
				],
				'condition' => [
					'style' => [ 'style03' ]
				],
				'separator' => 'before'
			]
		);

		$this->add_control(
			'carousel_mobile_nav_hcolor',
			[
				'label' => __( 'Mobile nav active color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .carousel-dots-mobile .dot.is-selected' => 'background-color: {{VALUE}}',
				],
				'condition' => [
					'style' => [ 'style03' ]
				],
			]
		);

		$this->add_control(
			'items_border_radius',
			[
				'label' => __( 'Items border radius', 'hub-elementor-addons' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em' ],
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-item' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
					'{{WRAPPER}} .lqd-pf-item-inner, {{WRAPPER}} .lqd-pf-img' => 'border-radius: inherit !important;',
				]
			]
		);

		$this->end_controls_section();

		// Filter Section
		$this->start_controls_section(
			'filter_section',
			[
				'label' => __( 'Filter', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
				'condition' => [
					'show_filter' => 'yes',
				]
			]
		);

		$this->add_control(
			'filter_cats',
			[
				'label' => __( 'Categories', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'options' => $this->get_taxonomies(),
				'default' => [ 'title', 'description' ],
			]
		);

		$this->add_control(
			'filter_enable_counter',
			[
				'label' => __( 'Show counter?', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => __( 'On', 'hub-elementor-addons' ),
				'label_off' => __( 'Off', 'hub-elementor-addons' ),
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$this->add_control(
			'filter_lbl_all',
			[
				'label' => __( 'Label "All"', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'default' => __( 'All', 'hub-elementor-addons' ),
				'placeholder' => __( 'Type your title here', 'hub-elementor-addons' ),
			]
		);

		$this->add_control(
			'filter_color',
			[
				'label' => __( 'Color scheme', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'Default', 'hub-elementor-addons' ),
					'filter-list-scheme-light' => __( 'Light', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'filter_size',
			[
				'label' => __( 'Filters font size', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'Default', 'hub-elementor-addons' ),
					'size-sm' => __( 'Small', 'hub-elementor-addons' ),
					'size-md' => __( 'Medium', 'hub-elementor-addons' ),
					'size-lg' => __( 'Large', 'hub-elementor-addons' ),
					'size-custom' => __( 'Custom', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'custom_filter_size',
			[
				'label' => __( 'Custom font size', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => __( 'ex. 14px', 'hub-elementor-addons' ),
				'selectors' => [
					'{{WRAPPER}} .filter-list' => 'font-size: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'filter_decoration',
			[
				'label' => __( 'Decoration', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'Default', 'hub-elementor-addons' ),
					'filters-underline' => __( 'Underline', 'hub-elementor-addons' ),
					'filters-line-through' => __( 'Linethrough', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'filter_underline_height',
			[
				'label' => __( 'Height for underline element', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => __( 'ex. 24px', 'hub-elementor-addons' ),
				'selectors' => [
					'{{WRAPPER}} .filters-underline li span:after' => 'height: {{VALUE}}',
					'{{WRAPPER}} .filters-underline li span:after' => 'min-height: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'filter_transformation',
			[
				'label' => __( 'Font transformation', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'Default', 'hub-elementor-addons' ),
					'text-uppercase ltr-sp-1' => __( 'Uppercase', 'hub-elementor-addons' ),
					'text-capitalize' => __( 'Capitalize', 'hub-elementor-addons' ),
					'text-lowercase' => __( 'Lowercase', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'filter_align',
			[
				'label' => __( 'Filter alignment', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'justify-content-start',
				'options' => [
					'justify-content-center' => __( 'Center', 'hub-elementor-addons' ),
					'justify-content-start' => __( 'Left', 'hub-elementor-addons' ),
					'justify-content-end' => __( 'Right', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_responsive_control(
			'filter_mb',
			[
				'label' => __( 'Filters bottom space', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 1,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 50,
				],
				'selectors' => [
					'{{WRAPPER}} .liquid-filter-items' => 'margin-bottom: {{SIZE}}{{UNIT}};',
				],
				'condition' => [
					'style!' => 'style04',
				]
			]
		);
		$this->add_responsive_control(
			'filter_mb2',
			[
				'label' => __( 'Filters bottom space', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 1,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 50,
				],
				'selectors' => [
					'{{WRAPPER}} .filter-list' => 'margin-bottom: {{SIZE}}{{UNIT}};',
				],
				'condition' => [
					'style' => 'style04',
				]
			]
		);

		$this->add_control(
			'filter_weight',
			[
				'label' => __( 'Font weight', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'Default', 'hub-elementor-addons' ),
					'font-weight-light' => __( 'Light', 'hub-elementor-addons' ),
					'font-weight-normal' => __( 'Normal', 'hub-elementor-addons' ),
					'font-weight-medium' => __( 'Medium', 'hub-elementor-addons' ),
					'font-weight-semibold' => __( 'Semi Bold', 'hub-elementor-addons' ),
					'font-weight-bold' => __( 'Bold', 'hub-elementor-addons' ),
				],
			]
		);
		$this->end_controls_section();

		// Filter Color
		$this->start_controls_section(
			'filter_color_section',
			[
				'label' => __( 'Filter color', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
				'condition' => [
					'show_filter' => 'yes',
				]
			]
		);

		$this->add_control(
			'filter_normal_color',
			[
				'label' => __( 'Color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .filter-list li,{{WRAPPER}} .lqd-filter-dropdown .ui-button' => 'color: {{VALUE}}',
					'{{WRAPPER}} .lqd-filter-dropdown .ui-button' => 'border-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'filter_hover_color',
			[
				'label' => __( 'Hover/active color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .filter-list li.active, {{WRAPPER}} .filter-list li.hover,{{WRAPPER}} .lqd-filter-dropdown .ui-button:active, {{WRAPPER}} .lqd-filter-dropdown .ui-button:focus' => 'color: {{VALUE}}',
					'{{WRAPPER}} .lqd-filter-dropdown .ui-button:active, {{WRAPPER}} .lqd-filter-dropdown .ui-button:focus' => 'border-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'filter_dec_color',
			[
				'label' => __( 'Decoration color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .filters-underline li span:after, {{WRAPPER}} .filters-line-through li span:after' => 'background: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'mobile_filter_normal_color',
			[
				'label' => __( 'Mobile filter color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-filter-dropdown .ui-button' => 'color: {{VALUE}}',
					'{{WRAPPER}} .lqd-filter-dropdown .ui-button' => 'border-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'mobile_filter_hover_color',
			[
				'label' => __( 'Mobile hover/active filter color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-filter-dropdown .ui-button:active, {{WRAPPER}} .lqd-filter-dropdown .ui-button:focus' => 'color: {{VALUE}}',
					'{{WRAPPER}} .lqd-filter-dropdown .ui-button:active, {{WRAPPER}} .lqd-filter-dropdown .ui-button:focus' => 'border-color: {{VALUE}}',
				],
			]
		);
		$this->end_controls_section();

		// Filter Title
		$this->start_controls_section(
			'filter_title_section',
			[
				'label' => __( 'Filter title', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
				'condition' => [
					'show_filter' => 'yes',
				]
			]
		);

		$this->add_control(
			'filter_title',
			[
				'label' => __( 'Filter title', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'default' => __( 'Filter', 'hub-elementor-addons' ),
				'placeholder' => __( 'Type your title here', 'hub-elementor-addons' ),
			]
		);


		$this->add_control(
			'tag_to_inherite',
			[
				'label' => __( 'Style to inherite', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'None', 'hub-elementor-addons' ),
					'h1 mt-0' => __( 'h1', 'hub-elementor-addons' ),
					'h2 mt-0' => __( 'h2', 'hub-elementor-addons' ),
					'h3 mt-0' => __( 'h3', 'hub-elementor-addons' ),
					'h4 mt-0' => __( 'h4', 'hub-elementor-addons' ),
					'h5 mt-0' => __( 'h5', 'hub-elementor-addons' ),
					'h6 mt-0' => __( 'h6', 'hub-elementor-addons' ),
				],
			]
		);


		$this->add_control(
			'filter_title_size',
			[
				'label' => __( 'Font size', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'Default', 'hub-elementor-addons' ),
					'size-md' => __( 'Medium - 18px', 'hub-elementor-addons' ),
					'size-lg' => __( 'Large - 24px', 'hub-elementor-addons' ),
					'size-xl' => __( 'Extra Large - 55px', 'hub-elementor-addons' ),
					'size-xxl' => __( 'Extra Extra Large - 72px', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'filter_title_weight',
			[
				'label' => __( 'Font weight', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'Default', 'hub-elementor-addons' ),
					'font-weight-light' => __( 'Light', 'hub-elementor-addons' ),
					'font-weight-normal' => __( 'Normal', 'hub-elementor-addons' ),
					'font-weight-medium' => __( 'Medium', 'hub-elementor-addons' ),
					'font-weight-semibold' => __( 'Semi Bold', 'hub-elementor-addons' ),
					'font-weight-bold' => __( 'Bold', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'filter_title_transformation',
			[
				'label' => __( 'Font transformation', 'hub-elementor-addons' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => __( 'Default', 'hub-elementor-addons' ),
					'text-uppercase' => __( 'Uppercase', 'hub-elementor-addons' ),
					'text-capitalize' => __( 'Capitalize', 'hub-elementor-addons' ),
					'text-lowercase' => __( 'Lowercase', 'hub-elementor-addons' ),
				],
			]
		);

		$this->add_control(
			'filter_title_color',
			[
				'label' => __( 'Title color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .liquid-filter-items-label, {{WRAPPER}} .lqd-pf-carousel-header h6' => 'color: {{VALUE}}',
				],
			]
		);
		$this->end_controls_section();

		// Filter Subtitle
		$this->start_controls_section(
			'subtitle_section',
			[
				'label' => __( 'Filter subtitle', 'hub-elementor-addons' ),
				'tab' => Controls_Manager::TAB_CONTENT,
				'condition' => [
					'show_filter' => 'yes',
					'style' => array( 'style03', 'style04' ),
				]
			]
		);

		$this->add_control(
			'filter_subtitle',
			[
				'label' => __( 'Filter subtitle', 'hub-elementor-addons' ),
				'type' => Controls_Manager::TEXT,
				'default' => __( 'Subtitle', 'hub-elementor-addons' ),
				'placeholder' => __( 'Type your title here', 'hub-elementor-addons' ),
				'condition' => [
					'show_filter' => 'yes',
					'style' => array( 'style03', 'style04' ),
				]
			]
		);

		$this->add_control(
			'filter_subtitle_color',
			[
				'label' => __( 'Subtitle color', 'hub-elementor-addons' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .lqd-pf-carousel-header .lqd-pf-title' => 'color: {{VALUE}}',
				],
				'condition' => [
					'show_filter' => 'yes',
					'style' => array( 'style03', 'style04' ),
				]
			]
		);
		$this->end_controls_section();

		ld_el_btn($this, 'ib_'); // load button


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

		$settings = $this->get_settings_for_display();
		$atts = $this->get_settings_for_display();
		$atts['filter_cats'] = ('yes' === $settings['show_filter'] ? implode(',', $atts['filter_cats']) : '');
		$style = $settings['style'];
		$filter_id = 'pf-filter-' . $this->get_id_int();
		$grid_id = 'lqd-pf-grid-' . $this->get_id();
		$filter_enable_counter = $settings['filter_enable_counter'];
		$grid_columns = $settings['grid_columns'];
		$ajax_trigger = $settings['ajax_trigger'];
		$origin = is_rtl() ? 'right' : 'left';
		$opt_counter = $filter_enable_counter === 'yes' ? ', "filtersCounter": true' : '';
		$layout_mode = 'packery';
		$buttons_append_to = $settings['show_filter'] === 'yes' ? '#'.$filter_id : 'self';
		$title_tag = $settings['title_tag'];
		$use_inheritance = $settings['use_inheritance'];
		$tag_to_inherite = $use_inheritance === 'true' ? $settings['title_tag_to_inherite'] : 'h5';
		$custom_arrow_icon = '<i class="lqd-pf-overlay-icon lqd-icn-ess icon-md-arrow-forward"></i>';

		if ( $atts['custom_arrow_icon'] && $atts['custom_arrow_icon']['value'] ) {
			if ( 'svg' === $atts['custom_arrow_icon']['library'] ) {
				$custom_arrow_icon = \Elementor\Icons_Manager::render_uploaded_svg_icon( $atts['custom_arrow_icon']['value'], ['class' => 'lqd-pf-overlay-icon'] );
			} else {
				$custom_arrow_icon = \Elementor\Icons_Manager::render_font_icon( $atts['custom_arrow_icon'], ['class' => 'lqd-pf-overlay-icon'] );
			}
		}

		if (
			!empty($settings['layout_mode']) &&
			($style === 'style01' || $style === 'style02' || $style === 'style06')
		) {
			$layout_mode = $settings['layout_mode'];
		}

		// Locate the template and check if exists.
		$located = locate_template( array(
			"templates/portfolio/tmpl-$style.php"
		) );
		if ( ! $located ) {
			return;
		}

		if ($style === 'style03'){

			// Build Query and check for posts
			$the_query = new \WP_Query( $this->build_query() );
			if( !$the_query->have_posts() ) {
				return;
			}

			// Include filter
			if( 'yes' === $settings['show_filter'] ) {
				$filter_located = locate_template( 'templates/portfolio/partial-filters.php' );
				include $filter_located;
			}

			//Container
			echo '<div class="carousel-container">';
			echo '<div class="carousel-items pos-rel" data-lqd-flickity=\'{ "equalHeightCells": true, "filters": "#' . $filter_id . '", "prevNextButtons": true, "navArrow": 6, "fullwidthSide": true, "buttonsAppendTo": "' . $buttons_append_to . '" }\'>';
			echo '<div class="flickity-viewport-wrap overflow-hidden">';
			echo '<div class="flickity-viewport pos-rel w-100">';
			echo '<div class="flickity-slider d-flex w-100 h-100" style="' . $origin . ': 0; transform: translateX(0%);">';

				// Build Query
				$GLOBALS['wp_query'] = $the_query;
				$before = $after = '';

				$this->add_excerpt_hooks();

				while( have_posts() ): the_post();

					$post_classes = array( 'lqd-pf-item', $this->get_item_classes() );
					$post_classes = join( ' ', get_post_class( $post_classes, get_the_ID() ) );

					$attributes = array(
						'id' => 'post-' . get_the_ID(),
						'class' => $post_classes
					);

					echo $before;

						include $located;

					echo $after;

				endwhile;

				$this->remove_excerpt_hooks();

				wp_reset_query();

			echo '</div>';
			echo '</div>';
			echo '</div>';
			echo '</div>';
			echo '</div>';

		} elseif ($style === 'style04'){
			// Build Query and check for posts
			$the_query = new \WP_Query( $this->build_query() );
			if( !$the_query->have_posts() ) {
				return;
			}

			//Container
			echo '<div class="carousel-container carousel-nav-floated carousel-nav-bottom carousel-nav-left carousel-nav-square carousel-nav-solid carousel-nav-lg carousel-nav-shadowed lqd-pf-filterable-carousel" data-filterable-carousel="true">';

			// Include filter
			if( 'yes' === $settings['show_filter'] ) {
				echo '<div class="row d-flex flex-wrap align-items-start">';
				$filter_located = locate_template( 'templates/portfolio/partial-filters-carousel.php' );
				include $filter_located;
				echo '<div class="col-md-8 col-xs-12">';
			}

			echo '<div class="carousel-items pos-rel" data-lqd-flickity=\'{ "forceEnableOnMobile": true, "filters": "#' . $filter_id . '"' . $opt_counter . ', "doSomethingCrazyWithFilters": true, "prevNextButtons": true, "buttonsAppendTo": "parent_el", "navArrow": 6, "fullwidthSide": true, "navOffsets": { "nav": {"bottom": "110px", "left": "15px", "right": "auto"} } }\'>';
			echo '<div class="flickity-viewport-wrap">';
			echo '<div class="flickity-viewport pos-rel w-100">';
			echo '<div class="flickity-slider d-flex w-100 h-100" style="' . $origin . ': 0; transform: translateX(0%);">';

			// Build Query
			$GLOBALS['wp_query'] = $the_query;
			$before = $after = '';


			$this->add_excerpt_hooks();

			while( have_posts() ): the_post();

				$post_classes = array( 'lqd-pf-item', $this->get_item_classes() );
				$post_classes = join( ' ', get_post_class( $post_classes, get_the_ID() ) );

				$attributes = array(
					'id' => 'post-' . get_the_ID(),
					'class' => $post_classes
				);

				echo $before;

					include $located;

				echo $after;

			endwhile;

			$this->remove_excerpt_hooks();

			wp_reset_query();

			if( 'yes' === $settings['show_filter'] ) {
				echo '</div>';
				echo '</div>';
			}
			echo '</div>';
			echo '</div>';
			echo '</div>';
			echo '</div>';
			echo '</div>';

		} elseif ($style === 'style05'){

			// Build Query and check for posts
			$the_query = new \WP_Query( $this->build_query() );
			if( !$the_query->have_posts() ) {
				return;
			}

			//Container
			echo '<div class="lqd-pf-carousel carousel-container carousel-nav-floated carousel-nav-center carousel-nav-middle carousel-nav-circle carousel-nav-solid carousel-nav-lg carousel-nav-shadowed carousel-dots-mobile-inside" data-filterable-carousel="true">';

				// Include filter
			if( 'yes' === $settings['show_filter'] ) {
				$filter_located = locate_template( 'templates/portfolio/partial-filters.php' );
				include $filter_located;
			}

			echo '<div class="carousel-items pos-rel mx-0" data-lqd-flickity=\'{ "filters": "#' . $filter_id . '"' . $opt_counter .', "wrapAround": true, "groupCells": false, "prevNextButtons": true, "navOffsets": { "prev": 15, "next": 15 }, "prevNextButtonsOnlyOnMobile": true, "buttonsAppendTo": "' . $buttons_append_to . '" }\'>';
			echo '<div class="flickity-viewport pos-rel w-100 overflow-hidden">';
			echo '<div class="flickity-slider d-flex w-100 h-100" style="' . $origin . ': 0; transform: translateX(0%);">';

			// Build Query
			$GLOBALS['wp_query'] = $the_query;
			$before = $after = '';


			$this->add_excerpt_hooks();

			while( have_posts() ): the_post();

				$post_classes = array( 'lqd-pf-item', $this->get_item_classes() );
				$post_classes = join( ' ', get_post_class( $post_classes, get_the_ID() ) );

				$attributes = array(
					'id' => 'post-' . get_the_ID(),
					'class' => $post_classes
				);

				echo $before;

					include $located;

				echo $after;

			endwhile;

			$this->remove_excerpt_hooks();

			wp_reset_query();

			echo '</div>';
			echo '</div>';
			echo '</div>';
			echo '</div>';

		} else {

			// Build Query and check for posts
			$the_query = new \WP_Query( $this->build_query() );
			if( !$the_query->have_posts() ) {
				return;
			}

			$show_filter        = 'yes' === $settings['show_filter'];
			$active_term_id     = $show_filter ? $this->get_active_filter_term_id() : 0;
			$grid_filter_param  = $show_filter ? 'lqd_filter_' . $filter_id : '';
			$use_grid_filter    = $show_filter; // marker only emitted when filters are on
			$term_counts        = array();
			$filter_term_ids    = array();

			if ( $show_filter ) {
				if ( function_exists( 'ld_helper' ) ) {
					$resolved = ld_helper()->terms_are_ids_or_slugs( implode( ',', (array) $atts['filter_cats'] ), 'liquid-portfolio-category' );
					$filter_term_ids = is_string( $resolved ) ? array_filter( array_map( 'absint', explode( ',', $resolved ) ) ) : array_filter( array_map( 'absint', (array) $resolved ) );
				}

				if ( $filter_enable_counter === 'yes' && function_exists( 'liquid_get_term_counts' ) ) {
					$term_counts = liquid_get_term_counts( 'liquid-portfolio', 'liquid-portfolio-category', $filter_term_ids );
				}

				$atts['active_term_id']    = $active_term_id;
				$atts['grid_filter_param'] = $grid_filter_param;
				$atts['term_counts']       = $term_counts;
			}

			$grid_args_json = '';
			if ( $use_grid_filter ) {
				$grid_args = array(
					'kind'              => 'portfolio',
					'post_type'         => 'liquid-portfolio',
					'taxonomy'          => 'liquid-portfolio-category',
					'post_id'           => get_the_ID(),
					'widget_id'         => $this->get_id(),
					'filter_id'         => $filter_id,
					'grid_filter_param' => $grid_filter_param,
					'style'             => $style,
					'posts_per_page'    => isset( $settings['posts_per_page'] ) ? (int) $settings['posts_per_page'] : 0,
					'term_id'           => $active_term_id,
					'items_wrapper'     => '#' . $grid_id,
					'pagination_mode'   => isset( $settings['pagination'] ) ? $settings['pagination'] : 'none',
				);
				$grid_args_json = ' data-liquid-grid-args="' . esc_attr( wp_json_encode( $grid_args ) ) . '"';
			}

			//Container
			echo '<div class="' . esc_attr( 'lqd-pf-grid ' . $grid_id ) . '">';

				// Include filter
				if( $show_filter ) {
					$filter_located = locate_template( 'templates/portfolio/partial-filters.php' );
					include $filter_located;
					printf( '<div id="%1$s" class="lqd-pf-row row d-flex flex-wrap %1$s" data-liquid-masonry="true" data-masonry-options=\'{ "layoutMode": "' . $layout_mode . '", "filtersID": "#%2$s"' . $opt_counter . ' }\'%3$s>', $grid_id, $filter_id, $grid_args_json );
				}
				else {
					printf( '<div id="%1$s" class="lqd-pf-row row d-flex flex-wrap %1$s" data-liquid-masonry="true" data-masonry-options=\'{ "layoutMode": "' . $layout_mode . '"' . $opt_counter . ' }\'>', $grid_id);
				}

				// Build Query
				$GLOBALS['wp_query'] = $the_query;

				$this->loop( $located );

				echo '</div>';

				// Pagination
				if( 'pagination' === $settings['pagination'] ) {

					$svg_args = array(
						'svg'     => array(
							'class'       => true,
							'xmlns'       => true,
							'width'       => true,
							'height'      => true,
							'viewbox'     => true,
							'aria-hidden' => true,
							'role'        => true,
							'focusable'   => true,
							'style'       => true,
						  ),
						  'path'    => array(
							'fill'      => true,
							'd'         => true,
						  ),
					);

					$paginate_args = array(
						'type'      => 'array',
						'prev_next' => true,
						'prev_text' => '<span aria-hidden="true">' . wp_kses( __( '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="32" viewBox="0 0 12 32" style="width: 1em; height: 1em;"><path fill="currentColor" d="M3.625 16l7.938 7.938c.562.562.562 1.562 0 2.125-.313.312-.688.437-1.063.437s-.75-.125-1.063-.438L.376 17c-.563-.563-.5-1.5.063-2.063l9-9c.562-.562 1.562-.562 2.124 0s.563 1.563 0 2.125z"></path></svg>', 'landinghub-core' ), $svg_args ) . '</span>',
						'next_text' => '<span aria-hidden="true">' . wp_kses( __( '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="32" viewBox="0 0 12 32" style="width: 1em; height: 1em;"><path fill="currentColor" d="M8.375 16L.437 8.062C-.125 7.5-.125 6.5.438 5.938s1.563-.563 2.126 0l9 9c.562.562.624 1.5.062 2.062l-9.063 9.063c-.312.312-.687.437-1.062.437s-.75-.125-1.063-.438c-.562-.562-.562-1.562 0-2.125z"></path></svg>', 'landinghub-core' ), $svg_args ) . '</span>',
					);
					if ( $use_grid_filter && $active_term_id > 0 ) {
						$paginate_args['add_args'] = array( $grid_filter_param => $active_term_id );
					}
					$links = paginate_links( $paginate_args );

					if( !empty( $links ) ) {
						printf( '<div class="page-nav text-center"><nav aria-label="Page navigation"><ul class="pagination"><li>%s</li></ul></nav></div>', join( "</li>\n\t<li>", $links ) );
					}

				}

				if ( in_array( $settings['pagination'], array( 'ajax' ) ) ) {
					$max_pages = (int) $GLOBALS['wp_query']->max_num_pages;

					if ( $use_grid_filter ) {
						// Filter-aware AJAX path: POST to liquid_get_ajax_grid with paged + term_id.
						$lm_attrs = array(
							'href'      => 'javascript:void(0)',
							'data-args' => wp_json_encode(
								array(
									'action'            => 'liquid_get_ajax_grid',
									'kind'              => 'portfolio',
									'post_type'         => 'liquid-portfolio',
									'taxonomy'          => 'liquid-portfolio-category',
									'post_id'           => get_the_ID(),
									'widget_id'         => $this->get_id(),
									'filter_id'         => $filter_id,
									'grid_filter_param' => $grid_filter_param,
									'style'             => $style,
									'posts_per_page'    => isset( $settings['posts_per_page'] ) ? (int) $settings['posts_per_page'] : 0,
									'term_id'           => $active_term_id,
								)
							),
						);
						$ajax_text         = ! empty( $settings['ajax_text'] ) ? esc_html( $settings['ajax_text'] ) : esc_html__( 'Load more', 'hub-elementor-addons' );
						$ajax_text_loading = ! empty( $atts['ajax_text_loading'] ) ? esc_html( $atts['ajax_text_loading'] ) : esc_html__( 'Loading', 'hub-elementor-addons' );
						$ajax_text_loaded  = ! empty( $atts['ajax_text_loaded'] ) ? esc_html( $atts['ajax_text_loaded'] ) : esc_html__( 'All items loaded', 'hub-elementor-addons' );
						$lm_attrs['class'] = 'elementor-button btn ws-nowrap ld-ajax-loadmore ws-nowrap';
						$lm_attrs['data-items-wrapper'] = '#' . $grid_id;
						if ( $max_pages <= 1 ) {
							$lm_attrs['class'] .= ' all-items-loaded';
						}

						echo '<div class="liquid-pf-nav ld-pf-nav-ajax"><div class="page-nav text-center"><nav aria-label="' . esc_attr__( 'Page navigation', 'hub-elementor-addons' ) . '">';
						printf(
							'<a%2$s><span class="static d-block">%1$s</span><span class="loading d-block pos-abs"><span class="dots d-block"><span class="d-inline-block"></span><span class="d-inline-block"></span><span class="d-inline-block"></span></span><span class="d-block mt-1">%3$s</span></span><span class="all-loaded d-block pos-abs">%4$s</span></a>',
							$ajax_text,
							ld_helper()->html_attributes( $lm_attrs ),
							$ajax_text_loading,
							$ajax_text_loaded
						);
						echo '</nav></div></div>';

					} elseif ( $url = get_next_posts_page_link( $GLOBALS['wp_query']->max_num_pages ) ) {
						// Legacy URL-based load more (no filter): preserved for back-compat.
						$lm_attrs = array(
							'href'                 => add_query_arg( 'ajaxify', '1', $url ),
							'rel'                  => 'nofollow',
							'data-ajaxify'         => true,
							'data-ajaxify-options' => json_encode( array(
								'wrapper' => ".$grid_id .lqd-pf-row",
								'items'   => '> .masonry-item',
								'trigger' => $ajax_trigger,
							) ),
						);

						echo '<div class="liquid-pf-nav ld-pf-nav-ajax"><div class="page-nav text-center"><nav aria-label="' . esc_attr__( 'Page navigation', 'hub-elementor-addons' ) . '">';
						$ajax_text         = ! empty( $settings['ajax_text'] ) ? esc_html( $settings['ajax_text'] ) : esc_html__( 'Load more', 'hub-elementor-addons' );
						$ajax_text_loading = ! empty( $atts['ajax_text_loading'] ) ? esc_html( $atts['ajax_text_loading'] ) : esc_html__( 'Loading', 'hub-elementor-addons' );
						$ajax_text_loaded  = ! empty( $atts['ajax_text_loaded'] ) ? esc_html( $atts['ajax_text_loaded'] ) : esc_html__( 'All items loaded', 'hub-elementor-addons' );
						$lm_attrs['class'] = 'elementor-button btn ws-nowrap ld-ajax-loadmore ws-nowrap';
						printf( '<a%2$s><span class="static d-block">%1$s</span><span class="loading d-block pos-abs"><span class="dots d-block"><span class="d-inline-block"></span><span class="d-inline-block"></span><span class="d-inline-block"></span></span><span class="d-block mt-1">' . $ajax_text_loading . '</span></span><span class="all-loaded d-block pos-abs">' . $ajax_text_loaded . ' <svg width="32" height="29" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 29" style="width: 1.5em; height: 1.5em; margin-inline-start: 0.5em;"><path fill="currentColor" d="M25.74 6.23c0.38 0.34 0.42 0.9 0.09 1.28l-12.77 14.58a0.91 0.91 0 0 1-1.33 0.04l-5.46-5.46a0.91 0.91 0 1 1 1.29-1.29l4.77 4.78 12.12-13.85a0.91 0.91 0 0 1 1.29-0.08z"></path></svg></span></a>', $ajax_text, ld_helper()->html_attributes( $lm_attrs ), $url );
						echo '</nav></div></div>';
					}
				}

				wp_reset_query();

			echo '</div>';
		}

	}

	protected function get_post_type_list() {

		$postTypesList = array(
			'liquid-portfolio' => __( 'Posts', 'hub-elementor-addons' ),
			//'ids' => __( 'List of IDs', 'hub-elementor-addons' ),
		);

		return $postTypesList;
	}

	// https://codex.wordpress.org/Making_Custom_Queries_using_Offset_and_Pagination
	// check it
	protected function build_query() {

		extract( $this->get_settings_for_display() );
		$settings = array();

		if( 'custom' === $post_type && ! empty( $custom_query ) ) {
			$query = html_entity_decode( vc_value_from_safe( $custom_query ), ENT_QUOTES, 'utf-8' );
			$settings = wp_parse_args( $query );
		}
		elseif( 'ids' === $post_type ) {

			if ( empty( $include ) ) {
				$include = - 1;
			}

			$incposts = wp_parse_id_list( $include );
			$settings = array(
				'post__in'       => $incposts,
				'posts_per_page' => count( $incposts ),
				'post_type'      => 'any',
				'orderby'        => 'post__in',
			);
		}
		else {

			$orderby = !empty( $_GET['orderby'] ) ? $_GET['orderby'] : $orderby;
			$order   = !empty( $_GET['order'] ) ? $_GET['order'] : $order;

			$settings = array(
				'posts_per_page' => isset( $posts_per_page ) ? (int) $posts_per_page : 100,
				'orderby'        => $orderby,
				'order'          => $order,
				'meta_key'       => in_array( $orderby, array(
					'meta_value',
					'meta_value_num',
				) ) ? $meta_key : '',
				'post_type'           => $post_type,
				'ignore_sticky_posts' => true,
			);

			if( $exclude ) {
				$settings['post__not_in'] = wp_parse_id_list( $exclude );
			}

			if( 'none' === $pagination ) {
				$settings['no_found_rows'] = true;
			}
			else {
				$settings['paged'] = ld_helper()->get_paged();
			}

			if ( $settings['posts_per_page'] < 1 ) {
				$settings['posts_per_page'] = 1000;
			}


			if ( ! empty( $taxonomies ) ) {

				$terms = get_terms( array(
					'hide_empty' => false,
					'include' => $taxonomies,
				) );
				$settings['tax_query'] = array();
				$tax_queries = array(); // List of taxnonimes
				foreach ( $terms as $t ) {
					if ( ! isset( $tax_queries[ $t->taxonomy ] ) ) {
						$tax_queries[ $t->taxonomy ] = array(
							'taxonomy' => $t->taxonomy,
							'field'    => 'id',
							'terms'    => array( $t->term_id ),
							'relation' => 'IN',
						);
					} else {
						$tax_queries[ $t->taxonomy ]['terms'][] = $t->term_id;
					}
				}
				$settings['tax_query'] = array_values( $tax_queries );
				$settings['tax_query']['relation'] = 'OR';
			}

			$active_term_id = $this->get_active_filter_term_id();
			if ( $active_term_id > 0 ) {
				$active_clause = array(
					'taxonomy' => 'liquid-portfolio-category',
					'field'    => 'term_id',
					'terms'    => array( $active_term_id ),
				);
				if ( ! empty( $settings['tax_query'] ) ) {
					$existing                = $settings['tax_query'];
					$settings['tax_query']   = array(
						'relation' => 'AND',
						$existing,
						$active_clause,
					);
				} else {
					$settings['tax_query'] = array( $active_clause );
				}
			}
		}

		return $settings;
	}

	/**
	 * Reads the active filter term id from $_GET, scoped to this widget's filter id.
	 * Returns 0 when no filter is active or when the requested term is outside this
	 * widget's filter_cats allowlist.
	 */
	public function get_active_filter_term_id() {
		$filter_id = 'pf-filter-' . $this->get_id_int();
		$get_param = 'lqd_filter_' . $filter_id;
		if ( ! isset( $_GET[ $get_param ] ) ) {
			return 0;
		}
		$term_id = absint( wp_unslash( $_GET[ $get_param ] ) );
		if ( ! $term_id ) {
			return 0;
		}

		$settings    = $this->get_settings_for_display();
		$filter_cats = isset( $settings['filter_cats'] ) ? (array) $settings['filter_cats'] : array();
		if ( ! empty( $filter_cats ) ) {
			$ids = array();
			if ( function_exists( 'ld_helper' ) ) {
				$resolved = ld_helper()->terms_are_ids_or_slugs( implode( ',', $filter_cats ), 'liquid-portfolio-category' );
				if ( is_array( $resolved ) ) {
					$ids = array_filter( array_map( 'absint', $resolved ) );
				} elseif ( is_string( $resolved ) && $resolved !== '' ) {
					$ids = array_filter( array_map( 'absint', explode( ',', $resolved ) ) );
				}
			}
			if ( empty( $ids ) ) {
				$ids = array_filter( array_map( 'absint', $filter_cats ) );
			}
			if ( ! empty( $ids ) && ! in_array( $term_id, $ids, true ) ) {
				return 0;
			}
		}
		return $term_id;
	}

	/**
	 * Public items loop. Used by render() (paged grid styles) and render_ajax_items().
	 * Assumes $GLOBALS['wp_query'] is set to the items query.
	 */
	public function loop( $located = null ) {
		if ( null === $located ) {
			$style   = $this->get_settings_for_display( 'style' );
			$located = locate_template( "templates/portfolio/tmpl-$style.php" );
		}
		if ( ! $located ) {
			return;
		}

		$this->add_excerpt_hooks();

		while ( have_posts() ) : the_post();

			$post_classes = array( 'lqd-pf-item', $this->get_item_classes() );
			$post_classes = join( ' ', get_post_class( $post_classes, get_the_ID() ) );

			$attributes = array(
				'id'    => 'post-' . get_the_ID(),
				'class' => $post_classes,
			);

			include $located;

		endwhile;

		$this->remove_excerpt_hooks();
	}

	/**
	 * AJAX entry point. Builds the query (with paged + active term injected via $_GET)
	 * and runs the items loop, returning the captured HTML and pagination meta.
	 */
	public function render_ajax_items( $paged = 1, $term_id = 0 ) {
		$paged     = max( 1, (int) $paged );
		$term_id   = max( 0, (int) $term_id );
		$filter_id = 'pf-filter-' . $this->get_id_int();
		$get_param = 'lqd_filter_' . $filter_id;

		$had_filter_get = array_key_exists( $get_param, $_GET );
		$orig_filter    = $had_filter_get ? $_GET[ $get_param ] : null;
		$had_paged_get  = array_key_exists( 'paged', $_GET );
		$orig_paged     = $had_paged_get ? $_GET['paged'] : null;

		if ( $term_id > 0 ) {
			$_GET[ $get_param ] = $term_id;
		} else {
			unset( $_GET[ $get_param ] );
		}
		$_GET['paged'] = $paged;

		$q_args          = $this->build_query();
		$q_args['paged'] = $paged;
		$q               = new \WP_Query( $q_args );

		$result = array(
			'html'      => '',
			'last'      => true,
			'max_pages' => 0,
			'total'     => 0,
		);

		if ( $q->have_posts() ) {
			$prev_query          = isset( $GLOBALS['wp_query'] ) ? $GLOBALS['wp_query'] : null;
			$GLOBALS['wp_query'] = $q;

			ob_start();
			$this->loop();
			$result['html'] = ob_get_clean();

			$result['max_pages'] = (int) $q->max_num_pages;
			$result['total']     = (int) $q->found_posts;
			$result['last']      = $paged >= $q->max_num_pages;

			$GLOBALS['wp_query'] = $prev_query;
			wp_reset_query();
		}

		if ( $had_filter_get ) {
			$_GET[ $get_param ] = $orig_filter;
		} else {
			unset( $_GET[ $get_param ] );
		}
		if ( $had_paged_get ) {
			$_GET['paged'] = $orig_paged;
		} else {
			unset( $_GET['paged'] );
		}

		return $result;
	}

	public function add_excerpt_hooks() {
		add_filter( 'excerpt_more', array( $this, 'excerpt_more' ) );
		add_filter( 'excerpt_length', array( $this, 'excerpt_length' ) );
	}

	public function remove_excerpt_hooks() {
		remove_filter( 'excerpt_more', array( $this, 'excerpt_more' ) );
		remove_filter( 'excerpt_length', array( $this, 'excerpt_length' ) );
	}

	protected function get_item_classes() {

		$settings = $this->get_settings_for_display();

		$style = $settings['style'];
		$item_classes = array();


		if( 'style01' === $style ) {
			$item_classes[] = 'lqd-pf-item-style-1';
			$item_classes[] = !empty( $settings['color_type'] ) ? $settings['color_type'] : 'lqd-pf-dark';
			$item_classes[] = !empty( $settings['horizontal_alignment'] ) ? $settings['horizontal_alignment'] : 'pf-details-h-end';
			$item_classes[] = 'pos-rel';
			$item_classes[] = 'overflow-hidden';
		}
		elseif( 'style02' === $style ) {
			$item_classes[] = 'lqd-pf-item-style-2';
			$item_classes[] = 'lqd-pf-overlay-bg-scale';
			$item_classes[] = !empty( $settings['color_type'] ) ? $settings['color_type'] : 'lqd-pf-dark';
			$item_classes[] = !empty( $settings['horizontal_alignment'] ) ? $settings['horizontal_alignment'] : 'pf-details-h-str';
		}
		elseif( 'style03' === $style ) {
			$item_classes[] = 'lqd-pf-item-style-3';
			$item_classes[] = 'lqd-pf-overlay-bg-scale';
			$item_classes[] = 'lqd-pf-content-v';
			$item_classes[] = !empty( $settings['color_type'] ) ? $settings['color_type'] : 'lqd-pf-dark';
			$item_classes[] = !empty( $settings['horizontal_alignment'] ) ? $settings['horizontal_alignment'] : 'pf-details-h-str';
		}
		elseif( 'style04' === $style ) {
			$item_classes[] = 'lqd-pf-item-style-4';
			$item_classes[] = 'overflow-hidden';
			$item_classes[] = 'border-radius-6';
			$item_classes[] = 'pos-rel';
			$item_classes[] = 'lqd-pf-content-v';
			$item_classes[] = !empty( $settings['color_type'] ) ? $settings['color_type'] : 'lqd-pf-light';
			$item_classes[] = !empty( $settings['horizontal_alignment'] ) ? $settings['horizontal_alignment'] : 'pf-details-h-str';
		}
		elseif( 'style05' === $style ) {
			$item_classes[] = 'lqd-pf-item-style-5';
			$item_classes[] = 'h-vh-100';
			$item_classes[] = 'border-radius-6';
			$item_classes[] = 'pos-rel';
			$item_classes[] = !empty( $settings['color_type'] ) ? $settings['color_type'] : 'lqd-pf-light';
			$item_classes[] = !empty( $settings['horizontal_alignment'] ) ? $settings['horizontal_alignment'] : 'pf-details-h-str';
		}
		elseif( 'style06' === $style ) {
			$item_classes[] = 'lqd-pf-item-style-6';
			$item_classes[] = 'border-radius-6';
			$item_classes[] = 'p-3';
			$item_classes[] = 'pt-4';
			$item_classes[] = !empty( $settings['color_type'] ) ? $settings['color_type'] : 'lqd-pf-dark';
		}

		return join( ' ', $item_classes );

	}

	protected function get_column_class() {

		$page_settings_manager = \Elementor\Core\Settings\Manager::get_settings_managers( 'page' );
		$page_settings_model = $page_settings_manager->get_model( get_the_ID() );
		$width = $page_settings_model->get_settings( 'portfolio_width' );

		if ( !empty( $width ) && 'auto' !=  $width ) {
			echo $width;
			return;
		}

		$img = wp_get_attachment_image_src( get_post_thumbnail_id(), 'post-thumbnail' );

		if ( !isset($img[1]) ){
			return;
		}

		$width = $img[1];

		if( $width > 260 && $width < 370 ) {
			echo '3';
			return;
		}

		if( $width > 360 && $width < 470 ) {
			echo '4';
			return;
		}

        // flickity having issue with cells positioning with some specific item widths
		if( $width > 471 && $width < 600 ) {
            if ( !is_rtl() ) {
                echo '5';
            } else {
                echo '4';
            }
			return;
		}

		if( $width > 600 ) {
			echo '6';
			return;
		}
	}

	/**
	 * [entry_term_classes description]
	 * @method entry_term_classes
	 * @return [type]             [description]
	 */
	protected function entry_term_classes() {

		$settings = $this->get_settings_for_display();

		$terms = get_the_terms( get_the_ID(), 'liquid-portfolio-category' );
		if( !$terms ) {
			return;
		}
		$terms = wp_list_pluck( $terms, 'slug' );
		echo join( ' ', $terms );

	}

	protected function entry_term_filter_ids() {

		$terms = get_the_terms( get_the_ID(), 'liquid-portfolio-category' );
		if( !$terms ) {
			return;
		}
		$terms = wp_list_pluck( $terms, 'term_id' );
		$terms = array_map( function( $term_id ) {
			return 'lqd-f-' . $term_id;
		}, $terms );
		echo join( ' ', $terms );

	}

	protected function entry_thumbnail( $size = 'full' ) {

		$settings = $this->get_settings_for_display();

		if ( post_password_required() || is_attachment() ) {
			return;
		}

		$format = get_post_format();
		$style  = $settings['style'];

		if  ( 'yes' === $settings['disable_postformat'] ) {
			$format = 'image';
		}

		$thumb_size = $this->get_thumb_size();
		if( ! empty( $thumb_size ) ) {
			$size = $thumb_size;
		}

		$image_src = wp_get_attachment_image_src( get_post_thumbnail_id(), 'full' );
		$resized_image = liquid_get_resized_image_src( $image_src, $size );

		if( 'style03' === $style || 'style04' === $style || 'style05' === $style ) {
			echo '<figure class="lqd-overlay">';
			liquid_the_post_thumbnail( $size, array( 'class' => 'w-100 h-100 objfit-cover objfit-center' ) );
		}
		else {
			echo '<figure class="w-100">';
			liquid_the_post_thumbnail( $size, array( 'class' => 'w-100' ) );
		}
		echo '</figure>';

	}

	protected function get_thumb_size() {

		$page_settings_manager = \Elementor\Core\Settings\Manager::get_settings_managers( 'page' );
		$page_settings_model = $page_settings_manager->get_model( get_the_ID() );
		$size = $page_settings_model->get_settings( '_portfolio_image_size' );

		if( ! empty( $size ) ) {
			return $size;
		}

	}

	protected function entry_cats() {

		$settings = $this->get_settings_for_display();

		$style = $settings['style'];
		$one_category = $settings['one_category'];

		$terms = get_the_terms( get_the_ID(), 'liquid-portfolio-category' );

		if ( ! $terms || count( $terms ) === 0 ) {
			return;
		}

		$term = $terms[0];

		if( !isset( $term->name ) ) {
			return;
		}

		if( 'yes' === $one_category ) {
			if ( ! is_wp_error( get_term_link( $term->slug, $term->taxonomy ) ) ) {
				$out = sprintf( '<ul class="reset-ul inline-nav lqd-pf-cat d-inline-flex pos-rel z-index-2"><li><a href="%s">%s</a></li></ul>', get_term_link( $term->slug, $term->taxonomy ), $term->name );
			}
		} else {
			$out = sprintf('<ul class="reset-ul inline-nav lqd-pf-cat lqd-lp-cat d-inline-flex pos-rel z-index-2">');
			foreach( $terms as $t ) {
				$out .= sprintf('<li><a href="%s">%s</a></li>', get_term_link( $t->slug, $t->taxonomy ), $t->name );
			}
			$out .= sprintf('</ul>');

		}

		echo $out;

	}

	protected function get_overlay_button() {

		$settings = $this->get_settings_for_display();

		$page_settings_manager = \Elementor\Core\Settings\Manager::get_settings_managers( 'page' );
		$page_settings_model = $page_settings_manager->get_model( get_the_ID() );

		$ext_url = $page_settings_model->get_settings( 'portfolio_website' );

		$local_url = get_the_permalink( get_the_ID() );
		$enable_gallery = $settings['enable_gallery'];
		$enable_gallery_category = $settings['enable_gallery_category'];
		$cc_style = $settings['custom_cursor_style'];

		$target = '';

		$enable_ext = $settings['enable_ext'];
		if( $enable_ext ) {
			$url = isset( $ext_url['url'] ) ? esc_url( $ext_url['url'] ) : $local_url;
			$target = 'target="_blank"';

			if ( $ext_url['custom_attributes'] ) {
				$attributes = Utils::parse_custom_attributes( $ext_url['custom_attributes'] );
				$this->add_render_attribute( 'pf_overlay_link', $attributes, null, false );
			}
		}
		else {
			$url = esc_url( $local_url );
		}

		// video url
		if ( $video_url = get_post_meta( get_the_ID(), 'post-video-url' ) ) {
			$url = esc_url( $video_url[0] );
		}

		if( 'listing-lightbox-gallery' === $enable_gallery ) {

			if ( $enable_gallery_category === 'yes' ) {
				$terms = get_the_terms( get_the_ID(), 'liquid-portfolio-category' );
				$term = $terms[0];

				if( isset( $term->term_id ) ) {
					$term_id = $term->term_id;
				} else {
					$term_id = 'lqd';
				}
			} else {
				$term_id = 'lqd';
			}

			$url = wp_get_attachment_image_url( get_post_thumbnail_id(), 'full' );

			// video url
			if ( $video_url = get_post_meta( get_the_ID(), 'post-video-url' ) ) {
				$url = esc_url( $video_url[0] );
			}

			printf( '<a href="%s" class="lqd-overlay lqd-pf-overlay-link fresco %s" data-fresco-group="'. esc_attr( $this->get_id() . '_' . $term_id ) .'"></a>', $url, $cc_style);
		}
		else {
			printf( '<a href="%s" %s class="lqd-overlay lqd-pf-overlay-link %s" %s></a>', $url, $target, $cc_style, $this->get_render_attribute_string( 'pf_overlay_link' ) );
		}

	}

	public function before_output( $atts, &$content ) {

		$settings = $this->get_settings_for_display();


		if( 'style03' === $settings['style'] ) {
			$settings['template'] = 'carousel';
		}
		elseif( 'style04' === $settings['style'] ) {
			$settings['template'] = 'carousel-2';
		}
		elseif( 'style05' === $settings['style'] ) {
			$settings['template'] = 'carousel-3';
		}

		return $atts;
	}

	protected function entry_subtitle( $before = '<p>', $after = '</p>' ) {

		$page_settings_manager = \Elementor\Core\Settings\Manager::get_settings_managers( 'page' );
		$page_settings_model = $page_settings_manager->get_model( get_the_ID() );
		$subtitle = $page_settings_model->get_settings( 'portfolio_subtitle' );

		if( empty( $subtitle ) ) {
			return;
		}

		printf( '%1$s %2$s %3$s', $before, esc_html( $subtitle ), $after  );
	}

	protected function entry_read_more() {

		$settings = $this->get_settings_for_display();

		if( !$settings['show_link'] ) {
			return;
		}

		$link = '<a href="' . esc_url( get_permalink() ) . '" class="read-more">
					<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
					 	viewBox="0 0 268.832 268.832" style="enable-background:new 0 0 268.832 268.832;"
						 xml:space="preserve">
						<g>
							<path d="M265.171,125.577l-80-80c-4.881-4.881-12.797-4.881-17.678,0c-4.882,4.882-4.882,12.796,0,17.678l58.661,58.661H12.5
								c-6.903,0-12.5,5.597-12.5,12.5c0,6.902,5.597,12.5,12.5,12.5h213.654l-58.659,58.661c-4.882,4.882-4.882,12.796,0,17.678
								c2.44,2.439,5.64,3.661,8.839,3.661s6.398-1.222,8.839-3.661l79.998-80C270.053,138.373,270.053,130.459,265.171,125.577z"/>
						</g>
					</svg>
				</a>';

		echo $link;
	}

	protected function entry_content() {

	?>
		<div class="portfolio-summary">
			<p><?php liquid_portfolio_the_excerpt(); ?></p>
		</div>
	<?php
	}

	public function excerpt_more() {
		return '';
	}

	public function excerpt_length() {
		return 10;
	}

	protected function get_grid_class() {

		$settings = $this->get_settings_for_display();
		$column = $settings['grid_columns'];

		if ( !$column ){
			$column = '2';
		}
		$hash = array(
			'1' => '12',
			'2' => '6',
			'3' => '4',
			'4' => '3',
			'6' => '2'
		);

		printf( 'col-md-%s col-sm-6 col-xs-12', $hash[$column] );
	}

	protected function get_badge() {

		$page_settings_manager = \Elementor\Core\Settings\Manager::get_settings_managers( 'page' );
		$page_settings_model = $page_settings_manager->get_model( get_the_ID() );
		$badge = $page_settings_model->get_settings( 'portfolio_badge' );

		if( !empty( $badge ) ) {
			printf( '<span class="lqd-pf-badge">%s</span>', esc_html( $badge ) );
		}
	}

	protected function get_border() {

		$style = $this->get_settings_for_display('ib_style');

		if( 'btn-naked' == $style || 'btn-underlined' == $style ) {
			return;
		}

		$border = $this->get_settings_for_display('ib_border');

		if ( 'btn-solid' == $style) {
			return $border;
		}

		return "btn-bordered $border";
	}

	protected function get_width() {

		$style = $this->get_settings_for_display('ib_style');

		if( 'btn-naked' === $style || 'btn-underlined' === $style ) {
			return;
		}

		$width = $this->get_settings_for_display('ib_width');

		return "$width";
	}

	protected function get_hover_text_opts() {

		$effect = $this->get_settings_for_display('ib_hover_txt_effect');
		if( empty( $effect ) ) {
			return;
		}

		$start_delay = 0;
		$out = '';

		switch( $effect ) {

			case 'btn-hover-txt-liquid-x':
			default:

				$out = 'data-transition-delay="true"
					    data-delay-options=\'{"elements": ".lqd-chars", "delayType": "animation", "startDelay": ' . $start_delay . ', "delayBetween": 32.5}\'
					    data-split-text="true"
					    data-split-options=\'{"type": "chars, words"}\'';
			break;

			case 'btn-hover-txt-liquid-x-alt':

				$out = 'data-transition-delay="true"
					    data-delay-options=\'{"elements": ".lqd-chars", "delayType": "animation", "startDelay": ' . $start_delay . ', "delayBetween": 32.5, "reverse": true}\'
					    data-split-text="true"
					    data-split-options=\'{"type": "chars, words"}\'';

			break;

			case 'btn-hover-txt-liquid-y':

				$out = 'data-transition-delay="true"
					    data-delay-options=\'{"elements": ".lqd-chars", "delayType": "animation", "startDelay": ' . $start_delay . ', "delayBetween": 32.5}\'
					    data-split-text="true"
					    data-split-options=\'{"type": "chars, words"}\'';
			break;

			case 'btn-hover-txt-liquid-y-alt':

				$out = 'data-transition-delay="true"
				        data-delay-options=\'{"elements": ".lqd-chars", "delayType": "animation", "startDelay": ' . $start_delay . ', "delayBetween": 32.5}\'
				        data-split-text="true"
				        data-split-options=\'{"type": "chars, words"}\'';
			break;

		}

		echo $out;

	}

	protected function get_button() {

		extract( $this->get_settings_for_display() );
		$ib_link = isset( $ib_link['url'] ) ? $ib_link['url'] : '';
		$ib_i_icon = isset( $ib_icon['value'] ) ? $ib_icon['value'] : '';

		$ib_classes = array(
			'elementor-button',
			'btn',
			'ws-nowrap',
			$ib_style,
			$ib_i_separator,
			$ib_hover_txt_effect,
			$ib_size,
			$ib_border_w,
			$this->get_width(),

			($ib_link_type === 'lightbox') ? 'fresco' : '',

			//Icon Classes
			$ib_i_position,
			$ib_i_shape,
			$ib_i_shape !== '' && $ib_i_shape_style !== '' ? $ib_i_shape_size : '',
			$ib_i_shape !== '' && $ib_i_shape_style !== '' ? 'btn-icon-shaped' : '',
			$ib_i_shape_style,
			$ib_i_shape_bw,
			$ib_i_ripple,
			$ib_i_add_icon === 'true' && ($ib_i_position === 'btn-icon-left' || $ib_i_position === 'btn-icon-right') ? $ib_i_hover_reveal : '',
			!empty( $ib_title ) ? 'btn-has-label' : 'btn-no-label',
		);

	 if ($show_button === 'yes'){

		$ib_attributes['href'] = trim($ib_link);
		$ib_attributes['class'] = ld_helper()->sanitize_html_classes( $ib_classes );

		if( !empty( $ib_image_caption ) ) {
			$ib_attributes['data-fresco-caption'] = $ib_image_caption;
		}

		if( 'modal_window' === $ib_link_type ) {
			$ib_attributes['data-lqd-lity'] = isset( $ib_anchor_id ) ? esc_url( $ib_anchor_id ) : '#modal-box';
			$ib_attributes['href'] = isset( $ib_anchor_id ) ? esc_url( $ib_anchor_id ) : '#modal-box';
		}
		elseif( 'local_scroll' === $ib_link_type ) {
			$ib_attributes['data-localscroll'] = true;
			$ib_attributes['href'] = isset( $ib_anchor_id ) ? esc_url( $ib_anchor_id ) : '#';
			if( !empty( $ib_scroll_speed ) ) {
				$ib_attributes['data-localscroll-options'] = wp_json_encode( array( 'scrollSpeed' => $ib_scroll_speed ) );
			}

		}
		elseif( 'scroll_to_section' === $ib_link_type ) {
			$ib_attributes['data-localscroll'] = true;
			if( !empty( $ib_scroll_speed ) ) {
				$ib_attributes['data-localscroll-options'] = wp_json_encode( array( 'scrollBelowSection' => true, 'scrollSpeed' => $ib_scroll_speed ) );
			}
			else {
				$ib_attributes['data-localscroll-options'] = wp_json_encode( array( 'scrollBelowSection' => true ) );
			}

			$ib_attributes['href'] = '#';
		}?>
		<a <?php echo ld_helper()->html_attributes( $ib_attributes ) ?> >
			<?php if( !empty( $ib_title ) ) { ?>
				<span class="btn-txt" data-text="<?php echo esc_attr( $ib_title ) ?>" <?php $this->get_hover_text_opts(); ?>><?php echo wp_kses_post( do_shortcode( $ib_title ) ); ?></span>
			<?php } ?>
			<?php
				if( $ib_i_icon ) {
					printf( '<span class="btn-icon"><i class="%s"></i></span>', $ib_i_icon );
				}
				if( 'btn-hover-swp' === $ib_i_hover_reveal ) {
					printf( '<span class="btn-icon"><i class="%s"></i></span>', $ib_i_icon );
				}
			?>
		</a>
			<?php

		}
	}

	private function get_category_filters() {
		$menus = wp_get_nav_menus();
		$options = [];
		foreach ( $menus as $menu ) {
			$options[ $menu->slug ] = $menu->name;
		}
		return $options;
	}

	protected function get_taxonomies() {

		$taxonomies = get_terms(  array(
			'taxonomy'   => 'liquid-portfolio-category',
			'hide_empty' => false,
		));

		if ( is_wp_error( $taxonomies ) ) {
			return [];
		}

		$options = [ '' => '' ];

		foreach ( $taxonomies as $taxonomy ) {
		  $options[ $taxonomy->slug ] = $taxonomy->name;
		}

		return $options;
	  }

	  protected function get_narrow_taxonomies() {

		$taxonomies = get_categories(
			array(
				'taxonomy'     => 'liquid-portfolio-category',
				'orderby'      => 'name',
			)
		);

		$options = [ '' => '' ];

		foreach ( $taxonomies as $taxonomy ) {
		  $options[ $taxonomy->cat_ID ] = $taxonomy->name;
		}

		return $options;
	  }

	  protected function get_exlude_taxonomies() {
		$taxonomies = get_posts(  array(
			'post_type'   => 'liquid-portfolio',
			'hide_empty' => false,
			'posts_per_page' => -1,
		));

		$options = [ '' => '' ];

		foreach ( $taxonomies as $taxonomy ) {
		  $options[ $taxonomy->ID ] = $taxonomy->post_title;
		}

		return $options;
	  }


}
\Elementor\Plugin::instance()->widgets_manager->register( new LD_Portfolio() );