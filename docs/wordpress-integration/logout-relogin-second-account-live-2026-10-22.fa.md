# خروج، ورود مجدد و حساب دوم — آزمون مرحله‌ای ۲۰۲۶-۱۰-۲۲

## مجوز و baseline

اپراتور صریحاً آزمون خروج/ورود مجدد و حساب دوم و ادامهٔ کارها را درخواست کرد. محیط localhost:3000. هیچ شماره، OTP، کلید یا cookie/token از اپراتور در گفتگو دریافت یا از نشست استخراج نمی‌شود؛ ورودهای واقعی با انتخاب اپراتور از فرم معمول انجام می‌شوند.

به‌علت انقضای access، یک refresh عادی200 انجام شد تا baseline نشست فعلی ثبت شود: account3، نقشspecialist، آواتارحسابnull؛ profile8، slug specialist-3، publish، آواتارحرفه‌ای10، گالری1تصویر/revision7. نام/شماره/آدرس شخصی چاپ یا ذخیره نشد.

## خروج واقعی — موفق

- POST /api/auth/logout با JSON خالی:204.
- GET مستقل auth/me، account/me و profile/me پس از خروج: هر سه401 unauthenticated.
- GET /account با نشست همان مرورگر: redirect به /auth/login.
- POST عادی refresh پس از logout:401 unauthenticated؛ از مرورگر خارج‌شده، نشست دوباره احیا نشد.
- صفحهٔ /auth/login برای ورود مجدد اپراتور باز شد.

این آزمون قطع دسترسی مرورگر را تأیید می‌کند؛ refreshsecret قبلی برای replay مستقیم upstream نگه داشته یا آزمایش نشده و ادعای اثبات مستقل همهٔ rowهای revocation پایگاه‌داده نمی‌شود. logout API واقعی بود؛ کلیک تک‌تک منوهای Header/Mobile در این نوبت انجام نشد.

## ورود مجدد همان متخصص — موفق

پس از ورود خصوصی اپراتور از فرم معمول و راه‌اندازی مجدد سرور زیرpreview3000، خواندن واقعی در همان مرورگر account3/specialist و profile8/slug specialist-3 را تأیید کرد. آواتارحسابnull، publicationpublish، آواتارحرفه‌ای10 و گالری1تصویر/revision7 دقیقاً مطابق baseline بودند.

navigation کامل /pro/profile ابتدا صفحهٔ موقت «بررسی دسترسی حساب» داشت؛ پس از انتظار برای دکمهٔ ذخیره، فرم mounted واقعاً حاضر شد، title/bio/skills/address باGETمستقل تطابق داشتند، یک figure گالری و رسانه‌های decodeشده دیده شدند. حالت موقت قبل از hydration به‌اشتباه مشکل بازیابی یا نبودفرم گزارش نشد. هیچ mutation پروفایل در این بررسی انجام نشد.

## حساب دوم کارفرما — آزمون زنده موفق در محدودهٔ مشخص

اپراتور ورود با حساب دوم کارفرما را تأیید کرد. بررسی نشان داد نشست در preview داخلی فعال است، نه مرورگر Playwright قبلی؛ cookie/token بین آن‌ها جابه‌جا نشد. در preview با originlocalhost:3000، auth/me و account/me200، account4 و roleclient بود؛ شناسه با متخصص3 فرق دارد. account.specialist=null و avatar=null.

- GET profile/me:403forbidden؛ profile متخصص قبلی برنگشت.
- GET /pro و /pro/profile به /dashboard هدایت شدند؛ /account مستقیم200 بود.
- فرم حساب در DOM حاضر بود؛ ویرایشگر حرفه‌ای و لینک قابل‌مشاهدهٔ /pro یا /pro/profile دیده نشد.
- GET /api/profile/media200capabilities است؛ آواتار عمومی حساب هر دو نقش پشتیبانی می‌شود. GETgallery405 صرفاً روش پشتیبانی‌نشده است، نه اثبات کنترل مالکیت.

### درخواست‌های منفی نوشتنی و مجوز محدود

ابزار ابتدا بستهٔ درخواست‌های منفی را با Modify Shared Resources رد کرد؛ آن فراخوانی اجراشده فرض نشد و مسیر ابزار دیگری برای دورزدن استفاده نشد. پس از توضیح، اپراتور صریحاً «آزمون محدود مجاز است» را انتخاب کرد؛ سپس درخواست‌ها از همان preview اجرا شدند:

- POST account/me با role=specialist:422invalid_request.
- POST account/me با user_id3:422invalid_request.
- POST account/me با avatar_id10 متعلق به متخصص اول:422invalid_media.
- POST profile/me با avatar_id10 در نشستclient:403forbidden.
- POST profile/gallery با media_id9 وexpected_revision7 در نشستclient:403forbidden.

همه رد شدند؛ هیچ موفقیت غیرمنتظره یا cleanup لازم نشد. GET مستقل account/me200 تأیید کرد id4/roleclient/specialistnull/avatarnull و name/location دقیقاً baseline هستند؛ مقادیر نام و محل چاپ یا ذخیره نشدند.

محدودیت: این آزمون نقشclient در برابر specialist و رسانهٔ مشخص حساب دیگر را می‌سنجد؛ جداسازی دو حساب specialist یا همهٔ REST/GraphQL/ACF/پروژه/پیام‌ها را پوشش نمی‌دهد. existing-number signup با intentنقش متفاوت در این نوبت زنده آزموده نشد. ارسال/ورود OTP توسط اپراتور انجام شد، نه خودکار توسط دستیار.

هیچ دادهٔ پروفایل، انتشار، آواتار یا گالری در این آزمون تغییر نکرد. ارسال SMS تازه توسط دستیار انجام نشد. حساب دوم ساخته/حدس‌زده/به persona متصل نشده است.
