import SQLDataManager from 'src/common/db/SQLDataManager';
import { ResultCode, ResultInfo } from 'src/common/ResponseManager';
import * as edo from './EventDataObject';
import * as Utils from 'src/common/Utils';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// EventInfo 객체를 event_info 테이블의 레코드(json)으로 변환
export const convertEventInfoToDBRecord = (eventInfo: edo.EventInfo): any => {
  const recordObj = {
    event_id: eventInfo.eventID,
    event_type: eventInfo.eventType,
    title: JSON.stringify(eventInfo.titleTable),
    content: JSON.stringify(eventInfo.contentTable),
    data: eventInfo.rewardData,
    start_time: eventInfo.startTime,
    end_time: eventInfo.endTime,
    login_start_time: eventInfo.loginStartTime,
    login_end_time: eventInfo.loginEndTime,
    activation_flag: eventInfo.activationFlag === true ? 1 : 0,
    creation_time: eventInfo.creationTime,
  };

  return recordObj;
};

// event_info 테이블의 레코드(json)을 EventInfo 객체로 변환
export const convertDBRecordToEventInfo = (record: any): edo.EventInfo => {
  const eventInfo: edo.EventInfo = {
    eventID: record.event_id,
    eventType: record.event_type,
    presetTitle: '',
    langPresetID: 0,
    rewardPresetID: 0,
    titleTable: JSON.parse(cmnSvcProcessor.unescapeSpecialCharsForJSON(record.title)),
    contentTable: JSON.parse(cmnSvcProcessor.unescapeSpecialCharsForJSON(record.content)),
    rewardData: JSON.parse(record.data),
    startTime: record.start_time,
    endTime: record.end_time,
    loginStartTime: record.login_start_time,
    loginEndTime: record.login_end_time,
    activationFlag: record.activation_flag === 1 ? true : false,
    creationTime: record.creation_time,
  };

  return eventInfo;
};

export const convertDBRecordToCouponInfo = (record: any): edo.CouponInfo => {
  const eventInfo: edo.CouponInfo = {
    couponID: record.coupon_id,
    couponType: record.coupon_type,
    couponDigit: record.coupon_digit,
    sharedCouponCode: record.shared_coupon_code,
    couponQty: record.coupon_qty,
    titleTable: JSON.parse(cmnSvcProcessor.unescapeSpecialCharsForJSON(record.title)),
    contentTable: JSON.parse(cmnSvcProcessor.unescapeSpecialCharsForJSON(record.content)),
    rewardData: JSON.parse(record.reward_data),
    startTime: record.start_time,
    endTime: record.end_time,
    activationFlag: record.activation_flag,
    creationTime: record.creation_time,
    couponData: (record.coupon_data===""?[]:JSON.parse(record.coupon_data))
  };

  return eventInfo;
};

// 이벤트 목록 조회
export const queryDBEventList = async (sqlDataManager: SQLDataManager, reqEventListInfo: edo.ReqEventListInfo, queryNum: number): Promise<any> => {
  let pNo = reqEventListInfo.pageNo;
  if (reqEventListInfo.pageNo < 1) {
    pNo = 1;
  }

  console.log('filter=', reqEventListInfo.queryFilterInfo);

  let whereField1 = '';
  let whereField2 = '';
  let whereField3 = '';
  if (reqEventListInfo.queryFilterInfo.titleKeyword.trim() !== '') {
    whereField1 = `and binary title like '%${reqEventListInfo.queryFilterInfo.titleKeyword.trim()}%'`;
  }

  if (reqEventListInfo.queryFilterInfo.filterStartTime !== null || reqEventListInfo.queryFilterInfo.filterEndTime !== null) {
    let startDate = '1900-01-01 00:00:00';
    let endDate = '2099-12-30 00:00:00';

    if (reqEventListInfo.queryFilterInfo.filterStartTime !== null) {
      startDate = reqEventListInfo.queryFilterInfo.filterStartTime;
    }

    if (reqEventListInfo.queryFilterInfo.filterEndTime !== null) {
      endDate = reqEventListInfo.queryFilterInfo.filterEndTime;
    }
    whereField2 = `and start_time between '${startDate}' and '${endDate}'`;
  }

  if (reqEventListInfo.queryFilterInfo.filterState > 0) {
    const curDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
    switch (reqEventListInfo.queryFilterInfo.filterState) {
      case edo.EVENTPROG_TYPE_INACTIVE:
        whereField3 = `and activation_flag=0 `;
        break;
      case edo.EVENTPROG_TYPE_READY:
        whereField3 = `and start_time > '${curDate}' `;
        break;
      case edo.EVENTPROG_TYPE_ONAIR:
        whereField3 = `and start_time < '${curDate}' and end_time > '${curDate}' `;
        break;
      case edo.EVENTPROG_TYPE_ENDED:
        whereField3 = `and end_time < '${curDate}' `;
        break;
    }
  }

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.event_info where event_type = ${
    reqEventListInfo.eventType
  } ${whereField1} ${whereField2} ${whereField3} order by creation_time desc limit ${queryNum} offset ${(pNo - 1) * queryNum};`;
  sqlStatements += `select count(*) from ${dbmsInfo.defaultDatabase}.event_info;`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  let eventList: any[] = [];
  if (resultInfo.data !== null && resultInfo.data.length > 0) {
    eventList = [...resultInfo.data[0]];
  }
  
  let totalRecordCount = eventList.length;
  if(resultInfo.data[1][0] !== undefined && resultInfo.data[1][0]['count(*)'] !== undefined) {
    totalRecordCount =   resultInfo.data[1][0]['count(*)'];
  }

  if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
    resultInfo.resultCode = ResultCode.SUCCESS;
  }

  // DB에서 읽은 데이터중 '\n'이 들어간 문자열은 JSON 파싱시 오류 발생함!!!
  
  let eventInfoList: edo.EventInfo[] = [];
  let eventInfo: edo.EventInfo;
  for (let eventRecord of eventList) {
    eventInfo = convertDBRecordToEventInfo(eventRecord);
    eventInfoList.push(eventInfo);
  }

  resultInfo.data = {totalCount:totalRecordCount, list:eventInfoList};

  return resultInfo;
};

// 이벤트 목록 조회: 특정 이벤트ID 목록
export const queryDBEventListForNotiIDs = async (sqlDataManager: SQLDataManager, eventIDList: number[], queryNum: number): Promise<any> => {
  let fieldList = JSON.stringify(eventIDList);
  fieldList = fieldList.replace('[', '(');
  fieldList = fieldList.replace(']', ')');
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.event_info where event_id in ${fieldList} order by creation_time desc`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  const eventList = [...resultInfo.data];

  let eventInfoList: edo.EventInfo[] = [];
  let eventInfo: edo.EventInfo;
  for (let eventRecord of eventList) {
    eventInfo = convertDBRecordToEventInfo(eventRecord);
    eventInfoList.push(eventInfo);
  }
  resultInfo.data = eventInfoList;

  return resultInfo;
};

// 새 이벤트 항목 등록
export const registerDBNewEvent = async (sqlDataManager: SQLDataManager, reqRegisterEventInfo: edo.ReqRegisterEventInfo): Promise<any> => {

  const fieldNameList = `(event_type, title, content, start_time, end_time, login_start_time, login_end_time, data, activation_flag, creation_time)`;
  const fieldValueList = `(${reqRegisterEventInfo.eventType},'${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqRegisterEventInfo.titleTable))}','${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqRegisterEventInfo.contentTable))}','${dayjs(reqRegisterEventInfo.startTime).format('YYYY-MM-DD HH:mm:ss')}','${
    dayjs(reqRegisterEventInfo.endTime).format('YYYY-MM-DD HH:mm:ss')
  }','${reqRegisterEventInfo.loginStartTime}','${reqRegisterEventInfo.loginEndTime}','${JSON.stringify(reqRegisterEventInfo.rewardData)}',${reqRegisterEventInfo.activationFlag ? 1 : 0},'${Utils.getStdNowString()}')`;

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.event_info ${fieldNameList} values ${fieldValueList}`;

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 이벤트 항목 갱신
export const updateDBEvent = async (sqlDataManager: SQLDataManager, reqUpdateEventInfo: edo.ReqUpdateEventInfo): Promise<any> => {
  //const itemListStr = edo.getJsonStringFromItemList(reqUpdateEventInfo.rewardItemList);

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `update ${dbmsInfo.defaultDatabase}.event_info set title='${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqUpdateEventInfo.titleTable))}',content='${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqUpdateEventInfo.contentTable))}',start_time="${
    dayjs(reqUpdateEventInfo.startTime).format('YYYY-MM-DD HH:mm:ss')
  }",end_time="${dayjs(reqUpdateEventInfo.endTime).format('YYYY-MM-DD HH:mm:ss')}",login_start_time="${reqUpdateEventInfo.loginStartTime}",login_end_time="${reqUpdateEventInfo.loginEndTime}",data='${JSON.stringify(reqUpdateEventInfo.rewardData)}',activation_flag=${reqUpdateEventInfo.activationFlag === true ? 1 : 0} where event_id = ${reqUpdateEventInfo.eventID}`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 이벤트 항목(들) 삭제
export const deleteDBEvents = async (sqlDataManager: SQLDataManager, reqDeleteEventsInfo: edo.ReqDeleteEventsInfo): Promise<any> => {
  let idListStr = '(';
  for (let v of reqDeleteEventsInfo.eventIDList) {
    if (idListStr !== '(') {
      idListStr += ',';
    }
    idListStr += v.toString();
  }

  idListStr += ')';

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `delete from ${dbmsInfo.defaultDatabase}.event_info where event_id in ${idListStr}`;

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 이벤트 활성화/비활성화
export const updateDBEventActivation = async (sqlDataManager: SQLDataManager, reqEventActivationInfo: edo.ReqEventActivationInfo): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `update ${dbmsInfo.defaultDatabase}.event_info set activation_flag=${reqEventActivationInfo.activationFlag === true ? 1 : 0} where event_id = ${reqEventActivationInfo.eventID}`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  const eventList = [...resultInfo.data];
  resultInfo.data = eventList[0];

  return resultInfo;
};

// 쿠폰 목록 조회
export const queryDBCouponInfoList = async (sqlDataManager: SQLDataManager, reqEventListInfo: edo.ReqCouponListInfo, queryNum: number): Promise<any> => {
  let pNo = reqEventListInfo.pageNo;
  if (reqEventListInfo.pageNo < 1) {
    pNo = 1;
  }

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.coupon_info order by creation_time desc limit ${queryNum} offset ${(pNo - 1) * queryNum};`;
  sqlStatements += `select count(*) from ${dbmsInfo.defaultDatabase}.event_info;`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  let couponInfoList: any[] = [];
  if (resultInfo.data !== null && resultInfo.data.length > 0) {
    couponInfoList = [...resultInfo.data[0]];
  }
  
  let totalRecordCount = couponInfoList.length;
  if(resultInfo.data[1][0] !== undefined && resultInfo.data[1][0]['count(*)'] !== undefined) {
    totalRecordCount =   resultInfo.data[1][0]['count(*)'];
  }

  if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
    resultInfo.resultCode = ResultCode.SUCCESS;
  }

  // DB에서 읽은 데이터중 '\n'이 들어간 문자열은 JSON 파싱시 오류 발생함!!!
  
  let couponList: edo.CouponInfo[] = [];
  let couponInfo: edo.CouponInfo;
  for (let couponRecord of couponInfoList) {
    couponInfo = convertDBRecordToCouponInfo(couponRecord);
    couponList.push(couponInfo);
  }

  resultInfo.data = {totalCount:totalRecordCount, list:couponList};

  return resultInfo;
};

// 새 쿠폰정보 등록
export const registerDBNewCouponInfo = async (sqlDataManager: SQLDataManager, reqNewCouponInfo: edo.ReqRegisterNewCouponInfo, couponCodeTable:any): Promise<any> => {

  const fieldNameList = `(coupon_type, coupon_digit, shared_coupon_code, coupon_qty, activation_flag, start_time, end_time, reward_data, title, content, coupon_data, creation_time)`;
  const fieldValueList = `(${reqNewCouponInfo.couponType},${reqNewCouponInfo.couponDigit},'${reqNewCouponInfo.sharedCouponCode}',${reqNewCouponInfo.couponQty},${reqNewCouponInfo.activationFlag},'${dayjs(reqNewCouponInfo.startTime).format('YYYY-MM-DD HH:mm:ss')}','${dayjs(reqNewCouponInfo.endTime).format('YYYY-MM-DD HH:mm:ss')}','${JSON.stringify(reqNewCouponInfo.rewardData)}','${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqNewCouponInfo.titleTable))}','${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqNewCouponInfo.contentTable))}','${JSON.stringify(couponCodeTable)}','${Utils.getStdNowString()}')`;

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.coupon_info ${fieldNameList} values ${fieldValueList}`;

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};