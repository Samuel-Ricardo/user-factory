export class UserAlredyExists extends Error {
  constructor() {
    super("User alredy exists")
  }
}
