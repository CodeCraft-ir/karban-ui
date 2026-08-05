/* ---------- Karban domain types & Persian dummy data ---------- */

export interface Category {
  id: string;
  slug: string;
  title: string;
  icon: string; // lucide icon name key
  jobs: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  hue: number; // used to render deterministic gradient art
  tag: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  project: string;
}

export interface Specialist {
  id: string;
  slug: string;
  name: string;
  title: string;
  category: string;
  city: string;
  neighborhood: string;
  rating: number;
  reviewsCount: number;
  distanceKm: number;
  verified: boolean;
  available: boolean;
  experienceYears: number;
  completedJobs: number;
  responseTime: string;
  hue: number;
  about: string;
  skills: string[];
  portfolio: PortfolioItem[];
  reviews: Review[];
}

export type ProjectStatus =
  | "در انتظار"
  | "در حال انجام"
  | "تکمیل شده"
  | "لغو شده";

export interface Project {
  id: string;
  title: string;
  category: string;
  status: ProjectStatus;
  budget: number;
  createdAt: string;
  proposals: number;
  neighborhood: string;
}

export interface Lead {
  id: string;
  projectTitle: string;
  category: string;
  budget: number;
  neighborhood: string;
  distanceKm: number;
  postedAgo: string;
  clientName: string;
  clientPhone: string;
  price: number; // lead unlock price
  unlocked: boolean;
}

export const CITIES = [
  "تهران",
  "مشهد",
  "اصفهان",
  "شیراز",
  "تبریز",
  "کرج",
  "قم",
  "اهواز",
] as const;

export const CATEGORIES: Category[] = [
  { id: "c1", slug: "electrical", title: "برق‌کاری", icon: "zap", jobs: 482 },
  { id: "c2", slug: "plumbing", title: "لوله‌کشی", icon: "wrench", jobs: 391 },
  { id: "c3", slug: "painting", title: "نقاشی ساختمان", icon: "paintbrush", jobs: 356 },
  { id: "c4", slug: "tiling", title: "کاشی‌کاری", icon: "grid", jobs: 274 },
  { id: "c5", slug: "carpentry", title: "نجاری", icon: "hammer", jobs: 233 },
  { id: "c6", slug: "hvac", title: "تاسیسات و تهویه", icon: "thermometer", jobs: 218 },
  { id: "c7", slug: "welding", title: "جوشکاری", icon: "flame", jobs: 187 },
  { id: "c8", slug: "gypsum", title: "گچ‌کاری", icon: "layers", jobs: 165 },
  { id: "c9", slug: "stone", title: "سنگ‌کاری", icon: "mountain", jobs: 142 },
  { id: "c10", slug: "renovation", title: "بازسازی کامل", icon: "house", jobs: 128 },
  { id: "c11", slug: "roofing", title: "ایزوگام و بام", icon: "umbrella", jobs: 97 },
  { id: "c12", slug: "landscaping", title: "محوطه‌سازی", icon: "trees", jobs: 76 },
];

const LOREM_FA =
  "کار با کیفیت و تحویل به‌موقع، اولویت اصلی من است. با بیش از یک دهه تجربه در پروژه‌های مسکونی و اداری، تمام مراحل کار را با جزئیات کامل و مطابق استاندارد اجرا می‌کنم.";

export const SPECIALISTS: Specialist[] = [
  {
    id: "s1",
    slug: "amir-hosseini",
    name: "امیر حسینی",
    title: "استادکار برق ساختمان",
    category: "برق‌کاری",
    city: "تهران",
    neighborhood: "سعادت‌آباد",
    rating: 4.9,
    reviewsCount: 127,
    distanceKm: 1.2,
    verified: true,
    available: true,
    experienceYears: 12,
    completedJobs: 340,
    responseTime: "کمتر از ۱ ساعت",
    hue: 45,
    about:
      "متخصص برق‌کشی ساختمان‌های مسکونی و تجاری با ۱۲ سال سابقه. " + LOREM_FA,
    skills: ["برق‌کشی توکار", "نصب لوستر", "هوشمندسازی", "رفع اتصالی", "تابلو برق"],
    portfolio: [
      { id: "p1", title: "برق‌کشی کامل آپارتمان ۱۲۰ متری", hue: 42, tag: "مسکونی" },
      { id: "p2", title: "هوشمندسازی ویلا در لواسان", hue: 200, tag: "هوشمند" },
      { id: "p3", title: "نورپردازی محوطه باغ", hue: 280, tag: "نورپردازی" },
      { id: "p4", title: "تابلو برق صنعتی کارگاه", hue: 10, tag: "صنعتی" },
      { id: "p5", title: "بازسازی سیم‌کشی ساختمان قدیمی", hue: 160, tag: "بازسازی" },
    ],
    reviews: [
      {
        id: "r1",
        author: "مهدی رضایی",
        rating: 5,
        date: "۲ هفته پیش",
        text: "بسیار منظم و دقیق. کار برق‌کشی واحد ما را سه روزه و تمیز تحویل داد. قیمت هم منصفانه بود.",
        project: "برق‌کشی آپارتمان",
      },
      {
        id: "r2",
        author: "سارا محمدی",
        rating: 5,
        date: "۱ ماه پیش",
        text: "برای نصب لوستر و رفع اتصالی تماس گرفتم، همان روز آمد و مشکل را حل کرد. کاملاً حرفه‌ای.",
        project: "رفع اتصالی",
      },
      {
        id: "r3",
        author: "رضا کریمی",
        rating: 4,
        date: "۲ ماه پیش",
        text: "کیفیت کار عالی بود، فقط شروع پروژه یک روز عقب افتاد. در کل راضی هستم و پیشنهاد می‌کنم.",
        project: "هوشمندسازی",
      },
    ],
  },
  {
    id: "s2",
    slug: "hasan-moradi",
    name: "حسن مرادی",
    title: "لوله‌کش و تاسیسات‌کار",
    category: "لوله‌کشی",
    city: "تهران",
    neighborhood: "پونک",
    rating: 4.8,
    reviewsCount: 94,
    distanceKm: 2.8,
    verified: true,
    available: true,
    experienceYears: 15,
    completedJobs: 410,
    responseTime: "حدود ۲ ساعت",
    hue: 205,
    about: "استادکار لوله‌کشی آب و فاضلاب و شوفاژ. " + LOREM_FA,
    skills: ["لوله‌کشی آب", "شوفاژ", "رفع نم", "تشخیص ترکیدگی", "پکیج"],
    portfolio: [
      { id: "p1", title: "لوله‌کشی کامل ساختمان ۴ طبقه", hue: 210, tag: "مسکونی" },
      { id: "p2", title: "نصب پکیج و رادیاتور", hue: 30, tag: "گرمایش" },
      { id: "p3", title: "رفع نم سرویس بهداشتی", hue: 180, tag: "تعمیرات" },
      { id: "p4", title: "موتورخانه مجتمع تجاری", hue: 260, tag: "تجاری" },
    ],
    reviews: [
      {
        id: "r1",
        author: "علی نوری",
        rating: 5,
        date: "۱ هفته پیش",
        text: "ترکیدگی لوله را بدون تخریب اضافی پیدا و ترمیم کرد. واقعاً کارش را بلد است.",
        project: "تشخیص ترکیدگی",
      },
      {
        id: "r2",
        author: "نازنین احمدی",
        rating: 4.5,
        date: "۳ هفته پیش",
        text: "نصب پکیج تمیز و سریع انجام شد. توضیحات کامل هم درباره نگهداری داد.",
        project: "نصب پکیج",
      },
    ],
  },
  {
    id: "s3",
    slug: "maryam-sadeghi",
    name: "مریم صادقی",
    title: "طراح و نقاش ساختمان",
    category: "نقاشی ساختمان",
    city: "تهران",
    neighborhood: "ونک",
    rating: 5.0,
    reviewsCount: 68,
    distanceKm: 3.5,
    verified: true,
    available: false,
    experienceYears: 8,
    completedJobs: 190,
    responseTime: "کمتر از ۳۰ دقیقه",
    hue: 320,
    about: "متخصص رنگ‌آمیزی مدرن، پتینه و کاغذ دیواری. " + LOREM_FA,
    skills: ["رنگ روغنی", "پتینه", "کاغذ دیواری", "کنیتکس", "رنگ کودک"],
    portfolio: [
      { id: "p1", title: "پتینه دیوار پذیرایی", hue: 330, tag: "پتینه" },
      { id: "p2", title: "اتاق کودک با طرح ابر", hue: 190, tag: "اتاق کودک" },
      { id: "p3", title: "نقاشی کامل دفتر اداری", hue: 90, tag: "اداری" },
      { id: "p4", title: "کاغذ دیواری سه‌بعدی", hue: 250, tag: "کاغذ دیواری" },
      { id: "p5", title: "نمای داخلی کافه", hue: 20, tag: "تجاری" },
      { id: "p6", title: "رنگ‌آمیزی راه‌پله برج", hue: 140, tag: "مشاعات" },
    ],
    reviews: [
      {
        id: "r1",
        author: "شیما تهرانی",
        rating: 5,
        date: "۴ روز پیش",
        text: "سلیقه فوق‌العاده‌ای دارد. اتاق کودکم را به زیباترین شکل ممکن درآورد. ممنونم!",
        project: "اتاق کودک",
      },
      {
        id: "r2",
        author: "کامران وفایی",
        rating: 5,
        date: "۲ هفته پیش",
        text: "دفتر ما را در تعطیلات آخر هفته بدون توقف کار رنگ کرد. نتیجه بی‌نقص بود.",
        project: "نقاشی اداری",
      },
    ],
  },
  {
    id: "s4",
    slug: "javad-akbari",
    name: "جواد اکبری",
    title: "کاشی‌کار و سرامیک‌کار",
    category: "کاشی‌کاری",
    city: "تهران",
    neighborhood: "نارمک",
    rating: 4.7,
    reviewsCount: 81,
    distanceKm: 5.1,
    verified: false,
    available: true,
    experienceYears: 10,
    completedJobs: 265,
    responseTime: "حدود ۱ ساعت",
    hue: 25,
    about: "کاشی‌کاری کف و بدنه، سرامیک اسلب و پرسلان. " + LOREM_FA,
    skills: ["سرامیک اسلب", "کاشی استخری", "بندکشی", "کف‌سازی"],
    portfolio: [
      { id: "p1", title: "اسلب پرسلان لابی برج", hue: 220, tag: "لوکس" },
      { id: "p2", title: "کاشی‌کاری استخر ویلا", hue: 185, tag: "استخر" },
      { id: "p3", title: "سرویس بهداشتی مستر", hue: 35, tag: "مسکونی" },
    ],
    reviews: [
      {
        id: "r1",
        author: "بهرام قاسمی",
        rating: 4.5,
        date: "۱ ماه پیش",
        text: "کاشی‌کاری حمام را با دقت میلی‌متری انجام داد. بندکشی‌ها کاملاً یکدست است.",
        project: "سرویس بهداشتی",
      },
    ],
  },
  {
    id: "s5",
    slug: "mohsen-zare",
    name: "محسن زارع",
    title: "نجار و کابینت‌ساز",
    category: "نجاری",
    city: "تهران",
    neighborhood: "تهرانپارس",
    rating: 4.9,
    reviewsCount: 112,
    distanceKm: 6.4,
    verified: true,
    available: true,
    experienceYears: 18,
    completedJobs: 380,
    responseTime: "کمتر از ۱ ساعت",
    hue: 95,
    about: "ساخت کابینت، کمد دیواری و دکوراسیون چوبی سفارشی. " + LOREM_FA,
    skills: ["کابینت MDF", "کمد دیواری", "درب چوبی", "دکور تلویزیون"],
    portfolio: [
      { id: "p1", title: "کابینت آشپزخانه هایگلاس", hue: 50, tag: "آشپزخانه" },
      { id: "p2", title: "کمد دیواری اتاق خواب", hue: 120, tag: "اتاق خواب" },
      { id: "p3", title: "دکور تلویزیون مدرن", hue: 300, tag: "پذیرایی" },
      { id: "p4", title: "کتابخانه چوب گردو", hue: 15, tag: "لوکس" },
    ],
    reviews: [
      {
        id: "r1",
        author: "فرزانه مقدم",
        rating: 5,
        date: "۵ روز پیش",
        text: "کابینت آشپزخانه دقیقاً مطابق طرح سه‌بعدی از آب درآمد. نصب هم فوق‌العاده تمیز بود.",
        project: "کابینت آشپزخانه",
      },
      {
        id: "r2",
        author: "امید شریفی",
        rating: 5,
        date: "۳ هفته پیش",
        text: "چوب باکیفیت، اتصالات محکم و قیمت منطقی. بهترین نجاری که تا حالا باهاش کار کردم.",
        project: "کتابخانه",
      },
    ],
  },
  {
    id: "s6",
    slug: "reza-ghanbari",
    name: "رضا قنبری",
    title: "متخصص تاسیسات و تهویه",
    category: "تاسیسات و تهویه",
    city: "تهران",
    neighborhood: "شهرک غرب",
    rating: 4.6,
    reviewsCount: 57,
    distanceKm: 2.1,
    verified: true,
    available: true,
    experienceYears: 9,
    completedJobs: 175,
    responseTime: "حدود ۳ ساعت",
    hue: 175,
    about: "نصب و سرویس داکت اسپلیت، چیلر و سیستم‌های تهویه مطبوع. " + LOREM_FA,
    skills: ["داکت اسپلیت", "چیلر", "فن کویل", "کولر گازی"],
    portfolio: [
      { id: "p1", title: "داکت اسپلیت پنت‌هاوس", hue: 170, tag: "مسکونی" },
      { id: "p2", title: "تهویه سالن ورزشی", hue: 240, tag: "تجاری" },
    ],
    reviews: [
      {
        id: "r1",
        author: "پیمان راد",
        rating: 4.5,
        date: "۲ هفته پیش",
        text: "نصب داکت اسپلیت را اصولی و با نقشه انجام داد. صدای دستگاه تقریباً صفر است.",
        project: "داکت اسپلیت",
      },
    ],
  },
];

export const CLIENT_PROJECTS: Project[] = [
  {
    id: "pr1",
    title: "بازسازی سرویس بهداشتی و حمام",
    category: "کاشی‌کاری",
    status: "در حال انجام",
    budget: 45_000_000,
    createdAt: "۳ روز پیش",
    proposals: 8,
    neighborhood: "سعادت‌آباد",
  },
  {
    id: "pr2",
    title: "برق‌کشی واحد ۹۵ متری نوساز",
    category: "برق‌کاری",
    status: "در انتظار",
    budget: 30_000_000,
    createdAt: "۱ هفته پیش",
    proposals: 12,
    neighborhood: "پونک",
  },
  {
    id: "pr3",
    title: "نقاشی کامل آپارتمان دو خوابه",
    category: "نقاشی ساختمان",
    status: "تکمیل شده",
    budget: 18_000_000,
    createdAt: "۱ ماه پیش",
    proposals: 15,
    neighborhood: "ونک",
  },
  {
    id: "pr4",
    title: "نصب کابینت آشپزخانه",
    category: "نجاری",
    status: "لغو شده",
    budget: 85_000_000,
    createdAt: "۲ ماه پیش",
    proposals: 6,
    neighborhood: "نارمک",
  },
];

export const PRO_LEADS: Lead[] = [
  {
    id: "l1",
    projectTitle: "برق‌کشی کامل واحد ۱۱۰ متری",
    category: "برق‌کاری",
    budget: 38_000_000,
    neighborhood: "سعادت‌آباد",
    distanceKm: 1.8,
    postedAgo: "۲۰ دقیقه پیش",
    clientName: "آقای رحیمی",
    clientPhone: "۰۹۱۲ ××× ۴۸۷۲",
    price: 95_000,
    unlocked: false,
  },
  {
    id: "l2",
    projectTitle: "رفع اتصالی و تعویض فیوز مرکزی",
    category: "برق‌کاری",
    budget: 5_000_000,
    neighborhood: "شهرک غرب",
    distanceKm: 3.2,
    postedAgo: "۱ ساعت پیش",
    clientName: "خانم موسوی",
    clientPhone: "۰۹۳۵ ××× ۱۱۹۰",
    price: 45_000,
    unlocked: false,
  },
  {
    id: "l3",
    projectTitle: "نورپردازی سقف کناف پذیرایی",
    category: "برق‌کاری",
    budget: 12_000_000,
    neighborhood: "مرزداران",
    distanceKm: 4.5,
    postedAgo: "۳ ساعت پیش",
    clientName: "آقای صالحی",
    clientPhone: "۰۹۱۹ ××× ۶۶۰۳",
    price: 65_000,
    unlocked: true,
  },
];

export function getSpecialist(slug: string): Specialist | undefined {
  return SPECIALISTS.find((s) => s.slug === slug);
}
