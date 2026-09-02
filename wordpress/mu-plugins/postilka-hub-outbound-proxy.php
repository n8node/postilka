<?php
/**
 * Plugin Name: Postilka Hub Outbound Proxy
 * Description: Send only HUB/Liquid theme vendor HTTP through the Telegram local proxy hop. Other WordPress traffic stays direct.
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Postilka_Hub_Outbound_Proxy {
    private static ?array $proxy = null;
    private static bool $proxyResolved = false;

    public static function init(): void {
        if (!function_exists('curl_init')) {
            return;
        }

        add_filter('http_request_args', [self::class, 'extend_timeout'], 10, 2);
        add_filter('pre_http_request', [self::class, 'maybe_proxy_request'], 5, 3);
    }

    public static function extend_timeout($args, $url) {
        if (!is_array($args) || !is_string($url) || !self::should_proxy($url)) {
            return $args;
        }

        $args['timeout'] = max((int) ($args['timeout'] ?? 30), 180);
        $args['connect_timeout'] = max((int) ($args['connect_timeout'] ?? 10), 30);

        return $args;
    }

    public static function maybe_proxy_request($preempt, $args, $url) {
        if ($preempt !== false) {
            return $preempt;
        }
        if (!is_string($url) || $url === '' || !is_array($args) || !self::should_proxy($url)) {
            return false;
        }

        return self::request_via_proxy($url, $args);
    }

    private static function should_proxy(string $url): bool {
        if (self::proxyConfig() === null) {
            return false;
        }
        if (!self::hubThemeIsActive()) {
            return false;
        }
        if (!self::isAdminContext()) {
            return false;
        }
        if (self::isLiquidAdminAction()) {
            return true;
        }
        if (self::isVendorUrl($url)) {
            return true;
        }

        return self::callerIsHub();
    }

    private static function isAdminContext(): bool {
        if (function_exists('wp_doing_cron') && wp_doing_cron()) {
            return true;
        }
        if (function_exists('wp_doing_ajax') && wp_doing_ajax()) {
            return true;
        }

        return function_exists('is_admin') && is_admin();
    }

    private static function hubThemeIsActive(): bool {
        $template = strtolower((string) get_option('template', ''));
        $stylesheet = strtolower((string) get_option('stylesheet', ''));

        foreach ([$template, $stylesheet] as $slug) {
            if ($slug === 'hub' || str_starts_with($slug, 'hub-')) {
                return true;
            }
        }

        return false;
    }

    private static function isLiquidAdminAction(): bool {
        $action = isset($_REQUEST['action']) ? (string) $_REQUEST['action'] : '';
        if ($action === '') {
            return false;
        }

        return str_starts_with($action, 'liquid_');
    }

    private static function isVendorUrl(string $url): bool {
        $host = strtolower((string) (wp_parse_url($url, PHP_URL_HOST) ?? ''));
        if ($host === '') {
            return false;
        }

        $suffixes = [
            'liquid-themes.com',
            'liquidthemes.com',
            'hubwp.net',
            'envato.com',
            'themeforest.net',
        ];

        foreach ($suffixes as $suffix) {
            if ($host === $suffix || str_ends_with($host, '.' . $suffix)) {
                return true;
            }
        }

        return false;
    }

    private static function callerIsHub(): bool {
        $needles = [
            '/themes/hub/',
            '/themes/hub-',
            '/plugins/hub-',
            '/plugins/hub_',
            '/plugins/liquid',
        ];

        foreach (debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 30) as $frame) {
            $file = str_replace('\\', '/', strtolower((string) ($frame['file'] ?? '')));
            if ($file === '') {
                continue;
            }
            foreach ($needles as $needle) {
                if (str_contains($file, $needle)) {
                    return true;
                }
            }
        }

        return false;
    }

    private static function proxyConfig(): ?array {
        if (self::$proxyResolved) {
            return self::$proxy;
        }
        self::$proxyResolved = true;

        $raw = '';
        if (defined('HUB_OUTBOUND_PROXY') && is_string(HUB_OUTBOUND_PROXY)) {
            $raw = trim(HUB_OUTBOUND_PROXY);
        }
        if ($raw === '') {
            foreach (['HUB_OUTBOUND_PROXY', 'TELEGRAM_LOCAL_PROXY'] as $key) {
                $value = getenv($key);
                if (is_string($value) && trim($value) !== '') {
                    $raw = trim($value);
                    break;
                }
            }
        }
        if ($raw === '') {
            self::$proxy = null;
            return null;
        }

        $parts = parse_url($raw);
        if (!is_array($parts) || empty($parts['host']) || strtolower((string) ($parts['scheme'] ?? '')) !== 'http') {
            self::$proxy = null;
            return null;
        }

        self::$proxy = [
            'host' => (string) $parts['host'],
            'port' => (int) ($parts['port'] ?? 80),
            'user' => isset($parts['user']) ? rawurldecode((string) $parts['user']) : '',
            'pass' => isset($parts['pass']) ? rawurldecode((string) $parts['pass']) : '',
        ];

        return self::$proxy;
    }

    private static function request_via_proxy(string $url, array $args) {
        $proxy = self::proxyConfig();
        if ($proxy === null) {
            return false;
        }

        $method = strtoupper((string) ($args['method'] ?? 'GET'));
        $timeout = (int) ($args['timeout'] ?? 180);
        if ($timeout < 30) {
            $timeout = 180;
        }

        $headers = [];
        if (!empty($args['headers']) && is_array($args['headers'])) {
            foreach ($args['headers'] as $name => $value) {
                if (is_int($name)) {
                    $headers[] = (string) $value;
                    continue;
                }
                if (is_array($value)) {
                    $value = implode(', ', $value);
                }
                $headers[] = $name . ': ' . $value;
            }
        }
        if (!empty($args['user-agent']) && is_string($args['user-agent'])) {
            $headers[] = 'User-Agent: ' . $args['user-agent'];
        }

        $filename = '';
        if (!empty($args['stream']) && !empty($args['filename']) && is_string($args['filename'])) {
            $filename = $args['filename'];
        }

        $headerBlob = '';
        $handle = curl_init($url);
        if ($handle === false) {
            return new WP_Error('http_request_failed', 'Hub proxy: curl_init failed.');
        }

        $opts = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => $filename === '',
            CURLOPT_HEADER => false,
            CURLOPT_HEADERFUNCTION => static function ($ch, string $header) use (&$headerBlob): int {
                $headerBlob .= $header;
                return strlen($header);
            },
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => (int) ($args['connect_timeout'] ?? 30),
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => max(0, (int) ($args['redirection'] ?? 5)),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_PROXY => $proxy['host'] . ':' . $proxy['port'],
            CURLOPT_PROXYTYPE => CURLPROXY_HTTP,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => ($args['sslverify'] ?? true) ? 1 : 0,
            CURLOPT_SSL_VERIFYHOST => ($args['sslverify'] ?? true) ? 2 : 0,
            CURLOPT_ENCODING => '',
        ];

        if ($proxy['user'] !== '') {
            $opts[CURLOPT_PROXYUSERPWD] = $proxy['user'] . ':' . $proxy['pass'];
            $opts[CURLOPT_PROXYAUTH] = CURLAUTH_BASIC;
        }

        $fileHandle = null;
        if ($filename !== '') {
            $fileHandle = fopen($filename, 'wb');
            if ($fileHandle === false) {
                curl_close($handle);
                return new WP_Error('http_request_failed', 'Hub proxy: could not open download file.');
            }
            $opts[CURLOPT_FILE] = $fileHandle;
        }

        if (isset($args['body']) && $args['body'] !== '' && $args['body'] !== null) {
            $opts[CURLOPT_POSTFIELDS] = $args['body'];
        }

        curl_setopt_array($handle, $opts);
        $body = curl_exec($handle);
        $errno = curl_errno($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);

        if (is_resource($fileHandle)) {
            fclose($fileHandle);
        }

        if ($errno !== 0) {
            return new WP_Error(
                'http_request_failed',
                sprintf('Hub proxy request failed (curl %d).', $errno)
            );
        }

        $processed = WP_Http::processHeaders($headerBlob, $url);
        $code = $status > 0 ? $status : (int) ($processed['response']['code'] ?? 0);
        $message = (string) ($processed['response']['message'] ?? '');
        if ($message === '' && function_exists('get_status_header_desc')) {
            $message = get_status_header_desc($code);
        }

        return [
            'headers' => $processed['headers'],
            'body' => $filename !== '' ? '' : (string) $body,
            'response' => [
                'code' => $code,
                'message' => $message,
            ],
            'cookies' => $processed['cookies'],
            'filename' => $filename !== '' ? $filename : null,
        ];
    }
}

Postilka_Hub_Outbound_Proxy::init();
