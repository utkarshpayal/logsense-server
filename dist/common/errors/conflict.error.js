"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = void 0;
const base_error_1 = require("./base.error");
class ConflictError extends base_error_1.BaseError {
    constructor(message = "Conflict") {
        super(409, message);
    }
}
exports.ConflictError = ConflictError;
