import { Request, Response } from 'express';
import { ResultInfo,ResultCode,getResultForm } from 'src/common/ResponseManager';
import * as validator from './AuthServiceParamValidator';


// 로그인 정보
export type ReqLoginInfo = {
    adminID: string
    adminPW: string
    serverType: string
};

// 인증 정보
export type ReqAuthInfo = {
    adminID: string
    authToken: string
    serverType: string
}

// 요청 파라메터에 설정된 값을 LoginInfo 타입 객체로 변환
export const convertReqParamToLoginInfo = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo:ResultInfo = await validator.getValidatedReqParamOfLogin(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info:ReqLoginInfo = {
        adminID:resultInfo.data['adminID'],
        adminPW:resultInfo.data['adminPW'],
        serverType: resultInfo.data['serverType']
    };

    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 AuthInfo 타입 객체로 변환
export const convertReqParamToAuthInfo = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo:ResultInfo = await validator.getValidatedReqParamOfAuth(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info:ReqAuthInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType']
    };
    
    resultInfo.data = info;
    return resultInfo;
};