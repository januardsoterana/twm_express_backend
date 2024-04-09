const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const admin = require('../../middleware/admin');
const { ethers, Contract } = require('ethers');
const { formatUnits, parseUnits } = require('ethers/lib/utils');
const config = require('config');
const Trait = require('../../models/Trait');
const TraitUtility = require('../../models/TraitUtility');
const checkObjectId = require('../../middleware/checkObjectId');
const sign = require('jsonwebtoken/sign');

// @route    POST api/traits
// @desc     Create or update a trait
// @access   Private
router.post(
  '/',
  admin,
  check('unsignedMsg', 'unsignedMsg is required').notEmpty(),
  check('signedMessage', 'signedMessage is required').notEmpty(),
  check('fullyExpandedSig', 'fullyExpandedSig is required').notEmpty(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let signingAddress = ethers.utils.verifyMessage(req.body.unsignedMsg, req.body.fullyExpandedSig);
    const provider = new ethers.providers.JsonRpcProvider(config.get('jsonRPC'))
    var wallet = new ethers.Wallet(config.get('AUTH_PRIVATE_KEY'));
    const account = wallet.connect(provider);

    const bankContract = new Contract(
      config.get('twmBank'),
      [
        'function owner() public view returns (address)'
      ],
      account
    );
    let ownerAddress = await bankContract.owner();
    let updateMsg = JSON.parse(req.body.unsignedMsg);
    if (ownerAddress == signingAddress) {
      try {
        let trait = await Trait.findOneAndUpdate(
          { no: updateMsg.no },
          { $set: { no: updateMsg.no, trait: updateMsg.trait } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({ trait, success: true });
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    } else {
      res.json({ success: false });
    }
  }
);

// @route    POST api/traits/utility/
// @desc     Create or update a trait
// @access   Private
router.post(
  '/utility/',
  admin,
  check('unsignedMsg', 'unsignedMsg is required').notEmpty(),
  check('signedMessage', 'signedMessage is required').notEmpty(),
  check('fullyExpandedSig', 'fullyExpandedSig is required').notEmpty(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let signingAddress = ethers.utils.verifyMessage(req.body.unsignedMsg, req.body.fullyExpandedSig);
    const provider = new ethers.providers.JsonRpcProvider(config.get('jsonRPC'))
    var wallet = new ethers.Wallet(config.get('AUTH_PRIVATE_KEY'));
    const account = wallet.connect(provider);

    const bankContract = new Contract(
      config.get('twmBank'),
      [
        'function owner() public view returns (address)'
      ],
      account
    );
    let ownerAddress = await bankContract.owner();
    let updateMsg = JSON.parse(req.body.unsignedMsg);

    if (ownerAddress == signingAddress) {
      try {
        let trait = await TraitUtility.findOneAndUpdate(
          { no: updateMsg.no },
          { $set: { no: updateMsg.no, trait: updateMsg.trait } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({ trait, success: true });
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    } else {
      res.json({ success: false });
    }
  }
);

// @route    GET api/traits
// @desc     Get all traits
// @access   Private
router.get('/', async (req, res) => {
  try {
    const traits = await Trait.find().sort({ date: -1 });
    res.json(traits);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/traits/utility/
// @desc     Get all traits
// @access   Private
router.get('/utility/', async (req, res) => {
  try {
    const traits = await TraitUtility.find().sort({ date: -1 });
    res.json(traits);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/traits/:id
// @desc     Get trait by ID
// @access   Private
router.get('/:nums',
  async ({ params: { nums } }, res) => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(config.get('jsonRPC'))
      var wallet = new ethers.Wallet(config.get('AUTH_PRIVATE_KEY'));
      const account = wallet.connect(provider);

      const bankContract = new Contract(
        config.get('twmBank'),
        [
          'function _baseRates(address addr) public view returns (uint256) '
        ],
        account
      );
      let defaultTrait = await bankContract._baseRates(config.get('twmAddress'));

      const arrNums = JSON.parse(nums);
      let traitsInventory = [];
      let replyTraits = [];
      if (Array.isArray(arrNums)) {
        traitsInventory = await Trait.find({ "no": { $in: arrNums } }).select('-_id')
      }

      for (let i = 0; i < arrNums.length; i++) {
        const result = traitsInventory.find(({ no }) => no === arrNums[i]);
        if (result) {
          replyTraits.push(result);
        } else {
          replyTraits.push({ no: arrNums[i], trait: formatUnits(defaultTrait.toString(), 18) });
        }
      }

      res.json(replyTraits);
    } catch (err) {
      console.error(err.message);

      res.status(500).send('Server Error');
    }
  });

// @route    GET api/traits/utility/:id
// @desc     Get trait by ID
// @access   Private
router.get('/utility/:nums',
  async ({ params: { nums } }, res) => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(config.get('jsonRPC'))
      var wallet = new ethers.Wallet(config.get('AUTH_PRIVATE_KEY'));
      const account = wallet.connect(provider);

      const bankContract = new Contract(
        config.get('twmBank'),
        [
          'function _baseRates(address addr) public view returns (uint256) '
        ],
        account
      );
      let defaultTrait = await bankContract._baseRates(config.get('utilityAddress'));

      const arrNums = JSON.parse(nums);
      let traitsInventory = [];
      let replyTraits = [];
      if (Array.isArray(arrNums)) {
        traitsInventory = await TraitUtility.find({ "no": { $in: arrNums } }).select('-_id')
      }

      for (let i = 0; i < arrNums.length; i++) {
        const result = traitsInventory.find(({ no }) => no === arrNums[i]);
        if (result) {
          replyTraits.push(result);
        } else {
          replyTraits.push({ no: arrNums[i], trait: formatUnits(defaultTrait.toString(), 18) });
        }
      }

      res.json(replyTraits);
    } catch (err) {
      console.error(err.message);

      res.status(500).send('Server Error');
    }
  });

// @route    DELETE api/traits/all
// @desc     Delete a trait
// @access   Private
router.delete('/all', admin, async (req, res) => {
  try {
    await Trait.deleteMany({})
    res.json({ msg: 'Trait Reset' });
  } catch (err) {
    console.error(err.message);

    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/traits/allutility
// @desc     Delete a trait of twm
// @access   Private
router.delete('/allutility', admin, async (req, res) => {
  try {
    await TraitUtility.deleteMany({})
    res.json({ msg: 'TraitUtility Reset' });
  } catch (err) {
    console.error(err.message);

    res.status(500).send('Server Error');
  }
});


// @route    DELETE api/traits/:id
// @desc     Delete a trait
// @access   Private
router.delete('/:id', [admin, checkObjectId('id')], async (req, res) => {
  try {
    const trait = await Trait.findById(req.params.id);

    if (!trait) {
      return res.status(404).json({ msg: 'Trait not found' });
    }

    await trait.remove();

    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);

    res.status(500).send('Server Error');
  }
});


// @route    DELETE api/traits/utility/:id
// @desc     Delete a trait of utility
// @access   Private
router.delete('/utility/:id', [admin, checkObjectId('id')], async (req, res) => {
  try {
    const trait = await TraitUtility.findById(req.params.id);

    if (!trait) {
      return res.status(404).json({ msg: 'Trait not found' });
    }

    await trait.remove();

    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);

    res.status(500).send('Server Error');
  }
});

// @route    GET api/traits/deposit/:nums
// @desc     Get traits by no group
// @access   Public
router.get(
  '/deposit/:nums',
  async ({ params: { nums } }, res) => {
    try {
      let hexNums = [];
      let traits = [];
      let signature;

      const provider = new ethers.providers.JsonRpcProvider(config.get('jsonRPC'))
      var wallet = new ethers.Wallet(config.get('AUTH_PRIVATE_KEY'));
      const account = wallet.connect(provider);
      const abi = [{"inputs":[{"internalType":"address","name":"_twm","type":"address"},{"internalType":"address","name":"_signer","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"contractAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":true,"internalType":"address","name":"owner","type":"address"}],"name":"AutoDeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"address","name":"contractAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokensAmount","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"address","name":"contractAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokensAmount","type":"uint256"}],"name":"Withdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"WithdrawStuckERC721","type":"event"},{"inputs":[],"name":"FirstCollection","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SECONDS_IN_DAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SecondCollection","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ThirdCollection","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"_baseRates","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"},{"internalType":"uint256[]","name":"tokenTraits","type":"uint256[]"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"depositPaused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getAccumulatedAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getCurrentReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getStakerTokens","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getStakerYield","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getTokenYield","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"isMultiplierSet","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"launchStaking","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_pause","type":"bool"}],"name":"pauseDeposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_first","type":"address"},{"internalType":"uint256","name":"_baseReward","type":"uint256"}],"name":"setFirstContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_second","type":"address"},{"internalType":"uint256","name":"_baseReward","type":"uint256"}],"name":"setSecondContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_third","type":"address"},{"internalType":"uint256","name":"_baseReward","type":"uint256"}],"name":"setThirdContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"signerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"stakingLaunched","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_contract","type":"address"},{"internalType":"uint256","name":"_yield","type":"uint256"}],"name":"updateBaseYield","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_signer","type":"address"}],"name":"updateSignerAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}];
      const bankContract = new Contract(
        config.get('twmBank'),
        abi,
        account
      );
      let defaultTrait = await bankContract._baseRates(config.get('twmAddress'));

      const obj = JSON.parse(nums);
      if (Array.isArray(obj)) {
        const traitsInventory = await Trait.find({ "no": { $in: obj } }).select('-_id');
        for (let i = 0; i < obj.length; i++) {
          hexNums.push(ethers.utils.hexlify(obj[i]));
          const result = traitsInventory.find(({ no }) => no === obj[i]);
          if (result) {
            traits.push(ethers.utils.hexlify(ethers.utils.parseUnits((result.trait).toString(), 18)));
          } else {
            traits.push(ethers.utils.hexlify(defaultTrait));
          }
        }
        let message = ethers.utils.solidityPack(["address", "uint256[]", "uint256[]"], [config.get('twmAddress'), hexNums, traits]);
        message = ethers.utils.solidityKeccak256(["bytes"], [message]);
        signature = await account.signMessage(ethers.utils.arrayify(message));
      }
      return res.json({ hexNums, traits, signature });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: 'Server error' });
    }
  }
);

// @route    GET api/traits/depositutility:nums
// @desc     Get traits by no group
// @access   Public
router.get(
  '/depositutility/:nums',
  async ({ params: { nums } }, res) => {
    try {
      let hexNums = [];
      let traits = [];
      let signature;

      const provider = new ethers.providers.JsonRpcProvider(config.get('jsonRPC'))
      var wallet = new ethers.Wallet(config.get('AUTH_PRIVATE_KEY'));
      const account = wallet.connect(provider);
      const abi = [{"inputs":[{"internalType":"address","name":"_twm","type":"address"},{"internalType":"address","name":"_signer","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"contractAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":true,"internalType":"address","name":"owner","type":"address"}],"name":"AutoDeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"address","name":"contractAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokensAmount","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"address","name":"contractAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokensAmount","type":"uint256"}],"name":"Withdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"WithdrawStuckERC721","type":"event"},{"inputs":[],"name":"FirstCollection","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SECONDS_IN_DAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SecondCollection","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ThirdCollection","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"_baseRates","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"},{"internalType":"uint256[]","name":"tokenTraits","type":"uint256[]"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"depositPaused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getAccumulatedAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getCurrentReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getStakerTokens","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getStakerYield","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getTokenYield","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"isMultiplierSet","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"launchStaking","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_pause","type":"bool"}],"name":"pauseDeposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_first","type":"address"},{"internalType":"uint256","name":"_baseReward","type":"uint256"}],"name":"setFirstContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_second","type":"address"},{"internalType":"uint256","name":"_baseReward","type":"uint256"}],"name":"setSecondContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_third","type":"address"},{"internalType":"uint256","name":"_baseReward","type":"uint256"}],"name":"setThirdContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"signerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"stakingLaunched","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_contract","type":"address"},{"internalType":"uint256","name":"_yield","type":"uint256"}],"name":"updateBaseYield","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_signer","type":"address"}],"name":"updateSignerAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"contractAddress","type":"address"},{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}];
      const bankContract = new Contract(
        config.get('twmBank'),
        abi,
        account
      );

      let defaultTrait = await bankContract._baseRates(config.get('utilityAddress'));
      const obj = JSON.parse(nums);
      if (Array.isArray(obj)) {
        const traitsInventory = await TraitUtility.find({ "no": { $in: obj } }).select('-_id');
        for (let i = 0; i < obj.length; i++) {
          hexNums.push(ethers.utils.hexlify(obj[i]));
          const result = traitsInventory.find(({ no }) => no === obj[i]);
          if (result) {
            traits.push(ethers.utils.hexlify(ethers.utils.parseUnits((result.trait).toString(), 18)));
          } else {
            traits.push(ethers.utils.hexlify(defaultTrait));
          }
        }
        let message = ethers.utils.solidityPack(["address", "uint256[]", "uint256[]"], [config.get('utilityAddress'), hexNums, traits]);
        message = ethers.utils.solidityKeccak256(["bytes"], [message]);
        signature = await account.signMessage(ethers.utils.arrayify(message));
      }
      return res.json({ hexNums, traits, signature });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: 'Server error' });
    }
  }
);

module.exports = router;