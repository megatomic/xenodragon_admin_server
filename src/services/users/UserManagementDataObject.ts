import { Request, Response } from 'express';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import { ResultInfo,ResultCode,getResultForm } from 'src/common/ResponseManager';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
//import {encodeACLInfo, decodeACLInfo} from 'src/services/common/AdminACLManager';
import * as validator from './UserManagementServiceParamValidator';
import internal from 'stream';

// 유저 타입
export const USER_TYPE_NORMAL = 1;
export const USER_TYPE_BLACKLIST = 2; // 블랙리스트에 등록된 유저

// 유저 검색 타입
export const USERSEARCH_TYPE_ALL = 1;
export const USERSEARCH_TYPE_BYUSERID = 2;
export const USERSEARCH_TYPE_BYNICKNAME = 3;

// 유저 플레이스탯 키
export const PLAYSTAT_GEM = 1;
export const PLAYSTAT_FREEGEM = 2;
export const PLAYSTAT_GOLD = 3;
export const PLAYSTAT_ENERGY = 4;
export const PLAYSTAT_XDS = 5; // 수정가능 검토 필요.
export const PLAYSTAT_ADV_CHAPTER = 6;
export const PLAYSTAT_ADV_STAGE = 7;
export const PLAYSTAT_MMR = 8;
export const PLAYSTAT_AVAILEXPEDITION_SLOT = 9;
export const PLAYSTAT_DAILYEXPEDITION_COUNT = 10;
export const PLAYSTAT_DAILYEGGHELP_COUNT = 11;
export const PLAYSTAT_TUTORIALSTEP = 12;


// 유저 활동로그 필터 타입:전체/개인
export const USERACTLOG_FILTERTYPE_ALL = 1;
export const USERACTLOG_FILTERTYPE_BYUSER = 2;

// 유저 활동로그 필터 타입2:전체/특정 활동그룹
export const USERACTLOG_FILTERTYPE2_ALL = 1;
export const USERACTLOG_FILTERTYPE2_BYACTIVITYGROUP = 2;

// 유저 활동로그 필터 타입3:전체/일간/주간/월간
export const USERACTLOG_FILTERTYPE3_ALL = 1;
export const USERACTLOG_FILTERTYPE3_DAY = 2;
export const USERACTLOG_FILTERTYPE3_WEEK = 3;
export const USERACTLOG_FILTERTYPE3_MONTH = 4;


// 유저 결제로그 필터 타입:전체/개인
export const USERPAYLOG_FILTERTYPE_ALL = 1;
export const USERPAYLOG_FILTERTYPE_BYDEVICE = 2;
export const USERPAYLOG_FILTERTYPE_BYUSER = 3;

export const USERPAYLOG_FILTERTYPE2_ALL = 1;
export const USERPAYLOG_FILTERTYPE2_BYPRODUCT = 2;

export const USERPAYLOG_FILTERTYPE3_ALL = 1;
export const USERPAYLOG_FILTERTYPE3_DAY = 2;
export const USERPAYLOG_FILTERTYPE3_WEEK = 3;
export const USERPAYLOG_FILTERTYPE3_MONTH = 4;


// 우편함 수령대상 타입
export const INBOX_TARGETTYPE_ALL = 1;
export const INBOX_TARGETTYPE_BYDEVICE = 2;
export const INBOX_TARGETTYPE_USERGROUP = 3;


// 유저 게임플레이 정보
export interface UserGamePlayInfo {
    userUID: string
    userNick: string
    landUID: string
    gem: number // 유료 다이아 보유량
    freeGem: number // 무료 다이아 보유량
    gold: number
    energy: number
    xds: number // xds 보유량
    energyConsumeTime: string // 최근 에너지 소비 시각
    activeTeamIndex: number // 현재 선택된 팀 index
    advClearChapter: number // 모험모드 진행 챕터
    advClearStage: number // 모험모드 진행 스테이지
    mmr: number // 랭킹 점수
    accountCreateTime: string // 계정 생성 시각
    lastLoginTime: string // 최근 로그인 시각
    availExpeditionSlotNum: number // 현재 사용가능한 탐험 슬롯수
    dailyExpeditionCount: number // 일일 잔여 탐험수
    dailyEggHelpCount: number // 일일 잔여 알 도움수
    eggHelpCountResetTime: number // 알 도움수 초기화 시각
    lastTutorialStep: number // 튜토리얼 진행 스텝값
};

// 유저 게임플레이 스탯항목 정보(보유젬, 보유골드, 진행 챕터 등등)
export interface UserPlayStatKV {
    playStatKey: number
    playStatValue: number
};

// 유저 활동로그 정보
export interface UserActLogInfo {
    recID: number
    userID: string
    userNick: string
    actionCase: number
    logData: string
    logTime: string
    itemType: number
    itemID: number
    quantity: number
}

// 유저 결제로그 정보
export interface UserPayLogInfo {
    recID: number
    userID: string
    userNick: string
    productID: string
	receiptID: string
    productName: string
    currency: string
    price: number
    purchaseState: number
    deviceType: number
    payTime: string
}

// 블랙리스트 유저 정보
export interface BlacklistUserInfo {
    userID: string
    reason: string
    duration: number
    autoReleaseFlag: number
    registerTime: string
    userData: string
}

// 유저 검색 요청정보
export interface ReqSearchUserInfo extends ReqBaseInfo {
    userType: number
    searchType: number
    searchText: string
    pageNo: number
};

// 유저 게임플레이 정보 요청정보
export interface ReqUserPlayInfo extends ReqBaseInfo {
    targetUserID: string
};

// 유저 게임플레이정보 수정 요청정보
export interface ReqUpdateUserPlayStat extends ReqBaseInfo {
    targetUserID: string
    userPlayStatList: UserPlayStatKV[]
};

// 유저 활동로그 조회 요청정보
export interface ReqQueryUserActLogsInfo extends ReqBaseInfo {
    queryFilterInfo: any
    pageNo: number
    queryNum: number
};

// 유저 결제로그 조회 요청정보
export interface ReqQueryUserPayLogsInfo extends ReqBaseInfo {
    queryFilterInfo: any
    pageNo: number
};

// 블랙리스트 조회 요청정보
export interface ReqQueryBlacklistInfo extends ReqBaseInfo {
    queryFilterInfo: any
    pageNo: number
};

// 블랙리스트 등록 요청정보
export interface ReqAddUserToBlacklistInfo extends ReqBaseInfo {
    userIDList: string[]
    reason: string
    duration: number
    autoReleaseFlag: boolean
    userData: string
};

// 블랙리스트 해제 요청정보
export interface ReqReleaseUserFromBlacklistInfo extends ReqBaseInfo {
    userIDList: string[]
};

// 유저 보상지급 요청정보
export interface ReqGiveRewardToUserGroupInfo extends ReqBaseInfo {
    filterTargetType: number
    deviceType: number
    userIDList: string[]
    title: string
    content: string
    rewardData: string
    expireTime: string
};


// 요청 파라메터에 설정된 값을 ReqSearchUserInfo 타입 객체로 변환
export const convertReqParamToSearchUserInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfSearchUser(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqSearchUserInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType:resultInfo.data['serverType'],
        userType:parseInt(resultInfo.data['userType']),
        searchType:parseInt(resultInfo.data['searchType']),
        searchText:resultInfo.data['searchText'],
        pageNo:parseInt(resultInfo.data['pageNo'])
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUserPlayInfo 타입 객체로 변환
export const convertReqParamToUserPlayInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfGetPlayStat(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqUserPlayInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType:resultInfo.data['serverType'],
        targetUserID:resultInfo.data['targetUserID']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqBlacklistActivationInfo 타입 객체로 변환
// export const convertReqParamToBlackActivationInfo = async (req:Request):Promise<ResultInfo> => {
    
//     // 요청 파라메터의 유효성 체크
//     const resultInfo: ResultInfo = await validator.getValidatedReqParamOfBlacklistActivation(req);
//     if (resultInfo.resultCode !== ResultCode.SUCCESS) {
//         return resultInfo;
//     }
    
//     const info:ReqBlacklistActivationInfo = {
//         adminID:resultInfo.data['adminID'],
//         authToken:resultInfo.data['authToken'],
//         targetUserID:resultInfo.data['targetUserID'],
//         activationFlag:(resultInfo.data['activationFlag'].toUpperCase() === 'TRUE'?true:false),
//         autoReleaseDate:resultInfo.data['autoReleaseDate']
//     };
//     resultInfo.data = info;
//     return resultInfo;
// };

// 요청 파라메터에 설정된 값을 ReqModifyUserPlayInfo 타입 객체로 변환
export const convertReqParamToUpdateUserPlayStat = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdatePlayStat(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const playStatKVList = [];
    const kvObjList = JSON.parse(resultInfo.data['userPlayStatKVList']);
    for(let kv of kvObjList) {
        playStatKVList.push({playStatKey:kv.key,playStatValue:kv.value});
    }
    
    const info:ReqUpdateUserPlayStat = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType:resultInfo.data['serverType'],
        targetUserID:resultInfo.data['targetUserID'],
        userPlayStatList: playStatKVList
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqQueryUserActLogsInfo 타입 객체로 변환
export const convertReqParamToUserActLogsInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUserActLogsInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqQueryUserActLogsInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType:resultInfo.data['serverType'],
        queryFilterInfo: resultInfo.data['queryFilterInfo'],
        pageNo:resultInfo.data['pageNo'],
        queryNum:resultInfo.data['queryNum']
    };
    resultInfo.data = info;
    return resultInfo;
};


// 요청 파라메터에 설정된 값을 ReqQueryUserPayLogsInfo 타입 객체로 변환
export const convertReqParamToUserPayLogsInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUserPayLogsInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqQueryUserPayLogsInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType:resultInfo.data['serverType'],
        queryFilterInfo: resultInfo.data['queryFilterInfo'],
        pageNo:resultInfo.data['pageNo']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqQueryBlacklistInfo 타입 객체로 변환
export const convertReqParamToQueryBlacklist = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryBlacklist(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqQueryBlacklistInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType:resultInfo.data['serverType'],
        queryFilterInfo: resultInfo.data['queryFilterInfo'],
        pageNo:parseInt(resultInfo.data['pageNo'])
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqAddUserToBlacklistInfo 타입 객체로 변환
export const convertReqParamToAddUserToBlacklist = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfAddUserToBlacklist(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const userIDList = JSON.parse(resultInfo.data['userIDList']);

    const info:ReqAddUserToBlacklistInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType:resultInfo.data['serverType'],
        userIDList: userIDList,
        reason: resultInfo.data['reason'],
        duration:parseInt(resultInfo.data['duration']),
        autoReleaseFlag:(resultInfo.data['autoReleaseFlag'].toUpperCase()==='TRUE'?true:false),
        userData:''
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqReleaseUserFromBlacklistInfo 타입 객체로 변환
export const convertReqParamToReleaseUserFromBlacklist = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfReleaseUserFromBlacklist(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const userIDList = JSON.parse(resultInfo.data['userIDList']);

    const info:ReqReleaseUserFromBlacklistInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType:resultInfo.data['serverType'],
        userIDList: userIDList
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqSendRewardToUserGroupInfo 타입 객체로 변환
export const convertReqParamToRewardToUserGroup = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfRewardToUserGroupInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const userIDList = JSON.parse(resultInfo.data['userIDList']);

    const info:ReqGiveRewardToUserGroupInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType:resultInfo.data['serverType'],
        filterTargetType:parseInt(resultInfo.data['filterTargetType']),
        deviceType:parseInt(resultInfo.data['deviceType']),
        userIDList:userIDList,
        title:resultInfo.data['title'],
        content:resultInfo.data['content'],
        rewardData:resultInfo.data['rewardData'],
        expireTime:resultInfo.data['expireTime']
    };
    resultInfo.data = info;
    return resultInfo;
};