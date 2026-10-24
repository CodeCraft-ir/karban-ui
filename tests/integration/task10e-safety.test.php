<?php
/** Offline: loads actual wpdb/class definitions for source checks, never invokes a connection factory or SQL. */
declare(strict_types=1);
$library = __DIR__ . '/task10e/guard.php';
if (!is_file($library)) { fwrite(STDERR, "FAIL missing Task10E guard implementation\n"); exit(1); }
require $library;
use Task10E\Guard;
function check(bool $ok, string $name): void { if (!$ok) { throw new RuntimeException($name); } }
function denies(callable $f, string $name): void { try { $f(); } catch (RuntimeException $e) { check($e->getMessage() === 'Task10E safety check failed.', $name.' static error'); return; } throw new RuntimeException($name.' accepted'); }
$c = ['host'=>'127.0.0.1:3306','database'=>'karban_financial_test','user'=>'karban_test','password'=>'SYNTHETIC_NOT_A_CREDENTIAL','prefix'=>'kt10e_0123456789abcdef_','current_user'=>'karban_test@localhost'];
Guard::configuration($c);
check(method_exists(Guard::class,'preflight'),'preflight dispatch missing');
$reads=0; $read=function() use (&$reads,$c) { $reads++; return $c; };
$flight=Guard::preflight([], $read); check($reads===0 && $flight['configuration']===null && !class_exists('wpdb',false),'default never reads config or loads driver');
foreach ([['--execute'],['--confirm-db=karban'],['--password=SECRET_SENTINEL']] as $bad) { denies(fn()=>Guard::preflight($bad,$read),'preflight malformed'); }
check($reads===0,'invalid switches never reach configuration loader');
Guard::preflight(['--config=/intentionally-nonexistent-private-file'], $read); check($reads===0,'dryrun ignores explicit config path');
Guard::grants(["GRANT SELECT, INSERT, UPDATE, CREATE ON `karban_financial_test`.* TO `karban_test`@`localhost`"]);
$bad=$c; $bad['database']='karban'; denies(fn()=>Guard::preflight(['--execute','--confirm-db=karban_financial_test'],fn()=>$bad),'preflight validates target before returning execution state');
check(Guard::arguments([])['execute'] === false, 'default dry run');
foreach ([['--execute'], ['--confirm-db=karban_financial_test'], ['--execute','--confirm-db=karban'], ['--password=secret'], ['--execute','--execute']] as $a) { denies(fn()=>Guard::arguments($a), 'switch guard'); }
check(Guard::arguments(['--execute','--confirm-db=karban_financial_test'])['execute'], 'dual authorization');
foreach (['database'=>['karban','mysql','information_schema','karban_financial_test.other'], 'user'=>['root','','admin'], 'host'=>['localhost','p:127.0.0.1','remote:3306','127.0.0.1:3307'], 'prefix'=>['wp_','kt10e_short_','kt10e_0123456789abcdef_.','kt10e_0123456789abcdef_`'], 'current_user'=>['root@localhost','karban_test@%']] as $key=>$values) { foreach ($values as $v) { $bad=$c; $bad[$key]=$v; denies(fn()=>Guard::configuration($bad), 'config '.$key); } }
$extra=$c; $extra['unknown']='ignored?'; denies(fn()=>Guard::configuration($extra), 'unknown configuration');
$tables=Guard::tables($c['prefix']); check(count($tables)===5,'five scoped tables');
foreach (['DROP TABLE '.$tables[0].', unrelated_fixture','CREATE TABLE '.$tables[0].' LIKE unrelated_fixture','UPDATE '.$tables[0].', unrelated_fixture SET ID = 1','SELECT GET_LOCK(\'x\', 1)','SELECT * FROM '.$tables[0].', unrelated_fixture','SELECT * FROM '.$tables[0].' WHERE ID = 1 OR EXISTS (SELECT 1 FROM unrelated_fixture)','SELECT \'string trap\\\' FROM unrelated_fixture\'','DROP TABLE `'.$tables[0].'`, `unrelated_fixture`','SELECT 1 /*comment*/','SELECT 1 -- comment','SELECT 1 # comment','SELECT DATABASE(); SELECT 1','CREATE TABLE '.$tables[0].' (ID BIGINT) AS SELECT ID FROM unrelated_fixture'] as $q) { denies(fn()=>Guard::sql($q,$tables,true),'review SQL bypass '.$q); }
foreach (['SELECT * FROM karban.wp_users','DELETE FROM wp_users','DROP DATABASE karban','KILL 2','SELECT SLEEP(5)','SELECT 1; DELETE FROM '.$tables[0], 'SELECT * FROM `karban`.`'.$tables[0].'`', 'SELECT * FROM '.$tables[0].' /* bypass */', 'SELECT * FROM '.$tables[0].' INTO OUTFILE \'x\''] as $q) { denies(fn()=>Guard::sql($q,$tables), 'SQL boundary'); }
foreach (['SELECT ID FROM '.$tables[0].' WHERE ID = 900001 FOR UPDATE', 'SHOW FULL COLUMNS FROM '.$tables[1], "SHOW TABLE STATUS WHERE Name = '".$tables[0]."'", 'START TRANSACTION','COMMIT','ROLLBACK'] as $q) { Guard::sql($q,$tables); }
denies(fn()=>Guard::sql('DROP TABLE '.$tables[0],$tables), 'no drop default'); Guard::sql('DROP TABLE '.$tables[0],$tables,true);
Guard::grants(["GRANT USAGE ON *.* TO `karban_test`@`localhost`", "GRANT SELECT, INSERT, UPDATE, CREATE, DROP ON `karban_financial_test`.* TO `karban_test`@`localhost`"]);
foreach (["GRANT ALL PRIVILEGES ON *.* TO `karban_test`@`localhost`", "GRANT SELECT ON `karban`.* TO `karban_test`@`localhost`", "GRANT SELECT ON `karban_financial_test`.* TO `karban_test`@`localhost` WITH GRANT OPTION", "GRANT PROCESS ON `karban_financial_test`.* TO `karban_test`@`localhost`"] as $g) { denies(fn()=>Guard::grants([$g]), 'privilege guard'); }
denies(fn()=>Guard::grants(["GRANT ALL PRIVILEGES ON `karban_financial_test`.* TO `karban_test`@`localhost`"]),'overprivileged scoped user');
foreach (['SELECT','INSERT','UPDATE','CREATE'] as $missing) {
 $p=array_values(array_diff(['SELECT','INSERT','UPDATE','CREATE'],[$missing]));
 denies(fn()=>Guard::grants(['GRANT '.implode(', ',$p).' ON `karban_financial_test`.* TO `karban_test`@`localhost`']),'missing required privilege '.$missing);
}
denies(fn()=>Guard::grants(['GRANT SELECT, INSERT, UPDATE, CREATE ON `karban_financial_test`.* TO `karban_test`@`localhost`'],true),'cleanup missing DROP');
Guard::grants(['GRANT SELECT, INSERT ON `karban_financial_test`.* TO `karban_test`@`localhost`','GRANT UPDATE, CREATE ON `karban_financial_test`.* TO `karban_test`@`localhost`']);
$dir=sys_get_temp_dir().'/task10e-offline-'.bin2hex(random_bytes(8)); mkdir($dir,0700); $path=$dir.'/config.json'; file_put_contents($path,json_encode($c)); chmod($path,0600);
try {
 check(Guard::read_private($path,dirname(__DIR__,2))===$c,'private synthetic config');
 $input=fopen($path,'rb'); try { Guard::private_stdin($input); } finally { fclose($input); }
 chmod($path,0644); clearstatcache(); $input=fopen($path,'rb'); try { denies(fn()=>Guard::private_stdin($input),'real public-mode input rejected'); } finally { fclose($input); }
 chmod($path,0600);
 chmod($path,0644); clearstatcache(); denies(fn()=>Guard::read_private($path,dirname(__DIR__,2)), 'public config'); chmod($path,0600);
 symlink($path,$dir.'/link'); denies(fn()=>Guard::read_private($dir.'/link',dirname(__DIR__,2)), 'symlink config');
 denies(fn()=>Guard::read_private(__FILE__,dirname(__DIR__,2)), 'in-project config');
 $json=json_encode(Guard::plan()); check(!str_contains($json,$c['password']), 'plan redaction'); check(!class_exists('wpdb',false),'no wpdb loaded');
} finally { unlink($dir.'/link'); unlink($path); rmdir($dir); }
$cli=__DIR__.'/task10e.php'; check(is_file($cli),'CLI entrypoint missing');
$source=file_get_contents($cli); check(str_contains($source,"Guard::plan()"),'dry-run plan');
check(!class_exists('wpdb',false),'still no driver loaded');
// These pure safety functions must reject unsafe stdin and worker identities before any connection.
check(method_exists(Guard::class,'private_stdin'),'private stdin validator missing');
check(method_exists(Guard::class,'private_input_stat'),'private input stat validator missing');
foreach ([0010600,0140600,0020600,0100644] as $mode) { denies(fn()=>Guard::private_input_stat(['mode'=>$mode,'uid'=>posix_geteuid()]),'nonprivate/nonregular stdin'); }
Guard::private_input_stat(['mode'=>0100600,'uid'=>posix_geteuid()]);
$pipe=fopen('php://memory','r+'); denies(fn()=>Guard::private_stdin($pipe),'unrecognized input stream'); fclose($pipe);
require __DIR__.'/task10e/shims.php';
require __DIR__.'/task10e/runtime.php';
require __DIR__.'/task10e/suite.php';
check(method_exists(Task10E\Workers::class,'finish_owned'),'TERM-only child control missing');
$signals=[]; $reaped=0; $waits=0;
$done=Task10E\Workers::finish_owned(fn()=>true,function($signal) use (&$signals) { $signals[]=$signal; },function() use (&$reaped) { $reaped++; },function() use (&$waits) { $waits++; });
check($done===false && $signals===[15,15] && $reaped===0 && $waits===20,'running child bounded TERM only, never blocking reap');
$done=Task10E\Workers::finish_owned(fn()=>false,function() { throw new RuntimeException('must not signal stopped child'); },function() use (&$reaped) { $reaped++; },fn()=>null);
check($done && $reaped===1,'exited owned child reaped once');
$poll=0; $reaped=0;
$done=Task10E\Workers::finish_owned(function() use (&$poll) { return $poll++===0; },function() { throw new RuntimeException('synthetic child already exited during TERM'); },function() use (&$reaped) { $reaped++; },fn()=>null);
check($done && $reaped===1,'TERM/exited race remains bounded and reaps only exited child');
check(method_exists(Task10E\Workers::class,'private_packet'),'private worker packet missing');
$owned=Task10E\Workers::private_packet($c,['action'=>'create','owner'=>900001,'value'=>'12345678-1234-4234-8234-123456789abc']);
try { check((fileperms($owned['directory'])&0777)===0700 && (fileperms($owned['file'])&0777)===0600,'worker private permissions'); check(Guard::read_private($owned['file'],dirname(__DIR__,2))['config']===$c,'private synthetic worker packet'); } finally { unlink($owned['file']); rmdir($owned['directory']); }
$manifest=['version'=>1,'database'=>$c['database'],'prefix'=>$c['prefix'],'tables'=>$tables,'created'=>[],'installation_id'=>'12345678-1234-4234-8234-123456789abc'];
$runtime=new Task10E\Runtime($c,$manifest); $runtime->validate_manifest();
$GLOBALS['wpdb']=(object)['prefix'=>$c['prefix'],'users'=>$tables[0]]; // metadata only, NO ambient-state fake.
$runtime->context(); $ddl=$runtime->ddl(); check(count($ddl)===5,'authoritative five-table DDL');
foreach ($ddl as $q) { check(str_contains($q,'ENGINE=InnoDB'),'InnoDB required'); Guard::sql($q,$tables); }
denies(fn()=>Guard::sql('CREATE TABLE '.$tables[0].' (ID VARCHAR(32) NOT NULL, PRIMARY KEY (ID)) ENGINE=InnoDB',$tables),'DDL must exactly match authoritative registered fixture definition');
check(method_exists(Guard::class,'sql_mode'),'SQL literal mode guard missing');
Guard::sql_mode('STRICT_TRANS_TABLES,NO_ZERO_DATE');
denies(fn()=>Guard::sql_mode('NO_BACKSLASH_ESCAPES'),'ambiguous backslash literal interpretation');
$inventoryCount=0;
foreach (['wallet-manager','local-topup-service','local-payment-schema','local-payment-policy','local-payment-quarantine','transactional-unit-of-work','local-payment-rate-limiter'] as $file) {
 $actual=file_get_contents(ABSPATH.'wp-content/plugins/karban-core/includes/payments/class-'.$file.'.php');
 preg_match_all('~["\']((?:SELECT|SHOW|UPDATE) [^"\'\\r\\n]+)["\']~',$actual,$matches);
 foreach ($matches[1] as $template) {
  if ($template==='SELECT ID FROM ') { $variants=['SELECT ID FROM '.$tables[0].' WHERE ID = 900001 FOR UPDATE']; }
  else {
   $table=match(true) { str_contains($template,'singleton_id')=>$tables[4],str_contains($template,'owner_id')=>$tables[3],$file==='local-payment-rate-limiter'=>$tables[2],in_array($file,['local-payment-policy','local-payment-quarantine'],true)=>$tables[4],default=>$tables[1] };
   $q=str_replace(['{$this->table()}','{$marker_table}','{$table}','{$suffix}','{$lock}','{$field}','%d','%s'],[$tables[1],$tables[4],$table,'','','uuid','900001',"'synthetic'"],$template);
   $variants=[$q];
   if (str_contains($template,'{$suffix}') || str_contains($template,'{$lock}')) { $variants[]=$q.' FOR UPDATE'; }
   if (str_contains($template,'{$field}')) { $variants[]=str_replace('AND uuid =','AND request_key =',$q); }
   if ($template==='SHOW TABLE STATUS WHERE Name = %s') { $variants=array_map(fn($t)=>"SHOW TABLE STATUS WHERE Name = '$t'",$tables); }
  }
  foreach ($variants as $q) { Guard::sql($q,$tables); $inventoryCount++; }
 }
}
check($inventoryCount>=25,'actual source SQL inventory missing');
// Actual wpdb INSERT/UPDATE emission format, with real service/fixture column sequences.
$insertColumns=[['ID'],['user_id','amount','balance_after','type','reference_type','reference_id','effect_key','description','meta','created_at'],['bucket','identifier','count','window_start'],['uuid','owner_id','purpose','catalog_version','pack_id','amount_irt','request_key','state','ledger_id','created_at','updated_at','expires_at','provenance','installation_id','origin_hash','intent_hash'],['singleton_id','installation_id','origin_hash','provenance','first_credit_at']];
foreach ($insertColumns as $index=>$cols) {
 $q='INSERT INTO `'.$tables[$index].'` (`'.implode('`, `',$cols).'`) VALUES ('.implode(', ',array_fill(0,count($cols),"'synthetic; FROM unrelated_fixture -- ''quoted'''")).')';
 Guard::sql($q,$tables); // Delimiters inside a correctly escaped literal remain DATA.
 denies(fn()=>Guard::sql($q.', (1)',$tables),'multirow insert outside finite forms');
}
foreach (['UPDATE `'.$tables[3].'` SET `state` = \'succeeded\', `ledger_id` = \'1\', `updated_at` = \'now\' WHERE `uuid` = \'uuid\' AND `owner_id` = \'900001\' AND `state` = \'pending\'','UPDATE `'.$tables[2].'` SET `count` = 1, `window_start` = \'now\' WHERE `bucket` = \'bucket\' AND `identifier` = \'id\''] as $q) { Guard::sql($q,$tables); }
foreach ([['action'=>'create','owner'=>1,'value'=>'12345678-1234-4234-8234-123456789abc'], ['action'=>'kill','owner'=>900001,'value'=>'12345678-1234-4234-8234-123456789abc']] as $j) { denies(fn()=>Task10E\Workers::validate_job($j),'worker identity'); }
unset($GLOBALS['wpdb']);
check(property_exists($runtime,'factory_attempts') && $runtime->factory_attempts===0 && $runtime->connections===[],'offline runtime never calls factory');
echo "PASS Task10E offline safety guards, 5 authoritative DDLs and {$inventoryCount} actual-source SQL variants (factory attempts=0; no SQL execution, workers or signals)\n";
