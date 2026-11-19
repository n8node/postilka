<?php
/**
 * Define Case User hook
 *
 * @author Jax
 **/
add_action( 'pxl-user-form/form/login/after', 'up_hook_login_form_recaptcha' );

/**
 * Providing an implementation for 'up_hook_login_form_recaptcha'
 * to add Google recatcha to login form
 *
 * @author Jax
 */
function up_hook_login_form_recaptcha() {
    global $case_user;
    $case_user['template'] = (isset($case_user['template']) && $case_user['template'] != '')? $case_user['template'] : 'default';
    up_get_template_part( "{$case_user['template']}/recaptcha" );
}