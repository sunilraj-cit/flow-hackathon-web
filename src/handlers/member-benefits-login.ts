import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Generates the HTML content for the member benefits login page
 * @returns {string} The complete HTML page as a string
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
            padding: 12px 16px;
            font-size: 14px;
            border: 1px solid #ddd;
            border-radius: 4px;
            transition: border-color 0.3s ease;
        }

        .form-group input:focus {
            outline: none;
            border-color: #dc2626;
        }

        .login-button {
            width: 100%;
            padding: 14px 20px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background-color: #dc2626;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s ease, transform 0.1s ease;
            margin-top: 10px;
        }

        .login-button:hover {
            background-color: #b91c1c;
        }

        .login-button:active {
            transform: scale(0.98);
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
            font-size: 14px;
            color: #dc2626;
            text-decoration: none;
        }

        .forgot-password a:hover {
            text-decoration: underline;
        }

        .error-message {
            display: none;
            background-color: #fee2e2;
            color: #991b1b;
            padding: 12px;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 20px;
        }

        .error-message.show {
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
                padding: 12px 18px;
                font-size: 15px;
            }
        }

        @media (max-width: 360px) {
            .login-container {
                padding: 25px 15px;
            }

            .login-header h1 {
                font-size: 18px;
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
                Sign In
            </button>
        </form>

        <div class="forgot-password">
            <a href="#" id="forgotPasswordLink">Forgot your password?</a>
        </div>
    </div>

    <script>
        const loginForm = document.getElementById('loginForm');
        const loginButton = document.getElementById('loginButton');
        const errorMessage = document.getElementById('errorMessage');
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            errorMessage.classList.remove('show');
            loginButton.disabled = true;
            loginButton.textContent = 'Signing in...';

            try {
                // Placeholder for actual authentication logic
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // This would be replaced with actual API call
                console.log('Login attempt:', { email });
                
                // Simulate error for demonstration
                throw new Error('Authentication endpoint not configured');
            } catch (error) {
                errorMessage.textContent = error.message || 'An error occurred during login. Please try again.';
                errorMessage.classList.add('show');
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = 'Sign In';
            }
        });

        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Password reset functionality will be implemented soon.');
        });
    </script>
</body>
</html>`;
};

/**
 * Lambda handler for serving the member benefits login page
 * @param {APIGatewayProxyEvent} event - The API Gateway event object
 * @returns {Promise<APIGatewayProxyResult>} The API Gateway response with HTML content
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const origin = event.headers.origin || event.headers.Origin || '*';
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['*'];

    const corsOrigin = allowedOrigins.includes('*') || allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0];

    const htmlContent = generateLoginPageHTML();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
      body: htmlContent,
    };
  } catch (error) {
    console.error('Error serving login page:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to serve login page',
      }),
    };
  }
};
```