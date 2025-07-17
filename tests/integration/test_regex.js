const description = "Verify KYC proof with ID proof_kyc_1752343501908 locally";
const proofIdMatch = description.match(/proof_\w+_\d+/);

console.log('Description:', description);
console.log('Regex match:', proofIdMatch);
if (proofIdMatch) {
    console.log('Found proof ID:', proofIdMatch[0]);
} else {
    console.log('No match found');
}