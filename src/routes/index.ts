import { Router } from "express"

const routes = Router()

routes.get("/", (req, res) => {
  res.status(200).send({ HI: "Hello World!" })
})

export { routes }
