# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of MCP Observatory seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Publicly Disclose

Please **do not** open a public GitHub issue for security vulnerabilities. This helps prevent exploitation before a fix is available.

### 2. Report Privately

Report security vulnerabilities by:

- **GitHub Security Advisories**: Use the [Security tab](https://github.com/LuKrlier/mcp-observatory/security/advisories/new) on our repository
- **Email**: Send details to [contact@lurlier.fr](mailto:contact@lurlier.fr)

### 3. Include Details

In your report, please include:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** of the vulnerability
- **Affected versions**
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### 4. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 30 days
  - Medium: Within 60 days
  - Low: Next regular release

## Security Best Practices

When using MCP Observatory:

### File Reporter

- **File Permissions**: Ensure metrics files have appropriate read/write permissions
- **Directory Access**: Restrict access to metrics directories to authorized users only
- **Sensitive Data**: Avoid logging sensitive information in tool parameters
- **File Rotation**: Implement log rotation to prevent disk space issues

### PostgreSQL Reporter

- **Connection Security**: Use encrypted connections (SSL/TLS)
- **Credentials**: Store database credentials in environment variables, not code
- **Database Permissions**: Grant minimal necessary permissions to the database user
- **Network Access**: Restrict database network access using firewalls

### Cloud Reporter

- **API Keys**: Never commit API keys to version control
- **Key Rotation**: Regularly rotate API keys
- **Environment Variables**: Store keys in secure environment variables
- **Rate Limiting**: Respect rate limits to prevent denial of service

### MCP Server

- **File Paths**: Use absolute paths to prevent directory traversal
- **Input Validation**: All user inputs are validated with Zod schemas
- **Error Messages**: Avoid exposing sensitive information in error messages
- **Debug Mode**: Disable debug mode in production environments

## Known Security Considerations

### Local File Access

The FileReporter and FileDataSource read/write local files. Users should:

- Use dedicated directories for metrics
- Set appropriate file permissions
- Avoid storing metrics in publicly accessible locations

### No Built-in Authentication

MCP Observatory components do not include built-in authentication. When deploying:

- Use network-level security (firewalls, VPNs)
- Implement authentication at the application level if needed
- Run MCP Server in trusted environments only

### Claude Desktop Integration

When using with Claude Desktop:

- MCP Server runs locally with user privileges
- File paths in configuration must be absolute
- Configuration file contains file system paths (no secrets required)

## Disclosure Policy

When a security vulnerability is reported and fixed:

1. We will credit the reporter (unless they wish to remain anonymous)
2. We will publish a security advisory on GitHub
3. We will release a patched version
4. We will update this document with lessons learned

## Security Updates

Subscribe to security updates:

- **GitHub Watch**: Click "Watch" → "Custom" → "Security alerts"
- **npm Advisories**: Run `npm audit` regularly
- **RSS Feed**: Follow our GitHub releases

## Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged in:

- Release notes
- Security advisories
- Project README (Hall of Fame section)

Thank you for helping keep MCP Observatory and its users safe!
