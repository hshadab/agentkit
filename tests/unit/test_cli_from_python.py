import subprocess
import os

print("Testing CLI execution from Python...")

cli_command = "node circle/workflowCLI_generic.js 'Test workflow'"
print(f"Command: {cli_command}")

result = subprocess.run(
    cli_command,
    shell=True,
    capture_output=True,
    text=True,
    cwd=os.path.expanduser("~/agentkit")
)

print(f"Return code: {result.returncode}")
print(f"Stdout:\n{result.stdout}")
print(f"Stderr:\n{result.stderr}")
