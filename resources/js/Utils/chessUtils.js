/**
 * Chess-Utility-Funktionen
 * Helper-Funktionen für Schachlogik und Board-Operationen
 */

import {
    FILES,
    RANKS,
    FILE_TO_INDEX,
    RANK_TO_INDEX,
    isWhitePiece,
    isBlackPiece,
    isEmpty,
    PLAYER_COLORS
} from './chessConstants.js'

/**
 * Konvertiert eine Schach-Koordinate in Array-Indizes
 * @param {string} square - z.B. "e4"
 * @returns {object|null} {fileIndex, rankIndex} oder null
 */
export const squareToIndices = (square) => {
    if (typeof square !== 'string' || square.length !== 2) return null

    const file = square[0]
    const rank = parseInt(square[1])

    const fileIndex = FILE_TO_INDEX[file]
    const rankIndex = RANK_TO_INDEX[rank]

    return (fileIndex !== undefined && rankIndex !== undefined)
        ? { fileIndex, rankIndex }
        : null
}

/**
 * Konvertiert Array-Indizes in Schach-Koordinate
 * @param {number} fileIndex - 0-7
 * @param {number} rankIndex - 0-7
 * @returns {string|null} z.B. "e4" oder null
 */
export const indicesToSquare = (fileIndex, rankIndex) => {
    const file = FILES[fileIndex]
    const rank = RANKS[rankIndex]

    return (file && rank) ? `${file}${rank}` : null
}

/**
 * Berechnet die Distanz zwischen zwei Feldern
 * @param {string} from - Startfeld z.B. "e2"
 * @param {string} to - Zielfeld z.B. "e4"
 * @returns {object|null} {fileDistance, rankDistance, totalDistance}
 */
export const getSquareDistance = (from, to) => {
    const fromIndices = squareToIndices(from)
    const toIndices = squareToIndices(to)

    if (!fromIndices || !toIndices) return null

    const fileDistance = Math.abs(toIndices.fileIndex - fromIndices.fileIndex)
    const rankDistance = Math.abs(toIndices.rankIndex - fromIndices.rankIndex)
    const totalDistance = Math.max(fileDistance, rankDistance)

    return { fileDistance, rankDistance, totalDistance }
}

/**
 * Prüft ob zwei Felder auf derselben Diagonale liegen
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export const isOnSameDiagonal = (from, to) => {
    const distance = getSquareDistance(from, to)
    return distance ? distance.fileDistance === distance.rankDistance : false
}

/**
 * Prüft ob zwei Felder auf derselben Linie liegen (horizontal/vertikal)
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export const isOnSameLine = (from, to) => {
    const distance = getSquareDistance(from, to)
    return distance ? (distance.fileDistance === 0 || distance.rankDistance === 0) : false
}

/**
 * Generiert alle Felder zwischen zwei Feldern (exklusive Start/Ende)
 * @param {string} from
 * @param {string} to
 * @returns {string[]} Array von Feldern zwischen from und to
 */
export const getSquaresBetween = (from, to) => {
    const fromIndices = squareToIndices(from)
    const toIndices = squareToIndices(to)

    if (!fromIndices || !toIndices || from === to) return []

    const fileStep = Math.sign(toIndices.fileIndex - fromIndices.fileIndex)
    const rankStep = Math.sign(toIndices.rankIndex - fromIndices.rankIndex)

    const squares = []
    let currentFile = fromIndices.fileIndex + fileStep
    let currentRank = fromIndices.rankIndex + rankStep

    while (currentFile !== toIndices.fileIndex || currentRank !== toIndices.rankIndex) {
        const square = indicesToSquare(currentFile, currentRank)
        if (square) squares.push(square)

        currentFile += fileStep
        currentRank += rankStep
    }

    return squares
}

/**
 * Hilfsfunktion für Farb-Logik
 * @param {string} piece
 * @returns {string} 'white' oder 'black'
 */
export const getPieceColor = (piece) => {
    if (isEmpty(piece)) return null
    return isWhitePiece(piece) ? PLAYER_COLORS.WHITE : PLAYER_COLORS.BLACK
}

/**
 * Prüft ob eine Figur dem aktuellen Spieler gehört
 * @param {string} piece
 * @param {string} currentPlayer - 'white' oder 'black'
 * @returns {boolean}
 */
export const isPieceOwnedByPlayer = (piece, currentPlayer) => {
    const pieceColor = getPieceColor(piece)
    return pieceColor === currentPlayer
}

/**
 * Validiert ein Schachfeld-Format
 * @param {string} square
 * @returns {boolean}
 */
export const isValidSquareFormat = (square) => {
    if (typeof square !== 'string' || square.length !== 2) return false

    const file = square[0]
    const rank = square[1]

    return FILES.includes(file) && /^[1-8]$/.test(rank)
}

/**
 * Erstellt eine Kopie einer 2D-Array-Position (für Board-State)
 * @param {Array} board - 2D Array
 * @returns {Array} Deep copy
 */
export const cloneBoard = (board) => {
    return board.map(row => [...row])
}

/**
 * Debugging-Hilfsfunktion: Zeigt Board in der Konsole an
 * @param {Array} board - 2D Array des Boards
 */
export const printBoard = (board) => {
    console.log('\n  a b c d e f g h')
    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
        const rank = RANKS[rankIndex]
        const row = board[rankIndex]
        const rowString = row.map(piece => piece || '.').join(' ')
        console.log(`${rank} ${rowString}`)
    }
    console.log()
}
