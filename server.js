const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const config = require('config');
const {
    withdrawFundtoDatabase,
    depositFundtoDatabase,
    getFund,
    getDepositIndex,
    getClaimIndex,
    decreaseFundtoDatabase,
    increaseFundtoDatabase
} = require("./utils/dblink");

const { depositConfirm, withdrawConfirm, signWithdrawMsg } = require("./utils/contractlink");

const app = express();
app.use(cors());

// Connect Database
connectDB();

// Init Middleware
app.use(express.json());

// Define Routes
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/traits', require('./routes/api/traits'));
app.use('/api/treasury', require('./routes/api/treasury'));


const green_index = 0;
const blue_index = 1;
const both_index = 2;

const random_percent_high = 5;
const random_percent_middle = 3;
const random_percent_low = 2;

let treasury_data = [];
let betting_data = [];
let bet_working = false;
const timeout = 1000;
let time_index = 0;
let timevar;

let betting_result = {};


const PORT = process.env.PORT || 5000;
const http = require("http");
const server = http.createServer(
    app);

const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    socket.on("deposit_fund", async (...data) => {
        let buffer;
        try {
            buffer = JSON.parse(data);
        } catch (err) {
            console.log(err);
            socket.emit("message", {
                ok: "false",
                message: "Request message error",
                type: "deposit_fund",
            });
            return;
        }

        const result = await depositConfirm(buffer?.wallet);
        if (!result || result.ok == false) {
            socket.emit("message", {
                ...JSON.parse(JSON.stringify(result)),
                type: "deposit_fund",
            });
            return;
        }

        const res = await depositFundtoDatabase(buffer?.wallet, result.data.amount, result.data.index);
        socket.emit("message", {
            ...JSON.parse(JSON.stringify(res)),
            type: "deposit_fund",
        });
    });
    socket.on("withdraw_fund", async (...data) => {
        let buffer;
        try {
            buffer = JSON.parse(data);
        } catch (err) {
            console.log(err);
            socket.emit("message", {
                ok: "false",
                message: "Request message error",
                type: "withdraw_fund",
            });
            return;
        }

        const result = await withdrawConfirm(buffer?.wallet);
        if (result.ok == false) {
            socket.emit("message", {
                ...JSON.parse(JSON.stringify(result)),
                type: "withdraw_fund",
            });
            return;
        } else if (result.message == "pending") {
            const signResult = signWithdrawMsg(buffer?.wallet, result.data.amount, result.data.index);
            socket.emit("message", {
                ...JSON.parse(JSON.stringify(signResult)),
                type: "withdraw_fund",
            });
            return;
        } else if (result.message == "success") {
            const res = await withdrawFundtoDatabase(buffer?.wallet, Number(buffer?.amount), result.data.index);
            if(res.ok) {
                const signResult = await signWithdrawMsg(buffer?.wallet, Number(buffer?.amount), result.data.index);
                socket.emit("message", {
                    ...JSON.parse(JSON.stringify(signResult)),
                    type: "withdraw_fund",
                });
                return
            } else {
                console.log(res.message)
            }
        }

        // const result = await depositCofirm(buffer?.wallet)
        // const res = await withdrawFundtoDatabase(buffer?.wallet, result.data.amount * config.get("TOKEN_RATE"), result.data.index);
        // const signResult = signWithdrawMsg(buffer?.wallet, result.data.amount * config.get("TOKEN_RATE"), result.data.index);
        // socket.emit("message", {
        //     ...JSON.parse(JSON.stringify(signResult)),
        //     type: "withdraw_fund",
        // });
    });
    socket.on("betting", async (...data) => {
        if (bet_working) {
            io.emit("message", { ok: false, message: "Betting now" });
            return;
        }
        let buffer;
        try {
            buffer = JSON.parse(data);
        } catch (err) {
            socket.emit("message", {
                ok: "false",
                message: "Request message error",
                type: "betting",
            });
            return;
        }
        const res = await betting(buffer?.wallet, buffer?.amount, buffer?.type);
        io.emit("message", {
            ...JSON.parse(JSON.stringify(res)),
            wallet: buffer?.wallet,
            color: buffer?.type,
            type: "betting",
        });
    });
    socket.on("get_fund", async (...data) => {
        try {
            let buffer = JSON.parse(data);
            // let res = await axios.get(
            //     "http://localhost:5000/api/treasury/fund/" + buffer?.wallet,
            //     {
            //         headers: {
            //             "Access-Control-Allow-Origin": "*",
            //             "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
            //         },
            //     }
            // );
            const res = await getFund(buffer?.wallet);
            socket.emit("message", {
                ...JSON.parse(JSON.stringify(res)),
                type: "get_fund",
            });
        } catch (err) {
            console.log(err)
            socket.emit("message", {
                ok: "false",
                message: "Request message error",
                type: "get_fund",
            });
            return;
        }

    });
    socket.on("get_fund_status", async (...data) => {
        try {
            let buffer = JSON.parse(data);
            const res = await depositConfirm(buffer?.wallet);
            socket.emit("message", {
                ...JSON.parse(JSON.stringify(res)),
                type: "get_fund_status",
            });
        } catch (error) {
            console.log(error)
            socket.emit("message", {
                ok: "false",
                message: "Request message error",
                type: "get_fund_status",
            });
            return;
        }
    })
    socket.on("get_withdraw_status", async (...data) => {
        try {
            let buffer = JSON.parse(data);
            const res = await withdrawConfirm(buffer?.wallet);
            socket.emit("message", {
                ...JSON.parse(JSON.stringify(res)),
                type: "get_withdraw_status",
            });
        } catch (error) {
            console.log(error)
            socket.emit("message", {
                ok: "false",
                message: "Request message error",
                type: "get_withdraw_status",
            });
            return;
        }
    })
    socket.on("get_status", async () => {
        const res = get_current_status();
        socket.emit("message", {
            ...betting_data,
            time_index: res,
            type: "get_status",
        });
    });
})

const betting = async (wallet, amount, type) => {
    if (!wallet || !amount || !type) {
        return { ok: false, message: "Invalid request param" };
    }
    try {
        // let res = await axios.get(
        //     "http://localhost:5000/api/treasury/fund/" + wallet,
        //     {
        //         headers: {
        //             "Access-Control-Allow-Origin": "*",
        //             "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
        //         },
        //     }
        // );

        // let fund = res.data;
        const fund = await getFund(wallet);

        if (!fund.amount) {
            return { ok: false, message: "wallet is invalid" };
        }
        if (fund.amount < amount) {
            return { ok: false, message: "Insufficent funds" };
        }

        if (betting_data.length >= 0) {
            const item = betting_data.filter((_m) => _m.wallet == wallet);
            if (item.length > 0)
                return { ok: false, message: "You have already bet" };
        }

        betting_data.push({
            wallet: wallet,
            amount: amount,
            type: type,
        });

        return { ok: true, amount: amount, message: "Bet successfuly" };
    } catch (error) {
        console.log("betting error", error);
        return { ok: false, amount: amount, message: "Betting Error" };
    }
};

const generate_randome = (win_index) => {
    let green = 0;
    let blue = 0;
    let res = "green";
    if (win_index == green_index) {
        blue = Math.floor(Math.random() * 1000) % 5;
        green = blue + 1 + (Math.floor(Math.random() * 1000) % (5 - blue));
    } else if (win_index == blue_index) {
        green = Math.floor(Math.random() * 1000) % 5;
        blue = green + 1 + (Math.floor(Math.random() * 1000) % (5 - green));
    } else {
        green = blue = Math.floor(Math.random() * 1000) % 6;
    }

    if (green > blue) {
        res = "green";
    } else if (green == blue) {
        res = "same";
    } else {
        res = "blue";
    }

    return { green: green + 1, blue: blue + 1, result: res };
    // console.log("selected number", green, blue);
};

const betGame = async () => {
    try {
        // let res = await getBettingInfo();

        // if(!res.data) {
        if (betting_data.length == 0) {
            const rand = Math.floor(Math.random() * 1000) % 3;
            const result = generate_randome(rand);
            return { ok: false, ...result, message: "No bet" };
        }

        const bet_amount = [];
        let win_index = green_index;

        // amount = res.data.filter(_m => _m.type == "green").reduce((a, b) => a + b?.amount, 0) * process.env."WIN_COLOR_MULTIPLE_NUMBER";
        console.log(betting_data)
        const amount_green =
            betting_data
                .filter((_m) => _m.type == "green")
                .reduce((a, b) => a + b?.amount, 0) *
            config.get("WIN_COLOR_MULTIPLE_NUMBER");
        bet_amount.push({ index: green_index, amount: amount_green });

        // amount = res.data.filter(_m => _m.type == "blue").reduce((a, b) => a + b?.amount, 0) * process.env."WIN_COLOR_MULTIPLE_NUMBER";
        const amount_blue =
            betting_data
                .filter((_m) => _m.type == "blue")
                .reduce((a, b) => a + b?.amount, 0) *
            config.get("WIN_COLOR_MULTIPLE_NUMBER");
        bet_amount.push({ index: blue_index, amount: amount_blue });

        // amount = res.data.filter(_m => _m.type == "same").reduce((a, b) => a + b?.amount, 0) * process.env."WIN_BOTH_MULTIPLE_NUMBER";
        const amount_both =
            betting_data
                .filter((_m) => _m.type == "same")
                .reduce((a, b) => a + b?.amount, 0) *
            config.get("WIN_BOTH_MULTIPLE_NUMBER");
        bet_amount.push({ index: both_index, amount: amount_both });

        bet_amount.sort((a, b) => b.amount - a.amount);

        const rand = Math.floor(Math.random() * 1000) % 10;

        if (rand <= random_percent_high) {
            win_index = bet_amount[0].index;
        } else if (rand > random_percent_high && rand <= random_percent_high + random_percent_middle) {
            win_index = bet_amount[1].index;
        } else {
            win_index = bet_amount[2].index;
        }

        await Promise.all(betting_data.map(async (element) => {
            // betting_data.map(async (element) => {
            let win_flag = false;
            if (element.type == "green" && win_index == green_index) {
                await increaseFundtoDatabase(
                    element.wallet,
                    element.amount * (config.get("WIN_COLOR_MULTIPLE_NUMBER") - 1)
                );
                win_flag = true;
            } else if (element.type == "blue" && win_index == blue_index) {
                await increaseFundtoDatabase(
                    element.wallet,
                    element.amount * (config.get("WIN_COLOR_MULTIPLE_NUMBER") - 1)
                );
                win_flag = true;
            } else if (element.type == "same" && win_index == both_index) {
                await increaseFundtoDatabase(
                    element.wallet,
                    element.amount * (config.get("WIN_BOTH_MULTIPLE_NUMBER") - 1)
                );
                win_flag = true;
            }

            if (!win_flag)
                await decreaseFundtoDatabase(element.wallet, element.amount);

            // await removeBettingRecord(element.wallet);
            betting_data = betting_data.filter(e => e.wallet != element.wallet);
        }));

        // console.log("betting after", betting_data)

        const result = generate_randome(win_index);

        return { ok: true, ...result, message: "Bet complete" };
    } catch (error) {
        const rand = Math.floor(Math.random() * 1000) % 3;
        const result = generate_randome(rand);
        return { ok: false, ...result, message: "Betting Error" };
    }
};

const timeBetting = async () => {
    clearTimeout(timevar);
    if (time_index == 0) {
        io.emit("message", { type: "betting_start" });
    } else if (time_index == 20) {
        bet_working = true;
        betting_result = await betGame();
        io.emit("message", { type: "roll_start", ...betting_result });
    } else if (time_index == 21) {
        io.emit("message", { type: "roll_end", ...betting_result });
    } else if (time_index > 23) {
        bet_working = false;
        time_index = -1;
    }
    time_index++;
    timevar = setTimeout(timeBetting, timeout);
};

const get_current_status = () => {
    return time_index;
};

function main() {
    timevar = setTimeout(timeBetting, timeout);
}

main();

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));