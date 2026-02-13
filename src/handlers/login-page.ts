import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Generates the HTML content for the login page
 * @returns {string} The complete HTML document for the login page
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
            max-width: 420px;
            padding: 40px;
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
            border-color: #dc2626;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
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
            font-size: 14px;
            color: #dc2626;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }

        .forgot-password a:hover {
            color: #b91c1c;
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
            border-bottom: 1px solid #e2e8f0;
        }

        .divider span {
            padding: 0 12px;
        }

        .signup-link {
            text-align: center;
            margin-top: 24px;
            font-size: 14px;
            color: #718096;
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
            display: none;
            padding: 12px;
            margin-bottom: 16px;
            background-color: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            color: #991b1b;
            font-size: 14px;
        }

        .error-message.show {
            display: block;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 28px 24px;
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

        <div id="error-message" class="error-message"></div>

        <form id="login-form" novalidate>
            <div class="form-group">
                <label for="email">Email Address</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="Enter your email"
                    required
                    autocomplete="email"
                    aria-label="Email Address"
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
                    aria-label="Password"
                />
            </div>

            <button type="submit" class="login-button" id="login-btn">
                Sign In
            </button>
        </form>

        <div class="forgot-password">
            <a href="/forgot-password">Forgot your password?</a>
        </div>

        <div class="divider">
            <span>or</span>
        </div>

        <div class="signup-link">
            Don't have an account? <a href="/signup">Sign up</a>
        </div>
    </div>

    <script>
        (function() {
            const form = document.getElementById('login-form');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const loginBtn = document.getElementById('login-btn');
            const errorMessage = document.getElementById('error-message');

            function showError(message) {
                errorMessage.textContent = message;
                errorMessage.classList.add('show');
            }

            function hideError() {
                errorMessage.classList.remove('show');
            }

            function validateEmail(email) {
                const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
                return re.test(email);
            }

            form.addEventListener('submit', function(e) {
                e.preventDefault();
                hideError();

                const email = emailInput.value.trim();
                const password = passwordInput.value;

                if (!email) {
                    showError('Please enter your email address');
                    emailInput.focus();
                    return;
                }

                if (!validateEmail(email)) {
                    showError('Please enter a valid email address');
                    emailInput.focus();
                    return;
                }

                if (!password) {
                    showError('Please enter your password');
                    passwordInput.focus();
                    return;
                }

                if (password.length < 6) {
                    showError('Password must be at least 6 characters long');
                    passwordInput.focus();
                    return;
                }

                loginBtn.disabled = true;
                loginBtn.textContent = 'Signing in...';

                // Simulate login process
                setTimeout(function() {
                    console.log('Login attempt:', { email: email });
                    // In production, this would make an API call
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign In';
                    showError('Login functionality not yet implemented');
                }, 1500);
            });

            emailInput.addEventListener('input', hideError);
            passwordInput.addEventListener('input', hideError);
        })();
    </script>
</body>
</html>`;
};

/**
 * Lambda handler to serve the login page HTML
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
        message: 'Failed to load login page',
      }),
    };
  }
};