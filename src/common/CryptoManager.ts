import crypto from 'crypto';
import * as Utils from './Utils';

// salt값 생성:원본값에 salt값을 추가하면 해쉬값이 매번 달라짐.(레인보우 테이블 공격 방지를 위해 사용)
export const createSalt:any = async () =>
    new Promise((resolve, reject) => {
        crypto.randomBytes(64, (err, buf) => {
            if (err) reject(err);
            resolve(buf.toString('base64'));
        });
    });

// 해쉬된 비밀번호 생성하기:salt값도 같이 생성(아래 함수에서 salt값 사용)
export const createHashedPassword:any = async (plainPassword:string) =>
    new Promise(async (resolve, reject) => {
        const salt = await createSalt();
        crypto.pbkdf2(plainPassword, salt, 9999, 64, 'sha512', (err, key) => {
            if (err) reject(err);
            resolve({ passwordHash: key.toString('base64'), salt });
        });
    });

// 검증용 비밀번호 해쉬값 만들기:위에서 생성한 비밀번호 해쉬값과 비교를 위해 사용.
export const makePasswordHashed = async (plainPassword:string, salt:string) =>
    new Promise(async (resolve, reject) => {
        crypto.pbkdf2(plainPassword, salt, 9999, 64, 'sha512', (err, key) => {
            if (err) reject(err);
            resolve(key.toString('base64'));
        });
    });

// 대칭키 생성
export const createDESKey = async (digit:number) => {
    return Utils.getRandomString(true,digit);
};

// 대칭형키를 이용한 암호화 함수(aes-256-cbc)
export const encryptWithDES = async (text:string, desKey:string) => {
    const cipher = crypto.createCipher('aes-256-cbc', desKey);
    let result = cipher.update(text, 'utf8', 'base64');
    result += cipher.final('base64');

    return result;
};

// 대칭형키를 이용한 복호화 함수
export const decryptWithDES = async (cipherText:string, desKey:string) => {
    const decipher = crypto.createDecipher('aes-256-cbc', desKey);
    let result = decipher.update(cipherText, 'base64', 'utf8');
    result += decipher.final('utf8');

    return result;
};