'use client';

import Link from 'next/link';
import {
  GraduationCap,
  FolderOpen,
  Upload,
  Search,
  Pencil,
  Download,
  Share2,
  Megaphone,
  Tag,
  Bookmark,
  MessageSquare,
  Archive,
  ArrowLeft,
  CheckCircle,
  Clock,
  Shield,
  Film,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

export default function UserGuidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-ono-green" />
          <div>
            <h1 className="text-2xl font-bold text-ono-gray-dark">מדריך היכרות למשתמש</h1>
            <p className="text-sm text-ono-gray">5 דקות קריאה ואתם מוכנים לעבוד עם המערכת</p>
          </div>
        </div>
        <Link href="/help" className="flex items-center gap-1 text-ono-green hover:text-ono-green-dark text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          חזרה לעזרה
        </Link>
      </div>

      {/* Intro card */}
      <div className="bg-ono-green-light border border-ono-green/20 rounded-xl p-6">
        <h2 className="text-lg font-bold text-ono-green-dark mb-2">ברוכים הבאים למערכת ניהול מדיה</h2>
        <p className="text-sm text-ono-green-dark leading-relaxed">
          המערכת נועדה לנהל את כל החומרים השיווקיים של הקריה האקדמית אונו במקום אחד מרכזי.
          תמונות, סרטונים, מצגות, קבצי PDF ועוד - הכל מאורגן, מסווג וזמין לכל הצוות.
          המדריך הזה יסביר את עקרונות העבודה הבסיסיים.
        </p>
      </div>

      {/* Section 1: Structure */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8E8E8] pb-3">
          <div className="w-8 h-8 bg-ono-green text-white rounded-lg flex items-center justify-center font-bold text-sm">1</div>
          <h2 className="text-lg font-bold text-ono-gray-dark">מבנה המערכת</h2>
        </div>
        <p className="text-sm text-ono-gray-dark leading-relaxed">
          המערכת מאורגנת בהיררכיה פשוטה של שלוש רמות:
        </p>
        <div className="bg-ono-gray-light rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-ono-green mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-ono-gray-dark text-sm">סלאג (תחום)</span>
              <span className="text-sm text-ono-gray mr-2">- מייצג פקולטה או מחלקה. לדוגמה: MBA, משפטים, כללי.</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-ono-green mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-ono-gray-dark text-sm">קמפיין</span>
              <span className="text-sm text-ono-gray mr-2">- מהלך שיווקי עם תאריכים. לדוגמה: &ldquo;חזרה ללימודים 2026&rdquo;.</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FolderOpen className="w-5 h-5 text-ono-green mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-ono-gray-dark text-sm">חומר</span>
              <span className="text-sm text-ono-gray mr-2">- קובץ בודד (תמונה, סרטון, PDF). שייך לסלאג, וייתכן גם לקמפיין.</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-ono-gray">
          כל חומר חייב להיות משויך לסלאג אחד לפחות. שיוך לקמפיין הוא אופציונלי.
        </p>
      </section>

      {/* Section 2: Upload */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8E8E8] pb-3">
          <div className="w-8 h-8 bg-ono-green text-white rounded-lg flex items-center justify-center font-bold text-sm">2</div>
          <h2 className="text-lg font-bold text-ono-gray-dark">העלאת חומרים</h2>
        </div>
        <div className="flex items-start gap-3">
          <Upload className="w-5 h-5 text-ono-green mt-0.5 shrink-0" />
          <p className="text-sm text-ono-gray-dark leading-relaxed">
            עברו למסך <strong>&ldquo;העלאת חומרים&rdquo;</strong> מהתפריט. גררו קבצים או לחצו לבחירה.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-ono-gray-light rounded-lg p-3 space-y-1">
            <span className="text-xs font-bold text-ono-gray-dark">שדות חובה:</span>
            <ul className="text-xs text-ono-gray space-y-0.5">
              <li>• <strong>סלאג</strong> - לאיזה תחום שייך החומר</li>
              <li>• <strong>סוג תוכן</strong> - סושיאל, דפוס, מיתוג, שילוט...</li>
            </ul>
          </div>
          <div className="bg-ono-gray-light rounded-lg p-3 space-y-1">
            <span className="text-xs font-bold text-ono-gray-dark">שדות אופציונליים:</span>
            <ul className="text-xs text-ono-gray space-y-0.5">
              <li>• <strong>קמפיין</strong> - אם שייך למהלך ספציפי</li>
              <li>• <strong>תגיות</strong> - מילות מפתח לסיווג (בחירה מרשימה)</li>
              <li>• <strong>פלטפורמות</strong> - מופיע רק בסושיאל</li>
            </ul>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            <strong>שמות קבצים:</strong> המערכת יוצרת שם משמעותי לכל קובץ: slug-campaign-date-type-dimensions-nn.ext. המספר הרץ מבטיח ייחודיות — אין חסימת כפילויות.
          </p>
        </div>
      </section>

      {/* Section 3: Library */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8E8E8] pb-3">
          <div className="w-8 h-8 bg-ono-green text-white rounded-lg flex items-center justify-center font-bold text-sm">3</div>
          <h2 className="text-lg font-bold text-ono-gray-dark">ספריית חומרים - חיפוש וסינון</h2>
        </div>
        <div className="flex items-start gap-3">
          <Search className="w-5 h-5 text-ono-green mt-0.5 shrink-0" />
          <p className="text-sm text-ono-gray-dark leading-relaxed">
            <strong>ספריית החומרים</strong> היא המסך המרכזי. כאן תמצאו את כל החומרים עם כלי סינון מתקדמים בצד.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <span className="text-ono-gray-dark"><strong>חיפוש חופשי</strong> - הקלידו שם קובץ, תגית או מילת מפתח</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <span className="text-ono-gray-dark"><strong>סינון לפי תגית</strong> - בחרו מהרשימה, או &ldquo;ללא תגיות&rdquo; למציאת חומרים לא מסווגים</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <span className="text-ono-gray-dark"><strong>פילטרים בצד</strong> - סלאג, קמפיין, סוג קובץ, פלטפורמה, יחס מידות, טווח תאריכים</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <span className="text-ono-gray-dark"><strong>שמירת חיפושים</strong> - שמרו צירוף סינונים שאתם חוזרים עליו לגישה מהירה</span>
          </div>
        </div>
      </section>

      {/* Section 4: Working with assets */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8E8E8] pb-3">
          <div className="w-8 h-8 bg-ono-green text-white rounded-lg flex items-center justify-center font-bold text-sm">4</div>
          <h2 className="text-lg font-bold text-ono-gray-dark">עבודה עם חומרים</h2>
        </div>
        <p className="text-sm text-ono-gray-dark leading-relaxed">
          לחצו על חומר כלשהו כדי לפתוח את <strong>חלונית הפרטים</strong>. משם תוכלו:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2 bg-ono-gray-light rounded-lg p-3">
            <Film className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-ono-gray-dark block">צפייה</span>
              <span className="text-xs text-ono-gray">תמונות במלוא הגודל, סרטונים עם נגן מובנה</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-ono-gray-light rounded-lg p-3">
            <Download className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-ono-gray-dark block">הורדה</span>
              <span className="text-xs text-ono-gray">הורדה בודדת, או בחרו מספר חומרים להורדת ZIP</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-ono-gray-light rounded-lg p-3">
            <Pencil className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-ono-gray-dark block">עריכה</span>
              <span className="text-xs text-ono-gray">לחצו &ldquo;ערוך&rdquo; - שנו תגיות, סלאג, קמפיין, הערות, תפוגה</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-ono-gray-light rounded-lg p-3">
            <Share2 className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-ono-gray-dark block">שיתוף</span>
              <span className="text-xs text-ono-gray">צרו קישור שיתוף עם תוקף - לגורמים חיצוניים</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-ono-gray-light rounded-lg p-3">
            <MessageSquare className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-ono-gray-dark block">הערות</span>
              <span className="text-xs text-ono-gray">הוסיפו הערות לחומר לתקשורת צוותית</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-ono-gray-light rounded-lg p-3">
            <Archive className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-ono-gray-dark block">ארכיון</span>
              <span className="text-xs text-ono-gray">העבירו חומרים ישנים לארכיון. ניתן לשחזר בכל עת</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Bulk operations */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8E8E8] pb-3">
          <div className="w-8 h-8 bg-ono-green text-white rounded-lg flex items-center justify-center font-bold text-sm">5</div>
          <h2 className="text-lg font-bold text-ono-gray-dark">פעולות מרוכזות</h2>
        </div>
        <p className="text-sm text-ono-gray-dark leading-relaxed">
          סמנו חומרים באמצעות תיבות הסימון. סרגל פעולות ירוק יופיע עם האפשרויות:
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-ono-green font-bold">1.</span>
            <span className="text-ono-gray-dark"><strong>שתף</strong> - צרו קישור שיתוף לכל החומרים שנבחרו</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-ono-green font-bold">2.</span>
            <span className="text-ono-gray-dark"><strong>ערוך נבחרים</strong> - עדכנו סוג תוכן, קמפיין, פלטפורמות ותגיות בבת אחת</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-ono-green font-bold">3.</span>
            <span className="text-ono-gray-dark"><strong>הורד</strong> - קובץ בודד יורד ישירות, מרובים יורדים כ-ZIP</span>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Pencil className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            <strong>טיפ:</strong> בעריכה מרוכזת, ניתן <strong>להוסיף</strong> תגיות (מצטברות לקיימות) או <strong>להחליף</strong> (מוחקות את הקיימות). השאירו שדות ריקים כדי לא לשנות אותם.
          </p>
        </div>
      </section>

      {/* Section 6: Collections */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8E8E8] pb-3">
          <div className="w-8 h-8 bg-ono-green text-white rounded-lg flex items-center justify-center font-bold text-sm">6</div>
          <h2 className="text-lg font-bold text-ono-gray-dark">אוספים (Lightboxes)</h2>
        </div>
        <div className="flex items-start gap-3">
          <Bookmark className="w-5 h-5 text-ono-green mt-0.5 shrink-0" />
          <p className="text-sm text-ono-gray-dark leading-relaxed">
            <strong>אוספים</strong> הם &ldquo;רשימות מועדפים&rdquo; אישיות. צרו אוסף, הוסיפו אליו חומרים מהספרייה, ושתפו אותו עם הצוות. שימושי ליצירת סט חומרים לפרויקט ספציפי.
          </p>
        </div>
      </section>

      {/* Section 7: Expiry */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8E8E8] pb-3">
          <div className="w-8 h-8 bg-ono-green text-white rounded-lg flex items-center justify-center font-bold text-sm">7</div>
          <h2 className="text-lg font-bold text-ono-gray-dark">תפוגה ורישיונות</h2>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-ono-green mt-0.5 shrink-0" />
          <p className="text-sm text-ono-gray-dark leading-relaxed">
            לחומרים עם רישיון מוגבל או תוקף, ניתן להגדיר <strong>תאריך תפוגה</strong> ו<strong>הערות רישיון</strong>. חומרים <strong>נמחקים אוטומטית יום אחד לאחר פקיעת התוקף</strong> (כולל הקבצים מהאחסון). בדשבורד מופיע כרטיס <strong>&ldquo;פוקעים ב-7 ימים&rdquo;</strong> עם התראה אדומה. ניתן לסנן בספרייה לפי: בתוקף, פוקעים ב-7 ימים, פוקעים ב-30 יום.
          </p>
        </div>
      </section>

      {/* Section 8: Analytics */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8E8E8] pb-3">
          <div className="w-8 h-8 bg-ono-green text-white rounded-lg flex items-center justify-center font-bold text-sm">8</div>
          <h2 className="text-lg font-bold text-ono-gray-dark">אנליטיקות שימוש</h2>
        </div>
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-ono-green mt-0.5 shrink-0" />
          <p className="text-sm text-ono-gray-dark leading-relaxed">
            בדשבורד תמצאו <strong>מדור אנליטיקות</strong> שמציג נתונים על השימוש במערכת. זה עוזר להבין אילו חומרים פופולריים ואיפה יש פערים.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <span className="text-ono-gray-dark"><strong>מגמת העלאות</strong> - גרף של כמות ההעלאות ב-30 ימים אחרונים</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Download className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <span className="text-ono-gray-dark"><strong>חומרים מורדים ביותר</strong> - Top 5 חומרים שהורדו הכי הרבה</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Tag className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <span className="text-ono-gray-dark"><strong>חלוקה לפי סלאג/קמפיין</strong> - כמה חומרים בכל תחום</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Search className="w-4 h-4 text-ono-green mt-0.5 shrink-0" />
            <span className="text-ono-gray-dark"><strong>חומרים שלא הורדו</strong> - עוזר לזהות חומרים שלא משתמשים בהם</span>
          </div>
        </div>
      </section>

      {/* Section 9: Quick reference */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8E8E8] pb-3">
          <div className="w-8 h-8 bg-ono-green text-white rounded-lg flex items-center justify-center font-bold text-sm">9</div>
          <h2 className="text-lg font-bold text-ono-gray-dark">מילון מונחים מהיר</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-ono-gray-light rounded-lg p-3">
            <span className="text-xs font-bold text-ono-gray-dark block">סלאג</span>
            <span className="text-xs text-ono-gray">מזהה תחום/פקולטה (mba, law, general)</span>
          </div>
          <div className="bg-ono-gray-light rounded-lg p-3">
            <span className="text-xs font-bold text-ono-gray-dark block">קמפיין</span>
            <span className="text-xs text-ono-gray">מהלך שיווקי עם תאריכי התחלה וסיום</span>
          </div>
          <div className="bg-ono-gray-light rounded-lg p-3">
            <span className="text-xs font-bold text-ono-gray-dark block">סוג תוכן</span>
            <span className="text-xs text-ono-gray">סושיאל, דפוס, מיתוג, שילוט, פנימי</span>
          </div>
          <div className="bg-ono-gray-light rounded-lg p-3">
            <span className="text-xs font-bold text-ono-gray-dark block">סוג חומר</span>
            <span className="text-xs text-ono-gray">הפקה (סופי), מקור (עיצוב מקורי), טיוטה</span>
          </div>
          <div className="bg-ono-gray-light rounded-lg p-3">
            <span className="text-xs font-bold text-ono-gray-dark block">אוסף</span>
            <span className="text-xs text-ono-gray">רשימת חומרים אישית שניתנת לשיתוף</span>
          </div>
          <div className="bg-ono-gray-light rounded-lg p-3">
            <span className="text-xs font-bold text-ono-gray-dark block">ארכיון</span>
            <span className="text-xs text-ono-gray">חומרים שהוסתרו מהספרייה (ניתן לשחזר)</span>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="bg-ono-green-light border border-ono-green/20 rounded-xl p-6 text-center space-y-3">
        <h3 className="text-lg font-bold text-ono-green-dark">מוכנים להתחיל?</h3>
        <p className="text-sm text-ono-green-dark">
          עכשיו שאתם מכירים את העקרונות, אתם מוזמנים להיכנס לספריית החומרים ולהתחיל לעבוד.
          לשאלות נוספות, בקרו בדף <Link href="/help" className="underline font-bold">עזרה ותמיכה</Link>.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/assets" className="bg-ono-green hover:bg-ono-green-dark text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            ספריית חומרים
          </Link>
          <Link href="/upload" className="bg-white border border-ono-green text-ono-green hover:bg-ono-green-light px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" />
            העלאת חומרים
          </Link>
        </div>
      </div>
    </div>
  );
}
