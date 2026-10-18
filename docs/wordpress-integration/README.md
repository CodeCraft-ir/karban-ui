# اتصال WordPress کاربان — وضعیت و راه‌اندازی محلی

این فرانت با **Next.js مستقل و Node.js** اجرا می‌شود. WordPress سرویس داده و احراز هویت است؛ کپی‌کردن خروجی فرانت داخل قالب WordPress جایگزین اجرای سرور Next نیست.

## پیکربندی فعلی

متغیر زیر فقط سمت سرور خوانده می‌شود:

```dotenv
WORDPRESS_URL=https://codecraft.ir/kar/
# Optional; exact values are pretty (default) or plain
WORDPRESS_PERMALINK_MODE=pretty
```

مقدار نمونه در [`.env.example`](../../.env.example) موجود است. تنظیم واقعی را در محیط اجرای سرور انجام دهید؛ فایل حاوی راز یا اطلاعات ورود را commit نکنید. نبود تنظیم معتبر خطا است و به آدرس یا دادهٔ ساختگی تبدیل نمی‌شود.

زیردایرکتوری `/kar/` عمداً حفظ می‌شود:

- `pretty` (پیش‌فرض): REST پلاگین `https://codecraft.ir/kar/wp-json/nahan/v1/` و WPGraphQL `https://codecraft.ir/kar/graphql`
- `plain`: REST پلاگین `https://codecraft.ir/kar/index.php?rest_route=/nahan/v1/...` و WPGraphQL `https://codecraft.ir/kar/index.php?graphql`

حالت باید صریحاً `pretty` یا `plain` باشد؛ مقدار نامعتبر خطا می‌دهد و هیچ fallback/probing خودکار انجام نمی‌شود.

هیچ access token، refresh token، کلید SMS/درگاه یا application password نباید در متغیر `NEXT_PUBLIC_*`، localStorage، Zustand، HTML یا پاسخ عمومی API قرار بگیرد.

## بخش تأییدشدهٔ محلی

لایهٔ ارتباط در `src/services/wordpress/` شامل ساخت URL، قرارداد envelope، خطای نوع‌دار، timeout و لغو درخواست، پاک‌سازی اطلاعات حساس و کلاینت‌های REST/GraphQL است. فقط کد داخلی سرور باید آن را فراخوانی کند؛ این لایه proxy آزاد برای query یا URL ورودی مرورگر نیست.

در آزمون‌های تزریقیِ بدون شبکه، ۴۱ تست پاس شده‌اند. از جمله:

- تشخیص timeout و لغو هنگام خواندن body، پس از دریافت header؛
- جلوگیری از افشای credential در کلیدهای تو‌در‌توی خطا؛
- رد `rest_route` و شکل‌های encoded/PHP-normalized آن پیش از ارسال درخواست؛
- حفظ زیردایرکتوری و قرارداد پاسخ واقعی پلاگین.

هستهٔ احراز هویت و اتصال داده‌های عمومی در حال توسعه‌اند. این سند **تأیید اتصال کامل ورود، داشبورد، پرداخت یا سایت آنلاین نیست**.

## دستورات بررسی

آزمون‌های ارتباط فعلی:

```bash
node --experimental-strip-types --test src/services/wordpress/url.test.ts src/services/wordpress/client.test.ts src/services/wordpress/taxonomies.test.ts
```

بررسی TypeScript با ابزار نصب‌شده، بدون دریافت پکیج:

```bash
./node_modules/.bin/tsc --noEmit
```

بررسی lint:

```bash
npm run lint
```

ساخت production با Webpack، که در این محیط موفق بوده است:

```bash
./node_modules/.bin/next build --webpack
```

ساخت پیش‌فرض Turbopack در همین محیط با خطای sandbox هنگام binding پورت داخلی شکست خورده است؛ موفقیت Webpack به معنی موفقیت آن فرمان نیست. هشدار Node دربارهٔ module type تست‌ها و پیام‌های certificate trust محیط نیز مشاهده شده‌اند و نباید پنهان یا با شکست تست اشتباه گرفته شوند.

پیکربندی preview محلی در [`.claude/launch.json`](../../.claude/launch.json) با Webpack است؛ در صورت اشغال پورت، ابزار preview می‌تواند پورت دیگری انتخاب کند.

## موانع فعلی و شروط انتشار

- دسترسی registry npm و سایت WordPress در نشست فعلی محدود شده است. policy شبکه نباید دور زده شود. هیچ درخواست زنده یا ارسال SMS/ساخت حساب/پروژه/پرداخت برای تأیید انجام نشده است.
- `iron-session` نصب نیست. نشست، refresh coordination، cookie/CSRF، handlerها و guardهای خصوصی تا فراهم‌شدن وابستگی معتبر کامل نیستند؛ رمزنگاری دست‌ساز یا ذخیرهٔ browser token جایگزین امنی نیست.
- وابستگی‌های برنامه‌ریزی‌شدهٔ Query/Form نیز هنوز نصب نشده‌اند. وجود transitive یک کتابخانه در `node_modules` مجوز اتکا به آن به‌عنوان وابستگی مستقیم نیست.
- تغییرات محلی پلاگین، اگر در مراحل بعد اضافه شوند، به معنی نصب آن‌ها در سایت نیستند. قبل از استفادهٔ عمومی، کنترل انتشار/مالکیت/رسانه و قبل از انتشار مالی، atomicity و idempotency باید آزموده شوند.
- تماس مشتریِ پروژه فقط بعد از entitlement سرور مجاز است؛ blur رابط کاربری مجوز ایجاد نمی‌کند. شمارهٔ عمومی متخصص، اگر طبق قرارداد منتشر شود، مفهوم جداگانه‌ای است.
- فعال‌بودن و schema واقعی WPGraphQL، ACF، سرویس SMS و درگاه روی سایت تأیید نشده است.
- آزمون staging و هر عملیات روی سایت اصلی به مجوز و حساب آزمایشی مشخص نیاز دارد. این تغییرات به‌تنهایی چنین مجوزی ایجاد نمی‌کنند.

حذف ازقبل‌موجود `package-lock.json` حفظ شده است؛ نصب وابستگی‌ها نباید آن را بی‌اجازه بازتولید کند. هیچ commit، push یا deploy توسط این مرحله انجام نشده است.
