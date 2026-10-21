# رفع خطای۴۲۲ و آزمون واقعی ذخیرهٔ حساب لوکال

## علت و اصلاح کد

وقتی permalink WordPress فعال است ولی transport از endpoint ساده استفاده می‌کند، WP_REST_Request::get_params پارامتر query `rest_route` را با JSON فرم ادغام می‌کند. strict business validator آن را unknown_field می‌دانست. این مسئله با کلاس نصب‌شدهٔ WordPress و callback واقعی در چهار ترکیب pretty/plain و permalink on/off بازتولید شد؛ plain/on تنها حالت۴۲۲ بود.

اصلاح حساب، پروفایل، submit و گالری دادهٔ business را از JSONobject می‌گیرد؛ routingquery جداست. unknownJSON/owner/role/slug/status همچنان رد می‌شوند؛ pathID گالری جدا اعتبارسنجی می‌شود. multipart فقطformbody می‌گیرد. بازبینی، تمایز{}از[]را هم الزام کرد و اصلاح شد.

Spec/securityquality re-review PASS؛ requiredNONE. تست۱۷۶callback، تمام۱۱PHP و owner regressionها، مجموعهٔ Node با loader صحیح۲۶۴/۲۶۴، tsc/scopedlint/PHPsyntax/diff موفق. Offlinebuild موفق. lint سراسری هنوز۴خطای فایل قدیمی helper را دارد؛ سبز ادعا نشده است.

## آزمون واقعی احرازشده (با مجوز کاربر)

مرورگر nativepreview `http://localhost:3002`، WordPress `http://localhost/karban/`، transport همچنان plain. کاربر خواست «خطا را رفع کن و ذخیره پروفایل را تست کن».

1. GET auth/me در ابتدا401refresh_required داد؛ POSTrefresh واقعی با cookie موجود، بدون دریافت/نمایش token، **200** داد و نقش **client** تأیید شد.
2. GET account/me پیش از تغییر **200**؛ همان identity/role ثبت‌شدهٔ کاربر، نه حساب جعلی یا impersonation.
3. فقط display_name به برچسب موقت آزمون تغییر کرد: POST account/me **200**، بدون خطا.
4. GET مستقل account/me **200** و نام موقت ذخیره‌شده را دقیقاً تأیید کرد.
5. فقط در صورت تطابق currentname با همان برچسب موقت و همانidentity، نام اصلی restore شد: POST **200**.
6. GET مستقل بعدی **200**، بازگشت نام اصلی و ثابت‌ماندن ID/role را تأیید کرد. هیچ نام/شمارهٔ شخصی در این گزارش نیست.
7. auth/me **200** و خلاصهٔ نام با account/me منطبق بود؛ city/avatar/phone/role تغییر نکرد.
8. GET /pro/profile برای این حساب کارفرما به /dashboard هدایت شد؛ specialist داده نشد.
9. قبل از کلیک فرم، تطابق displayname و city انتخابی با storedDTO تأیید شد تا ورودی ذخیره‌نشدهٔ کاربر ناخواسته نوشته نشود. کلیک واقعی دکمهٔ «ذخیره اطلاعات شخصی» از nativepreview انجام شد؛ لاگ سرور POSTaccount/me **200** و GETauth/me **200** را ثبت کرد.
10. DOM mounted بعدی: formVisible=true، inputname برابر storedname، city برابرstoredcity، saveEnabled=true؛ GETaccount/me200. خطای۴۲۲ قبلی روی این درخواست معتبر تکرار نشد.

HTML سروریِ fetched /account قبل از hydration فرم را نشان نمی‌داد؛ از آن موفقیت رندر استنتاج نشد. DOM واقعاًmounted جدا بررسی شد. پیام موفق گذرا در لحظهٔ بعدی قابل مشاهده نبود؛ اثبات ذخیره برPOST200+GETreadback است، نه toast.

## محدودیت و تغییرات واقعی

- دو write برگشت‌پذیر display_name در WordPress واقعی انجام شدند و سپس یک save فرم با دادهٔ موجود؛ **نام اصلی برگردانده و تأیید شد**.
- refresh واقعی اجرا شد؛ token هرگز در DOM/گفتگو/فایلگزارش خوانده یا منتقل نشد.
- نقشclient حفظ شد؛ هیچ شماره/شهر/avatar/verified/وضعیت‌انتشار تغییر نکرد. حساب جدید، متخصص نمونه، OTP/SMS، upload، پرداخت، migration یا seed اجرا نشد.
- این آزمون **حساب شخصی کارفرما** است. ویرایش حرفه‌ای متخصص، آپلود، gallery و logout/login کامل در این آزمون انجام نشدند؛ userlogout خودکار نشده است.
- لاگ development چند خطای متناوب /manifest.webmanifest500 با Unexpected end of JSON input نیز داشت؛ saveaccount200 بود. مسئلهٔ manifest به‌صورت پیشنهاد task مستقل task_d3aae56d ثبت شد، نه حذف/پنهان یا fix ادعاشده.
- سایت آنلاین و تنظیمات فعلی env/config دست‌نخورده‌اند. نشست موجود کاربر به‌صورت طبیعی و فقط از BFF استفاده شد.
