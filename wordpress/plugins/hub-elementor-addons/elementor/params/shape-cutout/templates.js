function render_lqd_cutout() {
	var out = "";
	var el_id = view.model.get( "id" );
	var mask_id = "lqd-cutout-mask-" + el_id;
	var circle_mask_id_bs = "lqd-cutout-mask-circle-bs-" + el_id;
	var circle_mask_id_te = "lqd-cutout-mask-circle-te-" + el_id;

	var classnames = [
		"lqd-cutout",
		"lqd-cutout-1",
		"lqd-cutout-" + ( settings.lqd_shape_cutout_placement || "br" ),
		"lqd-cutout-" + el_id,
		"pointer-events-none",
	];

	view.addRenderAttribute( `shape-cutout-${ el_id }`, {
		class: classnames,
	} );

	const renderAttributes = view.getRenderAttributeString( `shape-cutout-${ el_id }` );

	if ( settings.lqd_shape_cutout_style == "style-1" ) {
		out = `
<style>
	.elementor-element-${ el_id } {
		mask: linear-gradient(0deg, black, black), url(#${ mask_id });
		mask-composite: exclude;
	}
</style>
<div ${ renderAttributes }>
	<svg
		 class="lqd-cutout-svg pos-abs pos-tl w-100 h-100 w-full h-full pointer-events-none z-index--1"
		 role="none"
		 width="100"
		 height="100"
		 fill="none"
		 xmlns="http://www.w3.org/2000/svg">
		<mask id="${ circle_mask_id_bs }">
			<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-bs lqd-cutout-mask-circle-bs-mask-fill" cx="50" cy="50" r="50" fill="white" />
			<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-bs lqd-cutout-mask-circle-bs-mask-clip" cx="50" cy="50" r="50" fill="black" />
		</mask>
		<mask id="${ circle_mask_id_te }">
			<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-te lqd-cutout-mask-circle-te-mask-fill" cx="50" cy="50" r="50" fill="white" />
			<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-te lqd-cutout-mask-circle-te-mask-clip" cx="50" cy="50" r="50" fill="black" />
		</mask>

		<defs>
			<mask id="${ mask_id }">
				<g class="lqd-cutout-mask-g-wrap">
					<g class="lqd-cutout-mask-g">
						<rect class="lqd-cutout-mask-rect" width="760" height="160" rx="38" fill="white"/>
						<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-bs" cx="50" cy="50" r="50" fill="white" mask="url(#${ circle_mask_id_bs })" />
						<circle class="lqd-cutout-mask-circle lqd-cutout-mask-circle-te" cx="50" cy="50" r="50" fill="white" mask="url(#${ circle_mask_id_te })" />
					</g>
				</g>
			</mask>
		</defs>
	</svg>
</div>`;
	}

	return out;
}
