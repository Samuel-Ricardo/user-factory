import { User } from "@/entity"
import { IUsersRepository } from "../IUserRepository"
import { v5 as uuid } from "uuid"

export class UserRespositoryInMemory implements IUsersRepository {
  private users: User[] = []

  exist(username: string): Promise<boolean> {
    throw new Error("Method not implemented.")
  }

  async create(user: User): Promise<User> {
    Object.assign(user, { id: uuid() })
    this.users.push(user)
    return user
  }
}
