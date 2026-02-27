'use client';

import { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  FolderOpen,
  Upload,
  Megaphone,
  Tag,
  Settings,
  Download,
  Share2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Package,
  Archive,
  LayoutDashboard,
  Calendar,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  faq: FAQItem[];
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-[#E8E8E8] rounded-lg overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between p-3 text-right hover:bg-ono-gray-light/50 transition-colors"
          >
            <span className="text-sm font-medium text-ono-gray-dark">{item.question}</span>
            {open === i ? <ChevronUp className="w-4 h-4 text-ono-gray shrink-0" /> : <ChevronDown className="w-4 h-4 text-ono-gray shrink-0" />}
          </button>
          {open === i && (
            <div className="px-3 pb-3 text-sm text-ono-gray leading-relaxed border-t border-[#E8E8E8] pt-2">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const sections: Section[] = [
  {
    id: 'dashboard',
    title: 'דשבורד',
    icon: <LayoutDashboard className="w-5 h-5" />,
    description: 'מסך הבית של המערכת. מציג סקירה עסקית כוללת, סטטיסטיקות, העלאות אחרונות וקמפיינים פעילים.',
    features: [
      'כפתורי גישה מהירה: העלאת חומרים וספריית חומרים',
      'סטטיסטיקות: סה"כ חומרים, קמפיינים פעילים, העלאות השבוע/החודש',
      'תצוגת חלוקת חומרים לפי סוג (תמונות, וידאו, PDF) עם גרף פס',
      'סינון לפי פקולטה (סלאג) - לחצו על שם הפקולטה לצפייה מסוננת',
      'העלאות אחרונות עם תצוגה מקדימה',
      'קמפיינים פעילים עם סטטוס ושיוך לפקולטה',
    ],
    faq: [
      { question: 'מה זה הסינון לפי פקולטה?', answer: 'לחיצה על טאב של פקולטה (סלאג) מסננת את ההעלאות האחרונות והקמפיינים הפעילים כך שיוצגו רק אלו ששייכים לאותה פקולטה. "הכל" מציג את כל הפקולטות, ו"כללי" מציג חומרים שלא שויכו לפקולטה ספציפית.' },
      { question: 'מה מייצג כל מספר בסטטיסטיקות?', answer: 'סה"כ חומרים - כמות החומרים הפעילים (לא בארכיון). קמפיינים פעילים - מספר הקמפיינים בסטטוס "פעיל" או "מתמשך". העלאות השבוע - חומרים שהועלו ב-7 הימים האחרונים. ממתינים לסיווג - חומרים ללא שיוך לפלטפורמה.' },
    ],
  },
  {
    id: 'library',
    title: 'ספריית חומרים',
    icon: <FolderOpen className="w-5 h-5" />,
    description: 'מרכז כל החומרים השיווקיים של הארגון. כאן ניתן לצפות, לחפש, לסנן, להוריד ולשתף את כל החומרים.',
    features: [
      'תצוגה בגריד או ברשימה',
      'סינון מתקדם לפי סלאג, קמפיין, סוג קובץ, פלטפורמה, יחס מידות, סוג תוכן ותגיות',
      'בורר תאריכים בסגנון פייסבוק: פריסטים מהירים (היום, אתמול, שבוע, חודש) + לוח שנה כפול',
      'חיפוש חופשי לפי שם קובץ, תגיות ושם קובץ בייצוא',
      'סינון תגיות מתוך רשימה מנוהלת',
      'בחירת מספר חומרים והורדה כ-ZIP',
      'אישור הורדה כשמורידים יותר מ-5 קבצים',
      'שיתוף חומרים בקישור עם תוקף מוגבל',
      'שמירת חיפושים מועדפים לגישה מהירה',
      'הצגת שם משמעותי (סלאג + סוג תוכן) בכרטיסיות',
    ],
    faq: [
      { question: 'איך אני מוריד מספר קבצים?', answer: 'סמן את הקבצים הרצויים על ידי לחיצה על תיבת הסימון שבפינה הימנית-עליונה של כל חומר, ואז לחץ על כפתור "הורד" בסרגל הפעולות. קובץ אחד יורד ישירות, מספר קבצים יורדים כ-ZIP.' },
      { question: 'איך עובד בורר התאריכים?', answer: 'לחצו על שדה טווח התאריכים. בצד שמאל תמצאו פריסטים מהירים (היום, אתמול, שבוע אחרון, חודש אחרון ועוד). בצד ימין יש לוח שנה כפול שבו ניתן לבחור טווח מותאם אישית. לחצו "עדכן" לאישור.' },
      { question: 'מה זה חיפוש שמור?', answer: 'כשיש לך צירוף סינונים שאתה משתמש בו לעתים קרובות, לחץ על סמל הסימנייה ליד "נקה הכל" כדי לשמור. חיפושים שמורים מופיעים מתחת לשורת החיפוש.' },
      { question: 'איך מעבירים חומר לארכיון?', answer: 'לחץ על חומר לפתיחת חלונית הפרטים, ושם לחץ "העבר לארכיון". חומרים בארכיון לא מוצגים בספרייה אך ניתן לשחזר אותם ממסך הארכיון.' },
    ],
  },
  {
    id: 'upload',
    title: 'העלאת חומרים',
    icon: <Upload className="w-5 h-5" />,
    description: 'העלאת קבצים חדשים למערכת. גררו קבצים או לחצו לבחירה, סווגו אותם ושלחו.',
    features: [
      'גרירת קבצים (Drag & Drop) או בחירה מהמחשב',
      'תמיכה בתמונות: JPG, PNG, GIF, WebP, SVG, BMP, TIFF, HEIC, AVIF',
      'תמיכה בוידאו: MP4, MOV, WebM, AVI, MPEG, MKV, 3GP',
      'תמיכה ב-PDF, ZIP, וקבצי ידיעונים (InDesign, AI, PPTX, DOCX ועוד)',
      'חילוץ אוטומטי של קבצי ZIP',
      'שמות קבצים משמעותיים אוטומטיים: slug-campaign-date-type-dimensions-nn.ext',
      'זיהוי אוטומטי של מידות תמונה ויחס מידות',
      'מערכת תגיות מנוהלת: בחירה מרשימה קיימת או הוספת תגית חדשה',
      'שדות פלטפורמות מותנים - מוצגים רק כשסוג התוכן הוא "סושיאל"',
      'בחירת תאריך מסמך מקורי (ברירת מחדל: היום)',
      'יצירת קמפיין מהיר ישירות ממסך ההעלאה',
    ],
    faq: [
      { question: 'מה קורה כשמעלים קובץ ZIP?', answer: 'המערכת פותחת את ה-ZIP אוטומטית ומעלה כל קובץ מוכר שנמצא בתוכו בנפרד. קבצים מוסתרים וקבצי מערכת מדולגים.' },
      { question: 'איך עובדים שמות הקבצים החדשים?', answer: 'המערכת יוצרת שם משמעותי באנגלית בפורמט: slug-campaign-date-type-dimensions-nn.ext. למשל: mba-bts25-20260227-image-1080x1920-01.jpg. המספר הרץ (nn) מבטיח ששמות קבצים לא יחזרו על עצמם.' },
      { question: 'מה זה "סלאג"?', answer: 'סלאג מייצג את התחום או המחלקה: "mba" לתואר שני, "law" למשפטים. סלאגים יכולים להיות היררכיים (mba-finance).' },
      { question: 'למה אני לא רואה את שדה הפלטפורמות?', answer: 'שדה הפלטפורמות מופיע רק כאשר סוג התוכן הוא "סושיאל". עבור סוגי תוכן אחרים (דפוס, מיתוג, שילוט) הוא מוסתר כי אינו רלוונטי.' },
    ],
  },
  {
    id: 'initiatives',
    title: 'קמפיינים',
    icon: <Megaphone className="w-5 h-5" />,
    description: 'ניהול קמפיינים ומהלכים שיווקיים. כל קמפיין מקבל שם, קוד קצר ותאריכים, ומשמש לארגון חומרים.',
    features: [
      'יצירת קמפיין חדש עם שם, קוד קצר, תאריכי התחלה וסיום',
      'שיוך קמפיין לסלאג ספציפי או הגדרתו כ"קמפיין רוחבי" (חוצה סלאגים)',
      'סינון לפי סטטוס: פעיל, מתמשך, הסתיים, ארכיון',
      'צפייה בכמות חומרים מקושרים לכל קמפיין',
      'קוד קצר באנגלית משמש בשמות קבצים בעת ייצוא והעלאה',
    ],
    faq: [
      { question: 'מה זה קמפיין רוחבי?', answer: 'קמפיין שחוצה מספר תחומים ולא שייך לסלאג ספציפי. לדוגמה: קמפיין כללי של המכללה.' },
      { question: 'מה זה הקוד הקצר?', answer: 'קוד באנגלית (אותיות קטנות ומספרים) שמופיע בשמות קבצים. למשל: "bts25" עבור "חזרה ללימודים 2025".' },
    ],
  },
  {
    id: 'tags',
    title: 'ניהול תגיות',
    icon: <Tag className="w-5 h-5" />,
    description: 'מערכת תגיות מנוהלת שמאפשרת סיווג וחיפוש מהיר של חומרים. ניתן לנהל את כל התגיות ממקום אחד.',
    features: [
      'צפייה בכל התגיות במערכת עם ספירת שימוש',
      'הוספת תגיות חדשות',
      'שינוי שם תגית - מתעדכן בכל החומרים המשויכים',
      'מחיקת תגית - מסירה מכל החומרים',
      'חיפוש תגיות לפי שם',
      'בחירת תגיות מרשימה מנוהלת בעת העלאה (במקום טקסט חופשי)',
      'סינון לפי תגית בספריית חומרים',
    ],
    faq: [
      { question: 'מה קורה כשמשנים שם של תגית?', answer: 'שינוי שם עובר על כל החומרים שמשויכים לתגית הישנה ומחליף את השם בחדש. התהליך אוטומטי ומיידי.' },
      { question: 'מה קורה כשמוחקים תגית?', answer: 'התגית מוסרת מכל החומרים שהיא היתה משויכת אליהם. החומרים עצמם לא נמחקים, רק השיוך לתגית.' },
      { question: 'איך מוסיפים תגית חדשה?', answer: 'יש שתי דרכים: (1) ממסך ניהול תגיות - הקלידו שם ולחצו "הוסף". (2) ממסך העלאה - הקלידו שם חדש ולחצו Enter או על "+ הוסף".' },
    ],
  },
  {
    id: 'slugs',
    title: 'ניהול סלאגים',
    icon: <Tag className="w-5 h-5" />,
    description: 'סלאגים מגדירים את מבנה התחומים של הארגון. הם יוצרים היררכיה לפיה מסווגים כל החומרים.',
    features: [
      'יצירת סלאגים חדשים עם שם תצוגה בעברית ומזהה באנגלית',
      'היררכיה אוטומטית - שימוש במקף ליצירת צאצאים (mba → mba-finance)',
      'העברה לארכיון ומחיקה של סלאגים ריקים',
      'ספירת חומרים ומהלכים מקושרים',
    ],
    faq: [
      { question: 'איך יוצרים היררכיה?', answer: 'הוסיפו מקף ולאחריו את שם תת-הסלאג. לדוגמה: סלאג "mba" + סלאג "mba-finance" → "mba-finance" יופיע כצאצא.' },
      { question: 'אפשר למחוק סלאג?', answer: 'ניתן למחוק סלאג רק אם אין לו חומרים ומהלכים מקושרים. אם יש, יש להעביר אותו לארכיון.' },
    ],
  },
  {
    id: 'archive',
    title: 'ארכיון',
    icon: <Archive className="w-5 h-5" />,
    description: 'מרכז החומרים שהועברו לארכיון. ניתן לשחזר חומרים או למחוק אותם לצמיתות.',
    features: [
      'תצוגת טבלה של כל החומרים בארכיון',
      'שחזור חומרים בודדים או מרובים חזרה לספרייה הפעילה',
      'מחיקה לצמיתות (כולל קבצים מהאחסון)',
      'הצגת מספר ימים בארכיון עם התראה ליותר מ-25 יום',
      'בחירה מרובה עם תיבות סימון לפעולות מרוכזות',
      'אישור לפני מחיקה לצמיתות',
    ],
    faq: [
      { question: 'מה ההבדל בין ארכיון למחיקה?', answer: 'ארכיון = החומר עדיין קיים במערכת ובאחסון, רק מוסתר מהספרייה. ניתן לשחזר. מחיקה לצמיתות = הקובץ נמחק מהאחסון ומבסיס הנתונים ולא ניתן לשחזר.' },
      { question: 'אחרי כמה זמן חומרים נמחקים אוטומטית?', answer: 'חומרים בארכיון לא נמחקים אוטומטית. יש התראה אחרי 25 יום, אך המחיקה היא ידנית בלבד.' },
    ],
  },
  {
    id: 'settings',
    title: 'הגדרות וניהול משתמשים',
    icon: <Settings className="w-5 h-5" />,
    description: 'ניהול משתמשים, הרשאות וקישורי העלאה חיצוניים. זמין רק למנהלי מערכת.',
    features: [
      'הזמנת משתמשים חדשים לפי כתובת מייל',
      'הגדרת תפקידים: מנהל מערכת, מנהל מהלכים, קונה מדיה, צופה',
      'הרשאות פרטניות: העלאה, צפייה, ניהול מהלכים, צפייה מסוננת',
      'השבתה והפעלה של משתמשים',
      'יצירת קישורי העלאה חיצוניים לפרילנסרים ומעצבים',
      'הגדרת תוקף לקישורים חיצוניים וביטולם',
    ],
    faq: [
      { question: 'מה ההבדל בין התפקידים?', answer: 'מנהל מערכת - גישה מלאה כולל ניהול משתמשים. מנהל מהלכים - יצירה וניהול של קמפיינים. קונה מדיה - העלאה וצפייה. צופה - צפייה והורדה בלבד.' },
      { question: 'מה זה קישור העלאה חיצוני?', answer: 'קישור שמאפשר לגורמים חיצוניים (מעצבים, פרילנסרים) להעלות חומרים ללא צורך ברישום. לקישור יש תוקף שניתן להגדיר.' },
    ],
  },
  {
    id: 'sharing',
    title: 'שיתוף חומרים',
    icon: <Share2 className="w-5 h-5" />,
    description: 'שיתוף חומרים עם גורמים חיצוניים באמצעות קישור עם תוקף. מי שמקבל את הקישור יכול לצפות, לסנן ולהוריד.',
    features: [
      'בחירת חומרים ויצירת קישור שיתוף',
      'הגדרת תוקף: יום, 3 ימים, שבוע, שבועיים, חודש, 3 חודשים',
      'דף שיתוף מעוצב עם שם סלאג + סוג תוכן (לא רק שם קובץ)',
      'מי שמקבל את הקישור יכול לצפות, לסנן ולהוריד',
      'הורדת קובץ בודד או הכל כ-ZIP',
      'הקישור לא דורש התחברות למערכת',
    ],
    faq: [
      { question: 'האם מי שמקבל את הקישור צריך חשבון?', answer: 'לא. קישורי שיתוף פתוחים לכל מי שיש לו את הקישור.' },
    ],
  },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const current = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">עזרה ותמיכה</h1>
      </div>

      <p className="text-ono-gray">
        ברוכים הבאים למדריך השימוש במערכת ניהול מדיה. כאן תמצאו הסברים מפורטים על כל היכולות של המערכת, שאלות נפוצות ותשובות.
      </p>

      <div className="flex gap-6">
        {/* Section Navigation */}
        <div className="w-64 shrink-0">
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 sticky top-4">
            <h3 className="font-bold text-ono-gray-dark text-sm mb-3 px-2">נושאים</h3>
            <div className="space-y-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-right ${
                    activeSection === section.id
                      ? 'bg-ono-green-light text-ono-green-dark font-bold'
                      : 'text-ono-gray hover:bg-ono-gray-light'
                  }`}
                >
                  {section.icon}
                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 min-w-0">
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ono-green-light rounded-xl flex items-center justify-center text-ono-green">
                {current.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-ono-gray-dark">{current.title}</h2>
                <p className="text-sm text-ono-gray">{current.description}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-ono-gray-dark text-sm mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-ono-green" />
                יכולות עיקריות
              </h3>
              <ul className="space-y-2">
                {current.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ono-gray-dark">
                    <span className="text-ono-green mt-0.5 shrink-0">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-ono-gray-dark text-sm mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-ono-green" />
                שאלות נפוצות
              </h3>
              <FAQAccordion items={current.faq} />
            </div>
          </div>

          <div className="bg-ono-green-light border border-ono-green/20 rounded-lg p-5">
            <h3 className="font-bold text-ono-green-dark text-sm mb-3">טיפים מהירים</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Download className="w-4 h-4 mt-0.5 shrink-0" />
                <span>לחצו על חומר כדי לפתוח פרטים מלאים. משם אפשר להוריד, לשתף ולארכב.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
                <span>לחצו על שדה התאריכים כדי לפתוח בורר תאריכים עם פריסטים מהירים ולוח שנה כפול.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Package className="w-4 h-4 mt-0.5 shrink-0" />
                <span>העלו קובץ ZIP והמערכת תפרק אותו אוטומטית. כל קובץ מוכר בתוכו יועלה בנפרד.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Search className="w-4 h-4 mt-0.5 shrink-0" />
                <span>שמרו חיפושים שאתם משתמשים בהם לעתים קרובות בלחיצה על סמל הסימנייה.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Filter className="w-4 h-4 mt-0.5 shrink-0" />
                <span>שלבו מספר פילטרים יחד לחיפוש מדויק: סלאג + קמפיין + תגית + טווח תאריכים.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Tag className="w-4 h-4 mt-0.5 shrink-0" />
                <span>תגיות נוספות לחומר מופיעות בכל המערכת ומסייעות לחיפוש מהיר.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
