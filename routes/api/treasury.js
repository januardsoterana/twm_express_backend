const express = require('express');
const router = express.Router();
const Treasury = require('../../models/Treasury');

// @route    GET api/treasury/fund/:wallet
// @desc     Get fund
// @access   Public

router.get(
    '/fund/:wallet',
    async ({ params: { wallet } }, res) => {
        try {
            if (!wallet) {
                return res.json({ ok: false, wallet: wallet, amount: null })
            }

            const data = await Treasury.find({ wallet: wallet });
            if (data.length > 0) {
                fund = data[0]?.amount
            } else fund = 0;
            return res.json({ ok: true, wallet: wallet, amount: fund });
        } catch (err) {
            console.error(err.message);
            return res.status(500).json({ msg: 'Server error' });
        }
    }
);

// @route    GET api/treasury/state/:wallet
// @desc     Get state
// @access   Public

router.get(
    '/state/:wallet',
    async ({ params: { wallet } }, res) => {
        try {
            if (!wallet) {
                return res.json({ ok: false, wallet: wallet, amount: 0, depositIndex: 0, claimIndex: 0, status: false, claimHistory: [] })
            }

            const data = await Treasury.find({ wallet: wallet });
            if (data.length > 0) {
                fund = data[0]?.amount;
                depositIndex = data[0]?.depositIndex;
                claimIndex = data[0]?.claimIndex;
                statusFlag = data[0]?.status;
                claimHistory = data[0]?.claimHistory;
            } else {
                fund = 0; 
                depositIndex = 0;
                claimIndex = 0;
                statusFlag = true;
                claimHistory = []
            }
            return res.json({ ok: true, wallet: wallet, amount: fund, depositIndex: depositIndex, claimIndex: claimIndex, status: statusFlag, claimHistory: claimHistory });
        } catch (err) {
            console.error(err.message);
            return res.status(500).json({ msg: 'Server error' });
        }
    }
);

module.exports = router;