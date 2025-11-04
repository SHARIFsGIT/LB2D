import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Verify device session with refresh token
    const deviceSession = await this.prisma.deviceSession.findFirst({
      where: {
        userId: payload.sub,
        refreshToken,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!deviceSession) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!deviceSession.user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    return {
      userId: deviceSession.user.id,
      email: deviceSession.user.email,
      role: deviceSession.user.role,
      deviceId: deviceSession.deviceId,
      refreshToken,
    };
  }
}
