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


    const generatePossibleMoves = (piece, square, board, gameState = {}) => {
        if (isEmpty(piece) || !board.length) return []

        const pieceType = piece.toLowerCase()

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
        // Alle Figuren der angreifenden Farbe durchgehen
        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const piece = board[rankIndex][fileIndex]

                if (isEmpty(piece) || getPieceColor(piece) !== attackingColor) {
                    continue
                }

                const fromSquare = indicesToSquare(fileIndex, rankIndex)
                if (!fromSquare) continue

                const possibleMoves = generatePossibleMoves(piece, fromSquare, board, gameState)

                // Prüfen ob das Zielfeld angegriffen wird
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
            // Temporäres Brett für Zugvalidierung erstellen
            const testBoard = cloneBoard(board)
            const fromIndices = squareToIndices(fromSquare)
            const toIndices = squareToIndices(toSquare)

            if (!fromIndices || !toIndices) return false

            const piece = testBoard[fromIndices.rankIndex][fromIndices.fileIndex]
            if (isEmpty(piece)) return false

            // Zug auf dem Test-Brett ausführen
            testBoard[toIndices.rankIndex][toIndices.fileIndex] = piece
            testBoard[fromIndices.rankIndex][fromIndices.fileIndex] = null

            // Prüfen ob der eigene König nach dem Zug im Schach steht
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
        // 1. Muss im Schach stehen
        if (!isInCheck(board, playerColor, gameState)) {
            return false
        }

        // 2. Keine legalen Züge haben
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
        // 1. Darf NICHT im Schach stehen
        if (isInCheck(board, playerColor, gameState)) {
            return false
        }

        // 2. Keine legalen Züge haben
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
        // Vereinfachte Implementierung
        const squares = getSquaresBetween(from, to)
        return squares.every(square => {
            const indices = squareToIndices(square)
            return indices && isEmpty(board[indices.rankIndex][indices.fileIndex])
        })
    }

    const getAttackingPieces = (targetSquare, attackingPlayer, board, gameState = {}) => {
        const attackingPieces = []

        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const piece = board[rankIndex][fileIndex]

                if (isEmpty(piece) || getPieceColor(piece) !== attackingPlayer) continue

                const fromSquare = indicesToSquare(fileIndex, rankIndex)
                if (!fromSquare) continue

                const possibleMoves = generatePossibleMoves(piece, fromSquare, board, gameState)

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

        getAttackingPieces,
        getCastlingRookMove,
    }
}
