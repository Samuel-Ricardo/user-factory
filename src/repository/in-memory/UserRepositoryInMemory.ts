import { User } from "@/entity"
import { IUsersRepository } from "../IUserRepository"
import { v5 as uuid } from "uuid"

export class UserRespositoryInMemory implements IUsersRepository {
  private users: User[] = []

  async exist(username: string): Promise<boolean> {
    const user = this.users.some((user) => user.name === username)
    return user
  }

  async create(user: User): Promise<User> {
    user = { ...user, id: uuid() + "" }
    this.users.push(user)
    return user
  }
}
