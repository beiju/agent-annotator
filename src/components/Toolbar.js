import { useContext, useState } from "react"
import { LabelsDispatch } from "./labels"
import { Button, ButtonGroup, Card, Dropdown, Nav, Navbar, Spinner } from "react-bootstrap"
import { AiFillStepForward, AiFillStepBackward } from "react-icons/ai"
import { BiHelpCircle } from "react-icons/bi"
import { CgCloseR } from "react-icons/cg"
import { ImLock, ImUnlocked } from "react-icons/im"

export function Toolbar({ sample, state, returnToIndex }) {
    const dispatch = useContext(LabelsDispatch)

    const [helpVisible, setHelpVisible] = useState(false)
    return (<>
        <Navbar className="d-flex justify-content-between">
            {/* Left */}
            <Nav>
                <Navbar.Text>
                    <Spinner animation="border" size="sm" className={`me-2 ${state.loading ? 'visible' : 'invisible'}`} />
                    Frame {state.activeFrame} of {sample.numFrames}
                </Navbar.Text>
            </Nav>

            {/* Center */}
            <Nav>
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
            </Nav>

            {/* Right */}
            <Nav>
                <Dropdown>
                    <Dropdown.Toggle>
                        {state.dishMask?.locked ?
                            <ImLock style={{ verticalAlign: "text-top" }} /> :
                            <ImUnlocked style={{ verticalAlign: "text-top" }} />} Dish mask
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                        {state.dishMask?.locked && <Dropdown.Item
                            onClick={() => dispatch({ type: 'set_dish_mask_locked', value: false })}
                        >Unlock</Dropdown.Item>}
                        {!state.dishMask?.locked && <Dropdown.Item
                            onClick={() => dispatch({ type: 'set_dish_mask_locked', value: true })}
                        >Lock</Dropdown.Item>}

                        <Dropdown.Item onClick={() => dispatch({ type: 'reset_dish_mask' })}>Reset to center</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>

                <Button
                    className="mx-2"
                    variant={helpVisible ? "info" : "outline-info"}
                    onClick={() => setHelpVisible(!helpVisible)}
                ><BiHelpCircle /></Button>

                <Button onClick={returnToIndex}>Stop labeling</Button>
            </Nav>
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