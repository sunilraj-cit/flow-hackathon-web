import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Generates the HTML content for the login page
 * @returns {string} The complete HTML document
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .login-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
            padding: 2.5rem;
        }

        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .login-header h1 {
            font-size: 1.75rem;
            color: #1a202c;
            margin-bottom: 0.5rem;
        }

        .login-header p {
            color: #718096;
            font-size: 0.95rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #2d3748;
            font-weight: 500;
            font-size: 0.95rem;
        }

        .form-group input {
            width: 100%;
            padding: 0.875rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s ease;
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
            margin-bottom: 1.5rem;
        }

        .forgot-password a {
            color: #718096;
            font-size: 0.875rem;
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .forgot-password a:hover {
            color: #dc2626;
        }

        .login-button {
            width: 100%;
            padding: 1rem;
            background-color: #dc2626;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);
        }

        .login-button:hover {
            background-color: #b91c1c;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(220, 38, 38, 0.3);
        }

        .login-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
        }

        .divider {
            display: flex;
            align-items: center;
            text-align: center;
            margin: 1.5rem 0;
            color: #a0aec0;
            font-size: 0.875rem;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            border-bottom: 1px solid #e2e8f0;
        }

        .divider span {
            padding: 0 1rem;
        }

        .signup-link {
            text-align: center;
            margin-top: 1.5rem;
            color: #718096;
            font-size: 0.95rem;
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

        .error-message {
            background-color: #fee2e2;
            color: #991b1b;
            padding: 0.75rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            display: none;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 2rem 1.5rem;
            }

            .login-header h1 {
                font-size: 1.5rem;
            }

            .form-group input,
            .login-button {
                padding: 0.75rem;
            }
        }

        @media (max-width: 360px) {
            .login-container {
                padding: 1.5rem 1rem;
            }

            .login-header h1 {
                font-size: 1.25rem;
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

        <div id="error-message" class="error-message"></div>

        <form id="login-form" onsubmit="handleLogin(event)">
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
            <span>OR</span>
        </div>

        <div class="signup-link">
            Don't have an account? <a href="#" onclick="handleSignup(event)">Sign up</a>
        </div>
    </div>

    <script>
        function showError(message) {
            const errorDiv = document.getElementById('error-message');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
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
            showError('Authentication not yet implemented');
        }

        function handleForgotPassword(event) {
            event.preventDefault();
            showError('Password reset functionality coming soon');
        }

        function handleSignup(event) {
            event.preventDefault();
            showError('Sign up functionality coming soon');
        }
    </script>
</body>
</html>`;
};

/**
 * Lambda handler function to serve the login page
 * @param {APIGatewayProxyEvent} event - The API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} The API Gateway response
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

    // Return the response with proper headers
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

    // Return a generic error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
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
            padding: 2rem;
        }
        h1 {
            color: #dc2626;
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        p {
            color: #4a5568;
            font-size: 1rem;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Something went wrong</h1>
        <p>We're sorry, but we couldn't load the login page. Please try again later.</p>
    </div>
</body>
</html>`,
    };
  }
};