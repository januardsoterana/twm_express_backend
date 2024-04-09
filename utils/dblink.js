const Treasury = require("../models/Treasury");

const getFund = async (wallet) => {
    if (!wallet) {
        return { ok: false, wallet: wallet, amount: null }
    }

    try {
        const data = await Treasury.find({ wallet: wallet });
        if (data.length > 0) {
            fund = data[0]?.amount
        } else fund = 0;
        return { ok: true, wallet: wallet, amount: fund };
    } catch (error) {
        console.log("get fund error", error)
        return { ok: false, wallet: wallet, amount: null }
    }
}

const getDepositIndex = async (wallet) => {
    if (!wallet) {
        return { ok: false, wallet: wallet, index: 0 }
    }

    try {
        const data = await Treasury.find({ wallet: wallet });
        if (data.length > 0) {
            index = data[0]?.depositIndex
        } else index = 0;
        return { ok: true, wallet: wallet, index: index };
    } catch (error) {
        console.log("get depositIndex error", error)
        return { ok: false, wallet: wallet, index: 0 }
    }
}

const getClaimIndex = async (wallet) => {
    if (!wallet) {
        return { ok: false, wallet: wallet, index: 0 }
    }

    try {
        const data = await Treasury.find({ wallet: wallet });
        if (data.length > 0) {
            index = data[0]?.claimIndex
        } else index = 0;
        return { ok: true, wallet: wallet, index: index };
    } catch (error) {
        console.log("get claimIndex error", error)
        return { ok: false, wallet: wallet, index: 0 }
    }
}

const getWalletInfo = async (wallet) => {
    if (!wallet) {
        return { ok: false, wallet: wallet, info: {} }
    }

    try {
        const data = await Treasury.find({ wallet: wallet });
        if (data.length > 0) {
            info = data[0]
        } else info = {};
        return { ok: true, wallet: wallet, info: info };
    } catch (error) {
        console.log("get claimIndex error", error)
        return { ok: false, wallet: wallet, info: {} }
    }
}

const withdrawFundtoDatabase = async (wallet, amount, index) => {
    if (!wallet || !amount) {
        return { ok: false, data: "withdraw error" }
    }

    try {
        const fund = await getFund(wallet)

        if (amount > fund.amount) {
            return { ok: falsem, message: "Invalid amount" }
        }

        let claimHistory = {
            index: index,
            amount: amount
        };

        let query = {
            wallet: wallet
        }

        let update = {
            $set: { wallet: wallet, amount: fund.amount - amount, claimIndex: index },
            $push: { claimHistory: claimHistory }
        }

        let options = { upsert: true };

        const res = await Treasury.findOneAndUpdate(query, update, options);
        if (res) {
            return { ok: true, message: "withdraw successfully" };
        } else {
            return { ok: false, message: "withdraw error" };
        }
    } catch (error) {
        console.log("deposit fund to database error", error)
        return { ok: false, data: "withdraw error" }
    }
}

const depositFundtoDatabase = async (wallet, amount, index) => {
    if (!wallet || !amount) {
        return { ok: false, message: "Deposit error" }
    }

    try {
        // const fund = await getFund(wallet);
        const fund = await getFund(wallet)

        // const res = await Treasury.findOneAndUpdate({ wallet: wallet }, { $set: { wallet: wallet, amount: fund.amount + amount, depositIndex: index } });

        let query = {
            wallet: wallet
        }

        let update = {
            $set: { wallet: wallet, amount: fund.amount + amount, depositIndex: index },
        }

        let options = { upsert: true, new: true };

        const res = await Treasury.findOneAndUpdate(query, update, options);

        return { ok: true, message: "Deposit successfully" };
        // if (res) {
            
        // } else {
        //     let walletInfo = new Treasury({ wallet: wallet, amount: amount, depositIndex: 1, claimIndex: 0, claimHistory: {}, status: true })
        //     const result = walletInfo.save()
        //     console.log("result:", result)
        //     if (result) {
        //         return { ok: true, message: "Deposit successfully" };
        //     } else {
        //         return {ok: false, message: "Deposit fail"};
        //     }
        // }
    } catch (error) {
        console.log("withdraw fund to database error", error)
        return { ok: false, message: "Deposit error" }
    }
}

const decreaseFundtoDatabase = async (wallet, amount) => {
    if (!wallet || !amount) {
        return { ok: false, data: "withdraw error" }
    }

    try {
        const fund = await getFund(wallet)

        if (amount > fund.amount) {
            return { ok: falsem, message: "Invalid amount" }
        }

        let query = {
            wallet: wallet
        }

        let update = {
            $set: { wallet: wallet, amount: fund.amount - amount},
        }

        let options = { upsert: true, new: true };

        const res = await Treasury.findOneAndUpdate(query, update, options);
        if (res) {
            return { ok: true, message: "decrease successfully" };
        } else {
            return { ok: false, message: "decrease error" };
        }
    } catch (error) {
        console.log("decrease fund to database error", error)
        return { ok: false, data: "decrease error" }
    }
}

const increaseFundtoDatabase = async (wallet, amount) => {
    if (!wallet || !amount) {
        return { ok: false, message: "Increase error" }
    }

    try {
        // const fund = await getFund(wallet);
        const fund = await getFund(wallet)

        // const res = await Treasury.findOneAndUpdate({ wallet: wallet }, { $set: { wallet: wallet, amount: fund.amount + amount, depositIndex: index } });

        let query = {
            wallet: wallet
        }

        let update = {
            $set: { wallet: wallet, amount: fund.amount + amount },
        }

        let options = { upsert: true, new: true };

        const res = await Treasury.findOneAndUpdate(query, update, options);
        return { ok: true, message: "Increase successfully" };
        // if (res) {
            
        // } else {
        //     let walletInfo = new Treasury({ wallet: wallet, amount: amount, depositIndex: 1, claimIndex: 0, claimHistory: {}, status: true })
        //     const result = walletInfo.save()
        //     console.log("result:", result)
        //     if (result) {
        //         return { ok: true, message: "Deposit successfully" };
        //     } else {
        //         return {ok: false, message: "Deposit fail"};
        //     }
        // }
    } catch (error) {
        console.log("increase fund to database error", error)
        return { ok: false, message: "Increase error" }
    }
}

module.exports = {
    withdrawFundtoDatabase,
    depositFundtoDatabase,
    getFund,
    getDepositIndex,
    getClaimIndex,
    getWalletInfo,
    decreaseFundtoDatabase,
    increaseFundtoDatabase
}
