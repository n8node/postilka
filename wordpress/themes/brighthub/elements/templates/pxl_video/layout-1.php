<?php 
$aspect_ratio = '16/9';
if (isset($settings['aspect_ratio'])) {
    if ($settings['aspect_ratio'] === 'custom' && !empty($settings['aspect_ratio_custom'])) {
        $aspect_ratio = $settings['aspect_ratio_custom'];
    } else {
        $aspect_ratio = $settings['aspect_ratio'];
    }
}

$wrapper_class = 'pxl-video pxl-video--layout-' . esc_attr($settings['layout']);
if (isset($settings['pxl_animate'])) {
    $wrapper_class .= ' ' . esc_attr($settings['pxl_animate']);
}

$animation_delay = isset($settings['pxl_animate_delay']) ? esc_attr($settings['pxl_animate_delay']) : '0';
?>

<div class="<?php echo esc_attr($wrapper_class); ?>" data-wow-delay="<?php echo esc_attr($animation_delay); ?>ms">
    <?php if ($settings['video_display_type'] === 'popup') : ?>
        <?php
        $popup_url = '';
        $video_source = isset($settings['video_source']) ? $settings['video_source'] : 'youtube';
        
        if ($video_source === 'youtube' && !empty($settings['video_url'])) {
            $video_id = '';
            $video_url = $settings['video_url'];
            if (preg_match('/[?&]v=([^&]+)/', $video_url, $m)) {
                $video_id = $m[1];
            } elseif (preg_match('/youtu\.be\/([^?&]+)/', $video_url, $m)) {
                $video_id = $m[1];
            } elseif (preg_match('/embed\/([^?&]+)/', $video_url, $m)) {
                $video_id = $m[1];
            }
            
            if ($video_id) {
                $popup_url = 'https://www.youtube.com/embed/' . $video_id . '?autoplay=1&rel=0';
            } else {
                $popup_url = $video_url;
            }
        } elseif ($video_source === 'vimeo' && !empty($settings['video_url'])) {
            $video_id = '';
            $video_url = $settings['video_url'];
            if (preg_match('/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/', $video_url, $m)) {
                $video_id = $m[1];
            }
            
            if ($video_id) {
                $popup_url = 'https://player.vimeo.com/video/' . $video_id . '?autoplay=1';
            } else {
                $popup_url = $video_url;
            }
        } elseif ($video_source === 'self_hosted' && !empty($settings['video_file'])) {
            $popup_url = $settings['video_file'];
        } elseif ($video_source === 'external' && !empty($settings['video_url'])) {
            $popup_url = $settings['video_url'];
        }
        
        if (!empty($popup_url)) :
        ?>
            <div class="pxl-video__wrapper pxl-video__wrapper--popup" style="aspect-ratio: <?php echo esc_attr($aspect_ratio); ?>;">
                <div class="pxl-video__overlay"></div>
                <a href="<?php echo esc_url($popup_url); ?>" class="pxl-video__popup-link pxl-video__popup" data-popup-type="<?php echo esc_attr($video_source === 'self_hosted' ? 'video' : 'iframe'); ?>">
                    <div class="pxl-video__play-button pxl-video__play-button--<?php echo esc_attr(isset($settings['play_button_position']) ? $settings['play_button_position'] : 'center'); ?>">
                        <?php if (!empty($settings['play_button_icon']['value'])) : ?>
                            <?php \Elementor\Icons_Manager::render_icon( $settings['play_button_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                        <?php else : ?>
                            <i class="caseicon-play-button"></i>
                        <?php endif; ?>
                        <?php if (!empty($settings['play_button_text'])) : ?>
                            <span class="pxl-video__play-text"><?php echo esc_html($settings['play_button_text']); ?></span>
                        <?php endif; ?>
                    </div>
                </a>
            </div>
        <?php endif; ?>
    <?php else : ?>
        <?php
        $video_source = isset($settings['video_source']) ? $settings['video_source'] : 'youtube';
        ?>
        <div class="pxl-video__wrapper pxl-video__wrapper--inline" style="aspect-ratio: <?php echo esc_attr($aspect_ratio); ?>;">
            <?php if ($video_source === 'youtube' && !empty($settings['video_url'])) : 
                $video_id = '';
                $video_url = $settings['video_url'];
                if (preg_match('/[?&]v=([^&]+)/', $video_url, $m)) {
                    $video_id = $m[1];
                } elseif (preg_match('/youtu\.be\/([^?&]+)/', $video_url, $m)) {
                    $video_id = $m[1];
                } elseif (preg_match('/embed\/([^?&]+)/', $video_url, $m)) {
                    $video_id = $m[1];
                }
                
                if ($video_id) :
                    $params = array();
                    if (isset($settings['autoplay']) && $settings['autoplay'] === 'yes') {
                        $params['autoplay'] = 1;
                        $params['mute'] = 1;
                    } elseif (isset($settings['mute']) && $settings['mute'] === 'yes') {
                        $params['mute'] = 1;
                    }
                    if (isset($settings['loop']) && $settings['loop'] === 'yes') {
                        $params['loop'] = 1;
                        $params['playlist'] = $video_id;
                    }
                    $params['controls'] = 1;
                    $params['modestbranding'] = 1;
                    $params['rel'] = 0;
                    $params['iv_load_policy'] = 3;
                    $params['playsinline'] = 1;
                    $params['enablejsapi'] = 1;
                    
                    $embed_url = 'https://www.youtube-nocookie.com/embed/' . $video_id;
                    if (!empty($params)) {
                        $embed_url .= '?' . http_build_query($params);
                    }
            ?>
                <iframe 
                    src="<?php echo esc_url($embed_url); ?>" 
                    title="YouTube video player" 
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                </iframe>
            <?php 
                endif;
            elseif ($video_source === 'vimeo' && !empty($settings['video_url'])) : 
                $video_id = '';
                $video_url = $settings['video_url'];
                if (preg_match('/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/', $video_url, $m)) {
                    $video_id = $m[1];
                }
                
                if ($video_id) :
                    $params = array();
                    if (isset($settings['autoplay']) && $settings['autoplay'] === 'yes') {
                        $params['autoplay'] = 1;
                        $params['muted'] = 1;
                    } elseif (isset($settings['mute']) && $settings['mute'] === 'yes') {
                        $params['muted'] = 1;
                    }
                    if (isset($settings['loop']) && $settings['loop'] === 'yes') {
                        $params['loop'] = 1;
                    }
                    $params['controls'] = 1;
                    $params['playsinline'] = 1;
                    
                    $embed_url = 'https://player.vimeo.com/video/' . $video_id;
                    if (!empty($params)) {
                        $embed_url .= '?' . http_build_query($params);
                    }
            ?>
                <iframe 
                    src="<?php echo esc_url($embed_url); ?>" 
                    title="Vimeo video player" 
                    frameborder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowfullscreen
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                </iframe>
            <?php 
                endif;
            elseif ($video_source === 'self_hosted' && !empty($settings['video_file'])) :
                $autoplay_enabled = $settings['autoplay'] === 'true' ? true : false;
                $muted_enabled = ($settings['mute'] === 'true' ? true : false);
                $loop_enabled = $settings['loop'] === 'true' ? true : false;
                $controls_enabled = $settings['controls'] === 'true' ? true : false;
            ?>
                <video 
                    src="<?php echo esc_url($settings['video_file']); ?>"
                    <?php if ($autoplay_enabled) echo 'autoplay'; ?>
                    <?php if ($muted_enabled || $autoplay_enabled) echo 'muted'; ?>
                    <?php if ($loop_enabled) echo 'loop'; ?>
                    <?php if ($controls_enabled) echo 'controls'; ?>
                    playsinline
                    webkit-playsinline>
                </video>
            <?php 
            elseif ($video_source === 'external' && !empty($settings['video_url'])) : 
            ?>
                <iframe 
                    src="<?php echo esc_url($settings['video_url']); ?>" 
                    title="Video player" 
                    frameborder="0"
                    allow="autoplay; fullscreen"
                    allowfullscreen>
                </iframe>
            <?php endif; ?>
        </div>
    <?php endif; ?>
    <?php if (!empty($settings['pxl_icon']['value']) || !empty($settings['number'])) : ?>
        <div class="pxl-video__content">
            <?php if (!empty($settings['pxl_icon']['value'])) : ?>
                <?php \Elementor\Icons_Manager::render_icon( $settings['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
            <?php endif; ?>
            <?php if (!empty($settings['number'])) : ?>
                <span class="pxl-video__number"><?php echo esc_html($settings['number']); ?></span>
            <?php endif; ?>
        </div>
    <?php endif; ?>
</div>