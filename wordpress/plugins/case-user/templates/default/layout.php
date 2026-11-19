<?php
/**
 * The template for displaying logout text.
 *
 * @package Case User
 * @author CaseThemes Team
 * @since Case User 1.0.0
 */

if (! defined ( 'ABSPATH' )) {
	exit ();
}

global $case_user;

?>

<div class="pxl-user-form">
	<?php if(!empty($case_user['el_title'])) : ?>
		<div class="pxl-user-form-header">
			<h3><?php echo esc_attr( $case_user ['el_title'] ); ?></h3>
		</div>
	<?php endif; ?>
	<?php
		switch ($case_user['form_type']) {
			case 'login' :
				up_get_template_part ( $case_user['template'] . '/form', 'login' ); ?>
				<?php break;
			case 'register' :
				up_get_template_part ( $case_user['template'] . '/form', 'register' ); ?>
				<?php break;
		}
	?>
	<?php if($case_user ['other_page'] == 'yes' && !empty($case_user['label'])) : 
		$link = vc_build_link($case_user['link']);
		$a_href = '';
		$a_target = '';
		if ( strlen( $link['url'] ) > 0 ) {
		    $a_href = $link['url'];
		    $a_target = strlen( $link['target'] ) > 0 ? $link['target'] : '_self';
		}
		?>
		<div class="pxl-user-form-footer">
			<?php echo esc_attr($case_user['label']); ?> <?php if(!empty($case_user['text_link'])) : ?><a href="<?php echo esc_url($a_href);?>" target="<?php  echo esc_attr($a_target); ?>"><?php echo esc_attr($case_user['text_link']); ?></a><?php endif; ?>
		</div>
	<?php endif; ?>
</div>