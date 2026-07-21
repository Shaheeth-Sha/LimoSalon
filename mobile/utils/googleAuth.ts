import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Call this once, as early as possible (root layout), before any
// GoogleSignin.signIn() call is made anywhere in the app.
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '434982883259-mh0qlfkb0q3hkl5l753sjn8ecslodu27.apps.googleusercontent.com',
    offlineAccess: false,
  });
};

// Returns the Google ID token on success, or throws with a message
// suitable for showing directly in your alert modal.
export const signInWithGoogle = async (): Promise<string> => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    // v13+ of this library wraps the payload in `data`
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token returned from Google');
    }

    return idToken;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Sign-in was cancelled');
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign-in already in progress');
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services not available on this device');
    }
    throw new Error(error.message || 'Google sign-in failed');
  }
};