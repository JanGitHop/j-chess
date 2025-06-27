/**
 * SAN (Standard Algebraic Notation) Generator
 * konvertiert Züge in die standardisierte Schachnotation
 */

import { ref } from 'vue'
import { PIECE_NAMES } from '@/Utils/chessConstants.js'

export function useSanGenerator() {

    /**
     * Generiert SAN-Notation für einen Zug
     *
     * @param {Object} moveData - Zug-Daten
     * @param {string} moveData.from - Ursprungsfeld (z.B. "e2")
     * @param {string} moveData.to - Zielfeld (z.B. "e4")
     * @param {string} moveData.piece - Figur die bewegt wird (FEN-Notation)
     * @param {string|null} moveData.capturedPiece - Geschlagene Figur
     * @param {string|null} moveData.promotion - Umwandlungsfigur
     * @param {boolean} moveData.isCheck - Schach nach dem Zug
     * @param {boolean} moveData.isCheckmate - Schachmatt nach dem Zug
     * @param {string} moveData.moveType - Art des Zuges ('normal', 'castle', 'enpassant', 'promotion')
     * @param {Array} board - Aktueller Brettstand (8x8 Array)
     * @param {Array} allLegalMoves - Alle legalen Züge für Mehrdeutigkeit
     *
     * @returns {string} SAN-Notation (z.B. "Nf3", "exd5", "O-O", "Qh5#")
     */
    const generateSAN = (moveData, board = null, allLegalMoves = []) => {
        try {
            const { from, to, piece, capturedPiece, promotion, isCheck, isCheckmate, moveType } = moveData

            if (moveType === 'castle') {
                return generateCastlingSAN(from, to)
            }

            const pieceSymbol = getPieceSymbol(piece)
            const isCapture = !!capturedPiece || moveType === 'enpassant'

            let san = ''

            // symbol (except for pawn)
            if (pieceSymbol !== '') {
                san += pieceSymbol
            }

            const disambiguation = resolveAmbiguity(moveData, board, allLegalMoves)
            san += disambiguation

            if (isCapture) {
                // In the event of a pawn capture: specify file of origin
                if (pieceSymbol === '' && !disambiguation) {
                    san += from[0] // Datei (a-h)
                }
                san += 'x'
            }

            san += to

            if (promotion) {
                san += '=' + getPieceSymbol(promotion)
            }

            if (isCheckmate) {
                san += '#'
            } else if (isCheck) {
                san += '+'
            }

            return san

        } catch (error) {
            console.error('Fehler bei SAN-Generierung:', error, moveData)
            return '?'
        }
    }

    const generateCastlingSAN = (from, to) => {
        const fromFile = from[0]
        const toFile = to[0]

        if ((fromFile === 'e' && toFile === 'g')) {
            return 'O-O'
        }

        if ((fromFile === 'e' && toFile === 'c')) {
            return 'O-O-O'
        }

        console.log('Warning: generated castling SAN Fallback')
        return 'O-O'
    }

    const getPieceSymbol = (piece) => {
        if (!piece) return ''

        const symbols = {
            'k': 'K', 'K': 'K',
            'q': 'Q', 'Q': 'Q',
            'r': 'R', 'R': 'R',
            'b': 'B', 'B': 'B',
            'n': 'N', 'N': 'N',
            'p': '',  'P': ''
        }

        return symbols[piece] || ''
    }

    /**
     * Dissolve ambiguity at the same pieces
     *
     * @param {Object} moveData
     * @param {Array} board
     * @param {Array} allLegalMoves
     * @returns {string} Disambiguation-String (z.B. "d", "2", "d2")
     */
    const resolveAmbiguity = (moveData, board, allLegalMoves) => {
        if (!board || !allLegalMoves || allLegalMoves.length === 0) {
            return ''
        }

        const { from, to, piece } = moveData

        // Find other pieces of the same type that can go to the target
        const ambiguousMoves = allLegalMoves.filter(move =>
            move.piece === piece &&     // Same piece
            move.to === to &&           // same target
            move.from !== from          // Unterschiedlicher Ursprung
        )

        if (ambiguousMoves.length === 0) {
            return '' // No ambiguity
        }

        const fromFile = from[0]    // a-h
        const fromRank = from[1]    // 1-8

        const sameFileAmbiguous = ambiguousMoves.some(move => move.from[0] === fromFile)
        const sameRankAmbiguous = ambiguousMoves.some(move => move.from[1] === fromRank)

        if (!sameFileAmbiguous) {
            return fromFile // Datei reicht zur Unterscheidung
        }

        if (!sameRankAmbiguous) {
            return fromRank // Reihe reicht zur Unterscheidung
        }

        return from
    }

    const generateSimpleSAN = (from, to, piece, isCapture = false, isCheck = false, isCheckmate = false) => {
        let san = ''

        const symbol = getPieceSymbol(piece)
        if (symbol) {
            san += symbol
        }

        if (isCapture) {
            if (!symbol) {
                san += from[0] // pawn-capture
            }
            san += 'x'
        }

        // target
        san += to

        if (isCheckmate) {
            san += '#'
        } else if (isCheck) {
            san += '+'
        }

        return san
    }

    /**
     * PGN-Notation aus Zügen generieren
     */
    const movesToPGN = (moves) => {
        let pgn = ''
        let moveNumber = 1

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i]

            // Zugnummer bei ungeraden Indices (weiße Züge)
            if (i % 2 === 0) {
                pgn += `${moveNumber}. `
            }

            // SAN-Notation hinzufügen
            pgn += move.san || '?'

            // Leerzeichen nach schwarzen Zügen
            if (i % 2 === 1) {
                pgn += ' '
                moveNumber++
            } else {
                pgn += ' '
            }
        }

        return pgn.trim()
    }

    /**
     * SAN-Notation validieren
     */
    const validateSAN = (san) => {
        if (!san || typeof san !== 'string') return false

        // Basis-Regex für SAN-Notation
        const sanRegex = /^([KQRBN])?([a-h]?[1-8]?)x?([a-h][1-8])(=[QRBN])?[\+#]?$|^O-O(-O)?[\+#]?$/

        return sanRegex.test(san)
    }

    return {
        generateSAN,
        generateSimpleSAN,
        generateCastlingSAN,
        getPieceSymbol,
        resolveAmbiguity,
        movesToPGN,
        validateSAN
    }
}
