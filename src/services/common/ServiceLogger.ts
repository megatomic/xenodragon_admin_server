const dayjs = require('dayjs');
const appRootPath = require('app-root-path');

const { transports,createLogger,format } = require('winston');
const { processResponse } = require('./CommonServiceProcessor');

// winston을 일반적으로 사용하면, info를 출력할 경우 error,warning,info가 한 파일에 출력된다.
// info는 info파일에, error는 error파일에 출력하기 위해 별도의 logger 객체를 생성했고,
// 두 객체 모두 error 레벨에 대응하도록 하고 출력파일만 각각 다른 파일로 지정하였다.
// 즉, logInfo() 호출시, error 레벨로 출력하고 파일은 info.log에 출력!
// logError() 호출시, error 레벨로 출력하고 파일은 error.log에 출력!

const infoLogFormat = format.printf((info:any) => {
    const now = dayjs();
    return `[${now.format('YYYY/MM/DD HH:mm:ss')}] [INFO] ${info.message}`;
});

const infoLogger = createLogger({
    transports: [
        new transports.File({filename:`${appRootPath}/logs/info.log`,level:'error',format:infoLogFormat})
    ]
});

const errorLogFormat = format.printf((info:any) => {
    const now = dayjs();
    return `[${now.format('YYYY/MM/DD HH:mm:ss')}] [ERROR] ${info.message}`;
});

const errorLogger = createLogger({
    transports: [
        new transports.File({filename:`${appRootPath}/logs/error.log`,level:'error',format:errorLogFormat})
    ]
});

if(process.env.NODE_ENV !== 'production') {
    infoLogger.add(new transports.Console({level:'error',format:infoLogFormat}));
    errorLogger.add(new transports.Console({level:'error',format:errorLogFormat}));
}

// info 레벨 로그 출력: .env에 NODE_ENV값이 'production'일 때만 출력.
export const logInfo = (service:string|null, account:string|null, msg:string) => {

    let finalMsg = '';
    if(service === null && account === null) {
        finalMsg = `${msg}`;
    } else if(service === null) {
        finalMsg = `[${account}] ${msg}`;
    } else if(account === null) {
        finalMsg = `[${service}] ${msg}`;
    } else {
        finalMsg = `[${service}]:[${account}] ${msg}`;
    }

    console.log(finalMsg);
    if(process.env.NODE_ENV === 'production') {
        infoLogger.error(finalMsg);
    } else {
        logDebug(finalMsg);
    }
};

// error 레벨 로그 출력: .env에 NODE_ENV값이 'production'일 때만 출력.
export const logError = (service:string|null, account:string|null, msg:string) => {

    let finalMsg = '';
    if(service === null && account === null) {
        finalMsg = `${msg}`;
    } else if(service === null) {
        finalMsg = `[${account}] ${msg}`;
    } else if(account === null) {
        finalMsg = `[${service}] ${msg}`;
    } else {
        finalMsg = `[${service}]:[${account}] ${msg}`;
    }
    
    if(process.env.NODE_ENV === 'production') {
        errorLogger.error(finalMsg);
    } else {
        logDebug(finalMsg);
    }
};

// debug 레벨 로그 출력: .env파일에 DEBUG 셋팅시에만 출력
export const logDebug = (msg:string) => {

    if(process.env.DEBUG === 'true') {
        const now = dayjs();
        console.log(`[${now.format('MM/DD HH:mm:ss.SSS')}] ${msg}`);
    }
};