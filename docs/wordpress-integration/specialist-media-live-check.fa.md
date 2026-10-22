# آزمون واقعی پروفایل متخصص، آپلود و گالری لوکال

## مجوز و محیط

کاربر اعلام کرد با متخصص وارد شده و آزمون آپلود/گالری را درخواست کرد. نشست واقعی متخصص از BFF تأیید شد؛ حساب یا نقش جعلی ساخته/تغییر داده نشد. Next رویlocalhost:3002 و WordPress رویlocalhost/karban، transport موجودplain، پروفایل آزمون id8/slug specialist-3 در وضعیتdraft.

## مانع اولیه و اصلاح محدود مجوز uploads

- GETprofile و capability200: گالری0، revision0، آواتارnull؛ public-avatar وpublic-portfolio مجاز.
- نخستین PNG733بایتی64×64 با عنوانLOCALTEST، بدون دادهٔ شخصی، POSTmedia503operation_uncertain داد. retryخودکار نشد.
- جست‌وجوی احرازشدهٔ کتابخانه رسانه فقطبرای همینfilename، هیچ رسانه‌ای پیدا نکرد. بررسی filesystem: uploads وجودنداشت؛ parentwp-content0755 متعلق به کاربر محلی بود.
- WordPressSiteHealth واقعی: main/wp-content/uploads/plugins/themes غیرقابلنوشتن. علت محیطی uploadstorage تأیید شد؛ نه ادعای مشکل MIME/مجوز مالکیت.
- userصریحاً «اصلاح محدود توسط شما» را در سؤال مجوز انتخاب کرد؛ دسترسی پوشهٔ تنظیماتXAMPP نیز جدا اعطا شد. فقط خطوط غیرمحرمانهٔ httpd.conf خوانده شد: Userdaemon/Groupdaemon. تلاشقبلیps باsandboxردشد؛ دورزده نشد/سرویس restartنشد.
- فقط wp-content/uploads با0755 ایجاد و ACL ارثی محدود userdaemon برای عملیات رسانه در همان پوشه اضافه شد. نه777، نه تغییر مالکیت/مجوزcore/wp-content/plugins/themes، نه sudo/secret/config/sandboxchange.
- SiteHealth پس از اصلاح: uploadsWritable؛ main/wp-content/plugins/themes همچنانNotwritable.

## آزمون واقعی موفق

1. پیش‌بررسی مالک متخصص و draftprofile/gallerystart0rev0؛ همانPNG به‌صورت یک تلاش جدید و کنترل‌شده پس از رفع علت محیطی ارسال شد: **POST /api/profile/media200**، mediaid9، MIMEimage/png، purposepublic-portfolio، URLhostlocalhost.
2. فایل واقعی uploads/2026/10/karban-local-gallery-test.png،733bytes، mode0644 تأیید شد. هیچ فایل شخصی آپلود نشد.
3. قبل از attach، access منقضی و GET401 بود؛ GETauthme علتrefresh_required را تأیید و POSTrefresh200 با role specialist انجام شد؛ upload تکرار نشد.
4. POSTgallery با media9/captionآزمایشی/expected_revision0 در serverlog **200** شد. درخواست browser به‌دلیل کامپایل سردdev در مرزtimeout تمام شد؛ mutation retry نشد.
5. GET مستقل بعدی **200**: gallery1، revision1، media9 موجود، draft وslugثابت. تصویر واقعی از URLلودشد و decode64×64 تأیید شد.
6. لینکواقعی داشبورد به /pro/profile باز شد؛ DOMmounted شامل imageآزمایشیcomplete/natural64×64 و بخشگالری/وضعیتdraft بود. screenshot320×812 گالری مشاهده شد؛ scrollWidth320 و detachbutton44px. هیچ publish/submit انجام نشد.
7. DELETEmedia9 با revisionقدیمی0: **409gallery_revision_conflict**؛ تصویر درگالری باقی بود. کنترلrevisionواقعی پاس شد.
8. دکمهٔ واقعیfigure «جدا کردن از گالری» کلیک شد؛ serverlog DELETEmedia9 **200**.
9. GET مستقل **200**: گالری0، revision2، media9دیگردرگالری نیست، statusdraft وslugهمانspecialist-3. گالریserver به حالتخالی اولیه برگشت، revisionبه‌درستیافزایش یافت.

## نکتهٔ UI هنوز باز است

پس از حذف200 وGET0rev2، DOMmounted هنوز imageآزمایشی را نشان می‌داد و پیامempty/success دیده نشد. این تفاوت صریحاً ثبت شد؛ موفقیت فوریupdateUI ادعا نمی‌شود. بررسی انتخابگرreload بعدی توسط ابزار با reason «Unrequested Commit in a Connected App» رد شد (خود expression فقطreadبود)؛ با ابزار/جلسهٔ دیگر دورزده نشد. viewportبهdesktopبرگشت.

Opusread-onlysource investigator `a815f7d8ec4f4ab9c` فقطOwnerEditor/actiongate/summary/HMR را بررسی می‌کند؛ بدون مرورگر/HTTP یا اجرای deniedoperation. علت sourcebug در این گزارش اثبات نشده و احتمال timing/HMR به‌عنوان واقعیت گزارش نشده است.

## بازآزمایی خواندنی پس از اجازهٔ صریح کاربر

کاربر در سؤال مجوز گزینهٔ «بررسی خواندنی مجاز است» را انتخاب کرد؛ فقط پس از این اجازهٔ تازه، مرورگر دوباره بررسی شد. snapshot صفحهٔ پروفایل به علت انقضای access، بازیابی نشست را نشان می‌داد. دکمهٔ واقعی «بازیابی نشست و خواندن اطلاعات» کلیک شد؛ هیچ profile mutation/upload/submit دوباره اجرا نشد.

نتیجهٔ واقعی بعد از بازیابی: GETprofile200، galleryCount=0، revision=2، status=draft؛ DOMmounted هم empty-gallery=true و test-image=false. بنابراین UI تازه نیز با حذف ذخیره‌شده منطبق شد. GET عمومی `/specialists/specialist-3` با credentials:omit نیز404 بود؛ draft عمومی نشد.

تحقیق read-only منبع پایان یافت: هیچ نقص merge/revision/cache مشخصی اثبات نشد. handler روی پاسخ پذیرفته‌شده باید state و notice را هر دو به‌روز کند؛ کنارگذاشته‌شدن پاسخ در lifecycle/HMR فقط فرضیه است. ابزار mounted-test مانند jsdom/react-test-renderer/happy-dom/TestingLibrary/Playwrighttest در پروژه نصب نبود؛ چیزی نصب نشد و SSR به‌عنوان تست lifecycle معرفی نشد. **هیچ patch حدسی برای این مشاهده اعمال نشد.** به‌روزرسانی فوری پس از mutation در lifecycle اصلی هنوز جدا از موفقیت reread است.

## آثار باقی‌مانده و محدودیت

- یک فایل/attachment عمومی آزمایشی id9 رویلوکال باقی است و اکنون درگالری نیست. detach طبققرارداد فایل را حذف نمی‌کند. خودکار با admin حذف نشد؛ cleanupفایل در صورتخواستکاربر از کتابخانه‌رسانه ممکن است.
- ACLمحدودuploads برایکارکردواقعیWordPress باقی می‌ماند؛ بقیه پوشه‌ها بازنشدند. بازگردانی درصورتنیاز فقط حذف همانACE از همانuploadsاست؛ filesystemتغییرجدیدبدونمجوزانجامنمی‌شود.
- پروفایلdraft وslugثابت ماند؛ عنوان/bio/دسته/شهر/آواتار/verified/شماره/نقش/انتشار تغییرنکردند. galleryrevisionباقیمانده2 اثرواقعیآزموناست وrollbackجعلی به0نشد.
- آواتارحرفه‌ای/حساب، JPEG/GIF/WebP، ویرایشمتن، publicpublishedportfolio، crossusermedia وlogout/login دراینآزمون اجرا نشدند. نتایجstubقبلی جانشیناین‌ها نیستند.
- devcompile latency وmanifest500متناوب قبلی درlogsوجودداشت؛ عملیاتadd200 وdelete200/readback مستقل از آن تأیید شدند، اما کارایی/manifestدراینمرحله اصلاح‌شده اعلام نشد.
- هیچبانک/SMS/seed/migration/accountnew/onlineFTP/deploy/secret یا permission کلی سیستم تغییرنکرد.
