import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Generates the HTML content for the login page
 * @returns {string} The complete HTML document as a string
 */
const generateLoginPageHTML = (): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Member Benefits Login">
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
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
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
            margin-bottom: 30px;
        }

        .login-header h1 {
            font-size: 28px;
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
            border-radius: 6px;
            transition: border-color 0.3s, box-shadow 0.3s;
        }

        .form-group input:focus {
            outline: none;
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
            transition: color 0.3s;
        }

        .forgot-password a:hover {
            color: #dc2626;
        }

        .login-button {
            width: 100%;
            padding: 14px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background-color: #dc2626;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.3s, transform 0.1s;
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

        .divider {
            display: flex;
            align-items: center;
            margin: 24px 0;
            color: #999;
            font-size: 13px;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background-color: #e5e5e5;
        }

        .divider::before {
            margin-right: 12px;
        }

        .divider::after {
            margin-left: 12px;
        }

        .signup-link {
            text-align: center;
            font-size: 14px;
            color: #666;
        }

        .signup-link a {
            color: #dc2626;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s;
        }

        .signup-link a:hover {
            color: #b91c1c;
        }

        .error-message {
            background-color: #fee2e2;
            color: #991b1b;
            padding: 12px;
            border-radius: 6px;
            font-size: 14px;
            margin-bottom: 20px;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 30px 24px;
            }

            .login-header h1 {
                font-size: 24px;
            }

            .login-button {
                padding: 12px;
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
            <p>Sign in to access your account</p>
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

            <div class="forgot-password">
                <a href="#forgot">Forgot password?</a>
            </div>

            <button type="submit" class="login-button" id="loginButton">
                Sign In
            </button>
        </form>

        <div class="divider">or</div>

        <div class="signup-link">
            Don't have an account? <a href="#signup">Sign up</a>
        </div>
    </div>

    <script>
        const form = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');
        const loginButton = document.getElementById('loginButton');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            errorMessage.classList.remove('show');
            loginButton.disabled = true;
            loginButton.textContent = 'Signing in...';

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                // Simulate API call - replace with actual authentication logic
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Example validation
                if (email && password) {
                    console.log('Login attempt:', { email });
                    // Redirect or handle successful login
                    // window.location.href = '/dashboard';
                } else {
                    throw new Error('Invalid credentials');
                }
            } catch (error) {
                errorMessage.textContent = 'Invalid email or password. Please try again.';
                errorMessage.classList.add('show');
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = 'Sign In';
            }
        });
    </script>
</body>
</html>`;
};

/**
 * Lambda handler function to serve the login page
 * @param {APIGatewayProxyEvent} event - The API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} The API Gateway response with HTML content
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const html = generateLoginPageHTML();

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
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
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
        error: 'Internal Server Error',
        message: 'Failed to serve login page',
      }),
    };
  }
};