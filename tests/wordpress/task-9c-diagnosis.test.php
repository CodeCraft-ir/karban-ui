<?php
/** Task9C: real SmsService and registered AdminPanel callbacks; fake WP HTTP/options/DB only. No WP bootstrap. */
declare(strict_types=1);
define('ABSPATH', __DIR__ . '/');
define('ARRAY_A', 'ARRAY_A');
define('NAHAN_LOCAL_DEVELOPMENT',true);
define('NAHAN_LOCAL_DEV_OTP',true);
define('NAHAN_CORE_DIR', '/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/');
class WP_Error {
 public function __construct(public string $code='', public string $message='', public mixed $data=null) {}
 public function get_error_message() { return $this->message; }
 public function get_error_code() { return $this->code; }
 public function get_error_data() { return $this->data; }
}
function is_wp_error($v) { return $v instanceof WP_Error; }
function get_option($k,$d=false) { return $GLOBALS['options'][$k] ?? $d; }
function register_setting($g,$k,$args=[]) { $GLOBALS['registered'][$k]=$args; }
function update_option($k,$v,$autoload=null) {
 if (isset($GLOBALS['registered'][$k]['sanitize_callback'])) $v=($GLOBALS['registered'][$k]['sanitize_callback'])($v);
 if ($GLOBALS['throw_write']??false) throw new RuntimeException('private-storage fixture-key 09121234567 54321');
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
 $GLOBALS['throw_write']=false; $GLOBALS['fail_write']=false; $GLOBALS['fail_autoload']=false; $GLOBALS['admin']=true; $GLOBALS['wpdb']=new FixtureDb();
 $GLOBALS['response']=['response'=>['code'=>200],'body'=>'{"data":{"message_outbox_ids":[12345]},"meta":{"status":true}}'];
 $_POST=['_wpnonce'=>'fixture-nonce','option_page'=>'nahan-settings']; $_SERVER=['REMOTE_ADDR'=>'127.0.0.1','REQUEST_METHOD'=>'POST'];
 $GLOBALS['env']='local'; $GLOBALS['columns']=['id','delivery_mode','code_length','credential_mode','installation_origin','otp_code_length']; $GLOBALS['actions']=[];
 return new SmsService(new Settings());
}
function panel() { $p=new AdminPanel(new Settings()); $p->register_settings(); return $p; }
function save($key,$value) { expect(isset($GLOBALS['registered']['nahan_'.$key]['sanitize_callback']),'Actual registered sanitizer required'); update_option('nahan_'.$key,$value); return get_option('nahan_'.$key); }
class FixturePlugin { public static $fixture; public static function instance() { return self::$fixture; } }
class_alias(FixturePlugin::class,'Nahan\\Core\\Plugin');
class WP_REST_Response { public function __construct(public $data, public $status=200) {} }
require_once NAHAN_CORE_DIR.'rest-api/class-rest-helper.php';
function add_menu_page(...$args) {}
function add_submenu_page($parent,$title,$label,$cap,$slug,$callback) { $GLOBALS['menus'][$slug]=[$cap,$callback]; }
function register_rest_route($ns,$path,$route) { $GLOBALS['routes'][$path]=$route; }
function local_gate(array $overrides=[]) { return new LocalDevelopmentGate(array_merge(['local_development'=>true,'local_dev_otp'=>true,'environment_type'=>'local','site_url'=>'http://localhost/karban','remote_addr'=>'127.0.0.1'], $overrides)); }
function otp($gate=null) { return new OtpManager(new SmsService(new Settings()),$gate??local_gate()); }
function ready_options() { $GLOBALS['options']['siteurl']='http://localhost/karban'; }
const DIAGNOSTIC='nahan_last_otp_send_diagnostic';
function private_absent($value) {
 $json=json_encode($value,JSON_THROW_ON_ERROR);
 foreach(['fixture-key','09121234567','+989121234567','54321','private-provider','private-transport','private-storage','outbox','exception-canary'] as $secret) expect(!str_contains($json,$secret),'Sensitive canary absent');
}
function last_attempt() { $record=get_option(DIAGNOSTIC); expect(is_array($record),'Last actual OTP attempt must be recorded'); private_absent($record); return $record; }
function admin_html() {
 $p=new AdminPanel(new Settings()); $p->register(); ($GLOBALS['actions']['admin_menu'])();
 same('manage_options',$GLOBALS['menus']['nahan-settings'][0],'Registered admin-only field');
 ob_start(); try { ($GLOBALS['menus']['nahan-settings'][1])(); return ob_get_contents(); } finally { ob_end_clean(); }
}
$tests=[];
$tests['future-only diagnostic: readiness admin render and simulation do not fabricate attempts']=function() {
 reset_fixture(); ready_options(); otp()->readiness(); $html=admin_html();
 expect(str_contains($html,'آخرین تلاش ارسال'),'Diagnostic field rendered'); expect(str_contains($html,'ثبت نشده'),'No historical guess'); same(false,get_option(DIAGNOSTIC),'No invented history'); same([],$GLOBALS['writes'],'Read-only paths'); same([],$GLOBALS['http'],'No ping');
 otp()->request('09121234567','127.0.0.1'); same(false,get_option(DIAGNOSTIC),'Simulation is not SMS attempt');
};
$tests['accepted response is recorded without delivery claim IDs or private data']=function() {
 $s=reset_fixture(); same(true,$s->send_otp('09121234567','54321'),'Acceptance unchanged'); $r=last_attempt();
 same(['timestamp','provider','outcome','http_status'],array_keys($r),'Exact bounded fields'); same('accepted_not_delivery',$r['outcome'],'Acceptance not delivery'); same(200,$r['http_status'],'Known HTTP status'); expect((bool)preg_match('/\A[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z\z/D',$r['timestamp']),'UTC timestamp');
};
// HTTP status is optional but present when known; assert the exact accepted record separately.
$tests['classification matrix preserves strict provider parser and never retries']=function() {
 $cases=[
  [401,'{"meta":{"status":false,"message_code":"401-1","message":"private-provider"}}','provider_rejected'],
  [422,'{"meta":{"status":false}}','provider_rejected'],[503,'private-provider','provider_rejected'],
  [200,'{"meta":{"status":false,"message_code":"400-12"}}','provider_rejected'],
  [200,'not-json private-provider','invalid_response'],[200,'{"meta":{"status":true},"data":{"message_outbox_ids":{"0":1}}}','invalid_response'],
  [200,'{"meta":{"status":true},"data":{"message_outbox_ids":["1"]}}','invalid_response'],
  [200,'{"meta":{"status":"true"}}','invalid_response'],[200,str_repeat('x',16385),'invalid_response'],
 ];
 foreach($cases as [$http,$body,$outcome]) {
  $s=reset_fixture(); $GLOBALS['response']=['response'=>['code'=>$http],'body'=>$body]; error_safe($s->send_otp('09121234567','54321'),'sms_provider_error');
  $r=last_attempt(); same($outcome,$r['outcome'],'Precise fixed outcome'); same($http,$r['http_status'],'Known bounded HTTP'); same(1,count($GLOBALS['http']),'One send only'); same([[DIAGNOSTIC,false]],$GLOBALS['writes'],'One nonautoload record');
 }
};
$tests['transport classification consumes only known codes and never stores raw causes']=function() {
 foreach([['http_request_failed','cURL error 60: private-transport fixture-key','TLS'],['http_request_failed','cURL error 6: private-transport','DNS'],['http_request_failed','cURL error 28: private-transport','timeout'],['http_request_failed','cURL error 7: private-transport','connect'],['timeout','private-transport','timeout'],['invented_tls','private-transport','unknown'],['http_request_failed','arbitrary cURL error 60: private-transport','unknown']] as [$code,$message,$class]) {
  $s=reset_fixture(); $GLOBALS['response']=new WP_Error($code,$message,['secret'=>'fixture-key']); error_safe($s->send_otp('09121234567','54321'),'sms_transport_error');
  $r=last_attempt(); same('transport_error',$r['outcome'],'Transport outcome'); same($class,$r['transport_class'],'Known transport code'); expect(!isset($r['http_status']),'No invented HTTP status'); private_absent(admin_html());
 }
};
$tests['vendor codes strict grammar only; unknown fields and statuses never persisted']=function() {
 foreach(['401-1','200-123','401-1234','40-1','401-1\n','401-1 private-provider',401,[],null] as $code) {
  $s=reset_fixture(); $GLOBALS['response']=['response'=>['code'=>200],'body'=>json_encode(['meta'=>['status'=>false,'message_code'=>$code,'message'=>'private-provider fixture-key 54321'],'extra'=>'09121234567'])];
  $s->send_otp('09121234567','54321'); $r=last_attempt(); same(in_array($code,['401-1','200-123'],true),isset($r['vendor_code']),'Strict code filter');
 }
 foreach([0,600,999] as $status) { $s=reset_fixture(); $GLOBALS['response']['response']['code']=$status; $s->send_otp('09121234567','54321'); expect(!isset(last_attempt()['http_status']),'Invalid status absent'); }
};
$tests['best effort diagnostic storage cannot turn acceptance into failure or resend']=function() {
 foreach(['fail_write','throw_write'] as $failure) { $s=reset_fixture(); $GLOBALS[$failure]=true; same(true,$s->send_otp('09121234567','54321'),'Accepted even when storage unavailable'); same(1,count($GLOBALS['http']),'No retry'); }
 $s=reset_fixture(); $GLOBALS['throw_write']=true; $GLOBALS['response']=new WP_Error('timeout','private-transport'); error_safe($s->send_otp('09121234567','54321'),'sms_transport_error');
};
$tests['admin gate and corrupt stored values cannot leak or send']=function() {
 reset_fixture(); $GLOBALS['options'][DIAGNOSTIC]=['timestamp'=>'private-provider','provider'=>'<script>private-provider</script>','outcome'=>'private-provider','vendor_code'=>'fixture-key','extra'=>'09121234567']; private_absent(admin_html()); same([],$GLOBALS['writes'],'Rendering never repairs storage');
 $GLOBALS['admin']=false; try { admin_html(); throw new LogicException('Must deny'); } catch(ControlledStop $e) {} same([],$GLOBALS['http'],'No send');
};
$tests['registered OTP route preserves safe failure invalidation and cooldown; no phantom success']=function() {
 reset_fixture(); ready_options(); $GLOBALS['options']['nahan_local_otp_policy']=['mode'=>'sms','sms_armed'=>true];
 $GLOBALS['response']=new WP_Error('timeout','private-transport fixture-key 09121234567 54321');
 $GLOBALS['routes']=[]; require NAHAN_CORE_DIR.'rest-api/auth-routes.php'; FixturePlugin::$fixture=(object)['otp'=>otp()];
 $req=new class { function get_param($k) { return '09121234567'; } };
 $route=$GLOBALS['routes']['/auth/otp/request']; $r=($route['callback'])($req); same('sms_transport_error',$r->data['error']['code'],'Safe route category'); private_absent($r->data); same([],$GLOBALS['wpdb']->rows,'Failed challenge invalidated');
 $r=($route['callback'])($req); same('otp_throttled',$r->data['error']['code'],'Cooldown retained'); same(1,count($GLOBALS['http']),'Never resend on failure');
};
$failed=0; foreach($tests as $name=>$test) { try { $test(); echo "PASS $name\n"; } catch(Throwable $e) { $failed++; echo "FAIL $name: ".$e->getMessage()."\n"; } } echo count($tests).' tests; '.$failed." failures\n"; exit($failed?1:0);
