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
    getPieceColor,
    FIFTY_MOVE_RULE,
    THREEFOLD_REPETITION,
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
     * Generiert alle legalen Züge für einen Spieler
     * @param {Array} board - 2D Brett-Array
     * @param {string} playerColor - 'white' oder 'black'
     * @param {object} gameState - Spielzustand
     * @returns {Array} Array von legalen Zügen
     */
    const generateLegalMoves = (board, playerColor, gameState = {}) => {
        const legalMoves = []

        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const piece = board[rankIndex][fileIndex]

                if (isEmpty(piece) || getPieceColor(piece) !== playerColor) {
                    continue
                }

                const fromSquare = indicesToSquare(fileIndex, rankIndex)
                if (!fromSquare) continue

                const possibleMoves = generatePossibleMoves(piece, fromSquare, board, gameState)

                // Nur legale Züge hinzufügen (König nicht im Schach)
                possibleMoves.forEach(move => {
                    if (isMoveLegal(board, fromSquare, move.to, playerColor, gameState)) {
                        legalMoves.push(move)
                    }
                })
            }
        }

        return legalMoves
    }

    /**
     * Generiert alle möglichen Züge für eine Figur (ohne Check-Validierung)
     * @param {string} piece - FEN-Notation der Figur
     * @param {string} square - Ausgangsfeld
     * @param {Array} board - 2D Brett-Array
     * @param {object} gameState - Zusätzliche Spielinformationen
     * @returns {Array} Array von möglichen Zügen
     */
    const generatePossibleMoves = (piece, square, board, gameState = {}, context = {}) => {
        if (isEmpty(piece) || !board.length) return []

        const pieceType = piece.toLowerCase()

        switch (pieceType) {
            case 'p': return generatePawnMoves(piece, square, board, gameState)
            case 'r': return generateRookMoves(piece, square, board)
            case 'n': return generateKnightMoves(piece, square, board)
            case 'b': return generateBishopMoves(piece, square, board)
            case 'q': return generateQueenMoves(piece, square, board)
            case 'k': return generateKingMoves(piece, square, board, gameState, context)
            default: return []
        }
    }

    /**
     * Legale Züge für ein spezifisches Feld generieren (für UI)
     * @param {string} square - z.B. "e4"
     * @param {Array} board - 2D Brett-Array
     * @param {string} playerColor - Aktueller Spieler
     * @param {object} gameState - Spielzustand
     * @returns {Array} Array von Ziel-Feldern als Strings
     */
    const generateLegalMovesForSquare = (square, board, playerColor, gameState = {}) => {
        if (!board.length) return []

        const indices = squareToIndices(square)
        if (!indices) return []

        const piece = board[indices.rankIndex][indices.fileIndex]

        if (isEmpty(piece) || getPieceColor(piece) !== playerColor) {
            return []
        }

        const possibleMoves = generatePossibleMoves(piece, square, board, gameState)

        const legalMoves = possibleMoves.filter(move =>
            isMoveLegal(board, square, move.to, playerColor, gameState)
        )

        // UI: Nur Ziel-Felder als Strings
        return legalMoves.map(move => move.to)
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
        const direction = isWhite ? -1 : 1
        const startRank = isWhite ? 6 : 1

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

        // Diagonal capture
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
            }
        })

        if (gameState.enPassantSquare) {
            const enPassantIndices = squareToIndices(gameState.enPassantSquare)
            if (!enPassantIndices) return moves

            // Check, ob das En-Passant-Feld diagonal erreichbar ist
            const fileDistance = Math.abs(enPassantIndices.fileIndex - fileIndex)
            const rankDistance = enPassantIndices.rankIndex - rankIndex

            if (fileDistance === 1 && rankDistance === direction) {
                // FEN garantiert bereits dass En-Passant legal ist
                // Nur noch die geschlagene Figur bestimmen
                const capturedFileIndex = enPassantIndices.fileIndex
                const capturedRankIndex = rankIndex
                const capturedPiece = board[capturedRankIndex]?.[capturedFileIndex]

                moves.push({
                    from: square,
                    to: gameState.enPassantSquare,
                    type: 'enpassant',
                    piece,
                    capturedPiece, // Der geschlagene Bauer
                    capturedSquare: indicesToSquare(capturedFileIndex, capturedRankIndex)
                })
            }
        }

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
     * König-Züge generieren (KORRIGIERT mit gameState)
     * @param {string} piece
     * @param {string} square
     * @param {Array} board
     * @param {object} gameState
     * @returns {Array}
     */
    const generateKingMoves = (piece, square, board, gameState = {}, context = {}) => {
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

        if (!context.skipCastling && gameState.castlingRights && gameState.currentPlayer) {
            moves.push(...generateCastlingMoves(
                piece,
                square,
                board,
                gameState.castlingRights,
                gameState.currentPlayer,
                gameState
            ))
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
     * Rochade-Züge generieren
     * @param {string} piece - König ('K' oder 'k')
     * @param {string} square - Königsposition (z.B. 'e1' oder 'e8')
     * @param {Array} board - 2D Brett-Array
     * @param {object} castlingRights - Rochade-Rechte als Objekt
     * @param {string} currentPlayer - Aktueller Spieler ('white' oder 'black')
     * @param {object} gameState - Vollständiger Spielzustand
     * @returns {Array} Array von gültigen Rochade-Zügen
     */
    const generateCastlingMoves = (piece, square, board, castlingRights, currentPlayer, gameState = {}) => {
        const moves = []

        if (!castlingRights) {
            return moves
        }

        const isWhite = isWhitePiece(piece)
        const pieceColor = isWhite ? 'white' : 'black'

        // Validierung: König muss auf Startposition stehen
        const expectedKingSquare = isWhite ? 'e1' : 'e8'
        if (square !== expectedKingSquare) {
            return moves
        }

        const oppositePlayer = pieceColor === 'white' ? 'black' : 'white'
        const attackersOnKing = getAttackingPieces(square, oppositePlayer, board, gameState, { skipCastling: true })

        if (attackersOnKing.length > 0) {
            console.log('🚫 Rochade nicht möglich: König steht im Schach')
            return moves
        }

        // Kurze Rochade (Königsseite)
        const canCastleKingside = isWhite ? castlingRights.whiteKingside : castlingRights.blackKingside
        if (canCastleKingside) {
            const kingsideTarget = isWhite ? 'g1' : 'g8'
            const pathSquares = isWhite ? ['f1', 'g1'] : ['f8', 'g8'] // Alle Felder die der König durchläuft
            const rookSquare = isWhite ? 'h1' : 'h8'
            const expectedRook = isWhite ? 'R' : 'r'

            if (isCastlingPathClear(pathSquares, board) &&
                hasPieceOnSquare(board, rookSquare, expectedRook) &&
                isCastlingPathSafe(pathSquares, board, oppositePlayer, gameState)) {

                moves.push({
                    from: square,
                    to: kingsideTarget,
                    type: 'castle',
                    piece,
                    castleType: 'kingside',
                    rookMove: {
                        from: rookSquare,
                        to: isWhite ? 'f1' : 'f8'
                    }
                })
            }
        }

        // Lange Rochade (Damenseite)
        const canCastleQueenside = isWhite ? castlingRights.whiteQueenside : castlingRights.blackQueenside
        if (canCastleQueenside) {
            const queensideTarget = isWhite ? 'c1' : 'c8'
            const pathSquares = isWhite ? ['d1', 'c1'] : ['d8', 'c8']
            const rookSquare = isWhite ? 'a1' : 'a8'
            const expectedRook = isWhite ? 'R' : 'r'

            // Für Damenseite: b1/b8 muss auch frei sein (Turm-Weg), aber König geht nicht drüber
            const fullPathSquares = isWhite ? ['d1', 'c1', 'b1'] : ['d8', 'c8', 'b8']

            if (isCastlingPathClear(fullPathSquares, board) &&
                hasPieceOnSquare(board, rookSquare, expectedRook) &&
                isCastlingPathSafe(pathSquares, board, oppositePlayer, gameState)) {

                moves.push({
                    from: square,
                    to: queensideTarget,
                    type: 'castle',
                    piece,
                    castleType: 'queenside',
                    rookMove: {
                        from: rookSquare,
                        to: isWhite ? 'd1' : 'd8'
                    }
                })
            }
        }

        return moves
    }

    /**
     * Prüft, ob Rochade-Weg sicher ist
     * @param {Array} pathSquares - Felder, die der König durchläuft/erreicht
     * @param {Array} board - 2D Brett-Array
     * @param {string} attackingPlayer - Angreifende Farbe ('white' oder 'black')
     * @param {object} gameState - Spielzustand für getAttackingPieces
     * @returns {boolean} True wenn Weg sicher ist
     */
    const isCastlingPathSafe = (pathSquares, board, attackingPlayer, gameState) => {
        for (const square of pathSquares) {
            const attackers = getAttackingPieces(square, attackingPlayer, board, gameState, { skipCastling: true })
            if (attackers.length > 0) {
                console.log(`🚫 Rochade nicht möglich: Feld ${square} wird von ${attackers.join(', ')} angegriffen`)
                return false
            }
        }
        return true
    }

    /**
     * Prüft, ob Rochade-Weg frei ist (keine eigenen Figuren)
     * @param {Array} pathSquares - Felder die frei sein müssen
     * @param {Array} board - 2D Brett-Array
     * @returns {boolean} True wenn Weg frei ist
     */
    const isCastlingPathClear = (pathSquares, board) => {
        for (const square of pathSquares) {
            const indices = squareToIndices(square)
            if (!indices) return false

            const piece = board[indices.rankIndex][indices.fileIndex]
            if (!isEmpty(piece)) {
                return false
            }
        }
        return true
    }

    /**
     * Prüft, ob ein Feld unter Angriff steht
     * @param {Array} board - 2D Brett-Array
     * @param {string} square - Zu prüfendes Feld (z.B. 'e1')
     * @param {string} attackingPlayer - Angreifende Farbe ('white' oder 'black')
     * @returns {boolean} True wenn Feld angegriffen wird
     */
    const isSquareUnderAttack = (board, square, attackingPlayer) => {
        // Alle Figuren des angreifenden Spielers durchgehen
        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const piece = board[rankIndex][fileIndex]

                if (isEmpty(piece)) continue

                // Nur Figuren des angreifenden Spielers prüfen
                const pieceColor = getPieceColor(piece)
                if (pieceColor !== attackingPlayer) continue

                const pieceSquare = indicesToSquare(fileIndex, rankIndex)
                if (!pieceSquare) continue

                // Einfache Angriffsprüfung für diese Figur
                const attacks = generatePieceAttacks(piece, pieceSquare, board)

                if (attacks.includes(square)) {
                    console.log(`🎯 Feld ${square} wird von ${piece} auf ${pieceSquare} angegriffen`)
                    return true
                }
            }
        }

        return false
    }

    /**
     * Validiert Rochade-Rechte nach einem Zug (korrigiert für Objekt-Format)
     * @param {object} currentRights - Aktuelle Rochade-Rechte als Objekt
     * @param {string} fromSquare - Ausgangsfeld
     * @param {string} toSquare - Zielfeld
     * @param {string} piece - Bewegte Figur
     * @param {string} capturedPiece - Geschlagene Figur (falls vorhanden)
     * @returns {object} Neue Rochade-Rechte als Objekt
     */
    const updateCastlingRights = (currentRights, fromSquare, toSquare, piece, capturedPiece = null) => {
        if (!currentRights) {
            return {
                whiteKingside: false,
                whiteQueenside: false,
                blackKingside: false,
                blackQueenside: false
            }
        }

        // Kopie erstellen, um Original nicht zu verändern
        const newRights = { ...currentRights }

        // König wurde bewegt - alle Rochade-Rechte für diese Farbe verloren
        if (piece && piece.toLowerCase() === 'k') {
            const isWhite = isWhitePiece(piece)
            if (isWhite) {
                newRights.whiteKingside = false
                newRights.whiteQueenside = false
            } else {
                newRights.blackKingside = false
                newRights.blackQueenside = false
            }
        }

        // Turm wurde bewegt - Rochade-Recht für diese Seite verloren
        if (piece && piece.toLowerCase() === 'r') {
            switch (fromSquare) {
                case 'a1': // Weißer Damenturm bewegt
                    newRights.whiteQueenside = false
                    break
                case 'h1': // Weißer Königsturm bewegt
                    newRights.whiteKingside = false
                    break
                case 'a8': // Schwarzer Damenturm bewegt
                    newRights.blackQueenside = false
                    break
                case 'h8': // Schwarzer Königsturm bewegt
                    newRights.blackKingside = false
                    break
            }
        }

        // Turm auf Startfeld geschlagen - Rochade-Recht für diese Seite verloren
        if (capturedPiece && capturedPiece.toLowerCase() === 'r') {
            switch (toSquare) {
                case 'a1': // Weißer Damenturm geschlagen
                    newRights.whiteQueenside = false
                    break
                case 'h1': // Weißer Königsturm geschlagen
                    newRights.whiteKingside = false
                    break
                case 'a8': // Schwarzer Damenturm geschlagen
                    newRights.blackQueenside = false
                    break
                case 'h8': // Schwarzer Königsturm geschlagen
                    newRights.blackKingside = false
                    break
            }
        }

        return newRights
    }

    const hasPieceOnSquare = (board, square, piece) => {
        const indices = squareToIndices(square)
        if (!indices) return false

        return board[indices.rankIndex][indices.fileIndex] === piece
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

    const requiresPromotion = (from, to, piece) => {
        if (!from || !to || !piece) {
            return false
        }

        const pieceType = piece.toLowerCase()
        if (pieceType !== 'p') {
            return false
        }

        const toIndices = squareToIndices(to)
        if (!toIndices) {
            return false
        }
        const targetRank = toIndices.rankIndex
        const isWhitePawn = isWhitePiece(piece)

        const isPromotion = (isWhitePawn && targetRank === 0) || (!isWhitePawn && targetRank === 7)

        console.log('🎯 Promotion-Result:', {
            targetRank,
            isWhitePawn,
            isPromotion,
            rankCheck: isWhitePawn ? 'targetRank === 0' : 'targetRank === 7'
        })

        return isPromotion
    }

    /**
     * returns valid promotion pieces
     * @param {string} playerColor - 'white' or 'black'
     * @returns {Array} Array of FEN-symbols ['Q', 'R', 'B', 'N']
     */
    const getValidPromotionPieces = (playerColor) => {
        const pieces = ['q', 'r', 'b', 'n']
        return playerColor === 'white'
            ? pieces.map(p => p.toUpperCase())
            : pieces
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

        const playerColor = getPieceColor(piece)
        const tempBoard = cloneBoard(board)

        // Zug auf temporärem Brett ausführen
        tempBoard[toIndices.rankIndex][toIndices.fileIndex] = piece
        tempBoard[fromIndices.rankIndex][fromIndices.fileIndex] = null

        // En-Passant Spezialfall
        const moveDetails = possibleMoves.find(move => move.to === to)
        if (moveDetails?.type === 'enpassant' && moveDetails.capturedSquare) {
            const capturedIndices = squareToIndices(moveDetails.capturedSquare)
            if (capturedIndices) {
                tempBoard[capturedIndices.rankIndex][capturedIndices.fileIndex] = null
            }
        }

        // König finden und Check prüfen
        const kingSquare = findKing(tempBoard, playerColor)
        if (!kingSquare) return false

        const enemyColor = playerColor === 'white' ? 'black' : 'white'
        const wouldBeInCheck = isSquareAttacked(tempBoard, kingSquare, enemyColor, gameState)

        return !wouldBeInCheck
    }

    /**
     * Findet alle legalen Züge für eine Farbe
     * @param {string} color
     * @param {Array} board
     * @param {object} gameState
     * @returns {Array}
     */
    const getAllLegalMoves = (board, color, gameState = {}) => {
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

    /**
     * Generiert Standard Algebraic Notation (SAN) für einen Zug
     * @param {string} from - Ausgangsfeld (z.B. "e2")
     * @param {string} to - Zielfeld (z.B. "e4")
     * @param {Array} board - Aktuelles Brett
     * @param {object} moveInfo - Zusätzliche Zug-Informationen
     * @returns {string} SAN-Notation
     */
    const generateMoveNotation = (from, to, board, moveInfo = {}) => {
        const fromIndices = squareToIndices(from)
        const toIndices = squareToIndices(to)

        if (!fromIndices || !toIndices) return '??'

        const piece = board[fromIndices.rankIndex][fromIndices.fileIndex]
        if (isEmpty(piece)) return '??'

        const pieceType = piece.toLowerCase()
        const targetPiece = board[toIndices.rankIndex][toIndices.fileIndex]
        const isCapture = !isEmpty(targetPiece) || moveInfo.type === 'enpassant'

        let notation = ''

        // 1. Spezielle Züge
        if (moveInfo.type === 'castle') {
            return moveInfo.castleType === 'kingside' ? 'O-O' : 'O-O-O'
        }

        // 2. Figurenbuchstabe (außer Bauern)
        if (pieceType !== 'p') {
            notation += piece.toUpperCase()

            // Mehrdeutigkeit auflösen (falls mehrere gleiche Figuren dasselbe Feld erreichen können)
            const disambiguation = getDisambiguation(piece, from, to, board)
            notation += disambiguation
        }

        // 3. Schlag-Notation
        if (isCapture) {
            // Bei Bauern: Ausgangslinie bei Schlag
            if (pieceType === 'p') {
                notation += from[0] // File (a-h)
            }
            notation += 'x'
        }

        // 4. Zielfeld
        notation += to

        // 5. Bauernumwandlung
        if (moveInfo.promotion) {
            notation += '=' + (moveInfo.promotionPiece || 'Q').toUpperCase()
        }

        // 6. En-Passant Kennzeichnung (optional)
        if (moveInfo.type === 'enpassant') {
            notation += ' e.p.'
        }

        // 7. Schach/Matt wird später hinzugefügt nach Zug-Ausführung
        // Das kann nur nach dem Zug bestimmt werden

        return notation
    }

    /**
     * Mehrdeutigkeit bei gleichen Figuren auflösen
     * @param {string} piece
     * @param {string} from
     * @param {string} to
     * @param {Array} board
     * @returns {string} Disambiguierung (leer, File, Rank oder beides)
     */
    const getDisambiguation = (piece, from, to, board) => {
        const pieceType = piece.toLowerCase()
        const pieceColor = getPieceColor(piece)

        // Alle Figuren der gleichen Art und Farbe finden
        const samePieces = []
        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const boardPiece = board[rankIndex][fileIndex]
                if (boardPiece &&
                    boardPiece.toLowerCase() === pieceType &&
                    getPieceColor(boardPiece) === pieceColor) {

                    const square = indicesToSquare(fileIndex, rankIndex)
                    if (square && square !== from) {
                        samePieces.push({
                            square,
                            fileIndex,
                            rankIndex
                        })
                    }
                }
            }
        }

        if (samePieces.length === 0) return ''

        // Prüfen welche dieser Figuren auch zum Zielfeld ziehen könnten
        const conflictingPieces = samePieces.filter(pieceData => {
            // Vereinfachte Prüfung - in einer vollständigen Implementierung
            // würde hier generatePossibleMoves verwendet
            return couldPieceReachSquare(piece, pieceData.square, to, board)
        })

        if (conflictingPieces.length === 0) return ''

        const fromIndices = squareToIndices(from)
        if (!fromIndices) return ''

        // File-Disambiguierung versuchen
        const sameFile = conflictingPieces.some(p => p.fileIndex === fromIndices.fileIndex)
        if (!sameFile) {
            return from[0] // File (a-h)
        }

        // Rank-Disambiguierung versuchen
        const sameRank = conflictingPieces.some(p => p.rankIndex === fromIndices.rankIndex)
        if (!sameRank) {
            return from[1] // Rank (1-8)
        }

        // Beide nötig
        return from
    }

    /**
     * Vereinfachte Prüfung ob eine Figur ein Feld erreichen könnte
     * @param {string} piece
     * @param {string} from
     * @param {string} to
     * @param {Array} board
     * @returns {boolean}
     */
    const couldPieceReachSquare = (piece, from, to, board) => {
        // Vereinfachte Implementierung - würde in Realität generatePossibleMoves verwenden
        const pieceType = piece.toLowerCase()

        switch (pieceType) {
            case 'n': // Springer
                return isKnightMove(from, to)
            case 'r': // Turm
                return isRookMove(from, to) && isPathClear(from, to, board)
            case 'b': // Läufer
                return isBishopMove(from, to) && isPathClear(from, to, board)
            case 'q': // Dame
                return (isRookMove(from, to) || isBishopMove(from, to)) && isPathClear(from, to, board)
            case 'k': // König
                return isKingMove(from, to)
            default:
                return false
        }
    }

    // ===== NEUE CHECK/MATE VALIDIERUNG =====

    /**
     * Prüft ob ein Feld von einer bestimmten Farbe angegriffen wird
     * @param {Array} board - 2D Brett-Array
     * @param {string} square - Zu prüfendes Feld
     * @param {string} attackingColor - 'white' oder 'black'
     * @param {object} gameState - Spielzustand
     * @returns {boolean}
     */
    const isSquareAttacked = (board, square, attackingColor, gameState = {}) => {
        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const piece = board[rankIndex][fileIndex]

                if (isEmpty(piece) || getPieceColor(piece) !== attackingColor) {
                    continue
                }

                const fromSquare = indicesToSquare(fileIndex, rankIndex)
                if (!fromSquare) continue

                const possibleMoves = generatePossibleMoves(piece, fromSquare, board, gameState)

                const canAttackSquare = possibleMoves.some(move => move.to === square)
                if (canAttackSquare) {
                    return true
                }
            }
        }
        return false
    }

    /**
     * Findet den König einer bestimmten Farbe auf dem Brett
     * @param {Array} board - 2D Brett-Array
     * @param {string} color - 'white' oder 'black'
     * @returns {string|null} König-Position oder null
     */
    const findKing = (board, color) => {
        const kingPiece = color === 'white' ? 'K' : 'k'

        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                if (board[rankIndex][fileIndex] === kingPiece) {
                    return indicesToSquare(fileIndex, rankIndex)
                }
            }
        }
        return null
    }

    /**
     * Prüft ob ein Spieler im Schach steht
     * @param {Array} board - 2D Brett-Array
     * @param {string} playerColor - 'white' oder 'black'
     * @param {object} gameState - Spielzustand
     * @returns {boolean}
     */
    const isInCheck = (board, playerColor, gameState = {}) => {
        const kingSquare = findKing(board, playerColor)
        if (!kingSquare) return false

        const enemyColor = playerColor === 'white' ? 'black' : 'white'
        return isSquareAttacked(board, kingSquare, enemyColor, gameState)
    }

    /**
     * Prüft ob ein Zug legal ist (König steht nach dem Zug nicht im Schach)
     * @param {Array} board - 2D Brett-Array
     * @param {string} fromSquare - Startfeld
     * @param {string} toSquare - Zielfeld
     * @param {string} playerColor - 'white' oder 'black'
     * @param {object} gameState - Spielzustand
     * @returns {boolean}
     */
    const isMoveLegal = (board, fromSquare, toSquare, playerColor, gameState = {}) => {
        try {
            const testBoard = cloneBoard(board)
            const fromIndices = squareToIndices(fromSquare)
            const toIndices = squareToIndices(toSquare)

            if (!fromIndices || !toIndices) return false

            const piece = testBoard[fromIndices.rankIndex][fromIndices.fileIndex]
            if (isEmpty(piece)) return false

            testBoard[toIndices.rankIndex][toIndices.fileIndex] = piece
            testBoard[fromIndices.rankIndex][fromIndices.fileIndex] = null

            return !isInCheck(testBoard, playerColor, gameState)

        } catch (error) {
            console.error('Fehler bei der Zug-Legalitätsprüfung:', error)
            return false
        }
    }

    /**
     * Prüft auf Schachmatt
     * @param {Array} board - 2D Brett-Array
     * @param {string} playerColor - 'white' oder 'black'
     * @param {object} gameState - Spielzustand
     * @returns {boolean}
     */
    const isCheckmate = (board, playerColor, gameState = {}) => {
        if (!isInCheck(board, playerColor, gameState)) {
            return false
        }

        const legalMoves = generateLegalMoves(board, playerColor, gameState)
        return legalMoves.length === 0
    }

    /**
     * Prüft auf Patt (Stalemate)
     * @param {Array} board - 2D Brett-Array
     * @param {string} playerColor - 'white' oder 'black'
     * @param {object} gameState - Spielzustand
     * @returns {boolean}
     */
    const isStalemate = (board, playerColor, gameState = {}) => {
        if (isInCheck(board, playerColor, gameState)) {
            return false
        }

        const legalMoves = generateLegalMoves(board, playerColor, gameState)
        return legalMoves.length === 0
    }

    // Helper-Funktionen für Zug-Validierung
    const isKnightMove = (from, to) => {
        const fromIndices = squareToIndices(from)
        const toIndices = squareToIndices(to)
        if (!fromIndices || !toIndices) return false

        const fileDistance = Math.abs(toIndices.fileIndex - fromIndices.fileIndex)
        const rankDistance = Math.abs(toIndices.rankIndex - fromIndices.rankIndex)

        return (fileDistance === 2 && rankDistance === 1) || (fileDistance === 1 && rankDistance === 2)
    }

    const isRookMove = (from, to) => {
        const fromIndices = squareToIndices(from)
        const toIndices = squareToIndices(to)
        if (!fromIndices || !toIndices) return false

        return fromIndices.fileIndex === toIndices.fileIndex || fromIndices.rankIndex === toIndices.rankIndex
    }

    const isBishopMove = (from, to) => {
        const fromIndices = squareToIndices(from)
        const toIndices = squareToIndices(to)
        if (!fromIndices || !toIndices) return false

        const fileDistance = Math.abs(toIndices.fileIndex - fromIndices.fileIndex)
        const rankDistance = Math.abs(toIndices.rankIndex - fromIndices.rankIndex)

        return fileDistance === rankDistance
    }

    const isKingMove = (from, to) => {
        const fromIndices = squareToIndices(from)
        const toIndices = squareToIndices(to)
        if (!fromIndices || !toIndices) return false

        const fileDistance = Math.abs(toIndices.fileIndex - fromIndices.fileIndex)
        const rankDistance = Math.abs(toIndices.rankIndex - fromIndices.rankIndex)

        return fileDistance <= 1 && rankDistance <= 1
    }

    const isPathClear = (from, to, board) => {
        // Simplified implementation
        const squares = getSquaresBetween(from, to)
        return squares.every(square => {
            const indices = squareToIndices(square)
            return indices && isEmpty(board[indices.rankIndex][indices.fileIndex])
        })
    }

    const getAttackingPieces = (targetSquare, attackingPlayer, board, gameState = {}, context = {}) => {
        const attackingPieces = []

        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const piece = board[rankIndex][fileIndex]

                if (isEmpty(piece) || getPieceColor(piece) !== attackingPlayer) continue

                const fromSquare = indicesToSquare(fileIndex, rankIndex)
                if (!fromSquare) continue

                const possibleMoves = generatePossibleMoves(piece, fromSquare, board, gameState, context)

                if (possibleMoves.some(move => move.to === targetSquare)) {
                    attackingPieces.push(fromSquare)
                }
            }
        }

        return attackingPieces
    }

    const getCastlingRookMove = (kingFrom, kingTo) => {
        const castlingMoves = {
            'e1-g1': { from: 'h1', to: 'f1' }, // O-O
            'e1-c1': { from: 'a1', to: 'd1' }, // O-O-O
            'e8-g8': { from: 'h8', to: 'f8' }, // O-O
            'e8-c8': { from: 'a8', to: 'd8' }  // O-O-O
        }

        return castlingMoves[`${kingFrom}-${kingTo}`] || null
    }

    /**
     * Berechnet sowohl Halfmove Clock als auch Fullmove Number
     * @param {string} piece - Bewegte Figur
     * @param {string|null} capturedPiece - Geschlagene Figur (null wenn keine)
     * @param {number} currentHalfmoveClock - Aktueller Halfmove Clock
     * @param {number} currentFullmoveNumber - Aktuelle Vollzug-Nummer
     * @param {string} currentPlayer - Aktueller Spieler ('white' oder 'black')
     * @returns {object} { halfmoveClock, fullmoveNumber }
     */
    const calculateMoveCounters = (piece, capturedPiece, currentHalfmoveClock, currentFullmoveNumber, currentPlayer) => {
        const halfmoveClock = (piece.toLowerCase() === 'p' || capturedPiece) ? 0 : currentHalfmoveClock + 1

        const fullmoveNumber = currentPlayer === 'black' ? currentFullmoveNumber + 1 : currentFullmoveNumber

        return { halfmoveClock, fullmoveNumber }
    }

    /**
     * Prüft ob die 50-Züge-Regel erfüllt ist
     * @param {number} halfmoveClock - Aktueller Halfmove Clock
     * @returns {boolean} True wenn 50-Züge-Regel erfüllt ist
     */
    const checkFiftyMoveRule = (halfmoveClock) => {
        return halfmoveClock >= FIFTY_MOVE_RULE.MAX_HALFMOVES
    }

    /**
     * Prüft ob eine Warnung für die 50-Züge-Regel ausgegeben werden soll
     * @param {number} halfmoveClock - Aktueller Halfmove Clock
     * @returns {boolean} True wenn Warnung ausgegeben werden soll
     */
    const shouldWarnAboutFiftyMoveRule = (halfmoveClock) => {
        return halfmoveClock >= FIFTY_MOVE_RULE.WARNING_THRESHOLD
    }

    /**
     * 3-fache Stellungswiederholung prüfen
     * @param {Array} positionHistory - Array von FEN-Position-Keys
     * @returns {boolean} - True wenn 3-fache Wiederholung erreicht
     */
    const checkThreefoldRepetition = (positionHistory) => {
        if (!Array.isArray(positionHistory) || positionHistory.length < 3) {
            return false
        }

        const positionCounts = {}

        positionHistory.forEach(position => {
            if (position) {
                positionCounts[position] = (positionCounts[position] || 0) + 1
            }
        })

        const maxRepetitions = Math.max(...Object.values(positionCounts))

        console.log('🔄 Stellungswiederholung Check:', {
            positionsTracked: positionHistory.length,
            uniquePositions: Object.keys(positionCounts).length,
            maxRepetitions,
            isThreefold: maxRepetitions >= THREEFOLD_REPETITION.REPETITION_LIMIT
        })

        return maxRepetitions >= THREEFOLD_REPETITION.REPETITION_LIMIT
    }

    /**
     * Anzahl Wiederholungen für eine bestimmte Position
     * @param {string} position - FEN-Position (nur Brett-Teil)
     * @param {Array} positionHistory - Array von FEN-Positionen
     * @returns {number} - Anzahl der Wiederholungen
     */
    const getPositionRepetitionCount = (position, positionHistory) => {
        if (!position || !Array.isArray(positionHistory)) {
            return 0
        }

        return positionHistory.filter(pos => pos === position).length
    }

    /**
     * Warnung für nahende Stellungswiederholung
     * @param {Array} positionHistory - Array von FEN-Positionen
     * @returns {object|null} - Warninginformationen oder null
     */
    const shouldWarnThreefoldRepetition = (positionHistory) => {
        if (!Array.isArray(positionHistory) || positionHistory.length < 2) {
            return null
        }

        const positionCounts = {}
        positionHistory.forEach(position => {
            if (position) {
                positionCounts[position] = (positionCounts[position] || 0) + 1
            }
        })

        // Aktuelle Position (letzte in der History)
        const currentPosition = positionHistory[positionHistory.length - 1]
        if (!currentPosition) return null

        const currentCount = positionCounts[currentPosition] || 0

        // Warnung ab 2. Wiederholung
        if (currentCount >= THREEFOLD_REPETITION.WARN_AT_REPETITION) {
            return {
                position: currentPosition,
                currentCount,
                repetitionsUntilDraw: THREEFOLD_REPETITION.REPETITION_LIMIT - currentCount,
                nextRepetitionCausesDraw: currentCount >= 2,
                isWarning: currentCount === 2,
                isCritical: currentCount >= 2
            }
        }

        return null
    }

    /**
     * FEN-Position für Wiederholungs-Tracking erstellen
     * Nur Brett + aktiver Spieler + Rochade + En-Passant (ohne Halbzug-Zähler)
     * @param {string} fullFen - Vollständiger FEN-String
     * @returns {string} - Reduzierter FEN für Position-Tracking
     */
    const createPositionKey = (fullFen) => {
        if (!fullFen || typeof fullFen !== 'string') {
            return null
        }

        try {
            const fenParts = fullFen.split(' ')
            if (fenParts.length < 4) {
                console.warn('Ungültiger FEN für Position-Key:', fullFen)
                return null
            }

            // Brett + Spieler + Rochade + En-Passant (ohne Halbzug-Counter und Vollzug-Nummer)
            const positionKey = fenParts.slice(0, 4).join(' ')

            return positionKey
        } catch (error) {
            console.error('Fehler beim Erstellen des Position-Keys:', error)
            return null
        }
    }

    // ===== PUBLIC API =====
    return {
        // Move Generation
        generatePossibleMoves,
        generateLegalMovesForSquare,
        generatePawnMoves,
        generateRookMoves,
        generateKnightMoves,
        generateBishopMoves,
        generateQueenMoves,
        generateKingMoves,

        // Validation
        isLegalMove,
        getAllLegalMoves,
        isSquareAttacked,
        findKing,
        isInCheck,
        isMoveLegal,
        isCheckmate,
        isStalemate,

        // Utilities
        isValidPosition,
        isPromotionRank,
        isCastlingPathClear,

        requiresPromotion,
        getValidPromotionPieces,
        calculateMoveCounters,
        checkFiftyMoveRule,
        shouldWarnAboutFiftyMoveRule,
        checkThreefoldRepetition,
        getPositionRepetitionCount,
        shouldWarnThreefoldRepetition,
        createPositionKey,

        getAttackingPieces,
        getCastlingRookMove,
        updateCastlingRights,
        hasPieceOnSquare,
    }
}
