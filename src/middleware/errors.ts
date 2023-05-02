import { NextFunction, Response, Request } from "express"

export async function errorHandler(
  err: Error,
  request: Request,
  response: Response,
  next: NextFunction
) {
  if (err instanceof Error) return response.status(400).json({ ERROR: err })

  return response
    .status(500)
    .json({ message: `Internal Server Error - ${err}` })
}
