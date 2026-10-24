<?php
/** Offline source fixtures only: no WP bootstrap, database, network or financial effects. */
declare(strict_types=1);
define('ABSPATH', __DIR__ . '/');
define('ARRAY_A', 'ARRAY_A');
define('NAHAN_CORE_DIR', rtrim($argv[1] ?? '/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core', '/') . '/');
final class WP_Error {
 public function __construct(public string $code, public string $message = '', public array $data = []) {}
 public function get_error_code(): string { return $this->code; }
}
function is_wp_error($v): bool { return $v instanceof WP_Error; }
function get_option($k, $d = false) { return array_key_exists($k,$GLOBALS['options']) ? $GLOBALS['options'][$k] : $d; }
function add_option($k, $v, $deprecated = '', $autoload = false) { if (isset($GLOBALS['options'][$k]) || $GLOBALS['option_fail']) return false; $GLOBALS['options'][$k]=$v; $GLOBALS['writes']++; return true; }
function update_option($k, $v, $autoload = false) { if ($GLOBALS['option_fail']) return false; $GLOBALS['options'][$k]=$v; $GLOBALS['writes']++; return true; }
function wp_generate_uuid4() { return '12345678-1234-4234-8234-123456789abc'; }
function wp_parse_url($url) { return parse_url($url); }
function wp_get_environment_type() { return 'local'; }
function current_time($type, $gmt = false) { return '2026-10-22 12:00:00'; }
function add_action($name, $callback, ...$rest) { $GLOBALS['hooks'][$name]=$callback; }
function current_user_can($cap) { return $GLOBALS['admin'] && $cap==='manage_options'; }
function check_admin_referer($action, $field='_wpnonce') { if (($GLOBALS['nonce'] ?? '') !== $action) throw new RuntimeException('nonce'); }
function wp_die($message) { throw new RuntimeException('denied'); }
function wp_safe_redirect($url) { throw new RuntimeException('redirect'); }
function add_query_arg($args,$url) { return $url; }
function admin_url($path='') { return 'http://localhost/karban/wp-admin/'.$path; }
function home_url($path='/') { return 'http://localhost/karban'.$path; }
function esc_html($v) { return htmlspecialchars((string)$v); }
function esc_attr($v) { return esc_html($v); }
function esc_url($v) { return esc_html($v); }
function wp_nonce_field($action, ...$rest) { return '<input value="'.$action.'" />'; }
require NAHAN_CORE_DIR.'includes/class-autoloader.php';
Nahan\Core\Autoloader::register();
use Nahan\Core\LocalDevelopmentGate;
use Nahan\Core\Payments\LocalPaymentCatalog;
use Nahan\Core\Payments\LocalPaymentPolicy;
use Nahan\Core\Payments\LocalPaymentSchema;
use Nahan\Core\Payments\LocalPaymentQuarantine;
use Nahan\Core\Payments\TransactionalUnitOfWork;
function ok($v,$message='assertion'): void { if (!$v) throw new RuntimeException($message); }
function eq($a,$b,$message='equality'): void { ok($a===$b,$message.' expected '.var_export($a,true).' actual '.var_export($b,true)); }
function error_code($v,$code): void { ok(is_wp_error($v),'expected controlled error '.$code);eq($code,$v->code); }
function context(array $overrides=[]): array { return array_replace(['local_development'=>true,'environment_type'=>'local','site_url'=>'http://localhost/karban/','remote_addr'=>'127.0.0.1','local_dev_payments'=>true],$overrides); }
function policy(array $overrides=[]): LocalPaymentPolicy { return new LocalPaymentPolicy(new LocalDevelopmentGate(context($overrides)),context($overrides)); }
function fixture_uow($q=null): TransactionalUnitOfWork {return new TransactionalUnitOfWork($q,$GLOBALS['wpdb']);}
function reset_fixture(): void { $GLOBALS['options']=[];$GLOBALS['writes']=0;$GLOBALS['option_fail']=false;$GLOBALS['admin']=true;$GLOBALS['nonce']='';$GLOBALS['hooks']=[];$GLOBALS['wpdb']=new MemoryDb();$_SERVER['REQUEST_METHOD']='POST';$_POST=[]; }
final class MemoryDb implements Nahan\Core\Payments\FinancialConnectionPort {
 public function prefix_value():string {return $this->prefix;}
 public function users_table():string {return $this->users;}
 public function failure():?WP_Error {return null;}
 public function get_col($q=null,$x=0) {return $this->get_results($q);}
 public function update($t,$data,$where,$format=null,$where_format=null) {return $this->query('UPDATE '.$t);}
 public string $prefix='wp_'; public string $users='wp_users';public string $last_error='';public array $tables=[];public array $queries=[];public mixed $ambient='0';public bool $fail=false;public bool $ddl_fail=false;public bool $corrupt_created=false;public int $insert_id=0;
 public function __construct() { foreach (['wp_users','wp_nahan_wallet_transactions','wp_nahan_subscriptions','wp_nahan_leads_unlocked'] as $t) $this->tables[$t]=['Engine'=>'InnoDB','columns'=>[],'indexes'=>[]];$this->tables['wp_nahan_wallet_transactions']['indexes']=[['Key_name'=>'effect_key','Non_unique'=>'0','Seq_in_index'=>'1','Column_name'=>'effect_key','Sub_part'=>null]]; }
 public function suppress_errors($value=true) { return false; }
 public function prepare($q,...$args) { foreach ($args as $a) $q=preg_replace('/%[sd]/',is_int($a)?(string)$a:"'".str_replace("'","''",(string)$a)."'",$q,1);return $q; }
 private function read($q): void { $this->queries[]=$q;$this->last_error=$this->fail?'private fixture failure':''; }
 public function get_row($q=null,$mode='OBJECT',$y=0) { $this->read($q);if($this->fail)return null;if(str_starts_with($q,'SHOW TABLE STATUS')) { preg_match("/Name = '([^']+)'/",$q,$m);$t=$m[1]??'';return isset($this->tables[$t])?['Name'=>$t,'Engine'=>$this->tables[$t]['Engine']]:null; }if(str_contains($q,'local_payment_provenance'))return $this->tables['wp_nahan_local_payment_provenance']['row']??null;return null; }
 public function get_var($q=null,$x=0,$y=0) { $this->read($q);if($this->fail)return null;if($q==='SELECT @@SESSION.in_transaction')return $this->ambient;if(str_contains($q,'SELECT ID FROM wp_users'))return '7';return null; }
 public function get_results($q=null,$mode='OBJECT') { $this->read($q);if($this->fail)return null;foreach($this->tables as $t=>$data) { if($q==='SHOW FULL COLUMNS FROM '.$t)return $data['columns'];if($q==='SHOW INDEX FROM '.$t)return $data['indexes']; }return []; }
 public function query($q) { $this->queries[]=$q;$this->last_error='';if(str_starts_with($q,'CREATE TABLE')) { if($this->ddl_fail)return false;preg_match('/CREATE TABLE ([a-z0-9_]+)/',$q,$m);$t=$m[1];$columns=[];$indexes=[];foreach(explode("\n",$q) as $line) { if(preg_match('/^\s*([a-z_]+) ((?:bigint|tinyint|varchar|char|datetime)[^,]*),?$/i',trim($line),$c)) { $sql=$c[2];preg_match('/^([a-z]+(?:\([0-9]+\))?(?: unsigned)?)/i',$sql,$type);$columns[]=['Field'=>$c[1],'Type'=>strtolower($type[1]),'Null'=>str_contains($sql,'NOT NULL')?'NO':'YES','Collation'=>str_contains($sql,'ascii_bin')?'ascii_bin':null]; }if(preg_match('/(PRIMARY KEY|UNIQUE KEY ([a-z_]+)) \(([^)]+)\)/',$line,$i)) { foreach(explode(',',$i[3]) as $n=>$col)$indexes[]=['Key_name'=>$i[1]==='PRIMARY KEY'?'PRIMARY':$i[2],'Non_unique'=>0,'Seq_in_index'=>$n+1,'Column_name'=>trim($col),'Sub_part'=>null]; }}$this->tables[$t]=['Engine'=>'InnoDB','columns'=>$columns,'indexes'=>$indexes];if($this->corrupt_created)$this->tables[$t]['Engine']='MyISAM'; }return 1; }
 public function insert($t,$row,$format=null) { $this->queries[]='INSERT '.$t;if($this->ddl_fail)return false;$this->tables[$t]['row']=$row;$this->insert_id=1;return 1; }
}
$tests=[];
$tests['foundation classes exist'] = function() { ok(class_exists(LocalPaymentCatalog::class),'Task10A catalog is not implemented');ok(class_exists(LocalPaymentSchema::class));ok(class_exists(LocalPaymentPolicy::class));ok(class_exists(LocalPaymentQuarantine::class)); };
$tests['versioned packs and exact safe arithmetic'] = function() { $c=new LocalPaymentCatalog();eq('local-irt-v1',$c::VERSION);eq([10000,50000,100000],array_column($c->packs(),'amountIRT'));eq(50000,$c->pack('irt-50000')['amountIRT']);foreach(['50000','irt-50000.0','',10000] as $p)error_code($c->pack($p),'local_payment_invalid_pack');eq(9007199254740991,$c->add(9007199254730991,10000));foreach([[9007199254740991,1],[-1,1],[0,0],['100',10000],[1.5,1]] as $args)error_code($c->add(...$args),'local_payment_invalid_amount'); };
$tests['unarmed and malformed policy never authorize or write'] = function() { reset_fixture();$p=policy();ok(!$p->is_enabled());eq(0,$GLOBALS['writes']);foreach([null,false,[],['armed'=>true]] as $bad) { $GLOBALS['options'][LocalPaymentPolicy::OPTION]=$bad;ok(!$p->is_enabled()); }eq(0,$GLOBALS['writes']); };
$tests['schema upgrade is explicit idempotent and does not arm'] = function() { reset_fixture();$s=new LocalPaymentSchema();ok(!$s->is_ready());eq(0,$GLOBALS['writes']);eq(true,$s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));ok($s->is_ready());ok(!policy()->is_enabled());$before=$GLOBALS['writes'];$queries=count($GLOBALS['wpdb']->queries);eq(true,$s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));eq($before,$GLOBALS['writes']);foreach(array_slice($GLOBALS['wpdb']->queries,$queries) as $q)ok(!str_starts_with($q,'CREATE')&&!str_starts_with($q,'INSERT')); };
$tests['arming bound to private installation and canonical direct request gate'] = function() { reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));eq(true,policy()->arm(LocalPaymentPolicy::ARM_CONFIRMATION));ok(policy()->is_enabled());eq(true,policy(['site_url'=>'HTTP://LOCALHOST:80/karban/'])->is_enabled());foreach([['local_dev_payments'=>1],['local_dev_payments'=>false],['environment_type'=>'development'],['remote_addr'=>'10.0.0.1'],['remote_addr'=>'127.0.0.2'],['site_url'=>'http://localhost/other'],['site_url'=>'http://user@localhost/karban'],['site_url'=>'http://localhost/karban?x=1'],['site_url'=>'https://example.test'],['site_url'=>'http://localhost/karban/../other']] as $over)ok(!policy($over)->is_enabled(),'invalid gate must close');$GLOBALS['options'][LocalPaymentPolicy::IDENTITY_OPTION]='another-id';ok(!policy()->is_enabled()); };
$tests['arming requires exact confirmation readiness and readback'] = function() { reset_fixture();error_code(policy()->arm(LocalPaymentPolicy::ARM_CONFIRMATION),'local_payment_schema_not_ready');eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));error_code(policy()->arm('yes'),'local_payment_confirmation_required');$GLOBALS['option_fail']=true;error_code(policy()->arm(LocalPaymentPolicy::ARM_CONFIRMATION),'local_payment_policy_unavailable');ok(!policy()->is_enabled()); };
$tests['readiness fails on engine column prefix collation or index mutation and query errors'] = function() { reset_fixture();$s=new LocalPaymentSchema();eq(true,$s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));$db=$GLOBALS['wpdb'];$snapshot=$db->tables;foreach(['wp_users','wp_nahan_wallet_transactions','wp_nahan_local_payment_intents','wp_nahan_local_payment_provenance'] as $t) { $db->tables[$t]['Engine']='MyISAM';ok(!$s->is_ready());$db->tables=$snapshot; }$t='wp_nahan_local_payment_intents';foreach(['column','collation','prefix','unique','order'] as $mutation) { if($mutation==='column')array_pop($db->tables[$t]['columns']);if($mutation==='collation')$db->tables[$t]['columns'][0]['Collation']='utf8mb4_general_ci';if($mutation==='prefix')$db->tables[$t]['indexes'][0]['Sub_part']=10;if($mutation==='unique')$db->tables[$t]['indexes'][0]['Non_unique']=1;if($mutation==='order')$db->tables[$t]['indexes'][2]['Seq_in_index']=1;ok(!$s->is_ready(),$mutation);$db->tables=$snapshot; }$db->fail=true;ok(!$s->is_ready()); };
$tests['missing upgraded marker is never recreated and failed DDL never ready'] = function() { reset_fixture();$s=new LocalPaymentSchema();eq(true,$s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));unset($GLOBALS['wpdb']->tables['wp_nahan_local_payment_provenance']);error_code($s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready');reset_fixture();$GLOBALS['wpdb']->ddl_fail=true;error_code($s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready');ok(!$s->is_ready()); };
$tests['legacy untracked allowed only without any local-payment evidence'] = function() { reset_fixture();$q=new LocalPaymentQuarantine(policy(['local_dev_payments'=>false]));eq([], $q->required_tables());eq(true,$q->assert_allowed());$GLOBALS['options'][LocalPaymentSchema::OPTION]=1;error_code($q->required_tables(),'local_payment_quarantined');reset_fixture();error_code((new LocalPaymentQuarantine(policy()))->assert_allowed(),'local_payment_quarantined');reset_fixture();$GLOBALS['wpdb']->fail=true;error_code($q->assert_allowed(),'local_payment_quarantined'); };
$tests['sticky first-credit marker survives disarm nonlocal copied origin and query errors'] = function() { reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));eq(true,policy()->arm(LocalPaymentPolicy::ARM_CONFIRMATION));$t='wp_nahan_local_payment_provenance';$GLOBALS['wpdb']->tables[$t]['row']['first_credit_at']='2026-10-22 12:01:00';$row=$GLOBALS['wpdb']->tables[$t]['row'];eq(true,(new LocalPaymentQuarantine(policy()))->assert_allowed());eq(true,policy()->disarm(LocalPaymentPolicy::DISARM_CONFIRMATION));foreach([[],['site_url'=>'https://example.test'],['site_url'=>'http://localhost/copied'],['environment_type'=>'production']] as $over)error_code((new LocalPaymentQuarantine(policy($over)))->assert_allowed(),'local_payment_quarantined');eq($row,$GLOBALS['wpdb']->tables[$t]['row']);$GLOBALS['wpdb']->fail=true;error_code((new LocalPaymentQuarantine(policy()))->assert_allowed(),'local_payment_quarantined');eq($row,$GLOBALS['wpdb']->tables[$t]['row']); };
$tests['UoW probes actual ambient state before transaction and preserves own joins'] = function() { reset_fixture();$u=fixture_uow(new LocalPaymentQuarantine(policy(['local_dev_payments'=>false])));eq(17,$u->run_for_user(7,[],fn()=>$u->run_for_user(7,[],fn()=>17)));eq(1,count(array_filter($GLOBALS['wpdb']->queries,fn($q)=>$q==='START TRANSACTION')));foreach(['1',null,'unknown'] as $state) { reset_fixture();$GLOBALS['wpdb']->ambient=$state;error_code($u->run_for_user(7,[],fn()=>true),$state==='1'?'financial_ambient_transaction':'financial_transaction_state_unavailable');ok(!in_array('START TRANSACTION',$GLOBALS['wpdb']->queries,true)); }reset_fixture();$GLOBALS['wpdb']->fail=true;error_code($u->run_for_user(7,[],fn()=>true),'financial_transaction_state_unavailable'); };
$tests['UoW locks account then installation marker before operation and declares marker engine'] = function() { reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));$u=fixture_uow(new LocalPaymentQuarantine(policy()));$GLOBALS['wpdb']->queries=[];eq('ran',$u->run_for_user(7,[],fn()=>'ran'));$sql=implode("\n",$GLOBALS['wpdb']->queries);ok(strpos($sql,'SELECT ID FROM wp_users')<strpos($sql,'WHERE singleton_id = 1 FOR UPDATE'));ok(str_contains($sql,"Name = 'wp_nahan_local_payment_provenance'"));$GLOBALS['wpdb']->tables['wp_nahan_local_payment_provenance']['row']['first_credit_at']='2026-10-22 12:00:00';error_code($u->run_for_user(7,[],fn()=>throw new RuntimeException('must not run')),'local_payment_quarantined');ok(in_array('ROLLBACK',$GLOBALS['wpdb']->queries,true)); };
$tests['registered admin callbacks deny capability GET nonce and unrelated seed confirmation'] = function() { reset_fixture();$a=new Nahan\Core\Admin\LocalDevelopmentTools(null,new LocalDevelopmentGate(context()),null,null,null,new LocalPaymentSchema(),policy(['local_payment_maintenance'=>true]));$a->register();foreach(['nahan_local_payment_upgrade','nahan_local_payment_arm','nahan_local_payment_disarm'] as $action) { ok(isset($GLOBALS['hooks']['admin_post_'.$action]));foreach(['cap','get','nonce','confirmation'] as $bad) { $GLOBALS['admin']=$bad!=='cap';$_SERVER['REQUEST_METHOD']=$bad==='get'?'GET':'POST';$GLOBALS['nonce']=$bad==='nonce'?'bad':$action;$_POST=['confirmation'=>'APPLY LOCAL DEMO SEED'];$before=$GLOBALS['writes'];try { ($GLOBALS['hooks']['admin_post_'.$action])();throw new LogicException('accepted bad request'); }catch(RuntimeException $e) { ok(!($e instanceof LogicException)); }eq($before,$GLOBALS['writes']); }} };
$tests['legacy gateway rejects marked disarmed installation before settings provider reads or log writes'] = function() { reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));$GLOBALS['wpdb']->tables['wp_nahan_local_payment_provenance']['row']['first_credit_at']='2026-10-22 12:00:00';$gateway=new Nahan\Core\Payments\PaymentGateway(new Nahan\Core\Admin\Settings(),new Nahan\Core\Payments\WalletManager(fixture_uow()));error_code($gateway->initiate(7,10000,'wallet_topup'),'local_payment_quarantined');error_code($gateway->verify('opaque','OK'),'local_payment_quarantined'); };
$tests['tracked clean provenance never regains banking even when explicitly opted out'] = function() { reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));error_code((new LocalPaymentQuarantine(policy(['local_dev_payments'=>false])))->assert_legacy_gateway_allowed(),'local_payment_quarantined'); };
$tests['outer table declaration cannot be expanded by nested joins'] = function() { reset_fixture();$u=fixture_uow(new LocalPaymentQuarantine(policy(['local_dev_payments'=>false])));error_code($u->run_for_user(7,[],fn()=>$u->run_for_user(7,['wp_nahan_wallet_transactions'],fn()=>true)),'financial_tables_not_declared');ok(!in_array('COMMIT',$GLOBALS['wpdb']->queries,true)); };
$tests['persisted schema version survives a fresh option read without accepting malformed versions'] = function() { reset_fixture();$s=new LocalPaymentSchema();eq(true,$s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));$GLOBALS['options'][LocalPaymentSchema::OPTION]='1';ok($s->is_ready(),'WP loads persisted numeric options as strings');foreach([true,'01',2,[],false] as $bad) { $GLOBALS['options'][LocalPaymentSchema::OPTION]=$bad;ok(!$s->is_ready()); } };
$tests['readiness includes intact provenance identity and row'] = function() { reset_fixture();$s=new LocalPaymentSchema();eq(true,$s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));$t='wp_nahan_local_payment_provenance';unset($GLOBALS['wpdb']->tables[$t]['row']);ok(!$s->is_ready(),'missing row cannot be ready');error_code($s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready'); };
$tests['ambiguous canonical schema origin writes nothing'] = function() { reset_fixture();error_code((new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context(['site_url'=>'http://localhost/karban/../copy'])),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready');eq(0,$GLOBALS['writes']); };
$tests['admin success callbacks execute only their separate operation and never seed'] = function() { reset_fixture();$a=new Nahan\Core\Admin\LocalDevelopmentTools(null,new LocalDevelopmentGate(context()),null,null,null,new LocalPaymentSchema(),policy(['local_payment_maintenance'=>true]));$a->register();foreach(['nahan_local_payment_upgrade'=>LocalPaymentSchema::UPGRADE_CONFIRMATION,'nahan_local_payment_arm'=>LocalPaymentPolicy::ARM_CONFIRMATION,'nahan_local_payment_disarm'=>LocalPaymentPolicy::DISARM_CONFIRMATION] as $action=>$confirmation) { $GLOBALS['nonce']=$action;$_POST=['confirmation'=>$confirmation];try { ($GLOBALS['hooks']['admin_post_'.$action])(); }catch(RuntimeException $e) { eq('redirect',$e->getMessage()); }if($action==='nahan_local_payment_upgrade')ok(!policy()->is_enabled());if($action==='nahan_local_payment_arm')ok(policy()->is_enabled());if($action==='nahan_local_payment_disarm')ok(!policy()->is_enabled()); }foreach(array_keys($GLOBALS['options']) as $key)ok(!str_contains($key,'seed')); };
$tests['direct loopback matrix ignores Host proxy query and cannot use fixture CLI bypass'] = function() {
 reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));eq(true,policy()->arm(LocalPaymentPolicy::ARM_CONFIRMATION));
 $_SERVER['HTTP_HOST']='attacker.example';$_SERVER['HTTP_X_FORWARDED_FOR']='127.0.0.1';$_GET=['local_dev_payments'=>'true'];
 ok(policy()->is_enabled());ok(policy(['remote_addr'=>'::1'])->is_enabled());
 foreach(['::ffff:127.0.0.1','127.0.0.2','localhost','', 'not-an-address'] as $peer)ok(!policy(['remote_addr'=>$peer,'cli'=>true])->is_enabled());
 foreach(['http://localhost.evil/karban','http://localhost/karban#fragment','http://localhost/karban%2Fcopy','http://localhost/karban//copy','ftp://localhost/karban'] as $url)ok(!policy(['site_url'=>$url])->is_enabled());
 unset($_SERVER['HTTP_HOST'],$_SERVER['HTTP_X_FORWARDED_FOR']);$_GET=[];
};
$tests['all existing mutation services reject sticky disarmed marker without financial writes'] = function() {
 reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));$db=$GLOBALS['wpdb'];$db->tables['wp_nahan_local_payment_provenance']['row']['first_credit_at']='2026-10-22 12:00:00';
 $wallet=new Nahan\Core\Payments\WalletManager(fixture_uow());$subscriptions=new Nahan\Core\Payments\SubscriptionManager($wallet);$leads=new Nahan\Core\Payments\LeadManager($wallet,$subscriptions);
 $GLOBALS['options']['nahan_subscription_plans']=['free'=>['price'=>0,'period'=>30]];$db->queries=[];
 error_code($wallet->credit(7,10000,'deposit'),'local_payment_quarantined');error_code($wallet->debit(7,10000,'withdraw'),'local_payment_quarantined');error_code($subscriptions->subscribe(7,'free'),'local_payment_quarantined');error_code($subscriptions->cancel(1,7),'local_payment_quarantined');error_code($leads->unlock(7,'project',123),'local_payment_quarantined');
 foreach($db->queries as $q)ok(!preg_match('/^(INSERT|UPDATE|DELETE)/',$q),'blocked service must not mutate');
};
$tests['schema never converts existing engines or silently repairs incompatible indexes'] = function() {
 reset_fixture();$s=new LocalPaymentSchema();$GLOBALS['wpdb']->tables['wp_nahan_wallet_transactions']['Engine']='MyISAM';error_code($s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready');eq(0,$GLOBALS['writes']);
 reset_fixture();$GLOBALS['wpdb']->tables['wp_nahan_wallet_transactions']['indexes'][0]['Sub_part']=64;error_code($s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready');eq(0,$GLOBALS['writes']);
 reset_fixture();eq(true,$s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));$t='wp_nahan_local_payment_intents';$GLOBALS['wpdb']->tables[$t]['indexes'][1]['Non_unique']=1;$before=count($GLOBALS['wpdb']->queries);error_code($s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready');foreach(array_slice($GLOBALS['wpdb']->queries,$before) as $q)ok(!preg_match('/^(ALTER|CREATE|INSERT)/',$q));
};
$tests['policy option readback mismatch never reports arming success'] = function() { reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));$GLOBALS['option_fail']=true;error_code(policy()->arm(LocalPaymentPolicy::ARM_CONFIRMATION),'local_payment_policy_unavailable');ok(!policy()->is_enabled()); };
$tests['private identity with lost table or row cannot be reclassified as a fresh clean schema'] = function() {
 reset_fixture();$GLOBALS['options'][LocalPaymentPolicy::IDENTITY_OPTION]=wp_generate_uuid4();error_code((new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready');ok(!isset($GLOBALS['wpdb']->tables['wp_nahan_local_payment_provenance']));
 reset_fixture();$s=new LocalPaymentSchema();eq(true,$s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));unset($GLOBALS['options'][LocalPaymentSchema::OPTION],$GLOBALS['wpdb']->tables['wp_nahan_local_payment_provenance']['row']);error_code($s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready');ok(!isset($GLOBALS['wpdb']->tables['wp_nahan_local_payment_provenance']['row']));
};
$tests['orphan intent table is evidence even when all policy identity version options are absent'] = function() { reset_fixture();$GLOBALS['wpdb']->tables['wp_nahan_local_payment_intents']=['Engine'=>'InnoDB','columns'=>[],'indexes'=>[]];error_code((new LocalPaymentQuarantine(policy(['local_dev_payments'=>false])))->required_tables(),'local_payment_quarantined'); };
$tests['review regression defined null is configured and only absent or strict false allow legacy absence'] = function() {
 reset_fixture();
 $absent=context();unset($absent['local_dev_payments']);
 eq(false,(new LocalPaymentPolicy(new LocalDevelopmentGate($absent),$absent))->opt_in_present());
 eq(false,policy(['local_dev_payments'=>false])->opt_in_present());
 foreach([null,0,1,'', 'false', [],true] as $malformedOrEnabled) {
  $p=policy(['local_dev_payments'=>$malformedOrEnabled]);
  eq(true,$p->opt_in_present(),'configured values are never absence');
  error_code((new LocalPaymentQuarantine($p))->required_tables(),'local_payment_quarantined');
 }
};
$tests['review regression bank admission denies explicit local mode even with clean provenance'] = function() {
 reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));
 error_code((new LocalPaymentQuarantine(policy()))->assert_legacy_gateway_allowed(),'local_payment_quarantined');
 error_code((new LocalPaymentQuarantine(policy(['local_dev_payments'=>false])))->assert_legacy_gateway_allowed(),'local_payment_quarantined');
};
$tests['review regression bank admission always denies taint even when local payments are armed'] = function() {
 reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));eq(true,policy()->arm(LocalPaymentPolicy::ARM_CONFIRMATION));
 $GLOBALS['wpdb']->tables['wp_nahan_local_payment_provenance']['row']['first_credit_at']='2026-10-22 12:01:00';
 $q=new LocalPaymentQuarantine(policy());eq(true,$q->assert_allowed(),'armed local wallet operations are authorized');
 error_code($q->assert_legacy_gateway_allowed(),'local_payment_quarantined');
 error_code((new LocalPaymentQuarantine(policy(['local_dev_payments'=>false])))->assert_legacy_gateway_allowed(),'local_payment_quarantined');
};
$tests['review regression clean marker requires complete singleton index and column integrity without local gate'] = function() {
 reset_fixture();$s=new LocalPaymentSchema();eq(true,$s->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));
 $db=$GLOBALS['wpdb'];$table='wp_nahan_local_payment_provenance';$original=$db->tables[$table];
 $q=new LocalPaymentQuarantine(policy(['local_dev_payments'=>false,'environment_type'=>'production','site_url'=>'https://example.test','remote_addr'=>'198.51.100.1']));
 eq(true,$q->assert_allowed(true),'intact clean marker does not require a local authorization gate');
 foreach(['missing_primary','prefix_primary','nonunique_primary','missing_column','wrong_collation'] as $mutation) {
  if($mutation==='missing_primary')$db->tables[$table]['indexes']=[];
  if($mutation==='prefix_primary')$db->tables[$table]['indexes'][0]['Sub_part']=1;
  if($mutation==='nonunique_primary')$db->tables[$table]['indexes'][0]['Non_unique']=1;
  if($mutation==='missing_column')array_pop($db->tables[$table]['columns']);
  if($mutation==='wrong_collation')$db->tables[$table]['columns'][1]['Collation']='ascii_general_ci';
  eq(false,$s->is_ready());error_code($q->assert_allowed(true),'local_payment_quarantined');$db->tables[$table]=$original;
 }
 $db->fail=true;error_code($q->assert_allowed(true),'local_payment_quarantined');
};
$tests['review regression runtime defined null constant is malformed not absent'] = function() {
 reset_fixture();define('NAHAN_LOCAL_DEV_PAYMENTS',null);
 $p=new LocalPaymentPolicy();eq(true,$p->opt_in_present());
 error_code((new LocalPaymentQuarantine($p))->assert_legacy_gateway_allowed(),'local_payment_quarantined');
};
$tests['PartA maintenance values fail closed without leaking local payment availability'] = function() {
 reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));eq(true,policy()->arm(LocalPaymentPolicy::ARM_CONFIRMATION));
 foreach([true,null,0,1,'false','true',[],new stdClass()] as $value) {
  $p=policy(['local_payment_maintenance'=>$value]);eq(true,$p->is_maintenance_blocking());eq($value===true,$p->is_maintenance_enabled());eq(false,$p->is_enabled());
  error_code((new LocalPaymentQuarantine($p))->assert_allowed(),'financial_maintenance');error_code((new LocalPaymentQuarantine($p))->assert_legacy_gateway_allowed(),'financial_maintenance');
 }
 foreach([false] as $value) { $p=policy(['local_payment_maintenance'=>$value]);eq(false,$p->is_maintenance_blocking());eq(true,$p->is_enabled()); }
};
$tests['PartA schema domain requires strict maintenance before identity or DDL'] = function() {
 foreach([false,null,0,1,'true',[]] as $value) {
  reset_fixture();$db=$GLOBALS['wpdb'];error_code((new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>$value])),'financial_maintenance_required');eq(0,$GLOBALS['writes']);eq([],$db->queries);
 }
 reset_fixture();error_code((new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context())),'financial_maintenance_required');eq(0,$GLOBALS['writes']);eq([],$GLOBALS['wpdb']->queries);
};
$tests['PartA banking only admits never-tracked strict opt-out with successful reads'] = function() {
 reset_fixture();eq(true,(new LocalPaymentQuarantine(policy(['local_dev_payments'=>false])))->assert_legacy_gateway_allowed());
 foreach([LocalPaymentSchema::OPTION,LocalPaymentPolicy::OPTION,LocalPaymentPolicy::IDENTITY_OPTION] as $evidence) {foreach([null,false,[],0,''] as $value) {reset_fixture();$GLOBALS['options'][$evidence]=$value;error_code((new LocalPaymentQuarantine(policy(['local_dev_payments'=>false])))->assert_legacy_gateway_allowed(),'local_payment_quarantined');}}
 reset_fixture();$GLOBALS['wpdb']->fail=true;error_code((new LocalPaymentQuarantine(policy(['local_dev_payments'=>false])))->assert_legacy_gateway_allowed(),'local_payment_quarantined');
};
$tests['PartA malformed retained options cannot authorize fresh schema recreation in maintenance'] = function() {
 foreach([LocalPaymentSchema::OPTION,LocalPaymentPolicy::OPTION,LocalPaymentPolicy::IDENTITY_OPTION] as $key) {
  reset_fixture();$GLOBALS['options'][$key]=null;
  error_code((new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])),'local_payment_schema_not_ready');
  eq(0,$GLOBALS['writes']);foreach($GLOBALS['wpdb']->queries as $query)ok(!preg_match('/^(CREATE|ALTER|INSERT|UPDATE)/',$query));
 }
};
$tests['PartA maintenance is checked before same-instance joins and poisons ignored nested denial'] = function() {
 reset_fixture();eq(true,(new LocalPaymentSchema())->upgrade(new LocalDevelopmentGate(context()),policy(['local_payment_maintenance'=>true])));
 $db=$GLOBALS['wpdb'];$u=fixture_uow();$called=0;
 $result=$u->run_for_user(7,[],function() use($u,&$called) {
  define('NAHAN_LOCAL_PAYMENT_MAINTENANCE',true);
  error_code($u->run_for_user(7,[],function() use(&$called) {$called++;return true;}),'financial_maintenance');return 'ignored';
 });
 error_code($result,'financial_maintenance');eq(0,$called);ok(in_array('ROLLBACK',$db->queries,true));ok(!in_array('COMMIT',$db->queries,true));
 $before=count($db->queries);error_code($u->run_for_user(7,[],fn()=>true),'financial_maintenance');eq($before,count($db->queries));
 $gateway=new Nahan\Core\Payments\PaymentGateway(new Nahan\Core\Admin\Settings(),new Nahan\Core\Payments\WalletManager(fixture_uow()));error_code($gateway->initiate(7,10000,'wallet_topup'),'financial_maintenance');error_code($gateway->verify('opaque','OK'),'financial_maintenance');
};
$failed=0;foreach($tests as $name=>$test) { try { $test();echo "PASS $name\n"; }catch(Throwable $e) { $failed++;echo "FAIL $name: ".$e->getMessage()."\n"; }}echo count($tests)." tests, $failed failed\n";exit($failed?1:0);
