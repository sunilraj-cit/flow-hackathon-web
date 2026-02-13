import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Route configuration for member benefits endpoints
 */
export interface MemberBenefitsRoute {
  path: string;
  method: string;
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
}

/**
 * Handles the member benefits login page request
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with HTML content
 */
export const handleMemberBenefitsLogin = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const htmlContent = `
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
            padding: 1rem;
        }

        .login-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            width: 100%;
            max-width: 400px;
        }

        h1 {
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
            color: #333;
            text-align: center;
        }

        .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 2rem;
            font-size: 0.875rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
            font-size: 0.875rem;
        }

        input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }

        input:focus {
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
            transition: background-color 0.2s;
        }

        .login-button:hover {
            background-color: #b91c1c;
        }

        .login-button:active {
            background-color: #991b1b;
        }

        .forgot-password {
            text-align: center;
            margin-top: 1rem;
        }

        .forgot-password a {
            color: #dc2626;
            text-decoration: none;
            font-size: 0.875rem;
        }

        .forgot-password a:hover {
            text-decoration: underline;
        }

        @media (max-width: 640px) {
            .login-container {
                padding: 1.5rem;
            }

            h1 {
                font-size: 1.5rem;
            }

            input,
            .login-button {
                padding: 0.625rem;
                font-size: 0.9375rem;
            }
        }

        @media (max-width: 360px) {
            .login-container {
                padding: 1rem;
            }

            h1 {
                font-size: 1.25rem;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>Member Benefits</h1>
        <p class="subtitle">Sign in to access your benefits</p>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required 
                    placeholder="Enter your email"
                    autocomplete="email"
                />
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    required 
                    placeholder="Enter your password"
                    autocomplete="current-password"
                />
            </div>
            
            <button type="submit" class="login-button">
                Sign In
            </button>
        </form>
        
        <div class="forgot-password">
            <a href="/member-benefits/forgot-password">Forgot your password?</a>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            // Login logic will be implemented here
            console.log('Login form submitted');
        });
    </script>
</body>
</html>
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body: htmlContent,
    };
  } catch (error) {
    console.error('Error handling member benefits login request:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'An error occurred while processing your request',
      }),
    };
  }
};

/**
 * Member benefits route configurations
 */
export const memberBenefitsRoutes: MemberBenefitsRoute[] = [
  {
    path: '/member-benefits/login',
    method: 'GET',
    handler: handleMemberBenefitsLogin,
  },
];

/**
 * Route matcher for member benefits endpoints
 * 
 * @param path - Request path
 * @param method - HTTP method
 * @returns Matching route handler or undefined
 */
export const matchMemberBenefitsRoute = (
  path: string,
  method: string
): ((event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) | undefined => {
  const route = memberBenefitsRoutes.find(
    (r) => r.path === path && r.method.toUpperCase() === method.toUpperCase()
  );
  
  return route?.handler;
};
```