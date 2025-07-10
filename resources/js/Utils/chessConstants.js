/**
 * Chess constants and mapping
 * Central file for all chess-related constants
 */

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// Mappings (FEN-notation to SVG-files)
export const PIECE_IMAGES = {
    // black pieces
    'r': '/images/pieces/default/rd.svg', // Turm (Rook)
    'n': '/images/pieces/default/nd.svg', // Springer (Knight)
    'b': '/images/pieces/default/bd.svg', // Läufer (Bishop)
    'q': '/images/pieces/default/qd.svg', // Dame (Queen)
    'k': '/images/pieces/default/kd.svg', // König (King)
    'p': '/images/pieces/default/pd.svg', // Bauer (Pawn)

    // white pieces
    'R': '/images/pieces/default/rl.svg', // Turm (Rook)
    'N': '/images/pieces/default/nl.svg', // Springer (Knight)
    'B': '/images/pieces/default/bl.svg', // Läufer (Bishop)
    'Q': '/images/pieces/default/ql.svg', // Dame (Queen)
    'K': '/images/pieces/default/kl.svg', // König (King)
    'P': '/images/pieces/default/pl.svg'  // Bauer (Pawn)
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
    WAITING: 'WAITING',
    ACTIVE: 'ACTIVE',
    CHECK: 'CHECK',
    CHECKMATE: 'CHECKMATE',
    STALEMATE: 'STALEMATE',
    DRAW_FIFTY_MOVE: 'DRAW_FIFTY_MOVE',
    DRAW_REPETITION: 'DRAW_REPETITION',
    DRAW_AGREEMENT: 'DRAW_AGREEMENT',
    DRAW_INSUFFICIENT: 'DRAW_INSUFFICIENT',
    RESIGNED: 'RESIGNED'
}

// Game Modes Definition
export const GAME_MODES = {
    LOCAL_PVP: 'local-pvp',
    ONLINE_PVP: 'online-pvp',
    VS_AI: 'vs-ai',
    ANALYSIS: 'analysis'
}

// Game Mode Settings
export const GAME_MODE_SETTINGS = {
    [GAME_MODES.LOCAL_PVP]: {
        id: GAME_MODES.LOCAL_PVP,
        name: 'Lokales PvP',
        description: 'Zwei Spieler am gleichen Gerät',
        allowAutoReverse: true,
        allowUndo: true,
        allowOfferDraw: true,
        allowResign: true,
        icon: '👥',
        isOnline: false,
        hasTimer: false,
        disabled: false
    },
    [GAME_MODES.ONLINE_PVP]: {
        id: GAME_MODES.ONLINE_PVP,
        name: 'Online PvP',
        description: 'Spiel gegen andere online',
        allowAutoReverse: false,
        allowUndo: false,
        allowOfferDraw: true,
        allowResign: true,
        icon: '🌐',
        isOnline: true,
        hasTimer: true,
        disabled: true // Noch nicht implementiert
    },
    [GAME_MODES.VS_AI]: {
        id: GAME_MODES.VS_AI,
        name: 'Gegen KI',
        description: 'Spiel gegen Computer',
        allowAutoReverse: false,
        allowUndo: true,
        allowOfferDraw: false,
        allowResign: true,
        icon: '🤖',
        isOnline: false,
        hasTimer: false,
        disabled: true // Noch nicht implementiert
    },
    [GAME_MODES.ANALYSIS]: {
        id: GAME_MODES.ANALYSIS,
        name: 'Analyse-Modus',
        description: 'Position analysieren',
        allowAutoReverse: true,
        allowUndo: true,
        allowOfferDraw: false,
        allowResign: false,
        icon: '🔍',
        isOnline: false,
        hasTimer: false,
        disabled: false
    }
}

// Helper Functions für Game Modes
export const isGameModeValid = (mode) => {
    return Object.values(GAME_MODES).includes(mode)
}

export const getGameModeSettings = (mode) => {
    return GAME_MODE_SETTINGS[mode] || GAME_MODE_SETTINGS[GAME_MODES.LOCAL_PVP]
}

export const getAvailableGameModes = () => {
    return Object.values(GAME_MODE_SETTINGS).filter(mode => !mode.disabled)
}

export const getGameModesByFeature = (feature) => {
    return Object.values(GAME_MODE_SETTINGS).filter(mode => mode[feature] === true)
}

// Default Game Mode
export const DEFAULT_GAME_MODE = GAME_MODES.LOCAL_PVP

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

// piece rating
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

export const isDrawStatus = (status) => {
    return status && status.startsWith('DRAW_')
}

export const THREEFOLD_REPETITION = {
    REPETITION_LIMIT: 3,     // 3-mal = Remis
    WARN_AT_REPETITION: 2,   // Warnung ab 2. Wiederholung
    POSITIONS_TO_TRACK: 150, // Maximale Anzahl Positionen im Speicher
    FIVEFOLD_THRESHOLD: 5,   // 5-mal = automatisches Remis (FIDE-Regel)

    RELEVANT_FEN_PARTS: {
        POSITION: true,
        ACTIVE_PLAYER: true,
        CASTLING: true,
        EN_PASSANT: true,
        HALFMOVE_CLOCK: false,
        FULLMOVE_NUMBER: false
    }
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

export const FIFTY_MOVE_RULE = {
    MAX_HALFMOVES: 100,
    WARNING_THRESHOLD: 90
}
