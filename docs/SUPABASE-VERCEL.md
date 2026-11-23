# Deploy VIJAYA with Supabase and Vercel

This guide uses **Supabase PostgreSQL** for application records and a **private Supabase Storage bucket** for CMS uploads. VIJAYA keeps its existing staff and customer sign-in. All database access goes through the Next.js server.

## 1. Create a Supabase project

1. Open the [Supabase dashboard](https://supabase.com/dashboard), create a project and save the database password.
2. From the project, open **Connect** and copy the **Session pooler** and **Transaction pooler** connection strings. Use the exact region host shown for your project.
3. Append `schema=vijaya` to both strings. Add `sslmode=require` to both, and `pgbouncer=true&connection_limit=2` to the transaction string. URL-encode special characters in the database password.
4. Keep `vijaya` out of the Supabase Data API **Exposed schemas** setting. The migration enables RLS on all application tables and revokes browser-role access.

[Supabase Prisma setup](https://supabase.com/docs/guides/database/prisma) · [Pooler modes](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits)

## 2. Apply migrations from your computer

Use Node.js 22. Put credentials in the local ignored `.env` file.

```bash
git clone https://github.com/akmsaleemdev/Vijaya_Web.git
cd Vijaya_Web
npm ci
cp .env.example .env
```

| Local variable | Value |
| --- | --- |
| `DIRECT_URL` | Supabase session pooler on port `5432` with `schema=vijaya&sslmode=require` |
| `DATABASE_URL` | The same session-pooler URL for this migration and import step |
| `SEED_ADMIN_EMAIL` | `admin@vicc.in` |
| `SEED_ADMIN_PASSWORD` | A new temporary password for a fresh installation. The admin changes it at first sign-in. |

```bash
npm run db:deploy
```

**Fresh installation:** skip Step 3 and seed the administrator and venue inventory with `npm run db:seed`.

**Existing website:** complete Step 3 before seeding. Importing before seeding preserves existing users, content and venue IDs.

On Windows PowerShell, use `Copy-Item .env.example .env` in place of the `cp` command.

## 3. Import an existing SQLite installation, if applicable

1. Test the procedure on a separate Supabase project first.
2. Stop booking and CMS writes on the old installation. Create a SQLite backup using `sqlite3 db/custom.db ".backup 'vijaya-backup.db'"`. Keep the backup and the existing uploads directory private.
3. With the PostgreSQL migration applied to an empty target, run:

```bash
npm run db:import-sqlite -- /path/to/vijaya-backup.db
npm run db:seed
```

The importer copies durable records in a single transaction, preserves IDs and rejects a populated target. It excludes login counters and sessions, so users sign in again after the switch. Review the copied row counts against the source. PostgreSQL rolls back the import if the legacy database contains overlapping active reservations. Resolve conflicts in the source and take another backup before retrying.

If your old site has CMS uploads, copy the files into the new Storage bucket with **their original filenames**, at the bucket root. The imported media records retain those names. Bundled public images and videos travel with the Git repository.

## 4. Create the runtime database role and media bucket

In the Supabase SQL Editor, run the following once. Substitute a strong generated password locally. This role accesses the application tables through Prisma and has no schema migration privileges.

```sql
create role vijaya_runtime login password '<generated-runtime-password>';
grant usage on schema vijaya to vijaya_runtime;
do $$
declare item record;
begin
  for item in select tablename from pg_tables
    where schemaname = 'vijaya' and tablename <> '_prisma_migrations'
  loop
    execute format('grant select, insert, update, delete on vijaya.%I to vijaya_runtime', item.tablename);
    execute format('create policy vijaya_server on vijaya.%I to vijaya_runtime using (true) with check (true)', item.tablename);
  end loop;
end $$;
```

Use the SQL role name in the Vercel transaction URL. With the shared pooler, the username is `vijaya_runtime.PROJECT_REF`. If a future migration creates new tables, grant the runtime role access and add the same role-scoped policy to those tables.

In Supabase **Storage**, create a **private** bucket named `vijaya-media`. In the project's **API Keys** settings, create a server secret key for Storage and copy the project URL. The CMS upload endpoint accepts files up to 4 MiB.

[Supabase Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) · [Supabase API keys](https://supabase.com/docs/guides/api/api-keys)

## 5. Import the GitHub repository into Vercel

1. Go to [Vercel](https://vercel.com/new), choose **Import Git Repository**, and select `akmsaleemdev/Vijaya_Web`.
2. Choose **Next.js**, use the repository root, and select Node.js 22. The default build runs `npm run build`, which includes Next.js compilation. Prisma generates its client during install. Run database migrations separately from your computer before deploying schema changes.
3. Add these variables to the **Production** environment. Use a separate Supabase project and separate secrets for previews.

| Vercel variable | Value |
| --- | --- |
| `DATABASE_URL` | Transaction pooler URL for `vijaya_runtime.PROJECT_REF` |
| `NEXTAUTH_URL` | The exact HTTPS origin used for staff login, such as `https://www.example.com` |
| `NEXTAUTH_SECRET`, `AUTH_SECRET` | Two independently generated values |
| `TRUSTED_CLIENT_IP_HEADER` | `x-vercel-forwarded-for` |
| `SUPABASE_URL` | The Supabase project HTTPS URL |
| `SUPABASE_STORAGE_SECRET_KEY` | The server Storage key |
| `SUPABASE_MEDIA_BUCKET` | `vijaya-media` |
| `ENABLE_SANDBOX_PAYMENTS` | `false` for production |
| `PAYMENT_CONFIG_ENCRYPTION_KEY` | Optional for staging credential setup. Use a separate 64-character hex key and preserve it for stored credentials. |

Generate each secret separately with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. `DIRECT_URL` and the seed password stay on your computer. Optional CRM and SMTP variables are listed in `.env.example`.

4. Deploy `main`. If you connect a custom domain or change environment variables, update `NEXTAUTH_URL` and redeploy.

[Vercel Git deployment](https://vercel.com/docs/git) · [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)

## 6. Verify bookings and payment settings

1. Open `/admin/login`. Sign in and complete any required password change.
2. Open **Payment gateways** and confirm **Offline** mode. Submit a venue request from the public site. It should return a reference and appear as **Pending approval** in the admin panel.
3. Try the same venue and time again. It should be unavailable. Confirm the first request in admin and verify that no payment was created. Reject or cancel a separate request to verify its slot becomes available.
4. In the CMS, upload a small image and confirm it still loads after a redeploy.
5. To exercise the simulator on a separate test deployment, set `ENABLE_SANDBOX_PAYMENTS=true`, redeploy, then select **Sandbox** in **Payment gateways**. Venues marked as requiring staff approval still use request-only checkout.

In **Payment gateways**, the Super Admin can select a planned provider and save **Razorpay Test** or **Stripe Test** credentials. Configure the encryption key before saving. The built-in simulator handles checkout today. Connecting real provider checkout and signed webhooks is a separate activation step. Test keys and live keys belong to separate provider environments.

[Stripe keys](https://docs.stripe.com/keys) · [Razorpay API keys](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/)

### Local standalone tests

Create a disposable local PostgreSQL database with a name ending in `_test`, then set `CMS_TEST_DATABASE_URL` to its connection URL with `schema=vijaya`. Run `npm run build:standalone` followed by `npm test`. The suite applies migrations to the test database and leaves its records for inspection.
