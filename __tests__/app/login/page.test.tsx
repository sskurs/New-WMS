
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext');

// Mock the LocaleContext to provide the 't' function
jest.mock('@/contexts/LocaleContext');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(), // Add replace for the redirect logic
  }),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseLocale = useLocale as jest.Mock;

describe('LoginPage', () => {
  const mockLogin = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock return values
    mockedUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    mockedUseLocale.mockReturnValue({
      t: (key: string) => {
        // Simple mock for translation keys used in the component
        const translations: { [key: string]: string } = {
          'login.title': 'Sign in to your account',
          'login.subtitle': 'Enter your credentials to access your dashboard.',
          'login.username': 'Username',
          'login.password': 'Password',
          'login.signIn': 'Sign In',
          'login.devOnly': 'For Development Only'
        };
        return translations[key] || key;
      },
    });
  });

  it('renders the login form correctly', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('allows the user to type into username and password fields', async () => {
    render(<LoginPage />);
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'password123');

    expect(usernameInput).toHaveValue('admin');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls the login function with credentials on form submission', async () => {
    render(<LoginPage />);
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'Admin@123');
    await user.click(submitButton);

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith({ email: 'admin', password: 'Admin@123' });
  });

  it('shows a loading state on the button during login', async () => {
    // Make the mock login function slow to simulate async behavior
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<LoginPage />);
    
    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'Admin@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // The button should be disabled immediately after click and show loading state
    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeDisabled();
    
    // Wait for the login to complete and the button to be enabled again
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('does not submit if required fields are empty', async () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
