import {Request, Response, NextFunction, Router} from 'express';
import {ResultCode,ResultInfo,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as blockchainDataHandler from './BlockchainServiceDataHandler';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import * as activityType from 'src/services/common/AdminActivityType';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as bdo from 'src/services/blockchain/BlockchainDataObject';
import * as aclManager from 'src/services/common/AdminACLManager';
import {processWalletBalanceInfo} from 'src/services/common/WalletContractManager';

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

// 유동성 풀 현황 및 거래내역 DB 테이블 조회
const queryLiquidPoolData = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryLiquidPoolData()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await bdo.convertReqParamToQueryLiquidPoolData(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryLiquidPoolDataInfo:bdo.ReqQueryLiquidPoolDataInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryLiquidPoolDataInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_GAMESERVER,reqQueryLiquidPoolDataInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryLiquidPoolDataInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 게임서버 DB 유동성풀 테이블 조회
        let liquidPoolStateInfo=null;
        let liquidPoolLogInfo=null;
        let dbQueryInfo;
        if(reqQueryLiquidPoolDataInfo.logOnly === false) {
            dbQueryInfo = await blockchainDataHandler.getDBLiquidPoolStateInfo(sqlDataManager2);
            if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
                cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
                cmnSvcProcessor.releaseDataManager(sqlDataManager2);
                return;
            }
            liquidPoolStateInfo = dbQueryInfo.data;
        }

        // 게임서버 DB 유동성풀 로그 테이블 조회
        dbQueryInfo = await blockchainDataHandler.queryDBLiquidPoolLogTable(sqlDataManager2,reqQueryLiquidPoolDataInfo.tokenType,reqQueryLiquidPoolDataInfo.pageNo,10);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }
        liquidPoolLogInfo = dbQueryInfo.data;

        resultInfo.data = {liquidPoolStateInfo, liquidPoolLogInfo};

        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryLiquidPoolData()");
};
router.post('/liquidpool/info', queryLiquidPoolData);


//  유저 토큰스왑 현황 DB 테이블 조회
const queryUserSwapGraphData = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryUserSwapGraphData()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await bdo.convertReqParamToQueryUserSwapTable(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqQueryUserSwapTableInfo:bdo.ReqQueryUserSwapTableInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryUserSwapTableInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_GAMESERVER,reqQueryUserSwapTableInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryUserSwapTableInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 게임운영자 지갑의 잔액정보 조회
        const gameOperatorAddress:any = process.env.LIVE_GAME_OPERATOR_ADDRESS;
        resultInfo = await processWalletBalanceInfo(reqQueryUserSwapTableInfo.serverType,gameOperatorAddress,{});
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        // 게임서버 DB 유저스왑 테이블 조회
        const dbQueryInfo = await blockchainDataHandler.queryUserSwapLogTable(sqlDataManager2,reqQueryUserSwapTableInfo);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        dbQueryInfo.data = {...dbQueryInfo.data,operatorInfo:resultInfo.data};
        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryUserSwapGraphData()");
};
router.post('/userswap/graphdata', queryUserSwapGraphData);

//  지갑주소로 유저 닉네임 조회
const getUserNicknameByWalletAddress = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] getUserNicknameByWalletAddress()");
    
    try {
        // 요청 파라메터 유효성 체크 및 요청 객체로 변환
        let resultInfo = await bdo.convertReqParamToGetUserByWalletAddress(req);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,null)
            return;
        }
        const reqGetUserByWalletAddressInfo:bdo.ReqGetUserByWalletAddressInfo = resultInfo.data;
        
        const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqGetUserByWalletAddressInfo.serverType);
        const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_GAMESERVER,reqGetUserByWalletAddressInfo.serverType);

        // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
        resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqGetUserByWalletAddressInfo, aclManager.ACL_POLICY_SETTING_UPDATE);
        if(resultInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }

        const loginAccountInfo:ado.AccountInfo = resultInfo.data;

        // 게임서버 DB 지갑정보 & 유저정보 테이블 조회
        const dbQueryInfo = await blockchainDataHandler.queryUserNicknameByWalletAddress(sqlDataManager2,reqGetUserByWalletAddressInfo.walletAddress);
        if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
            cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
            cmnSvcProcessor.releaseDataManager(sqlDataManager2);
            return;
        }


        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    } catch(err) {
        console.log(err);

        const resultInfo = {
            resultCode: ResultCode.SYSTEM_INTERNALERROR,
            message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
            data:err
        };

        cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] getUserNicknameByWalletAddress()");
};
router.post('/usernick/getbyaddress', getUserNicknameByWalletAddress);

export default router;