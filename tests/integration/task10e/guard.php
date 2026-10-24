<?php
declare(strict_types=1);
namespace Task10E;

/** No WordPress bootstrap, environment credentials, driver or side effects here. */
final class Guard {
    private static array $fixture_ddl=[];
    public static function register_fixture_ddl(array $ddl,array $tables): void {
        self::require(array_keys($ddl)===$tables);
        $approved=[];
        foreach (array_values($ddl) as $index=>$q) {
            [$tokens]=self::tokens($q);
            self::require(array_slice($tokens,0,4)===['create','table',$tables[$index],'(']);
            self::create_tokens($tokens,$index); $approved[implode(' ',$tokens)]=true;
        }
        self::$fixture_ddl=$approved;
    }
    public static function require(bool $condition): void {
        if (!$condition) { throw new \RuntimeException('Task10E safety check failed.'); }
    }
    public static function arguments(array $args): array {
        $out=['execute'=>false,'confirm-db'=>null,'config'=>null,'manifest'=>null,'cleanup'=>false,'worker'=>false];
        $seen=[];
        foreach ($args as $arg) {
            self::require(is_string($arg));
            $pair=explode('=', $arg, 2); $key=substr($pair[0],2);
            self::require(str_starts_with($arg,'--') && array_key_exists($key,$out) && !isset($seen[$key])); $seen[$key]=true;
            if (in_array($key,['execute','cleanup','worker'],true)) { self::require(count($pair)===1); $out[$key]=true; }
            else { self::require(count($pair)===2 && $pair[1]!==''); $out[$key]=$pair[1]; }
        }
        self::require($out['execute'] === ($out['confirm-db']==='karban_financial_test'));
        self::require($out['execute'] || $out['confirm-db']===null);
        self::require(!$out['cleanup'] || ($out['execute'] && !$out['worker']));
        self::require(!$out['worker'] || ($out['execute'] && is_string($out['config']) && str_starts_with($out['config'],'/')));
        return $out;
    }
    /** Pure execution gate. Callback reads config ONLY after both execution switches.
     * No driver/factory dependency exists in this library; invalid configs cannot escape.
     */
    public static function preflight(array $raw,callable $read): array {
        $args=self::arguments($raw);
        if (!$args['execute']) { return ['arguments'=>$args,'configuration'=>null,'plan'=>self::plan()]; }
        $config=$read($args); self::require(is_array($config)); self::configuration($config);
        return ['arguments'=>$args,'configuration'=>$config,'plan'=>null];
    }
    public static function configuration(#[\SensitiveParameter] array $c): void {
        $keys=['host','database','user','password','prefix','current_user'];
        self::require(count($c)===count($keys) && !array_diff($keys,array_keys($c)));
        foreach ($c as $v) { self::require(is_string($v) && strlen($v)<=1024 && !str_contains($v,"\0")); }
        self::require($c['database']==='karban_financial_test' && $c['user']==='karban_test');
        self::require($c['host']==='127.0.0.1:3306' && strlen($c['password'])>=16);
        self::require(in_array($c['current_user'],['karban_test@localhost','karban_test@127.0.0.1'],true));
        self::require(preg_match('/^kt10e_[0-9a-f]{16}_$/D',$c['prefix'])===1);
    }
    public static function read_private(string $path,string $project): array {
        self::require($path!=='' && $path[0]==='/' && !is_link($path));
        $real=realpath($path); self::require(is_string($real) && is_file($real));
        $project=realpath($project); self::require(is_string($project) && !str_starts_with($real,$project.'/'));
        // lstat + fstat identity check prevents a symlink replacement during open.
        $before=lstat($path); $f=@fopen($path,'rb'); self::require(is_resource($f));
        try {
            $s=fstat($f);
            self::require(is_array($before) && $before['ino']===$s['ino'] && $before['dev']===$s['dev']);
            self::require(($s['mode'] & 0170000)===0100000 && ($s['mode'] & 0777)===0600 && function_exists('posix_geteuid') && $s['uid']===posix_geteuid());
            $text=stream_get_contents($f,16385); self::require(is_string($text) && strlen($text)<=16384);
            return self::json($text);
        } finally { fclose($f); }
    }
    public static function private_stdin($stream): void {
        self::require(is_resource($stream) && !stream_isatty($stream));
        $meta=stream_get_meta_data($stream); $s=fstat($stream);
        self::require(is_array($s) && ($meta['stream_type']??'')!=='MEMORY');
        self::private_input_stat($s);
    }
    public static function private_input_stat(array $s): void {
        self::require(isset($s['mode'],$s['uid']) && ($s['mode'] & 0170000)===0100000 && ($s['mode'] & 0777)===0600 && $s['uid']===posix_geteuid());
    }
    public static function json(#[\SensitiveParameter] string $text): array {
        try { $a=json_decode($text,true,32,JSON_THROW_ON_ERROR); } catch (\Throwable $e) { self::require(false); }
        self::require(is_array($a) && !array_is_list($a)); return $a;
    }
    public static function tables(string $prefix): array {
        self::require(preg_match('/^kt10e_[0-9a-f]{16}_$/D',$prefix)===1);
        return array_map(fn($s)=>$prefix.$s,['users','nahan_wallet_transactions','nahan_rate_limits','nahan_local_payment_intents','nahan_local_payment_provenance']);
    }
    /** Tokenize a deliberately tiny SQL vocabulary. Literals are opaque data,
     * quoted identifiers must be plain identifiers; comments and unconsumed bytes fail.
     * This is NOT a generic SQL parser/firewall or a production plugin change.
     */
    private static function tokens(string $q): array {
        self::require(strlen($q)<65536 && !str_contains($q,"\0"));
        $out=[]; $strings=[]; $n=strlen($q);
        for ($i=0;$i<$n;) {
            if (ctype_space($q[$i])) { $i++; continue; }
            if ($q[$i]==="'") {
                $i++; $value=''; $closed=false;
                while ($i<$n) {
                    if ($q[$i]==="'") {
                        if ($i+1<$n && $q[$i+1]==="'") { $value.="'"; $i+=2; continue; }
                        $i++; $closed=true; break;
                    }
                    if ($q[$i]==='\\') { self::require($i+1<$n); $value.=$q[$i+1]; $i+=2; }
                    else { $value.=$q[$i++]; }
                }
                self::require($closed); $out[]='<s>'; $strings[]=$value; continue;
            }
            if ($q[$i]==='`') {
                self::require(preg_match('/\G`([A-Za-z_][A-Za-z0-9_]*)`/A',$q,$m,0,$i)===1);
                $out[]=strtolower($m[1]); $i+=strlen($m[0]); continue;
            }
            if (preg_match('/\G(?:[A-Za-z_][A-Za-z0-9_]*|-?[0-9]+)/A',$q,$m,0,$i)===1) {
                $out[]=strtolower($m[0]); $i+=strlen($m[0]); continue;
            }
            self::require(str_contains('(),=*',$q[$i])); $out[]=$q[$i++];
        }
        return [$out,$strings];
    }
    private static function columns(int $index): array {
        return [
            ['id'],
            ['id','user_id','amount','balance_after','type','reference_type','reference_id','effect_key','description','meta','created_at'],
            ['id','bucket','identifier','count','window_start'],
            ['uuid','owner_id','purpose','catalog_version','pack_id','amount_irt','request_key','intent_hash','state','ledger_id','created_at','updated_at','expires_at','provenance','installation_id','origin_hash'],
            ['singleton_id','installation_id','origin_hash','provenance','first_credit_at'],
        ][$index];
    }
    /** Fully consumed finite forms from actual top-up/UoW/wallet/rate/readiness SQL
     * plus this harness's identity, snapshot and setup queries. No arbitrary functions.
     */
    public static function sql(string $q,array $tables,bool $cleanup=false): string {
        self::require(count($tables)===5 && array_values($tables)===self::tables(substr($tables[0],0,-5)));
        if (in_array($q,['SELECT @@SESSION.in_transaction','SELECT @@SESSION.sql_mode'],true)) { return $q; }
        [$tokens,$strings]=self::tokens($q); $s=implode(' ',$tokens);
        if (in_array($s,['start transaction','commit','rollback','show tables','set session innodb_lock_wait_timeout = 3','select database ( )','select current_user ( )','select user ( )','select connection_id ( )','show grants for current_user'],true)) { return $q; }
        if ($s==='show table status where name = <s>') { self::require(count($strings)===1 && in_array($strings[0],$tables,true)); return $q; }
        [$users,$ledger,$rate,$intent,$marker]=$tables;
        foreach ($tables as $table) {
            if (in_array($s,['show full columns from '.$table,'show index from '.$table],true)) { return $q; }
            if ($cleanup && $s==='drop table '.$table) { return $q; }
        }
        $n='[0-9]+'; $owner='90000[1-9]|900010'; $lock='(?: for update)?';
        $select=[
            'select id from '.$users.' where id = (?:'.$owner.') for update',
            'select \\* from '.$marker.'(?: where singleton_id = 1'.$lock.')?',
            'select \\* from '.$intent.' order by uuid',
            'select \\* from '.$intent.' where owner_id = (?:'.$owner.') and (?:uuid|request_key) = <s>'.$lock,
            'select \\* from '.$ledger.' order by id',
            'select \\* from '.$ledger.' where (?:effect_key = <s>|id = '.$n.')'.$lock,
            'select balance_after from '.$ledger.' where user_id = (?:'.$owner.') order by id desc limit 1'.$lock,
            'select \\* from '.$ledger.' where user_id = (?:'.$owner.') order by id desc limit '.$n.'(?: offset '.$n.')?',
            'select id , amount , balance_after , type from '.$ledger.' where effect_key = <s> for update',
            'select count ( \\* ) from '.$ledger.' where user_id = (?:'.$owner.')',
            'select \\* from '.$rate.' where bucket = <s> and identifier = <s> for update',
            'select count from '.$rate.' where bucket = <s> and identifier = <s>',
        ];
        foreach ($select as $pattern) { if (preg_match('~^'.$pattern.'$~D',$s)===1) { return $q; } }
        $literal='(?:<s>|-?[0-9]+|null)';
        $updates=[
            'update '.$marker.' set first_credit_at = <s> where singleton_id = 1 and first_credit_at is null',
            'update '.$rate.' set count = '.$literal.' , window_start = <s> where bucket = <s> and identifier = <s>',
            'update '.$intent.' set state = <s> , (?:ledger_id = '.$literal.' , )?updated_at = <s> where uuid = <s> and owner_id = '.$literal.' and state = <s>',
        ];
        foreach ($updates as $pattern) { if (preg_match('~^'.$pattern.'$~D',$s)===1) { return $q; } }
        $inserts=[['id'],array_slice(self::columns(1),1),['bucket','identifier','count','window_start'],['uuid','owner_id','purpose','catalog_version','pack_id','amount_irt','request_key','state','ledger_id','created_at','updated_at','expires_at','provenance','installation_id','origin_hash','intent_hash'],self::columns(4)];
        foreach ($tables as $index=>$table) {
            $pattern='~^insert into '.$table.' \\( '.implode(' , ',$inserts[$index]).' \\) values \\( '.implode(' , ',array_fill(0,count($inserts[$index]),$literal)).' \\)$~D';
            if (preg_match($pattern,$s)===1) { return $q; }
            if (str_starts_with($s,'create table '.$table.' ( ')) { self::require(isset(self::$fixture_ddl[$s])); return $q; }
        }
        self::require(false); return $q;
    }
    /** CREATE has finite column/type/options/index vocabulary; no LIKE/AS SELECT,
     * multi-target operations, foreign references, expressions or unowned identifiers.
     */
    private static function create_tokens(array $t,int $index): void {
        $depth=1; $parts=[]; $part=[]; $i=4;
        for (;$i<count($t);$i++) {
            if ($t[$i]==='(') { $depth++; }
            if ($t[$i]===')') { $depth--; if ($depth===0) { $parts[]=$part; $i++; break; } }
            if ($t[$i]===',' && $depth===1) { $parts[]=$part; $part=[]; } else { $part[]=$t[$i]; }
        }
        self::require($depth===0);
        $tail=implode(' ',array_slice($t,$i));
        self::require(in_array($tail,['engine = innodb','engine = innodb default character set ascii collate ascii_bin','default character set ascii collate ascii_bin engine = innodb'],true));
        $columns=[]; $expected=self::columns($index);
        foreach ($parts as $p) {
            $s=implode(' ',$p);
            if (in_array($p[0]??'', ['primary','unique','key'],true)) {
                self::require(preg_match('/^(?:primary key|(?:unique )?key (?:user_id|type|reference|effect_key|bucket_identifier|window_start|owner_request_key|ledger_reference)) \\( ([a-z_]+(?: , [a-z_]+)*) \\)$/D',$s,$m)===1);
                self::require(!array_diff(explode(' , ',$m[1]),$expected)); continue;
            }
            $name=$p[0]??''; self::require(in_array($name,$expected,true) && !in_array($name,$columns,true)); $columns[]=$name;
            self::require(preg_match('/^[a-z_]+ (?:bigint(?: \\( 20 \\))?|int|tinyint|char \\( (?:36|64) \\)|varchar \\( (?:16|32|40|120|128|255) \\)|longtext|datetime)(?: unsigned)?(?: character set ascii collate ascii_bin)?(?: not null| null)?(?: default (?:null|0))?(?: auto_increment)?$/D',$s)===1);
        }
        self::require(count($columns)===count($expected) && !array_diff($expected,$columns));
    }
    /** Tokenizer uses ordinary MySQL backslash escaping; reject incompatible mode
     * on each real connection before application SQL. Never change server/global mode.
     */
    public static function sql_mode(mixed $mode): void {
        self::require(is_string($mode) && !in_array('NO_BACKSLASH_ESCAPES',array_map('trim',explode(',',strtoupper($mode))),true));
    }
    public static function grants(array $rows,bool $cleanup=false): void {
        $privileges=[];
        foreach ($rows as $g) {
            self::require(is_string($g) && !str_contains(strtoupper($g),'GRANT OPTION'));
            $g=str_replace('`','',$g);
            self::require(preg_match('/^GRANT (.+) ON (.+) TO /D',$g,$m)===1);
            if ($m[2]==='*.*') { self::require($m[1]==='USAGE'); continue; }
            self::require($m[2]==='karban_financial_test.*');
            $p=explode(', ',$m[1]); self::require(!array_diff($p,['SELECT','INSERT','UPDATE','CREATE','DROP'])); $privileges=array_merge($privileges,$p);
        }
        self::require(!array_diff($cleanup?['SELECT','INSERT','UPDATE','CREATE','DROP']:['SELECT','INSERT','UPDATE','CREATE'],$privileges));
    }
    public static function plan(): array {
        return ['mode'=>'DRY_RUN','driver_loaded'=>false,'connections'=>0,'database'=>'karban_financial_test','host_allowlist'=>['127.0.0.1:3306'],'user_allowlist'=>['karban_test'],'prefix_pattern'=>'kt10e_<16 lowercase random hex>_','tables'=>['users','nahan_wallet_transactions','nahan_rate_limits','nahan_local_payment_intents','nahan_local_payment_provenance'],'config_input'=>'outside-project user-owned regular0600 JSON; stdin accepts only user-owned regular0600 files (no pipe/socket/FIFO)','worker_credentials'=>'own0600 packet in own0700 TMPDIR directory; stdin only nonsecret GO; delete own packet only after child exit','child_control'=>'bounded TERM15 only; no reap of running child; pending manual review on failure','limits'=>['workers'=>2,'worker_seconds'=>20,'lock_wait_seconds'=>3,'rate_requests'=>82],'native_commit_lost_ack'=>'UNVERIFIED; simulated response-loss is not native lost ACK','scope'=>'CLI minimal shims plus installed wpdb and actual financial classes; NOT full WordPress or REST E2E'];
    }
}
