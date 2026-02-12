import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Interface for login request body
 */
interface LoginRequest {
  email?: string;
  password?: string;
}

/**
 * Interface for login response
 */
interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
}

/**
 * Generates the HTML content for the login page
 * @returns {string} HTML string for the login page
 */
const getLoginPageHTML = (): string => {
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .login-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 420px;
            padding: 40px;
            animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
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
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 8px;
        }

        .form-group input {
            width: 100%;
            padding: 12px 16px;
            font-size: 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            transition: all 0.3s ease;
            outline: none;
        }

        .form-group input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input::placeholder {
            color: #a0aec0;
        }

        .login-button {
            width: 100%;
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background-color: #dc2626;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 8px;
        }

        .login-button:hover {
            background-color: #b91c1c;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(220, 38, 38, 0.3);
        }

        .login-button:active {
            transform: translateY(0);
        }

        .login-button:disabled {
            background-color: #cbd5e0;
            cursor: not-allowed;
            transform: none;
        }

        .error-message {
            background-color: #fee;
            color: #c53030;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 20px;
            display: none;
            border-left: 4px solid #c53030;
        }

        .error-message.show {
            display: block;
            animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .forgot-password {
            text-align: center;
            margin-top: 20px;
        }

        .forgot-password a {
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
            transition: color 0.3s ease;
        }

        .forgot-password a:hover {
            color: #764ba2;
            text-decoration: underline;
        }

        .loading-spinner {
            display: none;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 30px 24px;
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
                padding: 24px 20px;
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
            <p>Sign in to access your benefits</p>
        </div>

        <div id="errorMessage" class="error-message"></div>

        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="Enter your email"
                    required
                    autocomplete="email"
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

            <button type="submit" class="login-button" id="loginButton">
                <span id="buttonText">Sign In</span>
                <div class="loading-spinner" id="loadingSpinner"></div>
            </button>
        </form>

        <div class="forgot-password">
            <a href="#" id="forgotPasswordLink">Forgot your password?</a>
        </div>
    </div>

    <script>
        const form = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');
        const loginButton = document.getElementById('loginButton');
        const buttonText = document.getElementById('buttonText');
        const loadingSpinner = document.getElementById('loadingSpinner');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Hide error message
            errorMessage.classList.remove('show');
            
            // Show loading state
            loginButton.disabled = true;
            buttonText.style.display = 'none';
            loadingSpinner.style.display = 'block';

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Store token if provided
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                    }
                    // Redirect to member benefits dashboard
                    window.location.href = '/member-benefits/dashboard';
                } else {
                    showError(data.message || 'Login failed. Please try again.');
                }
            } catch (error) {
                showError('An error occurred. Please try again later.');
            } finally {
                // Reset button state
                loginButton.disabled = false;
                buttonText.style.display = 'inline';
                loadingSpinner.style.display = 'none';
            }
        });

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
        }

        document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
            e.preventDefault();
            alert('Password reset functionality will be available soon.');
        });
    </script>
</body>
</html>
  `;
};

/**
 * Validates login credentials
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<boolean>} True if credentials are valid
 */
const validateCredentials = async (email: string, password: string): Promise<boolean> => {
  // TODO: Implement actual authentication logic with database/auth service
  // This is a placeholder implementation
  if (!email || !password) {
    return false;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Password length validation
  if (password.length < 6) {
    return false;
  }

  // TODO: Replace with actual authentication
  // For now, this is a mock validation
  return true;
};

/**
 * Generates a JWT token for authenticated user
 * @param {string} email - User email
 * @returns {string} JWT token
 */
const generateToken = (email: string): string => {
  // TODO: Implement actual JWT token generation
  // This is a placeholder implementation
  const payload = {
    email,
    timestamp: Date.now(),
  };
  
  // In production, use proper JWT library and signing
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

/**
 * Handles POST requests for login authentication
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} API Gateway response
 */
const handleLoginPost = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
        } as LoginResponse),
      };
    }

    const { email, password }: LoginRequest = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Email and password are required',
        } as LoginResponse),
      };
    }

    const isValid = await validateCredentials(email, password);

    if (!isValid) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Invalid email or password',
        } as LoginResponse),
      };
    }

    const token = generateToken(email);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        token,
      } as LoginResponse),
    };
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
      } as LoginResponse),
    };
  }
};

/**
 * Handles GET requests for serving the login page
 * @returns {APIGatewayProxyResult} API Gateway response with HTML content
 */
const handleLoginGet = (): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    body: getLoginPageHTML(),
  };
};

/**
 * Main Lambda handler for member benefits login
 * Serves login page HTML on GET requests and handles authentication on POST requests
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} API Gateway response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Login handler invoked:', {
    httpMethod: event.httpMethod,
    path: event.path,
    sourceIp: event.requestContext.identity.sourceIp,
  });

  try {
    const httpMethod = event.httpMethod.toUpperCase();

    switch (httpMethod) {
      case 'GET':
        return handleLoginGet();
      
      case 'POST':
        return await handleLoginPost(event);
      
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
  } catch (error) {
    console.error('Unexpected error in login handler:', error);
    
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
```
Human: Add unit tests for this file

File: tests/lambdas/member-benefits/login-handler.test.ts