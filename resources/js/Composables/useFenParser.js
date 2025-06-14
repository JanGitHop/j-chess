/**
 * FEN-Parser Composable
 * Handles parsing and generating FEN (Forsyth-Edwards Notation) strings
 */

import { ref, computed } from 'vue'
import { INITIAL_FEN, PLAYER_COLORS, isEmpty } from '@/Utils/chessConstants.js'
import { cloneBoard } from '@/Utils/chessUtils.js'

export function useFenParser() {
    // Reactive state
    const currentFen = ref(INITIAL_FEN)
    const parseError = ref(null)

    /**
     * Parst einen FEN-String in seine Komponenten
     * @param {string} fenString - FEN-Notation
     * @returns {object} Parsed FEN components
     */
    const parseFen = (fenString = currentFen.value) => {
        try {
            parseError.value = null
            const parts = fenString.trim().split(' ')

            if (parts.length !== 6) {
                throw new Error('FEN muss 6 Teile haben')
            }

            const [position, activeColor, castling, enPassant, halfmove, fullmove] = parts

            return {
                position: parsePosition(position),
                activeColor: activeColor === 'w' ? PLAYER_COLORS.WHITE : PLAYER_COLORS.BLACK,
                castlingRights: parseCastlingRights(castling),
                enPassantSquare: enPassant === '-' ? null : enPassant,
                halfmoveClock: parseInt(halfmove) || 0,
                fullmoveNumber: parseInt(fullmove) || 1,
                originalFen: fenString
            }
        } catch (error) {
            parseError.value = error.message
            console.error('FEN Parse Error:', error)
            return null
        }
    }

    /**
     * Parst die Brett-Position aus dem FEN-String
     * @param {string} positionString - Erster Teil des FEN (z.B. "rnbqkbnr/pppppppp/...")
     * @returns {Array} 2D Array des Bretts [rank][file]
     */
    const parsePosition = (positionString) => {
        const ranks = positionString.split('/')

        if (ranks.length !== 8) {
            throw new Error('Brett muss 8 Reihen haben')
        }

        const board = []

        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            const rank = ranks[rankIndex]
            const row = []

            for (let i = 0; i < rank.length; i++) {
                const char = rank[i]

                if (/[1-8]/.test(char)) {
                    // Zahl = leere Felder
                    const emptySquares = parseInt(char)
                    for (let j = 0; j < emptySquares; j++) {
                        row.push(null)
                    }
                } else if (/[rnbqkpRNBQKP]/.test(char)) {
                    // Gültige Figur
                    row.push(char)
                } else {
                    throw new Error(`Ungültiges Zeichen in FEN: ${char}`)
                }
            }

            if (row.length !== 8) {
                throw new Error(`Reihe ${rankIndex + 1} hat ${row.length} Felder statt 8`)
            }

            board.push(row)
        }

        return board
    }

    /**
     * Parst Rochade-Rechte
     * @param {string} castlingString - z.B. "KQkq" oder "-"
     * @returns {object} Castling rights object
     */
    const parseCastlingRights = (castlingString) => {
        if (castlingString === '-') {
            return {
                whiteKingside: false,
                whiteQueenside: false,
                blackKingside: false,
                blackQueenside: false
            }
        }

        return {
            whiteKingside: castlingString.includes('K'),
            whiteQueenside: castlingString.includes('Q'),
            blackKingside: castlingString.includes('k'),
            blackQueenside: castlingString.includes('q')
        }
    }

    /**
     * Generiert FEN-String aus Brett-Position und Game-State
     * @param {Array} board - 2D Array des Bretts
     * @param {string} activeColor - 'white' oder 'black'
     * @param {object} castlingRights - Rochade-Rechte
     * @param {string|null} enPassantSquare - En passant Feld
     * @param {number} halfmoveClock - Halbzug-Zähler
     * @param {number} fullmoveNumber - Vollzug-Nummer
     * @returns {string} FEN-String
     */
    const generateFen = (
        board,
        activeColor = PLAYER_COLORS.WHITE,
        castlingRights = null,
        enPassantSquare = null,
        halfmoveClock = 0,
        fullmoveNumber = 1
    ) => {
        try {
            // Position generieren
            const positionPart = generatePositionString(board)

            // Aktiver Spieler
            const activeColorPart = activeColor === PLAYER_COLORS.WHITE ? 'w' : 'b'

            // Rochade-Rechte
            const castlingPart = generateCastlingString(castlingRights)

            // En passant
            const enPassantPart = enPassantSquare || '-'

            return `${positionPart} ${activeColorPart} ${castlingPart} ${enPassantPart} ${halfmoveClock} ${fullmoveNumber}`
        } catch (error) {
            console.error('FEN Generation Error:', error)
            return INITIAL_FEN
        }
    }

    /**
     * Generiert Position-String aus 2D Board Array
     * @param {Array} board - 2D Array
     * @returns {string} Position part of FEN
     */
    const generatePositionString = (board) => {
        const ranks = []

        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            const rank = board[rankIndex]
            let rankString = ''
            let emptyCount = 0

            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const piece = rank[fileIndex]

                if (isEmpty(piece)) {
                    emptyCount++
                } else {
                    if (emptyCount > 0) {
                        rankString += emptyCount.toString()
                        emptyCount = 0
                    }
                    rankString += piece
                }
            }

            // Verbleibende leere Felder am Ende der Reihe
            if (emptyCount > 0) {
                rankString += emptyCount.toString()
            }

            ranks.push(rankString)
        }

        return ranks.join('/')
    }

    /**
     * Generiert Rochade-String
     * @param {object|null} castlingRights
     * @returns {string}
     */
    const generateCastlingString = (castlingRights) => {
        if (!castlingRights) return 'KQkq' // Default: alle Rochaden möglich

        let castling = ''
        if (castlingRights.whiteKingside) castling += 'K'
        if (castlingRights.whiteQueenside) castling += 'Q'
        if (castlingRights.blackKingside) castling += 'k'
        if (castlingRights.blackQueenside) castling += 'q'

        return castling || '-'
    }

    // Computed Properties
    const parsedPosition = computed(() => {
        const parsed = parseFen()
        return parsed?.position ?? null
    })

    const activePlayer = computed(() => {
        const parsed = parseFen()
        return parsed ? parsed.activeColor : PLAYER_COLORS.WHITE
    })

    // Public API
    return {
        // State
        currentFen,
        parseError,

        // Computed
        parsedPosition,
        activePlayer,

        // Methods
        parseFen,
        generateFen,
        parsePosition,
        parseCastlingRights,

        // Utils
        setFen: (newFen) => {
            currentFen.value = newFen
        },

        resetToInitial: () => {
            currentFen.value = INITIAL_FEN
        }
    }
}
