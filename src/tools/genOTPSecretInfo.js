// OTP QR코드 및  URL, 시크릿코드 생성하는 소스코드
// 실행하여 출력된 결과를 .env 및 temp/.env_deploy, temp/.env_local에 똑같이 반영할 것!
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const secret = speakeasy.generateSecret({
    length: 20,
    name: 'Bale',
    issuer: 'bale@nstepcorp.io'
});

var url = speakeasy.otpauthURL({
    secret: secret.ascii,
    issuer: 'Xenodragon Administrator',
    label: 'bale@nstepcorp.io',
    algorithm: 'sha512',
    period: 30
});

QRCode.toDataURL(url, async (err, imageData) => {
    console.log('qrcode image: ',imageData),
    console.log('url: ',url),
    console.log('secret.base32: ',secret.base32)
});