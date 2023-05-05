import { CreateUserService } from "@/module/createUser/createUserService"
import { IUsersRepository } from "@/repository/IUserRepository"
import { UserRespositoryInMemory } from "@/repository/in-memory/UserRepositoryInMemory"
import { IResponse, IUserData } from "@Types"
import { VALID, ERROR } from "@config"

describe("Create User Service", () => {
  let repository: IUsersRepository
  let service: CreateUserService

  beforeEach(() => {
    repository = new UserRespositoryInMemory()
    service = new CreateUserService(repository)
  })

  it("should be able to create a new user", async () => {
    const user = (await service.execute(VALID.USER)) as IResponse<IUserData>

    expect(user.data).toHaveProperty("id")
    expect(user.data.username).toEqual(VALID.USER.username)
  })

  it("should not be able to create a user with the same username", async () => {
    await service.execute(VALID.USER)

    await expect(service.execute(VALID.USER)).resolves.toEqual(
      ERROR.UserAlredyExists
    )
  })
})
