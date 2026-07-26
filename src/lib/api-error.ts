export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorMessages: Record<string, string> = {
  UNAUTHORIZED: "يجب تسجيل الدخول أولًا.",
  FORBIDDEN: "ليس لديك صلاحية لتنفيذ هذه العملية.",
  USER_DISABLED: "هذا الحساب معطل. راجع مسؤول النظام.",
  AGENCY_INACTIVE: "الشركة المحددة غير فعالة.",
  PACKAGE_INACTIVE: "الباقة المحددة غير فعالة.",
  TEMPLATE_NOT_FOUND: "لا يوجد قالب متاح لهذه الشركة والباقة والاختيارات.",
  TEMPLATE_AMBIGUOUS: "يوجد أكثر من قالب مطابق. اختر القالب المطلوب من القائمة.",
  TEMPLATE_INACTIVE: "القالب المحدد غير فعال.",
  TEMPLATE_EXPIRED: "انتهت صلاحية هذا الإصدار من العقد.",
  TEMPLATE_ACCESS_DENIED: "التطبيق لا يمتلك صلاحية الوصول إلى قالب العقد.",
  EMPLOYEE_FOLDER_UNAVAILABLE: "مجلد الموظف غير موجود أو غير متاح.",
  COPY_FAILED: "تعذر إنشاء نسخة من العقد. حاول مرة أخرى.",
  COPY_ID_INVALID: "تعذر التحقق من النسخة الجديدة. لم يتم استخدام القالب الأصلي.",
  DUPLICATE_IN_PROGRESS: "يوجد طلب مماثل قيد التنفيذ.",
  DUPLICATE_WARNING: "تم إنشاء عقد مماثل لهذا العميل مؤخرًا.",
  RATE_LIMITED: "تم تنفيذ محاولات كثيرة خلال دقيقة. انتظر قليلًا ثم حاول مجددًا.",
  DATABASE_AFTER_COPY_FAILED: "تم إنشاء النسخة، ولكن تعذر حفظ العملية داخل النظام.",
  DRIVE_TEMPORARY_ERROR: "حدث خطأ مؤقت في Google Drive، حاول مرة أخرى.",
  DRIVE_NOT_CONNECTED: "اربط حساب Google Drive من لوحة الإدارة أولًا.",
  DRIVE_OAUTH_NOT_CONFIGURED: "أضف بيانات Google OAuth أولًا، ثم أعد المحاولة.",
  DRIVE_TOKEN_INVALID: "تعذر قراءة اتصال Google Drive المحفوظ. أعد ربط الحساب.",
  VALIDATION_ERROR: "تحقق من البيانات المدخلة ثم حاول مرة أخرى.",
};

export function userMessage(error: unknown) {
  if (error instanceof AppError) return error.message;
  return "حدث خطأ غير متوقع. حاول مرة أخرى أو تواصل مع المسؤول.";
}
