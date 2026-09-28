# Restoring the database

The nightly backup workflow (`.github/workflows/backup.yml`) writes a gzipped `mongodump`
to a private S3 bucket, one per day, keeping 14. This is the only copy of the
applications, club logins and OTP records: Atlas's free M0 tier takes no automatic backups.

**Practise this once on a scratch database before you need it.** A restore you have never
run is not a backup.

## Before you start

- The `MONGO_URI` secret from the backup workflow (includes the database name).
- The bucket, prefix and region, also secrets on the repository.
- The [MongoDB database tools](https://www.mongodb.com/docs/database-tools/installation/).
  On Windows: `winget install MongoDB.DatabaseTools`.

## 1. List what is there

```bash
aws s3 ls s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/
# joinclub/2026-09-28-backup.archive.gz
# joinclub/2026-09-29-backup.archive.gz
```

Check the size before trusting it. A few kilobytes means the dump was empty or the
upload silently failed.

## 2. Restore into a scratch database, never over production

Give the scratch database a different name by appending `-restore` to the URI:

```bash
export MONGO_URI='mongodb://.../joinclub-restore'   # note the -restore suffix

aws s3 cp "s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/2026-09-29-backup.archive.gz" ./backup.archive.gz
mongorestore --uri="$MONGO_URI" --archive=./backup.archive.gz --gzip --nsInclude='joinclub.*'
```

## 3. Check it worked

```bash
mongosh "$MONGO_URI" --quiet --eval 'db.getCollectionNames()'
# applications, chatsessions, chatmessages, clubs, events, otps, rateLimits, users, openings, aiusages

mongosh "$MONGO_URI" --quiet --eval 'JSON.stringify({
  clubs:       db.clubs.countDocuments(),
  users:       db.users.countDocuments(),
  openings:    db.openings.countDocuments(),
  applications:db.applications.countDocuments()
})'
```

Then start the API against the scratch database and click through: a club page, an
applicants list, a student login.

```bash
MONGO_URI="$MONGO_URI" SECRET_KEY="$(openssl rand -hex 32)" npm start
```

## 4. Restoring over production

Only when the live database is damaged or lost.

1. **Stop the API first** (Render/Railway: set the service to manual and stop it). A
   restore under a running app loses writes and can leave indexes half-rebuilt.
2. Restore into a **new** database name first (`joinclub-restore-2`), verify it, then
   switch `MONGO_URI` over to it. Never restore on top of a live database.
3. Redeploy. Check `/api/health` reports `"status": "ok"`.
4. Every club admin's session cookie stops working, because the restored `tokenVersion`
   values are the ones from the backup. Students and admins just sign in again.

## What is not in the backup

- Uploaded files. Profile photos, resumes and club logos live in Cloudinary, not MongoDB,
  and are **not** covered by this. Cloudinary has its own backups on paid plans.
- The scraped club JSON. That is in git (`backend/data/pec-clubs.json`).
- Secrets. `.env` is not backed up. Keep a copy in a password manager.

## If the nightly job fails

The workflow sends no email by default. Check the Actions tab, and look for the log line
`Uploaded s3://...`. A silent failure is the normal case, so consider adding a notification
(step summary is already written; add a Slack or email step if you want to be told).
