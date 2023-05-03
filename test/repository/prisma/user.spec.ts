/*
 *@jest-environment ./prisma/prisma-environment-jest
 */

import { IUsersRepository } from "@/repository/IUserRepository"
import { PrismaUserRepository } from "@/repository/prisma/PrismaUserRepository"
import { VALID } from "@config/consts"

describe("Prisma User repository test", () => {
  let repository: IUsersRepository

  beforeAll(() => {
    repository = new PrismaUserRepository()
  })

  it("It Should Save Successfully", async () => {
    const user = await repository.create(VALID.USER)

    console.log(user)

    expect(user).toHaveProperty("id")
    expect(user.name).toEqual(VALID.USER.name)
  })
})
