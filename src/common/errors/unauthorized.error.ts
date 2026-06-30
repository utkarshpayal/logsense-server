import { BaseError } from "./base.error";

export class UnauthorizedError extends BaseError {
  constructor(message: string = "Unauthorized") {
    super(401, message);
  }
}
