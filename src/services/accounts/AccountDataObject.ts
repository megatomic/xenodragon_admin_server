import { Request, Response } from 'express';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
//import {encodeACLInfo, decodeACLInfo} from '@src/services/common/AdminACLManager';
import { ResultInfo,ResultCode,getResultForm } from 'src/common/ResponseManager';
import * as validator from './AccountServiceParamValidator';

// 계정 ACL 정보
export type ACLUnitInfo = {
    aclKey: string
    aclValue: string
};

// 계정 테이블 레코드 정보
export type AccountInfo = {
    seqNo: number
    accountID: string
    accountNick: string
    accountPW: string
    accountPWSalt: string
    creationTime: string
    activationFlag: boolean
    aclInfo: string
    serverACL: string
};

// 암호 변경 요청정보
export interface ReqChangePasswordInfo extends ReqBaseInfo {
    oldPW: string
    newPW: string
    confirmPW: string
};

export interface ReqAdminListInfo extends ReqBaseInfo {
    pageNo: number
}

// 새 관리자 추가 요청정보
export interface ReqNewAdminInfo extends ReqBaseInfo {
    newAdminID: string
    newAdminNick: string
    newAdminInitPW: string
    newAdminConfirmPW: string
    newAdminACLInfo:ACLUnitInfo[]
    newAdminServerACL: object
}

// 관리자 권한수정 요청정보
export interface ReqModifyAccountInfo extends ReqBaseInfo {
    targetAccountID: string
    targetAccountNick: string
    targetAccountPW: string
    targetNewAccountPW: string
    confirmAccountPW: string
    targetAccountACLInfo:ACLUnitInfo[]
    targetAccountServerACL: object
}

// 관리자 활성화/비활성화 요청정보
export interface ReqAdminActivationInfo extends ReqBaseInfo {
    targetAdminIDList: string[]
    activationFlagList: boolean[]
}

// 관리자 계정 삭제 요청정보(마스터 계정만 가능. 마스터 계정은 삭제 불가)
export interface ReqAdminDeleteInfo extends ReqBaseInfo {
    targetAdminIDList: string[]
}

export const convertDBToAccountRecordInfo = (accountInfo:any,secure:boolean=true):AccountInfo => {

    //const aclInfoList:ACLUnitInfo[] = decodeACLInfo(accountInfo.acl_info);

    const info:AccountInfo = {
        seqNo: accountInfo.seq_no,
        accountID:accountInfo.account_id,
        accountNick:accountInfo.account_nick,
        accountPW:(secure === true?"":accountInfo.account_pw),
        accountPWSalt:(secure === true?"":accountInfo.account_pw_salt),
        creationTime:accountInfo.creatime_time,
        activationFlag:(accountInfo.activation_flag===1?true:false),
        aclInfo:accountInfo.acl_info,
        serverACL:accountInfo.serverACL
    };

    return info;
};

export const convertDBToAccountListInfo = (accountListInfo:any,secure:boolean=true):AccountInfo[] => {

    const infoList:AccountInfo[] = [];
    for(let accountInfo of accountListInfo) {
        infoList.push(convertDBToAccountRecordInfo(accountInfo,secure));
    }

    return infoList;
};

// 요청 파라메터에 설정된 값을 ChangePasswordInfo 타입 객체로 변환
export const convertReqParamToChangePasswordInfo = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo:ResultInfo = await validator.getValidatedReqParamOfChangePassword(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info:ReqChangePasswordInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        oldPW:resultInfo.data['oldPassword'],
        newPW:resultInfo.data['newPassword'],
        confirmPW:resultInfo.data['confirmPassword']
    };

    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqAccountListInfo 타입의 객체를 변환
export const convertReqParamToAccountListInfo = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo:ResultInfo = await validator.getValidatedReqParamOfAccountList(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info:ReqAdminListInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        pageNo:parseInt(resultInfo.data['pageNo'])
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqAccountListInfo 타입의 객체를 변환
export const convertReqParamToNewAdminInfo = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo:ResultInfo = await validator.getValidatedReqParamOfNewAdmin(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    //const aclInfoList:ACLUnitInfo[] = decodeACLInfo(resultInfo.data['newAdminACLInfo']);

    const info:ReqNewAdminInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        newAdminID:resultInfo.data['newAdminID'],
        newAdminNick:resultInfo.data['newAdminNick'],
        newAdminInitPW:resultInfo.data['newAdminInitPW'],
        newAdminConfirmPW:resultInfo.data['newAdminConfirmPW'],
        newAdminACLInfo:resultInfo.data['newAdminACLInfo'],
        newAdminServerACL:resultInfo.data['newAdminServerACL']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqChangeAdminACLInfo 타입의 객체를 변환
export const convertReqParamToModifyAccountInfo = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo:ResultInfo = await validator.getValidatedReqParamOfModifyAccountInfo(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info:ReqModifyAccountInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        targetAccountID:resultInfo.data['targetAccountID'],
        targetAccountNick:resultInfo.data['targetAccountNick'],
        targetAccountPW:resultInfo.data['targetAccountPW'],
        targetNewAccountPW:resultInfo.data['targetNewAccountPW'],
        confirmAccountPW:resultInfo.data['confirmAccountPW'],
        targetAccountACLInfo:resultInfo.data['targetAccountACLInfo'],
        targetAccountServerACL:resultInfo.data['targetAccountServerACL']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqAdminActivationInfo 타입의 객체를 변환
export const convertReqParamToAdminActivationInfo = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo:ResultInfo = await validator.getValidatedReqParamOfAdminActivation(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info:ReqAdminActivationInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        targetAdminIDList:resultInfo.data['targetAdminIDList'],
        activationFlagList:resultInfo.data['activationFlagList']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqAdminActivationInfo 타입의 객체를 변환
export const convertReqParamToDeleteAdminInfo = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo:ResultInfo = await validator.getValidatedReqParamOfDeleteAdmin(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info:ReqAdminDeleteInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        targetAdminIDList:resultInfo.data['targetAdminIDList']
    };
    resultInfo.data = info;
    return resultInfo;
};