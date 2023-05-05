import { Request, Response } from "express"
import { CreateUserService } from "./createUserService"

export class CreateUserController {
  constructor(private service: CreateUserService) {}

  async handle(req: Request, res: Response) {
    const { name, username, email } = req.body
    const user = await this.service.execute({ name, username, email })

    if (user.error) return res.status(user.status).json({ response: user })

    return res.status(201).json({ user })
  }
}
