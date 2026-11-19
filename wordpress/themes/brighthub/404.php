<?php
/**
 * @package Case-Themes
 */

$slogan = brighthub()->get_theme_opt('404_slogan', 'Lost, but not forgotten.');
$title = brighthub()->get_theme_opt('404_title', 'No worries<br> Let\'s start fresh.');
$desc = brighthub()->get_theme_opt('404_desc', 'Looks like the page you’re searching for has moved, doesn\'t exist, or got lost in cyberspace.');
$button_text = brighthub()->get_theme_opt('404_button_text', 'Back to Home');
$content_layout_404 = brighthub()->get_theme_opt('content_layout_404');
get_header(); ?>

<?php if($content_layout_404 === false): ?>
<div class="container">
    <div class="error-cnt">
        <div class="error-cnt__left">
            <div class="error-cnt__slg">
                <span class="error-cnt__slg-bef">404</span>
                <span class="error-cnt__slg-aft">
                    <?php echo esc_html($slogan); ?>                                    
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M9.62012 3.95312L13.6668 7.99979L9.62012 12.0465" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                        <path d="M2.33398 8H13.554" stroke="#181D27" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </span>
            </div>
            <h1 class="error-cnt__tit"><?php echo wp_kses($title, array('br' => array())); ?></h1>
            <p class="error-cnt__desc"><?php echo esc_html($desc); ?></p>
            <a class="error-cnt__btn btn btn-primary" href="<?php echo esc_url(home_url()); ?>">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6.37988 12.0469L2.33322 8.00021L6.37988 3.95354" stroke="white" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13.666 8L2.44602 8" stroke="white" stroke-width="1.33333" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <?php echo esc_html($button_text); ?>
            </a>
        </div>
        <svg width="639" height="639" viewBox="0 0 639 639" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="204" width="1.5" height="639" fill="url(#paint0_linear_18_364)" />
            <rect x="639" y="204" width="1.50003" height="639" transform="rotate(90 639 204)"
                fill="url(#paint1_linear_18_364)" />
            <rect x="638.999" y="433.5" width="1.50003" height="639" transform="rotate(90 638.999 433.5)"
                fill="url(#paint2_linear_18_364)" />
            <rect x="433.5" width="1.5" height="639" fill="url(#paint3_linear_18_364)" />

            <rect y="229.5" width="180" height="180" rx="24" fill="#F8F9FC" />
            <path
                d="M57.3047 346.455V335.801L95.0178 276.227H103.413V291.909H98.0859L71.1115 334.608V335.29H122.802V346.455H57.3047ZM98.6825 363.5V343.216L98.7678 338.358V276.227H111.254V363.5H98.6825Z"
                fill="#D5D7DA" />

            <g filter="url(#filter0_dd_18_364)">
                <rect x="205.5" y="205.5" width="180" height="180" rx="24" fill="#7A5AF8" />
                <path
                    d="M286.477 314.401V313.591C286.533 308.307 287.059 304.102 288.053 300.977C289.076 297.852 290.525 295.324 292.4 293.392C294.275 291.46 296.533 289.699 299.175 288.108C300.88 287.028 302.414 285.821 303.778 284.486C305.141 283.151 306.221 281.616 307.016 279.884C307.812 278.151 308.21 276.233 308.21 274.131C308.21 271.602 307.613 269.415 306.42 267.568C305.227 265.722 303.636 264.301 301.647 263.307C299.687 262.284 297.499 261.773 295.085 261.773C292.897 261.773 290.809 262.227 288.82 263.136C286.832 264.045 285.184 265.466 283.877 267.398C282.57 269.301 281.817 271.759 281.619 274.77H268.664C268.863 269.656 270.156 265.338 272.542 261.815C274.928 258.264 278.082 255.58 282.002 253.761C285.951 251.943 290.312 251.034 295.085 251.034C300.312 251.034 304.886 252.014 308.806 253.974C312.727 255.906 315.766 258.619 317.925 262.114C320.113 265.58 321.207 269.628 321.207 274.259C321.207 277.44 320.71 280.31 319.715 282.866C318.721 285.395 317.3 287.653 315.454 289.642C313.636 291.631 311.448 293.392 308.891 294.926C306.477 296.432 304.516 297.994 303.011 299.614C301.533 301.233 300.454 303.151 299.772 305.366C299.09 307.582 298.721 310.324 298.664 313.591V314.401H286.477ZM292.911 340.31C290.582 340.31 288.579 339.486 286.903 337.838C285.227 336.162 284.388 334.145 284.388 331.787C284.388 329.457 285.227 327.469 286.903 325.821C288.579 324.145 290.582 323.307 292.911 323.307C295.212 323.307 297.201 324.145 298.877 325.821C300.582 327.469 301.434 329.457 301.434 331.787C301.434 333.349 301.036 334.784 300.241 336.091C299.474 337.369 298.451 338.392 297.173 339.159C295.894 339.926 294.474 340.31 292.911 340.31Z"
                    fill="white" />
            </g>

            <rect x="229.5" y="459" width="180" height="180" rx="24" fill="#F8F9FC" />
            <path
                d="M286.805 575.955V565.301L324.518 505.727H332.913V521.409H327.586L300.612 564.108V564.79H352.302V575.955H286.805ZM328.183 593V572.716L328.268 567.858V505.727H340.754V593H328.183Z"
                fill="#D5D7DA" />

            <rect y="459" width="180" height="180" rx="24" fill="url(#paint4_linear_18_364)" />
            <rect width="180" height="180" rx="24" fill="url(#paint5_linear_18_364)" />
            <rect x="459" y="459" width="180" height="180" rx="24" fill="url(#paint6_linear_18_364)" />
            <rect x="459" width="180" height="180" rx="24" fill="url(#paint7_linear_18_364)" />

            <rect x="229.5" width="180" height="180" rx="24" fill="#F8F9FC" />
            <path
                d="M286.805 116.955V106.301L324.518 46.7273H332.913V62.4091H327.586L300.612 105.108V105.79H352.302V116.955H286.805ZM328.183 134V113.716L328.268 108.858V46.7273H340.754V134H328.183Z"
                fill="#D5D7DA" />

            <rect x="459" y="229.5" width="180" height="180" rx="24" fill="#F8F9FC" />
            <path
                d="M516.305 346.455V335.801L554.018 276.227H562.413V291.909H557.086L530.112 334.608V335.29H581.802V346.455H516.305ZM557.683 363.5V343.216L557.768 338.358V276.227H570.254V363.5H557.683Z"
                fill="#D5D7DA" />

            <g class="moving-line-h1">
                <path d="M150 204.75L250 204.75" stroke="url(#movingGradientH1)" stroke-width="1.5"
                    stroke-linecap="round" />
            </g>
            <g class="moving-line-h2">
                <path d="M350 434.25L450 434.25" stroke="url(#movingGradientH2)" stroke-width="1.5"
                    stroke-linecap="round" />
            </g>

            <g class="moving-line-v1">
                <path d="M204.75 150L204.75 250" stroke="url(#movingGradientV1)" stroke-width="1.5"
                    stroke-linecap="round" />
            </g>
            <g class="moving-line-v2">
                <path d="M434.25 350L434.25 450" stroke="url(#movingGradientV2)" stroke-width="1.5"
                    stroke-linecap="round" />
            </g>

            <defs>
                <linearGradient id="movingGradientH1" x1="150" y1="204.75" x2="250" y2="204.75"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#E1E1E1" stop-opacity="0" />
                    <stop offset="1" stop-color="#7A5AF8" />
                </linearGradient>

                <linearGradient id="movingGradientH2" x1="450" y1="434.25" x2="350" y2="434.25"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#E1E1E1" stop-opacity="0" />
                    <stop offset="1" stop-color="#7A5AF8" />
                </linearGradient>

                <linearGradient id="movingGradientV1" x1="204.75" y1="150" x2="204.75" y2="250"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#E1E1E1" stop-opacity="0" />
                    <stop offset="1" stop-color="#7A5AF8" />
                </linearGradient>

                <linearGradient id="movingGradientV2" x1="434.25" y1="450" x2="434.25" y2="350"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#E1E1E1" stop-opacity="0" />
                    <stop offset="1" stop-color="#7A5AF8" />
                </linearGradient>

                <filter id="filter0_dd_18_364" x="199.5" y="205.5" width="192" height="209" filterUnits="userSpaceOnUse"
                    color-interpolation-filters="sRGB">
                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha" />
                    <feOffset dy="27" />
                    <feGaussianBlur stdDeviation="1" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.956863 0 0 0 0 0.952941 0 0 0 0 1 0 0 0 1 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_18_364" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha" />
                    <feMorphology radius="6" operator="erode" in="SourceAlpha" result="effect2_dropShadow_18_364" />
                    <feOffset dy="18" />
                    <feGaussianBlur stdDeviation="6" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.418218 0 0 0 0 0.365328 0 0 0 0 1 0 0 0 0.32 0" />
                    <feBlend mode="normal" in2="effect1_dropShadow_18_364" result="effect2_dropShadow_18_364" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_18_364" result="shape" />
                </filter>

                <linearGradient id="paint0_linear_18_364" x1="204.75" y1="0" x2="204.75" y2="639"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#D5D7DA" stop-opacity="0" />
                    <stop offset="0.5" stop-color="#D5D7DA" />
                    <stop offset="1" stop-color="#D5D7DA" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="paint1_linear_18_364" x1="639.75" y1="204" x2="639.75" y2="843"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#D5D7DA" stop-opacity="0" />
                    <stop offset="0.5" stop-color="#D5D7DA" />
                    <stop offset="1" stop-color="#D5D7DA" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="paint2_linear_18_364" x1="639.749" y1="433.5" x2="639.749" y2="1072.5"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#D5D7DA" stop-opacity="0" />
                    <stop offset="0.5" stop-color="#D5D7DA" />
                    <stop offset="1" stop-color="#D5D7DA" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="paint3_linear_18_364" x1="434.25" y1="0" x2="434.25" y2="639"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#D5D7DA" stop-opacity="0" />
                    <stop offset="0.5" stop-color="#D5D7DA" />
                    <stop offset="1" stop-color="#D5D7DA" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="paint4_linear_18_364" x1="180" y1="459" x2="1.07288e-05" y2="639"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#F8F9FC" />
                    <stop offset="1" stop-color="#F8F9FC" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="paint5_linear_18_364" x1="0" y1="0" x2="180" y2="180"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#F8F9FC" stop-opacity="0" />
                    <stop offset="1" stop-color="#F8F9FC" />
                </linearGradient>
                <linearGradient id="paint6_linear_18_364" x1="459" y1="459" x2="639" y2="639"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#F8F9FC" />
                    <stop offset="1" stop-color="#F8F9FC" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="paint7_linear_18_364" x1="639" y1="0" x2="459" y2="180"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#F8F9FC" stop-opacity="0" />
                    <stop offset="1" stop-color="#F8F9FC" />
                </linearGradient>
                <linearGradient id="paint8_linear_18_364" x1="282" y1="433.7" x2="186" y2="433.7"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#E1E1E1" stop-opacity="0" />
                    <stop offset="1" stop-color="#7A5AF8" />
                </linearGradient>
                <linearGradient id="paint9_linear_18_364" x1="357" y1="204.5" x2="453" y2="204.5"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#E1E1E1" stop-opacity="0" />
                    <stop offset="1" stop-color="#7A5AF8" />
                </linearGradient>
            </defs>
        </svg>
    </div>
   
</div>
<?php else: 
   echo \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $content_layout_404 ); 
endif; ?>
<?php get_footer();
