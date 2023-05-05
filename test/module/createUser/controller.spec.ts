import { app } from "@/app"
import { ROUTES, VALID } from "@config"
import { Response } from "express"
import request from "supertest"

describe("Create User Controller", () => {
  beforeEach(() => {
    VALID.USER = {
      ...VALID.USER,
      username: VALID.USER.username + Math.random(),
      email: VALID.USER.email + Math.random(),
      name: VALID.USER.name + Math.random(),
    }
  })

  it("should be able to create a new user", async () => {
    const response = await request(app).post(ROUTES.USER).send(VALID.USER)

    expect(response.status).toBe(201)
    expect(response.body.user.data).toHaveProperty("id")
  })

  it("should not be able to create a user with the same username", async () => {
    await request(app).post(ROUTES.USER).send(VALID.USER)

    const response = await request(app).post(ROUTES.USER).send(VALID.USER)

    expect(response.status).toBe(400)
  })
})
