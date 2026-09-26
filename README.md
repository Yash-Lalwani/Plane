# Plane

## Known `npm audit` warnings

`npm audit` in `backend/` reports high-severity advisories that all come from the Prisma 7 CLI (`prisma`). They are safe to ignore:

- **`mysql2`**: the CLI ships drivers for every database it supports. The advisories only apply when connecting to a MySQL server. Plane uses PostgreSQL through `@prisma/adapter-pg` and never connects to MySQL.
- **`deepmerge-ts`** (through `@prisma/config`): the CLI uses it to merge our own `prisma.config.ts`. The advisory needs attacker-controlled recursive objects. No request data ever reaches this code.

The only fix npm offers is a downgrade to Prisma 6, so the warnings are left as they are.
