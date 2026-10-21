<?php
/**
 * Standalone Task 4A2 source-stub tests. No WordPress bootstrap, database, SMS, or network.
 * Run: php tests/wordpress/task-4a2-credential-provenance.test.php
 */
declare( strict_types=1 );

namespace {
	define( 'ABSPATH', __DIR__ . '/' );
	define( 'ARRAY_A', 'ARRAY_A' );
	define( 'NAHAN_CORE_DIR', '/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/' );

	final class WP_Error {
		public function __construct( public string $code = '', public string $message = '', public array $data = [] ) {}
		public function get_error_code(): string { return $this->code; }
		public function get_error_message(): string { return $this->message; }
		public function get_error_data(): array { return $this->data; }
	}
	final class WP_REST_Response {
		public function __construct( public array $data, public int $status = 200 ) {}
	}
	final class WP_User {
		public function __construct( public int $ID, public string $display_name, public array $roles ) {}
	}
	final class TestRequest {
		public function __construct( private array $params ) {}
		public function get_param( string $key ): mixed { return $this->params[ $key ] ?? null; }
		public function get_params(): array { return $this->params; }
	}
	function is_wp_error( mixed $value ): bool { return $value instanceof WP_Error; }
	function wp_json_encode( mixed $value ): string { return json_encode( $value, JSON_THROW_ON_ERROR ); }
	function wp_parse_url( string $url ): array|false { return parse_url( $url ); }
	function sanitize_text_field( string $value ): string { return $value; }
	function wp_unslash( string $value ): string { return $value; }
	function current_time( string $type, bool $gmt = false ): string { return '2026-10-18 00:00:00'; }
	function wp_get_environment_type(): string { return 'production'; }
	function get_option( string $key, mixed $default = false ): mixed { global $test_options; return $test_options[ $key ] ?? $default; }
	function update_option( string $key, mixed $value ): bool { global $test_options; $test_options[ $key ] = $value; return true; }
	function get_transient( string $key ): mixed { return false; }
	function set_transient( string $key, mixed $value, int $seconds ): bool { return true; }
	function delete_transient( string $key ): bool { return true; }
	function dbDelta( string $sql ): array { global $db_delta_calls; $db_delta_calls[] = $sql; return []; }
	function get_bloginfo( string $show = '' ): string { global $test_options; return (string) ( $test_options['siteurl'] ?? '' ); }
	function __return_true(): bool { return true; }
	function register_rest_route( string $namespace, string $route, array $definition ): bool { global $registered_routes; $registered_routes[ $route ] = $definition; return true; }
	function get_users( array $args ): array { global $test_users; return $test_users; }
	function wp_generate_password( int $length = 12, bool $special_chars = true, bool $extra_special_chars = false ): string { return str_repeat( 'p', $length ); }
	function wp_insert_user( array $data ): int { global $user_insert_calls; $user_insert_calls++; return 77; }
	function update_user_meta( int $user_id, string $key, mixed $value ): bool { return true; }
	function get_userdata( int $user_id ): ?WP_User { global $test_users; return $test_users[0] ?? null; }
	function wp_insert_post( array $data ): int { return 88; }
	function update_post_meta( int $post_id, string $key, mixed $value ): bool { return true; }

	final class TestWpdb {
		public string $prefix = 'wp_';
		/** @var list<string> */ public array $queries = [];
		/** @var list<array{table:string,data:array}> */ public array $inserts = [];
		/** @var list<array{query:string,args:list<mixed>}> */ public array $prepare_calls = [];
		/** @var list<array{table:string,data:array,where:array}> */ public array $updates = [];
		public array $credential_columns = [ 'id', 'user_id', 'token_hash', 'device_id', 'user_agent', 'ip_address', 'created_at', 'expires_at', 'revoked_at', 'credential_mode', 'installation_origin', 'otp_code_length' ];
		public array $otp_columns = [ 'id', 'phone', 'code_hash', 'tracking_code', 'attempts', 'ip_address', 'user_agent', 'created_at', 'expires_at', 'consumed_at', 'delivery_mode', 'code_length' ];
		public string $refresh_engine = 'InnoDB';
		public ?array $refresh_row = null;
		public ?array $otp_row = null;
		public int|false $insert_result = 1;
		/** @var list<int|false> */ public array $insert_results = [];
		public int|false $start_result = 1;
		public int|false $commit_result = 1;
		public int|false $cas_result = 1;
		public int $ambient_transaction = 0;
		public ?string $throw_on_query = null;
		public int $rollback_count = 0;
		public string $last_error = '';
		public function prepare( string $query, mixed ...$args ): string { $this->prepare_calls[] = [ 'query' => $query, 'args' => $args ]; return $query; }
		public function get_col( string $query, mixed $column = 0 ): array { return str_contains( $query, 'refresh_tokens' ) ? $this->credential_columns : $this->otp_columns; }
		public function get_var( string $query ): mixed { return str_contains( $query, '@@session.in_transaction' ) ? $this->ambient_transaction : null; }
		public function get_row( string $query, mixed $output = null ): ?array { if ( str_contains( $query, 'SHOW TABLE STATUS' ) ) return [ 'Engine' => $this->refresh_engine ]; return str_contains( $query, 'otp_codes' ) ? $this->otp_row : $this->refresh_row; }
		public function insert( string $table, array $data, ?array $format = null ): int|false { $this->inserts[] = compact( 'table', 'data' ); return $this->insert_results ? array_shift( $this->insert_results ) : $this->insert_result; }
		public function query( string $query ): int|false {
			$this->queries[] = $query;
			if ( $this->throw_on_query === $query ) throw new \RuntimeException( 'synthetic database exception' );
			if ( 'START TRANSACTION' === $query ) return $this->start_result;
			if ( 'COMMIT' === $query ) return $this->commit_result;
			if ( 'ROLLBACK' === $query ) { $this->rollback_count++; return 1; }
			if ( str_contains( $query, 'UPDATE' ) && str_contains( $query, 'revoked_at' ) ) return $this->cas_result;
			if ( str_contains( $query, 'consumed_at' ) ) return 1;
			return 1;
		}
		public function update( string $table, array $data, array $where, ?array $format = null, ?array $where_format = null ): int|false { $this->updates[] = compact( 'table', 'data', 'where' ); return $this->cas_result; }
		public function delete( string $table, array $where, ?array $format = null ): int|false { return 1; }
		public function get_charset_collate(): string { return ''; }
	}

	function reset_fixture(): TestWpdb {
		global $wpdb, $test_options, $registered_routes, $db_delta_calls, $test_users, $user_insert_calls, $_SERVER;
		$test_options = [
			'nahan_jwt_secret' => str_repeat( 'a', 48 ),
			'nahan_jwt_access_ttl' => 900,
			'nahan_jwt_refresh_ttl' => 3600,
			'siteurl' => 'http://localhost:8080/karban/',
			'nahan_otp_max_attempts' => 5,
		];
		$registered_routes = []; $db_delta_calls = []; $user_insert_calls = 0;
		$test_users = [ new WP_User( 41, 'Existing user', [ 'client' ] ) ];
		$_SERVER = [ 'REMOTE_ADDR' => '127.0.0.1' ];
		$wpdb = new TestWpdb();
		return $wpdb;
	}
	function assert_true( bool $condition, string $message ): void { if ( ! $condition ) throw new \RuntimeException( $message ); }
	function assert_same( mixed $expected, mixed $actual, string $message ): void { if ( $expected !== $actual ) throw new \RuntimeException( $message . "\nExpected: " . var_export( $expected, true ) . "\nActual: " . var_export( $actual, true ) ); }
	function assert_error( mixed $actual, string $code, int $status, string $message ): void { assert_true( $actual instanceof WP_Error, $message . ' must be a WP_Error.' ); assert_same( $code, $actual->get_error_code(), $message . ' code' ); assert_same( $status, $actual->get_error_data()['status'] ?? null, $message . ' status' ); }
	function jwt_payload( string $jwt ): array { $part = explode( '.', $jwt )[1] ?? ''; $part .= str_repeat( '=', ( 4 - strlen( $part ) % 4 ) % 4 ); return json_decode( base64_decode( strtr( $part, '-_', '+/' ) ), true, 512, JSON_THROW_ON_ERROR ); }
}

namespace Nahan\Core {
	final class Plugin {
		public static object $test_instance;
		public static function instance(): object { return self::$test_instance; }
	}
}

namespace Nahan\Core\Auth {
	require_once NAHAN_CORE_DIR . 'includes/class-helpers.php';
	require_once NAHAN_CORE_DIR . 'includes/class-rate-limiter.php';
	require_once NAHAN_CORE_DIR . 'includes/admin/class-settings.php';
	require_once NAHAN_CORE_DIR . 'includes/class-local-development-gate.php';
	require_once NAHAN_CORE_DIR . 'includes/auth/class-otp-schema.php';
	require_once NAHAN_CORE_DIR . 'includes/auth/class-credential-schema.php';
	require_once NAHAN_CORE_DIR . 'includes/auth/class-sms-service.php';
	require_once NAHAN_CORE_DIR . 'includes/auth/class-otp-manager.php';
	require_once NAHAN_CORE_DIR . 'includes/auth/class-jwt-auth.php';
	require_once NAHAN_CORE_DIR . 'rest-api/class-rest-helper.php';

	use Nahan\Core\Admin\Settings;
	use Nahan\Core\LocalDevelopmentGate;

	function local_gate( array $overrides = [] ): LocalDevelopmentGate {
		return new LocalDevelopmentGate( array_merge( [
			'local_development' => true, 'local_dev_otp' => true, 'environment_type' => 'local',
			'site_url' => 'http://localhost:8080/karban/', 'remote_addr' => '127.0.0.1',
		], $overrides ) );
	}
	function otp_row( array $overrides = [] ): array {
		return array_merge( [ 'id' => 7, 'phone' => '09121234567', 'code_hash' => hash( 'sha256', '145632' ), 'tracking_code' => 'trusted', 'attempts' => 0, 'expires_at' => '2099-01-01 00:00:00', 'consumed_at' => null, 'delivery_mode' => 'local_simulated', 'code_length' => 6 ], $overrides );
	}
	function jwt( LocalDevelopmentGate $gate ): JwtAuth { return new JwtAuth( new Settings(), $gate, new CredentialSchema() ); }

	$tests = [];
	$tests['legacy SMS credentials stay compatible without provenance columns'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->credential_columns = [ 'id' ];
		$pair = jwt( local_gate() )->issue_pair( 41, 'device', [ 'delivery_mode' => 'sms', 'code_length' => 5 ] );
		assert_true( ! \is_wp_error( $pair ), 'Normal legacy SMS issuance must not require the local credential migration.' );
		assert_same( 'access', jwt_payload( $pair['access_token'] )['type'], 'Normal token type.' );
		assert_true( ! isset( $wpdb->inserts[0]['data']['installation_origin'] ), 'Legacy SMS refresh insert must remain compatible with an old table.' );
	};
	$tests['trusted OTP context alone produces signed local provenance'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->otp_row = otp_row();
		$manager = new OtpManager( new SmsService( new Settings() ), local_gate() );
		$context = $manager->verify_with_context( 'trusted', '145632' );
		assert_true( ! \is_wp_error( $context ), 'Persisted local OTP must return trusted context.' );
		assert_same( [ 'phone' => '09121234567', 'delivery_mode' => 'local_simulated', 'code_length' => 6 ], $context, 'Context must contain only persisted OTP fields.' );
		$pair = jwt( local_gate() )->issue_pair( 41, 'device', $context );
		assert_true( ! \is_wp_error( $pair ), 'Trusted local context must issue a pair.' );
		$claims = jwt_payload( $pair['access_token'] );
		assert_same( 'local_simulated', $claims['credential_mode'] ?? null, 'Local access JWT must carry signed provenance.' );
		assert_same( 'http://localhost:8080/karban', $claims['installation_origin'] ?? null, 'Local access JWT must carry canonical origin.' );
		$refresh = $wpdb->inserts[0]['data'];
		assert_same( 'local_simulated', $refresh['credential_mode'] ?? null, 'Refresh row must store local provenance.' );
		assert_same( 'http://localhost:8080/karban', $refresh['installation_origin'] ?? null, 'Refresh row must store canonical origin.' );
		assert_same( 6, $refresh['otp_code_length'] ?? null, 'Refresh row must retain trusted OTP length.' );
	};
	$tests['local verification can reject unavailable credentials before atomic consume'] = static function (): void {
		$wpdb = \reset_fixture(); $wpdb->otp_row = otp_row(); $wpdb->credential_columns = [ 'id' ];
		$manager = new OtpManager( new SmsService( new Settings() ), local_gate() );
		$result = $manager->verify_with_context( 'trusted', '145632', static function ( array $context ) { return jwt( local_gate() )->validate_context_for_issuance( $context ); } );
		assert_error( $result, 'local_credentials_unavailable', 503, 'Missing credential schema must stop public local verification before consume.' );
		assert_true( ! array_filter( $wpdb->queries, static fn( string $q ): bool => str_contains( $q, 'consumed_at =' ) ), 'Unavailable local credentials must not consume a valid challenge.' );
	};
	$tests['local gate and canonical installation bind decode and refresh but not secret logout'] = static function (): void {
		$wpdb = \reset_fixture();
		$pair = jwt( local_gate() )->issue_pair( 41, 'device', [ 'phone' => '09121234567', 'delivery_mode' => 'local_simulated', 'code_length' => 6 ] );
		$claims = jwt( local_gate( [ 'local_dev_otp' => false ] ) )->decode( $pair['access_token'] );
		assert_error( $claims, 'jwt_local_unavailable', 401, 'Local access must fail after gate off.' );
		$claims = jwt( local_gate( [ 'site_url' => 'http://localhost:8081/karban' ] ) )->decode( $pair['access_token'] );
		assert_error( $claims, 'jwt_local_unavailable', 401, 'Local access must fail after installation-origin change.' );
		$wpdb->refresh_row = [ 'id' => 9, 'user_id' => 41, 'device_id' => 'device', 'expires_at' => '2099-01-01 00:00:00', 'revoked_at' => null, 'credential_mode' => 'local_simulated', 'installation_origin' => 'http://localhost:8080/karban', 'otp_code_length' => 6 ];
		assert_error( jwt( local_gate( [ 'environment_type' => 'production' ] ) )->refresh( $pair['refresh_token'] ), 'invalid_refresh', 401, 'Copied/deactivated local refresh must fail.' );
		assert_true( jwt( local_gate( [ 'environment_type' => 'production' ] ) )->logout_refresh( $pair['refresh_token'] ), 'Raw refresh secret must still revoke its matching old row after access becomes unusable.' );
	};
	$tests['missing or weak signing secret causes no credential write'] = static function (): void {
		foreach ( [ '', 'too-short' ] as $secret ) {
			$wpdb = \reset_fixture(); global $test_options; $test_options['nahan_jwt_secret'] = $secret;
			$result = jwt( local_gate() )->issue_pair( 41, 'device', [ 'delivery_mode' => 'local_simulated', 'code_length' => 6 ] );
			assert_error( $result, 'credentials_unavailable', 503, 'Invalid signer must fail safely.' );
			assert_same( [], $wpdb->inserts, 'Invalid signer must not create a refresh row.' );
		}
	};
	$tests['refresh insertion failure cannot mint a pair'] = static function (): void {
		$wpdb = \reset_fixture(); $wpdb->insert_result = 0;
		$result = jwt( local_gate() )->issue_pair( 41 );
		assert_error( $result, 'credentials_unavailable', 503, 'Failed initial refresh insert must not return tokens.' );
	};
	$tests['refresh rotates through checked transaction CAS and rolls back every loser'] = static function (): void {
		foreach ( [ 'cas' => [ 'cas_result' => 0 ], 'insert' => [ 'insert_results' => [ 0 ] ], 'commit' => [ 'commit_result' => false ], 'engine' => [ 'refresh_engine' => 'MyISAM' ] ] as $case => $overrides ) {
			$wpdb = \reset_fixture(); foreach ( $overrides as $property => $value ) { $wpdb->{$property} = $value; }
			$wpdb->refresh_row = [ 'id' => 9, 'user_id' => 41, 'device_id' => 'device', 'expires_at' => '2099-01-01 00:00:00', 'revoked_at' => null, 'credential_mode' => 'sms', 'installation_origin' => null, 'otp_code_length' => 5 ];
			$result = jwt( local_gate() )->refresh( 'raw-secret' );
			assert_true( \is_wp_error( $result ), "{$case} must not return a replacement pair." );
			assert_true( in_array( 'ROLLBACK', $wpdb->queries, true ) || 'engine' === $case, "{$case} must rollback after transaction starts." );
		}
	};
	$tests['zero-result transaction commands are accepted only without an ambient transaction'] = static function (): void {
		$wpdb = \reset_fixture(); $wpdb->start_result = 0; $wpdb->commit_result = 0;
		$wpdb->refresh_row = [ 'id' => 9, 'user_id' => 41, 'device_id' => 'device', 'expires_at' => '2099-01-01 00:00:00', 'revoked_at' => null, 'credential_mode' => 'sms', 'installation_origin' => null, 'otp_code_length' => 5 ];
		$result = jwt( local_gate() )->refresh( 'raw-secret' );
		assert_true( ! \is_wp_error( $result ), 'WordPress may return zero rows for successful transaction-control statements.' );
		$wpdb = \reset_fixture(); $wpdb->ambient_transaction = 1;
		$wpdb->refresh_row = [ 'id' => 9, 'user_id' => 41, 'device_id' => 'device', 'expires_at' => '2099-01-01 00:00:00', 'revoked_at' => null, 'credential_mode' => 'sms', 'installation_origin' => null, 'otp_code_length' => 5 ];
		assert_error( jwt( local_gate() )->refresh( 'raw-secret' ), 'refresh_unavailable', 503, 'An unowned ambient transaction must not be implicitly committed.' );
		assert_true( ! in_array( 'START TRANSACTION', $wpdb->queries, true ), 'Ambient transaction rejection must not issue START TRANSACTION.' );
	};
	$tests['successful refresh creates one replacement and query exceptions roll back safely'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->refresh_row = [ 'id' => 9, 'user_id' => 41, 'device_id' => 'device', 'expires_at' => '2099-01-01 00:00:00', 'revoked_at' => null, 'credential_mode' => 'sms', 'installation_origin' => null, 'otp_code_length' => 5 ];
		$pair = jwt( local_gate() )->refresh( 'raw-secret' );
		assert_true( ! \is_wp_error( $pair ) && 1 === count( $wpdb->inserts ), 'One winning rotation must create exactly one replacement pair/row.' );
		assert_true( in_array( 'COMMIT', $wpdb->queries, true ) && 0 === $wpdb->rollback_count, 'Winning rotation must commit without rollback.' );
		$wpdb = \reset_fixture(); $wpdb->throw_on_query = 'COMMIT';
		$wpdb->refresh_row = [ 'id' => 9, 'user_id' => 41, 'device_id' => 'device', 'expires_at' => '2099-01-01 00:00:00', 'revoked_at' => null, 'credential_mode' => 'sms', 'installation_origin' => null, 'otp_code_length' => 5 ];
		$result = jwt( local_gate() )->refresh( 'raw-secret' );
		assert_error( $result, 'refresh_unavailable', 503, 'A database exception must not escape or return a pair.' );
		assert_same( 1, $wpdb->rollback_count, 'A database exception must roll back the refresh scope.' );
	};
	$tests['refresh rejects revoked and expired rows before any replacement'] = static function (): void {
		foreach ( [ [ 'revoked_at' => '2026-10-18 00:00:00', 'expires_at' => '2099-01-01 00:00:00' ], [ 'revoked_at' => null, 'expires_at' => '2020-01-01 00:00:00' ] ] as $state ) {
			$wpdb = \reset_fixture(); $wpdb->refresh_row = array_merge( [ 'id' => 9, 'user_id' => 41, 'device_id' => 'device', 'credential_mode' => 'sms', 'installation_origin' => null, 'otp_code_length' => 5 ], $state );
			assert_true( \is_wp_error( jwt( local_gate() )->refresh( 'raw-secret' ) ), 'Revoked/expired refresh must fail.' );
			assert_same( [], $wpdb->inserts, 'Revoked/expired refresh must create no replacement.' );
		}
	};
	$tests['credential schema readiness is versioned, verified, and refuses nontransactional storage'] = static function (): void {
		$wpdb = \reset_fixture(); $schema = new CredentialSchema();
		assert_true( $schema->is_ready(), 'Complete InnoDB credential provenance schema must be ready.' );
		$wpdb->refresh_engine = 'MyISAM'; assert_true( ! $schema->is_ready(), 'Nontransactional refresh storage must be unavailable.' );
		$wpdb->refresh_engine = 'InnoDB'; $wpdb->credential_columns = [ 'id', 'credential_mode' ]; assert_true( ! $schema->is_ready(), 'Missing provenance columns must be unavailable.' );
		assert_true( str_contains( file_get_contents( NAHAN_CORE_DIR . 'includes/class-activator.php' ), 'CredentialSchema::create_table_sql' ), 'Fresh activation must use the reviewed credential schema generator.' );
	};
	$tests['local status exposes exactly safe readiness booleans and source registers guarded endpoint'] = static function (): void {
		$wpdb = \reset_fixture();
		$status = jwt( local_gate() )->local_status();
		assert_same( [ 'otpReady' => true, 'credentialProvenanceReady' => true ], $status, 'Local readiness has exactly its two safe booleans.' );
		assert_error( jwt( local_gate( [ 'remote_addr' => '203.0.113.4' ] ) )->local_status(), 'local_status_unavailable', 404, 'Nonlocal status must not disclose readiness.' );
		$routes = file_get_contents( NAHAN_CORE_DIR . 'rest-api/auth-routes.php' );
		assert_true( str_contains( $routes, "'/auth/local-status'" ) && str_contains( $routes, "'GET'" ), 'Read-only local status route must exist.' );
		assert_true( str_contains( $routes, "'/auth/logout/refresh'" ), 'Refresh-secret logout route must exist.' );
	};
	$tests['refresh-secret logout only targets its hash and rejects scope inputs'] = static function (): void {
		$wpdb = \reset_fixture(); $wpdb->cas_result = 1;
		assert_true( jwt( local_gate() )->logout_refresh( 'raw-secret' ), 'A refresh secret must revoke its own hash.' );
		assert_true( 1 === count( $wpdb->updates ) && array_key_exists( 'token_hash', $wpdb->updates[0]['where'] ) && array_key_exists( 'revoked_at', $wpdb->updates[0]['where'] ), 'Logout must conditionally mutate only the supplied token hash.' );
		$routes = file_get_contents( NAHAN_CORE_DIR . 'rest-api/auth-routes.php' );
		$logout_start = strpos( $routes, "'/auth/logout/refresh'" );
		$logout_end = strpos( $routes, "register_rest_route( \$ns, '/auth/logout',", $logout_start );
		$logout = substr( $routes, $logout_start, $logout_end - $logout_start );
		assert_true( str_contains( $logout, "'refresh_token'" ), 'Narrow logout accepts the refresh secret.' );
		assert_true( ! str_contains( $logout, "'all_devices'" ) && ! str_contains( $logout, "'user_id'" ), 'Narrow logout must not offer account-wide scope inputs.' );
		$wpdb->cas_result = false;
		assert_error( jwt( local_gate() )->logout_refresh( 'raw-secret' ), 'logout_unavailable', 503, 'DB error must not claim durable revocation.' );
	};

	$tests['callable schema upgrade records its version only after stubbed verification'] = static function (): void {
		$wpdb = \reset_fixture(); global $test_options, $db_delta_calls;
		assert_true( ( new CredentialSchema() )->upgrade(), 'Explicit verified schema upgrade must succeed in the source stub.' );
		assert_same( CredentialSchema::VERSION, $test_options[ CredentialSchema::OPTION ] ?? null, 'Only verified upgrade records its version.' );
		assert_same( 1, count( $db_delta_calls ), 'Migration is callable but only executed by an explicit test/admin caller.' );
	};
	$tests['registered local status and refresh logout callbacks expose only their narrow contracts'] = static function (): void {
		$wpdb = \reset_fixture();
		\Nahan\Core\Plugin::$test_instance = (object) [ 'jwt' => jwt( local_gate() ) ];
		require_once NAHAN_CORE_DIR . 'rest-api/auth-routes.php';
		global $registered_routes;
		$status_route = $registered_routes['/auth/local-status'] ?? null;
		assert_true( is_array( $status_route ) && true === $status_route['permission_callback'](), 'Local gate authorizes the readiness callback.' );
		$status = $status_route['callback']();
		assert_same( [ 'success' => true, 'data' => [ 'otpReady' => true, 'credentialProvenanceReady' => true ] ], $status->data, 'Status callback must return exactly safe readiness booleans.' );
		$logout_route = $registered_routes['/auth/logout/refresh'] ?? null;
		$logout = $logout_route['callback']( new \TestRequest( [ 'refresh_token' => 'raw-secret' ] ) );
		assert_same( [ 'success' => true, 'data' => [ 'logged_out' => true ] ], $logout->data, 'Refresh-secret logout returns only a safe acknowledgement.' );
		$rejected = $logout_route['callback']( new \TestRequest( [ 'refresh_token' => 'raw-secret', 'all_devices' => true ] ) );
		assert_same( 422, $rejected->status, 'Refresh-secret logout rejects scope-extending request fields.' );
		\Nahan\Core\Plugin::$test_instance = (object) [ 'jwt' => jwt( local_gate( [ 'remote_addr' => '203.0.113.4' ] ) ) ];
		$denied = $status_route['permission_callback']();
		assert_error( $denied, 'local_status_unavailable', 404, 'Remote callers cannot query local readiness.' );
	};

	$tests['actual public OTP verify callback binds trusted local context before consume and handles issuance errors'] = static function (): void {
		global $registered_routes;
		$verify_route = $registered_routes['/auth/otp/verify'] ?? null;
		assert_true( is_array( $verify_route ), 'The registered public OTP verify callback must be available.' );

		$wpdb = \reset_fixture(); $wpdb->credential_columns = [ 'id' ]; $wpdb->otp_row = otp_row();
		\Nahan\Core\Plugin::$test_instance = (object) [ 'otp' => new OtpManager( new SmsService( new Settings() ), local_gate() ), 'jwt' => jwt( local_gate() ) ];
		$blocked = $verify_route['callback']( new \TestRequest( [ 'tracking_code' => 'trusted', 'code' => '145632', 'role' => 'specialist', 'device_id' => 'from-body' ] ) );
		assert_same( 503, $blocked->status, 'Local credential readiness failure must be a public failure response.' );
		assert_same( 'local_credentials_unavailable', $blocked->data['error']['code'] ?? null, 'The pre-consume validator must be run on the actual callback path.' );
		assert_true( ! array_filter( $wpdb->queries, static fn( string $query ): bool => str_contains( $query, 'consumed_at =' ) ), 'Readiness failure must not consume the local OTP.' );
		global $user_insert_calls; assert_same( 0, $user_insert_calls, 'Readiness failure must not create an account.' );

		$wpdb = \reset_fixture(); $wpdb->otp_row = otp_row();
		\Nahan\Core\Plugin::$test_instance = (object) [ 'otp' => new OtpManager( new SmsService( new Settings() ), local_gate() ), 'jwt' => jwt( local_gate() ) ];
		$success = $verify_route['callback']( new \TestRequest( [ 'tracking_code' => 'trusted', 'code' => '145632', 'role' => 'specialist', 'device_id' => 'from-body', 'delivery_mode' => 'sms' ] ) );
		assert_same( true, $success->data['success'] ?? null, 'Actual local OTP verification must issue a successful response.' );
		assert_same( false, $success->data['data']['is_new'] ?? null, 'Existing users must retain their account rather than re-register.' );
		assert_same( [ 'client' ], $success->data['data']['user']['roles'] ?? null, 'Existing role must stay unchanged despite a requested registration role.' );
		$pair = $success->data['data']['tokens'] ?? null;
		assert_true( is_array( $pair ), 'Actual callback must return a token pair, not a helper/error object.' );
		$claims = jwt_payload( $pair['access_token'] );
		assert_same( 'local_simulated', $claims['credential_mode'] ?? null, 'Request payload provenance must not override persisted local provenance.' );
		assert_same( 'http://localhost:8080/karban', $claims['installation_origin'] ?? null, 'Actual callback must carry canonical installation provenance.' );
		assert_error( jwt( local_gate( [ 'local_dev_otp' => false ] ) )->decode( $pair['access_token'] ), 'jwt_local_unavailable', 401, 'Gate-off must invalidate callback-issued local access credentials.' );

		$wpdb = \reset_fixture(); $wpdb->otp_row = otp_row( [ 'delivery_mode' => 'sms', 'code_length' => 5, 'code_hash' => hash( 'sha256', '12345' ) ] ); $wpdb->insert_result = 0;
		\Nahan\Core\Plugin::$test_instance = (object) [ 'otp' => new OtpManager( new SmsService( new Settings() ), local_gate() ), 'jwt' => jwt( local_gate() ) ];
		$issue_failed = $verify_route['callback']( new \TestRequest( [ 'tracking_code' => 'trusted', 'code' => '12345', 'device_id' => 'from-body' ] ) );
		assert_same( 503, $issue_failed->status, 'An issue_pair WP_Error must become a failing REST envelope.' );
		assert_same( false, $issue_failed->data['success'] ?? null, 'Issue failure must not be encoded as success.' );
		assert_true( ! isset( $issue_failed->data['data']['tokens'] ), 'Issue failure response must not expose a tokens field.' );
	};

	$failed = 0;
	foreach ( $tests as $name => $test ) {
		try { $test(); fwrite( STDOUT, "PASS {$name}\n" ); }
		catch ( \Throwable $error ) { $failed++; fwrite( STDERR, "FAIL {$name}: {$error->getMessage()}\n" ); }
	}
	exit( 0 === $failed ? 0 : 1 );
}
