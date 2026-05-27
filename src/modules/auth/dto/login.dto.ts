import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @Matches(/^1\d{10}$/, { message: '请输入正确的手机号' })
  phone!: string;

  @IsString()
  @Length(6, 32)
  password!: string;
}
