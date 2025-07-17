#!/bin/bash

# Test Runner for Agentkit
# Usage: ./run_tests.sh [unit|integration|e2e|all]

TEST_TYPE=${1:-all}

echo "🧪 Agentkit Test Runner"
echo "======================="
echo ""

run_unit_tests() {
    echo "📋 Running Unit Tests (Python)..."
    echo "--------------------------------"
    for test in tests/unit/*.py; do
        if [ -f "$test" ]; then
            echo "Running: $(basename $test)"
            python "$test" 2>&1 | grep -E "(PASS|FAIL|Error)" || true
        fi
    done
}

run_integration_tests() {
    echo "🔗 Running Integration Tests (JavaScript)..."
    echo "------------------------------------------"
    for test in tests/integration/*.js; do
        if [ -f "$test" ]; then
            echo "Running: $(basename $test)"
            node "$test" 2>&1 | grep -E "(✓|✗|Error)" || true
        fi
    done
}

run_e2e_tests() {
    echo "🌐 Running E2E Tests (HTML)..."
    echo "------------------------------"
    echo "E2E tests need to be run in a browser."
    echo "Open the following files:"
    ls tests/e2e/*.html 2>/dev/null | head -10
}

run_script_tests() {
    echo "📜 Running Script Tests..."
    echo "-------------------------"
    for test in tests/scripts/*.sh; do
        if [ -f "$test" ] && [ -x "$test" ]; then
            echo "Running: $(basename $test)"
            # Run in a safe way - just echo for now
            echo "  Would run: $test"
        fi
    done
}

case $TEST_TYPE in
    unit)
        run_unit_tests
        ;;
    integration)
        run_integration_tests
        ;;
    e2e)
        run_e2e_tests
        ;;
    all)
        run_unit_tests
        echo ""
        run_integration_tests
        echo ""
        run_e2e_tests
        echo ""
        run_script_tests
        ;;
    *)
        echo "Usage: $0 [unit|integration|e2e|all]"
        exit 1
        ;;
esac

echo ""
echo "✅ Test run complete!"