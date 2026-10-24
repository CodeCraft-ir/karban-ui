<?php
declare(strict_types=1);
namespace Task10E;
use Nahan\Core\Payments\{FinancialConnection,LocalPaymentSchema,LocalPaymentPolicy,WalletManager};

/** Bounded two-child protocol. Credentials use own 0600 files inside own 0700 directories.
 * Anonymous stdin carries ONLY the nonsecret GO barrier. No shell/environment secrets.
 */
final class Workers {
    private static array $pending=[];
    /** Injectable process-control operations for offline safety tests, never a DB port. */
    public static function finish_owned(callable $running,callable $term,callable $reap,callable $wait): bool {
        for ($attempt=0;$attempt<2;$attempt++) {
            if (!$running()) { $reap(); return true; }
            try { $term(15); } catch (\Throwable $e) { /* Child may have exited since status; still poll before any reap. */ }
            for ($poll=0;$poll<10;$poll++) { $wait(); if (!$running()) { $reap(); return true; } }
        }
        return false; // Never proc_close a still-running child; require manual review.
    }
    public static function private_packet(#[\SensitiveParameter] array $config,array $job): array {
        Guard::configuration($config); self::validate_job($job);
        $temp=realpath(sys_get_temp_dir()); $project=realpath(Runtime::PROJECT);
        Guard::require(is_string($temp) && is_string($project) && $temp!==$project && !str_starts_with($temp,$project.'/'));
        $directory=$temp.'/task10e-worker-'.bin2hex(random_bytes(16));
        $old=umask(0077);
        try {
            Guard::require(mkdir($directory,0700)); $file=$directory.'/packet.json';
            $f=fopen($file,'x+b'); Guard::require(is_resource($f));
            try { $text=json_encode(['config'=>$config,'job'=>$job],JSON_THROW_ON_ERROR); Guard::require(strlen($text)<16384 && fwrite($f,$text)===strlen($text) && fflush($f)); }
            finally { fclose($f); }
            return ['directory'=>$directory,'file'=>$file];
        } finally { umask($old); }
    }
    public static function child(Runtime $runtime,array $packet): void {
        Guard::require(isset($packet['job']) && is_array($packet['job']));
        $job=$packet['job']; self::validate_job($job);
        $db=$runtime->connect();
        try {
            $GLOBALS['wpdb']=new Ambient($runtime->connect(),$runtime->manifest['prefix']);
            [$service]=$runtime->service($db);
            echo json_encode(['ready'=>true,'ids'=>$runtime->connections])."\n"; fflush(STDOUT);
            stream_set_timeout(STDIN,20);
            Guard::require(fgets(STDIN,8)==="GO\n");
            $result=self::operation($service,$job);
            Guard::require($db->failure()===null);
            echo json_encode(['done'=>true,'result'=>self::result($result)])."\n"; fflush(STDOUT);
        } finally { $db->close(); if (isset($GLOBALS['wpdb'])) { $GLOBALS['wpdb']->close(); unset($GLOBALS['wpdb']); } }
    }
    public static function validate_job(array $j): void {
        Guard::require(isset($j['action'],$j['owner'],$j['value']) && count($j)===3 && is_int($j['owner']) && $j['owner']>=900001 && $j['owner']<=900010);
        Guard::require(in_array($j['action'],['create','confirm','admit_create','admit_confirm'],true));
        Guard::require(LocalPaymentPolicy::valid_uuid($j['value']));
    }
    private static function operation($s,array $j) {
        return match($j['action']) {
            'create'=>$s->create($j['owner'],'irt-10000',$j['value']),
            'confirm'=>$s->confirm($j['owner'],$j['value']),
            'admit_create'=>$s->admit_mutation($j['owner'],'create'),
            'admit_confirm'=>$s->admit_mutation($j['owner'],'confirm'),
        };
    }
    private static function result($r): array {
        if (is_wp_error($r)) { return ['error'=>$r->get_error_code()]; }
        if ($r===true) { return ['admitted'=>true]; }
        Guard::require(is_array($r)); return ['receipt'=>$r];
    }
    public static function pair(#[\SensitiveParameter] array $config,string $manifest,array $jobs): array {
        Guard::require(count($jobs)===2 && function_exists('proc_open'));
        foreach ($jobs as $j) { self::validate_job($j); }
        $children=[]; $end=microtime(true)+20;
        try {
            foreach ($jobs as $j) {
                $owned=self::private_packet($config,$j);
                $cmd=[PHP_BINARY,'-d','display_errors=0','-d','log_errors=0','-d','auto_prepend_file=','-d','auto_append_file=',dirname(__DIR__).'/task10e.php','--execute','--confirm-db=karban_financial_test','--worker','--config='.$owned['file'],'--manifest='.$manifest];
                $pipes=[];
                try { $process=proc_open($cmd,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,Runtime::PROJECT,[]); }
                catch (\Throwable $e) { unlink($owned['file']); rmdir($owned['directory']); Guard::require(false); }
                if (!is_resource($process)) { unlink($owned['file']); rmdir($owned['directory']); Guard::require(false); }
                $children[]=['process'=>$process,'pipes'=>$pipes,'owned'=>$owned,'buffer'=>'','error'=>'','ready'=>null,'done'=>null,'sent'=>false];
                stream_set_blocking($pipes[1],false); stream_set_blocking($pipes[2],false);
            }
            while (true) {
                Guard::require(microtime(true)<$end);
                foreach ($children as &$c) {
                    $c['buffer'].=stream_get_contents($c['pipes'][1]); $c['error'].=stream_get_contents($c['pipes'][2]);
                    Guard::require(strlen($c['buffer'])<32768 && $c['error']==='');
                    while (($pos=strpos($c['buffer'],"\n"))!==false) {
                        $line=substr($c['buffer'],0,$pos); $c['buffer']=substr($c['buffer'],$pos+1); $v=Guard::json($line);
                        if (($v['ready']??false)===true) { Guard::require($c['ready']===null); $c['ready']=$v; }
                        elseif (($v['done']??false)===true) { Guard::require($c['sent'] && $c['done']===null); $c['done']=$v; }
                        else { Guard::require(false); }
                    }
                    if ($c['done']===null) { $status=proc_get_status($c['process']); Guard::require($status['running']); }
                } unset($c);
                if ($children[0]['ready']!==null && $children[1]['ready']!==null && !$children[0]['sent']) {
                    $ids=array_merge($children[0]['ready']['ids'],$children[1]['ready']['ids']);
                    Guard::require(count($ids)===4 && count(array_unique($ids))===4);
                    foreach ($children as &$c) { Guard::require(fwrite($c['pipes'][0],"GO\n")===3); fflush($c['pipes'][0]); $c['sent']=true; } unset($c);
                }
                if ($children[0]['done']!==null && $children[1]['done']!==null) { break; }
                usleep(10000);
            }
            $out=[];
            foreach ($children as $c) { $out[]=['connection_ids'=>$c['ready']['ids'],'result'=>$c['done']['result']]; }
            return $out;
        } finally {
            foreach ($children as $c) {
                foreach ($c['pipes'] as $p) { fclose($p); }
                $finished=self::finish_owned(
                    fn()=>proc_get_status($c['process'])['running'],
                    fn($signal)=>proc_terminate($c['process'],$signal),
                    fn()=>proc_close($c['process']),
                    fn()=>usleep(10000)
                );
                if ($finished) { unlink($c['owned']['file']); rmdir($c['owned']['directory']); }
                else { self::$pending[]=$c; }
            }
            if (self::$pending!==[]) {
                fwrite(STDERR,"Task10E own child still running after bounded TERM; manual review required; own private worker files retained.\n");
                Guard::require(false);
            }
        }
    }
}

final class Suite {
    public array $checks=[];
    private float $deadline;
    public function __construct(private Runtime $runtime,private FinancialConnection $db,#[\SensitiveParameter] private array $config,private string $manifest) { $this->deadline=microtime(true)+180; }
    private function passed(string $name,array $data=[]): void { Guard::require(microtime(true)<$this->deadline); $this->checks[]=['name'=>$name,'status'=>'PASS']+$data; }
    private function receipt($r): array { Guard::require(is_array($r) && isset($r['id'],$r['state'])); return $r; }
    private function error($r,?string $code=null): void { Guard::require(is_wp_error($r) && ($code===null || $r->get_error_code()===$code)); }
    private function fresh(callable $read): mixed { $db=$this->runtime->connect(); try { $v=$read($db); Guard::require($db->failure()===null); return $v; } finally { $db->close(); } }
    private function baseline(FinancialConnection $db): array {
        $tables=$this->runtime->manifest['tables'];
        return [$db->get_results('SELECT * FROM '.$tables[1].' ORDER BY id',ARRAY_A),$db->get_results('SELECT * FROM '.$tables[3].' ORDER BY uuid',ARRAY_A),$db->get_results('SELECT * FROM '.$tables[4],ARRAY_A)];
    }
    public function run(): void {
        [$s,$wallet]=$this->runtime->service($this->db);
        // Faults first, while marker is clean: assert actual rollback from a fresh connection.
        foreach (['before_intent','after_intent'] as $point) {
            $before=$this->fresh(fn($d)=>$this->baseline($d));
            $real=$this->runtime->connect();
            try {
                $port=new FaultPort($real,$point); [$f]=$this->runtime->service($port);
                $this->error($f->create(900001,'irt-10000',wp_generate_uuid4())); Guard::require($port->fired===1 && $real->failure()!==null);
                $this->error($f->create(900001,'irt-10000',wp_generate_uuid4()));
            } finally { $real->close(); }
            Guard::require($before===$this->fresh(fn($d)=>$this->baseline($d)));
            $this->passed('owned client disconnect '.$point.'; fresh read no partial intent/marker/ledger');
        }
        foreach (['before_ledger','after_ledger','before_intent_update','after_intent_update','before_commit'] as $point) {
            $intent=$this->receipt($s->create(900001,'irt-10000',wp_generate_uuid4()));
            $before=$this->fresh(fn($d)=>$this->baseline($d));
            $real=$this->runtime->connect();
            try {
                $port=new FaultPort($real,$point); [$f]=$this->runtime->service($port);
                $this->error($f->confirm(900001,$intent['id'])); Guard::require($port->fired===1 && $real->failure()!==null);
                $this->error($f->confirm(900001,$intent['id'])); Guard::require($port->fired===1);
            } finally { $real->close(); }
            Guard::require($before===$this->fresh(fn($d)=>$this->baseline($d)));
            $this->passed('owned client disconnect '.$point.'; rollback verified fresh connection, sticky no replay');
        }
        // Callback lifetime proof using actual UoW with a real self-closed COMMIT boundary.
        $real=$this->runtime->connect();
        try {
            $port=new FaultPort($real,'before_commit'); [,,$uow]=$this->runtime->service($port); $calls=0; $follow=0;
            $callback=function() use (&$calls,&$follow,$uow) { $calls++; $uow->after_commit(function() use (&$follow) { $follow++; }); return true; };
            $this->error($uow->run_for_user(900001,[],$callback),'financial_commit_uncertain');
            $this->error($uow->run_for_user(900001,[],$callback)); Guard::require($calls===1 && $follow===0 && $port->commits===1);
        } finally { $real->close(); }
        $this->passed('uncertain UoW callback once, no after-commit follow-up and no connection recreation');

        $a=$this->receipt($s->create(900001,'irt-10000',wp_generate_uuid4()));
        Guard::require($a===$this->receipt($s->lookup(900001,$a['requestKey'])) && $a===$this->receipt($s->get(900001,$a['id'])));
        $cancel=$this->receipt($s->cancel(900001,$a['id'])); Guard::require($cancel['state']==='cancelled' && $cancel===$s->cancel(900001,$a['id']));
        $this->error($s->confirm(900001,$a['id']),'local_payment_state_conflict');
        $this->error($s->get(900002,$a['id']),'local_payment_not_found');
        // Configuration rejection before SQL; no permanent policy/options writes.
        $saved=$GLOBALS['task10e_options'][LocalPaymentPolicy::OPTION]; $GLOBALS['task10e_options'][LocalPaymentPolicy::OPTION]['armed']=false;
        $this->error($s->create(900001,'irt-10000',wp_generate_uuid4()),'local_payment_unavailable');
        $GLOBALS['task10e_options'][LocalPaymentPolicy::OPTION]=$saved;
        $this->passed('stable create/get/lookup/cancel and owner/policy gates');

        // First positive credits occur concurrently on different owners, sharing marker lock.
        $one=$this->receipt($s->create(900002,'irt-10000',wp_generate_uuid4())); $two=$this->receipt($s->create(900003,'irt-10000',wp_generate_uuid4()));
        $pair=$this->pair('confirm',900002,$one['id'],'confirm',900003,$two['id']);
        foreach ($pair as $p) { Guard::require(($p['result']['receipt']['state']??null)==='succeeded'); }
        Guard::require($wallet->balance(900002)===10000 && $wallet->balance(900003)===10000);
        $this->passed('different-owner shared marker concurrency (two real simultaneous workers)',['workers'=>$pair]);
        $key=wp_generate_uuid4(); $pair=$this->pair('create',900004,$key,'create',900004,$key);
        $r=$pair[0]['result']['receipt']??null; Guard::require(is_array($r) && $r===($pair[1]['result']['receipt']??null));
        $this->passed('duplicate create same owner key, one intent',['workers'=>$pair]);
        $pair=$this->pair('confirm',900004,$r['id'],'confirm',900004,$r['id']);
        Guard::require(($pair[0]['result']['receipt']['state']??null)==='succeeded' && $pair[0]['result']===$pair[1]['result']);
        $ledger=$this->runtime->manifest['tables'][1];
        Guard::require((int)$this->db->get_var($this->db->prepare("SELECT COUNT(*) FROM {$ledger} WHERE user_id = %d",900004))===1 && $wallet->balance(900004)===10000);
        $this->passed('duplicate confirm exactly one ledger effect',['workers'=>$pair]);
        $one=$this->receipt($s->create(900005,'irt-10000',wp_generate_uuid4())); $two=$this->receipt($s->create(900005,'irt-10000',wp_generate_uuid4()));
        $pair=$this->pair('confirm',900005,$one['id'],'confirm',900005,$two['id']);
        $balances=array_map(fn($p)=>$p['result']['receipt']['creditedBalanceIRT']??null,$pair); sort($balances);
        Guard::require($balances===[10000,20000] && $wallet->balance(900005)===20000);
        $this->passed('distinct same-owner credits serialize without lost balance',['workers'=>$pair]);
        foreach (['create'=>20,'confirm'=>60] as $action=>$cap) {
            for ($i=0;$i<$cap-1;$i++) { Guard::require(microtime(true)<$this->deadline); Guard::require($s->admit_mutation(900006,$action)===true); }
            $pair=$this->pair('admit_'.$action,900006,wp_generate_uuid4(),'admit_'.$action,900006,wp_generate_uuid4());
            $results=array_column($pair,'result');
            Guard::require(count(array_filter($results,fn($r)=>($r['admitted']??false)===true))===1 && count(array_filter($results,fn($r)=>($r['error']??null)==='rate_limited'))===1);
            $rates=$this->runtime->manifest['tables'][2];
            $count=$this->db->get_var($this->db->prepare("SELECT count FROM {$rates} WHERE bucket = %s AND identifier = %s",'local_topup_v1_'.$action,hash('sha256','nahan:local-topup-rate:v1:900006')));
            Guard::require((int)$count===$cap); $this->passed('atomic rate '.$action.' cap '.$cap.' ('.($cap+1).' bounded requests; 900 second window)',['workers'=>$pair]);
        }
        // Explicitly simulated result loss AFTER a real successful COMMIT.
        $a=$this->receipt($s->create(900007,'irt-10000',wp_generate_uuid4())); $real=$this->runtime->connect();
        try {
            $port=new FaultPort($real,'drop_commit_response'); [$f]=$this->runtime->service($port);
            $this->error($f->confirm(900007,$a['id']),'financial_commit_uncertain'); $this->error($f->confirm(900007,$a['id']),'financial_commit_uncertain');
            Guard::require($port->fired===1 && $port->commits===1);
        } finally { $real->close(); }
        $read=$this->fresh(function($d) use ($a) { [$f]=$this->runtime->service($d); return $f->get(900007,$a['id']); });
        Guard::require(is_array($read) && $read['state']==='succeeded' && $wallet->balance(900007)===10000);
        $this->passed('SIMULATED response-loss decorator after real COMMIT: fresh authoritative success, no retry; native lost ACK UNVERIFIED');
        Guard::require(count($this->runtime->connections)===count(array_unique($this->runtime->connections)));
    }
    private function pair(string $a,int $owner,string $value,string $b,int $other,string $next): array {
        Guard::require(microtime(true)<$this->deadline);
        return Workers::pair($this->config,$this->manifest,[['action'=>$a,'owner'=>$owner,'value'=>$value],['action'=>$b,'owner'=>$other,'value'=>$next]]);
    }
}
