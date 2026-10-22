<?php
/** Task9F: real SmsService and registered AdminPanel callbacks; fake WP HTTP/options/DB only. No WP bootstrap. */
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
function shape_send($body,$http=200) {
 $s=iran_fixture();$GLOBALS['response']=['response'=>['code'=>$http],'body'=>$body];$result=$s->send_otp('09990000001','82746');same(1,count($GLOBALS['http']),'One existing attempt only');return [$result,SmsService::last_otp_diagnostic()];
}
function only_shape($d) {return array_filter($d,fn($k)=>str_starts_with($k,'response_'),ARRAY_FILTER_USE_KEY);}
$tests=[];
$tests['known root fields expose only fixed structural types and classified status']=function() {
 [$r,$d]=shape_send('{"status":"private-status-canary","data":{"id":"private-id-canary","private-key-canary":"private-value-canary"},"messages":{"private-message-key":"private-message-canary"},"private-root-key":"private-root-value"}');error_safe($r,'sms_provider_error');
 same(['response_root'=>'object','response_status'=>'other','response_data_type'=>'object','response_messages_type'=>'object','response_id_type'=>'string'],only_shape($d),'Only fixed shape facts, never arbitrary keys or values');
 foreach(['private-','09990000001','82746','iran-canary-key'] as $private)expect(!str_contains(json_encode($d),$private),'No secret values or keys stored');
 foreach(['success','error'] as $status){[$r,$d]=shape_send('{"status":"'.$status.'","data":7,"messages":null}');same($status,$d['response_status'],'Known fixed status');same('number',$d['response_data_type'],'Number type, no number value');}
 [$r,$d]=shape_send('{}');same(['response_root'=>'object','response_status'=>'missing','response_data_type'=>'missing','response_messages_type'=>'missing'],only_shape($d),'Missing known fields');
 [$r,$d]=shape_send('{"status":true,"data":{"id":false}}');same('wrong_type',$d['response_status'],'Wrong type without value');same('bool',$d['response_id_type'],'ID bool type only');
};
$tests['parse and root types are bounded with no arbitrary response contents']=function() {
 foreach(['{'=>'invalid_json',str_repeat('x',16385)=>'too_large','null'=>'null','true'=>'bool','1'=>'number','"private-root-canary"'=>'string','[]'=>'list'] as $body=>$root){[$r,$d]=shape_send((string)$body);error_safe($r,'sms_provider_error');same(['response_root'=>$root],only_shape($d),'Only root enum for nonobject/invalid roots');}
 $body='{"data":'.str_repeat('[',35).'0'.str_repeat(']',35).'}';[$r,$d]=shape_send($body);same('invalid_json',$d['response_root'],'Depth bound no raw parse error');
};
$tests['data messages and known nested id types are fixed with bounded numeric string flag']=function() {
 foreach(['null'=>'null','true'=>'bool','1.25'=>'number','"private-value"'=>'string','{}'=>'object','[]'=>'list'] as $json=>$type){[$r,$d]=shape_send('{"status":"success","data":'.$json.',"messages":'.$json.'}');same($type,$d['response_data_type'],'Data type');same($type,$d['response_messages_type'],'Messages type only');if($type==='object')same('missing',$d['response_id_type'],'Known id presence only');else expect(!isset($d['response_id_type']),'ID only for data object');}
 foreach(['12'=>true,'-0.25'=>true,'1e3'=>true,'private-otp-canary'=>false,str_repeat('7',80)=>false,' 12 '=>false] as $value=>$flag){[$r,$d]=shape_send(json_encode(['status'=>'success','data'=>(string)$value]));same($flag,$d['response_data_numeric_string'],'Bounded boolean classification without numeric value');error_safe($r,'sms_provider_error');}
};
$tests['projection drops corrupt fields and relationally invalid shapes and remains admin only']=function() {
 iran_fixture();$core=['timestamp'=>'2026-10-22T00:00:00Z','provider'=>'faraz_iranpayamak','outcome'=>'invalid_response','http_status'=>200];
 $GLOBALS['options'][SmsService::LAST_OTP_DIAGNOSTIC]=$core+['response_root'=>'object','response_status'=>'private-status','response_data_type'=>'string','response_messages_type'=>['private'],'response_data_numeric_string'=>'true','response_id_type'=>'string','private-key-canary'=>'private-value'];
 same($core+['response_root'=>'object','response_data_type'=>'string'],SmsService::last_otp_diagnostic(),'Typed projection drops invalid enum bool nested extras');
 $GLOBALS['options'][SmsService::LAST_OTP_DIAGNOSTIC]=$core+['response_root'=>'invalid_json','response_status'=>'success','response_data_type'=>'number','response_messages_type'=>'object','response_id_type'=>'number'];same($core+['response_root'=>'invalid_json'],SmsService::last_otp_diagnostic(),'Nonobject root cannot carry field facts');
 $GLOBALS['options'][SmsService::LAST_OTP_DIAGNOSTIC]=$core+['response_root'=>'private-canary'];same($core,SmsService::last_otp_diagnostic(),'Unknown root dropped');
 $GLOBALS['options'][SmsService::LAST_OTP_DIAGNOSTIC]=array_merge($core,['provider'=>'faraz_ippanel','response_root'=>'object','response_status'=>'success']);same(array_merge($core,['provider'=>'faraz_ippanel']),SmsService::last_otp_diagnostic(),'Only IranPayamak shape fields');
 $GLOBALS['admin']=false;same(null,SmsService::last_otp_diagnostic(),'No nonadmin projection');
};
$tests['escaped admin render is readonly and acceptance storage and throttle predicates unchanged']=function() {
 [$r,$d]=shape_send('{"status":"private-status-canary","data":{"id":"private-id-canary"},"messages":"private-message-canary"}');$p=panel();$before=count($GLOBALS['writes']);ob_start();$p->render_settings();$h=ob_get_clean();expect(str_contains($h,'response_root')&&str_contains($h,'response_status'),'Existing admin field renders bounded facts');expect(!str_contains($h,'private-'),'No raw data rendered');same($before,count($GLOBALS['writes']),'Render writes no synthetic attempt');same(1,count($GLOBALS['http']),'Render no HTTP');
 foreach([200,201] as $http){foreach(['fail_write','throw_diagnostic'] as $failure){$s=iran_fixture();$GLOBALS['response']['response']['code']=$http;$GLOBALS[$failure]=true;same(true,$s->send_otp('09990000001','82746'),'Accepted remains accepted despite diagnostics failure');same(1,count($GLOBALS['http']),'Never resend');}}
 foreach([200,201,202] as $http){[$r,$d]=shape_send('{"status":"success","data":"7"}',$http);error_safe($r,'sms_provider_error');same('invalid_response',$d['outcome'],'String data never accepted');}
 iran_fixture();ready_options();same(true,otp()->readiness()['providerConfigured'],'Readiness unchanged');same([],$GLOBALS['http'],'Readiness no HTTP');same([],$GLOBALS['writes'],'Readiness no diagnostic');
 iran_fixture();$GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true];$GLOBALS['response']=['response'=>['code'=>200],'body'=>'{"status":"success","data":"7"}'];$m=otp();error_safe($m->request('09990000001','127.0.0.1'),'sms_provider_error');same([],$GLOBALS['wpdb']->rows,'Failed challenge invalidated');error_safe($m->request('09990000001','127.0.0.1'),'otp_throttled');same(1,count($GLOBALS['http']),'Cooldown still blocks resend');
};
$tests['admin renders structural boolean as fixed true or false text']=function() {
 foreach(['7'=>'true','private-canary'=>'false'] as $value=>$label){shape_send(json_encode(['status'=>'success','data'=>(string)$value]));$p=panel();ob_start();$p->render_settings();$h=ob_get_clean();expect(str_contains($h,'<dt>response_data_numeric_string</dt><dd dir="ltr">'.$label.'</dd>'),'Readable fixed boolean, no raw string');expect(!str_contains($h,'private-canary'),'No string value rendered');}
};
$failed=0;foreach($tests as $name=>$test){try{$test();echo "PASS $name\n";}catch(Throwable $e){$failed++;echo "FAIL $name: ".$e->getMessage()."\n";}}echo count($tests)." tests, $failed failures\n";exit($failed?1:0);
