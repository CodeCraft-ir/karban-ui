<?php
/** Task10E CLI ONLY. Default is a zero-connection plan. No web entry point. */
declare(strict_types=1);
use Task10E\{Guard,Runtime,Suite,Workers};
require __DIR__.'/task10e/guard.php';
ini_set('display_errors','0'); ini_set('log_errors','0');
ini_set('mysqlnd.net_read_timeout','5'); ini_set('default_socket_timeout','5');
set_error_handler(static function () { throw new RuntimeException('Task10E safety check failed.'); });
try {
    Guard::require(PHP_SAPI==='cli');
    $project=dirname(__DIR__,2); $packet=[];
    $flight=Guard::preflight(array_slice($argv,1),static function(array $args) use ($project,&$packet): array {
        Guard::require(is_string($args['config']) && is_string($args['manifest']));
        if ($args['config']==='-') {
            Guard::private_stdin(STDIN);
            $text=stream_get_contents(STDIN,16385);
            Guard::require(is_string($text) && strlen($text)<=16384);
            return Guard::json($text);
        }
        $value=Guard::read_private($args['config'],$project);
        if ($args['worker']) { $packet=$value; return $packet['config']??[]; }
        return $value;
    });
    $args=$flight['arguments'];
    if (!$args['execute']) {
        // Guard::plan() contains constants only; no config or driver is read.
        echo json_encode($flight['plan'],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
        exit(0);
    }
    $config=$flight['configuration'];
    // Explicit manifest path binds the approved run prefix; it must not already exist for setup.
    if ($args['cleanup'] || $args['worker']) {
        $manifest=Guard::read_private($args['manifest'],$project);
    } else {
        Guard::require(!file_exists($args['manifest']) && !is_link($args['manifest']));
        $manifest=['version'=>1,'database'=>'karban_financial_test','prefix'=>$config['prefix'],'tables'=>Guard::tables($config['prefix']),'created'=>[]];
    }
    require __DIR__.'/task10e/shims.php';
    require __DIR__.'/task10e/runtime.php';
    require __DIR__.'/task10e/suite.php';
    if (!isset($manifest['installation_id'])) { $manifest['installation_id']=wp_generate_uuid4(); }
    $runtime=new Runtime($config,$manifest); $runtime->validate_manifest();
    if ($args['worker']) { Workers::child($runtime,$packet); exit(0); }
    $db=$runtime->connect($args['cleanup']);
    try {
        $GLOBALS['wpdb']=new Task10E\Ambient($runtime->connect(),$config['prefix']);
        if ($args['cleanup']) { $runtime->cleanup($db,$args['manifest']); echo "Task10E own-run tables cleaned; private manifest retained.\n"; }
        else {
            $runtime->setup($args['manifest'],$db);
            $suite=new Suite($runtime,$db,$config,$args['manifest']);
            $suite->run();
            echo json_encode(['status'=>'PASS','scope'=>'CLI actual wpdb financial classes, not WordPress REST E2E','checks'=>$suite->checks,'parent_connection_ids'=>$runtime->connections,'native_commit_lost_ack'=>'UNVERIFIED','cleanup'=>'NOT RUN; explicit separate command required'],JSON_PRETTY_PRINT)."\n";
        }
    } finally { $db->close(); if (isset($GLOBALS['wpdb'])) { $GLOBALS['wpdb']->close(); unset($GLOBALS['wpdb']); } }
} catch (Throwable $e) {
    // Do not print exception text, stack, SQL, native driver diagnostics or config.
    fwrite(STDERR,"Task10E stopped: safety/setup/assertion failed. No automatic cleanup or retries. Review run manifest privately.\n");
    exit(1);
}
