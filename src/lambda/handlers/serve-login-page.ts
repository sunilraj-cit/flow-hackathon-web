import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Generates the HTML content for the login page
 * @returns {string} The complete HTML document as a string
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
            margin-bottom: 32px;
        }

        .login-header h1 {
            font-size: 28px;
            color: #1a202c;
            margin-bottom: 8px;
            font-weight: 700;
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
            text-transform: uppercase;
            letter-spacing: 0.5px;
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

        .forgot-password {
            text-align: center;
            margin-top: 16px;
        }

        .forgot-password a {
            font-size: 14px;
            color: #667eea;
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .forgot-password a:hover {
            color: #764ba2;
            text-decoration: underline;
        }

        .divider {
            display: flex;
            align-items: center;
            margin: 24px 0;
            color: #a0aec0;
            font-size: 14px;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background-color: #e2e8f0;
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
            color: #4a5568;
        }

        .signup-link a {
            color: #dc2626;
            font-weight: 600;
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .signup-link a:hover {
            color: #b91c1c;
            text-decoration: underline;
        }

        .error-message {
            background-color: #fee;
            color: #c53030;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 20px;
            display: none;
            border-left: 4px solid #c53030;
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
            font-size: 14px;
            color: #4a5568;
            margin-bottom: 0;
            cursor: pointer;
            font-weight: 400;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 30px 24px;
            }

            .login-header h1 {
                font-size: 24px;
            }

            .form-group input,
            .login-button {
                font-size: 14px;
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

            <button type="submit" class="login-button" id="loginButton">
                Sign In
            </button>
        </form>

        <div class="forgot-password">
            <a href="#" onclick="handleForgotPassword(event)">Forgot your password?</a>
        </div>

        <div class="divider">or</div>

        <div class="signup-link">
            Don't have an account? <a href="#" onclick="handleSignup(event)">Sign up</a>
        </div>
    </div>

    <script>
        function handleLogin(event) {
            event.preventDefault();
            
            const button = document.getElementById('loginButton');
            const errorMessage = document.getElementById('errorMessage');
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Hide any previous error messages
            errorMessage.style.display = 'none';
            
            // Disable button during submission
            button.disabled = true;
            button.textContent = 'Signing In...';
            
            // Simulate login process (replace with actual API call)
            setTimeout(() => {
                // For demo purposes - replace with actual authentication logic
                if (email && password) {
                    console.log('Login attempt:', { email, remember: document.getElementById('remember').checked });
                    // Redirect or handle successful login
                    // window.location.href = '/dashboard';
                    errorMessage.textContent = 'Login functionality will be implemented in the next phase.';
                    errorMessage.style.display = 'block';
                } else {
                    errorMessage.textContent = 'Please enter valid credentials.';
                    errorMessage.style.display = 'block';
                }
                
                button.disabled = false;
                button.textContent = 'Sign In';
            }, 1000);
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
 * Lambda handler to serve the login page
 * Returns HTML content with proper headers for API Gateway
 * 
 * @param {APIGatewayProxyEvent} event - The API Gateway event object
 * @returns {Promise<APIGatewayProxyResult>} The API Gateway response with HTML content
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

    // Return successful response with HTML content
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
      body: htmlContent,
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error serving login page:', error);

    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Member Benefits</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f7fafc;
        }
        .error-container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #dc2626;
            margin-bottom: 16px;
        }
        p {
            color: #4a5568;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Oops! Something went wrong</h1>
        <p>We're unable to load the login page at this time.</p>
        <p>Please try again later.</p>
    </div>
</body>
</html>
      `.trim(),
    };
  }
};