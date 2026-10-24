# پیش‌نمایش واقعی seed محلی — ۲۰۲۶-۱۰-۲۲

## مجوز و تغییر محدود

اپراتور صریحاً گزینهٔ «فعال‌سازی و پیش‌نمایش» را انتخاب کرد: فقط ثابت غیرمحرمانهٔ NAHAN_LOCAL_DEV_SEED و اجرای preview، نه apply. در wp-config فقط همان خط define(...true) پس از anchor یکتای NAHAN_LOCAL_DEVELOPMENTtrue اضافه شد؛ همهٔ بایت‌های قبلی حفظ شدند. خروجی فقط3کلیدغیرمحرمانهٔ local خوانده شد، نه نمایش فایل/DBcredential. WP_ENVIRONMENT_TYPElocal وNAHAN_LOCAL_DEVELOPMENTtrue تأیید شدند؛ seedconstant پیش از درج موجود نبود.

پیش‌نمایش اولیه قبل از فعال‌سازی با500 و پیام کنترل‌شده متوقف شده بود؛ GET صفحه seedgateخاموش را نشان می‌داد. این به gate مربوط بود، نه خرابی schema. پس از فعال‌سازی، GET دروازهفعال و readinessOTP/refresh/financialآماده را نشان داد. هیچ دکمهٔ ارتقای schema یاapply کلیک نشد.

## پیش‌نمایش موفق

از فرم nonceدار admin فعلی، فقط POSTaction=nahan_local_preview اجرا شد؛ redirect بهصفحه ابزار و بخش واقعی «پیش‌نمایش ذخیره‌شدهٔ مدیر جاری» بررسی شد. این preview کاربر/پروفایل/term ایجاد نمی‌کند، اما گزارش خود را در optionغیرautoload مدیریتی ذخیره می‌کند؛ strictlyzeroDBwrites ادعا نمی‌شود.

نسخه: task-6b-kashan-2016-baseline-v1

hash: 1a843c5ebb50a8b9847e4f93379d6783b3a9a5adf0bf3a0878fcc19630b4254e

- ۱۸دسته:existing.
- کاشان:existing.
- ۶city: would_create — مشکات/meshkat، برزک/barzok، نیاسر/niasar، قمصر/qamsar، جوشقان قالی/jowshaqan-qali، کامو و چوگان/kamu-va-chugan.
- ۴حساب: همهwould_create، یکclient و3specialist.
- ۳پروفایل مرتبط در preview موجود؛ source ایجاد جدیدشان publish وunverified است.
- نام یا دادهٔ کاربر واقعی/شماره/رمز/nonce استخراج یا ذخیره نشد؛ فقط count/role/action نمایش داده شد.

metadataشهرها countykashan/kindcity/source_year2016/sourceapplication-historical-2016-baseline است. این فهرست غیرجامع تاریخی است، نه تقسیمات رسمی فعلی، نه محله/روستا یا منطقهٔ حدسی و نه آران‌وبیدگل.

## مرز apply

applyابزار موجود همهٔmanifest را اعمال می‌کند؛ taxonomy-only نیست. تا این سند هیچapplyانجام نشده و هیچ term/user/profile از این مرحله ساخته نشده است. اپراتور فقطpreviewرا مجاز کرده است.

اعمال کامل نیازمند:
1. نسخهٔ پشتیبان قابل‌بازیابیِ DB محلی تحت کنترل اپراتور، بدون استخراج/ارسال credential یا محتوای شخصی در گفتگو.
2. تأیید صریح batch کامل شامل6شهر،4حسابphone-lessنمایشی و3پروفایل منتشرشدهٔ لوکال.
3. استفاده از همانpreview/version/hash/adminbinding وconfirmationصریح موجود.
4. خواندن نتایج جزئی و previewمجدد برای idempotence؛ خطای apply یا timeout خودکار تکرار نشود.

عملیات applyتراکنش واحد نیست و شکست جزئی ممکن است رکوردی باقی بگذارد؛ backup و بررسی دستی مهم است. پروفایل واقعی8، آواتار10، گالری1/rev7 و accountواقعی3/4 هدف seed نیستند و نباید overwrite/adopt/تغییرمالکیت شوند. حساب‌های نمونه بدون شماره‌اند و جای آزمونOTPحساب دوم را نمی‌گیرند.

هیچ بانک/SMS/FTP/سایت آنلاین/پرداخت یا schemaupgrade انجام نشد.
