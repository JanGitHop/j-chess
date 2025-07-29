<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Dashboard');
});

Route::get('/chess', function () {
    return Inertia::render('Chess/Game');
});

// Guest routes (only for unauthenticated users)
Route::middleware('guest')->group(function () {
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);

    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});

// Authenticated routes
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/user', [AuthController::class, 'user'])->name('user');

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::get('/profile', [AuthController::class, 'profile'])->name('profile');
    Route::patch('/profile', [AuthController::class, 'updateProfile'])->name('profile.update');
});

// Verified email routes
Route::middleware(['auth', 'verified'])->group(function () {
    // Game routes will go here in Phase 2
});

// TEMPORÄR - Login ohne Guest-Middleware zum Testen
Route::get('/test-login', [AuthController::class, 'showLogin'])->name('test.login');

// TEMPORÄR - Debug Route hinzufügen
Route::get('/debug-middleware', function () {
    return response()->json([
        'auth_check' => Auth::check(),
        'auth_user' => Auth::user(),
        'session_data' => session()->all(),
        'request_user' => request()->user(),
        'middleware_should_allow_guest' => !Auth::check()
    ]);
});

// NOTFALL LOGOUT - ganz oben hinzufügen
Route::get('/force-logout', function () {
    Auth::logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();
    return redirect('/')->with('success', 'Ausgeloggt!');
})->name('force.logout');
