<?php
/**
 * Task 6A fix-round standalone admin boundary test.
 * No WordPress bootstrap, database, HTTP, mail, migration or seed is run.
 */
define( 'ABSPATH', __DIR__ . '/' );
define( 'NAHAN_CORE_DIR', '/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/' );

final class RedirectSignal extends RuntimeException { public function __construct( public string $url ) { parent::__construct( $url ); } }
final class FixtureError { public function __construct( public string $code = 'fixture_error' ) {} }
final class FakeWpdb {
	public string $prefix = 'wp_';
	public array $engines = [ 'wp_nahan_wallet_transactions' => 'InnoDB', 'wp_nahan_leads_unlocked' => 'InnoDB', 'wp_nahan_subscriptions' => 'InnoDB' ];
	public array $indexes = [
		'wp_nahan_wallet_transactions' => [ [ 'Key_name' => 'effect_key', 'Non_unique' => 0, 'Seq_in_index' => 1, 'Column_name' => 'effect_key', 'Sub_part' => null ] ],
		'wp_nahan_leads_unlocked' => [
			[ 'Key_name' => 'unlock_unique', 'Non_unique' => 0, 'Seq_in_index' => 1, 'Column_name' => 'specialist_user_id', 'Sub_part' => null ],
			[ 'Key_name' => 'unlock_unique', 'Non_unique' => 0, 'Seq_in_index' => 2, 'Column_name' => 'target_type', 'Sub_part' => null ],
			[ 'Key_name' => 'unlock_unique', 'Non_unique' => 0, 'Seq_in_index' => 3, 'Column_name' => 'target_id', 'Sub_part' => null ],
		],
	];
	public bool $duplicate = false;
	public function prepare( $query, ...$values ) { return $query . '|' . implode( '|', $values ); }
	public function get_row( $query, $output = null ) {
		if ( str_contains( $query, 'SHOW TABLE STATUS' ) ) { foreach ( $this->engines as $table => $engine ) if ( str_contains( $query, $table ) ) return [ 'Engine' => $engine ]; return null; }
		if ( str_contains( $query, 'HAVING COUNT(*) > 1' ) ) return $this->duplicate ? [ 'duplicate_count' => 2 ] : null;
		return null;
	}
	public function get_col( $query, $column = 0 ) {
		if ( str_contains( $query, 'SHOW COLUMNS' ) ) return [ 'effect_key' ];
		foreach ( $this->indexes as $table => $indexes ) if ( str_contains( $query, $table ) && str_contains( $query, 'SHOW INDEX' ) ) return array_map( static fn( $index ) => (string) $index['Key_name'], $indexes );
		return [];
	}
	public function get_results( $query, $output = null ) { foreach ( $this->indexes as $table => $indexes ) if ( str_contains( $query, $table ) && str_contains( $query, 'SHOW INDEX' ) ) return $indexes; return []; }
}
$GLOBALS['hooks'] = []; $GLOBALS['filters'] = []; $GLOBALS['options'] = []; $GLOBALS['writes'] = 0; $GLOBALS['users'] = []; $GLOBALS['posts'] = []; $GLOBALS['terms'] = []; $GLOBALS['term_meta'] = []; $GLOBALS['user_meta'] = []; $GLOBALS['post_meta'] = []; $GLOBALS['roles_registered'] = [ 'nahan_client' => true, 'nahan_specialist' => true ]; $GLOBALS['taxonomies'] = [ 'job_category' => true, 'city' => true ]; $GLOBALS['cpt_registered'] = true; $GLOBALS['current_admin'] = true; $GLOBALS['nonce_valid'] = true; $GLOBALS['current_user'] = 91; $GLOBALS['fail'] = null; $GLOBALS['wpdb'] = new FakeWpdb();
function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) { $GLOBALS['hooks'][ $hook ] = $callback; }
function add_filter( $hook, $callback, $priority = 10 ) { $GLOBALS['filters'][ $hook ][ $priority ][] = $callback; }
function remove_filter( $hook, $callback, $priority = 10 ) { unset( $GLOBALS['filters'][ $hook ][ $priority ] ); if ( empty( $GLOBALS['filters'][ $hook ] ) ) unset( $GLOBALS['filters'][ $hook ] ); }
function current_user_can( $cap ) { return $cap === 'manage_options' && $GLOBALS['current_admin']; }
function get_current_user_id() { return $GLOBALS['current_user']; }
function check_admin_referer( $action, $field = '_wpnonce' ) { if ( ! $GLOBALS['nonce_valid'] || ( $_POST[ $field ] ?? '' ) !== 'valid-nonce' ) throw new RuntimeException( 'invalid nonce' ); return 1; }
function wp_die( $message ) { throw new RuntimeException( (string) $message ); }
function wp_safe_redirect( $url ) { throw new RedirectSignal( $url ); }
function add_query_arg( $args, $url ) { return $url . '&' . http_build_query( $args ); }
function admin_url( $path = '' ) { return 'http://localhost/wp-admin/' . ltrim( $path, '/' ); }
function wp_nonce_field( $action, $name = '_wpnonce', $referer = true, $echo = true ) { return '<input name="' . $name . '" />'; }
function get_option( $key, $default = false ) { return $GLOBALS['options'][ $key ] ?? $default; }
function current_time( $type, $gmt = false ) { return '2026-10-20 00:00:00'; }
function update_option( $key, $value ) { $GLOBALS['options'][ $key ] = $value; $GLOBALS['writes']++; return true; }
function wp_json_encode( $value, $flags = 0 ) { return json_encode( $value, $flags | JSON_THROW_ON_ERROR ); }
function wp_get_environment_type() { return 'local'; }
function get_role( $role ) { return $GLOBALS['roles_registered'][ $role ] ?? false ? (object) [ 'name' => $role ] : false; }
function post_type_exists( $type ) { return $type === 'nahan_specialist' && $GLOBALS['cpt_registered']; }
function taxonomy_exists( $taxonomy ) { return ! empty( $GLOBALS['taxonomies'][ $taxonomy ] ); }
function get_term_by( $field, $value, $taxonomy ) { foreach ( $GLOBALS['terms'][ $taxonomy ] ?? [] as $term ) if ( $term->$field === $value ) return $term; return false; }
function wp_insert_term( $name, $taxonomy, $args ) { if ( $GLOBALS['fail'] === 'term' ) return new FixtureError( 'term' ); $id = count( $GLOBALS['terms'][ $taxonomy ] ?? [] ) + 101; $GLOBALS['terms'][ $taxonomy ][] = (object) [ 'term_id' => $id, 'name' => $name, 'slug' => $args['slug'] ]; $GLOBALS['writes']++; return [ 'term_id' => $id ]; }
function update_term_meta( $term_id, $key, $value ) { if ( $GLOBALS['fail'] === 'term-meta' ) return false; $GLOBALS['term_meta'][ $term_id ][ $key ] = $value; $GLOBALS['writes']++; return 1; }
function get_term_meta( $term_id, $key, $single = true ) { return $GLOBALS['term_meta'][ $term_id ][ $key ] ?? ''; }
function get_users( $args = [] ) { $out = []; foreach ( $GLOBALS['users'] as $user ) if ( (string) ( $GLOBALS['user_meta'][ $user->ID ][ $args['meta_key'] ?? '' ] ?? '' ) === (string) ( $args['meta_value'] ?? '' ) ) $out[] = $user; return array_slice( $out, 0, $args['number'] ?? 0 ?: null ); }
function username_exists( $login ) { foreach ( $GLOBALS['users'] as $user ) if ( $user->user_login === $login ) return $user->ID; return false; }
function sanitize_user( $value, $strict = false ) { return $value; }
function wp_generate_password( $length = 12, $special = true, $extra = true ) { return 'unrevealed-random-password'; }
function wp_insert_user( $data ) { if ( $GLOBALS['fail'] === 'raw-exception' ) throw new RuntimeException('SELECT private_fixture FROM fixture_password'); if ( $GLOBALS['fail'] === 'user' ) return new FixtureError( 'user' ); $id = count( $GLOBALS['users'] ) + 201; $GLOBALS['users'][] = (object) [ 'ID' => $id, 'user_login' => $data['user_login'], 'roles' => [ $data['role'] ] ]; $GLOBALS['writes']++; return $id; }
function update_user_meta( $id, $key, $value ) { if ( $GLOBALS['fail'] === 'user-meta' || $GLOBALS['fail'] === 'user-meta:' . $key ) return false; $GLOBALS['user_meta'][ $id ][ $key ] = $value; $GLOBALS['writes']++; return 1; }
function get_user_meta( $id, $key, $single = true ) { return $GLOBALS['user_meta'][ $id ][ $key ] ?? ''; }
function get_post_stati( $args = [], $output = 'names', $operator = 'and' ) {
 $statuses = [ 'publish' => false, 'future' => false, 'draft' => false, 'pending' => false, 'private' => false, 'inherit' => true, 'trash' => true, 'auto-draft' => true, 'fixture-internal' => true ];
 $out = []; foreach ( $statuses as $name => $excluded ) { if ( isset( $args['exclude_from_search'] ) && $args['exclude_from_search'] !== $excluded ) continue; $out[$name] = 'names' === $output ? $name : (object) ['name'=>$name, 'exclude_from_search'=>$excluded]; } return $out;
}
function get_posts( $args = [] ) {
 $status = $args['post_status'] ?? 'publish';
 // WP any omits trash, auto-draft, inherit and search-excluded/internal statuses.
 $allowed = 'any' === $status ? array_values(get_post_stati(['exclude_from_search'=>false])) : (array) $status;
 $out = []; foreach ( $GLOBALS['posts'] as $post ) if ( $post->post_type === ( $args['post_type'] ?? '' ) && in_array( $post->post_status ?? 'publish', $allowed, true ) && ( ! isset( $args['author'] ) || (int) $post->post_author === (int) $args['author'] ) && ( ! isset( $args['meta_key'] ) || (string) ( $GLOBALS['post_meta'][ $post->ID ][ $args['meta_key'] ] ?? '' ) === (string) $args['meta_value'] ) ) $out[] = $post; return array_slice( $out, 0, $args['numberposts'] ?? 0 ?: null );
}

define( 'OBJECT', 'OBJECT' );
define( 'ARRAY_A', 'ARRAY_A' );
function get_page_by_path( $slug, $output = OBJECT, $post_type = 'post' ) { foreach ( $GLOBALS['posts'] as $post ) if ( $post->post_type === $post_type && ( $post->post_name ?? '' ) === $slug ) return $post; return null; }
function wp_insert_post( $data, $wp_error = false ) { if ( $GLOBALS['fail'] === 'profile' ) return new FixtureError( 'profile' ); $id = count( $GLOBALS['posts'] ) + 301; $GLOBALS['posts'][] = (object) [ 'ID' => $id, 'post_author' => $data['post_author'], 'post_type' => $data['post_type'], 'post_name' => $data['post_name'], 'post_status' => $data['post_status'], 'post_title' => $data['post_title'], 'post_content' => $data['post_content'] ]; $GLOBALS['writes']++; return $id; }
function update_post_meta( $id, $key, $value ) { if ( $GLOBALS['fail'] === 'post-meta' || $GLOBALS['fail'] === 'post-meta:' . $key ) return false; $GLOBALS['post_meta'][ $id ][ $key ] = $value; $GLOBALS['writes']++; return 1; }
function get_post_meta( $id, $key, $single = true ) { return $GLOBALS['post_meta'][ $id ][ $key ] ?? ''; }
function wp_set_object_terms( $id, $terms, $taxonomy, $append = false ) { if ( $GLOBALS['fail'] === 'city-assignment' && $taxonomy === 'city' ) return new FixtureError( 'city-assignment' ); if ( $GLOBALS['fail'] === 'category-assignment' && $taxonomy === 'job_category' ) return new FixtureError( 'category-assignment' ); $GLOBALS['assignments'][ $id ][ $taxonomy ] = $terms; $GLOBALS['writes']++; return $terms; }
function is_wp_error( $value ) { return $value instanceof FixtureError || $value instanceof WP_Error; }
function home_url( $path = '/' ) { return ( $GLOBALS['home_origin'] ?? 'http://localhost/karban' ) . $path; }
function wp_get_object_terms( $id, $taxonomy, $args = [] ) { return $GLOBALS['assignments'][ $id ][ $taxonomy ] ?? []; }
function wp_parse_url( $url ) { return parse_url( $url ); }
function esc_html( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ); } function esc_attr( $value ) { return esc_html( $value ); } function esc_url( $value ) { return (string) $value; } function sanitize_key( $value ) { return preg_replace( '/[^a-z0-9_]/', '', strtolower( $value ) ); }
class WP_Error { public function __construct( public string $code = '', public string $message = '' ) {} }

require_once NAHAN_CORE_DIR . 'includes/class-autoloader.php';
Nahan\Core\Autoloader::register();
require_once NAHAN_CORE_DIR . 'includes/class-helpers.php';
require_once NAHAN_CORE_DIR . 'includes/class-roles.php';
require_once NAHAN_CORE_DIR . 'includes/class-local-development-gate.php';
require_once NAHAN_CORE_DIR . 'includes/auth/class-otp-schema.php';
require_once NAHAN_CORE_DIR . 'includes/auth/class-credential-schema.php';
require_once NAHAN_CORE_DIR . 'includes/payments/class-financial-schema.php';
require_once NAHAN_CORE_DIR . 'includes/development/class-local-seed-manifest.php';
require_once NAHAN_CORE_DIR . 'includes/development/class-local-seed-service.php';
require_once NAHAN_CORE_DIR . 'includes/admin/class-local-development-tools.php';
use Nahan\Core\Admin\LocalDevelopmentTools; use Nahan\Core\Development\LocalSeedManifest; use Nahan\Core\Development\LocalSeedService; use Nahan\Core\LocalDevelopmentGate; use Nahan\Core\Payments\FinancialSchema;
function assert_true( $condition, $message ) { if ( ! $condition ) throw new RuntimeException( $message ); }
function assert_same( $expected, $actual, $message ) { if ( $expected !== $actual ) throw new RuntimeException( $message . ': ' . var_export( $actual, true ) ); }
function reset_fixture() { $GLOBALS['assignments'] = []; unset( $GLOBALS['home_origin'] ); $GLOBALS['hooks'] = []; $GLOBALS['filters'] = []; $GLOBALS['options'] = []; $GLOBALS['writes'] = 0; $GLOBALS['users'] = []; $GLOBALS['posts'] = []; $GLOBALS['terms'] = []; $GLOBALS['term_meta'] = []; $GLOBALS['user_meta'] = []; $GLOBALS['post_meta'] = []; $GLOBALS['roles_registered'] = [ 'nahan_client' => true, 'nahan_specialist' => true ]; $GLOBALS['taxonomies'] = [ 'job_category' => true, 'city' => true ]; $GLOBALS['cpt_registered'] = true; $GLOBALS['current_admin'] = true; $GLOBALS['nonce_valid'] = true; $GLOBALS['current_user'] = 91; $GLOBALS['fail'] = null; $GLOBALS['wpdb'] = new FakeWpdb(); $_SERVER['REQUEST_METHOD'] = 'POST'; $_SERVER['REMOTE_ADDR'] = '127.0.0.1'; $_POST = [ '_wpnonce' => 'valid-nonce' ]; }
function gate( array $changes = [] ) { return new LocalDevelopmentGate( array_merge( [ 'local_development' => true, 'local_dev_seed' => true, 'environment_type' => 'local', 'site_url' => 'http://localhost/karban', 'remote_addr' => '127.0.0.1' ], $changes ) ); }
function tools( ?LocalSeedService $seed = null, ?LocalDevelopmentGate $gate = null ) { return new LocalDevelopmentTools( $seed ?? new LocalSeedService( $gate ?? gate() ), $gate ?? gate() ); }
function registered_tools( ?LocalSeedService $seed = null, ?LocalDevelopmentGate $gate = null ) { $tool = tools( $seed, $gate ); $tool->register(); return $tool; }
function invoke( $callback ) { try { $callback(); } catch ( RedirectSignal $signal ) { return $signal->url; } return null; }
function expect_denied( $callback, $message ) { try { $callback(); } catch ( RuntimeException $e ) { return; } throw new RuntimeException( $message ); }

reset_fixture();
$manifest = LocalSeedManifest::all();
$expected_cities = [ 'kashan', 'meshkat', 'barzok', 'niasar', 'qamsar', 'jowshaqan-qali', 'kamu-va-chugan' ];
assert_same( 18, count( $manifest['taxonomies']['job_category'] ), 'approved manifest has 18 categories' ); assert_same( $expected_cities, array_column( $manifest['taxonomies']['city'], 'slug' ), 'approved manifest has only the reviewed seven-city Kashan baseline' ); assert_same( 4, count( $manifest['users'] ), 'approved manifest has four accounts' );
foreach ( $manifest['taxonomies']['city'] as $city ) { assert_same( [ 'county' => 'kashan', 'kind' => 'city', 'source_year' => 2016, 'source' => 'application-historical-2016-baseline' ], $city['metadata'] ?? null, 'city metadata records the historical application baseline without an official identifier' ); }
assert_true( ! in_array( 'ravand', $expected_cities, true ) && ! in_array( 'fin', $expected_cities, true ) && ! in_array( 'aran-va-bidgol', $expected_cities, true ), 'unverified areas and excluded county are absent' );
assert_true( gate()->is_local_development_request_enabled(), 'base local upgrade gate must require actual loopback request' );
assert_true( ! gate( [ 'remote_addr' => '192.0.2.44' ] )->is_local_development_request_enabled(), 'nonlocal actual peer must fail base local upgrade gate' );
$service = new LocalSeedService( gate() ); $preview = $service->preview(); assert_same( 0, $GLOBALS['writes'], 'preview has zero writes' );
$tool = registered_tools( $service, gate() ); foreach ( [ 'admin_post_nahan_local_preview', 'admin_post_nahan_local_apply', 'admin_post_nahan_local_upgrade' ] as $hook ) assert_true( isset( $GLOBALS['hooks'][ $hook ] ), 'registered callback ' . $hook );
foreach ( [ 'privilege' => static function () { $GLOBALS['current_admin'] = false; }, 'nonce' => static function () { $GLOBALS['nonce_valid'] = false; }, 'GET' => static function () { $_SERVER['REQUEST_METHOD'] = 'GET'; } ] as $case => $set ) { reset_fixture(); $set(); registered_tools(); $before = $GLOBALS['writes']; expect_denied( static fn() => $GLOBALS['hooks']['admin_post_nahan_local_preview'](), $case . ' preview must deny' ); assert_same( $before, $GLOBALS['writes'], $case . ' preview zero writes' ); }
reset_fixture(); $disabled_gate = gate( [ 'local_dev_seed' => false ] ); registered_tools( new LocalSeedService( $disabled_gate ), $disabled_gate ); $before = $GLOBALS['writes']; expect_denied( static fn() => $GLOBALS['hooks']['admin_post_nahan_local_preview'](), 'disabled seed must deny' ); assert_same( $before, $GLOBALS['writes'], 'disabled preview zero writes' );
reset_fixture(); $nonlocal_gate = gate( [ 'remote_addr' => '192.0.2.44' ] ); registered_tools( new LocalSeedService( $nonlocal_gate ), $nonlocal_gate ); $before = $GLOBALS['writes']; expect_denied( static fn() => $GLOBALS['hooks']['admin_post_nahan_local_preview'](), 'nonlocal seed must deny' ); assert_same( $before, $GLOBALS['writes'], 'nonlocal preview zero writes' );
reset_fixture(); $_POST = [ '_wpnonce' => 'valid-nonce', 'schema' => 'otp', 'confirmation' => 'wrong' ]; registered_tools(); $before = $GLOBALS['writes']; expect_denied( static fn() => $GLOBALS['hooks']['admin_post_nahan_local_upgrade'](), 'bad upgrade confirmation must deny' ); assert_same( $before, $GLOBALS['writes'], 'bad confirmation zero writes' );
reset_fixture(); $_POST = [ '_wpnonce' => 'valid-nonce', 'schema' => 'otp', 'confirmation' => LocalSeedService::CONFIRMATION ]; $nonlocal_gate = gate( [ 'remote_addr' => '192.0.2.44' ] ); registered_tools( null, $nonlocal_gate ); $before = $GLOBALS['writes']; expect_denied( static fn() => $GLOBALS['hooks']['admin_post_nahan_local_upgrade'](), 'nonlocal upgrade must deny' ); assert_same( $before, $GLOBALS['writes'], 'nonlocal upgrade zero writes' );
reset_fixture(); $GLOBALS['roles_registered']['nahan_client'] = false; $before = $GLOBALS['writes']; expect_denied( static fn() => ( new LocalSeedService( gate() ) )->preview(), 'missing role must reject preflight' ); assert_same( $before, $GLOBALS['writes'], 'missing role zero writes' );
reset_fixture(); $GLOBALS['cpt_registered'] = false; $before = $GLOBALS['writes']; expect_denied( static fn() => ( new LocalSeedService( gate() ) )->preview(), 'missing CPT must reject preflight' ); assert_same( $before, $GLOBALS['writes'], 'missing CPT zero writes' );
reset_fixture(); $bad = LocalSeedManifest::all(); $bad['users'][1]['profile']['seed_id'] = $bad['users'][2]['profile']['seed_id']; $before = $GLOBALS['writes']; expect_denied( static fn() => ( new LocalSeedService( gate(), $bad ) )->preview(), 'duplicate profile marker must reject manifest' ); assert_same( $before, $GLOBALS['writes'], 'malformed manifest zero writes' );
reset_fixture(); $bad = LocalSeedManifest::all(); $bad['taxonomies']['city'][6]['slug'] = 'ravand'; $before = $GLOBALS['writes']; expect_denied( static fn() => ( new LocalSeedService( gate(), $bad ) )->preview(), 'unallowlisted Kashan-area candidate must reject manifest' ); assert_same( $before, $GLOBALS['writes'], 'unallowlisted city zero writes' );
reset_fixture(); $existing_kashan = (object) [ 'term_id' => 77, 'name' => 'کاشان', 'slug' => 'kashan' ]; $GLOBALS['terms']['city'][] = $existing_kashan; registered_tools(); $preview_redirect = invoke( $GLOBALS['hooks']['admin_post_nahan_local_preview'] ); assert_true( str_contains( (string) $preview_redirect, 'nahan_local_preview=ready' ), 'registered preview callback stores a preview' ); assert_true( isset( $GLOBALS['options']['nahan_local_seed_preview_91']['version'], $GLOBALS['options']['nahan_local_seed_preview_91']['hash'] ), 'stored preview contains server-held version and hash' ); $_POST['confirmation'] = LocalSeedService::CONFIRMATION; $apply_redirect = invoke( $GLOBALS['hooks']['admin_post_nahan_local_apply'] ); assert_true( str_contains( (string) $apply_redirect, 'nahan_local_apply=done' ), 'registered apply callback reports success' ); $result = $GLOBALS['options']['nahan_local_seed_last_result_91']; assert_same( 'success', $result['status'], 'stored-preview apply succeeds' ); assert_same( [], $result['passwords'], 'password never appears in result' ); assert_true( empty( $GLOBALS['filters'] ), 'outbound filters restore after success' ); assert_same( 7, count( $GLOBALS['terms']['city'] ?? [] ), 'existing Kashan plus six new allowed city terms are present' ); assert_same( [], $GLOBALS['term_meta'][77] ?? [], 'existing Kashan is never overwritten with metadata' ); foreach ( $GLOBALS['terms']['city'] as $term ) { if ( 'kashan' === $term->slug ) continue; assert_same( 'kashan', get_term_meta( $term->term_id, '_nahan_location_county', true ), 'new city records Kashan county metadata' ); assert_same( 'city', get_term_meta( $term->term_id, '_nahan_location_kind', true ), 'new city records city kind metadata' ); assert_same( '2016', get_term_meta( $term->term_id, '_nahan_location_source_year', true ), 'new city records 2016 source-year metadata' ); assert_same( 'application-historical-2016-baseline', get_term_meta( $term->term_id, '_nahan_location_source', true ), 'new city records application source metadata' ); } $material = [ count( $GLOBALS['terms']['job_category'] ?? [] ), count( $GLOBALS['terms']['city'] ?? [] ), count( $GLOBALS['users'] ), count( $GLOBALS['posts'] ), $GLOBALS['term_meta'] ]; $repeat_redirect = invoke( $GLOBALS['hooks']['admin_post_nahan_local_apply'] ); assert_true( str_contains( (string) $repeat_redirect, 'nahan_local_apply=done' ), 'repeat apply callback reports success' ); assert_same( $material, [ count( $GLOBALS['terms']['job_category'] ?? [] ), count( $GLOBALS['terms']['city'] ?? [] ), count( $GLOBALS['users'] ), count( $GLOBALS['posts'] ), $GLOBALS['term_meta'] ], 'repeat apply creates no duplicate records or metadata writes' );
reset_fixture(); registered_tools(); invoke( $GLOBALS['hooks']['admin_post_nahan_local_preview'] ); $_POST['confirmation'] = LocalSeedService::CONFIRMATION; $GLOBALS['fail'] = 'term-meta'; $metadata_partial_redirect = invoke( $GLOBALS['hooks']['admin_post_nahan_local_apply'] ); assert_true( str_contains( (string) $metadata_partial_redirect, 'nahan_local_apply=partial' ), 'required city metadata write failure is partial' ); $metadata_partial = $GLOBALS['options']['nahan_local_seed_last_result_91']; assert_same( 'partial', $metadata_partial['status'], 'metadata write failure is never success' ); assert_same( 'terms', $metadata_partial['failure_point'], 'metadata write failure identifies the term phase' ); assert_true( empty( $GLOBALS['filters'] ), 'outbound filters restore after metadata write failure' );
reset_fixture(); registered_tools(); invoke( $GLOBALS['hooks']['admin_post_nahan_local_preview'] ); $_POST['confirmation'] = LocalSeedService::CONFIRMATION; $GLOBALS['fail'] = 'category-assignment'; $partial_redirect = invoke( $GLOBALS['hooks']['admin_post_nahan_local_apply'] ); assert_true( str_contains( (string) $partial_redirect, 'nahan_local_apply=partial' ), 'partial apply never redirects to success' ); $partial = $GLOBALS['options']['nahan_local_seed_last_result_91']; assert_same( 'partial', $partial['status'], 'profile assignment failure is partial' ); assert_true( count( $partial['completed_items'] ) > 0 && isset( $partial['failure_point'], $partial['retry_guidance'] ), 'partial result is honest and retryable' ); assert_true( empty( $GLOBALS['filters'] ), 'outbound filters restore after failure' );
reset_fixture(); registered_tools(); invoke( $GLOBALS['hooks']['admin_post_nahan_local_preview'] ); $_POST['confirmation'] = LocalSeedService::CONFIRMATION; $GLOBALS['current_user'] = 92; $before = $GLOBALS['writes']; expect_denied( static fn() => $GLOBALS['hooks']['admin_post_nahan_local_apply'](), 'another administrator cannot apply a stored preview' ); assert_same( $before, $GLOBALS['writes'], 'foreign stored-preview apply zero writes' );
reset_fixture(); registered_tools(); invoke( $GLOBALS['hooks']['admin_post_nahan_local_preview'] ); $_POST['confirmation'] = LocalSeedService::CONFIRMATION; $nonlocal_gate = gate( [ 'remote_addr' => '192.0.2.44' ] ); registered_tools( new LocalSeedService( $nonlocal_gate ), $nonlocal_gate ); $before = $GLOBALS['writes']; expect_denied( static fn() => $GLOBALS['hooks']['admin_post_nahan_local_apply'](), 'nonlocal stored-preview apply must deny' ); assert_same( $before, $GLOBALS['writes'], 'nonlocal stored-preview apply zero writes' );
reset_fixture(); $schema = new FinancialSchema(); assert_true( $schema->is_ready(), 'all financial engines and exact unique indexes ready' ); $GLOBALS['options'][ FinancialSchema::CONFLICT_OPTION ] = [ 'detected_at' => 'fixture' ]; assert_true( ! $schema->is_ready(), 'financial conflict option blocks false-ready state' ); unset( $GLOBALS['options'][ FinancialSchema::CONFLICT_OPTION ] ); $GLOBALS['wpdb']->engines['wp_nahan_wallet_transactions'] = 'MyISAM'; assert_true( ! $schema->is_ready(), 'non-InnoDB financial engine false-ready prevention' ); $GLOBALS['wpdb']->engines['wp_nahan_wallet_transactions'] = 'InnoDB'; $GLOBALS['wpdb']->indexes['wp_nahan_wallet_transactions'][0]['Non_unique'] = 1; assert_true( ! $schema->is_ready(), 'same-named non-unique index is not ready' );
reset_fixture(); $schema = new FinancialSchema(); $GLOBALS['wpdb']->indexes['wp_nahan_leads_unlocked'][2]['Column_name'] = 'wrong_column'; assert_true( ! $schema->is_ready(), 'same-named unique index with wrong columns is not ready' );
reset_fixture(); $schema = new FinancialSchema(); $GLOBALS['wpdb']->indexes['wp_nahan_leads_unlocked'][0]['Column_name'] = 'target_type'; $GLOBALS['wpdb']->indexes['wp_nahan_leads_unlocked'][1]['Column_name'] = 'specialist_user_id'; assert_true( ! $schema->is_ready(), 'same-named unique index with wrong ordered columns is not ready' );
reset_fixture(); $schema = new FinancialSchema(); $GLOBALS['wpdb']->indexes['wp_nahan_wallet_transactions'][0]['Sub_part'] = 12; assert_true( ! $schema->is_ready(), 'prefix unique index is not ready' );
reset_fixture(); $schema = new FinancialSchema(); unset( $GLOBALS['wpdb']->indexes['wp_nahan_leads_unlocked'][0] ); assert_true( ! $schema->is_ready(), 'missing financial unique index false-ready prevention' );
reset_fixture(); $GLOBALS['wpdb']->indexes['wp_nahan_wallet_transactions'][0]['Non_unique'] = 1; $_POST = [ '_wpnonce' => 'valid-nonce', 'schema' => 'financial', 'confirmation' => LocalSeedService::CONFIRMATION ]; $upgrade = new LocalDevelopmentTools( null, gate(), null, null, new FinancialSchema() ); $upgrade->register(); $upgrade_redirect = invoke( $GLOBALS['hooks']['admin_post_nahan_local_upgrade'] ); assert_true( str_contains( (string) $upgrade_redirect, 'nahan_local_upgrade=failed' ), 'registered financial upgrade must fail for incompatible same-named index' ); assert_same( false, get_option( FinancialSchema::OPTION, false ), 'incompatible index must not record financial readiness' ); assert_true( false !== get_option( FinancialSchema::CONFLICT_OPTION, false ), 'incompatible index requires manual review' );
echo "PASS task 6A admin actions, guarded seed, partial results, and readiness\n";
