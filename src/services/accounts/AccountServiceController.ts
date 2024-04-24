import {Request, Response, NextFunction, Router} from 'express';
import * as validator from './AccountServiceParamValidator';
import {ResultCode,getResultForm,ResultInfo,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as accountDataHandler from './AccountServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import { createHashedPassword, makePasswordHashed } from 'src/common/CryptoManager';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as activityType from 'src/services/common/AdminActivityType';

require('dotenv').config();

const router = Router();

// 토큰 유효성과 요청을 실행할 권한이 있는지 체크하는 함수
async function preprocessAccountRequest(req:Request, res:Response, sqlDataManager:SQLDataManager, reqInfo:ReqBaseInfo, policyKey:string):Promise<any> {

    // JWT 토큰이 유효한지 체크. 유효하다면 새로 갱신
    let resultInfo = await cmnSvcProcessor.verifyAndIssueJwt(req,res, sqlDataManager,<string>reqInfo.adminID,<string>reqInfo.authToken);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    // DB로부터 계정 조회
    resultInfo = await accountDataHandler.queryDBAccount(sqlDataManager,reqInfo.adminID);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const loginAccountInfo:ado.AccountInfo = ado.convertDBToAccountRecordInfo(resultInfo.data,false);
    resultInfo.data = loginAccountInfo;
    
    // 로그인 유저가 policyType 권한이 있는지 체크
    // if(aclManager.checkAccessibleWithACL(loginAccountInfo.aclInfo,policyKey) === false) {
    //     resultInfo.resultCode = ResultCode.ACL_USER_NOT_AUTHORIZED;
    // }

    return resultInfo;
}


// 마스터 계정 비밀번호 변경
const  changeMasterPassword = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] changeMasterPassword()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ado.convertReqParamToChangePasswordInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqChangePWInfo:ado.ReqChangePasswordInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqChangePWInfo.serverType);

        // JWT 토큰이 유효한지 체크. 유효하다면 새로 갱신
        resultInfo = await cmnSvcProcessor.verifyAndIssueJwt(req,res, sqlDataManager,<string>reqChangePWInfo.adminID,<string>reqChangePWInfo.authToken);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 새 비밀번호,확인 비밀번호가 일치하는지 체크
        if(reqChangePWInfo.newPW !== reqChangePWInfo.confirmPW) {

            serviceLogger.logDebug("changeMasterPassword() newPW and confirmPW mismatched!");

            resultInfo.resultCode = ResultCode.ACCOUNT_CHANGEPW_NEWCONFIRM_MISMATCHED;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.ACCOUNT_CHANGEPW_NEWCONFIRM_MISMATCHED.toString()];
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        resultInfo = await accountDataHandler.queryDBAccount(sqlDataManager,reqChangePWInfo.adminID);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager)
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        const hashedPW = await makePasswordHashed(reqChangePWInfo.oldPW, loginAccountInfo.accountPWSalt);

        // 현재 암호가 DB에 저장된 것과 일치하는지 체크
        if(hashedPW !== loginAccountInfo.accountPW) {

            serviceLogger.logDebug("curPW and db passowrd mismatched!");

            resultInfo = getResultForm(ResultCode.ACCOUNT_CHANGEPW_CURPW_MISMATCHED,ReqValidationErrorMsg[ResultCode.ACCOUNT_CHANGEPW_CURPW_MISMATCHED.toString()],{});
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager)
            return;
        }

        // 기존 암호를 새 암호로 교체
        const {passwordHash,salt} = await createHashedPassword(reqChangePWInfo.newPW);
        const dbUpdateInfo = await accountDataHandler.updateDBAccountPassword(sqlDataManager,reqChangePWInfo.adminID,passwordHash,salt);
        if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager)
            return;
        }

        // 암호변경 활동로그 DB에 저장
        const logDetailInfo:string = `{"oldPWHash":${hashedPW}, "newPWHash":${passwordHash}}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqChangePWInfo.adminID,activityType.ADMINACTIVITY_TYPE_ACCOUNT_CHANGEPW,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    } catch(err) {
        console.log(err);
  
        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
  
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] changeMasterPassword()");
};
router.get('/master/changepw', changeMasterPassword);



// 관리자 목록 조회
const queryAccountList = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryAccountList()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ado.convertReqParamToAccountListInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null);
            return;
        }
        const reqAccListInfo:ado.ReqAdminListInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqAccListInfo.serverType);

        // JWT 토큰이 유효한지 체크. 유효하다면 새로 갱신
        resultInfo = await cmnSvcProcessor.verifyAndIssueJwt(req,res, sqlDataManager,<string>reqAccListInfo.adminID,<string>reqAccListInfo.authToken);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // DB로부터 계정 목록 조회
        resultInfo = await accountDataHandler.queryDBAccountList(sqlDataManager,reqAccListInfo,parseInt(<string>process.env.QUERY_NUM_PERPAGE));
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager)
            return;
        }

        
        // const accountListInfo:ado.AccountInfo[] = ado.convertDBToAccountListInfo(resultInfo.data,true);
        // resultInfo.data = accountListInfo;

        // 계정목록 조회 활동로그 DB에 저장
        //cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqAccListInfo.adminID,activityType.ADMINACTIVITY_TYPE_ACCOUNT_VIEWLIST,'');

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

    } catch(err) {
        console.log(err);
  
        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
  
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryAccountList()");
};
router.get('/list', queryAccountList);



// 새 관리자 추가
const registerNewAccount = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] registerNewAccount()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ado.convertReqParamToNewAdminInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqNewAdminInfo:ado.ReqNewAdminInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqNewAdminInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessAccountRequest(req, res, sqlDataManager, reqNewAdminInfo, aclManager.ACL_POLICY_ACCOUNT_REGISTER);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }
        // 생성할 계정의 임시암호/확인용 암호가 일치하는지 체크
        if(reqNewAdminInfo.newAdminInitPW.trim() !== reqNewAdminInfo.newAdminConfirmPW) {
            resultInfo.resultCode = ResultCode.ACCOUNT_NEWADMIN_NEWCONFIRM_MISMATCHED;
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 기존에 이미 동일한 계정ID가 있는지 체크
        resultInfo = await accountDataHandler.queryDBAccount(sqlDataManager,reqNewAdminInfo.newAdminID);
        if(resultInfo.resultCode === ResultCode.SUCCESS) {
            resultInfo.resultCode = ResultCode.ACCOUNT_NEWADMIN_ALREADY_EXIST;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.ACCOUNT_NEWADMIN_ALREADY_EXIST.toString()];
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 해당 계정을 DB에 생성
        const {passwordHash,salt} = await createHashedPassword(reqNewAdminInfo.newAdminInitPW);
        const dbUpdateInfo = await accountDataHandler.registerDBNewAccount(sqlDataManager,reqNewAdminInfo,passwordHash,salt);
        if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
            return;
        }

        // 계정추가 활동로그 DB에 저장
        const logDetailInfo:string = `{"newAdminID":${reqNewAdminInfo.newAdminID}, "newAdminACLInfo":${reqNewAdminInfo.newAdminACLInfo}}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqNewAdminInfo.adminID,activityType.ADMINACTIVITY_TYPE_ACCOUNT_NEW,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    } catch(err) {
        console.log(err);
  
        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
  
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] registerNewAccount()");
};
router.get('/new', registerNewAccount);



// 계정 정보 수정
const modifyAccountInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] modifyAccountInfo()");
        
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ado.convertReqParamToModifyAccountInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqAdminACLInfo:ado.ReqModifyAccountInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqAdminACLInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessAccountRequest(req, res, sqlDataManager, reqAdminACLInfo, aclManager.ACL_POLICY_ACCOUNT_CHANGEACL);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        let dbUpdateInfo;
        if(reqAdminACLInfo.targetAccountPW.trim().length > 0) {
            // 암호가 변경되었다면 DB에 암호 저장
            if(reqAdminACLInfo.targetNewAccountPW.trim().length < 6) {
                resultInfo.resultCode = ResultCode.ACCOUNT_CHANGEPW_INVALID_NEWPASSWORD;
                resultInfo.message = ReqValidationErrorMsg[ResultCode.ACCOUNT_CHANGEPW_INVALID_NEWPASSWORD.toString()];
                cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
                return;
            }

            const check1 = cmnSvcProcessor.checkCharSetIfAlphabetic(reqAdminACLInfo.targetNewAccountPW);
            const check2 = cmnSvcProcessor.checkCharSetIfNumbericAndSpecialChars(reqAdminACLInfo.targetNewAccountPW);
            if(check1 === false || check2 === false) {
                resultInfo.resultCode = ResultCode.ACCOUNT_CHANGEPW_INVALID_NEWPASSWORD;
                resultInfo.message = ReqValidationErrorMsg[ResultCode.ACCOUNT_CHANGEPW_INVALID_NEWPASSWORD.toString()];
                cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
                return;
            }

            // DB로부터 계정 조회
            resultInfo = await accountDataHandler.queryDBAccount(sqlDataManager,reqAdminACLInfo.targetAccountID);
            if(resultInfo.resultCode !== ResultCode.SUCCESS) {
                return resultInfo;
            }

            const accountInfo:ado.AccountInfo = resultInfo.data;

            const hashedPW = await makePasswordHashed(reqAdminACLInfo.targetAccountPW, accountInfo.accountPWSalt);

            // 현재 암호가 DB에 저장된 것과 일치하는지 체크
            if(hashedPW !== accountInfo.accountPW) {
                resultInfo.resultCode = ResultCode.ACCOUNT_CHANGEPW_CURPW_MISMATCHED;
                resultInfo.message = ReqValidationErrorMsg[ResultCode.ACCOUNT_CHANGEPW_CURPW_MISMATCHED.toString()];
                cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager)
                return;
            }

            // 기존 암호를 새 암호로 교체
            const {passwordHash,salt} = await createHashedPassword(reqAdminACLInfo.targetNewAccountPW);
            dbUpdateInfo = await accountDataHandler.updateDBAccountPassword(sqlDataManager,reqAdminACLInfo.targetAccountID,passwordHash,salt);
            if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager)
                return;
            }
        }

        // 해당 계정의 권한을 새 ACL로 업데이트
        dbUpdateInfo = await accountDataHandler.updateDBAccountInfo(sqlDataManager,reqAdminACLInfo);
        if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
            return;
        }

        // 계정 권한수정 활동로그 DB에 저장
        // const curACLInfoStr:string = aclManager.encodeACLInfo(reqAdminACLInfo.curACLInfo);
        // const newACLInfoStr:string = aclManager.encodeACLInfo(reqAdminACLInfo.newACLInfo);
        const logDetailInfo:string = `{"targetAccountID":${reqAdminACLInfo.targetAccountID}, "targetAccountNick":${reqAdminACLInfo.targetAccountNick}, "newACL":${reqAdminACLInfo.targetAccountACLInfo}}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqAdminACLInfo.adminID,activityType.ADMINACTIVITY_TYPE_ACCOUNT_CHANGEACL,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    } catch(err) {
        console.log(err);
  
        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
  
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] modifyAccountInfo()");
};
router.get('/modify', modifyAccountInfo);



// 관리자 계정 활성화/비활성화
const changeAccountActivation = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] changeAccountActivation()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ado.convertReqParamToAdminActivationInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqAdminActivInfo:ado.ReqAdminActivationInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqAdminActivInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessAccountRequest(req, res, sqlDataManager, reqAdminActivInfo, aclManager.ACL_POLICY_ACCOUNT_ACTIVATION);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        // 해당 계정을 활성화/비활성화
        const dbUpdateInfo = await accountDataHandler.updateDBAccountActivation(sqlDataManager,reqAdminActivInfo);
        if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
            return;
        }

        // 계정 활성화/비활성화 활동로그 DB에 저장
        const logDetailInfo:string = `{"targetAdminIDList":${JSON.stringify(reqAdminActivInfo.targetAdminIDList)}, "activationFlagList":${JSON.stringify(reqAdminActivInfo.activationFlagList)}}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqAdminActivInfo.adminID,activityType.ADMINACTIVITY_TYPE_ACCOUNT_ACTIVATION,logDetailInfo);

        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    } catch(err) {
        console.log(err);
  
        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
  
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] changeAccountActivation()");
};
router.get('/changeactivation', changeAccountActivation);



// 관리자 계정 삭제
const deleteAccount = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] deleteAccount()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ado.convertReqParamToDeleteAdminInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqAdminDelInfo:ado.ReqAdminDeleteInfo = resultInfo.data;

        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqAdminDelInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessAccountRequest(req, res, sqlDataManager, reqAdminDelInfo, aclManager.ACL_POLICY_ACCOUNT_DELETE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 해당 계정을 DB에서 삭제
        const dbUpdateInfo = await accountDataHandler.deleteDBAccount(sqlDataManager,reqAdminDelInfo);
        if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);
            return;
        }

        // 계정삭제 활동로그 DB에 저장
        const logDetailInfo:string = `{"targetAdminIDList":${JSON.stringify(reqAdminDelInfo.targetAdminIDList)}}`;
        await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqAdminDelInfo.adminID,activityType.ADMINACTIVITY_TYPE_AUTH_LOGOUT,logDetailInfo);

        cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);

    } catch(err) {
        console.log(err);
  
        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };
  
        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] deleteAccount()");
};
router.get('/delete', deleteAccount);



export default router;