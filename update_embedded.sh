# Manual Update Steps for Embedded Values

If the automatic script doesn't work, here are the manual steps:

## Step 1: Update loadPasteExample function

Find the `loadPasteExample` function (around line 1488) and replace the entire function with this:

```javascript
function loadPasteExample(type) {
    const examples = {
        'simple': `/*
 * PRIME NUMBER CHECKER
 * 
 * This program checks if a number is prime.
 * 
 * TO CHANGE THE INPUT: 
 * Edit the number in main() below (currently set to 17)
 * 
 * Try these values:
 * - 17 (prime)
 * - 23 (prime)
 * - 100 (not prime)
 * - 97 (prime)
 */

int is_prime(int n) {
    if (n <= 1) return 0;
    if (n == 2) return 1;
    if (n % 2 == 0) return 0;
    
    // Check odd divisors up to sqrt(n)
    for (int i = 3; i * i <= n; i += 2) {
        if (n % i == 0) return 0;
    }
    return 1;
}

int main() {
    // CHANGE THIS VALUE to test different numbers
    int number_to_check = 17;
    
    return is_prime(number_to_check);
}`,
        
        'range': `/*
 * COLLATZ CONJECTURE STEPS CALCULATOR
 * 
 * This program counts how many steps it takes for a number
 * to reach 1 using the Collatz sequence:
 * - If even: divide by 2
 * - If odd: multiply by 3 and add 1
 * 
 * TO CHANGE THE INPUT:
 * Edit the number in main() below (currently set to 27)
 * 
 * Try these values:
 * - 27 (111 steps - interesting!)
 * - 10 (6 steps)
 * - 100 (25 steps)
 * - 1000 (111 steps)
 */

int collatz_steps(int n) {
    int steps = 0;
    
    // Ensure positive number
    if (n <= 0) n = 1;
    
    while (n != 1 && steps < 1000) {
        if (n % 2 == 0) {
            n = n / 2;
        } else {
            n = 3 * n + 1;
        }
        steps++;
    }
    
    return steps;
}

int main() {
    // CHANGE THIS VALUE to test different numbers
    int starting_number = 27;
    
    return collatz_steps(starting_number);
}`,
        
        'hash': `/*
 * DIGITAL ROOT CALCULATOR
 * 
 * The digital root is obtained by repeatedly summing all 
 * digits until a single digit remains.
 * 
 * Example: 12345 → 1+2+3+4+5 = 15 → 1+5 = 6
 * 
 * TO CHANGE THE INPUT:
 * Edit the number in main() below (currently set to 12345)
 * 
 * Try these values:
 * - 12345 (digital root: 6)
 * - 999 (digital root: 9)
 * - 2024 (digital root: 8)
 * - 1000000 (digital root: 1)
 */

int digit_sum(int n) {
    int sum = 0;
    
    // Make positive
    if (n < 0) n = -n;
    
    while (n > 0) {
        sum += n % 10;
        n /= 10;
    }
    return sum;
}

int digital_root(int n) {
    while (n >= 10) {
        n = digit_sum(n);
    }
    return n;
}

int main() {
    // CHANGE THIS VALUE to calculate different digital roots
    int number = 12345;
    
    return digital_root(number);
}`
    };
    
    const textarea = document.getElementById('code-paste');
    if (textarea && examples[type]) {
        textarea.value = examples[type];
        updateSyntaxHighlight();
        lastPastedCode = examples[type];
    }
}
```

## Step 2: Update processCodePaste (around line 1680)

Find this line:
```javascript
console.log('DEBUG: (document.getElementById('paste-code')?.value || lastPastedCode || '') =', lastPastedCode); let inputs = lastPastedCode.includes('collatz') ? '27' : lastPastedCode.includes('prime') ? '17' : lastPastedCode.includes('digital') ? '12345' : prompt('Code compiled successfully! Enter input values (space-separated):');
```

Replace it with:
```javascript
// Check if code has embedded values (no parameters in main)
const hasEmbeddedValues = code.includes('int main()') && !code.includes('int main(int');

if (hasEmbeddedValues) {
    // No input needed - run directly
    const cmd = `prove custom ${compiled.wasm_file}`;
    addMessage('system', '✅ Code compiled! Running with embedded values...');
    addMessage('system', '💡 To test different values, edit them in the code before compiling');
    document.getElementById('user-input').value = cmd;
    sendMessage(cmd);
} else {
    // Ask for input
    const inputs = prompt('Code compiled successfully! Enter input values (space-separated):');
    if (inputs) {
        const cmd = `prove custom ${compiled.wasm_file} with input ${inputs}`;
        document.getElementById('user-input').value = cmd;
        sendMessage(cmd);
    }
}
```

## Step 3: Add tracking at the beginning of processCodePaste

Right after:
```javascript
const code = textarea.value;
```

Add:
```javascript
lastPastedCode = code; // Track the code
```

That's it! Now your examples will have embedded values and no dialog boxes.
