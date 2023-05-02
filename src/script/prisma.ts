import { PRISMA_CLI } from "@/config/ENV"
import { execSync } from "child_process"

export const prisma = {
  migrate_dev: () => execSync(`${PRISMA_CLI} migrate dev`),
}
