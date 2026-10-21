# اصلاح readiness محلی — پرچم‌های توسعه

به درخواست صریح کاربر برای بررسی و رفع readiness، فقط تعریف‌های غیرمحرمانهٔ local بررسی شدند. محیط `WP_ENVIRONMENT_TYPE=local` موجود بود؛ دو پرچم OTP/local تعریف نشده بودند و علت پاسخ404 بود.

## تغییر انجام‌شده

در wp-config نصب فعال XAMPP، قبل از require wp-settings و بدون تغییر تعریف‌های DB/رازها، دقیقاً این دو ثابت اضافه شدند:

```php
define( 'NAHAN_LOCAL_DEVELOPMENT', true );
define( 'NAHAN_LOCAL_DEV_OTP', true );
```

وجود تعریف قبلی/محیط غیرlocal/anchor مبهم باعث توقف اسکریپت می‌شد. PHP lint موفق بود. هیچ seed-flag، رمز، کاربرمدیر یا endpoint دورزدن احراز هویت اضافه نشد. `KARBAN_LOCAL_DEVELOPMENT=false` در Next دست‌نخورده ماند.

## نتیجهٔ واقعی HTTP پس از اصلاح

GET خواندنی `/karban/wp-json/nahan/v1/auth/local-status`:

```json
{"status":200,"success":true,"otpReady":true,"credentialProvenanceReady":false}
```

بنابراین gate/readiness endpoint اصلاح شده، ولی آمادگی نهایی ورود برقرار نیست. CredentialSchema::is_ready وجود ستون‌های provenance و InnoDB جدول refresh را لازم دارد؛ علت دقیق false بدون session مدیر/DB query معتبر هنوز تفکیک نشده است. هیچ OTP/verify/refresh/login/upload یا migration اجرا نشد.

صفحهٔ مدیریت واقعی دوباره باز شد؛ به wp-login هدایت شد. بدون ورود مدیر، POST احرازشدهٔ migration ممکن نیست و نباید با ساخت کاربرمدیر/جعل wp_set_current_user یا public bootstrap دور زده شود. اپراتور باید وارد صفحهٔ رسمی شود و ارتقای Refresh credential را با تأیید `I_UNDERSTAND_LOCAL_DEMO` انجام دهد؛ در خطای engine/conflict هیچ تغییر اجباری/حذف داده مجاز نیست. پس از آن GET readiness باید دوباره آزموده شود، سپس Next opt-in و تست مثبت با هویت تحت کنترل اپراتور.

## بازآزمایی پس از ارتقای انجام‌شده توسط اپراتور

کاربر اعلام کرد ارتقا را از پیشخوان انجام داده است. GET واقعیِ بدون credential به همان endpoint اکنون HTTP200 و `otpReady:true` و `credentialProvenanceReady:true` می‌دهد. بنابراین نتیجهٔ false بخش قبلی تاریخی است؛ schema credential اکنون از دید readiness آماده است. اجرای migration توسط اپراتور بوده، نه این دستیار.

پس از این تأیید، فقط `KARBAN_LOCAL_DEVELOPMENT=false` در `.env.local` به `true` تغییر کرد؛ پیش از آن URL WordPress و APP_ORIGIN به‌ترتیب با loopback/karban و localhost:3002 تطبیق داده شدند. سایر envها/رازها تغییر نکرده و نمایش داده نشدند.

سرور preview موجود روی3002 دوباره بررسی شد: auth/me، account/me، profile/me و profile/media بدون نشست پاسخ401/private,no-store می‌دهند؛ /account به login می‌رود، نه500 یا حساب ساختگی. این نبود config503 نیست، بلکه فقدان نشست معتبر است.

ورود مثبت هنوز نیازمند شمارهٔ تحت کنترل اپراتور در فرم واقعی است؛ شمارهٔ تصادفی تولید یا حدس زده نشد، هیچ POST درخواست OTP/verify/upload انجام نشد و هیچ حساب/فایل/پروفایل جدیدی ساخته نشد. ثابت145632 فقط در مسیر local تأییدشدهٔ سرور کار می‌کند؛ این نتیجه به معنی آزمون موفق ورود/ذخیرهٔ پروفایل نیست. financial readiness/پرداخت خارج از این آزمون است.

سایت آنلاین، تنظیمات شبکه/sandbox و داده‌های حساب/پرداخت/seed دست‌نخورده‌اند. این گزارش فعال‌شدن ورود کامل را ادعا نمی‌کند.
