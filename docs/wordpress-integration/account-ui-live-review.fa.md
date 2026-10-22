# Task8 — بازبینی و آزمون واقعی ظاهر حساب/داشبورد

## بازبینی مستقل

Opus reviewer `afd94c84b5785c947`: Specification PASS و Security/quality/UX PASS در محدودهٔ هشت فایل تغییرکرده؛ Important/Critical تأییدشده و اصلاح الزامی: هیچ.

اتصال واقعی handlerها، قفل بازیابی، null/clear فیلدها، gating رضایت/قابلیت رسانه، هشدار نتیجهٔ مبهم، وضعیت حساب، checklist مبتنی بر دادهٔ ذخیره‌شده و نبود درصد/امتیاز/مالی ساختگی بررسی شد. توکن‌های برند، RTL، گروه‌بندی semantic و اهداف44px حفظ شده‌اند. بازبین تست‌ها را دوباره اجرا نکرد و visual acceptance را از SSR استنتاج نکرد.

شواهد اجراشدهٔ پیاده‌ساز:36focused/276fullNode، tsc/scopedlint/isolatedofflineWebpack/whitespace PASS. Package واقعی8فایل با source مطابقت داشت.

## آزمون mounted واقعی توسط coordinator

- سرور موجود `karban-local-wordpress-test` رویlocalhost:3002 استفاده شد؛ launch، env، sandbox، فرآیند و config تغییری نکرد.
- GET auth/me ابتدا401refresh_required بود. دکمهٔ واقعی «بازیابی نشست و خواندن اطلاعات» در خود UI کلیک شد، سپس GET auth/me200 با نقشclient و صفحه/account واقعی دریافت شد؛ هیچ mutation/upload replay نشد.
- account mounted: نام/شهر/شمارهٔ masked/نقش واقعی، navigationcurrent، فرم گروه‌بندی‌شده و avatarsection دیده شدند. هیچ دادهٔ شخصی در این گزارش درج نشده است.
- screenshot حساب dark در1280×900 مشاهده شد؛ main computedfontYekan/directionRTL/colorمطابقdarktoken. در320×812 حسابdark وlight screenshot مشاهده شدند؛ scrollWidth=320 و دکمهٔ save44px بود. main lightcolor rgb(13,16,19)، safe-bottompadding104px.
- با لینک واقعی داشبورد، /dashboard کارفرما باز شد. screenshot موبایلlight مشاهده شد؛ CTAاصلی جستجوی متخصصان، ویرایش حساب ثانویه و خدمات مالی/پروژه‌ها صریحاً غیرمتصل؛ عدد مالی/پروژهٔ جعلی دیده نشد. navigationcurrent داشبورد بود.
- تبلت768×1024 scrollWidth=768؛ CTA191×44px. programmaticfocus روی CTA تأیید شد، اما focus-visible=false بود؛ **آزمون کامل Tab/کیبورد یا contrast جامع ادعا نمی‌شود**.
- themeپس از آزمون بهdarkقبلی برگشت و viewportoverride بهdesktop resetشد. Selector اولیهٔ حالت تیره matchنشد؛ aria-label واقعی «حالت تاریک» خوانده و همان کلیک شد.

## انجام‌نشده‌ها

- نقش فعلی client است. /pro و /pro/profile/حالت‌های savedchecklist متخصص در مرورگر واردشده مشاهده نشده‌اند؛ نقش عوض/جعل نشد.
- هیچ فایل، آواتار، galleryitem، پروفایل یا حسابی در این آزمون ساخته/ذخیره/حذف نشد. آزمون saveclient قبلی جدا ثبت شده است.
- اجرای upload/attach/detach حرفه‌ای به session متخصص و فایل آزمایشیِ بدون دادهٔ شخصی نیاز دارد؛ موفقیت آن هنوز تأیید نشده است.
- screenshot واقعی recoverypage پیاده‌ساز محدود بود؛ این گزارش فقط بخش clientmounted را تکمیل می‌کند، نه اثبات کلproUI.
- سایت آنلاین/WordPressadmin/مالی/seed در این آزمون تغییر نکردند.
