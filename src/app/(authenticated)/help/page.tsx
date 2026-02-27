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
    id: 'library',
    title: 'ספריית חומרים',
    icon: <FolderOpen className="w-5 h-5" />,
    description: 'מרכז כל החומרים השיווקיים של הארגון. כאן ניתן לצפות, לחפש, לסנן, להוריד ולשתף את כל החומרים.',
    features: [
      'תצוגה בגריד או ברשימה',
      'סינון מתקדם לפי סלאג, קמפיין, סוג קובץ, פלטפורמה, יחס מידות, סוג תוכן ועוד',
      'טווח תאריכים עם פריסטים מהירים (שבוע אחרון, חודש אחרון, השנה וכו\')',
      'חיפוש חופשי לפי שם קובץ ותגיות',
      'בחירת מספר חומרים והורדה כ-ZIP',
      'הורדת קובץ בודד בלחיצה',
      'שיתוף חומרים בקישור עם תוקף מוגבל',
      'שמירת חיפושים מועדפים לגישה מהירה',
      'מיון לפי תאריך (עולה/יורד)',
    ],
    faq: [
      { question: 'איך אני מוריד מספר קבצים?', answer: 'סמן את הקבצים הרצויים על ידי לחיצה על תיבת הסימון שבפינה הימנית-עליונה של כל חומר, ואז לחץ על כפתור "הורד" בסרגל הפעולות שיופיע. אם נבחר קובץ אחד בלבד, הוא יורד ישירות. אם נבחרו מספר קבצים, הם יורדו כקובץ ZIP.' },
      { question: 'מה זה "הורד הכל"?', answer: 'כפתור "הורד הכל" מוריד את כל החומרים שתואמים לסינון הנוכחי כקובץ ZIP. אם לא הפעלת שום סינון, כל החומרים במערכת יורדו.' },
      { question: 'איך עובד השיתוף?', answer: 'בחר חומרים ולחץ על "שתף". בחר את מספר הימים שהקישור יהיה תקף, ויופק לך קישור שכל מי שמקבל אותו יוכל לצפות, לסנן ולהוריד את החומרים ששותפו. הקישור לא דורש התחברות למערכת.' },
      { question: 'מה זה חיפוש שמור?', answer: 'כשיש לך צירוף סינונים שאתה משתמש בו לעתים קרובות, לחץ על סמל הסימנייה ליד "נקה הכל" כדי לשמור את החיפוש הנוכחי. החיפושים השמורים מופיעים מתחת לשורת החיפוש ומאפשרים גישה מהירה.' },
      { question: 'איך מעבירים חומר לארכיון?', answer: 'לחץ על חומר כדי לפתוח את חלונית הפרטים, ושם לחץ על "העבר לארכיון". חומרים בארכיון לא מוצגים בספרייה אך לא נמחקים.' },
    ],
  },
  {
    id: 'upload',
    title: 'העלאת חומרים',
    icon: <Upload className="w-5 h-5" />,
    description: 'העלאת קבצים חדשים למערכת. גררו קבצים או לחצו לבחירה, סווגו אותם ושלחו.',
    features: [
      'גרירת קבצים (Drag & Drop) או בחירה מהמחשב',
      'תמיכה ב-JPG, PNG, GIF, WebP, MP4, MOV, WebM, PDF, ZIP',
      'חילוץ אוטומטי של קבצי ZIP - כל קובץ בתוך ה-ZIP יועלה בנפרד',
      'זיהוי אוטומטי של מידות תמונה ויחס מידות',
      'סיווג חומרים: סלאג, קמפיין, סוג תוכן, פלטפורמות, תגיות',
      'בחירת סוג חומר: חומרי הפקה, חומרי מקור, טיוטות',
      'בחירת תאריך מסמך (ברירת מחדל: היום)',
      'העלאה של עד 2GB לקובץ',
    ],
    faq: [
      { question: 'מה קורה כשמעלים קובץ ZIP?', answer: 'המערכת פותחת את ה-ZIP אוטומטית ומעלה כל קובץ תמונה, וידאו או PDF שנמצא בתוכו בנפרד. קבצים מוסתרים (שמתחילים בנקודה) וקבצי מערכת מדולגים.' },
      { question: 'מה זה "סלאג"?', answer: 'סלאג מייצג את התחום או המחלקה שאליה שייך החומר. לדוגמה: "mba" לתואר שני בניהול עסקים, "law" למשפטים. סלאגים יכולים להיות היררכיים (מופרדים במקף: mba-finance).' },
      { question: 'האם אפשר להעלות קבצים ללא סלאג?', answer: 'לא, כל חומר חייב להיות משויך לסלאג. בחר את הסלאג המתאים מהרשימה. אם אין סלאג מתאים, פנה למנהל המערכת ליצירת סלאג חדש.' },
      { question: 'מה ההבדל בין חומרי הפקה, מקור וטיוטות?', answer: 'חומרי הפקה - חומרים מוגמרים ומוכנים לשימוש. חומרי מקור - קבצי מקור (קבצי עיצוב, פוטושופ וכו\'). טיוטות - גרסאות ביניים שעדיין לא אושרו.' },
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
      'קוד קצר באנגלית לשמות קבצי ייצוא',
    ],
    faq: [
      { question: 'מה זה קמפיין רוחבי?', answer: 'קמפיין רוחבי הוא קמפיין שאינו שייך לסלאג ספציפי אלא חוצה מספר תחומים. לדוגמה: קמפיין כללי של המכללה שמתייחס לכל התוכניות.' },
      { question: 'מה זה הקוד הקצר?', answer: 'הקוד הקצר (באנגלית בלבד) משמש בשמות קבצים בעת ייצוא. לדוגמה: "bts25" עבור "חזרה ללימודים 2025". הקוד חייב להיות באותיות קטנות באנגלית ומספרים בלבד.' },
      { question: 'למה אני מקבל שגיאה כשמקליד קוד קצר?', answer: 'שדה הקוד הקצר מקבל רק אותיות קטנות באנגלית ומספרים. אם הקלדת בעברית, המערכת תציג הודעה שמבקשת ממך להחליף שפה למקלדת אנגלית.' },
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
      { question: 'איך יוצרים היררכיה?', answer: 'הוסיפו מקף ולאחריו את שם תת-הסלאג. לדוגמה: אם יש סלאג "mba", צרו סלאג "mba-finance" והוא יופיע כצאצא שלו אוטומטית.' },
      { question: 'אפשר למחוק סלאג?', answer: 'ניתן למחוק סלאג רק אם אין לו חומרים ומהלכים מקושרים. אם יש, יש להעביר אותו לארכיון.' },
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
      { question: 'מה ההבדל בין התפקידים?', answer: 'מנהל מערכת - גישה מלאה לכל היכולות כולל ניהול משתמשים. מנהל מהלכים - יכול ליצור ולנהל מהלכים שיווקיים. קונה מדיה - יכול להעלות ולצפות בחומרים. צופה - יכול רק לצפות ולהוריד.' },
      { question: 'מה זה "צפייה מסוננת"?', answer: 'הרשאה שמאפשרת למשתמש לצפות רק בחומרים מסוימים לפי סינון שנקבע מראש. שימושי כשרוצים לתת גישה רק לחומרים של מחלקה מסוימת.' },
      { question: 'מה זה קישור העלאה חיצוני?', answer: 'קישור שמאפשר לגורמים חיצוניים (מעצבים, פרילנסרים) להעלות חומרים למערכת ללא צורך ברישום ובהתחברות. לקישור יש תוקף שניתן להגדיר ואפשר לבטל אותו בכל עת.' },
      { question: 'אני לא רואה את ניהול המשתמשים', answer: 'ניהול משתמשים זמין רק למשתמשים עם תפקיד "מנהל מערכת". אם צריך גישה, פנה למנהל המערכת.' },
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
      'מי שמקבל את הקישור יכול לצפות בחומרים, לסנן ולהוריד',
      'הורדת קובץ בודד או הכל כ-ZIP',
      'הקישור לא דורש התחברות למערכת',
      'הקישור פג תוקף אוטומטית לפי ההגדרה',
    ],
    faq: [
      { question: 'האם מי שמקבל את הקישור צריך חשבון?', answer: 'לא. קישורי שיתוף לא דורשים חשבון במערכת. כל מי שיש לו את הקישור יכול לגשת לחומרים.' },
      { question: 'אפשר לבטל קישור שיתוף?', answer: 'כרגע קישורי שיתוף פגים תוקף אוטומטית לפי הזמן שהגדרת. אם צריך לבטל מיד, פנה למנהל המערכת.' },
    ],
  },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('library');

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
        {/* Section Navigation - Center */}
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

        {/* Content - Left (wider) */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Current Section */}
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

            {/* Features */}
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

            {/* FAQ */}
            <div>
              <h3 className="font-bold text-ono-gray-dark text-sm mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-ono-green" />
                שאלות נפוצות
              </h3>
              <FAQAccordion items={current.faq} />
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-ono-green-light border border-ono-green/20 rounded-lg p-5">
            <h3 className="font-bold text-ono-green-dark text-sm mb-3">טיפים מהירים</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Download className="w-4 h-4 mt-0.5 shrink-0" />
                <span>לחצו על חומר כדי לפתוח פרטים מלאים. משם אפשר להוריד, לשתף ולארכב.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Filter className="w-4 h-4 mt-0.5 shrink-0" />
                <span>השתמשו בפריסטים המהירים לתאריכים כמו &quot;שבוע אחרון&quot; או &quot;השנה&quot; לסינון מהיר.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Package className="w-4 h-4 mt-0.5 shrink-0" />
                <span>העלו קובץ ZIP והמערכת תפרק אותו אוטומטית. כל קובץ תמונה/וידאו בתוכו יועלה בנפרד.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-ono-green-dark">
                <Search className="w-4 h-4 mt-0.5 shrink-0" />
                <span>שמרו חיפושים שאתם משתמשים בהם לעתים קרובות בלחיצה על סמל הסימנייה.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
