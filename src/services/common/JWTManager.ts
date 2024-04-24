import dotenv from 'dotenv';
import jwt,{Secret, Algorithm, SignOptions, VerifyOptions, Jwt} from 'jsonwebtoken';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import {ResultCode} from 'src/common/ResponseManager';
import dayjs from 'dayjs';

const fs = require('fs');

// 토큰 검증결과 정보
export type VerifyResultInfo = {
    resultCode:number
    decodedToken:any
};

// JWT 토큰 발급/관리용 클래스
export default class JWTManager {

    private _master: boolean;
    private _algorithm: any;
    private _privateKey: any;
    private _publicKey: any;
    private _secretKey: any;
    private _expireDate: string;
    private _issuer: string;

    constructor(master:boolean) {

        this._privateKey = undefined;
        this._publicKey = undefined;
        this._secretKey = undefined;

        this._master = master;
        if(master === true) {
            this._privateKey = <Secret>fs.readFileSync(process.env.MASTER_PRIVKEY,'utf8');
            this._publicKey = <Secret>fs.readFileSync(process.env.MASTER_PUBKEY,'utf8');
            this._algorithm = <Algorithm>'RS256';
            this._expireDate = <string>process.env.JWT_MASTER_EXPTIME; // 1시간

        } else {
            this._secretKey = <Secret>process.env.JWT_SECRETKEY;
            this._algorithm = <Algorithm>'DES';
            this._expireDate = <string>process.env.JWT_ACCOUNT_EXPTIME; // 30분
        }

        this._issuer = 'bale@nstepcorp.io';
    }

    public getExpireTimeInSec() {

        const postFix1 = this._expireDate.indexOf('h');
        const postFix2 = this._expireDate.indexOf('m');
        const postFix3 = this._expireDate.indexOf('s');

        let result = 0;
        if(postFix1 >= 0) {
            result = parseInt(this._expireDate.substring(0,postFix1))*3600;

        } else if(postFix2 >= 0) {
            result = parseInt(this._expireDate.substring(0,postFix2))*60;
        } else {
            result = parseInt(this._expireDate.substring(0,postFix3));
        }

        return result;
    }

    // 토큰 발행하기
    public async issueJWT(payload:any) {

        if(payload === undefined || payload === null) {
            return null;
        }

        let token:string|null = null;
        let options:SignOptions|undefined = undefined;

        try {
            if(this._master === true) {
                options = {
                    algorithm:this._algorithm,expiresIn:this._expireDate,issuer:this._issuer
                };
                token = await jwt.sign(payload,this._privateKey,options);
            } else {
                options = {
                    expiresIn:this._expireDate,issuer:this._issuer
                };

                console.log(`payload:${payload}, secretKey:${this._secretKey}, options:${JSON.stringify(options)}`)
                token = await jwt.sign(payload,this._secretKey,options);
            }
        } catch(err) {
            console.log(err);
            token = null;
        }
        
        serviceLogger.logDebug(`[JWTManager] [issueJWT] encodedToken=${token}`);

        return token;
    }

    // 토큰 검증하기
    public async verifyJWT(token:string) {

        if(token === undefined || token === null) {
            return null;
        }

        let payload:any = null;
        let decodedToken:any = null;
        let result = ResultCode.SUCCESS;
        try {
            if(this._master === true) {
                const options:VerifyOptions = {
                    algorithms:[this._algorithm]
                };
                decodedToken = await jwt.verify(token, this._publicKey, options);

            } else {
                decodedToken = await jwt.verify(token,this._secretKey);
            }

            console.log(`[JWTManager] [verifyJWT] token.expireDateTime=${dayjs(decodedToken.exp*1000).format('YYYY-MM-DD hh:mm:ss')}`);

        } catch(err) {
            const errMsg:string = (<Error>err).message;
            if(errMsg === 'jwt expired') { // 토큰의 유효기간이 지난 경우,
                result = ResultCode.TOKEN_EXPIRED;
            } else {
                result = ResultCode.TOKEN_VERIFY_FAILED;
            }
            decodedToken = null;
        }
        
        const resultInfo:VerifyResultInfo = {resultCode:result,decodedToken};

        return resultInfo;
    }
};

