import SQLDataManager from 'src/common/db/SQLDataManager';
import { ResultCode, ResultInfo } from 'src/common/ResponseManager';
import * as ndo from './NotificationDataObject';
import * as Utils from 'src/common/Utils';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
//import { encodeACLInfo, decodeACLInfo } from 'src/services/common/AdminACLManager';

dayjs.extend(utc);

// NotificationInfo 객체를 notification_info 테이블의 레코드(json)으로 변환
export const convertNotificationInfoToDBRecord = (notiInfo: ndo.NotificationInfo): any => {
  const recordObj = {
    noti_id: notiInfo.notiID,
    noti_type: notiInfo.notiType,
    data_type: notiInfo.dataType,
    title: JSON.stringify(notiInfo.titleTable),
    content: JSON.stringify(notiInfo.contentTable),
    schedule_noti_flag: notiInfo.notShowAgainFlag === true ? 1 : 0,
    start_time: notiInfo.startTime,
    end_time: notiInfo.endTime,
    activation_flag: notiInfo.activationFlag === true ? 1 : 0,
    creation_time: notiInfo.creationTime,
  };

  return recordObj;
};

// notification_info 테이블의 레코드(json)을 NotificationInfo 객체로 변환
export const convertDBRecordToNotificationInfo = (record: any): ndo.NotificationInfo => {
  const userInfo: ndo.NotificationInfo = {
    notiID: record.noti_id,
    creatorID: record.creator_id,
    notiType: record.noti_type,
    dataType: record.data_type,
    titleTable: JSON.parse(cmnSvcProcessor.unescapeSpecialCharsForJSON(record.title)),
    contentTable: JSON.parse(cmnSvcProcessor.unescapeSpecialCharsForJSON(record.content)),
    notShowAgainFlag: record.schedule_noti_flag === 1 ? true : false,
    startTime: record.start_time,
    endTime: record.end_time,
    activationFlag: record.activation_flag === 1 ? true : false,
    creationTime: record.creation_time,
  };

  return userInfo;
};

// 공지사항 조회
export const queryDBNotificationList = async (sqlDataManager: SQLDataManager, reqNotiListInfo: ndo.ReqNotiListInfo, queryNum: number): Promise<any> => {
  let pNo = reqNotiListInfo.pageNo;
  if (reqNotiListInfo.pageNo < 1) {
    pNo = 1;
  }

  console.log('filter=', reqNotiListInfo.queryFilterInfo);

  let whereField1 = '';
  let whereField2 = '';
  if (reqNotiListInfo.queryFilterInfo.titleKeyword.trim() !== '') {
    whereField1 = `and binary title like '%${reqNotiListInfo.queryFilterInfo.titleKeyword.trim()}%'`;
  }

  if (reqNotiListInfo.queryFilterInfo.filterStartTime !== null || reqNotiListInfo.queryFilterInfo.filterEndTime !== null) {
    let startDate = '1900-01-01 00:00:00';
    let endDate = '2099-12-30 00:00:00';

    if (reqNotiListInfo.queryFilterInfo.filterStartTime !== null) {
      startDate = reqNotiListInfo.queryFilterInfo.filterStartTime;
    }

    if (reqNotiListInfo.queryFilterInfo.filterEndTime !== null) {
      endDate = reqNotiListInfo.queryFilterInfo.filterEndTime;
    }
    whereField2 = `and creation_time between '${startDate}' and '${endDate}'`;
  }

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.notification_info where noti_type = ${
    reqNotiListInfo.notiType
  } ${whereField1} ${whereField2} order by creation_time desc limit ${queryNum} offset ${(pNo - 1) * queryNum};`;
  sqlStatements += `select count(*) from ${dbmsInfo.defaultDatabase}.notification_info;`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  let notiList: any[] = [];
  if (resultInfo.data !== null && resultInfo.data.length > 0) {
    notiList = [...resultInfo.data[0]];
  }

  let totalRecordCount = notiList.length;
  if(resultInfo.data[1][0] !== undefined && resultInfo.data[1][0]['count(*)'] !== undefined) {
    totalRecordCount =   resultInfo.data[1][0]['count(*)'];
  }

  if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
    resultInfo.resultCode = ResultCode.SUCCESS;
  }

  let notiInfoList: ndo.NotificationInfo[] = [];
  let notiInfo: ndo.NotificationInfo;
  for (let notiRecord of notiList) {
    notiInfo = convertDBRecordToNotificationInfo(notiRecord);
    notiInfoList.push(notiInfo);
  }

  resultInfo.data = {totalCount:totalRecordCount, list:notiInfoList};

  return resultInfo;
};

// 공지사항 조회: 특정 공지ID 목록
export const queryDBNotiListForNotiIDs = async (sqlDataManager: SQLDataManager, notiIDList: number[], queryNum: number): Promise<any> => {
  let fieldList = JSON.stringify(notiIDList);
  fieldList = fieldList.replace('[', '(');
  fieldList = fieldList.replace(']', ')');
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.notification_info where noti_id in ${fieldList} order by creation_time desc`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  const notiList = [...resultInfo.data];

  let notiInfoList: ndo.NotificationInfo[] = [];
  let notiInfo: ndo.NotificationInfo;
  for (let notiRecord of notiList) {
    notiInfo = convertDBRecordToNotificationInfo(notiRecord);
    notiInfoList.push(notiInfo);
  }
  resultInfo.data = notiInfoList;

  return resultInfo;
};

// 새 공지사항 등록
export const registerDBNewNotification = async (sqlDataManager: SQLDataManager, reqNewNotiInfo: ndo.ReqNewNotiInfo): Promise<any> => {
  const fieldNameList = `(noti_type, creator_id, data_type, title, content, schedule_noti_flag, start_time, end_time, activation_flag, creation_time)`;
  const fieldValueList = `(${reqNewNotiInfo.notiType}, '${reqNewNotiInfo.adminID}', ${reqNewNotiInfo.dataType}, '${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqNewNotiInfo.titleTable))}', '${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqNewNotiInfo.contentTable))}', ${
    reqNewNotiInfo.notShowAgainFlag ? 1 : 0
  }, '${dayjs(reqNewNotiInfo.startTime).format('YYYY-MM-DD HH:mm:ss')}', '${dayjs(reqNewNotiInfo.endTime).format('YYYY-MM-DD HH:mm:ss')}', ${reqNewNotiInfo.activationFlag ? 1 : 0}, '${Utils.getStdNowString()}')`;

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.notification_info ${fieldNameList} values ${fieldValueList}`;

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 공지사항 수정
export const updateDBNotification = async (sqlDataManager: SQLDataManager, reqUpdateNotiInfo: ndo.ReqUpdateNotiInfo): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `update ${dbmsInfo.defaultDatabase}.notification_info set data_type=${reqUpdateNotiInfo.dataType},title='${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqUpdateNotiInfo.titleTable))}', content='${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqUpdateNotiInfo.contentTable))}', schedule_noti_flag=${
    reqUpdateNotiInfo.notShowAgainFlag === true ? 1 : 0
  }, start_time='${dayjs(reqUpdateNotiInfo.startTime).format('YYYY-MM-DD HH:mm:ss')}', end_time='${dayjs(reqUpdateNotiInfo.endTime).format('YYYY-MM-DD HH:mm:ss')}', activation_flag=${reqUpdateNotiInfo.activationFlag === true ? 1 : 0} where noti_id=${
    reqUpdateNotiInfo.notiID
  }`;

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 공지사항 삭제
export const deleteDBNotifications = async (sqlDataManager: SQLDataManager, reqDeleteNotificationsInfo: ndo.ReqDeleteNotificationsInfo): Promise<any> => {
  let idListStr = '(';
  for (let v of reqDeleteNotificationsInfo.notiIDList) {
    if (idListStr !== '(') {
      idListStr += ',';
    }
    idListStr += v.toString();
  }

  idListStr += ')';

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `delete from ${dbmsInfo.defaultDatabase}.notification_info where noti_id in ${idListStr}`;

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 공지사항 활성화/비활성화
export const updateDBNotificationActivation = async (sqlDataManager: SQLDataManager, reqEventActivationInfo: ndo.ReqNotificationActivationInfo): Promise<any> => {
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `update ${dbmsInfo.defaultDatabase}.notification_info set activation_flag=${reqEventActivationInfo.activationFlag === true ? 1 : 0} where event_id = ${
    reqEventActivationInfo.notiID
  }`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  const notiList = [...resultInfo.data];
  resultInfo.data = notiList[0];

  return resultInfo;
};
