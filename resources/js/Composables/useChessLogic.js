/**
 * Chess Logic Composable
 * Grundlegende Schachregeln und Zugvalidierung
 */

import { computed } from 'vue'
import {
    FILES,
    RANKS,
    PLAYER_COLORS,
    isWhitePiece,
    isBlackPiece,
    isEmpty,
    getPieceColor
} from '@/Utils/chessConstants.js'
import {
    squareToIndices,
    indicesToSquare,
    getSquareDistance,
    isOnSameDiagonal,
    isOnSameLine,
    getSquaresBetween,
    cloneBoard
} from '@/Utils/chessUtils.js'

export function useChessLogic() {

    // ===== BASIC PIECE MOVEMENT =====

    /**
     * Generiert alle möglichen Züge für eine Figur (ohne Check-Validierung)
     * @param {string} piece - FEN-Notation der Figur
     * @param {string} square - Ausgangsfeld
     * @param {Array} board - 2D Brett-Array
     * @param {object} gameState - Zusätzliche Spielinformationen
     * @returns {Array} Array von möglichen Zügen
     */
    const generatePossibleMoves = (piece, square, board, gameState = {}) => {
        if (isEmpty(piece) || !board.length) return []

        const pieceType = piece.toLowerCase()
        const pieceColor = getPieceColor(piece)

        switch (pieceType) {
            case 'p': return generatePawnMoves(piece, square, board, gameState)
            case 'r': return generateRookMoves(piece, square, board)
            case 'n': return generateKnightMoves(piece, square, board)
            case 'b': return generateBishopMoves(piece, square, board)
            case 'q': return generateQueenMoves(piece, square, board)
            case 'k': return generateKingMoves(piece, square, board, gameState)
            default: return []
        }
    }

    /**
     * Bauern-Züge generieren
     * @param {string} piece
     * @param {string} square
     * @param {Array} board
     * @param {object} gameState
     * @returns {Array}
     */
    const generatePawnMoves = (piece, square, board, gameState) => {
        const moves = []
        const isWhite = isWhitePiece(piece)
        const indices = squareToIndices(square)
        if (!indices) return moves

        const { fileIndex, rankIndex } = indices
        const direction = isWhite ? -1 : 1 // Weiß bewegt sich "nach oben" (niedrigere Rang-Indizes)
        const startRank = isWhite ? 6 : 1 // Startrang für Bauern

        // Ein Feld vorwärts
        const oneForward = { fileIndex, rankIndex: rankIndex + direction }
        if (isValidPosition(oneForward) && isEmpty(board[oneForward.rankIndex][oneForward.fileIndex])) {
            const targetSquare = indicesToSquare(oneForward.fileIndex, oneForward.rankIndex)
            if (targetSquare) {
                moves.push({
                    from: square,
                    to: targetSquare,
                    type: 'move',
                    piece,
                    promotion: isPromotionRank(oneForward.rankIndex, isWhite)
                })
            }

            // Zwei Felder vorwärts (nur vom Startrang)
            if (rankIndex === startRank) {
                const twoForward = { fileIndex, rankIndex: rankIndex + (direction * 2) }
                if (isValidPosition(twoForward) && isEmpty(board[twoForward.rankIndex][twoForward.fileIndex])) {
                    const targetSquare = indicesToSquare(twoForward.fileIndex, twoForward.rankIndex)
                    if (targetSquare) {
                        moves.push({
                            from: square,
                            to: targetSquare,
                            type: 'move',
                            piece
                        })
                    }
                }
            }
        }

        // Diagonal schlagen
        const captureOffsets = [-1, 1]
        captureOffsets.forEach(fileOffset => {
            const capturePos = {
                fileIndex: fileIndex + fileOffset,
                rankIndex: rankIndex + direction
            }

            if (isValidPosition(capturePos)) {
                const targetPiece = board[capturePos.rankIndex][capturePos.fileIndex]

                // Normale Eroberung
                if (!isEmpty(targetPiece) && getPieceColor(targetPiece) !== getPieceColor(piece)) {
                    const targetSquare = indicesToSquare(capturePos.fileIndex, capturePos.rankIndex)
                    if (targetSquare) {
                        moves.push({
                            from: square,
                            to: targetSquare,
                            type: 'capture',
                            piece,
                            capturedPiece: targetPiece,
                            promotion: isPromotionRank(capturePos.rankIndex, isWhite)
                        })
                    }
                }

                // En passant
                if (gameState.enPassantSquare) {
                    const enPassantIndices = squareToIndices(gameState.enPassantSquare)
                    if (enPassantIndices &&
                        enPassantIndices.fileIndex === capturePos.fileIndex &&
                        enPassantIndices.rankIndex === capturePos.rankIndex) {

                        moves.push({
                            from: square,
                            to: gameState.enPassantSquare,
                            type: 'enpassant',
                            piece,
                            capturedSquare: indicesToSquare(capturePos.fileIndex, rankIndex)
                        })
                    }
                }
            }
        })

        return moves
    }

    /**
     * Turm-Züge generieren
     * @param {string} piece
     * @param {string} square
     * @param {Array} board
     * @returns {Array}
     */
    const generateRookMoves = (piece, square, board) => {
        const moves = []
        const indices = squareToIndices(square)
        if (!indices) return moves

        // Horizontal und vertikal
        const directions = [
            { fileOffset: 0, rankOffset: 1 },   // Nach oben
            { fileOffset: 0, rankOffset: -1 },  // Nach unten
            { fileOffset: 1, rankOffset: 0 },   // Nach rechts
            { fileOffset: -1, rankOffset: 0 }   // Nach links
        ]

        directions.forEach(direction => {
            moves.push(...generateLinearMoves(piece, square, board, direction))
        })

        return moves
    }

    /**
     * Springer-Züge generieren
     * @param {string} piece
     * @param {string} square
     * @param {Array} board
     * @returns {Array}
     */
    const generateKnightMoves = (piece, square, board) => {
        const moves = []
        const indices = squareToIndices(square)
        if (!indices) return moves

        const { fileIndex, rankIndex } = indices

        // Alle 8 möglichen Springer-Züge
        const knightMoves = [
            { fileOffset: 2, rankOffset: 1 },
            { fileOffset: 2, rankOffset: -1 },
            { fileOffset: -2, rankOffset: 1 },
            { fileOffset: -2, rankOffset: -1 },
            { fileOffset: 1, rankOffset: 2 },
            { fileOffset: 1, rankOffset: -2 },
            { fileOffset: -1, rankOffset: 2 },
            { fileOffset: -1, rankOffset: -2 }
        ]

        knightMoves.forEach(offset => {
            const targetPos = {
                fileIndex: fileIndex + offset.fileOffset,
                rankIndex: rankIndex + offset.rankOffset
            }

            if (isValidPosition(targetPos)) {
                const targetPiece = board[targetPos.rankIndex][targetPos.fileIndex]
                const targetSquare = indicesToSquare(targetPos.fileIndex, targetPos.rankIndex)

                if (targetSquare) {
                    if (isEmpty(targetPiece)) {
                        moves.push({
                            from: square,
                            to: targetSquare,
                            type: 'move',
                            piece
                        })
                    } else if (getPieceColor(targetPiece) !== getPieceColor(piece)) {
                        moves.push({
                            from: square,
                            to: targetSquare,
                            type: 'capture',
                            piece,
                            capturedPiece: targetPiece
                        })
                    }
                }
            }
        })

        return moves
    }

    /**
     * Läufer-Züge generieren
     * @param {string} piece
     * @param {string} square
     * @param {Array} board
     * @returns {Array}
     */
    const generateBishopMoves = (piece, square, board) => {
        const moves = []

        // Diagonal in alle 4 Richtungen
        const directions = [
            { fileOffset: 1, rankOffset: 1 },   // Oben-rechts
            { fileOffset: 1, rankOffset: -1 },  // Unten-rechts
            { fileOffset: -1, rankOffset: 1 },  // Oben-links
            { fileOffset: -1, rankOffset: -1 }  // Unten-links
        ]

        directions.forEach(direction => {
            moves.push(...generateLinearMoves(piece, square, board, direction))
        })

        return moves
    }

    /**
     * Dame-Züge generieren (Turm + Läufer)
     * @param {string} piece
     * @param {string} square
     * @param {Array} board
     * @returns {Array}
     */
    const generateQueenMoves = (piece, square, board) => {
        return [
            ...generateRookMoves(piece, square, board),
            ...generateBishopMoves(piece, square, board)
        ]
    }

    /**
     * König-Züge generieren
     * @param {string} piece
     * @param {string} square
     * @param {Array} board
     * @param {object} gameState
     * @returns {Array}
     */
    const generateKingMoves = (piece, square, board, gameState) => {
        const moves = []
        const indices = squareToIndices(square)
        if (!indices) return moves

        const { fileIndex, rankIndex } = indices

        // Alle 8 angrenzenden Felder
        const kingMoves = [
            { fileOffset: 0, rankOffset: 1 },   // Oben
            { fileOffset: 0, rankOffset: -1 },  // Unten
            { fileOffset: 1, rankOffset: 0 },   // Rechts
            { fileOffset: -1, rankOffset: 0 },  // Links
            { fileOffset: 1, rankOffset: 1 },   // Oben-rechts
            { fileOffset: 1, rankOffset: -1 },  // Unten-rechts
            { fileOffset: -1, rankOffset: 1 },  // Oben-links
            { fileOffset: -1, rankOffset: -1 }  // Unten-links
        ]

        kingMoves.forEach(offset => {
            const targetPos = {
                fileIndex: fileIndex + offset.fileOffset,
                rankIndex: rankIndex + offset.rankOffset
            }

            if (isValidPosition(targetPos)) {
                const targetPiece = board[targetPos.rankIndex][targetPos.fileIndex]
                const targetSquare = indicesToSquare(targetPos.fileIndex, targetPos.rankIndex)

                if (targetSquare) {
                    if (isEmpty(targetPiece)) {
                        moves.push({
                            from: square,
                            to: targetSquare,
                            type: 'move',
                            piece
                        })
                    } else if (getPieceColor(targetPiece) !== getPieceColor(piece)) {
                        moves.push({
                            from: square,
                            to: targetSquare,
                            type: 'capture',
                            piece,
                            capturedPiece: targetPiece
                        })
                    }
                }
            }
        })

        // Rochade (vereinfacht - ohne Check-Prüfung)
        if (gameState.castlingRights) {
            moves.push(...generateCastlingMoves(piece, square, board, gameState.castlingRights))
        }

        return moves
    }

    // ===== HELPER FUNCTIONS =====

    /**
     * Lineare Züge generieren (für Turm, Läufer, Dame)
     * @param {string} piece
     * @param {string} square
     * @param {Array} board
     * @param {object} direction
     * @returns {Array}
     */
    const generateLinearMoves = (piece, square, board, direction) => {
        const moves = []
        const indices = squareToIndices(square)
        if (!indices) return moves

        let { fileIndex, rankIndex } = indices
        const { fileOffset, rankOffset } = direction

        // In die Richtung bewegen bis Hindernis oder Brett-Rand
        while (true) {
            fileIndex += fileOffset
            rankIndex += rankOffset

            const targetPos = { fileIndex, rankIndex }
            if (!isValidPosition(targetPos)) break

            const targetPiece = board[rankIndex][fileIndex]
            const targetSquare = indicesToSquare(fileIndex, rankIndex)

            if (!targetSquare) break

            if (isEmpty(targetPiece)) {
                // Freies Feld - Zug möglich
                moves.push({
                    from: square,
                    to: targetSquare,
                    type: 'move',
                    piece
                })
            } else {
                // Figur auf dem Feld
                if (getPieceColor(targetPiece) !== getPieceColor(piece)) {
                    // Gegnerische Figur - kann geschlagen werden
                    moves.push({
                        from: square,
                        to: targetSquare,
                        type: 'capture',
                        piece,
                        capturedPiece: targetPiece
                    })
                }
                // Eigene oder gegnerische Figur blockiert weiteren Weg
                break
            }
        }

        return moves
    }

    /**
     * Rochade-Züge generieren (vereinfacht)
     * @param {string} piece
     * @param {string} square
     * @param {Array} board
     * @param {object} castlingRights
     * @returns {Array}
     */
    const generateCastlingMoves = (piece, square, board, castlingRights) => {
        const moves = []
        const isWhite = isWhitePiece(piece)

        // Kurze Rochade
        if ((isWhite && castlingRights.whiteKingside) ||
            (!isWhite && castlingRights.blackKingside)) {

            const kingsideTarget = isWhite ? 'g1' : 'g8'
            const pathSquares = isWhite ? ['f1', 'g1'] : ['f8', 'g8']

            if (isCastlingPathClear(pathSquares, board)) {
                moves.push({
                    from: square,
                    to: kingsideTarget,
                    type: 'castle',
                    piece,
                    castleType: 'kingside'
                })
            }
        }

        // Lange Rochade
        if ((isWhite && castlingRights.whiteQueenside) ||
            (!isWhite && castlingRights.blackQueenside)) {

            const queensideTarget = isWhite ? 'c1' : 'c8'
            const pathSquares = isWhite ? ['d1', 'c1', 'b1'] : ['d8', 'c8', 'b8']

            if (isCastlingPathClear(pathSquares, board)) {
                moves.push({
                    from: square,
                    to: queensideTarget,
                    type: 'castle',
                    piece,
                    castleType: 'queenside'
                })
            }
        }

        return moves
    }

    /**
     * Prüft ob der Rochade-Weg frei ist
     * @param {Array} squares
     * @param {Array} board
     * @returns {boolean}
     */
    const isCastlingPathClear = (squares, board) => {
        return squares.every(square => {
            const indices = squareToIndices(square)
            return indices && isEmpty(board[indices.rankIndex][indices.fileIndex])
        })
    }

    /**
     * Position-Validierung
     * @param {object} position
     * @returns {boolean}
     */
    const isValidPosition = (position) => {
        return position.fileIndex >= 0 && position.fileIndex < 8 &&
            position.rankIndex >= 0 && position.rankIndex < 8
    }

    /**
     * Prüft ob ein Rang ein Bauern-Promotion-Rang ist
     * @param {number} rankIndex
     * @param {boolean} isWhite
     * @returns {boolean}
     */
    const isPromotionRank = (rankIndex, isWhite) => {
        return (isWhite && rankIndex === 0) || (!isWhite && rankIndex === 7)
    }

    // ===== VALIDATION FUNCTIONS =====

    /**
     * Prüft ob ein Zug legal ist (mit allen Regeln)
     * @param {string} from
     * @param {string} to
     * @param {Array} board
     * @param {object} gameState
     * @returns {boolean}
     */
    const isLegalMove = (from, to, board, gameState = {}) => {
        if (!from || !to || from === to) return false

        const fromIndices = squareToIndices(from)
        const toIndices = squareToIndices(to)
        if (!fromIndices || !toIndices) return false

        const piece = board[fromIndices.rankIndex][fromIndices.fileIndex]
        if (isEmpty(piece)) return false

        // Grundlegende Zugvalidierung
        const possibleMoves = generatePossibleMoves(piece, from, board, gameState)
        const moveExists = possibleMoves.some(move => move.to === to)

        if (!moveExists) return false

        // Check-Validierung (vereinfacht - TODO: Implementieren)
        // const wouldBeInCheck = wouldMoveResultInCheck(from, to, board, gameState)
        // if (wouldBeInCheck) return false

        return true
    }

    /**
     * Findet alle legalen Züge für eine Farbe
     * @param {string} color
     * @param {Array} board
     * @param {object} gameState
     * @returns {Array}
     */
    const getAllLegalMoves = (color, board, gameState = {}) => {
        const allMoves = []

        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const piece = board[rankIndex][fileIndex]

                if (!isEmpty(piece) && getPieceColor(piece) === color) {
                    const square = indicesToSquare(fileIndex, rankIndex)
                    if (square) {
                        const pieceMoves = generatePossibleMoves(piece, square, board, gameState)

                        // Nur legale Züge hinzufügen
                        const legalMoves = pieceMoves.filter(move =>
                            isLegalMove(move.from, move.to, board, gameState)
                        )

                        allMoves.push(...legalMoves)
                    }
                }
            }
        }

        return allMoves
    }

    // ===== PUBLIC API =====
    return {
        // Move Generation
        generatePossibleMoves,
        generatePawnMoves,
        generateRookMoves,
        generateKnightMoves,
        generateBishopMoves,
        generateQueenMoves,
        generateKingMoves,

        // Validation
        isLegalMove,
        getAllLegalMoves,

        // Utilities
        isValidPosition,
        isPromotionRank,
        isCastlingPathClear
    }
}
