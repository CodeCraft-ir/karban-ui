<?php
/** Task9B: real SmsService and registered AdminPanel callbacks; fake WP HTTP/options/DB only. No WP bootstrap. */
declare(strict_types=1);
define('ABSPATH', __DIR__ . '/');
define('ARRAY_A', 'ARRAY_A');
define('NAHAN_LOCAL_DEVELOPMENT',true);
define('NAHAN_LOCAL_DEV_OTP',true);
define('NAHAN_CORE_DIR', '/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/');
class WP_Error {
 public function __construct(public string $code='', public string $message='', public mixed $data=null) {}
 public function get_error_code() { return $this->code; }
 public function get_error_data() { return $this->data; }
}
function is_wp_error($v) { return $v instanceof WP_Error; }
function get_option($k,$d=false) { return $GLOBALS['options'][$k] ?? $d; }
function register_setting($g,$k,$args=[]) { $GLOBALS['registered'][$k]=$args; }
function update_option($k,$v,$autoload=null) {
 if (isset($GLOBALS['registered'][$k]['sanitize_callback'])) $v=($GLOBALS['registered'][$k]['sanitize_callback'])($v);
 if ($GLOBALS['fail_write']) return false;
 if (array_key_exists($k,$GLOBALS['options']) && $GLOBALS['options'][$k] === $v) return false;
 $GLOBALS['options'][$k]=$v; $GLOBALS['autoload'][$k]=$autoload; $GLOBALS['writes'][]=[$k,$autoload]; return true;
}
function wp_set_option_autoload($k,$v) { if ($GLOBALS['fail_autoload']) { $GLOBALS['wpdb']->last_error='synthetic-private-storage-error'; return false; } $GLOBALS['autoload'][$k]=$v; return true; }
function add_settings_error($setting,$code,$message,$type='error') { $GLOBALS['settings_errors'][]=[$setting,$code,$message,$type]; }
function current_user_can($cap) { return $cap==='manage_options' && $GLOBALS['admin']; }
function wp_verify_nonce($nonce,$action) { return ($nonce==='fixture-nonce' && $action==='nahan-settings-options') || ($nonce==='mode-nonce' && $action==='nahan-local-otp-mode'); }
function add_action($hook,$callback) { $GLOBALS['actions'][$hook]=$callback; }
function wp_get_environment_type() { return $GLOBALS['env']??'local'; }
function wp_nonce_field($action) { echo '<input name="_wpnonce" value="fixture-nonce" />'; }
function admin_url($path='') { return '/wp-admin/'.$path; }
function wp_unslash($v) { return is_array($v) ? array_map('wp_unslash',$v) : (is_string($v) ? stripslashes($v) : $v); }
final class ControlledStop extends RuntimeException {}
function wp_die($message) { throw new ControlledStop('Controlled stop: '.$message); }
function settings_fields($g) { echo '<input type="hidden" name="_wpnonce" value="fixture-nonce" />'; }
function submit_button() { echo '<button>Save</button>'; }
function esc_html($v) { return htmlspecialchars((string)$v,ENT_QUOTES,'UTF-8'); }
function esc_attr($v) { return esc_html($v); }
function esc_textarea($v) { return esc_html($v); }
function checked($a,$b,$echo=false) { return $a===$b?'checked="checked"':''; }
function wp_json_encode($v) { return json_encode($v,JSON_THROW_ON_ERROR); }
function wp_remote_post($url,$args) { $GLOBALS['http'][]=[$url,$args]; return $GLOBALS['response']; }
function wp_remote_retrieve_response_code($r) { return $r['response']['code']??0; }
function wp_remote_retrieve_body($r) { return $r['body']??''; }
function wp_generate_uuid4() { static $i=0; return 'fixture-tracking-'.++$i; }
function current_time($t,$gmt=false) { return gmdate('Y-m-d H:i:s'); }
function sanitize_text_field($v) { return $v; }
function wp_parse_url($v) { return parse_url($v); }
final class FixtureDb {
 public string $prefix='wp_'; public string $last_error=''; public int $insert_id=0; public array $rows=[]; public array $rate=[]; public array $mutations=[]; public int|false $invalidate_result=1;
 public function prepare($sql,...$args) { return [$sql,$args]; }
 public function get_col($sql,$column=0) { return $GLOBALS['columns']??['id','delivery_mode','code_length','credential_mode','installation_origin','otp_code_length']; }
 public function get_row($q,$mode=null) {
  [$sql,$args]=$q;
  if (str_contains($sql,'SHOW TABLE STATUS')) return ['Engine'=>'InnoDB'];
  if (str_contains($sql,'rate_limits')) return $this->rate[$args[0].$args[1]]??null;
  foreach($this->rows as $row) if ($row['tracking_code']===$args[0]) return $row;
  return null;
 }
 public function insert($table,$row,$formats=null) {
  $row['id']=++$this->insert_id;
  if (str_contains($table,'rate_limits')) $this->rate[$row['bucket'].$row['identifier']]=$row;
  else { $row['consumed_at']=null; $this->rows[$row['id']]=$row; }
  return 1;
 }
 public function update($table,$row,$where,$f=null,$wf=null) { foreach($this->rate as &$r) if ($r['id']===$where['id']) $r=array_merge($r,$row); return 1; }
 public function query($q) {
  $this->mutations[]=$q; [$sql,$args]=$q;
  if (str_starts_with($sql,'DELETE') && str_contains($sql,'tracking_code = %s') && str_contains($sql,'code_hash = %s') && str_contains($sql,'consumed_at IS NULL')) {
   if ($this->invalidate_result!==1) return $this->invalidate_result;
   foreach($this->rows as $id=>$r) if ($r['tracking_code']===$args[0] && $r['code_hash']===$args[1] && $r['consumed_at']===null) { unset($this->rows[$id]); return 1; }
   return 0;
  }
  if (str_contains($sql,'SET consumed_at = %s')) {
   foreach($this->rows as &$r) if($r['id']===$args[1] && $r['consumed_at']===null && $r['attempts']<$args[2]) { $r['consumed_at']=$args[0]; return 1; }
   return 0;
  }
  if (str_contains($sql,'attempts = attempts + 1')) { foreach($this->rows as &$r) if($r['id']===$args[0] && $r['consumed_at']===null) { $r['attempts']++; return 1; } return 0; }
  throw new RuntimeException('Unexpected mutation');
 }
 public function delete($t,$where,$format=null) { if(!str_contains($t,'rate_limits')) throw new RuntimeException('No broad OTP deletion'); unset($this->rate[$where['bucket'].$where['identifier']]); return 1; }
}
require_once NAHAN_CORE_DIR.'includes/class-helpers.php';
require_once NAHAN_CORE_DIR.'includes/class-rate-limiter.php';
require_once NAHAN_CORE_DIR.'includes/admin/class-settings.php';
require_once NAHAN_CORE_DIR.'includes/admin/class-admin-panel.php';
require_once NAHAN_CORE_DIR.'includes/auth/class-sms-service.php';
require_once NAHAN_CORE_DIR.'includes/class-local-development-gate.php';
require_once NAHAN_CORE_DIR.'includes/auth/class-otp-schema.php';
require_once NAHAN_CORE_DIR.'includes/auth/class-otp-manager.php';
require_once NAHAN_CORE_DIR.'includes/auth/class-credential-schema.php';
require_once NAHAN_CORE_DIR.'includes/auth/class-jwt-auth.php';
use Nahan\Core\Admin\Settings;
use Nahan\Core\Admin\AdminPanel;
use Nahan\Core\Auth\SmsService;
use Nahan\Core\Auth\OtpManager;
use Nahan\Core\LocalDevelopmentGate;
function expect($b,$why) { if (!$b) throw new RuntimeException($why); }
function same($want,$got,$why) { expect($want===$got,$why); }
function error_safe($r,$code=null) {
 expect($r instanceof WP_Error,'Must fail closed'); if ($code!==null) same($code,$r->code,'Safe error code');
 foreach(['fixture-key','private-transport','private-provider','09121234567','+989121234567','54321'] as $private) expect(!str_contains(json_encode($r),$private),'Error must not expose sensitive data');
}
function reset_fixture() {
 $GLOBALS['options']=['nahan_sms_driver'=>'faraz_ippanel','nahan_sms_faraz_apikey'=>'fixture-key','nahan_sms_faraz_pattern_code'=>'fixture-pattern','nahan_sms_faraz_originator'=>'+983000505','nahan_sms_faraz_variable'=>'login_code'];
 $GLOBALS['http']=[]; $GLOBALS['registered']=[]; $GLOBALS['writes']=[]; $GLOBALS['autoload']=[]; $GLOBALS['settings_errors']=[];
 $GLOBALS['fail_write']=false; $GLOBALS['fail_autoload']=false; $GLOBALS['admin']=true; $GLOBALS['wpdb']=new FixtureDb();
 $GLOBALS['response']=['response'=>['code'=>200],'body'=>'{"data":{"message_outbox_ids":[12345]},"meta":{"status":true}}'];
 $_POST=['_wpnonce'=>'fixture-nonce','option_page'=>'nahan-settings']; $_SERVER=['REMOTE_ADDR'=>'127.0.0.1','REQUEST_METHOD'=>'POST'];
 $GLOBALS['env']='local'; $GLOBALS['columns']=['id','delivery_mode','code_length','credential_mode','installation_origin','otp_code_length']; $GLOBALS['actions']=[];
 return new SmsService(new Settings());
}
function panel() { $p=new AdminPanel(new Settings()); $p->register_settings(); return $p; }
function save($key,$value) { expect(isset($GLOBALS['registered']['nahan_'.$key]['sanitize_callback']),'Actual registered sanitizer required'); update_option('nahan_'.$key,$value); return get_option('nahan_'.$key); }
class FixturePlugin { public static $fixture; public static function instance() { return self::$fixture; } }
class FixtureRestHelper { const NAMESPACE='fixture/v1'; public static function ok($v) { return ['data'=>$v]; } public static function from_wp_error($v) { return $v; } public static function authed_callback() { return '__return_true'; } }
class_alias(FixturePlugin::class,'Nahan\\Core\\Plugin');
class_alias(FixtureRestHelper::class,'Nahan\\Core\\RestApi\\RestHelper');
function register_rest_route($ns,$path,$route) { $GLOBALS['routes'][$path]=$route; }
function local_gate(array $overrides=[]) { return new LocalDevelopmentGate(array_merge(['local_development'=>true,'local_dev_otp'=>true,'environment_type'=>'local','site_url'=>'http://localhost/karban','remote_addr'=>'127.0.0.1'], $overrides)); }
function otp($gate=null) { return new OtpManager(new SmsService(new Settings()),$gate??local_gate()); }
function ready_options() { $GLOBALS['options']['siteurl']='http://localhost/karban'; }
$tests=[];
$tests['local installation cannot accidentally send when simulation flag or base gate is absent']=function() {
 foreach([['local_dev_otp'=>false],['local_development'=>false],['remote_addr'=>'203.0.113.1'],['environment_type'=>'production']] as $override) {
  reset_fixture(); $r=otp(local_gate($override))->request('09121234567','127.0.0.1'); error_safe($r,'otp_local_configuration_unavailable'); same([],$GLOBALS['http'],'Zero accidental real sends');
 }
};
$tests['default local simulation remains six digits without HTTP']=function() {
 reset_fixture(); $r=otp()->request('09121234567','127.0.0.1'); same('local_simulated',$r['delivery_mode'],'Compatibility mode'); same(6,$r['code_length'],'Local length'); same([],$GLOBALS['http'],'No send'); same(Nahan\Core\Helpers::hash_token('145632'),array_values($GLOBALS['wpdb']->rows)[0]['code_hash'],'Fixed local hash');
};
$tests['explicit atomic arming state and valid provider are both required for local random SMS']=function() {
 foreach([['mode'=>'sms'],['mode'=>'sms','sms_armed'=>false],['mode'=>'local_simulated','sms_armed'=>true],'sms'] as $state) { reset_fixture(); $GLOBALS['options']['nahan_local_otp_policy']=$state; error_safe(otp()->request('09121234567','127.0.0.1')); same([],$GLOBALS['http'],'Incomplete policy cannot send'); }
 reset_fixture(); $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true]; $r=otp()->request('09121234567','127.0.0.1'); same('sms',$r['delivery_mode'],'Explicit SMS mode'); same(5,$r['code_length'],'Five digit real'); same(1,count($GLOBALS['http']),'Single fake send'); $body=json_decode($GLOBALS['http'][0][1]['body'],true); expect((bool)preg_match('/^\d{5}$/',$body['params']['login_code']),'Random five-digit code'); $row=array_values($GLOBALS['wpdb']->rows)[0]; same('sms',$row['delivery_mode'],'Persisted SMS context'); same(5,$row['code_length'],'Persisted length');
 reset_fixture(); $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true]; unset($GLOBALS['options']['nahan_sms_faraz_apikey']); error_safe(otp()->request('09121234567','127.0.0.1')); same([],$GLOBALS['http'],'Missing provider never simulates');
};
$tests['mode switch invalidates old local challenges and credential gate without reclassification']=function() {
 reset_fixture(); $m=otp(); $r=$m->request('09121234567','127.0.0.1'); $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true]; error_safe($m->verify_with_context($r['tracking_code'],'145632'),'otp_local_unavailable'); same(false,local_gate()->is_otp_simulation_enabled(),'JWT shared gate disabled'); same('local_simulated',array_values($GLOBALS['wpdb']->rows)[0]['delivery_mode'],'No reclassification');
};
$tests['readiness is exact nonsecret shape and registered GET only behind base gate']=function() {
 reset_fixture(); ready_options(); $m=otp(); expect(method_exists($m,'readiness'),'Real readiness method required'); $expected=['mode'=>'local_simulated','codeLength'=>6,'otpSchemaReady'=>true,'credentialSchemaReady'=>true,'providerConfigured'=>true,'localRealSmsAllowed'=>false]; same($expected,$m->readiness(),'Safe schema configuration receipt'); same([],$GLOBALS['http'],'No ping'); same([],$GLOBALS['writes'],'No writes');
 $GLOBALS['routes']=[]; require NAHAN_CORE_DIR.'rest-api/auth-routes.php'; $route=$GLOBALS['routes']['/auth/otp/readiness']??null; expect(is_array($route),'Actual registered readiness route'); same('GET',$route['methods'],'GET only'); Nahan\Core\Plugin::$fixture=(object)['otp'=>$m]; same(true,($route['permission_callback'])(),'Base gate'); same($expected,($route['callback'])()['data'],'Actual callback safe response');
 error_safe(otp(local_gate(['remote_addr'=>'203.0.113.1']))->readiness(),'otp_readiness_unavailable');
 $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true]; $expected['mode']='sms'; $expected['codeLength']=5; $expected['localRealSmsAllowed']=true; same($expected,$m->readiness(),'Real-mode configuration only'); same([],$GLOBALS['http'],'Readiness still no ping');
};
$tests['registered dedicated admin action enforces method capability nonce confirmation and preflight']=function() {
 foreach(['method','capability','nonce','settings_nonce','confirmation','provider','gate','schema'] as $bad) {
  reset_fixture(); ready_options(); $p=panel(); $p->register(); expect(isset($GLOBALS['actions']['admin_post_nahan_local_otp_mode']),'Dedicated registered admin action'); $_POST=['_wpnonce'=>'mode-nonce','operation'=>'arm','confirmation'=>'ENABLE_REAL_SMS'];
  if($bad==='method') $_SERVER['REQUEST_METHOD']='GET'; if($bad==='capability') $GLOBALS['admin']=false; if($bad==='nonce') $_POST['_wpnonce']='bad'; if($bad==='settings_nonce') $_POST['_wpnonce']='fixture-nonce'; if($bad==='confirmation') $_POST['confirmation']=' ENABLE_REAL_SMS'; if($bad==='provider') unset($GLOBALS['options']['nahan_sms_faraz_apikey']); if($bad==='gate') $_SERVER['REMOTE_ADDR']='203.0.113.1'; if($bad==='schema') $GLOBALS['columns']=[];
  try { ($GLOBALS['actions']['admin_post_nahan_local_otp_mode'])(); } catch(ControlledStop $e) {} same([],$GLOBALS['writes'],'Denied admin operation writes nothing: '.$bad); same([],$GLOBALS['http'],'No admin SMS');
 }
};
$tests['admin uses one checked nonautoload atomic policy write and independent disarm']=function() {
 foreach([false,true] as $fail) { reset_fixture(); ready_options(); $p=panel(); $p->register(); expect(isset($GLOBALS['actions']['admin_post_nahan_local_otp_mode']),'Dedicated admin action'); $_POST=['_wpnonce'=>'mode-nonce','operation'=>'arm','confirmation'=>'ENABLE_REAL_SMS']; $GLOBALS['fail_write']=$fail; try { ($GLOBALS['actions']['admin_post_nahan_local_otp_mode'])(); } catch(ControlledStop $e) {}
  same($fail?null:['mode'=>'sms','sms_armed'=>true],get_option('nahan_local_otp_policy',null),'Checked atomic arm'); if(!$fail) same([['nahan_local_otp_policy',false]],$GLOBALS['writes'],'One policy write only'); same([],$GLOBALS['http'],'Arming never sends');
 }
 reset_fixture(); ready_options(); $p=panel(); $p->register(); $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true]; $_POST=['_wpnonce'=>'mode-nonce','operation'=>'disarm']; try { ($GLOBALS['actions']['admin_post_nahan_local_otp_mode'])(); } catch(ControlledStop $e) {} same(['mode'=>'local_simulated','sms_armed'=>false],get_option('nahan_local_otp_policy'),'Explicit disarm');
 ob_start(); $p->render_settings(); $html=ob_get_clean(); expect(str_contains($html,'ENABLE_REAL_SMS')&&str_contains($html,'admin-post.php'),'Independent operator form'); expect(!isset($GLOBALS['registered']['nahan_local_otp_policy']),'Ordinary settings save cannot arm'); same([],$GLOBALS['http'],'Rendering no ping');
};
$tests['local real SMS requires both schemas even through direct OTP adapter']=function() {
 foreach([['id','delivery_mode','code_length'],['id','credential_mode','installation_origin','otp_code_length']] as $columns) {
  reset_fixture(); $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true]; $GLOBALS['columns']=$columns;
  error_safe(otp()->request('09121234567','127.0.0.1'),'otp_local_configuration_unavailable'); same([],$GLOBALS['http'],'Missing schema blocks direct SMS');
 }
};
$tests['admin renders nonsecret current configuration readiness without a delivery claim']=function() {
 reset_fixture(); ready_options(); $p=panel(); ob_start(); $p->render_settings(); $html=ob_get_clean(); expect(str_contains($html,'data-otp-mode="local_simulated"'),'Current safe mode visible'); expect(str_contains($html,'data-provider-configured="true"'),'Configuration-only provider readiness'); expect(!str_contains($html,'fixture-key'),'No key rendered'); same([],$GLOBALS['http'],'No render ping'); same([],$GLOBALS['writes'],'No render writes');
};
$tests['armed local SMS retains cooldown on uncertain failure and consumes successful code once']=function() {
 reset_fixture(); $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true]; $GLOBALS['response']=new WP_Error('timeout','private-provider fixture-key'); $m=otp(); error_safe($m->request('09121234567','127.0.0.1'),'sms_transport_error'); same([],$GLOBALS['wpdb']->rows,'Failed exact challenge invalidated'); error_safe($m->request('09121234567','127.0.0.1'),'otp_throttled'); same(1,count($GLOBALS['http']),'No automatic or cooldown-bypassing resend');
 reset_fixture(); $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true]; $m=otp(); $r=$m->request('09121234567','127.0.0.1'); $code=json_decode($GLOBALS['http'][0][1]['body'],true)['params']['login_code']; $context=$m->verify_with_context($r['tracking_code'],$code); same(['phone'=>'09121234567','delivery_mode'=>'sms','code_length'=>5],$context,'Persisted random SMS context'); error_safe($m->verify_with_context($r['tracking_code'],$code),'otp_consumed'); same(1,count($GLOBALS['http']),'Verification never sends');
};
$tests['malformed loopback installation cannot become production SMS when canonical gate fails']=function() {
 foreach(['http://localhost/?x=1','ftp://localhost','http://user:pass@127.0.0.1','not-a-url',''] as $url) {
  reset_fixture(); $r=otp(local_gate(['environment_type'=>'production','site_url'=>$url]))->request('09121234567','127.0.0.1'); error_safe($r,'otp_local_configuration_unavailable'); same([],$GLOBALS['http'],'Malformed local installation cannot send');
 }
};
$tests['registered OTP request ignores browser mode and Host and enforces the actual direct-peer gate']=function() {
 reset_fixture(); $GLOBALS['routes']=[]; require NAHAN_CORE_DIR.'rest-api/auth-routes.php'; $req=new class { public function get_param($key) { return ['phone'=>'09121234567','mode'=>'sms','delivery_mode'=>'sms','localRealSmsAllowed'=>true][$key]??null; } }; $route=$GLOBALS['routes']['/auth/otp/request'];
 Nahan\Core\Plugin::$fixture=(object)['otp'=>otp()]; $_SERVER['HTTP_HOST']='production.example.test'; $r=($route['callback'])($req); same('local_simulated',$r['data']['delivery_mode'],'Browser mode cannot select transport'); same([],$GLOBALS['http'],'Browser intent cannot send');
 reset_fixture(); $_SERVER['HTTP_HOST']='localhost'; $_SERVER['HTTP_X_FORWARDED_FOR']='127.0.0.1'; Nahan\Core\Plugin::$fixture=(object)['otp'=>otp(local_gate(['remote_addr'=>'203.0.113.1']))]; error_safe(($route['callback'])($req),'otp_local_configuration_unavailable'); same([],$GLOBALS['http'],'Forged Host and forwarded headers cannot authorize');
};
$failed=0; foreach($tests as $name=>$test) { try { $test(); echo "PASS $name\n"; } catch(Throwable $e) { $failed++; echo "FAIL $name: ".$e->getMessage()."\n"; } } echo count($tests).' tests; '.$failed." failures\n"; exit($failed?1:0);
