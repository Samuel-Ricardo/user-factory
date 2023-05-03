import { VALID } from "@config/consts"
import { IUsersRepository } from "@/repository/IUserRepository"
import { UserRespositoryInMemory } from "@/repository/in-memory/UserRepositoryInMemory"
import { User } from "@entity"

describe("In Memory User repository test", () => {
  let repository: IUsersRepository

  beforeAll(() => {
    repository = new UserRespositoryInMemory()
  })

  it("Should save user sucessfuly", async () => {
    const user = await repository.create(VALID.USER)

    expect(user).toBeInstanceOf(User)
    expect(user).toHaveProperty("id")
    expect(user.name).toEqual(VALID.USER.name)
  })

  it("User should exists", async () => {
    const user = await repository.create(VALID.USER)
    const exists = await repository.exist(user.username)

    expect(exists).toBeTruthy()
  })
})
