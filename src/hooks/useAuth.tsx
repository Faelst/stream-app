import { makeRedirectUri, revokeAsync, startAsync } from 'expo-auth-session';
import React, {
  useEffect,
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
import { generateRandom } from 'expo-auth-session/build/PKCE';

import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ASYNC_STORAGE_KEY = '@stream_app:auth';

interface User {
  id: number;
  display_name: string;
  email: string;
  profile_image_url: string;
}

interface AuthContextData {
  user: User;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderData {
  children: ReactNode;
}

const AuthContext = createContext({} as AuthContextData);

const twitchEndpoints = {
  authorization: 'https://id.twitch.tv/oauth2/authorize',
  revocation: 'https://id.twitch.tv/oauth2/revoke',
};

function AuthProvider({ children }: AuthProviderData) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState({} as User);
  const [userToken, setUserToken] = useState('');

  async function signIn() {
    try {
      setIsLoggingIn(true);

      const CLIENT_ID = '';
      const REDIRECT_URI = makeRedirectUri({ useProxy: true });
      const RESPONSE_TYPE = 'token';
      const SCOPE = encodeURI('openid user:read:email user:read:follows');
      const FORCE_VERIFY = true;
      const STATE = generateRandom(30);

      const authUrl =
        twitchEndpoints.authorization +
        `?client_id=${CLIENT_ID}` +
        `&redirect_uri=${REDIRECT_URI}` +
        `&response_type=${RESPONSE_TYPE}` +
        `&scope=${SCOPE}` +
        `&force_verify=${FORCE_VERIFY}` +
        `&state=${STATE}`;

      const auth = await startAsync({ authUrl });

      if (auth?.type !== 'success') {
        throw new Error('Erro ao efetuar login');
      }

      if (auth.params.state !== STATE) {
        throw new Error('Estado Invalido');
      }

      api.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${auth.params.access_token}`;

      const response = await api.get('/users');

      setUserToken(auth.params.access_token);
      setUser(response.data.data[0]);

      AsyncStorage.setItem(
        ASYNC_STORAGE_KEY,
        JSON.stringify({
          user: response.data.data[0],
          userToken: auth.params.access_token,
        })
      );
    } catch (error) {
      await clearAuth();
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function clearAuth() {
    AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
    setUser({} as User);
    delete api.defaults.headers.common['Authorization'];
  }

  async function signOut() {
    try {
      setIsLoggingOut(true);
      await clearAuth();
    } catch (error) {
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function loadingAuthStorage() {
    const stringData = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);

    if (!stringData) {
      return;
    }

    const userStorage = JSON.parse(stringData as string);

    api.defaults.headers.common[
      'Authorization'
    ] = `Bearer ${userStorage.userToken}`;

    setUserToken(userStorage.userToken);
    setUser(userStorage.user);
  }

  useEffect(() => {
    loadingAuthStorage();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoggingOut, isLoggingIn, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export { AuthProvider, useAuth };
