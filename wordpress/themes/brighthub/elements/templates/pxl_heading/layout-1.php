<?php
$html_id = pxl_get_element_id($settings);

$editor_title = $widget->get_settings_for_display( 'title', '' );
if( $settings['source_type'] == 'text' && !empty($editor_title) )
  $editor_title = $widget->parse_text_editor( $editor_title );

$sg_post_title = brighthub()->get_theme_opt('sg_post_title', 'default');
$sg_post_title_text = brighthub()->get_theme_opt('sg_post_title_text');

$slogan_before = brighthub()->get_page_opt( 'slogan_before', '' ); 
$slogan_after = brighthub()->get_page_opt( 'slogan_after', '' ); 

$sg_product_ptitle = brighthub()->get_theme_opt('sg_product_ptitle', 'default');
$sg_product_ptitle_text = brighthub()->get_theme_opt('sg_product_ptitle_text');

$sg_template_title = brighthub()->get_theme_opt('sg_template_title', 'default');
$sg_template_title_text = brighthub()->get_theme_opt('sg_template_title_text');

$sg_career_title = brighthub()->get_theme_opt('sg_career_title', 'default');
$sg_career_title_text = brighthub()->get_theme_opt('sg_career_title_text');
?>

<div id="pxl-<?php echo esc_attr($html_id) ?>" class="pxl-heading <?php if(!empty($settings['highlight_text_image']['id'])) { echo 'highlight-text-image'; } ?>" data-animation-type="<?php echo esc_attr($settings['animation_type']); ?>">
	<div class="pxl-heading__inner">
		<?php if ( !empty($settings['sub_title']) || $settings['sub_title_style'] === 'sub-slogan' ) : ?>
			<div class="pxl-heading__sub pxl-heading__<?php echo esc_attr($settings['sub_title_style'] . ' ' . $settings['pxl_animate_sub'] . ' pxl-heading__sub-' . $settings['sub_align']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay_sub']); ?>ms">
				<?php if ( !empty($settings['sub_title_icon']['value']) ) : ?>
			        <span class="pxl-heading__sub_icon">
			            <?php \Elementor\Icons_Manager::render_icon( $settings['sub_title_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
			        </span>
			    <?php endif; ?>

				<?php if ( $settings['sub_title_style'] === 'sub-slogan' || !empty($slogan_before) ) : ?>
					<span class="pxl-heading__sub-slogan--bef">
						<?php echo esc_html( !empty($slogan_before) ? $slogan_before : $settings['sub_title'] ); ?>
					</span>
				<?php elseif ( $settings['sub_title_style'] === 'sub-light' ) : ?>
					<?php if($settings['sub_light_line'] == 'left' || $settings['sub_light_line'] == 'both') : ?>
						<span class="line line-left"></span>
					<?php endif; ?>
					
					<span class="sub-title__inner sub-title__inner-<?php echo esc_attr($settings['graphic_position']); ?>">
						<span class="graphic"></span>
						<span class="text"> <?php if($settings['sub_dot_show'] === 'left') : ?> <span class="sub-dot sub-dot-left"></span> <?php endif; ?> <?php echo pxl_print_html($widget->parse_text_editor($settings['sub_title'])); ?> <?php if($settings['sub_dot_show'] === 'right') : ?> <span class="sub-dot sub-dot-right"></span> <?php endif; ?></span>
					</span>
					<?php if($settings['sub_light_line'] == 'right' || $settings['sub_light_line'] == 'both') : ?>
						<span class="line line-right"></span>
					<?php endif; ?>
				<?php else : ?>
					<?php if($settings['sub_title_style'] === 'dot' && $settings['sub_dot_show'] === 'left') : ?>
						<span class="sub-dot sub-dot-left"></span>
					<?php endif; ?>
					<?php echo pxl_print_html($widget->parse_text_editor($settings['sub_title'])); ?>
					<?php if($settings['sub_title_style'] === 'dot' && $settings['sub_dot_show'] === 'right') : ?>
						<span class="sub-dot sub-dot-right"></span>
					<?php endif; ?>
				<?php endif; ?>

				<?php if ( ( !empty($settings['slogan_text']) && $settings['sub_title_style'] === 'sub-slogan' ) || !empty($slogan_after) ) : ?>
					<span class="pxl-heading__sub-slogan--aft">
						<?php echo esc_html( !empty($slogan_after) ? $slogan_after : $settings['slogan_text'] ); ?>
					</span>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M9.62012 3.95312L13.6668 7.99979L9.62012 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M2.33398 8H13.554" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				<?php endif; ?>
			</div>
		<?php endif; ?>	
		<<?php echo esc_attr($settings['title_tag']); ?> class="pxl-heading__title pxl-heading__<?php echo esc_attr($settings['h_title_style'].' pxl-heading__'.$settings['highlight_style'].' '.$settings['pxl_animate']); ?> <?php echo esc_attr($settings['animation_type']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
		<span class="pxl-heading__text <?php echo esc_attr($settings['has_quote'] === "true" ? 'pxl-heading__has-quote' : ''); ?> <?php echo esc_attr($settings['heading_cliptext'] == 'yes' ? 'pxl-heading__cliptext' : ''); ?>">
			
			<?php if(is_singular('post') && $sg_post_title == 'custom_text' && !empty($sg_post_title_text) && $settings['source_type'] == 'title') { ?>
				<?php echo pxl_print_html($sg_post_title_text); ?>
			<?php } elseif(is_singular('template') && $sg_template_title == 'custom_text' && !empty($sg_template_title_text) && $settings['source_type'] == 'title') { ?>
				<?php echo pxl_print_html($sg_template_title_text); ?>
			<?php } elseif(is_singular('career') && $sg_career_title == 'custom_text' && !empty($sg_career_title_text) && $settings['source_type'] == 'title') { ?>
				<?php echo pxl_print_html($sg_career_title_text); ?>
			<?php } elseif(is_singular('product') && $sg_product_ptitle == 'custom_text' && !empty($sg_product_ptitle_text) && $settings['source_type'] == 'title') { ?>
				<?php echo pxl_print_html($sg_product_ptitle_text); ?>
			<?php } else { ?>
				<?php if($settings['source_type'] == 'text' && !empty($editor_title)) {
					if($settings['h_title_style'] == 'style-outline') { ?>
						<span class="pxl-text-line-backdrop">
							<span><?php echo wp_kses_post($editor_title); ?></span>
							<svg stroke-width="2" class="svg-text-line"><text dominant-baseline="middle" text-anchor="middle" x="50%" y="50%"><?php echo wp_kses_post($editor_title); ?></text></svg>		
						</span>
					<?php } else {
						echo pxl_print_html($widget->parse_text_editor($editor_title));
					}
				} elseif($settings['source_type'] == 'title') {
					$titles = brighthub()->page->get_title();
					if(!empty($_GET['blog_title'])) {
						$blog_title = $_GET['blog_title'];
						$custom_title = explode('_', $blog_title);
						foreach ($custom_title as $index => $value) {
							$arr_str_b[$index] = $value;
						}
						$str = implode(' ', $arr_str_b);
						echo wp_kses_post($str);
					} else {
						pxl_print_html($titles['title']);
					}
				}?>	
			<?php } ?>	
			
		</span>
		</<?php echo esc_attr($settings['title_tag']); ?>>
	</div>
	
</div>