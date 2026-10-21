<?php
/** Only the user-authorized local catalog; no posts, accounts, options or deletes. */
function karban_local_taxonomy_manifest(): array {
    $contents = file_get_contents(__DIR__ . '/local-taxonomies.json');
    if (false === $contents) {
        throw new RuntimeException('Approved local taxonomy manifest is unavailable.');
    }
    try {
        $manifest = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new RuntimeException('Approved local taxonomy manifest is invalid.', 0, $error);
    }
    if (!is_array($manifest)) {
        throw new RuntimeException('Approved local taxonomy manifest is invalid.');
    }
    return $manifest;
}

function karban_local_kashan_city_baseline(): array {
    $manifest = karban_local_taxonomy_manifest();
    return is_array($manifest['city'] ?? null) ? $manifest['city'] : [];
}

function karban_seed_local_taxonomies(string $site_url, array $manifest, bool $apply): array {
    $url = parse_url($site_url);
    if (!is_array($url)
        || !in_array($url['scheme'] ?? '', ['http', 'https'], true)
        || !in_array($url['host'] ?? '', ['localhost', '127.0.0.1', '::1', '[::1]'], true)
        || rtrim($url['path'] ?? '', '/') !== '/karban'
        || isset($url['user']) || isset($url['pass']) || isset($url['query']) || isset($url['fragment'])) {
        throw new InvalidArgumentException('Only the approved localhost /karban installation is allowed.');
    }
    if (array_diff(array_keys($manifest), ['job_category', 'city']) || count($manifest) !== 2) {
        throw new InvalidArgumentException('Only job_category and city are allowed.');
    }
    if (($manifest['city'] ?? null) !== karban_local_kashan_city_baseline()) {
        throw new InvalidArgumentException('Only the reviewed seven-city Kashan baseline is allowed.');
    }
    // Validate the entire batch before any insert. Never rename existing terms.
    foreach ($manifest as $taxonomy => $entries) {
        if (!taxonomy_exists($taxonomy) || !is_array($entries) || count($entries) > 100) {
            throw new InvalidArgumentException('Missing taxonomy or invalid batch.');
        }
        $slugs = [];
        $names = [];
        foreach ($entries as $entry) {
            if (!is_array($entry) || !is_string($entry['name'] ?? null) || !is_string($entry['slug'] ?? null)
                || trim($entry['name']) === '' || strlen($entry['name']) > 200
                || preg_match('/[\x00-\x1f\x7f<>]/', $entry['name'])
                || !preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/', $entry['slug'])
                || strlen($entry['slug']) > 100 || isset($slugs[$entry['slug']]) || isset($names[$entry['name']])) {
                throw new InvalidArgumentException('Invalid or duplicate term in manifest.');
            }
            $slugs[$entry['slug']] = true;
            $names[$entry['name']] = true;
        }
    }
    $plan = [];
    foreach ($manifest as $taxonomy => $entries) {
        foreach ($entries as $entry) {
            $existing = get_term_by('slug', $entry['slug'], $taxonomy);
            if (is_wp_error($existing)) throw new RuntimeException('Term lookup failed before writing.');
            if (!$existing) $existing = get_term_by('name', $entry['name'], $taxonomy);
            if (is_wp_error($existing)) throw new RuntimeException('Term lookup failed before writing.');
            $plan[] = ['taxonomy' => $taxonomy, 'entry' => $entry, 'existing' => $existing];
        }
    }
    $result = [];
    foreach ($plan as $item) {
        $taxonomy = $item['taxonomy'];
        $entry = $item['entry'];
        $existing = $item['existing'];
        $row = ['taxonomy' => $taxonomy, 'name' => $entry['name'], 'slug' => $entry['slug']];
        if ($existing) {
            $result[] = $row + ['action' => 'existing', 'term_id' => (int) $existing->term_id];
        } elseif (!$apply) {
            $result[] = $row + ['action' => 'would_create'];
        } else {
            $inserted = wp_insert_term($entry['name'], $taxonomy, ['slug' => $entry['slug']]);
            if (is_wp_error($inserted)) {
                // Earlier inserts may remain: do not roll back by deleting user data.
                throw new RuntimeException('Term insertion failed; earlier inserts may remain. Rerun safely after investigation.');
            }
            $result[] = $row + ['action' => 'created', 'term_id' => (int) $inserted['term_id']];
        }
    }
    return $result;
}
