import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signInWithCredential, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private auth: Auth) {
    onAuthStateChanged(this.auth, (user) => {
      this.userSubject.next(user);
    });
  }

  get currentUser(): User | null {
    return this.userSubject.getValue();
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  async signInWithGoogle(): Promise<User> {
    if (Capacitor.isNativePlatform()) {
      // Native Android/iOS: use Capacitor Google Auth plugin
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      await GoogleAuth.initialize({
        clientId: '608614212478-1luvpn5n7li82mjc4vb5k1dtjdu7k6nd.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true
      });
      const googleUser = await GoogleAuth.signIn();
      // Use the ID token to sign in to Firebase
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      const result = await signInWithCredential(this.auth, credential);
      return result.user;
    } else {
      // Web: use popup
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      const result = await signInWithPopup(this.auth, provider);
      return result.user;
    }
  }

  async signOutUser(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.signOut();
      } catch (e) {}
    }
    await signOut(this.auth);
  }
}
