import { useContext, useState } from "react"
import { LabelsDispatch } from "./labels"
import { Button, ButtonGroup, Card, Navbar, Spinner } from "react-bootstrap"
import { AiFillStepForward, AiFillStepBackward } from "react-icons/ai"
import { BiHelpCircle } from "react-icons/bi"
import { CgCloseR } from "react-icons/cg"

export function Toolbar({ sample, state, nextVideo }) {
    const dispatch = useContext(LabelsDispatch)

    const [helpVisible, setHelpVisible] = useState(false)
    return (<>
        <Navbar className="d-flex justify-content-between">
            <Navbar.Text>
                <Spinner animation="border" size="sm" className={`me-2 ${state.loading ? 'visible' : 'invisible'}`} />
                Frame {state.activeFrame} of {sample.numFrames}
            </Navbar.Text>
            <ButtonGroup>
                <Button
                    onClick={() => dispatch({ type: 'previous_frame' })}
                    disabled={state.activeFrame <= 1}
                ><AiFillStepBackward /></Button>
                <Button
                    onClick={() => dispatch({ type: 'next_frame' })}
                    disabled={state.activeFrame >= sample.numFrames}
                ><AiFillStepForward /></Button>
            </ButtonGroup>
            <div>
                <Button
                    className="mx-2"
                    variant={helpVisible ? "info" : "outline-info"}
                    onClick={() => setHelpVisible(!helpVisible)}
                ><BiHelpCircle /></Button>

                <Button onClick={nextVideo}>Next Video</Button>
            </div>
        </Navbar>

        {helpVisible && <Card border="info" className="mb-2">
            <Card.Header>
                <button className="float-end border-0" onClick={() => setHelpVisible(!helpVisible)}>
                    <CgCloseR />
                </button>
                Help
            </Card.Header>
            <Card.Body className="row">
                <dl className="col mb-0">
                    <dt>Space</dt>
                    <dd>Advance through agents and frames</dd>
                    <dt>b</dt>
                    <dd>Reverse through agents and frames</dd>
                </dl>
                <dl className="col mb-0">
                    <dt>q/e/scroll</dt>
                    <dd>Rotate selected agent</dd>
                    <dt>w/a/s/d/drag</dt>
                    <dd>Move selected agent</dd>
                </dl>
                <dl className="col mb-0">
                    <dt>Shift</dt>
                    <dd>Rotate/move by 10x</dd>
                </dl>
            </Card.Body>
        </Card>}
    </>)
}