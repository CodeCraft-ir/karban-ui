# دادهٔ عمومی متخصصان

این لایه فقط برای خواندن دادهٔ منتشرشدهٔ متخصصان از سرور Next است و هیچ fallback ساختگی، توکن، cookie یا دادهٔ تماس مشتری/پروژه ندارد.

## قراردادهای پایدار برای Task 3B

- `loadPublicSpecialists(search, { request? })` از مسیر ثابت `nahan/v1/specialists` با `q`، `category`، `city`، `verified=1`، `page` و `per_page` استفاده می‌کند.
- `loadPublicSpecialistDetail(slug, { request? })` فقط یک slug امن می‌پذیرد و آن را به یک component مسیر `specialists/{slug}` تبدیل می‌کند. خطای واقعی `WordPressApiError` با `status: 404` و `code: "not_found"` بدون تبدیل به نتیجهٔ خالی عبور می‌کند؛ `isPublicSpecialistNotFound` فقط همین مورد را تشخیص می‌دهد.
- `loadPublicTerms("job_category" | "city" | "neighborhood", { fetch? })` فقط سه مسیر core REST allowlisted زیر را بدون credential می‌خواند: `/wp-json/wp/v2/job_category`، `/city` و `/neighborhood`. همهٔ صفحه‌ها تا سقف ۱۰۰ خوانده و بر اساس ID deduplicate می‌شوند.
- انواع serializable در `src/lib/contracts/specialists.ts` هستند. کارت تنها identity، وضعیت تأیید، rating معتبر، avatar امن، availability و نام‌های category/city را ارائه می‌کند. detail فقط متن‌های واقعی، سال/پاسخ مثبت، آدرس، قیمت، `phoneDisplay`، مختصات غیرصفر و وضعیت صریح gallery/reviews را اضافه می‌کند.

## محدودیت‌ها و ایمنی

- `phoneDisplay` فقط از فیلد منتشرشدهٔ نام‌دار `phone_display` می‌آید. ارقام فارسی/عربی به ارقام لاتین تبدیل می‌شوند؛ مقدار دارای متن، URL، control character یا قالب شمارهٔ نامعتبر پنهان می‌شود. هیچ fallback به تلفن حساب، مشتری یا پروژه وجود ندارد.
- URLهای avatar فقط `http(s)` هستند. متن backend برای HTML render یا sanitize نمی‌شود؛ Task 3B باید JSX escaped استفاده کند، نه `dangerouslySetInnerHTML`.
- gallery nonempty عمداً `"unavailable"` است: در این مرحله media ID یا metadata خام resolve/منتشر نمی‌شود. review record، completed jobs، headline/name جدا، neighbourhood filter، distance، portfolio و آمار ساختگی وجود ندارند.
- count terms شامل specialist و project است و نباید به‌عنوان تعداد متخصص نمایش داده شود. neighbourhood رابطهٔ city ندارد و برای فیلتر متخصص پشتیبانی نمی‌شود.
- list/detail به transport بازبینی‌شدهٔ Task 1 تکیه دارند؛ taxonomy loader مسیر/namespace دلخواه یا proxy عمومی نیست. همهٔ GETها `Accept: application/json`، `cache: "no-store"` و timeout ده‌ثانیه‌ای دارند.

## پیش‌نیاز انتشارِ واگذار شده

این تغییر frontend به‌تنهایی تأیید نمی‌کند که endpointهای WordPress زنده یا امن در محیط deploy هستند. publication guard، نصب/انتشار plugin و verification روی سایت به عامل/مرحلهٔ backend جداگانه واگذار شده‌اند و این سند چنین تأییدی را ادعا نمی‌کند.

Task 3B باید برای metadata و صفحهٔ detail از یک React-cache loader مشترک استفاده کند، link prefetch خودکار detail را غیرفعال کند و detailها را برای sitemap جمعی fetch نکند؛ GET detail می‌تواند view ثبت کند.
