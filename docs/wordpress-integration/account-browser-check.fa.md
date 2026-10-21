# Task7E — آزمون واقعی مرورگر پس از تأیید کد

## مجوز و محیط

کاربر صریحاً گزینهٔ «اجازهٔ محدود preview» را انتخاب کرد. از entry موجود `karban-local-wordpress-test` در `.claude/launch.json` استفاده شد؛ هیچ فایل launch، sandbox، مجوز نامحدود، secret یا تنظیم WordPress تغییر نکرد.

- Next: `http://localhost:3002`، bind loopback، Webpack.
- WordPress: `http://localhost/karban/`، plain REST.
- preview server: `42a548c2-3146-4c14-89e8-fe73717542bc`.

## آزمون‌های خواندنی اجراشده

با credentials:omit و cache:no-store از مرورگر واقعی:

| مسیر/سناریو | نتیجه |
|---|---|
| `GET /api/auth/me` | 401 unauthenticated؛ private,no-store |
| `GET /api/auth/challenge` | 401 unauthenticated؛ private,no-store |
| `GET /api/account/me` | 401 و فقط خطای امن؛ private,no-store |
| `GET /api/profile/me` | 401 و فقط خطای امن؛ private,no-store |
| `GET /api/profile/media` | 401 و فقط خطای امن؛ private,no-store |
| بازکردن `/account` بدون نشست | redirect به `/auth/login` و فرم واقعی ورود، بدون Application/Internal Server Error |
| بازکردن `/pro/profile` بدون نشست | redirect به `/auth/login`، بدون افشای دادهٔ متخصص |
| `/auth/login` | فرم دو نقش و شماره نمایش داده شد؛ ارسال تا ورودی معتبر غیرفعال |
| عرض۳۲۰ | scrollWidth=320 و نبود overflow افقی؛ دو گزینهٔ نقش قابل مشاهده |
| theme | dark و light با DOM تأیید شدند؛ screenshot موبایل dark مشاهده شد |
| viewport | در پایان به desktop برگشت |
| WordPress `GET index.php?rest_route=/nahan/v1/auth/local-status` | 404 JSON با code=`local_status_unavailable` |

خواندن `/auth/verify` با نشست خالی نیز انجام شد، اما این پاسخ HTMLِ قبل از lifecycle کامل client است؛ این گزارش از آن، موفقیت/شکست بازیابی challenge معتبر را استنتاج نمی‌کند.

## مرز نتیجه

source-review نهایی Task7E PASS و تست‌های گزارش‌شده263/full57focused هستند. اکنون browser verification دیگر به‌صورت کلی NOT RUN نیست: **حالت ناشناس، guardها و نمایش فرم ورود واقعاً آزموده شدند**. اما فرم حساب/pro برای کاربر واردشده، گالری mounted، آپلود و persistence مثبت هنوز آزموده نشده‌اند.

هیچ POST درخواست OTP، verify، profile، upload، seed یا migration ارسال نشد. هیچ SMS، بانک، حساب یا فایل WordPress تازه ایجاد نشد. Readiness backend هنوز unavailable است؛ قبل از هر OTP باید operator setup/migration/gateهای local آماده شوند. این گزارش جای آزمون مثبت واقعی را نمی‌گیرد.

## پس از اعلام ورود کاربر

کاربر اعلام کرد وارد شده است. لاگ واقعی Next شامل `POST /api/auth/verify 200`، `GET /api/auth/me 200`، `/account 200` و `/api/profile/media 200` است؛ این مشاهدهٔ لاگ، ورود موفقی در یک browser context را تأیید می‌کند، نه اجرای ورود توسط دستیار. لاگ همچنین `POST /api/account/me 422` و سپس GET account/me200 دارد. متن پاسخ422/ورودی شخصی بررسی نشده؛ علت هنوز معلوم نیست و از status تنها نباید خطای مشخصی حدس زد.

در browser context ابزار، GET same-origin با credentials:same-origin به auth/me و account/me همچنان401 است؛ بازکردن /account در context دیگر ابزار نیز به login هدایت شد. session کاربر در مرورگر خودشان به‌صورت خودکار با ابزار مشترک نیست. هیچ cookie/توکن منتقل یا هویت مدیر/کاربر جعل نشد و هیچ mutation آزمایشی پروفایل از طرف دستیار انجام نشد. برای تست خودکارِ مجاز باید کاربر در همان پنل Browser آزمون وارد شود، یا نتیجهٔ خطای فرم را بدون شماره/راز گزارش کند.

سرور preview برای بررسی کاربر روشن باقی مانده است؛ متغیر/secret خصوصی خوانده، نوشته یا در خروجی ثبت نشده است.
