import { randomInt } from 'crypto';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

export const generateOTP = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH;
  return randomInt(min, max).toString();
};

export const isOTPExpired = (expiresAt) => {
  return Date.now() > new Date(expiresAt).getTime();
};

export const getOTPExpiryTime = () => {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
};

export const hasExceededAttempts = (attempts) => {
  return attempts >= MAX_OTP_ATTEMPTS;
};

export { OTP_EXPIRY_MINUTES, MAX_OTP_ATTEMPTS };
