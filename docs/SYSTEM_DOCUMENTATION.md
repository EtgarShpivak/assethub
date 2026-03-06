# AssetHub - System Documentation / תיעוד מערכת

> **Version / גרסה: 7.0.0**
> **Last Updated / עדכון אחרון: 2026-03-06**

---

## Changelog / יומן שינויים

### v7.0.0 (2026-03-06)
- **Added / נוסף:** i18n — Hebrew + English toggle (HE/EN) in top nav / מתג שפה עברית/אנגלית בסרגל העליון
- **Added / נוסף:** Global search (Ctrl+K / Cmd+K) — search assets, slugs, initiatives / חיפוש גלובלי בכל המערכת
- **Added / נוסף:** Server-side favorites filtering with pagination / סינון מועדפים בצד השרת עם עימוד
- **Added / נוסף:** Bulk add to favorites — select multiple assets and favorite all / הוספת מועדפים מרובים בלחיצה
- **Added / נוסף:** Auto-favorite on upload — checkbox option / הוספה אוטומטית למועדפים בעת העלאה
- **Added / נוסף:** Version chain timeline — view and download previous versions / ציר זמן גרסאות עם צפייה והורדה
- **Added / נוסף:** Tree/folder view — hierarchical view of slugs and campaigns / תצוגת עץ היררכית
- **Added / נוסף:** "My Assets" view — filter to own uploads / "הנכסים שלי" — סינון לפי מעלה
- **Added / נוסף:** Comment threads with replies / הערות בשרשור עם תגובות
- **Added / נוסף:** Similar assets suggestions — metadata-based matching / חומרים דומים על בסיס מטא-דאטה
- **Added / נוסף:** Platform suggestion — match dimensions to PLATFORM_SPECS / המלצת פלטפורמה
- **Added / נוסף:** Monthly usage reports with charts / דוחות שימוש חודשיים עם גרפים
- **Added / נוסף:** Activity heatmap — 7×24 day×hour grid / מפת חום פעילות
- **Added / נוסף:** Audit trail CSV export with date range / ייצוא CSV של יומן ביקורת
- **Added / נוסף:** Filter counts API — show counts per filter dimension / ספירת תוצאות לכל מסנן
- **Added / נוסף:** SWR caching layer for comments / שכבת מטמון SWR להערות
- **Added / נוסף:** PDF full-text search via text_content column / חיפוש טקסט מלא ב-PDF
- **Added / נוסף:** Reports page (admin) with monthly charts, heatmap, export / דף דוחות למנהלים
- **Improved / שופר:** Comment system now supports threaded replies / מערכת הערות תומכת בשרשורים
- **Improved / שופר:** Favorites now filter server-side for correct pagination / מועדפים מסוננים בשרת
- **Fixed / תוקן:** Version viewing now allows clicking to switch and download / צפייה בגרסה ישנה עם הורדה
- **DB Migration:** `supabase/migrations/20260306_v7.sql` — parent_comment_id, text_content, activity indexes

### v6.3.0 (2026-03-06)
- **Added / נוסף:** Favorites system - star assets for quick access / מועדפים - סמנו חומרים בכוכב לגישה מהירה
- **Added / נוסף:** Download history on dashboard / היסטוריית הורדות אישית בדשבורד
- **Added / נוסף:** Version management - upload new version of existing asset / ניהול גרסאות - העלאת גרסה חדשה של חומר קיים
- **Added / נוסף:** Quick upload button from library / כפתור העלאה מהירה מתוך הספרייה
- **Fixed / תוקן:** Dashboard asset click navigates directly to asset detail / לחיצה על חומר בדשבורד פותחת את חלונית הפרטים ישירות
- **Fixed / תוקן:** Search sanitizer preserves periods in filenames / סניטציית חיפוש שומרת על נקודות בשמות קבצים
- **Fixed / תוקן:** Multi-file upload race condition with running numbers / תיקון race condition בהעלאת מספר קבצים
- **Improved / שופר:** Archive action now has proper error handling / פעולת ארכיון עם טיפול שגיאות

### v6.2.0 (Previous)
- Multi-file parallel upload (3 concurrent) / העלאה מקבילית של מספר קבצים
- Activity log improvements / שיפורי יומן פעילות
- User search in settings / חיפוש משתמשים בהגדרות
- Uploader info display / הצגת פרטי מעלה

---

## Table of Contents / תוכן עניינים

1. [Dashboard / דשבורד](#dashboard)
2. [Asset Library / ספריית חומרים](#asset-library)
3. [Upload / העלאת חומרים](#upload)
4. [Favorites / מועדפים](#favorites)
5. [Version Management / ניהול גרסאות](#version-management)
6. [Campaigns / קמפיינים](#campaigns)
7. [Collections / אוספים](#collections)
8. [Activity Log / יומן פעילות](#activity-log)
9. [Tags Management / ניהול תגיות](#tags-management)
10. [Slugs Management / ניהול סלאגים](#slugs-management)
11. [Archive / ארכיון](#archive)
12. [Settings & Users / הגדרות ומשתמשים](#settings)
13. [Sharing / שיתוף](#sharing)
14. [Export / ייצוא](#export)
15. [Comments / הערות](#comments)
16. [Expiry & Licensing / תפוגה ורישיונות](#expiry)
17. [File Naming / שמות קבצים](#file-naming)
18. [Global Search / חיפוש גלובלי](#global-search)
19. [i18n / דו-לשוניות](#i18n)
20. [Reports / דוחות](#reports)
21. [Tree View / תצוגת עץ](#tree-view)
22. [Similar Assets / חומרים דומים](#similar-assets)

---

<a id="dashboard"></a>
## 1. Dashboard / דשבורד

### EN
The dashboard is the main overview screen. It shows key statistics, recent uploads, active campaigns, analytics, and personal download history.

**Features:**
- Quick access buttons: upload assets, view library
- Interactive statistics cards — click any card to navigate to filtered library view
- "Expiring in 7 days" card with red warning when assets are about to expire
- File type breakdown (images, video, PDF) with bar chart
- Filter by faculty (slug) — click faculty tab to see filtered uploads and campaigns
- Recent uploads with preview thumbnails
- Active campaigns with status and faculty association
- **My Recent Downloads** — shows the last 8 files you downloaded with direct links
- Usage analytics: upload trends, most downloaded assets, breakdown by slug/campaign/platform
- 30-day upload trend chart
- Never-downloaded assets — identify irrelevant content
- Quick link to user onboarding guide

### HE
הדשבורד הוא מסך הסקירה הראשי. מציג סטטיסטיקות, העלאות אחרונות, קמפיינים פעילים, אנליטיקות והיסטוריית הורדות אישית.

**יכולות:**
- כפתורי גישה מהירה: העלאת חומרים, ספריית חומרים
- כרטיסי סטטיסטיקה אינטראקטיביים — לחיצה מעבירה לספרייה מסוננת
- כרטיס "פוקעים ב-7 ימים" עם התראה אדומה
- חלוקת סוגי קבצים (תמונות, וידאו, PDF) עם גרף פס
- סינון לפי פקולטה (סלאג) — טאבים ייעודיים
- העלאות אחרונות עם תצוגה מקדימה
- קמפיינים פעילים עם סטטוס ושיוך
- **ההורדות האחרונות שלי** — 8 הקבצים האחרונים שהורדתם עם קישורים ישירים
- אנליטיקות שימוש: מגמת העלאות, חומרים מורדים, חלוקה לפי סלאג/קמפיין/פלטפורמה
- גרף מגמת העלאות 30 יום
- חומרים שלא הורדו — לזיהוי תוכן לא רלוונטי
- קישור מהיר למדריך היכרות

---

<a id="asset-library"></a>
## 2. Asset Library / ספריית חומרים

### EN
The central hub for all marketing assets. Browse, search, filter, download, share, and edit assets.

**Features:**
- Grid or list view toggle
- Advanced filtering: slug, campaign, file type, platform, aspect ratio, content type, tags
- Special filters: "no tags", "no campaign" — find unclassified assets
- Facebook-style date range picker with quick presets (today, yesterday, week, month) + dual calendar
- Free text search by filename, slug name, campaign name, and notes
- Tag-based filtering from managed tag list
- Multi-select assets and download as ZIP (confirmation when >5 files)
- Share assets via time-limited links
- Save favorite searches for quick access
- **Favorites** — star button on each asset card, favorites-only filter in toolbar
- **Quick upload** — "Upload Assets" button directly in library header
- **Version upload** — "Upload New Version" in asset detail panel
- Meaningful display names (slug + content type)
- Video preview with built-in player
- Inline editing of all asset properties
- Bulk editing of multiple selected assets
- Comment system for collaboration
- Version, expiry date, and license status display
- Quick download button on grid cards (hover)
- Archive confirmation dialog
- Responsive filter sidebar — collapses on mobile

### HE
מרכז כל החומרים השיווקיים. צפייה, חיפוש, סינון, הורדה, שיתוף ועריכה.

**יכולות:**
- תצוגה בגריד או ברשימה
- סינון מתקדם: סלאג, קמפיין, סוג קובץ, פלטפורמה, יחס מידות, סוג תוכן, תגיות
- סינון מיוחד: "ללא תגיות", "ללא קמפיין" — מציאת חומרים לא מסווגים
- בורר תאריכים בסגנון פייסבוק: פריסטים מהירים + לוח שנה כפול
- חיפוש חופשי לפי שם קובץ, שם סלאג, שם קמפיין והערות
- סינון תגיות מרשימה מנוהלת
- בחירת מספר חומרים והורדה כ-ZIP (אישור מעל 5 קבצים)
- שיתוף בקישור עם תוקף
- שמירת חיפושים מועדפים
- **מועדפים** — כפתור כוכב על כל כרטיסית חומר, סינון מועדפים בסרגל
- **העלאה מהירה** — כפתור "העלאת חומרים" ישירות מהספרייה
- **העלאת גרסה** — "העלה גרסה חדשה" בחלונית הפרטים
- שמות תצוגה משמעותיים (סלאג + סוג תוכן)
- תצוגה מקדימה לסרטונים עם נגן מובנה
- עריכה מהירה של כל פרטי החומר
- עריכה מרוכזת של חומרים נבחרים
- מערכת הערות לשיתוף פעולה
- הצגת גרסה, תפוגה ומצב רישיון
- כפתור הורדה מהירה בגריד (hover)
- אישור לפני ארכיון
- סרגל סינון רספונסיבי

---

<a id="upload"></a>
## 3. Upload / העלאת חומרים

### EN
Upload new files to the system. Drag & drop or click to select, classify, and submit.

**Features:**
- Drag & drop or file browser selection
- Supported images: JPG, PNG, GIF, WebP, SVG, BMP, TIFF, HEIC, AVIF
- Supported video: MP4, MOV, WebM, AVI, MPEG, MKV, 3GP
- PDF, ZIP, newsletters (InDesign, AI, PPTX, DOCX, etc.)
- Automatic ZIP extraction
- Meaningful auto-generated filenames: slug-campaign-date-type-dimensions-nn.ext
- Automatic image dimension and aspect ratio detection
- Managed tag system: select from existing list or add new
- Conditional platform fields (shown only for "social" content type)
- Custom document date (default: today)
- Quick campaign creation from upload screen
- Running number ensures uniqueness — no duplicate blocking
- **Parallel upload** — up to 3 files uploaded simultaneously
- Clear, detailed error messages for each issue type

### HE
העלאת קבצים חדשים. גרירה או בחירה, סיווג ושליחה.

**יכולות:**
- גרירת קבצים (Drag & Drop) או בחירה מהמחשב
- תמונות: JPG, PNG, GIF, WebP, SVG, BMP, TIFF, HEIC, AVIF
- וידאו: MP4, MOV, WebM, AVI, MPEG, MKV, 3GP
- PDF, ZIP, ידיעונים (InDesign, AI, PPTX, DOCX ועוד)
- חילוץ אוטומטי של ZIP
- שמות קבצים אוטומטיים: slug-campaign-date-type-dimensions-nn.ext
- זיהוי אוטומטי של מידות ויחס מידות
- מערכת תגיות מנוהלת: בחירה מרשימה או הוספה חדשה
- שדות פלטפורמות מותנים (רק עבור "סושיאל")
- בחירת תאריך מסמך (ברירת מחדל: היום)
- יצירת קמפיין מהיר ממסך ההעלאה
- מספר רץ מבטיח ייחודיות
- **העלאה מקבילית** — עד 3 קבצים בו-זמנית
- הודעות שגיאה ברורות

---

<a id="favorites"></a>
## 4. Favorites / מועדפים

### EN
Mark important assets with a star for quick access. Each user has their own personal favorites list.

**Features:**
- Star button on asset cards in grid view (bottom-right corner, visible on hover)
- Star button in asset detail panel ("Add to Favorites" / "In Favorites")
- Favorites filter button in toolbar — click to show only starred assets
- "Favorites" link in sidebar navigation
- Instant toggle — optimistic UI update, no page refresh needed
- Badge shows count of favorited assets
- Personal per user — other users cannot see your favorites

**How to use:**
1. Hover over an asset card → click the star icon
2. Or open an asset → click "Add to Favorites"
3. Click the star button in the toolbar to show only favorites
4. Navigate via sidebar → "Favorites"

### HE
סמנו חומרים חשובים בכוכב לגישה מהירה. כל משתמש שומר רשימה אישית.

**יכולות:**
- כפתור כוכב בכרטיסיות הגריד (פינה ימנית-תחתונה, מופיע בריחוף)
- כפתור כוכב בחלונית הפרטים ("הוסף למועדפים" / "במועדפים")
- כפתור סינון מועדפים בסרגל הכלים
- קישור "מועדפים" בתפריט הצד
- מעבר מיידי — עדכון אופטימיסטי ללא רענון
- תג ספירה מציג כמות מועדפים
- אישי למשתמש — אחרים לא רואים את המועדפים שלך

**איך להשתמש:**
1. העבירו את העכבר מעל כרטיסית חומר → לחצו על הכוכב
2. או פתחו חומר → לחצו "הוסף למועדפים"
3. לחצו על כפתור הכוכב בסרגל לראות רק מועדפים
4. ניווט דרך תפריט צד → "מועדפים"

---

<a id="version-management"></a>
## 5. Version Management / ניהול גרסאות

### EN
Upload a new version of an existing asset. The original stays as version 1, and the new file gets an incremented version number.

**Features:**
- "Upload New Version" button in the asset detail panel
- Select any file to upload as the new version
- Metadata is automatically copied: slug, campaign, tags, platforms, content type
- Version number increments automatically (1 → 2 → 3...)
- After upload, the detail panel shows the new version
- Both old and new versions remain accessible in the library
- Linked via parent_asset_id for version chain tracking

**How to use:**
1. Open an asset's detail panel
2. Click "Upload New Version" (Layers icon)
3. Select a file from your computer
4. The system uploads it with all metadata inherited
5. The new version appears in the detail panel

### HE
העלאת גרסה חדשה של חומר קיים. המקורי נשמר כגרסה 1, הקובץ החדש מקבל מספר גרסה עוקב.

**יכולות:**
- כפתור "העלה גרסה חדשה" בחלונית הפרטים
- בחרו כל קובץ להעלאה כגרסה חדשה
- מטא-דאטה מועתקים אוטומטית: סלאג, קמפיין, תגיות, פלטפורמות, סוג תוכן
- מספר גרסה עולה אוטומטית (1 → 2 → 3...)
- לאחר ההעלאה, חלונית הפרטים מציגה את הגרסה החדשה
- שתי הגרסאות נגישות בספרייה
- מקושרות דרך parent_asset_id למעקב שרשרת גרסאות

**איך להשתמש:**
1. פתחו את חלונית הפרטים של חומר
2. לחצו "העלה גרסה חדשה" (אייקון שכבות)
3. בחרו קובץ מהמחשב
4. המערכת מעלה עם כל המטא-דאטה
5. הגרסה החדשה מופיעה בחלונית

---

<a id="campaigns"></a>
## 6. Campaigns / קמפיינים

### EN
Manage marketing campaigns and initiatives. Each campaign gets a name, short code, and dates.

**Features:**
- Create new campaigns with name, short code, start/end dates
- Associate campaigns with specific slugs or mark as "cross-slug" (horizontal)
- Filter by status: active, ongoing, ended, archived
- View linked asset count per campaign
- Short English code used in file names during export and upload

### HE
ניהול קמפיינים ומהלכים שיווקיים. כל קמפיין מקבל שם, קוד קצר ותאריכים.

**יכולות:**
- יצירת קמפיין עם שם, קוד קצר, תאריכים
- שיוך לסלאג או הגדרה כ"קמפיין רוחבי"
- סינון לפי סטטוס: פעיל, מתמשך, הסתיים, ארכיון
- צפייה בכמות חומרים מקושרים
- קוד קצר באנגלית משמש בשמות קבצים

---

<a id="collections"></a>
## 7. Collections (Lightboxes) / אוספים

### EN
Organize assets into custom collections. Create collections, add assets, and share with others.

**Features:**
- Create collections with name and description
- Add/remove assets from collections
- Share collections with other users
- View asset count per collection
- Full management: edit, delete, change sharing

### HE
ארגון חומרים באוספים מותאמים אישית.

**יכולות:**
- יצירת אוספים עם שם ותיאור
- הוספה והסרה של חומרים
- שיתוף עם משתמשים אחרים
- הצגת כמות חומרים באוסף
- ניהול מלא: עריכה, מחיקה, שיתוף

---

<a id="activity-log"></a>
## 8. Activity Log / יומן פעילות

### EN
Track all system actions. Full history of uploads, edits, downloads, archives, shares, and more.

**Features:**
- Chronological list of all system actions
- Filter by entity type: asset, collection, campaign, slug, user, system
- Filter by specific user — direct link from settings
- Filter by action type: upload, edit, download, archive, share, etc.
- **Date range filter** — "from date" and "to date" fields
- **"My activity only"** — view only your own actions
- Dedicated "Downloads" tab
- User name, IP address, and login method display
- Hebrew action descriptions with detailed metadata
- Stats: total events, uploads, downloads, errors
- Progressive loading with "load more" button

### HE
מעקב אחר כל הפעולות במערכת.

**יכולות:**
- רשימה כרונולוגית של כל הפעולות
- סינון לפי סוג ישות: חומר, אוסף, קמפיין, סלאג, משתמש, מערכת
- סינון לפי משתמש — קישור ישיר מהגדרות
- סינון לפי סוג פעולה: העלאה, עריכה, הורדה, ארכיון, שיתוף
- **סינון לפי טווח תאריכים** — "מתאריך" ו"עד תאריך"
- **"הפעילות שלי בלבד"** — צפייה רק בפעולות שביצעתם
- לשונית "הורדות" ייעודית
- שם משתמש, IP ושיטת התחברות
- תיאור פעולה בעברית עם מטא-דאטה
- סטטיסטיקות: אירועים, העלאות, הורדות, שגיאות
- טעינה הדרגתית עם "טען עוד"

---

<a id="tags-management"></a>
## 9. Tags Management / ניהול תגיות

### EN
Managed tag system for classifying and quickly searching assets.

**Features:**
- View all tags with usage counts
- Add new tags
- Rename tags — updates across all linked assets
- Delete tags — removes from all assets
- Search tags by name
- Select from managed list during upload (no free text)
- Filter by tag in asset library

### HE
מערכת תגיות מנוהלת לסיווג וחיפוש מהיר.

**יכולות:**
- צפייה בכל התגיות עם ספירת שימוש
- הוספת תגיות חדשות
- שינוי שם תגית — מתעדכן בכל החומרים
- מחיקת תגית — מוסרת מכל החומרים
- חיפוש תגיות לפי שם
- בחירה מרשימה מנוהלת בעת העלאה
- סינון לפי תגית בספרייה

---

<a id="slugs-management"></a>
## 10. Slugs Management / ניהול סלאגים

### EN
Slugs define the organizational domain structure. They create a hierarchy for classifying all assets.

**Features:**
- Create slugs with Hebrew display name and English identifier
- Automatic hierarchy — use hyphens (mba → mba-finance)
- Archive and delete empty slugs
- Count of linked assets and campaigns

### HE
סלאגים מגדירים את מבנה התחומים. יוצרים היררכיה לסיווג כל החומרים.

**יכולות:**
- יצירת סלאגים עם שם בעברית ומזהה באנגלית
- היררכיה אוטומטית עם מקף (mba → mba-finance)
- העברה לארכיון ומחיקה של סלאגים ריקים
- ספירת חומרים ומהלכים מקושרים

---

<a id="archive"></a>
## 11. Archive / ארכיון

### EN
Archived assets hub. Restore or permanently delete.

**Features:**
- Table view of all archived assets
- Restore single or multiple assets back to active library
- Permanent deletion (including storage files)
- Days-in-archive counter with 25+ day warning
- Multi-select with checkboxes for bulk operations
- Confirmation before permanent deletion

### HE
מרכז חומרים בארכיון. שחזור או מחיקה לצמיתות.

**יכולות:**
- טבלה של כל החומרים בארכיון
- שחזור בודד או מרובה לספרייה
- מחיקה לצמיתות (כולל מאחסון)
- ספירת ימים בארכיון עם התראה מ-25 יום
- בחירה מרובה לפעולות מרוכזות
- אישור לפני מחיקה

---

<a id="settings"></a>
## 12. Settings & Users / הגדרות ומשתמשים

### EN
User management, granular permissions, and external upload links. Admin-only access.

**Features:**
- Invite users by email
- Granular permissions: view, upload, delete assets, manage campaigns/slugs, manage users, view activity log
- User filters: all, active, inactive, deleted
- Sort by name, email, last login, join date
- **Search users** by name or email
- Invite history and last login display
- Permission icons for quick identification
- Re-invite users who haven't logged in
- Soft delete — user disabled but history preserved
- Re-invite deleted users
- Enable/disable users
- Per-user activity log link
- External upload links for freelancers and designers
- Link expiry settings and cancellation

### HE
ניהול משתמשים, הרשאות ולינקי העלאה חיצוניים. למנהלים בלבד.

**יכולות:**
- הזמנת משתמשים לפי מייל
- הרשאות פרטניות: צפייה, העלאה, מחיקה, ניהול קמפיינים/סלאגים, ניהול משתמשים, יומן פעילות
- סינון: הכל, פעילים, לא פעילים, נמחקו
- מיון לפי שם, מייל, כניסה אחרונה, הצטרפות
- **חיפוש משתמשים** לפי שם או מייל
- היסטוריית הזמנות וכניסה אחרונה
- אייקוני הרשאות לזיהוי מהיר
- הזמנה מחדש למשתמשים שלא נכנסו
- מחיקה רכה — המשתמש מושבת, ההיסטוריה נשמרת
- הזמנה מחדש של משתמשים שנמחקו
- השבתה/הפעלה של משתמשים
- קישור ליומן פעילות לכל משתמש
- קישורי העלאה חיצוניים לפרילנסרים
- הגדרת תוקף וביטול קישורים

---

<a id="sharing"></a>
## 13. Sharing / שיתוף

### EN
Share assets externally via time-limited links. Recipients can view, filter, and download.

**Features:**
- Select assets and generate share link
- Set expiry: 1 day, 3 days, 1 week, 2 weeks, 1 month, 3 months
- Branded share page with meaningful names
- Recipients can view, filter, and download
- Single file or ZIP download
- No login required for recipients

### HE
שיתוף חומרים עם גורמים חיצוניים בקישור עם תוקף.

**יכולות:**
- בחירת חומרים ויצירת קישור
- הגדרת תוקף: יום, 3 ימים, שבוע, שבועיים, חודש, 3 חודשים
- דף שיתוף מעוצב עם שמות משמעותיים
- צפייה, סינון והורדה
- הורדת קובץ בודד או ZIP
- ללא צורך בהתחברות

---

<a id="export"></a>
## 14. Export / ייצוא

### EN
Export asset data to spreadsheet format for external reporting and analysis.

### HE
ייצוא נתוני חומרים לפורמט גיליון אלקטרוני לדיווח וניתוח חיצוני.

---

<a id="comments"></a>
## 15. Comments / הערות

### EN
Comment system for team collaboration on assets.

**Features:**
- Add comments to any asset from detail panel
- User name and date displayed next to each comment
- Quick submit with Enter key
- Comments shown in chronological order

### HE
מערכת הערות לשיתוף פעולה צוותי.

**יכולות:**
- הוספת הערות לכל חומר מחלונית הפרטים
- שם המשתמש ותאריך ליד כל הערה
- שליחה מהירה עם Enter
- סדר כרונולוגי

---

<a id="expiry"></a>
## 16. Expiry & Licensing / תפוגה ורישיונות

### EN
Track expiration dates and licenses for marketing assets.

**Features:**
- Set expiry date per asset
- Add license notes (usage rights, copyright)
- Visual tags: expired (red), expiring soon (orange)
- Filter by status: valid, expiring in 7 days, expiring in 30 days
- "Expiring in 7 days" dashboard card with red warning
- Auto-delete assets 1 day after expiry (including storage files)
- Update expiry and license via asset editing

### HE
מעקב אחר תפוגה ורישיונות של חומרים.

**יכולות:**
- הגדרת תאריך תפוגה לכל חומר
- הערות רישיון (זכויות שימוש, זכויות יוצרים)
- תגים ויזואליים: פג תוקף (אדום), עומד לפוג (כתום)
- סינון: בתוקף, פוקעים ב-7 ימים, פוקעים ב-30 יום
- כרטיס "פוקעים ב-7 ימים" בדשבורד
- מחיקה אוטומטית יום אחד לאחר פקיעה
- עדכון תפוגה ורישיון דרך עריכה

---

<a id="file-naming"></a>
## 17. File Naming / שמות קבצים

### EN
The system automatically generates meaningful, unique filenames for every uploaded asset.

**Features:**
- Auto filename: slug-campaign-date-type-dimensions-nn.ext
- Running number (nn) ensures uniqueness
- SHA-256 hash computed for each file
- Original filename preserved and shown on download
- Meaningful filename displayed everywhere in the system

### HE
המערכת מייצרת שמות קבצים משמעותיים וייחודיים אוטומטית.

**יכולות:**
- שם אוטומטי: slug-campaign-date-type-dimensions-nn.ext
- מספר רץ מבטיח ייחודיות
- חתימת SHA-256 לכל קובץ
- שם מקורי נשמר ומוצג בהורדה
- שם משמעותי מוצג בכל מקום במערכת

---

<a id="global-search"></a>
## 18. Global Search / חיפוש גלובלי

### EN
Press Ctrl+K (or Cmd+K on Mac) to open the global search. Search assets, slugs, and initiatives from anywhere. Recent searches are saved locally. Quick page navigation available when no query is entered.

### HE
לחצו Ctrl+K (או Cmd+K ב-Mac) לפתיחת חיפוש גלובלי. מחפש חומרים, סלאגים וקמפיינים ממקום אחד. חיפושים אחרונים נשמרים. ניווט מהיר לדפים כשאין שאילתה.

---

<a id="i18n"></a>
## 19. i18n / דו-לשוניות

### EN
Toggle between Hebrew and English using the HE/EN button in the top navigation bar. Language preference is saved in the browser and persists across sessions. The interface direction (RTL/LTR) updates automatically.

### HE
עברו בין עברית לאנגלית באמצעות כפתור HE/EN בסרגל העליון. העדפת השפה נשמרת בדפדפן ונשמרת בין כניסות. כיוון הממשק (ימין-לשמאל / שמאל-לימין) מתעדכן אוטומטית.

---

<a id="reports"></a>
## 20. Reports / דוחות

### EN
Monthly usage reports for administrators. Includes upload/download/view counts per month, bar charts, activity heatmap (7×24 day-of-week × hour grid), top users, top downloaded assets, and audit trail CSV export with date range filtering.

**Features:**
- Monthly summary cards: total uploads, downloads, active users
- Bar charts showing activity trends by month
- Activity heatmap: color-coded grid showing peak usage times
- Top 10 most active users
- Top 10 most downloaded assets
- CSV export of full audit trail with date range

### HE
דוחות שימוש חודשיים למנהלים. כולל ספירת העלאות/הורדות/צפיות לפי חודש, גרפים, מפת חום פעילות (7×24), משתמשים מובילים, חומרים מורדים ביותר, וייצוא CSV של יומן ביקורת עם סינון תאריכים.

---

<a id="tree-view"></a>
## 21. Tree View / תצוגת עץ

### EN
Hierarchical folder-like view of slugs and campaigns. Click tree nodes to filter the asset grid by slug or campaign. Asset counts shown next to each node.

### HE
תצוגה היררכית של סלאגים וקמפיינים בסגנון תיקיות. לחצו על צומת בעץ לסינון הגריד לפי סלאג או קמפיין. ספירת חומרים מוצגת ליד כל צומת.

---

<a id="similar-assets"></a>
## 22. Similar Assets / חומרים דומים

### EN
When viewing an asset's detail, a "Similar Assets" section appears below showing assets with matching metadata: same slug, campaign, file type, aspect ratio, domain context, overlapping tags and platforms. Click to switch view to that asset.

### HE
בעת צפייה בפרטי חומר, מופיעה שורת "חומרים דומים" עם חומרים בעלי מאפיינים דומים: אותו סלאג, קמפיין, סוג קובץ, יחס מידות, סוג תוכן, תגיות ופלטפורמות חופפות. לחצו למעבר לחומר.

---

## Technical Information / מידע טכני

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Authentication:** Supabase Auth (email/magic link)
- **Hosting:** Vercel (Hobby plan)
- **UI:** Tailwind CSS + custom Ono brand theme (RTL Hebrew)
- **Caching:** SWR for client-side data fetching (comments, favorites)
- **i18n:** Custom React context with HE/EN translations
- **Search:** cmdk (Command Menu) for global Ctrl+K search
