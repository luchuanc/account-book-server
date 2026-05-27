import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(message: string, status = HttpStatus.BAD_REQUEST, code = status) {
    super(
      {
        code,
        message,
        data: null,
      },
      status,
    );
  }
}
