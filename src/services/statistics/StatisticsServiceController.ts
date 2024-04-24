import {Request, Response, NextFunction, Router} from 'express';
import {ResultCode,ResultInfo,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_STATISTICS,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as statisticsDataHandler from './StatisticsServiceDataHandler';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import * as activityType from 'src/services/common/AdminActivityType';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as sdo from 'src/services/statistics/StatisticsDataObject';
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

//  사용자 통계 현황 DB 테이블 조회
const queryUserStatisticsData = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryUserStatisticsData()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await sdo.convertReqParamToQueryUserStatisticsData(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqUserStatisticsInfo:sdo.ReqUserStatisticsInfo = resultInfo.data;
        
        // 통계 데이터는 무조건 'local' DB에서 읽어오도록.
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,'LOCAL');
        //const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_STATISTICS,reqUserStatisticsInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUserStatisticsInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 통계 DB에서 유저 통계데이터(유저 가입/플레이 등) 조회
        const dbQueryInfo = await statisticsDataHandler.queryDBUserStatisticsTable(sqlDataManager,reqUserStatisticsInfo);
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

    serviceLogger.logDebug("##### [END] queryUserStatisticsData()");
};
router.post('/user/graphdata', queryUserStatisticsData);

//  재화 통계 현황 DB 테이블 조회
const queryCashStatisticsData = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryCashStatisticsData()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await sdo.convertReqParamToQueryCashStatisticsData(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqCashStatisticsInfo:sdo.ReqCashStatisticsInfo = resultInfo.data;
        
        // 통계 데이터는 무조건 'local' DB에서 읽어오도록.
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,'LOCAL');
        //const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_STATISTICS,reqUserStatisticsInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqCashStatisticsInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 통계 DB에서 유저 통계데이터(유저 가입/플레이 등) 조회
        const dbQueryInfo = await statisticsDataHandler.queryDBCashStatisticsTable(sqlDataManager,reqCashStatisticsInfo);
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

    serviceLogger.logDebug("##### [END] queryCashStatisticsData()");
};
router.post('/cash/graphdata', queryCashStatisticsData);

export default router;