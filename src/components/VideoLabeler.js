import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Col } from "react-bootstrap"
import point_in_polygon from "robust-point-in-polygon"

import agents from "../agents.json"

import './VideoLabeler.css'
import { LabelsDispatch } from "./labels"
import { Timeline } from "./Timeline"
import { Toolbar } from "./Toolbar"
import { getSrcForFrame } from "./util"

function transform(x, y, angle) {
    return new DOMMatrix([
        Math.cos(angle), -Math.sin(angle),
        Math.sin(angle), Math.cos(angle),
        x, y
    ])
}

const DISH_MASK = Symbol('DISH_MASK')

export function VideoLabeler({ sample, state, nextVideo }) {
    const dispatch = useContext(LabelsDispatch)

    /** @type {React.MutableRefObject<HTMLCanvasElement>} */
    const [canvas, setCanvas] = useState(null)
    const [image, setImage] = useState(null)
    useEffect(() => {
        if (!canvas) return

        const element = document.createElement('img')

        function imageLoaded() {
            canvas.width = element.naturalWidth
            canvas.height = element.naturalHeight
            setImage(element)
            dispatch({ type: 'set_loading_finished' })
        }

        element.addEventListener('load', imageLoaded)
        element.src = getSrcForFrame(sample.data, state.activeFrame)

        // The element will be garbage collected as long as this event listener isn't around creating a cycle
        return () => element.removeEventListener('loadeddata', imageLoaded)
    }, [canvas, dispatch, sample.data, state.activeFrame])

    const getDishMaskLocation = useCallback(function (state) {
        if (!canvas) throw new Error("Canvas ref was cleared")

        const x = state.dishMask?.x ?? canvas.width / 2
        const y = state.dishMask?.y ?? canvas.height / 2
        const radius = state.dishMask?.radius ?? 500

        return { x, y, radius }
    }, [canvas])

    // This only exists to slap a saved state in the drawing state, for use in un-clipping
    useMemo(() => {
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        ctx.save()
    }, [canvas])

    useMemo(() => {
        if (!canvas) return

        const ctx = canvas.getContext('2d')

        ctx.restore()
        ctx.save()

        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.beginPath()
        const { x, y, radius } = getDishMaskLocation(state)
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.clip()

    }, [canvas, getDishMaskLocation, state])


    const getAgentLocation = useCallback(function (state, agent) {
        if (!canvas) throw new Error("Canvas ref was cleared")

        if (agent === DISH_MASK) {
            return getDishMaskLocation(state)
        }

        console.assert(typeof agent === "string")

        const agentLabel = state.frames[state.activeFrame]?.[agent] ?? {}
        const x = agentLabel.x ?? canvas.width / 2
        const y = agentLabel.y ?? canvas.height / 2
        const angle = agentLabel.angle ?? 0

        return { x, y, angle }
    }, [canvas, getDishMaskLocation])

    useMemo(() => {
        if (!canvas) return
        if (!image) return

        const ctx = canvas.getContext('2d')
        ctx.setTransform(1, 0, 0, 1, 0, 0)

        ctx.drawImage(image, 0, 0)

        ctx.lineWidth = 2

        for (const agent of agents) {
            if (!state.agentPresent[agent.name]) continue

            if (agent.name === state.activeAgent) {
                ctx.strokeStyle = 'red'
                ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
            } else {
                ctx.strokeStyle = 'darkgrey'
                ctx.fillStyle = 'rgba(0,0,0,0.2)'
            }
            const { x, y, angle } = getAgentLocation(state, agent.name)

            ctx.setTransform(transform(x, y, angle))
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
                agentName: state.activeAgent,
                x: activeAgentLabel.x ?? image.naturalWidth / 2,
                y: activeAgentLabel.y ?? image.naturalHeight / 2,
            })
        }
    }, [dispatch, state, image])

    // Preload next 3 frames
    useEffect(() => {
        new Image().src = getSrcForFrame(sample.data, state.activeFrame + 1)
        new Image().src = getSrcForFrame(sample.data, state.activeFrame + 2)
        new Image().src = getSrcForFrame(sample.data, state.activeFrame + 3)
    }, [sample.data, state.activeFrame])

    function eventToImageCoordinates(event) {
        if (!canvas) throw new Error("Canvas ref was cleared")

        const x = event.nativeEvent.offsetX * (canvas.height / canvas.clientHeight)
        const y = event.nativeEvent.offsetY * (canvas.width / canvas.clientWidth)

        return { x, y }
    }

    const [drag, setDrag] = useState(null)

    function startDrag(x, y, agentName) {
        if (!agentName) return

        setDrag({
            agentName,
            mouse: { x, y },
            agent: getAgentLocation(state, agentName)
        })
    }

    function endDrag() {
        setDrag(null)
    }

    function getHoveredAgent(x, y) {
        for (const agent of agents) {
            if (!state.agentPresent[agent.name]) continue

            const agentPos = getAgentLocation(state, agent.name)
            const xTranslated = x - agentPos.x
            const yTranslated = y - agentPos.y
            const xRotated = xTranslated * Math.cos(-agentPos.angle) + yTranslated * Math.sin(-agentPos.angle)
            const yRotated = -xTranslated * Math.sin(-agentPos.angle) + yTranslated * Math.cos(-agentPos.angle)

            if (point_in_polygon(agent.shape, [xRotated, yRotated]) <= 0) {
                return agent.name
            }
        }

        return null
    }

    function isDishMaskHovered(mouseX, mouseY) {
        if (state.dishMask?.locked) return false
        const {x: dishX, y: dishY, radius } = getDishMaskLocation(state)
        const dist_sqr = (mouseX - dishX) ** 2 + (mouseY - dishY) ** 2
        return dist_sqr > radius ** 2
    }

    function onCanvasMousedown(event) {
        const { x, y } = eventToImageCoordinates(event)
        if (isDishMaskHovered(x, y)) {
            startDrag(x, y, DISH_MASK)
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
        return drag && (drag.agentName === state.activeAgent || drag.agentName === DISH_MASK)
    }

    function onCanvasMousemove(event) {
        if (isDragging()) {
            const xDelta = event.nativeEvent.offsetX * (canvas.height / canvas.clientHeight) - drag.mouse.x
            const yDelta = event.nativeEvent.offsetY * (canvas.width / canvas.clientWidth) - drag.mouse.y

            if (drag.agentName === DISH_MASK) {
                dispatch({
                    type: 'set_dish_mask_position',
                    x: xDelta + drag.agent.x,
                    y: yDelta + drag.agent.y,
                })
            } else {
                dispatch({
                    type: 'set_agent_position',
                    agentName: drag.agentName,
                    x: xDelta + drag.agent.x,
                    y: yDelta + drag.agent.y,
                })
            }
        }
    }

    function agentToScroll(x, y) {
        // If dragging, rotate the agent being dragged. Otherwise, rotate the hovered agent (or dish). Otherwise,
        // scroll the selected agent

        if (isDragging()) return drag.agentName

        if (isDishMaskHovered(x, y)) return DISH_MASK

        return getHoveredAgent(x, y) ?? state.activeAgent
    }

    function onCanvasWheel(event) {
        const { x, y } = eventToImageCoordinates(event)

        const agentName = agentToScroll(x, y)

        if (agentName === DISH_MASK) {
            const { radius } = getDishMaskLocation(state)
            dispatch({
                type: 'set_dish_mask_radius',
                radius: Math.max(10, radius + event.deltaY / (event.shiftKey ? 100 : 10)),
            })
        } else if (agentName) {
            if (agentName !== state.activeAgent) {
                dispatch({
                    type: 'set_active_agent',
                    activeAgent: agentName
                })
            }

            dispatch({
                type: 'rotate_agent',
                agentName,
                by: event.deltaY / (event.shiftKey ? 1000 : 10000),
            })
        }
    }

    return (<Col className="h-100 d-flex flex-column">
        <Toolbar sample={sample} state={state} nextVideo={nextVideo} />
        <div className="labeler-canvas-container">
            <canvas
                className="labeler-canvas"
                ref={setCanvas}
                onMouseDown={onCanvasMousedown}
                onMouseUp={endDrag}
                onMouseMove={onCanvasMousemove}
                onWheel={onCanvasWheel}
            />
            <Timeline sample={sample} state={state} />
        </div>
    </Col>)
}