"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const _config_1 = require("./config/index.js");
const PORT = _config_1.ENV.PORT;
app_1.app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
