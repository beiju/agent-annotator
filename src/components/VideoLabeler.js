import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Col } from "react-bootstrap"
import point_in_polygon from "robust-point-in-polygon"

import agents from "../agents.json"

import './VideoLabeler.css'
import { LabelsDispatch } from "./labels"
import { Timeline } from "./Timeline"
import { Toolbar } from "./Toolbar"
import { getSrcForFrame } from "./util"
import color_convert from "color-convert"

export function transform(x, y, angle, flipped) {
    const matrix = new DOMMatrix([
        Math.cos(angle), -Math.sin(angle),
        Math.sin(angle), Math.cos(angle),
        x, y
    ])
    if (flipped) {
        matrix.multiplySelf(new DOMMatrix([
            1, 0,
            0, -1,
            0, 0,
        ]))
    }
    return matrix
}

const DISH_MASK = Symbol('DISH_MASK')

export function VideoLabeler({ sample, state, returnToIndex }) {
    const dispatch = useContext(LabelsDispatch)

    /** @type {React.MutableRefObject<HTMLCanvasElement>} */
    const [preloadCanvas, setPreloadCanvas] = useState(null)
    const [image, setImage] = useState(null)
    useEffect(() => {
        const element = document.createElement('img')

        function imageLoaded() {
            setImage(element)
            dispatch({ type: 'set_loading_finished' })
        }

        element.addEventListener('load', imageLoaded)
        element.src = getSrcForFrame(sample.id, state.activeFrame)

        // The element will be garbage collected as long as this event listener isn't around creating a cycle
        return () => element.removeEventListener('load', imageLoaded)
    }, [dispatch, sample.id, state.activeFrame])

    const dishMaskLocation = useMemo(() => {
        if (!image) return null

        const x = state.dishMask?.x ?? image.naturalWidth / 2
        const y = state.dishMask?.y ?? image.naturalHeight / 2
        const radius = state.dishMask?.radius ?? 500

        return { x, y, radius }
    }, [image, state])

    const [canvas, setCanvas] = useState(null)
    useEffect(() => {
        if (preloadCanvas && image) {
            preloadCanvas.width = image.naturalWidth
            preloadCanvas.height = image.naturalHeight

            preloadCanvas.getContext('2d').save()

            setCanvas(preloadCanvas)
        }
    }, [preloadCanvas, image])

    useEffect(() => {
        if (!canvas) return
        if (!dishMaskLocation) return

        const ctx = canvas.getContext('2d')

        ctx.restore()
        ctx.save()

        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.beginPath()
        const { x, y, radius } = dishMaskLocation
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.clip()
    }, [canvas, dishMaskLocation])


    const getAgentLocation = useCallback(function (state, agentId) {
        if (!canvas) throw new Error("Canvas ref was cleared")

        if (agentId === DISH_MASK) {
            return dishMaskLocation
        }

        console.assert(typeof agentId === "string")

        const agentLabel = state.frames[state.activeFrame]?.[agentId] ?? {}
        const x = agentLabel.x ?? canvas.width / 2
        const y = agentLabel.y ?? canvas.height / 2
        const angle = agentLabel.angle ?? 0

        return { x, y, angle }
    }, [canvas, dishMaskLocation])

    useEffect(() => {
        if (!canvas) return
        if (!image) return

        const ctx = canvas.getContext('2d')
        ctx.setTransform(1, 0, 0, 1, 0, 0)

        ctx.drawImage(image, 0, 0)

        ctx.lineWidth = 2

        for (const [agentId, agent] of Object.entries(state.agents)) {
            const [h, s, l] = color_convert.hex.hsl(agent.color.slice(1))
            if (agentId === state.activeAgent) {
                ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, 1)`
                ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, 0.2)`
            } else {
                ctx.strokeStyle = `hsla(${h}, ${s * 0.25}%, ${l}%, 1)`
                ctx.fillStyle = `hsla(${h}, ${s * 0.25}%, ${l}%, 0.2)`
            }
            const { x, y, angle } = getAgentLocation(state, agentId)
            const flipped = false // TODO remove 

            ctx.setTransform(transform(x, y, angle, flipped))
            ctx.beginPath()
            for (const [shapeX, shapeY] of agent.shape) {
                ctx.lineTo(shapeX, shapeY)
            }
            ctx.stroke()
            ctx.fill()
        }
    }, [canvas, getAgentLocation, image, state])

    useEffect(() => {
        const activeAgentLabel = state.frames[state.activeFrame]?.[state.activeAgent] ?? {}

        if (dispatch && image && (
            typeof activeAgentLabel.x === "undefined" ||
            typeof activeAgentLabel.y === "undefined")
        ) {
            dispatch({
                type: 'set_agent_position',
                agentId: state.activeAgent,
                x: activeAgentLabel.x ?? image.naturalWidth / 2,
                y: activeAgentLabel.y ?? image.naturalHeight / 2,
            })
        }
    }, [dispatch, state, image])

    // Preload next 3 frames
    useEffect(() => {
        new Image().src = getSrcForFrame(sample.id, state.activeFrame + 1)
        new Image().src = getSrcForFrame(sample.id, state.activeFrame + 2)
        new Image().src = getSrcForFrame(sample.id, state.activeFrame + 3)
    }, [sample.id, state.activeFrame])

    function eventToImageCoordinates(event) {
        if (!canvas) throw new Error("Canvas ref was cleared")

        const x = event.nativeEvent.offsetX * (canvas.height / canvas.clientHeight)
        const y = event.nativeEvent.offsetY * (canvas.width / canvas.clientWidth)

        return { x, y }
    }

    const [drag, setDrag] = useState(null)

    function startDrag(x, y, agentId) {
        if (!agentId) return

        setDrag({
            agentId,
            mouse: { x, y },
            agent: getAgentLocation(state, agentId)
        })
    }

    function endDrag() {
        setDrag(null)
    }

    function getHoveredAgent(x, y) {
        for (const [agentId, agent] of Object.entries(state.agents)) {
            const agentPos = getAgentLocation(state, agentId)
            const xTranslated = x - agentPos.x
            const yTranslated = y - agentPos.y
            const xRotated = xTranslated * Math.cos(-agentPos.angle) + yTranslated * Math.sin(-agentPos.angle)
            const yRotated = -xTranslated * Math.sin(-agentPos.angle) + yTranslated * Math.cos(-agentPos.angle)

            if (point_in_polygon(agent.shape, [xRotated, yRotated]) <= 0) {
                return agentId
            }
        }

        return null
    }

    function isDishMaskHovered(mouseX, mouseY) {
        if (state.dishMask?.locked) return false
        const { x: dishX, y: dishY, radius } = dishMaskLocation
        const dist_sqr = (mouseX - dishX) ** 2 + (mouseY - dishY) ** 2
        return dist_sqr > radius ** 2
    }

    function onCanvasMousedown(event) {
        const { x, y } = eventToImageCoordinates(event)
        if (isDishMaskHovered(x, y)) {
            startDrag(x, y, DISH_MASK)
            return
        }

        const hoveredAgent = getHoveredAgent(x, y)
        if (hoveredAgent) {
            dispatch({
                type: 'set_active_agent',
                activeAgent: hoveredAgent
            })
        }
        startDrag(x, y, hoveredAgent ?? state.activeAgent)
    }

    function isDragging() {
        return drag && (drag.agentId === state.activeAgent || drag.agentId === DISH_MASK)
    }

    function onCanvasMousemove(event) {
        if (isDragging()) {
            const xDelta = event.nativeEvent.offsetX * (canvas.height / canvas.clientHeight) - drag.mouse.x
            const yDelta = event.nativeEvent.offsetY * (canvas.width / canvas.clientWidth) - drag.mouse.y

            if (drag.agentId === DISH_MASK) {
                dispatch({
                    type: 'set_dish_mask_position',
                    x: xDelta + drag.agent.x,
                    y: yDelta + drag.agent.y,
                })
            } else {
                dispatch({
                    type: 'set_agent_position',
                    agentId: drag.agentId,
                    x: xDelta + drag.agent.x,
                    y: yDelta + drag.agent.y,
                })
            }
        }
    }

    function agentToScroll(x, y) {
        // If dragging, rotate the agent being dragged. Otherwise, rotate the hovered agent (or dish). Otherwise,
        // scroll the selected agent

        if (isDragging()) return drag.agentId

        if (isDishMaskHovered(x, y)) return DISH_MASK

        return getHoveredAgent(x, y) ?? state.activeAgent
    }

    function onCanvasWheel(event) {
        const { x, y } = eventToImageCoordinates(event)

        const agentId = agentToScroll(x, y)

        if (agentId === DISH_MASK) {
            const { radius } = dishMaskLocation
            dispatch({
                type: 'set_dish_mask_radius',
                radius: Math.max(10, radius + event.deltaY / (event.shiftKey ? 10 : 100)),
            })
        } else if (agentId) {
            if (agentId !== state.activeAgent) {
                dispatch({
                    type: 'set_active_agent',
                    activeAgent: agentId
                })
            }

            dispatch({
                type: 'rotate_agent',
                agentId,
                by: event.deltaY / (event.shiftKey ? 1000 : 10000),
            })
        }
    }

    return (<Col className="h-100 d-flex flex-column">
        <Toolbar sample={sample} state={state} returnToIndex={returnToIndex} />
        <div className="labeler-canvas-container">
            <canvas
                className="labeler-canvas"
                ref={setPreloadCanvas}
                onMouseDown={onCanvasMousedown}
                onMouseUp={endDrag}
                onMouseMove={onCanvasMousemove}
                onWheel={onCanvasWheel}
            />
            <Timeline sample={sample} state={state} />
        </div>
    </Col>)
}