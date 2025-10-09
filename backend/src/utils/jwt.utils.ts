import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { IUser } from '../models/User.model';
import config from '../config/app.config';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Generate Access Token
export const generateAccessToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: (user._id as Types.ObjectId).toString(),
    email: user.email,
    role: user.role
  };

  return jwt.sign(
    payload, 
    config.get('JWT_ACCESS_SECRET'), 
    { expiresIn: config.get('JWT_ACCESS_EXPIRES_IN') } as any
  );
};

// Generate Refresh Token
export const generateRefreshToken = (user: IUser): string => {
  const payload = {
    userId: (user._id as Types.ObjectId).toString()
  };

  return jwt.sign(
    payload, 
    config.get('JWT_REFRESH_SECRET'),
    { expiresIn: config.get('JWT_REFRESH_EXPIRES_IN') } as any
  );
};

// Verify Access Token
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.get('JWT_ACCESS_SECRET')) as TokenPayload;
};

// Verify Refresh Token
export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, config.get('JWT_REFRESH_SECRET'));
};

// Generate both tokens
export const generateTokens = (user: IUser) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return { accessToken, refreshToken };
};