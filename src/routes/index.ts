import { Router } from "express"
import { user_routes } from "./user_routes"
import { ROUTES } from "@config"

const routes = Router()

routes.get("/", (req, res) => {
  res.status(200).send({ HI: "Hello World!" })
})

routes.use(ROUTES.USER, user_routes)

export { routes }
