import React from 'react';
import { RegisterForm } from '../components/Register';

export const RegisterPage = ({ register }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="mt-2 text-gray-600">Get started with your new account</p>
        </div>
        <RegisterForm register={register} />
        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
};