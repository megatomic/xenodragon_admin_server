const speakeasy = require("speakeasy");

export const verifyOTPCode = (serverType:string,otpCode:string): boolean => {

    let secretCode;
    if(serverType.toUpperCase() === 'LIVE') {
        secretCode = process.env.LIVE_OTP_SECRETCODE;
    } else {
        secretCode = process.env.DEV_OTP_SECRETCODE;
    }

    const verified = speakeasy.totp.verify({
        secret: secretCode,
        encoding: 'base32',
        algorithm: 'sha512',
        token: otpCode
    });

    return verified;
};