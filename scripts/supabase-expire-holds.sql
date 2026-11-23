-- Apply as the migration owner in Supabase SQL Editor after prisma migrate deploy.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('vijaya-expire-holds', '* * * * *', 'SELECT vijaya.expire_holds()');
