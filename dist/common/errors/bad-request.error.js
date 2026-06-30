"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadRequestError = void 0;
const base_error_1 = require("./base.error");
class BadRequestError extends base_error_1.BaseError {
    constructor(message = "Bad Request") {
        super(400, message);
    }
}
exports.BadRequestError = BadRequestError;
