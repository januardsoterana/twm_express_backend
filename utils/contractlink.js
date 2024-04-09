const { ethers, Contract } = require('ethers');
const { formatUnits, parseUnits } = require('ethers/lib/utils');
const config = require('config');
const casinoInfo = require('./casino.json')
const {
    withdrawFundtoDatabase,
    depositFundtoDatabase,
    getFund,
    getDepositIndex,
    getClaimIndex,
    getWalletInfo
} = require('./dblink');

require('./servelink')();

const casinoAddr = casinoInfo['Casino']['address'];
const casinoAbi = casinoInfo['Casino']['abi'];
const provider = new ethers.providers.JsonRpcProvider(config.get('jsonRPC'));
const walletObj = new ethers.Wallet(config.get('AUTH_PRIVATE_KEY'));
const account = walletObj.connect(provider);
const casinoContract = new Contract(casinoAddr, casinoAbi, account);

const depositConfirm = async (wallet) => {
    try {
        let depositedList = await casinoContract.getDepositedList(wallet);
        let depositIndex = await getDepositIndex(wallet);
        let pendingAmount = 0;
        if (depositIndex.index <= depositedList.length) {
            for (var i = depositIndex.index; i < depositedList.length; i++) {
                pendingAmount += Number(formatUnits(String(depositedList[i]), 18));
            }
            return { ok: true, message: "success", data: { "amount": pendingAmount, "index": depositedList.length } };
        } else {
            return { ok: false, message: "deposit confirm error", data: null };
        }
    } catch (error) {
        console.log(error)
        return { ok: false, message: 'deposit confirm error', data: null };
    }
}

const withdrawConfirm = async (wallet) => {
    try {
        let claimedList = await casinoContract.getClaimedList(wallet);
        let walletInfo = await getWalletInfo(wallet);
        let pendingAmount = 0;
        if (walletInfo.ok && walletInfo.info.claimIndex && walletInfo.info.claimIndex > claimedList.length) {
            for (var i = claimedList.length; i < walletInfo.info.claimIndex; i++) {
                pendingAmount += Number(walletInfo.info.claimHistory[i].amount);
            }
            let sigResult = await signWithdrawMsg(walletInfo.wallet, pendingAmount, walletInfo.info.claimIndex);
            return { ok: true, message: "pending", data: sigResult.data };
        } else {
            return { ok: true, message: "success", data: {"index": walletInfo.info.claimIndex + 1} };
        }
    } catch (error) {
        console.log(error)
        return { ok: false, message: 'withdraw confirm error', data: null };
    }
}

const signWithdrawMsg = async (wallet, amount, index) => {
    let message = ethers.utils.solidityPack(["address", "uint256", "uint256"], [wallet, ethers.utils.hexlify(parseUnits(String(amount), 18)), ethers.utils.hexlify(index)]);
    message = ethers.utils.solidityKeccak256(["bytes"], [message]);
    let signature = await account.signMessage(ethers.utils.arrayify(message));
    return {ok: true, message: "sign msg", data: {"wallet": wallet, "amount": ethers.utils.hexlify(parseUnits(String(amount), 18)), "index": ethers.utils.hexlify(index), "signature": signature}}
}

module.exports = {
    depositConfirm,
    withdrawConfirm,
    signWithdrawMsg
};