import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ApiException } from '../../shared/api-exception';
import { PrismaService } from '../../shared/prisma.service';
import { RedisService } from '../../shared/redis.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

const ACCESS_TTL_SECONDS = 60 * 60 * 2;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new ApiException('手机号已注册', 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        nickname: dto.nickname,
        passwordHash,
      },
    });

    return {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new ApiException('手机号或密码错误', 401);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new ApiException('手机号或密码错误', 401);
    }

    return this.issueTokens(user.id, user.phone);
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.jwtService
      .verifyAsync<{ sub: string; phone: string }>(dto.refreshToken, {
        secret: process.env.JWT_SECRET || 'account-book-jwt-secret',
      })
      .catch(() => {
        throw new ApiException('刷新令牌无效', 401);
      });

    const stored = await this.redisService.get(`refresh:${payload.sub}`);
    if (stored !== dto.refreshToken) {
      throw new ApiException('刷新令牌已失效', 401);
    }

    return this.issueTokens(payload.sub, payload.phone, false);
  }

  async logout(userId: string) {
    await this.redisService.del(`refresh:${userId}`);
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new ApiException('用户不存在', 404);
    }
    return user;
  }

  private async issueTokens(userId: string, phone: string, withRefresh = true) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, phone },
      {
        secret: process.env.JWT_SECRET || 'account-book-jwt-secret',
        expiresIn: ACCESS_TTL_SECONDS,
      },
    );

    let refreshToken: string | undefined;
    if (withRefresh) {
      refreshToken = await this.jwtService.signAsync(
        { sub: userId, phone },
        {
          secret: process.env.JWT_SECRET || 'account-book-jwt-secret',
          expiresIn: REFRESH_TTL_SECONDS,
        },
      );
      await this.redisService.set(`refresh:${userId}`, refreshToken, REFRESH_TTL_SECONDS);
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL_SECONDS,
    };
  }
}
