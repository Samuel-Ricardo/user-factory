import { NextFunction, Response, Request } from "express"

export function errorHandler(
  err: Error,
  request: Request,
  response: Response,
  next: NextFunction
) {
  console.log("HI :D")

  if (err instanceof Error) return response.status(400).json({ ERROR: err })

  console.log({ err })

  next(err)
  return response
    .status(500)
    .json({ message: `Internal Server Error - ${err}` })
}
