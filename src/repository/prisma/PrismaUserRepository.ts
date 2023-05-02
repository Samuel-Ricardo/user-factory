import { User } from "@entity"
import { prisma } from "@database"
import { IUsersRepository } from "../IUserRepository"

export class PrismaUserRepository implements IUsersRepository {
  async exist(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { username },
    })

    return !!user
  }

  async create({ username, email, name }: User): Promise<User> {
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
      },
    })

    return user
  }
}
