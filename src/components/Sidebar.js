import { Col, Form, FormGroup } from "react-bootstrap"

import agents from "../agents.json"
import { useContext } from "react"
import { LabelsDispatch } from "./labels"

function SidebarAgent({ agent, shortcut, checked, onChange }) {
    return (<FormGroup controlId={agent.name + "-active"} className="my-2">
        <Form.Check
            type="checkbox"
            checked={checked}
            onChange={onChange}
            label={shortcut + ": " + agent.display_name}
        />    
    </FormGroup>)
}

export function Sidebar({ labels }) {
    const dispatch = useContext(LabelsDispatch)
    if (!dispatch) return null

    return (<Col sm={2} className="bg-light h-100 border-end border-dark">
        <h4 className="text-center">Agents</h4>

        <Form>
            {agents.map((agent, i) => (
                <SidebarAgent
                    agent={agent}
                    shortcut={i+1}
                    checked={labels[agent.name].isPresent}
                    onChange={event => dispatch({
                        type: 'set_agent_present',
                        agent: agent.name,
                        isPresent: event.currentTarget.checked
                    })}
                />
            ))}
        </Form>
    </Col>)
}