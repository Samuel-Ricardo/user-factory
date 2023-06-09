import { User } from "@/entity"
import { IUsersRepository } from "../IUserRepository"
import { v4 as uuid } from "uuid"

export class UserRespositoryInMemory implements IUsersRepository {
  private users: User[] = []

  async exist(username: string): Promise<boolean> {
    const user = this.users.some((user) => user.username === username)
    return user
  }

  async create(user: User): Promise<User> {
    user = User.create({ ...user })
    user.id = uuid()

    this.users.push(user)
    return user
  }
}
