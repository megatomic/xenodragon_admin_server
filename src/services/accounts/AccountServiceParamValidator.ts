import dotenv from 'dotenv';
import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import {Request,Response,NextFunction} from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';


// 암호 변경 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfChangePassword = async (req:Request):Promise<ResultInfo> => {
    
    const [adminID,authToken,serverType,oldPassword,newPassword,confirmPassword] = svcProcessor.getReqDataSet(req,['adminID', 'authToken','serverType', 'oldPassword', 'newPassword', 'confirmPassword']);
    
    // 요청 파라메터에 기대하는 값이 없을 경우
    if(serverType === null || serverType === undefined || oldPassword === null || oldPassword === undefined || newPassword === null || newPassword === undefined || confirmPassword === null || confirmPassword === undefined) {
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }
    
    // 관리자 옛암호 유효성 체크
    let resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, oldPassword, ResultCode.ACCOUNT_REQPARAM_INVALID_PWFORMAT, 'oldPassword');
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    // 관리자 새암호 유효성 체크
    resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, newPassword, ResultCode.ACCOUNT_REQPARAM_INVALID_PWFORMAT, 'newPassword');
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    resultInfo.data = {adminID,authToken,serverType,oldPassword,newPassword,confirmPassword};
    
    return resultInfo;
};

// 관리자 목록 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfAccountList = async (req:Request):Promise<ResultInfo> => {
    
    const [adminID,authToken,serverType,pageNo] = svcProcessor.getReqDataSet(req,['adminID', 'authToken', 'serverType', 'pageNo']);
    
    // 요청 파라메터에 기대하는 값이 없을 경우
    if(serverType === null || serverType === undefined || pageNo === null || pageNo === undefined) {
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }
    
    // 페이지번호 유효성 체크
    let resultInfo = await svcProcessor.checkReqValidationOfPageNo(req, pageNo, ResultCode.INVALID_PAGENO, 'pageNo');

    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    resultInfo.data = {adminID,authToken,serverType,pageNo};
    
    return resultInfo;
};

// 새 관리자 등록 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfNewAdmin = async (req:Request):Promise<ResultInfo> => {
    
    const [adminID,authToken,serverType,newAdminID,newAdminNick,newAdminInitPW,newAdminConfirmPW,newAdminACLStr,newAdminServerACLStr] = svcProcessor.getReqDataSet(req,['adminID', 'authToken','serverType', 'newAdminID', 'newAdminNick', 'newAdminInitPW', 'newAdminConfirmPW', 'newAdminACLStr', 'newAdminServerACLStr']);
    
    const newAdminNick2 = decodeURIComponent(newAdminNick);

    // 요청 파라메터에 기대하는 값이 없을 경우
    if(serverType === null || serverType === undefined || newAdminID === null || newAdminID === undefined || newAdminInitPW === null || newAdminInitPW === undefined || newAdminConfirmPW === null || newAdminConfirmPW === undefined || newAdminACLStr === null || newAdminACLStr === undefined || newAdminServerACLStr === null || newAdminServerACLStr === undefined) {
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }
    
    // 관리자 아이디 유효성 체크
    let resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, newAdminID, ResultCode.ACCOUNT_REQPARAM_INVALID_IDFORMAT, 'newAdminID');
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    // 관리자 암호 유효성 체크
    resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, newAdminInitPW, ResultCode.ACCOUNT_REQPARAM_INVALID_PWFORMAT, 'newAdminInitPW');
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    // ACL 포맷 유효성 체크
    resultInfo = await svcProcessor.checkReqValidationOfACL(req, newAdminACLStr, ResultCode.ACCOUNT_REQPARAM_INVALID_ACLFORMAT, 'newAdminACLStr');
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    resultInfo.data = {adminID,authToken,serverType,newAdminID,newAdminNick:newAdminNick2,newAdminInitPW,newAdminConfirmPW,newAdminACLInfo:newAdminACLStr,newAdminServerACL:newAdminServerACLStr};
    
    return resultInfo;
};

// 관리자 권한변경 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfModifyAccountInfo = async (req:Request):Promise<ResultInfo> => {
    
    const bodyData = svcProcessor.getReqDataSet(req,['adminID', 'authToken', 'serverType', 'targetAccountID', 'targetAccountNick', 'targetAccountPW', 'targetNewAccountPW', 'confirmAccountPW', 'targetAccountACLStr']);
    const [adminID,authToken,serverType,targetAccountID,targetAccountNick,targetAccountPW,targetNewAccountPW,confirmAccountPW,targetAccountACLStr] = bodyData;
    const targetAccountNick2 = decodeURIComponent(targetAccountNick);

    // 요청 파라메터에 기대하는 값이 없을 경우
    if(serverType === null || serverType === undefined || targetAccountID === null || targetAccountID === undefined || targetAccountACLStr === null || targetAccountACLStr === undefined) {
        console.log(`bodyData=`,bodyData);
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }
    
    // 대상 아이디 유효성 체크
    let resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, targetAccountID, ResultCode.ACCOUNT_REQPARAM_INVALID_TARGETID, 'targetAccountID');
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    // 기존 ACL 포맷 유효성 체크
    resultInfo = await svcProcessor.checkReqValidationOfACL(req, targetAccountACLStr, ResultCode.ACCOUNT_REQPARAM_INVALID_ACLFORMAT, 'targetAccountACLStr');
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    resultInfo.data = {adminID,authToken,serverType,targetAccountID,targetAccountNick:targetAccountNick2,targetAccountPW,targetNewAccountPW,confirmAccountPW,targetAccountACLInfo:targetAccountACLStr,targetAccountServerACL:[1,1,1,1]};
    
    return resultInfo;
};

// 관리자 활성화/비활성화 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfAdminActivation = async (req:Request):Promise<ResultInfo> => {
            
    const [adminID,authToken,serverType,targetAdminIDListStr,activationFlagListStr] = svcProcessor.getReqDataSet(req,['adminID', 'authToken', 'serverType', 'targetAdminIDList', 'activationFlagList']);

    let targetAdminIDList = null;
    let activationFlagList = null;
    try {
        targetAdminIDList = JSON.parse(targetAdminIDListStr);
        activationFlagList = JSON.parse(activationFlagListStr);
    } catch (err) {
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }

    if(targetAdminIDList.length === 0 || activationFlagList.length === 0 || targetAdminIDList.length !== activationFlagList.length) {
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }

    // 요청 파라메터에 기대하는 값이 없을 경우
    if(serverType === null || serverType === undefined || targetAdminIDListStr === null || targetAdminIDListStr === undefined || activationFlagListStr === null || activationFlagListStr === undefined) {
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }
    
    // 대상 아이디 유효성 체크
    let resultInfo = getResultForm(ResultCode.SUCCESS,"",null);
    for(let adminID of targetAdminIDList) {
        let resultInfo2 = await svcProcessor.checkReqValidationOfAccountID(req, adminID, ResultCode.ACCOUNT_REQPARAM_INVALID_TARGETID, 'targetAdminIDList');
        if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
            return resultInfo2;
        }
    }
    
    // 등록/해제 플래그에 대한 유효성 체크
    for(let actFlag of activationFlagList) {
        let resultInfo2 = await svcProcessor.checkReqValidationOfBool(req, (actFlag?'true':'false'), ResultCode.ACCOUNT_REQPARAM_INVALID_ACTIVATIONFLAG, 'activationFlagList');
        if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
            return resultInfo2;
        }
    }

    // 아이디중 'MASTER'가 있으면 않됨!
    const resultSet = targetAdminIDList.filter((adminID:string) => adminID === process.env.MASTERID);
    if(resultSet.length > 0) {
        return getResultForm(ResultCode.ACCOUNT_ACTIVATION_MASTERID_NOTALLOWED,ReqValidationErrorMsg[ResultCode.ACCOUNT_ACTIVATION_MASTERID_NOTALLOWED.toString()],null);
    }
    
    resultInfo.data = {adminID,authToken,serverType,targetAdminIDList,activationFlagList};
    
    return resultInfo;
};

// 관리자 삭제 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfDeleteAdmin = async (req:Request):Promise<ResultInfo> => {
    
    const [adminID,authToken,serverType,targetAdminIDListStr] = svcProcessor.getReqDataSet(req,['adminID', 'authToken', 'serverType', 'targetAdminIDList']);

    // 요청 파라메터에 기대하는 값이 없을 경우
    if(serverType === null || serverType === undefined || targetAdminIDListStr === null || targetAdminIDListStr === undefined) {
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }
    
    let targetAdminIDList = null;
    try {
        targetAdminIDList = JSON.parse(targetAdminIDListStr);
    } catch (err) {
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }

    if(targetAdminIDList.length === 0) {
        return getResultForm(ResultCode.INVALID_REQPARAM,"",ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]);
    }

    // 대상 아이디 유효성 체크
    let resultInfo = getResultForm(ResultCode.SUCCESS,"",null);
    for(let adminID of targetAdminIDList) {
        let resultInfo2 = await svcProcessor.checkReqValidationOfAccountID(req, adminID, ResultCode.ACCOUNT_REQPARAM_INVALID_TARGETID, 'targetAdminIDList');
        if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
            return resultInfo2;
        }
    }
    
    // 아이디중 'MASTER'가 있으면 않됨!
    const resultSet = targetAdminIDList.filter((adminID:string) => adminID === process.env.MASTERID);
    if(resultSet.length > 0) {
        return getResultForm(ResultCode.ACCOUNT_DELETE_MASTERID_NOTALLOWED,ReqValidationErrorMsg[ResultCode.ACCOUNT_DELETE_MASTERID_NOTALLOWED.toString()],null);
    }

    resultInfo.data = {adminID,authToken,serverType,targetAdminIDList};
    
    return resultInfo;
};




