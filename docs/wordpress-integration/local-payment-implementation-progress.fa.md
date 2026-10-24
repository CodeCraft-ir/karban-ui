# پرداخت محلی — پیگیری اجرای طرح تأییدشده

تاریخ شروع:۲۰۲۶-۱۰-۲۲. طرح فعلی `/Users/binam/.claude/plans/staged-inventing-karp.md` از مسیر تأیید برنامه پذیرفته شد. مجوز فقط source/آفلاین است؛ DBmigration/arming/موجودی واقعی و seedapply به پشتیبان و تأیید جدا نیاز دارند.

## برش‌ها

| برش | محدوده | وضعیت |
| --- | --- | --- |
| Task10A | schema/readiness مستقل، catalogIRT، gate و کنترل admin، پایهٔ قرنطینهٔ اعتبار آزمایشی و مرز UoW | یافته‌های بازبینی اولیه در10A.1 پیگیری و رفع شدند؛ شواهد تاریخی پایین حفظ شده‌اند |
| Task10A.1 | بانک فقط برای never-tracked strict opt-out؛ maintenance؛ اتصال مالی بدون reconnect/replay و ادغام managerها | بخشA و بخشB پس از اصلاحات، بازبینی مستقل source/آفلاین PASS؛ اجرای واقعی DB هنوز تأیید نشده |
| Task10B | create/confirm/cancel/result/lookup و walletsummary مالک‌محور، ledger+intent+provenance در یک تراکنش | پیاده‌سازی source/آفلاین شروع شد؛ هنوز تحویل یا بازبینی ندارد |
| Task10C | contracts/gateway/service/RouteHandlerهای BFF با authauthority و noautoreplay | شروع نشده |
| Task10D | UIکیف‌پول/بازبینی/نتیجهٔ فارسی، mountedtests و recovery | شروع نشده |
| Task10E | بازبینی جامع و ابزار تست DB واقعیِ مجاز؛ migration/arming/E2E فقط پس از تأیید عملیاتی | شروع نشده/اجرای واقعی مسدود |

## invariantها

- بدون بانک/providerHTTP/legacycallback؛ مبلغ ثابت سروری integerIRT.
- یک intent/اثرledger برای request/confirmتکراری؛ نتیجهٔ موفق فقط پس از commit.
- مبهم/timeout به معنی شکست قطعی نیست؛ GETauthoritative، نه POSTخودکار.
- provenance و sticky marker نصب در تراکنش؛ خارج gate/installation/arming مجاز، اعتبارآزمایشی productionspendable نباشد. markerخودکارپاک/پولpromotion/resetنشود.
- auth/Origin/مالکیت/cancellation و RSCcookie restrictions حفظ شوند؛ browsercredential/owner اختیارپذیر نباشد.
- فرضمحدودsinglepersistentNode/sharedrealm، اثباتMySQLconcurrencyباstubادعانشود.
- حساب‌های واقعی/پروفایلpublished8/آواتار10/گالری1rev7 و آواتارnull حساب دوم دست‌نخورده؛ seedpreviewمعادلapplyنیست.

## آخرین دروازهٔ بازبینی — ۲۰۲۶-۱۰-۲۳

PartA پس از بستن هشدار خامِ native driver، مستقل تأیید شد:۱۲تست actual-core prototype و۳۶foundation. PartB پس از رفع read-exception poison، maintenance read bypass و foreign nested owner admission تأیید شد؛ بازبین مستقلاً۲۸تست port،۳۶foundation،۱۶financialقدیمی و۱۲prototype =۹۲مورد را اجرا کرد، همه موفق. probeمستقل foreignmaintenance نیز outererror/ROLLBACKyes/COMMITno/hooks0 را نشان داد. Important/Critical تأییدشدهٔ تازه در deltaنهایی باقی نماند.

نتایج گستردهٔ پیاده‌ساز در checkpoint نهایی:۲۱suitePHP،syntax۸۰فایل،Node۳۱۳ وPostCSS۳ موفق. بازبین مجموعهٔ گسترده را دوباره اجرا نکرد؛ tsc/build در این اصلاح PHP-only تکرار نشد و fullLint۴خطا/۸هشدار قدیمی حل‌شده نیست.

اتصال مشترکِ plugin-owned، بدون replay، در UoW/wallet/lead/subscription و helperهای مالی ادغام شد؛ config/content عادی WordPress تراکنشی ادعا نمی‌شوند. mutationسرنخ/اشتراک روی نصب trackedlocal صریحاًunsupported است، نه نیمه‌اجرا. false/throwCOMMITمبهم است و callback/statement خودکار تکرار نمی‌شود. PHP@warning boundary به handlerهای استانداردِ رعایت‌کنندهٔ mask محدود است، نه کد دلخواهِ هم‌سطح اعتماد.

از این دروازه فقط شروع source/آفلاین10B طبق طرح قبلاًتأییدشده مجاز شد. هیچ actualDBfactory، lock/concurrency/fault، migration/arming/workerdrain/موجودی واقعی تأیید نشده است. اجرای واقعی همچنان به backup/consent عملیاتی وDBdisposableوابسته است.

## شواهد تاریخی و موانع اولیه

Task10A تحویل source/آفلاین شد: catalogسه‌بستهٔIRT، policyمستقل، schema/readiness صریح، markerچسبنده و کنترلUoW/admin اضافه شدند؛ serviceشارژ/routes/BFF/UI هنوز وجود ندارند. تست جدید۲۶/۲۶ و همه۱۹فایلsuitePHP،syntax۷۶فایل،Node۳۱۳ وPostCSS۳ موفق گزارش شدند. TypeScript/build برای این برشPHP دوباره اجرا نشدند. بازبینی مستقل در جریان است.

**وضعیت جدید پس از بازبینی و تأیید الحاقیه:** چهارfindingتأییدشده در task-10a-independent-review.fa.md ثبت شد. checkpoint10A.1 پیش از توقف،۵regressionجدید باRED(۳۱مورد/۵شکست) و اصلاح نیمه‌تمام null/markerداشت؛ پس‌ازتوقف تست مجدد نشده وGREENنبود. پس از طراحی دوباره، الحاقیهٔ طرح از مسیر approval پذیرفته شد.

تصمیم جدید: بانک فقط روی نصب هیچ‌گاه‌علامت‌نخورده وstrictoptout مجاز؛ هرگونهevidenceمحلی حتیclean/disarmed مسیربانک را مسدود می‌کند. معرفی/تغییرحالت با maintenance و توقف/تخلیهٔ همهworkerهایقدیمی، فقط باconsentعملیاتی جدا. قفل درازمدت دورHTTPبانکی افزوده نمی‌شود. این سیاست به‌تنهایی مشکلatomicity را حل نمی‌کند: corewpdbبعدerrno2006 می‌تواندSQLرا روی اتصال تازه replayکند. به‌همین‌دلیل prototype اتصال مالی plugin-owned بدونreconnect/replay پیش از ادغام UoW/wallet/lead/subscription ساخته و مستقل بازبینی می‌شود. core patch،globalwpdbreplacement یاqueryrewriter مجاز نیست. اگرseamایمنباحداقلدامنهقابلاثباتنبود،creditمسدودمی‌ماند.

هیچ migration/arming/تغییرموجودی یا اجرایواقعی از این approval مجاز نمی‌شود؛ bank HTTP همچنان اجرا نشده است. نقصقدیمیsuccessقبلuncheckedfulfillحل‌شده نیست.

SELECT@@SESSION.in_transaction برای تشخیص ambienttransaction در sourceاستفاده شده؛ قابلیت واقعی DBنصب‌شده بررسی نشده و نسخه‌های فاقد این probeبایدfailclosedباشند. fixtureها اثباتقفل/DDLواقعی نیستند. SnapshotقبلدرTMPDIR/task10a-before-4kl5kffo با۲۴۷sourcefile نگه داشته شد؛ frontend/auth/profileها تغییر نکردند. هیچ migration/arming/DBconnection/financialmutation/secretread/configchange/SMS/bankHTTP/liveadminsave انجام نشد. FullLint۴خطا/۸هشدار قبلی وauditحل‌نشده باقی‌اند.

هیچ پرداخت آزمایشی یا migration در زمان نگارش انجام نشده است؛ گذر به10B تا بستن مانع و بازبینی مجاز نیست.
