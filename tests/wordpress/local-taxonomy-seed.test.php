<?php
// Standalone boundary test; never bootstraps WordPress or touches its database.
require __DIR__ . '/../../scripts/wordpress/local-taxonomy-seed.php';
$terms = [];
$writes = 0;
$lookup_failure_taxonomy = null;
class SeedLookupError {}
function taxonomy_exists($taxonomy) { return in_array($taxonomy, ['job_category', 'city'], true); }
function get_term_by($field, $value, $taxonomy) {
    global $terms, $lookup_failure_taxonomy;
    if ($taxonomy === $lookup_failure_taxonomy) return new SeedLookupError();
    foreach ($terms[$taxonomy] ?? [] as $term) if ($term->$field === $value) return $term;
    return false;
}
function wp_insert_term($name, $taxonomy, $args) {
    global $terms, $writes;
    $writes++;
    $id = $writes;
    $terms[$taxonomy][] = (object) ['term_id' => $id, 'name' => $name, 'slug' => $args['slug']];
    return ['term_id' => $id];
}
function is_wp_error($value) { return $value instanceof SeedLookupError; }
function expect($ok, $message) { if (!$ok) throw new RuntimeException($message); }
$manifest = ['job_category' => [['name' => 'برق‌کاری', 'slug' => 'electrical']], 'city' => [['name' => 'تهران', 'slug' => 'tehran']]];
$dry = karban_seed_local_taxonomies('http://localhost/karban/', $manifest, false);
expect($writes === 0 && count($dry) === 2 && $dry[0]['action'] === 'would_create', 'dry run must not write');
foreach (['https://codecraft.ir/kar', 'http://localhost.evil.test/karban', 'http://localhost/other', 'http://user:pass@localhost/karban', 'http://localhost/karban?x=1'] as $url) {
    try { karban_seed_local_taxonomies($url, $manifest, true); throw new RuntimeException('accepted unsafe site'); }
    catch (InvalidArgumentException $error) {}
}
expect($writes === 0, 'site rejection must precede writes');
$invalid = $manifest;
$invalid['city'][] = ['name' => '', 'slug' => 'invalid'];
try { karban_seed_local_taxonomies('http://localhost/karban', $invalid, true); throw new RuntimeException('accepted invalid manifest'); }
catch (InvalidArgumentException $error) {}
expect($writes === 0, 'validate full manifest before writes');
$lookup_failure_taxonomy = 'city';
try { karban_seed_local_taxonomies('http://localhost/karban', $manifest, true); throw new LogicException('accepted failed lookup'); }
catch (RuntimeException $error) { if ($error instanceof LogicException) throw $error; }
expect($writes === 0, 'a later taxonomy lookup failure must precede every write');
$lookup_failure_taxonomy = null;
$created = karban_seed_local_taxonomies('http://localhost/karban', $manifest, true);
expect($writes === 2 && $created[0]['action'] === 'created', 'apply must insert actual terms');
$again = karban_seed_local_taxonomies('http://localhost/karban', $manifest, true);
expect($writes === 2 && $again[0]['action'] === 'existing', 'repeat must not duplicate');
$renamed = $manifest;
$renamed['job_category'][0]['slug'] = 'electrical-new';
karban_seed_local_taxonomies('http://localhost/karban', $renamed, true);
expect($writes === 2, 'existing same name must not be overwritten or duplicated');
echo "PASS local-only taxonomy seed: dry run, target/manifest validation, insert, idempotency\n";
