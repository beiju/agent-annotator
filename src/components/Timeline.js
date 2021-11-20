import { forwardRef, useContext, useEffect, useMemo, useState } from "react"

import "./Timeline.css"
import { OverlayTrigger, Popover } from "react-bootstrap"
import { getSrcForFrame } from "./util"
import { LabelsDispatch } from "./labels"

function getComponentType(state, i) {
    if (i === state.activeFrame) return 'active'
    return state.frames?.[i] ? 'labeled' : 'unlabeled'
}

// The shell of this component is copied straight from react-bootstrap documentation
const UpdatingPopover = forwardRef(
    ({ popper, children, show: _, ...props }, ref) => {
        useEffect(() => {
            popper.scheduleUpdate();
        }, [children, popper]);

        return (
            <Popover ref={ref} body {...props}>
                {children}
            </Popover>
        );
    },
);


export function Timeline({ sample, state }) {
    const dispatch = useContext(LabelsDispatch)

    const components = useMemo(() => {
        const components = []
        let lastComponentType = null
        let componentLength = 0
        for (let i = 1; i <= sample.numFrames; i++) {
            const componentType = getComponentType(state, i)
            if (componentType !== lastComponentType && lastComponentType !== null) {
                components.push({ componentType: lastComponentType, componentLength })
                componentLength = 0
            }
            componentLength += 1
            lastComponentType = componentType
        }

        if (componentLength !== 0) {
            components.push({ componentType: lastComponentType, componentLength })
        }
        return components
    }, [sample.numFrames, state])

    const [hoverPositionPercent, setHoverPositionPercent] = useState(null)
    const [isScrubbing, setIsScrubbing] = useState(false)
    function onMouseMove(event) {
        const bounds = event.currentTarget.getBoundingClientRect()
        const pct = (event.clientX - bounds.x) / bounds.width

        // Clamp to [0, 1]
        setHoverPositionPercent(Math.max(0, Math.min(pct, 1)))
        event.preventDefault()
    }

    function onMouseDown() {
        setIsScrubbing(true)
    }

    function onMouseUp() {
        setIsScrubbing(false)
    }

    function onMouseLeave() {
        setIsScrubbing(false)
        setHoverPositionPercent(null)
    }

    // This floor operation could return the `sample.numFrames`th frame, which doesn't exist
    const hoverPositionFrame = hoverPositionPercent === null ? null :
        Math.min(Math.floor(hoverPositionPercent * sample.numFrames), sample.numFrames - 1)

    useEffect(() => {
        if (isScrubbing) {
            dispatch({ type: 'jump_to_frame', frame: hoverPositionFrame })
        }
    }, [isScrubbing, hoverPositionFrame, dispatch])

    // This noinspection is because WebStorm thinks all arguments to OverlayTrigger are required, but most are optional
    // noinspection RequiredAttributes
    return (<div className="timeline"
                 onMouseMove={onMouseMove}
                 onMouseDown={onMouseDown}
                 onMouseUp={onMouseUp}
                 onMouseLeave={onMouseLeave}>
        {hoverPositionFrame !== null && <OverlayTrigger show={true} placement={'top'} overlay={
            <UpdatingPopover className="p-0">
                <img
                    src={getSrcForFrame(sample.data, hoverPositionFrame)}
                    alt={`Frame ${hoverPositionFrame}`}
                    height={100}
                />
            </UpdatingPopover>
        }>
            <div className="timeline-cursor" style={{
                width: `min(2px, ${100 / sample.numFrames}%)`,
                left: `${100 * hoverPositionFrame / sample.numFrames}%`,
            }} />
        </OverlayTrigger>}
        {components.map(({ componentType, componentLength }, i) => (
            <div key={i}
                 className={`timeline-component timeline-component-${componentType}`}
                 style={{ flexGrow: componentLength }} />
        ))}
    </div>)
}