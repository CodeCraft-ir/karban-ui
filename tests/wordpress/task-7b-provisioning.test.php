<?php
/** Actual OTP verify callback provisioning contract. No WP bootstrap/DB/network. */
declare(strict_types=1);
namespace Nahan\Core { final class Plugin {public static $test;public static function instance(){return self::$test;}} }
namespace {
define('ABSPATH',__DIR__.'/');define('NAHAN_CORE_DIR',rtrim($argv[1]??'','/').'/');
class WP_Error {public function __construct(private $c,private $m='',private $d=[]){}public function get_error_code(){return $this->c;}public function get_error_message(){return $this->m;}public function get_error_data(){return $this->d;}}
class WP_REST_Response {public function __construct(public $data,public $status=200){}}
class WP_User {public function __construct(public $ID,public $display_name,public $roles,public $user_login='') {}}
class Request {public function __construct(private $params=[]){}public function get_param($k){return $this->params[$k]??null;}}
function is_wp_error($v){return $v instanceof WP_Error;}
function register_rest_route($ns,$path,$args){$GLOBALS['routes'][$path]=$args;}
function wp_slash($v){return is_string($v)?addslashes($v):(is_array($v)?array_map('wp_slash',$v):$v);}
function get_users($args){$GLOBALS['user_query']=$args;return array_values(array_filter($GLOBALS['users'],fn($u)=>(string)get_user_meta($u->ID,$args['meta_key'],true)===(string)$args['meta_value']));}
function get_userdata($id){return $GLOBALS['users'][$id]??null;}
function get_user_meta($id,$key,$single=true){return $GLOBALS['um'][$id][$key]??'';}
function update_user_meta($id,$key,$value){if($GLOBALS['fail']===$key)return false;if(get_user_meta($id,$key)===$value)return false;$GLOBALS['um'][$id][$key]=$value;return 1;}
function get_post($id){return $GLOBALS['posts'][$id]??null;}
function get_post_meta($id,$key,$single=true){return $GLOBALS['pm'][$id][$key]??'';}
function update_post_meta($id,$key,$value){if($GLOBALS['fail']===$key)return false;if(get_post_meta($id,$key)===$value)return false;$GLOBALS['pm'][$id][$key]=$value;return 1;}
function get_post_stati(){return array_fill_keys(['draft','pending','publish','private','future','trash','auto-draft','inherit','custom'],true);}
function get_posts($args){$GLOBALS['post_queries'][]=$args;return array_values(array_filter($GLOBALS['posts'],function($p)use($args){if($p->post_type!==$args['post_type'])return false;if(isset($args['author'])&&(int)$p->post_author!==$args['author'])return false;if(isset($args['meta_key'])&&(string)get_post_meta($p->ID,$args['meta_key'])!==(string)$args['meta_value'])return false;return true;}));}
function wp_insert_post($args,$error=false){$GLOBALS['insert_post_error_flag']=$error;if($GLOBALS['fail']==='post-error')return new WP_Error('sensitive-db','PRIVATE SQL');if($GLOBALS['fail']==='post-zero')return 0;$id=100+count($GLOBALS['posts']);$GLOBALS['posts'][$id]=(object)array_merge(['ID'=>$id,'post_name'=>'','post_password'=>''],$args);return $id;}
function wp_generate_password($length=12,$special=true,$extra=false){return str_repeat('p',$length);}
function wp_insert_user($args){$GLOBALS['created_users']++;if(strlen($args['user_login'])>60)return new WP_Error('user_login_too_long');if($GLOBALS['fail']==='insert-user')return new WP_Error('db','PRIVATE SQL');$id=10+count($GLOBALS['users']);$GLOBALS['users'][$id]=new WP_User($id,$args['display_name'],[$args['role']],$args['user_login']);return $id;}
function username_exists($name){foreach($GLOBALS['users'] as $u)if($u->user_login===$name)return $u->ID;return false;}
function add_option($key,$value,$deprecated='',$autoload=true){if($GLOBALS['lock_busy']||isset($GLOBALS['options'][$key]))return false;$GLOBALS['options'][$key]=$value;return true;}
function delete_option($key){if(!isset($GLOBALS['options'][$key]))return false;unset($GLOBALS['options'][$key]);return true;}
function get_option($key,$default=false){return $GLOBALS['options'][$key]??$default;}
function check($v,$m){if(!$v)throw new RuntimeException($m);$GLOBALS['assertions']=($GLOBALS['assertions']??0)+1;}
function reset_fixture(){
 $GLOBALS['users']=[];$GLOBALS['um']=[];$GLOBALS['posts']=[];$GLOBALS['pm']=[];$GLOBALS['options']=[];$GLOBALS['fail']='';$GLOBALS['created_users']=0;$GLOBALS['issued']=0;$GLOBALS['lock_busy']=false;$GLOBALS['post_queries']=[];
 \Nahan\Core\Plugin::$test=(object)['otp'=>new class {public function verify_with_context($t,$code,$before){$context=['phone'=>'09123456789','delivery_mode'=>'local_simulated','code_length'=>6];$result=$before($context);return is_wp_error($result)?$result:$context;}},'jwt'=>new class {public function validate_context_for_issuance($ctx){$GLOBALS['validated_context']=$ctx;return true;}public function issue_pair($uid,$device,$ctx){$GLOBALS['issued']++;$GLOBALS['issued_context']=$ctx;return ['access_token'=>'fixture','refresh_token'=>'fixture'];}}];
}
function verify($role='specialist'){return ($GLOBALS['routes']['/auth/otp/verify']['callback'])(new Request(['tracking_code'=>'fixture','code'=>'145632','role'=>$role,'delivery_mode'=>'sms']));}
function existing($role='nahan_specialist'){ $GLOBALS['users'][2]=new WP_User(2,'Existing',[$role]);$GLOBALS['um'][2]['nahan_phone']='09123456789';}
require NAHAN_CORE_DIR.'includes/class-autoloader.php';\Nahan\Core\Autoloader::register();require NAHAN_CORE_DIR.'rest-api/class-rest-helper.php';require NAHAN_CORE_DIR.'rest-api/auth-routes.php';
foreach(['post-error','post-zero','insert-user','nahan_phone','user','nahan_specialist_post'] as $failure){reset_fixture();$GLOBALS['fail']=$failure;$r=verify();check($r->status>=400,'provisioning failure '.$failure);check($GLOBALS['issued']===0,'noJWT after '.$failure);check(!str_contains(json_encode($r->data),'PRIVATE SQL'),'safe failure');}
reset_fixture();$r=verify();check($r->status===200 && $GLOBALS['issued']===1,'new specialist succeeds');$uid=$r->data['data']['user']['id'];$sid=get_user_meta($uid,'nahan_specialist_post');check($sid>0 && get_post_meta($sid,'user')===$uid && (int)get_post($sid)->post_author===$uid,'checked links');check($GLOBALS['insert_post_error_flag']===true,'wp_insert_post checked WP_Error mode');check(get_post_meta($sid,'phone_display')==='','login phone not copied');check(get_post($sid)->post_status==='draft','no publication');check(get_post($sid)->post_name!=='','stable server slug on provisioning');check($GLOBALS['issued_context']===$GLOBALS['validated_context'] && $GLOBALS['issued_context']['delivery_mode']==='local_simulated','trusted context preserved');
$again=verify('client');check($again->data['data']['user']['id']===$uid && $again->data['data']['user']['roles']===['nahan_specialist'],'existing role immutable');check(count($GLOBALS['posts'])===1,'retry same profile');
reset_fixture();existing('nahan_client');$r=verify();check($r->status===200 && $r->data['data']['user']['roles']===['nahan_client'] && !$GLOBALS['posts'],'client unchanged by intent');
reset_fixture();existing();$r=verify('client');check($r->status===200 && count($GLOBALS['posts'])===1,'existing specialist missing profile repaired by own role');
reset_fixture();$GLOBALS['fail']='nahan_specialist_post';$r=verify();check(count($GLOBALS['users'])===1 && count($GLOBALS['posts'])===1 && $GLOBALS['issued']===0,'partial account/profile retained');$GLOBALS['fail']='';$r=verify();check($r->status===200 && count($GLOBALS['users'])===1 && count($GLOBALS['posts'])===1,'partial pointer safely repaired');
reset_fixture();$GLOBALS['fail']='user';$r=verify();check($GLOBALS['issued']===0,'failed user creation blocks JWT');
reset_fixture();existing();$GLOBALS['fail']='user';$r=verify();check($GLOBALS['issued']===0 && count($GLOBALS['posts'])===1,'backlink partial blocksJWT');$GLOBALS['fail']='';$r=verify();check($r->status===200 && count($GLOBALS['posts'])===1,'marked backlink partial repair');
reset_fixture();$GLOBALS['fail']='nahan_phone';verify();$GLOBALS['fail']='';$r=verify();check($r->status===409 && count($GLOBALS['users'])===1,'orphan username conflict not duplicate identity');
reset_fixture();existing();$GLOBALS['users'][3]=new WP_User(3,'Duplicate',['nahan_client']);$GLOBALS['um'][3]['nahan_phone']='09123456789';$r=verify();check($r->status===409 && $GLOBALS['issued']===0,'duplicate phone conflict');
reset_fixture();$GLOBALS['lock_busy']=true;$r=verify();check($r->status===409 && $GLOBALS['created_users']===0 && $GLOBALS['issued']===0,'concurrent registration fails conflict');
foreach(['foreign-author','foreign-backlink','wrong-cpt','corrupt-pointer','reverse-claim','duplicate-profile','trash'] as $case){reset_fixture();existing();$GLOBALS['posts'][20]=(object)['ID'=>20,'post_type'=>'nahan_specialist','post_author'=>2,'post_status'=>'draft','post_name'=>'stable','post_password'=>''];$GLOBALS['pm'][20]['user']=2;$GLOBALS['um'][2]['nahan_specialist_post']=20;
 if($case==='foreign-author')$GLOBALS['posts'][20]->post_author=3;
 if($case==='foreign-backlink')$GLOBALS['pm'][20]['user']=3;
 if($case==='wrong-cpt')$GLOBALS['posts'][20]->post_type='page';
 if($case==='corrupt-pointer')$GLOBALS['um'][2]['nahan_specialist_post']='20wrong';
 if($case==='reverse-claim'){$GLOBALS['users'][3]=new WP_User(3,'Foreign',['nahan_specialist']);$GLOBALS['um'][3]['nahan_specialist_post']=20;}
 if($case==='duplicate-profile'){$GLOBALS['posts'][21]=clone $GLOBALS['posts'][20];$GLOBALS['posts'][21]->ID=21;$GLOBALS['pm'][21]['user']=2;}
 if($case==='trash')$GLOBALS['posts'][20]->post_status='trash';
 $r=verify();check($r->status===409 && $GLOBALS['issued']===0,'invalid provisioning ownership '.$case);
}
reset_fixture();$r=verify('client');check($r->status===200 && $r->data['data']['user']['roles']===['nahan_client'] && count($GLOBALS['posts'])===0,'new client account complete without profile');check(count($GLOBALS['options'])===0,'lock released after success');
reset_fixture();existing();$GLOBALS['fail']='_nahan_registration_owner';$r=verify();check($r->status===503 && $GLOBALS['issued']===0,'marker write failure blocksJWT');$GLOBALS['fail']='';$r=verify();check($r->status===409 && count($GLOBALS['posts'])===1,'unmarked partial is not auto adopted or duplicated');
reset_fixture();existing();$GLOBALS['posts'][20]=(object)['ID'=>20,'post_type'=>'nahan_specialist','post_author'=>2,'post_status'=>'pending','post_name'=>'edited-slug','post_password'=>''];$GLOBALS['pm'][20]['user']=2;$r=verify('client');check($r->status===200 && get_user_meta(2,'nahan_specialist_post')===20 && count($GLOBALS['posts'])===1,'unique owned valid profile recovered');check(get_post(20)->post_name==='edited-slug' && get_post(20)->post_status==='pending','recovery preserves content state');
reset_fixture();existing();$GLOBALS['users'][2]->roles=['nahan_specialist','administrator'];$r=verify();check($r->status===409 && $GLOBALS['issued']===0 && $GLOBALS['users'][2]->roles===['nahan_specialist','administrator'],'mixed role fails without mutation');
foreach(['custom','trash','auto-draft','inherit'] as $state){reset_fixture();existing();$GLOBALS['posts'][20]=(object)['ID'=>20,'post_type'=>'nahan_specialist','post_author'=>2,'post_status'=>$state,'post_name'=>'stable','post_password'=>''];$GLOBALS['pm'][20]['user']=2;$r=verify();check($r->status===409 && count($GLOBALS['posts'])===1 && $GLOBALS['issued']===0,'all registered statuses fail closed '.$state);}
echo 'PASS task7B provisioning '.$GLOBALS['assertions']." assertions\n";
}
