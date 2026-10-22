<?php
/** Task9A: real SmsService and registered AdminPanel callbacks; fake WP HTTP/options/DB only. No WP bootstrap. */
declare(strict_types=1);
define('ABSPATH', __DIR__ . '/');
define('ARRAY_A', 'ARRAY_A');
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
function wp_verify_nonce($nonce,$action) { return $nonce==='fixture-nonce' && $action==='nahan-settings-options'; }
function wp_unslash($v) { return is_array($v) ? array_map('wp_unslash',$v) : (is_string($v) ? stripslashes($v) : $v); }
final class ControlledStop extends RuntimeException {}
function wp_die($message) { throw new ControlledStop('Controlled stop: '.$message); }
function settings_fields($g) { echo '<input type="hidden" name="_wpnonce" value="fixture-nonce" />'; }
function admin_url($path='') { return '/wp-admin/'.$path; }
function wp_nonce_field($action) { echo '<input name="_wpnonce" value="fixture-nonce" />'; }
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
 public function get_col($sql,$column=0) { return ['id','delivery_mode','code_length']; }
 public function get_row($q,$mode=null) {
  [$sql,$args]=$q;
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
  throw new RuntimeException('Unexpected mutation');
 }
 public function delete($t,$where,$format=null) { throw new RuntimeException('Must not broadly delete challenges or clear throttle'); }
}
require_once NAHAN_CORE_DIR.'includes/class-helpers.php';
require_once NAHAN_CORE_DIR.'includes/class-rate-limiter.php';
require_once NAHAN_CORE_DIR.'includes/admin/class-settings.php';
require_once NAHAN_CORE_DIR.'includes/admin/class-admin-panel.php';
require_once NAHAN_CORE_DIR.'includes/auth/class-sms-service.php';
require_once NAHAN_CORE_DIR.'includes/class-local-development-gate.php';
require_once NAHAN_CORE_DIR.'includes/auth/class-otp-schema.php';
require_once NAHAN_CORE_DIR.'includes/auth/class-otp-manager.php';
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
 $_POST=['_wpnonce'=>'fixture-nonce','option_page'=>'nahan-settings']; $_SERVER=[];
 return new SmsService(new Settings());
}
function panel() { $p=new AdminPanel(new Settings()); $p->register_settings(); return $p; }
function save($key,$value) { expect(isset($GLOBALS['registered']['nahan_'.$key]['sanitize_callback']),'Actual registered sanitizer required'); update_option('nahan_'.$key,$value); return get_option('nahan_'.$key); }
$tests=[];
$tests['fixed Edge HTTP contract and dynamic OTP parameter']=function() {
 $s=reset_fixture(); same(true,$s->send_otp('۰۹۱۲۱۲۳۴۵۶۷','54321'),'Documented acceptance'); same(1,count($GLOBALS['http']),'One transport only');
 [$url,$args]=$GLOBALS['http'][0]; same('https://edge.ippanel.com/v1/api/send',$url,'Fixed HTTPS endpoint'); same('fixture-key',$args['headers']['Authorization'],'Raw key without Bearer');
 same('application/json',$args['headers']['Content-Type'],'JSON content'); same('application/json',$args['headers']['Accept'],'JSON accept'); same(0,$args['redirection'],'Never follow redirects'); expect($args['timeout']>0 && $args['timeout']<=10,'Bounded timeout'); expect(($args['limit_response_size']??PHP_INT_MAX)<=16384,'Bound HTTP response');
 same(['sending_type'=>'pattern','from_number'=>'+983000505','code'=>'fixture-pattern','recipients'=>['+989121234567'],'params'=>['login_code'=>'54321']],json_decode($args['body'],true),'Exact typed provider payload');
};
$tests['invalid configuration and inputs never call HTTP or log success']=function() {
 $cases=[['sms_faraz_apikey',''],['sms_faraz_apikey',"key\r\nInjected: x"],['sms_faraz_apikey','has space'],['sms_faraz_apikey',str_repeat('x',513)],['sms_faraz_pattern_code',''],['sms_faraz_pattern_code',"a\nb"],['sms_faraz_pattern_code',str_repeat('p',129)],['sms_faraz_originator','3000505'],['sms_faraz_originator','+0123456'],['sms_faraz_variable','x.y'],['sms_faraz_variable',''],['sms_faraz_variable',str_repeat('a',65)],['sms_driver','log'],['sms_driver','unknown']];
 foreach($cases as [$k,$v]) { $s=reset_fixture(); $GLOBALS['options']['nahan_'.$k]=$v; error_safe($s->send_otp('09121234567','54321')); same([],$GLOBALS['http'],'Invalid setting blocks HTTP'); }
 foreach(['not-phone','09121234567,09121111111'] as $phone) { $s=reset_fixture(); error_safe($s->send_otp($phone,'54321')); same([],$GLOBALS['http'],'One valid phone only'); }
 $s=reset_fixture(); unset($GLOBALS['options']['nahan_sms_faraz_variable']); same(true,$s->send_otp('09121234567','54321'),'Variable default code'); same(['code'=>'54321'],json_decode($GLOBALS['http'][0][1]['body'],true)['params'],'Default variable');
 foreach(['log','unknown','kavenegar'] as $driver) { $s=reset_fixture(); $GLOBALS['options']['nahan_sms_driver']=$driver; error_safe($s->send_by_pattern('09121234567','',['code'=>'54321'])); same([],$GLOBALS['http'],'Missing pattern cannot fall back'); }
};
$tests['strict documented acceptance and safe rejection without retries']=function() {
 $bodies=['{"meta":{"status":false},"data":{"message_outbox_ids":[1]}}','{"meta":{"status":"true"},"data":{"message_outbox_ids":[1]}}','{"meta":{"status":true},"data":{"message_outbox_ids":[]}}','{"meta":{"status":true},"data":{"message_outbox_ids":["bad"]}}','{"meta":{"status":true},"data":{"message_outbox_ids":[0]}}','{"meta":{"status":true},"data":{"message_outbox_ids":[1.5]}}','{"meta":{"status":true},"data":{"message_outbox_ids":{"x":1}}}','invalid-json',str_repeat('x',16385),'null','{"meta":{"status":true},"data":{"message_outbox_ids":[true]}}'];
 foreach($bodies as $body) { $s=reset_fixture(); $GLOBALS['response']['body']=$body; error_safe($s->send_otp('09121234567','54321'),'sms_provider_error'); same(1,count($GLOBALS['http']),'Never retry malformed response'); }
 foreach([301,401,422,500] as $http) { $s=reset_fixture(); $GLOBALS['response']['response']['code']=$http; error_safe($s->send_otp('09121234567','54321'),'sms_provider_error'); same(1,count($GLOBALS['http']),'No HTTP retry'); }
 $s=reset_fixture(); $GLOBALS['response']=new WP_Error('timeout','private-transport fixture-key 54321',['private-provider']); error_safe($s->send_otp('09121234567','54321'),'sms_transport_error'); same(1,count($GLOBALS['http']),'Timeout not retried');
};
$tests['readiness is internal boolean and text is explicitly unsupported']=function() {
 $s=reset_fixture(); expect(method_exists($s,'is_otp_configured'),'Internal readiness seam'); same(true,$s->is_otp_configured(),'Valid provider ready'); same([],$GLOBALS['http'],'Readiness never pings');
 unset($GLOBALS['options']['nahan_sms_faraz_apikey']); same(false,$s->is_otp_configured(),'Missing secret not ready'); error_safe($s->send_text('09121234567','notification'),'sms_text_unsupported'); same([],$GLOBALS['http'],'No text transport for Faraz');
};
$tests['registered form masks both SMS keys, escapes fields and renders nonce']=function() {
 reset_fixture(); $GLOBALS['options']['nahan_sms_kavenegar_apikey']='fixture-legacy-secret'; $GLOBALS['options']['nahan_sms_faraz_pattern_code']='\"><script>bad</script>'; $p=panel(); ob_start(); $p->render_settings(); $html=ob_get_clean();
 expect(!str_contains($html,'fixture-key')&&!str_contains($html,'fixture-legacy-secret'),'Never render saved SMS keys');
 foreach(['faraz','kavenegar'] as $driver) { expect((bool)preg_match('/<input[^>]*type="password"[^>]*name="nahan_sms_'.$driver.'_apikey"[^>]*value=""[^>]*autocomplete="off"/',$html),'Blank masked key field'); expect(str_contains($html,'name="nahan_sms_'.$driver.'_apikey_clear"'),'Explicit separate clear intent'); }
 expect(str_contains($html,'data-configured="yes"'),'Safe presence indicator'); expect(str_contains($html,'name="_wpnonce"'),'Settings API nonce'); expect(!str_contains($html,'<script>bad</script>'),'Escaped field values'); same([],$GLOBALS['http'],'Render never sends');
 $GLOBALS['admin']=false; try { $p->render_settings(); throw new LogicException('Must deny'); } catch(RuntimeException $e) { expect(!$e instanceof LogicException,'Low capability render denied'); }
};
$tests['registered sanitizers retain blank and invalid keys; explicit clear only']=function() {
 reset_fixture(); panel(); same('fixture-key',save('sms_faraz_apikey',''),'Blank retains'); same(false,$GLOBALS['autoload']['nahan_sms_faraz_apikey'],'Retained key nonautoload');
 same('replacement-key',save('sms_faraz_apikey','replacement-key'),'Change key'); same(false,$GLOBALS['autoload']['nahan_sms_faraz_apikey'],'New key nonautoload');
 foreach(["bad\r\nheader",'spaces invalid',[],str_repeat('a',513)] as $bad) same('replacement-key',save('sms_faraz_apikey',$bad),'Invalid retains');
 $_POST['nahan_sms_faraz_apikey_clear']='1'; same('',save('sms_faraz_apikey',''),'Explicit clear'); same([],$GLOBALS['http'],'Sanitizers never send');
 reset_fixture(); panel(); unset($GLOBALS['options']['nahan_sms_faraz_apikey']); same('new-fixture-key',save('sms_faraz_apikey','new-fixture-key'),'First save'); same(false,$GLOBALS['autoload']['nahan_sms_faraz_apikey'],'First save disables autoload');
};
$tests['capability nonce allowlist and strict field validation']=function() {
 foreach([['admin',false],['nonce','wrong']] as [$k,$v]) { reset_fixture(); panel(); if($k==='admin') $GLOBALS['admin']=$v; else $_POST['_wpnonce']=$v; $_POST['nahan_sms_faraz_apikey_clear']='1'; foreach(['sms_faraz_apikey'=>'replacement-key','sms_driver'=>'log'] as $key=>$value) { try { save($key,$value); throw new LogicException('Must deny save'); } catch(ControlledStop $e) {} } same('fixture-key',get_option('nahan_sms_faraz_apikey'),'Unauthorized change/clear retained'); same('faraz_ippanel',get_option('nahan_sms_driver'),'Unauthorized driver retained'); same([],$GLOBALS['writes'],'No unauthorized writes'); }
 reset_fixture(); panel(); foreach(['unknown',[],"faraz_ippanel\n"] as $bad) same('faraz_ippanel',save('sms_driver',$bad),'Driver strict allowlist');
 foreach(['sms_faraz_pattern_code'=>"bad\npattern",'sms_faraz_originator'=>'3000','sms_faraz_variable'=>'bad.name'] as $key=>$bad) { $old=get_option('nahan_'.$key); same($old,save($key,$bad),'Invalid field retains'); }
 same('verification-code',save('sms_faraz_variable','verification-code'),'Approved variable name'); same('log',save('sms_driver','log'),'Allowlist log retained for non-OTP'); expect(count($GLOBALS['settings_errors'])>0,'Safe validation errors reported');
};
$tests['failed checked option writes cannot report configured success']=function() {
 foreach(['fail_write','fail_autoload'] as $failure) { reset_fixture(); panel(); $GLOBALS[$failure]=true; try { save('sms_faraz_apikey',$failure==='fail_write'?'replacement-key':''); throw new LogicException('Must stop failed persistence'); } catch(ControlledStop $e) { expect(!str_contains($e->getMessage(),'private'),'Storage failure safe'); } same('fixture-key',get_option('nahan_sms_faraz_apikey'),'Failure retains old value'); }
};
$tests['real manager invalidates only failed persisted challenge and retains throttle']=function() {
 $s=reset_fixture(); $db=$GLOBALS['wpdb']; $db->rows[100]=['id'=>100,'tracking_code'=>'unrelated','code_hash'=>'hash','consumed_at'=>null];
 $GLOBALS['response']=new WP_Error('timeout','private-transport');
 $gate=new LocalDevelopmentGate(['local_development'=>false,'local_dev_otp'=>false,'environment_type'=>'production','site_url'=>'https://example.test','remote_addr'=>'127.0.0.1']);
 $m=new OtpManager($s,$gate); error_safe($m->request('09121234567','192.0.2.1'),'sms_transport_error'); same([100],array_keys($db->rows),'Only failed challenge removed'); same(1,count($db->mutations),'One checked CAS invalidation'); same(1,count($GLOBALS['http']),'One request'); error_safe($m->request('09121234567','192.0.2.1'),'otp_throttled'); same(1,count($GLOBALS['http']),'Failure retains throttle');
 foreach([0,false] as $failed) { $s=reset_fixture(); $GLOBALS['response']=new WP_Error('timeout','private-transport'); $GLOBALS['wpdb']->invalidate_result=$failed; error_safe((new OtpManager($s,$gate))->request('09121234567','192.0.2.1'),'otp_storage_unavailable'); }
 $s=reset_fixture(); $result=(new OtpManager($s,$gate))->request('09121234567','192.0.2.1'); expect(is_array($result),'Accepted request gets tracking only'); same('sms',$result['delivery_mode'],'Normal provenance'); same(5,$result['code_length'],'Normal five-digit mode'); expect(!isset($result['code']),'No code returned'); $row=array_values($GLOBALS['wpdb']->rows)[0]; $body=json_decode($GLOBALS['http'][0][1]['body'],true); same(hash('sha256',$body['params']['login_code']),$row['code_hash'],'Standard hashed persisted OTP'); same(120,$result['expires_in'],'Standard TTL');
};
$tests['numeric variable names still encode params as a JSON object']=function() {
 $s=reset_fixture(); $GLOBALS['options']['nahan_sms_faraz_variable']='0'; same(true,$s->send_otp('09121234567','54321'),'Numeric identifier allowed'); $body=json_decode($GLOBALS['http'][0][1]['body']); expect($body->params instanceof stdClass,'Params must be object, never a JSON array'); same('54321',$body->params->{'0'},'Exact numeric variable mapping');
};
$tests['object-shaped IDs cannot be mistaken for a list']=function() {
 $s=reset_fixture(); $GLOBALS['response']['body']='{"meta":{"status":true},"data":{"message_outbox_ids":{"0":12345}}}'; error_safe($s->send_otp('09121234567','54321'),'sms_provider_error');
};
$tests['invalid legacy key cannot bypass boundaries']=function() {
 foreach(['',"key\r\nheader"] as $key) { $s=reset_fixture(); $GLOBALS['options']['nahan_sms_driver']='kavenegar'; $GLOBALS['options']['nahan_sms_kavenegar_pattern']='fixture-pattern'; $GLOBALS['options']['nahan_sms_kavenegar_apikey']=$key; error_safe($s->send_otp('09121234567','54321'),'sms_misconfigured'); same([],$GLOBALS['http'],'Invalid legacy credentials block HTTP too'); }
};
$tests['unauthorized first-time settings cannot write even defaults']=function() {
 foreach([false,true] as $cap) { reset_fixture(); panel(); $GLOBALS['options']=[]; $GLOBALS['admin']=$cap; $_POST['_wpnonce']='wrong'; try { save('sms_faraz_apikey','new-fixture-key'); } catch(ControlledStop $e) {} same([],$GLOBALS['writes'],'Unauthorized outer Settings API update must not create option'); }
};
$tests['OTP log driver neither logs nor reports success']=function() {
 $s=reset_fixture(); $GLOBALS['options']['nahan_sms_driver']='log'; $file=tempnam(getenv('TMPDIR'),'task9a-log-'); $before=ini_get('error_log'); ini_set('error_log',$file);
 try { error_safe($s->send_otp('09121234567','54321'),'sms_misconfigured'); error_safe($s->send_by_pattern('09121234567','fixture-pattern',['code'=>'54321']),'sms_misconfigured'); same('',file_get_contents($file),'OTP paths must not log codes or full phones'); } finally { ini_set('error_log',$before); unlink($file); }
};
$tests['first invalid secret save cannot create an autoloaded option']=function() {
 reset_fixture(); panel(); unset($GLOBALS['options']['nahan_sms_faraz_apikey']); same('',save('sms_faraz_apikey',"invalid\r\nheader"),'Invalid new key not saved'); same(false,$GLOBALS['autoload']['nahan_sms_faraz_apikey']??null,'Even retained empty secret option must not autoload');
};
$tests['all real OTP drivers reject malformed phones before HTTP']=function() {
 $s=reset_fixture(); $GLOBALS['options']['nahan_sms_driver']='kavenegar'; $GLOBALS['options']['nahan_sms_kavenegar_apikey']='fixture-legacy-key'; $GLOBALS['options']['nahan_sms_kavenegar_pattern']='fixture-pattern'; error_safe($s->send_otp('not-phone','54321'),'sms_invalid_phone'); same([],$GLOBALS['http'],'Legacy OTP must validate phone too');
};
$tests['legacy OTP acceptance preserved and legacy transport details redacted']=function() {
 $s=reset_fixture(); $GLOBALS['options']['nahan_sms_driver']='kavenegar'; $GLOBALS['options']['nahan_sms_kavenegar_apikey']='fixture-legacy-key'; $GLOBALS['options']['nahan_sms_kavenegar_pattern']='fixture-pattern';
 $GLOBALS['response']=['response'=>['code'=>200],'body'=>'{"return":{"status":200}}']; same(true,$s->send_otp('09121234567','54321'),'Existing accepted Kavenegar response');
 $GLOBALS['response']=['response'=>['code'=>422],'body'=>'{"return":{"status":422,"message":"private-provider fixture-key 54321"}}']; error_safe($s->send_otp('09121234567','54321'),'sms_provider_error');
 $GLOBALS['response']=new WP_Error('timeout','private-transport fixture-key 54321'); error_safe($s->send_otp('09121234567','54321'),'sms_transport_error');
};
// Installed options.php lines 336–345: trim the slashed scalar, then unslash,
// then call update_option. Keep the ORIGINAL slashed POST field for the sanitizer.
function settings_post_save($key,$raw,$present=true) {
 $option='nahan_'.$key; $_POST['option_page']='nahan-settings'; $_POST['action']='update';
 if ($present) $_POST[$option]=is_string($raw)?addslashes($raw):$raw; else unset($_POST[$option]);
 $value=null;
 if (isset($_POST[$option])) { $value=$_POST[$option]; if (!is_array($value)) $value=trim($value); $value=wp_unslash($value); }
 update_option($option,$value); return get_option($option);
}
$tests['options.php preprocessing cannot repair malformed submitted SMS keys']=function() {
 foreach(['sms_faraz_apikey','sms_kavenegar_apikey'] as $key) {
  foreach([' replacement-key','replacement-key ',"\r\nreplacement-key\r\n","\treplacement-key\t",' ',"\r\n","\t",['not-scalar']] as $raw) {
   reset_fixture(); panel(); $GLOBALS['options']['nahan_'.$key]='prior-fixture-key'; $GLOBALS['autoload']['nahan_'.$key]=true;
   same('prior-fixture-key',settings_post_save($key,$raw),'Malformed raw key must retain prior key despite normalized argument');
   expect(count($GLOBALS['settings_errors'])>0,'Whitespace is invalid, not silently blank-retain or repaired-valid'); same(false,$GLOBALS['autoload']['nahan_'.$key],'Retention keeps non-autoload storage');
   $p=new AdminPanel(new Settings()); ob_start(); $p->render_settings(); $html=ob_get_clean(); expect(str_contains($html,'data-configured="yes"'),'Retained configured indicator'); expect(!str_contains($html,'prior-fixture-key'),'Retained secret never rendered'); same([],$GLOBALS['http'],'No transport during settings processing');
  }
 }
};
$tests['options.php slashed exact valid blank missing and explicit clear retain semantics']=function() {
 foreach(['sms_faraz_apikey','sms_kavenegar_apikey'] as $key) {
  reset_fixture(); panel(); $GLOBALS['options']['nahan_'.$key]='prior-fixture-key';
  // Printable quote/backslash bytes prove correct, exactly-once unslashing.
  $valid="fixture-'quoted'-\\\\key";
  same($valid,settings_post_save($key,$valid),'Exact valid raw key persists byte-for-byte'); same(false,$GLOBALS['autoload']['nahan_'.$key],'Exact valid key not autoloaded');
  same($valid,settings_post_save($key,''),'Exactly empty retains'); same($valid,settings_post_save($key,null,false),'Missing field retains'); same([],$GLOBALS['settings_errors'],'True blank/missing are not malformed');
  $_POST['nahan_'.$key.'_clear']='1'; same('',settings_post_save($key,"\tmalformed\r\n"),'Explicit authorized clear remains deliberate'); same(false,$GLOBALS['autoload']['nahan_'.$key],'Cleared option not autoloaded'); same([],$GLOBALS['http'],'No settings transport');
 }
};
$tests['raw settings submission cannot bypass capability nonce or direct-call validation']=function() {
 foreach([false,true] as $admin) {
  reset_fixture(); panel(); $GLOBALS['options']=[]; $GLOBALS['admin']=$admin; if($admin) $_POST['_wpnonce']='wrong'; $_POST['nahan_sms_faraz_apikey_clear']='1';
  try { settings_post_save('sms_faraz_apikey','new-fixture-key'); throw new LogicException('Must reject unauthorized initial save'); } catch(ControlledStop $e) {}
  same([],$GLOBALS['writes'],'Unauthorized initial settings POST writes nothing'); same([],$GLOBALS['options'],'Unauthorized clear cannot create option');
 }
 reset_fixture(); panel(); unset($_POST['option_page']); $_POST['nahan_sms_faraz_apikey']='unrelated-post-value';
 same('direct-valid-key',save('sms_faraz_apikey','direct-valid-key'),'Non-settings programmatic context validates its actual argument');
 same('direct-valid-key',save('sms_faraz_apikey',' direct-invalid-key '),'Programmatic malformed key remains rejected');
};
$failed=0; foreach($tests as $name=>$test) { try { $test(); echo "PASS $name\n"; } catch(Throwable $e) { $failed++; echo "FAIL $name: ".$e->getMessage()."\n"; } } echo count($tests).' tests; '.$failed." failures\n"; exit($failed?1:0);
