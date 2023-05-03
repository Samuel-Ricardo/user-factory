import { IUsersRepository } from "@/repository/IUserRepository"
import { IUserData } from "@Types"
import { UserAlredyExists } from "@config/errors"
import { User } from "@entity"

export class CreateUserService {
  constructor(private repository: IUsersRepository) {}

  async execute({ name, username, email }: IUserData) {
    if (await this.repository.exist(username)) {
      throw UserAlredyExists
    }

    const model = User.create({ name, username, email })
    const user = await this.repository.create(model)
    return user
  }
}
