import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260606160000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "b2b_invite" ("id" text not null, "email" text not null, "company_id" text not null, "token_hash" text not null, "spending_limit" numeric null default null, "raw_spending_limit" jsonb null default null, "expires_at" timestamptz not null, "used_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "b2b_invite_pkey" primary key ("id"));'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_b2b_invite_company_id" ON "b2b_invite" (company_id) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_b2b_invite_token_hash" ON "b2b_invite" (token_hash) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'alter table if exists "b2b_invite" add constraint "b2b_invite_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;'
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table if exists "b2b_invite" drop constraint if exists "b2b_invite_company_id_foreign";'
    );
    this.addSql('drop table if exists "b2b_invite" cascade;');
  }
}
