<?php
/** Isolated actual-core wpdb seam fixtures; mysqli transport is disabled/replaced, never connected. */
declare(strict_types=1);
$plugin = rtrim($argv[1] ?? '/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core', '/');
if (($argv[2] ?? '') !== '--isolated-child') {
 $disabled = ['mysqli_init','mysqli_real_connect','mysqli_connect','mysqli_query','mysqli_errno','mysqli_error','mysqli_select_db','mysqli_get_server_info','mysqli_thread_id','mysqli_close','mysqli_affected_rows','mysqli_insert_id','mysqli_ping','mysqli_real_escape_string','mysqli_set_charset','mysqli_more_results','mysqli_next_result','mysqli_multi_query','mysqli_real_query','mysqli_execute_query','fsockopen','pfsockopen','stream_socket_client','socket_connect','curl_exec','curl_multi_exec'];
 $command=[PHP_BINARY,'-n','-d','disable_functions='.implode(',',$disabled),__FILE__,$plugin,'--isolated-child'];
 $process=proc_open($command,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 if (!is_resource($process)) {fwrite(STDERR,"Unable to start isolated fixture\n");exit(1);}
 fclose($pipes[0]);$stdout=stream_get_contents($pipes[1]);$stderr=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$status=proc_close($process);echo $stdout;if($stderr!=='')fwrite(STDERR,$stderr);exit($status);
}
// Fail before any core include if the transport disabling contract was not applied.
foreach(['mysqli_init','mysqli_real_connect','mysqli_query','mysqli_connect','mysqli_ping','mysqli_real_query','mysqli_multi_query','mysqli_execute_query','fsockopen','pfsockopen','stream_socket_client','socket_connect','curl_exec','curl_multi_exec'] as $function) {
 if (function_exists($function) && (new ReflectionFunction($function))->isInternal()) {fwrite(STDERR,"Unsafe fixture transport boundary\n");exit(1);}
}
define('ABSPATH',__DIR__.'/');define('WP_DEBUG',false);define('WP_DEBUG_DISPLAY',false);
final class WP_Error { public function __construct(public string $code,public string $message='',public array $data=[]) {} public function get_error_code() {return $this->code;} }
function is_wp_error($v) {return $v instanceof WP_Error;}
function apply_filters($hook,$value,...$args) {return $value;}
function __($v) {return $v;}
function wp_debug_backtrace_summary(...$args) {return 'offline fixture';}
function wp_load_translations_early() {throw new RuntimeException('raw initialization error path');}
function did_action($hook) {return 0;}
function is_multisite() {return false;}
function absint($v) {return abs((int)$v);}
function wp_die(...$args) {throw new RuntimeException('wp_die forbidden');}
function has_filter(...$args) {return true;}
function add_filter(...$args) {}
function driver_warning(string $operation): bool {
 if (($GLOBALS['driver']['warning_target'] ?? null)!==$operation) return false;
 $GLOBALS['driver']['warning_count']=($GLOBALS['driver']['warning_count']??0)+1;
 trigger_error('SYNTHETIC_PRIVATE_DRIVER_DETAIL',E_USER_WARNING);
 return true;
}
$GLOBALS['driver']=[];
function reset_driver() { $GLOBALS['driver']=['handles'=>[],'connects'=>0,'queries'=>[],'next'=>100,'connect_fail'=>false,'select_fail'=>false,'fail_sql'=>null,'failure_errno'=>2006,'error'=>'','closes'=>0]; }
function state(mysqli $h): array {return $GLOBALS['driver']['handles'][spl_object_id($h)];}
function set_state(mysqli $h,array $values): void {$id=spl_object_id($h);$GLOBALS['driver']['handles'][$id]=array_replace($GLOBALS['driver']['handles'][$id],$values);}
// Zero-argument mysqli construction allocates an UNCONNECTED extension object.
// Every function which could connect or issue SQL is disabled above and replaced.
if (($argv[2] ?? '') === '--isolated-child') {
function mysqli_init() { $h=new mysqli();$GLOBALS['driver']['handles'][spl_object_id($h)]=['thread'=>++$GLOBALS['driver']['next'],'errno'=>0,'error'=>'','alive'=>false];return $h; }
function mysqli_real_connect($h,...$args) { $GLOBALS['driver']['connects']++;if($GLOBALS['driver']['connect_fail'])throw new RuntimeException('synthetic connect failure');set_state($h,['alive'=>true]);return true; }
function mysqli_query($h,$sql) {
 $GLOBALS['driver']['queries'][]=[state($h)['thread'],$sql];
 if (driver_warning('query')) {set_state($h,['errno'=>1064,'error'=>'SYNTHETIC_PRIVATE_DRIVER_DETAIL']);return false;}
 if($sql==='DO 1'&&!state($h)['alive'])return false;
 if($GLOBALS['driver']['fail_sql']===$sql) { $GLOBALS['driver']['fail_sql']=null;set_state($h,['errno'=>$GLOBALS['driver']['failure_errno'],'error'=>'private synthetic SQL failure','alive'=>false]);return false; }
 set_state($h,['errno'=>0,'error'=>'']);if($sql==='SELECT @@SESSION.sql_mode')return false;return true;
}
function mysqli_errno($h) {return state($h)['errno'];}
function mysqli_error($h) {return state($h)['error'];}
function mysqli_select_db($h,$db) {return !$GLOBALS['driver']['select_fail'];}
function mysqli_get_server_info($h) {if(driver_warning('server_info'))throw new RuntimeException('SYNTHETIC_PRIVATE_DRIVER_DETAIL');return '10.4.28-MariaDB';}
function mysqli_thread_id($h) {if(driver_warning('thread'))throw new RuntimeException('SYNTHETIC_PRIVATE_DRIVER_DETAIL');return state($h)['thread'];}
function mysqli_close($h) {$GLOBALS['driver']['closes']++;if(driver_warning('close'))throw new RuntimeException('SYNTHETIC_PRIVATE_DRIVER_DETAIL');set_state($h,['alive'=>false]);return true;}
function mysqli_affected_rows($h) {return 1;}
function mysqli_insert_id($h) {return 123;}
function mysqli_real_escape_string($h,$value) {if(driver_warning('escape'))throw new RuntimeException('SYNTHETIC_PRIVATE_DRIVER_DETAIL');return addslashes($value);}
function mysqli_set_charset($h,$charset) {return true;}
function mysqli_more_results($h) {return false;}
function mysqli_next_result($h) {return false;}
}
require dirname($plugin,3).'/wp-includes/class-wpdb.php';
require $plugin.'/includes/class-autoloader.php';define('NAHAN_CORE_DIR',$plugin.'/');Nahan\Core\Autoloader::register();
use Nahan\Core\Payments\FinancialConnection;
function ok($v,$m='assertion') {if(!$v)throw new RuntimeException($m);}
function eq($a,$b,$m='equality') {ok($a===$b,$m);}
function error_code($v,$code) {ok(is_wp_error($v),'controlled error expected');eq($code,$v->code);}
function open_connection() {return FinancialConnection::from_configuration('fixture-user','synthetic-not-secret','fixture-db','fixture-host','wp_');}
function sql_count($sql) {return count(array_filter($GLOBALS['driver']['queries'],fn($q)=>$q[1]===$sql));}
$tests=[];
$tests['control actual installed wpdb reconnects and replays the failed statement'] = function() {
 reset_driver();$db=new wpdb('fixture-user','synthetic-not-secret','fixture-db','fixture-host');$sql='UPDATE wp_nahan_wallet_transactions SET amount=1';$GLOBALS['driver']['fail_sql']=$sql;
 eq(1,$db->query($sql));eq(2,sql_count($sql));eq(2,$GLOBALS['driver']['connects']);ok(sql_count('DO 1')===1);
};
$tests['prototype class exists'] = function() {ok(class_exists(FinancialConnection::class),'Non-replaying prototype is not implemented');};
$tests['adapter inherits actual core query but refuses reconnect and statement replay'] = function() {
 reset_driver();$db=open_connection();ok($db instanceof FinancialConnection);$sql='UPDATE wp_nahan_wallet_transactions SET amount=1';$GLOBALS['driver']['fail_sql']=$sql;
 eq(false,$db->query($sql));eq(1,sql_count($sql));eq(1,$GLOBALS['driver']['connects']);eq(0,sql_count('DO 1'));error_code($db->failure(),'financial_connection_lost');
 eq(false,$db->query('ROLLBACK'));eq(false,$db->query($sql));eq(1,sql_count($sql));eq(0,sql_count('ROLLBACK'));eq(false,$db->db_connect());eq(false,$db->check_connection());eq(1,$GLOBALS['driver']['connects']);
};
$tests['lost COMMIT is uncertain sticky and never retried or called rolled back'] = function() {
 reset_driver();$db=open_connection();eq(0,$db->query('START TRANSACTION'));$GLOBALS['driver']['fail_sql']='COMMIT';eq(false,$db->query('COMMIT'));error_code($db->failure(),'financial_commit_uncertain');eq(false,$db->query('ROLLBACK'));eq(1,sql_count('COMMIT'));eq(0,sql_count('ROLLBACK'));eq(1,$GLOBALS['driver']['connects']);
};
$tests['ordinary statement errors poison the connection without fallback or leaking SQL'] = function() {
 reset_driver();$db=open_connection();$GLOBALS['driver']['failure_errno']=1064;$GLOBALS['driver']['fail_sql']='UPDATE fixture SET amount=1';eq(false,$db->query('UPDATE fixture SET amount=1'));error_code($db->failure(),'financial_storage_unavailable');eq(false,$db->query('INSERT INTO fixture VALUES (1)'));eq(0,sql_count('INSERT INTO fixture VALUES (1)'));ok(!str_contains($db->last_error,'private'));ok(!str_contains($db->last_error,'UPDATE'));eq(1,$GLOBALS['driver']['connects']);
};
$tests['factory initial connection and database selection failures are controlled no-bail no retry'] = function() {
 foreach(['connect_fail','select_fail'] as $mode) { reset_driver();$GLOBALS['driver'][$mode]=true;ob_start();$result=open_connection();$output=ob_get_clean();error_code($result,'financial_connection_unavailable');eq('',$output);eq(1,$GLOBALS['driver']['connects']); }
};
$tests['factory rejects persistent host invalid prefix and missing runtime configuration before native calls'] = function() {
 reset_driver();error_code(FinancialConnection::from_configuration('u','p','d','p:fixture-host','wp_'),'financial_connection_unavailable');error_code(FinancialConnection::from_configuration('u','p','d','fixture-host','bad-prefix!'),'financial_connection_unavailable');error_code(FinancialConnection::from_wordpress(),'financial_connection_unavailable');eq(0,$GLOBALS['driver']['connects']);
};
$tests['explicit reconnect attempts and magic handle replacement permanently poison without connecting'] = function() {
 reset_driver();$db=open_connection();eq(false,$db->db_connect());error_code($db->failure(),'financial_connection_lost');eq(false,$db->query('COMMIT'));eq(1,$GLOBALS['driver']['connects']);
 reset_driver();$db=open_connection();$db->dbh=new stdClass();error_code($db->failure(),'financial_connection_lost');eq(false,$db->query('UPDATE fixture SET amount=1'));eq(0,sql_count('UPDATE fixture SET amount=1'));eq(1,$GLOBALS['driver']['connects']);
};
$tests['initial setup loss cannot yield a ready connection and inherited setup mutators cannot bypass poison'] = function() {
 reset_driver();$GLOBALS['driver']['fail_sql']='SELECT @@SESSION.sql_mode';error_code(open_connection(),'financial_connection_unavailable');eq(1,$GLOBALS['driver']['connects']);
 reset_driver();$db=open_connection();$before=count($GLOBALS['driver']['queries']);$db->set_sql_mode(['STRICT_TRANS_TABLES']);error_code($db->failure(),'financial_connection_lost');eq($before,count($GLOBALS['driver']['queries']));$db->set_charset(null,'ascii');eq($before,count($GLOBALS['driver']['queries']));
};
$tests['closed handle and debug logging never leak or issue another statement'] = function() {
 reset_driver();$db=open_connection();$db->close();eq(false,$db->query('COMMIT'));error_code($db->failure(),'financial_connection_lost');eq(0,sql_count('COMMIT'));eq(1,$GLOBALS['driver']['connects']);eq(null,$db->dbh);
};
$tests['review warning regression actual core query suppresses changed driver report-mode detail'] = function() {
 reset_driver();$db=open_connection();$GLOBALS['driver']['warning_target']='query';$captured=[];$prior=error_reporting(E_ALL);
 set_error_handler(function($severity,$message) use (&$captured) {if(error_reporting()&$severity)$captured[]=$message;return true;});
 ob_start();mysqli_report(MYSQLI_REPORT_ERROR);
 try {eq(false,$db->query('UPDATE fixture SET amount=1'));$output=ob_get_contents();}finally{ob_end_clean();restore_error_handler();error_reporting($prior);mysqli_report(MYSQLI_REPORT_OFF);}
 eq([],$captured,'unmasked native details must not reach display/logging handlers');eq('',$output);eq(1,$GLOBALS['driver']['warning_count']);error_code($db->failure(),'financial_storage_unavailable');eq(1,sql_count('UPDATE fixture SET amount=1'));eq(1,$GLOBALS['driver']['connects']);
};
$tests['review warning regression pin escape server-info close and initial setup are bounded'] = function() {
 foreach(['thread','escape','server_info','close','initial_thread'] as $surface) {
  reset_driver();$db=$surface==='initial_thread'?null:open_connection();$GLOBALS['driver']['warning_target']=$surface==='initial_thread'?'thread':$surface;$captured=[];$thrown=null;$prior=error_reporting(E_ALL);
  set_error_handler(function($severity,$message) use (&$captured) {if(error_reporting()&$severity)$captured[]=$message;return true;});ob_start();
  try {match($surface){'thread'=>$db->query('UPDATE fixture SET amount=1'),'escape'=>$db->_real_escape('synthetic value'),'server_info'=>$db->db_server_info(),'close'=>$db->close(),'initial_thread'=>open_connection()};}catch(Throwable $e){$thrown=$e->getMessage();}finally{$output=ob_get_clean();restore_error_handler();error_reporting($prior);}
  eq([],$captured,'unmasked warning on '.$surface);eq('',$output);eq(null,$thrown,'raw exception on '.$surface);eq(1,$GLOBALS['driver']['warning_count']);eq(1,$GLOBALS['driver']['connects']);
 }
};
$failed=0;foreach($tests as $name=>$test) {try{$test();echo "PASS $name\n";}catch(Throwable $e){$failed++;echo "FAIL $name: ".$e->getMessage()."\n";}}echo count($tests)." tests, $failed failed\n";exit($failed?1:0);
