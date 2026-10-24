<?php
/** Minimal isolated CLI compatibility surface. No external hook registration. */
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || defined('ABSPATH') || isset($GLOBALS['wpdb'])) { throw new RuntimeException('Task10E safety check failed.'); }
foreach (['DB_NAME','DB_USER','DB_PASSWORD','DB_HOST','DB_CHARSET','DB_COLLATE','WP_SETUP_CONFIG','MYSQL_CLIENT_FLAGS'] as $constant) {
    if (defined($constant)) { throw new RuntimeException('Task10E safety check failed.'); }
}
define('ABSPATH','/Applications/XAMPP/xamppfiles/htdocs/karban/');
define('WP_DEBUG',false); define('WP_DEBUG_DISPLAY',false);
class WP_Error {
    public function __construct(private string $code,private string $message='',private array $data=[]) {}
    public function get_error_code() { return $this->code; }
    public function get_error_message() { return $this->message; }
    public function get_error_data() { return $this->data; }
}
function is_wp_error($v) { return $v instanceof WP_Error; }
function get_option($key,$default=false) { return $GLOBALS['task10e_options'][$key]??$default; }
function update_option(...$args) { throw new RuntimeException('Task10E safety check failed.'); }
function add_option(...$args) { throw new RuntimeException('Task10E safety check failed.'); }
function current_time($type='mysql', $gmt=false) { return gmdate('Y-m-d H:i:s'); }
function wp_generate_uuid4() { $b=random_bytes(16); $b[6]=chr((ord($b[6])&15)|64); $b[8]=chr((ord($b[8])&63)|128); $h=bin2hex($b); return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20); }
function wp_json_encode($v) { return json_encode($v); }
function wp_parse_url($v) { return parse_url($v); }
function is_multisite() { return false; }
function __($v) { return $v; }
function _doing_it_wrong(...$args) { throw new RuntimeException('Task10E safety check failed.'); }
function wp_load_translations_early() {}
function wp_debug_backtrace_summary(...$args) { return 'Task10E'; }
function do_action(...$args) { throw new RuntimeException('Task10E safety check failed.'); }
function has_filter($name,$callback=false) { return false; }
function add_filter($name,$callback,$priority=10,$accepted_args=1) {
    // Only installed wpdb's own placeholder filter may register. Never arbitrary hooks.
    \Task10E\Guard::require($name==='query' && $priority===0 && is_array($callback) && $callback[0] instanceof wpdb && $callback[1]==='remove_placeholder_escape');
    $GLOBALS['task10e_escape'][spl_object_id($callback[0])]=$callback;
    return true;
}
function apply_filters($name,$value,...$args) {
    if ($name!=='query') { \Task10E\Guard::require(in_array($name,['incompatible_sql_modes','pre_get_table_charset','pre_get_col_charset'],true)); return $value; }
    foreach ($GLOBALS['task10e_escape']??[] as $cb) { $value=$cb($value); }
    // Installed wpdb's constructor performs its finite charset/sql-mode initialization
    // directly on the new native handle. Every filter-visible SQL uses this one guard.
    return \Task10E\Guard::sql($value,$GLOBALS['task10e_tables'],(bool)($GLOBALS['task10e_cleanup']??false));
}
require ABSPATH.'wp-includes/class-wpdb.php';
$plugin=ABSPATH.'wp-content/plugins/karban-core/';
require $plugin.'includes/class-helpers.php';
require $plugin.'includes/class-local-development-gate.php';
foreach (['financial-connection-port','financial-connection','local-payment-catalog','local-payment-schema','local-payment-policy','local-payment-quarantine','transactional-unit-of-work','wallet-manager','local-payment-rate-limiter','local-topup-service'] as $class) { require $plugin.'includes/payments/class-'.$class.'.php'; }
