<?php

$style = $atts['style'];
$filter_id = $atts['filter_id'];

// check
$allowed_styles = array(
	'style01',
	'style02',
	'style02-alt',
	'style03',
	'style04',
	'style05',
	'style06',
	'style06-alt',
	'style07',
	'style08',
	'style09',
	'style10',
	'style11',
	'style12',
	'style13',
	'style14',
	'style15',
	'style16',
	'style17',
	'style18',
	'style19',
	'style20',
	'style21',
	'style21-alt',
	'style22',
	'style22-alt',
	'style23',
);

if ( ! in_array( $style, $allowed_styles, true ) ) {
	return;
}

$located = locate_template( "templates/blog/tmpl-$style.php" );
if ( ! file_exists( $located ) ) {
	return;
}

// The CSS
$this->generate_css();

// Enqueue Conditional Script
$this->scripts();

echo '<div class="lqd-lp-grid ' . $this->get_id() . '">';
echo '<div class="carousel-container carousel-nav-floated carousel-nav-vertical carousel-nav-left carousel-nav-circle carousel-nav-solid carousel-nav-lg carousel-nav-shadowed lqd-lp-carousel-filterable">';
echo '<div class="row">';

// Include filter
if( 'yes' === $atts['enable_filter'] ) {
	$filter_located = locate_template( 'templates/blog/partial-filters-carousel.php' );
	include $filter_located;
	echo '<div class="col-md-7">';
} else {
	echo '<div class="col-md-12">';
}

// Build Query
$GLOBALS['wp_query'] = new WP_Query( $this->build_query() );
	echo '<div class="carousel-items row" data-lqd-flickity=\'{ "filters": "#' . $filter_id . '", "prevNextButtons": true, "buttonsAppendTo": "parent_el", "wrapAround": false, "navArrow": 1, "fullwidthSide": true, "navOffsets": { "nav": {"left": "-10px", "top": "200px"} } }\'>';

	$after  = '</div>';

	while( have_posts() ): the_post();

		$post_classes = array( 'lqd-lp lqd-lp-style-15 pb-4' );
		$post_classes = join( ' ', get_post_class( $post_classes, get_the_ID() ) );

		$attributes = array(
			'id'    => 'post-' . get_the_ID(),
			'class' => $post_classes
		);
		$post_width_meta = get_post_meta( get_the_ID(), 'post-carousel-width', true );
		$post_width = !empty( $post_width_meta ) ? $post_width_meta : '12';
		$before = '<div class="carousel-item col-sm-' . $post_width . ' ' . $this->entry_term_classes() . '">';
		echo $before;

		printf( '<article%s>', ld_helper()->html_attributes( $attributes ) );

			if( 'quote' === get_post_format() ) {
				$quote_located = locate_template( 'templates/blog/format-quote.php' );
				include $quote_located;
			}
			else {
				include $located;
			}
		echo '</article>';
		echo $after;
	endwhile;

	echo '</div></div></div>';

	wp_reset_query();

	echo '</div>';
echo '</div>';