# Powers of Tau Setup Guide

The Verifiable Agent Kit requires a Powers of Tau (ptau) file for generating zero-knowledge proofs. The `pot20_final.ptau` file (456MB) is too large for GitHub, so you need to set it up separately.

## Quick Setup Options

### Option 1: Download the Required File (Recommended)
```bash
# Download the pot20_final.ptau file (456MB)
cd resources/ptau
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau -O pot20_final.ptau

# Verify the download
ls -lh pot20_final.ptau
# Should show: -rw-r--r-- 1 user user 457M ... pot20_final.ptau
```

### Option 2: Use a Smaller ptau File (Faster, Less Secure)
If you're just testing and don't need the full security of pot20, you can use the included pot12 file:

```bash
# Create a symlink to use pot12 instead of pot20
cd resources/ptau
ln -s pot12_final.ptau pot20_final.ptau
```

**Note**: This reduces the maximum number of constraints your circuits can have from 2^20 to 2^12, but it's sufficient for testing.

### Option 3: Use Git LFS (For Contributors)
If you're contributing to the project and need to commit the file:

```bash
# Install Git LFS
git lfs install

# Track the large file
git lfs track "resources/ptau/pot20_final.ptau"
git add .gitattributes

# Download and add the file
cd resources/ptau
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau -O pot20_final.ptau
git add pot20_final.ptau
git commit -m "Add pot20_final.ptau via Git LFS"
```

## Understanding ptau Files

Powers of Tau files are the result of a multi-party computation ceremony that generates the common reference string (CRS) needed for zk-SNARKs. The number (e.g., pot20) indicates the maximum circuit size:
- pot8: Up to 2^8 = 256 constraints (included, 290KB)
- pot12: Up to 2^12 = 4,096 constraints (included, 4.6MB)
- pot20: Up to 2^20 = 1,048,576 constraints (needs download, 456MB)

## Verification

After setting up the ptau file, verify your installation:

```bash
# Check if the file exists
ls -lh resources/ptau/pot20_final.ptau

# Test proof generation
npm run test:snark
```

## Troubleshooting

If you get an error about missing ptau file:
1. Make sure you're in the project root directory
2. Create the directory if it doesn't exist: `mkdir -p resources/ptau`
3. Follow Option 1 or 2 above

For production use, always use the full pot20_final.ptau file for maximum security.