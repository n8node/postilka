<?php

defined( 'ABSPATH' ) || die();

class LD_Newsletter_Handler {

    public function __construct() {
        add_action( 'wp_ajax_add_mailchimp_user', [ $this, 'add_user_to_the_list' ] );
		add_action( 'wp_ajax_nopriv_add_mailchimp_user', [ $this, 'add_user_to_the_list' ] );
    }

    public function add_user_to_the_list() {
		
		// First check the nonce, if it fails the function will break
		check_ajax_referer( 'ld-mailchimp-form', 'security', false );

		if( !class_exists( 'liquid_MailChimp' ) ) {
			return;
		}
		
		$api_key = liquid_helper()->get_theme_option( 'mailchimp-api-key' );
		if( empty( $api_key ) || strpos( $api_key, '-' ) === false ) {
			wp_die( liquid_helper()->get_theme_option( 'liquid_mailchimp_text__missing_api' ) );
		}
		$MailChimp = new \liquid_MailChimp( $api_key );
		
		$list_id = $_POST['list_id'];
		$email = isset( $_POST['email'] ) ? sanitize_email( $_POST['email'] ) : '';
		$fname = isset( $_POST['fname'] ) ? sanitize_text_field( $_POST['fname'] ) : '';
		$lname = isset( $_POST['lname'] ) ? sanitize_text_field( $_POST['lname'] ) : '';
		$use_opt_in = isset( $_POST['use_opt_in'] ) ? sanitize_text_field( $_POST['use_opt_in'] ) : '';
		$tags = isset( $_POST['tags'] ) ? explode( ',', sanitize_text_field( $_POST['tags'] ) ) : array();

		if( empty( $list_id ) ) {
			wp_die( liquid_helper()->get_theme_option( 'liquid_mailchimp_text__missing_list' ) );
		}

		$result = $MailChimp->post( "lists/$list_id/members", array(
						'email_address' => $email,
						'merge_fields'  => array( 'FNAME'=> $fname, 'LNAME' => $lname ),
						'status'        => ($use_opt_in == 'yes' ? 'pending' : 'subscribed'),
						'tags'          => $tags, 
					) );
		if ( $MailChimp->success() ) {
			// Success message
			echo liquid_helper()->get_theme_option( 'liquid_mailchimp_text__thanks' );
		}
		else {
			// Display error
			echo $MailChimp->getLastError();
		}

		if ( !$MailChimp->getLastError() && isset(json_decode( wp_remote_retrieve_body( $MailChimp->getLastResponse() ), true )['detail']) ){
			switch ( json_decode( wp_remote_retrieve_body( $MailChimp->getLastResponse() ), true )['title'] ) {
				case 'Member Exists' :

					printf( '<h4>%s</h4>', 
						str_replace( '[email]', $email, liquid_helper()->get_theme_option( 'liquid_mailchimp_text__member_exists' ) )
					);
					
				break;
				default:
					echo '<h4>' . json_decode( wp_remote_retrieve_body( $MailChimp->getLastResponse() ), true )['detail'] . '</h4>';
				break;
			}

		}

		wp_die(); // Important
	}

}
new LD_Newsletter_Handler();
