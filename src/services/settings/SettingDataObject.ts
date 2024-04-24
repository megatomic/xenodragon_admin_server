import { Request, Response } from 'express';
import ReqBaseInfo, { jsonKeyValue } from 'src/services/common/BaseDataObject';
import { ResultInfo, ResultCode, getResultForm } from 'src/common/ResponseManager';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
import * as validator from './SettingServiceParamValidator';
import { bool } from 'aws-sdk/clients/signer';

// 설정 항목
export const SETTINGITEM_INBOX_ACTIVEDAY = '0801';
export const SETTINGITEM_BLACKLIST_AUTOREL_DUEDAY = '1201';

// 설정 항목 타입
export type SettingItemInfo = {
  settingID: number;
  groupID: string;
  itemName: string;
  itemValue1: string;
  itemValue2: string;
  itemValue3: string;
};

// 내부 설정항목 타입
export type InternalPropInfo = {
  propID: number;
  propName: string;
  propInt: number;
  propString: string;
  propData: string;
};

// 환경설정 정보 조회 요청정보
export interface ReqQuerySettingItemListInfo extends ReqBaseInfo {}

// 환경설정 항목(들) 변경 요청정보
export interface ReqUpdateSettingItemListInfo extends ReqBaseInfo {
  //itemList: SettingItemInfo[];
  settingItemTable: any;
  otpCode: string;
}

// 클라이언트설정 항목(들) 변경 요청정보
export interface ReqUpdateClientConfigInfo extends ReqBaseInfo {
  clientConfig: object
}

export const getSettingItemValue = (itemList:SettingItemInfo[], groupID:string, itemName:string):string => {

  for(let itemInfo of itemList) {
    if(itemInfo.groupID === groupID && itemInfo.itemName === itemName) {
      return itemInfo.itemValue1;
    }
  }
  return '';
}

export const getSettingItemValueList = (itemList:SettingItemInfo[], groupID:string, itemName:string):string[] => {

  for(let itemInfo of itemList) {
    if(itemInfo.groupID === groupID && itemInfo.itemName === itemName) {
      return [itemInfo.itemValue1,itemInfo.itemValue2,itemInfo.itemValue3];
    }
  }
  return [];
}

export const setSettingItemValue = (itemList:SettingItemInfo[], groupID:string, itemName:string, itemValue1:string, itemValue2?:string, itemValue3?:string):SettingItemInfo[] => {

  for(let itemInfo of itemList) {
    if(itemInfo.groupID === groupID && itemInfo.itemName === itemName) {
      itemInfo.itemValue1 = itemValue1;
      if(itemValue2 !== undefined) {
        itemInfo.itemValue2 = itemValue2;
      }
      if(itemValue3 !== undefined) {
        itemInfo.itemValue3 = itemValue3;
      }
      break;
    }
  }

  return itemList;
}

export const addSettingItemValue = (itemList:SettingItemInfo[], groupID:string, itemName:string, itemValue1:string, itemValue2?:string, itemValue3?:string):SettingItemInfo[] => {

  let found = false;
  let curSettingID = -1;
  for(let itemInfo of itemList) {
    if(itemInfo.settingID > curSettingID) {
      curSettingID = itemInfo.settingID;
    }
    if(itemInfo.groupID === groupID && itemInfo.itemName === itemName) {
      itemInfo.itemValue1 = itemValue1;
      if(itemValue2 !== undefined) {
        itemInfo.itemValue2 = itemValue2;
      }
      if(itemValue3 !== undefined) {
        itemInfo.itemValue3 = itemValue3;
      }
      found = true;
      break;
    }
  }

  if(found === false) {
    const newItemInfo:SettingItemInfo = {
      settingID:(curSettingID+1),
      groupID:groupID,
      itemName:itemName,
      itemValue1:itemValue1,
      itemValue2:itemValue2===undefined?'':itemValue2,
      itemValue3:itemValue3===undefined?'':itemValue3
    }
    itemList.push(newItemInfo);
  }

  return itemList;
}

export const getInternalPropInfo = (propInfoList:InternalPropInfo[], propName:string):InternalPropInfo|null => {

  for(let propInfo of propInfoList) {
    if(propInfo.propName === propName) {
      return propInfo;
    }
  }
  return null;
}

export const setInternalPropInfo = (propInfoList:InternalPropInfo[], propName:string, propInt:number, propString:string, propData:string):InternalPropInfo[] => {

  for(let propInfo of propInfoList) {
    if(propInfo.propName === propName) {
      propInfo.propInt = propInt;
      propInfo.propString = propString;
      propInfo.propData = propData;
      break;
    }
  }

  return propInfoList;
}

// 요청 파라메터에 설정된 값을 ReqQuerySettingItemListInfo 타입 객체로 변환
export const convertReqParamToQuerySettingItemListInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfSettingList(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqQuerySettingItemListInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType']
  };
  resultInfo.data = info;
  return resultInfo;
};

export const getJsonFromSettingItemInfoList = (itemList: SettingItemInfo[]): string => {

  let jsonItemList = [];
  for (let item of itemList) {
    jsonItemList.push(item);
  }

  return JSON.stringify(jsonItemList);
};

// 요청 파라메터에 설정된 값을 ReqUpdateSettingItemInfo 타입 객체로 변환
export const convertReqParamToUpdateSettingItemListInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateSetting(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // const itemList: SettingItemInfo[] = [];
  // const jsonItemList = JSON.parse(resultInfo.data['itemList']);

  const info: ReqUpdateSettingItemListInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    settingItemTable: resultInfo.data['settingItemTable'],
    otpCode: resultInfo.data['otpCode']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateClientConfigInfo 타입 객체로 변환
export const convertReqParamToUpdateClientSettingInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateClientConfig(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqUpdateClientConfigInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    clientConfig: resultInfo.data['clientConfig']
  };
  resultInfo.data = info;
  return resultInfo;
};