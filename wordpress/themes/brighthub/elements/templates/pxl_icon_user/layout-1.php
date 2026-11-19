<?php 
$default_settings = [
	'style' => '',
	'text_placeholder' => '',
	'text_button' => '',
	'post_type' => '',
	'quick_user' => '',
	'align' => 'left',
	'avt_width' => '40',
	'text_button_login' => 'Log In',
	'text_button_register' => 'Sign Up (Free)',
];
$settings = array_merge($default_settings, $settings);
extract($settings);
$text_login = brighthub()->get_theme_opt('text_login',$settings['text_button_login']);
$text_register = brighthub()->get_theme_opt('text_register',$settings['text_button_register']);
?>

<div class="pxl-icon__users pxl-icon__users-<?php echo esc_attr($settings['align'])?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
	<?php 
	if (is_user_logged_in() && empty($settings['login_url']['url']) && empty($settings['register_url']['url'])) {
		$current_user = wp_get_current_user();
		$display_name = $current_user->display_name;
		
		$my_account_url = '';
		if (class_exists('WooCommerce')) {
			$my_ac = get_option('woocommerce_myaccount_page_id'); 
			if ($my_ac) {
				$my_account_url = get_permalink($my_ac);
			}
		}
		?>
		<?php if ( $settings['icon_type'] == 'icon' && !empty($settings['pxl_icon']['value']) ) : ?>
        <div class="pxl-item__icon">
			<?php if (!empty($my_account_url)) : ?>
				<a href="<?php echo esc_url($my_account_url); ?>" class="pxl-has-login">
			<?php endif; ?>
            <?php \Elementor\Icons_Manager::render_icon( $settings['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
			<?php if (!empty($my_account_url)) : ?>
				</a>
			<?php endif; ?>
        </div>
		<?php endif; ?>
		<?php if ( $settings['icon_type'] == 'image' && !empty($settings['icon_image']['id']) ) : 
			$image_size = !empty($settings['image_width']) ? $settings['image_width'] : 'full';
			?>
			<div class="pxl-item__image">
				<?php if (!empty($my_account_url)) : ?>
					<a href="<?php echo esc_url($my_account_url); ?>" class="pxl-has-login">
				<?php endif; ?>
				<?php $img_icon  = pxl_get_image_by_size( array(
					'attach_id'  => $settings['icon_image']['id'],
					'thumb_size' => 'full',
				) );
				$thumbnail_icon    = $img_icon['thumbnail'];
				echo pxl_print_html($thumbnail_icon); ?>
				<?php if (!empty($my_account_url)) : ?>
					</a>
				<?php endif; ?>
			</div>
		<?php endif; ?> 
		<?php if ( $settings['icon_type'] == 'avatar') : ?>
			<div class="pxl-item__avatar">
				<?php if (!empty($my_account_url)) : ?>
					<a href="<?php echo esc_url($my_account_url); ?>" class="pxl-has-login">
				<?php endif; ?>
				<?php
					$current_user = wp_get_current_user();
					$avatar = get_avatar( $current_user->ID, $settings['avt_width']);
					echo wp_kses_post($avatar);
				?>
				<?php if (!empty($my_account_url)) : ?>
					</a>
				<?php endif; ?>
			</div>
		<?php endif; ?> 
		<div class="pxl-item__text">
			<?php echo esc_html__('Hi, ','brighthub');?>
			<?php if (!empty($my_account_url)) : ?>
				<a href="<?php echo esc_url($my_account_url); ?>" class="pxl-has-login"><?php echo esc_html($display_name);?></a>
			<?php else : ?>
				<span class="pxl-has-login"><?php echo esc_html($display_name);?></span>
			<?php endif; ?>
		</div>
		<ul class="pxl-user-account">
				<?php 
				if (class_exists('WooCommerce')) {
					$my_ac = get_option('woocommerce_myaccount_page_id'); 
					?>
					<li><a href="<?php echo esc_url(get_permalink($my_ac)); ?>"><?php echo esc_html__('My Account', 'brighthub'); ?></a></li>
					<?php 
				}
				?>
				<li><a href="<?php echo esc_url(wp_logout_url()); ?>"><?php echo esc_html__('Log Out', 'brighthub'); ?></a></li>
			</ul>	
		<?php 
	} else if( !empty($settings['login_url']['url']) || !empty($settings['register_url']['url']) ) {
		?>
		<div class="pxl-hasnt-login">
			<?php if( !empty($settings['login_url']['url']) ) : ?>
				<a href="<?php echo esc_url($settings['login_url']['url']); ?>" class="btn-user btn-user__sign-in"><?php echo pxl_print_html($text_login); ?></a>
			<?php endif; ?>
			<?php if( !empty($settings['register_url']['url']) ) : ?>
				<a href="<?php echo esc_url($settings['register_url']['url']); ?>" class="btn-user btn-user__sign-up btn-glossy"><?php echo pxl_print_html($text_register); ?></a>
			<?php endif; ?>
		</div>
		<?php 
	} else {
		?>
		<div class="pxl-hasnt-login">
			<a href="javascript:void(0)" class="btn-user btn-user__sign-in"><?php echo pxl_print_html($text_login); ?></a>
			<a href="javascript:void(0)" class="btn-user btn-user__sign-up btn-glossy"><?php echo pxl_print_html($text_register); ?></a>
		</div>
		<?php 
	}
	?>
</div> 