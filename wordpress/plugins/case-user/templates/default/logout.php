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

<div class="pxl-user-form-logout">
	<a class="btn" href="<?php echo esc_url(wp_logout_url( get_permalink() )); ?>"><?php echo esc_html($case_user['is_logged_text']); ?></a>
</div>