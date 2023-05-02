import { User } from "@entity"

export interface IUsersRepository {
  create(user: User): Promise<User>
  exist(username: string): Promise<boolean>
}
