import { IUserData } from "@Types"
import { User } from "@entity"

export interface IUsersRepository {
  create(user: IUserData): Promise<User>
  exist(name: string): Promise<boolean>
}
