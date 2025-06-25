/**
 * Drag & Drop Composable
 * Erweiterte Drag & Drop Funktionalität für Schachfiguren
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '@/Stores/boardStore.js'
import { useGameStore } from '@/Stores/gameStore.js'
import { usePieceStore } from '@/Stores/pieceStore.js'

export function useDragAndDrop() {
    // Stores
    const boardStore = useBoardStore()
    const gameStore = useGameStore()
    const pieceStore = usePieceStore()

    // Drag State
    const dragElement = ref(null)
    const ghostElement = ref(null)
    const isDragActive = ref(false)
    const dragStartPosition = ref({ x: 0, y: 0 })
    const currentPosition = ref({ x: 0, y: 0 })
    const dragOffset = ref({ x: 0, y: 0 })

    // Touch Support
    const isTouchDevice = ref(false)
    const touchIdentifier = ref(null)

    // Drag Configuration
    const dragConfig = ref({
        enableTouch: true,
        enableMouse: true,
        threshold: 5, // Pixel-Schwellenwert für Drag-Start
        snapToGrid: true,
        showGhostImage: true,
        ghostOpacity: 0.8,
        animationDuration: 200
    })

    // ===== COMPUTED =====

    /**
     * Aktuelle Drag-Daten
     */
    const dragData = computed(() => ({
        isDragging: isDragActive.value,
        piece: gameStore.draggedPiece,
        fromSquare: gameStore.draggedFrom,
        currentSquare: boardStore.mousePosition.square,
        canDrop: gameStore.legalMoves.some(move =>
            move.to === boardStore.mousePosition.square
        )
    }))

    /**
     * Ghost-Element Style mit korrektem Offset
     */
    const ghostStyle = computed(() => {
        if (!isDragActive.value || !pieceStore.dragSettings.showGhost) {
            return { display: 'none' }
        }

        return {
            position: 'fixed',
            left: `${currentPosition.value.x - dragOffset.value.x}px`,
            top: `${currentPosition.value.y - dragOffset.value.y}px`,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: dragConfig.value.ghostOpacity,
            transform: `scale(${pieceStore.sizeSettings.scaleOnDrag})`,
            transition: isDragActive.value ? 'none' : `all ${dragConfig.value.animationDuration}ms ease-out`,
            cursor: 'grabbing' // Greifende Hand während des Drags
        }
    })

    // ===== CURSOR MANAGEMENT =====

    /**
     * Cursor-Stil für Drag-Operationen setzen
     */
    const setCursor = (cursorType) => {
        const cursorStyles = {
            'grab': 'grab',
            'grabbing': 'grabbing',
            'default': 'default',
            'pointer': 'pointer'
        }

        console.log(cursorStyles[cursorType] || 'default');
        document.body.style.cursor = cursorStyles[cursorType] || 'default'
    }

    // ===== DRAG HANDLERS =====

    /**
     * Drag-Operation starten
     * @param {Event} event - Mouse/Touch Event
     * @param {string} square - Startfeld
     * @param {string} piece - Figur
     * @param {HTMLElement} element - Figuren-Element
     */
    const startDrag = (event, square, piece, element) => {
        // Validierung
        if (!square || !piece || !element) return false
        if (!gameStore.isGameActive) return false

        // Event-Koordinaten extrahieren
        const coords = getEventCoordinates(event)
        if (!coords) return false

        // Element-Rechteck für Offset-Berechnung
        const elementRect = element.getBoundingClientRect()

        // KORREKTUR: Offset basierend auf Maus-Position im Element berechnen
        const clickOffsetX = coords.x - elementRect.left
        const clickOffsetY = coords.y - elementRect.top

        // Figur-Zentrum als Offset verwenden (damit die Figur unter der Maus zentriert ist)
        dragOffset.value = {
            x: elementRect.width / 2,
            y: elementRect.height / 2
        }

        // Game Store informieren
        gameStore.draggedPiece = piece
        gameStore.draggedFrom = square
        gameStore.isDragging = true

        // Drag-State initialisieren
        isDragActive.value = true
        dragElement.value = element
        dragStartPosition.value = coords
        currentPosition.value = coords

        // Touch-Identifier speichern
        if (event.touches) {
            touchIdentifier.value = event.touches[0].identifier
            isTouchDevice.value = true
        }

        // KORREKTUR: Cursor zur greifenden Hand ändern
        setCursor('grabbing')

        // Ghost-Element erstellen
        if (dragConfig.value.showGhostImage) {
            createGhostElement(piece, element)
        }

        // Original-Element während Drag ausblenden/transparent machen
        element.style.opacity = '0.3'
        element.style.transform = `scale(${pieceStore.sizeSettings.scaleOnSelect})`

        // Board Store informieren
        boardStore.handleDragStart(square, piece, coords)

        // Event-Handler registrieren
        setupDragEventListeners()

        // Default-Verhalten verhindern
        event.preventDefault()
        event.stopPropagation()

        return true
    }

    /**
     * Drag-Bewegung verfolgen
     * @param {Event} event
     */
    const handleDragMove = (event) => {
        if (!isDragActive.value) return

        const coords = getEventCoordinates(event)
        if (!coords) return

        currentPosition.value = coords

        // Ghost-Element Position update
        if (ghostElement.value) {
            ghostElement.value.style.left = `${coords.x - dragOffset.value.x}px`
            ghostElement.value.style.top = `${coords.y - dragOffset.value.y}px`
        }

        // Board Store über neue Position informieren
        const elementFromPoint = document.elementFromPoint(coords.x, coords.y)
        const square = findSquareFromElement(elementFromPoint)

        if (square && square !== boardStore.mousePosition.square) {
            boardStore.updateMousePosition(coords.x, coords.y, square)
        }

        event.preventDefault()
    }

    const endDrag = (event) => {
        if (!isDragActive.value) return

        const coords = getEventCoordinates(event)
        const dropSquare = boardStore.mousePosition.square

        let success = false
        let needsPromotion = false

        // attempt move
        if (dropSquare && dropSquare !== gameStore.draggedFrom) {
            const moveResult = gameStore.attemptMove(gameStore.draggedFrom, dropSquare)
            success = moveResult.success
            needsPromotion = moveResult.needsPromotion || false

            if (needsPromotion) {
                console.log('🎯 useDragAndDrop: Promotion erkannt beim endDrag')
            }
        }

        if (dragElement.value) {
            dragElement.value.style.opacity = '1'
            dragElement.value.style.transform = ''
        }

        // Animation für failed drops (aber nicht für Promotion!)
        if (!success && !needsPromotion && coords && dragElement.value) {
            animateSnapBack()
        }

        cleanupDrag()

        event.preventDefault()
    }

    /**
     * Drag abbrechen (ESC-Taste, etc.)
     */
    const cancelDrag = () => {
        if (!isDragActive.value) return

        // Original-Element wiederherstellen
        if (dragElement.value) {
            dragElement.value.style.opacity = '1'
            dragElement.value.style.transform = ''
            animateSnapBack()
        }

        // Game Store informieren
        gameStore.draggedPiece = null
        gameStore.draggedFrom = null
        gameStore.isDragging = false

        cleanupDrag()
    }

    // ===== HELPER FUNCTIONS =====

    /**
     * Event-Koordinaten extrahieren (Mouse + Touch)
     * @param {Event} event
     * @returns {object|null} { x, y }
     */
    const getEventCoordinates = (event) => {
        if (event.touches) {
            // Touch Event
            const touch = Array.from(event.touches).find(
                t => t.identifier === touchIdentifier.value
            ) || event.touches[0]

            return touch ? { x: touch.clientX, y: touch.clientY } : null
        } else if (event.clientX !== undefined) {
            // Mouse Event
            return { x: event.clientX, y: event.clientY }
        }
        return null
    }

    /**
     * Ghost-Element erstellen mit korrekter Größe und Position
     * @param {string} piece
     * @param {HTMLElement} originalElement
     */
    const createGhostElement = (piece, originalElement) => {
        if (!pieceStore.dragSettings.showGhost) return

        // Bestehende Ghost entfernen
        removeGhostElement()

        // Neues Ghost-Element erstellen
        const ghost = originalElement.cloneNode(true)
        ghost.id = 'drag-ghost'

        // Ghost-Style anwenden
        const style = ghostStyle.value
        Object.assign(ghost.style, style)

        // KORREKTUR: Ghost-Element erhält korrekte Größe
        const originalRect = originalElement.getBoundingClientRect()
        ghost.style.width = `${originalRect.width}px`
        ghost.style.height = `${originalRect.height}px`

        document.body.appendChild(ghost)
        ghostElement.value = ghost
    }

    /**
     * Ghost-Element entfernen
     */
    const removeGhostElement = () => {
        if (ghostElement.value) {
            ghostElement.value.remove()
            ghostElement.value = null
        }
    }

    /**
     * Snap-back Animation für failed drops
     */
    const animateSnapBack = () => {
        if (!dragElement.value) return

        const element = dragElement.value

        // Sanfte Rückkehr-Animation
        element.style.transition = `all ${dragConfig.value.animationDuration}ms ease-out`
        element.style.transform = 'scale(1)'

        setTimeout(() => {
            if (element.style) {
                element.style.transition = ''
            }
        }, dragConfig.value.animationDuration)
    }

    /**
     * Feld-Element von DOM-Element finden
     * @param {HTMLElement} element
     * @returns {string|null} Square notation (z.B. "e4")
     */
    const findSquareFromElement = (element) => {
        if (!element) return null

        // Traversiere DOM nach oben bis Square gefunden
        let current = element
        while (current && current !== document.body) {
            // Suche nach data-square Attribut
            if (current.dataset && current.dataset.square) {
                return current.dataset.square
            }

            // Suche nach Square-Klasse Pattern
            if (current.className && current.className.includes('chess-square')) {
                const classes = current.className.split(' ')
                const squareClass = classes.find(c => c.match(/^square-[a-h][1-8]$/))
                if (squareClass) {
                    return squareClass.replace('square-', '')
                }
            }

            current = current.parentElement
        }

        return null
    }

    /**
     * Event-Listener für Drag-Operation einrichten
     */
    const setupDragEventListeners = () => {
        const options = { passive: false }

        if (isTouchDevice.value) {
            document.addEventListener('touchmove', handleDragMove, options)
            document.addEventListener('touchend', endDrag, options)
            document.addEventListener('touchcancel', cancelDrag, options)
        } else {
            document.addEventListener('mousemove', handleDragMove, options)
            document.addEventListener('mouseup', endDrag, options)
        }

        // ESC-Taste für Abbruch
        document.addEventListener('keydown', handleKeyDown)
    }

    /**
     * Event-Listener nach Drag-Operation entfernen
     */
    const removeDragEventListeners = () => {
        // Mouse Events
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', endDrag)

        // Touch Events
        document.removeEventListener('touchmove', handleDragMove)
        document.removeEventListener('touchend', endDrag)
        document.removeEventListener('touchcancel', cancelDrag)

        // Keyboard
        document.removeEventListener('keydown', handleKeyDown)
    }

    /**
     * Keyboard-Handler
     * @param {KeyboardEvent} event
     */
    const handleKeyDown = (event) => {
        if (event.key === 'Escape' && isDragActive.value) {
            cancelDrag()
        }
    }

    /**
     * Drag-State komplett zurücksetzen
     */
    const cleanupDrag = () => {
        isDragActive.value = false
        dragElement.value = null
        touchIdentifier.value = null
        dragStartPosition.value = { x: 0, y: 0 }
        currentPosition.value = { x: 0, y: 0 }
        dragOffset.value = { x: 0, y: 0 }

        // KORREKTUR: Cursor zurücksetzen
        setCursor('default')

        removeGhostElement()
        removeDragEventListeners()
    }

    // ===== HOVER EFFECTS =====

    /**
     * Hover-Effekt für draggable Elemente
     * @param {HTMLElement} element
     * @param {boolean} isHovering
     */
    const setHoverEffect = (element, isHovering) => {
        if (!element) return

        if (isHovering) {
            element.style.cursor = 'grab'
            element.style.transform = `scale(${pieceStore.sizeSettings.scaleOnHover})`
        } else {
            element.style.cursor = ''
            element.style.transform = ''
        }
    }

    // ===== RETURN PUBLIC API =====
    return {
        // State
        isDragActive,
        dragData,
        ghostElement,
        dragConfig,

        // Actions
        startDrag,
        endDrag,
        cancelDrag,
        findSquareFromElement,
        setHoverEffect,

        // Computed
        ghostStyle
    }
}
