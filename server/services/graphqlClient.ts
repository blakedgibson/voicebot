/**
 * GraphQL Client Service
 *
 * Provides GraphQL query and mutation capabilities for integrations
 * that use GraphQL instead of REST APIs.
 *
 * Currently used by:
 * - Boulevard (beauty/wellness appointments)
 *
 * Future integrations may also use GraphQL.
 */

import axios, { AxiosError } from 'axios';

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
}

export interface GraphQLClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
}

class GraphQLClient {
  private endpoint: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(config: GraphQLClientConfig) {
    this.endpoint = config.endpoint;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    this.timeout = config.timeout || 15000;
  }

  /**
   * Execute a GraphQL query
   */
  async query<T = any>(
    query: string,
    variables?: Record<string, any>,
    operationName?: string
  ): Promise<GraphQLResponse<T>> {
    return this.request({ query, variables, operationName });
  }

  /**
   * Execute a GraphQL mutation
   */
  async mutate<T = any>(
    mutation: string,
    variables?: Record<string, any>,
    operationName?: string
  ): Promise<GraphQLResponse<T>> {
    return this.request({ query: mutation, variables, operationName });
  }

  /**
   * Execute a GraphQL request (query or mutation)
   */
  private async request<T = any>(request: GraphQLRequest): Promise<GraphQLResponse<T>> {
    try {
      console.log('📡 GraphQL Request:', {
        endpoint: this.endpoint,
        operation: request.operationName,
        variables: request.variables
      });

      const response = await axios.post<GraphQLResponse<T>>(
        this.endpoint,
        {
          query: request.query,
          variables: request.variables,
          operationName: request.operationName
        },
        {
          headers: this.defaultHeaders,
          timeout: this.timeout
        }
      );

      // GraphQL can return 200 with errors in the body
      if (response.data.errors && response.data.errors.length > 0) {
        console.error('❌ GraphQL errors:', response.data.errors);
        throw new GraphQLError(response.data.errors);
      }

      console.log('✅ GraphQL request successful');
      return response.data;

    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<GraphQLResponse>;
        console.error('❌ GraphQL request failed:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          errors: axiosError.response?.data?.errors
        });

        if (axiosError.response?.data?.errors) {
          throw new GraphQLError(axiosError.response.data.errors);
        }

        throw new Error(`GraphQL request failed: ${axiosError.message}`);
      }

      throw error;
    }
  }

  /**
   * Create a new GraphQL client with updated configuration
   */
  withHeaders(headers: Record<string, string>): GraphQLClient {
    return new GraphQLClient({
      endpoint: this.endpoint,
      headers: { ...this.defaultHeaders, ...headers },
      timeout: this.timeout
    });
  }

  /**
   * Create a new GraphQL client with a different endpoint
   */
  withEndpoint(endpoint: string): GraphQLClient {
    return new GraphQLClient({
      endpoint,
      headers: this.defaultHeaders,
      timeout: this.timeout
    });
  }
}

/**
 * Custom error class for GraphQL errors
 */
export class GraphQLError extends Error {
  public errors: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, any>;
  }>;

  constructor(errors: GraphQLError['errors']) {
    const message = errors.map(e => e.message).join(', ');
    super(`GraphQL Error: ${message}`);
    this.name = 'GraphQLError';
    this.errors = errors;
  }
}

/**
 * Create a GraphQL client instance
 */
export function createGraphQLClient(config: GraphQLClientConfig): GraphQLClient {
  return new GraphQLClient(config);
}

/**
 * Boulevard-specific GraphQL mutations and queries
 */
export const BoulevardQueries = {
  /**
   * Create appointment mutation
   */
  createAppointment: `
    mutation CreateAppointment($input: CreateAppointmentInput!) {
      createAppointment(input: $input) {
        appointment {
          id
          status
          startAt
          endAt
          client {
            id
            firstName
            lastName
            email
            mobilePhone
          }
          appointmentServices {
            service {
              id
              name
            }
            staff {
              id
              displayName
            }
          }
        }
      }
    }
  `,

  /**
   * Create client mutation (if client doesn't exist)
   */
  createClient: `
    mutation CreateClient($input: CreateClientInput!) {
      createClient(input: $input) {
        client {
          id
          firstName
          lastName
          email
          mobilePhone
        }
      }
    }
  `,

  /**
   * Get available services query
   */
  getServices: `
    query GetServices($locationId: ID!) {
      location(id: $locationId) {
        services {
          id
          name
          description
          duration
        }
      }
    }
  `,

  /**
   * Get available staff query
   */
  getStaff: `
    query GetStaff($locationId: ID!) {
      location(id: $locationId) {
        staff {
          id
          displayName
          role
        }
      }
    }
  `,

  /**
   * Check availability query
   */
  checkAvailability: `
    query CheckAvailability($input: GetAvailabilityInput!) {
      getAvailability(input: $input) {
        slots {
          startTime
          endTime
          available
        }
      }
    }
  `
};

export { GraphQLClient };
