/*
 *@jest-environment ./prisma/prisma-environment-jest
 */

import { IUsersRepository } from "@/repository/IUserRepository"
import { PrismaUserRepository } from "@/repository/prisma/PrismaUserRepository"
import { VALID } from "@config/consts"
import { User } from "@entity"

describe("Prisma User repository test", () => {
  let repository: IUsersRepository

  beforeAll(() => {
    repository = new PrismaUserRepository()
  })

  afterEach(() => {
    VALID.USER = {
      name: VALID.USER.name + Math.random(),
      username: VALID.USER.username + Math.random(),
      email: VALID.USER.email + Math.random(),
    }
  })

  it("It Should Save Successfully", async () => {
    const user = await repository.create(VALID.USER)

    expect(user).toHaveProperty("id")
    expect(user.name).toEqual(VALID.USER.name)
  })

  it("User Should Exists", async () => {
    const user = await repository.create(VALID.USER)
    const exists = await repository.exist(user.username)

    expect(exists).toBeTruthy()
  })
})
