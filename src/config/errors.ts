import { IError, IResponse } from "@Types"

export const UserAlredyExists: IResponse<IError> = {
  error: true,
  status: 400,
  data: { message: "User alredy exists" },
}

//export class UserAlredyExists extends Error {
//  constructor() {
//    super("User alredy exists")
//  }
//}
