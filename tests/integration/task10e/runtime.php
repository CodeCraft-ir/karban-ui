<?php
declare(strict_types=1);
namespace Task10E;
use Nahan\Core\Payments\{FinancialConnection,FinancialConnectionPort,LocalPaymentSchema,LocalPaymentPolicy,LocalPaymentQuarantine,TransactionalUnitOfWork,WalletManager,LocalTopupService};

/** Factory only ever receives the dedicated validated configuration. */
final class Runtime {
    public const PROJECT = __DIR__.'/../../..';
    public const ORIGIN = 'http://localhost/task10e';
    public array $connections=[];
    public int $factory_attempts=0;
    public function __construct(#[\SensitiveParameter] private array $config,public array $manifest) {
        Guard::configuration($config);
        $GLOBALS['task10e_tables']=Guard::tables($config['prefix']);
    }
    public function connect(bool $cleanup=false): FinancialConnection {
        $c=$this->config;
        $GLOBALS['task10e_initializing']=true;
        $this->factory_attempts++;
        try { $db=FinancialConnection::from_configuration($c['user'],$c['password'],$c['database'],$c['host'],$c['prefix']); }
        finally { $GLOBALS['task10e_initializing']=false; }
        Guard::require($db instanceof FinancialConnection);
        try {
            Guard::require($db->get_var('SELECT DATABASE()')==='karban_financial_test');
            Guard::require($db->get_var('SELECT CURRENT_USER()')===$c['current_user']);
            $peer=$db->get_var('SELECT USER()');
            Guard::require(is_string($peer) && preg_match('/^karban_test@(localhost|127\.0\.0\.1)$/D',$peer)===1);
            $id=$db->get_var('SELECT CONNECTION_ID()'); Guard::require(is_numeric($id) && (int)$id>0);
            $grants=$db->get_col('SHOW GRANTS FOR CURRENT_USER'); Guard::require(is_array($grants)); Guard::grants($grants,$cleanup);
            Guard::require($db->failure()===null);
            Guard::sql_mode($db->get_var('SELECT @@SESSION.sql_mode'));
            Guard::require($db->failure()===null);
            $this->connections[]=(int)$id;
            Guard::require($db->query('SET SESSION innodb_lock_wait_timeout = 3')!==false);
            return $db;
        } catch (\Throwable $e) { $db->close(); throw new \RuntimeException('Task10E safety check failed.'); }
    }
    public function context(): LocalPaymentPolicy {
        $id=$this->manifest['installation_id']; $origin=hash('sha256',self::ORIGIN);
        $GLOBALS['task10e_options']=[LocalPaymentSchema::OPTION=>1, LocalPaymentPolicy::IDENTITY_OPTION=>$id, LocalPaymentPolicy::OPTION=>['version'=>1,'armed'=>true,'installation_id'=>$id,'origin_hash'=>$origin]];
        $ctx=['local_development'=>true,'environment_type'=>'local','site_url'=>self::ORIGIN,'remote_addr'=>'127.0.0.1','local_dev_payments'=>true];
        return new LocalPaymentPolicy(new \Nahan\Core\LocalDevelopmentGate($ctx),$ctx);
    }
    public function service(FinancialConnectionPort $port): array {
        $policy=$this->context();
        $uow=new TransactionalUnitOfWork(new LocalPaymentQuarantine($policy),$port);
        $wallet=new WalletManager($uow);
        return [new LocalTopupService($wallet,$policy),$wallet,$uow];
    }
    /** Reuse authoritative private schema descriptors, never invoke upgrades/Activator.
     * Wallet/rate DDL is extracted from literal schema strings in Activator source,
     * rather than executing its unrelated lead/subscription migration assumptions.
     */
    public function ddl(): array {
        $prefix=$this->config['prefix']; $t=Guard::tables($prefix);
        $result=[$t[0]=>"CREATE TABLE {$t[0]} (ID BIGINT UNSIGNED NOT NULL, PRIMARY KEY (ID)) ENGINE=InnoDB"];
        $source=file_get_contents(ABSPATH.'wp-content/plugins/karban-core/includes/class-activator.php');
        Guard::require(is_string($source));
        foreach (['wallet_transactions','rate_limits'] as $suffix) {
            $pattern='~"(CREATE TABLE \{\$prefix\}'.preg_quote($suffix,'~').' \(.*?)"~s';
            Guard::require(preg_match($pattern,$source,$m)===1);
            $sql=str_replace(['{$prefix}','{$charset}',';'],[$prefix.'nahan_','DEFAULT CHARACTER SET ascii COLLATE ascii_bin',''],$m[1]);
            // rate table in Activator omits ENGINE; force only isolated test copy to InnoDB.
            if (!str_contains($sql,'ENGINE=InnoDB')) { $sql.=' ENGINE=InnoDB'; }
            $result[$prefix.'nahan_'.$suffix]=$sql;
        }
        $method=new \ReflectionMethod(LocalPaymentSchema::class,'definitions');
        $definitions=$method->invoke(new LocalPaymentSchema());
        foreach ($definitions as $table=>$definition) {
            Guard::require(in_array($table,$t,true)); $lines=[];
            foreach ($definition['columns'] as $name=>[$type,$nullable,$collation]) {
                $lines[]=$name.' '.$type.($collation===null?'':' CHARACTER SET ascii COLLATE ascii_bin').($nullable==='NO'?' NOT NULL':' NULL DEFAULT NULL');
            }
            foreach ($definition['indexes'] as $name=>$columns) { $lines[]=($name==='PRIMARY'?'PRIMARY KEY':'UNIQUE KEY '.$name).' ('.implode(', ',$columns).')'; }
            $result[$table]='CREATE TABLE '.$table.' ('.implode(', ',$lines).') ENGINE=InnoDB DEFAULT CHARACTER SET ascii COLLATE ascii_bin';
        }
        Guard::require(array_keys($result)===$t); Guard::register_fixture_ddl($result,$t); foreach ($result as $q) { Guard::sql($q,$t); } return $result;
    }
    public static function save_manifest(string $path,array $manifest,bool $new=false): void {
        Guard::require($path!=='' && $path[0]==='/' && !is_link($path));
        $parent=realpath(dirname($path)); $project=realpath(self::PROJECT);
        Guard::require(is_string($parent) && is_string($project) && $parent!==$project && !str_starts_with($parent,$project.'/'));
        if (!$new) { Guard::read_private($path,self::PROJECT); }
        $old=umask(0077);
        try { $f=@fopen($path,$new?'x+b':'r+b'); } finally { umask($old); }
        Guard::require(is_resource($f));
        try {
            $s=fstat($f); Guard::require($s['uid']===posix_geteuid() && ($s['mode']&0777)===0600);
            Guard::require(flock($f,LOCK_EX));
            $text=json_encode($manifest,JSON_THROW_ON_ERROR)."\n";
            Guard::require(ftruncate($f,0) && fwrite($f,$text)===strlen($text) && fflush($f));
            flock($f,LOCK_UN);
        } finally { fclose($f); }
    }
    public function validate_manifest(): void {
        $m=$this->manifest;
        Guard::require(($m['version']??null)===1 && ($m['database']??null)==='karban_financial_test' && ($m['prefix']??null)===$this->config['prefix']);
        Guard::require(($m['tables']??null)===Guard::tables($this->config['prefix']) && LocalPaymentPolicy::valid_uuid($m['installation_id']??null));
        Guard::require(is_array($m['created']??null) && !array_diff($m['created'],$m['tables']) && count(array_unique($m['created']))===count($m['created']));
    }
    public function setup(string $path,FinancialConnection $db): void {
        $this->context(); $ddl=$this->ddl();
        // Blank prefix is mandatory; never reuse an earlier run, even empty tables.
        $all=$db->get_col('SHOW TABLES'); Guard::require(is_array($all) && $db->failure()===null);
        foreach ($all as $name) { Guard::require(!str_starts_with($name,$this->config['prefix'])); }
        self::save_manifest($path,$this->manifest,true);
        foreach ($ddl as $table=>$sql) {
            Guard::require($db->query($sql)!==false);
            $this->manifest['created'][]=$table;
            self::save_manifest($path,$this->manifest);
        }
        foreach (range(900001,900010) as $owner) { Guard::require($db->insert($this->manifest['tables'][0],['ID'=>$owner],['%d'])===1); }
        Guard::require($db->insert(LocalPaymentSchema::provenance_table(),['singleton_id'=>1,'installation_id'=>$this->manifest['installation_id'],'origin_hash'=>hash('sha256',self::ORIGIN),'provenance'=>'local_simulated','first_credit_at'=>null])===1);
        Guard::require((new LocalPaymentSchema())->is_ready($db));
    }
    public function cleanup(FinancialConnection $db,string $path): void {
        $this->validate_manifest(); $this->context();
        // Existing provenance, when created, must still identify this exact run.
        $marker=LocalPaymentSchema::provenance_table();
        if (in_array($marker,$this->manifest['created'],true)) {
            $row=$db->get_row("SELECT * FROM {$marker} WHERE singleton_id = 1",ARRAY_A);
            Guard::require(is_array($row) && $row['installation_id']===$this->manifest['installation_id'] && $row['origin_hash']===hash('sha256',self::ORIGIN));
        }
        $GLOBALS['task10e_cleanup']=true;
        try {
            foreach (array_reverse($this->manifest['created']) as $table) {
                Guard::require($db->query('DROP TABLE '.$table)!==false);
                $this->manifest['created']=array_values(array_diff($this->manifest['created'],[$table]));
                self::save_manifest($path,$this->manifest);
            }
        } finally { $GLOBALS['task10e_cleanup']=false; }
    }
}

/** The ambient probe is a REAL, separate test connection; metadata stays global.
 * All non-probe SQL is denied, unlike a fake ambient "0" fixture.
 */
final class Ambient {
    public string $prefix; public string $users; public string $last_error='';
    public function __construct(private FinancialConnection $db,string $prefix) { $this->prefix=$prefix; $this->users=$prefix.'users'; }
    public function suppress_errors($s=true) { return $this->db->suppress_errors($s); }
    public function get_var($sql) { Guard::require($sql==='SELECT @@SESSION.in_transaction'); $v=$this->db->get_var($sql); $this->last_error=$this->db->last_error; return $v; }
    public function close(): void { $this->db->close(); }
}

/** Real port decorator; never implements SQL or fakes driver/server state.
 * Self-close is a client-initiated disconnect (NOT server KILL or native lost ACK).
 * drop_commit_response delegates successful COMMIT then lies about its result;
 * that case is explicitly SIMULATED RESPONSE LOSS, never native transport proof.
 */
final class FaultPort implements FinancialConnectionPort {
    public int $fired=0; public int $commits=0;
    public function __construct(public FinancialConnection $real,private string $point) {}
    public function __get($name) { Guard::require(in_array($name,['users','last_error','insert_id'],true)); return $this->real->$name; }
    public function prefix_value(): string { return $this->real->prefix_value(); }
    public function users_table(): string { return $this->real->users_table(); }
    public function failure(): ?\WP_Error { return $this->real->failure(); }
    public function suppress_errors($s=true) { return $this->real->suppress_errors($s); }
    private function hit(string $point): void {
        if ($point===$this->point && $this->fired===0) {
            Guard::require($this->real->get_var('SELECT DATABASE()')==='karban_financial_test');
            $this->fired++; $this->real->close();
        }
    }
    public function query($q) {
        if ($q==='COMMIT') { $this->commits++; $this->hit('before_commit'); }
        $r=$this->real->query($q);
        if ($q==='COMMIT' && $this->point==='drop_commit_response' && $r!==false && !$this->fired) { $this->fired++; return false; }
        return $r;
    }
    public function prepare($q,...$a) { return $this->real->prepare($q,...$a); }
    public function get_var($q=null,$x=0,$y=0) { return $this->real->get_var($q,$x,$y); }
    public function get_row($q=null,$o='OBJECT',$y=0) { return $this->real->get_row($q,$o,$y); }
    public function get_results($q=null,$o='OBJECT') { return $this->real->get_results($q,$o); }
    public function get_col($q=null,$x=0) { return $this->real->get_col($q,$x); }
    public function insert($table,$data,$format=null) {
        $kind=str_ends_with($table,'wallet_transactions')?'ledger':(str_ends_with($table,'local_payment_intents')?'intent':'other');
        $this->hit('before_'.$kind); $r=$this->real->insert($table,$data,$format); if ($r!==false) { $this->hit('after_'.$kind); } return $r;
    }
    public function update($table,$data,$where,$format=null,$where_format=null) {
        if (str_ends_with($table,'local_payment_intents')) { $this->hit('before_intent_update'); }
        $r=$this->real->update($table,$data,$where,$format,$where_format);
        if ($r!==false && str_ends_with($table,'local_payment_intents')) { $this->hit('after_intent_update'); } return $r;
    }
}
