startup:
	make setup_database && npm run start:dev

setup_database:
	npx prisma generate && npx prisma db push && make migration

migration:
	npx prisma migrate deploy

