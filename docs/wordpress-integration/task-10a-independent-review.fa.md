# Task10A — بازبینی مستقل پایهٔ پرداخت محلی

بازبین aa4e2a6a914da97da، مقایسهٔ actualsource با snapshotقبل task10a-before-4kl5kffo و طرح تأییدشده. نتیجه: **BLOCKED برای فعال‌سازی مالی و10B**.

## یافته‌های تأییدشده

1. P1: PaymentGateway guardغیرقفل‌شده را قبل از INSERT/UPDATEمستقیم logمی‌خواند. درخواستِ دیده‌شده‌به‌عنوانclean می‌تواند با نخستینcredit/تغییرpolicy رقابت کند؛ guardلحظه‌ای serializationنیست. migration/arming هم barrierبرایدرخواستprovider-inflightندارند. موفقیت تاریخی قبلuncheckedfulfillهمچنانحل‌نشده.
2. P1: assert_legacy_gateway_allowedهمان مجوز genericquarantineاست؛ cleanحتیباoptinمحلی وtainted+armedبه بانک اجازه می‌دهد. مجوز شبیه‌سازی باید از مجوز بانک جدا شود.
3. P2: constantصریحnullبه‌اشتباه absentحساب می‌شود؛ فقطundefinedیاstrictfalse باید absenceمجاز باشند.
4. P2: cleanmarkerfastpath فقطengineرا می‌سنجد وبدونsingletonPRIMARY/columncontractمی‌تواندallowدهد؛ حذفPKدرfixture schemafalseولیquarantinetrueبود.

نمونهٔsource: activeplugin includes/payments/class-payment-gateway.php، class-local-payment-{quarantine,policy,schema}.php. این‌ها source-proven / memory-only probes هستند؛ actualDBconcurrency آزمایش نشده است. serviceشارژ هنوزاضافه نشده، بنابراین raceنخستینcredit، تحلیل مسیر آینده است نه creditواقعاً اجراشده.

## بررسی مستقل

26/26تستfoundation،16namedcaseمالی قدیمی وscriptadminقدیمی در محیطPHP-n/network/processdisabled/fakeboundariesموفق بودند. syntax7productionPHPموفق. سهprobeحافظه‌ای برایmode/null/PK یافته‌ها را اثبات کردند ولی جایregressiontestنیستند. مجموعه۱۹suiteکامل/Node313/PostCSS3/type/buildتوسطبازبینتکرارنشدند.

## اقدام

پیاده‌ساز در همانcontext برای10A.1 ادامه می‌دهد؛ ابتداnull/markerintegrity/legacy-modeTDD، سپسwriteadapterقفل‌شده و سیاست قابل‌اثباتِ quiescence بدون providerHTTP/hooksداخلtransaction. اگربستنمرزنیازبهتغییرمعماریبزرگ‌ترداشت،قبلگسترش گزارش می‌دهد؛ هیچfallbackغیرامنیا10Bاجرانمی‌شود.

هیچsourceedit،migration،DBbootstrap،network/bank/SMS/adminsave/config/profilemutationتوسطبازبینانجامنشد. اجرایواقعیبهbackupوconsentجداواثباتDBdisposableوابسته‌است.
