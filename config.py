"""
Centralized Configuration for Agentkit (Python Services)
"""

import os
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@dataclass
class ServerConfig:
    port: int = int(os.getenv('PORT', 8001))
    host: str = os.getenv('HOST', 'localhost')
    ws_url: str = os.getenv('WS_URL', 'ws://localhost:8001/ws')

@dataclass
class AIConfig:
    chat_service_url: str = os.getenv('CHAT_SERVICE_URL', 'http://localhost:8002')
    chat_service_port: int = int(os.getenv('CHAT_SERVICE_PORT', 8002))
    openai_api_key: Optional[str] = os.getenv('OPENAI_API_KEY')
    openai_model: str = os.getenv('OPENAI_MODEL', 'gpt-4')

@dataclass
class BlockchainConfig:
    class Ethereum:
        network: str = os.getenv('ETH_NETWORK', 'sepolia')
        rpc_url: str = os.getenv('ETH_RPC_URL', 'https://sepolia.infura.io/v3/YOUR_KEY')
        contract_address: str = '0x1e8150050a7a4715aad42b905c08df76883f396f'
        chain_id: int = 11155111  # Sepolia
        explorer_url: str = 'https://sepolia.etherscan.io'
    
    class Solana:
        network: str = os.getenv('SOL_NETWORK', 'devnet')
        rpc_url: str = os.getenv('SOL_RPC_URL', 'https://api.devnet.solana.com')
        program_id: str = '5VzkNtgVwarEGSLvgvvPvTNqR7qQQai2MZ7BuYNqQPhw'
        commitment: str = 'confirmed'
        explorer_url: str = 'https://explorer.solana.com'

@dataclass
class CircleConfig:
    api_key: Optional[str] = os.getenv('CIRCLE_API_KEY')
    api_url: str = os.getenv('CIRCLE_API_URL', 'https://api-sandbox.circle.com/v1')
    eth_wallet_id: Optional[str] = os.getenv('CIRCLE_ETH_WALLET_ID')
    sol_wallet_id: Optional[str] = os.getenv('CIRCLE_SOL_WALLET_ID')
    usdc_token_id: str = os.getenv('CIRCLE_USDC_TOKEN_ID', '2552c76e-860a-47c8-a6d1-a20ba3e59334')
    poll_interval: int = 5000  # milliseconds
    max_retries: int = 3

@dataclass
class ZKEngineConfig:
    binary_path: str = os.getenv('ZKENGINE_BINARY', './zkengine_binary/zkEngine')
    wasm_dir: str = os.getenv('WASM_DIR', './zkengine_binary')
    proofs_dir: str = os.getenv('PROOFS_DIR', './proofs')
    default_step_size: int = 50
    proof_types: dict = None

    def __post_init__(self):
        if self.proof_types is None:
            self.proof_types = {
                'kyc': 'prove_kyc.wat',
                'location': 'prove_location.wat',
                'ai_content': 'prove_ai_content.wat',
            }

@dataclass
class DatabaseConfig:
    proofs_db: str = os.getenv('PROOFS_DB', './proofs_db.json')
    verifications_db: str = os.getenv('VERIFICATIONS_DB', './verifications_db.json')
    workflow_history: str = os.getenv('WORKFLOW_HISTORY', './workflow_history.json')

@dataclass
class LoggingConfig:
    level: str = os.getenv('LOG_LEVEL', 'info')
    format: str = os.getenv('LOG_FORMAT', 'json')
    debug_mode: bool = os.getenv('DEBUG_MODE', 'false').lower() == 'true'

@dataclass
class SecurityConfig:
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    allowed_file_types: list = None
    cors_origin: str = os.getenv('CORS_ORIGIN', '*')
    
    def __post_init__(self):
        if self.allowed_file_types is None:
            self.allowed_file_types = ['.wat', '.wasm']

@dataclass
class FeatureFlags:
    enable_openai: bool = os.getenv('ENABLE_OPENAI', 'true').lower() != 'false'
    enable_circle_transfers: bool = os.getenv('ENABLE_CIRCLE', 'true').lower() != 'false'
    enable_solana: bool = os.getenv('ENABLE_SOLANA', 'true').lower() != 'false'
    enable_ethereum: bool = os.getenv('ENABLE_ETHEREUM', 'true').lower() != 'false'
    enable_debug_panel: bool = os.getenv('ENABLE_DEBUG_PANEL', 'false').lower() == 'true'

@dataclass
class Config:
    server: ServerConfig = field(default_factory=ServerConfig)
    ai: AIConfig = field(default_factory=AIConfig)
    blockchain: BlockchainConfig = field(default_factory=BlockchainConfig)
    circle: CircleConfig = field(default_factory=CircleConfig)
    zkengine: ZKEngineConfig = field(default_factory=ZKEngineConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    features: FeatureFlags = field(default_factory=FeatureFlags)

def validate_config(config: Config) -> bool:
    """Validate required configuration values"""
    required_fields = [
        ('ai.openai_api_key', config.ai.openai_api_key),
        ('circle.api_key', config.circle.api_key),
        ('circle.eth_wallet_id', config.circle.eth_wallet_id),
        ('circle.sol_wallet_id', config.circle.sol_wallet_id),
    ]
    
    missing = [(name, value) for name, value in required_fields if not value]
    
    if missing:
        print('⚠️  Missing required configuration:')
        for name, _ in missing:
            print(f'   - {name}')
        print('   Please check your .env file')
    
    return len(missing) == 0

# Create global config instance
config = Config()

if __name__ == '__main__':
    # Test configuration loading
    print("Agentkit Configuration")
    print("======================")
    print(f"Server: {config.server.host}:{config.server.port}")
    print(f"OpenAI Model: {config.ai.openai_model}")
    print(f"Ethereum Network: {config.blockchain.Ethereum.network}")
    print(f"Solana Network: {config.blockchain.Solana.network}")
    print(f"Debug Mode: {config.logging.debug_mode}")
    print()
    validate_config(config)