export interface IResponse<D> {
  status: number
  error: boolean
  data: D
}
