<?php
/**
 * @package Case-Themes
 */  ?>
			</div>
				<?php brighthub()->footer->getFooter(); ?>
				<?php 
					if ( class_exists('Case_User') ) {
						brighthub_user_form();
					} 
				?>
				<?php do_action( 'pxl_anchor_target') ?>
			</div>
		<?php wp_footer(); ?>
	</body>
</html>
