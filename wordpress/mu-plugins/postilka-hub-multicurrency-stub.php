<?php
/**
 * Plugin Name: Postilka Hub Multicurrency Stub
 * Description: Prevents fatal errors when Hub header dropdown uses currencies without Liquid_Multicurrency loaded.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Liquid_Multicurrency', false)) {
    return;
}

/**
 * Minimal stub for hub-elementor-addons LD_Header_Dropdown (data source: Currencies).
 * Real implementation loads from Hub theme when WooCommerce multicurrency is enabled.
 */
final class Liquid_Multicurrency {
    private static ?self $instance = null;

    public static function instance(): self {
        if (null === self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function is_enabled(): bool {
        return false;
    }

    public function get_currencies(): array {
        return [];
    }

    public function get_enabled_currencies(): array {
        return [];
    }

    public function get_current_currency(): string {
        if (function_exists('get_woocommerce_currency')) {
            return (string) get_woocommerce_currency();
        }

        return 'RUB';
    }

    public function get_currency_symbol(string $code): string {
        if (function_exists('get_woocommerce_currency_symbol')) {
            return (string) get_woocommerce_currency_symbol($code);
        }

        return $code;
    }

    public function __call(string $name, array $args) {
        if (str_starts_with($name, 'get_')) {
            return [];
        }

        if (str_starts_with($name, 'is_')) {
            return false;
        }

        return null;
    }

    public static function __callStatic(string $name, array $args) {
        return (new self())->__call($name, $args);
    }
}
