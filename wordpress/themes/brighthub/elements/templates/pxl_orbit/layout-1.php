<div class="pxl-orbit">
    <svg width="946" height="946" viewBox="0 0 946 946" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="473" cy="473" r="472.25" stroke="#D5D7DA" stroke-width="1.5" stroke-dasharray="12 12"/>
    </svg>

    <svg width="674" height="674" viewBox="0 0 674 674" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="337" cy="337" r="336.25" stroke="#D5D7DA" stroke-width="1.5" stroke-dasharray="12 12"/>
    </svg>

    <svg width="434" height="434" viewBox="0 0 434 434" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="217" cy="217" r="216.25" stroke="#D5D7DA" stroke-width="1.5" stroke-dasharray="12 12"/>
    </svg>

    <div class="pxl-orbit__fav">
        <?php $favicon = isset($settings['favicon']) ? $settings['favicon'] : '';
        $fav = pxl_get_image_by_size([
            'attach_id'  => $favicon['id'],
            'thumb_size' => 'full',
            'class' => '',
        ]);
        $thumbnail = $fav['thumbnail']; ?>
        <?php if(!empty($favicon['id'])) echo wp_kses_post($thumbnail); ?>
    </div>
    <ul class="pxl-orbit__user">
        <?php foreach ($settings['list_user'] as $key => $value):
            $user_image = isset($value['user_image']) ? $value['user_image'] : '';
            $img_user = pxl_get_image_by_size([
                'attach_id'  => $user_image['id'],
                'thumb_size' => '104x104',
                'class' => ' pxl-orbit__user-item--avt',
            ]);
            $thumbnail_user = $img_user['thumbnail'];

            $user_flag = isset($value['user_flag']) ? $value['user_flag'] : '';
            $flag_user = pxl_get_image_by_size([
                'attach_id'  => $user_flag['id'],
                'thumb_size' => '24x24',
                'class' => ' pxl-orbit__user-item--flag',
            ]);
            $thumbnail_flag = $flag_user['thumbnail'];
            ?>
            <li class="pxl-orbit__user-item">
                <?php if(!empty($user_image['id'])) echo wp_kses_post($thumbnail_user); ?>
                <?php if(!empty($user_flag['id'])) echo wp_kses_post($thumbnail_flag); ?>
            </li>
        <?php endforeach; ?>
    </ul>
</div>