export const DATABASE_URL = () => process.env.DATABASE_URL as string
export const PORT = () => process.env.PORT || 3000
export const GLOBAL = () => process.env
export const PRISMA_CLI = "./node_modules/.bin/prisma"
