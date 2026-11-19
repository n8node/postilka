<?php 
$img_size = '';
if(!empty($settings['img_size'])) {
    $img_size = $settings['img_size'];
} else {
    $img_size = 'full';
}
?>
<div class="pxl-video pxl-video--<?php echo esc_attr($settings['btn_video_style']); ?> pxl-video--overlay-<?php echo esc_attr($settings['overlay']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-video__inner">
        <?php if( $settings['image_type'] != 'none' && !empty( $settings['image']['url'] ) ) : 
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => $settings['image']['id'],
                'thumb_size' => $img_size,
            ) );
            $thumbnail    = $img['thumbnail'];
            ?>
            <div class="pxl-video__holder">
                <?php if(!empty($settings['video_link_demo_before'])) : 
                    $video_url = $settings['video_link_demo_before'] ?? '';
                    $embed_url = '';
                    
                    if (strpos($video_url, 'youtube.com') !== false || strpos($video_url, 'youtu.be') !== false) {
                        $video_id = '';
                        if (preg_match('/[?&]v=([^&]+)/', $video_url, $m)) {
                            $video_id = $m[1];
                        } elseif (preg_match('/youtu\.be\/([^?]+)/', $video_url, $m)) {
                            $video_id = $m[1];
                        } elseif (preg_match('/embed\/([^?]+)/', $video_url, $m)) {
                            $video_id = $m[1];
                        }
                    
                        if ($video_id) {
                            $params = array(
                                'autoplay'        => 1,
                                'mute'            => 1,
                                'loop'            => 1,
                                'playlist'        => $video_id,
                                'controls'        => 0,
                                'modestbranding'  => 1,
                                'rel'             => 0,
                                'iv_load_policy'  => 3,
                                'playsinline'     => 1,
                                'fs'              => 0
                            );
                    
                            $embed_url = 'https://www.youtube-nocookie.com/embed/' . $video_id . '?' . http_build_query($params);
                        }
                    }
                    ?>
                    <div class="pxl-video__demo-before">
                        <?php if ($embed_url): ?>
                            <iframe 
                                src="<?php echo esc_url($embed_url); ?>" 
                                title="YouTube video player" 
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerpolicy="strict-origin-when-cross-origin"
                                allowfullscreen>
                            </iframe>
                        <?php else: ?>
                            <iframe 
                                src="<?php echo esc_url($video_url); ?>" 
                                title="Video player" 
                                frameborder="0"
                                allowfullscreen>
                            </iframe>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
                <?php if(!empty($settings['video_link_demo_upload'])) : ?>
                    <div class="pxl-video__demo-after">
                        <video src="<?php echo esc_url($settings['video_link_demo_upload']['url']); ?>" autoplay muted loop></video>
                    </div>
                <?php endif; ?>
                <?php if ($settings['image_type'] == 'img') { ?>
                    <?php if ( ! empty( $settings['image']['url'] ) ) { echo wp_kses_post($thumbnail); } ?>
                <?php } else { ?>
                    <div class="pxl-video--imagebg">
                        <div class="bg-image" style="background-image: url(<?php echo esc_url($settings['image']['url']); ?>);"></div>
                    </div>
                <?php } ?>
                
                <?php if($settings['show_info_video'] === 'true') : ?>
                    <div class="pxl-video__info">
                        <?php if(!empty($settings['info_video_image']['url'])) : ?>
                            <div class="pxl-video__info-image">
                                <?php $img_info  = pxl_get_image_by_size( array(
                                    'attach_id'  => $settings['info_video_image']['id'],
                                    'thumb_size' => 'full',
                                ) );
                                $thumbnail_info    = $img_info['thumbnail'];
                                ?>
                                <?php echo wp_kses_post($thumbnail_info); ?>
                            </div>
                        <?php endif; ?>
                        <div class="pxl-video__info-content">
                            <?php if(!empty($settings['info_video_description'])) : ?>
                                <div class="pxl-video__info-description"><?php echo esc_html($settings['info_video_description']); ?></div>
                            <?php endif; ?>
                            <?php if(!empty($settings['info_video_author'])) : ?>
                                <div class="pxl-video__info-author"><?php echo esc_html($settings['info_video_author']); ?></div>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        <?php if(!empty($settings['video_link'])) : 
            $popup_video_url = trim($settings['video_link']);
            ?>
            <a class="pxl-video__btn pxl-video__popup pxl-video__btn-<?php echo esc_attr($settings['btn_video_position']); ?> pxl-video__btn-<?php echo esc_attr($settings['btn_video_style']); ?>" href="<?php echo esc_url($popup_video_url); ?>">
                <?php if ( !empty($settings['video_icon']['value']) ) { ?>
                    <?php \Elementor\Icons_Manager::render_icon( $settings['video_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                <?php } else { ?>
                    <i class="caseicon-play-button"></i>
                <?php } ?>
            </a>
        <?php endif; ?>
        <?php if(!empty($settings['overlay_color'])) : ?>
            <div class="pxl-overlay-color"></div>
        <?php endif; ?>
    </div>
</div>