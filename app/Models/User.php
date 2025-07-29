<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'rating',
        'games_played',
        'games_won',
        'games_lost',
        'games_drawn',
        'preferred_color',
        'is_online',
        'last_active'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_active' => 'datetime',
            'is_online' => 'boolean',
            'rating' => 'integer',
            'games_played' => 'integer',
            'games_won' => 'integer',
            'games_lost' => 'integer',
            'games_drawn' => 'integer',
        ];
    }

    /**
     * Calculate win rate percentage
     */
    public function getWinRateAttribute(): float
    {
        if ($this->games_played === 0) {
            return 0.0;
        }

        return round(($this->games_won / $this->games_played) * 100, 1);
    }

    /**
     * Get user's games as white player
     */
    public function whiteGames()
    {
        return $this->hasMany(Game::class, 'white_player_id');
    }

    /**
     * Get user's games as black player
     */
    public function blackGames()
    {
        return $this->hasMany(Game::class, 'black_player_id');
    }

    /**
     * Get all user's games
     */
    public function games()
    {
        return Game::where('white_player_id', $this->id)
            ->orWhere('black_player_id', $this->id);
    }

    /**
     * Update user's online status
     */
    public function updateOnlineStatus(bool $isOnline = true): void
    {
        $this->update([
            'is_online' => $isOnline,
            'last_active' => now()
        ]);
    }

    /**
     * Update game statistics after a game
     */
    public function updateGameStats(string $result): void
    {
        $this->increment('games_played');

        match($result) {
            'win' => $this->increment('games_won'),
            'loss' => $this->increment('games_lost'),
            'draw' => $this->increment('games_drawn'),
            default => null
        };
    }
}
