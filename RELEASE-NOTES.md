# Contract Management Center V5

## PDF certification runtime hotfix

- Ships the PDF.js runtime, worker, and Linux Canvas adapter used by Docker.
- Keeps PDF.js external to the Next.js server bundle so its dynamic worker import is preserved.
- Packaging now performs a real anchor-location smoke test against the prepared runtime.

## واجهة عربية وإنجليزية مصقولة

- اتجاه RTL للعربية وLTR للإنجليزية على مستوى الصفحة والتنقل والنماذج.
- أسماء الشركات، حالات العقود، رسائل الـAPI، التواريخ والعملات تتبع اللغة المختارة.
- تحسين القوائم على الموبايل، حالات التركيز بلوحة المفاتيح، النوافذ التأكيدية
  والجداول في الوضعين الفاتح والداكن.
- عناوين صفحات ثنائية اللغة وتجربة موحدة على الشاشات المختلفة.

## إصلاحات الاعتمادية

- استعادة كلمة مرور المسؤول لا تعتمد على استمرار حاوية التطبيق أثناء إنشاء
  التشفير.
- Migration التوثيق آمنة عند إعادة التشغيل ولا تفشل إذا كان الـForeign Key
  موجودًا من محاولة سابقة.

## تشغيل موثوق على Windows

- يحتوي الإصدار على Next.js Runtime مبني ومختبر مسبقًا.
- `START-HERE.bat` لا يشغّل `npm ci` ولا Docker BuildKit.
- التطبيق يعمل داخل صورة `node:24-bookworm-slim` الجاهزة، وقاعدة البيانات داخل
  `postgres:17-alpine`.
- التحديث يعيد إنشاء حاوية التطبيق فقط بعد توفر Runtime، ولا يحذف PostgreSQL
  volume أو المستخدمين أو العقود أو إعدادات Google.
- إذا كانت هناك حسابات موجودة، يحتفظ بها ولا يغير كلمات المرور.
- إذا كانت قاعدة البيانات جديدة، ينشئ حساب المسؤول الأول فقط دون بيانات Mock
  أو شركات وقوالب تجريبية.

## الوظائف

- واجهة عربية وإنجليزية مع RTL/LTR ووضع فاتح وداكن.
- إدارة الشركات والباقات والقوالب والمستخدمين ومجلد Drive لكل مستخدم.
- Google Drive OAuth لحساب Gmail الشخصي، مع دعم Service Account وShared Drive.
- نسخ قالب Google Docs الأصلي دون تعديله.
- ختم وتوقيع PNG منفصلان لكل شركة مع إعدادات موضع مستقلة.
- تحديد آخر جدول، تصدير PDF، وضع الختم والتوقيع بعده، وحفظ PDF في مجلد الموظف.
- سجل تدقيق، منع التكرار، رسائل نجاح وفشل، وتأكيد قبل الإجراءات الحساسة.
- استعادة كلمة المرور من الواجهة أو `RESET-ADMIN-PASSWORD.bat`.

## التحقق

- ESLint: ناجح.
- TypeScript: ناجح.
- الاختبارات: 14/14 ناجحة.
- Next.js production build: ناجح.
- Prebuilt runtime packaging: ناجح.
