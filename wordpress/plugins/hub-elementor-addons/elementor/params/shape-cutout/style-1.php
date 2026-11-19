<?php

defined( 'ABSPATH' ) || die();

$el_id = $element->get_id();
$mask_id = 'lqd-cutout-mask-' . $el_id;
$circle_mask_id_bs = 'lqd-cutout-mask-circle-bs-' . $el_id;
$circle_mask_id_te = 'lqd-cutout-mask-circle-te-' . $el_id;

$element->add_render_attribute( 'shape-cutout', [
	'class' => [ 'lqd-cutout', 'lqd-cutout-1', 'lqd-cutout-' . ($element->get_settings('lqd_shape_cutout_placement') ?? 'br'), 'lqd-cutout-' . $el_id, 'pointer-events-none' ],
]);

?>

<style>
	.elementor-element-<?php echo esc_attr($el_id) ?> {
		mask: linear-gradient(0deg, black, black), url(#<?php echo esc_attr($mask_id) ?>);
		mask-composite: exclude;
	}
</style>

<div <?php $element->print_render_attribute_string('shape-cutout') ?>>
	<svg
		 class="lqd-cutout-svg pos-abs pos-tl w-100 h-100 w-full h-full pointer-events-none z-index--1"
		 role="none"
		 width="100"
		 height="100"
		 fill="none"
		 xmlns="http://www.w3.org/2000/svg">
		<mask id="<?php echo esc_attr($circle_mask_id_bs) ?>">
			<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-bs lqd-cutout-mask-circle-bs-mask-fill" cx="50" cy="50" r="50" fill="white" />
			<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-bs lqd-cutout-mask-circle-bs-mask-clip" cx="50" cy="50" r="50" fill="black" />
		</mask>
		<mask id="<?php echo esc_attr($circle_mask_id_te) ?>">
			<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-te lqd-cutout-mask-circle-te-mask-fill" cx="50" cy="50" r="50" fill="white" />
			<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-te lqd-cutout-mask-circle-te-mask-clip" cx="50" cy="50" r="50" fill="black" />
		</mask>

		<defs>
			<mask id="<?php echo esc_attr($mask_id) ?>">
				<g class="lqd-cutout-mask-g-wrap">
					<g class="lqd-cutout-mask-g">
						<rect class="lqd-cutout-mask-rect" width="760" height="160" rx="38" fill="white"/>
						<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-bs" cx="50" cy="50" r="50" fill="white" mask="url(#<?php echo esc_attr($circle_mask_id_bs) ?>)" />
						<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-te" cx="50" cy="50" r="50" fill="white" mask="url(#<?php echo esc_attr($circle_mask_id_te) ?>)" />
					</g>
				</g>
			</mask>
		</defs>
	</svg>
</div>