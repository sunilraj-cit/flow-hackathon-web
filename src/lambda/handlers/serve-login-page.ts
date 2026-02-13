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
            padding: 40px;
            width: 100%;
            max-width: 400px;
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
            padding: 12px;
            font-size: 14px;
            border: 1px solid #ddd;
            border-radius: 4px;
            transition: border-color 0.3s;
        }

        .form-group input:focus {
            outline: none;
            border-color: #dc2626;
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
        }

        .login-button:hover {
            background-color: #b91c1c;
        }

        .login-button:active {
            background-color: #991b1b;
        }

        .forgot-password {
            text-align: center;
            margin-top: 16px;
        }

        .forgot-password a {
            font-size: 14px;
            color: #666;
            text-decoration: none;
        }

        .forgot-password a:hover {
            color: #dc2626;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 30px 20px;
            }

            .login-header h1 {
                font-size: 20px;
            }

            .form-group input {
                padding: 10px;
            }

            .login-button {
                padding: 12px;
                font-size: 14px;
            }
        }

        @media (min-width: 481px) and (max-width: 768px) {
            .login-container {
                max-width: 450px;
            }
        }

        @media (min-width: 769px) {
            .login-container {
                max-width: 400px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>Member Benefits</h1>
            <p>Sign in to access your account</p>
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
            <button type="submit" class="login-button">
                Sign In
            </button>
        </form>
        <div class="forgot-password">
            <a href="#" onclick="handleForgotPassword(event)">Forgot your password?</a>
        </div>
    </div>
    <script>
        function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Placeholder for actual login logic
            console.log('Login attempt:', { email });
            alert('Login functionality will be implemented in the next phase.');
        }

        function handleForgotPassword(event) {
            event.preventDefault();
            alert('Password reset functionality will be implemented in the next phase.');
        }
    </script>
</body>
</html>`;
};

/**
 * Lambda handler to serve the login page via API Gateway
 * @param {APIGatewayProxyEvent} event - API Gateway event object
 * @returns {Promise<APIGatewayProxyResult>} API Gateway response with HTML content
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Log the incoming request for debugging
    console.log('Serving login page', {
      path: event.path,
      method: event.httpMethod,
      requestTime: event.requestContext.requestTime,
    });

    // Generate the HTML content
    const htmlContent = generateLoginPageHTML();

    // Return successful response with proper headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      },
      body: htmlContent,
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error serving login page:', error);

    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to serve login page',
      }),
    };
  }
};