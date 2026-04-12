# Tools

## bash
```json
{
  "type": "function",
  "function": {
    "name": "bash",
    "description": "Execute shell commands in the workspace. Use this to run programs, scripts, or system commands.",
    "parameters": {
      "type": "object",
      "properties": {
        "command": {
          "type": "string",
          "description": "The shell command to execute"
        },
        "timeout": {
          "type": "number",
          "description": "Timeout in seconds (default: 30)",
          "default": 30
        },
        "working_dir": {
          "type": "string",
          "description": "Working directory (default: /agent)"
        }
      },
      "required": ["command"]
    }
  }
}
```

## file
```json
{
  "type": "function",
  "function": {
    "name": "file",
    "description": "Read, write, list, delete or check existence of files in the workspace.",
    "parameters": {
      "type": "object",
      "properties": {
        "operation": {
          "type": "string",
          "description": "Operation: read, write, list, delete, exists",
          "enum": ["read", "write", "list", "delete", "exists"]
        },
        "path": {
          "type": "string",
          "description": "File or directory path (relative to workspace)"
        },
        "content": {
          "type": "string",
          "description": "Content to write (for write operation)"
        }
      },
      "required": ["operation", "path"]
    }
  }
}
```

## http
```json
{
  "type": "function",
  "function": {
    "name": "http",
    "description": "Make HTTP requests to external APIs or URLs.",
    "parameters": {
      "type": "object",
      "properties": {
        "method": {
          "type": "string",
          "description": "HTTP method (GET, POST, PUT, DELETE)",
          "enum": ["GET", "POST", "PUT", "DELETE"]
        },
        "url": {
          "type": "string",
          "description": "The URL to request"
        },
        "headers": {
          "type": "object",
          "description": "HTTP headers (optional)"
        },
        "body": {
          "type": "string",
          "description": "Request body (for POST/PUT, optional)"
        }
      },
      "required": ["method", "url"]
    }
  }
}
```