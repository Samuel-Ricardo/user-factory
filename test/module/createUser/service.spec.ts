import { CreateUserService } from "@/module/createUser/createUserService"
import { IUsersRepository } from "@/repository/IUserRepository"
import { UserRespositoryInMemory } from "@/repository/in-memory/UserRepositoryInMemory"
import { VALID } from "@config"

describe("Create User Service", () => {
  let repository: IUsersRepository
  let service: CreateUserService

  beforeAll(() => {
    repository = new UserRespositoryInMemory()
    service = new CreateUserService(repository)
  })

  it("should be able to create a new user", async () => {
    const user = await service.execute(VALID.USER)

    expect(user).toHaveProperty("id")
    expect(user.username).toEqual(VALID.USER.username)
  })
})
