<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->integer('rating')->default(1200)->after('email_verified_at');
            $table->integer('games_played')->default(0)->after('rating');
            $table->integer('games_won')->default(0)->after('games_played');
            $table->integer('games_lost')->default(0)->after('games_won');
            $table->integer('games_drawn')->default(0)->after('games_lost');
            $table->timestamp('last_active')->nullable()->after('games_drawn');
            $table->boolean('is_online')->default(false)->after('last_active');
            $table->string('preferred_color')->default('white')->after('is_online'); // 'white', 'black', 'random'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'rating',
                'games_played',
                'games_won',
                'games_lost',
                'games_drawn',
                'last_active',
                'is_online',
                'preferred_color'
            ]);
        });
    }
};
