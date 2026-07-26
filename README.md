# مركز إدارة التعاقدات — Contract Management Center

تطبيق كامل قابل للتشغيل لإدارة وإنشاء وتوثيق عقود شركات التسويق. الموظف يختار الشركة والباقة والمدة والسعر والعرض؛ النظام يحدد أحدث قالب فعّال من PostgreSQL، ينشئ نسخة Google Docs داخل مجلد الموظف، ثم يحفظ الرقم المرجعي والإصدار والموظف وسجل التدقيق. يستطيع المسؤول توثيق العقد بضغطة واحدة: يحدد آخر جدول، ويصدر العقد PDF، ويضيف ختم وتوقيع الشركة بعد الجدول، ويحفظ النسخة الموثقة داخل مجلد الموظف نفسه.

## أسهل تشغيل على Windows

هذه النسخة تحتوي على Runtime إنتاج جاهز، ولذلك لا تستخدم `npm ci` ولا Docker
BuildKit على جهاز التشغيل.

1. فك ضغط ملف الإصدار كاملًا.
2. افتح مجلد `Contract-Management-Center`.
3. اضغط مرتين على `START-HERE.bat`.
4. وافق على نافذة Administrator إذا ظهرت.
5. إذا طلب منك Restart بسبب WSL، أعد تشغيل الجهاز ثم افتح `START-HERE.bat` مرة ثانية.
6. في أول تشغيل فقط، اكتب كلمة مرور من 12 حرفًا على الأقل للمسؤول.

الملف يفحص WSL وDocker Desktop، يثبت الناقص باستخدام Windows Package Manager،
ينشئ الإعدادات الآمنة، يشغل PostgreSQL والتطبيق، وينشئ أول مسؤول فقط عندما
تكون قاعدة البيانات خالية، ثم يفتح `http://localhost:3000` تلقائيًا.

التشغيل يسحب صورتي `postgres:17-alpine` و`node:24-bookworm-slim` الجاهزتين ثم
يشغّل Runtime المرفق للبرنامج. لا يبني صورة محليًا، ولا يحذف الحاوية أو قاعدة
البيانات قبل نجاح التحديث. إذا كانت قاعدة البيانات تحتوي على مستخدمين، يحتفظ
بهم ولا يطلب كلمة مرور جديدة ولا يغيّر أي حساب.

إذا ظهر خطأ Prisma برقم `P1000` بعد استبدال مجلد المشروع، اضغط مرتين على
`FIX-DATABASE.bat`. الملف يطابق كلمة مرور PostgreSQL القديمة مع ملف `.env`
الحالي من غير حذف قاعدة البيانات أو العقود.

أدوات Windows تتجاهل تحذيرات إضافات Docker الاختيارية التالفة مثل
`docker-scout`، كما تقرأ ملف `.env` سطرًا بسطر. إذا كان ملف `.env` متضخمًا
بشكل غير طبيعي، يحتفظ `CONNECT-GOOGLE.bat` بنسخة احتياطية منه ويعيد إنشاء
إعدادات محلية سليمة قبل مزامنة كلمة مرور قاعدة البيانات، من غير حذف البيانات.

`UPDATE-APP.bat` و`CONNECT-GOOGLE.bat` يعيدان تشغيل الـRuntime الجاهز باستخدام
`--no-build`؛ لذلك لا يعتمدان على BuildKit أو npm.

بيانات الدخول بعد اكتمال التشغيل:

```text
Email: admin@contracthub.local
Password: القيمة التي كتبتها داخل نافذة التشغيل
```

## ما تم تنفيذه

- تسجيل دخول داخلي آمن، مع Google Workspace OAuth اختياري وقائمة سماح من جدول المستخدمين.
- صلاحيات `Admin` و`Supervisor` و`Contract Employee` تُطبق من الخادم.
- إدارة الشركات، الباقات، القوالب وإصداراتها، المستخدمين ومجلداتهم.
- واجهة عربية وإنجليزية كاملة، مع RTL/LTR ووضعين فاتح وداكن وهوية «مركز إدارة التعاقدات».
- تحديد القالب من File ID المخزن، لا من اسم الملف.
- إنشاء Copy حقيقي عبر Google Drive API ووضعه مباشرةً داخل مجلد الموظف.
- دعم حساب Google الشخصي عبر OAuth مشفّر، مع زر ربط وفصل من لوحة الإدارة.
- دعم Shared Drives عبر `supportsAllDrives` في كل عملية ملف ذات صلة.
- حماية من الضغط المزدوج: loading state، idempotency key فريد، سجل `CREATING`، وrate limit.
- شاشة نجاح كاملة، نسخ الرابط، فتح مُدقق للنسخة، وسجل عقود قابل للبحث والتصفية.
- تحذير من النسخة المكررة لنفس العميل خلال 15 دقيقة مع إمكانية التأكيد.
- Audit trail، structured logs مع إخفاء الأسرار، وفحص وصول للقالب والمجلد.
- توثيق العقد بضغطة واحدة: لكل شركة ختم وتوقيع PNG وإعدادات موضع مستقلة؛ يحدد النظام آخر جدول، ويضع الهوية بعده، ثم يحفظ PDF في مجلد الموظف نفسه مع بصمة SHA-256.
- استعادة كلمة المرور برابط مؤقت لمدة 30 دقيقة، أو من أداة المسؤول المحلية بدون حذف أي بيانات.
- رسائل نجاح وفشل واضحة، وتأكيد إلزامي قبل حذف أو تعطيل السجلات.
- وضع داكن، RTL/LTR، responsive، تنقل بلوحة المفاتيح ورسائل ثنائية اللغة.
- Prisma migration وseed وunit/integration tests وDocker.

## توثيق عقد

1. افتح **الشركات**، وافتح الشركة المطلوبة، ثم ارفع ختمها وتوقيعها بصيغة PNG واضبط المحاذاة والترتيب والمقاسات.
2. أنشئ العقد بالطريقة المعتادة، أو افتح **سجل العقود** لعقد موجود.
3. اضغط **توثيق العقد** ووافق على رسالة التأكيد.
4. ينشئ النظام نسخة Google Docs مؤقتة لتحديد آخر جدول، ويضع توقيع وختم شركة العقد بعده في PDF، ثم يحذف النسخة المؤقتة ويرفع PDF إلى نفس Google Drive Folder ID الخاص بالموظف. إذا لم تكفِ المساحة، يضيف صفحة جديدة تلقائيًا.
5. يظهر رابط **فتح PDF الموثق** في سجل العقد، ولا ينفذ النظام التوثيق مرتين لنفس العقد.

يجب أن يكون Google Drive متصلًا فعليًا، وأن يكون للقالب Google Docs File ID صالح، وللموظف Folder ID يمكن للحساب المتصل الكتابة داخله.

## استعادة كلمة المرور

- من شاشة الدخول اضغط **نسيت كلمة المرور؟**. عند ضبط متغيرات SMTP يرسل النظام رابطًا مؤقتًا صالحًا لمدة 30 دقيقة.
- يستطيع المسؤول من صفحة **المستخدمون** إنشاء رابط استعادة ونسخه للمستخدم.
- للحساب الإداري المحلي اضغط مرتين على `RESET-ADMIN-PASSWORD.bat`. تعرض الأداة الحسابات الموجودة للاختيار منها، ويمكنها إنشاء أول مسؤول إذا كانت قاعدة البيانات جديدة تمامًا. الأداة لا تحذف العقود أو قاعدة البيانات.

## تشغيل سريع بـDocker

هذا المسار مخصص لملف الإصدار الذي يحتوي على مجلد `runtime`. المتطلبات: Docker
وDocker Compose فقط؛ لا تحتاج Node.js أو npm على جهاز التشغيل.

1. انسخ `.env.example` إلى `.env`.
2. اضبط على الأقل:

   ```env
   POSTGRES_PASSWORD=ضع-كلمة-مرور-محلية-قوية
   AUTH_SECRET=ضع-قيمة-عشوائية-طويلة-32-حرفا-على-الأقل
   GOOGLE_DRIVE_MODE=mock
   ```

3. شغّل النسخة الجاهزة:

   ```bash
   docker compose pull
   docker compose up -d --no-build --wait
   ```

4. إذا كانت قاعدة البيانات جديدة تمامًا، أنشئ أول مسؤول:

   ```bash
   printf '%s\n' 'اختر-كلمة-قوية-12-حرفا' | docker compose exec -T app node seed-admin.mjs
   ```

5. افتح `http://localhost:3000`.

الحساب الأول هو `admin@contracthub.local`. إذا كانت هناك حسابات موجودة، لا
يشغّل Seeder أي تعديل عليها.

وضع `mock` لا يتصل بـGoogle ولا ينشئ ملفات حقيقية؛ لكنه يشغّل رحلة النظام كاملة ويُرجع File IDs تجريبية واضحة تبدأ بـ`mock-`.

## تشغيل محلي دون Docker للتطبيق

شغّل PostgreSQL أولًا، ثم:

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
SEED_PASSWORD='اختر-كلمة-محلية-مؤقتة-قوية' npm run db:seed
npm run dev
```

للمطورين الذين يريدون اختبار Dockerfile من السورس:

```bash
docker compose -f docker-compose.source.yml up --build
```

ولإنشاء Runtime وإصدار قابل للتشغيل بدون BuildKit:

```bash
npm run release:check
```

## ربط Google Drive الشخصي — My Drive

هذه هي الطريقة المناسبة لحسابات Gmail الشخصية التي لا يظهر فيها خيار Shared Drives.

1. من Google Cloud فعّل **Google Drive API** و**Google Docs API**.
2. اضبط OAuth consent screen وأضف حسابك ضمن Test users أثناء الإعداد.
3. أنشئ OAuth Client ID من نوع **Web application**.
4. أضف Authorized redirect URI التالي حرفيًا:

   ```text
   http://localhost:3000/api/admin/google-drive/callback
   ```

5. نزّل ملف OAuth Client JSON، ولا ترفعه إلى المحادثات أو خدمات مشاركة عامة.
6. اضغط مرتين على `CONNECT-GOOGLE.bat` واختر ملف OAuth JSON من جهازك.
7. بعد إعادة تشغيل التطبيق افتح لوحة الإدارة واضغط **ربط Google Drive**.
8. وافق بالحساب المالك لقوالب العقود ومجلدات الموظفين.
9. ضع Google Docs URL الحقيقي لكل قالب، وFolder ID الحقيقي لكل مستخدم.
10. اختبر القالب والمجلد ثم نفّذ **نسخة تجريبية**.

يُشفّر Refresh Token باستخدام AES-256-GCM قبل حفظه في PostgreSQL. لا يُرسل الرمز إلى الواجهة ولا يُسجل داخل Logs. النسخ الجديدة يملكها حساب Google المتصل وتستهلك مساحته، وتوضع مباشرةً داخل مجلد الموظف المحدد.

متغيرات هذه الطريقة، ويملؤها ملف Windows تلقائيًا:

```env
GOOGLE_DRIVE_MODE=oauth
GOOGLE_DRIVE_OAUTH_CLIENT_ID=...
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=...
GOOGLE_DRIVE_OAUTH_REDIRECT_URI=http://localhost:3000/api/admin/google-drive/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=...
```

## ربط Google Workspace Shared Drive

الحل المعتمد هو Service Account داخل Shared Drive، لأنه يفصل وصول التطبيق عن حساب موظف بعينه ويجعل الخدمة مستقرة عند تغيير الموظفين.

1. أنشئ مشروعًا في Google Cloud وفعّل Google Drive API وGoogle Docs API.
2. أنشئ Service Account وحمّل JSON مرة واحدة.
3. أضف بريد Service Account كعضو في Shared Drive بصلاحية تسمح بنسخ الملفات وإضافتها.
4. اجعل القوالب الأصلية View Only لموظفي العقود، مع منح حساب الخدمة صلاحية النسخ.
5. اربط كل مستخدم بمجلد وجهة داخل التطبيق.
6. خزّن JSON كاملًا أو Base64 داخل secret manager في متغير `GOOGLE_SERVICE_ACCOUNT_JSON`؛ لا تضع الملف في المستودع.
7. اضبط:

   ```env
   GOOGLE_DRIVE_MODE=service_account
   GOOGLE_SERVICE_ACCOUNT_JSON=...
   GOOGLE_DRIVE_ROOT_FOLDER_ID=...
   GOOGLE_SHARED_DRIVE_ID=...
   ```

8. من لوحة القوالب اختبر الوصول، ثم أنشئ Test Copy بحساب Admin.

إذا كانت الملفات داخل My Drive شخصي ولا تملك Google Workspace، استخدم طريقة OAuth السابقة بدل Service Account. حسابات الخدمة لا تملك مساحة Drive مستقلة صالحة لإنشاء هذه النسخ داخل My Drive.

## Google Workspace Login

إضافة Google OAuth لا تمنح أي شخص حق الدخول تلقائيًا. يجب أن يكون البريد موجودًا و`Active` في جدول المستخدمين، ويمكن تقييد النطاق عبر `GOOGLE_WORKSPACE_DOMAIN`.

اضبط أحد الاسمين المدعومين:

```env
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
# أو GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
GOOGLE_WORKSPACE_DOMAIN=example.com
```

Callback URL هو:

```text
https://your-domain.example/api/auth/callback/google
```

## Technical Decisions

1. **Next.js full-stack بدل Backend منفصل:** حجم الـMVP لا يحتاج NestJS مستقلًا. Route Handlers وServer Actions يبقيان auth، authorization وDrive calls في Node.js server مع نشر واحد.
2. **PostgreSQL + Prisma 7:** العلاقات والإصدارات والـaudit والاستعلامات المفلترة تحتاج قاعدة علائقية. Prisma Client يستخدم PostgreSQL driver adapter الحالي.
3. **JWT sessions مع قائمة مستخدمين داخلية:** لا نخزن Google access/refresh tokens لأن OAuth هنا للهوية فقط، بينما Drive يعمل بهوية Service Account مستقلة.
4. **طريقتان لـDrive:** OAuth المشفّر يدعم My Drive الشخصي، وService Account + Shared Drive يظل الخيار المؤسسي الأفضل عند توفر Google Workspace.
5. **File ID هو source of truth:** الاسم والكود للعرض والبحث فقط. أي تعديل لاسم الملف في Drive لا يكسر الربط.
6. **لا توجد معاملة موزعة وهمية:** يتم حجز العملية في DB قبل Drive، ثم تحديثها بعد النسخ مع retry وسجل reconciliation عند الفشل النادر.
7. **اختيار القالب deterministic بدون قالب افتراضي:** يختار النظام أحدث إصدار فعّال يطابق الاختيارات، وعند استمرار التعادل يطلب اختيار الإصدار بدل الاختيار العشوائي.
8. **Soft disable/archive:** السجلات التاريخية والقوالب المستخدمة لا تُحذف من رحلة التشغيل.
9. **Mock Mode محدود وواضح:** لا يغيّر منطق الأعمال؛ يبدّل فقط تنفيذ Drive Service، ولذلك نفس الاختبارات والمنطق يُستخدمان عند إضافة credentials.

## قواعد اسم الملف

النمط الافتراضي:

```text
{reference_number} - {agency_code} - {package_code} - {client_name} - {employee_name} - {date}
```

الأسماء العربية مدعومة. تزال control characters، وتستبدل الرموز غير الآمنة، وتُمنع قيم `undefined`، ويستخدم `No-Client-Name` عند غياب العميل، ويُحد الاسم إلى 180 حرفًا مع الاحتفاظ بالرقم المرجعي.

## الاختبارات والتحقق

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

الاختبارات تغطي تسمية الملفات، أولوية القالب، منع الاختيار العشوائي، التحقق من القالب والمجلد، منع إعادة original File ID، ومعالجة parent غير الصحيح باستخدام Drive mocks.

## الأمان التشغيلي

- استخدم HTTPS في الإنتاج وSecret Manager للـcredentials.
- غيّر كلمات مرور seed أو لا تشغّل seed في الإنتاج.
- دوّر `AUTH_SECRET` وService Account keys وفق سياسة المؤسسة.
- لا تمنح موظفي العقود Edit على مجلد القوالب الأصلية.
- راقب `CONTRACT_CREATION_FAILED` وحالات `CREATING` القديمة؛ قد تشير الأخيرة إلى نسخة Drive تحتاج reconciliation.
- structured logger يخفي الحقول المعروفة للتوكنز والـcredentials.
- لا يعتمد أي endpoint على إخفاء الأزرار؛ كل الصلاحيات يعاد فحصها من قاعدة البيانات.

## ميزات خارج النسخة الحالية

إرسال WhatsApp، التكامل مع CRM/ERP، الاستيراد الجماعي والتصدير المتقدم ليست ضمن النسخة الحالية. التوثيق الحالي هو توثيق تشغيلي بإضافة ختم وتوقيع PNG إلى PDF مع تسجيل المنفذ والتاريخ والبصمة؛ وليس منصة توقيع رقمي بشهادة PKI أو خدمة توقيع قانونية لطرف خارجي.

تفاصيل البنية والتسلسل موجودة في [ARCHITECTURE.md](./ARCHITECTURE.md).
