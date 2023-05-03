import { PrismaUserRepository } from "@/repository/prisma/PrismaUserRepository"
import { CreateUserService } from "./createUserService"
import { CreateUserController } from "./controller"

export const createUserFactory = () => {
  const userRepository = new PrismaUserRepository()
  const createUserService = new CreateUserService(userRepository)
  const createUserController = new CreateUserController(createUserService)

  return createUserController
}
