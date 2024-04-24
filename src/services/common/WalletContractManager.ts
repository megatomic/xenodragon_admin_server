import * as serviceLogger from 'src/services/common/ServiceLogger';
import {ResultCode,ResultInfo,getResultForm,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import path = require("path");
import { constants } from 'buffer';
import * as constVal from 'src/common/constants';
import BigNumber from 'bignumber.js';

const {ethers} = require("ethers");

const DEFAULT_GASPRICE = 800000000000;

const abi = [
    // Read-Only Functions
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",

    // Authenticated Functions
    "function transfer(address to, uint amount) returns (bool)",

    // Events
    "event Transfer(address indexed from, address indexed to, uint amount)"
];

export const getContractInfo = (serverType:string,opType:number,walletInfo:any):any => {

    const contractInfo = {provider:null, signer:null, nstContract:null, xdcContract:null, privateKey:''};

    let privateKey = null;
    if(serverType.toUpperCase() === 'LIVE') {
        contractInfo.provider = new ethers.JsonRpcProvider(process.env.LIVE_KSTADIUM_RPCSERVER);

        if(walletInfo.walletKey !== undefined) {
            privateKey = walletInfo.walletKey;
        } else {
            privateKey = process.env.LIVE_MARKET_OPERATOR_PRIVATEKEY;
        }

        contractInfo.signer = new ethers.Wallet(privateKey,contractInfo.provider);
        contractInfo.nstContract = new ethers.Contract(process.env.LIVE_TOKEN_NST_CONTRACT,abi,contractInfo.signer);
        contractInfo.xdcContract = new ethers.Contract(process.env.LIVE_TOKEN_XDC_CONTRACT,abi,contractInfo.signer);
        contractInfo.privateKey = privateKey;

    } else {
        contractInfo.provider = new ethers.JsonRpcProvider(process.env.DEV_KSTADIUM_RPCSERVER);

        if(walletInfo.walletKey !== undefined) {
            privateKey = walletInfo.walletKey;
        } else {
            privateKey = process.env.LIVE_MARKET_OPERATOR_PRIVATEKEY;
        }

        contractInfo.signer = new ethers.Wallet(privateKey,contractInfo.provider);
        contractInfo.nstContract = new ethers.Contract(process.env.DEV_TOKEN_NST_CONTRACT,abi,contractInfo.signer);
        contractInfo.xdcContract = new ethers.Contract(process.env.DEV_TOKEN_XDC_CONTRACT,abi,contractInfo.signer);
        contractInfo.privateKey = privateKey;
    }

    return contractInfo;
}

export const processWalletBalanceInfo = async (serverType:string, address:string, walletInfo:any):Promise<ResultInfo> => {

    const resultInfo = getResultForm(ResultCode.SUCCESS,'',{ksta:0,nst:0,xdc:0});

    const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_OPERATING,{walletKey:walletInfo.walletKey!});
    try {
        const ksta:BigNumber = new BigNumber(await contractInfo.provider.getBalance(address));
        const nst:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(address));
        const xdc:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(address));

        const etherUnit:BigNumber = new BigNumber(1000000000000000000);
        const ksta2 = ksta.dividedBy(etherUnit).toString();
        const nst2 = nst.dividedBy(etherUnit).toString();
        const xdc2 = xdc.dividedBy(etherUnit).toString();

        console.log(`processWalletBalanceInfo() balance info=${ksta2}ksta, ${nst2}nst, ${xdc2}xdc`);

        resultInfo.data = {ksta:ksta2, nst:nst2, xdc:xdc2};

    } catch(err) {
        console.log(err);
        resultInfo.resultCode = ResultCode.ERC20TOKEN_BALANCE_GET_FAILED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.ERC20TOKEN_BALANCE_GET_FAILED.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}