<?php
/**
 * Search Form
 */
?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url(home_url( '/' )); ?>">
	<div class="searchform-wrap">
        <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/img/search-left.png'); ?>" alt="<?php esc_attr_e('search', 'brighthub'); ?>" loading="lazy" />
        <input type="text" placeholder="<?php esc_attr_e('Search articles...', 'brighthub'); ?>" name="s" class="search-field" />
    	<button type="submit" class="search-submit btn-glossy">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M7.66732 14.0007C11.1651 14.0007 14.0007 11.1651 14.0007 7.66732C14.0007 4.16951 11.1651 1.33398 7.66732 1.33398C4.16951 1.33398 1.33398 4.16951 1.33398 7.66732C1.33398 11.1651 4.16951 14.0007 7.66732 14.0007Z" stroke="white" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14.6673 14.6673L13.334 13.334" stroke="white" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    </div>
</form>