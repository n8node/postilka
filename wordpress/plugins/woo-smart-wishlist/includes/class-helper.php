<?php
defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'Woosw_Helper' ) ) {
	class Woosw_Helper {
		protected static $settings = [];
		protected static $localization = [];
		protected static $products = [];
		protected static $key = null;
		protected static $ids = [];
		protected static $instance = null;

		public static function instance() {
			if ( is_null( self::$instance ) ) {
				self::$instance = new self();
			}

			return self::$instance;
		}

		function __construct() {
			self::$settings     = (array) get_option( 'woosw_settings', [] );
			self::$localization = (array) get_option( 'woosw_localization', [] );
		}

		public static function get_settings() {
			return apply_filters( 'woosw_get_settings', self::$settings );
		}

		public static function get_setting( $name, $default = false ) {
			if ( ! empty( self::$settings ) && isset( self::$settings[ $name ] ) ) {
				$setting = self::$settings[ $name ];
			} else {
				$setting = get_option( 'woosw_' . $name, $default );
			}

			return apply_filters( 'woosw_get_setting', $setting, $name, $default );
		}

		public static function localization( $key = '', $default = '' ) {
			$str = '';

			if ( ! empty( $key ) && ! empty( self::$localization[ $key ] ) ) {
				$str = self::$localization[ $key ];
			} elseif ( ! empty( $default ) ) {
				$str = $default;
			}

			return esc_html( apply_filters( 'woosw_localization_' . $key, $str ) );
		}

		/**
		 * Cookie attributes shared by every code path that writes the woosw_key cookie
		 * (PHP login/logout/default handlers and the frontend JavaScript).
		 *
		 * @return array
		 */
		public static function get_cookie_config() {
			$secure   = (bool) apply_filters( 'woosw_cookie_secure', wc_site_is_https() && is_ssl() );
			$httponly = (bool) apply_filters( 'woosw_cookie_httponly', false );
			$samesite = ucfirst( strtolower( (string) apply_filters( 'woosw_cookie_samesite', 'Lax' ) ) );

			if ( ! in_array( $samesite, [ 'Lax', 'Strict', 'None' ], true ) ) {
				$samesite = 'Lax';
			}

			// SameSite=None is only accepted by browsers together with Secure
			if ( $samesite === 'None' && ! $secure ) {
				$samesite = 'Lax';
			}

			return [
				'days'     => 7,
				'path'     => (string) apply_filters( 'woosw_cookie_path', COOKIEPATH ? COOKIEPATH : '/' ),
				'domain'   => (string) apply_filters( 'woosw_cookie_domain', COOKIE_DOMAIN ? COOKIE_DOMAIN : '' ),
				'secure'   => $secure,
				'httponly' => $httponly,
				'samesite' => $samesite,
			];
		}

		/**
		 * Write a cookie with the shared Secure/SameSite/HttpOnly attributes.
		 *
		 * @param string   $name   Cookie name.
		 * @param string   $value  Cookie value.
		 * @param int|null $expire Expiry timestamp, null for the default lifetime.
		 * @param bool|null $httponly Force HttpOnly (e.g. for cookies only read by PHP), null to use the shared setting.
		 *
		 * @return bool
		 */
		public static function set_cookie( $name, $value, $expire = null, $httponly = null ) {
			if ( headers_sent() ) {
				return false;
			}

			$config = self::get_cookie_config();

			if ( ! is_null( $httponly ) ) {
				$config['httponly'] = (bool) $httponly;
			}

			$expire = is_null( $expire ) ? time() + ( $config['days'] * DAY_IN_SECONDS ) : (int) $expire;

			if ( PHP_VERSION_ID >= 70300 ) {
				return setcookie( $name, $value, [
					'expires'  => $expire,
					'path'     => $config['path'],
					'domain'   => $config['domain'],
					'secure'   => $config['secure'],
					'httponly' => $config['httponly'],
					'samesite' => $config['samesite'],
				] );
			}

			// PHP < 7.3 has no options array, append SameSite to the path instead
			return setcookie( $name, $value, $expire, $config['path'] . '; SameSite=' . $config['samesite'], $config['domain'], $config['secure'], $config['httponly'] );
		}

		/**
		 * Expire a cookie using the same attributes it was written with.
		 *
		 * @param string    $name     Cookie name.
		 * @param bool|null $httponly Same override that was used when writing.
		 *
		 * @return bool
		 */
		public static function delete_cookie( $name, $httponly = null ) {
			return self::set_cookie( $name, '', time() - HOUR_IN_SECONDS, $httponly );
		}

		public static function generate_key() {
			$key         = '';
			$key_str     = apply_filters( 'woosw_key_characters', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' );
			$key_str_len = strlen( $key_str );

			for ( $i = 0; $i < apply_filters( 'woosw_key_length', 6 ); $i ++ ) {
				$key .= $key_str[ random_int( 0, $key_str_len - 1 ) ];
			}

			return apply_filters( 'woosw_generate_key', $key );
		}

		public static function is_note_enabled() {
			return false;
		}

		public static function is_multiple_enabled() {
			return false;
		}

		public static function is_follow_enabled() {
			return false;
		}

		public static function is_collabable_enabled() {
			return false;
		}

		public static function is_collabable( $key ) {
			return false;
		}

		public static function set_collabable( $key, $status = 'yes' ) {
			if ( empty( $key ) ) {
				return false;
			}

			$val = ( $status === 'yes' || $status === '1' || $status === true || $status === 1 ) ? 'yes' : 'no';

			return update_option( 'woosw_collabable_' . $key, $val, false );
		}

		public static function is_owner( $key ) {
			if ( empty( $key ) ) {
				return false;
			}

			if ( is_user_logged_in() ) {
				$user_id = get_current_user_id();
				$keys    = self::get_user_keys( $user_id );

				// Exclude collab wishlists from owner check
				if ( is_array( $keys ) && isset( $keys[ $key ] ) ) {
					if ( isset( $keys[ $key ]['type'] ) && in_array( $keys[ $key ]['type'], [
							'collab',
							'follow'
						], true ) ) {
						return false;
					}

					return true;
				}

				if ( get_user_meta( $user_id, 'woosw_key', true ) === $key ) {
					return true;
				}
			} else {
				if ( isset( $_COOKIE['woosw_key'] ) && ( sanitize_text_field( wp_unslash( $_COOKIE['woosw_key'] ) ) === $key ) ) {
					return true;
				}
			}

			return false;
		}

		public static function can_edit( $key ) {
			if ( self::is_owner( $key ) ) {
				return true;
			}

			if ( self::is_collabable_enabled() && self::is_collabable( $key ) ) {
				return true;
			}

			return false;
		}

		public static function get_user_keys( $user_id = null ) {
			if ( ! $user_id ) {
				$user_id = get_current_user_id();
			}

			if ( ! $user_id ) {
				return [];
			}

			$keys = get_user_meta( $user_id, 'woosw_keys', true );

			if ( ! is_array( $keys ) || empty( $keys ) ) {
				return [];
			}

			$updated = false;

			foreach ( $keys as $k => $wl ) {
				// Remove the lazy cleanup logic for disabled collab wishlists.
				// We keep them in the user's list but they won't be able to edit (enforced by can_edit()).
			}

			if ( $updated ) {
				update_user_meta( $user_id, 'woosw_keys', $keys );

				// If current default key was the removed collab wishlist, reset to primary
				$current_key = get_user_meta( $user_id, 'woosw_key', true );
				if ( ! empty( $current_key ) && ! isset( $keys[ $current_key ] ) ) {
					$new_key = '';
					foreach ( $keys as $remaining_k => $remaining_wl ) {
						if ( isset( $remaining_wl['type'] ) && ( $remaining_wl['type'] === 'primary' ) ) {
							$new_key = $remaining_k;
							break;
						}
					}
					if ( empty( $new_key ) ) {
						reset( $keys );
						$new_key = key( $keys ) ?: '';
					}
					if ( ! empty( $new_key ) ) {
						update_user_meta( $user_id, 'woosw_key', $new_key );

						// Update cookie
						self::set_cookie( 'woosw_key', $new_key );
					}
				}
			}

			return $keys;
		}


		public static function get_page_id() {
			if ( self::get_setting( 'page_id' ) ) {
				return absint( self::get_setting( 'page_id' ) );
			}

			return false;
		}

		public static function get_key( $new = false ) {
			if ( $new ) {
				// get a new key for multiple wishlist
				$key = self::generate_key();

				while ( self::exists_key( $key ) ) {
					$key = self::generate_key();
				}

				return $key;
			} else {
				if ( ! is_null( self::$key ) ) {
					return self::$key;
				}

				if ( ! is_user_logged_in() && ( self::get_setting( 'disable_unauthenticated', 'no' ) === 'yes' ) ) {
					return self::$key = '#';
				}

				if ( is_user_logged_in() && ( ( $user_id = get_current_user_id() ) > 0 ) ) {
					self::get_user_keys( $user_id );
					$key = get_user_meta( $user_id, 'woosw_key', true );

					if ( empty( $key ) ) {
						$key = self::generate_key();

						while ( self::exists_key( $key ) ) {
							$key = self::generate_key();
						}

						// set a new key
						update_user_meta( $user_id, 'woosw_key', $key );
						update_option( 'woosw_list_' . $key, [], false );

						// multiple wishlist
						update_user_meta( $user_id, 'woosw_keys', [
							$key => [
								'type' => 'primary',
								'name' => '',
								'time' => '',
							],
						] );
					}

					return self::$key = $key;
				}

				if ( isset( $_COOKIE['woosw_key'] ) ) {
					return self::$key = sanitize_text_field( wp_unslash( $_COOKIE['woosw_key'] ) );
				}

				return self::$key = 'WOOSW';
			}
		}

		public static function exists_key( $key ) {
			if ( get_option( 'woosw_list_' . $key ) ) {
				return true;
			}

			return false;
		}

		public static function get_ids( $key = null ) {
			if ( ! $key ) {
				$key = self::get_key();
			}

			if ( isset( self::$ids[ $key ] ) ) {
				return self::$ids[ $key ];
			}

			return self::$ids[ $key ] = (array) apply_filters( 'woosw_get_ids', get_option( 'woosw_list_' . $key, [] ), $key );
		}

		public static function clear_internal_cache( $key = null ) {
			if ( $key ) {
				unset( self::$ids[ $key ] );
			} else {
				self::$key = null;
				self::$ids = [];
			}
		}

		public static function get_products() {
			return self::$products;
		}

		public static function set_products( $products ) {
			self::$products = $products;
		}

		public static function get_url( $key = null, $full = false ) {
			$url = home_url( '/' );

			if ( $page_id = self::get_page_id() ) {
				if ( $full ) {
					if ( ! $key ) {
						$key = self::get_key();
					}

					if ( get_option( 'permalink_structure' ) !== '' ) {
						$url = trailingslashit( get_permalink( $page_id ) ) . $key;
					} else {
						$url = get_permalink( $page_id ) . '&woosw_id=' . $key;
					}
				} else {
					$url = get_permalink( $page_id );
				}
			}

			return esc_url( apply_filters( 'woosw_wishlist_url', $url, $key, $full ) );
		}

		public static function get_count( $key = null ) {
			if ( ! $key ) {
				$key = self::get_key();
			}

			$products = self::get_ids( $key );
			$count    = count( $products );

			return esc_html( apply_filters( 'woosw_wishlist_count', $count, $key ) );
		}

		public static function is_primary( $key ) {
			if ( empty( $key ) ) {
				return false;
			}

			$keys = [];

			// try current user first
			if ( is_user_logged_in() ) {
				$keys = get_user_meta( get_current_user_id(), 'woosw_keys', true ) ?: [];
			}

			// fallback: find user by key from DB
			if ( ! isset( $keys[ $key ] ) ) {
				global $wpdb;

				$user = $wpdb->get_results( $wpdb->prepare(
					'SELECT user_id FROM `' . $wpdb->usermeta . '` WHERE `meta_key` = "woosw_keys" AND `meta_value` LIKE %s LIMIT 1',
					'%"' . $key . '"%'
				) );

				if ( ! empty( $user ) ) {
					$keys = get_user_meta( $user[0]->user_id, 'woosw_keys', true ) ?: [];
				}
			}

			return isset( $keys[ $key ]['type'] ) && $keys[ $key ]['type'] === 'primary';
		}

		public static function get_owner_id( $key ) {
			if ( empty( $key ) ) {
				return 0;
			}

			global $wpdb;

			$result = $wpdb->get_results( $wpdb->prepare(
				'SELECT user_id FROM `' . $wpdb->usermeta . '` WHERE `meta_key` = "woosw_keys" AND `meta_value` LIKE %s LIMIT 10',
				'%"' . $key . '"%'
			) );

			foreach ( $result as $row ) {
				$owner_keys = get_user_meta( (int) $row->user_id, 'woosw_keys', true ) ?: [];
				if ( isset( $owner_keys[ $key ] ) && ( ! isset( $owner_keys[ $key ]['type'] ) || ! in_array( $owner_keys[ $key ]['type'], [
							'collab',
							'follow'
						], true ) ) ) {
					return (int) $row->user_id;
				}
			}

			return 0;
		}

		public static function get_name( $key ) {
			if ( empty( $key ) ) {
				return '';
			}

			// Fast path for guest wishlists
			$guest_name = get_option( 'woosw_name_' . $key );
			if ( ! empty( $guest_name ) ) {
				return $guest_name;
			}

			// Check if current user has this key as a collab wishlist
			// If so, always read the name from the owner's data (not from collab entry)
			if ( is_user_logged_in() ) {
				$current_keys = get_user_meta( get_current_user_id(), 'woosw_keys', true ) ?: [];

				if ( isset( $current_keys[ $key ] ) && isset( $current_keys[ $key ]['type'] ) && in_array( $current_keys[ $key ]['type'], [
						'collab',
						'follow'
					], true ) ) {
					// Resolve name from owner using stored owner_id or DB lookup
					$owner_id = isset( $current_keys[ $key ]['owner_id'] ) ? (int) $current_keys[ $key ]['owner_id'] : self::get_owner_id( $key );

					if ( $owner_id ) {
						$owner_keys = get_user_meta( $owner_id, 'woosw_keys', true ) ?: [];

						if ( isset( $owner_keys[ $key ] ) ) {
							$wl = $owner_keys[ $key ];

							if ( isset( $wl['type'] ) && $wl['type'] === 'primary' ) {
								return ! empty( $wl['name'] ) ? $wl['name'] : self::localization( 'primary_name', esc_html__( 'Wishlist', 'woo-smart-wishlist' ) );
							}
							if ( ! empty( $wl['name'] ) ) {
								return $wl['name'];
							}
						}
					}

					return self::localization( 'primary_name', esc_html__( 'Wishlist', 'woo-smart-wishlist' ) );
				}
			}

			$keys = [];

			// try current user first (non-collab)
			if ( is_user_logged_in() ) {
				$keys = get_user_meta( get_current_user_id(), 'woosw_keys', true ) ?: [];
			}

			// fallback: find owner by key from DB
			if ( ! isset( $keys[ $key ] ) ) {
				global $wpdb;

				$user = $wpdb->get_results( $wpdb->prepare(
					'SELECT user_id FROM `' . $wpdb->usermeta . '` WHERE `meta_key` = "woosw_keys" AND `meta_value` LIKE %s LIMIT 1',
					'%"' . $key . '"%'
				) );

				if ( ! empty( $user ) ) {
					$keys = get_user_meta( $user[0]->user_id, 'woosw_keys', true ) ?: [];
				}
			}

			if ( isset( $keys[ $key ] ) ) {
				$wl = $keys[ $key ];

				if ( isset( $wl['type'] ) && $wl['type'] === 'primary' ) {
					return ! empty( $wl['name'] ) ? $wl['name'] : self::localization( 'primary_name', esc_html__( 'Wishlist', 'woo-smart-wishlist' ) );
				}
				if ( ! empty( $wl['name'] ) ) {
					return $wl['name'];
				}
			}

			return self::localization( 'primary_name', esc_html__( 'Wishlist', 'woo-smart-wishlist' ) );
		}

		public static function sanitize_array( $arr ) {
			foreach ( (array) $arr as $k => $v ) {
				if ( is_array( $v ) ) {
					$arr[ $k ] = self::sanitize_array( $v );
				} else {
					$arr[ $k ] = sanitize_post_field( 'post_content', $v, 0, 'db' );
				}
			}

			return $arr;
		}
	}

	return Woosw_Helper::instance();
}
