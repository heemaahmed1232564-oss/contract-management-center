CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'CONTRACT_EMPLOYEE');
CREATE TYPE "ContractStatus" AS ENUM ('CREATING', 'CREATED', 'OPENED', 'COMPLETED', 'PDF_EXPORTED', 'SENT', 'FAILED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "TemplateHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'INACCESSIBLE', 'MISSING', 'INVALID');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'CONTRACT_EMPLOYEE',
  "google_folder_id" TEXT,
  "manager_id" TEXT,
  "department" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agencies" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_ar" TEXT,
  "code" TEXT NOT NULL,
  "google_drive_folder_id" TEXT,
  "branding_notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "packages" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "default_duration" INTEGER,
  "default_price" DECIMAL(14,2),
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_templates" (
  "id" TEXT NOT NULL,
  "agency_id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "template_name" TEXT NOT NULL,
  "template_code" TEXT NOT NULL,
  "contract_type" TEXT NOT NULL DEFAULT 'Standard',
  "google_file_id" TEXT NOT NULL,
  "google_file_url" TEXT,
  "duration" INTEGER,
  "price" DECIMAL(14,2),
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "offer_code" TEXT,
  "version" TEXT NOT NULL DEFAULT '1.0',
  "effective_from" TIMESTAMP(3) NOT NULL,
  "effective_to" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "health_status" "TemplateHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
  "health_error" TEXT,
  "last_health_checked_at" TIMESTAMP(3),
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "generated_contracts" (
  "id" TEXT NOT NULL,
  "reference_number" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "original_template_id" TEXT NOT NULL,
  "original_template_name" TEXT NOT NULL,
  "original_template_version" TEXT NOT NULL,
  "original_google_file_id" TEXT NOT NULL,
  "copied_google_file_id" TEXT,
  "copied_google_file_url" TEXT,
  "copied_file_name" TEXT NOT NULL,
  "agency_id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "contract_type" TEXT NOT NULL,
  "duration" INTEGER,
  "price" DECIMAL(14,2),
  "currency" TEXT NOT NULL,
  "offer_code" TEXT,
  "client_name" TEXT,
  "client_phone" TEXT,
  "client_email" TEXT,
  "notes" TEXT,
  "created_by" TEXT NOT NULL,
  "employee_folder_id" TEXT NOT NULL,
  "status" "ContractStatus" NOT NULL DEFAULT 'CREATING',
  "error_code" TEXT,
  "error_message" TEXT,
  "google_error_details" JSONB,
  "opened_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "generated_contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "details" JSONB,
  "ip_address" TEXT,
  "request_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "system_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "google_drive_root_folder_id" TEXT,
  "shared_drive_id" TEXT,
  "naming_pattern" TEXT NOT NULL DEFAULT '{reference_number} - {agency_code} - {package_code} - {client_name} - {employee_name} - {date}',
  "reference_prefix" TEXT NOT NULL DEFAULT 'CTR',
  "new_file_permission" TEXT NOT NULL DEFAULT 'INHERIT_FROM_FOLDER',
  "retention_days" INTEGER NOT NULL DEFAULT 2555,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reference_counters" (
  "year" INTEGER NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reference_counters_pkey" PRIMARY KEY ("year")
);

CREATE TABLE "favorites" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "agency_id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_manager_id_idx" ON "users"("manager_id");
CREATE UNIQUE INDEX "agencies_code_key" ON "agencies"("code");
CREATE INDEX "agencies_is_active_idx" ON "agencies"("is_active");
CREATE UNIQUE INDEX "packages_code_key" ON "packages"("code");
CREATE INDEX "packages_is_active_idx" ON "packages"("is_active");
CREATE INDEX "contract_templates_agency_id_package_id_is_active_idx" ON "contract_templates"("agency_id", "package_id", "is_active");
CREATE INDEX "contract_templates_effective_from_effective_to_idx" ON "contract_templates"("effective_from", "effective_to");
CREATE UNIQUE INDEX "contract_templates_agency_id_template_code_version_key" ON "contract_templates"("agency_id", "template_code", "version");
CREATE UNIQUE INDEX "contract_templates_one_active_default_idx" ON "contract_templates" (
  "agency_id", "package_id", "contract_type", COALESCE("duration", -1),
  COALESCE("price", -1), "currency", COALESCE("offer_code", '')
) WHERE "is_active" = true AND "is_default" = true AND "archived_at" IS NULL;
CREATE UNIQUE INDEX "generated_contracts_reference_number_key" ON "generated_contracts"("reference_number");
CREATE UNIQUE INDEX "generated_contracts_idempotency_key_key" ON "generated_contracts"("idempotency_key");
CREATE UNIQUE INDEX "generated_contracts_request_id_key" ON "generated_contracts"("request_id");
CREATE INDEX "generated_contracts_created_by_created_at_idx" ON "generated_contracts"("created_by", "created_at");
CREATE INDEX "generated_contracts_agency_id_package_id_created_at_idx" ON "generated_contracts"("agency_id", "package_id", "created_at");
CREATE INDEX "generated_contracts_status_created_at_idx" ON "generated_contracts"("status", "created_at");
CREATE INDEX "generated_contracts_client_name_idx" ON "generated_contracts"("client_name");
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");
CREATE UNIQUE INDEX "favorites_user_id_agency_id_package_id_key" ON "favorites"("user_id", "agency_id", "package_id");

ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_original_template_id_fkey" FOREIGN KEY ("original_template_id") REFERENCES "contract_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
