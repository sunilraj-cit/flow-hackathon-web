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
            padding: 1rem;
        }

        .login-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
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
            color: #666;
            font-size: 0.875rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
            font-size: 0.875rem;
        }

        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }

        .form-group input:focus {
            outline: none;
            border-color: #dc2626;
        }

        .login-button {
            width: 100%;
            padding: 0.875rem;
            background-color: #dc2626;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.3s ease, transform 0.1s ease;
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
            color: #dc2626;
            text-decoration: none;
            font-size: 0.875rem;
            transition: color 0.3s ease;
        }

        .forgot-password a:hover {
            color: #b91c1c;
            text-decoration: underline;
        }

        .error-message {
            background-color: #fee2e2;
            color: #991b1b;
            padding: 0.75rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            display: none;
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
                padding: 0.625rem;
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

        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required 
                    autocomplete="email"
                    placeholder="Enter your email"
                />
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    required 
                    autocomplete="current-password"
                    placeholder="Enter your password"
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
            alert('Password reset functionality will be available soon.');
        });
    </script>
</body>
</html>`;
};

/**
 * Lambda handler to serve the login page via API Gateway
 * @param {APIGatewayProxyEvent} event - The API Gateway proxy event
 * @returns {Promise<APIGatewayProxyResult>} The API Gateway proxy result with HTML content
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Log the incoming request for debugging purposes
    console.log('Serving login page', {
      path: event.path,
      method: event.httpMethod,
      requestId: event.requestContext.requestId,
    });

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Allow': 'GET',
        },
        body: JSON.stringify({
          error: 'Method Not Allowed',
          message: 'Only GET requests are supported',
        }),
      };
    }

    // Generate and return the login page HTML
    const htmlContent = generateLoginPageHTML();

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
    // Log the error for monitoring and debugging
    console.error('Error serving login page:', error);

    // Return a generic error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'An error occurred while serving the login page',
      }),
    };
  }
};
```