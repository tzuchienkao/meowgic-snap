export const useAuth = () => {
  const user = useState('user', () => null);
  const isAuthenticated = computed(() => !!user.value);

  const setUser = (value: any) => {
    user.value = value;
  };

  const logout = () => {
    user.value = null;
  };

  const initAuth = async() => {
    if (process.env.NODE_ENV === 'development') {
      user.value = {
        id: '1',
        email: 'demo@meowgic.com',
        name: '喵奴才'
      };
    } else {
        if (import.meta.client) {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            user.value = JSON.parse(savedUser);
        }
        }
    }
  }

  return {
    user,
    isAuthenticated,
    setUser,
    logout,
    initAuth
  };
};