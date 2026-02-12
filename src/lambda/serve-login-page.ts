import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Generates the HTML content for the login page
 * @returns {string} Complete HTML document for the login page
 */
const generateLoginPageHTML = (): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Member Benefits Login</title>
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
            font-weight: 600;
        }

        .login-header p {
            font-size: 14px;
            color: #718096;
        }

        .form-group {
            margin-bottom: 20px;
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
            font-size: 14px;
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

        .forgot-password {
            text-align: right;
            margin-bottom: 24px;
        }

        .forgot-password a {
            font-size: 13px;
            color: #dc2626;
            text-decoration: none;
            transition: color 0.2s;
        }

        .forgot-password a:hover {
            color: #b91c1c;
            text-decoration: underline;
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
            box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);
        }

        .login-button:hover {
            background-color: #b91c1c;
            box-shadow: 0 6px 8px rgba(220, 38, 38, 0.3);
            transform: translateY(-1px);
        }

        .login-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
        }

        .login-button:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.3);
        }

        .divider {
            display: flex;
            align-items: center;
            text-align: center;
            margin: 24px 0;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            border-bottom: 1px solid #e2e8f0;
        }

        .divider span {
            padding: 0 12px;
            font-size: 13px;
            color: #718096;
        }

        .signup-link {
            text-align: center;
            font-size: 14px;
            color: #4a5568;
        }

        .signup-link a {
            color: #dc2626;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s;
        }

        .signup-link a:hover {
            color: #b91c1c;
            text-decoration: underline;
        }

        .error-message {
            display: none;
            padding: 12px;
            margin-bottom: 20px;
            background-color: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            color: #991b1b;
            font-size: 14px;
        }

        .error-message.show {
            display: block;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 32px 24px;
            }

            .login-header h1 {
                font-size: 24px;
            }

            .login-button {
                padding: 12px 20px;
                font-size: 15px;
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

        <form id="loginForm" onsubmit="handleLogin(event)">
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

            <div class="forgot-password">
                <a href="#" onclick="handleForgotPassword(event)">Forgot password?</a>
            </div>

            <button type="submit" class="login-button">
                Sign In
            </button>
        </form>

        <div class="divider">
            <span>or</span>
        </div>

        <div class="signup-link">
            Don't have an account? <a href="#" onclick="handleSignup(event)">Sign up</a>
        </div>
    </div>

    <script>
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 5000);
        }

        function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showError('Please fill in all fields');
                return;
            }

            // Placeholder for actual authentication logic
            console.log('Login attempt:', { email });
            showError('Authentication not yet implemented. Please contact support.');
        }

        function handleForgotPassword(event) {
            event.preventDefault();
            showError('Password reset functionality coming soon.');
        }

        function handleSignup(event) {
            event.preventDefault();
            showError('Sign up functionality coming soon.');
        }
    </script>
</body>
</html>`;
};

/**
 * Lambda handler function to serve the login page
 * Handles API Gateway requests and returns the login page HTML with proper headers
 * 
 * @param {APIGatewayProxyEvent} event - The API Gateway event object
 * @returns {Promise<APIGatewayProxyResult>} Response with HTML content and headers
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Log the request for monitoring purposes
    console.log('Serving login page', {
      requestId: event.requestContext.requestId,
      sourceIp: event.requestContext.identity.sourceIp,
      userAgent: event.headers['User-Agent'] || event.headers['user-agent'],
    });

    // Generate the HTML content
    const htmlContent = generateLoginPageHTML();

    // Return successful response with proper headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
      body: htmlContent,
    };
  } catch (error) {
    // Log error for debugging
    console.error('Error serving login page:', error);

    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to serve login page',
      }),
    };
  }
};

/**
 * Handler for OPTIONS requests (CORS preflight)
 * 
 * @param {APIGatewayProxyEvent} event - The API Gateway event object
 * @returns {Promise<APIGatewayProxyResult>} CORS headers response
 */
export const optionsHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
    body: '',
  };
};