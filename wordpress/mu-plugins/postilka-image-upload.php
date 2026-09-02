<?php
/**
 * Plugin Name: Postilka Image Upload Guard
 * Description: Prefer GD for media, reject huge pixel dimensions before native decode can OOM Apache.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_filter('wp_image_editors', static function (array $editors): array {
    return ['WP_Image_Editor_GD', 'WP_Image_Editor_Imagick'];
});

add_filter('wp_handle_upload_prefilter', static function (array $file): array {
    if (!empty($file['error'])) {
        return $file;
    }

    $tmp = isset($file['tmp_name']) ? (string) $file['tmp_name'] : '';
    if ($tmp === '' || !is_readable($tmp)) {
        return $file;
    }

    $info = @getimagesize($tmp);
    if ($info === false) {
        return $file;
    }

    $width = (int) $info[0];
    $height = (int) $info[1];
    $max = 4096;
    if ($width > $max || $height > $max) {
        $file['error'] = sprintf(
            'Изображение слишком большое (%d×%d px). Файл может быть лёгким, но сторон много. Сохраните не больше %d px по длинной стороне.',
            $width,
            $height,
            $max
        );
    }

    return $file;
});
