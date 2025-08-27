import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { IUser } from '../models/User.model';

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
    process.env.JWT_SECRET as string, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as any
  );
};

// Generate Refresh Token
export const generateRefreshToken = (user: IUser): string => {
  const payload = {
    userId: (user._id as Types.ObjectId).toString()
  };

  return jwt.sign(
    payload, 
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' } as any
  );
};

// Verify Access Token
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
};

// Verify Refresh Token
export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, process.env.JWT_SECRET as string);
};

// Generate both tokens
export const generateTokens = (user: IUser) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return { accessToken, refreshToken };
};