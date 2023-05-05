import { IUsersRepository } from "@/repository/IUserRepository"
import { IError, IResponse, IUserData } from "@Types"
import { User } from "@entity"
import { ERROR } from "@config"

export class CreateUserService {
  constructor(private repository: IUsersRepository) {}

  async execute({
    name,
    username,
    email,
  }: IUserData): Promise<IResponse<IUserData | IError>> {
    if (await this.repository.exist(username)) {
      return ERROR.UserAlredyExists
    }

    const model = User.create({ name, username, email })
    const user = await this.repository.create(model)

    return { error: false, status: 201, data: user } as IResponse<IUserData>
  }
}
