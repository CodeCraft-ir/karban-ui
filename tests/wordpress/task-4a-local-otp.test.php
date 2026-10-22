<?php
/**
 * Standalone Task 4A tests. These deliberately do not bootstrap WordPress or touch a database.
 * Run: php tests/wordpress/task-4a-local-otp.test.php
 */
declare( strict_types=1 );

namespace {
	define( 'ABSPATH', __DIR__ . '/' );
	define( 'ARRAY_A', 'ARRAY_A' );
	define( 'NAHAN_CORE_DIR', '/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/' );

	final class WP_Error {
		public function __construct( public string $code = '', public string $message = '', public array $data = [] ) {}
		public function get_error_code(): string { return $this->code; }
		public function get_error_data(): array { return $this->data; }
	}
	function is_wp_error( mixed $value ): bool { return $value instanceof WP_Error; }
	function wp_generate_uuid4(): string { static $i = 0; return sprintf( '00000000-0000-4000-8000-%012d', ++$i ); }
	function current_time( string $type, bool $gmt = false ): string { return '2026-10-18 00:00:00'; }
	function sanitize_text_field( string $value ): string { return $value; }
	function wp_unslash( string $value ): string { return $value; }
	function get_option( string $key, mixed $default = false ): mixed { global $test_options; return $test_options[ $key ] ?? $default; }
	function update_option( string $key, mixed $value ): bool { global $test_options; $test_options[ $key ] = $value; return true; }
	function delete_option( string $key ): bool { global $test_options; unset( $test_options[ $key ] ); return true; }
	function wp_parse_url( string $url ): array|false { return parse_url( $url ); }
	function wp_json_encode( mixed $value ): string { return json_encode( $value, JSON_THROW_ON_ERROR ); }
	function dbDelta( string $sql ): array { global $db_delta_calls; $db_delta_calls[] = $sql; return []; }

	final class TestWpdb {
		public string $prefix = 'wp_';
		/** @var list<array{table:string,data:array}> */ public array $inserts = [];
		/** @var list<string> */ public array $queries = [];
		/** @var list<array{query:string,args:list<mixed>}> */ public array $prepare_calls = [];
		/** @var list<array{table:string,where:array}> */ public array $deletes = [];
		/** @var list<string> */ public array $column_names = [ 'id', 'phone', 'code_hash', 'tracking_code', 'attempts', 'ip_address', 'user_agent', 'created_at', 'expires_at', 'consumed_at', 'delivery_mode', 'code_length' ];
		public ?array $row = null;
		public int|false $insert_result = 1;
		public int $consume_result = 1;
		public int $increment_result = 1;
		public string $last_error = 'synthetic-db-detail-must-not-leak';
		public function prepare( string $query, mixed ...$args ): string {
			$this->prepare_calls[] = [ 'query' => $query, 'args' => $args ];
			return $query;
		}
		public function get_row( string $query, mixed $output = null ): ?array { return $this->row; }
		public function get_col( string $query, mixed $column = 0 ): array { return $this->column_names; }
		public function get_charset_collate(): string { return ''; }
		public function insert( string $table, array $data, ?array $format = null ): int|false {
			$this->inserts[] = compact( 'table', 'data' );
			return $this->insert_result;
		}
		public function update( string $table, array $data, array $where, ?array $format = null, ?array $where_format = null ): int { throw new \RuntimeException( 'OTP verification must use conditional query(), not update().' ); }
		public function delete( string $table, array $where, ?array $format = null ): int { $this->deletes[] = compact( 'table', 'where' ); return 1; }
		public function query( string $query ): int {
			$this->queries[] = $query;
			if ( str_contains( $query, 'attempts = attempts + 1' ) ) return $this->increment_result;
			if ( str_contains( $query, 'consumed_at = ' ) ) return $this->consume_result;
			return 1;
		}
	}

	function reset_fixture(): TestWpdb {
		global $wpdb, $test_options, $db_delta_calls, $_SERVER;
		$test_options = [
			'nahan_otp_ttl' => 120,
			'nahan_otp_throttle_window' => 60,
			'nahan_otp_max_attempts' => 5,
			'nahan_sms_kavenegar_pattern' => 'fixture-pattern',
			'nahan_sms_kavenegar_apikey' => 'fixture-key',
		];
		$db_delta_calls = [];
		$_SERVER = [];
		$wpdb = new TestWpdb();
		return $wpdb;
	}

	function assert_true( bool $condition, string $message ): void { if ( ! $condition ) throw new \RuntimeException( $message ); }
	function assert_same( mixed $expected, mixed $actual, string $message ): void { if ( $expected !== $actual ) throw new \RuntimeException( $message . '\nExpected: ' . var_export( $expected, true ) . '\nActual: ' . var_export( $actual, true ) ); }
	function assert_error( mixed $actual, string $code, int $status, string $message ): void {
		assert_true( $actual instanceof WP_Error, $message . ' must return WP_Error' );
		assert_same( $code, $actual->get_error_code(), $message . ' code' );
		assert_same( $status, $actual->get_error_data()['status'] ?? null, $message . ' status' );
	}
}

namespace Nahan\Core\Auth {
	require_once NAHAN_CORE_DIR . 'includes/class-helpers.php';
	require_once NAHAN_CORE_DIR . 'includes/class-rate-limiter.php';
	require_once NAHAN_CORE_DIR . 'includes/admin/class-settings.php';
	require_once NAHAN_CORE_DIR . 'includes/auth/class-sms-service.php';
	require_once NAHAN_CORE_DIR . 'includes/class-local-development-gate.php';
	require_once NAHAN_CORE_DIR . 'includes/auth/class-otp-schema.php';
	require_once NAHAN_CORE_DIR . 'includes/auth/class-otp-manager.php';

	use Nahan\Core\LocalDevelopmentGate;
	use Nahan\Core\Admin\Settings;

	function gate( array $overrides = [] ): LocalDevelopmentGate {
		return new LocalDevelopmentGate( array_merge( [
			'local_development' => true,
			'local_dev_otp' => true,
			'environment_type' => 'local',
			'site_url' => 'http://localhost',
			'remote_addr' => '127.0.0.1',
		], $overrides ) );
	}
	function manager( LocalDevelopmentGate $gate, ?OtpSchema $schema = null, ?callable $send_otp = null ): OtpManager {
		return new OtpManager( new SmsService( new Settings() ), $gate, $schema ?? new OtpSchema(), $send_otp );
	}
	function row( array $overrides = [] ): array {
		return array_merge( [
			'id' => 13,
			'phone' => '09121234567',
			'code_hash' => hash( 'sha256', '145632' ),
			'tracking_code' => 'tracking',
			'attempts' => 0,
			'expires_at' => '2099-01-01 00:00:00',
			'consumed_at' => null,
			'delivery_mode' => 'local_simulated',
			'code_length' => 6,
		], $overrides );
	}
	function last_prepare(): array {
		global $wpdb;
		$prepared = end( $wpdb->prepare_calls );
		assert_true( is_array( $prepared ), 'Expected a prepared database mutation.' );
		return $prepared;
	}

	$tests = [];
	$tests['gate is default-off and requires every server-owned predicate'] = static function (): void {
		\reset_fixture();
		assert_true( ! ( new LocalDevelopmentGate( [ 'environment_type' => 'local', 'site_url' => 'http://localhost', 'remote_addr' => '127.0.0.1' ] ) )->is_otp_simulation_enabled(), 'Missing constants must be default-off.' );
		foreach ( [
			[ 'local_development' => false ], [ 'local_dev_otp' => false ], [ 'environment_type' => 'production' ],
			[ 'site_url' => 'https://example.test' ], [ 'site_url' => 'ftp://localhost' ], [ 'site_url' => 'http://localhost/?x=1' ],
			[ 'site_url' => 'http://user:pass@localhost' ], [ 'remote_addr' => '192.0.2.9' ],
		] as $override ) {
			assert_true( ! gate( $override )->is_otp_simulation_enabled(), 'A false/malformed predicate must fail closed.' );
		}
		assert_true( gate( [ 'remote_addr' => '::1' ] )->is_otp_simulation_enabled(), 'IPv6 loopback must be accepted.' );
		assert_true( ! gate( [ 'remote_addr' => '198.51.100.9', 'http_host' => 'localhost', 'http_x_forwarded_for' => '127.0.0.1' ] )->is_otp_simulation_enabled(), 'Host and forwarded headers must never enable local OTP.' );
	};
	$tests['local request persists fixed provenance and invokes no transport'] = static function (): void {
		$wpdb = \reset_fixture();
		$transport_calls = [];
		$result = manager( gate(), null, static function ( string $phone, string $code ) use ( &$transport_calls ): bool {
			$transport_calls[] = [ $phone, $code ];
			return true;
		} )->request( '09121234567', '203.0.113.4' );
		assert_true( ! \is_wp_error( $result ), 'Local challenge must issue when gate and schema pass.' );
		assert_same( [], $transport_calls, 'Local request must skip all SMS/log transports.' );
		assert_same( 'local_simulated', $result['delivery_mode'], 'Challenge must expose safe local mode.' );
		assert_same( 6, $result['code_length'], 'Challenge must expose six digit length.' );
		$record = $wpdb->inserts[3]['data'] ?? null;
		assert_true( is_array( $record ), 'OTP insert must follow the three rate-limit records.' );
		assert_same( hash( 'sha256', '145632' ), $record['code_hash'], 'Fixed local code must use normal hash persistence.' );
		assert_same( 'local_simulated', $record['delivery_mode'], 'Record must persist local provenance.' );
		assert_same( 6, $record['code_length'], 'Record must persist six digit provenance.' );
	};
	$tests['production request persists random five digit SMS provenance and invokes transport once'] = static function (): void {
		$wpdb = \reset_fixture();
		global $test_options;
		$test_options['nahan_sms_driver'] = 'kavenegar'; // Configured fixture; transport is still the injected observer, never HTTP.
		$transport_calls = [];
		$result = manager( gate( [ 'environment_type' => 'production', 'site_url' => 'https://example.test' ] ), null, static function ( string $phone, string $code ) use ( &$transport_calls ): bool {
			$transport_calls[] = [ $phone, $code ];
			return true;
		} )->request( '09121234567', '203.0.113.4' );
		assert_true( ! \is_wp_error( $result ), 'Production request must issue before the transport observer succeeds.' );
		assert_same( 1, count( $transport_calls ), 'Production request must invoke exactly one transport.' );
		assert_same( '09121234567', $transport_calls[0][0], 'Production transport phone.' );
		assert_true( 1 === preg_match( '/^\d{5}$/', $transport_calls[0][1] ), 'Production request must generate exactly five random digits.' );
		assert_true( '145632' !== $transport_calls[0][1], 'Production request must not use the local fixed code.' );
		$record = $wpdb->inserts[3]['data'] ?? null;
		assert_true( is_array( $record ), 'Production request must persist an OTP row.' );
		assert_same( hash( 'sha256', $transport_calls[0][1] ), $record['code_hash'], 'Production row must hash the transported code.' );
		assert_same( 'sms', $record['delivery_mode'], 'Production row must persist SMS provenance.' );
		assert_same( 5, $record['code_length'], 'Production row must persist five digit provenance.' );
	};
	$tests['failed OTP insert returns a safe error before any local or production transport'] = static function (): void {
		foreach ( [ false, 0 ] as $insert_result ) {
			foreach ( [ 'local' => gate(), 'production' => gate( [ 'environment_type' => 'production', 'site_url' => 'https://example.test' ] ) ] as $mode => $mode_gate ) {
				$wpdb = \reset_fixture();
				$wpdb->insert_result = $insert_result;
				$transport_calls = [];
				$result = manager( $mode_gate, null, static function ( string $phone, string $code ) use ( &$transport_calls ): bool {
					$transport_calls[] = [ $phone, $code ];
					return true;
				} )->request( '09121234567', '203.0.113.4' );
				assert_error( $result, 'otp_storage_unavailable', 503, "{$mode} insert failure" );
				assert_same( [], $transport_calls, "{$mode} insert failure must not invoke transport" );
				assert_true( ! str_contains( $result->message, $wpdb->last_error ), "{$mode} insert failure must not expose database details" );
			}
		}
	};
	$tests['missing schema blocks only local issue'] = static function (): void {
		\reset_fixture();
		global $wpdb;
		$wpdb->column_names = [ 'id' ];
		assert_error( manager( gate() )->request( '09121234567', '203.0.113.4' ), 'otp_local_configuration_unavailable', 503, 'Local missing schema' );
	};
	$tests['stored provenance rejects disabled local challenge and normalizes Persian and Arabic digits'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->row = row();
		assert_error( manager( gate( [ 'local_dev_otp' => false ] ) )->verify( 'tracking', '145632' ), 'otp_local_unavailable', 403, 'Disabled local challenge' );
		$wpdb->row = row();
		assert_error( manager( gate() )->verify( 'tracking', '14563' ), 'otp_invalid', 422, 'Wrong local digit length' );
		$wpdb->row = row();
		assert_same( '09121234567', manager( gate() )->verify( 'tracking', '۱۴۵۶۳۲' ), 'Persian local digits' );
		$wpdb->row = row();
		assert_same( '09121234567', manager( gate() )->verify( 'tracking', '١٤٥٦٣٢' ), 'Arabic local digits' );
	};
	$tests['verification preserves expiry attempts and conditional atomic boundaries'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->row = row( [ 'consumed_at' => '2026-10-18 00:00:00' ] );
		assert_error( manager( gate() )->verify( 'tracking', '145632' ), 'otp_consumed', 410, 'Consumed row' );
		$wpdb->row = row( [ 'expires_at' => '2020-01-01 00:00:00' ] );
		assert_error( manager( gate() )->verify( 'tracking', '145632' ), 'otp_expired', 410, 'Expired row' );
		$wpdb->row = row( [ 'attempts' => 5 ] );
		assert_error( manager( gate() )->verify( 'tracking', '145632' ), 'otp_too_many_attempts', 429, 'Attempt limit' );
		$wpdb->row = row( [ 'code_hash' => hash( 'sha256', '000000' ), 'attempts' => 4 ] );
		assert_error( manager( gate() )->verify( 'tracking', '145632' ), 'otp_invalid', 422, 'Final failed attempt' );
		$increment = last_prepare();
		assert_true( str_contains( $increment['query'], 'attempts = attempts + 1' ) && str_contains( $increment['query'], 'attempts < %d' ), 'Failed attempt must bind a conditional atomic increment limit.' );
		assert_same( 5, end( $increment['args'] ), 'Failed attempt must bind the configured limit.' );

		foreach ( [ 'expiry' => 'A stale verifier loses after expiry.', 'attempt-limit' => 'A stale verifier loses after another verifier reaches the attempt limit.' ] as $interleaving => $message ) {
			$wpdb->row = row( [ 'attempts' => 4 ] );
			$wpdb->consume_result = 0;
			$result = manager( gate() )->verify( 'tracking', '145632' );
			assert_true( \is_wp_error( $result ), $message );
			$consume = last_prepare();
			assert_true( str_contains( $consume['query'], 'consumed_at IS NULL' ), "{$interleaving} consume must remain conditional." );
			assert_true( str_contains( $consume['query'], 'attempts < %d' ), "{$interleaving} consume must recheck attempts." );
			assert_true( str_contains( $consume['query'], 'expires_at >= UTC_TIMESTAMP()' ), "{$interleaving} consume must recheck expiry." );
			assert_same( 5, end( $consume['args'] ), "{$interleaving} consume must bind the configured limit." );
		}
	};
	$tests['schema upgrade only records version after dbDelta and column verification'] = static function (): void {
		$wpdb = \reset_fixture();
		assert_true( ( new OtpSchema() )->upgrade(), 'Schema upgrade should succeed when required columns verify.' );
		assert_same( OtpSchema::VERSION, \get_option( OtpSchema::OPTION ), 'Verified upgrade must record version.' );
		\reset_fixture(); global $wpdb;
		$wpdb->column_names = [ 'id', 'delivery_mode' ];
		assert_true( ! ( new OtpSchema() )->upgrade(), 'Incomplete schema must fail upgrade verification.' );
		assert_same( false, \get_option( OtpSchema::OPTION, false ), 'Failed upgrade must not record version.' );
	};

	$failed = 0;
	foreach ( $tests as $name => $test ) {
		try { $test(); fwrite( STDOUT, "PASS {$name}\n" ); }
		catch ( \Throwable $error ) { $failed++; fwrite( STDERR, "FAIL {$name}: {$error->getMessage()}\n" ); }
	}
	exit( $failed === 0 ? 0 : 1 );
}
