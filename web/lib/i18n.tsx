"use client";
// Lightweight i18n for the web app. Strings ported verbatim from the mobile
// app (mobile/src/i18n/index.ts), plus web/admin-specific additions.
// Handles language persistence and document direction (RTL for Arabic).
import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from "react";

export type Lang = "en" | "ar";

const en = {
  app_name: "Suez Stray Tracker",
  app_tagline: "Community rescue network",
  sign_in: "Sign in",
  sign_up: "Create account",
  sign_out: "Sign out",
  email: "Email address",
  password: "Password",
  your_name: "Your name",
  guest_view: "Continue as guest (read-only)",
  or: "or",

  tab_map: "Map",
  tab_zones: "Zones",
  tab_dogs: "Dogs",
  tab_alerts: "Alerts",
  tab_profile: "Profile",

  add_dog: "Add dog",
  my_location: "My location",
  legend: "Legend",
  legend_tnr_vacc: "TNR + Vaccinated",
  legend_tnr: "TNR only",
  legend_not_tnr: "Not TNR'd",
  legend_injured: "Injured",
  filter_all: "All",
  filter_tnr: "TNR done",
  filter_needs_tnr: "Needs TNR",
  filter_injured: "Injured",
  show_neighbourhoods: "Neighbourhoods",

  zones_title: "Suez City zones",
  zones_sub: "Tap a zone to view on map or report a sighting",
  total: "Total",
  tnr_done: "TNR'd",
  vaccinated: "Vaccinated",
  tnr_rate: "TNR rate",
  report_sighting: "Report sighting here",
  recent_sightings: "Recent sightings",
  view_on_map: "View on map",

  search_placeholder: "Search by name, zone, notes…",
  unnamed_dog: "Unnamed dog",
  added_by: "Added by",
  caught: "Caught",
  needs_tnr: "Needs TNR",
  no_dogs_found: "No dogs found",
  all_dogs: "All dogs",

  add_dog_title: "Add new dog",
  edit_dog_title: "Edit dog record",
  photo_add: "Add photo",
  photo_change: "Change photo",
  name_optional: "Name (optional)",
  name_placeholder: "e.g. Brownie, Spot…",
  zone: "Zone",
  select_zone: "Select zone…",
  location_pin: "Location pin",
  use_my_location: "Use my current location",
  location_captured: "Location captured",
  location_failed: "Could not get location — zone centre will be used",
  sex: "Sex",
  sex_male: "Male",
  sex_female: "Female",
  sex_unknown: "Unknown",
  estimated_age: "Estimated age",
  age_puppy: "Puppy (< 6mo)",
  age_young: "Young (6mo–2yr)",
  age_adult: "Adult (2–8yr)",
  age_senior: "Senior (8yr+)",
  color: "Colour / markings",
  tnr_label: "TNR done",
  tnr_date: "TNR date",
  vacc_label: "Vaccinated",
  vacc_date: "Vaccination date",
  vacc_type: "Vaccine type",
  is_injured: "Injured",
  notes_label: "Notes",
  notes_placeholder: "Health, behaviour, distinctive marks…",
  save: "Save dog record",
  saving: "Saving…",
  cancel: "Cancel",
  delete_dog: "Delete record",
  delete_confirm: "Are you sure you want to delete this record?",

  report_title: "Report new sighting",
  count_label: "Dogs seen (approx.)",
  description_label: "Description",
  description_placeholder: "Location details, condition, behaviour…",
  urgency_label: "Urgency",
  urgency_low: "Low — just seen",
  urgency_medium: "Medium — attention needed",
  urgency_high: "High — injured / trapped",
  urgency_critical: "Critical — emergency",
  send_alert: "Send community alert",

  dog_detail_title: "Dog record",
  activity_log: "Activity log",
  mark_tnr: "Mark TNR done",
  mark_vaccinated: "Mark vaccinated",
  mark_deceased: "Mark as deceased",
  share_location: "Share location",

  alerts_title: "Community alerts",
  no_alerts: "No recent alerts",
  resolve: "Mark resolved",
  resolved: "Resolved",

  profile_title: "My profile",
  dogs_added_label: "Dogs added",
  member_since: "Member since",

  error_required: "This field is required",
  error_email: "Enter a valid email",
  error_password_short: "Password must be at least 6 characters",
  error_save: "Could not save — please try again",
  error_generic: "Something went wrong",

  loading: "Loading…",
  retry: "Retry",
  sign_in_to_add: "Sign in to add or report",

  // Notifications / PWA
  enable_notifications: "Enable alerts",
  notifications_enabled: "Alerts enabled",
  install_app: "Install app",

  // Admin
  admin_panel: "Admin panel",
  admin_overview: "Overview",
  admin_dogs: "Dog records",
  admin_users: "Users",
  admin_alerts: "Alerts",
  admin_push: "Send notification",
  admin_reports: "Reports",
  print_report: "Print / PDF",
  generate_report: "Generate report",
  total_dogs_tracked: "Total dogs tracked",
  send_to_all: "Send to all rescuers",
  push_title: "Title",
  push_body: "Message",
  export_csv: "Export to Excel",
  unresolved_sightings: "Unresolved sightings across all zones",
  no_access: "You don't have access to this area.",

  // Onboarding tour
  replay_tutorial: "Replay tutorial",
  tour_next: "Next",
  tour_back: "Back",
  tour_skip: "Skip",
  tour_done_btn: "Got it!",
  tour_do_it: "👆 Try it to continue",
  tour_welcome_title: "Welcome to Suez Stray Tracker! 🐾",
  tour_welcome_body: "Let's take a quick, hands-on tour. You'll press a few buttons yourself — it takes about a minute.",
  tour_map_title: "The live map",
  tour_map_body: "Every pin is a tracked dog. Its colour shows its status — see the legend at the bottom-left (green = TNR + vaccinated, amber = needs TNR, red = injured).",
  tour_filters_title: "Filter the dogs",
  tour_filters_body: "These filter which dogs show on the map. Tap “Needs TNR” now to see only dogs that still need spaying/neutering.",
  tour_zones_title: "Show neighbourhoods",
  tour_zones_body: "Tick this box now to overlay the city's neighbourhood divisions on the map.",
  tour_add_title: "Add a dog you found",
  tour_add_body: "Tap this “+” whenever you spot a dog. You'll add a photo and status — and its neighbourhood is detected automatically from your location.",
  tour_navzones_title: "Zones tab",
  tour_navzones_body: "See TNR progress and stats for each neighbourhood here.",
  tour_navdogs_title: "Dogs tab",
  tour_navdogs_body: "Browse and search every tracked dog.",
  tour_navalerts_title: "Alerts tab",
  tour_navalerts_body: "Urgent sightings reported by the community show up here.",
  tour_navprofile_title: "Your profile",
  tour_navprofile_body: "Enable notifications and manage your account here. You can replay this tutorial from here anytime.",
  tour_lang_title: "English / العربية",
  tour_lang_body: "Switch the whole app between English and Arabic anytime with this button.",
  tour_lang_pick_title: "Choose your language",
  tour_lang_pick_body: "اختر لغتك للمتابعة",
  tour_add_open_title: "Add a dog you found",
  tour_add_open_body: "Let's add one together. Tap the “+” button now to open the form.",
  tour_dogphoto_title: "1. Add a photo",
  tour_dogphoto_body: "Tap here to take or choose a photo of the dog.",
  tour_dogloc_title: "2. Pin the location",
  tour_dogloc_body: "Tap this to auto-detect the neighbourhood from your GPS — or pick it from the chips just below.",
  tour_dogtnr_title: "3. Mark TNR & status",
  tour_dogtnr_body: "Flip this on if the dog is already spayed/neutered (TNR done). Do the same for Vaccinated or Injured.",
  tour_dogsave_title: "4. Save the record",
  tour_dogsave_body: "When you're done, tap Save — the dog appears on everyone's map instantly.",
  tour_done_title: "You're all set! 🎉",
  tour_done_body: "Press Save to record this dog, or Cancel to exit. You can replay this tutorial anytime from your profile. Thank you for helping the dogs of Suez. 🐕",
};

type Dict = typeof en;

const ar: Dict = {
  app_name: "متتبع الضالين – السويس",
  app_tagline: "شبكة إنقاذ المجتمع",
  sign_in: "تسجيل الدخول",
  sign_up: "إنشاء حساب",
  sign_out: "تسجيل الخروج",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  your_name: "اسمك",
  guest_view: "المتابعة كضيف (للقراءة فقط)",
  or: "أو",

  tab_map: "الخريطة",
  tab_zones: "المناطق",
  tab_dogs: "الكلاب",
  tab_alerts: "التنبيهات",
  tab_profile: "الملف الشخصي",

  add_dog: "إضافة كلب",
  my_location: "موقعي",
  legend: "المفتاح",
  legend_tnr_vacc: "تعقيم + تطعيم",
  legend_tnr: "تعقيم فقط",
  legend_not_tnr: "بحاجة للتعقيم",
  legend_injured: "مصاب",
  filter_all: "الكل",
  filter_tnr: "تم تعقيمه",
  filter_needs_tnr: "بحاجة للتعقيم",
  filter_injured: "مصاب",
  show_neighbourhoods: "الأحياء",

  zones_title: "مناطق مدينة السويس",
  zones_sub: "اضغط على منطقة لعرضها على الخريطة أو للإبلاغ عن مشاهدة",
  total: "الإجمالي",
  tnr_done: "تعقيم",
  vaccinated: "تطعيم",
  tnr_rate: "نسبة التعقيم",
  report_sighting: "الإبلاغ عن مشاهدة هنا",
  recent_sightings: "المشاهدات الأخيرة",
  view_on_map: "عرض على الخريطة",

  search_placeholder: "ابحث بالاسم أو المنطقة أو الملاحظات…",
  unnamed_dog: "كلب بدون اسم",
  added_by: "أضافه",
  caught: "تاريخ الإمساك",
  needs_tnr: "بحاجة للتعقيم",
  no_dogs_found: "لا توجد كلاب",
  all_dogs: "جميع الكلاب",

  add_dog_title: "إضافة كلب جديد",
  edit_dog_title: "تعديل سجل الكلب",
  photo_add: "إضافة صورة",
  photo_change: "تغيير الصورة",
  name_optional: "الاسم (اختياري)",
  name_placeholder: "مثال: بني، منقط…",
  zone: "المنطقة",
  select_zone: "اختر المنطقة…",
  location_pin: "تثبيت الموقع",
  use_my_location: "استخدام موقعي الحالي",
  location_captured: "تم تحديد الموقع",
  location_failed: "تعذر الحصول على الموقع — سيتم استخدام مركز المنطقة",
  sex: "الجنس",
  sex_male: "ذكر",
  sex_female: "أنثى",
  sex_unknown: "غير معروف",
  estimated_age: "العمر التقريبي",
  age_puppy: "جرو (أقل من 6 أشهر)",
  age_young: "صغير (6 أشهر – سنتان)",
  age_adult: "بالغ (2–8 سنوات)",
  age_senior: "كبير (أكثر من 8 سنوات)",
  color: "اللون / العلامات المميزة",
  tnr_label: "تم التعقيم",
  tnr_date: "تاريخ التعقيم",
  vacc_label: "تم التطعيم",
  vacc_date: "تاريخ التطعيم",
  vacc_type: "نوع اللقاح",
  is_injured: "مصاب",
  notes_label: "ملاحظات",
  notes_placeholder: "الصحة، السلوك، العلامات المميزة…",
  save: "حفظ سجل الكلب",
  saving: "جارٍ الحفظ…",
  cancel: "إلغاء",
  delete_dog: "حذف السجل",
  delete_confirm: "هل أنت متأكد من حذف هذا السجل؟",

  report_title: "الإبلاغ عن مشاهدة جديدة",
  count_label: "عدد الكلاب المشاهدة (تقريباً)",
  description_label: "الوصف",
  description_placeholder: "تفاصيل الموقع، الحالة، السلوك…",
  urgency_label: "مستوى الإلحاح",
  urgency_low: "منخفض — مجرد مشاهدة",
  urgency_medium: "متوسط — يحتاج اهتماماً",
  urgency_high: "مرتفع — مصاب / محاصر",
  urgency_critical: "حرج — طوارئ",
  send_alert: "إرسال تنبيه للمجتمع",

  dog_detail_title: "سجل الكلب",
  activity_log: "سجل النشاط",
  mark_tnr: "تأكيد إجراء التعقيم",
  mark_vaccinated: "تأكيد التطعيم",
  mark_deceased: "تسجيل الوفاة",
  share_location: "مشاركة الموقع",

  alerts_title: "تنبيهات المجتمع",
  no_alerts: "لا توجد تنبيهات حديثة",
  resolve: "تأكيد المعالجة",
  resolved: "تمت المعالجة",

  profile_title: "ملفي الشخصي",
  dogs_added_label: "كلاب أضافها",
  member_since: "عضو منذ",

  error_required: "هذا الحقل مطلوب",
  error_email: "أدخل بريداً إلكترونياً صحيحاً",
  error_password_short: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  error_save: "تعذر الحفظ — يرجى المحاولة مرة أخرى",
  error_generic: "حدث خطأ ما",

  loading: "جارٍ التحميل…",
  retry: "إعادة المحاولة",
  sign_in_to_add: "سجّل الدخول للإضافة أو الإبلاغ",

  enable_notifications: "تفعيل التنبيهات",
  notifications_enabled: "التنبيهات مفعّلة",
  install_app: "تثبيت التطبيق",

  admin_panel: "لوحة التحكم",
  admin_overview: "نظرة عامة",
  admin_dogs: "سجلات الكلاب",
  admin_users: "المستخدمون",
  admin_alerts: "التنبيهات",
  admin_push: "إرسال إشعار",
  admin_reports: "التقارير",
  print_report: "طباعة / PDF",
  generate_report: "إنشاء تقرير",
  total_dogs_tracked: "إجمالي الكلاب المتتبعة",
  send_to_all: "إرسال لكل المنقذين",
  push_title: "العنوان",
  push_body: "الرسالة",
  export_csv: "تصدير إلى Excel",
  unresolved_sightings: "مشاهدات غير معالجة في كل المناطق",
  no_access: "ليس لديك صلاحية الوصول لهذه المنطقة.",

  // Onboarding tour
  replay_tutorial: "إعادة الشرح التعليمي",
  tour_next: "التالي",
  tour_back: "السابق",
  tour_skip: "تخطّي",
  tour_done_btn: "تمام!",
  tour_do_it: "👆 جرّبها للمتابعة",
  tour_welcome_title: "أهلاً بك في متتبع الضالين – السويس! 🐾",
  tour_welcome_body: "لنأخذ جولة سريعة وتطبيقية. ستضغط بعض الأزرار بنفسك — تستغرق حوالي دقيقة.",
  tour_map_title: "الخريطة المباشرة",
  tour_map_body: "كل علامة تمثل كلباً متتبَّعاً. يدل لونها على حالته — انظر المفتاح أسفل اليسار (أخضر = تعقيم وتطعيم، كهرماني = بحاجة للتعقيم، أحمر = مصاب).",
  tour_filters_title: "تصفية الكلاب",
  tour_filters_body: "تتحكم هذه الأزرار في الكلاب الظاهرة على الخريطة. اضغط «بحاجة للتعقيم» الآن لعرض الكلاب التي تحتاج تعقيماً فقط.",
  tour_zones_title: "إظهار الأحياء",
  tour_zones_body: "فعّل هذا المربع الآن لإظهار حدود أحياء المدينة على الخريطة.",
  tour_add_title: "أضف كلباً وجدته",
  tour_add_body: "اضغط «+» عند رؤية كلب. ستضيف صورة وحالة — ويُحدَّد الحي تلقائياً من موقعك.",
  tour_navzones_title: "تبويب المناطق",
  tour_navzones_body: "اطّلع على تقدّم التعقيم وإحصاءات كل حي هنا.",
  tour_navdogs_title: "تبويب الكلاب",
  tour_navdogs_body: "تصفّح وابحث في كل الكلاب المتتبَّعة.",
  tour_navalerts_title: "تبويب التنبيهات",
  tour_navalerts_body: "تظهر هنا المشاهدات العاجلة التي يبلّغ عنها المجتمع.",
  tour_navprofile_title: "ملفك الشخصي",
  tour_navprofile_body: "فعّل التنبيهات وأدِر حسابك هنا. يمكنك إعادة هذا الشرح من هنا في أي وقت.",
  tour_lang_title: "English / العربية",
  tour_lang_body: "بدّل لغة التطبيق بالكامل بين الإنجليزية والعربية في أي وقت بهذا الزر.",
  tour_lang_pick_title: "اختر لغتك",
  tour_lang_pick_body: "Choose your language to continue",
  tour_add_open_title: "أضف كلباً وجدته",
  tour_add_open_body: "لنُضِف واحداً معاً. اضغط زر «+» الآن لفتح النموذج.",
  tour_dogphoto_title: "١. أضف صورة",
  tour_dogphoto_body: "اضغط هنا لالتقاط أو اختيار صورة للكلب.",
  tour_dogloc_title: "٢. حدّد الموقع",
  tour_dogloc_body: "اضغط هذا لتحديد الحي تلقائياً من موقعك — أو اختره من الأزرار بالأسفل.",
  tour_dogtnr_title: "٣. سجّل التعقيم والحالة",
  tour_dogtnr_body: "فعّل هذا إن كان الكلب معقّماً (تم التعقيم). وكذلك للتطعيم أو الإصابة.",
  tour_dogsave_title: "٤. احفظ السجل",
  tour_dogsave_body: "عند الانتهاء اضغط حفظ — يظهر الكلب على خريطة الجميع فوراً.",
  tour_done_title: "أنت جاهز! 🎉",
  tour_done_body: "اضغط حفظ لتسجيل هذا الكلب، أو إلغاء للخروج. يمكنك إعادة هذا الشرح من ملفك في أي وقت. شكراً لمساعدتك كلاب السويس. 🐕",
};

const DICTS: Record<Lang, Dict> = { en, ar };

interface I18nCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: keyof Dict, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (localStorage.getItem("lang") as Lang | null) ?? null;
    const initial: Lang = stored ?? (navigator.language?.startsWith("ar") ? "ar" : "en");
    setLangState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: keyof Dict, vars?: Record<string, string | number>) => {
      let s: string = DICTS[lang][key] ?? DICTS.en[key] ?? String(key);
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{{${k}}}`, String(v));
      return s;
    },
    [lang],
  );

  return (
    <Ctx.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", setLang, t }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
