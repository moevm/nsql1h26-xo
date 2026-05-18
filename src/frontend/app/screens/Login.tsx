import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/Button';
import { login } from '../api/client';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('Обязательное поле');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Неверный формат email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError('Обязательное поле');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 9h6v6H9z" />
              <path d="M3 3h6v6H3z" />
              <path d="M15 3h6v6h-6z" />
              <path d="M3 15h6v6H3z" />
              <path d="M15 15h6v6h-6z" />
            </svg>
          </div>
          <h1 className="mb-1">Bot Arena</h1>
          <p className="text-muted-foreground">Вход в систему</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block mb-2">Email</label>
                <input
                  id="email"
                  name="bot-arena-login-email"
                  type="email"
                  value={email}
                  autoComplete="off"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  className={`w-full px-4 py-2.5 bg-input-background rounded-lg border ${
                    emailError ? 'border-red-500' : 'border-transparent'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="user@example.com"
                />
                {emailError && <p className="mt-1.5 text-red-600">{emailError}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block mb-2">Пароль</label>
                <div className="relative">
                  <input
                    id="password"
                    name="bot-arena-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) validatePassword(e.target.value);
                    }}
                    onBlur={() => validatePassword(password)}
                    className={`w-full px-4 py-2.5 bg-input-background rounded-lg border ${
                      passwordError ? 'border-red-500' : 'border-transparent'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 pr-11`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && <p className="mt-1.5 text-red-600">{passwordError}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Запомнить меня</span>
                </label>
                <Link to="/forgot-password" className="text-blue-600 hover:underline">Забыли пароль?</Link>
              </div>

              <Button type="submit" variant="primary" loading={loading} className="w-full">
                Войти
              </Button>
            </div>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">
            Нет аккаунта? <Link to="/register" className="text-blue-600 hover:underline font-medium">Зарегистрироваться</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
