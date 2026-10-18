<?php
/**
 * Deterministic boundary test for the public specialist profile guard.
 *
 * Usage:
 *   /Applications/XAMPP/xamppfiles/bin/php tests/wordpress/public-profile-guard.test.php /path/to/karban-core
 *
 * This deliberately does not bootstrap WordPress or connect to a database.
 */

declare(strict_types=1);

namespace Nahan\Core\RestApi {
    final class RestHelper {
        public const NAMESPACE = 'nahan/v1';

        public static function authed_callback(): callable {
            return static fn (): bool => true;
        }

        public static function role_callback(string $role): callable {
            return static fn (): bool => true;
        }

        public static function ok($data, int $status = 200): \WP_REST_Response {
            return new \WP_REST_Response([
                'success' => true,
                'data' => $data,
            ], $status);
        }

        public static function fail(string $code, string $message, int $status = 400, $extra = []): \WP_REST_Response {
            return new \WP_REST_Response([
                'success' => false,
                'error' => array_merge([
                    'code' => $code,
                    'message' => $message,
                ], $extra),
            ], $status);
        }
    }
}

namespace Nahan\Core {
    final class Helpers {
        public static function client_ip(): string {
            return '127.0.0.1';
        }

        public static function now_mysql(): string {
            return '2026-10-18 00:00:00';
        }
    }

    final class Roles {
        public const SPECIALIST = 'specialist';
    }
}

namespace {
    if ($argc !== 2) {
        fwrite(STDERR, "Usage: php public-profile-guard.test.php /path/to/karban-core\n");
        exit(2);
    }

    $pluginDir = rtrim($argv[1], '/');
    $routeFile = $pluginDir . '/rest-api/profile-routes.php';
    if (!is_file($routeFile)) {
        fwrite(STDERR, "Plugin route file not found: {$routeFile}\n");
        exit(2);
    }

    define('ABSPATH', __DIR__ . '/');
    define('OBJECT', 'OBJECT');

    final class WP_REST_Response {
        private array $data;
        private int $status;

        public function __construct(array $data, int $status = 200) {
            $this->data = $data;
            $this->status = $status;
        }

        public function get_data(): array {
            return $this->data;
        }

        public function get_status(): int {
            return $this->status;
        }
    }

    final class WP_Post {
        public int $ID;
        public string $post_type;
        public string $post_status;
        public string $post_password;

        public function __construct(int $id, string $type, string $status, string $password = '') {
            $this->ID = $id;
            $this->post_type = $type;
            $this->post_status = $status;
            $this->post_password = $password;
        }
    }

    final class FakeRequest implements \ArrayAccess {
        private array $params;

        public function __construct(array $params = []) {
            $this->params = $params;
        }

        public function get_param(string $key) {
            return $this->params[$key] ?? null;
        }

        public function offsetExists(mixed $offset): bool {
            return array_key_exists((string) $offset, $this->params);
        }

        public function offsetGet(mixed $offset): mixed {
            return $this->params[(string) $offset] ?? null;
        }

        public function offsetSet(mixed $offset, mixed $value): void {
            throw new \LogicException('Requests are immutable in this test.');
        }

        public function offsetUnset(mixed $offset): void {
            throw new \LogicException('Requests are immutable in this test.');
        }
    }

    final class WP_Query {
        public array $posts = [];
        public int $found_posts = 0;
        public int $max_num_pages = 0;

        public function __construct(array $args) {
            $GLOBALS['captured_list_queries'][] = $args;
        }
    }

    final class FakeWpdb {
        public string $prefix = 'wp_';
        public array $inserts = [];

        public function insert(string $table, array $data, array $format): int {
            $this->inserts[] = compact('table', 'data', 'format');
            return 1;
        }
    }

    $GLOBALS['registered_routes'] = [];
    $GLOBALS['captured_list_queries'] = [];
    $GLOBALS['post_for_slug'] = null;
    $GLOBALS['formatter_calls'] = [];
    $GLOBALS['wpdb'] = new FakeWpdb();

    function register_rest_route(string $namespace, string $route, array $definition): void {
        $GLOBALS['registered_routes'][$namespace . $route] = $definition;
    }

    function get_page_by_path(string $slug, string $output, string $postType) {
        return $GLOBALS['post_for_slug'];
    }

    function is_user_logged_in(): bool {
        return false;
    }

    function get_current_user_id(): int {
        return 0;
    }

    function nahan_format_specialist_full(int $id): array {
        $GLOBALS['formatter_calls'][] = $id;
        return ['id' => $id, 'formatted' => true];
    }

    require $routeFile;

    function assert_same($expected, $actual, string $message): void {
        if ($expected !== $actual) {
            throw new \RuntimeException(
                $message . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true)
            );
        }
    }

    function assert_true(bool $condition, string $message): void {
        if (!$condition) {
            throw new \RuntimeException($message);
        }
    }

    function reset_public_detail_state(): void {
        $GLOBALS['wpdb']->inserts = [];
        $GLOBALS['formatter_calls'] = [];
    }

    $detailRoute = $GLOBALS['registered_routes']['nahan/v1/specialists/(?P<slug>[^/]+)'] ?? null;
    $listRoute = $GLOBALS['registered_routes']['nahan/v1/specialists'] ?? null;
    assert_true(is_array($detailRoute), 'The real public detail route must be registered.');
    assert_true(is_array($listRoute), 'The real public list route must be registered.');

    $detail = $detailRoute['callback'];
    $rejectedCases = [
        'missing' => null,
        'draft' => new WP_Post(101, 'nahan_specialist', 'draft'),
        'pending' => new WP_Post(102, 'nahan_specialist', 'pending'),
        'private' => new WP_Post(103, 'nahan_specialist', 'private'),
        'future' => new WP_Post(104, 'nahan_specialist', 'future'),
        'trash' => new WP_Post(105, 'nahan_specialist', 'trash'),
        'wrong type' => new WP_Post(106, 'post', 'publish'),
        'password protected' => new WP_Post(107, 'nahan_specialist', 'publish', 'secret'),
    ];

    foreach ($rejectedCases as $label => $post) {
        reset_public_detail_state();
        $GLOBALS['post_for_slug'] = $post;
        $response = $detail(new FakeRequest(['slug' => 'guard-case']));
        assert_same(404, $response->get_status(), "{$label} public detail must be not_found.");
        assert_same('not_found', $response->get_data()['error']['code'] ?? null, "{$label} must preserve the existing not_found envelope.");
        assert_same(0, count($GLOBALS['wpdb']->inserts), "{$label} must not record a profile view.");
        assert_same([], $GLOBALS['formatter_calls'], "{$label} must not access the shared formatter.");
    }

    reset_public_detail_state();
    $GLOBALS['post_for_slug'] = new WP_Post(108, 'nahan_specialist', 'publish');
    $response = $detail(new FakeRequest(['slug' => 'published-specialist']));
    assert_same(200, $response->get_status(), 'A published password-free specialist must succeed.');
    assert_same(['success' => true, 'data' => ['id' => 108, 'formatted' => true]], $response->get_data(), 'A published specialist must preserve formatter output.');
    assert_same(1, count($GLOBALS['wpdb']->inserts), 'A published specialist must retain view insertion.');
    assert_same([108], $GLOBALS['formatter_calls'], 'A published specialist must call the shared formatter once.');

    $list = $listRoute['callback'];
    $GLOBALS['captured_list_queries'] = [];
    $list(new FakeRequest());
    $args = $GLOBALS['captured_list_queries'][0] ?? null;
    assert_true(is_array($args), 'The public list must construct a WP_Query.');
    assert_same('publish', $args['post_status'] ?? null, 'The public list must query published specialists only.');
    assert_true(array_key_exists('has_password', $args), 'The public list must explicitly exclude password-protected specialists.');
    assert_same(false, $args['has_password'], 'The public list must set has_password to false.');

    fwrite(STDOUT, "PASS public profile publication/password guard\n");
}
