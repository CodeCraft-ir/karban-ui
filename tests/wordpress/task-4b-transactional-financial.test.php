<?php
/**
 * Standalone Task 4B contract tests. They do not bootstrap WordPress or touch a database.
 * Run: php tests/wordpress/task-4b-transactional-financial.test.php
 *
 * These stubs assert the SQL/state-machine boundary only. They cannot prove MySQL locking.
 */
declare( strict_types=1 );

namespace {
	define( 'ABSPATH', __DIR__ . '/' );
	define( 'ARRAY_A', 'ARRAY_A' );
	define( 'NAHAN_CORE_DIR', '/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/' );
	require_once NAHAN_CORE_DIR . 'includes/class-autoloader.php';
	\Nahan\Core\Autoloader::register();

	final class WP_Error {
		public function __construct( public string $code = '', public string $message = '', public array $data = [] ) {}
		public function get_error_code(): string { return $this->code; }
		public function get_error_data(): array { return $this->data; }
	}
	function is_wp_error( mixed $value ): bool { return $value instanceof WP_Error; }
	function wp_json_encode( mixed $value ): string { return json_encode( $value, JSON_THROW_ON_ERROR ); }
	function current_time( string $type, bool $gmt = false ): string { return '2026-10-18 00:00:00'; }
	function get_option( string $key, mixed $default = false ): mixed { global $test_options; return $test_options[ $key ] ?? $default; }
	function update_option( string $key, mixed $value ): bool {
		global $test_options;
		if ( array_key_exists( $key, $test_options ) && $test_options[ $key ] === $value ) return false;
		$test_options[ $key ] = $value;
		return true;
	}
	function wp_get_post_terms( int $post_id, string $taxonomy, array $args = [] ): array { return []; }
	function get_term_meta( int $term_id, string $key, bool $single = false ): mixed { return ''; }
	function do_action( string $hook, mixed ...$args ): void { global $actions; $actions[] = [ $hook, $args ]; }
	function get_post( int $post_id ): ?object { global $test_posts; return $test_posts[ $post_id ] ?? null; }

	final class TestWpdb implements \Nahan\Core\Payments\FinancialConnectionPort {
		public function prefix_value(): string { return $this->prefix; }
		public function users_table(): string { return $this->users; }
		public function failure(): ?WP_Error { return null; }
		public string $prefix = 'wp_';
		public string $users = 'wp_users';
		/** @var list<string> */ public array $queries = [];
		/** @var list<array{table:string,data:array}> */ public array $inserts = [];
		/** @var list<array{query:string,args:list<mixed>}> */ public array $prepare_calls = [];
		public int $insert_id = 0;
		public string $last_error = 'synthetic database detail';
		public int|false $commit_result = 1;
		public bool $user_exists = true;
		public string $engine = 'InnoDB';
		public int $balance = 0;
		public ?array $lead_row = null;
		public ?array $subscription_row = null;
		public int $allowance_used = 0;
		/** @var list<array{id:int}> */ public array $allowance_rows = [];
		public bool $allowance_read_failed = false;
		public int|false $update_result = 1;
		/** @var array<string,int|false> */ public array $insert_outcomes = [];
		/** @var list<string> */ public array $columns = [ 'id', 'user_id', 'amount', 'balance_after', 'type', 'reference_type', 'reference_id', 'description', 'meta', 'created_at', 'effect_key' ];
		/** @var array<string,list<array{Key_name:string,Non_unique:int,Seq_in_index:int,Column_name:string,Sub_part:null|int}>> */ public array $index_rows = [
			'wp_nahan_wallet_transactions' => [
				[ 'Key_name' => 'PRIMARY', 'Non_unique' => 0, 'Seq_in_index' => 1, 'Column_name' => 'id', 'Sub_part' => null ],
				[ 'Key_name' => 'effect_key', 'Non_unique' => 0, 'Seq_in_index' => 1, 'Column_name' => 'effect_key', 'Sub_part' => null ],
			],
			'wp_nahan_leads_unlocked' => [
				[ 'Key_name' => 'PRIMARY', 'Non_unique' => 0, 'Seq_in_index' => 1, 'Column_name' => 'id', 'Sub_part' => null ],
				[ 'Key_name' => 'unlock_unique', 'Non_unique' => 0, 'Seq_in_index' => 1, 'Column_name' => 'specialist_user_id', 'Sub_part' => null ],
				[ 'Key_name' => 'unlock_unique', 'Non_unique' => 0, 'Seq_in_index' => 2, 'Column_name' => 'target_type', 'Sub_part' => null ],
				[ 'Key_name' => 'unlock_unique', 'Non_unique' => 0, 'Seq_in_index' => 3, 'Column_name' => 'target_id', 'Sub_part' => null ],
			],
		];
		public bool $migration_has_conflict = false;

		public function suppress_errors( $suppress = true ): bool { return false; }
		public function prepare( $query, ...$args ): string {
			$this->prepare_calls[] = [ 'query' => $query, 'args' => $args ];
			return $query;
		}
		public function get_row( $query = null, $output = 'OBJECT', $y = 0 ): ?array {
			$this->last_error = '';
			$this->queries[] = $query;
			if ( str_contains( $query, 'SHOW TABLE STATUS' ) ) {
				$prepared = end( $this->prepare_calls );
				if ( in_array( $prepared['args'][0] ?? null, [ 'wp_nahan_local_payment_provenance', 'wp_nahan_local_payment_intents' ], true ) ) return null;
				return [ 'Engine' => $this->engine ];
			}
			if ( str_contains( $query, 'FROM wp_nahan_wallet_transactions' ) ) return [ 'balance_after' => $this->balance ];
			if ( str_contains( $query, 'FROM wp_nahan_leads_unlocked' ) ) return $this->lead_row;
			if ( str_contains( $query, 'FROM wp_nahan_subscriptions' ) ) return $this->subscription_row;
			if ( str_contains( $query, 'HAVING COUNT(*) > 1' ) ) return $this->migration_has_conflict ? [ 'effect_key' => 'duplicate' ] : null;
			return null;
		}
		public function get_var( $query = null, $x = 0, $y = 0 ): mixed {
			$this->last_error = '';
			$this->queries[] = $query;
			if ( 'SELECT @@SESSION.in_transaction' === $query ) return '0';
			if ( str_contains( $query, 'FROM wp_users' ) ) return $this->user_exists ? 7 : null;
			if ( str_contains( $query, 'COUNT(*)' ) ) return $this->allowance_used;
			return null;
		}
		public function get_col( $query = null, $column = 0 ): array {
			$this->last_error = '';
			$this->queries[] = $query;
			if ( str_contains( $query, 'SHOW COLUMNS' ) ) return $this->columns;
			if ( str_contains( $query, 'SHOW INDEX' ) ) foreach ( $this->index_rows as $table => $rows ) if ( str_contains( $query, $table ) ) return array_map( static fn( array $row ): string => $row['Key_name'], $rows );
			return [];
		}
		public function get_results( $query = null, $output = 'OBJECT' ): array|false|null {
			$this->last_error = '';
			$this->queries[] = $query;
			if ( str_contains( $query, 'SHOW INDEX' ) ) foreach ( $this->index_rows as $table => $rows ) if ( str_contains( $query, $table ) ) return $rows;
			if ( str_contains( $query, 'FROM wp_nahan_leads_unlocked' ) && str_contains( $query, 'FOR UPDATE' ) ) {
				return $this->allowance_read_failed ? null : $this->allowance_rows;
			}
			return [];
		}
		public function insert( $table, $data, $format = null ): int|false {
			$this->inserts[] = compact( 'table', 'data' );
			$result = $this->insert_outcomes[ $table ] ?? 1;
			if ( 1 === $result ) $this->insert_id++;
			return $result;
		}
		public function update( $table, $data, $where, $format = null, $where_format = null ): int|false {
			$this->queries[] = "UPDATE {$table}";
			return $this->update_result;
		}
		public function query( $query ): int|false {
			$this->last_error = '';
			$this->queries[] = $query;
			if ( 'COMMIT' === $query ) {
				if ( false === $this->commit_result ) $this->last_error = 'synthetic database detail';
				return $this->commit_result;
			}
			return 1;
		}
		public function get_charset_collate(): string { return ''; }
	}

	function fixture_uow(): \Nahan\Core\Payments\TransactionalUnitOfWork { return new \Nahan\Core\Payments\TransactionalUnitOfWork( null, $GLOBALS['wpdb'] ); }

	function reset_fixture(): TestWpdb {
		global $wpdb, $test_options, $test_posts, $actions;
		$test_options = [
			'nahan_lead_default_price' => 50000,
			'nahan_subscription_plans' => [ 'pro' => [ 'name' => 'Pro', 'price' => 500000, 'period' => 30, 'leads' => 2 ] ],
		];
		$test_posts = [
			100 => (object) [ 'ID' => 100, 'post_type' => 'nahan_project', 'post_status' => 'publish', 'post_author' => 88 ],
			101 => (object) [ 'ID' => 101, 'post_type' => 'nahan_specialist', 'post_status' => 'publish', 'post_author' => 89 ],
		];
		$actions = [];
		$wpdb = new TestWpdb();
		return $wpdb;
	}
	function assert_true( bool $condition, string $message ): void { if ( ! $condition ) throw new \RuntimeException( $message ); }
	function assert_same( mixed $expected, mixed $actual, string $message ): void {
		if ( $expected !== $actual ) throw new \RuntimeException( $message . '\nExpected: ' . var_export( $expected, true ) . '\nActual: ' . var_export( $actual, true ) );
	}
	function assert_error( mixed $actual, string $code, int $status, string $message ): void {
		assert_true( $actual instanceof WP_Error, $message . ' must return WP_Error' );
		assert_same( $code, $actual->get_error_code(), $message . ' code' );
		assert_same( $status, $actual->get_error_data()['status'] ?? null, $message . ' status' );
	}
	function query_index( TestWpdb $wpdb, string $needle ): int {
		foreach ( $wpdb->queries as $index => $query ) if ( str_contains( $query, $needle ) ) return $index;
		throw new \RuntimeException( "Missing SQL boundary: {$needle}" );
	}
}

namespace Nahan\Core\Payments {
	require_once NAHAN_CORE_DIR . 'includes/class-autoloader.php';
	\Nahan\Core\Autoloader::register();
	require_once NAHAN_CORE_DIR . 'includes/class-helpers.php';
	require_once NAHAN_CORE_DIR . 'includes/payments/class-transactional-unit-of-work.php';
	require_once NAHAN_CORE_DIR . 'includes/payments/class-wallet-manager.php';
	require_once NAHAN_CORE_DIR . 'includes/payments/class-subscription-manager.php';
	require_once NAHAN_CORE_DIR . 'includes/payments/class-lead-manager.php';
	require_once NAHAN_CORE_DIR . 'includes/payments/class-financial-schema.php';

	$tests = [];
	$tests['no-history wallet debit locks the existing account before a balance read and ledger insert'] = static function (): void {
		$wpdb = \reset_fixture();
		$uow = \fixture_uow();
		$wallet = new WalletManager( $uow );
		$result = $wallet->debit( 7, 100, WalletManager::TX_LEAD );
		assert_error( $result, 'insufficient_funds', 402, 'Empty wallet debit' );
		assert_true( query_index( $wpdb, 'START TRANSACTION' ) < query_index( $wpdb, 'FROM wp_users' ), 'Transaction must start before the no-history account lock.' );
		assert_true( query_index( $wpdb, 'FROM wp_users' ) < query_index( $wpdb, 'FROM wp_nahan_wallet_transactions' ), 'Existing user row must lock before any ledger balance read.' );
		assert_true( str_contains( implode( "\n", $wpdb->queries ), 'FOR UPDATE' ), 'Account lock must be a locking read, not a latest-ledger lock.' );
		assert_same( [], $wpdb->inserts, 'Insufficient balance must create no ledger row.' );
		assert_true( in_array( 'ROLLBACK', $wpdb->queries, true ), 'Insufficient balance must roll back the outer unit of work.' );
	};
	$tests['stale concurrent wallet loser rechecks the locked balance and makes no write'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->balance = 50;
		$result = ( new WalletManager( \fixture_uow() ) )->debit( 7, 100, WalletManager::TX_LEAD );
		assert_error( $result, 'insufficient_funds', 402, 'Loser after account serialization' );
		assert_same( [], $wpdb->inserts, 'A loser must not create a negative ledger row.' );
		assert_true( str_contains( implode( "\n", $wpdb->queries ), 'FOR UPDATE' ), 'The loser must read after acquiring a lock boundary.' );
	};
	$tests['already-unlocked lead returns its entitlement without a second debit'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->balance = 90000;
		$wpdb->lead_row = [ 'id' => 44, 'expires_at' => null ];
		$uow = \fixture_uow();
		$lead = new LeadManager( new WalletManager( $uow ), new SubscriptionManager( new WalletManager( $uow ), $uow ), $uow );
		$result = $lead->unlock( 7, LeadManager::TARGET_PROJECT, 100 );
		assert_true( ! \is_wp_error( $result ), 'Existing entitlement must be a safe successful idempotent result.' );
		assert_same( true, $result['already'] ?? null, 'Existing entitlement marker.' );
		assert_same( [], $wpdb->inserts, 'Duplicate lead request must not debit or insert.' );
		assert_true( query_index( $wpdb, 'FROM wp_users' ) < query_index( $wpdb, 'FROM wp_nahan_leads_unlocked' ), 'Account is locked before entitlement lookup.' );
	};
	$tests['lead wallet charge joins one outer transaction and rolls back on entitlement insert failure'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->balance = 90000;
		$wpdb->insert_outcomes['wp_nahan_leads_unlocked'] = false;
		$uow = \fixture_uow();
		$wallet = new WalletManager( $uow );
		$lead = new LeadManager( $wallet, new SubscriptionManager( $wallet, $uow ), $uow );
		$result = $lead->unlock( 7, LeadManager::TARGET_PROJECT, 100 );
		assert_error( $result, 'financial_storage_unavailable', 503, 'Lead insert failure' );
		assert_same( 1, count( array_filter( $wpdb->queries, static fn( string $query ): bool => 'START TRANSACTION' === $query ) ), 'Nested wallet debit must not start a nested transaction.' );
		assert_same( 0, count( array_filter( $wpdb->queries, static fn( string $query ): bool => 'COMMIT' === $query ) ), 'Failed entitlement must not commit its debit.' );
		assert_true( in_array( 'ROLLBACK', $wpdb->queries, true ), 'Failed entitlement must roll back the debit.' );
	};
	$tests['commit failure is uncertain and never proves rollback on another connection'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->balance = 100;
		$wpdb->commit_result = false;
		$result = ( new WalletManager( \fixture_uow() ) )->credit( 7, 10, WalletManager::TX_DEPOSIT );
		assert_error( $result, 'financial_commit_uncertain', 503, 'Commit failure' );
		assert_true( ! in_array( 'ROLLBACK', $wpdb->queries, true ), 'Commit failure cannot claim a rollback after an uncertain commit.' );
		assert_true( ! str_contains( $result->message, 'synthetic database detail' ), 'Database details must not escape a safe error, even after rollback clears last_error.' );
	};
	$tests['subscription allowance locks active subscription before reserving a zero-price lead'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->subscription_row = [ 'id' => 22, 'plan_slug' => 'pro', 'starts_at' => '2026-10-01 00:00:00', 'ends_at' => '2026-11-01 00:00:00' ];
		$wpdb->allowance_rows = [ [ 'id' => 1 ] ];
		$uow = \fixture_uow();
		$wallet = new WalletManager( $uow );
		$lead = new LeadManager( $wallet, new SubscriptionManager( $wallet, $uow ), $uow );
		$result = $lead->unlock( 7, LeadManager::TARGET_CONTACT, 101 );
		assert_true( ! \is_wp_error( $result ), 'Allowance unlock should succeed.' );
		assert_same( true, $result['used_subscription'] ?? null, 'Allowance result marker.' );
		assert_same( 0, $result['price'] ?? null, 'Allowance consumes no wallet balance.' );
		assert_same( 1, count( $wpdb->inserts ), 'Only entitlement is written.' );
		assert_same( 'wp_nahan_leads_unlocked', $wpdb->inserts[0]['table'], 'Allowance must write an entitlement.' );
		assert_true( str_contains( implode( "\n", $wpdb->queries ), 'wp_nahan_subscriptions' ) && str_contains( implode( "\n", $wpdb->queries ), 'FOR UPDATE' ), 'Active subscription is part of the lock boundary.' );
	};
	$tests['invalid target is rejected before any financial write'] = static function (): void {
		$wpdb = \reset_fixture();
		$result = ( static function () { $wallet = new WalletManager( \fixture_uow() ); return new LeadManager( $wallet, new SubscriptionManager( $wallet ) ); } )()->unlock( 7, LeadManager::TARGET_PROJECT, 999 );
		assert_error( $result, 'invalid_target', 422, 'Missing unpublished target' );
		assert_same( [], $wpdb->inserts, 'Invalid target cannot debit.' );
	};
	$tests['non-transactional table engine is explicitly rejected before mutations'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->engine = 'MyISAM';
		$result = ( new WalletManager( \fixture_uow() ) )->credit( 7, 10, WalletManager::TX_DEPOSIT );
		assert_error( $result, 'financial_transaction_unsupported', 503, 'Non-InnoDB engine' );
		assert_true( ! in_array( 'START TRANSACTION', $wpdb->queries, true ), 'Engine check must happen before BEGIN.' );
		assert_same( [], $wpdb->inserts, 'Unsupported engine cannot mutate money.' );
	};
	$tests['migration audits legacy duplicates and blocks a uniqueness change for review'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->index_rows = [ 'wp_nahan_wallet_transactions' => [], 'wp_nahan_leads_unlocked' => [] ];
		$wpdb->migration_has_conflict = true;
		$result = ( new FinancialSchema() )->upgrade();
		assert_error( $result, 'financial_schema_conflict', 409, 'Legacy duplicate audit' );
		assert_true( ! str_contains( implode( "\n", $wpdb->queries ), 'ADD UNIQUE KEY' ), 'Conflicting history must never be deduplicated or constrained automatically.' );
		assert_same( false, \get_option( FinancialSchema::OPTION, false ), 'Conflicted schema must not record a migration version.' );
	};
	$tests['migration rejects a same-named non-unique index without recording readiness'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->index_rows['wp_nahan_wallet_transactions'][1]['Non_unique'] = 1;
		$result = ( new FinancialSchema() )->upgrade();
		assert_error( $result, 'financial_schema_conflict', 409, 'Incompatible same-named index' );
		assert_true( ! str_contains( implode( "\n", $wpdb->queries ), 'ADD UNIQUE KEY' ), 'An incompatible existing index must never be replaced automatically.' );
		assert_same( false, \get_option( FinancialSchema::OPTION, false ), 'Incompatible index must not record a migration version.' );
	};
	$tests['migration is idempotent when its version is already recorded'] = static function (): void {
		\reset_fixture();
		global $test_options;
		$test_options[ FinancialSchema::OPTION ] = FinancialSchema::VERSION;
		assert_same( true, ( new FinancialSchema() )->upgrade(), 'Repeated verified migration must remain successful.' );
	};

	$tests['allowance read failure denies the unlock and rolls back without a free entitlement'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->subscription_row = [ 'id' => 22, 'plan_slug' => 'pro', 'starts_at' => '2026-10-01 00:00:00', 'ends_at' => '2026-11-01 00:00:00' ];
		$wpdb->allowance_read_failed = true;
		$uow = \fixture_uow();
		$wallet = new WalletManager( $uow );
		$result = ( new LeadManager( $wallet, new SubscriptionManager( $wallet, $uow ), $uow ) )->unlock( 7, LeadManager::TARGET_CONTACT, 101 );
		assert_error( $result, 'financial_storage_unavailable', 503, 'Allowance read failure' );
		assert_same( [], $wpdb->inserts, 'An unreadable allowance state must never grant an entitlement.' );
		assert_true( in_array( 'ROLLBACK', $wpdb->queries, true ), 'Allowance read failure must roll back.' );
	};
	$tests['locked allowance rows at the cap fall back to a wallet debit instead of a free lead'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->balance = 90000;
		$wpdb->subscription_row = [ 'id' => 22, 'plan_slug' => 'pro', 'starts_at' => '2026-10-01 00:00:00', 'ends_at' => '2026-11-01 00:00:00' ];
		$wpdb->allowance_rows = [ [ 'id' => 1 ], [ 'id' => 2 ] ];
		$uow = \fixture_uow();
		$wallet = new WalletManager( $uow );
		$result = ( new LeadManager( $wallet, new SubscriptionManager( $wallet, $uow ), $uow ) )->unlock( 7, LeadManager::TARGET_CONTACT, 101 );
		assert_true( ! \is_wp_error( $result ), 'Capped allowance must continue through the paid path.' );
		assert_same( false, $result['used_subscription'] ?? null, 'Capped allowance must not be free.' );
		assert_same( 25000, $result['price'] ?? null, 'Capped contact unlock price.' );
		assert_same( 2, count( $wpdb->inserts ), 'Capped allowance must write both debit and entitlement.' );
		assert_same( -25000, $wpdb->inserts[0]['data']['amount'] ?? null, 'Capped allowance wallet debit.' );
	};
	$tests['migration refuses to record readiness when an existing financial table is non-transactional'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->engine = 'MyISAM';
		$result = ( new FinancialSchema() )->upgrade();
		assert_error( $result, 'financial_schema_engine_unsupported', 503, 'Legacy non-InnoDB schema' );
		assert_same( false, \get_option( FinancialSchema::OPTION, false ), 'Rejected engine must not record a schema version.' );
	};
	$tests['cancellation serializes on the account lock and rolls back a failed update'] = static function (): void {
		$wpdb = \reset_fixture();
		$wpdb->subscription_row = [ 'id' => 22, 'user_id' => 7, 'plan_slug' => 'pro', 'status' => 'active' ];
		$uow = \fixture_uow();
		$wallet = new WalletManager( $uow );
		$subscriptions = new SubscriptionManager( $wallet, $uow );
		assert_same( true, $subscriptions->cancel( 22, 7 ), 'Cancellation must succeed when its transition is stored.' );
		assert_true( query_index( $wpdb, 'START TRANSACTION' ) < query_index( $wpdb, 'FROM wp_users' ), 'Cancellation must start and lock the account.' );
		assert_true( query_index( $wpdb, 'FROM wp_users' ) < query_index( $wpdb, 'FROM wp_nahan_subscriptions' ), 'Cancellation must lock its subscription after the account.' );
		assert_true( in_array( 'COMMIT', $wpdb->queries, true ), 'Successful cancellation must commit before its hook.' );

		$wpdb = \reset_fixture();
		$wpdb->subscription_row = [ 'id' => 22, 'user_id' => 7, 'plan_slug' => 'pro', 'status' => 'active' ];
		$wpdb->update_result = false;
		$uow = \fixture_uow();
		$wallet = new WalletManager( $uow );
		assert_error( ( new SubscriptionManager( $wallet, $uow ) )->cancel( 22, 7 ), 'financial_storage_unavailable', 503, 'Failed cancellation storage must remain a controlled failure, never cancelled success.' );
		assert_true( in_array( 'ROLLBACK', $wpdb->queries, true ), 'Failed cancellation update must roll back.' );
		assert_same( [], $GLOBALS['actions'], 'Failed cancellation must not fire its hook.' );
	};
	$tests['ignored nested financial error poisons the outer transaction and prevents commit'] = static function (): void {
		$wpdb = \reset_fixture();
		$uow = \fixture_uow();
		$result = $uow->run_for_user( 7, [ 'wp_nahan_wallet_transactions' ], static function () use ( $uow ) {
			$uow->run_for_user( 7, [ 'wp_nahan_wallet_transactions' ], static fn() => new \WP_Error( 'inner_failure', 'inner failure', [ 'status' => 503 ] ) );
			return [ 'outer' => 'ignored inner failure' ];
		} );
		assert_error( $result, 'inner_failure', 503, 'Ignored nested error' );
		assert_true( in_array( 'ROLLBACK', $wpdb->queries, true ), 'Ignored nested error must roll back.' );
		assert_same( 0, count( array_filter( $wpdb->queries, static fn( string $query ): bool => 'COMMIT' === $query ) ), 'Rollback-only outer work must not commit.' );
	};

	$failed = 0;
	foreach ( $tests as $name => $test ) {
		try { $test(); fwrite( STDOUT, "PASS {$name}\n" ); }
		catch ( \Throwable $error ) { $failed++; fwrite( STDERR, "FAIL {$name}: {$error->getMessage()}\n" ); }
	}
	exit( $failed === 0 ? 0 : 1 );
}
