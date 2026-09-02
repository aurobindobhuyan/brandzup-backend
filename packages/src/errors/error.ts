export class OperationalError extends Error {
  public statusCode: number;
  public override message: string;

  constructor(statusCode: number = 500, message: string = "Server error") {
    super(message);

    //  This is a fix for incorrect instanceOf
    Object.setPrototypeOf(this, OperationalError.prototype);
    Error.captureStackTrace(this, this.constructor);

    this.statusCode = statusCode;
    this.message = message;
    this.name = "Operational Error";
  }
}

export class RouteNotFound extends Error {
  public override name: string;
  public statusCode: number = 404;
  public override message: string;
  public stackTrace: any;

  constructor(message: string, stackTrace?: any) {
    super(message);

    //  This is a fix for incorrect instanceOf
    Object.setPrototypeOf(this, RouteNotFound.prototype);
    Error.captureStackTrace(this, this.constructor);

    this.name = "Route not found";
    this.message = message;
    this.stackTrace = stackTrace;
  }
}
