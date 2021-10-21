import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { Col } from "react-bootstrap"
import point_in_polygon from "robust-point-in-polygon"

import agents from "../agents.json"

import './VideoLabeler.css'
import { LabelsDispatch } from "./labels"
import { Timeline } from "./Timeline"
import { Toolbar } from "./Toolbar"

function transform(x, y, angle) {
    return new DOMMatrix([
        Math.cos(angle), -Math.sin(angle),
        Math.sin(angle), Math.cos(angle),
        x, y
    ])
}

function getSrcForFrame(sampleData, activeFrame) {
    if (!sampleData) return ""
    return sampleData.replace(".mp4", `/${String(activeFrame).padStart(3, '0')}.jpg`)
}

export function VideoLabeler({ sample, state, nextVideo }) {
    const dispatch = useContext(LabelsDispatch)

    /** @type {React.MutableRefObject<HTMLCanvasElement>} */
    const canvasRef = useRef()
    const [image, setImage] = useState(null)
    useEffect(() => {
        const element = document.createElement('img')

        function imageLoaded() {
            canvasRef.current.width = element.naturalWidth
            canvasRef.current.height = element.naturalHeight
            setImage(element)
            dispatch({ type: 'set_loading_finished' })
        }

        element.addEventListener('load', imageLoaded)
        element.src = getSrcForFrame(sample.data, state.activeFrame)

        // The element will be garbage collected as long as this event listener isn't around creating a cycle
        return () => element.removeEventListener('loadeddata', imageLoaded)
    }, [dispatch, sample.data, state.activeFrame])


    useMemo(() => {
        if (!canvasRef.current) return
        if (!image) return

        console.log("Drawing frame")

        const ctx = canvasRef.current.getContext('2d')
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
    }, [image, state])

    const [preloadLink, setPreloadLink] = useState(null)
    useEffect(() => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        document.head.appendChild(link)
        setPreloadLink(link)
        return () => document.head.removeChild(link)
    }, [])

    useEffect(() => {
        if (!preloadLink) return
        preloadLink.src = getSrcForFrame(sample.data, state.activeFrame + 1)
    }, [preloadLink, sample.data, state.activeFrame])

    function getAgentLocation(state, agent) {
        console.assert(typeof agent === "string")
        const canvas = canvasRef.current
        if (!canvas) throw new Error("Canvas ref was cleared")
        
        const agentLabel = state.frames[state.activeFrame]?.[agent] ?? {}
        const x = agentLabel.x ?? canvas.width / 2
        const y = agentLabel.y ?? canvas.height / 2
        const angle = agentLabel.angle ?? 0

        return { x, y, angle }
    }

    function eventToImageCoordinates(event) {
        const canvas = canvasRef.current
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

    function onCanvasMousedown(event) {
        const { x, y } = eventToImageCoordinates(event)
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
        return drag && drag.agentName === state.activeAgent
    }

    function onCanvasMousemove(event) {
        if (isDragging()) {
            const canvas = canvasRef.current
            const xDelta = event.nativeEvent.offsetX * (canvas.height / canvas.clientHeight) - drag.mouse.x
            const yDelta = event.nativeEvent.offsetY * (canvas.width / canvas.clientWidth) - drag.mouse.y

            dispatch({ 
                type: 'move_agent',
                agentName: drag.agentName,
                x: xDelta + drag.agent.x,
                y: yDelta + drag.agent.y,
            })
        }
    }

    function onCanvasWheel(event) {
        const { x, y } = eventToImageCoordinates(event)
        // If dragging, rotate the agent being dragged. Otherwise, rotate the hovered agent.
        const agentName = isDragging() ? drag.agentName : getHoveredAgent(x, y)
        if (agentName) {
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
        <div className="flex-grow-1">
            <canvas
                className="labeler-canvas"
                ref={canvasRef}
                onMouseDown={onCanvasMousedown}
                onMouseUp={endDrag}
                onMouseMove={onCanvasMousemove}
                onWheel={onCanvasWheel}
            />

            <Timeline sample={sample} state={state} />
        </div>
    </Col>)
}