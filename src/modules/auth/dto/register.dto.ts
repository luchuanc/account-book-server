import { IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @Matches(/^1\d{10}$/, { message: '请输入正确的手机号' })
  phone!: string;

  @IsString()
  @Length(2, 24)
  nickname!: string;

  @IsString()
  @Length(6, 32)
  password!: string;
}
