import {Request, Response, NextFunction, Router} from 'express';
import {ResultCode,ResultInfo,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as logDataHandler from './LogServiceDataHandler';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as ldo from 'src/services/logs/LogDataObject';
import * as aclManager from 'src/services/common/AdminACLManager';

require('dotenv').config();

const router = Router();


// 토큰 유효성과 요청을 실행할 권한이 있는지 체크하는 함수
async function preprocessNotificationRequest(req:Request, res:Response, sqlDataManager:SQLDataManager, reqInfo:ReqBaseInfo, policyKey:string):Promise<any> {

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

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;
    
    // 로그인 유저가 policyType 권한이 있는지 체크
    if(aclManager.checkAccessibleWithACL(loginAccountInfo.aclInfo,policyKey) === false) {
        resultInfo.resultCode = ResultCode.ACL_USER_NOT_AUTHORIZED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.ACL_USER_NOT_AUTHORIZED.toString()];
    }

    return resultInfo;
}


// 활동로그 목록 조회
const getActivityLogList = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] getActivityLogList()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await ldo.convertReqParamToActivityLogListInfo(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqActivityLogListInfo:ldo.ReqActivityLogListInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqActivityLogListInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqActivityLogListInfo, aclManager.ACL_POLICY_ACTIVITYLOG_VIEWLIST);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // DB에서 활동로그 목록 조회
        const dbQueryInfo = await logDataHandler.queryDBActivityLogList(sqlDataManager,reqActivityLogListInfo,parseInt(<string>process.env.QUERY_NUM_PERPAGE));
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            return;
        }

        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] getActivityLogList()");
};
router.get('/list', getActivityLogList);

export default router;