// src/pages/HomePage.tsx
import { useAuthStore } from '../stores/authStore';

export const HomePage = () => {
  const { user, logout } = useAuthStore();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome to the Home Page</h1>
      {user && (
        <div>
          <p>Hello, {user.name}!</p>
          <p>Email: {user.email}</p>
          <button
            onClick={logout}
            style={{
              padding: '10px 15px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
