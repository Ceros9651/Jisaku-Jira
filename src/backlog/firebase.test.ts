import { firebaseConfigFromEnv } from './firebase';

const env = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'example',
  VITE_FIREBASE_APP_ID: '1:2:web:3',
};

test('4つ揃っていれば設定を返す', () => {
  expect(firebaseConfigFromEnv(env)).toEqual({
    apiKey: 'key',
    authDomain: 'example.firebaseapp.com',
    projectId: 'example',
    appId: '1:2:web:3',
  });
});

test('欠けている、または空なら null', () => {
  expect(firebaseConfigFromEnv({ ...env, VITE_FIREBASE_PROJECT_ID: undefined })).toBeNull();
  expect(firebaseConfigFromEnv({ ...env, VITE_FIREBASE_APP_ID: ' ' })).toBeNull();
  expect(firebaseConfigFromEnv({})).toBeNull();
});
