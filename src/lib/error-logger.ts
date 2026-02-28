/**
 * Error Logger — client-safe centralized error logging for AssetHub
 *
 * Client-side: logClientError() sends a POST to /api/activity with error details
 *
 * All errors are stored with action='error' and metadata.level='error'
 * so the admin system log can filter and display them with red styling.
 *
 * For server-side logging, use logServerError() from '@/lib/error-logger-server'
 */

// ============================================
// Client-side error logging
// ============================================

export async function logClientError(
  context: string,
  errorMessage: string,
  entityName?: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'error',
        entity_type: 'system',
        entity_id: null,
        entity_name: entityName || context,
        metadata: {
          level: 'error',
          error_message: errorMessage,
          context,
          timestamp: new Date().toISOString(),
          ...(extra || {}),
        },
      }),
    });
  } catch {
    // Don't let error logging prevent other functionality
    console.error('[ErrorLogger] Failed to log client error:', errorMessage);
  }
}

// ============================================
// Hebrew error messages with recovery instructions
// ============================================

export const ERROR_MESSAGES = {
  // Auth errors
  AUTH_EXPIRED: {
    title: 'פג תוקף ההתחברות',
    description: 'החיבור שלך למערכת פג תוקף.',
    action: 'רענן את הדף והתחבר מחדש.',
  },
  AUTH_UNAUTHORIZED: {
    title: 'אין הרשאה',
    description: 'אין לך הרשאות לבצע פעולה זו.',
    action: 'פנה למנהל המערכת לקבלת הרשאות.',
  },
  AUTH_FORBIDDEN: {
    title: 'גישה נדחתה',
    description: 'אין לך גישה למשאב זה.',
    action: 'פנה למנהל המערכת אם אתה סבור שזו שגיאה.',
  },

  // Upload errors
  UPLOAD_FILE_TOO_LARGE: {
    title: 'הקובץ גדול מדי',
    description: 'גודל מקסימלי להעלאה: 2GB.',
    action: 'דחוס את הקובץ או חלק אותו לקבצים קטנים יותר.',
  },
  UPLOAD_UNSUPPORTED_TYPE: {
    title: 'סוג קובץ לא נתמך',
    description: 'הקובץ שנבחר אינו בפורמט נתמך.',
    action: 'פורמטים נתמכים: JPG, PNG, GIF, WebP, SVG, MP4, MOV, PDF, ZIP, InDesign, AI.',
  },
  UPLOAD_DUPLICATE: {
    title: 'קובץ כפול',
    description: 'קובץ זהה כבר קיים במערכת.',
    action: 'בדוק בספריית החומרים אם הקובץ כבר הועלה.',
  },
  UPLOAD_STORAGE_FAILED: {
    title: 'שגיאה בהעלאה לאחסון',
    description: 'לא ניתן היה לשמור את הקובץ באחסון.',
    action: 'נסה שוב. אם הבעיה נמשכת, בדוק שהאחסון לא מלא.',
  },
  UPLOAD_DB_FAILED: {
    title: 'שגיאה בשמירת פרטי הקובץ',
    description: 'הקובץ הועלה אך הפרטים לא נשמרו בבסיס הנתונים.',
    action: 'נסה להעלות שוב. אם הבעיה נמשכת, פנה למנהל המערכת.',
  },
  UPLOAD_MISSING_FIELDS: {
    title: 'שדות חובה חסרים',
    description: 'יש למלא את כל שדות החובה לפני העלאה.',
    action: 'וודא שנבחרו סלאג וסביבת עבודה.',
  },
  UPLOAD_ZIP_FAILED: {
    title: 'שגיאה בפתיחת ZIP',
    description: 'לא ניתן היה לחלץ קבצים מתוך קובץ ה-ZIP.',
    action: 'וודא שה-ZIP תקין ולא מוגן בסיסמה.',
  },
  UPLOAD_SLUG_NOT_FOUND: {
    title: 'סלאג לא נמצא',
    description: 'סביבת העבודה או הסלאג שנבחרו לא קיימים.',
    action: 'רענן את הדף ובחר סלאג מהרשימה.',
  },

  // Download errors
  DOWNLOAD_FAILED: {
    title: 'שגיאה בהורדת הקובץ',
    description: 'לא ניתן היה להוריד את הקובץ מהאחסון.',
    action: 'נסה שוב. אם הבעיה נמשכת, ייתכן שהקובץ נמחק מהאחסון.',
  },
  DOWNLOAD_ZIP_FAILED: {
    title: 'שגיאה ביצירת חבילת הורדה',
    description: 'לא ניתן היה ליצור קובץ ZIP להורדה מרובה.',
    action: 'נסה להוריד כל קובץ בנפרד.',
  },

  // Archive errors
  ARCHIVE_FAILED: {
    title: 'שגיאה בהעברה לארכיון',
    description: 'לא ניתן היה להעביר את הקובץ לארכיון.',
    action: 'נסה שוב. אם הבעיה נמשכת, פנה למנהל המערכת.',
  },
  RESTORE_FAILED: {
    title: 'שגיאה בשחזור מארכיון',
    description: 'לא ניתן היה לשחזר את הקובץ מהארכיון.',
    action: 'נסה שוב.',
  },
  DELETE_FAILED: {
    title: 'שגיאה במחיקה לצמיתות',
    description: 'לא ניתן היה למחוק את הקובץ לצמיתות.',
    action: 'נסה שוב. אם הבעיה נמשכת, פנה למנהל המערכת.',
  },
  DELETE_STORAGE_WARNING: {
    title: 'הקובץ נמחק חלקית',
    description: 'הרשומה נמחקה, אך הקובץ הפיזי באחסון לא הוסר.',
    action: 'יש לנקות את האחסון ידנית דרך Supabase Dashboard.',
  },

  // Export errors
  EXPORT_FAILED: {
    title: 'שגיאה בייצוא',
    description: 'לא ניתן היה לייצא את החבילה.',
    action: 'נסה שוב עם פחות קבצים.',
  },
  EXPORT_NO_FILES: {
    title: 'לא נבחרו קבצים לייצוא',
    description: 'יש לבחור לפחות קובץ אחד לייצוא.',
    action: 'סמן קבצים מהרשימה ונסה שוב.',
  },

  // Collection errors
  COLLECTION_CREATE_FAILED: {
    title: 'שגיאה ביצירת אוסף',
    description: 'לא ניתן היה ליצור את האוסף.',
    action: 'נסה שוב. וודא ששם האוסף אינו ריק.',
  },
  COLLECTION_ADD_ASSETS_FAILED: {
    title: 'שגיאה בהוספת חומרים לאוסף',
    description: 'האוסף נוצר, אך חלק מהחומרים לא נוספו.',
    action: 'נסה להוסיף חומרים שוב מתוך עמוד האוסף.',
  },
  COLLECTION_UPDATE_FAILED: {
    title: 'שגיאה בעדכון אוסף',
    description: 'לא ניתן היה לעדכן את פרטי האוסף.',
    action: 'נסה שוב.',
  },

  // Initiative errors
  INITIATIVE_CREATE_FAILED: {
    title: 'שגיאה ביצירת קמפיין',
    description: 'לא ניתן היה ליצור את הקמפיין.',
    action: 'וודא שכל שדות החובה מלאים ושהקוד הקצר באנגלית.',
  },

  // Slug errors
  SLUG_CREATE_FAILED: {
    title: 'שגיאה ביצירת סלאג',
    description: 'לא ניתן היה ליצור את הסלאג.',
    action: 'וודא שהשם באנגלית בלבד וללא רווחים.',
  },
  SLUG_DUPLICATE: {
    title: 'סלאג כבר קיים',
    description: 'כבר קיים סלאג עם שם זהה במערכת.',
    action: 'בחר שם אחר לסלאג.',
  },
  SLUG_DELETE_HAS_ASSETS: {
    title: 'לא ניתן למחוק סלאג',
    description: 'קיימים חומרים המשויכים לסלאג זה.',
    action: 'העבר או מחק את כל החומרים לפני מחיקת הסלאג.',
  },

  // Tags errors
  TAG_UPDATE_FAILED: {
    title: 'שגיאה בעדכון תגיות',
    description: 'לא ניתן היה לעדכן את התגיות.',
    action: 'נסה שוב.',
  },

  // Share errors
  SHARE_EXPIRED: {
    title: 'קישור שיתוף פג תוקף',
    description: 'הקישור לשיתוף שפג תוקפו.',
    action: 'בקש מהשולח קישור חדש.',
  },

  // User management errors
  USER_INVITE_FAILED: {
    title: 'שגיאה בהזמנת משתמש',
    description: 'לא ניתן היה לשלוח את ההזמנה.',
    action: 'וודא שכתובת האימייל תקינה ונסה שוב.',
  },
  USER_DELETE_ADMIN: {
    title: 'לא ניתן למחוק מנהל',
    description: 'אין אפשרות למחוק משתמש עם הרשאות מנהל.',
    action: 'שנה קודם את הרשאות המשתמש ואז מחק.',
  },

  // Network / General errors
  NETWORK_ERROR: {
    title: 'שגיאת תקשורת',
    description: 'לא ניתן היה להתחבר לשרת.',
    action: 'בדוק את חיבור האינטרנט ונסה שוב.',
  },
  SERVER_ERROR: {
    title: 'שגיאת שרת',
    description: 'אירעה שגיאה בלתי צפויה בשרת.',
    action: 'נסה שוב בעוד כמה רגעים. אם הבעיה נמשכת, פנה למנהל המערכת.',
  },
  FETCH_FAILED: {
    title: 'שגיאה בטעינת נתונים',
    description: 'לא ניתן היה לטעון את הנתונים מהשרת.',
    action: 'רענן את הדף ונסה שוב.',
  },
} as const;

export type ErrorKey = keyof typeof ERROR_MESSAGES;
