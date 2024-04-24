

export const DEVICE_TYPE_ALL = 1;
export const DEVICE_TYPE_IOS = 2;
export const DEVICE_TYPE_ANDROID = 3;

// 모든 요청 파라메터의 객체에 공통으로 포함되는 항목을 정의한 인터페이스
export default interface ReqBaseInfo {
    adminID: string
    authToken: string
    serverType: string // 게임서버 어드민 타입(local,dev,cbt)
}

// string과 number를 값으로 받을 수 있는 json타입 선언
export type jsonKeyValue = {
    [key:string]: string|number;
}

// 보상 아이템 기본 기본 인터페이스
export interface GameItemInfo {
    itemID: string
    itemValue: number
}