import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Generates the HTML content for the member benefits login page
 * @returns {string} HTML string for the login page
 */
const generateLoginPageHTML = (): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Member Benefits - Login</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .login-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
            padding: 40px 30px;
        }

        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .login-header h1 {
            font-size: 24px;
            color: #333;
            margin-bottom: 8px;
        }

        .login-header p {
            font-size: 14px;
            color: #666;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #333;
            margin-bottom: 8px;
        }

        .form-group input {
            width: 100%;
            padding: 12px 16px;
            font-size: 14px;
            border: 1px solid #ddd;
            border-radius: 4px;
            transition: border-color 0.3s;
        }

        .form-group input:focus {
            outline: none;
            border-color: #dc2626;
        }

        .error-message {
            color: #dc2626;
            font-size: 13px;
            margin-top: 8px;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .login-button {
            width: 100%;
            padding: 14px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background-color: #dc2626;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
            margin-top: 10px;
        }

        .login-button:hover {
            background-color: #b91c1c;
        }

        .login-button:active {
            background-color: #991b1b;
        }

        .login-button:disabled {
            background-color: #fca5a5;
            cursor: not-allowed;
        }

        .forgot-password {
            text-align: center;
            margin-top: 20px;
        }

        .forgot-password a {
            color: #dc2626;
            text-decoration: none;
            font-size: 14px;
        }

        .forgot-password a:hover {
            text-decoration: underline;
        }

        .loading {
            display: none;
            text-align: center;
            margin-top: 10px;
            color: #666;
            font-size: 14px;
        }

        .loading.show {
            display: block;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 30px 20px;
            }

            .login-header h1 {
                font-size: 20px;
            }

            .form-group input {
                padding: 10px 14px;
            }

            .login-button {
                padding: 12px;
                font-size: 15px;
            }
        }

        @media (min-width: 768px) {
            .login-container {
                padding: 50px 40px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>Member Benefits</h1>
            <p>Sign in to access your benefits</p>
        </div>
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input 
                    type="text" 
                    id="username" 
                    name="username" 
                    required 
                    autocomplete="username"
                    placeholder="Enter your username"
                />
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    required 
                    autocomplete="current-password"
                    placeholder="Enter your password"
                />
            </div>
            <div class="error-message" id="errorMessage"></div>
            <button type="submit" class="login-button" id="loginButton">
                Sign In
            </button>
            <div class="loading" id="loading">Signing in...</div>
        </form>
        <div class="forgot-password">
            <a href="/member-benefits/forgot-password">Forgot password?</a>
        </div>
    </div>

    <script>
        const form = document.getElementById('loginForm');
        const loginButton = document.getElementById('loginButton');
        const errorMessage = document.getElementById('errorMessage');
        const loading = document.getElementById('loading');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            errorMessage.classList.remove('show');
            loginButton.disabled = true;
            loading.classList.add('show');

            try {
                const response = await fetch(window.location.pathname, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    window.location.href = data.redirectUrl || '/member-benefits/dashboard';
                } else {
                    errorMessage.textContent = data.message || 'Invalid username or password';
                    errorMessage.classList.add('show');
                }
            } catch (error) {
                errorMessage.textContent = 'An error occurred. Please try again.';
                errorMessage.classList.add('show');
            } finally {
                loginButton.disabled = false;
                loading.classList.remove('show');
            }
        });
    </script>
</body>
</html>
  `.trim();
};

/**
 * Validates login credentials
 * @param {LoginCredentials} credentials - The login credentials to validate
 * @returns {boolean} True if credentials are valid
 */
const validateCredentials = (credentials: LoginCredentials): boolean => {
  // TODO: Implement actual authentication logic with database/service
  // This is a placeholder implementation
  const { username, password } = credentials;
  
  if (!username || !password) {
    return false;
  }

  // Placeholder validation - replace with actual authentication
  return username.length > 0 && password.length > 0;
};

/**
 * Handles POST requests for authentication
 * @param {APIGatewayProxyEvent} event - The API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} The API Gateway response
 */
const handleAuthenticationRequest = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Request body is required',
        }),
      };
    }

    const credentials: LoginCredentials = JSON.parse(event.body);

    if (!credentials.username || !credentials.password) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Username and password are required',
        }),
      };
    }

    const isValid = validateCredentials(credentials);

    if (isValid) {
      // TODO: Generate session token/JWT and set secure cookies
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'session=placeholder; HttpOnly; Secure; SameSite=Strict; Path=/',
        },
        body: JSON.stringify({
          success: true,
          message: 'Authentication successful',
          redirectUrl: '/member-benefits/dashboard',
        }),
      };
    } else {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Invalid username or password',
        }),
      };
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
      }),
    };
  }
};

/**
 * Lambda handler for member benefits login page
 * Serves the login page HTML for GET requests and handles authentication for POST requests
 * @param {APIGatewayProxyEvent} event - The API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} The API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const httpMethod = event.httpMethod;

    // Handle GET request - serve login page
    if (httpMethod === 'GET') {
      const html = generateLoginPageHTML();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: html,
      };
    }

    // Handle POST request - process authentication
    if (httpMethod === 'POST') {
      return await handleAuthenticationRequest(event);
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, POST',
      },
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed',
      }),
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
      }),
    };
  }
};