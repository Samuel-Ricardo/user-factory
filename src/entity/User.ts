import { IUserData } from "@Types"

export class User {
  id?: string
  name!: string
  username!: string
  email!: string

  private constructor({ name, username, email }: User) {
    return Object.assign(this, { name, username, email })
  }

  static create({ username, email, name }: IUserData) {
    const user = new User({ username, name, email })
    return user
  }
}
