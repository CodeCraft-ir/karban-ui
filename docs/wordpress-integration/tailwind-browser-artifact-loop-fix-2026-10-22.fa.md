# اصلاح حلقهٔ Tailwind / لاگ ابزار مرورگر — ۲۰۲۶-۱۰-۲۲

## علت تأییدشده

اسکن پیش‌فرض Tailwind از ریشهٔ پروژه شروع می‌شد و خروجی‌های .playwright-mcp را وارد ورودی‌های build می‌کرد. PostCSS برای پوشه‌های اسکن‌شده dir-dependency منتشر می‌کند و loader مربوط به Next آن را بدون استفاده از glob به addContextDependency تبدیل می‌کند. نوشتن لاگ کنسول ابزار، CSS را بازسازی می‌کرد؛ Fast Refresh لاگ تازه می‌ساخت و همان مسیر دوباره تغییر می‌کرد.

trace محدود Next در بررسی پیش از اصلاح، در13.51ثانیه31 invalidation برای .playwright-mcp و34بازسازی globals.css نشان داد؛ علت صرفاً فرضِ Service Worker نبود. در مرورگر ابزار، serviceWorker.controller=null و registrations=[] بود.

## اصلاح محدود

- تنها خط اول src/app/globals.css از @import "tailwindcss" به @import "tailwindcss" source("..") تغییر کرد؛ مسیر نسبت به src/app محاسبه می‌شود و مرز اسکن web/src است.
- /.playwright-mcp/ به .gitignore اضافه شد؛ فایل موجود حذف یا untrack نشد. تغییر ignore به‌تنهایی علت رفع حلقه فرض نمی‌شود.
- تست رفتاری جدید tests/tailwind-source-boundary.test.mjs با PostCSS/Tailwind نصب‌شده اجرا می‌شود، نه mock یا grep.
- source برنامه، auth، profile و manifest تغییر دیگری نکردند. کلاس کاربردی runtime خارج src در بررسی محدود پیدا نشد؛ public شامل دارایی‌های ثابت است.

## آزمون آفلاین پیاده‌ساز

baseline دو شکست مورد انتظار داشت: کلاس مصنوعی داخل artifact واردCSS می‌شد و پوشهٔ artifact به‌عنوان context dependency ثبت می‌شد. پس از اصلاح3/3 تست موفق؛ پوشه/فایل لاگ یا ancestor context آن ثبت نمی‌شود و src همچنان watch می‌شود. CSS تولیدشده از کپی کل src واقعی با حالت قبلی در fixture تمیز، بایت‌به‌بایت یکسان بود.

Node قبلی313/313، TypeScript، lint محدود و build مستقلNext16.3Webpack موفق گزارش شدند. lint کل همچنان4خطای قدیمی helper و8هشدار دارد. build هیچ env/secret یا .next فعال را استفاده/پاک نکرد. بازبینی مستقل spec/quality نیز PASS شد و Important/Critical تأییدشده‌ای پیدا نشد. بازبین3تست واقعی PostCSS را مستقلاً و بدون شبکه اجرا کرد؛ همه موفق بودند. تطابق169فایل src، تغییر فقط خط اول CSS، مرز dependencyها و نبود import واقعی خارجsrc نیز بررسی شد. مجموعه313تایی و build توسط بازبین دوباره اجرا نشد.

## بررسی زندهٔ کنترل‌کننده

بدون restart، حذف cache، نوشتن سورس، تغییر حساب یا آپلود تازه، دو بازهٔ سکون12ثانیه‌ای اندازه‌گیری شد:

1. قبل از درخواست مرورگر: trace_bytes_added=0، clientinvalidations=0، globalsCSSbuilds=0.
2. بعد از یک درخواست manifest و نوشتن خروجی جدید ابزار مرورگر: trace_bytes_added=0، clientinvalidations=0، artifactinvalidations=0.

درخواست GET /manifest.webmanifest با credentials:omit و cache:no-store: HTTP200، Content-Type application/manifest+json، JSON معتبر و icons موجود. این مشاهده تأیید می‌کند حلقهٔ مشخص در این پنجره‌ها تکرار نشد؛ آزمون فشار یا تضمین نبود خطای متناوب در آینده نیست.

## آزمون پیوستهٔ UI پس از اصلاح — موفق

در نشست موجود، بازیابی معمول با دکمهٔ صفحه انجام شد؛ account/me200 specialist و آواتارnull تأیید شد. PNG هندسی غیرشخصی80×80 و424بایت با نام karban-avatar-ui-stable-test-20261022.png در حافظه تولید و به inputfile واقعی داده شد. checkbox عمومی‌بودن فایل و دکمهٔ واقعی آپلود کلیک شدند. UI فایل14 را بارگذاری‌شده اما متصل‌نشده نشان داد و تصویر decode شد.

۱۲ثانیه سکون بدون navigation/API: دکمهٔ «استفاده به عنوان آواتار» و نتیجهٔ فایل همچنان حاضر و فعال ماندند؛ state موقت مانند قبل ناپدید نشد. کلیک همان دکمه موفق شد، پیام «آواتار حساب شخصی ذخیره شد.» ظاهر شد، img واقعی80×80 در DOM نمایش داده شد و GET مستقل avatar14 را تأیید کرد. پس از navigation کامل /account، avatar14 همچنان درAPI و DOM وجود داشت و decode موفق بود.

پیش از cleanup currentavatar14 دوباره تأیید شد؛ POST واقعی account/me فقطavatar_idnull:200 و GET مستقل بازگشت بهnull را تأیید کرد. آواتار حرفه‌ای10، publish و گالری1تصویر/revision7 حفظ شدند. فایل جدید14 عمومی و بدونانتساب باقی ماند؛ حذف فایل انجام نشد. این فایل برای تکمیل آزمون واقعی upload→attach درخواست‌شده ایجاد شد، نه برای تشخیص حلقه. هیچ SMS یا تغییر پروفایل منتشرشده انجام نشد.

## مرز ادعا

manifest.ts یک object literal را برمی‌گرداند و مسیر metadata آن را JSON.stringify می‌کند. احتمال race در خواندن JSON داخلی Next زیر موج build وجود دارد، اما callsite دقیق خطای تاریخی JSON.parse ثبت نشده است؛ پس تغییر manifest برنامه یا رفع قطعی خطای داخلی ادعا نمی‌شود. اگر500 پس از توقف حلقه دوباره رخ دهد، فقط stack پاکسازی‌شدهٔ نام تابع/فایل/خط بررسی خواهد شد.

هیچ SMS، تغییر دستی credential، تغییر تنظیمات WordPress/DB/adminsave، تغییر پروفایل حرفه‌ای منتشرشده/آواتار حرفه‌ای/گالری، processkill یا حذف فایل انجام نشد. بازیابی معمول نشست و انتساب موقت آواتار حساب فقط در مرحلهٔ آزمون پیوستهٔ UI بالا انجام شدند؛ آواتار حساب بازگردانده شد. برای تشخیص حلقه، فایل عمومی تازه‌ای ایجاد نشد؛ attachment14 فقط برای تکمیل آزمون واقعی آپلود و اتصال ایجاد شد.
