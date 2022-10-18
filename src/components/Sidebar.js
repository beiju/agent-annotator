import { Button, Col, Form, FormCheck, Modal } from "react-bootstrap"

import agents from "../agents.json"
import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { LabelsDispatch } from "./labels"
import color_convert from "color-convert"
import { BsPencilSquare } from "react-icons/bs"
import { RiDeleteBack2Fill } from "react-icons/ri"

import "./Sidebar.css"
import { getSrcForFrame } from "./util"
import { transform } from "./VideoLabeler"

const SCALE_FACTOR = 5
const PADDING = 100

function AgentEditModal({ state, sample, agent: agentId, onClose }) {
    const dispatch = useContext(LabelsDispatch)
    const agent = agentId === null ? null : state.agents[agentId]

    const [image, setImage] = useState(null)
    const [preloadCanvas, setPreloadCanvas] = useState(null)
    const [canvas, setCanvas] = useState(null)
    const [hoveredPoint, setHoveredPoint] = useState(null)
    const [draggingPoint, setDraggingPoint] = useState(null)

    // Much of this is copied almost directly from VideoLabeler
    useEffect(() => {
        const element = document.createElement('img')

        function imageLoaded() {
            setImage(element)
        }

        element.addEventListener('load', imageLoaded)
        element.src = getSrcForFrame(sample.id, state.activeFrame)

        // The element will be garbage collected as long as this event listener isn't around creating a cycle
        return () => element.removeEventListener('load', imageLoaded)
    }, [sample.id, state.activeFrame])

    // Remember bounds while dragging
    const [[top, bottom, left, right], setDimensions] = useState([NaN, NaN, NaN, NaN])
    useEffect(() => {
        if (!agent) {
            setDimensions([NaN, NaN, NaN, NaN])
        } else if (draggingPoint === null) {
            const top = Math.min(...agent.shape.map(([_, y]) => y))
            const bottom = Math.max(...agent.shape.map(([_, y]) => y))
            const left = Math.min(...agent.shape.map(([x, _]) => x))
            const right = Math.max(...agent.shape.map(([x, _]) => x))
            setDimensions([top, bottom, left, right])
        }
    }, [agent, draggingPoint])

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
        canvas.width = (right - left) * SCALE_FACTOR + PADDING
        canvas.height = (bottom - top) * SCALE_FACTOR + PADDING
    }, [canvas, top, bottom, left, right, draggingPoint])

    const getAgentLocation = useCallback(function (state, agentId) {
        if (!canvas) throw new Error("Canvas ref was cleared")

        const agentLabel = state.frames[state.activeFrame]?.[agentId] ?? {}
        const x = agentLabel.x ?? canvas.width / 2
        const y = agentLabel.y ?? canvas.height / 2
        const angle = agentLabel.angle ?? 0

        return { x, y, angle }
    }, [canvas])
    useEffect(() => {
        if (!agent) return
        if (!canvas) return
        if (!image) return

        const ctx = canvas.getContext('2d')

        const { x, y, angle } = getAgentLocation(state, agentId)
        const agentTf = transform(x * SCALE_FACTOR, y * SCALE_FACTOR, angle, false).inverse()
        const offsetTf = transform(canvas.width / 2, canvas.height / 2, 0, false)
        ctx.setTransform(offsetTf.multiply(agentTf))
        ctx.scale(SCALE_FACTOR, SCALE_FACTOR)

        ctx.drawImage(image, 0, 0)

        ctx.scale(1, 1)
        ctx.lineWidth = 2

        const [h, s, l] = color_convert.hex.hsl(agent.color.slice(1))

        ctx.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height / 2)

        // Draw lines and fill
        ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, 1)`
        ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, 0.2)`
        ctx.beginPath()
        for (const [shapeX, shapeY] of agent.shape) {
            ctx.lineTo(shapeX * SCALE_FACTOR, shapeY * SCALE_FACTOR)
        }
        ctx.stroke()
        ctx.fill()

        // Draw handles
        ctx.fillStyle = `hsla(${h}, ${s}%, ${l * 0.5}%, 0.8)`
        for (let i = 0; i < agent.shape.length; i++) {
            const [shapeX, shapeY] = agent.shape[i]
            ctx.beginPath()
            if (i === hoveredPoint) {
                ctx.strokeStyle = `#fff`
                ctx.arc(shapeX * SCALE_FACTOR, shapeY * SCALE_FACTOR, 8, 0, 2 * Math.PI)
            } else {
                ctx.strokeStyle = `hsla(${h}, ${s}%, ${l * 0.5}%, 1)`
                ctx.arc(shapeX * SCALE_FACTOR, shapeY * SCALE_FACTOR, 5, 0, 2 * Math.PI)
            }
            ctx.stroke()
            ctx.fill()
        }

    }, [canvas, image, agentId, agent, getAgentLocation, state, hoveredPoint])

    const eventToScaledAgentCoordinates = useCallback(function eventToScaledAgentCoordinates(event) {
        if (!canvas) throw new Error("Canvas ref was cleared")

        const x = event.nativeEvent.offsetX * (canvas.width / canvas.clientWidth) - PADDING / 2 + left * SCALE_FACTOR
        const y = event.nativeEvent.offsetY * (canvas.height / canvas.clientHeight) - PADDING / 2 + top * SCALE_FACTOR

        return { x, y }
    }, [canvas, left, top])

    const onMouseMove = useCallback(function onMouseMove(event) {
        const { x, y }  = eventToScaledAgentCoordinates(event)

        if (draggingPoint !== null) {
            dispatch({
                type: "set_agent_shape",
                agent: agentId,
                i: draggingPoint,
                shapeX: x / SCALE_FACTOR,
                shapeY: y / SCALE_FACTOR,
            })
        } else {
            // this could be written better if it wasn't so late at night
            let closest = null
            for (let i = 0; i < agent.shape.length; i++) {
                const [shapeX, shapeY] = agent.shape[i]
                const dist = Math.sqrt(Math.pow(shapeX * SCALE_FACTOR - x, 2) + Math.pow(shapeY * SCALE_FACTOR - y, 2))
                if (closest === null || closest.dist > dist) {
                    closest = { dist, i }
                }
            }
            if (closest === null || closest.dist > 8) {
                setHoveredPoint(null)
            } else {
                setHoveredPoint(closest.i)
            }

        }
    }, [eventToScaledAgentCoordinates, agentId, agent, draggingPoint, dispatch])

    return (
            <Modal show={agentId !== null} onHide={onClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Agent</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Edit agent shape. This affects all frames of this video. If this frame doesn't give a clear view,
                    you can advance to another frame and Edit again.

                    <canvas
                            style={{ cursor: hoveredPoint === null ? "auto" : "grab" }}
                            className="agent-edit-canvas w-100"
                            ref={setPreloadCanvas}
                            onMouseMove={onMouseMove}
                            onMouseDown={() => { setDraggingPoint(hoveredPoint) }}
                            onMouseUp={() => { setDraggingPoint(null) }}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={onClose}>
                        Done
                    </Button>
                </Modal.Footer>
            </Modal>
    )
}

function SidebarAgentsPresent({ state, sample }) {
    const dispatch = useContext(LabelsDispatch)
    const [agentToAdd, setAgentToAdd] = useState("")
    const [editingAgent, setEditingAgent] = useState(null)
    if (!dispatch) return null

    function addAgent(agentName) {
      const existing_agent = agents.find(agent => agent.name === agentName)
      if (existing_agent) {
        dispatch({
          type: 'add_agent',
          agent: {
            ...existing_agent,
            color: "#" + color_convert.hsv.hex(Math.random() * 360, 100, 100)
          }
        })
        setAgentToAdd("")
      }
    }

    return <div>
        <h4 className="text-center mt-3">Agents Present</h4>
        <p className="small text-secondary text-center">Applies to the entire video</p>

        <ol className="list-unstyled m-3">
            {Object.entries(state.agents).map(([id, agent]) => (
                <SidebarAgent
                    key={id}
                    agent={agent}
                    onColorChange={color => dispatch({ type: 'set_agent_color', agent: id, color })}
                    onClickEdit={_ => setEditingAgent(id)}
                    onClickDelete={_ => dispatch({ type: 'delete_agent', agent: id })}
                />
            ))}
        </ol>

      <div className="input-group px-2 pb-3">
        {/*<Form.Control*/}
        {/*  type="color"*/}
        {/*  id="new-agent-color"*/}
        {/*  defaultValue="#563d7c"*/}
        {/*  title="Agent color"*/}
        {/*  style={{ flexGrow: 0, width: "2.5em"}}*/}
        {/*/>*/}
        <Form.Select
          aria-label="Agent Type"
          value={agentToAdd}
          onChange={e => setAgentToAdd(e.currentTarget.value)}
        >
          <option key={""} value={""}>Agent Type&hellip;</option>
          {agents.map(agent => (
            <option key={agent.name} value={agent.name}>
              {agent.display_name}
            </option>
          ))}
        </Form.Select>
        <Button variant="primary" onClick={_ => addAgent(agentToAdd)} disabled={!agentToAdd}>Add</Button>
      </div>
      <AgentEditModal
              state={state}
              sample={sample}
              agent={editingAgent}
              onClose={_ => setEditingAgent(null)} />
    </div>
}

function SidebarAgent({ agent, onClickEdit, onClickDelete, onColorChange }) {
    return (<li className="d-flex align-items-center">
      <Form.Control
        type="color"
        size="sm"
        className="agent-color"
        value={agent.color}
        onChange={e => onColorChange(e.currentTarget.value)}
        title="Agent color"
      />
      <span className="flex-grow-1">{agent.display_name}</span>
      <Button className="icon-button" size="sm" variant="light" onClick={_ => onClickDelete()}><RiDeleteBack2Fill /></Button>
      <Button className="icon-button" size="sm" variant="light" onClick={_ => onClickEdit()}><BsPencilSquare /></Button>
    </li>)
}

function SidebarAgentAnnotation({ state, agentId, agent, label }) {
    const dispatch = useContext(LabelsDispatch)
    if (!dispatch) return null

    return <li
        className={"list-group-item py-2 px-3 " + (state.activeAgent === agentId ? 'active' : '')}
        onClick={() => dispatch({ type: 'set_active_agent', activeAgent: agentId })}
    >
        {agent.display_name}
        <Form>
            <FormCheck
                id={`agent-${agentId}-blurred`}
                label={"Blurred"}
                checked={label?.isBlurred ?? false}
                onChange={event => dispatch({
                    type: 'set_agent_is_blurred',
                    agentId,
                    isBlurred: event.currentTarget.checked
                })}
            />
            <FormCheck
                id={`agent-${agent.name}-obscured`}
                label={"Obscured"}
                checked={label?.isObscured ?? false}
                onChange={event => dispatch({
                    type: 'set_agent_is_obscured',
                    agentId,
                    isObscured: event.currentTarget.checked
                })}
            />
        </Form>
    </li>
}

function SidebarAgentAnnotations({ state }) {
    return <div className="flex-grow-1">
        <h4 className="text-center mt-3">Agent Annotations</h4>
        <p className="small text-secondary text-center">Applies to the current frame</p>

        <ul className="list-group list-group-flush">
            {Object.entries(state.agents).map(([agentId, agent]) =>
                <SidebarAgentAnnotation
                    key={agentId}
                    state={state}
                    agentId={agentId}
                    agent={agent}
                    label={state.frames?.[state.activeFrame]?.[agentId]}
                />
            )}
        </ul>
        {Object.keys(state.agents).length === 0 && <p className="text-center mx-2">
            Use the dropdown and button below to add the agent that are present in this video
        </p>}
    </div>
}

export function Sidebar({ state, sample }) {

    return (<Col md={4} lg={3} xl={2} className="bg-light h-100 border-end border-dark d-flex flex-column gx-0">
        <SidebarAgentAnnotations state={state} />
        <SidebarAgentsPresent state={state} sample={sample} />
    </Col>)
}