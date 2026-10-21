<?php
/** Source-only fixtures: no WP bootstrap, database or network. */
require __DIR__ . '/task-6a-admin.test.php';
use Nahan\Core\Development\LocalSeedService;
use Nahan\Core\Development\LocalSeedManifest;
$failed = 0; $passed = 0;
function scenario( string $name, callable $test ): void { global $failed, $passed; reset_fixture(); try { $test(); $passed++; echo "PASS $name\n"; } catch ( Throwable $e ) { $failed++; echo "FAIL $name: {$e->getMessage()}\n"; } }
function seed_all(): array { $s = new LocalSeedService( gate() ); $p = $s->preview(); return $s->apply( $p['version'], $p['hash'], LocalSeedService::CONFIRMATION ); }
function render_tools( $tool ): string { ob_start(); try { $tool->render(); return ob_get_contents(); } finally { ob_end_clean(); } }
scenario( 'registered preview renders full safe manifest and provenance', function () {
 $t = registered_tools(); invoke( $GLOBALS['hooks']['admin_post_nahan_local_preview'] ); $html = render_tools( $t );
 foreach ( LocalSeedManifest::all()['taxonomies'] as $entries ) foreach ( $entries as $entry ) { assert_true( str_contains( $html, $entry['slug'] ), 'missing term ' . $entry['slug'] ); assert_true( str_contains( $html, $entry['name'] ), 'missing term name' ); }
 foreach ( LocalSeedManifest::all()['users'] as $u ) { assert_true( str_contains( $html, $u['seed_id'] ), 'missing account' ); if ( isset( $u['profile'] ) ) assert_true( str_contains( $html, $u['profile']['slug'] ), 'missing profile' ); }
 foreach ( ['2016', 'application-historical-2016-baseline', 'would_create', 'OTP'] as $text ) assert_true( str_contains( $html, $text ), 'missing preview detail ' . $text );
});
scenario( 'fresh creation links every profile both ways without phone mapping', function () {
 assert_same( 'success', seed_all()['status'], 'creation succeeds' );
 foreach ( $GLOBALS['posts'] as $p ) { assert_same( (string) $p->ID, (string) get_user_meta( $p->post_author, 'nahan_specialist_post', true ), 'account pointer' ); assert_same( (string) $p->post_author, (string) get_post_meta( $p->ID, 'user', true ), 'profile pointer' ); }
 foreach ( $GLOBALS['user_meta'] as $meta ) assert_true( ! isset( $meta['phone'] ) && ! isset( $meta['phone_number'] ), 'no synthetic login phone' );
});
foreach ( ['user-meta:nahan_specialist_post', 'post-meta:user', 'category-assignment'] as $failure ) scenario( 'checked partial repair ' . $failure, function () use ( $failure ) {
 $GLOBALS['fail'] = $failure; $r = seed_all(); assert_same( 'partial', $r['status'], 'failed required write is partial' ); assert_true( empty( $GLOBALS['filters'] ), 'finally restores outbound' );
 $GLOBALS['fail'] = null; $p = $GLOBALS['posts'][0]; $p->post_title = 'User edited'; $p->post_status = 'draft'; $count = count( $GLOBALS['posts'] ); $s = new LocalSeedService( gate() ); $before = $GLOBALS['writes']; $preview = $s->preview(); assert_same( $before, $GLOBALS['writes'], 'repair preview is read-only' ); assert_same( 'repair', $preview['plan']['users'][1]['profile']['action'], 'partial profile is classified repair' );
 $r = $s->apply( $preview['version'], $preview['hash'], LocalSeedService::CONFIRMATION ); assert_same( 'success', $r['status'], 'explicit repair succeeds' ); assert_same( 'User edited', $p->post_title, 'content preserved' ); assert_same( 'draft', $p->post_status, 'never republished' ); assert_same( 3, count( $GLOBALS['posts'] ), 'no duplicated profile' ); assert_same( (string) $p->ID, (string) get_user_meta( $p->post_author, 'nahan_specialist_post', true ), 'repaired account pointer' ); assert_same( (string) $p->post_author, (string) get_post_meta( $p->ID, 'user', true ), 'repaired profile pointer' ); assert_true( count( $GLOBALS['assignments'][$p->ID]['job_category'] ?? [] ) > 0, 'missing term repaired' );
});
foreach ( ['foreign-pointer','foreign-user','foreign-author','extra-role','unmarked','duplicate-owner'] as $conflict ) scenario( 'fail closed ' . $conflict, function () use ( $conflict ) {
 seed_all(); $p = $GLOBALS['posts'][0];
 if ( $conflict === 'foreign-pointer' ) $GLOBALS['user_meta'][$p->post_author]['nahan_specialist_post'] = 999;
 if ( $conflict === 'foreign-user' ) $GLOBALS['post_meta'][$p->ID]['user'] = 999;
 if ( $conflict === 'foreign-author' ) $p->post_author = 999;
 if ( $conflict === 'extra-role' ) $GLOBALS['users'][1]->roles[] = 'administrator';
 if ( $conflict === 'unmarked' ) unset( $GLOBALS['post_meta'][$p->ID]['_nahan_local_seed_id'] );
 if ( $conflict === 'duplicate-owner' ) { $copy = clone $p; $copy->ID = 999; $copy->post_name = 'other-profile'; $GLOBALS['posts'][] = $copy; }
 $before = $GLOBALS['writes']; expect_denied( static fn() => ( new LocalSeedService( gate() ) )->preview(), 'conflict must reject preview' ); assert_same( $before, $GLOBALS['writes'], 'conflict zero writes' );
});
scenario( 'saved partial results render completed items and safe retry guidance', function () {
 $t = registered_tools(); invoke( $GLOBALS['hooks']['admin_post_nahan_local_preview'] ); $_POST['confirmation'] = LocalSeedService::CONFIRMATION; $GLOBALS['fail'] = 'category-assignment'; invoke( $GLOBALS['hooks']['admin_post_nahan_local_apply'] ); $html = render_tools( $t );
 foreach ( ['partial','job_category:building-permits','karban-local-demo-client','profile:karban-local-demo-architect-profile','retry'] as $text ) assert_true( str_contains( $html, $text ), 'missing partial detail ' . $text );
 $GLOBALS['current_user'] = 92; $other = render_tools( $t ); assert_true( ! str_contains( $other, 'profile:karban-local-demo-architect-profile' ), 'other admin cannot see results' );
 $GLOBALS['current_user'] = 91; assert_true( str_contains( render_tools( $t ), 'profile:karban-local-demo-architect-profile' ), 'original admin retains results' );
 $GLOBALS['home_origin'] = 'http://localhost/other'; assert_true( ! str_contains( render_tools( $t ), 'profile:karban-local-demo-architect-profile' ), 'origin change hides persisted results' );
 $before = $GLOBALS['writes']; expect_denied( static fn() => $GLOBALS['hooks']['admin_post_nahan_local_apply'](), 'origin-bound preview rejected' ); assert_same( $before, $GLOBALS['writes'], 'origin mismatch zero writes' );
});
scenario( 'upgrade callback saves safe failure and render shows it', function () {
 $GLOBALS['wpdb']->indexes['wp_nahan_wallet_transactions'][0]['Non_unique'] = 1; $t = registered_tools(); $_POST += ['schema'=>'financial','confirmation'=>LocalSeedService::CONFIRMATION]; invoke( $GLOBALS['hooks']['admin_post_nahan_local_upgrade'] ); $html = render_tools( $t ); assert_true( str_contains( $html, 'financial' ) && str_contains( $html, 'failed' ), 'saved upgrade failure visible' );
});
scenario( 'preview includes demo display names and profile bio', function () {
 $t = registered_tools(); invoke( $GLOBALS['hooks']['admin_post_nahan_local_preview'] ); $html = render_tools( $t );
 foreach ( LocalSeedManifest::all()['users'] as $user ) { assert_true( str_contains( $html, $user['display_name'] ), 'display name visible' ); if ( isset( $user['profile'] ) ) assert_true( str_contains( $html, $user['profile']['bio'] ), 'bio visible' ); }
});
scenario( 'missing marked account demo flag is explicitly repair not silent existing', function () {
 seed_all(); unset( $GLOBALS['user_meta'][201]['_nahan_local_demo'] ); $p = (new LocalSeedService(gate()))->preview(); assert_same('repair', $p['plan']['users'][0]['action'], 'missing account demo flag visible');
});
scenario( 'foreign reverse claim fails closed', function () {
 seed_all(); $GLOBALS['user_meta'][201]['nahan_specialist_post'] = 301; $before = $GLOBALS['writes']; expect_denied( static fn() => (new LocalSeedService(gate()))->preview(), 'foreign claimant rejected' ); assert_same($before, $GLOBALS['writes'], 'no writes');
});
scenario( 'saved state remains separate for two admins and invalidates version hash', function () {
 $t=registered_tools(); invoke($GLOBALS['hooks']['admin_post_nahan_local_preview']); $GLOBALS['current_user']=92; invoke($GLOBALS['hooks']['admin_post_nahan_local_preview']); $GLOBALS['current_user']=91;
 assert_true(str_contains(render_tools($t),'application-historical-2016-baseline'), 'second admin does not replace first preview');
 foreach (['hash','version'] as $field) { $old=$GLOBALS['options']['nahan_local_seed_preview_91'][$field]; $GLOBALS['options']['nahan_local_seed_preview_91'][$field]='stale'; assert_true(!str_contains(render_tools($t),'application-historical-2016-baseline'), 'stale preview hidden'); $_POST['confirmation']=LocalSeedService::CONFIRMATION; $before=$GLOBALS['writes']; expect_denied(static fn()=>$GLOBALS['hooks']['admin_post_nahan_local_apply'](),'stale apply denied'); assert_same($before,$GLOBALS['writes'],'stale apply no writes'); $GLOBALS['options']['nahan_local_seed_preview_91'][$field]=$old; }
});
scenario( 'raw exception details never persist or render', function () {
 $t=registered_tools(); invoke($GLOBALS['hooks']['admin_post_nahan_local_preview']); $_POST['confirmation']=LocalSeedService::CONFIRMATION; $GLOBALS['fail']='raw-exception'; invoke($GLOBALS['hooks']['admin_post_nahan_local_apply']); assert_true(!str_contains(json_encode($GLOBALS['options']),'SELECT private_fixture'),'exception not persisted'); assert_true(!str_contains(render_tools($t),'SELECT private_fixture'),'exception not rendered'); assert_true(empty($GLOBALS['filters']),'finally cleans exception');
});
scenario( 'successful upgrade and seed results are visible only in their bound context', function () {
 $t=registered_tools(); $_POST += ['schema'=>'financial','confirmation'=>LocalSeedService::CONFIRMATION]; invoke($GLOBALS['hooks']['admin_post_nahan_local_upgrade']); assert_true(str_contains(render_tools($t),'financial upgrade: success'),'upgrade success visible');
 invoke($GLOBALS['hooks']['admin_post_nahan_local_preview']); invoke($GLOBALS['hooks']['admin_post_nahan_local_apply']); $html=render_tools($t); assert_true(str_contains($html,'profile / created / ID 301'),'completed profile visible'); assert_true(!str_contains($html,'unrevealed-random-password'),'no password rendered');
 $GLOBALS['current_user']=92; assert_true(!str_contains(render_tools($t),'financial upgrade: success'),'foreign upgrade hidden'); $GLOBALS['current_user']=91; $GLOBALS['options']['nahan_local_seed_last_result_91']['hash']='stale'; assert_true(!str_contains(render_tools($t),'profile / created / ID 301'),'stale result hidden');
 $GLOBALS['current_admin']=false; expect_denied(static fn()=>render_tools($t),'render requires manage_options');
});
scenario( 'repair never overwrites nonempty edited content terms or publication', function () {
 seed_all(); $p=$GLOBALS['posts'][0]; $p->post_title='Edited'; $p->post_content='Edited bio'; $p->post_status='pending'; $p->post_name='edited-slug'; $GLOBALS['assignments'][$p->ID]['city']=[999]; $GLOBALS['assignments'][$p->ID]['job_category']=[998]; unset($GLOBALS['post_meta'][$p->ID]['user']);
 assert_same('success',seed_all()['status'],'repair succeeds'); assert_same(['Edited','Edited bio','pending','edited-slug'],[$p->post_title,$p->post_content,$p->post_status,$p->post_name],'all content untouched'); assert_same([999],$GLOBALS['assignments'][$p->ID]['city'],'edited city preserved'); assert_same([998],$GLOBALS['assignments'][$p->ID]['job_category'],'edited category preserved');
});
// Fix round 1: real WP `any` excludes records that uniqueness must still inspect.
foreach ( ['trash','auto-draft','inherit','fixture-internal'] as $status ) foreach ( ['unmarked-authored','unmarked-reverse','duplicate-marker'] as $kind ) foreach ( ['preview','apply'] as $operation ) scenario( 'all statuses fail closed ' . $status . ' ' . $kind . ' ' . $operation, function () use ( $status, $kind, $operation ) {
 seed_all(); $service=new LocalSeedService(gate()); $valid=$service->preview(); $original=$GLOBALS['posts'][0]; $account=$original->post_author;
 unset($GLOBALS['user_meta'][$account]['nahan_specialist_post']);
 if ('duplicate-marker' === $kind) {
  $hidden=clone $original; $hidden->ID=999; $hidden->post_author=999; $hidden->post_name='hidden-other-slug'; $hidden->post_status=$status; $GLOBALS['posts'][]=$hidden; $GLOBALS['post_meta'][999]=['_nahan_local_seed_id'=>LocalSeedManifest::all()['users'][1]['profile']['seed_id']];
 } else {
  $original->post_status=$status; $original->post_name='hidden-unmarked-other-slug'; unset($GLOBALS['post_meta'][$original->ID]['_nahan_local_seed_id']);
  if ('unmarked-reverse' === $kind) { $original->post_author=999; $GLOBALS['post_meta'][$original->ID]['user']=(string)$account; } else { unset($GLOBALS['post_meta'][$original->ID]['user']); }
 }
 $before=$GLOBALS['writes']; $material=serialize([$GLOBALS['posts'],$GLOBALS['post_meta'],$GLOBALS['user_meta']]);
 if ('preview' === $operation) expect_denied(static fn()=>$service->preview(),'hidden ownership conflict must reject preview');
 else expect_denied(static fn()=>$service->apply($valid['version'],$valid['hash'],LocalSeedService::CONFIRMATION),'hidden ownership conflict must reject explicit apply');
 assert_same($before,$GLOBALS['writes'],'hidden conflict zero writes'); assert_same($material,serialize([$GLOBALS['posts'],$GLOBALS['post_meta'],$GLOBALS['user_meta']]),'no restore, republish or linkage edits');
});
echo "Task 7A: $passed passed; $failed failed\n"; exit( $failed ? 1 : 0 );
