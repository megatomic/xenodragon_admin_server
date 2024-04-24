import { Request, Response } from 'express';
import ReqBaseInfo,{GameItemInfo} from 'src/services/common/BaseDataObject';
import { ResultInfo,ResultCode,getResultForm } from 'src/common/ResponseManager';
import * as validator from './WalletServiceParamValidator';


// 지갑 정보
export type WalletInfo =  {
    walletID: number
    walletName: string
    walletAddress: string
    walletKey: string
    balanceInfo: object
    walletData: string
    creationTime: string
    updateTime: string
};

// 지갑잔액 요청정보
export interface ReqWalletBalanceInfo extends ReqBaseInfo {
    address: string
}

// 지갑목록 요청정보
export interface ReqWalletListInfo extends ReqBaseInfo {

};

// 지갑추가 요청정보
export interface ReqAddWalletInfo extends ReqBaseInfo {
    walletName: string
    walletAddress: string
    walletKey: string
};

// 지갑수정 요청정보
export interface ReqUpdateWalletInfo extends ReqBaseInfo {
    walletAddress: string
    walletName: string
    walletKey: string
};

// 지갑삭제 요청정보
export interface ReqDeleteWalletInfo extends ReqBaseInfo {
    walletAddress: string
};

// 토큰 전송하기 요청정보
export interface ReqTransferTokenInfo extends ReqBaseInfo {
    initReq: boolean
    senderWalletAddress: string
    tokenInfo: number[]
    targetAddressList: string[]
}

// 마켓 매출정보 조회 요청정보
export interface ReqGetMarketContractInfo extends ReqBaseInfo {
    contractType: string
    balanceInfo: boolean
    pageNo: number
}

// 마켓 매출 지갑전송 요청정보
export interface ReqTransferMarketBalanceInfo extends ReqBaseInfo {
    ownerAddress: string
    contractType: string
    itemType: number
    tokenType: string
    amount:string
    targetAddress: string
}

// 마켓 컨트랙트 설정정보 요청정보
export interface ReqQueryMarketContractSettingInfo extends ReqBaseInfo {
    contractType: string
}

// 마켓 컨트랙 설정정보 업데이트 요청정보
export interface ReqUpdateMarketContractSettingInfo extends ReqBaseInfo {
    contractType: string
    contractSettingInfo: any
}

// 요청 파라메터에 설정된 값을 ReqWalletBalanceInfo 타입 객체로 변환
export const convertReqParamToWalletBalanceInfo = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfGetWalletBalance(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info: ReqWalletBalanceInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        address: resultInfo.data['address']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqWalletListInfo 타입 객체로 변환
export const convertReqParamToWalletListInfo = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfWalletList(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info: ReqWalletListInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqAddWalletInfo 타입 객체로 변환
export const convertReqParamToAddWalletInfo = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfAddWallet(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info: ReqAddWalletInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        walletName: resultInfo.data['walletName'],
        walletAddress: resultInfo.data['walletAddress'],
        walletKey: resultInfo.data['walletKey']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateWalletInfo 타입 객체로 변환
export const convertReqParamToUpdateWalletInfo = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateWallet(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info: ReqUpdateWalletInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        walletAddress: resultInfo.data['walletAddress'],
        walletName: resultInfo.data['walletName'],
        walletKey: resultInfo.data['walletKey']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqDeleteWalletInfo 타입 객체로 변환
export const convertReqParamToDeleteWalletInfo = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfDeleteWallet(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const info: ReqDeleteWalletInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        walletAddress: resultInfo.data['walletAddress']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqTransferTokenInfo 타입 객체로 변환
export const convertReqParamToTransferToken = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfTransferToken(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info: ReqTransferTokenInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        initReq: resultInfo.data['initReq'],
        senderWalletAddress: resultInfo.data['senderWalletAddress'],
        tokenInfo: resultInfo.data['tokenInfo'],
        targetAddressList: resultInfo.data['targetAddressList']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqGetMarketContractInfo 타입 객체로 변환
export const convertReqParamToGetMarketContractInfo = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfGetMarketContractInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info: ReqGetMarketContractInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        contractType: resultInfo.data['contractType'],
        balanceInfo: resultInfo.data['balanceInfo'],
        pageNo: 1
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqTransferMarketBalanceInfo 타입 객체로 변환
export const convertReqParamToTransferMarketBalanceToAddress = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfTransferMarketBalanceToAddress(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info: ReqTransferMarketBalanceInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        ownerAddress: resultInfo.data['ownerAddress'],
        contractType: resultInfo.data['contractType'],
        itemType: resultInfo.data['itemType'],
        tokenType: resultInfo.data['tokenType'],
        amount: resultInfo.data['amount'],
        targetAddress: resultInfo.data['targetAddress'],
    };
    resultInfo.data = info;
    return resultInfo;
}

// 요청 파라메터에 설정된 값을 ReqQueryMarketContractSettingInfo 타입 객체로 변환
export const convertReqParamToQueryMarketContractSettingInfo = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryMarketContractSettingInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info: ReqQueryMarketContractSettingInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        contractType: resultInfo.data['contractType']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateMarketContractSettingInfo 타입 객체로 변환
export const convertReqParamToUpdateMarketContractSettingInfo = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateMarketContractSettingInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info: ReqUpdateMarketContractSettingInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        contractType: resultInfo.data['contractType'],
        contractSettingInfo: resultInfo.data['contractSettingInfo']
    };
    resultInfo.data = info;
    return resultInfo;
};