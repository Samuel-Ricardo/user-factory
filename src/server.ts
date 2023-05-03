import { app } from "./app"
import { ENV } from "@config"

const PORT = ENV.PORT()

app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`))
