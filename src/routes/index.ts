import { Router } from "express"
import { user_routes } from "./user_routes"

const routes = Router()

routes.get("/", (req, res) => {
  res.status(200).send({ HI: "Hello World!" })
})

routes.use("/user", user_routes)

export { routes }
