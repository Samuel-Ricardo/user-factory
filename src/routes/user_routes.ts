import { createUserFactory } from "@/module/createUser/factory"
import { Router } from "express"

const user_routes = Router()

user_routes.post("/", (req, res) => {
  createUserFactory().handle(req, res)
})

export { user_routes }
