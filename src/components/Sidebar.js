import { Button, Col, Form, FormCheck } from "react-bootstrap"

import agents from "../agents.json"
import { useContext, useState } from "react"
import { LabelsDispatch } from "./labels"
import color_convert from "color-convert"
import { BsPencilSquare } from "react-icons/bs"
import { RiDeleteBack2Fill } from "react-icons/ri"

import "./Sidebar.css"

function SidebarAgentsPresent({ state }) {
    const dispatch = useContext(LabelsDispatch)
    const [agentToAdd, setAgentToAdd] = useState("")
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
                    onClickEdit={_ => null}
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
    </div>
}

function SidebarAgent({ agent, onClickEdit, onClickDelete, onColorChange }) {
    return (<li>
      <Form.Control
        type="color"
        size="sm"
        className="agent-color"
        value={agent.color}
        onChange={e => onColorChange(e.currentTarget.value)}
        title="Agent color"
      />
      {agent.display_name}
      <Button className="float-end icon-button" size="sm" variant="light" onClick={_ => onClickDelete()}><RiDeleteBack2Fill /></Button>
      <Button className="float-end icon-button" size="sm" variant="light" onClick={_ => onClickEdit()}><BsPencilSquare /></Button>
    </li>)
}

function SidebarAgentAnnotation({ state, agent, label }) {
    const dispatch = useContext(LabelsDispatch)
    if (!dispatch) return null

    return <li
        className={"list-group-item py-2 px-3 " + (state.activeAgent === agent.name ? 'active' : '')}
        onClick={() => dispatch({ type: 'set_active_agent', activeAgent: agent.name })}
    >
        {agent.display_name}
        <Form>
            <FormCheck
                id={`agent-${agent.name}-blurred`}
                label={"Blurred"}
                checked={label?.isBlurred ?? false}
                onChange={event => dispatch({
                    type: 'set_agent_is_blurred',
                    agentName: agent.name,
                    isBlurred: event.currentTarget.checked
                })}
            />
            <FormCheck
                id={`agent-${agent.name}-obscured`}
                label={"Obscured"}
                checked={label?.isObscured ?? false}
                onChange={event => dispatch({
                    type: 'set_agent_is_obscured',
                    agentName: agent.name,
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
            {agents.map(agent =>
                state.agentPresent?.[agent.name] &&
                <SidebarAgentAnnotation
                    key={agent.name}
                    state={state}
                    agent={agent}
                    label={state.frames?.[state.activeFrame]?.[agent.name]}
                />
            )}
        </ul>
        {Object.values(state.agentPresent).every(x => !x) && <p className="text-center mx-2">
            Use the checkboxes below to select the agents that are present in this video
        </p>}
    </div>
}

export function Sidebar({ state }) {

    return (<Col md={4} lg={3} xl={2} className="bg-light h-100 border-end border-dark d-flex flex-column gx-0">
        <SidebarAgentAnnotations state={state} />
        <SidebarAgentsPresent state={state} />
    </Col>)
}