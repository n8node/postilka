<?php
/**
 * Plugin Name: Postilka Hub Outbound Proxy
 * Description: Send only HUB/Liquid theme vendor HTTP through the Telegram local proxy hop. Other WordPress traffic stays direct. Elementor editor fetch/XHR to Liquid hosts is routed via admin-ajax so Hub Collections can load from Russia.
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Postilka_Hub_Outbound_Proxy {
    private static ?array $proxy = null;
    private static bool $proxyResolved = false;
    private static bool $editorScriptPrinted = false;

    public static function init(): void {
        if (!function_exists('curl_init')) {
            return;
        }

        add_filter('http_request_args', [self::class, 'extend_timeout'], 10, 2);
        add_filter('pre_http_request', [self::class, 'maybe_proxy_request'], 5, 3);
        add_action('wp_ajax_postilka_hub_browser_fetch', [self::class, 'ajaxBrowserFetch']);
        add_action('admin_print_scripts', [self::class, 'printEditorProxy'], 0);
        add_action('wp_print_scripts', [self::class, 'printEditorProxy'], 0);
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

        return str_starts_with($action, 'liquid_') || $action === 'postilka_hub_browser_fetch';
    }

    /**
     * @return list<string>
     */
    private static function vendorHostSuffixes(): array {
        return [
            'liquid-themes.com',
            'liquidthemes.com',
            'hubwp.net',
            'envato.com',
            'themeforest.net',
        ];
    }

    private static function hostMatchesSuffixes(string $host, array $suffixes): bool {
        $host = strtolower($host);
        if ($host === '') {
            return false;
        }
        foreach ($suffixes as $suffix) {
            $suffix = strtolower((string) $suffix);
            if ($host === $suffix || str_ends_with($host, '.' . $suffix)) {
                return true;
            }
        }

        return false;
    }

    private static function isVendorUrl(string $url): bool {
        $host = strtolower((string) (wp_parse_url($url, PHP_URL_HOST) ?? ''));

        return self::hostMatchesSuffixes($host, self::vendorHostSuffixes());
    }

    private static function isSafeVendorUrl(string $url): bool {
        if ($url === '' || !self::isVendorUrl($url)) {
            return false;
        }
        if (strtolower((string) (wp_parse_url($url, PHP_URL_SCHEME) ?? '')) !== 'https') {
            return false;
        }
        if (function_exists('wp_http_validate_url') && wp_http_validate_url($url) === false) {
            return false;
        }

        return true;
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

    public static function printEditorProxy(): void {
        if (self::$editorScriptPrinted) {
            return;
        }
        if (!self::hubThemeIsActive() || !is_user_logged_in() || !current_user_can('edit_posts')) {
            return;
        }
        if (!self::isElementorEditorScreen()) {
            return;
        }

        $payload = wp_json_encode([
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('postilka_hub_browser_fetch'),
            'suffixes' => self::vendorHostSuffixes(),
        ], JSON_UNESCAPED_SLASHES);
        if (!is_string($payload) || $payload === '') {
            return;
        }

        $js = '(function(){var C=' . $payload . ';'
            . 'if(!C||!C.ajaxUrl||window.__postilkaHubProxy)return;window.__postilkaHubProxy=true;'
            . 'function hostOf(u){try{return new URL(u,window.location.href).hostname.toLowerCase();}catch(e){return "";}}'
            . 'function should(u){if(!u||typeof u!=="string")return false;if(u.indexOf(C.ajaxUrl)===0)return false;'
            . 'var h=hostOf(u);if(!h)return false;return C.suffixes.some(function(s){return h===s||h.slice(-(s.length+1))==="."+s;});}'
            . 'function proxyFd(url,method,body,accept,contentType,authorization){var fd=new FormData();'
            . 'fd.append("action","postilka_hub_browser_fetch");fd.append("_wpnonce",C.nonce);fd.append("url",url);'
            . 'fd.append("method",(method||"GET").toUpperCase());if(body!=null&&body!=="")fd.append("body",typeof body==="string"?body:String(body));'
            . 'if(accept)fd.append("accept",accept);if(contentType)fd.append("content_type",contentType);'
            . 'if(authorization)fd.append("authorization",authorization);return fd;}'
            . 'var origFetch=window.fetch;window.fetch=function(input,init){var url;'
            . 'if(typeof input==="string")url=input;else if(input&&typeof input.url==="string")url=input.url;'
            . 'if(!url||!should(url))return origFetch.apply(this,arguments);'
            . 'init=init?Object.assign({},init):{};var method=(init.method||(input&&input.method)||"GET");'
            . 'var headers=new Headers(init.headers||(input&&input.headers)||undefined);'
            . 'return origFetch.call(this,C.ajaxUrl,{method:"POST",body:proxyFd(url,method,init.body||null,headers.get("Accept"),headers.get("Content-Type"),headers.get("Authorization")),credentials:"same-origin",signal:init.signal});};'
            . 'var origOpen=XMLHttpRequest.prototype.open;var origSend=XMLHttpRequest.prototype.send;var origSet=XMLHttpRequest.prototype.setRequestHeader;'
            . 'XMLHttpRequest.prototype.open=function(method,url){this.__phUrl=url;this.__phMethod=method;this.__phProxy=should(String(url||""));'
            . 'this.__phHeaders={};if(this.__phProxy){arguments[0]="POST";arguments[1]=C.ajaxUrl;}return origOpen.apply(this,arguments);};'
            . 'XMLHttpRequest.prototype.setRequestHeader=function(name,value){if(this.__phProxy){this.__phHeaders[String(name).toLowerCase()]=value;if(String(name).toLowerCase()==="content-type")return;}'
            . 'return origSet.apply(this,arguments);};'
            . 'XMLHttpRequest.prototype.send=function(body){if(this.__phProxy){var h=this.__phHeaders||{};'
            . 'body=proxyFd(this.__phUrl,this.__phMethod,body,h.accept,h["content-type"],h.authorization);}return origSend.call(this,body);};'
            . '})();';

        echo '<script>' . $js . '</script>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        self::$editorScriptPrinted = true;
    }

    private static function isElementorEditorScreen(): bool {
        $action = isset($_GET['action']) ? (string) $_GET['action'] : '';
        if ($action === 'elementor') {
            return true;
        }

        return isset($_GET['elementor-preview']);
    }

    public static function ajaxBrowserFetch(): void {
        if (!check_ajax_referer('postilka_hub_browser_fetch', '_wpnonce', false)) {
            status_header(403);
            wp_die('bad nonce', '', ['response' => 403]);
        }
        if (!is_user_logged_in() || !current_user_can('edit_posts')) {
            status_header(403);
            wp_die('forbidden', '', ['response' => 403]);
        }
        if (!self::hubThemeIsActive()) {
            status_header(400);
            wp_die('hub inactive', '', ['response' => 400]);
        }

        $url = isset($_POST['url']) ? esc_url_raw(wp_unslash((string) $_POST['url'])) : '';
        if (!self::isSafeVendorUrl($url)) {
            status_header(400);
            wp_die('url not allowed', '', ['response' => 400]);
        }

        $method = strtoupper(isset($_POST['method']) ? sanitize_text_field(wp_unslash((string) $_POST['method'])) : 'GET');
        if (!in_array($method, ['GET', 'POST', 'HEAD'], true)) {
            $method = 'GET';
        }

        $headers = [];
        if (!empty($_POST['accept'])) {
            $headers['Accept'] = sanitize_text_field(wp_unslash((string) $_POST['accept']));
        }
        if (!empty($_POST['content_type'])) {
            $headers['Content-Type'] = sanitize_text_field(wp_unslash((string) $_POST['content_type']));
        }
        if (!empty($_POST['authorization'])) {
            $auth = trim(wp_unslash((string) $_POST['authorization']));
            if ($auth !== '' && strpbrk($auth, "\r\n") === false) {
                $headers['Authorization'] = $auth;
            }
        }

        $args = [
            'method' => $method,
            'timeout' => 90,
            'redirection' => 5,
            'sslverify' => true,
            'headers' => $headers,
            'user-agent' => 'PostilkaHubProxy/1.0; ' . home_url('/'),
        ];
        if ($method === 'POST' && isset($_POST['body'])) {
            $args['body'] = wp_unslash((string) $_POST['body']);
        }

        $response = wp_remote_request($url, $args);
        if (is_wp_error($response)) {
            status_header(502);
            wp_die('proxy failed', '', ['response' => 502]);
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $body = (string) wp_remote_retrieve_body($response);
        if (strlen($body) > 8388608) {
            status_header(502);
            wp_die('response too large', '', ['response' => 502]);
        }

        status_header($code > 0 ? $code : 502);
        nocache_headers();
        $contentType = wp_remote_retrieve_header($response, 'content-type');
        if (is_array($contentType)) {
            $contentType = (string) reset($contentType);
        }
        if (is_string($contentType) && $contentType !== '') {
            header('Content-Type: ' . $contentType);
        }
        header('X-Content-Type-Options: nosniff');
        echo $body;
        wp_die();
    }
}

Postilka_Hub_Outbound_Proxy::init();

