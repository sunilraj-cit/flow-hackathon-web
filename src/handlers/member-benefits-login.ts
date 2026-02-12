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
    <title>Member Benefits Login</title>
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
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
            padding: 40px;
        }

        .login-header {
            text-align: center;
            margin-bottom: 32px;
        }

        .login-header h1 {
            font-size: 28px;
            color: #1a202c;
            margin-bottom: 8px;
        }

        .login-header p {
            font-size: 14px;
            color: #718096;
        }

        .form-group {
            margin-bottom: 24px;
        }

        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #2d3748;
            margin-bottom: 8px;
        }

        .form-group input {
            width: 100%;
            padding: 12px 16px;
            font-size: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            transition: all 0.2s;
            outline: none;
        }

        .form-group input:focus {
            border-color: #dc2626;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .form-group input::placeholder {
            color: #a0aec0;
        }

        .error-message {
            color: #dc2626;
            font-size: 14px;
            margin-top: 8px;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .login-button {
            width: 100%;
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background-color: #dc2626;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 8px;
        }

        .login-button:hover {
            background-color: #b91c1c;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .login-button:active {
            transform: translateY(0);
        }

        .login-button:disabled {
            background-color: #cbd5e0;
            cursor: not-allowed;
            transform: none;
        }

        .forgot-password {
            text-align: center;
            margin-top: 16px;
        }

        .forgot-password a {
            color: #dc2626;
            text-decoration: none;
            font-size: 14px;
            transition: color 0.2s;
        }

        .forgot-password a:hover {
            color: #b91c1c;
            text-decoration: underline;
        }

        .loading {
            display: none;
            text-align: center;
            margin-top: 16px;
            color: #718096;
            font-size: 14px;
        }

        .loading.show {
            display: block;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 32px 24px;
            }

            .login-header h1 {
                font-size: 24px;
            }

            .form-group input {
                font-size: 16px;
            }
        }

        @media (max-width: 360px) {
            .login-container {
                padding: 24px 16px;
            }

            .login-header h1 {
                font-size: 22px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>Member Benefits</h1>
            <p>Sign in to access your exclusive benefits</p>
        </div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input 
                    type="text" 
                    id="username" 
                    name="username" 
                    placeholder="Enter your username"
                    required
                    autocomplete="username"
                />
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    placeholder="Enter your password"
                    required
                    autocomplete="current-password"
                />
            </div>
            
            <div class="error-message" id="errorMessage"></div>
            
            <button type="submit" class="login-button" id="loginButton">
                Sign In
            </button>
            
            <div class="loading" id="loadingMessage">
                Signing in...
            </div>
        </form>
        
        <div class="forgot-password">
            <a href="#" id="forgotPasswordLink">Forgot your password?</a>
        </div>
    </div>

    <script>
        const loginForm = document.getElementById('loginForm');
        const loginButton = document.getElementById('loginButton');
        const errorMessage = document.getElementById('errorMessage');
        const loadingMessage = document.getElementById('loadingMessage');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            errorMessage.classList.remove('show');
            errorMessage.textContent = '';
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            
            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }
            
            loginButton.disabled = true;
            loadingMessage.classList.add('show');
            
            try {
                const response = await fetch(window.location.href, {
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
                    showError(data.message || 'Invalid username or password');
                }
            } catch (error) {
                showError('An error occurred. Please try again later.');
            } finally {
                loginButton.disabled = false;
                loadingMessage.classList.remove('show');
            }
        });

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
        }

        document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
            e.preventDefault();
            alert('Please contact support to reset your password.');
        });
    </script>
</body>
</html>
  `;
};

/**
 * Validates login credentials
 * @param {LoginCredentials} credentials - User credentials
 * @returns {Promise<boolean>} True if credentials are valid
 */
const validateCredentials = async (credentials: LoginCredentials): Promise<boolean> => {
  // TODO: Implement actual authentication logic with database/auth service
  // This is a placeholder implementation
  const { username, password } = credentials;
  
  if (!username || !password) {
    return false;
  }
  
  // Placeholder validation - replace with actual authentication
  // In production, this should validate against a secure authentication service
  return username.length > 0 && password.length > 0;
};

/**
 * Handles GET requests to serve the login page
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} API Gateway response
 */
const handleGetRequest = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const html = generateLoginPageHTML();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body: html,
    };
  } catch (error) {
    console.error('Error serving login page:', error);
    
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
 * Handles POST requests for authentication
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} API Gateway response
 */
const handlePostRequest = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
    
    const isValid = await validateCredentials(credentials);
    
    if (isValid) {
      // TODO: Generate session token/JWT and set secure cookies
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
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
    console.error('Error processing login request:', error);
    
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
 * Serves the login page HTML on GET requests and handles authentication on POST requests
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} API Gateway response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Member benefits login handler invoked', {
    httpMethod: event.httpMethod,
    path: event.path,
  });
  
  const httpMethod = event.httpMethod.toUpperCase();
  
  switch (httpMethod) {
    case 'GET':
      return handleGetRequest(event);
    case 'POST':
      return handlePostRequest(event);
    default:
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
  }
};