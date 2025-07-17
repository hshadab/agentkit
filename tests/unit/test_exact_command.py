import subprocess
import os

# Test the exact command that would be generated
test_command = "Generate location proof for NYC then if location verified send 1 USDC to alice"
cli_command = f"node circle/workflowCLI_generic.js '{test_command}'"

print(f"Testing exact command: {cli_command}")

result = subprocess.run(
    cli_command,
    shell=True,
    capture_output=True,
    text=True,
    cwd=os.path.expanduser("~/agentkit")
)

print(f"Return code: {result.returncode}")
print(f"Success: {result.returncode == 0}")
print(f"Output preview: {result.stdout[:200]}...")
