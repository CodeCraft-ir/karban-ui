# وضعیت واقعی ادامهٔ اتصال WordPress — ۲۰۲۶-۱۰-۲۲

این فهرست، تفکیک کارهای انجام‌شده و باقی‌مانده است؛ ادعای تکمیل همهٔ محصول یا مجوز deploy/پرداخت واقعی نیست.

## تأییدشده در محدودهٔ مشخص

- رفع مسیر SMS فراز با قرارداد واقعی IranPayamak؛ اپراتور کارکرد آن را تأیید کرد. OTP/کلید دریافت یا ذخیرهٔ گفتگو نشد.
- اصلاح مرجع مشترک نشست در topology تک‌پردازه/shared-global-realm؛ تست313Node و آزمون زندهٔ refresh→API→RSC موفق. distributed یا revocation پایدار پس از restart ادعا نمی‌شود.
- اصلاح Tailwind source/watch boundary و3تست واقعی PostCSS، حفظ کاملCSSsrc و توقف حلقه در دو پنجرهٔ سکون زنده؛ manifest یک‌بار200JSONمعتبر. نبود دائمی خطای500 تضمین نشده.
- ذخیره/خواندن/بازگردانی متن متخصص؛ gallery attach/detach فوری در اجرای جدید؛ upload→دکمهattach→نمایش→reload آواتار حساب14 موفق و بازگردانیnull.
- پروفایل8 publish/آواتار10/گالری1/revision7 اپراتور حفظ شد. بررسی عمومی همین پروفایل، نشانی خصوصی را در پاسخ‌های آزموده‌شده افشا نکرد.
- خروج واقعی204، APIهای خصوصی401، redirectبهlogin و refreshپس‌ازخروج401.

## در انتظار اقدام خصوصی اپراتور

1. ورود دوباره با همان متخصص: مقایسهaccount3/role وprofile8/status/media/slug، سپس reload.
2. حساب دوم تحت کنترل اپراتور، ترجیحاً نقش دیگر: جداسازی حساب، ممنوعیت استفاده از رسانه/مالکیت متخصص اول، guardها و منوها. شمارهٔ ساختگی یا persona به‌جای حساب واقعی استفاده نمی‌شود.
3. lifecycle submit/pending با پروفایل آزمایشی مجاز: پروفایل منتشرشدهٔ فعلی صرفاً برای چک‌لیست تغییر وضعیت داده نمی‌شود.
4. تکمیل ماتریس viewport/theme/keyboard؛ تست‌های جزئی فعلی، certification کامل نیستند.

## نیازمند ادامهٔ پیاده‌سازی جدا و طراحی تأییدشده

### دادهٔ اولیهٔ لوکال

ابزار preview/apply و linkage امن آماده و fixture-tested است؛ دسته‌های اولیه و کاشان طبق گزارش قبلی ثبت شدند. اعمال گسترش مناطق و کاربران/پروفایل‌های نمونه در محیط واقعی هنوز شواهد کامل ندارد. ابتدا preview تازه، snapshot و consent اعمال؛ رکوردهای ویرایش‌شده/بی‌نشان/متعارض overwrite یا adopt نشوند. کاربران نمونهٔ بدون شماره جای حساب دوم OTP نیستند.

### پرداخت شبیه‌سازی‌شدهٔ واقعی — هنوز ساخته نشده

مسیر فعلی payment-routes و PaymentGateway به Zarinpal واقعی متصل است؛ برای شبیه‌سازی لوکال فراخوانی نشود. source فعلی success را پیش از fulfill ثبت می‌کند و نتیجهٔ اثرهای wallet/subscription/lead را کامل بررسی نمی‌کند؛ یک callbackموفق یا URLsuccess اثبات atomic/idempotent fulfillment نیست.

پایهٔ transactional موجود باید reuse شود. مرحلهٔ پیشنهادی کوچک: wallet-topup محلی pending→confirm→result با gateصریح، owner-auth، مبلغ/purpose/target مرجع سرور، idempotency و تراکنش واحد payment+ledger؛ rollback، concurrent/duplicate confirm و پاسخ مبهم آزموده شوند. بانک، اینترنت provider و پرداخت واقعی خارج این مرحله‌اند. طراحی و برنامهٔ این برش باید پیش از کدنویسی تأیید شوند؛ broad«تمام کن» جای انتخاب معماری مالی نیست.

### پروژهٔ مالک و wizard

ProjectWizard فعلاً پایان local done/animation دارد، نه ثبت پروژه. createProject قدیمی GraphQL بلافاصله publish می‌کند و mediaID و writeها نیازمند سیاست مالکیت و نتیجهٔ checked هستند. سرویس مشترک امن، lifecycle، DTOعمومی/خصوصی، taxonomy و persistence باید پیش از BFF و اتصال wizard تکمیل شوند؛ موفقیت نمایشی جای ذخیره واقعی نیست.

### فایل خصوصی و پیام‌رسانی

رسانهٔ فعلی عمداً public-avatar/public-portfolio است. فایل پروژه/پیام خصوصی نیازمند storage/download حفاظت‌شده، purpose/context/ownership و retention است؛ URLعمومیWordPress خصوصی نیست. messagingموجود نیازمند سیاست participant/project/entitlement، attachment و BFF/UI واقعی است. تماس یا پیام پولی پیش از entitlement واقعی unlock نشود.

## ترتیب پیشنهادی

E2Eفعلی→seedلوکال باpreview→طراحی و تأیید wallet-topup simulator→اثبات تراکنش واقعی→پروژهٔ متنی مالک→entitlement/lead→فایل خصوصی و پیام‌رسانی. استقلال تست حساب/پروفایل از مالی حفظ می‌شود.

## موانع انتشار

lintکل4خطای قدیمی helper/8هشدار و auditنصب حل‌نشده‌اند. بانک، سایت آنلاین، FTP، انتشار دادهٔ آزمایشی production، multiworker و تغییر سرویس‌های کاربر مجاز/آزموده فرض نمی‌شوند. همهٔ این مرزها باید در تحویل نهایی روشن بمانند.
