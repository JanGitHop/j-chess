/**
 * Chess constants and mapping
 * Central file for all chess-related constants
 */

// FEN-Startposition
export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// Mappings (FEN-notation to SVG-files)
export const PIECE_IMAGES = {
    // black pieces
    'r': '/images/figures/default/rd.svg', // Turm (Rook)
    'n': '/images/figures/default/nd.svg', // Springer (Knight)
    'b': '/images/figures/default/bd.svg', // Läufer (Bishop)
    'q': '/images/figures/default/qd.svg', // Dame (Queen)
    'k': '/images/figures/default/kd.svg', // König (King)
    'p': '/images/figures/default/pd.svg', // Bauer (Pawn)

    // white pieces
    'R': '/images/figures/default/rl.svg', // Turm (Rook)
    'N': '/images/figures/default/nl.svg', // Springer (Knight)
    'B': '/images/figures/default/bl.svg', // Läufer (Bishop)
    'Q': '/images/figures/default/ql.svg', // Dame (Queen)
    'K': '/images/figures/default/kl.svg', // König (King)
    'P': '/images/figures/default/pl.svg'  // Bauer (Pawn)
}

export const PIECE_NAMES = {
    'r': 'Turm', 'R': 'Turm',
    'n': 'Springer', 'N': 'Springer',
    'b': 'Läufer', 'B': 'Läufer',
    'q': 'Dame', 'Q': 'Dame',
    'k': 'König', 'K': 'König',
    'p': 'Bauer', 'P': 'Bauer'
}

export const PLAYER_COLORS = {
    WHITE: 'white',
    BLACK: 'black'
}

export const GAME_STATUS = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    CHECK: 'check',
    CHECKMATE: 'checkmate',
    STALEMATE: 'stalemate',
    DRAW: 'draw',
    RESIGNED: 'resigned'
}

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
export const RANKS = [8, 7, 6, 5, 4, 3, 2, 1]

// Reverse mapping for better performance
export const FILE_TO_INDEX = Object.fromEntries(FILES.map((file, index) => [file, index]))
export const RANK_TO_INDEX = Object.fromEntries(RANKS.map((rank, index) => [rank, index]))

// Drag & Drop Events
export const DRAG_EVENTS = {
    START: 'dragstart',
    END: 'dragend',
    OVER: 'dragover',
    ENTER: 'dragenter',
    LEAVE: 'dragleave',
    DROP: 'drop'
}

// figure values for engine rating
export const PIECE_VALUES = {
    'p': 1, 'P': 1,
    'n': 3, 'N': 3,
    'b': 3, 'B': 3,
    'r': 5, 'R': 5,
    'q': 9, 'Q': 9,
    'k': 0, 'K': 0
}

// helper functions for pieces
export const isWhitePiece = (piece) => piece && piece === piece.toUpperCase()
export const isBlackPiece = (piece) => piece && piece === piece.toLowerCase()
export const getPieceColor = (piece) => isWhitePiece(piece) ? PLAYER_COLORS.WHITE : PLAYER_COLORS.BLACK
export const isEmpty = (piece) => !piece || piece === ' '

export const isPieceOwnedByPlayer = (piece, currentPlayer) => {
    const pieceColor = getPieceColor(piece)
    return pieceColor === currentPlayer
}

// Board validation
export const isValidSquare = (file, rank) => {
    return FILES.includes(file) && RANKS.includes(rank)
}

export const squareToCoords = (square) => {
    if (typeof square !== 'string' || square.length !== 2) return null
    const file = square[0]
    const rank = parseInt(square[1])
    return isValidSquare(file, rank) ? { file, rank } : null
}

export const coordsToSquare = (file, rank) => {
    return isValidSquare(file, rank) ? `${file}${rank}` : null
}
