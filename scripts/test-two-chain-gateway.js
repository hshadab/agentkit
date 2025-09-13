#!/usr/bin/env node
const { Wallet, ethers } = require('ethers');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function toBytes32(addr) {
  const cleaned = addr.toLowerCase().replace('0x','');
  return '0x' + cleaned.padStart(64, '0');
}

async function signAndSubmit(chain, privateKey, userAddress) {
  const value = '2000000';
  const domain = { name: 'GatewayWallet', version: '1' };
  const types = {
    BurnIntent: [
      { name: 'maxBlockHeight', type: 'uint256' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'spec', type: 'TransferSpec' }
    ],
    TransferSpec: [
      { name: 'version', type: 'uint32' },
      { name: 'sourceDomain', type: 'uint32' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'sourceContract', type: 'bytes32' },
      { name: 'destinationContract', type: 'bytes32' },
      { name: 'sourceToken', type: 'bytes32' },
      { name: 'destinationToken', type: 'bytes32' },
      { name: 'sourceDepositor', type: 'bytes32' },
      { name: 'destinationRecipient', type: 'bytes32' },
      { name: 'sourceSigner', type: 'bytes32' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'value', type: 'uint256' },
      { name: 'salt', type: 'bytes32' },
      { name: 'hookData', type: 'bytes' }
    ]
  };

  const burnIntent = {
    maxBlockHeight: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    maxFee: '2000101',
    spec: {
      version: 1,
      sourceDomain: 0,
      destinationDomain: chain.domain,
      sourceContract: await toBytes32('0x0077777d7EBA4688BDeF3E311b846F25870A19B9'),
      destinationContract: await toBytes32('0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'),
      sourceToken: await toBytes32('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'),
      destinationToken: await toBytes32(
        chain.domain === 6 ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' :
        chain.domain === 1 ? '0x5425890298aed601595a70AB815c96711a31Bc65' :
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
      ),
      sourceDepositor: await toBytes32(userAddress),
      destinationRecipient: await toBytes32(userAddress),
      sourceSigner: await toBytes32(userAddress),
      destinationCaller: await toBytes32('0x0000000000000000000000000000000000000000'),
      value: value,
      salt: await toBytes32('0x' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(64, '0')),
      hookData: '0x'
    }
  };

  const message = {
    maxBlockHeight: burnIntent.maxBlockHeight,
    maxFee: burnIntent.maxFee,
    spec: burnIntent.spec
  };

  const wallet = new Wallet(privateKey);
  // ethers v6
  const signature = await wallet.signTypedData(domain, types, message);

  const payload = [{ burnIntent: message, signature }];
  const resp = await fetch('http://localhost:8006/gateway/transfer', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: resp.status, data };
}

(async () => {
  const privateKey = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
  const userAddress = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
  const chains = [ { name: 'Base', domain: 6 }, { name: 'Avalanche', domain: 1 } ];

  console.log('Checking pre-transfer balance...');
  const pre = await (await fetch('http://localhost:8006/gateway/balance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: userAddress }) })).json();
  console.log('Pre-balance:', pre);

  for (const chain of chains) {
    console.log('Submitting transfer to', chain.name, 'domain', chain.domain);
    const res = await signAndSubmit(chain, privateKey, userAddress);
    console.log('Response:', res.status, res.data);
  }

  console.log('Checking post-transfer balance (may lag until settlement)...');
  const post = await (await fetch('http://localhost:8006/gateway/balance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: userAddress }) })).json();
  console.log('Post-balance:', post);
})();
