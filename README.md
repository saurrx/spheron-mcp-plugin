# Spheron Protocol MCP Plugin

This MCP (Model Context Protocol) plugin integrates with the Spheron Protocol SDK to provide compute deployment and management capabilities directly through Claude. It allows you to deploy compute resources, manage deployments, and convert natural language descriptions into valid Spheron YAML configurations.

## Table of Contents

- [Recent Fixes and Improvements](#recent-fixes-and-improvements)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
  - [VS Code Configuration](#vs-code-configuration)
  - [Claude Desktop Configuration](#claude-desktop-configuration)
  - [Cursor Configuration](#cursor-configuration)
- [Usage](#usage)
  - [Deploy Compute](#deploy-compute)
  - [Check Wallet Balance](#check-wallet-balance)
  - [Get Deployment URLs](#get-deployment-urls)
  - [Get Lease Details](#get-lease-details)
  - [Minimum Token Requirement for Deployment](#minimum-token-requirement-for-deployment)
  - [Natural Language to YAML](#natural-language-to-yaml)
- [Natural Language to YAML Feature](#natural-language-to-yaml-feature)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)
- [License](#license)

## Recent Fixes and Improvements

- **ES Module Compatibility**: Fixed fs-extra import to work properly with ES modules
- **BigInt Serialization**: Added proper handling of BigInt values in API responses to prevent JSON serialization errors
- **Node.js Version Compatibility**: Added version checks and documentation to prevent compatibility issues
- **Natural Language to YAML**: Added feature to convert natural language descriptions to YAML configurations
- **Minimum Token Requirement**: Added balance check before deployment with a default rate of 3 CST per hour
- **Token Balance Formatting**: Improved token balance display with proper decimal formatting

## Features

- **Deploy Compute Resources**: Deploy compute resources using YAML configuration
- **Fetch Wallet Balance**: Check your wallet balance for different tokens
- **Fetch Deployment URLs**: Get URLs for your active deployments
- **Fetch Lease ID Details**: Get detailed information about a lease
- **Deploy Custom YAML Files**: Deploy using custom YAML configurations
- **Natural Language to YAML**: Convert natural language descriptions of compute requirements into valid Spheron YAML configurations

## Requirements

- **Node.js**: Version 16.0.0 or higher
- **Spheron Account**: You need a Spheron account and private key
- **Claude API Key** (optional): For enhanced natural language processing

### Verifying Node.js Version

```bash
# Check your current Node.js version
node -v

# If the version is below 16.0.0, you'll need to upgrade
```

## Installation

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/spheron-mcp-plugin.git

# Navigate to the project directory
cd spheron-mcp-plugin
```

### 2. Set Up Node.js Version

#### Using nvm (recommended)

```bash
# If you don't have nvm installed, install it first:
# For macOS/Linux:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# or
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# For Windows (using Windows Subsystem for Linux or Git Bash):
# Follow instructions at https://github.com/nvm-sh/nvm

# Restart your terminal or run:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use the project's Node.js version (defined in .nvmrc)
nvm use

# If you get an error that the version isn't installed:
nvm install
nvm use
```

#### Without nvm

If you're not using nvm, ensure your system Node.js version is 16.0.0 or higher:

```bash
# Check your Node.js version
node -v

# If it's below 16.0.0, download and install from nodejs.org
# https://nodejs.org/en/download/
```

### 3. Install Dependencies and Build

```bash
# Navigate to the server directory
cd spheron-server

# Install dependencies
npm install

# Build the project
npm run build

# Verify the build was successful
ls -la build
```

The build process will:
1. Compile TypeScript to JavaScript
2. Make the main file executable
3. Run the Node.js version check script

## Configuration

### VS Code Configuration

1. Locate or create the MCP settings file:

```bash
# For Linux:
mkdir -p ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/
touch ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json

# For macOS:
mkdir -p ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/
touch ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json

# For Windows:
# Create the file at %APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

2. Edit the settings file with your configuration:

```bash
# Open the file in your preferred editor
# For example:
nano ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

3. Add the following configuration (adjust paths and keys as needed):

```json
{
  "mcpServers": {
    "spheron": {
      "command": "node",
      "args": ["/absolute/path/to/spheron-mcp-plugin/spheron-server/build/index.js"],
      "env": {
        "SPHERON_PRIVATE_KEY": "your-spheron-private-key",
        "SPHERON_NETWORK": "testnet",
        "PROVIDER_PROXY_URL": "https://provider-proxy.spheron.network",
        "CLAUDE_API_KEY": "your-claude-api-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

4. Save the file and restart VS Code

### Claude Desktop Configuration

1. Locate or create the Claude Desktop configuration file:

```bash
# For macOS:
mkdir -p ~/Library/Application\ Support/Claude/
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json

# For Windows:
# Create the file at %APPDATA%\Claude\claude_desktop_config.json

# For Linux:
mkdir -p ~/.config/Claude/
touch ~/.config/Claude/claude_desktop_config.json
```

2. Edit the configuration file:

```bash
# Open the file in your preferred editor
# For example:
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

3. Add the following configuration (adjust paths and keys as needed):

```json
{
  "mcpServers": {
    "spheron": {
      "command": "node",
      "args": ["/absolute/path/to/spheron-mcp-plugin/spheron-server/build/index.js"],
      "env": {
        "SPHERON_PRIVATE_KEY": "your-spheron-private-key",
        "SPHERON_NETWORK": "testnet",
        "PROVIDER_PROXY_URL": "https://provider-proxy.spheron.network",
        "CLAUDE_API_KEY": "your-claude-api-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

4. Save the file and restart Claude Desktop

### Cursor Configuration

1. Locate or create the Cursor configuration file:

```bash
# For macOS:
mkdir -p ~/Library/Application\ Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/
touch ~/Library/Application\ Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json

# For Windows:
# Create the file at %APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json

# For Linux:
mkdir -p ~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/
touch ~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

2. Edit the configuration file:

```bash
# Open the file in your preferred editor
# For example:
nano ~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

3. Add the same configuration as for VS Code (adjust paths and keys as needed)

4. Save the file and restart Cursor

## Usage

Once installed and configured, you can use the Spheron Protocol MCP plugin through Claude with the following commands:

### Deploy Compute

To deploy compute resources, provide a YAML configuration:

```
Deploy this compute configuration:
version: "1.0"

services:
  py-cuda:
    image: quay.io/jupyter/pytorch-notebook:cuda12-pytorch-2.4.1
    expose:
      - port: 8888
        as: 8888
        to:
          - global: true
    env:
      - JUPYTER_TOKEN=sentient
profiles:
  name: py-cuda
  duration: 2h
  mode: provider
  tier:
    - community
  compute:
    py-cuda:
      resources:
        cpu:
          units: 8
        memory:
          size: 16Gi
        storage:
          - size: 200Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: rtx4090
  placement:
    westcoast:
      attributes:
        region: us-central
      pricing:
        py-cuda:
          token: CST
          amount: 10

deployment:
  py-cuda:
    westcoast:
      profile: py-cuda
      count: 1
```

### Check Wallet Balance

To check your wallet balance for a specific token:

```
What's my CST balance on Spheron?
```

The balance is displayed with proper decimal formatting based on the token's decimal places:

```
Here's your current CST balance:
Unlocked Balance: 27.984958 CST
Locked Balance: 0.00009 CST
Token: CST (6 decimals)
```

The response includes both raw and formatted values:

```json
{
  "success": true,
  "balance": {
    "lockedBalance": {
      "raw": "90",
      "formatted": "0.00009"
    },
    "unlockedBalance": {
      "raw": "27984958",
      "formatted": "27.984958"
    },
    "token": "CST",
    "decimals": 6
  },
  "message": "Here's your current CST balance:\nUnlocked Balance: 27.984958 CST\nLocked Balance: 0.00009 CST\nToken: CST (6 decimals)"
}
```

Supported tokens and their decimal places:
- CST: 6 decimals
- USDC: 6 decimals
- ETH: 18 decimals
- MATIC: 18 decimals

### Get Deployment URLs

To get URLs for a specific deployment:

```
Show me the URLs for my deployment with lease ID 12345
```

### Get Lease Details

To get detailed information about a lease:

```
Get details for lease ID 12345
```

### Minimum Token Requirement for Deployment

The plugin now checks if you have sufficient token balance before allowing deployment. This helps prevent failed deployments due to insufficient funds.

- **Default Rate**: 3 CST per hour
- **Minimum Balance**: 3 CST (enough for 1 hour of operation)
- **Recommended Balance**: 72 CST (enough for 24 hours of operation)
- **Warning Threshold**: 6 CST (warning is shown if balance is below 2 hours of operation)

When deploying, the system will:
1. Check your token balance (defaults to CST)
2. Compare it to the minimum requirement
3. Block deployment if balance is insufficient
4. Show a warning if balance is low but sufficient
5. Include balance information in the deployment response

Example deployment response with balance information:

```json
{
  "success": true,
  "leaseId": "12345",
  "message": "Deployment created successfully with lease ID: 12345",
  "balanceInfo": {
    "currentBalance": "27.984958",
    "token": "CST",
    "minimumRequired": 3,
    "recommendedBalance": 72,
    "warning": "Your balance of 27.984958 CST is sufficient for deployment."
  }
}
```

You can specify a different token for deployment by including the `token` parameter:

```
Deploy this compute configuration with token=USDC:
...YAML configuration...
```

### Natural Language to YAML

To convert a natural language description to a YAML configuration:

```
Convert this to a Spheron YAML: I need a Jupyter notebook with PyTorch and CUDA support, 8 CPU cores, 16GB RAM, 200GB storage, and an NVIDIA RTX 4090 GPU for 2 hours
```

## Natural Language to YAML Feature

The natural language to YAML feature allows you to describe your compute requirements in plain English and get a valid Spheron YAML configuration in return.

### How It Works

1. **Template-Based Parsing**: The system extracts key parameters from your description using pattern matching
2. **Claude API Enhancement** (optional): If a Claude API key is provided, the system uses Claude to enhance the extraction
3. **Conversation Flow**: If information is missing, the system will ask follow-up questions
4. **YAML Generation**: Once all required information is gathered, the system generates a valid YAML configuration

### Example Usage

#### Basic Example

Input:
```
Convert this to a Spheron YAML: I need a Jupyter notebook with PyTorch and CUDA support, 8 CPU cores, 16GB RAM, 200GB storage, and an NVIDIA RTX 4090 GPU for 2 hours
```

Output:
```yaml
version: '1.0'
services:
  py-cuda:
    image: spheronnetwork/jupyter-notebook:pytorch-2.4.1-cuda-enabled
    pull_policy: IfNotPresent
    expose:
      - port: 8888
        as: 8888
        to:
          - global: true
      - port: 3000
        as: 3000
        to:
          - global: true
    env:
      - JUPYTER_TOKEN=test
profiles:
  name: py-cuda
  duration: 2h
  mode: provider
  compute:
    py-cuda:
      resources:
        cpu:
          units: 8
        memory:
          size: 16Gi
        storage:
          - size: 200Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: rtx4090
  placement:
    westcoast:
      pricing:
        py-cuda:
          token: CST
          amount: 15
deployment:
  py-cuda:
    westcoast:
      profile: py-cuda
      count: 1
```

#### Incomplete Example with Follow-up Questions

Input:
```
Convert this to a Spheron YAML: I need a compute environment for machine learning
```

The system will ask follow-up questions to gather missing information:
```
To help set up the best compute environment for your machine learning needs, could you please provide some more details? Specifically, how many CPU cores and how much memory (RAM) and storage would you like? Also, if you need GPU acceleration, which GPU model would you prefer?
```

### Configuration Options

- **Claude API Key**: Provide a Claude API key in the MCP settings to enhance natural language understanding
- **Existing YAML**: You can provide an existing YAML configuration to update instead of creating a new one

## Testing

To test the MCP plugin, run the included test scripts:

```bash
# Navigate to the project directory
cd spheron-mcp-plugin

# Main test script
node test-spheron-mcp.js

# Test natural language to YAML conversion
node test-natural-to-yaml.js

# Additional test scripts
node simple-test.js
node fs-test.js
node sdk-test.js
node list-tools-test.js
```

### Expected Test Outputs

#### test-natural-to-yaml.js

This script tests the natural language to YAML conversion feature with different descriptions:

1. Complete description with all parameters
2. Incomplete description that requires follow-up questions
3. Description with specific region

The script will:
- Start the MCP server
- Send test descriptions
- Process responses and follow-up questions
- Generate YAML configurations
- Save the generated YAML to test-output-*.yaml files

#### test-spheron-mcp.js

This script tests the basic functionality of the MCP server:

- Server initialization
- Tool listing
- Basic operations

## Troubleshooting

### Node.js Version Issues

If you encounter errors like "Method not found" or other unexpected behavior, it might be due to Node.js version incompatibility. This plugin requires Node.js 16.0.0 or higher.

To check your Node.js version:
```bash
node -v
```

If your version is below 16.0.0, you have several options:

1. **Use nvm (recommended)**: 
   ```bash
   # Install Node.js 16 and use it
   nvm install 16
   nvm use 16
   ```

2. **Run the version check script**:
   ```bash
   cd spheron-server
   npm run check-node
   ```

3. **Update your global Node.js installation**:
   Visit [nodejs.org](https://nodejs.org/) to download and install the latest LTS version.

### Common Errors

- **"Method not found"**: This often occurs when using an older Node.js version that doesn't support certain ES module features.
- **Import errors with .js extension**: Make sure you're using Node.js 16+ which properly supports ES modules with the .js extension.
- **BigInt serialization errors**: These should be fixed in the latest version, but they typically occur when trying to serialize BigInt values to JSON.

### Configuration Issues

- **"Cannot find module"**: Make sure the path to the index.js file in your MCP settings is correct and absolute.
- **"SPHERON_PRIVATE_KEY environment variable is required"**: Make sure you've added your Spheron private key to the MCP settings.
- **Claude API errors**: If you're using the Claude API for natural language processing, make sure your API key is valid and correctly configured.

### Environment-Specific Issues

#### VS Code

- **Plugin not showing up**: Make sure the MCP settings file is in the correct location and properly formatted.
- **Plugin disabled**: Check that the "disabled" field is set to false in the MCP settings.

#### Claude Desktop

- **Plugin not working**: Make sure the configuration file is in the correct location and properly formatted.
- **Path issues**: Make sure the path to the index.js file is absolute and correct for your operating system.

#### Cursor

- **Plugin not showing up**: Make sure the MCP settings file is in the correct location and properly formatted.
- **Path issues**: Make sure the path to the index.js file is absolute and correct for your operating system.

## Advanced Configuration

### Custom Settings

You can customize the behavior of the MCP server by modifying the environment variables in the MCP settings:

- **SPHERON_NETWORK**: Set to "testnet" or "mainnet" depending on your needs
- **PROVIDER_PROXY_URL**: Change the provider proxy URL if needed
- **CLAUDE_API_KEY**: Add or remove the Claude API key to enable or disable enhanced natural language processing
- **SPHERON_LOG_LEVEL**: Control the verbosity of logs with one of the following values:
  - `error`: Only show error messages (most quiet)
  - `warn`: Show errors and warnings
  - `info`: Show errors, warnings, and informational messages (default)
  - `debug`: Show all messages including debug information (most verbose)

### Logging System

The plugin includes a centralized logging system that helps reduce terminal noise and provides better control over log output. The logging system features:

- **Log Levels**: Four levels of logging (error, warn, info, debug)
- **Timestamps**: All logs include timestamps for better tracking
- **Categorization**: Logs are categorized (e.g., 'Setup', 'API', 'Claude')
- **Environment Variable Control**: Set the `SPHERON_LOG_LEVEL` environment variable to control verbosity

To change the log level, add the `SPHERON_LOG_LEVEL` environment variable to your MCP settings:

```json
{
  "mcpServers": {
    "spheron": {
      "env": {
        "SPHERON_LOG_LEVEL": "error"  // Only show errors
      }
    }
  }
}
```

### Security Considerations

- **API Keys**: Keep your API keys secure and never commit them to version control
- **Private Keys**: Keep your Spheron private key secure and never share it with others

## License

MIT
