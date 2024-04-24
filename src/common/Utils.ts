import {Request} from 'express';
import dayjs from 'dayjs';

const upperAlphaTable = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
const lowerAlphaTable = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
const numberTable = ['0','1','2','3','4','5','6','7','8','9'];

// max자리수의 랜덤숫자 생성하기
export function getRandomID(max:number) {
	return Math.floor(Math.random()*max);
}

// digit 자릿수의 랜덤 문자열 생성하기
export function getRandomString(upperCaseOnly:boolean, digit:number) {

  let tableRandIndex;
  let randIndex;
  let nextChar;
  let resultStr = "";
  for(let i=0;i<digit;i++) {
    if(upperCaseOnly === true) {
      tableRandIndex = Math.floor(Math.random()*2);
    } else {
      tableRandIndex = Math.floor(Math.random()*3);
    }

    if(tableRandIndex === 0) {
      randIndex = Math.floor(Math.random()*numberTable.length);
      nextChar = numberTable[randIndex];

    } else if(tableRandIndex === 1) {
      randIndex = Math.floor(Math.random()*upperAlphaTable.length);
      nextChar = upperAlphaTable[randIndex];

    } else {
      randIndex = Math.floor(Math.random()*lowerAlphaTable.length);
      nextChar = lowerAlphaTable[randIndex];
    }

    resultStr += nextChar;
  }

  return resultStr;
}

// 브라우저의 현재 IP 가져오기
export const getClientIP = (req:Request) => {
    const addr = req.get('x-forwarded-for') || req.connection.remoteAddress;
    return addr;
}

// 로컬시간의 타임존 offset값 가져오기
export const getLocalTimezoneOffset = () => {

    const dateNow = new Date();
    return -1*(dateNow.getTimezoneOffset()/60);
}

// 현재 시간(초단위)
export const getNowSec = () => {

  return dayjs().unix();
}

// 현재 시간(밀리초단위)
export const getNow = () => {

    return dayjs().valueOf();
}

// 현재 일시를 문자열로 가져오는 함수.
export const getStdNowString = () => {

  const now = dayjs();
  return now.format('YYYY-MM-DD HH:mm:ss');
}

// 현재 일시를 UTC 문자열로 가져오는 함수.
export const getStdNowUTCString = () => {

  const now = dayjs();
  return now.format('YYYY-MM-DDTHH:mm:ss');
}

// 유효한 시간포맷인지 체크하는 함수.
export const isValidDateTimeFormat = (dateTimeStr:string) => {

  return dayjs(dateTimeStr,'YYYY-MM-DD HH:mm:ss').isValid();
}

// 현재 시간보다 뒤인지 체크하는 함수.
export const isFutureFromNow = (dateTimeStr:string,offsetSec:number) => {

  const now = dayjs();
  now.add(offsetSec,'seconds');

  return now.isBefore(dateTimeStr);
}

export const isFutureFromDateTime = (targetDateTimeStr:string,offsetSec:number,startDateTimeStr:string) => {

  const startDate = dayjs(startDateTimeStr,'YYYY-MM-DD HH:mm:ss');
  startDate.add(offsetSec,'seconds');

  return startDate.isBefore(targetDateTimeStr);
}

// 문자열을 base64로 인코딩/디코딩 해주는 함수.
export const encodeBase64 = (orgStr:string):string => {

  return Buffer.from(orgStr,'utf8').toString('base64');
}

export const decodeBase64 = (base64Str:string):string => {

  return Buffer.from(base64Str,'base64').toString('utf8');
}

// 테이블을 입력받아 랜덤하게 섞어서 변환하는 함수.
export const generateRandomTable = (table:any[]):any[] => {

  let tbl = [...table];
  const resultTable = [];
  let randIndex;
  while(tbl.length > 0) {
    randIndex = Math.floor(Math.random()*tbl.length);
    resultTable.push(tbl[randIndex]);

    tbl.splice(randIndex,1);
  }

  return resultTable;
}