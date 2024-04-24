import * as serviceLogger from 'src/services/common/ServiceLogger';
import {ResultCode,ResultInfo,getResultForm,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import path = require("path");
import { constants } from 'buffer';
import * as constVal from 'src/common/constants';
import BigNumber from 'bignumber.js';
import * as Utils from 'src/common/Utils';
import dayjs from 'dayjs';

const {ethers} = require("ethers");
const nftArtifact = require('./NFTContractArtifact.json');
const tokenArtifact = require('./ERC20TokenContractArtifact.json');

const DEFAULT_GASPRICE = 800000000000;

const b2cContractABI = [
    "function getHolder() view returns (address)",
    "function getToken() view returns (address)",
    "function getNFT() view returns (address)",
    "function getPrice() view returns (uint256)",

    "function setHolder(address holder) returns (bool)",
    "function setToken(address token) returns (bool)",
    "function setNFT(address nft) returns (bool)",
    "function setPrice(uint256 price) returns (bool)"
];

const c2cContractABI = [
    "function getToken() view returns (address)",
    "function getNFT() view returns (address)",
    "function getDefaultFee() view returns(uint256)",

    "function setToken(address token) returns (bool)",
    "function setNFT(address nft) returns (bool)",
    "function setDefaultFee(uint256 fee) returns (bool)"
];

export const getContractInfo = (serverType:string,opType:number,nftInfo:any):any => {

    console.log('nftInfo=',nftInfo);
    
    const erc20ABI = [
        // Read-Only Functions
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
    
        "function approve(address spender, uint amount) returns (bool)",

        // Authenticated Functions
        "function transfer(address to, uint amount) returns (bool)",
    
        // Events
        "event Transfer(address indexed from, address indexed to, uint amount)"
    ];

    const marketABI = [
        "function withdrawAll() returns (bool)"
    ];

    const contractInfo = {provider:null, signer:null, contract:null, transferContract:'', nstContract:'', xdcContract:'', market:{dragonMarketContract:'', gearMarketContract:'', packageMarketContract:'', c2cContract1:'', c2cContract2:''}, privateKey:''};

    let privateKey='';
    if(serverType.toUpperCase() === 'LIVE') {
        if(nftInfo.privateKey !== undefined) {
            privateKey = nftInfo.privateKey;
        } else {
            if(opType === constVal.NFT_CONTRACT_OPTYPE_MINTING) {
                privateKey = process.env.LIVE_NFT_MINTER_PRIVATEKEY!;
            } else {
                privateKey = process.env.LIVE_NFT_OPERATOR_PRIVATEKEY!;
            }
        }

        contractInfo.provider = new ethers.JsonRpcProvider(process.env.LIVE_KSTADIUM_RPCSERVER);
        contractInfo.signer = new ethers.Wallet(privateKey,contractInfo.provider);
        if(nftInfo.contractAddress !== undefined) {
            if(opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_DRAGON || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_GEAR || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_PACKAGE) {
                contractInfo.contract = new ethers.Contract(nftInfo.contractAddress,marketABI,contractInfo.signer);
            } else {
                contractInfo.contract = new ethers.Contract(nftInfo.contractAddress,nftArtifact.abi,contractInfo.signer);
            }
        }
        contractInfo.privateKey = privateKey;
        contractInfo.transferContract = new ethers.Contract(process.env.LIVE_TOKENTRANSFER_CONTRACT,tokenArtifact.abi,contractInfo.signer);
        contractInfo.nstContract = new ethers.Contract(process.env.LIVE_TOKEN_NST_CONTRACT,erc20ABI,contractInfo.signer);
        contractInfo.xdcContract = new ethers.Contract(process.env.LIVE_TOKEN_XDC_CONTRACT,erc20ABI,contractInfo.signer);

        if(opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_VIEW || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_DRAGON || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_GEAR || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_PACKAGE) {
            contractInfo.market.dragonMarketContract = new ethers.Contract(process.env.LIVE_MARKET_DRAGONSALE_CONTRACT,marketABI,contractInfo.signer);
            contractInfo.market.gearMarketContract = new ethers.Contract(process.env.LIVE_MARKET_GEARSALE_CONTRACT,marketABI,contractInfo.signer);
            contractInfo.market.packageMarketContract = new ethers.Contract(process.env.LIVE_MARKET_PACKAGESALE_CONTRACT,marketABI,contractInfo.signer);
        } else if(opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_C2C) {
            contractInfo.market.c2cContract1 = new ethers.Contract(process.env.LIVE_MARKET_C2C_CONTRACT1,marketABI,contractInfo.signer);
            contractInfo.market.c2cContract2 = new ethers.Contract(process.env.LIVE_MARKET_C2C_CONTRACT2,marketABI,contractInfo.signer);
        }

    } else if(serverType.toUpperCase() === 'QA' || serverType.toUpperCase() === 'REVIEW') {
        if(nftInfo.privateKey !== undefined) {
            privateKey = nftInfo.privateKey;
        } else {
            privateKey = process.env.QA_NFT_OWNER_PRIVATEKEY!;
        }

        contractInfo.provider = new ethers.JsonRpcProvider(process.env.QA_KSTADIUM_RPCSERVER);
        contractInfo.signer = new ethers.Wallet(privateKey,contractInfo.provider);
        if(opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_DRAGON || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_GEAR || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_PACKAGE) {
            contractInfo.contract = new ethers.Contract(nftInfo.contractAddress,marketABI,contractInfo.signer);
        } else if(nftInfo.contractAddress !== undefined) {
            contractInfo.contract = new ethers.Contract(nftInfo.contractAddress,nftArtifact.abi,contractInfo.signer);
        }
        contractInfo.privateKey = privateKey;
        contractInfo.transferContract = new ethers.Contract(process.env.DEV_TOKENTRANSFER_CONTRACT,tokenArtifact.abi,contractInfo.signer);
        contractInfo.nstContract = new ethers.Contract(process.env.DEV_TOKEN_NST_CONTRACT,erc20ABI,contractInfo.signer);
        contractInfo.xdcContract = new ethers.Contract(process.env.DEV_TOKEN_XDC_CONTRACT,erc20ABI,contractInfo.signer);

        if(opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_VIEW || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_DRAGON || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_GEAR || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_PACKAGE) {
            contractInfo.market.dragonMarketContract = new ethers.Contract(process.env.QA_MARKET_DRAGONSALE_CONTRACT,marketABI,contractInfo.signer);
            contractInfo.market.gearMarketContract = new ethers.Contract(process.env.QA_MARKET_GEARSALE_CONTRACT,marketABI,contractInfo.signer);
            contractInfo.market.packageMarketContract = new ethers.Contract(process.env.QA_MARKET_PACKAGESALE_CONTRACT,marketABI,contractInfo.signer);
        } else if(opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_C2C) {
            contractInfo.market.c2cContract1 = new ethers.Contract(process.env.QA_MARKET_C2C_CONTRACT1,marketABI,contractInfo.signer);
            contractInfo.market.c2cContract2 = new ethers.Contract(process.env.QA_MARKET_C2C_CONTRACT2,marketABI,contractInfo.signer);
        }

    } else {
        if(nftInfo.privateKey !== undefined) {
            privateKey = nftInfo.privateKey;
        } else {
            privateKey = process.env.DEV_NFT_OWNER_PRIVATEKEY!;
        }

        contractInfo.provider = new ethers.JsonRpcProvider(process.env.DEV_KSTADIUM_RPCSERVER);
        contractInfo.signer = new ethers.Wallet(privateKey,contractInfo.provider);
        if(opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_DRAGON || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_GEAR || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_PACKAGE) {
            contractInfo.contract = new ethers.Contract(nftInfo.contractAddress,marketABI,contractInfo.signer);
        } else if(nftInfo.contractAddress !== undefined) {
            contractInfo.contract = new ethers.Contract(nftInfo.contractAddress,nftArtifact.abi,contractInfo.signer);
        }
        contractInfo.privateKey = privateKey;
        contractInfo.transferContract = new ethers.Contract(process.env.DEV_TOKENTRANSFER_CONTRACT,tokenArtifact.abi,contractInfo.signer);
        contractInfo.nstContract = new ethers.Contract(process.env.DEV_TOKEN_NST_CONTRACT,erc20ABI,contractInfo.signer);
        contractInfo.xdcContract = new ethers.Contract(process.env.DEV_TOKEN_XDC_CONTRACT,erc20ABI,contractInfo.signer);

        if(opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_VIEW || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_DRAGON || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_GEAR || opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_PACKAGE) {
            contractInfo.market.dragonMarketContract = new ethers.Contract(process.env.DEV_MARKET_DRAGONSALE_CONTRACT,marketABI,contractInfo.signer);
            contractInfo.market.gearMarketContract = new ethers.Contract(process.env.DEV_MARKET_GEARSALE_CONTRACT,marketABI,contractInfo.signer);
            contractInfo.market.packageMarketContract = new ethers.Contract(process.env.DEV_MARKET_PACKAGESALE_CONTRACT,marketABI,contractInfo.signer);
        } else if(opType === constVal.NFT_CONTRACT_OPTYPE_MARKET_C2C) {
            contractInfo.market.c2cContract1 = new ethers.Contract(process.env.DEV_MARKET_C2C_CONTRACT1,marketABI,contractInfo.signer);
            contractInfo.market.c2cContract2 = new ethers.Contract(process.env.DEV_MARKET_C2C_CONTRACT2,marketABI,contractInfo.signer);
        }
    }

    return contractInfo;
}

export const processMinting = async (serverType:string, mintingInfoList:any[], nftInfo:any):Promise<ResultInfo> => {
    
    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    const mintingData = ethers.randomBytes(10);

    try {
        const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_MINTING,nftInfo);

        let resultTx = null;
        let tokenIDList = [];
        if(mintingInfoList.length === 1) {
            if(ethers.isAddress(mintingInfoList[0].targetAddress) === false) {
                resultInfo.resultCode = ResultCode.NFT_CONTRACT_MINTING_FAIL_INVALIDADDRESS;
                resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_CONTRACT_MINTING_FAIL_INVALIDADDRESS.toString()];
                return resultInfo;
            }

            // [매우중요] 토큰ID가 랜덤하게 섞여서 컨트랙트에 들어가야 동일한 등급이 인접하게 배치되는 걸 막을 수 있음!!
            tokenIDList = Utils.generateRandomTable(mintingInfoList[0].tokenIDList);

            console.log('[BEFORE] org tokenIDTable=',mintingInfoList[0].tokenIDList);
            console.log('[AFTER] random tokenIDTable=',tokenIDList);

            // for(let tokenId of mintingInfoList[0].tokenIDList) {
            //     tokenIDList.push(parseInt(tokenId));
            // }

            console.log('#### minting start time:'+dayjs().format('YYYY-MM-DD HH:mm:ss'));

            if(mintingInfoList[0].tokenIDList.length > 1) {
                resultTx = await contractInfo.contract.mintBatch(mintingInfoList[0].targetAddress, tokenIDList, mintingData, {gasPrice:DEFAULT_GASPRICE});
            } else {
                resultTx = await contractInfo.contract.mintSingle(mintingInfoList[0].targetAddress, tokenIDList[0], mintingData, {gasPrice:DEFAULT_GASPRICE});
            }

            console.log('#### minting end1 time:'+dayjs().format('YYYY-MM-DD HH:mm:ss'));

        } else if(mintingInfoList.length > 1) {
            const targetAddressList = [];
            for(let mintInfo of mintingInfoList) {
                if(ethers.isAddress(mintInfo.targetAddress) === false) {
                    resultInfo.resultCode = ResultCode.NFT_CONTRACT_MINTING_FAIL_INVALIDADDRESS;
                    resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_CONTRACT_MINTING_FAIL_INVALIDADDRESS.toString()];
                    return resultInfo;
                }
                targetAddressList.push(mintInfo.targetAddress);
            }
            for(let mintInfo of mintingInfoList) {
                tokenIDList.push(parseInt(mintInfo.tokenId));
            }
            resultTx = await contractInfo.contract.mintGroup(targetAddressList, tokenIDList, mintingData, {gasPrice:DEFAULT_GASPRICE});
        }

        const receipt = await resultTx.wait();

        console.log('#### minting end2 time:'+dayjs().format('YYYY-MM-DD HH:mm:ss'));

        resultInfo = getResultForm(ResultCode.SUCCESS,'',tokenIDList);

    } catch(err) {
        console.log(err);

        resultInfo.resultCode = ResultCode.NFT_CONTRACT_MINTING_FAIL;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_CONTRACT_MINTING_FAIL.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processNFTTransfer = async (serverType:string, sourceAddress:string, targetContractAddress:string, targetAddress:string, tokenIDList:any[], nftInfo:any):Promise<ResultInfo> => {
    
    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    const mintingData = ethers.randomBytes(10);

    try {
        const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_OPERATING,nftInfo);

        console.log('sourceAddress=',sourceAddress,', targetAddress=',targetAddress);
        
        let resultTx = null;
        if(ethers.isAddress(sourceAddress) === false || ethers.isAddress(targetAddress) === false) {
            resultInfo.resultCode = ResultCode.NFT_CONTRACT_TRANSFER_FAIL_INVALIDADDRESS;
            resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_CONTRACT_TRANSFER_FAIL_INVALIDADDRESS.toString()];
            return resultInfo;
        }

        const tokenList:number[] = [];
        const valueList:number[] = [];
        for(let tokenId of tokenIDList) {
            tokenList.push(parseInt(tokenId));
            valueList.push(0);
        }

        console.log('tokenList=',tokenList);
        resultTx = await contractInfo.contract.safeBatchTransferFrom(sourceAddress, targetAddress, tokenList, valueList, mintingData, {gasPrice:DEFAULT_GASPRICE});
        console.log('resultTx=',resultTx);

        const receipt = await resultTx.wait();
        resultInfo = getResultForm(ResultCode.SUCCESS,'',tokenIDList);

    } catch(err) {
        console.log(err);

        resultInfo.resultCode = ResultCode.NFT_CONTRACT_TRANSFER_FAIL;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_CONTRACT_TRANSFER_FAIL.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processNFTList = async (serverType:string,onlyTokenInfo:boolean, address:string,offset:number,queryNum:number,nftInfo:any):Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);

    const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_OPERATING,nftInfo);
    const provider = new ethers.JsonRpcProvider(process.env.DEV_KSTADIUM_RPCSERVER);
    const wallet = new ethers.Wallet(process.env.DEV_NFT_OWNER_PRIVATEKEY!);
    wallet.connect(provider);

    console.log(`processNFTList() address=${address}, offset=${offset}, queryNum=${queryNum}, nftInfo=${nftInfo}`);

    try {
        const nftList = [];
        const totalTokenNumN = await contractInfo.contract.getTokenNum(address);
        const totalTokenNum = Number(totalTokenNumN);
        let nftOffset = 0;
        let nftQueryNum = 0;
        let tokenIDList = [];
        if(totalTokenNum > 0) {
            if(onlyTokenInfo === true) {
                tokenIDList = await contractInfo.contract.getTokenList(address);
                for(let i=0;i<tokenIDList.length;i++) {
                    nftList.push(tokenIDList[i].toString());
                }
            } else {
                nftOffset = (offset+1 > totalTokenNum ? totalTokenNum-1 : offset);
                nftQueryNum = (nftOffset+queryNum > totalTokenNum ? queryNum-((nftOffset+queryNum)-totalTokenNum) : queryNum);
                tokenIDList = await contractInfo.contract.queryTokenList(address,nftOffset,nftQueryNum);
                const nftTokenIDList = [...tokenIDList];
                const metadataURLList = await contractInfo.contract.getMetadataURIList(nftTokenIDList);
        
                for(let i=0;i<tokenIDList.length;i++) {
                    nftList.push({tokenID:tokenIDList[i].toString(),metadataURL:metadataURLList[i]});
                }
            }

            console.log('[RESULT] totalNum=',tokenIDList.length,',tokenIDList=',tokenIDList);
        }

        resultInfo = getResultForm(ResultCode.SUCCESS,'',{totalNum:Number(totalTokenNum),list:nftList,offset:nftOffset,queryNum:nftQueryNum});

    } catch(err) {
        console.log(err);
        
        resultInfo.resultCode = ResultCode.NFT_CONTRACT_GETNFTLIST_FAIL;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_CONTRACT_GETNFTLIST_FAIL.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processHugeNFTList = async (serverType:string,address:string, nftInfo:any):Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);

    const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_OPERATING,nftInfo);
    const provider = new ethers.JsonRpcProvider(process.env.DEV_KSTADIUM_RPCSERVER);
    const wallet = new ethers.Wallet(process.env.DEV_NFT_OWNER_PRIVATEKEY!);
    wallet.connect(provider);

    const queryNum = 200;
    try {
        const totalTokenNum = await contractInfo.contract.getTokenNum(address);
        let queryCount = Math.floor(Number(totalTokenNum)/queryNum);
        let leftNum = 0;
        if(Math.floor(Number(totalTokenNum)/queryNum)*queryCount < totalTokenNum) {
            leftNum = Number(totalTokenNum) - Math.floor(Number(totalTokenNum)/queryNum)*queryCount;
        }

        const queryNumTable = [];
        for(let i=0;i<queryCount;i++) {
            queryNumTable.push(queryNum);
        }

        if(leftNum > 0) {
            queryNumTable.push(leftNum);
        }

        let offset=0;
        const nftList = [];
        let tokenIDList = [];
        let tokenIDList2 = [];
        let metadataURLList;
        for await (let num of queryNumTable) {
            //console.log(`address=${address},offset=${offset},num=${num}`);

            tokenIDList = await contractInfo.contract.queryTokenList(address,offset,num);

            tokenIDList2 = [...tokenIDList];
            metadataURLList = await contractInfo.contract.getMetadataURIList(tokenIDList2);


            for(let i=0;i<tokenIDList.length;i++) {
                nftList.push({tokenID:tokenIDList[i].toString(),metadataURL:metadataURLList[i]});
            }

            offset += num;
        }

        resultInfo = getResultForm(ResultCode.SUCCESS,'',nftList);

    } catch(err) {
        console.log(err);
        
        resultInfo.resultCode = ResultCode.NFT_CONTRACT_GETNFTLIST_FAIL;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_CONTRACT_GETNFTLIST_FAIL.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processMetadataBaseURI = async (serverType:string,nftInfo:any):Promise<ResultInfo> => {

    const resultInfo = getResultForm(ResultCode.SUCCESS,'',null);

    const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_OPERATING,nftInfo);
    try {
        const metadataBaseURI = await contractInfo.contract.getMetadataBaseURI();
        resultInfo.data = metadataBaseURI;

    } catch(err) {
        console.log(err);
        resultInfo.resultCode = ResultCode.NFT_METADATA_QUERY_FAIL;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_METADATA_QUERY_FAIL.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processMetadataBaseURISetting = async (serverType:string,metadataBaseURI:string,nftInfo:any):Promise<ResultInfo> => {

    const resultInfo = getResultForm(ResultCode.SUCCESS,'',null);

    const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_OPERATING,nftInfo);
    try {
        let resultTx = await contractInfo.contract.setMetadataBaseURI(metadataBaseURI, {gasPrice:DEFAULT_GASPRICE});
        const receipt = await resultTx.wait();

    } catch(err) {
        console.log(err);
        resultInfo.resultCode = ResultCode.NFT_METADATA_UPDATE_FAIL;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_METADATA_UPDATE_FAIL.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processERC20TokenTransfer = async (serverType:string, init:boolean, tokenInfo:number[], targetAddressList:string[], contInfo:any):Promise<ResultInfo> => {
    
    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    const mintingData = ethers.randomBytes(10);

    try {
        const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_ERC20_TRANSFER,contInfo);

        //const operatorAddress = '0x1C62Dd8BEc584e4bf807bed7F8c9A85562A134d8';
        const operatorPrivateKey = '3b7ab8c878e28b0956f7b9a33d495449b80d5f2f4ebe376b730ccf1ff2f57285';
        const operator = new ethers.Wallet(operatorPrivateKey,contractInfo.provider);

        console.log('tokenInfo=',tokenInfo,', targetAddressList=',targetAddressList);
        
        let resultTx = null;

        console.log('nstContract=',contractInfo.nstContract.target);
        console.log('xdcContract=',contractInfo.xdcContract.target);

        const tx1 = await contractInfo.transferContract.connect(operator).setTokenContractInfo(contractInfo.nstContract.target,contractInfo.xdcContract.target,{gasPrice:DEFAULT_GASPRICE});
        const receipt1 = await tx1.wait();

        console.log('tx1=',tx1);
        console.log('transferContract.setTokenContractInfo() complete');

        const kstaPerAddress = tokenInfo[0];
        const nstPerAddress = tokenInfo[1];
        const xdcPerAddress = tokenInfo[2];
        const ksta = ethers.parseUnits(kstaPerAddress.toString(),"ether");
        const nst = ethers.parseUnits(nstPerAddress.toString(),"ether");
        const xdc = ethers.parseUnits(xdcPerAddress.toString(),"ether");

        const kstaTotal = ethers.parseUnits((kstaPerAddress*targetAddressList.length).toString(),"ether");
        const nstTotal = ethers.parseUnits((nstPerAddress*targetAddressList.length).toString(),"ether");
        const xdcTotal = ethers.parseUnits((xdcPerAddress*targetAddressList.length).toString(),"ether");

        const tx2 = await contractInfo.nstContract.approve(contractInfo.transferContract.target,nstTotal,{gasPrice:DEFAULT_GASPRICE});
        console.log('tx2=',tx2);
        const receipt2 = await tx2.wait();
        console.log('nstContract.approve() complete');

        const tx3 = await contractInfo.xdcContract.approve(contractInfo.transferContract.target,xdcTotal,{gasPrice:DEFAULT_GASPRICE});
        console.log('tx3=',tx3);
        const receipt3 = await tx3.wait();
        console.log('xdcContract.approve() complete');

        console.log(`ksta=${ksta},nst=${nst},xdc=${xdc}`);
        const tx4 = await contractInfo.transferContract.transferBatch(targetAddressList,ksta,nst,xdc,{value:kstaTotal,gasPrice:DEFAULT_GASPRICE});
        console.log('tx4=',tx4);
        const receipt4 = await tx4.wait();

        console.log(`sending complete:ksta=${ksta},nst=${nst},xdc=${xdc},targetAddressList=${targetAddressList},transferFlag=${await contractInfo.transferContract.getTransferFlag()}`);


        resultInfo = getResultForm(ResultCode.SUCCESS,'',null);

    } catch(err) {
        console.log(err);

        resultInfo.resultCode = ResultCode.NFT_ERC20TOKEN_TRANSFER_FAIL;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_ERC20TOKEN_TRANSFER_FAIL.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processMarketContractInfo = async (serverType:string, contractType:string, balanceInfo:boolean, contInfo:any): Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    const mintingData = ethers.randomBytes(10);

    try {
        if(contractType.toUpperCase() === 'B2C' || contractType.toUpperCase() === 'ALL') {
            const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_MARKET_VIEW,contInfo);

            //console.log("contractInfo=",JSON.stringify(contractInfo));

            let marketBalanceInfo = null;
            if(balanceInfo === true) {
                const kstaDragon:BigNumber = new BigNumber(await contractInfo.provider.getBalance(contractInfo.market.dragonMarketContract.target));
                const nstDragon:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.dragonMarketContract.target));
                const xdcDragon:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.dragonMarketContract.target));
        
                const etherUnit:BigNumber = new BigNumber(1000000000000000000);
                const kstaDragon2 = kstaDragon.dividedBy(etherUnit).toString();
                const nstDragon2 = nstDragon.dividedBy(etherUnit).toString();
                const xdcDragon2 = xdcDragon.dividedBy(etherUnit).toString();
        
                console.log(`dragon(${contractInfo.market.dragonMarketContract.target}): ksta=${kstaDragon2}, nst=${nstDragon2}, xdc=${xdcDragon2}`);
        
                const kstaGear:BigNumber = new BigNumber(await contractInfo.provider.getBalance(contractInfo.market.gearMarketContract.target));
                const nstGear:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.gearMarketContract.target));
                const xdcGear:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.gearMarketContract.target));
                const kstaGear2 = kstaGear.dividedBy(etherUnit).toString();
                const nstGear2 = nstGear.dividedBy(etherUnit).toString();
                const xdcGear2 = xdcGear.dividedBy(etherUnit).toString();
        
                console.log(`gear(${contractInfo.market.gearMarketContract.target}): ksta=${kstaGear2}, nst=${nstGear2}, xdc=${xdcGear2}`);
        
                const kstaPackage:BigNumber = new BigNumber(await contractInfo.provider.getBalance(contractInfo.market.packageMarketContract.target));
                const nstPackage:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.packageMarketContract.target));
                const xdcPackage:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.packageMarketContract.target));
                const kstaPackage2 = kstaPackage.dividedBy(etherUnit).toString();
                const nstPackage2 = nstPackage.dividedBy(etherUnit).toString();
                const xdcPackage2 = xdcPackage.dividedBy(etherUnit).toString();
        
                console.log(`package(${contractInfo.market.packageMarketContract.target}): ksta=${kstaPackage2}, nst=${nstPackage2}, xdc=${xdcPackage2}`);

                marketBalanceInfo = {
                    dragon:{
                        contractAddress:contractInfo.market.dragonMarketContract.target,
                        ksta:kstaDragon2,
                        nst:nstDragon2,
                        xdc:xdcDragon2
                    },
                    gear:{
                        contractAddress:contractInfo.market.gearMarketContract.target,
                        ksta:kstaGear2,
                        nst:nstGear2,
                        xdc:xdcGear2
                    },
                    package:{
                        contractAddress:contractInfo.market.packageMarketContract.target,
                        ksta:kstaPackage2,
                        nst:nstPackage2,
                        xdc:xdcPackage2
                    }
                };
            } else {
                marketBalanceInfo = {
                    dragon:{
                        contractAddress:contractInfo.market.dragonMarketContract.target
                    },
                    gear:{
                        contractAddress:contractInfo.market.gearMarketContract.target
                    },
                    package:{
                        contractAddress:contractInfo.market.packageMarketContract.target
                    }
                };
            }
    
            resultInfo = getResultForm(ResultCode.SUCCESS,'',marketBalanceInfo);

        }
        if(contractType.toUpperCase() === 'C2C' || contractType.toUpperCase() === 'ALL') {
            const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_MARKET_C2C,contInfo);

            //console.log("contractInfo=",JSON.stringify(contractInfo));

            let marketBalanceInfo = null;
            if(balanceInfo === true) {
                const kstaContract1:BigNumber = new BigNumber(await contractInfo.provider.getBalance(contractInfo.market.c2cContract1.target));
                const nstContract1:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.c2cContract1.target));
                const xdcContract1:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.c2cContract1.target));
    
                const etherUnit:BigNumber = new BigNumber(1000000000000000000);
                const kstaContract1a = kstaContract1.dividedBy(etherUnit).toString();
                const nstContract1a = nstContract1.dividedBy(etherUnit).toString();
                const xdcContract1a = xdcContract1.dividedBy(etherUnit).toString();
    
                console.log(`c2c1(${contractInfo.market.c2cContract1.target}): ksta=${kstaContract1a}, nst=${nstContract1a}, xdc=${xdcContract1a}`);
    
                const kstaContract2:BigNumber = new BigNumber(await contractInfo.provider.getBalance(contractInfo.market.c2cContract2.target));
                const nstContract2:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.c2cContract2.target));
                const xdcContract2:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.c2cContract2.target));
    
                const kstaContract2a = kstaContract2.dividedBy(etherUnit).toString();
                const nstContract2a = nstContract2.dividedBy(etherUnit).toString();
                const xdcContract2a = xdcContract2.dividedBy(etherUnit).toString();
    
                console.log(`c2c2(${contractInfo.market.c2cContract2.target}): ksta=${kstaContract2a}, nst=${nstContract2a}, xdc=${xdcContract2a}`);
    
                marketBalanceInfo = {
                    c2c1:{
                        contractAddress:contractInfo.market.c2cContract1.target,
                        ksta:kstaContract1a,
                        nst:nstContract1a,
                        xdc:xdcContract1a
                    },
                    c2c2:{
                        contractAddress:contractInfo.market.c2cContract2.target,
                        ksta:kstaContract2a,
                        nst:nstContract2a,
                        xdc:xdcContract2a
                    }
                };
            } else {
                marketBalanceInfo = {
                    c2c1:{
                        contractAddress:contractInfo.market.c2cContract1.target
                    },
                    c2c2:{
                        contractAddress:contractInfo.market.c2cContract2.target
                    }
                };
            }

            if(resultInfo.data !== null) {
                resultInfo = getResultForm(ResultCode.SUCCESS,'',{...resultInfo.data,...marketBalanceInfo});
            } else {
                resultInfo = getResultForm(ResultCode.SUCCESS,'',marketBalanceInfo);
            }
        }

    } catch(err) {
        console.log(err);

        resultInfo.resultCode = ResultCode.MARKET_BALANCE_GET_FAILED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.MARKET_BALANCE_GET_FAILED.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processMarketBalanceTransfer = async (serverType:string, ownerAddress:string, contractType:string, itemType:number, tokenType:string, amount:string, targetAddress:string, contInfo:any): Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    const mintingData = ethers.randomBytes(10);

    try {
        let contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_MARKET_VIEW,contInfo);
        if(contractType.toUpperCase() === 'C2C') {
            contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_MARKET_C2C,contInfo);
        }

        let amountBigNum:BigNumber = new BigNumber(amount);

        const realTransfer = true;
        let tx;
        let receipt;
        if(contractType.toUpperCase() === 'B2C' && itemType === 0) { // Dragon
            const kstaDragon:BigNumber = new BigNumber(await contractInfo.provider.getBalance(contractInfo.market.dragonMarketContract.target));
            const nstDragon:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.dragonMarketContract.target));
            const xdcDragon:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.dragonMarketContract.target));
            
            if(tokenType.trim().toUpperCase() === 'NST') {
                if(nstDragon.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_DRAGON_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(NST)";
                } else {
                    if(!realTransfer) {
                        console.log(`dragon:nst transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {
                        tx = await contractInfo.market.dragonMarketContract.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('dragon:nst tx=',tx);
                        receipt = await tx.wait();
                    }
                }

            } else if(tokenType.trim().toUpperCase() === 'XDC') {
                if(xdcDragon.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_DRAGON_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(XDC)";
                } else {
                    if(!realTransfer) {
                        console.log(`dragon:xdc transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {
                        tx = await contractInfo.market.dragonMarketContract.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('dragon:xdc tx=',tx);
                        receipt = await tx.wait();
                    }
                }
            
            } else if(tokenType.trim().toUpperCase() === 'KSTA') {
                const amountFloat = parseFloat(amount)-1.0;
                if(amountFloat <= 0) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_NOTENOUGH_TOKEN;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(KSTA)";
                } else {

                    console.log(`[MEGATOMIC] amountFloat=${amountFloat}, kstaDragon=${kstaDragon}`);

                    amountBigNum = new BigNumber(amountFloat.toString());
                    if(kstaDragon.isGreaterThanOrEqualTo(amountBigNum) === false) {
                        console.log("1");
                        resultInfo.resultCode = ResultCode.MARKET_BALANCE_DRAGON_TRANSFER_FAILED;
                        resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(KSTA)";
                    } else {
                        if(!realTransfer) {
                            console.log(`dragon:ksta transfered(amount=${amountBigNum},target=${targetAddress}`);
                        } else {
                            tx = await contractInfo.market.dragonMarketContract.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                            console.log('dragon:ksta tx=',tx);
                            receipt = await tx.wait();
                        }
                    }
                }
            }

        } else if(contractType.toUpperCase() === 'B2C' && itemType === 1) { // Gear
            const kstaGear:BigNumber = new BigNumber(await contractInfo.provider.getBalance(contractInfo.market.gearMarketContract.target));
            const nstGear:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.gearMarketContract.target));
            const xdcGear:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.gearMarketContract.target));

            if(tokenType.trim().toUpperCase() === 'NST') {
                if(nstGear.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_GEAR_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(NST)";
                } else {
                    if(!realTransfer) {
                        console.log(`gear:nst transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {
                        tx = await contractInfo.market.gearMarketContract.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('gear:nst tx=',tx);
                        receipt = await tx.wait();
                    }
                }

            } else if(tokenType.trim().toUpperCase() === 'XDC') {
                if(xdcGear.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_GEAR_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(XDC)";
                } else {
                    if(!realTransfer) {
                        console.log(`gear:xdc transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {
                        tx = await contractInfo.market.gearMarketContract.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('gear:xdc tx=',tx);
                        receipt = await tx.wait();
                    }
                }

            } else if(tokenType.trim().toUpperCase() === 'KSTA') {
                const amountFloat = parseFloat(amount)-1.0;
                if(amountFloat <= 0) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_NOTENOUGH_TOKEN;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(KSTA)";
                } else {
                    amountBigNum = new BigNumber(amountFloat.toString());
                    if(kstaGear.isGreaterThanOrEqualTo(amountBigNum) === false) {
                        resultInfo.resultCode = ResultCode.MARKET_BALANCE_GEAR_TRANSFER_FAILED;
                        resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(KSTA)";
                    } else {
                        if(!realTransfer) {
                            console.log(`gear:ksta transfered(amount=${amountBigNum},target=${targetAddress}`);
                        } else {
                            tx = await contractInfo.market.gearMarketContract.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                            console.log('gear:ksta tx=',tx);
                            receipt = await tx.wait();
                        }
                    }
                }
            }

        } else if(contractType.toUpperCase() === 'B2C' && itemType === 2) { // Package
            const kstaPackage:BigNumber = new BigNumber(await contractInfo.provider.getBalance(contractInfo.market.packageMarketContract.target));
            const nstPackage:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.packageMarketContract.target));
            const xdcPackage:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.packageMarketContract.target));

            if(tokenType.trim().toUpperCase() === 'NST') {
                if(nstPackage.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_PACKAGE_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(NST)";
                } else {
                    if(!realTransfer) {
                        console.log(`package:nst transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {

                        console.log('packageContractAddress=',contractInfo.market.packageMarketContract.target,',targetAddress=',targetAddress);

                        tx = await contractInfo.market.packageMarketContract.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('package:nst tx=',tx);
                        receipt = await tx.wait();
                    }
                }

            } else if(tokenType.trim().toUpperCase() === 'XDC') {
                if(xdcPackage.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_PACKAGE_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(XDC)";
                } else {
                    if(!realTransfer) {
                        console.log(`package:xdc transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {
                        tx = await contractInfo.market.packageMarketContract.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('package:nst tx=',tx);
                        receipt = await tx.wait();
                    }
                }
                
            } else if(tokenType.trim().toUpperCase() === 'KSTA') {
                const amountFloat = parseFloat(amount)-1.0;
                if(amountFloat <= 0) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_NOTENOUGH_TOKEN;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(KSTA)";
                } else {
                    amountBigNum = new BigNumber(amountFloat.toString());
                    if(kstaPackage.isGreaterThanOrEqualTo(amountBigNum) === false) {
                        resultInfo.resultCode = ResultCode.MARKET_BALANCE_PACKAGE_TRANSFER_FAILED;
                        resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(KSTA)";
                    } else {
                        if(!realTransfer) {
                            console.log(`package:ksta transfered(amount=${amountBigNum},target=${targetAddress}`);
                        } else {
                            tx = await contractInfo.market.packageMarketContract.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                            console.log('package:ksta tx=',tx);
                            receipt = await tx.wait();
                        }
                    }
                }
            }
        
        } else if(contractType.toUpperCase() === 'C2C' && itemType === 0) { // C2C Contract1
            const nstPackage:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.c2cContract1.target));
            const xdcPackage:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.c2cContract1.target));

            if(tokenType.trim().toUpperCase() === 'NST') {
                if(nstPackage.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_C2C_CONTRACT1_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(NST)";
                } else {
                    if(!realTransfer) {
                        console.log(`c2c1:nst transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {

                        console.log('c2c1ContractAddress=',contractInfo.market.c2cContract1.target,',targetAddress=',targetAddress);

                        tx = await contractInfo.market.c2cContract1.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('c2c1:nst tx=',tx);
                        receipt = await tx.wait();
                    }
                }

            } else if(tokenType.trim().toUpperCase() === 'XDC') {
                if(xdcPackage.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_C2C_CONTRACT1_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(XDC)";
                } else {
                    if(!realTransfer) {
                        console.log(`c2c1:xdc transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {
                        tx = await contractInfo.market.c2cContract1.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('c2c1:nst tx=',tx);
                        receipt = await tx.wait();
                    }
                }
            }

        } else if(contractType.toUpperCase() === 'C2C' && itemType === 1) { // C2C Contract2
            const nstPackage:BigNumber = new BigNumber(await contractInfo.nstContract.balanceOf(contractInfo.market.c2cContract2.target));
            const xdcPackage:BigNumber = new BigNumber(await contractInfo.xdcContract.balanceOf(contractInfo.market.c2cContract2.target));

            if(tokenType.trim().toUpperCase() === 'NST') {
                if(nstPackage.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_C2C_CONTRACT1_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(NST)";
                } else {
                    if(!realTransfer) {
                        console.log(`c2c2:nst transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {

                        console.log('c2c2ContractAddress=',contractInfo.market.c2cContract2.target,',targetAddress=',targetAddress);

                        tx = await contractInfo.market.c2cContract2.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('c2c2:nst tx=',tx);
                        receipt = await tx.wait();
                    }
                }

            } else if(tokenType.trim().toUpperCase() === 'XDC') {
                if(xdcPackage.isGreaterThanOrEqualTo(amountBigNum) === false) {
                    resultInfo.resultCode = ResultCode.MARKET_BALANCE_C2C_CONTRACT1_TRANSFER_FAILED;
                    resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()]+"(XDC)";
                } else {
                    if(!realTransfer) {
                        console.log(`c2c2:xdc transfered(amount=${amountBigNum},target=${targetAddress}`);
                    } else {
                        tx = await contractInfo.market.c2cContract2.withdrawAll({gasPrice:DEFAULT_GASPRICE});
                        console.log('c2c2:nst tx=',tx);
                        receipt = await tx.wait();
                    }
                }
            }
        }

    } catch(err) {
        console.log(err);

        if(contractType.toUpperCase() === 'B2C') {
            if(itemType === 0) {
                resultInfo.resultCode = ResultCode.MARKET_BALANCE_DRAGON_TRANSFER_FAILED;
            } else if(itemType === 1) {
                resultInfo.resultCode = ResultCode.MARKET_BALANCE_GEAR_TRANSFER_FAILED;
            } else {
                resultInfo.resultCode = ResultCode.MARKET_BALANCE_PACKAGE_TRANSFER_FAILED;
            }
        } else {
            if(itemType === 0) {
                resultInfo.resultCode = ResultCode.MARKET_BALANCE_C2C_CONTRACT1_TRANSFER_FAILED;
            } else {
                resultInfo.resultCode = ResultCode.MARKET_BALANCE_C2C_CONTRACT2_TRANSFER_FAILED;
            }
        }
        
        resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processOwnerOfNFT = async (serverType:string, ownerAddress:string, tokenID:number, nftInfo:any): Promise<ResultInfo> => {

    console.log(`processOwnerOfNFT() serverType=${serverType}, ownerAddress=${ownerAddress}, tokenID=${tokenID}, nftInfo=${JSON.stringify(nftInfo)}`);

    const resultInfo = getResultForm(ResultCode.SUCCESS,'',null);

    const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_OPERATING,nftInfo);
    try {
        const isOwner = await contractInfo.contract.isTokenOwner(ownerAddress, tokenID, {gasPrice:DEFAULT_GASPRICE});
        resultInfo.data = {isOwner};

    } catch(err) {
        console.log(err);
        resultInfo.resultCode = ResultCode.NFT_METADATA_UPDATE_FAIL;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.NFT_METADATA_UPDATE_FAIL.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processMarketContractSettingInfo = async (serverType:string, contractType:string, contInfo:any): Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    const mintingData = ethers.randomBytes(10);

    let contractSettingInfo = {};
    try {
        if(contractType.toUpperCase() === 'B2C' || contractType.toUpperCase() === 'ALL') {

            const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_MARKET_VIEW,contInfo);

            const dragonContract = new ethers.Contract(contractInfo.market.dragonMarketContract,b2cContractABI,contractInfo.signer);
            const dragonHolderAddress = await dragonContract.getHolder();
            const dragonTokenAddress = await dragonContract.getToken();
            const dragonNFTAddress = await dragonContract.getNFT();
            const dragonPrice:BigNumber = new BigNumber(await dragonContract.getPrice());
            
            const gearContract = new ethers.Contract(contractInfo.market.gearMarketContract,b2cContractABI,contractInfo.signer);
            const gearHolderAddress = await gearContract.getHolder();
            const gearTokenAddress = await gearContract.getToken();
            const gearNFTAddress = await gearContract.getNFT();
            const gearPrice:BigNumber = new BigNumber(await gearContract.getPrice());

            const packageContract = new ethers.Contract(contractInfo.market.packageMarketContract,b2cContractABI,contractInfo.signer);
            const packageHolderAddress = await packageContract.getHolder();
            const packageTokenAddress = await packageContract.getToken();
            const packageNFTAddress = await packageContract.getNFT();
            const packagePrice:BigNumber = new BigNumber(await packageContract.getPrice());

            contractSettingInfo = {
                dragon:{
                    holderAddress:dragonHolderAddress,
                    nstContractAddress:dragonTokenAddress,
                    nftContractAddress:dragonNFTAddress,
                    price:dragonPrice.toString()
                },
                gear:{
                    holderAddress:gearHolderAddress,
                    nstContractAddress:gearTokenAddress,
                    nftContractAddress:gearNFTAddress,
                    price:gearPrice.toString()
                },
                package:{
                    holderAddress:packageHolderAddress,
                    nstContractAddress:packageTokenAddress,
                    nftContractAddress:packageNFTAddress,
                    price:packagePrice.toString()
                }
            };
            resultInfo = getResultForm(ResultCode.SUCCESS,'',contractSettingInfo);

        }
        if(contractType.toUpperCase() === 'C2C' || contractType.toUpperCase() === 'ALL') {

            const contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_MARKET_C2C,contInfo);

            const c2c1Contract = new ethers.Contract(contractInfo.market.c2cContract1,c2cContractABI,contractInfo.signer);
            const c2c1TokenAddress = await c2c1Contract.getToken();
            const c2c1NFTAddress = await c2c1Contract.getNFT();
            const c2c1DefaultFee:BigNumber = new BigNumber(await c2c1Contract.getDefaultFee());
            
            const c2c2Contract = new ethers.Contract(contractInfo.market.c2cContract2,c2cContractABI,contractInfo.signer);
            const c2c2TokenAddress = await c2c2Contract.getToken();
            const c2c2NFTAddress = await c2c2Contract.getNFT();
            const c2c2DefaultFee:BigNumber = new BigNumber(await c2c2Contract.getDefaultFee());

            contractSettingInfo = {
                ...contractSettingInfo,
                c2c1:{
                    xdcContractAddress:c2c1TokenAddress,
                    nftContractAddress:c2c1NFTAddress,
                    fee:c2c1DefaultFee.toString()
                },
                c2c2:{
                    xdcContractAddress:c2c2TokenAddress,
                    nftContractAddress:c2c2NFTAddress,
                    fee:c2c2DefaultFee.toString()
                }
            };
            resultInfo = getResultForm(ResultCode.SUCCESS,'',contractSettingInfo);
        }

    } catch(err) {
        console.log(err);

        resultInfo.resultCode = ResultCode.MARKET_BALANCE_GET_FAILED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.MARKET_BALANCE_GET_FAILED.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}

export const processMarketContractSettingInfoUpdate = async (serverType:string, contractType:string, contractSettingInfo:any, contInfo:any): Promise<ResultInfo> => {

    let resultInfo = getResultForm(ResultCode.SUCCESS,'',null);
    const mintingData = ethers.randomBytes(10);

    try {
        let contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_MARKET_VIEW,contInfo);
        if(contractType.toUpperCase() === 'C2C') {
            contractInfo = getContractInfo(serverType,constVal.NFT_CONTRACT_OPTYPE_MARKET_C2C,contInfo);
        }

        //const amountBigNum:BigNumber = new BigNumber(amount);

        if(contractType === 'B2C') {

            const b2cDragonContract = new ethers.Contract(contractInfo.market.dragonMarketContract,b2cContractABI,contractInfo.signer);
            const b2cGearContract = new ethers.Contract(contractInfo.market.gearMarketContract,b2cContractABI,contractInfo.signer);
            const b2cPackageContract = new ethers.Contract(contractInfo.market.packageMarketContract,b2cContractABI,contractInfo.signer);

            if(contractSettingInfo.holderAddress !== undefined) {
                let tx1 = await b2cDragonContract.setHolder(contractSettingInfo.holderAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                let receipt1 = await tx1.wait();
                console.log('[B2C.DRAGON] setHolder(',contractSettingInfo.holderAddress.trim(),') complete:tx1=',tx1);

                tx1 = await b2cGearContract.setHolder(contractSettingInfo.holderAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                receipt1 = await tx1.wait();
                console.log('[B2C.GEAR] setHolder(',contractSettingInfo.holderAddress.trim(),') complete:tx1=',tx1);

                tx1 = await b2cPackageContract.setHolder(contractSettingInfo.holderAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                receipt1 = await tx1.wait();
                console.log('[B2C.PACKAGE] setHolder(',contractSettingInfo.holderAddress.trim(),') complete:tx1=',tx1);
            }

            if(contractSettingInfo.nstContractAddress !== undefined) {
                let tx2 = await b2cDragonContract.setToken(contractSettingInfo.nstContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                let receipt2 = await tx2.wait();
                console.log('[B2C.DRAGON] setToken(',contractSettingInfo.nstContractAddress.trim(),') complete:tx2=',tx2);

                tx2 = await b2cGearContract.setToken(contractSettingInfo.nstContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                receipt2 = await tx2.wait();
                console.log('[B2C.GEAR] setToken(',contractSettingInfo.nstContractAddress.trim(),') complete:tx2=',tx2);

                tx2 = await b2cPackageContract.setToken(contractSettingInfo.nstContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                receipt2 = await tx2.wait();
                console.log('[B2C.PACKAGE] setToken(',contractSettingInfo.nstContractAddress.trim(),') complete:tx2=',tx2);
            }

            if(contractSettingInfo.nftContractAddress !== undefined) {
                let tx3 = await b2cDragonContract.setNFT(contractSettingInfo.nftContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                let receipt3 = await tx3.wait();
                console.log('[B2C.DRAGON] setNFT(',contractSettingInfo.nftContractAddress.trim(),') complete:tx3=',tx3);

                tx3 = await b2cGearContract.setNFT(contractSettingInfo.nftContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                receipt3 = await tx3.wait();
                console.log('[B2C.GEAR] setNFT(',contractSettingInfo.nftContractAddress.trim(),') complete:tx3=',tx3);

                tx3 = await b2cPackageContract.setNFT(contractSettingInfo.nftContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                receipt3 = await tx3.wait();
                console.log('[B2C.PACKAGE] setNFT(',contractSettingInfo.nftContractAddress.trim(),') complete:tx3=',tx3);
            }

            if(contractSettingInfo.dragonItemPrice !== undefined) {
                const dragonPrice = ethers.parseUnits(contractSettingInfo.dragonItemPrice,"ether");
                let tx3 = await b2cDragonContract.setPrice(dragonPrice,{gasPrice:DEFAULT_GASPRICE});
                let receipt3 = await tx3.wait();
                console.log('[B2C.DRAGON] setPrice(',dragonPrice.toString(),') complete:tx3=',tx3);
            }

            if(contractSettingInfo.gearItemPrice !== undefined) {
                const gearPrice = ethers.parseUnits(contractSettingInfo.gearItemPrice,"ether");
                let tx3 = await b2cGearContract.setPrice(gearPrice,{gasPrice:DEFAULT_GASPRICE});
                let receipt3 = await tx3.wait();
                console.log('[B2C.GEAR] setPrice(',gearPrice.toString(),') complete:tx3=',tx3);
            }

            if(contractSettingInfo.packageItemPrice !== undefined) {
                const packagePrice = ethers.parseUnits(contractSettingInfo.packageItemPrice,"ether");
                let tx3 = await b2cPackageContract.setPrice(packagePrice,{gasPrice:DEFAULT_GASPRICE});
                let receipt3 = await tx3.wait();
                console.log('[B2C.PACKAGE] setPrice(',packagePrice.toString(),') complete:tx3=',tx3);
            }

        } else if(contractType === 'C2C') {
            const c2c1Contract = new ethers.Contract(contractInfo.market.c2cContract1,c2cContractABI,contractInfo.signer);
            const c2c2Contract = new ethers.Contract(contractInfo.market.c2cContract2,c2cContractABI,contractInfo.signer);

            if(contractSettingInfo.xdcContractAddress !== undefined) {
                let tx1 = await c2c1Contract.setToken(contractSettingInfo.xdcContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                let receipt1 = await tx1.wait();
                console.log('[C2C.1] setToken(',contractSettingInfo.xdcContractAddress.trim(),') complete:tx1=',tx1);

                tx1 = await c2c2Contract.setToken(contractSettingInfo.xdcContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                receipt1 = await tx1.wait();
                console.log('[C2C.2] setToken(',contractSettingInfo.xdcContractAddress.trim(),') complete:tx1=',tx1);
            }

            if(contractSettingInfo.nftContractAddress !== undefined) {
                let tx2 = await c2c1Contract.setNFT(contractSettingInfo.nftContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                let receipt2 = await tx2.wait();
                console.log('[C2C.1] setNFT(',contractSettingInfo.nftContractAddress.trim(),') complete:tx2=',tx2);

                tx2 = await c2c2Contract.setNFT(contractSettingInfo.nftContractAddress.trim(),{gasPrice:DEFAULT_GASPRICE});
                receipt2 = await tx2.wait();
                console.log('[C2C.2] setNFT(',contractSettingInfo.nftContractAddress.trim(),') complete:tx2=',tx2);
            }

            if(contractSettingInfo.tradeFee !== undefined) {
                const fee = Math.floor(parseFloat(contractSettingInfo.tradeFee)*100);

                let tx3 = await c2c1Contract.setDefaultFee(fee,{gasPrice:DEFAULT_GASPRICE});
                let receipt3 = await tx3.wait();
                console.log('[C2C.1] setDefaultFee(',fee,') complete:tx3=',tx3);

                tx3 = await c2c2Contract.setDefaultFee(fee,{gasPrice:DEFAULT_GASPRICE});
                receipt3 = await tx3.wait();
                console.log('[C2C.2] setDefaultFee(',fee,') complete:tx3=',tx3);
            }
        }

    } catch(err) {
        console.log(err);

        if(contractType.toUpperCase() === 'B2C') {
            resultInfo.resultCode = ResultCode.MARKET_B2C_CONTRACT_SETTING_FAILED;
        } else {
            resultInfo.resultCode = ResultCode.MARKET_C2C_CONTRACT_SETTING_FAILED;
        }
        
        resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
        resultInfo.data = err;
    }

    return resultInfo;
}