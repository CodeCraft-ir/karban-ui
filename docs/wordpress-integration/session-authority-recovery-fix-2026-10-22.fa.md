# اصلاح هماهنگی نشست صفحه و API — ۲۰۲۶-۱۰-۲۲

## شاهد زندهٔ علت

در نشست واقعی متخصص روی localhost:3000، پس از بازیابی دسترسی، صفحهٔ حساب و فرم ظاهر شدند. سپس توالی کنترل‌شدهٔ زیر اجرا شد:

1. خواندن تازهٔ /account برای آماده‌کردن مسیر رندر سرور.
2. یک POST عادی /api/auth/refresh:200، بدون SMS.
3. GET /api/account/me:200.
4. GET تازهٔ /account با cookie همان مرورگر و cache:no-store: صفحهٔ بازیابی.
5. تشخیص خصوصی فقط‌سرور: reason=fence_seal_mismatch، executionSurface=rsc_account. هیچ توکن، cookie، generation یا seal خوانده/نمایش داده نشد. متن HTML فاقد prefix تشخیص بود.

پس از تمدید، مرجع حفاظتیِ module-local در مسیر RSC وضعیت قبلی را نگه می‌داشت، درحالی‌که مسیر handler وضعیت جدید را پذیرفته بود. این شاهد از فرضیهٔ cache صرف یا DOM قدیمی قوی‌تر است و همان شکست در تست ترکیب واقعی production با دو graph مستقل بازتولید شد.

## اصلاح source

محدودهٔ چهار فایل:

- src/services/auth/auth-bff.server.ts
- src/services/auth/auth-authority.server.ts (جدید)
- src/services/auth/auth-authority.test.ts (جدید)
- src/services/auth/auth-authority-production.test.ts (جدید)

مرجع مشترک server-only و نسخه‌دار در globalThis/Symbol.for، یک scope ثابت، همان mapهای bounded قبلی؛ HMR سازگار همان مرجع و closureهای زنده را نگه می‌دارد. state خراب یا نسخهٔ ناسازگار fail-closed است؛ fenceهای زنده حذف یا با cookie ورودی جایگزین نمی‌شوند. adapter محدود برای Errorهای graphهای مستقل افزوده شده است. کنترل نسخهٔ قدیمی نشست، هم‌زمانی write و لغو logout حفظ می‌شوند.

## شواهد تست پیاده‌ساز

- baseline واقعی Node310/310؛ تست RED مخصوص refreshA→B در handler و خواندن B در RSC، ابتدا refresh_required می‌داد.
- نتیجهٔ نهایی همهٔ Node313/313، بدون skip/failure/cancellation.
- TypeScript و lint محدود موفق.
- build مستقل و بدون شبکهٔ Next16.3 webpack موفق؛ .next فعال دست‌نخورده.
- lint کامل همچنان4خطای قدیمی helper و8هشدار دارد؛ اصلاح نشده است.
- آزمون‌ها شامل رد A قدیمی، حفظ generation، summary-write seal update، write هم‌زمان، read حین write، logout در refresh، انقضای دسترسی و نبود cookie write در RSC هستند.

نتایج گستردهٔ بالا گزارش پیاده‌سازند. بازبینی مستقل source/security در محدودهٔ اجرای تک‌اپلیکیشن، تک‌پردازه و global realm مشترک PASS شد؛ مورد Important/Critical تأییدشده‌ای یافت نشد. بازبین دو فایل تست authority را مستقلاً با loader و محافظ شبکهٔ آفلاین اجرا کرد:3/3 تست موفق. این تست‌ها graphهای مستقلِ source واقعی production را اجرا می‌کنند، نه HTTP/RSC یک Next فعال. بازبین مجموعهٔ313تایی، type/lint/build را دوباره اجرا نکرد. نتیجهٔ زندهٔ نسخهٔ اصلاح‌شده هنوز تأیید نشده است؛ سرور کاربر راه‌اندازی مجدد نشده است.

## مرز اجرا و فعال‌سازی

پشتیبانی این اصلاح فقط یک اپلیکیشن در یک Node process پایدار با global realm مشترک است. multiworker/multiprocess/distributed یا پایداری revocation پس از restart ادعا نمی‌شود. تعداد workerهای build اثبات topology runtime نیست.

برای انتقال اولیه از closureهای module-local قدیمی به registry جدید، آزمون روی درخواست‌های HMR مخلوط معتبر تلقی نمی‌شود؛ پس از بازبینی، یک راه‌اندازی مجدد کنترل‌شدهٔ سرور موجود لازم است. فرایند کاربر توسط دستیار متوقف نشده است. هیچ env، secret، SMS، DB، تنظیمات WordPress یا پروفایل منتشرشده/آواتار/گالری تغییر نکرد.
