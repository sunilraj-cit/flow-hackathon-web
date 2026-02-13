import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Generates the HTML content for the member benefits login page
 * @returns {string} HTML string for the login page
 */
const generateLoginPageHTML = (): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Member Benefits Login</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }

        .login-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 40px;
            width: 100%;
            max-width: 400px;
        }

        h1 {
            font-size: 24px;
            margin-bottom: 30px;
            text-align: center;
            color: #333;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-size: 14px;
            font-weight: 500;
        }

        input[type="text"],
        input[type="password"],
        input[type="email"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        input[type="text"]:focus,
        input[type="password"]:focus,
        input[type="email"]:focus {
            outline: none;
            border-color: #dc2626;
        }

        .error-message {
            color: #dc2626;
            font-size: 14px;
            margin-top: 10px;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .submit-button {
            width: 100%;
            padding: 14px;
            background-color: #dc2626;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.3s;
            margin-top: 10px;
        }

        .submit-button:hover {
            background-color: #b91c1c;
        }

        .submit-button:active {
            background-color: #991b1b;
        }

        .submit-button:disabled {
            background-color: #fca5a5;
            cursor: not-allowed;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 30px 20px;
            }

            h1 {
                font-size: 20px;
                margin-bottom: 25px;
            }

            input[type="text"],
            input[type="password"],
            input[type="email"] {
                padding: 10px;
            }

            .submit-button {
                padding: 12px;
                font-size: 15px;
            }
        }

        @media (max-width: 360px) {
            .login-container {
                padding: 25px 15px;
            }

            h1 {
                font-size: 18px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>Member Benefits Login</h1>
        <form id="loginForm" method="POST">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required autocomplete="email">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>
            <div id="errorMessage" class="error-message"></div>
            <button type="submit" class="submit-button" id="submitButton">Login</button>
        </form>
    </div>

    <script>
        const form = document.getElementById('loginForm');
        const submitButton = document.getElementById('submitButton');
        const errorMessage = document.getElementById('errorMessage');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            errorMessage.classList.remove('show');
            errorMessage.textContent = '';
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    window.location.href = data.redirectUrl || '/dashboard';
                } else {
                    errorMessage.textContent = data.message || 'Login failed. Please try again.';
                    errorMessage.classList.add('show');
                }
            } catch (error) {
                errorMessage.textContent = 'An error occurred. Please try again later.';
                errorMessage.classList.add('show');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        });
    </script>
</body>
</html>
  `;
};

/**
 * Validates login credentials
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<boolean>} True if credentials are valid
 */
const validateCredentials = async (email: string, password: string): Promise<boolean> => {
  // TODO: Implement actual authentication logic
  // This is a placeholder implementation
  if (!email || !password) {
    return false;
  }

  // Add your authentication logic here
  // Example: Check against database, call authentication service, etc.
  return email.length > 0 && password.length > 0;
};

/**
 * Handles POST request for login form submission
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} API Gateway response
 */
const handleLoginSubmission = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Request body is required',
        }),
      };
    }

    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Email and password are required',
        }),
      };
    }

    const isValid = await validateCredentials(email, password);

    if (!isValid) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Invalid email or password',
        }),
      };
    }

    // TODO: Generate session token, set cookies, etc.
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Login successful',
        redirectUrl: '/dashboard',
      }),
    };
  } catch (error) {
    console.error('Error processing login submission:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Internal server error',
      }),
    };
  }
};

/**
 * Lambda handler for member benefits login page
 * Serves the login page on GET requests and handles form submission on POST requests
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @returns {Promise<APIGatewayProxyResult>} API Gateway response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const httpMethod = event.httpMethod;

    if (httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: generateLoginPageHTML(),
      };
    }

    if (httpMethod === 'POST') {
      return await handleLoginSubmission(event);
    }

    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, POST',
      },
      body: JSON.stringify({
        message: 'Method not allowed',
      }),
    };
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Internal server error',
      }),
    };
  }
};