import { BaseError } from "./base.error";

export class BadRequestError extends BaseError {
  constructor(message: string = "Bad Request") {
    super(400, message);
  }
}
