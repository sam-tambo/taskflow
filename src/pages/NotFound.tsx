import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-7xl font-bold text-gray-200 dark:text-slate-800 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Page not found</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-8">The page you're looking for doesn't exist or was moved.</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700">
            Go back
          </button>
          <button onClick={() => navigate('/')} className="px-4 py-2 text-sm font-medium text-white bg-[#16A34A] rounded-xl hover:bg-[#3d6b5e]">
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
