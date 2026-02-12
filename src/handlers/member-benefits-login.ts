import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Lambda handler to serve the member benefits login page
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with HTML content
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      },
      body: html,
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
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

/**
 * Generates the HTML content for the member benefits login page
 * 
 * @returns HTML string for the login page
 */
function generateLoginPageHTML(): string {
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
            padding: 1rem;
        }

        .login-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
            padding: 2rem;
        }

        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .login-header h1 {
            font-size: 1.75rem;
            color: #333;
            margin-bottom: 0.5rem;
        }

        .login-header p {
            font-size: 0.875rem;
            color: #666;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #333;
            margin-bottom: 0.5rem;
        }

        .form-group input {
            width: 100%;
            padding: 0.75rem;
            font-size: 1rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            transition: border-color 0.2s;
        }

        .form-group input:focus {
            outline: none;
            border-color: #dc2626;
        }

        .form-group input::placeholder {
            color: #999;
        }

        .login-button {
            width: 100%;
            padding: 0.875rem;
            font-size: 1rem;
            font-weight: 600;
            color: white;
            background-color: #dc2626;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s;
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
            margin-top: 1rem;
        }

        .forgot-password a {
            font-size: 0.875rem;
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
            padding: 0.75rem;
            border-radius: 4px;
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }

        .error-message.show {
            display: block;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 1.5rem;
            }

            .login-header h1 {
                font-size: 1.5rem;
            }

            .form-group input,
            .login-button {
                font-size: 0.9375rem;
            }
        }

        @media (min-width: 768px) {
            .login-container {
                padding: 2.5rem;
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

        <form id="loginForm" novalidate>
            <div class="form-group">
                <label for="email">Email Address</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="Enter your email"
                    required
                    autocomplete="email"
                >
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
                >
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
        (function() {
            const form = document.getElementById('loginForm');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const loginButton = document.getElementById('loginButton');
            const errorMessage = document.getElementById('errorMessage');
            const forgotPasswordLink = document.getElementById('forgotPasswordLink');

            function showError(message) {
                errorMessage.textContent = message;
                errorMessage.classList.add('show');
            }

            function hideError() {
                errorMessage.classList.remove('show');
            }

            function validateEmail(email) {
                const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
                    showError('Password must be at least 6 characters');
                    passwordInput.focus();
                    return;
                }

                loginButton.disabled = true;
                loginButton.textContent = 'Signing In...';

                // Simulate login process
                setTimeout(function() {
                    console.log('Login attempt:', { email: email });
                    showError('Login functionality not yet implemented');
                    loginButton.disabled = false;
                    loginButton.textContent = 'Sign In';
                }, 1000);
            });

            forgotPasswordLink.addEventListener('click', function(e) {
                e.preventDefault();
                alert('Password reset functionality coming soon!');
            });

            emailInput.addEventListener('input', hideError);
            passwordInput.addEventListener('input', hideError);
        })();
    </script>
</body>
</html>`;
}