# بررسی WordPress محلی — ۲۰۲۶-۱۰-۱۸

محیط معرفی‌شده توسط کاربر:

- WordPress: `http://localhost/karban`
- پلاگین فعال محلی: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core`

## نتایج واقعی درخواست‌های خواندنی

از طریق مرورگر Playwright (بدون credential):

| بررسی | نتیجه |
|---|---|
| صفحهٔ اصلی `/karban/` | در دسترس؛ عنوان «کاربان» |
| `/karban/wp-json/` | HTTP 404 از Apache |
| `/karban/index.php?rest_route=/` | JSON معتبر؛ namespace `nahan/v1` و routeهای auth/profile/specialists/wallet/leads/payments/messaging/uploads ثبت شده‌اند |
| `index.php?rest_route=/nahan/v1/specialists&per_page=1` | HTTP 200؛ envelope موفق؛ فعلاً ۰ متخصص |
| `index.php?rest_route=/wp/v2/job_category&per_page=1` | HTTP 200؛ آرایهٔ خالی؛ total/pages هر دو ۰ |
| `index.php?rest_route=/wp/v2/city&per_page=1` | HTTP 200؛ آرایهٔ خالی؛ total/pages هر دو ۰ |
| `index.php?graphql&query={ __typename }` (query کدگذاری‌شده) | HTTP 200؛ `data.__typename = RootQuery` |

این آزمون، فعال‌بودن REST پلاگین و پاسخ پایهٔ WPGraphQL را تأیید می‌کند؛ تأیید کامل schema پروژه/مالکیت یا SMS/پرداخت نیست. هیچ دادهٔ تستی، حساب، OTP، پیام، آپلود یا پرداختی ایجاد نشد. GET جزئیات متخصص که بازدید می‌نویسد اجرا نشد.

## اقدام پیشنهادی

در پیشخوان WordPress → تنظیمات → پیوندهای یکتا، ساختار مناسب غیرساده (مثل «نام نوشته») را ذخیره کنید و دوباره `/karban/wp-json/` را بررسی کنید. اگر 404 باقی ماند، rewrite Apache، `mod_rewrite` و مجازبودن `.htaccess` برای پوشهٔ سایت باید توسط مدیریت XAMPP بررسی شود. این بررسی هیچ تنظیم Apache/WordPress یا فایل `.htaccess` را تغییر نداده است.

فرانت در حالت پیش‌فرض `WORDPRESS_PERMALINK_MODE=pretty` مسیرهای استاندارد `/wp-json/nahan/v1/` و `/graphql` را می‌سازد. برای همین نصب محلی بدون rewrite، فقط در preview سرور مقدار صریح `WORDPRESS_PERMALINK_MODE=plain` تنظیم کنید: REST پلاگین به `/index.php?rest_route=/nahan/v1/...` و WPGraphQL به `/index.php?graphql` می‌روند. fallback یا probing خودکار وجود ندارد. HTTP فقط برای توسعه مجاز است؛ production باید HTTPS باشد. builder فقط route داخلی ثابت را می‌سازد و `rest_route` ورودی کاربر را پیش از dispatch رد می‌کند.

## مرزهای محیط

curl همین نشست به localhost اتصال برقرار نکرد (HTTP 000)، اما ابزار مرورگر توانست به محیط XAMPP دسترسی پیدا کند. دسترسی مرورگر اثبات نمی‌کند که runtime Node فرانت هم به همان localhost دسترسی دارد؛ اتصال Next→WordPress باید جداگانه بررسی شود. این تفاوت نباید با خاموش‌کردن sandbox یا ارسال credential دور زده شود.

## نسخه‌های پلاگین

نسخهٔ قبلی در `/Users/binam/project/پرهیزکاری/wp/wp-content/plugins/karban-core` از نسخهٔ فعال XAMPP جداست. بررسی read-only نشان داد `rest-api/profile-routes.php` در هر دو byte-identical است و محافظ انتشار/رمز عمومی هنوز وجود ندارد. فقط snapshot نسخهٔ قدیمی گرفته شده؛ هیچ guard یا patch هنوز اجرا/نصب نشده است. ویرایش نسخهٔ قبلی متوقف شده تا هدف فعال اشتباه نشود.
