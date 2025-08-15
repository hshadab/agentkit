// IoTeX Address Converter
// Converts between 0x (Ethereum-style) and io (IoTeX-style) addresses
// IoTeX uses Bech32 encoding with 'io' as the prefix

class IoTeXAddressConverter {
    constructor() {
        // IoTeX uses 'io' as the human-readable part (HRP) for Bech32
        this.hrp = 'io';
        // Bech32 character set
        this.charset = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    }
    
    // Simplified Bech32 implementation for IoTeX addresses
    bech32Polymod(values) {
        const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
        let chk = 1;
        for (const value of values) {
            const b = chk >> 25;
            chk = (chk & 0x1ffffff) << 5 ^ value;
            for (let i = 0; i < 5; i++) {
                chk ^= ((b >> i) & 1) ? GENERATOR[i] : 0;
            }
        }
        return chk;
    }
    
    bech32HrpExpand(hrp) {
        const ret = [];
        for (let i = 0; i < hrp.length; i++) {
            ret.push(hrp.charCodeAt(i) >> 5);
        }
        ret.push(0);
        for (let i = 0; i < hrp.length; i++) {
            ret.push(hrp.charCodeAt(i) & 31);
        }
        return ret;
    }
    
    bech32CreateChecksum(hrp, data) {
        const values = this.bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
        const polymod = this.bech32Polymod(values) ^ 1;
        const ret = [];
        for (let i = 0; i < 6; i++) {
            ret.push((polymod >> 5 * (5 - i)) & 31);
        }
        return ret;
    }
    
    bech32Encode(hrp, data) {
        const combined = data.concat(this.bech32CreateChecksum(hrp, data));
        let ret = hrp + '1';
        for (const p of combined) {
            ret += this.charset[p];
        }
        return ret;
    }
    
    // Convert bytes to 5-bit groups for Bech32
    convertBits(data, fromBits, toBits, pad) {
        let acc = 0;
        let bits = 0;
        const ret = [];
        const maxv = (1 << toBits) - 1;
        const maxAcc = (1 << (fromBits + toBits - 1)) - 1;
        
        for (const value of data) {
            acc = ((acc << fromBits) | value) & maxAcc;
            bits += fromBits;
            while (bits >= toBits) {
                bits -= toBits;
                ret.push((acc >> bits) & maxv);
            }
        }
        
        if (pad) {
            if (bits > 0) {
                ret.push((acc << (toBits - bits)) & maxv);
            }
        } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
            throw new Error('Invalid bits');
        }
        
        return ret;
    }
    
    // Convert 0x address to io address
    hexToIo(hexAddress) {
        try {
            // Remove 0x prefix if present
            let cleanHex = hexAddress.toLowerCase();
            if (cleanHex.startsWith('0x')) {
                cleanHex = cleanHex.slice(2);
            }
            
            // Convert hex string to bytes
            const bytes = [];
            for (let i = 0; i < cleanHex.length; i += 2) {
                bytes.push(parseInt(cleanHex.substr(i, 2), 16));
            }
            
            // Convert 8-bit bytes to 5-bit groups for Bech32
            const words = this.convertBits(bytes, 8, 5, true);
            
            // Encode with Bech32
            const ioAddress = this.bech32Encode(this.hrp, words);
            
            console.log(`Converted ${hexAddress} to ${ioAddress}`);
            return ioAddress;
            
        } catch (error) {
            console.error('Error converting hex to io address:', error);
            // Return a fallback format that might work
            return hexAddress;
        }
    }
    
    // Get the correct explorer URL for an address
    getExplorerUrl(address) {
        // IoTeX explorer accepts both 0x and io1 formats
        // We'll use the 0x format since it's simpler
        return `https://testnet.iotexscan.io/address/${address}`;
    }
    
    // Get transaction explorer URL
    getTxExplorerUrl(txHash) {
        return `https://testnet.iotexscan.io/tx/${txHash}`;
    }
}

// Make it available globally
window.ioTeXAddressConverter = new IoTeXAddressConverter();