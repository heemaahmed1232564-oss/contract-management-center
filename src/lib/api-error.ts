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

const errorMessagesEn: Record<string, string> = {
  UNAUTHORIZED: "Sign in to continue.",
  FORBIDDEN: "You do not have permission to perform this action.",
  USER_DISABLED: "This account is disabled. Contact the system administrator.",
  SESSION_REVOKED: "Your session has expired. Sign in again.",
  AGENCY_INACTIVE: "The selected company is inactive.",
  PACKAGE_INACTIVE: "The selected package is inactive.",
  TEMPLATE_NOT_FOUND: "No template matches the selected company, package, and options.",
  TEMPLATE_AMBIGUOUS: "More than one template matches. Choose the required template.",
  TEMPLATE_INACTIVE: "The selected template is inactive.",
  TEMPLATE_EXPIRED: "This contract template version has expired.",
  TEMPLATE_ACCESS_DENIED: "The application cannot access the contract template.",
  EMPLOYEE_FOLDER_UNAVAILABLE: "The employee folder is missing or inaccessible.",
  COPY_FAILED: "The contract copy could not be created. Try again.",
  COPY_ID_INVALID: "The new copy could not be verified. The original template was not used.",
  DUPLICATE_IN_PROGRESS: "A matching request is already in progress.",
  DUPLICATE_WARNING: "A similar contract was created for this client recently.",
  RATE_LIMITED: "Too many attempts were made in one minute. Wait and try again.",
  DATABASE_AFTER_COPY_FAILED: "The copy was created, but the operation could not be saved.",
  DRIVE_TEMPORARY_ERROR: "Google Drive returned a temporary error. Try again.",
  DRIVE_NOT_CONNECTED: "Connect Google Drive from the admin overview first.",
  DRIVE_NOT_CONFIGURED: "Google Drive credentials have not been configured.",
  DRIVE_OAUTH_NOT_CONFIGURED: "Add the Google OAuth configuration and try again.",
  DRIVE_ENCRYPTION_NOT_CONFIGURED: "Google Drive connection encryption is not configured.",
  DRIVE_TOKEN_INVALID: "The saved Google Drive connection could not be read. Reconnect the account.",
  DRIVE_CREDENTIALS_INVALID: "The Service Account credentials are invalid.",
  INVALID_GOOGLE_FILE: "A valid Google File ID could not be extracted.",
  GOOGLE_DOCS_API_DISABLED: "Enable Google Docs API in the connected Google Cloud project, then try again.",
  GOOGLE_DOCS_POSITIONING_FAILED: "The certification position could not be prepared in Google Docs.",
  CONTRACT_TABLE_NOT_FOUND: "No table was found in the contract template.",
  CONTRACT_NOT_FOUND: "The contract was not found.",
  CONTRACT_NOT_READY: "Create the Google Docs copy before certifying this contract.",
  CERTIFICATION_IDENTITY_MISSING: "Upload the company stamp and signature before certification.",
  CERTIFICATION_FAILED: "The certified PDF could not be created.",
  PDF_EMPTY: "The PDF does not contain any pages.",
  WEAK_PASSWORD: "The password must contain at least 8 characters.",
  RESET_TOKEN_INVALID: "The password reset link is invalid or has expired.",
  VALIDATION_ERROR: "Check the entered information and try again.",
};

export function userMessage(error: unknown, locale: "ar" | "en" = "ar") {
  if (error instanceof AppError) {
    return locale === "en"
      ? errorMessagesEn[error.code] ?? "The action could not be completed. Try again."
      : error.message;
  }
  return locale === "en"
    ? "An unexpected error occurred. Try again or contact the administrator."
    : "حدث خطأ غير متوقع. حاول مرة أخرى أو تواصل مع المسؤول.";
}
