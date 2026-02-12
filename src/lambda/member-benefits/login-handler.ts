import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Generates the HTML content for the member benefits login page
 * @returns {string} HTML content for the login page
 */
const generateLoginPageHTML = (): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
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
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .login-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
            padding: 40px 30px;
            animation: fadeIn 0.5s ease-in-out;
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
            margin-bottom: 30px;
        }

        .login-header h1 {
            font-size: 28px;
            color: #333;
            margin-bottom: 8px;
            font-weight: 600;
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
            border-radius: 6px;
            transition: all 0.3s ease;
            outline: none;
        }

        .form-group input:focus {
            border-color: #dc2626;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .form-group input::placeholder {
            color: #999;
        }

        .forgot-password {
            text-align: right;
            margin-bottom: 20px;
        }

        .forgot-password a {
            font-size: 13px;
            color: #666;
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .forgot-password a:hover {
            color: #dc2626;
        }

        .login-button {
            width: 100%;
            padding: 14px 20px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background-color: #dc2626;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .login-button:hover {
            background-color: #b91c1c;
            box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
            transform: translateY(-2px);
        }

        .login-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
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
            border-bottom: 1px solid #ddd;
        }

        .divider span {
            padding: 0 12px;
            font-size: 13px;
            color: #999;
        }

        .signup-link {
            text-align: center;
            margin-top: 20px;
            font-size: 14px;
            color: #666;
        }

        .signup-link a {
            color: #dc2626;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s ease;
        }

        .signup-link a:hover {
            color: #b91c1c;
            text-decoration: underline;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }

        .checkbox-group input[type="checkbox"] {
            width: auto;
            margin-right: 8px;
            cursor: pointer;
        }

        .checkbox-group label {
            font-size: 13px;
            color: #666;
            cursor: pointer;
            margin-bottom: 0;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 30px 20px;
            }

            .login-header h1 {
                font-size: 24px;
            }

            .login-button {
                padding: 12px 16px;
                font-size: 15px;
            }
        }

        @media (max-width: 360px) {
            .login-container {
                padding: 25px 15px;
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
            
            <div class="checkbox-group">
                <input type="checkbox" id="remember" name="remember" />
                <label for="remember">Remember me</label>
            </div>
            
            <div class="forgot-password">
                <a href="#" onclick="handleForgotPassword(event)">Forgot password?</a>
            </div>
            
            <button type="submit" class="login-button">
                Sign In
            </button>
        </form>
        
        <div class="divider">
            <span>OR</span>
        </div>
        
        <div class="signup-link">
            Don't have an account? <a href="#" onclick="handleSignup(event)">Sign up</a>
        </div>
    </div>

    <script>
        function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            console.log('Login attempt:', { email, remember });
            alert('Login functionality will be implemented in the next phase.');
            return false;
        }

        function handleForgotPassword(event) {
            event.preventDefault();
            alert('Password reset functionality will be implemented in the next phase.');
        }

        function handleSignup(event) {
            event.preventDefault();
            alert('Sign up functionality will be implemented in the next phase.');
        }
    </script>
</body>
</html>
  `.trim();
};

/**
 * Generates CORS headers for API Gateway responses
 * @param {string} origin - The origin to allow (default: *)
 * @returns {Record<string, string>} CORS headers object
 */
const getCorsHeaders = (origin: string = '*'): Record<string, string> => {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
};

/**
 * Lambda handler for serving the member benefits login page
 * Handles both GET requests (serve page) and OPTIONS requests (CORS preflight)
 * 
 * @param {APIGatewayProxyEvent} event - The API Gateway event object
 * @returns {Promise<APIGatewayProxyResult>} API Gateway response with HTML content or CORS headers
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestOrigin = event.headers?.origin || event.headers?.Origin || '*';
    const corsHeaders = getCorsHeaders(requestOrigin);

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    // Handle GET requests - serve the login page
    if (event.httpMethod === 'GET') {
      const htmlContent = generateLoginPageHTML();

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: htmlContent,
      };
    }

    // Method not allowed for other HTTP methods
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Method Not Allowed',
        message: `HTTP method ${event.httpMethod} is not supported for this endpoint`,
      }),
    };
  } catch (error) {
    console.error('Error in login handler:', error);

    return {
      statusCode: 500,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while processing your request',
      }),
    };
  }
};
```