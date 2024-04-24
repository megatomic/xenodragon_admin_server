const speakeasy = require("speakeasy");
const dotenv = require('dotenv');
const path = require('path');

// .env파일 경로 지정하여 읽어오기
(() => {
    const result = dotenv.config({ path: path.join(__dirname, '../..', '.env') }); // .env 파일의 경로를 dotenv.config에 넘겨주고 성공여부를 저장함
    if (result.parsed == undefined)
      // .env 파일 parsing 성공 여부 확인
      throw new Error('Cannot loaded environment variables file.'); // parsing 실패 시 Throwing
  })();

const verified = speakeasy.totp.verify({
    secret: process.env.OTP_SECRETCODE,
    encoding: 'base32',
    algorithm: 'sha512',
    token: process.argv[2]
});

console.log('SECRET CODE:',process.env.OTP_SECRETCODE);
console.log(`verification for otp(${process.argv[2]}) ${verified===true?'is successful':'falied'}.`);