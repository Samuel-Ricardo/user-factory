"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const routes_1 = require("./routes");
const _middleware_1 = require("./middleware/index.js");
require("dotenv/config");
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
app.use(routes_1.routes);
app.use(_middleware_1.errorHandler);
