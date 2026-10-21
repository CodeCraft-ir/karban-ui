# بازآزمایی آدرس‌های لوکال — ۲۰۲۶-۱۰-۲۲

درخواست کاربر: آدرس قبلی دوباره آزمایش شود چون احتمالاً اصلاح شده است. فقط GET خواندنی انجام شد؛ هیچ POST OTP، login، migration، seed یا upload ارسال نشد.

## نتیجهٔ HTTP واقعی

| آدرس | نتیجه |
|---|---|
| `http://localhost/karban/wp-json/` | **200 JSON**؛ namespace nahan/v1 ثبت شده است. مشکل rewrite قبلی در این آزمون حل‌شده است. |
| `http://localhost/karban/wp-json/nahan/v1/specialists?per_page=1` | **200 JSON**؛ total=0 |
| `http://localhost/karban/wp-json/wp/v2/city?per_page=100&_fields=id,name,slug` | **200 JSON**؛ فعلاً فقط کاشان/kashan در دیتابیس |
| `http://localhost/karban/index.php?rest_route=/nahan/v1/auth/local-status` | **404 JSON**؛ local_status_unavailable |
| `http://localhost/karban/wp-json/nahan/v1/auth/local-status` | **404 JSON**؛ local_status_unavailable |
| `http://localhost/karban/wp-admin/admin.php?page=nahan-local-development` | redirect به wp-login؛ مرورگر ابزار session مدیر ندارد |

توجه: data.status=404 در خطای WordPress readiness نیست. هیچ otpReady=true یا credentialProvenanceReady=true دریافت نشد.

## تشخیص CLI در همین نشست

یک bootstrap خواندنی برای چاپ فقط environment، boolean پرچم‌های توسعه و boolean آمادگی schemaها تلاش شد؛ WordPress پیش از تولید این JSON با **Error establishing a database connection** متوقف شد. بنابراین وضعیت دقیق پرچم‌ها/ستون‌ها از این مسیر معلوم نشد. این با HTTP سالم Apache و آزمون موفق قبلی اپراتور تفاوت دارد؛ به معنی اثبات خراب‌شدن دیتابیس یا نیاز به تغییر دوبارهٔ DB_HOST/رمز نیست. هیچ wp-config، مقدار secret یا تنظیم سرویس تغییر نکرد و مسیر جایگزینی برای دورزدن sandbox استفاده نشد.

## آنچه هنوز لازم است

اپراتور در مرورگر خودش وارد همان پیشخوان local شود و صفحهٔ «نهان → توسعهٔ محلی» را باز کند. وضعیت gate و سه schema را بدون نمایش راز بررسی/گزارش کند. تنظیمات و migrationها تنها پس از بررسی مقصد، backup و تأیید صریح عملیات اجرا شوند؛ وجود صفحه یا REST index به معنی فعال‌بودن ورود آزمایشی نیست.

کد صفحات حساب/پروفایل و backend/BFF در سطح source-review تأیید شده؛ تست مثبت ورود/ویرایش/فایل همچنان انجام نشده است. شش شهر جدید، پروفایل‌ها و حساب‌های نمونه در این آزمون وارد دیتابیس نشدند؛ سایت آنلاین دست‌نخورده است.
