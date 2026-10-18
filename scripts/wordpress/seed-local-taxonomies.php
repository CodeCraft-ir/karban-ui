<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$args = array_slice($argv, 1);
if ($args !== [] && $args !== ['--apply']) {
    fwrite(STDERR, "Usage: php seed-local-taxonomies.php [--apply]\nWithout --apply this only previews.\n");
    exit(2);
}
$root = '/Applications/XAMPP/xamppfiles/htdocs/karban';
if (!is_file($root . '/wp-load.php')) {
    fwrite(STDERR, "Approved local WordPress installation not found.\n");
    exit(1);
}
// WordPress reads its own configuration. Never print or copy credentials.
define('WP_USE_THEMES', false);
require $root . '/wp-load.php';
require __DIR__ . '/local-taxonomy-seed.php';
try {
    $manifest = json_decode(file_get_contents(__DIR__ . '/local-taxonomies.json'), true, 512, JSON_THROW_ON_ERROR);
    $rows = karban_seed_local_taxonomies(home_url(), $manifest, $args === ['--apply']);
    echo json_encode(['mode' => $args === ['--apply'] ? 'apply' : 'preview', 'terms' => $rows], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, "Local taxonomy seeding failed. Existing data was not deleted; inspect configuration and rerun preview before retrying.\n");
    exit(1);
}
