<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Display the registration form
     */
    public function showRegister(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle user registration
     */
    public function register(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'preferred_color' => 'nullable|in:white,black,random'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'preferred_color' => $request->preferred_color ?? 'random',
            'rating' => 1200,
            'is_online' => true,
            'last_active' => now()
        ]);

        Auth::login($user);

        return redirect()->route('dashboard')->with('success', 'Registrierung erfolgreich!');
    }

    /**
     * Display the login form
     */
    public function showLogin(): Response
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * Handle user login
     */
    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'remember' => 'boolean'
        ]);

        $remember = $request->boolean('remember');

        if (!Auth::attempt(['email' => $credentials['email'], 'password' => $credentials['password']], $remember)) {
            throw ValidationException::withMessages([
                'email' => 'Die angegebenen Anmeldedaten sind ungültig.',
            ]);
        }

        $request->session()->regenerate();

        // Update online status
        Auth::user()->updateOnlineStatus(true);

        return redirect()->intended(route('dashboard'))->with('success', 'Erfolgreich angemeldet!');
    }

    /**
     * Handle user logout
     */
    public function logout(Request $request): RedirectResponse
    {
        // Update online status before logout
        if (Auth::check()) {
            Auth::user()->updateOnlineStatus(false);
        }

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/')->with('success', 'Erfolgreich abgemeldet!');
    }

    /**
     * Get authenticated user data
     */
    public function user(Request $request): \Illuminate\Http\JsonResponse
    {
        if (!Auth::check()) {
            return response()->json(['user' => null]);
        }

        /** @var User $user */
        $user = Auth::user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'rating' => $user->rating,
                'games_played' => $user->games_played,
                'games_won' => $user->games_won,
                'games_lost' => $user->games_lost,
                'games_drawn' => $user->games_drawn,
                'win_rate' => $user->win_rate,
                'preferred_color' => $user->preferred_color,
                'is_online' => $user->is_online,
                'last_active' => $user->last_active?->diffForHumans(),
                'email_verified_at' => $user->email_verified_at
            ]
        ]);
    }

    /**
     * Display user profile
     */
    public function profile(): Response
    {
        return Inertia::render('Profile/Show', [
            'user' => Auth::user()
        ]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:users,name,' . $user->id,
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'preferred_color' => 'required|in:white,black,random'
        ]);

        $user->update($validated);

        return redirect()->route('profile')->with('success', 'Profil erfolgreich aktualisiert!');
    }
}
