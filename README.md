# Plane

## Known `npm audit` warnings

`npm audit` in `backend/` reports high-severity advisories in `mysql2`. The package comes from the Prisma 7 CLI (`prisma`), which ships drivers for every database it supports. The advisories only apply when connecting to a MySQL server. Plane uses PostgreSQL through `@prisma/adapter-pg` and never connects to MySQL, so they are safe to ignore. The only fix npm offers is a downgrade to Prisma 6, so the warnings are left as they are.
