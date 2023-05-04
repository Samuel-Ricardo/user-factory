import { IUsersRepository } from "@/repository/IUserRepository"
import { IUserData } from "@Types"
import { User } from "@entity"
import { ERROR } from "@config"

export class CreateUserService {
  constructor(private repository: IUsersRepository) {}

  async execute({ name, username, email }: IUserData) {
    if (await this.repository.exist(username)) {
      throw new ERROR.UserAlredyExists()
    }

    const model = User.create({ name, username, email })
    const user = await this.repository.create(model)
    return user
  }
}
