/**
 * Route Configuration
 * 
 * Defines the navigation structure and route metadata for the application.
 * Each route includes path, label, and optional metadata for navigation components.
 */

export interface RouteConfig {
  /**
   * The URL path for the route
   */
  path: string;
  
  /**
   * Display label for navigation
   */
  label: string;
  
  /**
   * Optional description for the route
   */
  description?: string;
  
  /**
   * Optional icon identifier
   */
  icon?: string;
  
  /**
   * Whether the route should be shown in main navigation
   */
  showInNav?: boolean;
  
  /**
   * Optional order for navigation display
   */
  order?: number;
}

/**
 * Application route definitions
 */
export const routes: Record<string, RouteConfig> = {
  home: {
    path: '/',
    label: 'Home',
    description: 'Home page',
    showInNav: true,
    order: 1,
  },
  tasks: {
    path: '/tasks',
    label: 'Tasks',
    description: 'Task management',
    showInNav: true,
    order: 2,
  },
  challenges: {
    path: '/challenges',
    label: 'Challenges',
    description: 'View and manage challenges',
    showInNav: true,
    order: 3,
  },
  memberBenefits: {
    path: '/member-benefits',
    label: 'Member Benefits',
    description: 'View member benefits information',
    showInNav: true,
    order: 4,
  },
} as const;

/**
 * Type-safe route paths
 */
export type RoutePath = typeof routes[keyof typeof routes]['path'];

/**
 * Get route configuration by key
 * 
 * @param key - The route key
 * @returns The route configuration or undefined if not found
 */
export const getRoute = (key: keyof typeof routes): RouteConfig | undefined => {
  return routes[key];
};

/**
 * Get route configuration by path
 * 
 * @param path - The route path
 * @returns The route configuration or undefined if not found
 */
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return Object.values(routes).find((route) => route.path === path);
};

/**
 * Get all routes that should be displayed in navigation
 * Sorted by order property
 * 
 * @returns Array of route configurations for navigation
 */
export const getNavigationRoutes = (): RouteConfig[] => {
  return Object.values(routes)
    .filter((route) => route.showInNav)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

/**
 * Check if a given path matches a route
 * 
 * @param currentPath - The current path to check
 * @param routePath - The route path to match against
 * @returns True if the paths match
 */
export const isActiveRoute = (currentPath: string, routePath: string): boolean => {
  if (routePath === '/') {
    return currentPath === '/';
  }
  return currentPath.startsWith(routePath);
};

export default routes;