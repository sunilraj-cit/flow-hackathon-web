import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * HTML template for the member benefits login page
 * Features a responsive design with a red submit button
 */
const getLoginPageHTML = (): string => {
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
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 40px;
            width: 100%;
            max-width: 400px;
        }

        h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }

        .subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 32px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #333;
            margin-bottom: 8px;
        }

        input[type="email"],
        input[type="password"] {
            width: 100%;
            padding: 12px;
            font-size: 14px;
            border: 1px solid #ddd;
            border-radius: 4px;
            transition: border-color 0.2s;
        }

        input[type="email"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #dc2626;
        }

        .error-message {
            color: #dc2626;
            font-size: 14px;
            margin-top: 8px;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .submit-button {
            width: 100%;
            padding: 12px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background-color: #dc2626;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
            margin-top: 24px;
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

        .success-message {
            color: #16a34a;
            font-size: 14px;
            margin-top: 16px;
            text-align: center;
            display: none;
        }

        .success-message.show {
            display: block;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 24px;
            }

            h1 {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>Member Benefits Login</h1>
        <p class="subtitle">Please enter your credentials to continue</p>
        
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

            <div class="error-message" id="errorMessage"></div>
            <div class="success-message" id="successMessage"></div>

            <button type="submit" class="submit-button" id="submitButton">
                Sign In
            </button>
        </form>
    </div>

    <script>
        const form = document.getElementById('loginForm');
        const submitButton = document.getElementById('submitButton');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            errorMessage.classList.remove('show');
            successMessage.classList.remove('show');
            submitButton.disabled = true;
            submitButton.textContent = 'Signing in...';

            const formData = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            try {
                const response = await fetch(window.location.pathname, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    successMessage.textContent = data.message || 'Login successful!';
                    successMessage.classList.add('show');
                    form.reset();
                } else {
                    errorMessage.textContent = data.message || 'Login failed. Please try again.';
                    errorMessage.classList.add('show');
                }
            } catch (error) {
                errorMessage.textContent = 'An error occurred. Please try again later.';
                errorMessage.classList.add('show');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Sign In';
            }
        });
    </script>
</body>
</html>
  `.trim();
};

/**
 * Validates login credentials
 * @param email - User email address
 * @param password - User password
 * @returns Validation result with success status and message
 */
const validateCredentials = (email: string, password: string): { valid: boolean; message?: string } => {
  if (!email || !password) {
    return { valid: false, message: 'Email and password are required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }

  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }

  return { valid: true };
};

/**
 * Handles POST request for login form submission
 * @param body - Request body containing email and password
 * @returns API Gateway response with login result
 */
const handleLoginSubmission = async (body: string | null): Promise<APIGatewayProxyResult> => {
  try {
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Request body is required',
        }),
      };
    }

    const { email, password } = JSON.parse(body);

    const validation = validateCredentials(email, password);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: validation.message,
        }),
      };
    }

    // TODO: Implement actual authentication logic
    // This is a placeholder for demonstration purposes
    // In production, integrate with AWS Cognito, DynamoDB, or other auth service
    
    // Simulated authentication check
    const isAuthenticated = true; // Replace with actual auth logic

    if (isAuthenticated) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
        }),
      };
    } else {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Invalid credentials',
        }),
      };
    }
  } catch (error) {
    console.error('Error processing login submission:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
      }),
    };
  }
};

/**
 * Lambda handler for member benefits login page
 * Serves the login page on GET requests and handles form submission on POST requests
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with HTML page or JSON response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const httpMethod = event.httpMethod;

  try {
    // Handle GET request - serve login page
    if (httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: getLoginPageHTML(),
      };
    }

    // Handle POST request - process login form submission
    if (httpMethod === 'POST') {
      return await handleLoginSubmission(event.body);
    }

    // Handle unsupported methods
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, POST',
      },
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed',
      }),
    };
  } catch (error) {
    console.error('Unhandled error in handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
      }),
    };
  }
};