<?php
/** Task9D: real SmsService and registered AdminPanel callbacks; fake WP HTTP/options/DB only. No WP bootstrap. */
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
 if (($GLOBALS['throw_diagnostic']??false) && $k===\Nahan\Core\Auth\SmsService::LAST_OTP_DIAGNOSTIC) throw new RuntimeException('ignored-storage-canary');
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
 foreach(['fixture-key','private-transport','private-provider','09990000001','+989990000001','82746'] as $private) expect(!str_contains(json_encode($r),$private),'Error must not expose sensitive data');
}
function reset_fixture() {
 $GLOBALS['options']=['nahan_sms_driver'=>'faraz_ippanel','nahan_sms_faraz_apikey'=>'fixture-key','nahan_sms_faraz_pattern_code'=>'fixture-pattern','nahan_sms_faraz_originator'=>'+983000505','nahan_sms_faraz_variable'=>'login_code'];
 $GLOBALS['http']=[]; $GLOBALS['registered']=[]; $GLOBALS['writes']=[]; $GLOBALS['autoload']=[]; $GLOBALS['settings_errors']=[];
 $GLOBALS['throw_diagnostic']=false; $GLOBALS['fail_write']=false; $GLOBALS['fail_autoload']=false; $GLOBALS['admin']=true; $GLOBALS['wpdb']=new FixtureDb();
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
function settings_post_save($key,$raw,$present=true) {
 $option='nahan_'.$key; $_POST['option_page']='nahan-settings'; $_POST['action']='update';
 if ($present) $_POST[$option]=is_string($raw)?addslashes($raw):$raw; else unset($_POST[$option]);
 $value=null;
 if (isset($_POST[$option])) { $value=$_POST[$option]; if (!is_array($value)) $value=trim($value); $value=wp_unslash($value); }
 update_option($option,$value); return get_option($option);
}
function iran_fixture() {
 $s=reset_fixture(); $GLOBALS['options'] += ['nahan_sms_iranpayamak_apikey'=>'iran-canary-key','nahan_sms_iranpayamak_pattern_code'=>'pattern-canary','nahan_sms_iranpayamak_line_number'=>'030005050','nahan_sms_iranpayamak_variable'=>'login_token'];
 $GLOBALS['options']['nahan_sms_driver']='faraz_iranpayamak';
 $GLOBALS['response']=['response'=>['code'=>201],'body'=>'{"status":"success","data":1.25,"messages":{"private":"ignored-canary"}}']; return $s;
}
$tests=[];
$tests['separate initially blank configuration never borrows Edge credentials']=function() {
 $s=reset_fixture(); $GLOBALS['options']['nahan_sms_driver']='faraz_iranpayamak'; same(false,$s->is_otp_configured(),'New driver initially unconfigured'); same([],$GLOBALS['http'],'Readiness no HTTP');
 error_safe($s->send_otp('09990000001','82746'),'sms_misconfigured'); same([],$GLOBALS['http'],'Old key never sent to new domain');
 $s=iran_fixture(); same(true,$s->is_otp_configured(),'Distinct driver readiness');
 foreach(['apikey','pattern_code','line_number','variable'] as $field) { $s=iran_fixture(); unset($GLOBALS['options']['nahan_sms_iranpayamak_'.$field]); same(false,$s->is_otp_configured(),'Every new field initially blank'); }
};
$tests['documented national request contract and dynamic attributes object']=function() {
 $s=iran_fixture(); same(true,$s->send_otp('۰۹۹۹۰۰۰۰۰۰۱','82746'),'201 numeric acceptance'); same(1,count($GLOBALS['http']),'One send');
 [$url,$a]=$GLOBALS['http'][0]; same('https://api.iranpayamak.com/ws/v1/sms/pattern',$url,'Fixed new domain');
 same(['Api-Key'=>'iran-canary-key','Accept'=>'application/json','Content-Type'=>'application/json'],$a['headers'],'Raw Api-Key only'); same(10,$a['timeout'],'Timeout');same(0,$a['redirection'],'No redirects');same(16384,$a['limit_response_size'],'Response bound');
 same(['code'=>'pattern-canary','recipient'=>'09990000001','line_number'=>'030005050','number_format'=>'english','attributes'=>['login_token'=>'82746']],json_decode($a['body'],true),'Exact national strings, unconverted service line');
 $s=iran_fixture();$GLOBALS['options']['nahan_sms_iranpayamak_variable']='0';same(true,$s->send_otp('09990000001','82746'),'Numeric variable');expect(json_decode($GLOBALS['http'][0][1]['body'])->attributes instanceof stdClass,'Attributes always object');
};
$tests['strict response matrix ignores messages and never invents integer or positive constraints']=function() {
 foreach(['0','-1','1.25','1e3','-0.5'] as $number) {
  $s=iran_fixture(); $GLOBALS['response']['body']='{"status":"success","data":'.$number.',"messages":["ignored-canary"],"meta":{"message_code":"401-1"}}';
  same(true,$s->send_otp('09990000001','82746'),'Any finite JSON number accepted'); $d=get_option(SmsService::LAST_OTP_DIAGNOSTIC);same('faraz_iranpayamak',$d['provider'],'Distinct diagnosis');same('accepted_not_delivery',$d['outcome'],'Acceptance not delivery');same(201,$d['http_status'],'Safe HTTP');expect(!isset($d['vendor_code']),'No undocumented vendor code');
 }
 foreach(['{}','null','[]','malformed','{"status":"success"}','{"data":1}','{"status":"error","data":1}','{"status":true,"data":1}','{"status":"SUCCESS","data":1}','{"status":"success","data":true}','{"status":"success","data":"1"}','{"status":"success","data":null}','{"status":"success","data":1e400}','{"status":"success","data":[]}',str_repeat('x',16385)] as $body) {
  $s=iran_fixture(); $GLOBALS['response']['body']=$body;error_safe($s->send_otp('09990000001','82746'),'sms_provider_error');same(1,count($GLOBALS['http']),'No retry/fallback');expect(!str_contains(json_encode(get_option(SmsService::LAST_OTP_DIAGNOSTIC)),'ignored-canary'),'No raw body');
 }
 // Task9E: observed runtime HTTP200 supersedes the original 201-only assumption;
 // strict 200 success and negative bodies are covered by the focused Task9E suite.
 foreach([202,301,401,422,500] as $http) { $s=iran_fixture();$GLOBALS['response']['response']['code']=$http;error_safe($s->send_otp('09990000001','82746'),'sms_provider_error');same(1,count($GLOBALS['http']),'Only known 200/201 statuses qualify'); }
};
$tests['new strict inputs, unsupported free text and no fallback']=function() {
 foreach(['apikey'=>['',"key\r\nheader",' key',str_repeat('a',513),[]],'pattern_code'=>['',"bad\ncode",str_repeat('p',129)],'line_number'=>['','+983000','98 300','۱۲۳','300a',[]],'variable'=>['','bad.name',str_repeat('a',65)]] as $f=>$bad) foreach($bad as $v) {
  $s=iran_fixture();$GLOBALS['options']['nahan_sms_iranpayamak_'.$f]=$v;error_safe($s->send_otp('09990000001','82746'),'sms_misconfigured');same([],$GLOBALS['http'],'Invalid config no HTTP');
 }
 $s=iran_fixture();error_safe($s->send_text('09990000001','private text'),'sms_text_unsupported');error_safe($s->send_by_pattern('09990000001','pattern-canary',['code'=>'82746']));same([],$GLOBALS['http'],'No alternate path');
 foreach([['bad-phone','82746'],['09990000001','1234'],['09990000001',"82746\n"]] as [$p,$c]) { $s=iran_fixture();error_safe($s->send_otp($p,$c));same([],$GLOBALS['http'],'Input rejects'); }
};
$tests['transport and diagnostic storage failure cannot retry or expose canaries']=function() {
 $s=iran_fixture();$GLOBALS['response']=new WP_Error('timeout','iran-canary-key ignored-canary 09990000001 82746');$r=$s->send_otp('09990000001','82746');error_safe($r,'sms_transport_error');same(1,count($GLOBALS['http']),'No retries');$d=get_option(SmsService::LAST_OTP_DIAGNOSTIC);same('timeout',$d['transport_class'],'Safe class');same('transport_error',$d['outcome'],'Transport category');
 foreach(['iran-canary-key','ignored-canary','09990000001','82746'] as $private) expect(!str_contains(json_encode([$r,$d]),$private),'Private input never exposed');
 $s=iran_fixture();$GLOBALS['fail_write']=true;same(true,$s->send_otp('09990000001','82746'),'Accepted despite failed record write');same(1,count($GLOBALS['http']),'No resend');
};
$tests['registered settings raw secret preservation clear capability nonce and nonautoload']=function() {
 $k='sms_iranpayamak_apikey'; $s=iran_fixture();panel();same('faraz_iranpayamak',save('sms_driver','faraz_iranpayamak'),'Driver allowlisted');
 foreach([' leading','trailing ',"\r\nkey\r\n",' ',[],str_repeat('a',513)] as $raw) { same('iran-canary-key',settings_post_save($k,$raw),'Raw malformed key never repaired');same(false,$GLOBALS['autoload']['nahan_'.$k],'Nonautoload retention'); }
 same('new-canary-key',settings_post_save($k,'new-canary-key'),'New private key');same('new-canary-key',settings_post_save($k,''),'Blank preserves');same('new-canary-key',settings_post_save($k,null,false),'Missing preserves');
 $_POST['nahan_'.$k.'_clear']='1';same('',settings_post_save($k,'bad key'),'Explicit clear');same(false,$GLOBALS['autoload']['nahan_'.$k],'Clear nonautoload');same([],$GLOBALS['http'],'Settings never HTTP');
 foreach([false,true] as $cap) { iran_fixture();panel();$GLOBALS['admin']=$cap;if($cap)$_POST['_wpnonce']='wrong';try{settings_post_save($k,'unauthorized');throw new LogicException('Must deny');}catch(ControlledStop $e){}same('iran-canary-key',get_option('nahan_'.$k),'Denied save');same([],$GLOBALS['writes'],'Denied no write'); }
 foreach(['pattern_code'=>'new-pattern','line_number'=>'03000999','variable'=>'new_token'] as $f=>$v) {iran_fixture();panel();same($v,save('sms_iranpayamak_'.$f,$v),'Field saved');same(false,$GLOBALS['autoload']['nahan_sms_iranpayamak_'.$f],'Field nonautoload');}
 iran_fixture();panel();$GLOBALS['fail_write']=true;try{save($k,'new-canary');throw new LogicException('Must fail storage');}catch(ControlledStop $e){}same('iran-canary-key',get_option('nahan_'.$k),'Failed write retains');
};
$tests['read-only admin masks independent secret and labels both domains']=function() {
 $s=iran_fixture();$p=panel();ob_start();$p->render_settings();$h=ob_get_clean();
 expect(str_contains($h,'faraz_iranpayamak')&&str_contains($h,'api.iranpayamak.com/ws/v1/sms/pattern')&&str_contains($h,'edge.ippanel.com'),'Distinct labels');
 expect((bool)preg_match('/type="password"[^>]*name="nahan_sms_iranpayamak_apikey"[^>]*value=""/',$h),'Blank password');expect(!str_contains($h,'iran-canary-key')&&!str_contains($h,'fixture-key'),'No saved keys');expect(str_contains($h,'name="nahan_sms_iranpayamak_apikey_clear"'),'Clear field');same([],$GLOBALS['http'],'Read only no HTTP');same([],$GLOBALS['writes'],'Read only no writes');
};
$tests['real manager new driver dynamic OTP and exact invalidation throttle']=function() {
 $gate=new LocalDevelopmentGate(['local_development'=>false,'local_dev_otp'=>false,'environment_type'=>'production','site_url'=>'https://example.test','remote_addr'=>'127.0.0.1']);
 $s=iran_fixture();$m=new OtpManager($s,$gate);$r=$m->request('09990000001','192.0.2.91');expect(is_array($r),'Accepted challenge');$b=json_decode($GLOBALS['http'][0][1]['body'],true);$row=array_values($GLOBALS['wpdb']->rows)[0];same($row['code_hash'],hash('sha256',$b['attributes']['login_token']),'Uses existing generated hashed OTP');expect(!isset($r['code']),'No OTP output');
 $s=iran_fixture();$GLOBALS['response']=new WP_Error('timeout','private');$db=$GLOBALS['wpdb'];$db->rows[100]=['id'=>100,'tracking_code'=>'unrelated','code_hash'=>'hash','consumed_at'=>null];$m=new OtpManager($s,$gate);error_safe($m->request('09990000001','192.0.2.91'),'sms_transport_error');same([100],array_keys($db->rows),'Only failed exact challenge invalidated');error_safe($m->request('09990000001','192.0.2.91'),'otp_throttled');same(1,count($GLOBALS['http']),'Throttle prevents second send');
};
$tests['all new unchanged fields enforce checked nonautoload storage']=function() {
 foreach(['apikey','pattern_code','line_number','variable'] as $f) {
  iran_fixture();panel();$key='sms_iranpayamak_'.$f;$value=get_option('nahan_'.$key);$GLOBALS['autoload']['nahan_'.$key]=true;
  same($value,save($key,$value),'Unchanged preserves exact value');same(false,$GLOBALS['autoload']['nahan_'.$key],'Unchanged field nonautoload');
  $GLOBALS['fail_autoload']=true;try{save($key,$value);throw new LogicException('Must check autoload failure');}catch(ControlledStop $e){}
 }
};
$tests['new diagnostic projection omits undocumented vendor codes and raw extras']=function() {
 iran_fixture();$GLOBALS['options'][SmsService::LAST_OTP_DIAGNOSTIC]=['timestamp'=>'2026-10-22T00:00:00Z','provider'=>'faraz_iranpayamak','outcome'=>'provider_rejected','http_status'=>401,'vendor_code'=>'401-1','messages'=>'ignored-canary','data'=>91];
 same(['timestamp'=>'2026-10-22T00:00:00Z','provider'=>'faraz_iranpayamak','outcome'=>'provider_rejected','http_status'=>401],SmsService::last_otp_diagnostic(),'No undocumented vendor or raw fields');
 $GLOBALS['admin']=false;same(null,SmsService::last_otp_diagnostic(),'Capability gated');
};
$tests['selected new driver integrates explicit mode arming and schema gates without HTTP']=function() {
 foreach(['ok','provider','nonce','capability','confirmation','schema','gate'] as $kind) {
  iran_fixture();ready_options();$p=panel();$p->register();$_POST=['_wpnonce'=>'mode-nonce','operation'=>'arm','confirmation'=>'ENABLE_REAL_SMS'];
  if($kind==='provider')unset($GLOBALS['options']['nahan_sms_iranpayamak_apikey']);if($kind==='nonce')$_POST['_wpnonce']='bad';if($kind==='capability')$GLOBALS['admin']=false;if($kind==='confirmation')$_POST['confirmation']='bad';if($kind==='schema')$GLOBALS['columns']=[];if($kind==='gate')$_SERVER['REMOTE_ADDR']='203.0.113.91';
  try{($GLOBALS['actions']['admin_post_nahan_local_otp_mode'])();}catch(ControlledStop $e){}
  same($kind==='ok'?['mode'=>'sms','sms_armed'=>true]:null,get_option('nahan_local_otp_policy',null),'Selected driver checked by independent action');same([],$GLOBALS['http'],'Arming never HTTP');
 }
 iran_fixture();ready_options();$m=otp();$r=$m->readiness();same(true,$r['providerConfigured'],'Selected driver readiness');same('local_simulated',$r['mode'],'Settings do not arm');same([],$GLOBALS['http'],'Readiness no HTTP');same([],$GLOBALS['writes'],'Readiness no writes');
 $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true];$r=$m->request('09990000001','127.0.0.1');expect(is_array($r),'Armed real-mode challenge');$code=json_decode($GLOBALS['http'][0][1]['body'],true)['attributes']['login_token'];same(['phone'=>'09990000001','delivery_mode'=>'sms','code_length'=>5],$m->verify_with_context($r['tracking_code'],$code),'CAS consume context');error_safe($m->verify_with_context($r['tracking_code'],$code),'otp_consumed');same(1,count($GLOBALS['http']),'Verification no resend');
};
$tests['thrown diagnostic storage error never turns acceptance into resend']=function() {
 $s=iran_fixture();$GLOBALS['throw_diagnostic']=true;same(true,$s->send_otp('09990000001','82746'),'Accepted remains accepted');same(1,count($GLOBALS['http']),'No second request');same(null,get_option(SmsService::LAST_OTP_DIAGNOSTIC,null),'No fabricated record');
};
$tests['exactly unslashed first-save secret and direct validation stay isolated']=function() {
 iran_fixture();panel();$key='sms_iranpayamak_apikey';unset($GLOBALS['options']['nahan_'.$key]);$valid="new-'quoted'-\\key";
 same($valid,settings_post_save($key,$valid),'Exact raw valid secret once unslashed');same(false,$GLOBALS['autoload']['nahan_'.$key],'First save not autoloaded');same('fixture-key',get_option('nahan_sms_faraz_apikey'),'Edge key untouched');
 unset($_POST['option_page']);$_POST['nahan_'.$key]='unrelated';same($valid,save($key," bad\r\n"),'Direct argument validated');same([],$GLOBALS['http'],'No settings network');
};
$failed=0;foreach($tests as $name=>$test){try{$test();echo "PASS $name\n";}catch(Throwable $e){$failed++;echo "FAIL $name: ".$e->getMessage()."\n";}}echo count($tests)." tests, $failed failures\n";exit($failed?1:0);
